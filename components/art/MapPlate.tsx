"use client";

import { useEffect, useId, useRef } from "react";
import { invitation } from "@/content/invitation";
import { MAP } from "./map";
import styles from "./MapPlate.module.css";

/**
 * The map plate — docs/revision-7-map.md.
 *
 * Revision 6's plate invented its geography and the client rejected it as being
 * of no use. Every line here is traced instead from OpenStreetMap around the
 * venue, by `tools/mapplate.py`, and emitted into `./map.ts`. The drawing is
 * still made by hand — each road is a tapered filled outline from the same pen
 * as the monogram, never a uniform stroke — but the shape under the hand is
 * true, and the plate is now inside a link that opens Google Maps.
 *
 * It is a default export because it is loaded with `next/dynamic({ ssr: false })`
 * and must never reach the document: 20 KB of inline SVG is 40 KB once Next has
 * serialised the rendered tree into the RSC payload as well as the HTML, and
 * none of it is above the fold. See LazyDecor for the whole of that argument.
 *
 * The draw-on traces the journey rather than the file order: US 75 first,
 * because that is the road every guest is actually on, then the highway they
 * leave it for, then the loop, then the lane, and the seal is pressed last.
 * Only one or two roads are ever animating at once, which is what keeps this
 * inside the same frame budget as revision 6's single road.
 *
 * The <svg> is `aria-hidden`. The plate illustrates information the page
 * already gives in text, and it lives inside the Google Maps link: described
 * with `role="img"`, the link's accessible name became a paragraph of map
 * before it reached "Open in Google Maps". A screen reader gets the heading,
 * the link, the address and the credit — every fact, and the one action.
 */
/**
 * Set on the <svg> when the plate comes into view, and matched with `:global()`
 * in the stylesheet. A plain name rather than a hashed one, because the class
 * is applied imperatively and a CSS-module identifier is `string | undefined`.
 */
const DRAWING = "map-drawing";

/** Fill values, and so paint order, are per road — see the stylesheet. */
const ROAD_CLASS = ["road0", "road1", "road2", "road3", "road4", "road5"] as const;

export default function MapPlate({ className }: { className?: string }) {
  const { map } = invitation;
  const uid = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);

  /*
   * The plate is mounted by LazyDecor's 700 px approach margin, which is a
   * screen too early to start drawing. It watches for itself instead, once,
   * and disconnects. This is the page's only scroll listener below the card.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // No observer, or a guest who has asked for less motion: the plate is
    // already whole at rest, so doing nothing leaves it drawn.
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add(DRAWING);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const clip = `mc${uid}`;
  const halo = `mh${uid}`;
  const paper = `mp${uid}`;
  const fade = `mf${uid}`;
  const runId = (r: number, i: number) => `mr${uid}-${r}-${i}`;
  const labelId = (kind: string, i: number) => `ml${uid}-${kind}-${i}`;

  const { venue, scale, north, frame } = MAP;

  return (
    <svg
      ref={ref}
      className={`${styles.plate} ${className ?? ""}`}
      viewBox={`0 0 ${frame.w} ${frame.h}`}
      fill="none"
      style={{ "--seal-x": `${venue.x}px`, "--seal-y": `${venue.y}px` } as React.CSSProperties}
      /* aria-hidden: see the note above the component. */
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clip}>
          <path d={MAP.clip} />
        </clipPath>

        {/* The paper is not one flat tone. A plate this size has a warm side. */}
        <linearGradient id={paper} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" className={styles.paperTop} />
          <stop offset="1" className={styles.paperFoot} />
        </linearGradient>

        {/* Ground under the seal. A flat disc printed as a stain; this pools. */}
        <radialGradient id={halo}>
          <stop offset="0" className={styles.haloCore} />
          <stop offset="0.5" className={styles.haloMid} />
          <stop offset="1" className={styles.haloEdge} />
        </radialGradient>

        {/*
         * Every road runs off the plate somewhere, and a line that simply stops
         * at the rule reads as unfinished. This softens the outer fifth so they
         * leave the paper rather than being cut off it. At the first pass's
         * 0.35 floor it also drained the colour out of US 75, which is the one
         * line that has to carry.
         */}
        <radialGradient id={fade} cx="0.5" cy="0.5" r="0.74">
          <stop offset="0.78" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.62" />
        </radialGradient>
        <mask id={`${fade}m`}>
          <rect width={frame.w} height={frame.h} fill={`url(#${fade})`} />
        </mask>

        {/*
         * A road is a filled outline, so it cannot be dashed on. Each is
         * revealed by sweeping a thick stroked copy of its own centreline
         * through a clip — the same construction revision 6 used for its one
         * road, with the length baked in so nothing measures the DOM.
         */}
        {MAP.roads.map((road, r) =>
          road.runs.map((run, i) => (
            <clipPath id={runId(r, i)} key={runId(r, i)}>
              <path
                className={styles.sweep}
                d={run.c}
                style={
                  {
                    "--run-len": run.len,
                    "--run-delay": `${r * 240}ms`,
                  } as React.CSSProperties
                }
              />
            </clipPath>
          )),
        )}
      </defs>

      <rect width={frame.w} height={frame.h} fill={`url(#${paper})`} />

      <g clipPath={`url(#${clip})`} mask={`url(#${fade}m)`}>
        {/*
         * The paper the plate is printed on, and the thing that stops it
         * reading as vector: a region of the same baked watercolour sheet the
         * ornament uses, laid over the ground at low opacity. It costs no new
         * bytes — all three sheets are already fetched and cached by the
         * ornament four screens above this — and it gives the plate the one
         * quality a gradient cannot fake, which is uneven pigment.
         *
         * `stone` rather than `brass`: a brass wash tints the whole plate gold
         * and the roads stop being the only gold thing on it.
         */}
        <image
          className={styles.paperWash}
          href="/wash/stone.webp"
          x={-6}
          y={-9}
          width={frame.w + 12}
          height={frame.h + 18}
          preserveAspectRatio="xMidYMid slice"
        />

        <circle
          className={styles.halo}
          cx={venue.x}
          cy={venue.y}
          r={venue.haloR}
          fill={`url(#${halo})`}
        />

        {/* Built ground. An irregular edge with a few blocks in it. */}
        <g className={styles.towns}>
          {MAP.towns.map((t) => (
            <g key={t.name}>
              <clipPath id={`${clip}-${t.name}`}>
                <path d={t.edge} />
              </clipPath>
              <path className={styles.townWash} d={t.edge} />
              {/* A different square inch of the sheet per town, so no two
                  patches of built ground carry the same pigment. */}
              <g clipPath={`url(#${clip}-${t.name})`}>
                <image
                  className={styles.townPigment}
                  href="/wash/foliage.webp"
                  x={t.x - t.r * 2.4}
                  y={t.y - t.r * 2.4}
                  width={t.r * 4.8}
                  height={t.r * 4.8}
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
              <path className={styles.townEdge} d={t.edge} />
              <path className={styles.townBlocks} d={t.blocks} />
            </g>
          ))}
        </g>

        <g className={styles.water}>
          {MAP.water.map((w) =>
            w.d.map((d, i) => <path className={styles.creek} d={d} key={`${w.name}${i}`} />),
          )}
        </g>

        {/* The journey, drawn in the order a guest drives it. */}
        {MAP.roads.map((road, r) => (
          <g key={road.label} className={styles[ROAD_CLASS[r] ?? "road0"]}>
            {road.runs.map((run, i) => (
              <g clipPath={`url(#${runId(r, i)})`} key={runId(r, i)}>
                <path className={styles.road} d={run.d} />
              </g>
            ))}
          </g>
        ))}

        {/* Lettering. Roman for roads, italic for water, small caps for towns —
            the style says what kind of thing the name names. */}
        <g className={styles.lettering}>
          {MAP.roads.map((road, r) =>
            road.labelPath ? (
              <g key={road.label}>
                <path id={labelId("r", r)} d={road.labelPath} />
                <text className={styles.roadName}>
                  <textPath href={`#${labelId("r", r)}`} startOffset="50%" textAnchor="middle">
                    {road.label}
                  </textPath>
                </text>
              </g>
            ) : null,
          )}

          {MAP.water.map((w, i) =>
            w.labelPath ? (
              <g key={w.name}>
                <path id={labelId("w", i)} d={w.labelPath} />
                <text className={styles.waterName}>
                  <textPath href={`#${labelId("w", i)}`} startOffset="50%" textAnchor="middle">
                    {w.name}
                  </textPath>
                </text>
              </g>
            ) : null,
          )}

          {MAP.towns.map((t) => (
            <text className={styles.townName} x={t.x + t.r + 1.4} y={t.y + 1.1} key={t.name}>
              {t.name}
            </text>
          ))}
        </g>

        {/* The seal. An estate plate marks a property with its owner's mark,
            and this page already has one. Pressed last. */}
        <g className={styles.seal}>
          <path className={styles.sealGround} d={venue.rim} />
          <g transform={venue.sealTransform}>
            <path className={styles.reku} d={venue.reku} />
            <path className={styles.mono} d={venue.monoA} />
            <path className={styles.mono} d={venue.monoS} />
          </g>
          <path className={styles.rim} d={venue.rim} />
          <path className={styles.rimInner} d={venue.rimInner} />
        </g>

        <g className={styles.lettering}>
          <text className={styles.venueName} x={venue.nameX} y={venue.nameY}>
            {map.venueLabel}
          </text>
          <text className={styles.venueRoad} x={venue.nameX} y={venue.roadY}>
            {map.namedRoads[map.namedRoads.length - 1]}
          </text>
        </g>

        {/* Scale and north. The conventions — and now that the plate is true,
            the bar is readable: the venue is about four miles off the freeway. */}
        <g className={styles.furniture}>
          {Array.from({ length: scale.blocks }, (_, k) => (
            <path
              key={k}
              className={k % 2 === 0 ? styles.barFill : styles.barOpen}
              d={`M${(scale.x + k * scale.block).toFixed(2)} ${scale.y}h${scale.block}v${scale.height}h-${scale.block}Z`}
            />
          ))}
          <text
            className={styles.barLabel}
            x={scale.x + 2 * scale.mile + 1.6}
            y={scale.y + scale.height - 0.1}
          >
            {scale.label}
          </text>

          <path className={styles.northShaft} d={north.shaft} />
          <path className={styles.northHead} d={north.head} />
          <text className={styles.northLetter} x={north.x} y={north.y + 3.1}>
            N
          </text>
        </g>
      </g>

      <path className={styles.borderOuter} d={MAP.borderOuter} />
      <path className={styles.borderInner} d={MAP.borderInner} />
    </svg>
  );
}
