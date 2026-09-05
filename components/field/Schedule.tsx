import { invitation } from "@/content/invitation";
import { Tack } from "./Thread";
import styles from "./Schedule.module.css";

/**
 * The day — docs/design-plan.md § Layout.
 *
 * Two moments on one continuous spine, at one venue. The thread does not break
 * between them, which is how the seven and a half hours between the ceremony
 * and the reception are answered: by a drawing rather than by a sentence the
 * couple has not written. See docs/open-questions.md #1.
 *
 * Ordinal markers are earned here — this is a genuine sequence — and are
 * declined anyway. The thread already carries order by its direction, and the
 * times are themselves ordinal; 01 / 02 would be redundant and would read as
 * the treatment the brief bans even where it is legitimate.
 *
 * The venue is named once, beneath both, because attaching an address to each
 * moment is what makes one day at one place read as two events in two.
 */
export function Schedule() {
  const { day, copy } = invitation;

  return (
    <section className={styles.section} aria-labelledby="the-day">
      <h2 id="the-day" className={styles.title}>
        {copy.sectionTitles.schedule}
      </h2>

      <ol className={styles.list}>
        {day.moments.map((m) => (
          <li key={m.id} className={styles.moment}>
            <Tack />
            <p className={styles.time}>
              <time dateTime={m.startsAt}>{m.startDisplay}</time>
            </p>
            <p className={styles.label}>{m.label}</p>
            <p className={styles.qualifier}>{m.qualifier}</p>
          </li>
        ))}
      </ol>

      <p className={styles.shared}>{copy.sharedVenueLine}</p>
    </section>
  );
}
