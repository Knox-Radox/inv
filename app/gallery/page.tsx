import { Jasmine } from "@/components/art/Jasmine";
import { KorvaiEdge } from "@/components/art/KorvaiEdge";
import { MapPlate } from "@/components/art/MapPlate";
import { Knot } from "@/components/art/Knot";
import { WaxSeal } from "@/components/art/WaxSeal";
import styles from "./gallery.module.css";

/**
 * PHASE 2 GALLERY — development only.
 *
 * Every hand-authored illustration at three sizes, on both grounds, so each one
 * can be looked at rather than assumed. Removed before launch.
 */
export const metadata = { robots: { index: false, follow: false } };

const SIZES = [56, 96, 240];

export default function Gallery() {
  return (
    <main className={styles.page}>
      <h1 className={styles.h}>Illustration set</h1>

      <section className={styles.row}>
        <h2 className={styles.label}>Wax seal — intact</h2>
        <div className={styles.strip}>
          {SIZES.map((s) => (
            <WaxSeal key={s} size={s} />
          ))}
        </div>
      </section>

      <section className={`${styles.row} ${styles.onDeep}`}>
        <h2 className={styles.label}>Wax seal — on champagne</h2>
        <div className={styles.strip}>
          {SIZES.map((s) => (
            <WaxSeal key={s} size={s} />
          ))}
        </div>
      </section>

      <section className={styles.row}>
        <h2 className={styles.label}>Jasmine spray — three sizes</h2>
        <div className={styles.strip}>
          <Jasmine className={styles.j1} />
          <Jasmine className={styles.j2} />
          <Jasmine className={styles.j3} />
        </div>
      </section>

      <section className={styles.row}>
        <h2 className={styles.label}>Knot — three sizes</h2>
        <div className={styles.strip}>
          {[18, 26, 72].map((s) => (
            <Knot key={s} size={s} />
          ))}
        </div>
      </section>

      <section className={styles.row}>
        <h2 className={styles.label}>Korvai edge — the card&rsquo;s bottom border</h2>
        <KorvaiEdge className={styles.korvai} />
      </section>

      <section className={styles.row}>
        <h2 className={styles.label}>Map plate — three sizes</h2>
        <div className={styles.strip}>
          <div className={styles.m1}><MapPlate /></div>
          <div className={styles.m2}><MapPlate /></div>
        </div>
        <div className={styles.m3}><MapPlate /></div>
      </section>

      <section className={styles.row}>
        <h2 className={styles.label}>Wax seal — cracked (end state)</h2>
        <div className={styles.strip}>
          {SIZES.map((s) => (
            <WaxSeal key={s} size={s} cracked />
          ))}
        </div>
      </section>
    </main>
  );
}
