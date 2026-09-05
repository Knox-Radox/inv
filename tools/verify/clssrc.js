// Which elements are actually shifting, and by how much.
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const url = process.argv[2];
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: 400e3 / 8, uploadThroughput: 400e3 / 8, latency: 150 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__shifts.push({
          v: +e.value.toFixed(4), t: Math.round(e.startTime),
          src: (e.sources || []).map(s => {
            const n = s.node;
            const R = r => r ? `[${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]` : '-';
            const tag = n ? `${n.tagName || n.nodeName}.${String(n.className || '').slice(0, 30)}` : '?';
            const inOverlay = n && n.closest ? !!n.closest('.envelope-overlay') : false;
            return `${tag} ${inOverlay ? 'OVERLAY' : 'PAGE'} ${R(s.previousRect)} -> ${R(s.currentRect)}`;
          }),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(4000);
  const s = await p.evaluate(() => window.__shifts);
  let total = 0;
  for (const e of s) { total += e.v; console.log(String(e.v).padEnd(8), `${e.t}ms`.padEnd(8), e.src.join(' | ')); }
  console.log('TOTAL CLS', total.toFixed(4));
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
