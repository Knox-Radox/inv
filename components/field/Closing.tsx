import { invitation } from "@/content/invitation";
import { Knot } from "../art/Knot";
import styles from "./Closing.module.css";

/**
 * The photograph's two cuts, at the sizes `couple()` in tools/paint.py writes
 * them. The tall one is for a phone, where the whole frame would make the two
 * of them an inch high.
 */
const PORTRAIT = {
  tall: { src: "/photos/couple-tall.webp", width: 900, height: 1182 },
  wide: { src: "/photos/couple-wide.webp", width: 1400, height: 1138 },
} as const;

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
 *
 * Above the note, since October 2026, is the one photograph of the two of
 * them, at the client's request. The note is the one place the page speaks in
 * their voice, and they sign it; a picture of them walking towards you
 * belongs over it. It has no frame, because the page has no boxes: it thins
 * out into the paper the way the washes do, and the sand under their feet
 * runs out where the note begins.
 */
export function Closing() {
  const { copy, registry } = invitation;

  return (
    <section className={styles.section}>
      <picture className={styles.portrait}>
        <source
          media="(min-width: 600px)"
          srcSet={PORTRAIT.wide.src}
          width={PORTRAIT.wide.width}
          height={PORTRAIT.wide.height}
        />
        <img
          className={styles.portraitImage}
          src={PORTRAIT.tall.src}
          width={PORTRAIT.tall.width}
          height={PORTRAIT.tall.height}
          alt={copy.closingPortraitAlt}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <div className={styles.words}>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
        <img
          className={styles.blossoms}
          src="/photos/blossoms.webp"
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
        <a className={styles.registry} href="/registry">
          {registry.linkLabel}
        </a>
      </div>
      <Knot className={styles.knot} size={26} />
    </section>
  );
}
