/*
 * The kolam drawing itself, frame by frame, with the clock driven by hand.
 *
 *   node tools/verify/kolamdraw.js "$URL" /tmp/frames [390x844]
 *
 * Same reason as mapdraw.js: a screenshot's repaint costs more than a frame,
 * so sleeping between shots mistimes every one of them.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [, , URL, OUT, SIZE = '900x520'] = process.argv;
const [W, H] = SIZE.split('x').map(Number);
const BEATS = [0, 700, 1300, 1800, 2600, 3600, 4600, 5600, 6100];

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--force-color-profile=srgb'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  fs.mkdirSync(OUT, { recursive: true });
  await p.goto(URL + '#invitation', { waitUntil: 'networkidle' });
  for (let i = 0; i < 90; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(35); }
  await p.waitForTimeout(2500);

  const found = await p.evaluate(() => {
    const s = [...document.querySelectorAll('svg')].find(x => /kolam/.test(x.getAttribute('class') || ''));
    if (!s) return false;
    s.scrollIntoView({ block: 'center' });
    return true;
  });
  if (!found) { console.error('no kolam on the page'); process.exit(1); }
  await p.waitForTimeout(500);

  for (const t of BEATS) {
    await p.evaluate((ms) => {
      const s = [...document.querySelectorAll('svg')].find(x => /kolam/.test(x.getAttribute('class') || ''));
      // `Painting` marks a layer `settled` once its sequence should be over,
      // which switches the entrance animations off entirely — so by the time
      // this harness pauses the clock there is nothing left to set a time on.
      // Taking the class off puts them back.
      let n = s;
      while (n) { n.classList?.remove('settled'); n = n.parentElement; }
      for (const a of s.getAnimations({ subtree: true })) { a.pause(); a.currentTime = ms; }
    }, t);
    const box = await p.evaluate(() => {
      const s = [...document.querySelectorAll('svg')].find(x => /kolam/.test(x.getAttribute('class') || ''));
      const r = s.getBoundingClientRect();
      return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 };
    });
    await p.screenshot({ path: `${OUT}/t${String(t).padStart(4, '0')}.png`, clip: box });
    console.log(`  t=${t}ms`);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
