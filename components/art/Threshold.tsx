import { LazyDecor } from "./LazyDecor";
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

export function Threshold({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.stage}>
      <LazyDecor piece="threshold" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
