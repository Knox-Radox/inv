import { useId } from "react";
import {
  KORVAI_REKU,
  MARK_LIFT,
  MARK_SCALE,
  MONO_A,
  MONO_S,
  RING_INNER,
  RING_OUTER,
  WAX_LEFT,
  WAX_RIGHT,
  WAX_WHOLE,
} from "./paths";
import styles from "./WaxSeal.module.css";

/**
 * The wax seal — revision 3.
 *
 * The first version was gradients over a shape and it read as a coin. This one
 * is *lit*: the wax body's softened alpha is a dome, `#mat-wax` gives it
 * diffuse form and a satin specular, `#mat-wax-shadow` casts it onto the
 * paper, and the impression is pressed in with `#mat-deboss`. Sage rather than
 * gold, as in the client's reference — gold on ivory reads as metal, sage
 * reads as wax.
 *
 * The body ships whole for the resting state and as two lit halves for the
 * crack. Both are always in the DOM; `.cracked` swaps which is visible and
 * sends the halves apart, down, and away. The impression is defined once and
 * worn by every piece, clipped to it, so the monogram breaks with the wax.
 *
 * Requires <MaterialDefs/> once on the page.
 */
export function WaxSeal({
  size = 132,
  cracked = false,
  className,
}: {
  size?: number;
  cracked?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const face = `f${uid}`;
  const clipL = `cl${uid}`;
  const clipR = `cr${uid}`;

  return (
    <svg
      className={[styles.seal, cracked ? styles.cracked : "", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="-10 -8 120 122"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <g id={face}>
          <g filter="url(#mat-deboss)">
            <path d={KORVAI_REKU} fill="#7b8a74" opacity="0.85" />
            <circle cx="50" cy="50" r={RING_OUTER} fill="none" stroke="#7b8a74" strokeWidth="0.55" opacity="0.8" />
            <circle cx="50" cy="50" r={RING_INNER} fill="none" stroke="#7b8a74" strokeWidth="0.55" opacity="0.8" />
            <g transform={`translate(50 ${50 + MARK_LIFT}) scale(${MARK_SCALE}) translate(-50 -50)`}>
              <path d={MONO_A} fill="#76856f" />
              <path d={MONO_S} fill="#76856f" />
            </g>
          </g>
        </g>
        <clipPath id={clipL}>
          <path d={WAX_LEFT} />
        </clipPath>
        <clipPath id={clipR}>
          <path d={WAX_RIGHT} />
        </clipPath>
      </defs>

      <g className={styles.whole}>
        <path d={WAX_WHOLE} fill="#000" filter="url(#mat-wax-shadow)" />
        <path d={WAX_WHOLE} fill="var(--wax)" filter="url(#mat-wax)" />
        <use href={`#${face}`} />
      </g>

      <g className={styles.halfLeft}>
        <path d={WAX_LEFT} fill="#000" filter="url(#mat-wax-shadow)" />
        <path d={WAX_LEFT} fill="var(--wax)" filter="url(#mat-wax)" />
        <g clipPath={`url(#${clipL})`}>
          <use href={`#${face}`} />
        </g>
      </g>
      <g className={styles.halfRight}>
        <path d={WAX_RIGHT} fill="#000" filter="url(#mat-wax-shadow)" />
        <path d={WAX_RIGHT} fill="var(--wax)" filter="url(#mat-wax)" />
        <g clipPath={`url(#${clipR})`}>
          <use href={`#${face}`} />
        </g>
      </g>
    </svg>
  );
}
