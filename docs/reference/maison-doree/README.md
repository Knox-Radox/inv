# La Maison Dorée — reference capture

The client's benchmark. Captured 2026-09-05 at 430×932, iPhone UA, 2× DPR.

**Live demo:** https://tdy-excellence-template.thedigitalyes.com
**Product page:** https://www.thedigitalyes.com/demo/maison-doree

The `/demo/` URL is a marketing page with the template in a phone mock; the
first URL is the template itself. Both are client-side rendered, so fetching the
HTML returns nothing useful — it has to be rendered in a browser.

## What is here

| File | What |
|---|---|
| `01-cover.png` → `.webp` | The sealed-envelope cover, before any interaction |
| `02…12-scroll-*.webp` | The whole page, 8,051 px, in eleven frames |
| `type-and-palette.json` | Every distinct type style, the colour census, the loaded fonts, the page text |
| `assets.txt` | Every image and font URL the page requests |

## How to re-capture

The capture script is not kept in the repo because it is a one-off, but the two
things that make it work are worth writing down:

1. **Block `media`.** The page pulls ~33 MB of video and `waitUntil:
   "networkidle"` never resolves. Use `domcontentloaded` plus a fixed wait.
2. **The cover is a hard gate.** It is a `div.fixed.inset-0` over
   `body{overflow:hidden}` whose only exit is a video that must play. With
   video blocked it never opens, so remove the overlay and restore
   `overflow` in the page context before scrolling.

## What it actually uses

**Type — both licensed desktop fonts, supplied by the client.**

- **Parfumerie Script** — display: names at 60 px, section titles at 48 px.
- **Mrs Eaves** — everything else, including its small-caps, petite-caps and
  lining-figure variants.

**Done in revision 5.** Both are now the page's only two faces. The originals
live in `assets/fonts/` — not `public/`, which serves what it holds — and
`tools/fonts.sh` cuts the subsets. Gilda Display, EB Garamond and Pinyon Script
are gone. See the licence note in `ASSETS.md`: a desktop licence is not a
webfont licence, and that is the thing to settle before this page goes anywhere
beyond family.

One thing to know if you re-cut them: Parfumerie has no `calt`. Its joins are in
`init`/`fina`/`fin2`/`fin3`, and cut without those it sets as detached letters.
It also sets about half the size of a roman at the same font-size, which is why
`app/globals.css` carries a separate `--text-script-*` scale.

**Palette** — a deep green `rgb(58, 85, 66)` doing almost all the work (224
occurrences), on an off-white ground `rgb(246, 244, 238)`. Our `--sage-deep`
is `#46543F` = `rgb(70, 84, 63)`, which is within a few points of theirs. The
palette was never the gap.

**Ornament** — watercolour architectural and floral illustrations, one per
section, as raster images. This is a large part of why it reads as expensive,
and it is the thing we have least of.

**Structure** — 8,051 px tall. Cover, countdown, the celebrations, an
itinerary, dress code, venue, hotels with prices, RSVP, gift registry, FAQ.
Ours is much shorter, partly because the brief forbids several of those
sections (no RSVP, no registry).

## Where it conflicts with the original brief

Worth knowing, because the client has overridden the brief on several points and
a future session should not "fix" these back without asking:

- The reference uses **ALL-CAPS tracked-out labels** everywhere (`VENUE`,
  `BOOKING LINK COMING SOON`, `Days` at 3 px letter-spacing). `CLAUDE.md`
  bans them.
- It joins meta strings with **middle dots** (`per night · double standard
  room · incl. taxes`). Also banned.
- It has an **RSVP** and a **gift registry**. The brief settles both as "not to
  be revisited".

## Its actual faults, measured

Recorded in `docs/references.md` from the first capture, and still true:

- **47.9 MB** total, 33 MB of it video. Ours is ~220 KB.
- The countdown has **already expired** and reads `00 DAYS 00 HOURS 00 MINUTES`.
- An **untranslated i18n key**, `PROGRAM.CRUISESUBDESC`, is live on the page.
- The cover **cannot be escaped** if the video does not play: no skip, no label,
  no fallback, and `body{overflow:hidden}`.

Match its material quality and its motion. Do not match those four.
