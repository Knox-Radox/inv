# Ornament — ideas not built

A working list for whoever picks this up next. Nothing here is committed to and
nothing here is required; revision 6 is complete as it stands and
`docs/handoff-revision-6.md` says plainly that the page does not need more.
This exists so that if it *does* get more, it gets the right things and does
not relearn what revision 6 already paid for.

Everything below is specified against the code that exists — the primitives in
`tools/ornament.py`, the `Wash` / `Stitch` / `Painting` components, and the
`LazyDecor` loading path — so each entry can be picked up and built without a
design pass first.

---

## 1. How to judge a new piece

Four tests. A piece that fails any of them is the drape or the cypress again,
and both of those cost three passes each before being thrown away.

**Does it mean something?** Every ornament on this page is either the venue or
something the family carries in. A column is the building. A thoranam is what
gets hung over the door on the morning. Nothing is there because it is pretty.
The two pieces that were cut are the two that were only pretty.

**Does an existing construction draw it?** `lathe` for anything turned,
`leafshape` for anything foliate, `blade` for anything on a curved spine,
`rosette` for any small flower. Every failure in revision 6 came from inventing
a new construction for one piece. If a thing genuinely needs a new primitive,
that is a signal to look harder for a form that does not.

**Does it survive its rendered size?** The peacock finial was the better idea
and it died at fifteen pixels. Work out the pixel size on a 390px phone before
drawing anything, and if the answer is under about forty, the piece has to
read as a **silhouette**, not as detail.

**Does it move only if the family brought it?** Stone is still. This is the
rule the whole programme is organised around and it is also the motion budget.

---

## 2. The kit that already exists

| You want | Use | Already draws |
|---|---|---|
| Anything turned on a lathe | `lathe(cx, profile)` | columns, lamp stems, urns, plinths, the kalasham |
| A leaf, a petal, a blade | `leafshape(a, b, w)` | mango leaves, acanthus, jasmine petals, banana blades |
| A leaf on a *curved* spine | `blade(points, widths)` | banana blades, the jasmine bough's branch |
| A small flower, one closed path | `rosette(cx, cy, r, n)` | the malai, the urns' jasmine, fallen petals |
| A silhouette that is not turned | `blob(points)` | the coconut, the lamp dish, flames |
| A wobbled outline, so the wash bleeds past the line | `wobble(points, amp, seed)` | every leaf |
| A viewBox that cannot clip the art | `path_bbox(ds)` → `BOXES` | every piece |
| Line + wash + dried edge | `<Wash id d sheet box>` | every piece |
| A line that draws itself on | `<Stitch d length width tone>` | every line on the page |
| Paint-on-approach and ambient gating | `<Painting>` + `LazyDecor` | every layer |

Three baked wash sheets exist: `foliage`, `stone`, `brass`. A fourth would be a
real decision — see §6.

---

## 3. Where the page is still empty

Worth reading before picking an idea, because the best piece in the wrong place
is worse than no piece.

| Place | State | Room |
|---|---|---|
| **The card, both margins** | **No ornament at all.** At 1440 that is ~370px of empty ground either side of the hero, and it is the first thing after the envelope. | The largest remaining hole on the page by a distance. |
| The day, between the two moments | The malai runs past both; the kalasham stands below | Vertical middle is open |
| The place, bottom right | Bough top right, vazhai bottom left | One corner free |
| The closing, either side of the kolam | Urns flank the note above it | Floor level is open |
| Between sections | Nothing spans them | The reference's ornament *flows*; ours sits in boxes |

---

## 4. Build these first

### 4.1 Vetrilai paakku — betel leaves and areca nut

**The strongest idea on this list, and it is not close.** A South Indian
wedding invitation is not handed over on its own: it goes with betel leaves,
areca nut and a coconut, pressed into the hand of the person being invited.
Putting that on the invitation itself is the one ornament here that is *about
being invited* rather than about the wedding.

- **Where.** Beside the card, in the dead margin — the biggest hole on the
  page, and the only place where an object about the act of inviting belongs.
  On a phone, at the foot of the card as the field begins.
- **Construction.** The leaves are cordate — heart-shaped, wider at the base
  than a mango leaf and drawn to a point. `leafshape` will not do it as it
  stands; it wants a `lbulge`/`rbulge` that peak nearer `t=0.25` and a base
  that flares rather than meeting at a point. That is a small parameter on
  `leafshape`, not a new primitive. Three or four leaves laid in an overlapping
  fan, veins radiating from the base rather than off a midrib — betel venation
  is palmate and that is what identifies it. The nuts are two or three small
  ovoids, `lathe` with a squat profile, in the `brass` sheet's darker end.
- **Motion.** They are *laid down*, one leaf at a time, each settling with the
  same overshoot the kolam's pulli use. Not a draw-on: a placing. About 180ms
  apart. Then still — they are not hung, so they do not sway.
- **Size check.** ~150px wide on a phone; a leaf is ~70px. Detail survives.
- **Risk.** Betel leaf and mango leaf are both simple green ovals at a glance.
  The palmate veins and the overlap are what separate them; get those wrong and
  it reads as more mango.

### 4.2 Nadaswaram and thavil — the sound of the muhurtham

The pipe and the drum. There is no Tamil wedding without them, and the two
instruments together are as recognisable to this audience as the thoranam.

- **Where.** Flanking the ceremony's 8:30 AM in **The day** — the moment they
  actually play. Leaning, propped, at rest before the morning starts.
- **Construction.** The nadaswaram is a pure `lathe`: a long conical bore with
  a stepped mouthpiece and a flared brass bell at the foot, ~1:9 proportions,
  drawn leaning. The thavil is a barrel — two `lathe` profiles back to back —
  with a stretched head, a hoop, and eight or ten diagonal lacing lines round
  the body. Both in `brass`, the thavil's head in `stone`.
- **Motion.** This is the interesting part. They are at rest, so they do not
  move — but at the moment the section paints, **three or four faint concentric
  arcs expand from the nadaswaram's bell and fade.** Once. That is the sound,
  drawn. It is the only ornament on the page that would be about hearing rather
  than seeing, and it costs three stroked arcs with a scale-and-fade.
- **Size check.** A nadaswaram at 260px tall on a phone; the thavil ~120px.
  Fine.
- **Risk.** Two instruments is a lot of object in a section a guest reads for
  times. Consider the nadaswaram alone.

### 4.3 Sugarcane, tied with the vazhai

Banana stems and sugarcane are tied *together* at the entrance — the pair is
the canonical thing, and the page currently has half of it.

- **Where.** The place, with the vazhai. Either replacing the bough on the
  right so the entrance is symmetrical in kind but not in form, or standing
  behind the banana on the same side.
- **Construction.** The cane is a `lathe` with node rings every ~40 units and
  a slight lean; the leaves are `blade` with a long narrow width profile,
  arching and splitting at the tips. Two or three canes at different heights,
  bound near the top with a `curve1` tie.
- **Motion.** Cane leaves are long and light and they move more than banana
  does. One band of sway, longer period than the thoranam's.
- **Size check.** Tall and narrow — good at any width.
- **Risk.** Green on green next to the banana. Push the sugarcane toward the
  `foliage` sheet's olive end so the two plants are not the same green.

### 4.4 Urli — the brass bowl of floating flowers

A wide shallow brass bowl of water with jasmine floating on it, set at an
entrance. It is the one object here that would let the page have **water**.

- **Where.** The closing, at floor level between the urns; or beside the map
  plate.
- **Construction.** `lathe` for the bowl — very wide, very shallow, a rolled
  rim. The water is one `blob` ellipse in a pale wash with a lighter crescent
  where the light catches. The flowers are `rosette`, six or seven, at
  different scales, lying on the surface.
- **Motion.** **The flowers drift.** Each on its own long period — 18 to 30
  seconds — describing a slow lazy ellipse of two or three pixels. Nobody will
  consciously see it and everybody will feel it. This is the best ambient
  motion left unbuilt on this page, and it is four keyframes.
- **Size check.** The bowl is wide, so it reads even small; the flowers need
  ~16px each.
- **Risk.** Water is the hardest material to fake and the page has no precedent
  for it. Keep it to one pale ellipse and one highlight; the moment it gets a
  reflection it will look like plastic.

### 4.5 Sambrani — one curl of smoke

A small brass incense holder with a single slow curl rising from it.

- **Where.** Anywhere quiet — the closing's floor, or beside the kalasham.
- **Construction.** The holder is a squat `lathe`, twenty seconds' work. The
  curl is one `curve1` through six or seven points, stroked at 0.6 with a soft
  taper, in `--sage` at low opacity.
- **Motion.** The curl **redraws itself continuously** — `stroke-dasharray`
  cycling so the line appears at the bottom and dissolves at the top, on a
  14-second loop, while the whole path drifts one degree. It is the only piece
  that would use the draw-on as a *loop* rather than as an entrance, and smoke
  is the one subject where that is honest.
- **Risk.** A perpetual `stroke-dashoffset` animation is not composited. One is
  fine; do not add a second.

### 4.6 The peacock, at a size that works

The finial that failed. It failed because it was fifteen pixels tall, not
because it was wrong — and a peacock is the single commonest figure in kolam.

- **Where.** Standing beside the kolam at the closing, at ~170px. A peacock at
  a threshold beside a kolam is the most ordinary image in Tamil folk art.
- **Construction.** Filled silhouette for the body, neck and head — at this
  size a shape reads and a bundle of strokes does not, which is the lesson the
  finial taught. Crest as three hairs. The tail is folded down, five or six
  `blade` sweeps, each ending in an eye.
- **Motion.** The eyes open one at a time as the tail draws — a small scale-in
  per eye, 90ms apart. Then still. A bird at rest is still.
- **Size check.** 170px is the floor. Below that, do not.
- **Risk.** Whimsy. Draw it standing and calm, not strutting.

---

## 5. Good, when there is a reason

- **Panneer chombu** — the rosewater sprinkler, turned brass with a long curved
  spout. `lathe` plus one `blade` for the spout. Guests get sprinkled on the
  way in; it belongs near an entrance.
- **Muthukudai** — the ceremonial umbrella. A shallow dome, a fringe of drops,
  a finial. Would sit well spanning the top of a section, but it competes with
  the thoranam's gesture; use only if the thoranam moves elsewhere.
- **Vaazhaipoo** — the banana flower, a deep purple-bracted cone hanging under
  the crown. A *detail on a piece that already exists*, which makes it the
  cheapest addition on this list. Off-palette in true colour; draw it in the
  deepest `foliage` tone rather than purple.
- **Live oak branch with Spanish moss** — the page is in Anna, Texas and
  nothing on it says so except the address. A gnarled branch with small lobed
  leaves and two or three hanging moss strands would tie the whole thing to its
  actual ground. `blade` for the branch, `leafshape` for the leaves, a
  three-point `curve1` for each moss strand. The moss sways.
- **Cotton bolls** — the same argument, more local still: this is cotton and
  pecan country. The map plate already carries tiny tree marks; a cotton branch
  beside it would rhyme.
- **Balustrade** — a run of turned stone balusters. One `lathe` profile
  repeated with a `<use>` per post, which makes it nearly free. Would ground
  the closing the way the floor gradient tries to.
- **Wrought-iron gate** — venue register, and the honest transition into "The
  place". Straight stems, a scrolled top rail, a lock plate. Reads at any size.
- **Thali** — the cord and pendant. It is the most meaningful object in the
  entire vocabulary and it is also the most intimate; it is the couple's to
  offer, not ours to place. If they want it: a fine gold `curve1` cord that
  draws across, and the pendant settling at the centre. Ask first, in
  `docs/open-questions.md`.

---

## 6. Motion and behaviour, not objects

Some of the best ideas left are not new drawings.

### 6.1 Ornament that knows what day it is

`content/invitation.ts` already drives a three-state countdown — **before**,
**Today**, and, from midnight on the 28th and forever, **We were married**. The
ornament does not know about any of it. It could:

- **Before.** As now.
- **On the day.** Both lamps burning higher; the kolam already drawn when the
  section arrives, because it was drawn at dawn.
- **After.** The petals all fallen. The lamps out, the wax cool. The kolam
  still there, walked over.

That last state is the keepsake state, and this is the page's one chance to
make it feel like an afterwards rather than a page with a stale countdown. It
costs a prop threaded from `Countdown`'s existing `stateAt()` into the decor,
and a handful of CSS classes. **No new geometry at all.**

### 6.2 Morning and evening in the same section

The ceremony is at 8:30 in the morning and the reception at 6:00 in the
evening, seven and a half hours apart, and `docs/open-questions.md` records
that the page answers that gap with a drawing rather than a sentence.

Here is another drawing: **give the two moments different light.** Whatever
stands near 8:30 AM casts a long shadow to one side; whatever stands near 6:00
PM casts a long shadow the other way. Same objects, same section, opposite
afternoons. It is two `radialGradient` ellipses at different angles and
lengths, and nobody will consciously notice it, which is exactly why it will
work.

### 6.3 Lamplight on the floor

The lamps are lit and the floor beneath them does not know. A soft warm ellipse
under each lamp that brightens as the flame is struck, and breathes with it on
the same period, would tie the flame to the ground it stands on. Two gradients,
two keyframes, no geometry.

### 6.4 Water, and the ripple under it

If the urli gets built (§4.4), one further thing: a single expanding ring in
the water every twenty seconds or so, as though something touched the surface.
One stroked circle with a scale-and-fade. Rare enough to be a surprise.

### 6.5 Akshathai — the rice

Yellow rice thrown in blessing. The petals already fall; rice would be sharper,
faster, and it belongs to the *moment* rather than to the floor. It could
scatter once, at the ceremony beat, and stay.

---

## 7. Deliberately not on this list

- **Anything in a new hue.** Marigold, kumkumam, turmeric, bluebonnets. §6 of
  the brief rules out adding an accent colour, and it is the reason the
  thoranam is mango leaf on a gold cord rather than marigold. A saffron
  ornament would be the loudest thing on the page within a week.
- **Devotional figures.** The vocabulary here is folk and celebratory — a
  peacock, a kolam, a lamp. A deity or a temple bull is a different register
  and not one an invitation should choose on a family's behalf.
- **Anything requiring a fourth wash sheet.** Three sheets are 97 KB, shared by
  everything, fetched on approach. A fourth is a real cost for one piece; tint
  an existing sheet first and only bake a new one if two or more pieces need it.
- **A second scroll-linked mechanic.** The draw-on is the page's motion idiom.
  A parallax, a pin, or a scrub would be a second idiom and the page would stop
  having one.
- **More in the countdown.** It has five pieces already. It is the densest
  section and it is at its limit.
- **Anything that overlaps type.** The garland covered the numerals once and
  the urn covered "See you in November" once. Both were caught; a third would
  not be funny.

---

## 8. The recipe, when you build one

Roughly ninety minutes a piece, most of it looking rather than typing.

1. **Draw it in `tools/ornament.py`** with the existing primitives. Emit a
   closed `sil` for the wash and open `lines` with their lengths for the
   draw-on — they are two different kinds of path and only the second can be
   stroked on.
2. **Add it to `BOXES`** via `path_bbox`, including anything that is not a path
   (glow discs, cast shadows, dots) through `_grow`. Skip this and the `<svg>`
   will clip your drawing and you will not see why.
3. **Look at it in isolation** — `python3 tools/preview2.py public/__p.html`,
   open it, screenshot it, read it critically. Every piece that shipped badly
   in revision 6 shipped because this step was skipped or rushed.
4. **Emit** — `cd tools && python3 emit_art.py`.
5. **Build the component in `components/art/decor/`**, never outside it. It
   must stay inside the `ssr: false` chunk; server-rendered inline SVG put the
   document at 1.33 MB.
6. **Use `framed(BOX.yourPiece)`** for the viewBox and `--ar`, and size it in
   CSS as `calc(var(--your-w) / var(--ar))`.
7. **Declare its variables on `.stage`,** not on `.deco`. Custom properties
   inherit downward only, and a `.stage` padding written against a `.deco`
   variable silently resolves to nothing.
8. **Check the overflow at 390 and 1440.** The art fills its box now, so every
   negative inset cuts drawing rather than trimming margin. Ten to thirty
   pixels is a crop; a hundred is a mistake.
9. **Re-measure.** `tools/verify/` — scroll pacing especially, since that is
   what the ornament costs. The budget is p95 under two frames at 4x CPU.
10. **Update `contain-intrinsic-size`** on the stage if the section's height
    changed.

---

## 9. If only one thing gets built

**§4.1, the betel leaves, beside the card.** It fills the largest empty space
on the page, it is the one object in the whole vocabulary that is about the act
of inviting somebody, and it is three leaves and two nuts.

**And if a second: §6.1, ornament that knows what day it is.** It costs no
geometry, it uses a state machine that already exists, and it is the only idea
here that makes the page different on the morning of the wedding than it is
today — which is the one thing the reference cannot do at all, because its
countdown expired and nobody noticed.
