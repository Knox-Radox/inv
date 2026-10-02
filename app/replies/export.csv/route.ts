import { cookies } from "next/headers";
import { invitation } from "@/content/invitation";
import type { Listed } from "@/lib/rsvp/list";
import { SESSION_COOKIE, call, sessionValid } from "@/lib/rsvp/server";

/**
 * The replies as a spreadsheet, for whoever is talking to the caterer.
 *
 * Behind the same cookie as the page. Every cell a guest wrote is treated as
 * hostile to a spreadsheet: a note that begins with `=` is a formula as far as
 * Excel is concerned, so anything starting with one of the characters a
 * formula can start with is given a leading apostrophe, which makes it text.
 */
export const dynamic = "force-dynamic";

/** `2026-10-02 08:47`, in the wedding's own timezone: sortable, and the hour a
 *  family in Texas would recognise. The database keeps UTC. */
const stamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: invitation.day.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const at = (iso: string) => stamp.format(new Date(iso)).replace(",", "");

function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const jar = await cookies();
  if (!sessionValid(jar.get(SESSION_COOKIE)?.value)) return new Response(null, { status: 401 });

  const list = await call<Listed>("rsvp_list");
  if (!list.ok) return new Response(null, { status: 503 });

  const rows = [
    ["Name", "Phone or email", "Muhurtham", "Reception", "Coming with them", "Dietary or allergy notes", "Note", "First replied (Central)", "Last changed (Central)", "Times sent"],
    ...list.data.replies.map((r) => [
      r.name, r.contact, r.muhurtham, r.reception, r.party.join("; "), r.dietary, r.note,
      at(r.created_at), at(r.updated_at), r.revision,
    ]),
  ];
  // A byte-order mark, so Excel reads the file as UTF-8 and a Tamil name
  // survives the trip.
  const csv = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="advika-and-sooraj-replies.csv"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
