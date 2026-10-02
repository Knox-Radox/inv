import { invitation } from "@/content/invitation";
import { Knot } from "../art/Knot";
import styles from "./Closing.module.css";

/**
 * The closing note, the signature, and the knot — docs/design-plan.md § The
 * stitch idiom.
 *
 * Revision 9: the note is one sentence from the client, and under it sits their
 * sign-off with both names in script, the way a card in the post is signed.
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
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
      <img
        className={styles.blossoms}
        src="/photos/jasmine-cluster.jpg"
        alt=""
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        aria-hidden="true"
      />
      <p className={styles.note}>
        {copy.closingNote.map((line) => (
          <span key={line} className={styles.line}>
            {line}
          </span>
        ))}
      </p>
      <p className={styles.signoff}>
        {copy.closingSignoff}
        <span className={styles.signature}>{copy.closingSignature}</span>
      </p>
      <Knot className={styles.knot} size={26} />
    </section>
  );
}
