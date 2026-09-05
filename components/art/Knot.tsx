import { KNOT, KNOT_LEN, KNOT_LIGHT } from "./paths";
import { Stitch } from "./Stitch";

/**
 * The knot — docs/design-plan.md § The stitch idiom, item 5.
 *
 * There is exactly one on the page, at the closing note, where the thread ties
 * off. It is the last mark on the invitation and the payoff of the whole thread
 * idea, which is why nothing is drawn beneath it.
 *
 * Three turns as a single centreline that visibly overlaps itself twice, so the
 * wrap is legible. Not a circle with a dot in it.
 */
export function Knot({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <Stitch d={KNOT} length={KNOT_LEN} width={1.1} tone="gold" duration={0} />
      {/* One short arc of light on the upper left, where the page's light
          comes from. A highlight layer would flatten it. */}
      <path
        d={KNOT_LIGHT}
        fill="none"
        stroke="var(--gold-light)"
        strokeWidth="0.6"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}
