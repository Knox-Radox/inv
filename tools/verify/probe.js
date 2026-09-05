// What each layer of the opening is actually doing, per beat.
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [url, size] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const STOPS = [0, 300, 600, 900, 1300, 1700, 2100, 2600, 3200];
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.click('button');
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  for (const t of STOPS) {
    const row = await p.evaluate(ms => {
      document.getAnimations().forEach(a => { a.currentTime = ms; });
      const g = sel => {
        const el = document.querySelector(sel);
        if (!el) return 'MISSING';
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return { o: +(+s.opacity).toFixed(2), t: s.transform.slice(0, 46), top: Math.round(r.top), h: Math.round(r.height) };
      };
      return {
        flap: g('[class*="flap"]:not([class*="Shade"])'),
        throat: g('[class*="throat"]'),
        reveal: g('[class*="Envelope"][class*="reveal"], [class*="mouth"] > [class*="reveal"]'),
        overlay: g('[class*="overlay"]'),
      };
    }, t);
    console.log(String(t).padStart(4), JSON.stringify(row));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
