// Ink fraction of the script inside its own tight box, so it can be compared
// with the same measure taken off the reference capture.
const { chromium } = require('playwright');
const EXE = process.env.CHROME || '/home/adv/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome';
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(process.argv[2], { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  for (const id of ['s0', 's1', 's2', 's3']) {
    const buf = await p.locator('#' + id).screenshot();
    const { createCanvas, loadImage } = { createCanvas: null, loadImage: null };
    // Decode in-page instead of pulling in a native canvas dep.
    const ink = await p.evaluate(async b64 => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      // Crop to the ink's own bounding box first: a trailing run of empty
      // pixels changes the percentage without changing the letterforms.
      let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let i = 0; i < d.length; i += 4) {
        if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 150) {
          n++;
          const px = (i / 4) % c.width, py = Math.floor((i / 4) / c.width);
          if (px < x0) x0 = px; if (px > x1) x1 = px;
          if (py < y0) y0 = py; if (py > y1) y1 = py;
        }
      }
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      return { pct: +(100 * n / area).toFixed(2), box: `${x1 - x0 + 1}x${y1 - y0 + 1}` };
    }, buf.toString('base64'));
    console.log(id, JSON.stringify(ink));
  }
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 300)); process.exit(1); });
