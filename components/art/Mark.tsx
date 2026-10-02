import { MOTIF } from "./motif";
import { Stitch } from "./Stitch";
import styles from "./Mark.module.css";

const MARK = MOTIF.mark;

/**
 * The mark of Ganesha at the head of the card — docs/revision-9-plan.md.
 *
 * `docs/design-brief.md` bans deity imagery "used decoratively", and
 * `docs/ornament-ideas.md` §7 explains why: an invitation should not choose a
 * devotional register on a family's behalf. In revision 9 the family chose it
 * themselves — their printed invitation opens with it — and asked for it here
 * in these words: *subtle, tasteful and beautiful*. So the ban is lifted for
 * this one mark and nothing else, and it is where tradition puts it: first.
 *
 * It is not a figure. It is the ears, the brow and the trunk in a few strokes
 * of the page's gold thread, with the crown's point above and a tilak in
 * arakku — the two things that make it him and not an elephant, which the
 * brief does still ban. The trunk turns to the viewer's right: *vamamukhi*,
 * toward his own left, the form kept in a home.
 *
 * Every stroke goes through `Stitch`, so inside the envelope it is the first
 * thing drawn on the card — an invocation is said before anything else — and
 * at rest it is simply drawn.
 *
 * Hidden from assistive technology: the line of text beneath it says what it
 * says, and a description of a drawing of a deity would say it worse.
 */
export function Mark({ className, beat = 0 }: { className?: string; beat?: number }) {
  const [x, y, w, h] = MARK.box;
  return (
    <svg
      className={className}
      viewBox={`${x} ${y} ${w} ${h}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {MARK.lines.map((ln, i) => (
        <Stitch
          key={i}
          d={ln.d}
          length={ln.len}
          width={ln.w}
          tone="gold"
          shadow={false}
          delay={beat + i * 70}
          duration={i === 5 ? 720 : 440}
        />
      ))}
      <path
        className={styles.tilak}
        d={MARK.tilak}
        fill="var(--arakku)"
        // After the crown and the brow, which are the first three strokes.
        style={{ "--tilak-at": `${beat + 520}ms` } as React.CSSProperties}
      />
    </svg>
  );
}
