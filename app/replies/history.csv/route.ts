import { cookies } from "next/headers";
import { invitation } from "@/content/invitation";
import { at, csv } from "@/lib/rsvp/csv";
import type { ListedVersion } from "@/lib/rsvp/list";
import { SESSION_COOKIE, call, sessionValid } from "@/lib/rsvp/server";

/**
 * Every version of every reply, oldest first: the family's own copy of
 * everything the database holds, and the way back if an answer was changed
 * that should not have been. A reply sent twice is two rows here; the one that
 * counts says so. Behind the same cookie as the page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401 });

  const versions = await call<ListedVersion[]>("rsvp_history_list");
  if (!versions.ok || !Array.isArray(versions.data)) return new Response(null, { status: 503 });

  const [wedding, reception] = invitation.day.moments;
  return csv(
    [
      ["Received (Central)", "Name", "Phone or email", wedding.label, reception.label, "Coming with them", "Dietary or allergy notes", "Note", "Version", "Counts now", "Came from", "Reply"],
      ...versions.data.map((v) => [
        at(v.received_at), v.reply.name, v.reply.contact, v.reply.muhurtham, v.reply.reception,
        (v.reply.party ?? []).join("; "), v.reply.dietary ?? "", v.reply.note ?? "", v.revision,
        v.latest ? "yes" : "no",
        v.source === "by hand" ? "changed in the database" : "the reply card",
        v.reply_id ? v.reply_id.slice(0, 8) : "removed",
      ]),
    ],
    "advika-and-sooraj-every-version.csv",
  );
}
