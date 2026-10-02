import { MOTIF } from "./motif";
import styles from "./Butis.module.css";

const BUTI = MOTIF.buti;
const [, , BW, BH] = BUTI.box;

/** How many stand in the row, and how far alternate ones drop. */
const COUNT = 5;
const DROP = 0.12;

/**
 * The row of butis at the foot of a card — docs/revision-9-plan.md.
 *
 * A buti is the small flowering sprig block-printed across Indian cloth, and
 * the family's printed invitation stands a row of them along the bottom of
 * every card. This is that row, redrawn: one carnation sprig from
 * `tools/motif.py`, set five times, alternate ones turned and dropped — which
 * is what a hand block does when the printer walks it along the cloth.
 *
 * The sprig's paths are written once and referenced five times. `id` has to
 * be unique in the document because the card is rendered twice, once on the
 * page and once inside the envelope.
 *
 * Every colour is set in the stylesheet, none in an attribute. An SVG shape
 * whose fill cannot be read is not left unpainted, it is painted black, so
 * each one here is a plain declaration with nothing a browser can decline.
 *
 * Flat pigment with a gradient rather than a clipped wash sheet. The card is
 * the first thing after the cover, so nothing on it may wait on a second
 * image, and at eighteen pixels a bloom has no room for granulation anyway.
 */
export function Butis({ id, className }: { id: string; className?: string }) {
  return (
    <div className={`${styles.row} ${className ?? ""}`} aria-hidden="true">
      {/* The block itself. Zero-sized, never painted, only referenced. */}
      <svg className={styles.block} width="0" height="0" focusable="false">
        <defs>
          <linearGradient id={`${id}-bloom`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" className={styles.bloomFoot} />
            <stop offset="1" className={styles.bloomTip} />
          </linearGradient>
          <g id={`${id}-buti`}>
            {BUTI.leaves.map((lf, i) => (
              <g key={`l${i}`}>
                <path d={lf.sil} className={styles.leaf} />
                <path d={lf.mid.d} className={styles.vein} />
              </g>
            ))}
            {BUTI.stems.map((st, i) => (
              <path key={`s${i}`} d={st.d} className={styles.stem} strokeWidth={st.w} />
            ))}
            {BUTI.blooms.map((bl, i) => (
              <g key={`b${i}`}>
                <path
                  d={bl.sil}
                  className={styles.bloom}
                  // The gradient, and a pigment to fall back on. A paint that
                  // cannot be resolved with nothing after it is black.
                  style={{ fill: `url(#${id}-bloom) var(--kumkum)` }}
                />
                {bl.folds.map((f, k) => (
                  <path key={k} d={f.d} className={styles.fold} />
                ))}
                <path d={BUTI.cups[i]?.sil} className={styles.cup} />
              </g>
            ))}
          </g>
        </defs>
      </svg>
      {Array.from({ length: COUNT }, (_, i) => (
        <svg
          key={i}
          className={styles.buti}
          viewBox={`0 0 ${BW} ${BH}`}
          focusable="false"
          style={
            {
              "--drop": i % 2 ? DROP : 0,
              "--i": i,
            } as React.CSSProperties
          }
        >
          <use
            href={`#${id}-buti`}
            // Alternate sprigs are the block turned over.
            transform={i % 2 ? `translate(${BW} 0) scale(-1 1)` : undefined}
          />
        </svg>
      ))}
    </div>
  );
}
