import styles from "./Stitch.module.css";

/**
 * One stitched line — docs/design-plan.md § The stitch idiom.
 *
 * The single primitive every drawn line on this page goes through, so the
 * draw-on mechanic exists once rather than per illustration.
 *
 * A stitched line differs from a printed one in three ways, all of them here:
 *
 * 1. It is drawn twice. A shadow pass sits under the thread, offset a little
 *    down and half a unit wider — the seam where the thread presses into the
 *    weave. It is the cheapest thing that stops a line reading as ink.
 * 2. It ends in a rounded bar-tack, so `round` caps throughout. At a terminal
 *    the width is down to about half a unit, so the cap reads as a taper.
 * 3. It can be pulled through the cloth. `stroke-dasharray` is set from a
 *    length computed at author time — the browser never measures a path.
 *
 * The resting state is fully drawn. The animation supplies only the *from*
 * value, via `animation-fill-mode: backwards`, so cancelling every animation on
 * the page leaves every line complete. That is the structural guarantee behind
 * lockout test T2, and it is why nothing here sets a final dashoffset.
 */
export function Stitch({
  d,
  length,
  width,
  tone = "sage",
  delay = 0,
  duration = 900,
  opacity,
  shadow = true,
}: {
  d: string;
  /** Path length, from tools/*.py. Never measured in the browser. */
  length: number;
  width: number;
  tone?: "sage" | "gold" | "deep" | "stone" | "brass";
  /** Milliseconds, relative to the start of the sequence. */
  delay?: number;
  duration?: number;
  opacity?: number;
  /** Off for hairline details, where a seam would only muddy the line. */
  shadow?: boolean;
}) {
  const style = {
    "--stitch-len": length,
    "--stitch-delay": `${delay}ms`,
    "--stitch-duration": `${duration}ms`,
  } as React.CSSProperties;

  return (
    <>
      {shadow && (
        <path
          className={`${styles.line} ${styles.shadow}`}
          d={d}
          strokeWidth={width + 0.5}
          // The seam lands just after the thread does.
          style={{ ...style, "--stitch-delay": `${delay + 40}ms` } as React.CSSProperties}
        />
      )}
      <path
        className={`${styles.line} ${styles[tone]}`}
        d={d}
        strokeWidth={width}
        opacity={opacity}
        style={style}
      />
    </>
  );
}
