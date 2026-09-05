import { invitation } from "@/content/invitation";

/**
 * Calendar output — docs/design-plan.md § Build notes.
 *
 * Two VEVENTs, because the day has two moments. iOS is known to import only the
 * first event from a multi-event file, so each event's description also names
 * the other: a partial import still leaves the guest holding both facts. That
 * is belt and braces, not a design — whether this should be one entry or two is
 * the couple's call, and it is docs/open-questions.md #1.
 */

const TZID = invitation.day.timeZone;

/** `20261127T083000` in the venue's own wall clock, from a fixed UTC instant. */
function localStamp(instant: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(instant));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

/** `20261127T143000Z` — used by the Google template, which takes UTC. */
function utcStamp(instant: string): string {
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function fold(line: string): string {
  // RFC 5545: no content line longer than 75 octets. Continuations start with a
  // single space. Folded conservatively at 72 to leave room for CRLF.
  if (line.length <= 72) return line;
  const out: string[] = [line.slice(0, 72)];
  let rest = line.slice(72);
  while (rest.length > 71) {
    out.push(" " + rest.slice(0, 71));
    rest = rest.slice(71);
  }
  if (rest) out.push(" " + rest);
  return out.join("\r\n");
}

function escape(text: string): string {
  return text.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");
}

const { day, couple } = invitation;
const [ceremony, reception] = day.moments;
const LOCATION = `${day.venue.name}, ${day.venue.street}, ${day.venue.city}, ${day.venue.stateCode} ${day.venue.postalCode}`;

function describe(other: (typeof day.moments)[number]): string {
  return `${couple.both} are getting married. ${other.label} the same day at ${other.startDisplay}, at the same venue.`;
}

/**
 * A full VTIMEZONE rather than a bare offset. Without it, a calendar client that
 * does not already know America/Chicago has to guess, and 8:30 AM becomes a
 * different time for a guest whose device is set to another zone.
 */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${TZID}`,
  "X-LIC-LOCATION:America/Chicago",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0600",
  "TZOFFSETTO:-0500",
  "TZNAME:CDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0600",
  "TZNAME:CST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function vevent(
  moment: (typeof day.moments)[number],
  other: (typeof day.moments)[number],
): string[] {
  // Reception has no announced end; two hours is the conventional placeholder a
  // calendar needs and is not shown anywhere in the invitation itself.
  const end = moment.endsAt ?? new Date(Date.parse(moment.startsAt) + 4 * 3_600_000).toISOString();
  return [
    "BEGIN:VEVENT",
    `UID:${moment.id}-advika-sooraj-2026@advikaandsooraj`,
    // Fixed, so regenerating the file does not look like an edit to a client.
    "DTSTAMP:20260101T000000Z",
    `DTSTART;TZID=${TZID}:${localStamp(moment.startsAt)}`,
    `DTEND;TZID=${TZID}:${localStamp(end)}`,
    fold(`SUMMARY:${escape(`${moment.label}: ${couple.both}`)}`),
    fold(`LOCATION:${escape(LOCATION)}`),
    fold(`DESCRIPTION:${escape(describe(other))}`),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
  ];
}

export function buildIcs(): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Advika and Sooraj//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    ...vevent(ceremony, reception),
    ...vevent(reception, ceremony),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/**
 * Google's template takes a single event, so it carries the ceremony and names
 * the reception in the details.
 */
export function googleCalendarUrl(): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${ceremony.label}: ${couple.both}`,
    dates: `${utcStamp(ceremony.startsAt)}/${utcStamp(ceremony.endsAt ?? ceremony.startsAt)}`,
    location: LOCATION,
    details: describe(reception),
    ctz: TZID,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
