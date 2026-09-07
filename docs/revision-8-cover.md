# Revision 8 — the cover

The client looked at the cover against `docs/reference/maison-doree/01-cover.webp`
and returned five faults. Two were bugs and are fixed in `271693a`; three are
this document.

> the envelope looks very plain while the reference has tasteful designs
> the wax seal looks very very low quality … it doesnt even look like a natural
> wax seal and its blurred … make it the wedding logo
> the folding up animation does not work
> make sure the wax seal opens exactly how naturally realistic it would look and
> not some unnatural semicircle below it
> I am able to scroll in the cover page so once I open it, it unnaturally
> transitions to the scrolled state

Four decisions were put to the client before any of this was built, and all four
came back with the recommended option:

| | Decision |
|---|---|
| Wax colour | **Sage green**, as the reference — and as `content/invitation.ts` has been telling screen readers all along |
| Impression | **The whole wedding logo**, A and S with the jasmine, cut into the wax as relief |
| Opening | **The seal lifts whole with the flap**; the semicircle is a bug to remove, not a model to redesign |
| Paper | **Full-bleed blind emboss**, as the reference |

---

## What was actually wrong

### The fold — fixed in `271693a`

`.frame` carried `transform-style: preserve-3d`. That puts every child in one
shared 3D space and paints them by depth *instead of* z-index. The flap turns
about the top of the frame, so the instant its transform became a `matrix3d` —
250 ms in, three degrees of rotation — its body sat at negative z and sorted
behind the mouth's dark.

The flap was never failing to animate. It was animating perfectly, out of
sight, which is why two revisions of measuring its transform never caught it:
`tools/verify/probe.js` reports `rotateX(-18deg)` at `opacity: 1` at 1300 ms,
and the screenshot at that beat is a black triangle. **A measurement of the
right number is not a look at the result.**

### The scroll — fixed in `271693a`

Held at the top with listeners rather than `overflow: hidden`, because
`docs/design-plan.md` § The lockout forbids a scroll lock that can outlive the
script that set it. Listeners *are* the script: if it dies, the page scrolls.

### The semicircle

`public/cover/seal-patch.webp` — a 352 px disc of reconstructed paper, sitting
under the wax to hide the photograph's own seal once the flap carries the real
one away. It is a plane fit through a ring of surrounding paper plus tiled
grain, and it lands a shade lighter and flatter than the paper it has to sit
against. While the flap covered it that did not matter. With the flap fixed and
actually lifting, it is the first thing you see: a pale half-disc under the wax
from 400 ms on, and a bright halo around the seal on the flap's edge at 1600 ms.

It cannot be fixed by tuning the fit, because it is the wrong shape of solution:
a patch of paper composited over a photograph of the same paper has to match on
tone, grain, gradient **and** — once the emboss lands — on the phase of the
embossed florals running underneath it. Four ways to be caught out.

---

## The rebuild: one paper, one sprite

Invert what is baked and what is composited.

**Today** the photograph carries the wax, and a patch of paper is composited
over it to take the wax away.

**After** the photograph carries no wax at all — the paper is reconstructed
across the whole disc once, at build time, where it can be looked at — and the
wax is a separate sprite with an alpha channel that rides *inside* the flap.

```
  before                              after
  ┌─────────────────────┐             ┌─────────────────────┐
  │ envelope-*.webp     │             │ envelope-*.webp     │
  │   paper + wax       │             │   paper, embossed,  │
  │                     │             │   no wax anywhere   │
  ├─────────────────────┤             ├─────────────────────┤
  │ seal-patch.webp     │  ← the      │ seal.webp           │
  │   paper over wax    │    problem  │   wax + its shadow, │
  │   (must match 4     │             │   alpha, inside     │
  │    things at once)  │             │   .flap             │
  └─────────────────────┘             └─────────────────────┘
```

Why this is the right way round:

1. **The semicircle cannot exist.** There is no patch. Under the lifted flap is
   the same continuous sheet of paper that was always there.
2. **The emboss runs underneath the wax.** One relief pass over one wax-free
   sheet. A patch would have needed its own slice of the relief at exactly the
   right phase.
3. **The seal is authored, not repaired.** Colour, impression depth and edge are
   controlled directly and can be rendered at whatever resolution the sprite
   wants, instead of being recovered from a blurred region of a JPEG.
4. **The flap's geometry does not change.** `coverGeometry` already cuts the
   flap around the outside of the wax at 1.31 R. The sprite lands inside that
   cut, so the flap's silhouette is unchanged and the wax still travels on it.

The one thing it costs: the wax is composited at runtime rather than
photographed in place. The sprite carries its own contact shadow in alpha, and
it sits on the paper it was cut from, so the join is the wax's own edge.

---

## The paper: blind-embossed jasmine

The reference is cotton paper with florals blind-embossed to all four edges,
tone on tone, lit from the upper left. Ours is featureless ivory. That gap is
most of "the envelope looks very plain".

`RELIEF_ENVELOPE` in `components/art/paths.ts` was built for exactly this in
revision 3 and has been dead since revision 4 made the cover a photograph. It is
the right composition and the wrong delivery: it was a live SVG lighting filter,
and `tools/verify/README.md` records what those cost — 1.3–7.3 s per repaint,
which is why every other wash on this page is baked.

So the relief is **baked into the photograph** at build time, and costs nothing
at runtime.

There is no Python SVG rasteriser on this machine (`cairosvg`, `skia`, `wand`,
`svglib` — none present), and adding Chromium to the asset chain to rasterise
one height map is not worth it. But nothing needs rasterising: `tools/jasmine.py`
holds the bough as real Bézier geometry, and `pen.curve()` emits only absolute
`M` and `C`. A 40-line flattener reads it directly, so the height map is drawn
at whatever resolution the crop wants with no upscaling anywhere.

`tools/emboss.py`:

```
  flatten(d)      "M… C…" → polylines, adaptive subdivision
  stroke(h, …)    polyline → height, round caps and joins
  bough(h, …)     one jasmine spray: stem, leaves, buds, flowers
  field(w, h)     boughs at varied scale, rotation and phase, edge to edge
  press(paper, height)
                  blur the height map, take its gradient, light it from the
                  upper left, multiply into the paper
```

Blind emboss is *only* light: no colour, no outline. The paper's own ivory is
lifted where a surface faces the light and dropped where it faces away, at a
few levels of amplitude. Above about six levels it stops reading as pressed
paper and starts reading as a printed pattern.

### Density

Full bleed, as the client chose. Two constraints keep it from fighting the type:

- The relief is **suppressed under the wax and under the names**, on a soft
  mask, so the copperplate has clean paper to sit on. The reference does the
  same: its florals thin out behind "Requests the pleasure of your company".
- The relief is drawn on the **whole envelope before cropping**, so the portrait
  and landscape frames are two windows onto one continuous sheet rather than two
  patterns that happen to disagree at the breakpoint.

---

## The seal

### Sage

The wax in the photograph is antique bronze. The reference's is sage, and
`content/invitation.ts` already describes ours as "a sage-green wax seal" — so
today the alt text is simply wrong.

Recoloured, not repainted: the dome's luminance, its poured edge and its grain
are the photograph's, and only the chroma is replaced. Wax is a dielectric with
a strong specular, so the highlight desaturates toward white rather than toward
light green, which a flat hue rotation gets wrong.

### The logo, cut in

`assets/source/wedding-logo.png` is 208×306 — small, but for a deboss only the
*shape* is needed, not the ink. `tools/logo.py` already recovers coverage from
it by un-compositing the ivory ground, and coverage upscales far better than a
photograph: resample, then re-crisp the edge with a smoothstep so a 3× lift
lands on a hard edge instead of a ramp. That is the difference between a die
strike and the blur the client is complaining about.

The jasmine hairlines are 1–2 px in the source and would disappear into the
relief, so every stroke gets a depth floor — the same trick the current code
uses on the script, and the one thing in it worth keeping.

Cut, not printed: a brass die leaves depth, not colour. The gold becomes light
and shadow, and the wax stays one colour throughout. A gold mark sitting on
green wax is a sticker, and stickers are what revisions 1–3 were rejected for.

---

---

## What went wrong on the way, and what it cost

Recorded because both mistakes are the same mistake, and it is the one this
whole revision is about.

**The semicircle was not the patch.** Deleting `seal-patch.webp` was necessary
and did not fix it. With the flap finally rendering, a light crescent still
swung out from under the wax — and it was the flap's *own cut*. The flap was
cut around a circle at 1.31 R while the wax only reaches 1.057 R, so a quarter
of R of bare paper hung off the flap below the creases with nothing covering it.
Two intermediate theories were tested and discarded first (the reconstruction's
tone, then its texture), and both were measured, and both were wrong, because
measuring the thing you suspect is not the same as looking at the thing that is
there.

Cutting the flap to the wax's real outline then exposed a second fault
immediately: the creases were still being solved against a circle of radius R,
so the polygon jumped from the crease's end at 1.0 R to the outline's start at
1.05 R and left an uncovered wedge — a grey spike out of the seal at three
o'clock, plain on a desktop frame. Both now resolve against the same outline.

**The scroll guard broke deep links.** Gated on `gone`, it held the top of the
page for a guest arriving at `/#invitation` — where the overlay is hidden by CSS
but the component stays mounted. A deep link that could not be scrolled, which
is precisely the failure `§ The lockout` exists to prevent, introduced by the
change that was supposed to honour it. Caught by `tools/verify/contrast.js`,
which loads exactly that URL and reported seven sections stuck at opacity 0
because it could not scroll them into view. The guard is now gated on
`envelope-armed`, which is the one thing that actually decides whether the cover
is on screen.

---

## Verification

Not "the numbers are right" this time — the numbers were right the whole time
the flap was invisible.

| Check | Result |
|---|---|
| `open.js` at 390 and 1440 | Flap folds, wax travels on it, no disc, halo, seam or spike at any beat |
| `lockout.js` | All four tests pass; `body` overflow never `hidden` at any sample |
| `audit.js` | Clean: 320–1920 no h-scroll, 400% reflow, 3× type, focus rings, 44 px targets, semantics |
| `contrast.js` | All text WCAG AA |
| `console.js` | No console or page errors in any of the four states |
| `weight.js` | JS 142.6 KB gz (budget ~150) |
| `prefers-reduced-motion` | Keeps the object — envelope, seal, names — and drops the choreography |
| Screenshots | 390, 430, 768, 1440, read rather than confirmed |

### LCP: still failing, and it was failing before

**The one number that does not pass, and it does not pass on `main` either.**

| | LCP, Slow 4G + 4× CPU |
|---|---|
| Before this work (`271693a`) | 7620 ms |
| After | 6164 / 6176 / 7044 ms |

Better than it was, and still nowhere near the 2.5 s the brief calls a hard
line. Two things are worth recording:

**Why the recorded figure "does not reproduce"** — the open question CLAUDE.md
flags. It reproduces fine; the harness is bimodal. Five consecutive runs gave
8632, 8620, **1428**, 8628, 8628. In the fast run the LCP element is
`DIV.InvitationCard…paper` at 294840 px²; in the others it is
`IMG…envelope-portrait.webp` at 185745 px². The card is the larger element but
is covered by the fixed overlay, so it only becomes an LCP candidate when the
envelope is *not* armed. **The figure recorded for revision 5 was almost
certainly captured on an unarmed run**, and is the invitation's LCP rather than
the cover's. Anyone re-measuring should check the reported element before
quoting the number.

**What actually costs the time.** From the waterfall at 400 kbps, every asset
starts at ~212 ms and shares the pipe. The cover photograph finishes last, behind
76 KB of preloaded fonts — `parfumerie_script_400` alone is 60 KB and completes
at 7077 ms — and ~140 KB of JS. The image is not slow; it is last in a queue.

Fixing it means re-planning the font preload (the cover sets the names in
Parfumerie, so not preloading it means a visible fallback flash on the first
thing anyone sees) or cutting the cover's byte budget further. Both are choices
the client should weigh, and neither is one of the five faults raised here, so
neither has been made. `docs/open-questions.md` carries it.

What this revision did do is stay honest about its own cost: the seal sprite
adds 22 KB to the critical path, and the two cover crops were re-encoded four
quality points lower to give back 24 KB — measured, not guessed, at an emboss
detail sd of 7.92 against 7.95 and an error of 1.3 levels on paper whose own
grain is 2.4.
