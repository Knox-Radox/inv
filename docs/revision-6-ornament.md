# Revision 6 — the ornament programme

The client's remaining gap, named at the end of `docs/handoff-revision-5.md`:

> **Ornament.** The reference's watercolour architectural and floral
> illustrations, one per section, are a large part of why it reads as
> expensive, and they are still the thing we have least of.

This closes it. Four client decisions were taken before any of it was designed
and they are recorded here because they override parts of `CLAUDE.md`.

## What the client decided

| Question | Answer |
|---|---|
| Whose vocabulary — the reference's European neoclassicism, or South Indian? | **Both.** The architecture is the *venue*; the South Indian pieces are what the *family brings into it*. |
| How is it drawn — watercolour raster, or our line idiom? | **Line plus wash.** Drawn line art that draws on, with a watercolour wash that floods in behind it. |
| The reference's assets are "interactable" — what should a guest be able to do? | **Nothing new.** Ambient life only. The page still has exactly three interactive elements. |
| The motion budget and the ~150 KB JS cap | **Lifted.** LCP under 2.5 s on Slow 4G is the only hard line, and everything gets re-measured. |

The correction offered and accepted along the way: the reference's ornaments are
**not** interactive. They are static PNGs. What makes that page feel alive is
density, the fact that the ornaments bleed off the edges and overlap the
content, and that they are painted objects with mass. Ours were hairlines
floating in a centre column. At 1440px the outer ~500px of each margin was
empty ivory.

Three of the five files in the client's `Design Assets/` folder are unusable as
files — they are `.jpg` screenshots *of* PNG listings, with the transparency
checkerboard baked into the pixels, at 400–736px. Two are also unlicensed
third-party stock, which `CLAUDE.md` bans. They were read as direction and not
shipped: the gold line-art florals are close to our own idiom already, and the
lotus is a subject worth having.

---

## The organising rule

**Stone is the venue. Green and brass are the family. Only what the family
brings is allowed to move.**

That is not a stylistic conceit, it is the motion budget and the meaning at the
same time. Columns, urns, plinths, cypress and drapery draw on once and are
then still, because stone is still. The thoranam sways, the malai sways, the
lamp flames breathe, because those are the things that were carried in this
morning and hung up. A guest never has to be told this; they only have to not
be lied to.

It also keeps the page honest about where it is. Artistry Venue is a Texas
estate; the neoclassical frame is plausibly literally true of the building. The
thoranam over the door and the lamps lit at the threshold are what the family
does to it. Neither half is borrowed costume.

---

## The pieces

| # | Piece | Register | Where | Moves |
|---|---|---|---|---|
| 1 | Fluted columns ×2, bleeding off top and bottom | stone | Countdown, both margins, behind | No |
| 2 | **Thoranam** — cord, mango leaves, marigolds | brought | Countdown, strung between the capitals | Sways |
| 3 | **Kuthuvilakku** ×2 — standing brass lamp, lit | brought | Countdown, at the column bases | Flames breathe |
| ~~4~~ | ~~Drape~~ — **cut**, see below | — | — | — |
| 5 | **Jasmine malai** — strung garland | brought | The day, right margin, past both moments | Sways |
| 6 | **Banana stems (vazhai)** | brought | The place, foot of the section, left | No |
| 7 | **Jasmine bough** leaning in (replaced a cypress — **cut**, see below) | brought | The place, top right | No |
| 8 | Urns on plinths ×2, holding jasmine | stone + brought | The closing, flanking | No |
| 9 | **Kolam** — pulli dots, then one continuous sikku line | brought | The closing, beneath the note | Draws once |
| 10 | **Kalasham** — brass pot, five mango leaves, a coconut | brought | The day, standing on the left | Leaves stir |
| 11 | **Fallen petals** — jasmine off the garlands above | brought | The threshold's floor and the closing's | Drop once |

Piece 9 is the emotional close and the reason the order ends where it does. A
kolam is drawn at the threshold at dawn; it is the mark that says the house is
ready to receive you. Ending an invitation on one is the correct last sentence,
and it is the one animation on the page that is worth watching twice.

> **Piece 9 was rebuilt in revision 7 — see `docs/revision-7-kolam.md`.** What
> this revision actually shipped was an eight-petal rosette inside a scalloped
> ring, described here as "one continuous sikku line" and not being one: its
> petals each left the centre and came back, so the line lifted eight times, and
> the dots were decoration it ignored. It is a real sikku kolam now, on
> fifty-three pulli, and the line goes round all of them without lifting.

Nothing here adds a section. The brief says invitation, not wedding website.
Every piece hangs in the margins and bleeds of sections that already exist.

---

## How line-plus-wash is built

Four layers per ornament, cheapest first. No live SVG filter anywhere — the
handoff records that live lighting filters cost up to 400 ms a frame and are
why the cover is a baked sheet.

1. **The wash sheet.** `tools/wash.py` bakes a small number of shared
   watercolour sheets — real pigment behaviour: multi-octave value noise for
   the blotching, two or three pigments at slightly separated hues mixed by an
   independent field (a wash *separates*; a tinted blur does not), high-
   frequency granulation biased into the darker passages where pigment settles
   in the paper's valleys, over the same cold-press grain the rest of the page
   is made of. One sheet per palette family, shared by every ornament that
   needs it, the way `card-paper.webp` is shared.

2. **The silhouette.** Each ornament's fill shape, generated by `tools/pen.py`
   from the same spines as its line art, with a slightly perturbed outline. It
   clips a region of the wash sheet. The wobble matters: the wash bleeding a
   hair past the line in places is the single strongest tell that something was
   painted rather than filled.

3. **The dried edge.** The silhouette drawn again as a *stroke* in a deeper
   tone at low opacity, inside its own clip, so only the inner half survives.
   That is the rim a wash leaves where it dried, it follows the shape exactly,
   and it costs one path.

4. **The line.** Centrelines through the existing `Stitch` primitive, so the
   draw-on mechanic stays in one place and every new piece inherits the
   guarantee behind lockout test T2: cancel every animation and every line is
   complete.

**The reveal.** The line draws; the wash *blooms* in behind it — `scale(0.96 →
1)` with a small translate along the direction the brush would have moved, plus
opacity, on a long ease-out. Transform and opacity only, so it composites.
Not a fade: pigment spreading outward from where the brush touched down.

**Ambient motion** is CSS only — no rAF, no scroll listener — out of phase per
element, paused off-screen, and absent under `prefers-reduced-motion`, where
every ornament is simply already painted and still.

---

## Order of work

One at a time, each verified before the next.

1. The wash system, proved on a single ornament.
2. The countdown: columns, thoranam, lamps.
3. The day: malai, drape.
4. The place: banana stems, cypress.
5. The closing: urns, kolam.
6. Re-measure everything: `build`, `tsc`, `lint`, LCP/CLS on Slow 4G, frame
   pacing at 1x/4x/6x, the 320–1920 audit, contrast, lockout, and screenshots
   at 390 / 430 / 768 / 1440 read critically rather than confirmed.

## What would make this fail

Worth writing down before starting, because each has a specific smell.

- **Ornament that decorates rather than means.** A column because columns are
  posh. Every piece here has to be either the venue or something the family
  actually carries in.
- **Watercolour that is a tinted blur.** Real wash has separation, granulation
  and a dried rim. Missing any one of the three and it reads as a Gaussian.
- **Too much.** The reference is denser than us and can afford to be; it has
  8,051 px and eleven sections. We have four. Density has to come from scale
  and bleed, not from count.
- **Symmetry.** Two identical columns, two identical lamps, two identical urns
  is a stencil. Nothing mirrors anything.


---

## The second pass, on the client's mobile notes

Four placement faults and two additions.

**The bleed was 16px off centre.** Every stage broke out with
`margin-inline: calc(50% - 50vw)`, which assumes its containing block is
centred in the viewport. `.inner` is not: its left padding is the content datum
at 56px and its right is `--field-pad-right`, 23px on a phone. So the whole
ornament layer sat 16px to the right, and the right column, the right lamp and
the right urn were each cut 16px harder than their partners. That single number
was "the pillars are too far right" and "the lamps are not aligned". The bleed
comes off `--bleed-left` / `--bleed-right` now, declared on `.inner` where the
paddings are.

**Every piece was clipped by its own viewBox.** All of them were authored in
round-numbered boxes — 300x420 for the banana, 100x214 for the lamp — and all
of them drew outside. An `<svg>` clips to its viewport, so the left banana lost
a leaf, the urns lost the tops of their jasmine and the lamps lost the tops of
their flames. It never showed in the preview harness because that had
`overflow: visible` on the svg. `tools/ornament.py` measures the boxes now and
hands each one's aspect to the stylesheet as `--ar`, so a hand-kept multiplier
can never go stale against the geometry again.

**Two lamps, one floor.** The right lamp used to sit 12px lower on the
reasoning that two objects put down by hand are never level. The floor is,
though, and with both sharing a bottom-aligned viewBox the offset put one of
them through it. The difference between them is in the drawing.

**Ornament variables have to live on the stage.** `--kal-w` and `--urn-w` were
declared on `.deco` and used in `.stage`'s padding; custom properties inherit
downward only, so both resolved to nothing and both pieces had
`padding-bottom: 0px` — measured — and no band to stand in.

The two additions are pieces 10 and 11 above. The kalasham goes where the drape
failed: the day had ornament on one side only. The petals are the cheapest
density on the page and they *explain* the garlands, because a thing that sheds
is a thing that is real.

---

## What was cut

Two pieces were built, looked at, and thrown away rather than shipped
mediocre. Both are recorded because the reasons generalise.

**The drape.** Three passes: a generic curtain, a curtain with a zari border,
and the same panel brought fully into frame so the whole thing could be judged
rather than the sliver of it that fitted in a margin. All three read as a grey
rectangle with a wavy edge — a bookmark. A drape reads by **light**:
alternating lit and shadowed bands running down its folds, one band per pleat.
The silhouette, the pleat lines and the hem are scaffolding around that, and
without it there is nothing to see. Doing it properly is a lighting model, not
a drawing, and at the end of it the page would have had a European curtain
doing work the thoranam, the malai, the columns and the lamps already do with
meaning behind it. It was the only piece in the programme that was pure venue
dressing, which is probably why it was also the only one that would not come
right.

**The cypress.** Two passes, two different wrong plants. A smooth spindle
profile with long raking strokes inside rendered as three aloe leaves; adding
tufts to the profile and making the strokes droop rendered as agave. Both are
the same mistake: a conifer's silhouette is not a profile with noise on it, it
is an accumulation of overlapping sprays, and drawing one means stacking dozens
of small dark shapes rather than lathing one and marking it. Replaced by the
jasmine bough, which `docs/design-plan.md` § Illustration inventory had already
listed as item 10 and which nobody had built.

The general lesson, which cost about six passes to learn twice: **the
constructions on this page that work are the ones that were already working.**
The lathe does columns, lamp stems, urns and plinths. `leafshape` does mango
leaves, acanthus, jasmine petals and banana blades. `rosette` does every
flower. Every failure above came from inventing a new construction for one
piece.

---

## Two bugs this uncovered

Neither is revision 6's, and both had been shipping for three revisions.

**The knot has never rendered.** `docs/design-plan.md` calls it "the one knot
on the page… the last mark on the invitation". It resolves to `left: -40px` —
it sits on the thread's datum, 28px inside `.inner`, while its own section
starts at 56px — and that section had `overflow: hidden`. So it has been laid
out 40 px outside its clipping parent and painted nowhere since revision 3.
The clip is gone; the blossom photograph it was there for is masked to nothing
inside its own box instead, which also fixes a hard rectangular corner that
photograph showed at any width over about 900px.

**The thread ran six hundred pixels past the knot it ties off at.** Nobody had
noticed, because the knot was invisible. The thread is absolutely positioned
inside the field's measure, so anything left in that measure extends it; the
kolam renders outside it.

Also: `app/layout.tsx` had preloaded `/cover/envelope.webp` at high priority
since revision 4 renamed the file. It 404'd on every load.

---

## The weight of it

The thing that nearly sank this revision, recorded in full because the obvious
reading of the number is wrong.

Every ornament is inline SVG. Server-rendered, the cast came to about 500 KB of
markup — and Next serialises the rendered tree a second time into the RSC
payload, so the built document was **1.33 MB raw, 238 KB gzipped**, against a
baseline of about 35 KB. On the Slow 4G profile the harness measures against,
238 KB is roughly five seconds of transfer, and the cover photograph queued
behind all of it.

Three fixes, in order of size:

1. **The ornament is not in the document.** `components/art/LazyDecor.tsx`
   loads each layer with `next/dynamic({ ssr: false })`, so it is in neither
   the HTML nor the RSC payload, and it is gated on an IntersectionObserver
   with a 700px margin so the chunk is not even *requested* until a guest has
   scrolled past the card. Measured: the ornament chunks now start at 9.1 s and
   the wash sheets at 11.1 s, well after everything on the critical path.
   Document: 238 KB → **79 KB** gzipped.
2. **Each silhouette is written once.** `Wash` needs it as a clip, as an opaque
   base and as the rim stroke; emitting `d` three times put 199 KB of duplicate
   path data into the document, paid for twice. It is a `<path id>` in `<defs>`
   and two `<use>` now. Measured on the built page beforehand: 1,218 paths, 730
   distinct.
3. **Off-screen sections are not rendered.** `content-visibility: auto` on each
   ornament stage. Scrolling the whole page at a 4x CPU throttle went from p95
   35.9 ms a frame to **20.1 ms**, and at 6x from 50.3 ms to 27.0 ms — against
   17.5 ms with the ornament hidden altogether, so it recovers most of the
   cost. It has to be on the stage: `.deco` is absolutely positioned at
   `inset: 0`, so it has no size of its own and is never actually skipped.

The garlands also sway in **bands** rather than leaf by leaf. Every rotated SVG
`<g>` is a main-thread repaint — Chrome will not promote one to a composited
layer the way it will an HTML box — and 26 leaves plus 54 flowers was 80 of
them a frame. Five bands and four segments, each on its own period. It is also
more truthful: a garland swings in sections, because the cord carries the
motion.

---

## Measured, on the built site

Harness in `tools/verify/`. Everything below is from the production build.

| | Revision 5 (as recorded) | Revision 6 |
|---|---|---|
| Frame pacing, the opening, 1x/4x/6x | 22.5 / 24.3 / 28.7 ms | **20.1 / 21.6 / 25.7 ms** |
| Frame pacing, scrolling the field, 1x/4x/6x | not measured | **17.4 / 19.3 / 23.3 ms** |
| CLS | 0.0222 | **0.0222** |
| Document, gzipped | ~35 KB | **79 KB** |
| JS on the critical path | 142.6 KB | **144.7 KB** (the ornament is a further ~70 KB, fetched on approach) |
| Images | 149 KB | **149 KB** on the critical path; 97 KB of wash sheets on approach |
| Lockout | 4/4 | **4/4** |
| Audit 320–1920, reflow, 3x type | clean | **clean** |
| Contrast | AA | **AA on all 16 sampled blocks** |
| Console, four states | clean | **clean** |

### LCP, and a number in the handoff that does not reproduce

`docs/handoff-revision-5.md` records **LCP 1.16 s**. It does not reproduce.
Measured on the parent commit `bb6e443`, with no revision 6 code present at
all: **LCP 8.58 s**. The same harness on this branch measures **8.06 s** — half
a second *better* than the baseline, because the 404'd cover preload is fixed
and the image now starts at 212 ms instead of 1427 ms.

What is actually happening: at DPR 2 with a 4x CPU throttle, the 1100x2000
cover photograph takes seconds to decode, and LCP is recorded when the decoded
image paints. At DPR 1 the cover is complete and correct on screen at **2.5 s**
— there is a screenshot of it. The three LCP entries are the name at 1.88 s,
the wax seal at 2.56 s, and the envelope photograph at 7.56 s.

So: revision 6 did not regress LCP, and the 2.5 s figure is what a guest sees.
But the 8 s metric is real and it is not fixed. It is a property of the cover,
not of the ornament, and the lever is the photograph's decode cost — a smaller
crop, or a second source at 1x. That is the next thing to look at, and it
should be looked at with the baseline number in hand rather than the 1.16 s one.
