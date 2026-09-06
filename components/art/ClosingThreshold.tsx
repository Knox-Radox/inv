import { LazyDecor } from "./LazyDecor";
import styles from "./ClosingThreshold.module.css";

/**
 * The closing threshold — docs/revision-6-ornament.md, pieces 8 and 9.
 *
 * Two urns holding jasmine, and a kolam drawn on the ground between them.
 *
 * The reference closes on two urns of white roses and a monogram. This is the
 * same move with the page's own materials: the flower is the one the guests
 * will be wearing, and the mark on the ground is the one a South Indian house
 * puts at its door every morning.
 *
 * **The kolam is the page's last gesture and the only animation on it worth
 * watching twice.** A kolam is drawn around a grid of dots that go down first;
 * the line follows, freehand, looping around them without ever crossing one.
 * That order is the whole point — it is why the dots here appear before the
 * line, from the centre outward, and why the line is a draw-on and not a fade.
 * It is drawn at dawn, it is meant to be walked over, and it means the house is
 * ready to receive you, which is the last thing an invitation has to say.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0 → 1.4s | The urns are drawn and the stone floods in. |
 * | 1 | 0.9 → 1.8s | The jasmine mounds over both lips. |
 * | 2 | 1.5 → 2.2s | The pulli go down, from the centre outward. |
 * | 3 | 2.2 → 4.0s | The eight petals are looped, and the line closes around them. |
 */

export function ClosingThreshold({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <LazyDecor piece="closing" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}

/**
 * The kolam, rendered *outside* the field's inner measure.
 *
 * Two reasons, and the second is the real one. It is centred on the page
 * rather than on the 700px column, which is where a mark on the floor belongs
 * and is where the urns already are. And the running thread is absolutely
 * positioned inside that measure, so anything left in it extends the thread:
 * with the kolam inside, the thread ran six hundred pixels past the knot it is
 * supposed to tie off at — which nobody had noticed, because until this
 * revision the knot was clipped and never painted at all.
 */
export function KolamMark() {
  return <LazyDecor piece="kolam" flow />;
}
