/**
 * What the share card needs to embed an SVG, and the one SVG it draws itself.
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
 *
 * `korvaiSvg()` went the same way in revision 9. The woven band it drew was
 * the card's bottom edge, and the card's edge is a mirror-work border now —
 * lib/borderTile.ts, generated.
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
