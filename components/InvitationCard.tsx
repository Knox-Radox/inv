import { invitation } from "@/content/invitation";
import { Jasmine } from "./art/Jasmine";
import { KorvaiEdge } from "./art/KorvaiEdge";
import { EmbossedPaper } from "./material/EmbossedPaper";
import styles from "./InvitationCard.module.css";

/**
 * The invitation card — revision 3.
 *
 * Embossed cotton paper with a blind floral relief in its corners, the jasmine
 * stitched centred above the names, and the woven korvai edge at its foot.
 *
 * Rendered twice: once as the real, server-rendered card the page is built on,
 * and once inside the envelope as the thing the doors part to reveal. The two
 * are the same component with the same CSS, so the moment the envelope fades
 * the page beneath is pixel-identical and nothing appears to move. The replica
 * is hidden from assistive tech and inert.
 */
export function InvitationCard({ replica = false }: { replica?: boolean }) {
  const { couple, day, copy } = invitation;
  // The real card carries the page's one h1. The replica inside the envelope
  // is aria-hidden and inert, so it must not add a second.
  const Names = replica ? "p" : "h1";

  return (
    <div
      className={`${styles.card} ${replica ? styles.replica : ""}`}
      aria-hidden={replica || undefined}
      // @ts-expect-error React 19 types the attribute as boolean; it is fine.
      inert={replica ? "" : undefined}
    >
      <div className={styles.inner}>
        <EmbossedPaper sheet="card" className={styles.paper} />

        <div className={styles.content}>
          <Jasmine className={styles.spray} />

          <Names className={styles.names}>
            <span className={styles.name}>{couple.first}</span>
            <span className={styles.conjunction}>{couple.conjunction}</span>
            <span className={styles.name}>{couple.second}</span>
          </Names>

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

        <KorvaiEdge className={styles.edge} />
      </div>
    </div>
  );
}
