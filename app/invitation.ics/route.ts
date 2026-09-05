import { buildIcs } from "@/lib/calendar";

/**
 * Served from a real route rather than a data: or blob: URL, because iOS Safari
 * blocks the first and has historically opened the second in place instead of
 * handing it to Calendar. A plain link to a route with the right Content-Type
 * works everywhere — including with JavaScript disabled.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="advika-and-sooraj.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
