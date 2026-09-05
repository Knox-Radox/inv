# CLAUDE.md — Advika & Sooraj wedding invitation

## Current state — read before anything else

Revision 4 is in progress. The client rejected the first two builds against
La Maison Dorée, both times as looking fake, and their feedback supersedes
parts of the brief below. The cause both times was synthesising materials in
code; the cover is now a photograph.

**Start with `docs/handoff-revision-4.md`.** The client's benchmark is captured
in **`docs/reference/maison-doree/`** — look at it before designing anything. The verification harness is in
`tools/verify/`; every number in the docs came from it and every change should
go back through it.

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
- `next/font` with self-hosted, subset Google Fonts
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

Two client decisions that are settled and not to be revisited:
- **There is no RSVP.** No form, no headcount, no "let us know", no contact block.
- **The map is purely visual.** A hand-drawn illustration only. No Open in Maps
  button, no embed, no iframe, no deep link, no tile provider, no interactivity.

The only interactive elements on the entire page are: the envelope seal, the
sound toggle, and add-to-calendar. If you are building a fourth, stop and ask.

## Motion budget

Enforced, not aspirational:

- One orchestrated hero sequence (the envelope). Nearly the whole budget.
- At most two scroll-linked SVG stitch draw-ons in the entire page.
- Micro-interactions only in response to a real user action.
- No fade-and-slide-up entrance on every section. No hover transition on every
  card.
- `prefers-reduced-motion: reduce` honoured everywhere, and the reduced version
  must still look designed.

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
  system font stacks
- Christian or church iconography of any kind
- Any copyrighted or unlicensed third-party asset

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
