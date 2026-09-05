# Handoff — continue revision 5

**Read this first**, then `docs/design-plan.md`, then CLAUDE.md. It supersedes
`docs/handoff-revision-4.md`, which describes a cover that has been replaced.

## What changed, and why

Revision 4 answered the client's "it looks fake" by making the cover a
photograph. That was right and it stays. What it got wrong was the *framing*: it
composited the whole envelope onto a paper backdrop as an object laid on a page,
small, with the page's dead space around it. On a laptop it was a stamp-sized
envelope floating in a column of nothing, with "Open the invitation" printed
across the wax and a "Skip to the invitation" link parked in the corner.

Look at `docs/reference/maison-doree/01-cover.webp` and the difference is not
subtle. The reference is a **macro**: cotton paper to all four edges, the flap's
V running down to the wax, one line of script under it, nothing else in frame.

Revision 5 makes three changes on that basis.

**The type is the reference's own.** Parfumerie Script and Mrs Eaves, supplied
by the client, replacing Gilda Display, EB Garamond and Pinyon Script. The type
was as much of the gap as the material was. Two faces, no third role.

**The cover is a macro.** `tools/cover.py` crops into the photograph instead of
compositing it onto a surface, and emits two frames — portrait for a phone,
landscape for a desktop — plus `components/coverGeometry.ts`, which records
where the flap's hinge, its two creases and the wax land in each.

**The opening is the envelope's own.** The flap is cut along the creases that
are already in the photograph and turns on the hinge the real flap turns on. The
whole seal goes up with it. The card rises out of the dark, the mouth opens out
until it is the whole frame, and the cover crossfades to the page beneath.

The whole cover is the target — no label, and the skip link appears on focus
rather than sitting on the paper.

## The client's complaints, and where each stands

| Complaint | Status |
|---|---|
| Looks nothing like the reference | **Largely closed.** Same framing, same two faces, same register. Their watercolour ornament is still the remaining gap — see below. |
| Wrong fonts | **Fixed.** Parfumerie and Mrs Eaves throughout, share card included. |
| Envelope looks cheap | **Fixed.** Full bleed macro of real paper at every size. |
| Seal looks computer generated, the S is not legible | **Fixed.** The wax is photographed; the monogram is Parfumerie pressed into it, and it is legible at 320px. |
| "Open the invitation" acting as a button | **Removed.** Tap anywhere. |
| Skip link not wanted | **Removed from view**, kept on focus. It is the thing that makes this not a gate with no script; deleting it outright would break the lockout guarantee. |
| Desktop wastes its space | **Fixed.** Its own landscape crop, full bleed. |
| Animation should be smooth and intentional | **Fixed**, and measured — see below. |

## How the opening is built

`components/Envelope.module.css` carries the beat table. Nothing in it guesses
where the paper is: every geometric number comes from `coverGeometry`, generated
by `tools/cover.py` from the photograph itself.

The frame is sized to the photograph's own aspect and scaled to cover, rather
than `object-fit: cover`. This matters: the flap's clip path is a percentage of
the *element*, and with `object-fit` the browser crops inside the box, the
picture slides against the box, and the cut stops following the crease.

**Three bugs worth not reintroducing**, all found with `tools/verify/open.js`
and `probe.js` (they pause every animation and set `currentTime` by hand, so a
screenshot's repaint cost cannot mistime a frame):

1. The flap turned about the *true* hinge, which on the landscape crop is 47% of
   a frame above the picture. An axis that far off converts rotation into mostly
   translation — the flap did not open, it took off, leaving the viewport by
   254px at 1.7s. Both crops turn about the frame's top edge now.
2. `--ease-rise` front-loads hard. The envelope's dark was at 0.15 by 900ms and
   the card arrived onto bare paper. The dark holds now, and sits *over* the
   card as well as behind it, so the card comes out of it.
3. The mouth's clip and the flap's clip were the same polygon, so their two
   antialiased edges drew a hairline across the wax at rest. That was fixed by
   insetting the mouth, and the inset was later dropped again — see the second
   pass below, where the replica became `visibility: hidden` and left nothing
   behind the edge to bleed through.

## The CLS trap

CLS went 0.0036 → 0.1032 and it was one element: the card **replica** inside the
sealed envelope, resizing when the fonts landed at 3.8s, behind an opaque cover
no guest could see through. `tools/verify/clssrc.js` names the node and says
whether it is in the overlay or the page; `fontdiff.js` ruled out the page's own
card first by showing every block identical with fonts blocked and loaded.

The replica is `visibility: hidden` until the envelope opens. It was never
visible — it was only ever laid out.

## Verified, on the built site

Harness in `tools/verify/` (README there). Last run:

- **LCP 1.16s, CLS 0.0222** on Slow 4G + 4x CPU. Images 149 KB.
- Frame pacing **p95 22.5 / 24.3 / 28.7 ms** at 1x / 4x / 6x CPU. Up from
  revision 4's 17.2 / 19.1 / 19.6 — the 3D flap and the clip-path animation cost
  that. It stays inside a two-frame budget; if it needs to come down, the
  clip-path animation is the thing to attack, since clip-path is not composited.
- Lockout 4/4. Audit clean 320–1920 including 400% reflow and 3x root type.
  Contrast AA on rendered pixels. Console clean in four states. **JS 142.6 KB
  gz** against a ~150 KB budget.

## The second pass, and its dead ends

Four things came back from the client against the first cut of revision 5, and
the fixes are all in `tools/cover.py` and `components/Envelope.module.css`.

**The wax looked translucent.** Measurably: mean (190,165,141) against the
original's (168,133,106). The low-pass that erases the stock tree was reaching
outside the disc and dragging the pale paper in. It is a normalised convolution
now — weighted by the disc's own mask — and lands on (169,134,104).

Two ways of restoring the surface failed and should not be retried. Tiling a
high-passed patch of the *rim* across the face painted a damask repeat, because
the rim's beading is structure, not grain. The disc's own 1px high-pass brought
the tree's groove edges back with the speckle, because both live at the same
frequency. What works is that high-pass attenuated by the local mid-frequency
swing: full grain on flat wax, none along a former groove.

**The seal must lift whole, not break.** It does. The consequence is the thing
to know: the wax overhangs the flap's point onto the front of the envelope and
the photograph has it printed there, so lifting the flap left a crescent of the
old seal behind. `public/cover/seal-patch.webp` is that paper reconstructed —
fitted as a plane from a ring of real paper, with the same grain and the same
warm grade as everything else cut from the photograph. Anything cut from that
photograph has to go through `warm()` or it will not match what it sits against;
the patch skipped it once and read as a cool pale disc.

The mouth is cut to the flap's *footprint*, the triangle down to where the
creases meet, not to the flap's shape. Cutting it to the flap put a round bump
of darkness below the V.

**The end landed with the card scrolled down.** `.reveal` was `inset: 0` of a
frame sized to *cover* the viewport, so on a 430px phone the card was laid out
513px wide, sat at x=-41, and `min-height: 100lvh` re-centred it 37px down.
`tools/verify/seam.js` measures the replica against the page's own card at
scroll 0; every rect matches at both sizes now, and it is worth re-running after
any change to the frame's sizing.

**The names read as too small.** 91px on a phone and 156px on a desktop, and
`--sage-deep` is the reference's own rgb(58,85,66).

Checked and deliberately not changed: Parfumerie is **not** lighter than the
reference's. Measured in a browser inside its own ink bounding box it is 6.70%
against 6.52% (`tools/verify/ink.js`). An earlier comparison suggesting
otherwise rendered ours in PIL against a browser screenshot of theirs and was
not a like-for-like test. Do not add `-webkit-text-stroke` to the script — it
would overshoot the benchmark.

## What remains

- **Ornament.** The reference's watercolour architectural and floral
  illustrations, one per section, are a large part of why it reads as expensive,
  and they are still the thing we have least of. This is now the biggest
  remaining gap and it is a sourcing decision, not a code one.
- **Font licensing.** Parfumerie and Mrs Eaves are licensed desktop fonts and a
  desktop licence is not a webfont licence. The client directed their use and
  called this a personal project; that is recorded in `ASSETS.md` rather than
  assumed. Settle it before this page goes anywhere beyond family.
- **The countdown** still contributes ~0.009 CLS when it ticks. Small, and it
  predates revision 5, but it is the only shift left in the page.
- **The wax cannot get much smaller on a desktop.** Its share of the frame is
  `2R` over the crop's width, and the crop cannot be wider than the envelope is
  in the source without showing the wall behind it. That pins it at 22.6% of the
  frame, or ~325px on a 1440px screen. Going below that needs either a wider
  photograph or extending the envelope's paper sideways the way `extend_paper`
  already extends it downward — feasible, since the paper either side of the
  creases is featureless, but it was not needed once the sharpness was fixed.
- The JS budget has 7 KB of headroom. Anything new needs to earn it.
