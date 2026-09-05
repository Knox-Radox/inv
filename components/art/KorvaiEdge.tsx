import { useId } from "react";
import { KORVAI_TILE, KORVAI_TILE_H, KORVAI_TILE_W } from "./paths";

/**
 * The card's bottom edge — docs/design-plan.md § Korvai, the real job.
 *
 * A korvai is not ornament applied to cloth: it is the woven edge where the
 * body of a Kanjivaram meets its border. The card is cloth, so its edge is a
 * korvai — a reku temple band between two hairlines, triangles pointing down
 * into the field, which is the direction of travel.
 *
 * It marks the one structural boundary in the piece: where the ceremonial
 * object ends and the editorial matter begins. The thread surfaces through it.
 *
 * Deliberately no viewBox. The band must stay a fine 4px weave at every width;
 * a stretched viewBox turns it into a chunky sawtooth, which is a different and
 * much worse thing.
 */
export function KorvaiEdge({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const tile = `k${uid}`;

  return (
    <svg
      className={className}
      width="100%"
      height={KORVAI_TILE_H}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern
          id={tile}
          width={KORVAI_TILE_W}
          height={KORVAI_TILE_H}
          patternUnits="userSpaceOnUse"
        >
          <path d={KORVAI_TILE} fill="var(--gold)" fillOpacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="0.5" fill="var(--gold)" fillOpacity="0.45" />
      <rect y="0.5" width="100%" height={KORVAI_TILE_H - 1} fill={`url(#${tile})`} />
      <rect
        y={KORVAI_TILE_H - 0.5}
        width="100%"
        height="0.5"
        fill="var(--gold)"
        fillOpacity="0.45"
      />
    </svg>
  );
}
