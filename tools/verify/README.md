# Verification harness

Playwright scripts that produce every number quoted in `docs/`. None of them
trust the code; they run the built site and measure.

Use `serve.sh`, which builds, serves on a free port, runs your command and
**always stops the server**:

```
tools/verify/serve.sh 'node tools/verify/audit.js "$URL"'
tools/verify/serve.sh 'node tools/verify/lockout.js "$URL" /tmp/shots'
```

Or by hand, remembering to stop it:

```
npm run build && npx next start -p 3400 &
node tools/verify/lockout.js  http://localhost:3400/ /tmp/shots   # JS off, animations cancelled, reduced motion, body overflow
node tools/verify/cover.js    http://localhost:3400/ /tmp/shots   # the envelope as a guest meets it: up, held, opens, remembered, a crossfade, the liner
node tools/verify/audit.js    http://localhost:3400/              # 320-1920, reflow, 2x/3x type, keyboard, semantics
node tools/verify/contrast.js http://localhost:3400/              # WCAG AA on rendered pixels
node tools/verify/console.js  http://localhost:3400/ "label"      # any console/page error, 4 states, dev AND prod
node tools/verify/perf.js     http://localhost:3400/              # frame pacing through the opening at 1x/4x/6x CPU
node tools/verify/vitals.js   http://localhost:3400/              # LCP/CLS on Slow 4G + 4x CPU, and which element the LCP is
node tools/verify/weight.js   http://localhost:3400/              # bytes over the wire by type
node tools/verify/beats3.js   http://localhost:3400/ /tmp/beats   # the opening, frame by frame, monotonic clock
node tools/verify/viewport.js "http://localhost:3400/#invitation" '[[390,844,0,"m"],[1440,900,0,"d"]]' /tmp/shots
```

Needs `playwright` (`npm i -D playwright@1.63.0`) and a Chromium; set `CHROME`
to its executable if it is not at the default path.

Gotchas learned the hard way:
- **In a git worktree `node_modules` has to be a real directory.** A symlink to
  the main checkout's builds nothing: Turbopack stops with `Symlink
  [project]/node_modules is invalid, it points out of the filesystem root`. Copy
  it (`cp -a`, about 4 s and 620 MB) — it is already ignored, so it cannot be
  committed by accident.
- To pass JSON through `serve.sh`, which evals its argument, escape the quotes:
  `serve.sh 'node tools/verify/viewport.js "$URL#invitation" [[390,844,0,\"m\"]] /tmp/shots'`.
- **Always stop the server.** One session started a fresh `next start` per
  verification run and stopped none: 39 leaked processes, ~8 GB of RSS, and the
  machine ran out of memory. `serve.sh` exists so this cannot recur.
- Never `pkill -f "next start"` from the same shell — the pattern matches the
  shell's own command line and kills it (exit 144).
- `Date.now()` can jump backwards under WSL2 mid-run. The beat harness uses
  `performance.now()`; if frames ever look out of order, that is why.
- A screenshot forces a full repaint. With live SVG lighting filters each one
  took 1.3–7.3 s and mistimed every frame, which is how the baked sheets came
  about. Screenshot cost is printed per frame; if it climbs, something is
  filtering live again.
- CSS-module keyframe names are hashed; the overlay's end detector matches
  `includes("overlay-out")` on the hashed name.

## Added in revision 5

```
tools/verify/open.js   "$URL" /tmp/frames 430x932   # the opening, frame by frame, clock driven by hand
tools/verify/probe.js  "$URL" 1440x900              # per-beat opacity/transform/rect of every layer
tools/verify/clssrc.js "$URL"                       # which elements shift, when, and by how much
tools/verify/fontdiff.js "$URL"                     # card geometry with fonts blocked vs loaded
```

`open.js` and `probe.js` pause every animation and set `currentTime` by hand
rather than sleeping, so a screenshot's repaint cost cannot mistime a frame.
They are how the two real bugs in the revision-5 opening were found: the flap
turning about an axis half a frame above the picture (it left the viewport by
254 px at 1.7 s instead of opening), and `--ease-rise` front-loading the throat
so the envelope's dark was down to 0.15 by 900 ms and the card came up onto bare
paper.

`clssrc.js` prints each shift's source node, its before and after rects, and
whether it is inside the envelope overlay or in the page. Revision 5's CLS
regression — 0.0036 to 0.1032 — was a single element, and it was the card
*replica* inside the sealed envelope resizing when the fonts landed, behind a
cover no guest could see through. `fontdiff.js` is what ruled out the page's own
card first, by showing every one of its blocks identical with fonts blocked and
loaded.

## Added in revision 7

```
tools/verify/mapdraw.js    "$URL" /tmp/frames   # the plate drawing itself, frame by frame
tools/verify/kolamdraw.js  "$URL" /tmp/frames   # the kolam drawing itself, frame by frame
tools/verify/scrollperf.js "$URL"               # frame pacing while scrolling the field
```

`mapdraw.js` pauses every animation on the plate and sets `currentTime` by hand,
the way `open.js` does with the envelope, because a screenshot's repaint costs
more than a frame and sleeping between shots mistimes all of them.

**`kolamdraw.js` cannot do that and does not try.** `Painting` marks a layer
`settled` once its sequence should be over and switches every entrance off in
favour of its finished state, so by the time a harness has scrolled down to the
kolam there is nothing left to set a time on. Removing the class restores the
pulli, but not the line: the declaration comes back at the next style recalc
while the `Animation` object is not constructed until the next animation update,
and even given two frames to appear, `Stitch`'s draw-on does not come back under
a paused clock. Three attempts at reinstating it each produced nine identical
frames of a finished kolam, which is a harness that lies. So it captures in real
time instead, and prints `strokeDashoffset` beside each frame — that number is
the ground truth for how far round the line has got, and the frame intervals are
approximate because a screenshot costs more than a frame.

It is also what caught the revision-6 plate's road never drawing at all. The
reveal put a stroked centreline with an animated `stroke-dasharray` inside a
`clipPath` — and **a clip is built from a path's geometry and ignores every
paint property on it**, so the dash did nothing. On the built page the roads
were whole in the first frame after the observer fired. A `<mask>` is painted
rather than measured, so it honours the dash; that is the only difference
between the two, and it is the whole fix.

Two changes to the harness itself came out of the same revision:

- `contrast.js` now composites `opacity` into the foreground before measuring.
  Reading `color` alone measures text at full strength however faint it is
  actually painted, and the OpenStreetMap credit sat at 3.25:1 while the
  harness reported 8.4:1. It also settles one-shot animations inside the
  sampling task and reports genuinely mid-animation text as `TICK` rather than
  failing it — the countdown fades each digit in from `opacity: 0.2` every
  second, and that is transient, not a contrast failure.
- `audit.js` scrolls the page before its semantics pass and checks that *every*
  meaningful SVG is labelled rather than only the first. The plate moved behind
  an approach gate in revision 7 and is not in the initial DOM at all, so the
  label check had nothing to look at.

## Added in revision 9

```
tools/verify/cover.js "$URL" /tmp/shots   # the envelope as a guest meets it
```

Every other script here measures a number. `cover.js` asks whether the envelope
behaves like one, and it is the only check that opens it without setting the
seen-flag itself: `console.js` sets the key before it loads, which is how the
flag was written on every visit and read on none for three revisions.

| | |
|---|---|
| (a) | A fresh visit: the overlay is displayed and the wheel cannot scroll the page |
| (b) | A tap on the cover removes it within 6 s and stores `advika-sooraj-envelope-seen` |
| (c) | On reload the overlay is not displayed |
| (d) | `/#reply`, fresh: no overlay, and the page scrolls. Any hash is a destination |
| (e) | Reduced motion: the overlay's opacity passes through a value strictly between 0 and 1 |
| (f) | Frames at 100, 300, 1500, 2500 and 3400 ms at 390x844 and 1440x900, and the liner is on screen at 1500 |

Things it does on purpose:

- **(a) and (b) share a page.** A wheel that does nothing proves nothing unless
  the same wheel is seen to scroll once the cover is gone, so the control for (a)
  is the second half of (b). A touch drag was tried as a second control and
  dropped: it does not scroll even an unlocked page under headless emulation, so
  it would have passed vacuously.
- **(f) sets the clock by hand**, as `open.js` does, and (b) and (e) run in real
  time. A screenshot costs 300 to 700 ms and sleeping between shots mistimes
  every one of them.
- **The liner is tested as a share of a patch, not as a pixel, and "dark red" is
  not `r > 90`.** The liner is block-printed in gold and the printed column runs
  through the middle of the cover, so 50% across is the likeliest place on it to
  land on a bloom: a 15 px median there read `rgb(118, 67, 57)`, which is neither
  colour. And the liner is `--arakku` under a gradient that darkens it from 12%
  to 56% toward the flap's point, so at 25% down the paint itself averages about
  `rgb(88, 18, 32)` and only a third of its pixels clear 90 on red. The test is
  that at least half of a 20% by 4% patch is `r >= 70, g < 60, b < 70` with red
  40 above green; at 1500 ms that is 88% at 390 wide and 93% at 1440, against 1%
  or less at every other beat. The share that would also clear `r > 90` is
  printed beside it.

It was run against revision 8's build before it was trusted, because a check that
cannot fail is not a check. Against `e049e31` it fails (c), (d), (e) and (f), the
four faults revision 9 set out to fix, and passes (a) and (b), which were never
broken. Against revision 9 it passes everything.

Changes to what was already here, each because the cover is drawn now rather than
photographed:

- `audit.js` asks whether every decorative SVG is hidden from assistive
  technology by itself *or by what holds it*. The butis' row and the envelope's
  front and flap are hidden at the container, so sixteen SVGs carried no
  attribute of their own and the check failed a page that was correct.
- `contrast.js` measures an element's own text nodes rather than skipping any
  element that has a child. The invocation is `<span>||</span> Shree Ganeshay
  Namaha <span>||</span>` and the names on the cover are text either side of an
  ampersand span; the old guard measured the bars and never the words.
- `probe.js` reports the liner, the ground, the card, the front, the flap, the
  wax and the names, in place of the throat, the mouth and the photograph.
  `open.js` and `probe.js` run to 4500 ms because the dissolve runs from 3650 to
  4500, `seam.js` reads the last frame before it (3650), and `animlog.js` waits
  long enough to see it end.
- `vitals.js` prints whether the cover was armed and whether the LCP element is on
  the cover or on the page behind it. At revision 9 the answer is the page: the
  element is the card's paper, an inlined data URI, so LCP equals FCP, and says
  nothing about when the wax, the printed paper or the names' face arrive. Its
  size table counts text after decompression and is labelled so; `weight.js` has
  the gzipped figures.
- `crop.js` walks the page down before it crops and carries its own `#invitation`,
  as `mapdraw.js` does. It had been photographing sections before they revealed
  and a plate before it mounted.
- `weight.js` counts every script fetched by `networkidle` plus 1.5 s, which is
  not the same as the scripts the HTML asks for. The ornament chunk (about 65 KB
  gzipped) is lazy and joins the first visit whenever the second ornament stage
  is inside `LazyDecor`'s 700 px approach margin, which depends on the viewport.
  Read the two numbers apart: what hydration needs, and what has arrived by the
  time the page is quiet.

Retired: **`ink.js`**. It measured the ink fraction of Parfumerie in four
specimen blocks, `#s0` to `#s3`, once, to settle whether the script was lighter
than the reference's (`docs/handoff-revision-5.md`: it is not, 6.70% against
6.52%). The blocks went with the specimen page and the script now waits 30 s for
an element that does not exist and errors. The answer is recorded;
`git show 12bb136:tools/verify/ink.js` has the script if the question comes back.

Also here, not described above: `animlog.js` (every animation start and end in
the opening, and the moment the overlay is removed), `cls.js` (layout-shift
sources with no throttle; silent when there are none), `crop.js` (one PNG per
`<section>`), `seam.js` (does the replica card in the envelope land exactly where
the page's own card is, at the last frame before the dissolve) and `shot.js`
(screenshots at any sizes, `full` for the whole page, `rm` for reduced motion).
