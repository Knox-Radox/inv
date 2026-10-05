import "server-only";
import { invitation } from "@/content/invitation";

/**
 * What the two spreadsheets on the replies page share.
 *
 * Every cell a guest wrote is treated as hostile to a spreadsheet: a note that
 * begins with `=` is a formula as far as Excel is concerned, so anything
 * starting with one of the characters a formula can start with is given a
 * leading apostrophe, which makes it text.
 */

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

export const at = (iso: string) => stamp.format(new Date(iso)).replace(",", "");

function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** The rows as a file Excel opens as it should. */
export function csv(rows: (string | number)[][], filename: string): Response {
  // A byte-order mark, so Excel reads the file as UTF-8 and a Tamil name
  // survives the trip.
  const body = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
