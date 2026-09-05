import { InvitationCard } from "./InvitationCard";

/**
 * The real, server-rendered card. First in the document, complete without
 * JavaScript, and the anchor the skip link points at.
 */
export function Invitation() {
  return (
    <article id="invitation">
      <InvitationCard />
    </article>
  );
}
