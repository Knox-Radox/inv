import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { call, caller, sameOrigin } from "@/lib/rsvp/server";

/**
 * A guest says "I'll give this", or takes it back — docs/revision-10-registry.md.
 *
 * The only endpoint a guest's browser writes to for the registry, so it is as
 * narrow as the reply card's: a few hundred bytes in, one database function
 * called, one short answer out.
 *
 * Nobody is asked who they are. The browser makes a random token when it
 * claims and keeps it; the database keeps only a hash of it. That is all that
 * lets a guest take their own claim back on the phone they made it on, and it
 * lets nobody else take it back for them. A claim that cannot be taken back by
 * the guest is the family's to release.
 */
const MAX_BYTES = 1024;

type Answer =
  | { ok: true }
  | { ok: false; code: "invalid" | "taken" | "gone" | "refused" | "slow_down" | "busy" | "unavailable" };

const STATUS = { invalid: 422, taken: 409, gone: 410, refused: 403, slow_down: 429, busy: 503, unavailable: 503 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

function answer(outcome: Answer) {
  return NextResponse.json(outcome, {
    status: outcome.ok ? 200 : STATUS[outcome.code],
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return answer({ ok: false, code: "invalid" });

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return answer({ ok: false, code: "invalid" });
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return answer({ ok: false, code: "invalid" });
    body = parsed as Record<string, unknown>;
  } catch {
    return answer({ ok: false, code: "invalid" });
  }

  const { action, gift, token } = body;
  if (
    (action !== "claim" && action !== "undo") ||
    typeof gift !== "string" || !UUID.test(gift) ||
    typeof token !== "string" || !TOKEN.test(token)
  ) {
    return answer({ ok: false, code: "invalid" });
  }

  const sent = await call<Answer>(action === "claim" ? "registry_claim" : "registry_unclaim", {
    p_gift: gift,
    p_hash: createHash("sha256").update(token).digest("hex"),
    p_caller: caller(request),
  });
  if (!sent.ok) return answer({ ok: false, code: "unavailable" });

  const outcome = sent.data;
  if (outcome && outcome.ok === true) return answer({ ok: true });
  const code = outcome && "code" in outcome ? outcome.code : "unavailable";
  return answer({ ok: false, code: code in STATUS ? code : "unavailable" } as Answer);
}
