import { ORNAMENT } from "./ornament";
import { Painting } from "./Painting";
import { Stitch } from "./Stitch";
import { Wash } from "./Wash";
import styles from "./Threshold.module.css";

/**
 * The threshold — docs/revision-6-ornament.md, pieces 1 to 3.
 *
 * The countdown's stage: two fluted columns at the margins, a thoranam strung
 * between them, and a kuthuvilakku lit at each foot. It is the doorway of the
 * place the guest is being asked to come to, and every part of it is either
 * the building or something the family carried in this morning.
 *
 * The sequence is the morning itself, in order: **the room, then the garland
 * goes up, then the lamps are lit.** Nothing about that order is decorative —
 * it is what actually happens, and it is why the flames are last.
 *
 * | Beat | Window | What |
 * |---|---|---|
 * | 0 | 0 → 1.0s | The columns are drawn, and the stone floods in behind them. |
 * | 1 | 0.5 → 2.0s | The cord runs across, and each leaf drops in as it passes. |
 * | 2 | 1.5 → 3.2s | The lamps are drawn and the brass floods in. |
 * | 3 | 2.7 → 3.4s | The two flames are struck, a quarter second apart. |
 *
 * After that only the leaves and the flames move, and only while the section
 * is on screen — see `Painting` and `Ornament.module.css`.
 */

const COL = ORNAMENT.column;
const TH = ORNAMENT.thoranam;
const LAMP = ORNAMENT.lamp;

/** The cord's own draw, and the window the leaves are cued inside. */
const CORD_START = 500;
const CORD_MS = 1400;

function Column({ side, className }: { side: "left" | "right"; className?: string }) {
  const col = side === "left" ? COL.left : COL.right;
  // The two sample different squares of the same stone sheet, so a guest
  // reading across the page does not find the same three blotches twice.
  // Different squares of the same stone sheet, so a guest reading across the
  // page does not find the same three blotches twice — but not *too* different.
  // A first pair straddled a dense passage and a thin one, and the left column
  // came out a full twenty-six points darker than the right, which read as one
  // of them being dirty rather than as two blocks from one quarry.
  const box = side === "left" ? ([6, -30, 112, 900] as const) : ([-4, 30, 132, 940] as const);
  return (
    <svg
      className={className}
      viewBox="25 0 70 760"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        {/*
         * The form layer. A column is a cylinder and a flat wash makes it a
         * plank — this is the single thing that turned the first pass from a
         * fluted rectangle into stone. Dark at both edges, a lit band a third
         * of the way in from the light, and a faint bounce on the shadow side,
         * because stone standing next to stone is never black.
         */}
        <linearGradient id={`round-${side}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7E8A75" stopOpacity="0.34" />
          <stop offset="0.18" stopColor="#7E8A75" stopOpacity="0.13" />
          <stop offset="0.36" stopColor="#FBF7F0" stopOpacity="0.40" />
          <stop offset="0.62" stopColor="#7E8A75" stopOpacity="0" />
          <stop offset="0.88" stopColor="#7E8A75" stopOpacity="0.30" />
          <stop offset="1" stopColor="#CFC6B4" stopOpacity="0.16" />
        </linearGradient>
        <clipPath id={`shaft-${side}`}>
          <path d={col.sil} />
        </clipPath>
      </defs>

      <Wash
        id={`col-${side}`}
        d={col.sil}
        sheet="stone"
        box={box}
        rim={0.26}
        style={{ "--bloom-delay": "200ms", "--bloom-dy": "3%" } as React.CSSProperties}
      />
      <g className={styles.round} clipPath={`url(#shaft-${side})`}>
        <rect x="25" y="0" width="70" height="760" fill={`url(#round-${side})`} />
      </g>
      {/* The carved leaves are washed a shade deeper than the shaft. That, and
          nothing else, is what puts the capital in front of it. */}
      <Wash
        id={`aca-${side}`}
        d={col.acanthus}
        sheet="stone"
        box={[24, -14, 72, 72]}
        rim={0.34}
        rimWidth={1.6}
        style={{ "--bloom-delay": "420ms" } as React.CSSProperties}
      />

      {col.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="stone"
          shadow={false}
          delay={i * 26}
          duration={760}
        />
      ))}
    </svg>
  );
}

function Thoranam({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 800 160"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMin meet"
    >
      <Stitch
        d={TH.cord.d}
        length={TH.cord.len}
        width={TH.cord.w}
        tone="gold"
        shadow={false}
        delay={CORD_START}
        duration={CORD_MS}
      />

      {TH.leaves.map((leaf, i) => {
        // Each leaf takes its cue from where the cord has reached, so the
        // string hangs itself rather than arriving all at once. The same
        // mechanic as the jasmine spray on the card, which is the one piece of
        // motion on this page the client asked for more of.
        const cue = CORD_START + CORD_MS * leaf.t * 0.92;
        return (
          <g
            key={i}
            className={styles.leaf}
            style={
              {
                "--anchor": `${leaf.x}px ${leaf.y}px`,
                "--sway": `${leaf.sway}s`,
                "--phase": `${-leaf.phase}s`,
              } as React.CSSProperties
            }
          >
            <Wash
              id={`th-leaf-${i}`}
              d={leaf.sil}
              sheet="foliage"
              // Every leaf takes its pigment from where it hangs, so the
              // garland varies along its length the way a real one does.
              box={[leaf.x - 46, leaf.y - 18, 104, 104]}
              rim={0.3}
              rimWidth={1.9}
              style={
                {
                  "--bloom-delay": `${Math.round(cue + 170)}ms`,
                  "--bloom-dur": "900ms",
                } as React.CSSProperties
              }
            />
            {leaf.lines.map((ln, j) => (
              <Stitch
                key={j}
                d={ln.d}
                length={ln.len}
                width={ln.w}
                tone="deep"
                shadow={false}
                delay={cue + j * 44}
                duration={480}
              />
            ))}
          </g>
        );
      })}

      {TH.clusters.map((cl, i) => {
        const cue = CORD_START + CORD_MS * cl.t * 0.92 + 260;
        return (
          <g key={i}>
            <Wash
              id={`th-cl-${i}`}
              d={cl.sil}
              sheet="stone"
              box={[cl.cx - 26, cl.cy - 26, 52, 52]}
              rim={0.22}
              rimWidth={1.4}
              style={{ "--bloom-delay": `${Math.round(cue + 120)}ms` } as React.CSSProperties}
            />
            <Stitch
              d={cl.stalk.d}
              length={cl.stalk.len}
              width={cl.stalk.w}
              tone="sage"
              shadow={false}
              delay={cue}
              duration={300}
            />
            {cl.petals.map((p, j) => (
              <Stitch
                key={j}
                d={p.d}
                length={p.len}
                width={p.w}
                tone="sage"
                shadow={false}
                delay={cue + 120 + j * 26}
                duration={280}
              />
            ))}
            <circle cx={cl.cx} cy={cl.cy} r={cl.r} fill="var(--gold)" opacity={0.75} />
          </g>
        );
      })}
    </svg>
  );
}

function Lamp({ side, className }: { side: "left" | "right"; className?: string }) {
  const lamp = side === "left" ? LAMP.left : LAMP.right;
  const base = side === "left" ? 1500 : 1660;
  return (
    <svg
      className={className}
      viewBox="0 0 100 214"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <radialGradient id={`glow-${side}`}>
          <stop offset="0" stopColor="#CDAE7A" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="#CDAE7A" stopOpacity="0.14" />
          <stop offset="1" stopColor="#CDAE7A" stopOpacity="0" />
        </radialGradient>
        {/* What the lamp stands on. Without it a heavy brass object floats,
            and floating is the thing that makes an ornament look pasted on. */}
        <radialGradient id={`cast-${side}`}>
          <stop offset="0" stopColor="#8A9A83" stopOpacity="0.30" />
          <stop offset="1" stopColor="#8A9A83" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={50} cy={202} rx={34} ry={7} fill={`url(#cast-${side})`} />

      {lamp.flames.map((f, i) => (
        <circle
          key={i}
          className={styles.kindleGlow}
          cx={f.x}
          cy={f.y - f.r * 0.3}
          r={f.r}
          fill={`url(#glow-${side})`}
          style={{ "--kindle-delay": `${2700 + i * 250}ms` } as React.CSSProperties}
        />
      ))}

      <Wash
        id={`lamp-${side}`}
        d={lamp.sil}
        sheet="brass"
        box={side === "left" ? [16, 50, 68, 170] : [4, 20, 96, 220]}
        rim={0.3}
        rimWidth={2}
        style={{ "--bloom-delay": `${base + 200}ms` } as React.CSSProperties}
      />
      <Wash
        id={`dish-${side}`}
        d={lamp.dish}
        sheet="brass"
        box={[6, 28, 88, 60]}
        rim={0.32}
        rimWidth={1.8}
        style={{ "--bloom-delay": `${base + 340}ms` } as React.CSSProperties}
      />
      <Wash
        id={`bud-${side}`}
        d={lamp.bud}
        sheet="brass"
        box={[32, 14, 36, 40]}
        rim={0.3}
        rimWidth={1.2}
        style={{ "--bloom-delay": `${base + 460}ms` } as React.CSSProperties}
      />

      {lamp.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="brass"
          shadow={false}
          delay={base + i * 34}
          duration={620}
        />
      ))}

      {lamp.flames.map((f, i) => (
        <g
          key={i}
          className={styles.kindleFlame}
          style={{ "--kindle-delay": `${2700 + i * 250}ms` } as React.CSSProperties}
        >
          <g
            className={styles.flameBody}
            style={{ "--period": `${f.period}s`, "--delay": `${f.delay}s` } as React.CSSProperties}
          >
            <path d={f.body} fill="var(--gold-light)" opacity={0.9} />
            <path d={f.core} fill="var(--ground)" opacity={0.92} />
          </g>
        </g>
      ))}
    </svg>
  );
}

export function Threshold({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <Painting className={styles.deco}>
        <div className={styles.colonnade}>
          <Column side="left" className={styles.columnLeft} />
          <Column side="right" className={styles.columnRight} />
        </div>
        <Thoranam className={styles.thoranam} />
        <Lamp side="left" className={styles.lampLeft} />
        <Lamp side="right" className={styles.lampRight} />
        <div className={styles.floor} />
      </Painting>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
