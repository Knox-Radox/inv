# Handoff — continue revision 3

**Read this first, then `docs/design-plan.md` § Revision 3, then CLAUDE.md.**
This document exists because the session that built revisions 1–3 may end
before the work is finished. It is written so that a fresh session can continue
at the same standard without re-deriving anything.

## Where things stand, in one paragraph

The client saw the first build and rejected it as plain, cheap and underwhelming
against La Maison Dorée (`https://tdy-excellence-template.thedigitalyes.com`).
They were right, and their message supersedes the original brief on asset
policy, motion budget and ornament restraint — see the note at the top of
`docs/design-plan.md`. Revision 3 rebuilt the visual layer toward the
reference's *material* quality: an embossed cotton envelope with a real sage wax
seal, a door-parting reveal, a countdown with presence, scroll reveals, ambient
motion and photographic backdrops. It is built, committed, and verified. It is
not finished. The list of what remains is below, in priority order.

## The standard

The client's words: *"recreate La Maison Dorée."* The working interpretation,
agreed in-session: match its **material richness and motion** — embossed paper,
real wax, real shadow, continuous animation, photographic atmosphere — around
Advika and Sooraj's own names, monogram and content. Not a pixel clone of a
commercial template. Every remaining item below is measured against "would this
sit beside La Maison Dorée without embarrassment."

Three things the client named specifically, and their status:

| Complaint | Status |
|---|---|
| Envelope plain, no 3D embossed designs | **Done.** Blind-embossed jasmine relief on cotton fibre, lit from the top-left, fold crease with highlight and shadow. Baked to `public/paper/*.webp`. |
| Wax seal looks coded, cheap | **Done.** Sage wax with a lit dome, satin specular, pooled rim, pressed monogram, shadow on the paper. Live SVG lighting on the seal only. |
| Animation stuck in the middle, not enough animation | **Done.** Six-second continuous sequence (below). Light sweeps the paper at rest. Countdown ticks seconds. Sections rise on scroll. Backdrop drifts. Jasmine sways. |
| Countdown too simple | **Done.** Four columns, large display numerals, gold hairline rules, seconds. |
| Too simple, not enough elements; recreate LMD | **Partly.** Materials and motion now match. Remaining gaps are listed under *What remains*. |

## What is built

### The envelope (`components/Envelope.tsx`, `.module.css`)

The envelope is the card's own box — full-bleed on a phone, a centred 620 px
object on a desk — so the card it reveals is 1:1 with the page beneath. Layers:
two doors cut from one embossed sheet, a 3D flap with a champagne lining, fold
highlight and shadow, the addressed names, the seal button, a light-sweep
gleam. Behind the doors: `<InvitationCard replica />`, the same component as the
real card.

Timeline, as shipped (ms after tap):

| | |
|---|---|
| 0–90 | seal pressed |
| 90–950 | wax cracks; halves tumble off and fade, monogram breaking with them |
| 450–1800 | flap lifts (`rotateX` to −172°) |
| 1300–3500 | doors part on `--ease-door` — a curve chosen because `--ease-flap` reached 85 % of its travel at the halfway mark and collapsed the phase into one second |
| 1600–3200 | card comes up out of the dark (opacity + scale) |
| 2000–3800 | scrim lifts (opacity-animated div, **not** a `brightness()` filter, which re-rasters every frame) |
| 2800–5200 | jasmine stitches on (`.stitching` on the reveal) |
| 3300–5000 | card composes: names, line, date, venue rise in order (`.composing`) |
| 4300–5300 | light sweep |
| 5300–6100 | overlay fades; `animationend` on `overlay-out` calls `finish()` |

**Lockout guarantees — unchanged and re-verified 4/4.** The invitation is
server-rendered and first in the document; the overlay follows as a sibling;
`#invitation:target ~ .envelope-overlay { display:none }` makes the skip link
work with no script; `body` is never `overflow:hidden`; every animation
supplies only its *from* state via `backwards` fill; a 9 s failsafe.

### Materials (`components/material/`)

`MaterialDefs.tsx` holds five SVG lighting filters (paper, emboss, wax, wax
shadow, deboss). **The large sheets are not filtered live.** Five full-size
sheets at 2× DPR cost p95 315–406 ms/frame on a throttled CPU; `tools/bake.js`
renders them once from the same filters and relief, and the page ships WebPs
(13 KB and 8 KB). After the bake: 376–383 frames in six seconds, p95 17–19 ms.
`EmbossedPaper.tsx` just places a sheet.

Re-bake after changing `tools/relief.py` or `MaterialDefs.tsx`:
```
cd tools && python3 emit_art.py && cd ..
node tools/bake.js && python3 tools/bake-encode.py
```

### The field (`components/field/`)

`Countdown.tsx` (four columns, seconds, digit-change rise, three time states,
fixed UTC boundaries), `Reveal.tsx` (scroll rise, gated on `html.js`),
`Field.tsx` (lazy photographic backdrop, drift), `Closing.tsx` (blossoms behind
the note), `Schedule`, `Place`, `Thread` unchanged in substance.

### Assets

`public/photos/jasmine-branch.jpg` (79 KB) and `jasmine-cluster.jpg` (41 KB),
Unsplash, mock-orange not jasmine — they read as white florals at the opacity
used. `public/paper/*.webp` baked. All recorded in `ASSETS.md`.

## Verified on the last build (commit after `5753c12`)

Run the harness in `tools/verify/` (README there). Final results, all measured
on the built site:

- **Frame pacing through the opening:** 375–381 frames in six seconds, p95
  19.0 / 18.3 / 21.8 ms at 1× / 4× / 6× CPU throttle. (Before the bake:
  67–115 frames, p95 315–406 ms.)
- **LCP 1.20 s, CLS 0.004** on Slow 4G with 4× CPU. LCP was 3.2 s for three
  builds; the harness now prints the LCP element, and it was the *real card's
  sheet under the overlay* — 295K px², larger than either door, queued behind
  the JavaScript. Inlining the envelope sheet and deferring the backdrop photo
  had both been tried on a guess and had done nothing. Inlining the **card**
  sheet as a data URI (`components/Invitation.tsx`) fixed it in one step.
  Lesson: `vitals.js` names the element now; do not guess again.
- **Lockout 4/4. Console clean, dev and prod, four states. Audit clean
  (320–1920, reflow, 2×/3× type, keyboard, one h1). Contrast AA on rendered
  pixels. Lint 0, tsc clean.**
- JS 144 KB gz (budget 150). HTML 55 KB gz — the inlined card sheet appears
  twice (real card and replica). **Quick win:** move it to one CSS custom
  property in the layout `<style>` and reference `var(--card-sheet)` from
  both; saves ~11 KB gz.
- Photographs lazy, `fetchpriority="low"`, below the first viewport.

## What remains — in priority order

1. **Test on a real phone.** Every number above is from headless Chromium.
   The client's complaint came from looking at the real thing. Open it on a
   mid-range Android over LTE and watch the opening. If the seal's live filter
   stutters, bake the seal too (same pipeline; it is only 132 px).

2. **Script accent typography.** La Maison Dorée's signature touch is a
   calligraphic script for its inviting line. We have none. Add one OFL script
   face — *Pinyon Script* or *Monsieur La Doulaise* are refined; avoid Great
   Vibes/Parisienne, which read as template — and use it for exactly two
   things: the inviting line on the card and the closing note. Subset it like
   the others (`tools/subset.sh` pattern in git history, phase 1 commit).

3. **Stronger photographic presence.** The reference has full-bleed floral
   imagery between sections. We have backdrops at 12–16 % opacity. Add one
   full-bleed soft floral band between the card and the countdown (a wider
   crop of `jasmine-branch.jpg`, warmed, with a champagne gradient veil so the
   type above and below stays quiet), and consider one behind the map. Keep
   every photograph lazy and under ~100 KB.

4. **Gleam strength.** The light sweep at rest and at 4.3 s is subtle in
   screenshots. Raise `.gleam` alphas from 0.28/0.42 toward 0.36/0.52 and look
   again; it should be noticed, not seen.

5. **Share card.** `lib/sealSvg.ts` and `app/icon.svg` were moved to sage in
   the last commit. Fetch `/opengraph-image`, confirm the seal reads as sage
   wax at WhatsApp thumbnail size (~400 px wide), and consider laying the
   baked card sheet behind it (Satori accepts a data-URI `<img>`).

6. **Sound.** The reference plays music. `invitation.audio` is `null` pending
   the couple's track (`docs/open-questions.md` #3). The toggle and the
   seal-tap start are already wired in `components/Controls.tsx` and
   `Envelope.tsx`; supply a file and a licence line and it lights up.

7. **Open questions** in `docs/open-questions.md` are still open: the gap
   copy, which roads to letter on the plate, the audio track. Do not invent
   answers.

## How to work

- **Screenshot everything. Read the screenshot.** Every real bug in this
  project was invisible in the code and obvious in a frame: the ivory-on-ivory
  envelope, the flap's unmirrored back face, the names held at 55 % for 3.4 s,
  the seam through the names, the doors collapsing into one second. The
  choreography was designed on paper twice and wrong both times until frames
  were captured with a correct clock.
- **Measure, then change.** `perf.js` before and after any animation or
  filter change. The bake happened because the number said so.
- **Commit per verified step** with a message that says what was measured.
- **Do not put `overflow:hidden` on body**, ever. `lockout.js` will catch it.
- **Deviations from `docs/design-plan.md` are recorded there**, § Build
  deviations, not made quietly.

## File map

```
app/layout.tsx                 fonts, metadata, pre-paint script (html.js, envelope-armed), sheet preloads
app/page.tsx                   <MaterialDefs/> <Invitation/> <Field/> <Controls/> <Envelope/>
components/Envelope.tsx        the opening
components/InvitationCard.tsx  the card, rendered twice (real + replica)
components/material/           MaterialDefs (filters), EmbossedPaper (baked sheet)
components/art/                WaxSeal (lit), Jasmine, Stitch, MapPlate, Knot, KorvaiEdge, paths.ts (generated)
components/field/              Countdown, Reveal, Schedule, Place, Closing, Thread, Field
content/invitation.ts          every fact and string; UTC instants; audio null
tools/                         pen.py (outline pen), monogram/wax/jasmine/mapplate/relief.py, emit_art.py, bake.js, verify/
public/paper/                  baked sheets     public/photos/  Unsplash backdrops
```
