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

function config(): { rest: string; key: string } | null {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  // `SUPABASE_REST_URL` is for tools/rsvp/, which runs PostgREST on its own
  // without Supabase's `/rest/v1` gateway in front of it. Not set in production.
  const rest = process.env.SUPABASE_REST_URL?.replace(/\/+$/, "") ?? (url ? `${url}/rest/v1` : "");
  return key && rest ? { rest, key } : null;
}

export function configured(): boolean {
  return config() !== null;
}

export type Called<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_configured" | "unavailable" };

/**
 * Call one of the functions in supabase/schema.sql.
 *
 * Every way this can fail collapses to `unavailable`, because from where a
 * guest is standing they are the same thing: a paused project (which answers
 * HTTP 540, or does not resolve at all), a timeout, a 5xx, a key that has been
 * rotated. The status is logged for whoever is reading the logs. The key and
 * the request are not — a secret in a header must never reach a log line.
 */
export async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<Called<T>> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "not_configured" };

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
      console.error(`rsvp: ${fn} answered ${res.status}`);
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (error) {
    console.error(`rsvp: ${fn} did not answer (${error instanceof Error ? error.name : "error"})`);
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
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
