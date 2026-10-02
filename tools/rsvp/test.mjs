// The RSVP, end to end, against tools/rsvp/local.sh.
//
//   tools/rsvp/local.sh up
//   node tools/rsvp/test.mjs                      # the database's own rules
//   node tools/rsvp/test.mjs http://localhost:3000   # and the site's route
//
// The first half talks to PostgREST the way Supabase's API would be talked to
// with each kind of key, and checks that the public one can do nothing. The
// second half posts to /api/rsvp as a guest's browser would.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sh = (arg) => execFileSync(path.join(here, "local.sh"), [arg], { encoding: "utf8" }).trim();
const env = Object.fromEntries(sh("env").split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const REST = env.SUPABASE_REST_URL;
const SERVICE = env.SUPABASE_SECRET_KEY;
const ANON = sh("anon");
const SITE = process.argv[2];

let failed = 0;
const ok = (name, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const rpc = async (fn, args, key) => {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { apikey: key, Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args ?? {}),
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const table = async (name, key) =>
  (await fetch(`${REST}/${name}?select=*`, { headers: key ? { apikey: key, Authorization: `Bearer ${key}` } : {} })).status;

const reply = (over = {}) => ({
  name: "Lakshmi Raman", contact: "+1 (972) 555-0123", contactKey: "p:9725550123",
  muhurtham: 2, reception: 4, party: ["Raman", "Meera", "Arjun"], dietary: "No peanuts", note: "With love.",
  ...over,
});

console.log("— the database's own rules —");

// 1. The public key reaches nothing.
for (const [who, key] of [["no key", null], ["anon key", ANON]]) {
  const sub = await rpc("rsvp_submit", { p_reply: reply(), p_caller: "caller-aaaaaaaa" }, key);
  ok(`${who}: cannot submit`, sub.status >= 400 && sub.body?.ok !== true, `HTTP ${sub.status}`);
  const list = await rpc("rsvp_list", {}, key);
  ok(`${who}: cannot list`, list.status >= 400, `HTTP ${list.status}`);
  const hit = await rpc("rsvp_hit", { p_bucket: "x", p_window: 60, p_limit: 1 }, key);
  ok(`${who}: cannot touch the counters`, hit.status >= 400, `HTTP ${hit.status}`);
  for (const t of ["rsvp_replies", "rsvp_history", "rsvp_rate"]) {
    const s = await table(t, key);
    ok(`${who}: cannot read ${t}`, s >= 400, `HTTP ${s}`);
  }
}

// 2. The secret key can do exactly four things.
ok("secret key: cannot touch the counters either",
  (await rpc("rsvp_hit", { p_bucket: "x", p_window: 60, p_limit: 1 }, SERVICE)).status >= 400);
const first = await rpc("rsvp_submit", { p_reply: reply(), p_caller: "caller-aaaaaaaa" }, SERVICE);
ok("a reply is taken", first.status === 200 && first.body?.ok === true, JSON.stringify(first.body));

// 3. The same phone again replaces it, and the answer does not say so.
const second = await rpc("rsvp_submit", { p_reply: reply({ reception: 3, party: ["Raman", "Meera"] }), p_caller: "caller-aaaaaaaa" }, SERVICE);
ok("a second reply from the same phone answers identically", JSON.stringify(second.body) === JSON.stringify(first.body), JSON.stringify(second.body));
let list = (await rpc("rsvp_list", {}, SERVICE)).body;
ok("…and replaces the first", list.totals.replies === 1 && list.replies[0].reception === 3 && list.replies[0].revision === 2,
  `replies ${list.totals.replies}, reception ${list.replies[0]?.reception}, revision ${list.replies[0]?.revision}`);
ok("…and the list never carries the key", !("contact_key" in list.replies[0]));
ok("totals add up", list.totals.muhurtham === 2 && list.totals.reception === 3 && list.totals.changed === 1, JSON.stringify(list.totals));

// 4. A second household is a second row.
await rpc("rsvp_submit", { p_reply: reply({ name: "S. Iyer", contact: "iyer@example.com", contactKey: "e:iyer@example.com", muhurtham: 0, reception: 0, party: [] }), p_caller: "caller-bbbbbbbb" }, SERVICE);
list = (await rpc("rsvp_list", {}, SERVICE)).body;
ok("a decline is a reply", list.totals.replies === 2 && list.totals.declined === 1, JSON.stringify(list.totals));

// 5. What the database refuses even from the server. A sender apiece, so that
// none of these is refused by the rate limit instead of on its merits.
let n = 0;
for (const [why, over] of [
  ["eleven guests", { muhurtham: 11 }],
  ["a negative count", { reception: -1 }],
  ["no name", { name: "   " }],
  ["a key that is not a contact", { contactKey: "x:1" }],
  ["a key with SQL in it", { contactKey: "p:1234567'; drop table rsvp_replies;--" }],
  ["ten other names", { party: Array.from({ length: 10 }, (_, i) => `Guest ${i}`) }],
  ["a party that is not a list", { party: "everyone" }],
  ["a note past its limit", { note: "x".repeat(801) }],
  ["a count that is not a number", { muhurtham: "two" }],
]) {
  const r = await rpc("rsvp_submit", { p_reply: reply({ contactKey: "p:5550000001", ...over }), p_caller: `caller-refused-${n++}` }, SERVICE);
  ok(`refused: ${why}`, r.status === 200 && r.body?.ok === false && r.body?.code === "invalid", JSON.stringify(r.body));
}

// 6. Rate limits. Eight in ten minutes from one caller, then no more.
let last;
for (let i = 0; i < 9; i++) {
  last = await rpc("rsvp_submit", { p_reply: reply({ contactKey: `p:555100000${i}`, contact: `555100000${i}` }), p_caller: "caller-dddddddd" }, SERVICE);
}
ok("the ninth reply in ten minutes from one sender is turned away", last.body?.ok === false && last.body?.code === "slow_down", JSON.stringify(last.body));
const other = await rpc("rsvp_submit", { p_reply: reply({ contactKey: "p:5552000000", contact: "5552000000" }), p_caller: "caller-eeeeeeee" }, SERVICE);
ok("…and another sender is not", other.body?.ok === true);

// 7. The passcode gate and the keep-alive.
let gate;
for (let i = 0; i < 9; i++) gate = await rpc("rsvp_gate", { p_caller: "caller-ffffffff" }, SERVICE);
ok("the ninth wrong passcode in ten minutes is turned away", gate.body === false, String(gate.body));
const ping = await rpc("rsvp_ping", {}, SERVICE);
ok("the keep-alive is a real query", ping.body?.ok === true && typeof ping.body.replies === "number", JSON.stringify(ping.body));

if (SITE) {
  console.log(`\n— the site's route, at ${SITE} —`);
  const post = async (body, headers = {}) => {
    const res = await fetch(`${SITE}/api/rsvp`, {
      method: "POST", redirect: "manual",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json, location: res.headers.get("location") };
  };
  const card = (over = {}) => ({ name: "Kamala Devi", contact: "kamala@example.com", muhurtham: 1, reception: 2, party: ["Devi"], dietary: "", note: "", ...over });

  const a = await post(card());
  ok("a reply from the card is taken", a.status === 200 && a.json?.ok === true, `${a.status} ${JSON.stringify(a.json)}`);
  const b = await post(card({ contact: "KAMALA@example.com ", reception: 1, party: [] }));
  ok("the same email in capitals replaces it", b.status === 200 && b.json?.ok === true);
  list = (await rpc("rsvp_list", {}, SERVICE)).body;
  const mine = list.replies.filter((r) => r.name === "Kamala Devi");
  ok("…one row, second answer", mine.length === 1 && mine[0].reception === 1 && mine[0].revision === 2, JSON.stringify(mine.map((r) => [r.reception, r.revision])));
  ok("the response carries nothing back", Object.keys(a.json).join() === "ok");

  const bad = await post(card({ name: "", contact: "not a contact", muhurtham: null }));
  ok("a bad card is refused field by field", bad.status === 422 && bad.json?.problems?.name === "missing" && bad.json.problems.contact === "not_a_contact" && bad.json.problems.muhurtham === "missing", JSON.stringify(bad.json));
  ok("a body that is not JSON is refused", (await post("{not json")).status === 422);
  ok("a body past 8 KB is refused", (await post(card({ note: "x".repeat(9000) }))).status === 422);
  const bot = await post({ ...card({ name: "Bot", contact: "bot@example.com" }), website: "http://spam.example" });
  list = (await rpc("rsvp_list", {}, SERVICE)).body;
  ok("the honeypot answers yes and keeps nothing", bot.json?.ok === true && !list.replies.some((r) => r.name === "Bot"));
  const cross = await post(card({ contact: "cross@example.com" }), { origin: "https://evil.example", "sec-fetch-site": "cross-site" });
  list = (await rpc("rsvp_list", {}, SERVICE)).body;
  ok("a post from another site is refused", cross.json?.ok === false && !list.replies.some((r) => r.contact === "cross@example.com"), `${cross.status}`);

  const form = await fetch(`${SITE}/api/rsvp`, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.8" },
    body: new URLSearchParams({ name: "No Script", contact: "972 555 0199", muhurtham: "accept", muhurtham_count: "2", reception: "decline", party: "Second Person\n", dietary: "", note: "", website: "" }),
  });
  list = (await rpc("rsvp_list", {}, SERVICE)).body;
  const plain = list.replies.find((r) => r.name === "No Script");
  ok("a plain form post is taken and sent back to the page", form.status === 303 && /#reply-sent$/.test(form.headers.get("location") ?? "") && plain?.muhurtham === 2 && plain?.reception === 0 && plain?.party?.[0] === "Second Person",
    `${form.status} ${form.headers.get("location")} ${JSON.stringify(plain && [plain.muhurtham, plain.reception, plain.party])}`);
  const formBad = await fetch(`${SITE}/api/rsvp`, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.8" },
    body: new URLSearchParams({ name: "", contact: "" }),
  });
  ok("a bad plain form is sent back to the problem message", formBad.status === 303 && /#reply-problem$/.test(formBad.headers.get("location") ?? ""));

  let limited;
  for (let i = 0; i < 9; i++) limited = await post(card({ contact: `guest${i}@example.com` }), { "x-forwarded-for": "203.0.113.99" });
  ok("the route passes the rate limit on as 429", limited.status === 429 && limited.json?.code === "slow_down", `${limited.status} ${JSON.stringify(limited.json)}`);

  const hist = execFileSync("psql", ["-h", process.env.PGHOST ?? "127.0.0.1", "-p", process.env.PGPORT ?? "54329", "-U", process.env.PGUSER ?? "postgres", "-d", "rsvp_local", "-Atc",
    "select count(*), count(*) filter (where via ~ '^[A-Za-z0-9_-]{32}$'), count(*) filter (where via like '%203.0.113%') from rsvp_history where lower(btrim(reply->>'contact')) = 'kamala@example.com'"], { encoding: "utf8" }).trim();
  ok("history keeps both versions, and a hash where an address would be", hist === "2|2|0", hist);
}

console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
process.exit(failed ? 1 : 0);
