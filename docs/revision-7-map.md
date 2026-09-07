# Revision 7 — the map

## The client's decision

The revision-6 plate was rejected in one line: *"The hand drawn map is of no
use."* That is correct, and it is worse than useless — it is untrue. Its roads,
its creek and its hatched fields are invented, and the venue is marked with a
gabled house that reads as a chapel, which is the one thing the brief forbids.

Four decisions were taken before any of this was designed. They override
`CLAUDE.md` and `docs/design-brief.md` §5 where they conflict, and both files
have been amended rather than left contradicting the build.

1. **The map is traced from real ground.** Every road, creek and town on the
   plate comes from OpenStreetMap geometry around the venue. It is still drawn
   by hand — tapered burin line, watercolour wash — but nothing on it is
   invented. OSM is ODbL, so the plate carries a visible credit.
2. **The plate opens Google Maps.** One universal `google.com/maps` link,
   working the same on Android, iOS and desktop. This makes it the page's
   fourth interactive element; the cap in `CLAUDE.md` is lifted to four.
3. **Regional frame, not the last mile.** About 15 km across: US 75, TX 121,
   TX 5, FM 455, the Collin County Outer Loop, Anna, Melissa, and the venue.
   The question most guests have is *how do I get out there*, not *which
   driveway*.
4. **No wayfinding copy.** The address and the link carry it. Nothing is
   written in the couple's voice that the couple did not write.

Open question #2 is answered and closed by decision 1. There is no longer
anything to invent, so there is nothing to ask.

## The concept: a survey, not a decoration

The revision-6 plate had to carry a decorative job because it carried no useful
one. That trade is gone. The plate now does both, and the discipline that makes
it beautiful is the same one that makes it true: **selection**. Collin County at
15 km is a dense grid of section-line county roads, and drawing them all would
produce graph paper. Only the roads a guest would actually name are drawn:

| Drawn | Why |
|---|---|
| US 75 | The artery. Every guest from Dallas or DFW is on it. Heaviest line. |
| TX 121 (Sam Rayburn) | The other approach, from the west and the airport. |
| Collin County Outer Loop | The venue's own listing names it: under two minutes away. |
| FM 455, TX 5 | Anna's two streets. They give the town its shape. |
| County Road 419 | The address. The last line, and the last to draw on. |

Everything else in the extract is dropped. What is kept is kept at full
fidelity — the real curve of the Outer Loop, the real kink in TX 121 — because
the authenticity lives in the curves, not in the count.

## Composition

The journey is true and it is the composition. Guests come north up US 75 out of
Dallas, turn east, and arrive. So the plate reads bottom-left to upper-right:

```
  0                                                          100
0 ┌──────────────────────────────────────────────────────────┐
  │        ·  ANNA                                           │
  │        │            FM 455 ─────────┬──────────          │
  │      U │                            │                    │
  │      S │                       ✿ Artistry Venue          │
  │      7 │        ── Collin County Outer Loop ───          │
  │      5 │                        ╲                        │
  │        │                    TX 121 ╲                     │
  │        │  · MELISSA                 ╲                    │
  │  ├──┤ 2 mi                                        N      │
74└──────────────────────────────────────────────────────────┘
```

The venue sits at (62, 30) of a 100 × 74 box — off both centre lines, high and
right, where the eye lands last after following the road up. Anna is upper-left
at (43, 12), Melissa lower-left at (32, 59), and US 75 runs the left third.

The frame is 15.07 km wide by 11.15 km tall, projected equirectangular about
its own centre. At this scale that is within a metre of Mercator and it keeps
the road shapes honest.

## The grammar of the lettering

One family, Mrs Eaves, in three styles — and the style tells you what kind of
thing the label names. That is the cartographer's convention and it means the
plate encodes information in its structure rather than decorating with it.

| Style | Names | Colour |
|---|---|---|
| Roman, set along the line | Roads | `--ink` |
| Italic | Water | `--sage` |
| Small caps | Towns | `--sage-deep` |

No third typeface, no all-caps tracking, no monospace. The ban list holds.

## Weight, and the one bold thing

Hierarchy is carried by weight and value, never by a new hue:

- `--gold` — the built world. Roads, in five distinct weights, US 75 heaviest.
- `--sage` — the natural world. Water, and the land wash under the towns.
- `--sage-deep` — place lettering, and the venue.

The plate's boldness is spent in exactly one place: **the venue mark**. It is
not a pin and it is not a building. An estate plate marks a property with its
owner's mark, and this couple have one — the A and S monogram with jasmine
growing through it that they use everywhere else. It sits on an ivory disc
inside two fine rules, and it is the last thing to arrive.

Two versions preceded it, and both are worth knowing about. A jasmine bloom on
the ornament's own `rosette` construction printed as a cog at any size the plate
could give it. The page's own drawn monogram inside its reku ring was the right
*idea* — a seal pressed where the wedding is — and the wrong mark, because the
wedding already has one. `tools/logo.py` cuts it: crops the artwork to the
monogram, un-composites the ivory paper out into alpha so the gold's gradient
survives, and pulls the hue onto `--gold` so it belongs to this palette rather
than reading as a sticker from another set. The ring came off with the old mark;
the artwork carries its own jasmine and two sets of ornament is a thicket.

The compass rose is gone. It was as heavy as the venue and it competed. What
replaces it is a small north arrow and a **scale bar in miles and kilometres**,
which is both the engraved convention and, now that the plate is true, actually
readable.

## Motion

The motion budget was lifted in revision 6, so the plate draws in one movement
rather than one road:

1. Water, faintest, first.
2. The roads in weight order, US 75 last of the network — so the heaviest line
   arrives with the most authority.
3. County Road 419, continuing the page's thread as it always did.
4. The venue blooms. Petals out from the centre, the way the kolam draws.

`prefers-reduced-motion: reduce` gets all of it, at rest, drawn.

## The link

The whole plate and its label are one `<a>`, so there is one target, one
accessible name and one focus ring — not a picture and a link that do the same
thing twice. The label says what happens when you use it: **Open in Google
Maps**. No arrow appended.

The URL is a single universal `google.com/maps/search/?api=1` query carrying the
venue name and full address, which opens the Google Maps app where it is
installed and the browser where it is not, on every platform. It is built in
`content/invitation.ts` from the venue fields already there, so the address
still exists in exactly one place.

## Provenance

`tools/data/anna-osm.json` is a pruned OpenStreetMap extract — only the ways the
plate draws, only within the frame — committed so `emit_art.py` runs offline and
the plate is reproducible without a network. `tools/osm_fetch.py` is what
produced it and records the query.

Credit is required by ODbL and is rendered under the plate as visible text.

## The one bug worth not relearning

**A `clipPath` ignores stroke. A `<mask>` does not.**

Both revisions built the road reveal the same way: the road is a filled tapered
outline, so it cannot be dashed on itself, and it is revealed instead by
sweeping a thick stroked copy of its own centreline with an animated
`stroke-dasharray`. Revision 6 put that centreline inside a `clipPath`.

A clip region is built from a path's *geometry*. Every paint property on the
clip's children — `stroke`, `stroke-width`, `stroke-dasharray`, `fill` — is
ignored, so the dash animated an attribute nothing read. `getAnimations()`
happily reported the animation running; `getComputedStyle` on the path returned
the base value, because an element inside `<defs>` is not rendered and Chromium
does not resolve animated style for it. Every signal said it worked.

What settled it was screenshotting the built page in real time:
`tools/verify/mapdraw.js`. The roads were whole in the first frame after the
observer fired. Swapping the `clipPath` for a `<mask>` — which is painted, so a
dash means something — is the entire fix, and revision 6's single road had
never drawn either.

If a draw-on ever looks like it is not happening, screenshot it. Do not trust
`getAnimations()`, and do not trust a computed style read off anything inside
`<defs>`.

## Verified, on the built site

| | Revision 6 | Revision 7 |
|---|---|---|
| Frame pacing, the opening, 1x/4x/6x | 20.1 / 21.6 / 25.7 ms | **16.7 / 16.7 / 16.7 ms** |
| Frame pacing, scrolling the field | 17.4 / 19.3 / 23.3 ms | **16.7 / 16.6 / 16.7 ms** median, p95 17.1 / 19.1 / 25.6 |
| CLS | 0.0222 | **0.0222** |
| Document, gzipped | 79 KB | **76.5 KB** |
| JS on the critical path | 144.7 KB | **142.1 KB**; the plate is a further 7.7 KB, fetched on approach |
| Images on the critical path | 149 KB | **149 KB** — the plate's wash reuses the ornament's sheets and adds none |
| Lockout | 4/4 | **4/4** |
| Audit 320–1920, 400% reflow, 3x type | clean | **clean** |
| Contrast | AA | **AA**, now with `opacity` composited in |
| Console, four states | clean | **clean** |

The critical path is lighter than before the plate existed, because the old
plate was server-rendered inside `paths.ts` and the new one is not.

**LCP is unchanged at 7.56 s** and is still the cover photograph's decode cost,
exactly as `docs/handoff-revision-6.md` describes. Nothing here touches it, and
it remains the next thing to look at.

## Two holes this closed in the harness

Both were found by this revision and both were hiding real numbers:

- **`contrast.js` ignored `opacity`.** It read `color` and measured text at full
  strength however faint it was actually painted. The new OpenStreetMap credit
  measured 3.25:1 while the harness reported 8.4:1. It now composites the
  accumulated alpha over the background before measuring, settles one-shot
  animations inside the sampling task, and reports genuinely mid-animation text
  as `TICK` rather than failing it — the countdown fades every digit in from
  `opacity: 0.2` each second and that is transient, not a failure.
- **`audit.js` only checked the first meaningful SVG, in the initial DOM.** The
  plate now loads on approach and is not in the document at first paint, so the
  check had nothing to look at and passed by accident. It scrolls first and
  holds every `svg[role="img"]` to having a label.
