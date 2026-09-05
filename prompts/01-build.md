# Prompt 01 — Build

Paste this once you have read `docs/design-plan.md` and are happy with it. Edit
the plan file directly first if you want changes — Claude will follow the file,
not your memory of the conversation.

---

The plan is approved. Build it, following `docs/design-plan.md` exactly. If you
find yourself wanting to deviate, say so and ask rather than quietly diverging —
the plan was reviewed and the deviation has not been.

Work through the phases below in order. **After each phase: build clean,
screenshot at 390px and 1440px, look at the screenshots critically, then commit.**
Do not run two phases together. Do not proceed past a phase whose screenshots you
have not actually examined.

Watch your CSS specificity as you go. Type-based selectors and element-based
selectors cancelling each other out is the classic failure here, and it shows up
first as section padding that silently stops applying.

### Phase 1 — Foundation

Next.js App Router, TypeScript strict, Tailwind v4. Palette as CSS custom
properties. Type scale as the clamp() values from the plan. `next/font` with
self-hosted subset fonts. `content/invitation.ts` as the typed single source of
truth for every fact and every string, structured so the two events read as one
day at one venue rather than two independent entries. Paper texture via
`feTurbulence`.

Verify: a bare page renders the correct ivory, the display face loads, no layout
shift, no font flash.

### Phase 2 — The illustration set

Hand-author every SVG in the plan's inventory before you build the sections that
contain them. Doing the art first stops the layout from silently redesigning the
art to fit.

For each one: correct `viewBox`, no fixed pixel dimensions, `currentColor` or a
token for stroke, decorative ones `aria-hidden`, meaningful ones titled. Build
the draw-on mechanic once as a reusable primitive rather than reimplementing
`stroke-dasharray` per illustration.

The wax seal is the hardest object in the piece and deserves disproportionate
attention. It must read as *pressed into wax*: irregular perimeter, a rim where
the wax pooled, a debossed impression with light from one consistent direction.
Solve it with gradients and inner shadow inside the SVG. A CSS `box-shadow`
under a flat circle will look like a sticker and will undermine the whole page.

Verify: render every illustration on a test page at three sizes. Look at them.
Any that reads as printed rather than stitched goes back.

### Phase 3 — The envelope

The hero sequence, to the beat-by-beat timeline in the plan. This is where the
budget is spent, so it is worth taking apart and rebuilding if the first version
is merely fine.

Required behaviour:
- Tap the seal to open. That tap is a user gesture, so it is also the only
  correct moment to start audio, if opted in.
- Once per device via `localStorage`, with a discreet replay.
- A visible skip affordance.
- Under `prefers-reduced-motion`, resolves near-instantly with a gentle
  cross-fade, and still looks designed.
- If JS fails entirely, the invitation content is present and readable.

Verify: watch it at 390px on a throttled CPU. If it stutters, it is not luxurious,
and dropping a frame here costs more than any other bug in the project.

### Phase 4 — The invitation body

Names, invitation line, date, venue, closing note. The letterpress moment.
Generous margins, restrained ornament, one moment of gold.

Write the copy yourself, in a plain sincere register. No exclamation marks. No
"we can't wait to celebrate with you". Short.

### Phase 5 — Countdown, schedule, location

**Countdown** to `2026-11-27T08:30:00−06:00`, computed against a real timezone so
it is simultaneously correct for a guest in Chennai and one in Dallas. Never
parse a naive date string. Degrades gracefully once the date passes — decide what
it says on the day and after, and make it something you would be happy for the
couple to see.

**Schedule**: ceremony 8:30 AM, reception 6:00 PM, same day, same venue. Do not
print the address against both entries — that makes one day at one venue read as
two events in two places.

**Location**: the hand-drawn illustrated map, plus the full address as selectable
text beneath it. **No Open in Maps button, no embed, no iframe, no deep link, no
interactivity** — the map is a drawn object and nothing else. Since it carries no
navigation job, it has to carry a decorative one, so hold it to the same standard
as the seal. A generic vector road diagram with a pin dropped on it will read as
a placeholder and will be the weakest thing on the page.

### Phase 6 — Controls and the share card

Add-to-calendar producing a valid `.ics` with correct `VTIMEZONE`, plus a Google
Calendar template link. Validate the `.ics` actually imports into both Apple
Calendar and Google Calendar rather than assuming the string is well-formed.

Sound toggle: muted by default, never autoplaying, discreet, one-handed
reachable, and honest about its state.

The share card: 1200×630 via `next/og`, using the real typefaces and the
monogram. Plus `og:image:alt`, `theme-color`, and a title that survives WhatsApp
truncation. Preview it — this is the first thing most guests will see.

### Phase 7 — The pass nobody does

- Every viewport 320–1920. 200% zoom. iOS Dynamic Type at large.
- Keyboard through the entire page; focus visible at every stop.
- Screen reader pass on the invitation content.
- Contrast-check every text pairing. Gold on ivory is the likely failure; if a
  gold element fails, it is decorative and must be `aria-hidden`, not text.
- `prefers-reduced-motion` on, once per motion feature.
- Lighthouse on mobile with Slow 4G throttling. LCP under 2.5s, CLS zero, JS
  under ~150KB gzipped.
- `ASSETS.md` listing any external asset with its licence.
- `README.md` covering local dev, deploy, and — most importantly — how a
  non-developer changes the date or the reception time.

Then give me the Vercel deploy steps and a short list of what you would improve
with another day on it.
