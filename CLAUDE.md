# CLAUDE.md — Advika & Sooraj wedding invitation

## Current state — read before anything else

Revision 9 is the suite. The family's printed invitation arrived as two Canva
PDFs, and with it the client reversed more in one message than in the eight
revisions before it. Twenty decisions were put to them first; all twenty are in
`docs/revision-9-plan.md`. Six things this file used to say the opposite of,
each corrected in place below:

- **There is an RSVP.** A reply card in the formal register of a printed one,
  sealed in wax when it is sent; Supabase behind it; `/replies` for the family.
- **The cover is drawn, not photographed.** The envelope, its liner and its
  seal are painted by `tools/paint.py` in the page's own line-and-wash. The
  photograph, and `coverGeometry.ts`, are gone.
- **Three pigments joined the palette** — arakku, marigold, kumkum — as
  *pigment*: a flower, a ring, a bead, a line of type. Never a section's
  ground. The envelope's liner is the one exception.
- **One mark of Ganesha**, at the head of the card, with its one line. The ban
  on deity imagery is lifted for that and nothing else.
- **The page has travel and hotels**, and the bar leads to them.
- **The map's OpenStreetMap credit is off**, at the client's instruction. That
  is a licence obligation unmet, and `ASSETS.md` says so plainly.

The idea that holds it together: **the guest opens the couple's envelope, and
at the end they seal their own.** The opening and the sealing are the same
gesture run forwards and backwards, with the same paper, liner and wax.

The lesson is revision 8's again, twice over. The maroon liner — the one
saturated surface the whole colour scheme is organised around — was on screen
for *no frames*, with every timing correct, until a contact sheet showed it.
And the envelope's edge ran forty pixels ahead of its own cut, because a
transform is composited and a `clip-path` is not. **Look at the frames.**

**Since revision 9, at the client's request (October 2026):** the first
moment is called "Wedding" on the page (it is still `muhurtham` in the ids, the
database and the family's print); the reply card's heading and the bar's first
button say "RSVP", the heading set in Mrs Eaves capitals because the script
cannot set four capitals in a row; the heading over the schedule carries its
weekday; and the one photograph of the couple sits at the close, above their
note, laid into the paper by `couple()` in `tools/paint.py`. Its original is
deliberately not in the repository: `ASSETS.md` § The couple's photograph.

**Read `docs/handoff-revision-9.md` first**, then `docs/revision-9-plan.md`,
`docs/revision-9-cover.md` and `docs/revision-9-rsvp.md`.

Revision 8 was the photographed cover, which revision 9 retired; what it
learned still stands. The client looked at it against the reference and
returned five faults, and the lesson in all of them is one line long:
**a measurement of the right number is not a look at the result.**

The fold "did not work" because `.frame` carried `transform-style: preserve-3d`,
which paints children by depth instead of z-index — so the flap sat at negative
z the moment it rotated and animated perfectly, out of sight. Two revisions of
measuring its transform never caught it, because the transform was always
correct. The seal was blurred because it was a *repair*: the code blurred a
stock impression out of the photographed wax and pressed type back in, and a
blur wide enough to erase the one is wide enough to erase the other. The
"unnatural semicircle" was not the patch everyone would blame — it was the
flap's own cut, wrapped around a circle a quarter wider than the wax.

`docs/revision-8-cover.md` has the rest — its "what went wrong on the way"
section is the most useful part, and it is about a cover that no longer exists
only in the sense that the next one made the same kind of mistake.

LCP failed through revisions 5 to 8 because the cover photograph was last in a
queue behind the fonts and the script. The cover is no longer an image that has
to arrive. If you re-measure it, record the LCP *element* beside the number —
the harness was bimodal, and the figure recorded for revision 5 was the card,
not the cover. `docs/handoff-revision-9.md` has the current numbers.

Revision 7 is the map and the kolam.

The client rejected the hand-drawn plate in one line — *"the hand drawn map is
of no use"* — and it was worse than useless, because its geography was invented.
Every line on it is now traced from OpenStreetMap around the venue, and the
whole plate is a link that opens Google Maps. It reverses two settled decisions
below, and both are corrected in place rather than left contradicting the build.

The kolam was an eight-petal rosette in a scalloped ring: a pretty mandala, and
not a kolam. It is now a real **sikku** kolam on fifty-three pulli — one
unbroken line looping around every one of them and closing on its own start,
which is what an *infinite* kolam is and why it belongs at the end of a wedding
invitation. **Read `docs/revision-7-map.md` and `docs/revision-7-kolam.md`.**

Revision 6 is done. The client rejected the first builds against La Maison
Dorée as looking fake, and their feedback supersedes parts of the brief below.
The cause was synthesising materials in code; the cover is a photograph, and as
of revision 5 it is a full-bleed macro of one. The type is the reference's own
two faces, Parfumerie Script and Mrs Eaves. Revision 6 added the ornament
programme — columns, a thoranam, lamps, a malai, banana stems, a jasmine bough,
urns and a kolam — in a drawn-line-plus-watercolour-wash technique.

After the revision 9 documents: `docs/revision-8-cover.md`,
`docs/handoff-revision-7.md` and `docs/revision-7-map.md`, then
`docs/handoff-revision-6.md` and `docs/revision-6-ornament.md`.
The client's benchmark is captured in **`docs/reference/maison-doree/`** — look
at it before designing anything. The verification harness is in `tools/verify/`;
every number in the docs came from it and every change should go back through
it. One number in it was wrong and is now explained rather than merely flagged:
the LCP figure recorded for revision 5 timed the invitation card, not the cover,
because it was captured on a run where the envelope was not armed. See
`docs/revision-8-cover.md` § LCP.

## What this is

A single-link digital wedding invitation. One page, opened on a phone from a
WhatsApp message, by family and friends aged 8 to 85. It is an *invitation*, not
a wedding website. The full brief is `docs/design-brief.md` — read it before any
design or content decision. Read `docs/design-plan.md` before any code decision.

## Design authority

`docs/design-brief.md` is the client's word and it outranks your instincts. Where
the brief pins a visual direction, follow it exactly — including where it asks
for something you would otherwise treat as a default to avoid. In particular the
warm ivory ground and the serif display are a client mandate, and the anti-slop
clause in §6 of the brief explains where you are expected to earn distinctiveness
instead.

Invoke the `frontend-design` skill for all UI work.

## Stack

- Next.js (App Router) + TypeScript, strict mode
- Tailwind v4 with the palette exposed as CSS custom properties, not hard-coded
  hex values scattered through components
- Plain CSS for all motion. `motion/react` was planned for orchestration and
  never installed; nothing here has needed it
- Supabase (Postgres) for the RSVP, reached **only from the server**, with
  plain `fetch` to its REST API and only ever to call a function. No
  supabase-js, and no database key with a `NEXT_PUBLIC_` name
- `next/font` with self-hosted, subset faces. Cut by `tools/fonts.sh` from the
  originals in `assets/fonts/` — never `public/`, which serves what it holds
- `next/og` for the share card
- Deployed to Vercel
- No component library, no UI kit, no icon pack. Every mark on this page is drawn
  for this page.

## Commands

```
npm run dev        # localhost:3000
npm run build      # must pass clean before any commit
npm run lint
npx tsc --noEmit
```

## Content

`content/invitation.ts` is the single source of truth for every fact: names,
date, times, venue, address, timezone, schedule entries, copy strings. No literal
dates, times, or addresses anywhere else in the codebase. Changing the reception
time must be a one-line edit in that file.

The facts are real. Do not invent details, add a fictional "our story", fabricate
a hashtag, or pad the page with sections nobody asked for.

**Nothing in this section is settled forever, and it used to say otherwise.**
It listed two client decisions as "settled and not to be revisited". The client
has since reversed both, after seeing them built, and a rule that has been
wrong every time it was tested is not a rule. Treat what follows as the current
state.

**There is an RSVP.** "There is no RSVP — no form, no headcount, no 'let us
know', no contact block" held for eight revisions and was reversed outright at
revision 9. It is a reply card in the formal register of a printed one, sealed
in wax when it is sent, with a Supabase database behind it and a
passcode-protected page at `/replies` for the family. Read
`docs/revision-9-plan.md` § The RSVP in detail before touching any of it, and
note two things it must never do: read a reply back to a browser, or say
whether a phone number has already replied.

**The map is real and it is a link.** It was "purely visual — no Open in Maps
button, no embed, no deep link, no interactivity", and the client reversed it at
revision 7 after seeing it built that way. The map is traced from real
OpenStreetMap geometry and the whole plate opens Google Maps. It is still a
drawing and it is still hand-weighted line. No embed, no iframe and no tile
provider still hold — nothing on the page fetches a map at runtime.

What a guest can act on, as of revision 9: the cover (the whole of it opens the
envelope — there is no label and no visible skip link), the bar's three
controls (RSVP, Places to stay, and Add to calendar, which opens onto two
calendars), the map plate, the six hotel links and the one phone number, and the
reply card. There is still no contact block. If you are adding a new *kind* of
control, stop and ask.

## Motion budget

**Lifted by the client in revision 6.** The old rule — one hero sequence, at
most two scroll-linked draw-ons, ~150 KB of JS — is superseded by:
every ornament may draw itself on as the guest reaches it, and LCP under 2.5 s
on Slow 4G is the only hard line. What survives, and is still enforced:

- One orchestrated hero sequence (the envelope). Still the boldest thing here.
- Micro-interactions only in response to a real user action.
- No fade-and-slide-up entrance on every section. No hover transition on every
  card.
- Ambient motion belongs only to things the family carried in — the garlands
  and the lamp flames. Stone does not move. It runs only while on screen.
- `prefers-reduced-motion: reduce` honoured everywhere, and the reduced version
  must still look designed.
- Every number goes back through `tools/verify/`. Scroll pacing is now part of
  that and was not before.

## Hard bans

- `#F4F1EA` or any near-neighbour as the ground colour
- Terracotta / warm-clay accents, especially anything near `#D97757`
- Arakku, marigold or kumkum **as a ground**. Revision 9 added them as
  pigments — they may fill a flower, a ring, a bead or a line of type — and the
  page is still ivory. The envelope's liner is the one surface that is maroon
  from edge to edge, and it is seen for about a second. Teal was offered with
  the others and deliberately not used: it had no job
- Tinted near-blacks (`#111`, `#0B0B0B`) — the darkest value is warm brown or
  deep sage
- ALL-CAPS tracked-out eyebrow labels
- Meta strings joined with middle dots
- `WORD — fragment` with a spaced em dash
- Monospace for small data labels
- `→` appended to link or button text
- One word of a headline accented in a different colour, weight, or italic
- Numbered markers on anything that is not genuinely a sequence (the schedule is;
  nothing else is)
- Playfair Display, Cormorant Garamond, Great Vibes, Inter, Montserrat, Poppins,
  system font stacks. The page's two faces are Parfumerie Script (display) and
  Mrs Eaves (everything else) and there is no third role
- Christian or church iconography of any kind
- Deity imagery, **except the one mark of Ganesha** at the head of the card
  with "|| Shree Ganeshay Namaha ||" beneath it, which the client asked for in
  revision 9 in the words "subtle, tasteful and beautiful". No shloka, no
  second mark, no figure. Asked in the same breath and left banned: elephants,
  painted figures and scenes, parrots
- A Devanagari-styled Latin face. The family's printed invitation uses one for
  the invocation; here it is Mrs Eaves
- Any copyrighted or unlicensed third-party asset — **including anything from
  the family's Canva PDFs**, whose artwork is stock and whose own metadata
  flags generated content. They were art direction; every motif taken from
  them is redrawn from this page's primitives. The one third-party thing on
  the page is the OpenStreetMap geometry the map plate is traced from, which is
  ODbL. Its licence requires a visible credit, and **that credit is currently
  off at the client's instruction** — see `ASSETS.md`. Do not add a second
  OSM-derived drawing while it is
- A box on the reply card. Every blank is a ruled line; that is the whole
  difference between a reply card and a form
- Reading a reply back to a browser, or answering a first reply differently
  from a replacement. See `docs/revision-9-rsvp.md` § Where a reply goes
- Inventing geography. Every road, creek and town on the plate comes from
  `tools/data/anna-osm.json`; if something is not in the extract it is not drawn

## Quality floor

Responsive 320–1920px, mobile-first. 200% zoom and iOS Dynamic Type survivable.
Visible keyboard focus. Semantic HTML that reads correctly with JS off. WCAG AA
contrast. No horizontal scroll, no CLS, no tap target under 44px. Self-hosted
subset fonts, inline SVG over raster, JS under ~150KB gzipped, LCP under 2.5s on
a Slow 4G throttle.

## Verification

You are not done with a component until you have looked at it. Screenshot at
390px, 430px, 768px, and 1440px before calling anything complete, and read your
own screenshots critically rather than confirming they rendered. Run
`prefers-reduced-motion` at least once per motion feature.

**For anything that moves, look at the frames, not at the timings.** A contact
sheet of the opening every 250 ms is what found the liner on screen for no
frames and the envelope's edge running ahead of its cut; both had every number
right.

Run `npm run build` and `npx tsc --noEmit` clean before every commit.

The RSVP has its own tests: `tools/rsvp/local.sh up`, then
`node tools/rsvp/test.mjs <url>`. They run against PostgREST with Supabase's
roles and Supabase's permissive defaults recreated, because a test database
that starts locked proves nothing. Run them after touching
`supabase/schema.sql`, `lib/rsvp/` or `app/api/rsvp/`.

## Working style

- Plan before building. Write plans to `docs/` so they can be reviewed.
- Open questions go in `docs/open-questions.md` rather than being resolved by
  guessing. Guessing about someone's wedding is not acceptable.
- Commit at logical checkpoints with real messages. Do not batch the whole build
  into one commit.
- One concern at a time. Finish and verify the envelope before starting the map.
- If an approach turns out mediocre, say so and propose scrapping it rather than
  patching it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
