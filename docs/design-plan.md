# Design plan — Advika & Sooraj

Read `docs/design-brief.md` first. This document is the build contract: every
colour, size, duration and curve here is the value that ships.

**Revision 2** — incorporates the client's alignment ruling (ceremonial object,
then editorial matter), a real job for korvai, performance as a stated position,
the three time states, the lockout test plan, and the share card design.

---

## The idea, in one paragraph

A *sikku kolam* is one unbroken line that loops a grid of dots and returns to
where it started. Embroidery thread is one unbroken line through cloth. And the
day this invitation is for is one unbroken day, not two events with seven and a
half hours of nothing between them. So: **one gold thread**. It surfaces when the
wax seal breaks, stitches the jasmine on the card, dives behind the cloth, comes
back through the card's woven bottom edge, and from there runs down the page as
the left datum for everything practical — becoming the schedule's spine, branching
into the map's approach road, and tying off in a single knot at the closing note.
Everything else on the page is still. That is the whole design.

---

## Position: drawn, not streamed

This is a stated position, not a constraint being worked around. It is also the
competitive finding from the references, and it is the one axis on which this
piece can beat them outright rather than differently.

Measured, at 430×932, loading and opening each reference in full:

| | Total | of which video | of which images |
|---|---|---|---|
| Bellagio | **37.7 MB** | 33.0 MB | 5.1 MB |
| La Maison Dorée | **47.9 MB** | 33.4 MB | 15.1 MB |
| **This invitation — projected** | 180 KB | 0 | 0 |
| **This invitation — measured** | **214 KB** | **0** | **0** |

Their luxury is photographed and streamed. Ours is drawn. **This page ships no
image file of any kind** — no JPEG, no PNG, no WebP, no video, no raster texture.
Every mark is an SVG path, a CSS gradient, or a glyph.

| Budget line | Target |
|---|---|
| HTML, including all inline SVG and critical CSS (gzipped) | 16 KB |
| CSS (gzipped) | 6 KB |
| JS: React 19 + Next App Router baseline, plus ~2 KB of ours (gzipped) | 92 KB projected — **140 KB measured** |
| Fonts: Gilda 400 + EB Garamond 400/500, subset woff2 | 66 KB projected — **47 KB measured** |
| **First load** | 180 KB projected — **214 KB measured** |

Measured on the built site at 390px: 140 KB of JavaScript over the wire, 47 KB
of fonts, 19 KB of document including every inline SVG, 7 KB of CSS. The 180 KB
projection was optimistic about Next 16's client runtime by roughly 34 KB; the
JavaScript budget of 150 KB still holds, with 10 KB to spare.

That is **180× lighter than Bellagio and 229× lighter than La Maison Dorée**. On
the congested venue LTE this audience will actually be holding, that is not a
technical nicety — it is the difference between an invitation and a wait, and it
is the single most defensible claim this piece can make.

### No animation library

`motion/react` remains in the sanctioned stack, and the plan uses **none of it**.
CLAUDE.md's rule is "plain CSS for anything CSS can do alone," and CSS does all
five rows of the motion score alone: the envelope is staged CSS `@keyframes` with
per-element `animation-delay`, and the map draw-on is an `IntersectionObserver`
adding one class. Total hand-written JS across the whole page — envelope state,
`localStorage`, the observer, the countdown tick, the `.ics` blob — is about 2 KB.

That leaves **58 KB of headroom** against CLAUDE.md's 150 KB JS budget. If the
envelope proves un-orchestratable in CSS during phase 3, `LazyMotion` + `m` is the
fallback at +18 KB gzipped (never the full `motion` import at +34 KB), and the
budget still holds.

**Verified at the phase gate, not asserted:** `npm run build` output plus a
throttled Slow-4G trace, recorded in the phase-3 and phase-7 commit messages.

---

## Palette

Seven tokens, exposed as CSS custom properties on `:root`. **Zero deviation from
the brief's anchors.**

| Token | Hex | What it is for |
|---|---|---|
| `--ground` | `#FBF7F0` | The paper. The envelope, and the invitation card. |
| `--ground-deep` | `#F0E9DB` | Champagne. The flap's tissue lining; the field the card sits on, and the ground for all editorial matter below the card. |
| `--sage` | `#8A9A83` | The botanical thread. Jasmine leaves and stems only. |
| `--sage-deep` | `#46543F` | Display type, section titles, focus rings. The darkest structural value. |
| `--gold` | `#B08D57` | The wax, the running thread, the korvai borders, every hairline. Never text. |
| `--gold-light` | `#CDAE7A` | Sheen only — the wax specular, the thread's glint. Never text. |
| `--ink` | `#2E2A24` | Body copy, times, the address. |

One derived shade, not a global token, living only inside the seal's `<defs>`:
`#846B46` = `--gold` 66% over `--ink`, for the wax's shaded rim and the debossed
monogram. Written as a literal in that one SVG with the derivation in a comment,
because `color-mix()` is not safe on older Android WebViews.

### Contrast — every text-on-ground pairing

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `--ink` `#2E2A24` | `--ground` `#FBF7F0` | **13.4 : 1** | AAA |
| `--sage-deep` `#46543F` | `--ground` `#FBF7F0` | **7.6 : 1** | AAA |
| `--ink` `#2E2A24` | `--ground-deep` `#F0E9DB` | **11.8 : 1** | AAA |
| `--sage-deep` `#46543F` | `--ground-deep` `#F0E9DB` | **6.7 : 1** | AAA |
| `--gold` `#B08D57` | `--ground` `#FBF7F0` | **2.9 : 1** | **Fails.** Never text. |
| `--gold-light` `#CDAE7A` | `--ground` `#FBF7F0` | **2.0 : 1** | **Fails.** Sheen only. |
| `--sage-deep` focus ring | either ground | **7.6 / 6.7 : 1** | Passes 3:1 non-text |

All four text pairings pass AAA, which matters because the editorial matter below
the card sits on `--ground-deep`, not on `--ground` — both grounds had to hold.

Gold fails even the 3:1 large-text threshold, which settles the brief's stated
risk: **gold carries no information anywhere on this page.** Every gold mark —
thread, hairlines, tailor's tacks, korvai bands, seal — is `aria-hidden="true"`,
and anything it might imply is also stated in `--ink` or `--sage-deep` text. Body
copy is never set at reduced opacity, because opacity silently breaks a measured
ratio.

### Why nothing changed

The brief calls the palette a mandate and §6 explains that distinctiveness has to
be earned elsewhere. Every pairing already passes AAA, and the card/field
separation (`#FBF7F0` vs `#F0E9DB`, 4.9 L\*) is enough to read as paper on a
surface without a drop shadow. There is no functional reason to move any value,
and moving one to look original would be exactly the instinct §6 forbids.

Worth naming honestly: `#FBF7F0` sits 7/6/6 from the banned `#F4F1EA` — 2.2 L\*
brighter and warmer. That gap is real but small, and it is not where this design's
separation comes from. The separation comes from the thread, the ornament, the
choreography, and the fact that none of it is a photograph.

---

## Type

Two families. **No italic anywhere on the page**, which is both a discipline and
a real letterpress convention: an invitation was set in one fount.

| Role | Family | Weights shipped |
|---|---|---|
| Display — names, section titles, numerals | **Gilda Display** (Nicole Fally, OFL) | 400 |
| Body — everything else | **EB Garamond** (Duffner & Pardo, OFL) | 400, 500 |

Three subset `.woff2` files, self-hosted via `next/font/local`, `font-display:
swap`, Gilda subset to the glyphs actually used. Budget ≈ 66 KB total.

**Gilda Display** because its stems flare and its serifs are fine, incised and
*tapering* — the same formal logic as the burin stroke in the Hortus Malabaricus
plate, and the same taper the botanical SVGs use. It has genuine presence at
40–76px, it is not in the wedding-template set, and its single weight enforces
the restraint the piece needs. Used only at ≥1.5rem.

**EB Garamond** for the body because it is a true garalde with robust thin
strokes at 17px on a mid-range Android LCD, and — the practical clincher — it
ships both oldstyle and lining figures with real tabular support, which the
countdown and the schedule need.

### The fork, and the three I rejected

High-contrast didones read couture; old-style garaldes read heirloom. **This
piece is a garalde.** The entire design argues that a hand made it, and a
didone's defining quality is that a machine could have.

1. **Cormorant Garamond** — the brief permits an argument for it. I decline to
   make one. It is the single most-used face in template and generated wedding
   work, its hairlines disintegrate below 20px on the mid-range Android half this
   audience is holding, and choosing it would fail §6 on sight.
2. **Bodoni Moda** — the strongest "couture" answer and genuinely beautiful, but
   it commits to the wrong side of the fork: neoclassical, machine-regular,
   contradicting the hand-made premise everything else rests on. Its hairlines
   are also the most fragile of any candidate at small sizes on low-DPI panels.
3. **Marcellus** — the inscriptional option, and its capitals have real
   ceremonial presence, but it is a Trajan descendant, and Trajan is the most
   over-used ceremonial face in existence. Its lowercase is markedly weaker than
   its caps, and section titles need lowercase.

### The scale — shipping values

Every clamp is `clamp(min, rem-intercept + vw-slope, max)`, tuned so the value
hits the mobile size at exactly 390px and the desktop size at exactly 1440px. The
rem intercept dominates in every step, so a user who doubles their base font size
gets roughly double — Dynamic Type and 200% zoom both behave.

| Step | 390px → 1440px | `clamp()` | Face / weight | line-height | letter-spacing | measure |
|---|---|---|---|---|---|---|
| `display-xl` (names) | 40 → 76px | `clamp(2.5rem, 1.664rem + 3.429vw, 4.75rem)` | Gilda 400 | 1.02 | −0.015em | — |
| `display-m` (the date, on the card) | 34 → 46px | `clamp(2.125rem, 1.846rem + 1.143vw, 2.875rem)` | Gilda 400 | 1.0 | −0.01em | — |
| `display-l` (section titles, countdown numerals) | 26 → 38px | `clamp(1.625rem, 1.346rem + 1.143vw, 2.375rem)` | Gilda 400 | 1.15 | −0.005em | tabular in the countdown |
| `body-l` (the inviting line, the closing note) | 19 → 22px | `clamp(1.1875rem, 1.118rem + 0.286vw, 1.375rem)` | EBG 400 | 1.62 | 0.002em | 34ch |
| `body` | 17 → 18px | `clamp(1.0625rem, 1.039rem + 0.095vw, 1.125rem)` | EBG 400 | 1.70 | 0 | 62ch |
| `body-s` (address, units, links) | 15 → 16px | `clamp(0.9375rem, 0.914rem + 0.095vw, 1rem)` | EBG 400/500 | 1.55 | 0.01em | 46ch |

**Nothing on this page is smaller than 15px.** For an 8-to-85 audience holding a
phone at arm's length that is a floor, and it happens to remove the size at which
a tracked-out caps eyebrow would even be possible.

The countdown uses `display-l` rather than `display-m` because at 390px the mobile
editorial measure is 306px, and `82 days 9 hours 26 minutes` runs to 383px at
`display-m` but 293px at `display-l`. Even 293px is too tight to survive a
three-digit day count, so the mobile countdown breaks deliberately after `days`
(see the wireframe). `font-variant-numeric: tabular-nums` throughout, so the
ticking value causes zero CLS.

### Type details

- The names set as three lines: `Advika` / `and` / `Sooraj`, spelled out, centred
  on the card. No ampersand — an ampersand is decoration here, and the monogram
  is where the mark belongs.
- `and` is set in the same face, same colour, same weight at 0.42× the name size.
  This is a scale relationship and a 200-year-old convention of set invitations,
  not an accent; nothing about its colour, weight or style changes. Called out in
  the self-review because it sits near a ban.
- Section titles are sentence case: **The day**, **The place**. Two on the whole
  page.

### The A/S monogram

A drawn mark, shipped as **outlined SVG `<path>` elements** — no live text, no
font dependency, no shift while a font loads, identical on every device.

**How they interlock.** The **A** is the architecture: a wide, low triangle, apex
at the top, legs splaying to the baseline at ±0.34 of the mark's width, with the
Roman A's traditional stress — left leg thin (0.055 of mark height), right leg
thick (0.095). The **S** nests inside it, upper bowl seated in the A's apex
counter, lower bowl descending past the legs.

They **share a stroke**: the S's diagonal spine *is* the A's crossbar, at 0.42 of
the mark height. One path segment, two letters.

And they **weave**: the S passes *over* the A's left leg and *under* its right
leg, with a 0.5-unit hairline break in whichever stroke goes under. That
over-under is the *sikku kolam*'s own weave logic, and it is what makes the mark
read as one continuous thread rather than two stacked letters.

Counters, since this is the most looked-at object on the page and it is small
enough that every flaw shows: the gap between the S's bowl and the A's apex
counter holds at ≥1.2 stroke-widths all round; the S's two bowl counters are
deliberately unequal (upper smaller); no counter falls below 1.0 stroke-width at
the 96px render size.

**The ring** is *korvai* — see the korvai section below for why it earns its
place. 48 small isoceles triangles pointing inward on a circle at 0.86r, 3.2 units
wide each, between two 0.5px hairlines. A real *reku* temple border, and
unmistakably not a generic mandala. No lettering in the ring.

**The wax.** A closed path built from a circle deformed by 8 control points at
±4% radius, with two squeeze-out lobes at 4 and 9 o'clock where it pooled past
the stamp. Radial gradient `--gold-light` → `--gold` → `#846B46`. The rim is a
1.5px partial arc from about 200° to 20°, fading at both ends — the pooled lip,
present only where the light isn't. The monogram is *debossed*: filled `#846B46`,
with a 0.5px `--gold-light` duplicate offset (+0.6, +0.6) as the light catching
the far wall of the impression, and an SVG `feGaussianBlur` + `feOffset` +
`feComposite` inner shadow for the falloff. One soft specular blob at ten
o'clock, 22% `--gold-light`. **No `drop-shadow` anywhere in the seal.** Target
under 4 KB.

---

## Korvai — the real job

The client's question: after the closing rule was cut, is korvai still doing
anything, or is it a vestigial hairline on the seal? Answered directly.

**It gets a real job: the card's bottom edge is a woven border.**

A korvai is not ornament applied to cloth — it *is* the woven edge where the body
of a Kanjivaram meets its border. The card is cloth. So its edge is a korvai: a
6px band running the full width of the card's **bottom edge only**, two 0.5px
`--gold` hairlines with a run of *reku* triangles between them, 4px wide, pointing
downward into the field, `--gold` at 55%.

That band is structural, not decorative. It marks the single most important
boundary in the revised plan — the line where the ceremonial object ends and the
editorial matter begins — and **the thread surfaces through it**, at the datum's
x. The motif is doing the thing it actually is, at the place the design most needs
made legible.

The seal's ring is then the same geometry at small scale: a border ringing an
object. Two instances of one idea reads as a system; one instance read as a
leftover.

**Why this is not the band I cut.** The cut band sat above the closing note,
below everything, saying "the end" a second time and worse, immediately after the
knot had said it well. This band is mid-page, at a boundary that exists whether or
not I draw it, and it says "transition," not "end." Different position, different
job. I am naming the resemblance rather than hoping it goes unnoticed.

**Three motifs, all load-bearing:**

| Motif | Where it does work |
|---|---|
| **Kolam** | The continuous-line principle the whole page is built on; the *pulli* dot lattice as page texture; the over-under weave in the monogram |
| **Jasmine (malli)** | The botanical, stitched on the card and again as the map's line idiom |
| **Korvai** | The card's bottom edge; the seal's ring |

Thoranam, gopuram and kasu are not used at all.

---

## Layout

### Alignment strategy — ceremonial object, then editorial matter

**The card is a symmetrical object: centred. Everything below it is editorial
matter: left-aligned to the thread.**

The genre expectation of a centred invitation attaches to the card, not to the
page. A physical invitation is centred because it is a fixed symmetrical
rectangle; a scrolling phone view is a vertical ribbon, and centred type there
does not inherit the card's authority — it just reflows to a new optical centre
on every line. So the envelope and the invitation proper are centred, and the
countdown, schedule, map and closing note are not.

That split is also what gives the thread something to do. It surfaces at the
seal, stitches the jasmine, **dives behind the cloth** — which is what a running
stitch does, and which is why no line ever crosses the centred type — and comes
back through the card's woven bottom edge on the left. **The transition from
centred to left-aligned is not a change of mind; it is the event the thread
marks.** The card is where the thread went in at the centre and came out at the
side.

Below the card, the 200% zoom and Dynamic Type argument holds in full: a fixed
left datum is measurably easier for an older reader to scan than centred text that
re-centres every line, and that is exactly where the times, the address and the
practical matter live.

**The thread never runs down the centre with content on both sides.** Above the
card's bottom edge it is behind the cloth and invisible; below it, it is a left
margin with content on one side only.

**One rule for the datum at every width:** the thread sits **28px inside the
card's left edge**. On mobile the card is full-bleed, so the thread is at x=28.
On desktop the card is centred at 620px wide, so at 1440px its left edge is 410
and the thread is at 438. Content below the card starts 28px to the right of the
thread — 56px inside the card's left edge — at every width.

### Two grounds

| | Ground | Alignment | Contains |
|---|---|---|---|
| **The card** | `--ground` `#FBF7F0` | Centred | Envelope, names, the inviting line, the date, the venue |
| **The field** | `--ground-deep` `#F0E9DB` | Left, to the thread | Countdown, the day, the place, the address, the closing note |

On desktop the field surrounds the card as well as running beneath it, so the card
reads as an object on a surface. On mobile the card is full-bleed and the ground
simply changes value at the korvai edge — a full-width value change is the edge.
Both grounds carry the kolam lattice unbroken: one page, one texture.

### Mobile — 390px

**Screen 1, the envelope** (JS-on only; see the lockout section)

```
┌───────────────────────────────────────┐ 390
│ ·   ·   ·   ·   ·   ·   ·   ·   ·   · │  kolam pulli lattice, 5%
│                                       │
│ ·   ·   ·   ·   ·   ·   ·   ·   ·   · │  the flap: bare paper
│                                       │
│ ·   ·   ·   ·   ·   ·   ·   ·   ·   · │
│╲                                     ╱│  flap edge — one gold
│  ╲                                 ╱  │  hairline, shallow ∨
│    ╲        ⌒⌒⌒⌒⌒⌒⌒⌒             ╱    │
│      ╲    ⌒   ▲╱▔╲    ⌒        ╱      │  wax seal, 96px, on the
│        ╲ ⌒   ╱▔╲╲_╱   ⌒      ╱        │  ∨ apex — centred, like
│          ╲   ⌒⌒⌒⌒⌒⌒        ╱          │  everything on the card
│                                       │
│                                       │
│                Advika                 │  display-xl 40px
│                 and                   │  sage-deep, CENTRED
│                Sooraj                 │
│                                       │
│      Friday, 27 November 2026         │  body-s 500, ink
│     Artistry Venue, Anna, Texas       │  body-s 400, ink
│                                       │
├───────────────────────────────────────┤
│  ((• Sound            Skip to the     │  56px bar, ground,
│                       invitation      │  1px gold hairline top
└───────────────────────────────────────┘
```

*The envelope is addressed.* Before any animation runs, the first screen already
says who and when — which is the point of a hand-addressed envelope, and it means
the choreography is a gift rather than a toll gate.

**The card at rest, and the exit**

```
┌───────────────────────────────────────┐ 390
│ ·   ·   ·   ·   ·   ·   ·   ·   ·   · │  --ground (ivory)
│                  │                    │  the thread stub, where
│                 ╱❧╲                   │  the seal broke
│                ❧  ╱                   │  jasmine spray: CENTRED
│                 ╲❧                    │  as a block, asymmetric
│                  ❧                    │  as a drawing
│                  ˙                    │  ← dive stitch + dimple.
│                                       │    thread goes behind
│                                       │    the cloth here.
│                Advika                 │  display-xl, centred
│                 and                   │
│                Sooraj                 │
│                                       │
│      Together with our families,      │  body-l 19px, 34ch,
│      we ask you to be with us         │  centred
│             as we marry.              │
│                                       │
│               Friday                  │  display-m 34px
│         27 November 2026              │
│                                       │
│           Artistry Venue              │  body 500
│             Anna, Texas               │  body 400
│                                       │
│▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽│  korvai woven edge, 6px
│  ˙                                    │  ← surface dimple, x=28
│  ┃                                    │  the thread is back, and
│  ┃                                    │  from here it is the
├──┃────────────────────────────────────┤  left datum. --ground-deep
│  ((• Sound        Add to calendar     │  from the korvai down.
└───────────────────────────────────────┘
```

The card's `min-height` is `calc(100svh - 88px)`, so at default type sizes its
bottom edge lands 88px above the fold: the korvai band, the surface dimple and the
thread's first run are all visible without scrolling. **The thread surfacing is
the scroll cue** — there is no separate chevron or hairline mark. At large Dynamic
Type the card simply grows and the guest scrolls, which is correct.

**The field**

```
┌───────────────────────────────────────┐ 390
│  ┃                                    │  --ground-deep
│  ┃    82 days                         │  display-l 26px, Gilda
│  ┃    9 hours 26 minutes              │  numerals + EBG words,
│  ┃    until the ceremony              │  tabular. deliberate
│  ┃                                    │  break after "days".
│  ┃                                    │  no boxes, no labels.
│  ┃    The day                         │  display-l
│  ┃                                    │
│  ┿──  8:30 AM                         │  tailor's tack — a 12px
│  ┃    Ceremony                        │  gold bar across the
│  ┃    until 10:30 AM                  │  thread. not a bullet,
│  ┃                                    │  not a number.
│  ┃                                    │  ← the seven and a half
│  ┃                                    │    hours. the thread does
│  ┃                                    │    not break. no invented
│  ┃                                    │    copy sits here.
│  ┿──  6:00 PM                         │
│  ┃    Reception                       │
│  ┃    onwards                         │
│  ┃                                    │
│  ┃    Both at Artistry Venue.         │  said once, not twice
│  ┃                                    │
│  ┃    The place                       │  display-l
│  ┃                                    │
│  ┃ ┌───────────────────────────────┐  │
│  ┣━┫  ╭──╮       N                 │  │  the thread BRANCHES
│  ┃ ┃  │  ╰──╮    ↑       engraved  │  │  right and becomes
│  ┃ ┃  ╰─╮   ╰──╮          plate    │  │  County Road 419.
│  ┃ ┃    ╰─✦ Artistry Venue         │  │  second and last
│  ┃ ┃  ╭──╯       ╰───              │  │  draw-on.
│  ┃ └───────────────────────────────┘  │
│  ┃                                    │
│  ┃    9981 County Road 419            │  selectable text, body
│  ┃    Anna, TX 75409                  │
│  ┃                                    │
│  ┃    We are glad you are coming.     │  body-l
│  ┃    See you in November.            │
│  ⊛                                    │  THE knot — one on the
│                                       │  page. last mark on it.
│       Replay the opening              │  body-s, quiet
├───────────────────────────────────────┤
│  ((• Sound        Add to calendar     │
└───────────────────────────────────────┘
```

### Desktop — 1440px

```
┌──────────────────────────────────────────────────────────────────────────┐ 1440
│  field: --ground-deep + kolam lattice                                    │
│                                                                          │
│              ┌────────────────────────────────────┐                      │
│              │ card: --ground, 620px, CENTRED     │                      │
│              │                 │                  │                      │
│              │                ╱❧╲                 │   fields either side │
│              │                 ❧                  │   are EMPTY and      │
│              │                 ˙                  │   EQUAL. you do not  │
│              │                                    │   put ornament next  │
│              │              Advika                │   to a ceremonial    │
│              │               and                  │   object.            │
│              │              Sooraj                │                      │
│              │                                    │                      │
│              │    Together with our families,     │                      │
│              │    we ask you to be with us        │                      │
│              │           as we marry.             │                      │
│              │                                    │                      │
│              │              Friday                │                      │
│              │        27 November 2026            │                      │
│              │                                    │                      │
│              │          Artistry Venue            │                      │
│              │            Anna, Texas             │                      │
│              │▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽│  korvai edge         │
│              └─┃──────────────────────────────────┘                      │
│                ┃  ← thread at x=438 (28px inside the card's left edge)   │
│                ┃  82 days                                                │
│                ┃  9 hours 26 minutes                                     │
│                ┃  until the ceremony                                     │
│                ┃                                          ╱╲             │
│                ┃  The day                              ╱╲╱  ╲            │
│                ┿─ 8:30 AM                            ╲╱      ╱           │
│                ┃  Ceremony                            ╲    ╱╲            │
│                ┃                                       ╲╱╲╱  ╲           │
│                ┿─ 6:00 PM                                   ╲ ╱          │
│                ┃  Reception                                              │
│                ┃                          jasmine at ×3.4, 22% sage,     │
│                ┃  ...                     cropped off the right edge.    │
│                ⊛                          ONE instance, beside the       │
│                                           editorial matter only.         │
└──────────────────────────────────────────────────────────────────────────┘
```

The desktop composition *shows* the ruling: **symmetrical above, asymmetric
below.** The fields flanking the card are empty and equal. The single oversized
cropped jasmine lives beside the editorial matter, where the composition is
deliberately off-balance — down from two instances in revision 1, because the one
beside the card would have broken the object's symmetry.

The column below the card keeps the card's 620px box and its left edge, so the
whole page shares one vertical relationship. What changes at the korvai edge is
not the column's position but where the type hangs inside it.

### One sentence per section

- **The envelope** — an addressed object, not a splash screen: the names and the
  date are readable before anything moves, and the seal is the only door.
- **The invitation card** — the emotional centre, given the most air on the page,
  and the one thing on it treated as a symmetrical ceremonial rectangle because
  that is what a card is.
- **The countdown** — a sentence, not a scoreboard: display numerals set inline
  in body words on one baseline, so it reads as a thought rather than a device.
- **The day** — the whole shape of the day held on one continuous spine, the two
  events as tailor's tacks across it, with the gap between them drawn rather than
  explained away.
- **The place** — an engraved plate, and the thread branching off to become the
  road, which is the only time the design points at anything.
- **The closing note** — two short lines and then the knot, which is the last mark
  on the page and the payoff of everything above it.

### The three time states

Nobody designed the reference sites for the invitation outliving the event: La
Maison Dorée's countdown has already expired and reads `00 DAYS 00 HOURS 00
MINUTES`, alongside a live untranslated key. This link will be opened in 2030 by
someone who wants to look at it again, and that guest is designed for here.

The **principle**: a kept invitation does not change its words. The inviting line
stays in the invitational tense forever, because that is what an invitation in a
drawer says. Exactly one live element — the thing that was counting — resolves.

Two fixed boundary instants, both plain constants, so the state machine carries
zero timezone risk:

| | Boundary | Countdown slot renders |
|---|---|---|
| **A — Before** | until `2026-11-27T14:30:00Z` | `82 days` / `9 hours 26 minutes` — `until the ceremony` |
| **B — The day** | `2026-11-27T14:30:00Z` → `2026-11-28T06:00:00Z` | `Today` — `Friday, 27 November 2026` |
| **C — After** | from `2026-11-28T06:00:00Z`, forever | `We were married` — `on Friday, 27 November 2026` |
| **JS off / pre-mount** | any time | `8:30 in the morning` — `Friday, 27 November 2026` |

State C is first person, consistent with the rest of the page, and it is the
couple speaking to whoever opens the link years later. It is a line they should be
glad to see. **It never renders a zero and never renders a negative number.**

The JS-off line is the same two-line shape at the same height, and it adds real
information (the ceremony time, which the card does not carry). All four states
share the shape `display-l` line + `body` line, so switching between them at
mount causes zero layout shift. Numerals are tabular; space is reserved.

**Render strategy.** The page is statically generated; the state is computed on
the client on mount, because a build-time state would freeze. The server renders
the JS-off line, which is true in every era, and the client replaces it. LCP is
the names, which are server-rendered, so LCP is unaffected by any of this.

Nothing else changes between states. No state-dependent ornament — it would be
untestable and precious.

---

## The stitch idiom

The signature. A printed vector line has uniform `stroke-width`, one cap style,
smooth Béziers, flat colour. A stitched line, in this implementation:

**1 — Two-stroke construction.** Every botanical stroke is drawn twice: a shadow
pass in `--sage-deep` at 18% alpha, offset +0.4px in y with `stroke-width` +0.5,
and the thread itself on top in `--gold` or `--sage`. That dark seam under the
thread is where it presses into the weave, and it is the single cheapest thing
that makes a line read as thread rather than ink.

**2 — Weight that varies within a stroke.** SVG cannot taper a stroke, so each
stroke is authored as 3–5 sub-paths at stepped widths, joined at points where the
direction already changes so the step is invisible. The jasmine's main stem is
four sub-paths at **1.5 / 1.15 / 0.85 / 0.5**, thinning toward the growing tip —
exactly what the Hortus plate does. Leaves: midrib at 0.9, secondary veins at
0.45, and the veins stop short of the margin. A leaf's own contour is 0.5 on its
lit edge and 1.3 on its shaded one.

**3 — Caps.** `stroke-linecap: round`, `stroke-linejoin: round` on all botanical
work, because a satin stitch ends in a rounded bar-tack. At the terminal tip the
sub-path is 0.5 wide, so the round cap is a 0.25 radius and reads as a taper, not
a blob. The korvai bands are the deliberate exception: `butt` caps, because a
woven border has square ends.

**4 — Irregularity, authored not generated.** No jitter filter — a filter reads as
a filter. Instead: no leaf mirrors another; opposite leaf pairs differ in length
by 8–12%; every "circle" is a four-point Bézier with one radius 3% off. All paths
carry `vector-effect: non-scaling-stroke` so weights hold at any render size. Even
the straight thread runs are off-plumb by ±0.06° per section, alternating sign — a
0.7px drift over a 700px run, subliminal but real. Thread laid by hand is never
plumb.

**5 — Going behind the cloth, and the knot.** A running stitch is only visible
where it surfaces; the rest is on the back. So the thread's disappearance inside
the card is not a cheat, it is the mechanic. Two small marks make it read as
deliberate rather than as a rendering bug: a **dive stitch** where it goes under
(a 4px stroke ending abruptly at a dimple) and a matching **surface dimple** where
it comes back through the korvai edge. Each dimple is a 3px-radius radial gradient
in `--sage-deep` at 10% with a single 1px arc — the pucker the cloth makes.

There is now exactly **one knot on the page**, at the closing note: a three-turn
spiral of about 5px radius drawn as a single path that visibly overlaps itself
twice, so you can see the thread wrap. Shadow pass beneath, one 0.6px
`--gold-light` arc on its upper-left for the light. Not a circle with a dot in it.
Revision 1 had two, top and bottom, which was symmetry for its own sake; a knot
you only see once is the payoff, and a knot on the *back* — where a real one
starts — is invisible anyway.

**6 — Texture underneath, both procedural.** Paper grain: `feTurbulence
type="fractalNoise" baseFrequency="0.9" numOctaves="4"` → `feColorMatrix` to
desaturate, composited at 3.5% with `mix-blend-mode: multiply` as one fixed
full-viewport layer, so it never tiles visibly and costs nothing to scroll. Cloth
weave, inside the card only: a 4×4px `repeating-linear-gradient` cross-hatch at
2% `--sage-deep`, giving the linen tooth that stops the thread floating. Combined
texture opacity stays under 5%. A few hundred bytes for both; no raster.

**7 — The draw-on.** `stroke-dasharray: L; stroke-dashoffset: L → 0`, with L
hard-coded per path at author time rather than measured at runtime — no layout
read, no flash. Two rules make it read as a needle rather than a progress bar:
sub-paths run **sequenced with a −8% overlap**, so the thread stays continuous but
its speed changes at each junction, which is what a hand does; and the easing is
`cubic-bezier(.22, .61, .36, 1)` — quick entry, long settle, because a needle pull
decelerates. The shadow pass runs the same timeline 40ms behind, so the thread
appears to press into the cloth just after it lands.

**8 — Resting state is the CSS default.** Every animation moves an element *from*
an offset *to* its natural style, using `animation-fill-mode: backwards` with the
starting offsets living only in the keyframes' `0%`. The resting value is the
normal CSS. This is a structural guarantee, not a convention: cancel any animation
at any moment and every element snaps to correct. It is what makes lockout test
T2 pass by construction rather than by luck.

---

## Illustration inventory

Every piece hand-authored. Three motifs, all load-bearing: **kolam**, **jasmine
(malli)**, **korvai**.

| # | Piece | Motif | Where | Complexity | Animates |
|---|---|---|---|---|---|
| 1 | Wax seal — irregular body, pooled rim, specular, debossed A/S monogram, *reku* ring | korvai + kolam (the over-under weave) | Envelope | High | **Yes** — cracks along a pre-drawn fault into two groups, revealing the thread stub |
| 2 | Jasmine spray — stem in 4 tapering sub-paths, 6 leaves, 4 buds, 2 open flowers, ending in the dive stitch | jasmine | Card, centred above the names | High | **Yes** — the signature draw-on |
| 3 | Korvai edge band — 6px, two hairlines, *reku* triangles at 4px | korvai | The card's bottom edge | Low — one SVG `<pattern>`, ~400 B | No |
| 4 | Dimples ×2 — dive and surface | — | Card centre; the korvai edge at the datum | Trivial | Surface one appears with the final beat |
| 5 | Running thread | kolam | The field, top to bottom | Trivial — CSS, with a 7px `repeating-linear-gradient` glint and a 0.5px shadow | No |
| 6 | Tailor's tacks ×2 — 12px bars across the thread | — | The day | Trivial | No |
| 7 | Engraved map plate — approach roads, venue mark, cartouche with drawn lettering, compass | jasmine line idiom + kolam branch | The place | High | **Yes** — the road draws once. Second and last draw-on. |
| 8 | The knot — one, three-turn spiral | kolam (continuous line) | The closing note | Low | No |
| 9 | Kolam *pulli* lattice — 1.2px dots, 34px offset rows, 5% `--sage` | kolam | Both grounds, unbroken | Trivial — one CSS `radial-gradient`, ~80 B | No |
| 10 | Oversized cropped jasmine ×1 — item 2 at 340%, 22% | jasmine | Desktop field, beside the editorial matter only, ≥900px | Reuses #2 | No |

The thread is **CSS for the straight runs, SVG for the events**. That is honest to
a running stitch — mostly plain thread, occasional knots and flowers — and it is
the only construction that survives reflow, 200% zoom and Dynamic Type, because
nothing is a fixed-height path spanning the document.

---

## Envelope choreography

5.9 seconds. Mobile-first, full viewport. Durations and curves as shipped. Rebuilt
around the exit point, not patched.

| Beat | Window | What happens | Easing |
|---|---|---|---|
| 0 | 0 → 90ms | **Tap acknowledged.** The seal depresses 1.5px and darkens 4%. Exists so a laggy mid-range Android confirms the tap instantly. | `cubic-bezier(.3, 0, .7, 1)` |
| 1 | 90 → 850ms | **The seal cracks, and the thread appears.** Wax splits along an irregular pre-drawn fault; the halves rotate apart 4° and 5.5°, translate 3px and 4px outward, and each drops 2px — wax is heavy. A 6px stub of gold thread is revealed in the fault. The korvai ring does not break; it fades to 0, because it was pressed into the wax, not part of it. | `cubic-bezier(.16, .84, .44, 1)` |
| 2 | 600 → 1900ms | **The flap lifts.** `rotateX(0 → −168deg)`, `transform-origin: top center`, `perspective: 1400px` on the parent. Stopping at −168° rather than −180° leaves it tilted, which reads as stiff paper rather than a hinge. The underside is `--ground-deep`. A soft interior shadow sweeps down the face over 900ms as a linear-gradient overlay, not a `box-shadow`. | `cubic-bezier(.25, .8, .25, 1)` |
| 3 | 1500 → 3100ms | **The card rises.** `translateY(+6% → −4%)`, `scale(1 → 1.035)`; the envelope body fades over the last 500ms and the card's grain crossfades in. The thread stub stays pinned in screen space, so the card comes up around it and it ends at the card's top centre. Not a slide-out-of-a-slot: at phone scale the envelope fills the screen and there is nowhere for a card to slide *to*, so the honest move is the camera going in. | `cubic-bezier(.19, 1, .22, 1)` |
| 4 | 2400 → 4900ms | **The jasmine is stitched.** The thread runs down from the stub and puts out each leaf and bud as the stem passes it (at 88% of the stem's local progress), centred above the names. It ends in the dive stitch and the dimple: the thread goes behind the cloth. 2500ms. | `cubic-bezier(.22, .61, .36, 1)` |
| 5 | 3400 → 4600ms | **The names settle.** Not a fade-up — they have been on screen since t=0. `opacity .55 → 1`, `letter-spacing +0.06em → 0`, and a 1px `--ground-deep` text-shadow fading in. Type tightening is a typographic move, and it reads as the impression being pressed. | `cubic-bezier(.2, .7, .3, 1)` |
| 6 | 5000 → 5900ms | **The thread comes back.** The surface dimple appears in the korvai edge at the datum's x, and the thread draws downward 24px into the field and stops. This is the last beat, and it is also the scroll cue — the page's final gesture points down it. | `cubic-bezier(.22, .61, .36, 1)` |

**At second 1** — the wax has just split, a stub of gold is visible in the fault,
the flap is starting to lift, and the names have been readable the whole time.
**At second 3** — the card has filled the screen, the names are mid-settle, the
jasmine is about a quarter stitched. **At second 6** — at rest: the spray centred
above the centred names, the inviting line, date and venue beneath, and at the
card's bottom-left the thread has just come back through the woven edge and begun
its run.

### Skip

A plain link, **"Skip to the invitation"**, bottom-right, 24px from both edges,
44px tap target, `body-s`, `--ink`. Present from t=0, not revealed after a delay.
No arrow glued to it.

It is a real `<a href="#invitation">`, and it works with **zero JavaScript**. Main
content is first in DOM order and the envelope overlay is a following sibling, so
`#invitation:target ~ .envelope-overlay { display: none }` removes the overlay in
pure CSS. Even an overlay whose script has died has a working exit.

### Reduced motion

`prefers-reduced-motion: reduce` **keeps the envelope and removes the
choreography.** The guest still gets the addressed object — that is the whole
metaphor and it should not be a reward for vestibular tolerance. The seal is
intact, the "Open" is a plain button, and tapping it crossfades to the card over
400ms `ease-out`. The jasmine is already stitched, the thread is already through
the edge. No transforms, no draw-on, nothing sequenced.

### Shown once, and never a gate

`localStorage` shows the envelope once per device; returning guests land on the
card, with a quiet **"Replay the opening"** link near the closing note. (This
affordance is required by brief §4.1 and belongs to the envelope; it is not a
fourth interactive element.)

### Audio

The sound toggle sits on the envelope screen, default **off**. Both the toggle and
the seal tap are user gestures, so either can legitimately start playback:
toggling on starts it immediately; if it is already on, the seal tap starts it.
Nothing ever autoplays. (The track itself is an open question — see
`docs/open-questions.md`.)

---

## The lockout — verified, not assumed

La Maison Dorée's cover is a `fixed inset-0` div over `body{overflow:hidden}`
whose only exit is a video that must play. The brief forbids this; that is not the
same as having tested it. **This is a phase-3 gate. The envelope is not done until
all four tests pass and the evidence is in the commit.**

Three structural guarantees make them pass by construction:

1. **`body` never gets `overflow: hidden`.** Not in the initial HTML, not at any
   point in the sequence, not in any state.
2. **The overlay is mounted by client JS only, and is last in DOM order.** Main
   content is server-rendered and complete; the skip anchor works via `:target` in
   pure CSS. Two independent exits that need no script.
3. **Resting state is the CSS default** (stitch idiom §8) — cancel any animation
   and every element snaps to its correct final style.

Plus a belt-and-braces failsafe: if the sequence has not reported completion
within **9 seconds**, a timer forces the rest state.

| | Test | How | Assertion |
|---|---|---|---|
| **T1** | JS disabled | DevTools → Settings → Debugger → Disable JavaScript, reload at 390px | Names, inviting line, date, venue, countdown fallback line, schedule, map, address and closing note all render and are readable. No `.envelope-overlay` in the DOM. Page scrolls to the bottom. Screenshot filed. |
| **T2** | Animation throwing mid-sequence | At t≈1.2s: `document.querySelectorAll('*').forEach(e=>e.getAnimations().forEach(a=>a.cancel()))` | Every element lands in its rest state. Nothing is left at `opacity: 0` or under a transform that hides it. Card content readable. |
| **T3** | Reduced motion | DevTools → Rendering → Emulate `prefers-reduced-motion: reduce` | Envelope present and static, Open works, 400ms crossfade only, no transforms, jasmine already stitched, invitation reachable and readable. |
| **T4** | The lockout itself | Sample at t = 0, 1, 3, 6, 10s: `getComputedStyle(document.body).overflow` | Never `hidden`. Run again after T2's cancel, and again under T3. |

Also run at 390px, 430px, 768px and 1440px, and once with the network throttled to
Slow 4G with JS still loading, to confirm the pre-hydration page is a complete
invitation rather than a skeleton.

---

## Motion score

Every animated moment on the entire page.

| # | Moment | Trigger |
|---|---|---|
| 1 | The envelope opening sequence — beats 0–6 above, including the jasmine draw-on, the names settling, and the thread coming back through the korvai edge | Tap the seal, or the Open button under reduced motion |
| 2 | Seal press acknowledgement — 1.5px deboss, 90ms | Pointer/touch down on the seal |
| 3 | Map road draw-on — the thread's branch becomes County Road 419, 1600ms | The map section crosses 60% of the viewport. Once per page load. |
| 4 | Sound toggle — the struck-through arcs cross or uncross, 180ms | Tap |
| 5 | Add to calendar — the label changes to a confirmation, 200ms | Tap |

**Five rows.** Rows 4 and 5 are micro-interactions answering a real user action,
and with row 2 they are the complete list of interactive elements on the page. Row
3 is the second and last scroll-linked draw-on. Nothing else on this page moves:
no entrance animation on any section, no hover transition on any card, no
parallax, no ambient loop, and no scroll cue that is not the thread itself.

Three things deliberately do **not** appear here. The countdown value changes with
no transition at all — it just changes, like a printed number being corrected,
because a digit-flip animation is precisely the tacky-countdown move the brief
warns about. The three time states switch with no transition, for the same reason.
And keyboard focus rings appear instantly, because a 120ms fade on an
accessibility affordance is a delay in an accessibility affordance.

### Countdown mechanics

Target instant `2026-11-27T14:30:00Z`, a fixed constant, so the value is identical
for a guest in Chennai and a guest in Dallas. 27 November 2026 falls after the
first Sunday of November, so America/Chicago is CST, UTC−06:00 — no DST ambiguity,
and no timezone library on the client. Days, hours, minutes; **no seconds**, which
for a fourteen-month countdown are noise, a 1 Hz repaint and a battery cost. Ticks
on the minute. State transitions per **The three time states** above.

---

## The share card

1200×630, generated with `next/og`. The brief treats it as part of the invitation
and it is the first thing most guests see, so it is designed here rather than left
to the build.

**It is the envelope, unopened** — because that is what arrives before you open
anything. The seal is **intact**. There is no jasmine on it: the thread has not
been stitched yet. That is narratively right and it keeps the card quiet at
thumbnail size.

It is **centred**, matching the card's ruling. The left datum belongs to the
page's editorial matter, none of which is in the share card.

```
┌────────────────────────────────────────────────────────────┐ 1200
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·   │ kolam lattice 5%
│                                                            │ 76px top margin
│                        ⌒⌒⌒⌒⌒⌒                              │
│                      ⌒   ▲╱▔╲  ⌒                           │ seal, INTACT, 108px
│                       ⌒⌒⌒⌒⌒⌒                               │
│                                                            │ 40px
│                        Advika                              │ Gilda 76px
│                         and                                │ --sage-deep
│                        Sooraj                              │ 3 lines, 234px
│                                                            │ 36px
│              Friday, 27 November 2026                      │ EBG 500, 26px, ink
│              Artistry Venue, Anna, Texas                   │ EBG 400, 24px, ink
│                                                            │ 76px bottom margin
│  ▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽▽  │ korvai edge band,
└────────────────────────────────────────────────────────────┘ triangles at 10px
```

The korvai band along the bottom edge is the same woven edge as the card's, which
makes the share image read as *the card*, cropped. Its triangles are coarsened to
10px units — at WhatsApp's ~400px thumbnail they render at 3.3px and hold; the
page's 4px units would alias to a smudge.

**Satori constraints, so phase 6 does not discover them.** `next/og` renders
through Satori, which does not support CSS custom properties, SVG filters, or
reliable repeating backgrounds. Therefore: hex literals in the OG route with a
comment pointing at the tokens; **no `feTurbulence` paper grain** on the share card
(it is flat by necessity, and the lattice and the band carry it instead); the seal,
the lattice and the korvai band each embedded as a pre-composed `data:image/svg+xml`
`<img>` rather than live SVG; fonts passed to `ImageResponse` as ArrayBuffers,
subset to just the glyphs in these strings.

**Metadata.**

| Field | Value |
|---|---|
| `og:title` | `Advika and Sooraj` — 17 characters, truncates cleanly in a WhatsApp preview |
| `og:description` | `Friday, 27 November 2026. Artistry Venue, Anna, Texas.` |
| `og:image:alt` | `A gold wax seal with an interlocking A and S monogram on ivory paper, above the names Advika and Sooraj and the date Friday, 27 November 2026.` |
| `og:image:width` / `height` | `1200` / `630` — stated explicitly; WhatsApp sometimes falls back to a small thumbnail without them |
| `og:type`, `twitter:card` | `website`, `summary_large_image` |
| `theme-color` | `#FBF7F0` |

`og:image` must be an **absolute** URL reachable without a redirect, and the PNG
must stay under 300 KB — at this content density it will land around 40–70 KB.
WhatsApp caches aggressively, so the OG must be verified in a real WhatsApp
message before launch, not in a preview debugger.

---

## Principles

This invitation is Advika and Sooraj's because it is built on one idea taken from
one place: a *sikku kolam* is a single unbroken line, and so is a thread, and so
is their wedding day — which is why the gold thread that surfaces from the broken
seal never truly stops until it ties off at the end, even where it runs behind the
cloth. The page is two things in the right order: a ceremonial object, centred and
symmetrical because that is what a card is, and then the practical matter of the
day, hung off the thread's left datum where it is easiest to read at arm's length
— and the moment the thread comes back through the card's woven edge is the seam
between them. The ornament is jasmine, drawn from seventeenth-century Malabar
engravings, because jasmine is what is actually worn at a South Indian wedding and
a strung chain is a line rather than a blob, which is the only kind of botanical
that can be stitched on. The seven and a half hours between the ceremony and the
reception are answered by a drawing rather than a sentence: the thread simply does
not break, so the day reads as one thing without anyone having to claim something
the couple has not said. And the discipline is the point — five animated moments,
two section titles, one knot, no italic, no photograph anywhere, 180 KB against
their 38 and 48 megabytes — because restraint is what "quiet luxury" actually
means, and because everything is still enough that when the seal cracks, it lands.

---

# Self-review

## What I would have produced with no brief

Working the same prompt cold — "a digital wedding invitation for a South Indian
couple, one page, phone-first, elegant" — I would have arrived at: a warm cream
ground near `#F4F1EA`; Cormorant Garamond or Playfair over Inter; a muted
terracotta or gold accent; everything centred; a hero of the names with an
ampersand and a thin gold rule with a diamond in the middle; `SAVE THE DATE` in
tracked-out caps; a meta line reading `Friday · 8:30 AM · Anna, Texas`; a
four-box countdown with `DAYS HOURS MINUTES SECONDS` labels; the schedule as two
cards side by side with icons, each repeating the address; a eucalyptus wreath; a
fade-and-slide-up on every section at 0.6s staggered 100ms; an 800ms envelope
flip; a hover lift on every card; and `View on Map →`.

### Where my plan landed in the same place, and what I changed

**The ground and the serif.** Identical to the default. Unchanged, because §6
makes them a client mandate rather than my reach, and says so explicitly.

**The alignment — and I have to be honest about this one.** Revision 1 claimed
left-alignment throughout as the anti-default move. The client's ruling corrects
it: the card is centred, which *is* the default, and I do not get to claim credit
for arriving somewhere I was sent. What makes it a decision rather than a default
here is the argument attached to it — the genre expectation belongs to a fixed
symmetrical rectangle, not to a scrolling ribbon — and the non-default work has
moved to **the transition**: the thread diving behind the cloth and surfacing
through a woven edge, which is a mechanic no template has because no template has
a thread. A default would centre everything, or left-align everything. It would
not split by object and make the split the event.

**The countdown.** My first draft was a single dominant number with a small unit
label — the exact "big number with a small label" the `frontend-design` skill
names as the template answer. **Changed** to a sentence: display numerals set
inline in body words on one baseline, all three numerals at the same size, no
boxes, no tracked labels, no seconds, no animation.

**The after-state.** Revision 1 had one flat line, `Married on Friday, 27 November
2026`, tucked in a paragraph. That was a footnote to a failure mode I had just
documented in a competitor. **Changed** to a designed three-state machine with
fixed boundary instants, a JS-off fallback that is true in every era, a shared
two-line shape so nothing shifts, and a first-person line in state C — `We were
married on Friday, 27 November 2026` — written for the guest opening this in 2030.

**Performance.** Revision 1 treated the 38 MB and 48 MB measurements as a
reference note and the budget as a constraint. **Changed** to a stated position
with an accounted target, a ratio, and a phase gate — including dropping the
animation library entirely, which CSS made possible and which buys 58 KB of
headroom.

**The desktop.** Default instinct: the mobile column centred in a wide field with
ornament sprinkled around it. **Changed** to empty, equal fields beside the card
and a single cropped oversize jasmine beside the editorial matter only — so the
desktop composition states the ruling rather than decorating it. Down from two
instances; the one beside the card would have broken the object's symmetry.

**Two knots → one.** Revision 1 put a knot at the top and the bottom. That was
symmetry for its own sake, and a real embroiderer's starting knot is on the back
where you cannot see it. **Removed the top one.** The knot is now unique and it is
the last mark on the page.

**A mid-page jasmine sprig.** Cut in revision 1 and staying cut: its only reason
for existing was that the thread felt bare, which is decoration answering a
nervousness.

**The envelope.** Every template has one; mine is not distinguished by being
longer. It is distinguished by **not being a gate** — JS-only, never blocking,
skippable from t=0 without any script at all, addressed before it opens, still an
object under reduced motion, and now with a four-test phase gate that has to pass
before it is called done.

**The botanical and the motion count.** Eucalyptus wreath → a jasmine spray drawn
from Hortus Malabaricus line study, asymmetric as a drawing though centred as a
block. Roughly fifteen animated moments → five.

## Against the brief's ban list

| Ban | Status |
|---|---|
| `#F4F1EA` or a near neighbour as ground | `#FBF7F0`, the brief's own anchor. Noted honestly in the palette section that the gap is 7/6/6 and that the separation is not coming from here. |
| Terracotta / warm clay, anything near `#D97757` | Absent. No token, no gradient stop, no SVG fill. |
| Tinted near-blacks (`#111`, `#0B0B0B`) | Darkest value is `--ink #2E2A24`, a warm bark brown. |
| ALL-CAPS tracked-out eyebrow labels | None. There is no type step below 15px at which one could exist. |
| Meta strings joined with middle dots | None, including in the OG description. Commas and separate lines. |
| `WORD — fragment` with a spaced em dash | None, including in the OG title. |
| Monospace for small data labels | No monospace on the page. Times and the countdown are Gilda and EB Garamond. |
| `→` on link or button text | None. "Skip to the invitation", "Add to calendar", "Replay the opening". |
| One word of a headline accented differently | **Examined.** The only candidate is `and` in the names, set at 0.42× the name size — same face, same weight, same colour, same style. A scale relationship and a convention of set invitations, not an accent. Keeping it, having looked at it directly. |
| Numbered markers on a non-sequence | None anywhere. **And the schedule declines them although they are earned** — the thread already carries order positionally, and the times are themselves ordinal. Adding 01/02 would be redundant and would read as the banned treatment even where it is legitimate. |
| Playfair, Cormorant, Great Vibes, Inter, Montserrat, Poppins, system stacks | Gilda Display + EB Garamond, both self-hosted, both OFL. |
| Christian or church iconography | None. The gopuram motif was available and is not used at all. |
| Copyrighted or unlicensed assets | Nothing shipped. The engravings were studied, not sampled. Every SVG is authored for this page. The page ships no image file at all. |
| No RSVP, no contact block | None planned. |
| Map interactivity of any kind | The map is an SVG plate. No link, no embed, no iframe, no deep link, no tile provider, no click handler. The address beneath it is selectable text. |
| Generic timeline component | Explicitly avoided: the thread is never centred with content flanking it. Above the korvai edge it is behind the cloth; below it, it is a left margin with content on one side. |

## The Chanel test

Standing from revision 1: I removed the **korvai closing rule** — a full-width
*reku* band above the closing note. It was the prettiest ornament in the plan
after the seal and I wanted it. It went because it stepped on the knot, which is
the payoff of the entire thread idea.

Revision 2 adds one removal of the same kind: **the scroll cue.** Revision 1 had a
24px gold hairline drawing downward at the end of the hero as a separate mark, and
I defended it as functional. It is not: the thread surfacing through the woven
edge and running down into the field says "there is more below" better than a
dedicated cue does, and it says it with an element that already exists. One fewer
mark, one fewer beat, same job.

## §6, in one sentence

Given that the ivory ground and the serif category are fixed by the client, this
design's distinctiveness comes from a single structural idea executed in one
material and one weight class: one continuous gold thread — a *sikku kolam*'s
unbroken line — that surfaces from the broken wax seal, stitches the jasmine on a
centred ceremonial card, dives behind the cloth, comes back through a woven korvai
edge to become the left datum for everything practical, and ties off in a knot,
carried in 180 KB of drawn paths against references that stream 38 and 48
megabytes of photographs.

---

## Build deviations

Recorded as they happen, so nothing diverges quietly. Each is a change the plan
did not authorise, made because building it proved the plan wrong.

**1. `vector-effect: non-scaling-stroke` — removed.** § The stitch idiom said all
paths would carry it "so weights hold at any render size". Rendered, that is
wrong for a thread: it pins stroke width to screen pixels, so the desktop
oversized crop came out wiry — a bigger *drawing* of stitching rather than a
close-up *of* it. A thread scales with its cloth. Weights are now authored in the
same units as the geometry and scale with it. Verified at 90, 150 and 300px.

**2. The map's lettering is set, not drawn.** § Illustration inventory asked for
"the venue named in drawn lettering". Drawing ten unique glyphs would have
produced something worse than Gilda Display, which is already this piece's
engraved letter. The cartouche, its double rule and every other mark on the plate
are drawn; the words inside are `<text>` in Gilda. The seal's monogram remains
outlined paths, which is where the requirement actually mattered — it is small,
and a font swap there would shift the most looked-at object on the page.

**3. The map road draws on by clip, not by dash.** The plan assumed
`stroke-dasharray` everywhere. County Road 419 is a *filled tapered outline*
rather than a stroke — that is what stopped the plate reading as a diagram — and
a fill cannot be dashed. It is revealed instead by sweeping a thick stroked
centreline through a `clipPath`. Same easing, same duration, same author-time
length; only the mechanism differs.

**4. The first map plate was scrapped, not patched.** It came out as a road
diagram with a pin: uniform strokes, no hatching, roads running off the copper.
Per CLAUDE.md, it was rebuilt rather than tuned — roads became tapered outlines
from the monogram's pen, land gained cut hatching, water became two banks with
cross-strokes, and everything is clipped inside the plate rule.

---

## Build notes carried forward

- Content: `content/invitation.ts` is the single typed source. No literal date,
  time or address anywhere else. The countdown target and both state boundaries
  are derived there as the fixed instants `2026-11-27T14:30:00Z` and
  `2026-11-28T06:00:00Z`.
- `.ics`: `TZID:America/Chicago` with a full `VTIMEZONE` carrying both `STANDARD`
  (CST, −0600, first Sunday of November) and `DAYLIGHT` (CDT, −0500, second
  Sunday of March), plus a Google Calendar template link. **Event count is an open
  question** — iOS often imports only the first event from a multi-event file, so
  this cannot be defaulted silently.
- `robots: noindex` — a family invitation should not be in a search index.
- Focus: `outline: 2px solid var(--sage-deep); outline-offset: 3px`, round on the
  seal. 7.6:1 on `--ground`, 6.7:1 on `--ground-deep`; both clear the 3:1 non-text
  requirement.
- Tap targets: seal 96px, bar items 44px, skip and replay links 44px.
- LCP is the names or the inline seal SVG — both in the initial HTML, neither
  blocked on anything but a preloaded subset font.
- Verification at every phase gate: screenshots at 390, 430, 768 and 1440px, read
  critically rather than confirmed; `npm run build` and `npx tsc --noEmit` clean;
  the four lockout tests before the envelope is called done.
