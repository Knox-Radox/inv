import { LazyDecor } from "./LazyDecor";
import styles from "./Entrance.module.css";

/**
 * What stands either side of the plate — docs/revision-6-ornament.md,
 * pieces 6 and 7.
 *
 * Banana stems on one side and a jasmine bough leaning in on the other. The
 * vazhai is the most literal ornament in the whole programme: two banana
 * plants tied either side of the door is exactly what a South Indian family
 * does to a house on a wedding morning, and it is the one piece here that is
 * not standing in for anything.
 *
 * A cypress cluster stood on the other side for two passes and was cut — see
 * the note in tools/ornament.py. The bough that replaced it is the card's own
 * jasmine spray at four times the size, which `docs/design-plan.md` §
 * Illustration inventory listed as item 10 and never got built.
 *
 * The map plate keeps its own road draw-on. The plants arrive first, so the
 * section reads as a curtain going up on it rather than as two animations
 * competing.
 */

export function Entrance({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <LazyDecor piece="entrance" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
