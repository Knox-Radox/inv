import { ClosingThreshold, KolamMark } from "../art/ClosingThreshold";
import { Entrance } from "../art/Entrance";
import { Hanging } from "../art/Hanging";
import { Threshold } from "../art/Threshold";
import { Closing } from "./Closing";
import { Countdown } from "./Countdown";
import { Place } from "./Place";
import { Reply } from "./Reply";
import { Reveal } from "./Reveal";
import { Schedule } from "./Schedule";
import { Travel } from "./Travel";
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

        <Threshold>
          <Reveal>
            <Countdown />
          </Reveal>
        </Threshold>
        <Hanging>
          <Reveal delay={80}>
            <Schedule />
          </Reveal>
        </Hanging>
        <Entrance>
          <Reveal delay={80}>
            <Place />
          </Reveal>
        </Entrance>
        {/* No stage round this one, and no ornament: see Travel. */}
        <Reveal delay={80}>
          <Travel />
        </Reveal>

        {/* Not inside a `Reveal`: this one is a form, and a form that is
            invisible until an observer says otherwise is a form a guest can be
            locked out of. It is simply there. */}
        <Reply />

        <ClosingThreshold>
          <Reveal delay={80}>
            <Closing />
          </Reveal>
        </ClosingThreshold>
      </div>

      {/* Outside `.inner` on purpose — see KolamMark. */}
      <KolamMark />
    </div>
  );
}
