import { LazyDecor } from "./LazyDecor";
import styles from "./Hanging.module.css";

/**
 * What hangs beside the day — docs/revision-6-ornament.md, piece 5.
 *
 * One vertical rather than another swag: the thoranam already spans the top of
 * the section above this one, and repeating that gesture immediately would
 * turn two different ideas into a pattern. A silk drape hung on the other side
 * for three passes and was cut — see the note in tools/ornament.py.
 *
 * The malai is the piece that matters. `docs/open-questions.md` #1 records that
 * the seven and a half hours between the ceremony and the reception are
 * answered by a drawing rather than by a sentence the couple has not written,
 * and the running thread has been making that argument since revision 3. The
 * garland makes it again in the other material: it is strung past both moments
 * without a break, because the day is one thing.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0.3 → 1.9s | The string runs down, and each flower is threaded as it passes. |
 * | 1 | 2.0 → 2.4s | The bunch at the foot, where the string is tied off. |
 */

export function Hanging({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <LazyDecor piece="hanging" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
