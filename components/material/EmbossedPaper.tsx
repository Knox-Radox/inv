import styles from "./EmbossedPaper.module.css";

/**
 * A sheet of embossed cotton paper — revision 3.
 *
 * The fibre and the blind-embossed relief are SVG lighting filters, but they
 * are not run live: five full-size filtered sheets cost up to 400ms a frame
 * during the opening on a throttled CPU. The sheets are baked once at build
 * time by tools/bake.js from exactly the filters in MaterialDefs and the
 * relief in paths.ts, and shipped as images. This component just places one.
 *
 * `cover` lets a sheet fill any box without distortion. Several sheets cut
 * from the same image (the envelope's two doors and its flap) carry one
 * continuous pattern that only comes apart when they do.
 */
export function EmbossedPaper({
  sheet,
  src,
  className,
}: {
  sheet: "envelope" | "card";
  /** An inlined data URI, when the sheet is on the LCP path and must arrive
   *  with the HTML rather than queue behind scripts on a slow connection. */
  src?: string;
  className?: string;
}) {
  return (
    <div
      className={`${styles.sheet} ${className ?? ""}`}
      style={{ backgroundImage: `url(${src ?? `/paper/${sheet}-sheet.webp`})` }}
      aria-hidden="true"
    />
  );
}
