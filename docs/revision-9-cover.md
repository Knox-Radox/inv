# Revision 9 — the cover, the card, and what is drawn on them

> I love how the whole website looks illustrated with a particular art style,
> could you implement the same style for the envelope animation.

and, of the two PDFs of the family's printed invitation:

> You can incorporate elements from these. Just the art and animations. Like
> the borders and the color combos.

Six decisions came back before any of it was built:

| | Decision |
|---|---|
| Envelope | **Fully illustrated.** The photograph is retired, wax and all |
| Colour | **Ivory paper, jewel inks.** Maroon, marigold and kumkum pink as pigment only; one saturated surface, the liner |
| Motifs | The mirror-work border, **floral butis, garlands with brass bells** |
| Bans | Lifted for one thing: **a subtle Ganesha mark with its one line** |
| More art | *"Keep it memorable and not too much"* — so nothing else |
| The PDF's own images | Not used. They are Canva stock and the file's metadata flags generated content; everything here is redrawn |

---

## Why this is not revisions 1 to 3 again

Those were rejected as looking fake, and the cover became a photograph because
of it. The difference is worth being exact about, because it decides every
choice below.

Revisions 1–3 **imitated a material**: SVG lighting filters standing in for
paper fibre and poured wax. This is **a picture of an envelope**, in the hand
the rest of the page is drawn in, and a picture is allowed to look painted.

So `tools/paint.py` does not model light on wax. It models what a brush does,
which is a much shorter list:

1. **A wash stops at a wet edge** — the shape's boundary pushed about by a
   low-frequency field and re-cut, never the geometry's own outline.
2. **It dries darker there.** A rim: the mask minus its own blur.
3. **It separates inside.** Two pigments on independent fields.
4. **It settles into the tooth.** Granulation, denser where the wash is.
5. **The highlight is the paper.** The seal's shine is a place the wash thins
   to nothing, and a place the brush did not go has a *hard* edge. The first
   pass faded it in softly and it read as an airbrush.

And the line goes on last, stamped rather than stroked, so it swells and thins.

---

## What is painted, and what is drawn

| Piece | How | Bytes |
|---|---|---|
| The paper's jasmine print | `paint.sprigs()` → `public/cover/sprigs.webp`, 1000², opaque | 20 KB |
| The seal | `paint.seal()` → `public/cover/wax.webp`, 420², alpha | 19 KB |
| The liner | `paint.liner()` → `public/cover/liner.webp`, one 296 px repeat | 4 KB |
| The flap's edges | two SVG paths in the document, with a hairline of gold inside each | — |
| The paper itself | a colour | — |

The jasmine is revision 8's blind emboss, painted: the same boughs on the same
lattice (`tools/emboss.py` still lays them out), now a pale sage wash with the
veins drawn into it. The emboss was the paper's light; this is the paper's
print.

The seal is the couple's own logo, recovered from `assets/source/wedding-logo.png`
as coverage and cut into the wax as a darker tone with a thread of light on the
far wall of each stroke.

**The liner is the one saturated surface on the page**, and it is on screen for
about a second: lac maroon, block-printed in gold with one small flowering
sprig in a half-drop repeat. It is the PDF's tile without its elephants, which
the brief bans and the client left banned.

---

## One triangle, in viewport units

Revision 8 measured where the flap's two creases ran in two crops of a
photograph and generated 758 lines of polygon from them. There is nothing to
measure now.

```
  --apex    where the flap's point is, from the top
  --slope   0.8, the same at every screen size
  --tilt    38.66deg, which is that slope as an angle
```

The flap is `polygon(50% apex, far-left-along-the-edge, far-right-along-the-edge)`
with the two far corners 200vmax away, so its top side is always off screen. On
a phone the edges run off the sides; on a desktop they run off the top. Every
line that lies along an edge is drawn level in a long thin box and turned by
the one constant angle, so its own wander is never stretched.
`components/coverGeometry.ts` is deleted.

---

## The opening

```
      0 -  240   the press
    180 -  550   the wax gives: three degrees, slow off the mark
    550 - 1880   the flap swings away, and under it is the liner
   1350 - 2700   the card rises out, past the liner
   1560 - 2860   the page's own ground rises behind it
   1650 - 2720   the mark is drawn at the card's head
   2050 - 3310   the border is strung round the card
   2100 - 3250   the envelope's front falls away
   2700 - 3600   the butis are printed along the foot
   3650 - 4500   the cover dissolves into the page, which is the same card
```

Before the tap, one thing moves: the flap's two edges are drawn outward from
under the wax as the cover arrives. The wax and the names are simply there.

---

## The card

In the order the family's printed invitation has it: the mark and its line,
the names, the line that invites, the day, the place, and a row of butis.

**The border is embroidery.** Every flower in the PDF's border has a silver
disc at its centre inside a magenta ring. That is *shisha* work — a mirror held
to cloth by a ring of stitching — and the brief's governing metaphor has been
embroidery since revision 1. Of everything in the PDF it was the one motif
that was already this page's own. It is four strips, each a CSS background
with `background-repeat: round`, which is the only thing on the web that fits
a whole number of flowers to a card of any size without script; and four
strips can arrive separately, so inside the envelope the border is *strung*,
two threads from one corner.

**The mark is a few strokes.** Not a figure: the ears, the brow, the trunk
(turned to the viewer's right — *vamamukhi*, the form kept in a home), a
crown's point and a tilak. It is drawn first, because an invocation is said
first. The line beneath it is in Mrs Eaves; the PDF sets it in a
Devanagari-styled Latin face, which the brief bans.

**The jasmine spray and the korvai edge came off.** With a border on four
sides they were a second and a third frame.

**On a desktop the names sit on one line.** Stacked, they alone were 370 px of
a card that ran 180 px past the bottom of a laptop screen.

**The ampersand is Mrs Eaves'**, between two lines of copperplate, as an
engraved card sets it. The script's own is a hairline knot at that size.

---

## What went wrong on the way

Recorded because most of these were the same mistake as revision 8's: a number
that was right while the picture was wrong.

**The liner was on screen for no frames.** The card began rising at 1000 ms on
a curve that does nine tenths of its travel at once, so by the time the flap
was out of the way the card had already covered the one thing the whole colour
scheme was organised around. Every timing was "correct". It showed in the
first contact sheet and in nothing else. The flap is quicker now, the card
waits for it, and its curve is a hand's.

**The envelope's edge ran ahead of its own cut.** The front was first *wiped*
away with an animated `clip-path`, with the cut edges following on a
transform. A transform is composited; a clip is repainted on the main thread.
Under any load the edge ran a frame or two ahead and a band of envelope opened
between them — forty pixels in a capture. The front is one element now and it
falls. One transform cannot disagree with itself.

**Champagne faded over maroon is pink.** The page's ground used to fade in
over the liner, through a colour on no palette this page has. It rises now, as
a second sheet coming out of the envelope.

**The tilak was a red dot on blank paper** for a full second, because it is a
fill and `Stitch` cannot draw a fill on. It waits for the brow.

**A dash pushed off a round-capped path leaves its cap.** Every unchosen phrase
on the reply card had a full stop floating above it.

**The border came out in groups of four with gaps.** `background-repeat: round`
stretches a tile, and an SVG that keeps its aspect ratio inside a stretched box
letterboxes. The tiles are `preserveAspectRatio="none"` and two flowers long.

**The first jasmine sheet was 148 KB**, as pigment with an alpha channel. It is
one pigment on one paper: opaque, on the page's own ground, it is 20.

**The liner tiled as a quilt.** Its noise was made periodic by tiling the
*zoomed* field, which is periodic only when the zoom factor is an integer.

**Roses and marigolds came out as cogs.** `rosette` cut its notches as deep
for a ball of petals as for a jasmine's five. It takes a `valley` now.

---

## Three bugs that died with the rebuild

- **The seen flag was never read.** `SEEN_KEY` was exported from a
  `"use client"` module and imported by the server layout, where it is a
  reference and not a string: the built page shipped
  `localStorage.getItem(undefined)`. Every returning guest was handed the
  envelope again. `tools/verify/console.js` set the key itself, so the harness
  could not see it.
- **The names doubled for 800 ms** as the cover dissolved: the page's `h1` got
  a `padding-right` from a global rule that the replica's `p` did not.
- **Reduced motion got a hard cut.** The global `0.01ms !important` beat the
  420 ms crossfade written beneath it.

With the first one fixed, the brief's "discreet way to replay it" became
necessary for the first time. It is at the foot, under the kolam.
