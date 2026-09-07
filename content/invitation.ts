/**
 * The single source of truth for every fact and every guest-facing string.
 *
 * Nothing in this file may be duplicated elsewhere in the codebase. No literal
 * date, time, address or copy string belongs in a component. Changing the
 * reception time is a one-line edit here — see README.md.
 *
 * Instants are stored as fixed UTC strings. They are never derived by parsing a
 * naive local date, so the countdown is simultaneously correct for a guest in
 * Chennai and one in Dallas. 27 November 2026 falls after the first Sunday of
 * November, so America/Chicago is CST (UTC-06:00) with no DST ambiguity.
 */

/** An ISO-8601 instant in UTC, e.g. "2026-11-27T14:30:00Z". */
export type Instant = string;

export interface Venue {
  readonly name: string;
  readonly street: string;
  readonly city: string;
  readonly stateCode: string;
  readonly postalCode: string;
  /** How the place is named in running copy, e.g. under the couple's names. */
  readonly locality: string;
}

/**
 * One moment within the day. Deliberately not called an "event": the two are
 * moments in a single day at a single venue, and the venue lives on the day,
 * not here, so it can never be printed twice.
 */
export interface Moment {
  readonly id: "ceremony" | "reception";
  readonly label: string;
  readonly startsAt: Instant;
  /** null where the moment has no announced end ("6:00 PM onwards"). */
  readonly endsAt: Instant | null;
  /** Printed start time, exactly as it should appear on the card. */
  readonly startDisplay: string;
  /** The qualifying line beneath the label, e.g. "until 10:30 AM". */
  readonly qualifier: string;
}

export interface WeddingDay {
  readonly timeZone: string;
  /** UTC offset in effect on the day, for the .ics VTIMEZONE. */
  readonly utcOffset: string;
  readonly weekday: string;
  readonly dateDisplay: string;
  readonly fullDateDisplay: string;
  readonly venue: Venue;
  readonly moments: readonly [Moment, Moment];
  /**
   * The ceremony ends at 10:30 AM and the reception begins at 6:00 PM at the
   * same venue. The design answers the shape of that gap by never breaking the
   * thread. Whether a line of copy should also address it is the couple's to
   * decide — see docs/open-questions.md #1. Until they supply one, none is
   * invented and nothing renders here.
   */
  readonly gapNote: string | null;
}

export interface Countdown {
  /** The instant the countdown runs to: the ceremony start. */
  readonly target: Instant;
  /** Midnight at the end of the wedding day, local. Ends the "Today" state. */
  readonly dayEnds: Instant;
}

const venue: Venue = {
  name: "Artistry Venue",
  street: "9981 County Road 419",
  city: "Anna",
  stateCode: "TX",
  postalCode: "75409",
  locality: "Anna, Texas",
};

const day: WeddingDay = {
  timeZone: "America/Chicago",
  utcOffset: "-06:00",
  weekday: "Friday",
  dateDisplay: "27 November 2026",
  fullDateDisplay: "Friday, 27 November 2026",
  venue,
  moments: [
    {
      id: "ceremony",
      label: "Ceremony",
      startsAt: "2026-11-27T14:30:00Z", // 8:30 AM CST
      endsAt: "2026-11-27T16:30:00Z", // 10:30 AM CST
      startDisplay: "8:30 AM",
      qualifier: "until 10:30 AM",
    },
    {
      id: "reception",
      label: "Reception",
      startsAt: "2026-11-28T00:00:00Z", // 6:00 PM CST
      endsAt: null,
      startDisplay: "6:00 PM",
      qualifier: "onwards",
    },
  ],
  gapNote: null,
};

const countdown: Countdown = {
  target: day.moments[0].startsAt,
  dayEnds: "2026-11-28T06:00:00Z", // midnight CST at the end of the day
};

export const invitation = {
  couple: {
    first: "Advika",
    conjunction: "and",
    second: "Sooraj",
    /** Spelled out, never "A & S". The monogram is where the mark belongs. */
    both: "Advika and Sooraj",
  },

  day,
  countdown,

  copy: {
    /** The line that does the inviting. First person, plain, no exclamation. */
    invitingLine: "Together with our families, we ask you to be with us as we marry.",

    /** Said once. Never printed against each moment. */
    sharedVenueLine: `Both at ${venue.name}.`,

    closingNote: ["We are glad you are coming.", "See you in November."],

    sectionTitles: {
      schedule: "The day",
      location: "The place",
    },

    countdown: {
      /** State A: before the ceremony. */
      until: "until the ceremony",
      /** State B: on the day itself. */
      todayLead: "Today",
      /** State C: after the day, forever. The keepsake state. */
      afterLead: "We were married",
      afterTrail: `on ${day.fullDateDisplay}`,
      /** Rendered on the server and with JS off. True in every era. */
      staticLead: "8:30 in the morning",
      staticTrail: day.fullDateDisplay,
      units: { days: "days", hours: "hours", minutes: "minutes", seconds: "seconds" },
    },

    controls: {
      skip: "Skip to the invitation",
      open: "Open the invitation",
      replay: "Replay the opening",
      calendar: "Add to calendar",
      calendarDone: "Added",
      sound: "Sound",
      soundOn: "Turn sound off",
      soundOff: "Turn sound on",
    },

    /** Alt text for the seal, which is the only meaningful illustration. */
    sealAlt:
      "A sage-green wax seal struck with Advika and Sooraj's monogram: an A and an S with a spray of jasmine growing through them.",
  },

  share: {
    title: "Advika and Sooraj",
    description: `${day.fullDateDisplay}. ${venue.name}, ${venue.locality}.`,
    imageAlt:
      "A sage-green wax seal struck with an A and S monogram and a spray of jasmine, on ivory paper embossed with jasmine, above the names Advika and Sooraj and the date Friday, 27 November 2026.",
    themeColor: "#FBF7F0",
  },

  /**
   * Background audio. null means no track is configured and the sound toggle is
   * not rendered at all — see docs/open-questions.md #3. Supply a path under
   * /public and a licence line in ASSETS.md to enable it.
   */
  audio: null as { readonly src: string; readonly title: string } | null,

  /**
   * The map plate — revision 7, and a reversal of two settled decisions. The
   * plate used to be decorative only, with invented geography and no link; the
   * client rejected it as being of no use. It is now traced from real
   * OpenStreetMap geometry around the venue and it opens Google Maps.
   *
   * See docs/revision-7-map.md. Open question #2 is answered and closed: there
   * is nothing left to invent, so there is nothing left to ask.
   */
  map: {
    /**
     * The address, geocoded. This is the single source of the venue's position:
     * `tools/frame.py` projects the plate about the same pair, so the drawing
     * and the link can never point at two different places.
     */
    coordinates: { lat: 33.325274, lon: -96.523372 },

    /** Lettered on the plate, in the order the plate draws them. */
    namedRoads: [
      "US 75",
      "TX 121",
      "Collin County Outer Loop",
      "FM 455",
      "County Road 419",
    ] as const,

    venueLabel: venue.name,

    /**
     * One universal Google Maps URL. `search/?api=1` opens the Maps app where
     * it is installed and the browser where it is not, identically on Android,
     * iOS and desktop, so there is no platform branch to get wrong. The query
     * is the venue name and the full address — what a guest would have typed —
     * which resolves to the business rather than to a bare pin.
     */
    href:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        `${venue.name}, ${venue.street}, ${venue.city}, ${venue.stateCode} ${venue.postalCode}`,
      ),

    /** Says what happens when you use it. Not "View map", not "Directions". */
    linkLabel: "Open in Google Maps",

    /**
     * Required by the ODbL, and rendered as visible text under the plate. The
     * plate is a drawn work derived from OSM geometry; the credit is not
     * optional and it does not belong only in a comment.
     */
    attribution: "Map data © OpenStreetMap contributors",

    /**
     * Read in place of the drawing. The plate is a real illustration and is
     * labelled as one; the link that wraps it carries its own name, so this is
     * not read out before a guest hears what the link does.
     */
    plateAlt:
      `A drawn map of the country around ${venue.name}. US 75 runs down the ` +
      "west side past Melissa and Anna, TX 121 crosses to the south-east, and " +
      "the Collin County Outer Loop and FM 455 run east to County Road 419, " +
      "where the venue is marked with the couple's seal.",
  },
} as const;

export type Invitation = typeof invitation;
