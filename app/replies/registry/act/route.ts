import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, call, sameOrigin, sessionValid } from "@/lib/rsvp/server";

const ACTIONS = new Set(["up", "down", "archive", "restore", "release"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Moves a gift, takes it off the page, puts it back, or lets go of a claim:
 * the buttons on the family's list. Nothing here deletes anything.
 */
export async function POST(request: Request) {
  const to = (hash = "", query = "") => NextResponse.redirect(new URL(`/replies/registry${query}${hash}`, request.url), 303);

  if (!sameOrigin(request)) return NextResponse.redirect(new URL("/replies", request.url), 303);
  const jar = await cookies();
  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) return NextResponse.redirect(new URL("/replies", request.url), 303);

  const form = await request.formData().catch(() => null);
  const gift = form?.get("gift");
  const action = form?.get("action");
  if (typeof gift !== "string" || !UUID.test(gift) || typeof action !== "string" || !ACTIONS.has(action)) {
    return to("", "?problem=name");
  }

  const done = await call<{ ok: boolean }>("registry_act", { p_gift: gift, p_action: action });
  if (!done.ok) return to("", "?problem=unavailable");
  return to(`#gift-${gift}`, action === "archive" || action === "restore" || action === "release" ? `?did=${action}` : "");
}
