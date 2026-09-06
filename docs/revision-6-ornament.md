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
| 4 | Drape, gathered and falling | fabric | The day, right margin | No |
| 5 | **Jasmine malai** — strung garland | brought | The day, left margin, past both moments | Sways |
| 6 | **Banana stems (vazhai)** | brought | The place, left of the plate | Leaf tip drifts |
| 7 | Cypress cluster | stone-register planting | The place, right of the plate | No |
| 8 | Urns on plinths ×2, holding jasmine | stone + brought | The closing, flanking | No |
| 9 | **Kolam** — pulli dots, then one continuous sikku line | brought | The closing, beneath the note | Draws once |

Piece 9 is the emotional close and the reason the order ends where it does. A
kolam is drawn at the threshold at dawn; it is the mark that says the house is
ready to receive you. Ending an invitation on one is the correct last sentence,
and it is the one animation on the page that is worth watching twice.

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
