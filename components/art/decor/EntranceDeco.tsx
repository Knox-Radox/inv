"use client";

import { ORNAMENT } from "../ornament";
import { Painting } from "../Painting";
import { Stitch } from "../Stitch";
import { Wash } from "../Wash";
import styles from "../Entrance.module.css";

/**
 * What stands either side of the plate — docs/revision-6-ornament.md,
 * pieces 6 and 7.
 *
 * Banana stems on one side and a jasmine bough leaning in on the other. The
 * vazhai is the most literal ornament in the whole programme: two banana
 * plants tied either side of the door is exactly what a South Indian family
 * does to a house on a wedding morning, and it is the one piece here that is
 * not standing in for anything.
 *
 * A cypress cluster stood on the other side for two passes and was cut — see
 * the note in tools/ornament.py. The bough that replaced it is the card's own
 * jasmine spray at four times the size, which `docs/design-plan.md` §
 * Illustration inventory listed as item 10 and never got built.
 *
 * The map plate keeps its own road draw-on. The plants arrive first, so the
 * section reads as a curtain going up on it rather than as two animations
 * competing.
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

const BANANA = ORNAMENT.banana;
const BOUGH = ORNAMENT.bough;

function Banana({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      {...framed(BOX.banana)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="vazhai-cast">
          <stop offset="0" stopColor="#8A9A83" stopOpacity="0.26" />
          <stop offset="1" stopColor="#8A9A83" stopOpacity="0" />
        </radialGradient>
      </defs>

      {BANANA.map((st, i) => (
        <g key={i}>
          <ellipse cx={st.x} cy={st.y + 5} rx={st.rx} ry={7} fill="url(#vazhai-cast)" />
          <Wash
            id={`vazhai-stem-${i}`}
            d={st.sil}
            sheet="foliage"
            box={i === 0 ? [50, 170, 200, 260] : [90, 150, 160, 300]}
            rim={0.3}
            rimWidth={2.2}
            style={{ "--bloom-delay": `${240 + i * 220}ms` } as React.CSSProperties}
          />
          <Wash
            id={`vazhai-blades-${i}`}
            d={st.blades}
            sheet="foliage"
            box={i === 0 ? [-20, 80, 340, 340] : [10, 40, 300, 380]}
            rim={0.26}
            rimWidth={2.6}
            style={{ "--bloom-delay": `${520 + i * 220}ms` } as React.CSSProperties}
          />
          {st.lines.map((ln, j) => (
            <Stitch
              key={j}
              d={ln.d}
              length={ln.len}
              width={ln.w}
              tone="deep"
              shadow={false}
              delay={i * 200 + j * 18}
              duration={720}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function Bough({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      {...framed(BOX.bough)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMin meet"
    >
      <Wash
        id="bough-branch"
        d={BOUGH.branch}
        sheet="foliage"
        box={[0, 0, 300, 460]}
        rim={0.32}
        rimWidth={2}
        style={{ "--bloom-delay": "300ms" } as React.CSSProperties}
      />
      <Wash
        id="bough-leaves"
        d={BOUGH.leaves}
        sheet="foliage"
        box={[-50, -50, 400, 560]}
        rim={0.28}
        rimWidth={2.4}
        style={{ "--bloom-delay": "560ms", "--bloom-dur": "1300ms" } as React.CSSProperties}
      />

      {BOUGH.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="deep"
          shadow={false}
          delay={200 + i * 26}
          duration={760}
        />
      ))}

      {BOUGH.flowers.map((f, i) => (
        <g key={i}>
          <Wash
            id={`bough-fl-${i}`}
            d={f.sil}
            sheet="stone"
            box={[f.cx - 34, f.cy - 34, 68, 68]}
            rim={0.24}
            rimWidth={1.4}
            style={{ "--bloom-delay": `${1180 + i * 130}ms` } as React.CSSProperties}
          />
          <Stitch
            d={f.sil}
            length={f.len}
            width={0.7}
            tone="deep"
            shadow={false}
            delay={1060 + i * 130}
            duration={420}
          />
          <circle cx={f.cx} cy={f.cy} r={f.r} fill="var(--gold)" opacity={0.78} />
        </g>
      ))}
    </svg>
  );
}


export default function EntranceDeco() {
  return (
    <Painting className={styles.deco}>
      <Bough className={styles.bough} />
      <Banana className={styles.banana} />
    </Painting>
  );
}
