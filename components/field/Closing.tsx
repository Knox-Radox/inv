import { invitation } from "@/content/invitation";
import { Knot } from "../art/Knot";
import styles from "./Closing.module.css";

/**
 * The closing note, and the knot — docs/design-plan.md § The stitch idiom.
 *
 * There is exactly one knot on the page and this is it: the thread ties off,
 * and it is the last mark on the invitation. Nothing is drawn beneath it,
 * because a decorative band there would say "the end" a second time and worse,
 * immediately after the page has said it well. That band was the Chanel cut.
 */
export function Closing() {
  const { copy } = invitation;

  return (
    <section className={styles.section}>
      <p className={styles.note}>
        {copy.closingNote.map((line) => (
          <span key={line} className={styles.line}>
            {line}
          </span>
        ))}
      </p>
      <Knot className={styles.knot} size={26} />
    </section>
  );
}
