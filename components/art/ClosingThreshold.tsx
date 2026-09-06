import { ORNAMENT } from "./ornament";
import { Painting } from "./Painting";
import { Stitch } from "./Stitch";
import { Wash } from "./Wash";
import styles from "./ClosingThreshold.module.css";

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

const URN = ORNAMENT.urn;
const KOLAM = ORNAMENT.kolam;

function Urn({ side, className }: { side: "left" | "right"; className?: string }) {
  const urn = side === "left" ? URN.left : URN.right;
  const base = side === "left" ? 0 : 180;
  return (
    <svg
      className={className}
      viewBox="0 0 180 400"
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

function Kolam({ className }: { className?: string }) {
  const DOTS_AT = 1500;
  const LINE_AT = 2200;
  return (
    <svg
      className={className}
      viewBox="0 0 300 300"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The pulli. They go down first, from the centre outward, because that
          is the order a hand lays them and because a kolam without its grid
          showing is a drawing rather than a kolam. */}
      {KOLAM.dots.map((d, i) => (
        <circle
          key={i}
          className={styles.pulli}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill="var(--sage-deep)"
          opacity={0.78}
          style={{ "--pulli-delay": `${DOTS_AT + d.ring * 210 + i * 12}ms` } as React.CSSProperties}
        />
      ))}

      {/* Eight petals, each looped out from the centre and back. */}
      {KOLAM.petals.map((p, i) => (
        <Stitch
          key={i}
          d={p.d}
          length={p.len}
          width={1.5}
          tone="gold"
          shadow={false}
          delay={LINE_AT + i * 105}
          duration={620}
        />
      ))}

      {/* And the line that closes around them. Last mark on the page. */}
      <Stitch
        d={KOLAM.ring.d}
        length={KOLAM.ring.len}
        width={1.6}
        tone="gold"
        shadow={false}
        delay={LINE_AT + 780}
        duration={1400}
      />
    </svg>
  );
}

export function ClosingThreshold({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <Painting className={styles.deco} threshold={0.08}>
        <Urn side="left" className={styles.urnLeft} />
        <Urn side="right" className={styles.urnRight} />
      </Painting>
      <div className={styles.content}>{children}</div>
    </div>
  );
}

/**
 * The kolam, rendered *outside* the field's inner measure.
 *
 * Two reasons, and the second is the real one. It is centred on the page
 * rather than on the 700px column, which is where a mark on the floor belongs
 * and is where the urns already are. And the running thread is absolutely
 * positioned inside that measure, so anything left in it extends the thread:
 * with the kolam inside, the thread ran six hundred pixels past the knot it is
 * supposed to tie off at — which nobody had noticed, because until this
 * revision the knot was clipped and never painted at all.
 */
export function KolamMark() {
  return (
    <Painting className={styles.kolamWrap} threshold={0.3}>
      <Kolam className={styles.kolam} />
    </Painting>
  );
}
