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
  WAX_RIM,
} from "./paths";
import styles from "./WaxSeal.module.css";

/**
 * The wax seal — docs/design-plan.md § The A/S monogram.
 *
 * The most looked-at object on the page, so every part of it is drawn rather
 * than approximated. The body is a perturbed perimeter with two squeeze-out
 * lobes; the rim is an arc present only where the light is not; the monogram is
 * debossed by an SVG filter that puts shadow on the inner upper-left wall and a
 * light catch on the lower-right, which is what an impression lit from the
 * upper left actually looks like.
 *
 * There is deliberately no `box-shadow` and no `drop-shadow` anywhere in here.
 * A flat circle with a shadow under it reads as a sticker.
 *
 * The body ships as two halves either side of an irregular fault so beat 1 of
 * the opening can rotate and drop them apart. Intact, the halves sit edge to
 * edge and the seam is invisible.
 */
export function WaxSeal({
  size = 96,
  cracked = false,
  className,
}: {
  size?: number;
  /** Drives the CSS that separates the halves. Purely presentational. */
  cracked?: boolean;
  className?: string;
}) {
  // Scoped so a second seal on the page cannot capture the first one's paint
  // servers — the share card renders one too.
  const uid = useId().replace(/:/g, "");
  const body = `b${uid}`;
  const spec = `s${uid}`;
  const deboss = `d${uid}`;

  return (
    <svg
      className={[styles.seal, cracked ? styles.cracked : "", className]
        .filter(Boolean)
        .join(" ")}
      width={size}
      height={size}
      viewBox="-3 -3 106 106"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient
          id={body}
          gradientUnits="userSpaceOnUse"
          cx="33"
          cy="28"
          r="82"
        >
          <stop offset="0%" stopColor="#D8BC8C" />
          <stop offset="30%" stopColor="var(--gold-light)" />
          <stop offset="62%" stopColor="var(--gold)" />
          <stop offset="90%" stopColor="#9A7A4A" />
          <stop offset="100%" stopColor="#846B46" />
        </radialGradient>

        <radialGradient id={spec} gradientUnits="userSpaceOnUse" cx="31" cy="25" r="18">
          <stop offset="0%" stopColor="#FFF4E0" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#FFF4E0" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFF4E0" stopOpacity="0" />
        </radialGradient>

        {/* Deboss: shadow banked against the inner upper-left wall, a light
            catch on the lower-right. Light comes from the upper left, once,
            for the whole page. */}
        <filter
          id={deboss}
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" result="blur" />
          <feOffset in="blur" dx="0.75" dy="0.85" result="offDark" />
          <feComposite in="offDark" in2="SourceAlpha" operator="out" result="maskDark" />
          <feFlood floodColor="#5A4526" floodOpacity="0.62" result="colDark" />
          <feComposite in="colDark" in2="maskDark" operator="in" result="shadeDark" />
          <feOffset in="blur" dx="-0.7" dy="-0.8" result="offLite" />
          <feComposite in="offLite" in2="SourceAlpha" operator="out" result="maskLite" />
          <feFlood floodColor="#EBD3A6" floodOpacity="0.55" result="colLite" />
          <feComposite in="colLite" in2="maskLite" operator="in" result="shadeLite" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="shadeLite" />
            <feMergeNode in="shadeDark" />
          </feMerge>
        </filter>
      </defs>

      <g className={styles.halfLeft}>
        <path d={WAX_LEFT} fill={`url(#${body})`} />
      </g>
      <g className={styles.halfRight}>
        <path d={WAX_RIGHT} fill={`url(#${body})`} />
      </g>

      {/* Impression and rim ride on the intact face and leave with the crack. */}
      <g className={styles.face}>
        {/* The pooled lip: a filled sliver tapering to nothing at both ends,
            present only on the shaded side, because a rim shows where the
            light is not. */}
        <path d={WAX_RIM} fill="#6E5734" fillOpacity="0.4" />
        <g filter={`url(#${deboss})`}>
          <path d={KORVAI_REKU} fill="#7A6140" opacity="0.9" />
          <circle
            cx="50"
            cy="50"
            r={RING_OUTER}
            fill="none"
            stroke="#7A6140"
            strokeWidth="0.45"
            opacity="0.75"
          />
          <circle
            cx="50"
            cy="50"
            r={RING_INNER}
            fill="none"
            stroke="#7A6140"
            strokeWidth="0.45"
            opacity="0.75"
          />
          <g
            transform={`translate(50 ${50 + MARK_LIFT}) scale(${MARK_SCALE}) translate(-50 -50)`}
          >
            <path d={MONO_A} fill="#7A6140" />
            <path d={MONO_S} fill="#7A6140" />
          </g>
        </g>
        <ellipse
          cx="31"
          cy="25"
          rx="17"
          ry="10"
          fill={`url(#${spec})`}
          transform="rotate(-30 31 25)"
        />
      </g>
    </svg>
  );
}
