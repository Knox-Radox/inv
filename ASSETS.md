# Assets and licences

Every illustration on this page is drawn for it by the scripts in `tools/`:
emitted as SVG geometry to `components/art/` (`paths.ts`, `ornament.ts`,
`motif.ts`, `map.ts`), to `app/motif.css` and to `lib/borderTile.ts`, or baked
to the WebP sheets in `public/`. **What the site ships that is not the
project's own work is short, and it is all in this table.** Each row has its own
section below, and so does third-party material that is in the repository but
not shipped. (Sizes in this file are KB of 1024 bytes.)

| What | Terms | Section |
|---|---|---|
| Two photographs of blossom, and the card's paper, which is cut from a third photograph | Unsplash License | Revision 9, Revision 4, Revision 3 |
| The photograph of the couple at the close | Their photographer's. The client confirmed on 5 October 2026 that it may be used here and that no credit is asked | The couple's photograph |
| OpenStreetMap geometry, which the map plate is traced from | ODbL 1.0. **The credit it requires is currently not on the page** | Map data |
| Parfumerie Script and Mrs Eaves | Commercial desktop fonts. Whether the licence covers web embedding is open | Fonts |
| Supabase (RSVP replies); Google Maps and Google Calendar (outbound links) | Services, not assets | What the page talks to at runtime |

The couple's own wedding logo is the one other input, and it is theirs (The
couple's mark). The family's printed invitation is not an input: it was read for
direction and nothing from it is used (The family's printed invitation).

(The sentence that used to stand here — "the page loads no image file of any
kind" — has not been true since revision 3, which added the photographs, and is
less true again since revision 6 added the wash sheets. Both are listed below.
Corrected at revision 9: the next sentence, "No third-party image, texture, icon
or illustration is shipped", was untrue for the same reason and from the same
revision. The photographs and the card's paper are Unsplash's.)

## The couple's photograph

| File | What | Source | Shipped |
|---|---|---|---|
| `assets/private/proposal.jpg` → `public/photos/couple-tall.webp`, `public/photos/couple-wide.webp` | Advika & Sooraj walking along a beach; at the close, above their note. `couple()` in `tools/paint.py` cuts it twice (tall for a phone, the whole frame wider), tones it a little toward the field's ground, carries the sand on below their feet and gives it a wash's edge instead of a frame (900×1182, 140 KB; 1400×1138, 208 KB) | Taken by their photographer, Able Liang of Able2Capture, © 2026. Supplied by the client, who confirmed on 5 October 2026 that it may be used on this page and that no credit is asked | The two WebPs only |

**The original is not in the repository, on purpose.** The repository is
public and the full-size file (5731×3821, 9.1 MB) is the photographer's work. It
is kept in `assets/private/`, which is git-ignored, on the machine that makes
the art; without it, `python3 tools/paint.py --only photos` leaves the two
published files as they are. Both published files carry the photographer's name
and copyright in their EXIF, copied across from the original.

## Revision 9 — the cover is drawn

Revisions 4 to 8 made the cover a photograph of a real envelope. At revision 9
(42ef4ee, 2 October 2026) the client asked for the envelope in the hand the rest
of the page is drawn in, and the photograph was retired; `docs/revision-9-cover.md`
has the reasoning. For this file the consequence is that **no third-party image
is behind the cover any more.**

`python3 tools/paint.py` makes everything in this table. It reads two source
images, the couple's logo and the card's paper, and nothing else: it uses numpy,
Pillow and SciPy, opens no network connection and reads no font.

| File | What |
|---|---|
| `public/cover/sprigs.webp` | 1000×1000, opaque, 20 KB. Jasmine printed tone on tone on the envelope's paper. The boughs are `tools/jasmine.py`'s own Bézier geometry, laid out by `tools/emboss.py`, painted as a pale sage wash with the veins drawn in. |
| `public/cover/wax.webp` | 420×420 with alpha, 19 KB. The seal: a sage wash, struck with the couple's logo. The wax is procedural; **the one input that is not is `assets/source/wedding-logo.png`, the couple's own artwork**, which `die()` in `tools/paint.py` cuts to coverage and presses into the wax as a darker tone. |
| `public/cover/liner.webp` | 296×296, 4 KB. One repeat of the envelope's lining: `--arakku` block-printed in gold with the buti, in a half-drop repeat. |
| `public/cover/card-paper.webp` | 640×896, 13 KB. **Still a photograph.** Cut from `assets/source/card-paper.jpg` (Unsplash, under Revision 4) by `card_paper()` in `tools/paint.py`; revision 8's `tools/cover.py` used to do it, and the file is byte-identical to the one it made. Inlined into the HTML by `components/Invitation.tsx`, and also the paper of the reply card and of the card inside the reply envelope. |
| `assets/og/seal.png` | 320×320 with alpha, 110 KB. The same wax, downsampled, for the share card. Never served as a file: `app/opengraph-image.tsx` reads it when the card is built. |

The reply envelope that seals a guest's reply (`components/field/ReplyEnvelope.tsx`)
is made of the same wax, sprigs and liner.

Also generated at revision 9, by this repository's own code and with no
third-party input:

| Output | Made by | What |
|---|---|---|
| `public/wash/marigold.webp`, `public/wash/rose.webp` | `tools/wash.py` | Two wash sheets, beside the existing three; see below |
| `components/art/motif.ts`, `app/motif.css`, `lib/borderTile.ts` | `tools/emit_art.py`, from `tools/motif.py` | The mirror-work border (two tiles, as CSS custom properties and as SVG strings for the share card), the buti, and the mark of Ganesha |
| `components/art/ornament.ts` | `tools/emit_art.py`, from `tools/ornament.py` | Regenerated: the garland banded with jasmine, rose and marigold and ending in a brass bell, and marigold clusters on the thoranam (9cb43f8, 2 October 2026) |

**Removed in 42ef4ee:** `public/cover/envelope-portrait.webp`,
`public/cover/envelope-landscape.webp` and `public/cover/seal.webp`;
`tools/cover.py`, `tools/seal.py`, `tools/wax.py`, `tools/monogram.py` and
`tools/relief.py`; `components/coverGeometry.ts`. Nothing the site serves is
derived from the photograph any more.

**`assets/source/envelope-photo.jpg` is still in the repository, and nothing
reads it.** A search of the whole repository for its name finds only the row in
this file that records its source, and the one tool that opened it,
`tools/cover.py`, is gone. It is the Unsplash photograph recorded under
Revision 4 (1600×2000, 410 KB). It has been left in place, not deleted; removing
it would change nothing in the build.

## The watercolour wash sheets (revision 6; marigold and rose added at revision 9)

Generated, not sourced. `python3 tools/wash.py` bakes them from noise; there is
no photograph and no scanned paper behind them.

| File | What |
|---|---|
| `public/wash/foliage.webp` | 480×480, 30 KB. Mango leaf, banana, jasmine foliage. `--sage` and `--sage-deep` with an olive between them. |
| `public/wash/stone.webp` | 480×480, 32 KB. Columns, urns, plinths, jasmine petals. `--ground-deep` down to a warm grey with a sage cast in the shadow. |
| `public/wash/brass.webp` | 480×480, 34 KB. Lamp brass, the thoranam's cord, zari. `--gold-light` to `--gold` to a bronze. |
| `public/wash/marigold.webp` | 480×480, 33 KB. **Revision 9.** The marigolds in the garlands and the clusters on the thoranam. `--marigold` between a lit yellow and the burnt orange the petals go at the base. |
| `public/wash/rose.webp` | 480×480, 27 KB. **Revision 9.** The roses strung between the jasmine in the garlands. `--kumkum`, lifted toward pink where the wash is thin and falling to `--arakku` where it pools. |

Every colour in the first three is one of the tokens in `app/globals.css` or a
shade mixed from two of them. The last two are built round a token or two each,
with the lighter and darker shades a flower needs either side of it.

(Until revision 9 the paragraph here said that there was no saffron: a marigold
thoranam would have meant introducing an accent colour, which §6 of the brief
rules out, so the thoranam was mango leaf on a gold cord. The client lifted that
when the family's printed invitation arrived — `docs/revision-9-plan.md`
§ Tokens. The thoranam's clusters are marigolds now, and the garlands carry
roses and marigolds. They are pigment and not ground: they fill a flower and
nothing larger.)

They are shared by every ornament, and each piece clips a different region, so
the whole cast of five is 157 KB between them (97 KB before the last two). They
load on approach, not on the critical path — see `components/art/LazyDecor.tsx`.

## The client's `Design Assets/` folder — read, not shipped

Five files were supplied as direction. **None of them are in the build.** Three
are unusable as files — `.jpg` screenshots *of* PNG listings, with the
transparency checkerboard baked into the pixels, at 400–736px — and two of
those are also unlicensed third-party stock, which CLAUDE.md bans. They were
looked at and drawn from: the gold line-art florals are close to this page's
own idiom already, and the lotus is the reason the lamp's finial is a lotus bud.

## The family's printed invitation — art direction only

At revision 9 the family's printed invitation arrived as two PDFs exported from
Canva: "Advika and Sooraj.pdf" (6 pages) and "Advika and Sooraj...pdf" (5
pages), each 810 × 1440 pt and, by their metadata, exported on 30 September
2026 (UTC). They were used as **art direction only. Nothing from them is in the
repository or on the site: no image, no vector, no font.** The PDFs themselves
are not in the repository either.

Why nothing was lifted, in three reasons, any one of which would have been
enough:

1. **Their artwork is Canva stock** — not the couple's, not this project's, and
   we hold no licence to reuse it outside the family's own design. That is the
   project's assessment and the files do not state it: they are built largely
   from embedded raster images and carry no source information for any element,
   so it could not be verified from them.
2. **The files flag themselves as containing AI-generated content.** Both carry
   `/containsAiGeneratedContent (Yes)` and, in their XMP metadata,
   `ContainsAiGeneratedContent="Yes"` with an `Iptc4xmpExt:DigitalSourceType` of
   `compositeWithTrainedAlgorithmicMedia`. That is a flag on the whole file, so
   which parts are generated is not known. (Creator and Producer are both
   "Canva".)
3. `CLAUDE.md` bans any copyrighted or unlicensed third-party asset, and names
   these PDFs.

What was taken is a direction, and each piece of it was redrawn:

- **A palette**, as three tokens in `app/globals.css`: `--arakku` (`#74172A`),
  `--marigold` (`#D2952C`) and `--kumkum` (`#C4175A`). The values were sampled
  from the PDFs and pulled a few points toward the page's own warmth;
  `docs/revision-9-plan.md` § Tokens has the sampled values. They are pigment:
  they fill a flower, a ring, a bead or a line of type, and are never a
  section's ground. The one exception is the envelope's liner.
- **Three motifs**, each redrawn from this project's own primitives in
  `tools/motif.py` rather than lifted from the PDFs: the mirror-work border, the
  buti and the mark of Ganesha. The liner's block-printed tile is the PDF's idea
  without its elephants, drawn from the same buti.
- **Words are a separate matter.** The page's text is the client's own wording,
  in `content/invitation.ts`. The one line carried across is the invocation under
  the mark, which the client asked for; the hosts' line, the families' names and
  the shloka are not on the site.

**The PDFs' typefaces are not used.** They set Sloop Script Pro, Lora (Regular,
Bold and Bold Italic), Ovo, Alice, Poppins and AMISHA, and a Canva-internal font
named CAGenerated. The page's two faces are unchanged (Fonts, below).

## Fonts

**Revision 5: the two faces are the reference's own.**
`docs/reference/maison-doree/README.md` records what La Maison Dorée uses —
Parfumerie Script for display, Mrs Eaves for everything else — and the client
supplied both. Gilda Display, EB Garamond and Pinyon Script are gone; the type
was as much of the gap against the reference as the material was.

| Font | Licence | Source | Shipped as |
|---|---|---|---|
| Parfumerie Script, Regular | **Commercial desktop licence** (rights holder per the file: Typesenses) | Supplied by the client | `public/fonts/parfumerie-script-400.woff2` (59.4 KB) |
| Mrs Eaves, Roman | **Commercial desktop licence** (Emigre) | Supplied by the client | `public/fonts/mrs-eaves-roman.woff2` (8.0 KB) |
| Mrs Eaves, Small Caps | **Commercial desktop licence** (Emigre) | Supplied by the client | `public/fonts/mrs-eaves-smallcaps.woff2` (7.8 KB) |

**Read this before the page goes anywhere public.** These two are licensed
fonts, not open ones, and a desktop licence is not a webfont licence. The client
directed their use on this page and described it as a personal project, which is
the basis for shipping them here; that is their call to make and it is recorded
rather than assumed. If this page is ever served beyond family and friends, the
webfont licences are the thing to settle first.

*Revision 9 check of this table.* The foundry names were read off the files
themselves. Mrs Eaves says "Copyright (C) 1996 Emigre Graphics, Designed by
Zuzana Licko", which matches the table. Parfumerie Script says "Copyright (c)
2011 by Typesenses", designer Sabrina M Lopez, vendor URL www.myfonts.com. This
table said "Adobe Fonts / Durotype" for it from revision 5 until now: the file's
own metadata does not say that, "Durotype" appears nowhere else in the
repository, and the one trace of "Adobe Fonts" is the reference site's own
Typekit URLs in `docs/reference/maison-doree/assets.txt`. None of the three
shipped faces carries a licence string (name IDs 13 and 14 are empty) and no
licence document is in the repository, so **what the client actually holds, and
from whom, could not be verified here.** All three set `OS/2.fsType` to 0, which
restricts nothing; that is a flag in the file and not a licence, and it says
nothing about what the licence allows.

**The originals are also in the repository.** `assets/fonts/` is tracked: all
twelve Mrs Eaves files and all six Parfumerie Script files, not only the three
faces the site uses. Checked on 2 October 2026 through GitHub's unauthenticated
API, the repository (`github.com/Knox-Radox/inv`) is public, so anyone can
download the complete commercial families from it. That is a separate matter
from embedding them in the page, and the webfont question above does not cover
it: keeping them out of `public/` stops the site serving them and does not stop
this. Making the repository private, or taking `assets/fonts/` out of it and out
of its history, is for the repository's owner to decide. Neither has been done.

`tools/fonts.sh` cuts every face from the originals in `assets/fonts/`. Those
originals are deliberately **not** under `public/`: everything there is served at
a public URL, and until revision 5 the complete unsubsetted families sat at
`/fonts/MRSEAV~8.TTF` and friends. Only the subsets above are served.

Each is cut to basic Latin plus common typographic marks — a deliberate superset
of the strings actually used, so editing `content/invitation.ts` cannot break the
page by needing a glyph that was cut. Parfumerie additionally keeps
`init/fina/fin2/fin3`: it is a connecting copperplate with no `calt`, and those
positional features are its joins. Without them it sets as detached letters.

Mrs Eaves' italic and bold are cut only on request. `next/font` preloads every
face in a declared family, and those two were spending ~17 KB of the critical
path while nothing on the page set either.

**The Mrs Eaves descender has the wrong sign (found at revision 9).** In
`assets/fonts/MrsEavesRoman.ttf`, `hhea.descent` and `OS/2.sTypoDescender` are both +250; a
descender below the baseline is negative. The Bold, Italic, JustLig and SmartLig
cuts have the same fault, and none of those ships. Small Caps (−267), Petite
Caps and Fractions are correct, and so is Parfumerie Script (−250). A browser
that reads the `hhea` table therefore takes Roman to be 617 − 250 = 367 units
tall instead of 867. Running text overflows that box and nobody sees it; an
`<input>` clips to it, which is why the reply card's guest count rendered as the
top arc of a 2. `docs/revision-9-rsvp.md` § The numeral has the symptom and what
was done about it, which was a taller line box on the numeral, set in the
small-caps face. **The files are shipped as supplied, uncorrected:**
`tools/fonts.sh` does not touch the vertical metrics, so
`public/fonts/mrs-eaves-roman.woff2` and `assets/og-fonts/eaves-og.ttf` carry the
wrong values. Correcting the sign is the right fix, and it would move the
baseline of every line of Mrs Eaves on the page up by a quarter of an em, so it
is a decision for its own revision.

`assets/og-fonts/*.ttf` are harder subsets of the same faces: basic Latin, the
no-break space, the dashes, the curly quotes and the ellipsis (`U_OG` in
`tools/fonts.sh`), where the web subsets also carry accented Latin, ©, « », ₹, ™
and a few more marks. They are build-time inputs for `next/og` (Satori cannot
read woff2) and are never served to a guest. (Corrected at revision 9: this used
to say they were cut "to only the characters the share card sets".
`tools/fonts.sh` cuts them to a fixed range and not to the card's strings;
everything the card sets today is ASCII and inside it.)

## Reference material — studied, not shipped

These informed the line quality of the botanicals and the map plate. Nothing
from them appears in the build; they were looked at and then drawn from.

| Work | Status | Where |
|---|---|---|
| *Hortus Indicus Malabaricus*, Van Rheede, 1678–93, tab. 86 | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tsjeria-narinampuli_Hortus_Malabaricus_9_t86.png) |
| *Jasminum sambac*, hand-coloured engraving, Wellcome V0042672 | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Arabian_Jasmine_(Jasminum_sambac_(L.)_Aiton);_branch_with_do_Wellcome_V0042672.jpg) |
| *Mangifera indica*, hand-coloured engraving, Wellcome V0042598 | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mango_(Mangifera_indica_L.);_branch_with_flowers,_fruit_and_Wellcome_V0042598.jpg) |
| La Maison Dorée, a commercial wedding-invitation template: twelve screenshots, a type and colour census, and the list of asset URLs its page requests | Third-party work, not licensed to us. Never served, and nothing the site now ships is derived from it, but it is committed, and the repository is public (see Fonts) | `docs/reference/maison-doree/` |

(The last row is the client's benchmark and not a source of line quality. The
captures have been in the repository since 5 September 2026 (c1dc93a) and were
not recorded here until revision 9.)

## Audio

None. `invitation.audio` is `null` in `content/invitation.ts` and the sound
toggle does not render. If a track is added it must be either owned by the
couple or released CC0 / public domain, and it gets a row in this table.

## Revision 8 — the wax leaves the photograph (superseded at revision 9)

> **Superseded at revision 9 (2 October 2026).** The sprite, the photograph's
> crops and the scripts described below are gone, and the cover is drawn rather
> than photographed (Revision 9 above). This section is kept as the record of why
> revision 8 was built as it was; each thing in it that no longer exists is
> marked as deleted.

The client's note on the cover was that the seal "looks very very low quality
… it doesnt even look like a natural wax seal and its blurred", that the
envelope "looks very plain while the reference has tasteful designs", and that
opening it left "some unnatural semicircle below it". Those are three symptoms
of one arrangement: the photograph carried the wax, and everything else was a
repair laid over it.

Revision 8 inverts that. **The photograph carries no wax at all**, and the wax
is its own sprite.

| Output | What |
|---|---|
| ~~`public/cover/seal.webp`~~ | **Deleted at revision 9.** Was 448×448, 22 KB: the wax with an alpha channel, cut at 1.26 R so it carried its own contact shadow. Sage, struck with the couple's wedding logo. It rode inside `.flap`, so it turned on the flap's hinge because it was on the flap. `public/cover/wax.webp` replaces it, painted and not photographed. |
| ~~`public/cover/envelope-*.webp`~~ | **Deleted at revision 9.** Were wax-free, with the paper reconstructed across the disc and blind-embossed with jasmine edge to edge. |
| ~~`public/cover/seal-patch.webp`~~ | **Deleted.** A 352 px disc of reconstructed paper composited over the photograph to take the wax away again. It had to agree with the paper it covered on tone, grain, gradient *and* the phase of the embossed florals underneath — and it is the "unnatural semicircle". There is no patch now; under the wax is the same continuous sheet as everywhere else. |

Two new scripts, both generating and neither shipping anything third-party:

| Script | What |
|---|---|
| `tools/emboss.py` | The blind-embossed jasmine field. Reads `tools/jasmine.py`'s own Bézier geometry through a 40-line flattener — `pen.curve()` emits only absolute `M` and `C` — so the relief is drawn at each frame's own resolution with no upscaling. There is no SVG rasteriser on this machine and none is needed. Depth is calibrated against the reference plate: detail sd 6.6 against its 6.4, shadows to −26 against its −23. **Revision 9: still present, and no longer presses relief into anything.** `tools/paint.py` uses its flattener and its bough layout to print the same jasmine on the envelope's paper. |
| ~~`tools/seal.py`~~ | **Deleted at revision 9.** The wax. Kept the photograph's dome lighting, poured edge, beaded rim and grain; replaced the colour and the impression. |

The seal's colour is **measured off the client's reference plate**, not invented
— `seal.RAMP` is seven (luminance → RGB) samples through its wax, and ours is
histogram-matched onto that range before the ramp is applied. The finished
sprite lands within four levels of the reference on every percentile and within
0.3 on chroma. *(Revision 9: gone with `tools/seal.py`. The painted wax's colours
are constants in `tools/paint.py`, and nothing is measured from the reference's
screenshots any more.)*

The impression is the couple's own `assets/source/wedding-logo.png`, cut in as
depth rather than printed as gold: a brass die leaves depth, not colour, and a
gold mark on green wax is a sticker. `lib/sealSvg.ts`'s `sealSvg()` — a drawn
sage disc with a blocky A and S, dead since revision 4 — has been deleted rather
than left as a stale second definition of the page's most recognisable mark.
(The file remains, holding the share card's `dataUri()` and `latticeSvg()`.
Revision 9 still presses the couple's logo into the wax, by a different route:
`die()` in `tools/paint.py`.)

## Revision 4 — the cover is a photograph (superseded at revision 9)

The client rejected revisions 1–3 as fake-looking. They were: the paper and the
wax were synthesised with SVG lighting filters. The reference's quality comes
from photography, so the cover is now a photograph of a real sealed envelope,
with only the impression in the wax authored by us.

| File | What | Source |
|---|---|---|
| `assets/source/envelope-photo.jpg` | Cream envelopes with bronze wax seals, flat-lay. 1600×2000, 410 KB. **Unused since revision 9:** nothing reads it, and it has been left in the repository | [Unsplash photo-1646568779353](https://unsplash.com/photos/1646568779353-b9d2b903b3e1) |
| `assets/source/card-paper.jpg` | White cotton cardstock, close up. 1600×2240, 466 KB. **Still used:** `card_paper()` in `tools/paint.py` cuts `public/cover/card-paper.webp` from it | [Unsplash photo-1601662528567](https://unsplash.com/photos/1601662528567-526cd06f6582) |

~~`python3 tools/cover.py` rebuilds every cover asset from the first of these.~~
`tools/cover.py` was deleted at revision 9, with the cover assets it built from
the first photograph. Unsplash's licence permits this use without attribution;
the source is recorded anyway.

**Revision 5** changed what it builds. Revision 4 composited the whole envelope
onto a paper surface as an *object* on a page. The reference is a macro — paper
to all four edges, the flap's V running down to the wax — so the script now crops
into the photograph instead, twice:

| Output | What |
|---|---|
| ~~`public/cover/envelope-portrait.webp`~~ | **Deleted at revision 9.** Was 1060×1930, 51 KB. The phone frame; cropped so the envelope's own top edge landed on the top of the picture, which is what let the flap turn on its real hinge. |
| ~~`public/cover/envelope-landscape.webp`~~ | **Deleted at revision 9.** Was 1600×1000, 57 KB. The desktop frame, same wax in the same place. |
| `public/cover/card-paper.webp` | 640×896, 13 KB. Inlined into the HTML as the card's paper. **Unchanged, and now made by `tools/paint.py`** (Revision 9 above). |
| `assets/og/seal.png` | 320×320. The seal sprite, downsampled, for the share card. Never served; inlined at build. **Regenerated at revision 9** from the painted wax. |
| ~~`components/coverGeometry.ts`~~ | **Deleted at revision 9.** Where the hinge, the two creases and the wax's outline landed in each frame, as percentages. `components/Envelope.module.css` cut along these, so the cut followed the crease that was already in the photograph. |

~~The measured constants at the top of the file belong to this photograph; swap
it and every one of them has to be re-measured.~~ They belonged to
`tools/cover.py`, which is gone; nothing is measured from a photograph any more.

*(Revision 8 note: the impression is no longer pressed in here. It used to be
Parfumerie Script "AS", rasterised into the wax by `press_monogram` after a
0.70 r blur had erased the stock tree — a blur wide enough to erase the tree is
wide enough to erase the wax, which is why the client saw it as blurred. Both
that function and the patch it needed are gone; see revision 8 above.)*

The synthetic material system (`components/material/`, `tools/bake.js`,
`public/paper/`) has been deleted.

## Revision 3 — the two photographs (still shipped), and the baked materials (deleted)

The client waived the CC0-only rule for this private, family-only page and
asked for photographic richness. The two photographs below are under the
[Unsplash License](https://unsplash.com/license), which permits this use
without attribution; the source is recorded anyway.

| File | What | Source | Shipped |
|---|---|---|---|
| `assets/source/jasmine-branch.jpg` → `public/photos/backdrop.webp` | Mock-orange branch against a wall; the field's backdrop. Warmed, softened and faded by `backdrop()` in `tools/paint.py` (800×1200, 24 KB served) | [Unsplash photo-1612380635121](https://unsplash.com/photos/1612380635121-411eda9ecbb9) | 1000×1500, 79 KB |
| `assets/source/jasmine-cluster.jpg` → `public/photos/blossoms.webp` | White blossoms; behind the closing note. Treated by `blossoms()` in `tools/paint.py` (880×589, 19 KB served) | [Unsplash photo-1623171403798](https://unsplash.com/photos/1623171403798-51cc000d569a) | 1100×736, 42 KB |

Both are still referenced and lazy-loaded: the branch by `components/field/Field.tsx`
and the cluster by `components/field/Closing.tsx`. Both are mock-orange
(*Philadelphus*), not jasmine; at the opacity and blur they are used at they read
as soft white florals, which is their job.

(Corrected at revision 9: this table gave 1400×2100, 245 KB and 1400×937, 86 KB.
The committed files have been the sizes above since they were added, in 58e470e
on 5 September 2026; the larger figures could not be traced to anything in the
repository.)

### Baked materials — deleted at revision 4

`public/paper/envelope-sheet.webp` and `public/paper/card-sheet.webp`, generated
by `tools/bake.js` and `tools/bake-encode.py` from the filters in
`components/material/`, were deleted in revision 4 (4068c81, 5 September 2026)
together with those tools and components. They were renders of this project's
own SVG and carried nothing third-party. They are named here only so that a
mention of them elsewhere in the history is not a mystery; there is no bake to
re-run.

## Map data

`tools/data/anna-osm.json` is a pruned extract of OpenStreetMap covering about
15 km around the venue, fetched by `tools/osm_fetch.py` and committed so the
build runs offline. Every road, creek and town on the map plate is traced from
it.

**© OpenStreetMap contributors, licensed under the ODbL 1.0**
<https://www.openstreetmap.org/copyright>

The plate is a Produced Work under that licence, and the licence requires the
data's source to be credited where the work is shown. Nothing else about the
plate is derived from a third-party asset: every line is drawn by
`tools/mapplate.py` from the geometry.

### The credit is not on the page

**As of revision 9 the site displays a work derived from ODbL data without the
attribution the licence requires.** That is a licence obligation not being met,
and it is recorded here as exactly that.

- Since commit e049e31 ("Attrib", 7 September 2026, which is on `main`),
  `map.attribution` in `content/invitation.ts` has been the empty string.
  `components/field/Place.tsx` renders it under the plate, so what a guest sees
  there is nothing. (This section used to say that the credit was shown as
  visible text beneath the plate and was not optional. It was shown, from
  revision 7 until that commit, and has not been since.)
- On 2 October 2026, at revision 9, the client was asked directly and chose to
  leave it off (`docs/revision-9-plan.md`). It is their decision to make, and it
  is recorded here as made.
- **The one-line fix** is to set `attribution` in `content/invitation.ts` back to
  `"Map data © OpenStreetMap contributors"`. Nothing else needs to change; its
  styling is still in `components/field/Place.module.css`.
- The credit survives only where no guest sees it: in source comments
  (`components/art/map.ts`, `tools/mapplate.py`, `tools/osm_fetch.py`) and in the
  `licence` field of `tools/data/anna-osm.json`.
- While it is off, `CLAUDE.md` says not to add a second OSM-derived drawing.

## What the page talks to at runtime

Everything a guest's browser loads comes from the site's own origin: no
third-party script, font, image, map tile or analytics beacon. (Checked at
revision 9 by searching `app/`, `components/`, `lib/`, `content/`,
`next.config.ts` and `vercel.json` for URLs. Apart from SVG namespace
identifiers, which are not requests, there are three: the site's own address and
the two Google links below.) Supabase and Google are the outside services, and
Vercel is the host. None is an asset and none is shipped.

**Supabase — new at revision 9.** A Postgres database that keeps the replies
from the reply card. It is reached only from the site's own server, by plain
`fetch` to Supabase's REST API with a secret key, and only to call one of the
functions in `supabase/schema.sql`; a guest's browser never contacts it. No
Supabase library, logo or other asset ships (`package.json` has none), and no
key carries a `NEXT_PUBLIC_` name. What is stored, from `supabase/schema.sql`:

| Table | Holds |
|---|---|
| `rsvp_replies` | One row per household, keyed by phone number or email: the name, the contact as typed, the number coming to the Muhurtham and to the reception (0 declines), the names of the others coming (at most nine), dietary or allergy notes, the note to the couple, how many times the reply has been changed, and when it was made and last changed |
| `rsvp_history` | Every version of every reply as it arrived, including those since replaced, with the time and a keyed hash (HMAC-SHA-256) of the sender's IP address |
| `rsvp_rate` | Counters for the rate limits, kept against that hash; rows older than two days are deleted as new replies arrive |

The IP address itself is never stored or sent on. The hash is, and in
`rsvp_history` it stays for as long as the reply does. Replies and history have
no expiry: they stay until someone deletes them in the Supabase dashboard
(`README.md` § The RSVP shows how). The family reads them at `/replies`, behind a
passcode. A guest's own reply is also remembered on their own device, in the
browser's local storage, so that the card can show it back without asking the
database anything. `docs/revision-9-rsvp.md` has the design.

**As far as the repository shows, no hosted Supabase project is connected.**
`.env.example` holds a placeholder URL, and local work and the tests run against
a PostgREST on localhost (`tools/rsvp/local.sh`). Whether a project has been
created and the production deployment pointed at it could not be verified from
here. Supabase's own terms for its free plan apply to whichever project is
created; they have not been reviewed.

**Google Maps — plain outbound links only.** The map plate (a link since
revision 7) and each of the six hotels under "Where to stay" (new at revision 9)
is a link of the form `https://www.google.com/maps/search/?api=1&query=` followed
by a name and address, built by `mapsSearchUrl()` in `content/invitation.ts` and
opened in a new tab when a guest taps it. There is no embed, no iframe, no Maps
JavaScript or Static Maps API, no tile provider and no API key: `api=1` is a
parameter of the URL form, and the repository contains no Google key of any
kind. The page itself fetches nothing from Google. The six hotels are Wyndham
Garden Anna; Hampton Inn & Suites McKinney; Home2 Suites by Hilton McKinney;
Sheraton McKinney Hotel; Holiday Inn & Suites McKinney - N Allen by IHG; and
TownePlace Suites by Marriott Dallas McKinney. Their names and addresses, and
the Wyndham's telephone number (the one tap-to-call link), were supplied by the
client and are set as given in `content/invitation.ts`; they have not been
checked against the hotels' own listings. The names are plain text: no hotel's
logo or brand imagery is used.

**Google Calendar — unchanged.** "Add to calendar" offers a link of the form
`https://calendar.google.com/calendar/render?...` (`lib/calendar.ts`, in place
since the original build, 2f55225, 5 September 2026) beside an `.ics` file that
the site generates itself. A plain outbound link, no API.

The site is deployed on Vercel, which also calls `/api/keepalive` once a day
(`vercel.json`) so that a free Supabase project is not paused for want of
traffic.

## The couple's mark

`assets/source/wedding-logo.png` is the couple's own wedding logo, supplied by
them: an A and S monogram with jasmine growing through it, their names, and a
lotus, gold on ivory. It is theirs, and it is not under any third-party licence.

`tools/logo.py` cuts `public/mark/monogram.webp` from it — the monogram only,
with the ivory ground un-composited into alpha and the gold pulled onto
`--gold`. That is what the map plate wears as its venue seal. 240×282, 37 KB,
fetched on approach with the plate and never on the critical path.

Since revision 9 it is also the die the cover's seal is struck with:
`tools/paint.py` reads the same source file (208×306 px) and cuts the monogram
from it again for the wax, which reaches the share card and the reply envelope as
well (Revision 9, above). Both uses are the couple's own artwork, and neither
adds anything third-party.

The source PNG is deliberately under `assets/` and not `public/`, which serves
what it holds. Re-run `cd tools && python3 logo.py` if the artwork changes; it
prints the aspect and the ink's reach, and `tools/mapplate.py` sizes the seal
from the second of those.

## The favicon

`app/icon.svg` (2 KB of SVG paths, served by Next at `/icon.svg`) is the
browser-tab icon. It had no entry in this file until revision 9. It is drawn in
this repository with no third-party input: a sage disc, a ring of small
triangles, and the A and S monogram, "drawn from the same monogram paths" as the
seal of that time (a606646, 5 September 2026; recoloured to sage in 58e470e).
`tools/monogram.py`, which drew those paths, was deleted at revision 9, so the
SVG is the only copy and has no generator. It still shows the drawn A and S disc
from before the cover became a photograph, not the couple's logo or the painted
wax the cover has now.
