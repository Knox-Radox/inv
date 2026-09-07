/*
 * The map plate's draw-on, frame by frame, with the clock driven by hand.
 *
 * Screenshots force a repaint and a repaint can cost more than a frame, so
 * sleeping between shots mistimes every one of them. This pauses every
 * animation on the plate and sets `currentTime` instead, which is the same
 * trick open.js uses on the envelope and the only way these frames line up.
 *
 *   node tools/verify/mapdraw.js "$URL" /tmp/frames [390x844]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [, , URL, OUT, SIZE = '900x666'] = process.argv;
const [W, H] = SIZE.split('x').map(Number);
const BEATS = [0, 250, 500, 900, 1400, 1900, 2200, 2600, 3400];

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--force-color-profile=srgb'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  fs.mkdirSync(OUT, { recursive: true });
  await p.goto(URL + '#invitation', { waitUntil: 'networkidle' });
  for (let i = 0; i < 70; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(40); }
  await p.waitForTimeout(1500);

  const found = await p.evaluate(() => {
    const s = document.querySelector('a[href*="google.com/maps"] svg');
    if (!s) return false;
    s.scrollIntoView({ block: 'center' });
    return true;
  });
  if (!found) { console.error('no plate on the page'); process.exit(1); }
  await p.waitForTimeout(400);

  for (const t of BEATS) {
    await p.evaluate((ms) => {
      const svg = document.querySelector('a[href*="google.com/maps"] svg');
      svg.classList.add('map-drawing');
      for (const a of svg.getAnimations({ subtree: true })) {
        a.pause();
        a.currentTime = ms;
      }
    }, t);
    const box = await p.evaluate(() => {
      const r = document.querySelector('a[href*="google.com/maps"] svg').getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    await p.screenshot({ path: `${OUT}/t${String(t).padStart(4, '0')}.png`, clip: box });
    console.log(`  t=${t}ms`);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
