import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  call,
  caller,
  passcodeMatches,
  sameOrigin,
  sessionToken,
} from "@/lib/rsvp/server";

/**
 * Takes the passcode for /replies.
 *
 * Every attempt is counted before it is looked at — right or wrong — and the
 * ninth in ten minutes from one sender is refused without being compared. The
 * count lives in the database beside the replies' own limits, so there is no
 * second service; if the database cannot be reached the door stays shut, which
 * costs nothing, because there would be no replies to show behind it.
 */
export async function POST(request: Request) {
  const back = (query = "") => NextResponse.redirect(new URL(`/replies${query}`, request.url), 303);

  if (!sameOrigin(request)) return back("?wrong=1");

  const allowed = await call<boolean>("rsvp_gate", { p_caller: caller(request) });
  if (!allowed.ok) return back("?down=1");
  if (allowed.data !== true) return back("?wait=1");

  const form = await request.formData().catch(() => null);
  const passcode = form?.get("passcode");
  if (typeof passcode !== "string" || !passcodeMatches(passcode)) return back("?wrong=1");

  const res = back();
  res.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/replies",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
