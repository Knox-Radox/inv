import {
  KORVAI_REKU,
  MARK_LIFT,
  MARK_SCALE,
  MONO_A,
  MONO_S,
  RING_INNER,
  RING_OUTER,
  WAX_RIM,
  WAX_WHOLE,
} from "@/components/art/paths";

/**
 * The seal as a standalone SVG string, for the share card.
 *
 * `next/og` renders through Satori, which supports neither CSS custom
 * properties nor SVG filters. So the palette is inlined as literals here — the
 * one place in this codebase where that is true, and it is annotated — and the
 * deboss is approximated by a light offset copy beneath the dark monogram
 * rather than by the feGaussianBlur/feComposite filter the page uses.
 *
 * Sage wax, as on the page. The seal on the share card is **intact**. This is the envelope as it arrives,
 * before anyone has opened it, which is also why there is no jasmine on the
 * card: the thread has not been stitched yet.
 */
export function sealSvg(size: number): string {
  // --gold-light / --gold / derived #846B46, from app/globals.css.
  const grad = `
    <radialGradient id="b" gradientUnits="userSpaceOnUse" cx="33" cy="28" r="82">
      <stop offset="0%" stop-color="#C3CDBB"/>
      <stop offset="30%" stop-color="#AEBBA6"/>
      <stop offset="62%" stop-color="#9AA892"/>
      <stop offset="90%" stop-color="#7E8C77"/>
      <stop offset="100%" stop-color="#66745F"/>
    </radialGradient>
    <radialGradient id="s" gradientUnits="userSpaceOnUse" cx="31" cy="25" r="18">
      <stop offset="0%" stop-color="#FFF4E0" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#FFF4E0" stop-opacity="0"/>
    </radialGradient>`;

  const impression = (fill: string, dx = 0, dy = 0, opacity = 1) => `
    <g transform="translate(${dx} ${dy})" opacity="${opacity}">
      <path d="${KORVAI_REKU}" fill="${fill}" opacity="0.9"/>
      <circle cx="50" cy="50" r="${RING_OUTER}" fill="none" stroke="${fill}" stroke-width="0.45" opacity="0.75"/>
      <circle cx="50" cy="50" r="${RING_INNER}" fill="none" stroke="${fill}" stroke-width="0.45" opacity="0.75"/>
      <g transform="translate(50 ${50 + MARK_LIFT}) scale(${MARK_SCALE}) translate(-50 -50)">
        <path d="${MONO_A}" fill="${fill}"/>
        <path d="${MONO_S}" fill="${fill}"/>
      </g>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-3 -3 106 106">
    <defs>${grad}</defs>
    <path d="${WAX_WHOLE}" fill="url(#b)"/>
    <path d="${WAX_RIM}" fill="#55634F" fill-opacity="0.4"/>
    ${impression("#E4EBDE", -0.7, -0.8, 0.6)}
    ${impression("#6F7E68")}
    <ellipse cx="31" cy="25" rx="17" ry="10" fill="url(#s)" transform="rotate(-30 31 25)"/>
  </svg>`;
}

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
