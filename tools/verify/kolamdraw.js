/*
 * The kolam drawing itself, frame by frame.
 *
 *   node tools/verify/kolamdraw.js "$URL" /tmp/frames
 *
 * Unlike mapdraw.js this captures in **real time** rather than pausing every
 * animation and setting `currentTime` by hand, and that is deliberate.
 *
 * `Painting` marks a layer `settled` once its sequence should be over and
 * switches every entrance off in favour of its finished state, so by the time a
 * harness has scrolled down to the kolam there is nothing left to set a time
 * on. Taking the class off restores the pulli — but not the line: the
 * declaration comes back at the next style recalc while the `Animation` object
 * is not constructed until the next animation update, and even given two frames
 * to appear, `Stitch`'s draw-on does not come back under a paused clock. Three
 * attempts at reinstating it produced nine identical frames of a finished
 * kolam, which is a harness that lies.
 *
 * So this one does what the eye does: it stops just short of the piece, lets it
 * come into view, and photographs it while it draws. Frame times are printed
 * because a screenshot costs more than a frame and the intervals are therefore
 * approximate — read them off the log rather than assuming the nominal gap.
 * `strokeDashoffset` is printed alongside, which is the ground truth for how
 * far round the line has got and is the number to trust.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const [, , URL, OUT, SIZE = '900x560'] = process.argv;
const [W, H] = SIZE.split('x').map(Number);
const FRAMES = 10;
const GAP = 500;

const pick = () =>
  [...document.querySelectorAll('svg')].find(x => /kolam/.test(x.getAttribute('class') || ''));

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--force-color-profile=srgb'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  fs.mkdirSync(OUT, { recursive: true });
  await p.goto(URL + '#invitation', { waitUntil: 'networkidle' });

  // Creep down until the kolam has mounted but is still below the fold, so it
  // has not been painted yet. LazyDecor mounts it 700px out; Painting starts it
  // when 30% of it is on screen.
  for (let i = 0; i < 220; i++) {
    const top = await p.evaluate(pick).then(() =>
      p.evaluate(f => { const k = eval(`(${f})`)(); return k ? k.getBoundingClientRect().top : null; }, pick.toString()));
    if (top !== null && top < H) break;
    await p.mouse.wheel(0, 160);
    await p.waitForTimeout(40);
  }
  await p.waitForTimeout(600);

  const painted = await p.evaluate(f => {
    const k = eval(`(${f})`)();
    if (!k) return false;
    k.scrollIntoView({ block: 'center' });
    return true;
  }, pick.toString());
  if (!painted) { console.error('no kolam on the page'); process.exit(1); }

  const t0 = Date.now();
  for (let i = 0; i < FRAMES; i++) {
    const r = await p.evaluate(f => {
      const k = eval(`(${f})`)();
      const q = k.getBoundingClientRect();
      const line = k.querySelector('path');
      return {
        box: { x: Math.max(0, q.x - 8), y: Math.max(0, q.y - 8), width: q.width + 16, height: q.height + 16 },
        off: getComputedStyle(line).strokeDashoffset,
      };
    }, pick.toString());
    await p.screenshot({ path: `${OUT}/f${String(i).padStart(2, '0')}.png`, clip: r.box });
    console.log(`  f${i}  ${String(Date.now() - t0).padStart(5)}ms  dashoffset ${r.off}`);
    await p.waitForTimeout(GAP);
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
