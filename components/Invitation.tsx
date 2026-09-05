import { invitation } from "@/content/invitation";
import { Jasmine } from "./art/Jasmine";
import { KorvaiEdge } from "./art/KorvaiEdge";
import styles from "./Invitation.module.css";

/**
 * The invitation card — docs/design-plan.md § Layout.
 *
 * A ceremonial object: a fixed symmetrical rectangle, so its type is centred.
 * That is where the genre expectation of a centred invitation actually
 * attaches — not to the scrolling page, which is a ribbon.
 *
 * The jasmine is stitched centred above the names: centred as a block,
 * asymmetric as a drawing, which is how a letterpress card carries a botanical.
 * Its last strand dives behind the cloth, and the thread comes back through the
 * korvai edge at the bottom, on the left, where the editorial matter begins.
 */
export function Invitation() {
  const { couple, day, copy } = invitation;

  return (
    <article id="invitation" className={styles.card}>
      <div className={styles.inner}>
        <Jasmine className={styles.spray} />

        <h1 className={styles.names}>
          <span className={styles.name}>{couple.first}</span>
          <span className={styles.conjunction}>{couple.conjunction}</span>
          <span className={styles.name}>{couple.second}</span>
        </h1>

        <p className={styles.inviting}>{copy.invitingLine}</p>

        <p className={styles.date}>
          <span className={styles.weekday}>{day.weekday}</span>
          <span>{day.dateDisplay}</span>
        </p>

        <p className={styles.venue}>
          <span className={styles.venueName}>{day.venue.name}</span>
          <span>{day.venue.locality}</span>
        </p>
      </div>

      {/* The card is cloth, so its edge is a korvai — the woven border where
          the body of a Kanjivaram meets its border. It marks the one
          structural boundary in the piece, and the thread surfaces through it. */}
      <KorvaiEdge className={styles.edge} />
    </article>
  );
}
