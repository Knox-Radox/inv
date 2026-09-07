# Handoff — after revision 7

**Read this first**, then `docs/revision-7-map.md` and
`docs/revision-7-kolam.md`, then CLAUDE.md. It supersedes
`docs/handoff-revision-6.md` on the map and the kolam only; everything else in
that file still stands.

## What changed

Two pieces, both because the client said the existing one was no good.

**The map.** *"The hand drawn map is of no use."* Correct, and it was worse than
useless: its roads, its creek and its hatched fields were invented, and it
marked the venue with a gabled house that reads as a chapel. It is now traced
from OpenStreetMap around 9981 County Road 419 — which geocodes cleanly to
33.325274, -96.523372 — and the whole plate is a link that opens Google Maps.

**The kolam.** Asked for intricate, traditional and impressive. What was there
was an eight-petal rosette in a scalloped ring: a pretty mandala and not a
kolam. It is now a real sikku kolam on fifty-three dots — one unbroken line,
looping around every one of them and closing on its own start.

Four client decisions came before either, and they override CLAUDE.md, which is
corrected in place rather than left contradicting the build:

1. The map is traced from real ground.
2. The plate opens Google Maps. That is the page's fourth interactive element;
   the cap is lifted to four.
3. The frame is regional — about 15 km — not the last mile.
4. No wayfinding copy. The address and the link carry it.

## The three bugs most worth not relearning

**1. A `clipPath` ignores stroke. A `<mask>` does not.** Both revisions revealed
the plate's roads by sweeping a stroked centreline with an animated
`stroke-dasharray` through a clip. A clip region is built from a path's
*geometry* and ignores every paint property on it, so the dash animated
something nothing read — and **revision 6's single road had never drawn
either**. Every signal said otherwise: `getAnimations()` reported it running,
and `getComputedStyle` returned the base value because an element inside
`<defs>` is not rendered. What settled it was screenshotting the built page in
real time.

*If a draw-on ever looks like it is not happening, screenshot it.* Do not trust
`getAnimations()`, and do not trust a computed style read off anything inside
`<defs>`.

**2. `Painting` settles at 5,200 ms and will cut a long sequence off.** The
kolam runs to 5,960 ms, and `Painting` switches every entrance off in favour of
its finished state once `settleAfter` passes. Any piece longer than that has to
pass its own.

**3. Two harness checks were passing by accident.** `contrast.js` read `color`
and ignored `opacity`, so it measured text at full strength however faint it was
painted — the OpenStreetMap credit sat at 3.25:1 while the harness reported
8.4:1. `audit.js` checked only the first meaningful SVG and only in the initial
DOM, and the plate now loads on approach. Both are fixed and both are stricter
than before.

## Verified, on the built site

| | Revision 6 | Revision 7 |
|---|---|---|
| Frame pacing, the opening, 1x/4x/6x | 20.1 / 21.6 / 25.7 ms | **16.7 / 16.7 / 16.7 ms** |
| Frame pacing, scrolling the field | 17.4 / 19.3 / 23.3 ms | **16.7 / 16.7 / 16.6 ms** median; p95 17.4 / 18.9 / 24.2 |
| CLS | 0.0222 | **0.0222** |
| Document, gzipped | 79 KB | **76.5 KB** |
| JS on the critical path | 144.7 KB | **142.2 KB** |
| Images on the critical path | 149 KB | **149 KB** — the plate's wash reuses the ornament's sheets |
| Lockout | 4/4 | **4/4** |
| Audit 320–1920, 400% reflow, 3x type | clean | **clean** |
| Contrast | AA | **AA**, now with `opacity` composited in |
| Console, four states | clean | **clean** |

The critical path is lighter than before the plate existed, because the old one
was server-rendered inside `paths.ts` and the new one is not.

## What remains

**LCP, unchanged — and now with an explanation for why it never reproduces.**

Three runs of `vitals.js` against the *same build* in one session gave 7.56 s,
7.99 s and **1.42 s**. The last one is not an improvement and nothing was
changed between them. What differs is which element wins:

| Run | LCP | Element |
|---|---|---|
| 1 | 7.56 s | `IMG.photo` — the cover photograph |
| 2 | 7.99 s | `IMG.photo` |
| 3 | 1.42 s | `DIV.paper` — the invitation card behind the cover |

So the figure is bimodal, not noisy. When the photograph's decode lands inside
the measurement window it is the largest paint and LCP is its decode cost; when
it does not, the card's paper is the largest thing that did paint and LCP is
early. **That is almost certainly what revision 5's unreproducible 1.16 s
was** — a run that landed on the card, recorded as though it were the page's
real number.

Two things follow. Quote the *photograph* figure, because that is the one a
guest on a slow connection actually waits through. And when measuring this,
record the LCP element beside the number; `vitals.js` already prints it, and
without it the two runs are indistinguishable.

Nothing in this revision touches any of it, and it is still the next thing to
look at. The lever is the photograph: a smaller crop, or a second source served
at 1x.

Also still open, unchanged:

- **Font licensing.** Parfumerie and Mrs Eaves are licensed desktop fonts and a
  desktop licence is not a webfont licence. See `ASSETS.md`.
- **The countdown's own ~0.009 of CLS** when it ticks.
- `docs/open-questions.md` — two left. #2, the map plate, is closed: there is
  nothing left to invent, so there is nothing left to ask.

One new thing to settle before this goes out: **the map data is ODbL**, and the
plate carries `© OpenStreetMap contributors` as visible text under it. That is
required and it is not optional. See `ASSETS.md`.

## What I would not do next

**Add more ornament**, still. And specifically: do not put anything else at the
foot of the page. The kolam is now the width of the card and four seconds long,
and it is the last thing a guest sees. It has earned the silence around it.

If the page needs more, the honest answer is the one the revision-6 handoff
already gave — scale and bleed on what is there — and the cheapest real
improvement left is the one in `docs/ornament-ideas.md`: the countdown knows
whether the wedding is ahead, today or past, and none of the ornament does.
