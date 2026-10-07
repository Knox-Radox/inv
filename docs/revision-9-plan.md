# Revision 9 — the suite

The family's printed invitation arrived as two Canva PDFs, and with it a list:
an RSVP, travel and hotels, five copy changes, an illustrated envelope, and the
PDFs' borders and colour brought into the page. Twenty decisions were put to the
client before anything was built. They are recorded here because six of them
override `CLAUDE.md` and `docs/design-brief.md`, which are corrected in place.

Branch: `revision-9`, pushed for a Vercel preview. `main` is untouched until it
is merged.

---

## What the client decided

| | Decision |
|---|---|
| Morning event | **Muhurtham, 8:30 – 9:30 AM.** Was "Ceremony, until 10:30 AM". The calendar entry and the countdown's wording follow |
| Names | **"Advika & Sooraj" everywhere** — cover, card, share preview, closing. The `*` in the request was a stray character |
| Dates | **US order throughout**, "Friday, November 27, 2026". The schedule's heading is **"November 27"** |
| Hotels | Each one **opens in Google Maps**; the Wyndham's number is tap-to-call |
| Who replies | **One open link.** Anyone with it types their own name |
| Events | **Each event has its own headcount** |
| Extra blanks | **A note to the couple, names of everyone coming, dietary or allergy notes** |
| Contact | **Phone or email, the guest's choice** — it is what merges a repeat reply |
| The RSVP's form | **A reply card, formal wording, sealed in wax on sending** |
| Reply by | **Friday, October 30** |
| Reading replies | **A passcode-protected page on the site**, with a CSV download |
| Supabase | **Build now against a local Postgres; connect the real project at the end** |
| Colour | **Ivory paper, jewel inks.** Maroon, marigold and kumkum pink arrive as pigment only. One saturated surface: the envelope's liner |
| Envelope | **Fully illustrated.** The photograph is retired |
| Motifs | The mirror-work border, **floral butis, garlands with brass bells**. Not the parrots, not the sari-border bands |
| Bans | Lifted for one thing: **a subtle Ganesha mark with "\|\| Shree Ganeshay Namaha \|\|"**. No shloka. Elephants and painted figures stay out |
| More art | *"Keep it memorable and not too much."* Nothing is added beyond what is listed above |
| Map credit | **Left off**, by the client's choice. Recorded in `ASSETS.md` rather than hidden |
| Haldi | **Nothing about it on the site.** There was nothing, and there is nothing |

Two facts corrected against the PDF rather than taken from it:

- The PDF prints **"County Road 418"**. The venue's own site says 419, and so
  does this one. The PDF is the one to fix.
- The PDF's text is otherwise treated as *art direction only*. The hosts' line,
  the families' names and the shloka are not on the site because the client
  asked for the couple's own wording.

### What this reverses

| Was | Now |
|---|---|
| "There is no RSVP" — the last settled decision still standing | A reply card, a database and a private page |
| Four interactive elements, "if you are building a fifth, stop and ask" | The cover, add-to-calendar, the map, **places to stay, the hotel links, the reply card** |
| "Anything in a new hue" ruled out (`docs/ornament-ideas.md` §7) | Three pigments: arakku, marigold, kumkum |
| Deity imagery banned | One drawn mark, at the head of the card |
| The cover is a photograph (revisions 4–8) | The cover is drawn and painted |
| The map credit is required visible text | Off, at the client's instruction |

---

## The idea

**One suite, three papers.** A wedding invitation in the post is not a card. It
is an outer envelope, the invitation, a details card and a reply card with its
own small envelope. The page already had the first two. Revision 9 finishes the
set and makes the last piece do something:

> The guest opens the couple's envelope. At the end, they seal their own.

The opening and the sealing are the same gesture run forwards and backwards,
with the same drawn flap, the same liner and the same wax. That is the one new
idea in this revision and everything else is in service of it.

```
  cover     painted envelope, full bleed ── tap ──▶ flap lifts, liner shows,
                                                    card rises
  card      ivory sheet in a mirror-work border
              the mark · the names · the line that invites · date · place
              a row of butis at its foot
  field     champagne cloth, the thread on the left datum
              countdown        thoranam, columns, lamps
              November 27      Muhurtham · Reception · the full address
              The place        the map plate
              Travel           the airport, and where to stay
              the reply card   ivory sheet again ── send ──▶ slips into its
                               envelope, flap closes, seal presses
              closing          the note, the signature, the kolam
  bar       Reply    Places to stay    Add to calendar
```

### Tokens

Seven existing, three new. The new ones are **pigments**: they may fill a
flower, a ring, a bead or the liner, and they may not fill a section.

```
--ground       #FBF7F0   ivory, the paper                      unchanged
--ground-deep  #F0E9DB   champagne, the cloth                  unchanged
--sage-deep    #3A5542   display type                          unchanged
--gold         #B08D57   thread, hairlines                     unchanged
--ink          #2E2A24   body copy                             unchanged
--arakku       #74172A   lac maroon: the liner, the mark's line of text,
                         the buti's bloom, error text
--marigold     #D2952C   the border's petals, the garland's bands
--kumkum       #C4175A   the ring round each mirror, the rose in the garland
```

Sampled from the PDFs (`#76161E`–`#7A1836` maroon, `#CC9030` petal, `#CA0D5C`
ring) and pulled a few points toward the page's own warmth. Teal was offered
with the others and is not used: it had no job once the parrots were declined,
and a colour without a job is the accessory to take off.

Type is unchanged: Parfumerie Script and Mrs Eaves, no third role. The
invocation is set in Mrs Eaves, not in a Devanagari-styled Latin face, which
the brief bans and the PDF uses.

### Principles

1. **Colour is pigment, never ground** — except the liner, which is seen for
   two seconds.
2. **The border is embroidery.** The PDF's star-flower border has a mirror at
   the centre of each flower: it is *shisha* work, and the brief's governing
   metaphor has been embroidery since revision 1. It is drawn as stitched
   mirror-work, and it arrives the way beads go onto a string.
3. **Only what the family brought moves.** Unchanged.
4. **Nothing is lifted from the PDF.** Its artwork is Canva stock and its own
   metadata flags AI-generated content. Every mark here is redrawn in this
   page's line-and-wash, from this page's own primitives.

### The generic-plan test

*If this description went to another model, would it arrive somewhere similar?*
"An RSVP form in a card with a success animation" — yes, and that part was
revised: the form is the suite's reply card, typeset as one, and the success
state is not a tick but the guest's own reply going into an envelope under the
couple's seal. "A floral border" — yes; "mirror-work that strings itself on"
is the version only this brief produces.

---

## The work, in order

One concern at a time, each looked at before the next.

### 1. Facts and copy
`content/invitation.ts` only, plus the three places that format a calendar
entry. Names, the inviting line, US dates, Muhurtham and its end time, the
heading, the full address under the schedule, the closing note and signature.

### 2. The pigments and the new pieces
`tools/wash.py` gains sheets for marigold and arakku. `tools/ornament.py` gains
the mirror-work flower, the buti and the bell; the malai gains its coloured
bands. `tools/ganesha.py` draws the mark. Each piece goes through the four
tests in `docs/ornament-ideas.md` §1.

### 3. The card
The mark and its line at the head, the border round the sheet, the butis at the
foot. The jasmine spray and the korvai edge come off the card: with a border on
all four sides they are a second and third frame.

### 4. The cover
`tools/paint.py` bakes the painted sheet, the seal and the liner. The flap is a
polygon in viewport percentages, so one geometry serves every aspect ratio and
`coverGeometry.ts` — 758 generated lines of it — goes. Three bugs die with the
rebuild: the seen-flag that was never read (`localStorage.getItem(undefined)`),
the names doubling in the crossfade (an `h1` rule that the replica's `p` did
not get), and the reduced-motion crossfade that was an instant cut.

### 5. Travel
A section and a control. Copy verbatim from the client. Six hotels, each one
link. "Places to stay" sits beside "Add to calendar" in the bar.

### 6. The RSVP, behind
`supabase/schema.sql`: three tables, row-level security on with no policies,
and three functions only the server's key can call. `app/api/rsvp/route.ts`
validates, hashes the caller's address, and calls one function. Rate limits
live in Postgres, so there is no second service. A daily cron keeps a free
project from pausing.

### 7. The RSVP, in front
The reply card, its states, and the sealing.

### 8. The private page
`/replies`, behind a passcode: two headcounts, every reply, the notes, a CSV.

### 9. Verify, document, push
`tools/verify/` end to end, screenshots at 390 / 430 / 768 / 1440 read rather
than confirmed, reduced motion, and LCP with the element recorded beside it.

---

## The RSVP in detail

### What is asked

```
  The favour of a reply is requested by Friday, October 30

  Name                    ____________________________

  Muhurtham, 8:30 AM      accepts with pleasure / declines with regret
                          number attending        −  2  +

  Reception, 6:00 PM      accepts with pleasure / declines with regret
                          number attending        −  4  +

  Names of those attending   one line per guest beyond the first
  Dietary or allergy notes   optional
  Phone or email             so a second reply replaces the first
  A note for Advika & Sooraj optional

                          Send reply
```

Defaults taken where the client was not asked, each one line to change:

- At most **10** guests per reply, per event.
- The lines for other guests' names are **optional**. A blank line is not an
  error; an elder who gives a number and no names has still replied.
- The reply-by date ends at **midnight Central** on October 30.
- A reply can be **changed** until then, from any device, by sending again with
  the same phone or email. The latest one counts and every earlier one is kept.

### What is stored, and who can read it

Name, phone or email, two numbers, the names, the two notes, and the time. The
caller's IP address is **never stored**. A keyed hash of it is kept for two
days — to count attempts, and so the history can show that a reply was changed
by somebody else — and then erased.

Nothing can be read back through the public site. The page never asks the
database what it holds — a guest's own reply is remembered on their own phone —
so there is no endpoint that could leak one family's answer to another. The
response to a first reply and to a replacement is identical, so the form cannot
be used to test whether a phone number has already replied.

### When the database is not there

A free Supabase project pauses after a week without traffic. Three defences:
a daily cron request; a six-second timeout on every call; and a reply that
fails is kept on the guest's phone and offered again, in words that say what
happened: *"Your reply did not go through. It is saved on this phone."*

---

## What would make this fail

- **The painted envelope looking like the synthesised one that was rejected.**
  Revisions 1–3 failed by imitating material in code. This is not imitation: it
  is a drawing of an envelope, in the hand the client says they love. If it
  starts to look like a rendering of paper, it has gone the wrong way.
- **The border as a sticker.** Sixty identical flowers is a stencil. It needs
  the wash's variation and it needs to sit *in* the paper.
- **Maroon taking over.** The moment it fills anything larger than the liner
  the page stops being ivory and becomes the PDF.
- **The form reading as a form.** Boxes, pills, a blue focus ring. It is a card
  with ruled lines.
- **The sealing as a party trick.** It answers one question — did my reply go?
  — and it should take about as long as that question does.
