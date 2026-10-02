"use client";

import { ORNAMENT } from "../ornament";
import { Painting } from "../Painting";
import { Stitch } from "../Stitch";
import { Wash } from "../Wash";
import styles from "../Hanging.module.css";

/**
 * What hangs beside the day — docs/revision-6-ornament.md, piece 5.
 *
 * One vertical rather than another swag: the thoranam already spans the top of
 * the section above this one, and repeating that gesture immediately would
 * turn two different ideas into a pattern. A silk drape hung on the other side
 * for three passes and was cut — see the note in tools/ornament.py.
 *
 * The malai is the piece that matters. `docs/open-questions.md` #1 records that
 * the eight and a half hours between the Muhurtham and the reception (seven
 * and a half until revision 9) are answered by a drawing rather than by a
 * sentence the couple has not written, and the running thread has been making
 * that argument since revision 3. The garland makes it again in the other
 * material: it is strung past both moments without a break, because the day is
 * one thing.
 *
 * Revision 9 banded it. It was jasmine from end to end, tied off with a bunch
 * of leaves, because the brief allowed no hue the page did not already have.
 * The family's printed invitation hangs its garlands as they are really strung
 * — jasmine, a cuff of gold beads, roses, beads, marigold — with a brass bell
 * at the foot, and the client asked for exactly those.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0.3 → 1.9s | The string runs down, and each flower and bead is threaded as it passes. |
 * | 1 | 1.9 → 2.6s | The bell, hung on at the foot. |
 */

const MALAI = ORNAMENT.malai;
const KAL = ORNAMENT.kalasham;


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

const STRING_START = 300;
const STRING_MS = 1600;

/** What each kind of flower is painted and drawn in. */
const BLOOM = {
  jasmine: { sheet: "stone", tone: "sage", rim: 0.24, eye: "var(--gold)", eyeOpacity: 0.7 },
  rose: { sheet: "rose", tone: "arakku", rim: 0.34, eye: "var(--arakku)", eyeOpacity: 0.42 },
  marigold: { sheet: "marigold", tone: "brass", rim: 0.34, eye: "#96621C", eyeOpacity: 0.5 },
} as const;

/**
 * The malai's flowers, in four swaying segments.
 *
 * Same reason as the thoranam's bands — see ThresholdDeco. Fifty-four
 * separately rotated SVG groups is fifty-four main-thread repaints per frame,
 * and a strung garland swings in lengths anyway: the string carries the
 * motion, the flowers threaded on it go where it goes.
 *
 * Each segment turns about the string at its own top, which is a pendulum
 * rather than a spin.
 */
const SEG_COUNT = 4;
const SEGMENTS = Array.from({ length: SEG_COUNT }, (_, si) => {
  const within = (t: number) => Math.min(SEG_COUNT - 1, Math.floor(t * SEG_COUNT)) === si;
  const flowers = MALAI.flowers.map((f, i) => ({ f, i })).filter(({ f }) => within(f.t));
  const beads = MALAI.beads.map((b, i) => ({ b, i })).filter(({ b }) => within(b.t));
  const head = flowers[0]?.f;
  return {
    flowers,
    beads,
    ax: head?.ax ?? 0,
    ay: head?.ay ?? 0,
    sway: 6.1 + si * 1.63,
    phase: si * 2.3,
  };
});

function Malai({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      {...framed(BOX.malai)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMin meet"
    >
      <Stitch
        d={MALAI.cord.d}
        length={MALAI.cord.len}
        width={MALAI.cord.w}
        tone="sage"
        shadow={false}
        delay={STRING_START}
        duration={STRING_MS}
      />

      {SEGMENTS.map((seg, si) => (
        <g
          key={`seg${si}`}
          className={styles.bloomOnString}
          style={
            {
              "--anchor": `${seg.ax}px ${seg.ay}px`,
              "--sway": `${seg.sway}s`,
              "--phase": `${-seg.phase}s`,
            } as React.CSSProperties
          }
        >
          {seg.flowers.map(({ f, i }) => {
            // Threaded as the string reaches it, which is the mechanic the
            // client asked for more of — the jasmine spray on the card does
            // the same.
            const cue = STRING_START + STRING_MS * f.t * 0.92;
            const as = BLOOM[f.kind];
            return (
              <g key={i}>
                <Wash
                  id={`malai-${i}`}
                  d={f.sil}
                  sheet={as.sheet}
                  box={[f.cx - 30, f.cy - 30, 60, 60]}
                  rim={as.rim}
                  rimWidth={1.5}
                  style={{ "--bloom-delay": `${Math.round(cue + 130)}ms` } as React.CSSProperties}
                />
                <Stitch
                  d={f.sil}
                  length={f.len}
                  width={0.62}
                  tone={as.tone}
                  shadow={false}
                  delay={cue}
                  duration={340}
                />
                {f.whorl && (
                  <Stitch
                    d={f.whorl.d}
                    length={f.whorl.len}
                    width={0.5}
                    tone={as.tone}
                    opacity={0.55}
                    shadow={false}
                    delay={cue + 160}
                    duration={300}
                  />
                )}
                <circle cx={f.cx} cy={f.cy} r={f.r} fill={as.eye} opacity={as.eyeOpacity} />
              </g>
            );
          })}
          {/* The cuffs of beads between the flowers. Brass, so no new sheet. */}
          {seg.beads.map(({ b, i }) => {
            const cue = STRING_START + STRING_MS * b.t * 0.92;
            return (
              <g key={`bead${i}`}>
                <Wash
                  id={`malai-bead-${i}`}
                  d={b.sil}
                  sheet="brass"
                  box={[b.cx - 14, b.cy - 14, 28, 28]}
                  rim={0.42}
                  rimWidth={1.3}
                  style={{ "--bloom-delay": `${Math.round(cue + 90)}ms` } as React.CSSProperties}
                />
                {/* The catch of light a bead has and a flower does not. */}
                <circle cx={b.cx - 1.8} cy={b.cy - 2} r={1.5} fill="#FBF7F0" opacity={0.55} />
              </g>
            );
          })}
        </g>
      ))}

      {/* The bell at the foot. A garland hung in a doorway ends in one, so
          that it speaks when someone comes through. It swings on its own
          period, a little further than the flowers above it: it is the
          heaviest thing on the string and the last thing on it. */}
      <g
        className={styles.bell}
        style={{ "--anchor": `${MALAI.bell.x}px ${MALAI.bell.y}px` } as React.CSSProperties}
      >
        <Wash
          id="malai-bell"
          d={MALAI.bell.sil}
          sheet="brass"
          box={[MALAI.bell.x - 44, MALAI.bell.top - 14, 88, 88]}
          rim={0.36}
          rimWidth={2}
          style={{ "--bloom-delay": "2050ms" } as React.CSSProperties}
        />
        <Wash
          id="malai-clapper"
          d={MALAI.bell.clapper}
          sheet="brass"
          box={[MALAI.bell.x - 14, MALAI.bell.top + 46, 28, 28]}
          rim={0.46}
          rimWidth={1.4}
          style={{ "--bloom-delay": "2250ms" } as React.CSSProperties}
        />
        {MALAI.bell.lines.map((ln, i) => (
          <Stitch
            key={i}
            d={ln.d}
            length={ln.len}
            width={ln.w}
            tone="brass"
            shadow={false}
            delay={1900 + i * 46}
            duration={420}
          />
        ))}
      </g>
    </svg>
  );
}


/**
 * The kalasham — docs/revision-6-ornament.md, piece 10.
 *
 * The purna kumbham: a brass pot of water, five mango leaves set round its
 * mouth, a coconut resting on them. It stands at the entrance to the mandapam
 * at every South Indian wedding and it is what the couple are received past.
 *
 * It is here because the day had ornament on one side only. A drape stood on
 * this side for three passes and was cut; this is what should have been there.
 * It is a turned object, so it is drawn with the construction that has worked
 * every time, and it is something the family carries in rather than something
 * the venue owns — which is why its leaves stir and its brass does not.
 */
function Kalasham({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      {...framed(BOX.kalasham)}
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id="kal-cast">
          <stop offset="0" stopColor="#8A9A83" stopOpacity="0.26" />
          <stop offset="1" stopColor="#8A9A83" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={KAL.cx} cy={KAL.base + 5} rx={KAL.rx} ry={9} fill="url(#kal-cast)" />

      <g
        className={styles.mangoLeaves}
        style={{ "--anchor": `${KAL.cx}px ${KAL.base - 150}px` } as React.CSSProperties}
      >
        <Wash
          id="kal-leaves"
          d={KAL.leaves}
          sheet="foliage"
          box={[18, 44, 164, 164]}
          rim={0.3}
          rimWidth={2}
          style={{ "--bloom-delay": "760ms", "--bloom-dur": "1100ms" } as React.CSSProperties}
        />
      </g>
      <Wash
        id="kal-pot"
        d={KAL.sil}
        sheet="brass"
        box={[26, 126, 148, 204]}
        rim={0.3}
        rimWidth={2.2}
        style={{ "--bloom-delay": "300ms" } as React.CSSProperties}
      />
      <Wash
        id="kal-coconut"
        d={KAL.coconut}
        sheet="brass"
        box={[58, 74, 84, 84]}
        rim={0.34}
        rimWidth={1.8}
        style={{ "--bloom-delay": "980ms" } as React.CSSProperties}
      />

      {KAL.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="brass"
          shadow={false}
          delay={200 + i * 26}
          duration={760}
        />
      ))}
    </svg>
  );
}

export default function HangingDeco() {
  return (
    <Painting className={styles.deco}>
      <Kalasham className={styles.kalasham} />
      <Malai className={styles.malai} />
    </Painting>
  );
}
