import styles from "./Thread.module.css";

/**
 * The running thread — docs/design-plan.md § The stitch idiom, item 4.
 *
 * A running stitch is mostly plain thread with occasional knots and flowers, so
 * the straight runs are CSS and only the events are SVG. That is not a shortcut:
 * it is the only construction that survives reflow, 200% zoom and large Dynamic
 * Type, because nothing here is a fixed-height path spanning the document.
 *
 * A flat 1.5px rule would read as printed. Three things stop it: a repeating
 * gradient along its length, which is the glint of a twisted thread catching
 * light; a half-pixel shadow to one side, the seam where it presses into the
 * cloth; and a hundredth of a degree off plumb, alternating by section, because
 * thread laid by hand is never plumb.
 */
export function Thread({ lean = 1 }: { lean?: 1 | -1 }) {
  return (
    <span
      className={styles.thread}
      style={{ "--lean": `${0.06 * lean}deg` } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

/**
 * Where the thread comes back through the cloth. The pucker a thread makes
 * passing through a weave — without it, the reappearance reads as a bug.
 */
export function Dimple() {
  return <span className={styles.dimple} aria-hidden="true" />;
}

/**
 * A tailor's tack: a short bar laid across the thread to mark a place. Not a
 * bullet and not a number — the schedule's order is already carried by the
 * thread's direction and by the times themselves.
 */
export function Tack() {
  return <span className={styles.tack} aria-hidden="true" />;
}
