import { invitation } from "@/content/invitation";
import styles from "./specimen.module.css";

/**
 * PHASE 1 SPECIMEN — temporary.
 *
 * Exists to verify the foundation: the two grounds, both faces loading, the
 * full type scale at its real clamp() values, the kolam lattice and the paper
 * grain. Replaced by the real page in phase 4.
 */
export default function Page() {
  const { couple, day, copy } = invitation;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.tag}>card ground — var(--ground)</p>

        <h1 className={styles.displayXl}>
          {couple.first}
          <span className={styles.conjunction}>{couple.conjunction}</span>
          {couple.second}
        </h1>

        <p className={styles.bodyL}>{copy.invitingLine}</p>

        <p className={styles.displayM}>
          {day.weekday}
          <br />
          {day.dateDisplay}
        </p>

        <p className={styles.venue}>
          <span className={styles.venueName}>{day.venue.name}</span>
          <br />
          {day.venue.locality}
        </p>
      </section>

      <section className={styles.field}>
        <p className={styles.tag}>field ground — var(--ground-deep)</p>

        <h2 className={styles.displayL}>{copy.sectionTitles.schedule}</h2>

        <p className={styles.body}>
          Body text at the shipping step, on the champagne ground where the
          editorial matter lives. Measure is capped so a line never runs past
          about sixty-two characters, and the leading is generous enough to
          read at arm&rsquo;s length.
        </p>

        <p className={styles.bodyS}>
          {day.venue.street}
          <br />
          {day.venue.city}, {day.venue.stateCode} {day.venue.postalCode}
        </p>

        <p className={styles.numerals}>
          <span className={styles.displayL}>0123456789</span>
          <br />
          <span className={styles.bodyS}>
            digit advances are uniform in both faces — no reflow when the
            countdown ticks
          </span>
        </p>
      </section>
    </main>
  );
}
