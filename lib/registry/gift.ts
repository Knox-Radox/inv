/**
 * What a gift is, and whether one is acceptable.
 *
 * Shared by the family's form and the route that receives it. The limits are
 * repeated in `supabase/registry.sql` as CHECK constraints and again inside
 * `registry_save`, for the reason written beside `LIMITS` in lib/rsvp/reply.ts:
 * the form's copy is a courtesy, the route's is the real gate, and the
 * database's is there for the day the route is wrong.
 */

export const LIMITS = {
  name: 120,
  note: 160,
  store: 60,
  url: 2000,
  /** One dollar short of a hundred thousand. Far above any gift on a list. */
  priceCents: 10_000_000,
} as const;

/** A gift as a guest sees it. Nothing here says who chose it, or when. */
export interface Gift {
  id: string;
  name: string;
  note: string;
  store: string;
  url: string;
  image: string | null;
  price_cents: number | null;
  claimed: boolean;
}

/** A gift as the family sees it. */
export interface AdminGift {
  id: string;
  name: string;
  note: string;
  store: string;
  url: string;
  image: string | null;
  price_cents: number | null;
  claimed_at: string | null;
  archived_at: string | null;
  position: number;
}

export interface AdminListing {
  gifts: AdminGift[];
  log: { gift_id: string | null; event: string; at: string }[];
}

/** What the family typed, before it is checked. */
export interface GiftInput {
  id: string | null;
  name: string;
  note: string;
  store: string;
  url: string;
  image: string | null;
  price_cents: number | null;
}

export type GiftProblem =
  | "name"
  | "url"
  | "image"
  | "price"
  | "note"
  | "store"
  | "upload_type"
  | "upload_size"
  | "upload_failed"
  | "full"
  | "rejected"
  | "unavailable";

export type CheckedGift = { ok: true; gift: GiftInput } | { ok: false; problem: GiftProblem };

const tidy = (value: unknown): string =>
  typeof value === "string"
    ? value
        .normalize("NFC")
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

/**
 * A web address, or nothing. A bare "williams-sonoma.com/…" is given its
 * https://, because that is what somebody copying from a phone's address bar
 * often has; anything that is not http or https is refused outright.
 */
export function webAddress(value: unknown, onlySecure = false): string | null {
  const raw = tidy(value).replace(/\s/g, "");
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && !onlySecure)) return null;
    if (!url.hostname.includes(".")) return null;
    const text = url.toString();
    return text.length <= LIMITS.url ? text : null;
  } catch {
    return null;
  }
}

/** "129", "129.5", "$1,299.00" to cents; blank to null; nonsense to undefined. */
export function priceToCents(value: unknown): number | null | undefined {
  const raw = tidy(value).replace(/^\$/, "").replace(/,/g, "");
  if (!raw) return null;
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw)) return undefined;
  const cents = Math.round(Number(raw) * 100);
  return cents >= 1 && cents <= LIMITS.priceCents ? cents : undefined;
}

const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** "$129", "$129.50". Whole dollars carry no cents; a price with cents always has two. */
export function price(cents: number | null): string | null {
  if (cents === null) return null;
  return (cents % 100 === 0 ? whole : exact).format(cents / 100);
}

/** What goes in a price box when a gift is edited. */
export function priceField(cents: number | null): string {
  if (cents === null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/**
 * The shop's name, from its address, for a gift whose store the family left
 * blank: "www.williams-sonoma.com" is "Williams Sonoma". It is a first guess in
 * the family's own words' place, and they can type over it.
 */
export function storeFromUrl(address: string): string {
  try {
    const labels = new URL(address).hostname.replace(/^www\./, "").split(".");
    // "shop.example.co.uk": the label before a two-letter country code and its
    // second-level part, otherwise the one before the last.
    const tld = labels[labels.length - 1] ?? "";
    const second = labels[labels.length - 2] ?? "";
    const at = tld.length === 2 && ["co", "com", "org", "net"].includes(second) ? labels.length - 3 : labels.length - 2;
    const name = (labels[Math.max(at, 0)] ?? "").replace(/[-_]+/g, " ").trim();
    return name.replace(/\b\p{L}/gu, (c) => c.toUpperCase()).slice(0, LIMITS.store);
  } catch {
    return "";
  }
}

/**
 * The family's form, read. `image` is whatever address is in the photo box
 * (a pasted one, or the gift's current one left as it was); a file they
 * uploaded is dealt with by the route before this is called.
 */
export function check(form: FormData): CheckedGift {
  const field = (name: string) => form.get(name);

  const name = tidy(field("name"));
  if (!name || name.length > LIMITS.name) return { ok: false, problem: "name" };

  const url = webAddress(field("url"));
  if (!url) return { ok: false, problem: "url" };

  const note = tidy(field("note"));
  if (note.length > LIMITS.note) return { ok: false, problem: "note" };

  const store = tidy(field("store")) || storeFromUrl(url);
  if (store.length > LIMITS.store) return { ok: false, problem: "store" };

  const imageRaw = tidy(field("image"));
  const image = imageRaw ? webAddress(imageRaw, true) : null;
  if (imageRaw && !image) return { ok: false, problem: "image" };

  const cents = priceToCents(field("price"));
  if (cents === undefined) return { ok: false, problem: "price" };

  const id = tidy(field("id"));
  return { ok: true, gift: { id: id || null, name, note, store, url, image, price_cents: cents } };
}

/** What the family's page says when a gift could not be saved. */
export const PROBLEMS: Record<GiftProblem, string> = {
  name: "The gift needs a name of up to 120 letters.",
  url: "The link did not look like a web address. Copy it again from the shop's page; it should begin https://.",
  image: "The photo address did not look right. It must begin https:// . Or leave it empty and upload the picture instead.",
  price: "The price should be a number of dollars, such as 129 or 129.50.",
  note: "The line about the gift is too long: 160 letters at most.",
  store: "The shop's name is too long: 60 letters at most.",
  upload_type: "That file is not a picture the page can use. Use a JPEG, PNG or WebP.",
  upload_size: "That picture is too large. 1.5 MB at most; a phone photo can be made smaller by sharing it at a smaller size.",
  upload_failed: "The picture could not be stored just now. The gift was not saved. Try again, or paste the photo's address instead.",
  full: "The registry holds up to 500 gifts, and it is full.",
  rejected: "The database refused the gift. Check that the link and the photo address both begin https:// and are not too long.",
  unavailable: "The database did not answer. Nothing was changed. Try again in a moment; the check-up on the Replies page says why.",
};
