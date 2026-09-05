import { useId } from "react";
import { invitation } from "@/content/invitation";
import { MAP } from "./paths";
import styles from "./MapPlate.module.css";

/**
 * The engraved map plate — docs/design-plan.md § Illustration inventory.
 *
 * Purely visual. No link, no embed, no iframe, no deep link, no tile provider,
 * no click handler, no hover. It is a piece of art on a card and it does not
 * need to be to scale. The address beneath it, in the page, is the real
 * information and is selectable text.
 *
 * Because it carries no navigation job it has to carry a decorative one, so it
 * is drawn as a plate rather than as a diagram: the roads are tapered filled
 * outlines from the same pen as the monogram, the land carries cut hatching
 * whose density is the drawing, and the water is two banks with cross-strokes
 * rather than a dashed line.
 *
 * The thread branches in from the left edge and becomes County Road 419 — the
 * page's second and last draw-on, triggered once when the section comes into
 * view. Because the road is a filled outline rather than a stroke, the draw-on
 * runs on a hidden centreline that reveals it via a clip.
 */
export function MapPlate({ className }: { className?: string }) {
  const { map } = invitation;
  const road = map.namedRoads[0];
  const uid = useId().replace(/:/g, "");
  const clip = `c${uid}`;
  const reveal = `v${uid}`;

  return (
    <svg
      className={`${styles.plate} ${className ?? ""}`}
      viewBox="0 0 100 74"
      fill="none"
      role="img"
      aria-label={`A drawn map of the approach to ${map.venueLabel} along ${road}.`}
    >
      <defs>
        <clipPath id={clip}>
          <path d={MAP.clip} />
        </clipPath>
        {/* The road is a filled shape, so it is revealed by a thick stroked
            centreline sweeping along it rather than by dashing the fill. */}
        <clipPath id={reveal}>
          <path
            className={styles.revealPath}
            d={MAP.mainCentre.d}
            style={{ "--road-len": MAP.mainCentre.len } as React.CSSProperties}
          />
        </clipPath>
      </defs>

      <path d={MAP.borderOuter} className={styles.borderOuter} />
      <path d={MAP.borderInner} className={styles.borderInner} />

      <g clipPath={`url(#${clip})`}>
        {MAP.hatch.map((h, i) => (
          <path key={i} d={h} className={styles.hatch} />
        ))}

        <g className={styles.water}>
          <path d={MAP.creek} className={styles.creekBank} />
          <path d={MAP.creekTicks} className={styles.creekTicks} />
        </g>

        {MAP.approaches.map((a, i) => (
          <path key={i} d={a} className={styles.approach} />
        ))}

        <path d={MAP.trees} className={styles.trees} />

        <g clipPath={`url(#${reveal})`}>
          <path d={MAP.main} className={styles.road} />
        </g>

        <g className={styles.venue}>
          <path d={MAP.venue.drive} className={styles.drive} />
          <path d={MAP.venue.body} className={styles.venueBody} />
          <path d={MAP.venue.roof} className={styles.venueRoof} />
          <path d={MAP.venue.door} className={styles.venueDoor} />
        </g>

        <g className={styles.compass}>
          <circle cx={MAP.compass.cx} cy={MAP.compass.cy} r={MAP.compass.r + 1.6} />
          <circle cx={MAP.compass.cx} cy={MAP.compass.cy} r={MAP.compass.r + 2.4} />
          <path d={MAP.compass.open} className={styles.starOpen} />
          <path d={MAP.compass.filled} className={styles.starFilled} />
          <text
            x={MAP.compass.cx}
            y={MAP.compass.cy - MAP.compass.r - 3.4}
            className={styles.north}
          >
            N
          </text>
        </g>

        <g className={styles.cartouche}>
          <path d={MAP.cartouche.d} className={styles.cartOuter} />
          <path d={MAP.cartouche.inner} className={styles.cartInner} />
          <text
            x={MAP.cartouche.x + MAP.cartouche.w / 2}
            y={MAP.cartouche.y + MAP.cartouche.h / 2}
            className={styles.venueName}
          >
            {map.venueLabel}
          </text>
        </g>

        <text x={11} y={28.4} className={styles.roadName}>
          {road}
        </text>
      </g>
    </svg>
  );
}
