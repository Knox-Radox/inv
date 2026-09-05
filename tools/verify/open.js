// Fires the opening and captures it frame by frame at the given viewport.
const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [url, out, size] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const STOPS = [0, 200, 400, 650, 900, 1200, 1600, 2000, 2400, 2900, 3400, 3900];
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--force-color-profile=srgb'] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  fs.mkdirSync(out, { recursive: true });
  // Drive the clock by hand so a screenshot's repaint cost cannot mistime a frame.
  await p.evaluate(() => {
    document.getAnimations().forEach(a => a.cancel());
  });
  await p.click('button');
  await p.evaluate(() => {
    document.getAnimations().forEach(a => { a.pause(); });
  });
  for (const t of STOPS) {
    await p.evaluate(ms => { document.getAnimations().forEach(a => { a.currentTime = ms; }); }, t);
    await p.screenshot({ path: `${out}/${String(t).padStart(4, '0')}.png` });
  }
  console.log(size, 'frames:', STOPS.length, errs.length ? 'ERRORS ' + errs.join(' | ') : 'clean');
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
