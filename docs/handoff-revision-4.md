# Handoff — continue revision 4

**Read this first**, then `docs/design-plan.md`, then CLAUDE.md. It supersedes
`docs/handoff-revision-3.md`, which describes an approach that has been deleted.

## The one thing that matters

The client rejected revisions 1–3 twice. Both times the complaint was the same
word: **fake**. Both times the cause was the same: the paper, the embossing and
the wax were being *synthesised* in code — SVG lighting filters over drawn
paths. It never looked real because it never was.

**The reference's quality comes from photography, not from code.** Revision 4
acts on that. The cover is a photograph of a real sealed envelope; the only
thing authored is the impression pressed into the real wax. Everything that
follows should keep that principle: if a material needs to look real, use a
photograph of the material.

Deleted in revision 4 and not to be revived: `components/material/` (five
lighting filters), `components/art/WaxSeal.tsx`, `tools/bake.js`,
`public/paper/`.

## The client's complaints, and where each stands

| Complaint | Status |
|---|---|
| Wax seal looks bad, coded | **Fixed.** Real photographed wax. |
| Use a fancy, royal font for the characters | **Fixed.** Pinyon Script, copperplate, pressed into the wax and used for the names. |
| Change that horrible colour | **Fixed.** Antique bronze, the wax's own colour. The sage is gone. |
| 3D embossing looks forced and ugly | **Fixed.** Real cotton cardstock, photographed. |
| Background images only at the bottom | **Fixed.** The field backdrop spans the field, masked to nothing at both ends. |
| One image out of place at the bottom | **Fixed.** The closing blossoms were an unmasked rectangle; now radially masked. |
| More animations, ribbon opening, moving assets | **Partly.** See *What remains* — this is the largest gap. |
| Recreate La Maison Dorée | **Partly.** Materials and typography now match its register. Motion and section count do not yet. |

## Where the boundary is

The client asked for a pixel-for-pixel clone. That was answered in-session:
their page's richness is proprietary photography and ~33 MB of video, which
should not be lifted. What *is* being matched is the material register, the
typographic register and the motion vocabulary, around Advika and Sooraj's own
content. If the client presses again, the honest answer is the same, and the
productive response is to close the remaining gaps below rather than to copy
their files.

## How the cover is made

```
python3 tools/cover.py        # rebuilds public/cover/*.webp
```

`tools/cover.py` does three things, and each was arrived at by looking at the
result:

1. **Erases the stock impression from the wax.** Median-smoothing left a ghost
   of the original tree. What works: a heavy blur (radius ≈ 0.42 r) keeps only
   the real, asymmetric dome lighting, then ~30 % of the original
   high-frequency detail is added back so the surface keeps the grain of wax
   rather than the sheen of plastic. **`ImageChops.add` is `(a+b)/scale +
   offset`** — the fine layer is centred on 128, so the offset must cancel that
   or the whole disc washes out. It did, once.
2. **Presses in the monogram.** Pinyon Script, sized to the wax. Light falls
   from the upper left, so a groove's upper-left wall is shadowed and its
   lower-right wall catches light.
3. **Composites onto a surface** at 1000×1900 — close to a phone's own
   proportion, so `object-fit: cover` crops almost nothing. Sampling the
   backdrop out of the source photo and stretching it produced visible streaks
   in both directions; real paper, scaled to cover, has texture and no
   direction.

Measured constants at the top of the file (`CX, CY, R`, `ENVELOPE`) are for
this photograph. Swap the photograph and they must be re-measured.

## The opening

The photograph is cut down the middle of the seal into two doors on outer
hinges (`components/Envelope.module.css`). Each door holds a full-width copy of
the image pinned to its own edge, so the two are seamless until they part, and
each half of the seal travels with the half of the envelope it is stuck to.

| ms | Beat |
|---|---|
| 0–120 | pressed |
| 120–1500 | the wax gives — the doors part a few pixels on `--ease-break`, which is deliberately slow off the mark |
| 700–3400 | the doors swing wide |
| 1400–3000 | the card rises out of the envelope's dark |
| 1900–3700 | the scrim lifts (opacity only — a CSS filter re-rasters every frame) |
| 2600–5000 | the jasmine stitches on |
| 3200–4900 | the card composes |
| 4200–5300 | light sweeps |
| 5300–6200 | the cover fades; the page beneath is the same component, so nothing moves |

Lockout guarantees are unchanged and verified 4/4: the invitation is
server-rendered and first in the document, the skip link is a real anchor that
works with no script, `body` is never `overflow:hidden`, every animation
supplies only its *from* state, and a 9 s failsafe resolves the sequence.

## Verified, on the built site

Harness in `tools/verify/` (README there). Last run:

- **LCP 1.16 s, CLS 0.0036** on Slow 4G + 4× CPU.
- **377–384 frames** through the opening, p95 17.2 / 19.1 / 19.6 ms at 1× / 4× / 6× CPU.
- Lockout 4/4. Console clean in dev and prod, four states. Audit clean
  (320–1920 px, 400 % reflow, 2× and 3× root type, keyboard, one h1). Contrast
  AA on rendered pixels. JS 141.5 KB gz. Lint and tsc clean.

**Two performance traps, both hit and both fixed by measuring rather than
guessing.** Inlining the card paper at 62 KB blocked the HTML parse: LCP 6.3 s,
CLS 0.204. At 640×896 / 13 KB it is 1.16 s and 0.0036. And `vitals.js` prints
the LCP element — use it. Three earlier attempts to fix LCP were made on a
hunch and none of them touched the real element.

## What remains, in priority order

1. **Test on a real phone.** Every number here is headless Chromium. Both
   rejections came from the client looking at the real thing.

2. **More motion — the largest remaining gap.** The reference is continuously
   alive. Specifically worth adding:
   - a *ribbon* or wrap over the envelope that unties before the doors part
     (the client asked for this by name);
   - parallax on the field backdrop as it scrolls;
   - a soft floral band that scales slowly between sections;
   - the card lifting slightly out of the envelope before the doors finish.

3. **More sections and imagery.** The reference has many more full-bleed
   photographic sections than we do. Ours has the card, countdown, schedule,
   map and closing. Consider a full-bleed floral band between the card and the
   countdown, and one behind the map.

4. **Script typography further.** Pinyon Script is only on the cover names and
   the monogram. The inviting line and the closing note would carry it well.
   Do not put it on times, the address, or anything a guest reads quickly.

5. **Share card.** `lib/sealSvg.ts` still draws the deleted sage SVG seal.
   Replace it with a crop of the new photographic cover. `app/icon.svg` is
   still the sage disc.

6. **Sound.** The reference plays music; `invitation.audio` is `null` pending
   the couple's track. Toggle and seal-tap start are already wired.

7. **`docs/open-questions.md`** is still open: the gap copy, which roads to
   letter on the plate, the audio track. Do not invent answers.

## Working method

- **Screenshot everything, and read the screenshot.** Every real fault in this
  project was invisible in the code: the ivory-on-ivory envelope, the names at
  55 % opacity, the seam through the names, the doors collapsing into one
  second, the tree ghost in the wax, the streaked backdrop, the names sitting
  on top of the seal.
- **Measure, then change.** `perf.js` and `vitals.js` before and after anything
  touching animation, filters or images.
- **Commit per verified step**, with a message saying what was measured.
- Deviations from `docs/design-plan.md` go in that file, § Build deviations.

## File map

```
tools/cover.py            builds the cover from the photograph — the important file
assets/source/            the photographs and the script font, unmodified
public/cover/             envelope.webp (117 KB), card-paper.webp (13 KB, inlined)
components/Envelope.*     the doors, the seal target, the addressed face
components/InvitationCard.*  the card, rendered twice (real + replica behind the doors)
components/field/         Countdown, Reveal, Schedule, Place, Closing, Thread, Field
components/art/           Jasmine, Stitch, MapPlate, Knot, KorvaiEdge, paths.ts (generated)
content/invitation.ts     every fact and string; UTC instants; audio null
tools/verify/             the harness every number above came from
```
