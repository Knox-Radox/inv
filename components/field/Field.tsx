import { Closing } from "./Closing";
import { Countdown } from "./Countdown";
import { Place } from "./Place";
import { Reveal } from "./Reveal";
import { Schedule } from "./Schedule";
import { Dimple, Thread } from "./Thread";
import styles from "./Field.module.css";

/**
 * The field — revision 3.
 *
 * Everything below the card's woven edge, hung off the thread's left datum,
 * each section rising into view as the guest reaches it. Behind it, on wide
 * screens, a soft photograph of a jasmine branch drifts very slowly — the
 * ornament the client asked for, kept far enough back that the type stays
 * quiet on top of it.
 */
export function Field() {
  return (
    <div className={styles.field}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a decorative
          backdrop; next/image's layout machinery buys nothing here. */}
      <img
        className={styles.backdrop}
        src="/photos/jasmine-branch.jpg"
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
      <div className={styles.veil} aria-hidden="true" />

      <div className={styles.inner}>
        <Dimple />
        <Thread lean={1} />

        <Reveal>
          <Countdown />
        </Reveal>
        <Reveal delay={80}>
          <Schedule />
        </Reveal>
        <Reveal delay={80}>
          <Place />
        </Reveal>
        <Reveal delay={80}>
          <Closing />
        </Reveal>
      </div>
    </div>
  );
}
