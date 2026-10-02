import { NextResponse } from "next/server";
import { SESSION_COOKIE, sameOrigin } from "@/lib/rsvp/server";

/** Signs this browser out of /replies. A family laptop is a shared laptop. */
export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/replies", request.url), 303);
  if (sameOrigin(request)) res.cookies.set(SESSION_COOKIE, "", { path: "/replies", maxAge: 0 });
  return res;
}
