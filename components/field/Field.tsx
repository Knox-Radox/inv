import { Closing } from "./Closing";
import { Jasmine } from "../art/Jasmine";
import { Countdown } from "./Countdown";
import { Place } from "./Place";
import { Schedule } from "./Schedule";
import { Dimple, Thread } from "./Thread";
import styles from "./Field.module.css";

/**
 * The field — docs/design-plan.md § Layout, "ceremonial object, then editorial
 * matter".
 *
 * Everything below the card's woven edge: the practical matter of the day, hung
 * off the thread's left datum where it is easiest to read at arm's length.
 *
 * The card above is a fixed symmetrical rectangle and its type is centred,
 * because that is where the genre expectation of a centred invitation actually
 * attaches. A scrolling page is a ribbon, and centred text on a ribbon reflows
 * to a new optical centre on every line — measurably harder for an older reader
 * to scan, and half this audience is over sixty.
 *
 * The thread is never centred with content on both sides. Above the korvai edge
 * it is behind the cloth; below it, it is a left margin with content on one
 * side only.
 */
export function Field() {
  return (
    <div className={styles.field}>
      {/*
       * One oversized crop, at 340% and 22%, bleeding off the right edge —
       * beside the editorial matter only, where the composition is deliberately
       * asymmetric. It is the same stitching seen very close, not a second
       * drawing. Hidden below 900px, where there is no field to put it in.
       */}
      <Jasmine className={styles.crop} />

      <div className={styles.inner}>
        {/* Where the thread comes back through the woven edge. */}
        <Dimple />
        <Thread lean={1} />

        <Countdown />
        <Schedule />
        <Place />
        <Closing />
      </div>
    </div>
  );
}
