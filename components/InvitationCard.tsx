import { invitation } from "@/content/invitation";
import { Border } from "./art/Border";
import { Butis } from "./art/Butis";
import { Mark } from "./art/Mark";
import styles from "./InvitationCard.module.css";

/**
 * When each piece of the card arrives, in milliseconds from the tap that opens
 * the envelope. Only the replica uses these; the page's own card is simply
 * printed.
 *
 * Everything has to have landed before the cover starts to dissolve into the
 * page at 3650 ms (Envelope.module.css), because the page's card beneath it is
 * finished and the two must be the same picture when one fades into the other.
 */
const MARK_AT = 1650;
const BORDER_AT = 2050;
const BUTIS_AT = 2700;

/**
 * The invitation card — revision 9.
 *
 * A sheet of cotton paper inside a border of mirror-work, in the order the
 * family's printed invitation has it: the mark of Ganesha and its line first,
 * then the names, then the line that invites, the day, the place, and a row of
 * butis along the foot.
 *
 * The jasmine spray that used to stand above the names and the woven korvai
 * band along the bottom edge are both gone. A border on all four sides is a
 * frame; a spray above it and a band below it were a second and a third.
 *
 * Rendered twice: once as the real, server-rendered card the page is built on,
 * and once inside the envelope as the thing that comes out of it. The two are
 * the same component with the same CSS, so the moment the envelope fades the
 * page beneath is pixel-identical and nothing appears to move. The replica is
 * hidden from assistive tech and inert.
 */
export function InvitationCard({
  replica = false,
  sheetSrc,
}: {
  replica?: boolean;
  /** Inlined sheet, so the LCP element does not wait on a fetch. */
  sheetSrc?: string;
}) {
  const { couple, day, copy } = invitation;
  // The real card carries the page's one h1. The replica inside the envelope
  // is aria-hidden and inert, so it must not add a second.
  const Names = replica ? "p" : "h1";

  return (
    <div
      className={`${styles.card} ${replica ? styles.replica : ""}`}
      aria-hidden={replica || undefined}
      inert={replica || undefined}
      style={
        replica
          ? ({ "--border-at": `${BORDER_AT}ms`, "--butis-at": `${BUTIS_AT}ms` } as React.CSSProperties)
          : undefined
      }
    >
      <div className={styles.inner}>
        <div
          className={styles.paper}
          style={{ backgroundImage: `url(${sheetSrc ?? "/cover/card-paper.webp"})` }}
          aria-hidden="true"
        />

        <Border />

        <div className={styles.content}>
          <Mark className={styles.mark} beat={replica ? MARK_AT : 0} />
          <p className={styles.invocation}>
            <span aria-hidden="true">||</span> {copy.invocation} <span aria-hidden="true">||</span>
          </p>

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

          <Butis className={styles.butis} id={replica ? "cover" : "card"} />
        </div>
      </div>
    </div>
  );
}
