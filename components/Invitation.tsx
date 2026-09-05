import { readFileSync } from "node:fs";
import path from "node:path";
import { InvitationCard } from "./InvitationCard";

/**
 * The card's sheet is the page's LCP element — it is the largest image in the
 * first viewport, and the fixed envelope above it does not change that. As a
 * fetched file it queued behind the JavaScript on Slow 4G (LCP 3.2 s,
 * measured). Read once at build and inlined, it paints with the document.
 * 8 KB of WebP; base64 adds about a third.
 */
export const cardSheet = `data:image/webp;base64,${readFileSync(
  path.join(process.cwd(), "public", "paper", "card-sheet.webp"),
).toString("base64")}`;

/**
 * The real, server-rendered card. First in the document, complete without
 * JavaScript, and the anchor the skip link points at.
 */
export function Invitation() {
  return (
    <article id="invitation">
      <InvitationCard sheetSrc={cardSheet} />
    </article>
  );
}
