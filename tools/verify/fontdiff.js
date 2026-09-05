const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url = process.argv[2];
const measure = async (b, block) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  if (block) await p.route('**/*.woff2', r => r.abort());
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const c = document.querySelector('#invitation [class*="content"]');
    const out = {};
    for (const el of c.children) {
      const cls = String(el.className).replace(/.*__/, '').slice(0, 14);
      const b = el.getBoundingClientRect();
      out[cls] = { h: Math.round(b.height), lines: Math.round(b.height / parseFloat(getComputedStyle(el).lineHeight || 1)) };
    }
    out.__content = { h: Math.round(c.getBoundingClientRect().height) };
    return out;
  });
  await ctx.close();
  return r;
};
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const fb = await measure(b, true), real = await measure(b, false);
  const keys = [...new Set([...Object.keys(fb), ...Object.keys(real)])];
  console.log('element'.padEnd(18), 'fallback'.padEnd(16), 'loaded'.padEnd(16), 'delta');
  for (const k of keys) {
    const a = fb[k] || {}, c = real[k] || {};
    const d = (c.h ?? 0) - (a.h ?? 0);
    console.log(k.padEnd(18), `h${a.h} l${a.lines ?? '-'}`.padEnd(16), `h${c.h} l${c.lines ?? '-'}`.padEnd(16), (d > 0 ? '+' : '') + d);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
