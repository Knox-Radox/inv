import styles from "./Border.module.css";

/**
 * The mirror-work border — docs/revision-9-plan.md § Principles, 2.
 *
 * The family's printed invitation frames every card in a row of eight-petalled
 * flowers, each with a small silver disc at its centre inside a magenta ring.
 * That is *shisha* work — a mirror held to the cloth by a ring of stitching —
 * and the brief's governing metaphor has been embroidery since revision 1, so
 * of everything in the PDF this was the one motif that was already this page's
 * own. It is redrawn in `tools/motif.py`, not lifted.
 *
 * Four strips rather than one `border-image`, for two reasons. A strip is a
 * CSS background with `background-repeat: round`, which is the only thing on
 * the web that fits a whole number of flowers to a card of any size without
 * script. And four strips can arrive separately: inside the envelope the
 * border is *strung* — two threads leave the top-left corner, one along the
 * top and one down the side, and meet at the bottom-right — and each strip is
 * a row of beads sliding along its own edge. Transform only, so it composites.
 *
 * At rest it is simply there. The animation supplies the starting position
 * and nothing else, so cancelling it leaves the border complete, which is the
 * same guarantee `Stitch` gives every drawn line.
 */
export function Border({ className }: { className?: string }) {
  return (
    <div className={`${styles.border} ${className ?? ""}`} aria-hidden="true">
      <span className={`${styles.edge} ${styles.top}`}>
        <i />
      </span>
      <span className={`${styles.edge} ${styles.left}`}>
        <i />
      </span>
      <span className={`${styles.edge} ${styles.right}`}>
        <i />
      </span>
      <span className={`${styles.edge} ${styles.bottom}`}>
        <i />
      </span>
    </div>
  );
}
