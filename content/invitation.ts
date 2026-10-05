/**
 * The single source of truth for every fact and every guest-facing string.
 *
 * Nothing in this file may be duplicated elsewhere in the codebase. No literal
 * date, time, address or copy string belongs in a component. Changing the
 * reception time is a one-line edit here — see README.md.
 *
 * Instants are stored as fixed UTC strings. They are never derived by parsing a
 * naive local date, so the countdown is simultaneously correct for a guest in
 * Chennai and one in Dallas. November 27, 2026 falls after the first Sunday of
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
  readonly id: "muhurtham" | "reception";
  readonly label: string;
  readonly startsAt: Instant;
  /** null where the moment has no announced end ("6:00 PM onwards"). */
  readonly endsAt: Instant | null;
  /** Printed start time, exactly as it should appear on the card. */
  readonly startDisplay: string;
  /** The qualifying line beneath the label, e.g. "until 9:30 AM". */
  readonly qualifier: string;
}

export interface WeddingDay {
  readonly timeZone: string;
  /** UTC offset in effect on the day, for the .ics VTIMEZONE. */
  readonly utcOffset: string;
  readonly weekday: string;
  readonly dateDisplay: string;
  readonly fullDateDisplay: string;
  /** The day without its weekday or year: the schedule's heading. */
  readonly shortDateDisplay: string;
  readonly venue: Venue;
  readonly moments: readonly [Moment, Moment];
  /**
   * The Muhurtham ends at 9:30 AM and the reception begins at 6:00 PM at the
   * same venue: eight and a half hours, where it was seven and a half until
   * revision 9 moved the morning's end from 10:30 AM. The design answers the
   * shape of that gap by never breaking the thread. Whether a line of copy
   * should also address it is the couple's to decide — see
   * docs/open-questions.md #1. Until they supply one, none is invented and
   * nothing renders here.
   */
  readonly gapNote: string | null;
}

export interface Countdown {
  /** The instant the countdown runs to: the Muhurtham's start. */
  readonly target: Instant;
  /** Midnight at the end of the wedding day, local. Ends the "Today" state. */
  readonly dayEnds: Instant;
}

/**
 * A hotel the couple recommends, as the client listed it — revision 9. Each is
 * one link to Google Maps, and a number is tap-to-call where one was given.
 */
export interface Hotel {
  readonly name: string;
  readonly street: string;
  readonly city: string;
  readonly stateCode: string;
  /**
   * null where the client's list gave none. It is left empty rather than looked
   * up, so print "city, state" alone for these.
   */
  readonly postalCode: string | null;
  /**
   * `display` is how the number is printed; `tel` is the same number in E.164
   * form, for a `tel:` link. null where the list gave none.
   */
  readonly phone: { readonly display: string; readonly tel: string } | null;
  /** Google Maps, built by `mapsSearchUrl` from the name and the address. */
  readonly href: string;
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
  // US order throughout: the client's decision at revision 9.
  dateDisplay: "November 27, 2026",
  fullDateDisplay: "Friday, November 27, 2026",
  shortDateDisplay: "November 27",
  venue,
  moments: [
    {
      id: "muhurtham",
      // Still the Muhurtham in the family's print, in the database and in this
      // file's ids. On the page it is the word every guest knows: the client's
      // instruction, October 2026.
      label: "Wedding",
      startsAt: "2026-11-27T14:30:00Z", // 8:30 AM CST
      endsAt: "2026-11-27T15:30:00Z", // 9:30 AM CST
      startDisplay: "8:30 AM",
      qualifier: "until 9:30 AM",
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

const couple = {
  first: "Advika",
  conjunction: "&",
  second: "Sooraj",
  /**
   * The ampersand is the client's revision 9 decision, made to match their
   * wedding logo; the names were spelled out ("and") before it. They are still
   * never reduced to initials: the monogram is where that belongs.
   */
  both: "Advika & Sooraj",
} as const;

/**
 * One universal Google Maps URL, shared by the venue and every hotel so the
 * pattern exists once. `search/?api=1` opens the Maps app where it is installed
 * and the browser where it is not, identically on Android, iOS and desktop, so
 * there is no platform branch to get wrong. The query is a name and a full
 * address — what a guest would have typed — which resolves to the business
 * rather than to a bare pin.
 */
function mapsSearchUrl(query: string): string {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

/**
 * A hotel with its Maps link built from the name and address it carries, so the
 * two can never disagree. A null postal code is left out of the query without
 * a stray space or comma.
 */
function hotel(entry: Omit<Hotel, "href">): Hotel {
  const postalCode = entry.postalCode ? ` ${entry.postalCode}` : "";
  return {
    ...entry,
    href: mapsSearchUrl(
      `${entry.name}, ${entry.street}, ${entry.city}, ${entry.stateCode}${postalCode}`,
    ),
  };
}

export const invitation = {
  couple,

  day,
  countdown,

  copy: {
    /**
     * The invocation at the head of the card, set beneath the mark of Ganesha.
     * The family's printed invitation opens with it, and in revision 9 the
     * client asked for the mark "with one line": this line, and not the shloka
     * that follows it in print. The double bars either side are set by the
     * card, not typed here, so a screen reader is not made to read them out.
     */
    invocation: "Shree Ganeshay Namaha",

    /**
     * The line that does the inviting. On the card it continues the sentence
     * the names begin — "Advika & Sooraj / request the pleasure of your company
     * as they celebrate their wedding" — so it takes no capital and no full
     * stop. Still no exclamation. The client's wording, from revision 9.
     */
    invitingLine: "request the pleasure of your company as they celebrate their wedding",

    /**
     * Said once. Never printed against each moment. It has no full stop because
     * the address is set directly beneath it as part of the same block — the
     * client asked for the full address there in revision 9.
     */
    sharedVenueLine: `Both at ${venue.name}`,

    /**
     * One sentence, from the client, as of revision 9. Still an array because
     * the closing sets one line per entry.
     */
    closingNote: ["We can’t wait to celebrate this special day with the people we love most."],

    /** Set beneath the note, in the body face. */
    closingSignoff: "With love,",

    /** Set beneath the sign-off, in script. The same names as everywhere else. */
    closingSignature: couple.both,

    sectionTitles: {
      // With its weekday, at the client's request: this heading was the one
      // place the date stood without it. Two parts because the heading may
      // break between them and nowhere else: on a phone it shares its line
      // with the garland, and "27" must never be left on a line of its own.
      schedule: [`${day.weekday},`, day.shortDateDisplay],
      location: "The place",
    },

    countdown: {
      /** State A: before the Muhurtham. */
      until: "until the wedding",
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
      /** Names the bar for a screen reader's list of landmarks. */
      barLabel: "On this page",
      /** The same word as the heading it leads to. */
      reply: "RSVP",
      stay: "Places to stay",
      calendar: "Add to calendar",
      calendarDone: "Added",
      /** The two ways in, named for the calendar a guest already uses. */
      calendarGoogle: "Google Calendar",
      calendarFile: "Apple or Outlook",
      sound: "Sound",
      soundOn: "Turn sound off",
      soundOff: "Turn sound on",
    },

    /** Alt text for the seal, which is the only meaningful illustration. */
    sealAlt: `A sage-green wax seal struck with ${couple.both}'s monogram: an A and an S with a spray of jasmine growing through them.`,
  },

  share: {
    title: couple.both,
    description: `${day.fullDateDisplay}. ${venue.name}, ${venue.locality}.`,
    imageAlt: `A sage-green wax seal struck with an A and S monogram and a spray of jasmine, above the names ${couple.both} and the date ${day.fullDateDisplay}, on ivory paper inside a border of small gold flowers.`,
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
     * One universal Google Maps URL — see `mapsSearchUrl` for why this one. The
     * query is the venue name and the full address.
     */
    href: mapsSearchUrl(
      `${venue.name}, ${venue.street}, ${venue.city}, ${venue.stateCode} ${venue.postalCode}`,
    ),

    /** Says what happens when you use it. Not "View map", not "Directions". */
    linkLabel: "Open in Google Maps",

    /**
     * The OpenStreetMap credit, printed under the plate when it is not empty.
     *
     * **It is empty, and that is the client's decision, not an oversight.** The
     * plate is a drawn work derived from OSM geometry, which is ODbL, and the
     * licence requires a visible credit. The client emptied this string
     * (e049e31) and, asked directly at revision 9, chose to leave it so.
     * `ASSETS.md` records that plainly. To put the site back inside the
     * licence, set this to "Map data © OpenStreetMap contributors".
     */
    attribution: "",

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

  /**
   * The reply card — revision 9, and the reversal of the last decision
   * `CLAUDE.md` still called settled. "There is no RSVP" held for eight
   * revisions; the client asked for one outright.
   *
   * The wording is the formal register of a printed reply card, which the
   * client chose over a plainer one because the card's own line is "request the
   * pleasure of your company". Every string a guest can see is here, including
   * what the card says when something has gone wrong: an error is copy too.
   *
   * See docs/revision-9-plan.md § The RSVP in detail.
   */
  rsvp: {
    /**
     * Replies are taken until the end of Sunday, November 15, Central time.
     * The route checks this on the server's clock; the card checks it on the
     * guest's, only to say so sooner.
     */
    closesAt: "2026-11-16T06:00:00Z" as Instant, // midnight CST ending Sunday the 15th
    replyByDisplay: "Sunday, November 15",

    /**
     * The client's word for it. Four capitals cannot be set in a connecting
     * script, so this one heading is in the body face: see Reply.module.css.
     */
    title: "RSVP",
    request: "The favour of a reply is requested by",

    name: "Name",
    accepts: "accepts with pleasure",
    declines: "declines with regret",
    attending: "Number attending",
    fewer: "One fewer",
    more: "One more",
    party: "Names of those coming with you",
    /** Read out for each line: "Guest 2", "Guest 3". */
    partyLine: "Guest",
    dietary: "Dietary or allergy notes, if any",
    contact: "Phone or email",
    contactHint:
      "If your plans change, reply again with the same phone number or email. Your new reply will replace this one.",
    note: `A note for ${couple.both}, if you wish`,
    privacy: `Your reply goes to ${couple.both} and their families, and to no one else.`,

    send: "Send reply",
    sending: "Sending",
    sent: "Reply sent",
    thanks: `Thank you. ${couple.both} have your reply.`,
    change: "Change my reply",
    /** Set on the small card as it goes into its envelope, after the name. */
    summaryAccepts: "attending",
    summaryDeclines: "declines with regret",

    closed: "Replies closed on",
    closedHelp: "If your plans have changed, please tell the family directly.",

    /** Per field. The card says what is wrong and how to put it right. */
    problems: {
      name: {
        missing: "Please write your name.",
        too_long: "That is longer than the line allows.",
      },
      contact: {
        missing: "Please give a phone number or an email.",
        too_long: "That is longer than the line allows.",
        not_a_contact: "That does not look like a phone number or an email.",
      },
      event: {
        missing: "Please choose one.",
        out_of_range: "Up to ten guests can be entered on one card.",
      },
      party: { too_long: "One of these names is longer than the line allows." },
      dietary: { too_long: "That is longer than the card allows." },
      note: { too_long: "That is longer than the card allows." },
    },

    /** For the whole card, when the reply could not be sent. */
    failures: {
      invalid: "Please look at the lines marked above.",
      closed: "Replies have closed.",
      slow_down:
        "Several replies have come from this connection in a few minutes. Please wait ten minutes, then send it again.",
      busy: "Your reply did not go through. It is saved on this device, so nothing needs retyping. Please send it again in a moment.",
      unavailable:
        "Your reply did not go through. It is saved on this device, so nothing needs retyping. Please send it again in a moment.",
    },

    /**
     * Set small under a failure, with a short reason code after it. Not for
     * the guest: for whoever they send a screenshot to.
     */
    failureWhy: "For the family, the reason given was",

    /** The two messages a guest without JavaScript is sent back to. */
    plainSent: "Reply sent. Thank you.",
    plainProblem: "Your reply could not be read. Please check each line and send it again.",
  },

  /**
   * Travel, and where to stay — revision 9. The client's own wording, verbatim:
   * do not correct, shorten or re-punctuate it, including the hotel names and
   * the typographic apostrophes. The hotels are in the order the client listed
   * them, and each is one link to Google Maps; the Wyndham's number is the one
   * that is tap-to-call. See docs/revision-9-plan.md.
   */
  travel: {
    title: "Travel",
    body: "If you’ll be joining us for our wedding weekend, we recommend flying into Dallas Fort Worth International Airport (DFW), the closest major airport for most guests traveling from out of town. Depending on travel plans, you may want to arrive by Thursday evening, November 26th to participate in the weekend’s festivities.",

    stayTitle: "Where to stay",
    stayBody:
      "We recommend staying in Anna or McKinney, Texas, for convenient access to the wedding venue. Below are a few hotel recommendations to help you plan your stay. Availability and rates may vary, so we encourage booking accommodations early.",

    /** Says what happens when you use it, as `map.linkLabel` does. */
    hotelLinkLabel: "Open in Google Maps",

    /**
     * Said once, above the list, instead of six times beside six names. Not
     * the client's wording: it is the instruction for a control, written for
     * the page, and it says what the control does.
     */
    hotelsHint: "Each one opens in Google Maps.",

    hotels: [
      hotel({
        name: "Wyndham Garden Anna",
        street: "600 North Standridge Blvd",
        city: "Anna",
        stateCode: "TX",
        postalCode: null,
        phone: { display: "(469) 840-2553", tel: "+14698402553" },
      }),
      hotel({
        name: "Hampton Inn & Suites McKinney",
        street: "2008 North Central Expressway",
        city: "McKinney",
        stateCode: "TX",
        postalCode: "75069",
        phone: null,
      }),
      hotel({
        name: "Home2 Suites by Hilton McKinney",
        street: "2630 South Central Expressway",
        city: "McKinney",
        stateCode: "TX",
        postalCode: "75070",
        phone: null,
      }),
      hotel({
        name: "Sheraton McKinney Hotel",
        street: "1900 Gateway Boulevard",
        city: "McKinney",
        stateCode: "TX",
        postalCode: "75070",
        phone: null,
      }),
      hotel({
        name: "Holiday Inn & Suites McKinney - N Allen by IHG",
        street: "3220 Craig Drive",
        city: "McKinney",
        stateCode: "TX",
        postalCode: "75070",
        phone: null,
      }),
      hotel({
        name: "TownePlace Suites by Marriott Dallas McKinney",
        street: "1832 Marketplace Drive",
        city: "McKinney",
        stateCode: "TX",
        postalCode: "75069",
        phone: null,
      }),
    ],
  },
} as const;

export type Invitation = typeof invitation;
