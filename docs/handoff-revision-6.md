# Handoff — after revision 6

**Read this first**, then `docs/revision-6-ornament.md`, then CLAUDE.md. It
supersedes `docs/handoff-revision-5.md`, which describes a page with almost no
ornament on it.

## What changed

Revision 5 closed the client's complaints about the cover and the type and
named one thing still open:

> **Ornament.** The reference's watercolour architectural and floral
> illustrations, one per section, are a large part of why it reads as
> expensive, and they are still the thing we have least of.

Revision 6 is that. Eight pieces, one per section plus the two on the closing,
in a technique the plan calls **line plus wash**: drawn line art that draws
itself on, with a watercolour wash flooding in behind it.

The client made four decisions before any of it was designed, and they override
parts of CLAUDE.md. They are recorded at the top of
`docs/revision-6-ornament.md` and the important one is the first: the
architecture is the **venue**, the South Indian pieces are what the **family
brings into it**, and — the rule that organises the whole programme — *only
what the family brings is allowed to move.*

## Where the pieces are

| Section | Ornament |
|---|---|
| Countdown | Two fluted columns at the margins, a **thoranam** of mango leaves and jasmine strung between their capitals, and a **kuthuvilakku** lit at each foot |
| The day | A **kalasham** standing on the left, a **jasmine malai** hanging past both moments on the right |
| The place | **Banana stems** standing at the foot, a jasmine **bough** leaning in from the top right |
| The closing | Two urns of jasmine, a **kolam** drawn on the ground below the note, and fallen petals on the floor |

The kolam is the page's last mark and the one animation worth watching twice:
the pulli go down first, from the centre outward, and the line follows.

## The four things most worth not relearning

**1. Use the constructions that already work.** The lathe (`tools/ornament.py`
`lathe`) does columns, lamp stems, urns and plinths. `leafshape` does mango
leaves, acanthus, jasmine petals and banana blades. `rosette` does every
flower. Every failure in this revision — a drape cut after three passes, a
cypress cut after two, an acanthus redrawn twice, a peacock finial abandoned —
came from inventing a new construction for one piece. Both cuts are written up
in `docs/revision-6-ornament.md § What was cut`.

**2. Inline SVG is expensive in a way that is invisible until measured.**
Server-rendered, the ornament made the document 1.33 MB — Next serialises the
rendered tree twice, once as HTML and once as the RSC payload, so every wasted
byte is paid for twice. It is loaded with `next/dynamic({ ssr: false })` and
gated on approach now. Do not server-render new ornament.

**3. `content-visibility: auto` implies `contain: paint`.** It is what keeps
scrolling inside a two-frame budget, and it clips each stage to its own padding
box. That is why the *stage* is what bleeds to 100vw and the ornament layer
inside it is a plain `inset: 0` overlay. Put the bleed back on the layer and
both columns and both lamps disappear at 390px.

**4. Every rotated SVG `<g>` is a main-thread repaint.** Chrome will not
promote one to a composited layer the way it will an HTML box. The garlands
sway in bands, not leaf by leaf.

**5. Measure the box, and put the variables on the stage.** Every ornament was
clipped by its own hand-written viewBox until `tools/ornament.py` started
measuring them; and `--kal-w` declared on `.deco` but used in `.stage`'s
padding silently resolved to nothing, because custom properties only inherit
downward. Both are in `docs/revision-6-ornament.md § The second pass`.

## Verified, on the built site

| | Revision 5 (as recorded) | Revision 6 |
|---|---|---|
| Frame pacing, the opening, 1x/4x/6x | 22.5 / 24.3 / 28.7 ms | **20.1 / 21.6 / 25.7 ms** |
| Frame pacing, scrolling the field | not measured | **17.4 / 19.3 / 23.3 ms** |
| CLS | 0.0222 | **0.0222** |
| Document, gzipped | ~35 KB | **79 KB** |
| JS on the critical path | 142.6 KB | **144.7 KB**; the ornament is a further ~70 KB, fetched on approach |
| Images on the critical path | 149 KB | **149 KB** (+97 KB of wash sheets, on approach) |
| Lockout | 4/4 | **4/4** |
| Audit 320–1920, 400% reflow, 3x type | clean | **clean** |
| Contrast | AA | **AA**, 16 blocks sampled |
| Console, four states | clean | **clean** |

## What remains

**LCP, and a number that does not reproduce.** `docs/handoff-revision-5.md`
records LCP 1.16 s. Measured on the parent commit `bb6e443`, with none of this
code present: **8.58 s**. This branch measures **7.56 s** — better, because it
also fixes a preload of `/cover/envelope.webp` that had 404'd since revision 4
renamed the file.

The cause is the cover photograph, not the ornament: at DPR 2 under a 4x CPU
throttle the 1100×2000 WebP takes seconds to decode, and LCP is recorded when
the decoded image paints. At DPR 1 the cover is complete and correct on screen
at 2.5 s. The three LCP entries are the name at 1.88 s, the wax at 2.56 s, and
the photograph at 7.56 s.

**This is the next thing to look at**, and the lever is the photograph's decode
cost — a smaller crop, or a second source served at 1x. Do it with the 8.58 s
baseline in hand, not the 1.16 s one.

Also still open, unchanged from revision 5:

- **Font licensing.** Parfumerie and Mrs Eaves are licensed desktop fonts and a
  desktop licence is not a webfont licence. Settle it before this goes anywhere
  beyond family. See `ASSETS.md`.
- **The countdown's own ~0.009 of CLS** when it ticks. It is the only shift
  left in the page.
- `docs/open-questions.md` — three questions for the couple, none blocking.

## What I would not do next

Add more ornament. The page now has eight pieces against the reference's
eleven, in a fifth of the height, and the brief's warning is the one that
applies: *spend your boldness in one place.* If anything, the next revision
should look hard at whether the columns are earning their keep on a phone,
where only a sliver of each is in frame.
