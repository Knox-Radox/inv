import styles from "./ReplyEnvelope.module.css";

/**
 * The guest's own envelope — docs/revision-9-plan.md § The idea.
 *
 * The cover, in miniature and run backwards. There the seal gives, the flap
 * lifts, the liner shows and a card comes out. Here a card with the guest's
 * name on it goes in, past the same liner; the flap comes down; and the
 * couple's seal is pressed onto it. Same paper, same print, same block-printed
 * maroon, same wax — `tools/paint.py` painted all four once.
 *
 * It is the answer to "did my reply go?", so it is only ever shown once the
 * server has said yes, and it is over in under three seconds.
 *
 * At rest — for a guest who comes back another day — it is simply a sealed
 * envelope, and nothing moves.
 *
 * Decorative throughout. What happened is said in words beside it, in
 * `Reply`, where a screen reader will find it.
 */
export function ReplyEnvelope({
  name,
  line,
  sealing,
}: {
  /** As the guest wrote it. Set in the script, on the small card. */
  name: string;
  /** "accepts with pleasure", or "declines with regret". */
  line: string;
  /** True for the one run of the animation; false is the sealed envelope. */
  sealing: boolean;
}) {
  return (
    <div className={`${styles.scene} ${sealing ? styles.sealing : ""}`} aria-hidden="true">
      <div className={styles.envelope}>
        {/* The inside of the envelope: the liner, seen above the pocket. */}
        <div className={styles.back} />

        {/* The reply itself, as the small card a printed suite would have. */}
        <div className={styles.slip}>
          <span className={styles.slipName}>{name}</span>
          <span className={styles.slipLine}>{line}</span>
        </div>

        {/* The front of the envelope, cut to the V the flap closes onto. */}
        <div className={styles.pocket} />
        <svg className={styles.edge} viewBox="0 0 100 68" preserveAspectRatio="none" focusable="false">
          <path d="M0 0.4 L50 38.4 L100 0.4" />
        </svg>

        {/* The flap. Two faces, because this one is seen from both sides: its
            lining while it stands open, its paper once it is down. */}
        <div className={styles.flap}>
          <div className={styles.flapIn} />
          <div className={styles.flapOut}>
            <svg viewBox="0 0 100 56" preserveAspectRatio="none" focusable="false">
              <path className={styles.gilt} d="M3 1.2 L50 53.2 L97 1.2" />
              <path d="M0 0.4 L50 55.6 L100 0.4" />
            </svg>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- the same
            sprite the cover uses, at a size the optimiser has no say in. */}
        <img className={styles.seal} src="/cover/wax.webp" width={420} height={420} alt="" />
      </div>
    </div>
  );
}
