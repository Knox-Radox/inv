/**
 * The two generated SVGs the share card needs, as strings.
 *
 * `next/og` renders through Satori, which supports neither CSS custom
 * properties nor SVG filters, so the palette is inlined as literals here — the
 * one place in this codebase where that is true, and it is annotated.
 *
 * There used to be a `sealSvg()` beside these: a drawn sage disc with a blocky
 * A and S, built back when the page's own wax was drawn too. It has been dead
 * since revision 4 made the cover a photograph — the share card reads
 * assets/og/seal.png instead — and revision 8 made it wrong as well as unused,
 * since the seal is now the couple's logo struck into photographed wax. Gone
 * rather than left to rot: a stale second definition of the most recognisable
 * mark on the page is worse than no definition.
 */
export function dataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The kolam pulli lattice, as a tile Satori can repeat. */
export function latticeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="1" cy="1" r="1.2" fill="#8A9A83" fill-opacity="0.05"/>
    <circle cx="18" cy="18" r="1.2" fill="#8A9A83" fill-opacity="0.05"/>
  </svg>`;
}

/**
 * The korvai edge, coarsened. At WhatsApp's ~400px thumbnail the page's 4px
 * triangles alias to a smudge; 10px units hold at 3.3px.
 */
export function korvaiSvg(width: number): string {
  const unit = 10;
  const tri: string[] = [];
  for (let x = 0; x < width; x += unit) {
    tri.push(`M${x} 1.6L${x + unit / 2} 11.4L${x + unit} 1.6Z`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="14" viewBox="0 0 ${width} 14">
    <rect width="${width}" height="1.2" fill="#B08D57" fill-opacity="0.45"/>
    <path d="${tri.join("")}" fill="#B08D57" fill-opacity="0.5"/>
    <rect y="12.8" width="${width}" height="1.2" fill="#B08D57" fill-opacity="0.45"/>
  </svg>`;
}
