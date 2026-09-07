# CLAUDE.md — Advika & Sooraj wedding invitation

## Current state — read before anything else

Revision 8 is the cover. The client looked at it against the reference and
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

The photograph now carries **no wax at all**: the paper is reconstructed and
blind-embossed edge to edge, and the wax is a sprite that rides inside the flap.
**Read `docs/revision-8-cover.md`** — including its "what went wrong on the way"
section, which is the most useful part.

One number still fails and failed before: **LCP**. It is put to the client in
`docs/open-questions.md` #4 rather than fixed, because every fix is a trade they
should make. If you re-measure it, check the reported LCP *element* first — the
harness is bimodal and the figure recorded for revision 5 is the card, not the
cover.

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

**Start with `docs/revision-8-cover.md`**, then `docs/handoff-revision-7.md`
and `docs/revision-7-map.md`, then `docs/handoff-revision-6.md` and
`docs/revision-6-ornament.md`.
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
- `motion/react` for orchestration; plain CSS for anything CSS can do alone
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

One client decision that is settled and not to be revisited:
- **There is no RSVP.** No form, no headcount, no "let us know", no contact block.

**The map used to be the second.** It was "purely visual — no Open in Maps
button, no embed, no deep link, no interactivity", and the client reversed it at
revision 7 after seeing it built that way. The map is now traced from real
OpenStreetMap geometry and the whole plate is a link that opens Google Maps. It
is still a drawing and it is still hand-weighted line: what changed is that the
geography is true and the plate is useful. No embed, no iframe and no tile
provider still hold — nothing on the page fetches a map at runtime.

The only interactive elements on the entire page are: the cover itself (the
whole of it opens the envelope — there is no label and no visible skip link),
the sound toggle, add-to-calendar, and the map plate. If you are building a
fifth, stop and ask.

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
- Any copyrighted or unlicensed third-party asset. The one third-party thing on
  the page is the OpenStreetMap geometry the map plate is traced from, which is
  ODbL and carries its credit as visible text — see `ASSETS.md`
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

Run `npm run build` and `npx tsc --noEmit` clean before every commit.

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
