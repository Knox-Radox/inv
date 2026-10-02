import { invitation } from "@/content/invitation";
import styles from "./Travel.module.css";

/**
 * Travel, and where to stay — docs/revision-9-plan.md.
 *
 * The page was an invitation and not a wedding website, and for eight
 * revisions that meant it carried nothing a guest from out of town needs. The
 * client supplied this in revision 9, in their own words, and it is set as
 * they wrote it.
 *
 * It is the suite's details card: the piece that goes in the envelope behind
 * the invitation and says how to get there. So it is quiet. It takes the two
 * type sizes the schedule already has and nothing else — no ornament of its
 * own, because the client's instruction for this revision was "memorable and
 * not too much", and six hotels are not a place for a flourish.
 *
 * Each hotel is one link, to Google Maps, as the venue's plate is: the client
 * chose that over booking pages, which go stale. The name leads the link's
 * accessible name, which is what WCAG 2.5.3 asks for, and what the link does
 * is said once above the list rather than six times beside it.
 *
 * Not numbered. Six recommendations are a list, not a sequence, and the brief
 * allows ordinals only where order means something. The small mirror-work
 * flower at each one is the border's own, so the list belongs to the same card.
 */
export function Travel() {
  const { travel } = invitation;

  return (
    <section className={styles.section} aria-labelledby="travel">
      <h2 id="travel" className={styles.title}>
        {travel.title}
      </h2>
      <p className={styles.body}>{travel.body}</p>

      <h3 id="stay" className={styles.subtitle}>
        {travel.stayTitle}
      </h3>
      <p className={styles.body}>{travel.stayBody}</p>
      <p className={styles.hint}>{travel.hotelsHint}</p>

      <ul className={styles.hotels}>
        {travel.hotels.map((h) => {
          const locality = `${h.city}, ${h.stateCode}${h.postalCode ? ` ${h.postalCode}` : ""}`;
          return (
            <li key={h.name} className={styles.hotel}>
              <a
                className={styles.hotelLink}
                href={h.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${h.name}, ${h.street}, ${locality}. ${travel.hotelLinkLabel}.`}
              >
                <span className={styles.hotelName}>{h.name}</span>
                <span className={styles.hotelAddress}>
                  {h.street}
                  <br />
                  {locality}
                </span>
              </a>
              {h.phone && (
                <a className={styles.phone} href={`tel:${h.phone.tel}`}>
                  {h.phone.display}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
