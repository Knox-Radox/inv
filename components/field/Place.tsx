import { invitation } from "@/content/invitation";
import { LazyMapPlate } from "../art/LazyMapPlate";
import styles from "./Place.module.css";

/**
 * The place — docs/revision-7-map.md.
 *
 * Two settled decisions were reversed here by the client. The plate used to be
 * decorative only, with invented geography and no link, and it was rejected as
 * being of no use. It is now traced from real survey and the whole of it opens
 * Google Maps.
 *
 * The plate and its label are **one** anchor rather than a picture beside a
 * link that does the same thing. That gives one target, one accessible name and
 * one focus ring, and it makes the tap area the size of the drawing — which is
 * what a guest on a phone will reach for anyway. It is the page's fourth
 * interactive element and the cap in CLAUDE.md was lifted to four to allow it.
 *
 * The drawing itself arrives on approach and never on the server — see
 * LazyMapPlate. This section stays a server component around it, so with
 * JavaScript off a guest still gets the heading, the link, the address and the
 * credit: every fact, and the one action.
 */

export function Place() {
  const { day, copy, map } = invitation;

  return (
    <section className={styles.section} aria-labelledby="the-place">
      <h2 id="the-place" className={styles.title}>
        {copy.sectionTitles.location}
      </h2>

      <a
        className={styles.plateLink}
        href={map.href}
        target="_blank"
        rel="noreferrer"
      >
        <LazyMapPlate />
        <span className={styles.linkLabel}>{map.linkLabel}</span>
      </a>

      <address className={styles.address}>
        {day.venue.street}
        <br />
        {day.venue.city}, {day.venue.stateCode} {day.venue.postalCode}
      </address>

      {/*
       * Required by the ODbL. The plate is a drawn work derived from OSM road
       * and water geometry, and the credit is not optional — it belongs on the
       * page a guest sees, not only in a comment in the tool that traced it.
       */}
      <p className={styles.credit}>{map.attribution}</p>
    </section>
  );
}
