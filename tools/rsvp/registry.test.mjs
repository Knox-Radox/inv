// The registry, end to end, against tools/rsvp/local.sh.
//
//   tools/rsvp/local.sh up
//   node tools/rsvp/registry.test.mjs                      # the database's own rules
//   node tools/rsvp/registry.test.mjs http://localhost:3000   # and the site's claim route
//
// The first half talks to PostgREST the way Supabase's API would be talked to
// with each kind of key. The second half posts to /api/registry/claim as a
// guest's browser would. It adds and archives gifts and leaves them in the test
// database, which holds nothing real.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sh = (arg) => execFileSync(path.join(here, "local.sh"), [arg], { encoding: "utf8" }).trim();
const env = Object.fromEntries(sh("env").split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const REST = env.SUPABASE_REST_URL;
const SERVICE = env.SUPABASE_SECRET_KEY;
const ANON = sh("anon");
const SITE = process.argv[2];

const psql = (sql) =>
  execFileSync("psql", ["-h", process.env.PGHOST ?? "127.0.0.1", "-p", process.env.PGPORT ?? "54329",
    "-U", process.env.PGUSER ?? "postgres", "-d", process.env.RSVP_DB ?? "rsvp_local", "-Atc", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let failed = 0;
const ok = (name, pass, detail = "") => {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const rpc = async (fn, args, key = SERVICE) => {
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { apikey: key, Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(args ?? {}),
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const hash = (token) => createHash("sha256").update(token).digest("hex");
const token = () => Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const gift = (over = {}) => ({
  name: "Stand mixer", note: "In cream", store: "Williams Sonoma", url: "https://www.williams-sonoma.com/mixer",
  image: "https://images.example.com/mixer.jpg", price_cents: 42900, ...over,
});
const add = async (over) => (await rpc("registry_save", { p_gift: gift(over) })).body;
const listed = async () => (await rpc("registry_list")).body;

console.log("— the database's own rules —");

// 1. The public key reaches nothing.
for (const [who, key] of [["no key", null], ["anon key", ANON]]) {
  for (const [fn, args] of [
    ["registry_list", {}],
    ["registry_list_all", {}],
    ["registry_save", { p_gift: gift() }],
    ["registry_claim", { p_gift: "00000000-0000-0000-0000-000000000000", p_hash: hash("x"), p_caller: "caller-aaaaaaaa" }],
    ["registry_act", { p_gift: "00000000-0000-0000-0000-000000000000", p_action: "archive" }],
  ]) {
    const r = await rpc(fn, args, key);
    ok(`${who}: cannot call ${fn}`, r.status >= 400, `HTTP ${r.status}`);
  }
  for (const t of ["registry_gifts", "registry_log"]) {
    const res = await fetch(`${REST}/${t}?select=*`, { headers: key ? { apikey: key, Authorization: `Bearer ${key}` } : {} });
    ok(`${who}: cannot read ${t}`, res.status >= 400 || (await res.json()).length === 0, `HTTP ${res.status}`);
  }
}
ok("the guards are on", psql("select public.registry_guarded()") === "t");

// 2. Adding, and what is refused.
const a = await add({ name: "Stand mixer" });
const b = await add({ name: "Dinner plates", price_cents: null, image: null, note: "" });
const c = await add({ name: "Wine glasses" });
ok("a gift can be added", a?.ok === true && typeof a.id === "string");
for (const [what, over] of [
  ["a link that is not http(s)", { url: "javascript:alert(1)" }],
  ["a link with a space in it", { url: "https://a.com/x y" }],
  ["a photo that is not https", { image: "http://insecure.example.com/a.jpg" }],
  ["a price of nothing", { price_cents: 0 }],
  ["a price above the ceiling", { price_cents: 10000001 }],
  ["a blank name", { name: "   " }],
  ["a name of 121 letters", { name: "x".repeat(121) }],
  ["a note of 161 letters", { note: "x".repeat(161) }],
]) {
  const r = await add(over);
  ok(`refused: ${what}`, r?.ok === false && r.code === "invalid", JSON.stringify(r));
}

// 3. What a guest is shown.
let list = await listed();
ok("the list is in the order added", list.map((g) => g.name).join() === "Stand mixer,Dinner plates,Wine glasses");
ok("a guest's list says nothing of who or when", list.every((g) => !("claim_hash" in g) && !("claimed_at" in g)));
ok("a guest's list carries a price in cents or null", list[0].price_cents === 42900 && list[1].price_cents === null);

// 4. Choosing.
const t1 = token();
const caller = (n) => `caller-${String(n).padStart(8, "0")}`;
let r = await rpc("registry_claim", { p_gift: a.id, p_hash: hash(t1), p_caller: caller(1) });
ok("a gift can be chosen", r.body?.ok === true, JSON.stringify(r.body));
r = await rpc("registry_claim", { p_gift: a.id, p_hash: hash(token()), p_caller: caller(2) });
ok("a gift cannot be chosen twice", r.body?.ok === false && r.body.code === "taken", JSON.stringify(r.body));
list = await listed();
ok("a chosen gift sinks below the free ones", list.map((g) => g.name).join() === "Dinner plates,Wine glasses,Stand mixer" && list[2].claimed === true);

r = await rpc("registry_unclaim", { p_gift: a.id, p_hash: hash(token()), p_caller: caller(3) });
ok("the wrong token cannot take a choice back", r.body?.ok === false && r.body.code === "refused");
r = await rpc("registry_unclaim", { p_gift: b.id, p_hash: hash(t1), p_caller: caller(3) });
ok("a token cannot take back a different gift's choice", r.body?.ok === false && r.body.code === "refused");
r = await rpc("registry_unclaim", { p_gift: a.id, p_hash: hash(t1), p_caller: caller(3) });
ok("the right token takes it back", r.body?.ok === true);
list = await listed();
ok("and the gift is free again, in its old place", list[0].name === "Stand mixer" && list[0].claimed === false);
r = await rpc("registry_claim", { p_gift: a.id, p_hash: "not-a-hash", p_caller: caller(1) });
ok("a malformed hash is refused", r.body?.ok === false && r.body.code === "invalid");

// 5. The family.
r = await rpc("registry_act", { p_gift: c.id, p_action: "up" });
list = await listed();
ok("a gift can be moved up", list.map((g) => g.name).join() === "Stand mixer,Wine glasses,Dinner plates", list.map((g) => g.name).join());
await rpc("registry_act", { p_gift: a.id, p_action: "up" });
list = await listed();
ok("the first gift cannot go further up", list[0].name === "Stand mixer");
await rpc("registry_act", { p_gift: a.id, p_action: "down" });
list = await listed();
ok("a gift can be moved down", list.map((g) => g.name).join() === "Wine glasses,Stand mixer,Dinner plates");

const t2 = token();
await rpc("registry_claim", { p_gift: b.id, p_hash: hash(t2), p_caller: caller(4) });
await rpc("registry_act", { p_gift: b.id, p_action: "release" });
list = await listed();
ok("the family can let go of a choice", list.find((g) => g.id === b.id).claimed === false);
r = await rpc("registry_unclaim", { p_gift: b.id, p_hash: hash(t2), p_caller: caller(4) });
ok("and the guest's old token then does nothing", r.body?.ok === false && r.body.code === "refused");

await rpc("registry_claim", { p_gift: c.id, p_hash: hash(t2), p_caller: caller(5) });
await rpc("registry_act", { p_gift: c.id, p_action: "archive" });
list = await listed();
ok("an archived gift leaves the guests' list", !list.some((g) => g.id === c.id));
r = await rpc("registry_claim", { p_gift: c.id, p_hash: hash(token()), p_caller: caller(6) });
ok("an archived gift cannot be chosen", r.body?.ok === false && r.body.code === "gone");
let all = (await rpc("registry_list_all")).body;
const kept = all.gifts.find((g) => g.id === c.id);
ok("but it is kept, with its choice", kept?.archived_at && kept?.claimed_at);
await rpc("registry_act", { p_gift: c.id, p_action: "restore" });
list = await listed();
ok("a restored gift comes back at the end", list[list.length - 1].id === c.id || list.at(-1).claimed);
r = await rpc("registry_save", { p_gift: gift({ id: a.id, name: "Stand mixer, 5 quart", image: null }) });
all = (await rpc("registry_list_all")).body;
ok("a gift can be edited, and its photo removed", r.body?.ok === true && all.gifts.find((g) => g.id === a.id).name === "Stand mixer, 5 quart" && all.gifts.find((g) => g.id === a.id).image === null);
r = await rpc("registry_save", { p_gift: gift({ id: "11111111-1111-1111-1111-111111111111" }) });
ok("editing a gift that is not there says so", r.body?.ok === false && r.body.code === "gone");
ok("the log recorded what happened", ["added", "claimed", "taken back by the guest", "released by the family", "archived", "restored", "edited"].every((e) => all.log.some((l) => l.event === e)));

// 6. Nothing is lost.
for (const sql of [
  "delete from public.registry_gifts",
  "truncate public.registry_gifts",
  "delete from public.registry_log",
  "truncate public.registry_log",
  "update public.registry_log set event = 'x'",
]) {
  let refused = false;
  try { psql(sql); } catch { refused = true; }
  ok(`refused: ${sql}`, refused);
}
let deliberate = false;
try {
  psql("begin; set local registry.deliberate = 'yes'; delete from public.registry_gifts where name = 'Dinner plates'; commit;");
  deliberate = psql("select count(*) from public.registry_gifts where name = 'Dinner plates'") === "0";
} catch {}
ok("a deliberate removal still works", deliberate);
ok("and its log lines stay", Number(psql("select count(*) from public.registry_log where gift_id is null")) > 0);

// 7. Limits.
const spam = [];
for (let i = 0; i < 22; i++) {
  spam.push((await rpc("registry_claim", { p_gift: a.id, p_hash: hash(token()), p_caller: "spammer-aaaaaaaa" })).body.code ?? "ok");
}
ok("one sender is slowed after twenty tries in ten minutes", spam.includes("slow_down"), spam.slice(-3).join());

// 8. The site's route.
if (SITE) {
  console.log("— the site's route —");
  const fresh = await add({ name: "Tea towels" });
  const post = (body, headers = {}) =>
    fetch(`${SITE}/api/registry/claim`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const tk = token();
  let res = await post({ action: "claim", gift: fresh.id, token: tk }, { "Sec-Fetch-Site": "same-origin" });
  ok("a claim goes through", res.status === 200 && (await res.json()).ok === true, `HTTP ${res.status}`);
  res = await post({ action: "claim", gift: fresh.id, token: token() }, { "Sec-Fetch-Site": "same-origin" });
  ok("a second claim is a 409", res.status === 409, `HTTP ${res.status}`);
  res = await post({ action: "claim", gift: fresh.id, token: token() }, { "Sec-Fetch-Site": "cross-site" });
  ok("a claim from another site is refused", res.status === 422, `HTTP ${res.status}`);
  res = await post({ action: "claim", gift: "nope", token: tk }, { "Sec-Fetch-Site": "same-origin" });
  ok("a malformed id is refused", res.status === 422);
  res = await post({ action: "undo", gift: fresh.id, token: token() }, { "Sec-Fetch-Site": "same-origin" });
  ok("an undo with the wrong token is a 403", res.status === 403, `HTTP ${res.status}`);
  res = await post({ action: "undo", gift: fresh.id, token: tk }, { "Sec-Fetch-Site": "same-origin" });
  ok("an undo with the right token works", res.status === 200);
  const page = await (await fetch(`${SITE}/registry`)).text();
  ok("the registry page lists the gift", page.includes("Tea towels"));
  ok("and carries no hash, token or claim time", !/claim_hash|claimed_at/.test(page));
  ok("and the note about money", page.includes("a gift of money is as gratefully received"));
}

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
