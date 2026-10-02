import { call } from "@/lib/rsvp/server";

/**
 * Keeps the database awake — docs/revision-9-plan.md § When the database is
 * not there.
 *
 * A free Supabase project is paused after a week without activity, and a
 * wedding's replies arrive in a burst and then stop: a quiet week in the middle
 * of October would take the reply card down without anybody touching anything.
 * So `vercel.json` asks Vercel to call this once a day, and this runs one real
 * query through the same door the replies use.
 *
 * It does nothing else and answers with nothing worth having, but it is still
 * closed: when `CRON_SECRET` is set, Vercel sends it as a bearer token and
 * anything without it is refused.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const ping = await call<{ ok: boolean }>("rsvp_ping");
  return Response.json(
    { ok: ping.ok && ping.data.ok === true },
    { status: ping.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
