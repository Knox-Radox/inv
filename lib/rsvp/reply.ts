/**
 * What a reply is, and whether one is acceptable.
 *
 * Shared by the reply card in the browser and the route on the server, so the
 * two cannot disagree about what "valid" means. No dependency and no DOM: it is
 * the same few dozen lines in both places.
 *
 * The limits are repeated in `supabase/schema.sql` as CHECK constraints and
 * again inside `rsvp_submit`. Three places is deliberate: the browser's copy is
 * a courtesy to the guest, the server's is the real gate, and the database's is
 * there for the day the server is wrong.
 */

export const LIMITS = {
  name: 80,
  contact: 120,
  /** Per event. Docs/revision-9-plan.md records this as a default taken, not asked. */
  guests: 10,
  partyName: 80,
  dietary: 400,
  note: 800,
} as const;

/** A reply as the guest fills it in. Zero guests at an event is a decline. */
export interface Reply {
  name: string;
  contact: string;
  muhurtham: number;
  reception: number;
  /** Everyone coming besides the person replying. Blank lines are dropped. */
  party: string[];
  dietary: string;
  note: string;
}

/** A reply ready to store: the same, with the contact reduced to a key. */
export interface StoredReply extends Reply {
  /** `p:` and the last ten digits of a phone number, or `e:` and an email. */
  contactKey: string;
}

export type Field = keyof Reply;

/** Why a field was refused. The words for each live in content/invitation.ts. */
export type Problem = "missing" | "too_long" | "not_a_contact" | "out_of_range";

export type Checked =
  | { ok: true; reply: StoredReply }
  | { ok: false; problems: Partial<Record<Field, Problem>> };

/** Collapse runs of whitespace, drop control characters, trim. */
function tidy(value: unknown, multiline = false): string {
  if (typeof value !== "string") return "";
  const text = value.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return multiline
    ? text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : text.replace(/\s+/g, " ").trim();
}

/**
 * A phone number or an email address, as the key that tells one household's
 * reply from another's.
 *
 * A phone is reduced to its last ten digits. Guests will type the same number
 * as `972-555-0123`, `(972) 555 0123`, `+1 972 555 0123` and `19725550123`, and
 * those have to be one reply, not four. Ten digits is a US number without its
 * country code and an Indian mobile without its own, which covers this guest
 * list; two different numbers sharing their last ten digits across two
 * countries would merge, and that is a risk worth one line of comment.
 */
export function contactKey(raw: string): string | null {
  const value = raw.trim();
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? `e:${value.toLowerCase()}` : null;
  }
  if (/[^\d\s()+.\-]/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `p:${digits.length > 10 ? digits.slice(-10) : digits}`;
}

function count(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= LIMITS.guests ? n : null;
}

/**
 * Check a reply from anywhere — a form's state, a JSON body, a posted form —
 * and return it tidied, or say which fields are wrong and why.
 */
export function check(raw: unknown): Checked {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const problems: Partial<Record<Field, Problem>> = {};

  const name = tidy(src.name);
  if (!name || !/\p{L}/u.test(name)) problems.name = "missing";
  else if (name.length > LIMITS.name) problems.name = "too_long";

  const contact = tidy(src.contact);
  const key = contactKey(contact);
  if (!contact) problems.contact = "missing";
  else if (contact.length > LIMITS.contact) problems.contact = "too_long";
  else if (!key) problems.contact = "not_a_contact";

  // An event left unanswered arrives as null or "", which is not zero: zero is
  // "declines with regret", and a guest has to have chosen it.
  const muhurtham = src.muhurtham === null || src.muhurtham === "" ? null : count(src.muhurtham);
  const reception = src.reception === null || src.reception === "" ? null : count(src.reception);
  if (muhurtham === null) problems.muhurtham = src.muhurtham == null || src.muhurtham === "" ? "missing" : "out_of_range";
  if (reception === null) problems.reception = src.reception == null || src.reception === "" ? "missing" : "out_of_range";

  // The names of the others: as many lines as there are others, and no more.
  const others = Math.max(0, Math.max(muhurtham ?? 0, reception ?? 0) - 1);
  const list = Array.isArray(src.party)
    ? src.party
    : typeof src.party === "string"
      ? src.party.split(/\r?\n/)
      : [];
  const party = list.map((p) => tidy(p)).filter(Boolean).slice(0, others);
  if (party.some((p) => p.length > LIMITS.partyName)) problems.party = "too_long";

  const dietary = tidy(src.dietary, true);
  if (dietary.length > LIMITS.dietary) problems.dietary = "too_long";

  const note = tidy(src.note, true);
  if (note.length > LIMITS.note) problems.note = "too_long";

  if (Object.keys(problems).length > 0 || !key || muhurtham === null || reception === null) {
    return { ok: false, problems };
  }
  return {
    ok: true,
    reply: { name, contact, contactKey: key, muhurtham, reception, party, dietary, note },
  };
}

/** What the route answers with. Every outcome a guest can cause has a code. */
export type Outcome =
  | { ok: true }
  | { ok: false; code: "invalid"; problems?: Partial<Record<Field, Problem>> }
  | {
      ok: false;
      code: "closed" | "slow_down" | "busy" | "unavailable";
      /**
       * Why, as a short code for whoever looks after the site — `timeout`,
       * `http_404_PGRST202`. Never the database's own words: those stay in
       * the server's log and on the family's page.
       */
      why?: string;
    };

export type FailureCode = Exclude<Outcome, { ok: true }>["code"];
