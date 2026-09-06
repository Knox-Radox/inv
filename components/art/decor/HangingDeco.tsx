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
 * the seven and a half hours between the ceremony and the reception are
 * answered by a drawing rather than by a sentence the couple has not written,
 * and the running thread has been making that argument since revision 3. The
 * garland makes it again in the other material: it is strung past both moments
 * without a break, because the day is one thing.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0.3 → 1.9s | The string runs down, and each flower is threaded as it passes. |
 * | 1 | 2.0 → 2.4s | The bunch at the foot, where the string is tied off. |
 */

const MALAI = ORNAMENT.malai;

const STRING_START = 300;
const STRING_MS = 1600;

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
  const flowers = MALAI.flowers
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => Math.min(SEG_COUNT - 1, Math.floor(f.t * SEG_COUNT)) === si);
  const head = flowers[0]?.f;
  return {
    flowers,
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
      viewBox="0 0 130 940"
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
            return (
              <g key={i}>
                <Wash
                  id={`malai-${i}`}
                  d={f.sil}
                  sheet="stone"
                  box={[f.cx - 30, f.cy - 30, 60, 60]}
                  rim={0.24}
                  rimWidth={1.5}
                  style={{ "--bloom-delay": `${Math.round(cue + 130)}ms` } as React.CSSProperties}
                />
                <Stitch
                  d={f.sil}
                  length={f.len}
                  width={0.62}
                  tone="sage"
                  shadow={false}
                  delay={cue}
                  duration={340}
                />
                <circle cx={f.cx} cy={f.cy} r={f.r} fill="var(--gold)" opacity={0.7} />
              </g>
            );
          })}
        </g>
      ))}

      {/* The bunch the string is tied off with. A malai does not end in its
          last flower any more than the page ends in its last sentence. */}
      <g>
        <Wash
          id="malai-tail"
          d={MALAI.tail.sil}
          sheet="foliage"
          box={[MALAI.tail.x - 60, MALAI.tail.y - 20, 120, 120]}
          rim={0.28}
          rimWidth={1.8}
          style={{ "--bloom-delay": "2150ms" } as React.CSSProperties}
        />
        {MALAI.tail.lines.map((ln, i) => (
          <Stitch
            key={i}
            d={ln.d}
            length={ln.len}
            width={ln.w}
            tone="deep"
            shadow={false}
            delay={2000 + i * 40}
            duration={420}
          />
        ))}
      </g>
    </svg>
  );
}


export default function HangingDeco() {
  return (
    <Painting className={styles.deco}>
      <Malai className={styles.malai} />
    </Painting>
  );
}
