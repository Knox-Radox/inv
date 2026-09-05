// Does the replica inside the envelope land exactly where the page's own card
// sits at scroll 0? Anything that differs here is visible as a jump when the
// cover crossfades out.
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [url, size] = process.argv.slice(2);
const [w, h] = size.split('x').map(Number);
const grab = () => {
  const pick = root => {
    const c = root.querySelector('[class*="InvitationCard"][class*="content"]');
    const names = root.querySelector('[class*="InvitationCard"][class*="names"]');
    const card = root.querySelector('[class*="InvitationCard"][class*="card"]');
    const r = e => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      card: card && r(card), content: c && r(c), names: names && r(names),
      nameSize: names && Math.round(parseFloat(getComputedStyle(names).fontSize)),
      nameLines: names && names.getClientRects().length,
    };
  };
  return {
    page: pick(document.getElementById('invitation')),
    replica: pick(document.querySelector('.envelope-overlay')) ,
    scrollY: Math.round(window.scrollY),
  };
};
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  await p.click('button');
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  // The last frame before the cover fades.
  await p.evaluate(() => document.getAnimations().forEach(a => { a.currentTime = 2700; }));
  const r = await p.evaluate(grab);
  console.log(size);
  console.log('  scrollY      ', r.scrollY);
  for (const k of ['card', 'content', 'names']) {
    console.log(`  ${k.padEnd(8)} page=${JSON.stringify(r.page[k])}`);
    console.log(`  ${''.padEnd(8)} repl=${JSON.stringify(r.replica[k])}`);
  }
  console.log('  name font-size page=' + r.page.nameSize + '  replica=' + r.replica.nameSize);
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });
