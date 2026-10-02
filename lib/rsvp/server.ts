import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * The server's side of the RSVP: the one place the database's secret key is
 * read, and the only code that speaks to Supabase.
 *
 * `server-only` makes importing this from a client component a build error, so
 * the key cannot be bundled by accident.
 *
 * Supabase is reached over its REST API with plain `fetch`, and only ever to
 * call a function (`/rest/v1/rpc/…`). There is no supabase-js here and no
 * direct table access: the functions in supabase/schema.sql are the whole
 * interface, and each is granted to the secret key's role alone.
 */

/** Long enough for a cold database, short enough that a guest is not left
 *  watching a button. A paused free project does not answer at all. */
const TIMEOUT_MS = 6000;

/** A value as it was pasted into a dashboard: stray spaces and quotes gone. */
function pasted(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function config(): { rest: string; key: string } | null {
  const key = pasted(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  // The dashboard shows the project's address in more than one place, and one
  // of them already ends `/rest/v1`. Either is accepted.
  const url = pasted(process.env.SUPABASE_URL).replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  // `SUPABASE_REST_URL` is for tools/rsvp/, which runs PostgREST on its own
  // without Supabase's `/rest/v1` gateway in front of it. Not set in production.
  const rest = pasted(process.env.SUPABASE_REST_URL).replace(/\/+$/, "") || (url ? `${url}/rest/v1` : "");
  return key && rest ? { rest, key } : null;
}

export function configured(): boolean {
  return config() !== null;
}

/**
 * Why a call failed, in a form that is safe to show and to log: a short code,
 * the HTTP status, and what the database itself said. Never the key, never the
 * request.
 */
export interface Trouble {
  /** `not_configured`, `network`, `timeout`, or `http_404_PGRST202` and the like. */
  why: string;
  status?: number;
  /** PostgREST's own `code`, `message` and `hint`, when it sent any. */
  code?: string;
  message?: string;
  hint?: string;
}

export type Called<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "unavailable"; trouble: Trouble };

/**
 * Call one of the functions in supabase/schema.sql.
 *
 * Every way this can fail collapses to `unavailable`, because from where a
 * guest is standing they are the same thing: a paused project (which answers
 * HTTP 540, or does not resolve at all), a timeout, a 5xx, a key that has been
 * rotated. *Why* it failed is kept beside that, as a `Trouble`, for the log
 * and for the family's page — the first deployment of this failed for its
 * owner with nothing but "did not go through" to go on, which is no way to
 * find out that a key is the wrong key.
 *
 * The key and the request are never logged — a secret in a header must not
 * reach a log line.
 */
export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<Called<T>> {
  const cfg = config();
  if (!cfg) {
    const trouble: Trouble = { why: "not_configured" };
    console.error(`rsvp: ${fn} not attempted: SUPABASE_URL or SUPABASE_SECRET_KEY is not set in this deployment`);
    return { ok: false, reason: "not_configured", trouble };
  }

  const headers: Record<string, string> = {
    apikey: cfg.key,
    "Content-Type": "application/json",
  };
  // Supabase's current secret keys (`sb_secret_…`) go on `apikey` alone. The
  // legacy service_role key is a JWT and has to be presented as a bearer token
  // as well, which is also what a bare PostgREST expects.
  if (cfg.key.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.key}`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.rest}/rpc/${fn}`, {
      method: "POST",
      headers,
      body: JSON.stringify(args),
      signal: abort.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // PostgREST answers in JSON; a wrong address answers in HTML or nothing.
      const said = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : undefined);
      const code = text(said?.code);
      const trouble: Trouble = {
        why: `http_${res.status}${code ? `_${code}` : ""}`,
        status: res.status,
        code,
        message: text(said?.message),
        hint: text(said?.hint),
      };
      console.error(`rsvp: ${fn} failed: ${JSON.stringify(trouble)}`);
      return { ok: false, reason: "unavailable", trouble };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    const trouble: Trouble = {
      why: timedOut ? "timeout" : "network",
      message: timedOut
        ? `no answer within ${TIMEOUT_MS / 1000} seconds`
        : `${error instanceof Error ? error.message : "request failed"}${cause ? `: ${cause}` : ""}`.slice(0, 300),
    };
    console.error(`rsvp: ${fn} failed: ${JSON.stringify(trouble)}`);
    return { ok: false, reason: "unavailable", trouble };
  } finally {
    clearTimeout(timer);
  }
}

/** One line of the check-up on the family's page. */
export interface Finding {
  what: string;
  ok: boolean;
  /** What was found, and when it is wrong, what to do about it. */
  detail: string;
}

/**
 * What kind of key this is, from its shape alone. The commonest way for a new
 * deployment to fail is the publishable key pasted where the secret one goes,
 * and the two differ in their first eleven characters.
 */
function keyKind(key: string): { ok: boolean; detail: string } {
  if (!key) return { ok: false, detail: "Not set. Add SUPABASE_SECRET_KEY in Vercel and redeploy." };
  if (key.startsWith("sb_secret_")) return { ok: true, detail: "A secret key (sb_secret_…)." };
  if (key.startsWith("sb_publishable_")) {
    return {
      ok: false,
      detail:
        "This is the PUBLISHABLE key (sb_publishable_…). It can do nothing here by design. Use the secret key from Supabase → Settings → API Keys → Secret keys.",
    };
  }
  if (key.startsWith("eyJ")) {
    try {
      const role = (JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()) as { role?: string }).role;
      return role === "service_role"
        ? { ok: true, detail: "A legacy service_role key." }
        : { ok: false, detail: `A legacy key for the "${role ?? "unknown"}" role. It must be the service_role key, or a new secret key (sb_secret_…).` };
    } catch {
      return { ok: false, detail: "Looks like a legacy key but could not be read. Copy it again." };
    }
  }
  return { ok: false, detail: "Not a Supabase API key by its shape. It should start sb_secret_." };
}

/**
 * The check-up: what is set, what kind of thing each value is, and what the
 * database says when it is asked something. Shown only behind the passcode,
 * and it shows no secret — a host name and the first few characters' worth of
 * a key's *kind*.
 */
export async function diagnose(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const rawUrl = pasted(process.env.SUPABASE_URL);
  const key = pasted(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);

  let host = "";
  try {
    host = rawUrl ? new URL(rawUrl).host : "";
  } catch {
    host = "";
  }
  if (!rawUrl) {
    findings.push({ what: "SUPABASE_URL", ok: false, detail: "Not set. Add it in Vercel → Settings → Environment Variables for this environment, then redeploy." });
  } else if (!host) {
    findings.push({ what: "SUPABASE_URL", ok: false, detail: `"${rawUrl.slice(0, 60)}" is not a web address. It should look like https://abcdefgh.supabase.co` });
  } else if (!/\.supabase\.co$/.test(host)) {
    findings.push({ what: "SUPABASE_URL", ok: false, detail: `Points at ${host}. It should be the project's own address, https://<project-ref>.supabase.co — not the dashboard's (supabase.com) and not the database's (db.… or …pooler…).` });
  } else {
    findings.push({ what: "SUPABASE_URL", ok: true, detail: `https://${host}` });
  }

  // tools/rsvp/'s own variable. Set anywhere else it silently wins over
  // SUPABASE_URL, and every call goes to a database that is not there.
  const restUrl = pasted(process.env.SUPABASE_REST_URL);
  if (restUrl) {
    findings.push({
      what: "SUPABASE_REST_URL",
      ok: false,
      detail: `Set to ${restUrl.slice(0, 60)}, so every call goes there and SUPABASE_URL is ignored. It is only for the local test database (tools/rsvp/local.sh). Remove it, in Vercel or in .env.local, to use the real project.`,
    });
  }

  findings.push({ what: "SUPABASE_SECRET_KEY", ...keyKind(key) });

  const ping = await call<{ ok: boolean; replies: number }>("rsvp_ping");
  if (ping.ok) {
    findings.push({ what: "The database", ok: true, detail: `Answering. It holds ${ping.data.replies} ${ping.data.replies === 1 ? "reply" : "replies"}.` });
  } else {
    const t = ping.trouble;
    const said = [t.status ? `HTTP ${t.status}` : "", t.code ?? "", t.message ?? "", t.hint ? `(${t.hint})` : ""].filter(Boolean).join(" · ");
    let fix = "See the server's log in Vercel → Logs for the full line.";
    if (t.why === "not_configured") fix = "One of the two values above is missing in this deployment.";
    else if (t.why === "timeout") fix = "The project may be paused (free projects pause after a week idle): open the Supabase dashboard and press Restore.";
    else if (t.why === "network") fix = "The address did not resolve or refused the connection. Check SUPABASE_URL letter by letter; if it is right, the project may be paused: Restore it in the Supabase dashboard.";
    else if (t.status === 401 || t.status === 403) fix = "The key was refused. Use the SECRET key (Settings → API Keys → Secret keys), and make sure supabase/schema.sql has been run so that key is allowed to call the functions.";
    else if (t.status === 404) fix = "The database does not know this function. Run the whole of supabase/schema.sql in Supabase → SQL Editor. If it has been run: Settings → API (Data API) must be enabled and must expose the `public` schema.";
    else if (t.status === 540) fix = "The project is paused. Open the Supabase dashboard and press Restore.";
    else if (t.status && t.status >= 500) fix = "Supabase is having trouble or the project is starting up. Try again in a minute.";
    findings.push({ what: "The database", ok: false, detail: `${said || t.why}. ${fix}` });
  }

  const pass = process.env.REPLIES_PASSCODE ?? "";
  findings.push({
    what: "REPLIES_PASSCODE",
    ok: pass.length >= 6,
    detail: pass.length >= 6 ? "Set." : "Not set, or shorter than six characters.",
  });
  return findings;
}

/**
 * A secret this deployment can sign with, derived from the database key so
 * there is one fewer thing to configure. It never leaves the server, and it
 * changes if the key is rotated — which signs everybody out of the replies
 * page, as rotating a key should.
 */
function signingKey(): Buffer {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`advika-sooraj:${key}`).digest();
}

/**
 * Who is calling, as a number that cannot be turned back into an address.
 *
 * The rate limits need to tell one sender from another and nothing more, so
 * the IP address is keyed-hashed here and only the hash is ever sent on or
 * stored. Vercel sets `x-forwarded-for` itself and overwrites whatever a
 * client sends, so the first entry is the guest and cannot be forged.
 */
export function caller(request: Request): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHmac("sha256", signingKey()).update(`caller:${ip}`).digest("base64url").slice(0, 32);
}

/**
 * Did this request come from this site's own pages?
 *
 * A route handler is a public HTTP endpoint and gets none of the origin checks
 * a Server Action does, so it makes its own: a browser says where a POST came
 * from, and one from another site is refused. A request with neither header is
 * not a browser, and the rate limits are what stand in front of those.
 */
export function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin" || site === "none";
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// --- The replies page's passcode ------------------------------------------

/** The cookie the replies page reads, and how long it lasts. */
export const SESSION_COOKIE = "replies";
export const SESSION_DAYS = 30;

export function passcodeSet(): boolean {
  return (process.env.REPLIES_PASSCODE ?? "").length >= 6;
}

/** Compared as digests, in constant time: a passcode's length is a secret too. */
export function passcodeMatches(candidate: string): boolean {
  const real = process.env.REPLIES_PASSCODE ?? "";
  if (real.length < 6) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(real).digest();
  return timingSafeEqual(a, b);
}

/**
 * What the cookie holds once the passcode has been given: a signature over the
 * passcode, not the passcode. Changing the passcode in Vercel therefore signs
 * everybody out, which is the only way a family has to take access back.
 */
export function sessionToken(): string {
  return createHmac("sha256", signingKey())
    .update(`replies:${process.env.REPLIES_PASSCODE ?? ""}`)
    .digest("base64url");
}

export function sessionValid(cookie: string | undefined): boolean {
  if (!cookie || !passcodeSet()) return false;
  const a = Buffer.from(cookie);
  const b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
