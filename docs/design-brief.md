# Design brief — Advika & Sooraj digital wedding invitation

You are the design lead. This is the client brief. Read it fully before you plan.

---

## 1. The subject, the audience, the job

**Subject.** A digital wedding invitation for Advika and Sooraj. Not a wedding
website, not a landing page, not an event microsite. An *invitation* — the
digital equivalent of a hand-addressed envelope arriving in the post, lined with
tissue, sealed in wax. Everything about the design should behave like a physical
object that has been made by hand, not a page that has been laid out.

**Audience.** Family and friends of a South Indian family in Texas. Age range
roughly 8 to 85. Most will open this on a phone, one-handed, from a WhatsApp
message, possibly on a mid-range Android, possibly on congested venue LTE.
Many are not fluent with web conventions. Several are on iPhones with the text
size cranked up. Nobody is going to read instructions.

**Primary job.** Make the guest feel *invited* — personally, warmly, expensively —
and then let them find four facts without hunting: when, where, what the plan is,
and how to get it into their calendar.

**Secondary job.** The link gets forwarded. When it lands in a WhatsApp thread or
an iMessage, the preview card that appears is part of the invitation and must be
designed with the same care as the hero. A guest should be able to tell it is
beautiful before they even tap.

---

## 2. Content — the real facts

These are real. Do not invent, embellish, or add placeholder content around them.
All of this lives in `content/invitation.ts` as a single typed source of truth.

| Field | Value |
|---|---|
| Couple | Advika and Sooraj |
| Date | Friday, 27 November 2026 |
| Ceremony | 8:30 AM – 10:30 AM |
| Reception | 6:00 PM onwards, same day, same venue |
| Venue | Artistry Venue (both events) |
| Address | 9981 County Road 419, Anna, TX 75409 |
| Timezone | America/Chicago (CST, UTC−06:00 on that date) |
| Language | English only |
| RSVP | **None.** Do not build one. Do not add a "let us know" form, a headcount, or a contact-us block. |

**Every fact above is confirmed.** There is nothing left to fill in. The year is
2026; 27 November 2026 is a Friday, which is consistent with an 8:30 AM
muhurtham. Do not treat any of it as provisional and do not leave placeholders.

**A design problem worth naming.** Two events, one venue, one day, with roughly
seven and a half hours of nothing between them. Guests will wonder what happens
in that gap and whether they are meant to leave and return. The schedule design
has to make the shape of the day legible at a glance rather than presenting two
disconnected times. Do not invent an answer to what happens in between — if a
line of copy is needed there, raise it in `docs/open-questions.md` for the couple
to supply.

---

## 3. Aesthetic direction

The words the client used: *quiet luxury, regal elegance, bespoke, old-world
romance, editorial, heirloom, understated opulence, couture, handcrafted,
timeless, immersive.*

The two references the client supplied:

- https://www.thedigitalyes.com/demo/bellagio
- https://www.thedigitalyes.com/demo/maison-doree

**Open both in a browser and watch them before you plan.** They are client-side
rendered, so fetching the HTML tells you nothing — you have to actually render
them. What the client wants from these is specific: the *smoothness* of the
motion, and the sense that the ornament was embroidered by hand rather than
placed by a design tool. Study the pacing of their reveals, then do something
better and different. Do not copy their layout.

### The governing metaphor: embroidery, not print

This is the single most useful idea in the brief and the thing that should drive
your ornament decisions. Fine gold thread on ivory silk. Satin stitch. A line
that varies in weight because a hand made it. A knot on the back you can almost
feel. When you draw a botanical, it should read as *stitched*, not *printed* —
which means visible stroke, slight irregularity, and the possibility of being
drawn on over time.

Concretely, this gives you a motion vocabulary nothing else does: SVG
`stroke-dasharray` draw-on reads as a needle pulling thread. Use it. It is the
one signature move of this design and it should appear in the hero and at most
one other place.

### South Indian, subtly

The couple is South Indian. The client's instruction: incorporate South Indian
elements, but subtly, and **it must not read as Christian or as a Western church
wedding.**

Motif vocabulary to draw from — use two or three, well, not all of them:

- **Kolam** — the dot-grid-and-continuous-line floor drawing. Its geometry is
  a gift here: a faint kolam dot grid as page texture, or a single continuous
  kolam line as a section divider, is subtle, authentic, and nothing like a
  eucalyptus wreath.
- **Mango leaf thoranam** — the strung leaf garland hung across a doorway.
  Reads as threshold, welcome, entrance. Natural fit for the envelope opening
  or a section transition.
- **Jasmine (malli)** — the flower actually worn at South Indian weddings.
  Strung in a chain, it is a line, not a blob, which suits fine-line work.
- **Gopuram arch** — the stepped temple silhouette, used as a *framing device*
  for a portrait or a date, abstracted almost to geometry.
- **Korvai / silk border geometry** — the woven border of a Kanjivaram sari.
  Excellent for horizontal rules and section edges. Zari gold thread on a
  ground colour.
- **Kasu / coin forms** — small circular gold ornaments, useful as punctuation.

**Do not use:** crosses, doves, church arches, chapel windows, eucalyptus,
pampas grass, generic mandalas, paisley wallpaper, Ganesha or deity imagery used
decoratively, elephants, "Indian wedding" clip art of any kind, or a Devanagari-
styled Latin font. The register is *restrained heirloom*, not *ethnic theme*.

### Palette

The client specified warm ivory, pearl white, muted sage, champagne, antique
gold. That is a mandate, not a suggestion — see the anti-slop clause in §6.

Anchor values to start from. Refine them, justify any change, keep the family:

```
--ground        #FBF7F0   warm ivory, the paper
--ground-deep   #F0E9DB   champagne, the tissue lining / recessed panels
--sage          #8A9A83   muted sage, the botanical thread
--sage-deep     #46543F   deep sage, headings and ink where black would be crude
--gold          #B08D57   antique gold, the wax and the zari
--gold-light    #CDAE7A   brushed gold, sheen and highlight only
--ink           #2E2A24   warm bark-brown near-black for body text
```

Constraints:
- **Never use `#F4F1EA` or anything within a few points of it.** It is the exact
  cream every AI-generated page reaches for and a designer will spot it.
- **Never use terracotta or warm clay accents**, in particular anything near
  `#D97757`. It is the single most recognisable tell.
- **No tinted near-blacks** (`#111`, `#0B0B0B`). Your darkest value is a warm
  brown or a deep sage, because ink on ivory paper is never neutral black.
- Gold is an *accent and a material*, not a colour you fill areas with. It should
  appear as hairlines, seals, and thread. If more than about 5% of any viewport
  is gold, you have overdone it.

### Typography

Two families maximum. The display face carries the whole personality, so choose
it like it is the only decision that matters.

**Banned outright** — these are the wedding-template and AI-default faces:
Playfair Display, Cormorant Garamond, Great Vibes, Parisienne, Inter, Montserrat,
Lato, Roboto, Poppins, and any system font stack. If you have a genuinely strong
argument for Cormorant, you may make it — but you must first name three
alternatives you considered and say why each lost.

**Worth considering** (not a menu to pick blindly, a starting point for
research): Bodoni Moda, Prata, Gilda Display, Italiana, Marcellus, Cardo,
EB Garamond, Newsreader, Petrona, Vollkorn, Spectral. High-contrast didones read
couture; old-style garaldes read heirloom. Decide which of those two you are and
commit.

The monogram letterforms on the wax seal are not live text. Outline them as SVG
paths so they can be debossed, so they render identically on every device, and so
they never shift while a font is loading. They are also almost certainly worth
drawing rather than setting — see the seal notes in §4.

Set a real type scale with intentional weights and spacing. Give serif body copy
generous line-height. Keep measure under about 66 characters.

**Typographic treatments to avoid** (all are generated-page tells):
- Accenting one word of a headline in italic, a different weight, or a different
  colour.
- ALL-CAPS tracked-out eyebrow labels above headings.
- Meta strings joined with middle dots — `Friday · 8:30 AM · Anna, Texas`.
- `WORD — fragment` constructions with a spaced em dash.
- A monospace face for small data labels.
- A `→` glued onto button and link text.
- Numbered markers (01 / 02 / 03) on anything that is not genuinely a sequence.
  The schedule *is* a sequence, so there it is legitimate; nowhere else.

---

## 4. The experience, section by section

This is the required content and sequence. The *composition* is yours — how it is
framed, cropped, stacked, and paced is the design decision you are being paid for.

**1. The envelope.** The first thing anyone sees. A closed envelope, sealed with
a wax monogram. The guest taps to open. This is the single orchestrated moment of
the whole piece, and it should be genuinely cinematic: slow, layered, deliberate.
Seal cracks, flap lifts, the card slides out, the botanical thread draws itself
on, the names settle. Think five to seven seconds of choreography, not a
half-second flip.

Requirements:
- The seal is a wax monogram carrying the initials **A** and **S**, in English
  only. No Tamil, no Telugu, no other script.
- A monogram is a drawn mark, not two letters set in a typeface with an ampersand
  wedged between them. The **A** and the **S** should interlock, share a stroke,
  or nest — one mark, not two characters. Draw it as paths and take the time to
  get the counters and the join right; this is the most looked-at object on the
  page and it is small enough that every flaw is visible. If the ring around the
  monogram wants ornament, use the korvai or kasu geometry from the motif
  vocabulary, not lettering.
- The wax must look like wax: an irregular edge, a slight rim where it pooled, a
  debossed impression rather than a flat printed circle. This is a lighting and
  edge problem, solve it in SVG with soft inner shadow and a subtle gradient, not
  with a drop-shadow.
- Tapping the seal is a user gesture, which means it is also the correct and only
  moment to start the background audio if the guest has opted in.
- Shown once per device (`localStorage`), with a discreet way to replay it.
- **Skippable.** A visible affordance to go straight to the invitation.
- Under `prefers-reduced-motion`, the envelope resolves to its open state almost
  immediately with a gentle cross-fade. Nobody is stuck behind an animation.
- The card must never be blocked by a failed animation. If JS fails, the content
  is still there and readable.

**2. The invitation itself.** Names, the line that does the inviting, the date,
the venue. This is the emotional centre. It should feel like the inside of a
letterpressed card: generous margins, restrained ornament, one moment of gold.

**3. Countdown.** To 2026-11-27T08:30:00−06:00. Compute against a real timezone,
not the visitor's local clock, and not a naive `new Date()` string parse. It must
be correct for a guest in Chennai and a guest in Dallas simultaneously. Design it
as something quiet — this is where every wedding site goes loud and tacky. Days,
hours, minutes. Consider whether seconds add anything or just add noise. When the
date passes, it must degrade into something graceful, not into negative numbers.

**4. Schedule.** Ceremony at 8:30 AM, reception from 6:00 PM, same day, same
venue. A genuine sequence, so ordinal treatment is earned here if you want it.
Since the venue is shared, do not repeat the address twice — repeating it makes
the day read as two separate events in two separate places. Keep the whole thing
scannable by a 70-year-old holding the phone at arm's length.

**5. Location.** A hand-drawn illustrated map — approach roads, the venue marked,
in the same fine-line stitched idiom as the botanicals.

**The map is purely visual.** No Open in Maps button, no map embed, no iframe, no
platform deep link, no tile provider, no interactivity of any kind. It is a piece
of art on a card, not a wayfinding tool, and it does not need to be to scale.

Because it carries no navigation function, it has to carry a decorative one, and
that raises the bar on it: a plain vector road diagram with a pin will look like a
placeholder. Treat it as an engraved plate — the venue named in drawn lettering,
the approach roads as varied hand-weighted line, a compass rose or a small
cartouche if the composition wants one.

Beneath it, the full address as selectable text so a guest can copy it into
whatever they already use.

**6. A closing note.** Something short and warm to end on. Write it yourself, in
the couple's register — plain, unclever, sincere. No "we can't wait to celebrate
with you!!" energy. No exclamation marks.

**Persistent controls.** A sound toggle and an add-to-calendar action, both
discreet, both reachable one-handed, neither floating in a way that covers
content. Add-to-calendar generates a proper `.ics` with the correct VTIMEZONE
plus a Google Calendar template link.

**The share card.** A designed 1200×630 OG image generated with `next/og`,
carrying the monogram, the names, and the date, in the real typefaces. Plus
`og:image:alt`, a `theme-color`, and a title that reads well truncated in a
WhatsApp preview.

---

## 5. Motion

The brief asks for cinematic, slow, graceful, immersive. It does not ask for
*busy*, and the difference is the whole game.

**Motion budget — treat this as a hard constraint:**
- **One** orchestrated hero sequence: the envelope. Spend nearly all of your
  motion budget here.
- **One or two** scroll-linked stitch draw-ons. Not one per section.
- Micro-interactions only where they answer something the guest actually did:
  opening the envelope, toggling sound, adding to calendar. That is the complete
  list of interactive elements on the page — the map is not one of them.
- **No** fade-and-slide-up entrance on every section. This is the most common
  generated-page tell in existence and it will flatten the hero's impact by
  making motion feel cheap and constant.
- **No** hover transitions on every card. Half your audience has no hover.

Easing carries the "expensive" feeling more than duration does. Custom cubic
béziers with a long, slow settle. Nothing linear. Nothing bouncy — bounce reads
playful, and this is not playful.

`prefers-reduced-motion: reduce` must be honoured everywhere, and the reduced
version must still feel considered rather than broken.

---

## 6. The anti-slop clause — read this twice

The `frontend-design` skill lists, as generated-design tell number one: *"a warm
cream background (near #F4F1EA) with a high-contrast serif display."*

**This brief asks for exactly that, deliberately, and the brief wins.** The skill
itself says so: where the brief pins down a visual direction, follow it exactly,
including when it asks for one of the listed defaults. Warm ivory and a serif are
a client mandate here, not your default reach. Do not "improve" the palette into
something darker, cooler, or more contemporary. Do not switch to a sans. Do not
add a bold accent colour to prove you had an idea.

What this means in practice is that **you cannot earn distinctiveness through the
palette or the typeface category**, because both are fixed. You have to earn it
somewhere else. The places available to you:

- The **ornament vocabulary** — kolam geometry and korvai borders instead of the
  eucalyptus wreath every generated wedding page produces.
- The **stitch idiom** — line quality, draw-on, thread weight, knot detail.
- **Texture and material** — paper grain, the deboss of letterpress, the pooled
  edge of wax, the sheen of zari.
- The **envelope choreography** — nobody else's page has this.
- **Composition and crop** — asymmetry, generous negative space, where things sit
  on the page.

Spend your boldness in one place. The envelope is that place. Everything around
it should be quiet, disciplined, and confident enough to be still.

Before you write code, run this test on your own plan: *if I gave this plan's
description to another model with a similar prompt, would it arrive somewhere
similar?* Anything that fails that test gets revised, and you say what you
changed and why.

---

## 7. Quality floor

Not negotiable, and not something to announce in the UI.

- Fully responsive from 320px to 1920px. Design mobile-first; the phone is the
  real product and the desktop view is the courtesy.
- Works at 200% browser zoom and with iOS Dynamic Type at large settings.
- Visible keyboard focus on every interactive element.
- `prefers-reduced-motion` respected throughout.
- Real semantic HTML. The invitation should be comprehensible to a screen reader
  and to someone with JS disabled.
- WCAG AA contrast. Gold on ivory is the risk — check it, and if a gold hairline
  fails, it is decorative and must be `aria-hidden`, not load-bearing text.
- No horizontal scroll. No layout shift. No tap target under 44px.
- Fast on a mid-range Android over congested LTE: self-hosted subset fonts,
  inline SVG rather than raster art, JS under ~150KB gzipped, LCP under 2.5s on
  a Slow 4G throttle.

## 8. Assets and licensing

Illustrations are hand-authored SVG. That is the only route to art that is
genuinely unique, crisp at any size, animatable with draw-on, and light enough
to ship.

Prefer procedural texture over downloaded texture — paper grain from an SVG
`feTurbulence` filter is a few hundred bytes and looks better than a JPEG.

If you do source anything externally: **CC0 or public domain only**, and every
asset gets a line in `ASSETS.md` recording source and licence. Public-domain
botanical engravings (Biodiversity Heritage Library, Rawpixel's PD collections)
are excellent *reference* for the old-world engraved line quality — study them,
then draw your own. Never ship a copyrighted stock asset into a client's wedding.
