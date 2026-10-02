// What each layer of the opening is actually doing, per beat.
//
// Revision 9's layers, bottom to top: the liner, the page's ground, the card
// (`reveal`), then the envelope's front, the flap with the wax riding on it,
// and the names. `vis` is printed only when a layer is hidden, because the card
// and the ground are `visibility: hidden` until the tap and a layer that never
// turns visible is a layer that never appears.
//
// A layer that is not in the document prints MISSING. At 4500 ms the overlay is
// at opacity 0 and still there: it is taken out when `animationend` is handled,
// and that cannot happen inside the same synchronous read that set the clock.
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [url, size] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const STOPS = [0, 300, 600, 900, 1300, 1700, 2100, 2600, 3200, 3700, 4100, 4500];
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
        return { o: +(+s.opacity).toFixed(2), t: s.transform.slice(0, 46), top: Math.round(r.top), h: Math.round(r.height),
                 ...(s.visibility !== 'visible' && { vis: s.visibility }) };
      };
      const mine = name => `[class*="Envelope"][class*="__${name}"]`;
      return {
        liner: g(mine('liner')),
        ground: g(mine('ground')),
        card: g(mine('reveal')),
        front: g(`${mine('front')}:not([class*="Paper"])`),
        flap: g(`${mine('flap')}:not([class*="Paper"]):not([class*="Shade"])`),
        seal: g(mine('seal')),
        type: g(mine('type')),
        overlay: g('[class*="overlay"]'),
      };
    }, t);
    console.log(String(t).padStart(4), JSON.stringify(row));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
