import { JASMINE } from "./paths";
import { Stitch } from "./Stitch";

/**
 * The jasmine (malli) spray — docs/design-plan.md § Illustration inventory.
 *
 * Jasmine and not a wreath: it is the flower actually worn at a South Indian
 * wedding, and strung it is a line rather than a blob, which is the only kind
 * of botanical that can be stitched on.
 *
 * Drawn from the line study in docs/references.md. The stem is four sub-paths
 * at stepped widths thinning toward the growing tip; each leaf carries a
 * hairline lit edge, a shaded edge three times its weight, a heavier midrib and
 * secondary veins that stop short of the margin. No leaf mirrors another.
 *
 * `beat` is the millisecond at which the spray begins drawing, relative to the
 * start of the opening sequence. Each element takes its cue from where the stem
 * has reached, so the leaves and flowers appear as the thread passes them
 * rather than all at once.
 */
export function Jasmine({ beat = 0, className }: { beat?: number; className?: string }) {
  // Shortened with the sequence in revision 5: the spray has to finish
  // before the cover crossfades at 2.75s, and it starts at 1.25s.
  const STEM_MS = 1100;

  // Where along the stem an element sits, as a fraction — used to delay it
  // until the needle has actually arrived there.
  const cue = (t: number) => beat + STEM_MS * t * 0.88;

  return (
    <svg
      className={className}
      viewBox="14 0 84 116"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMin meet"
    >
      {JASMINE.stem.map((s, i) => (
        <Stitch
          key={`stem${i}`}
          d={s.d}
          length={s.len}
          width={s.w}
          tone="gold"
          delay={beat + (STEM_MS / JASMINE.stem.length) * i * 0.92}
          duration={STEM_MS / JASMINE.stem.length}
        />
      ))}

      {JASMINE.leaves.map((leaf, i) => {
        const t = 0.13 + i * 0.115;
        return (
          <g key={`leaf${i}`}>
            <Stitch d={leaf.shade.d} length={leaf.shade.len} width={1.3} delay={cue(t)} duration={620} />
            <Stitch d={leaf.lit.d} length={leaf.lit.len} width={0.5} delay={cue(t) + 60} duration={620} shadow={false} />
            <Stitch d={leaf.midrib.d} length={leaf.midrib.len} width={0.9} delay={cue(t) + 120} duration={520} shadow={false} />
            {leaf.veins.map((v, j) => (
              <Stitch
                key={j}
                d={v.d}
                length={v.len}
                width={0.4}
                opacity={0.8}
                delay={cue(t) + 260 + j * 26}
                duration={240}
                shadow={false}
              />
            ))}
          </g>
        );
      })}

      {JASMINE.buds.map((bud, i) => {
        const t = 0.3 + i * 0.17;
        return (
          <g key={`bud${i}`}>
            <Stitch d={bud.pedicel.d} length={bud.pedicel.len} width={0.65} delay={cue(t)} duration={300} shadow={false} />
            <Stitch d={bud.left.d} length={bud.left.len} width={0.75} delay={cue(t) + 140} duration={340} shadow={false} />
            <Stitch d={bud.right.d} length={bud.right.len} width={0.55} delay={cue(t) + 180} duration={340} shadow={false} />
          </g>
        );
      })}

      {JASMINE.flowers.map((f, i) => {
        const t = i === 0 ? 0.605 : 0.885;
        return (
          <g key={`flower${i}`}>
            <Stitch d={f.pedicel.d} length={f.pedicel.len} width={0.65} delay={cue(t)} duration={300} shadow={false} />
            {f.petals.map((p, j) => (
              <Stitch
                key={j}
                d={p.d}
                length={p.len}
                width={0.5}
                delay={cue(t) + 160 + j * 34}
                duration={280}
                shadow={false}
              />
            ))}
            <circle cx={f.cx} cy={f.cy} r={0.7} fill="var(--sage)" />
          </g>
        );
      })}

      {/* The thread goes behind the cloth. The dimple is the pucker it leaves,
          so the disappearance reads as deliberate rather than as a bug. */}
      <Stitch d={JASMINE.dive.d} length={JASMINE.dive.len} width={0.6} tone="gold" delay={beat + STEM_MS} duration={340} />
      <circle cx={JASMINE.dimple.cx} cy={JASMINE.dimple.cy} r={1.7} fill="var(--sage-deep)" opacity={0.11} />
    </svg>
  );
}
