import styles from "./PaperGrain.module.css";

/**
 * Procedural paper grain — docs/design-plan.md § The stitch idiom, item 6.
 *
 * A few hundred bytes of `feTurbulence`, not a JPEG. `stitchTiles="stitch"`
 * makes a 200px tile seamless, so the browser rasterises the filter once at
 * 200x200 and repeats it, rather than running it across the whole viewport —
 * which matters on the mid-range Android half this audience is holding.
 *
 * Sits above the content at 3.5% multiply, because ink sits on grain.
 */
export function PaperGrain() {
  return <div className={styles.grain} aria-hidden="true" />;
}
