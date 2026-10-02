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
 * The limit that still holds when the database cannot be asked: at most this
 * many attempts in the window from everybody together, counted in memory. It is
 * per server instance and it forgets on a cold start, so it is a floor under
 * the real limit and not a replacement for it.
 */
const BLIND_ATTEMPTS = 12;
const BLIND_WINDOW_MS = 10 * 60 * 1000;
const blind: number[] = [];

function blindAllowed(): boolean {
  const now = Date.now();
  while (blind.length > 0 && now - (blind[0] ?? now) > BLIND_WINDOW_MS) blind.shift();
  if (blind.length >= BLIND_ATTEMPTS) return false;
  blind.push(now);
  return true;
}

/**
 * Takes the passcode for /replies.
 *
 * Every attempt is counted before it is looked at — right or wrong — and the
 * ninth in ten minutes from one sender is refused without being compared. The
 * count lives in the database beside the replies' own limits, so there is no
 * second service.
 *
 * If the database cannot be reached, the door still opens to the right
 * passcode. It did not at first, and that was the wrong way round: the moment
 * the family most needs this page is when replies are failing, because it is
 * this page that says why. Without the database's counter an attempt costs two
 * seconds and there are twelve to go round in ten minutes.
 */
export async function POST(request: Request) {
  const back = (query = "") => NextResponse.redirect(new URL(`/replies${query}`, request.url), 303);

  if (!sameOrigin(request)) return back("?wrong=1");

  const allowed = await call<boolean>("rsvp_gate", { p_caller: caller(request) });
  if (allowed.ok ? allowed.data !== true : !blindAllowed()) return back("?wait=1");
  if (!allowed.ok) await new Promise((done) => setTimeout(done, 2000));

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
