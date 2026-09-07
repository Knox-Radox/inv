"use client";

import { ORNAMENT } from "../ornament";
import { Painting } from "../Painting";
import { Stitch } from "../Stitch";
import { Wash } from "../Wash";
import styles from "../ClosingThreshold.module.css";

/**
 * The closing threshold — docs/revision-6-ornament.md, pieces 8 and 9.
 *
 * Two urns holding jasmine, and a kolam drawn on the ground between them.
 *
 * The reference closes on two urns of white roses and a monogram. This is the
 * same move with the page's own materials: the flower is the one the guests
 * will be wearing, and the mark on the ground is the one a South Indian house
 * puts at its door every morning.
 *
 * **The kolam is the page's last gesture and the only animation on it worth
 * watching twice.** A kolam is drawn around a grid of dots that go down first;
 * the line follows, freehand, looping around them without ever crossing one.
 * That order is the whole point — it is why the dots here appear before the
 * line, from the centre outward, and why the line is a draw-on and not a fade.
 * It is drawn at dawn, it is meant to be walked over, and it means the house is
 * ready to receive you, which is the last thing an invitation has to say.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0 → 1.4s | The urns are drawn and the stone floods in. |
 * | 1 | 0.9 → 1.8s | The jasmine mounds over both lips. |
 * | 2 | 1.5 → 2.2s | The pulli go down, from the centre outward. |
 * | 3 | 2.2 → 4.0s | The eight petals are looped, and the line closes around them. |
 */


/**
 * Measured viewBoxes.
 *
 * Every ornament was authored in a round-numbered box and every one of them
 * drew outside it — an `<svg>` clips to its viewport, so the left banana lost
 * a leaf, the urns lost the tops of their jasmine and the lamps lost the tops
 * of their flames. None of it showed in the preview harness, which had
 * `overflow: visible` on the svg. `tools/ornament.py` measures them now, and
 * `--ar` hands the box's aspect to the stylesheet so a piece's height is
 * always its own.
 */
const BOX = ORNAMENT.box;

/** viewBox plus the aspect the CSS needs, from one measured box. */
function framed(box: readonly [number, number, number, number] | readonly number[]) {
  const [x, y, w, h] = box;
  return {
    viewBox: `${x} ${y} ${w} ${h}`,
    style: { "--ar": String(w / h) } as React.CSSProperties,
  };
}

const URN = ORNAMENT.urn;
const KOLAM = ORNAMENT.kolam;

function Urn({ side, className }: { side: "left" | "right"; className?: string }) {
  const urn = side === "left" ? URN.left : URN.right;
  const base = side === "left" ? 0 : 180;
  return (
    <svg
      className={className}
      {...framed(BOX.urn)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id={`urn-cast-${side}`}>
          <stop offset="0" stopColor="#8A9A83" stopOpacity="0.28" />
          <stop offset="1" stopColor="#8A9A83" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={urn.cx} cy={urn.base + 5} rx={urn.rx} ry={8} fill={`url(#urn-cast-${side})`} />

      <Wash
        id={`urn-${side}`}
        d={urn.sil}
        sheet="stone"
        box={side === "left" ? [16, 140, 150, 280] : [-6, 100, 190, 330]}
        rim={0.3}
        rimWidth={2.4}
        style={{ "--bloom-delay": `${base + 240}ms` } as React.CSSProperties}
      />

      {urn.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="stone"
          shadow={false}
          delay={base + i * 22}
          duration={820}
        />
      ))}

      {urn.stems.map((st, i) => (
        <Stitch
          key={`s${i}`}
          d={st.d}
          length={st.len}
          width={st.w}
          tone="sage"
          shadow={false}
          delay={base + 900 + i * 26}
          duration={340}
        />
      ))}

      {urn.flowers.map((f, i) => (
        <g key={`f${i}`}>
          <Wash
            id={`urn-fl-${side}-${i}`}
            d={f.sil}
            sheet="stone"
            box={[f.cx - 22, f.cy - 22, 44, 44]}
            rim={0.22}
            rimWidth={1.2}
            style={{ "--bloom-delay": `${base + 1040 + i * 26}ms` } as React.CSSProperties}
          />
          <Stitch
            d={f.sil}
            length={f.len}
            width={0.6}
            tone="sage"
            shadow={false}
            delay={base + 940 + i * 26}
            duration={320}
          />
          <circle cx={f.cx} cy={f.cy} r={f.r} fill="var(--gold)" opacity={0.72} />
        </g>
      ))}
    </svg>
  );
}

/**
 * The kolam — the last mark on the page.
 *
 * A real **sikku** kolam now, on a grid of fifty-three pulli, traced by
 * `tools/kolam.py`. What stood here was an eight-petal rosette inside a
 * scalloped ring: a pretty mandala, and not a kolam. A kolam is one line
 * looping around a grid of dots, never crossing one, never lifting.
 *
 * This grid yields **exactly one loop**, and it closes on its own start. That
 * is an *infinite* kolam, and what it is taken to mean is continuity — which is
 * why it is drawn at a door on the morning of a wedding, and why it is the last
 * thing on an invitation.
 *
 * The animation is the piece. The pulli go down first, from the middle outward,
 * the way a hand lays them; then the line is drawn in a single unbroken stroke
 * that takes four seconds to go round. One path, one dash — the whole of it is
 * a single animated element.
 *
 * A point of light rode the head of that line for one revision, meant as the
 * fingertip letting the rice flour fall. It is gone. On a gold line a bright
 * dot reads as a bead sliding along rather than as a hand, and it pulled the
 * eye off the only thing here that should carry the moment. A kolam being
 * drawn does not glow; the line arriving *is* the hand.
 */
const KOLAM_DOTS_AT = 620;
const KOLAM_DOTS_SPREAD = 900;
const KOLAM_LINE_AT = KOLAM_DOTS_AT + KOLAM_DOTS_SPREAD + 240;
const KOLAM_LINE_MS = 4200;

function Kolam({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      {...framed(BOX.kolam)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The pulli. They go down first, from the middle outward, because that
          is the order a hand lays them and because a kolam without its grid
          showing is a drawing rather than a kolam. */}
      {KOLAM.dots.map((d, i) => (
        <circle
          key={i}
          className={styles.pulli}
          cx={d.cx}
          cy={d.cy}
          r={KOLAM.dotR}
          fill="var(--sage-deep)"
          opacity={0.8}
          style={
            {
              "--pulli-delay": `${KOLAM_DOTS_AT + d.t * KOLAM_DOTS_SPREAD}ms`,
            } as React.CSSProperties
          }
        />
      ))}

      {/* The line. One of them, and it comes back to where it began. */}
      {KOLAM.loops.map((l, i) => (
        <Stitch
          key={i}
          d={l.d}
          length={l.len}
          width={2.4}
          tone="gold"
          shadow={false}
          pace="hand"
          delay={KOLAM_LINE_AT}
          duration={KOLAM_LINE_MS}
        />
      ))}
    </svg>
  );
}


/** After both urns have been filled. */
const FALL_AT = 1900;

/**
 * Jasmine that has come off the garland hanging above — piece 11.
 *
 * The cheapest density on the page: five or six to a section, at almost no
 * weight, and they *explain* the garlands, because a thing that sheds is a
 * thing that is real. They drop in one at a time and settle.
 */
function Petals({ which, className }: { which: "threshold" | "closing"; className?: string }) {
  const petals = ORNAMENT.petals[which];
  const box = which === "threshold" ? BOX.petalsThreshold : BOX.petalsClosing;
  return (
    <svg
      className={className}
      {...framed(box)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      {petals.map((pl, i) => (
        <g
          key={i}
          className={styles.petal}
          style={
            {
              "--anchor": `${pl.cx}px ${pl.cy}px`,
              "--tilt": `${pl.tilt}deg`,
              "--squash": String(pl.squash),
              "--fall-delay": `${FALL_AT + pl.fall}ms`,
            } as React.CSSProperties
          }
        >
          <Wash
            id={`petal-${which}-${i}`}
            d={pl.d}
            sheet="stone"
            box={[pl.cx - 16, pl.cy - 16, 32, 32]}
            rim={0.2}
            rimWidth={1}
            style={{ "--bloom-delay": `${FALL_AT + pl.fall}ms` } as React.CSSProperties}
          />
          <Stitch
            d={pl.d}
            length={pl.len}
            width={0.5}
            tone="sage"
            shadow={false}
            delay={FALL_AT + pl.fall}
            duration={260}
          />
          <circle cx={pl.cx} cy={pl.cy} r={pl.r} fill="var(--gold)" opacity={0.62} />
        </g>
      ))}
    </svg>
  );
}

export default function ClosingDeco() {
  return (
    <Painting className={styles.deco} threshold={0.08}>
      <Urn side="left" className={styles.urnLeft} />
      <Urn side="right" className={styles.urnRight} />
      <Petals which="closing" className={styles.petals} />
    </Painting>
  );
}

export function KolamDeco() {
  return (
    <Painting
      className={styles.kolamWrap}
      threshold={0.3}
      /*
       * Long enough for the line to get all the way round. `Painting` settles
       * at 5,200 ms by default and switches every entrance off in favour of its
       * finished state — which, with a four-second stroke starting at 1,760,
       * cut the kolam off three quarters of the way through. The one piece on
       * the page whose animation carries the meaning was the one piece that
       * never finished it.
       */
      settleAfter={KOLAM_LINE_AT + KOLAM_LINE_MS + 900}
    >
      <Kolam className={styles.kolam} />
    </Painting>
  );
}
