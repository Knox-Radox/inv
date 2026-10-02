/*
 * The cover, end to end, as a guest meets it.
 *
 *   node tools/verify/cover.js "$URL" /tmp/shots
 *
 * Every other script here measures a number. This one is about whether the
 * envelope behaves like one: it is up for a first visit, it holds the page,
 * it opens, it stays down for someone who has seen it, it never stands in the
 * way of a link, and under reduced motion it still dissolves rather than cuts.
 * Revision 8's seen-flag was written on every visit and never read for three
 * revisions, and nothing caught it, because the harness set the key itself.
 * This one never does.
 *
 *   (a) fresh visit: the overlay is displayed and the wheel cannot scroll
 *   (b) a click on the cover removes it within 6 s and stores the flag
 *   (c) reload: the overlay is not displayed
 *   (d) /#reply, fresh: no overlay, and the page scrolls
 *   (e) reduced motion: the overlay's opacity passes through a value strictly
 *       between 0 and 1, so it is a crossfade and not a cut
 *   (f) frames at 100, 300, 1500, 2500 and 3400 ms into 390x844 and 1440x900,
 *       and at 1500 ms the liner is on screen
 *
 * (a) and (b) share one page on purpose. A wheel that does nothing proves
 * nothing unless the same wheel is seen to work once the cover is gone, so the
 * control is the second half of (b).
 *
 * (f) drives the clock by hand, as open.js does, because a screenshot costs
 * more than a frame and sleeping between shots mistimes all of them. (b) and (e)
 * are in real time, which is what the guest gets.
 *
 * The liner is looked for at 50% across and 25% down, in a patch 20% wide and
 * 4% tall, and what is asserted is that most of the patch is dark red. Not one
 * pixel, and not a median: the liner is block-printed in gold and the printed
 * column runs through the middle of the cover, so the exact centre is the
 * likeliest place on it to land on a bloom (a 15 px median there read
 * rgb(118, 67, 57) at 390 wide, which is neither colour). At 1500 ms the point
 * sits between the flap, which has turned edge-on by then, and the top edge of
 * the card, which has only just begun to rise.
 *
 * "Dark red" is r >= 70, g < 60, b < 70 and r at least 40 above g. It is not
 * r > 90: the liner is --arakku under a gradient that darkens it from 12% to 56%
 * toward the flap's point (.liner in Envelope.module.css), so at this depth the
 * paint itself averages about rgb(88, 18, 32) and only a third of its pixels
 * clear 90 on red. The share that does is printed beside the real one.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const { performance } = require('perf_hooks');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
const URL = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });
const SEEN = 'advika-sooraj-envelope-seen';
const SIZES = [[390, 844], [1440, 900]];
const BEATS = [100, 300, 1500, 2500, 3400];
let fails = 0;
const ok = (t, c, extra = '') => { if (!c) fails++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${t}${extra ? '  ' + extra : ''}`); };

const context = (b, [w, h], extra = {}) =>
  b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600, ...extra });
// What the overlay is doing right now; null when it is not in the document.
const overlay = () => {
  const o = document.querySelector('.envelope-overlay');
  if (!o) return null;
  const cs = getComputedStyle(o);
  return { display: cs.display, opacity: +cs.opacity, armed: document.documentElement.classList.contains('envelope-armed') };
};
const up = o => !!o && o.display !== 'none';
// Anywhere on the cover opens it. Not the middle, where the wax is.
const tap = (p, [w, h]) => p.mouse.click(Math.round(w * 0.22), Math.round(h * 0.82));
const state = o => (o ? `display:${o.display}${o.armed ? ', armed' : ', not armed'}` : 'no overlay in the document');

(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE, args: ['--force-color-profile=srgb'] });

  // ---- (a) (b) (c): one visitor, one device ---------------------------------
  for (const size of SIZES) {
    const [w, h] = size;
    console.log(`\n(a)(b)(c)  ${w}x${h}: a first visit, an opening, a second visit`);
    const ctx = await context(b, size);
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });

    // (a)
    const o1 = await p.evaluate(overlay);
    const room = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await p.mouse.move(w / 2, h / 2);
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(400);
    const held = await p.evaluate(() => scrollY);
    ok('(a) overlay displayed on a first visit', up(o1), state(o1));
    ok('(a) the wheel cannot scroll the page', room > 0 && held === 0, `scrollY ${held}, with ${Math.round(room)} px of page below the fold`);

    // (b)
    const t0 = performance.now();
    await tap(p, size);
    let gone = true;
    await p.waitForFunction(() => !document.querySelector('.envelope-overlay'), null, { timeout: 6000, polling: 50 }).catch(() => { gone = false; });
    const took = Math.round(performance.now() - t0);
    const stored = await p.evaluate(k => localStorage.getItem(k), SEEN);
    ok('(b) overlay removed from the document within 6 s of the click', up(o1) && gone, gone ? `${took} ms` : 'still there at 6000 ms');
    ok(`(b) localStorage["${SEEN}"] is "1"`, stored === '1', `got ${JSON.stringify(stored)}`);
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(400);
    const freed = await p.evaluate(() => scrollY);
    ok('(b) and the same wheel scrolls the page now (the control for (a))', freed > 0, `scrollY ${freed}`);

    // (c)
    await p.reload({ waitUntil: 'networkidle' });
    const o3 = await p.evaluate(overlay);
    ok('(c) on reload the overlay is not displayed', !up(o3) && !(o3 && o3.armed), state(o3));
    await ctx.close();
  }

  // ---- (d) a link to somewhere is not a gate --------------------------------
  console.log('\n(d)  /#reply, a fresh visitor');
  {
    const ctx = await context(b, SIZES[0]);
    const p = await ctx.newPage();
    await p.goto(URL + '#reply', { waitUntil: 'networkidle' });
    const o = await p.evaluate(overlay);
    await p.mouse.move(195, 400);
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(400);
    const y = await p.evaluate(() => scrollY);
    ok('(d) no overlay displayed', !up(o) && !(o && o.armed), state(o));
    ok('(d) the page scrolls', y > 0, `scrollY ${y}`);
    await ctx.close();
  }

  // ---- (e) reduced motion: a crossfade --------------------------------------
  console.log('\n(e)  prefers-reduced-motion: reduce');
  {
    const ctx = await context(b, SIZES[0], { reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    const o = await p.evaluate(overlay);
    // One sample per frame, from before the tap until the overlay is gone.
    await p.evaluate(() => {
      window.__fade = [];
      const t0 = performance.now();
      const tick = () => {
        const el = document.querySelector('.envelope-overlay');
        window.__fade.push([Math.round(performance.now() - t0), el ? +getComputedStyle(el).opacity : null]);
        if (el) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await tap(p, SIZES[0]);
    await p.waitForFunction(() => window.__fade.length > 0 && window.__fade[window.__fade.length - 1][1] === null,
      null, { timeout: 3000, polling: 50 }).catch(() => {});
    const fade = await p.evaluate(() => window.__fade);
    const mid = fade.filter(([, v]) => v !== null && v > 0 && v < 1);
    const removed = fade.length > 0 && fade[fade.length - 1][1] === null;
    const span = mid.length ? mid[mid.length - 1][0] - mid[0][0] : 0;
    ok('(e) opacity passes through a value strictly between 0 and 1 after the click', up(o) && mid.length > 0,
       `${mid.length} of ${fade.length} frames, over ${span} ms; first ${mid.length ? mid[0][1] : '-'}, last ${mid.length ? mid[mid.length - 1][1] : '-'}`);
    ok('(e) and then the overlay is gone', removed, removed ? '' : 'still in the document at 3 s');
    await ctx.close();
  }

  // ---- (f) frames, and the liner at 1500 ms ---------------------------------
  for (const size of SIZES) {
    const [w, h] = size;
    console.log(`\n(f)  ${w}x${h}: ${BEATS.join(', ')} ms after the click`);
    const ctx = await context(b, size);
    const p = await ctx.newPage();
    await p.goto(URL, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    const o = await p.evaluate(overlay);
    await tap(p, size);
    // Take the clock off the page and set it by hand, frame by frame. If the
    // opening has no animations to drive, every frame below would be the sealed
    // envelope and the check would be a photograph of nothing.
    const driven = await p.evaluate(() => {
      document.getAnimations().forEach(a => a.pause());
      const mine = document.querySelector('.envelope-overlay')?.getAnimations({ subtree: true }) ?? [];
      return { n: mine.length, paused: mine.every(a => a.playState === 'paused') };
    });
    ok('(f) the opening is running, and is now held', up(o) && driven.n > 0 && driven.paused, `${driven.n} animations on the cover`);
    const shots = {};
    for (const t of BEATS) {
      await p.evaluate(ms => document.getAnimations().forEach(a => { a.currentTime = ms; }), t);
      shots[t] = await p.screenshot({ path: `${OUT}/cover-${w}x${h}-${String(t).padStart(4, '0')}.png` });
    }
    // Read the pixels back in a page of their own, so decoding cannot touch the one being photographed.
    const dec = await ctx.newPage();
    const patch = png => dec.evaluate(async b64 => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(Math.round(img.width * 0.4), Math.round(img.height * 0.23),
        Math.round(img.width * 0.2), Math.round(img.height * 0.04)).data;
      let red = 0, over90 = 0; const sum = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        const [r, gr, bl] = [d[i], d[i + 1], d[i + 2]];
        if (r >= 70 && gr < 60 && bl < 70 && r - gr >= 40) { red++; sum[0] += r; sum[1] += gr; sum[2] += bl; }
        if (r > 90 && gr < 60 && bl < 70) over90++;
      }
      const n = d.length / 4;
      return { red: red / n, over90: over90 / n, mean: red ? sum.map(v => Math.round(v / red)) : null };
    }, png.toString('base64'));
    const seen = {};
    for (const t of BEATS) seen[t] = await patch(shots[t]);
    const pct = v => Math.round(v * 100) + '%';
    ok(`(f) ${BEATS.length} frames written`, up(o) && BEATS.every(t => fs.existsSync(`${OUT}/cover-${w}x${h}-${String(t).padStart(4, '0')}.png`)),
       `${OUT}/cover-${w}x${h}-NNNN.png`);
    ok('(f) at 1500 ms the centre of the top quarter is the liner (most of the patch is dark red)', seen[1500].red >= 0.5,
       `${pct(seen[1500].red)} dark red, mean ${seen[1500].mean ? `rgb(${seen[1500].mean.join(', ')})` : 'none'}; ${pct(seen[1500].over90)} also clear r > 90`);
    ok('(f) and it is not there before the flap lifts (100 ms) or once the card has landed (3400 ms)',
       seen[100].red < 0.1 && seen[3400].red < 0.1, `${pct(seen[100].red)} at 100 ms, ${pct(seen[3400].red)} at 3400 ms`);
    console.log('        dark red in that patch by beat: ' + BEATS.map(t => `${t} ms ${pct(seen[t].red)}`).join('   '));
    await ctx.close();
  }

  await b.close();
  console.log(`\n${fails === 0 ? 'ALL COVER CHECKS PASS' : fails + ' FAILURE(S)'}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS FAIL', e.message.slice(0, 400)); process.exit(2); });
