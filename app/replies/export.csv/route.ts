import { cookies } from "next/headers";
import { invitation } from "@/content/invitation";
import { at, csv } from "@/lib/rsvp/csv";
import type { Listed } from "@/lib/rsvp/list";
import { SESSION_COOKIE, call, sessionValid } from "@/lib/rsvp/server";

/**
 * The replies as a spreadsheet, for whoever is talking to the caterer: one row
 * per household, as it last answered. Behind the same cookie as the page.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401 });

  const list = await call<Listed>("rsvp_list");
  if (!list.ok) return new Response(null, { status: 503 });

  const [wedding, reception] = invitation.day.moments;
  return csv(
    [
      ["Name", "Phone or email", wedding.label, reception.label, "Coming with them", "Dietary or allergy notes", "Note", "First replied (Central)", "Last changed (Central)", "Versions"],
      ...list.data.replies.map((r) => [
        r.name, r.contact, r.muhurtham, r.reception, r.party.join("; "), r.dietary, r.note,
        at(r.created_at), at(r.updated_at), r.revision,
      ]),
    ],
    "advika-and-sooraj-replies.csv",
  );
}
