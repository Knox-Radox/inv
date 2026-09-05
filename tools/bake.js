/**
 * Bakes the embossed paper sheets to WebP — revision 3.
 *
 * The cotton-paper fibre and the blind-embossed relief are SVG lighting
 * filters. Live, on five full-size sheets at 2x DPR, they cost 300–500ms per
 * frame during the opening on a throttled CPU (measured: p95 406ms). The
 * sheets are static, so they are rendered once here, at build time, and the
 * page ships them as images. Live filters remain only on the wax seal, which
 * is small.
 *
 *   node tools/bake.js
 *
 * Reads the relief markup from components/art/paths.ts and the filter defs
 * from components/material/MaterialDefs.tsx, so the bake is what the page
 * would have rendered live. Writes public/paper/*.webp.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "node_modules", "playwright"));

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "paper");
const TMP = path.join(require("os").tmpdir(), "as-bake");

const paths = fs.readFileSync(path.join(ROOT, "components/art/paths.ts"), "utf8");
const grab = (n) => {
  const m = paths.match(new RegExp(`export const ${n} =\\s*("(?:[^"\\\\]|\\\\.)*")`));
  if (!m) throw new Error(`no ${n} in paths.ts`);
  return JSON.parse(m[1]);
};

// React attribute names -> SVG attribute names, and strip JSX comments.
const defs = fs
  .readFileSync(path.join(ROOT, "components/material/MaterialDefs.tsx"), "utf8")
  .replace(/^[\s\S]*?<defs>/, "<defs>")
  .replace(/<\/defs>[\s\S]*$/, "</defs>")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/colorInterpolationFilters/g, "color-interpolation-filters")
  .replace(/lightingColor/g, "lighting-color")
  .replace(/floodColor/g, "flood-color")
  .replace(/floodOpacity/g, "flood-opacity");

const SHEETS = [
  { name: "envelope", relief: "RELIEF_ENVELOPE", w: 440, h: 700, scale: 2.2, reliefOpacity: 1 },
  { name: "card", relief: "RELIEF_CARD", w: 620, h: 900, scale: 1.7, reliefOpacity: 0.9 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME || undefined,
  });
  for (const s of SHEETS) {
    const html = `<!doctype html><body style="margin:0;background:#000">
<svg id="s" xmlns="http://www.w3.org/2000/svg" width="${s.w * s.scale}" height="${s.h * s.scale}" viewBox="0 0 ${s.w} ${s.h}">${defs}
<rect width="${s.w}" height="${s.h}" fill="#FBF7F0" filter="url(#mat-paper)"/>
<g filter="url(#mat-emboss)" opacity="${s.reliefOpacity}">${grab(s.relief)}</g></svg></body>`;
    const file = path.join(TMP, `${s.name}.html`);
    fs.writeFileSync(file, html);
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 1800 } })).newPage();
    await page.goto("file://" + file);
    await page.waitForTimeout(1200);
    const png = path.join(TMP, `${s.name}.png`);
    await (await page.$("#s")).screenshot({ path: png });
    console.log(`${s.name}: rendered ${s.w * s.scale}x${s.h * s.scale}`);
  }
  await browser.close();
})();
