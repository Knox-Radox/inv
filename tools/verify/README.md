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
node tools/verify/audit.js    http://localhost:3400/              # 320-1920, reflow, 2x/3x type, keyboard, semantics
node tools/verify/contrast.js http://localhost:3400/              # WCAG AA on rendered pixels
node tools/verify/console.js  http://localhost:3400/ "label"      # any console/page error, 4 states, dev AND prod
node tools/verify/perf.js     http://localhost:3400/              # frame pacing through the opening at 1x/4x/6x CPU
node tools/verify/vitals.js   http://localhost:3400/              # LCP/CLS on Slow 4G + 4x CPU
node tools/verify/weight.js   http://localhost:3400/              # bytes over the wire by type
node tools/verify/beats3.js   http://localhost:3400/ /tmp/beats   # the opening, frame by frame, monotonic clock
node tools/verify/viewport.js "http://localhost:3400/#invitation" '[[390,844,0,"m"],[1440,900,0,"d"]]' /tmp/shots
```

Needs `playwright` (`npm i -D playwright@1.63.0`) and a Chromium; set `CHROME`
to its executable if it is not at the default path.

Gotchas learned the hard way:
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

`mapdraw.js` and `kolamdraw.js` pause every animation on the piece and set
`currentTime` by hand, the way `open.js` does with the envelope, because a
screenshot's repaint costs more than a frame and sleeping between shots mistimes
all of them. `kolamdraw.js` also strips the `settled` class first: `Painting`
sets it once a sequence should be over and it switches every entrance animation
off, so without that there is nothing left to set a time on.

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
