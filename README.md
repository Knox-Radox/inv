# Advika and Sooraj

A single-link digital wedding invitation. One page, opened on a phone from a
WhatsApp message.

- **The brief** — `docs/design-brief.md` (the client's word; it outranks
  everything else here)
- **The plan** — `docs/design-plan.md` (what was designed, and every deviation
  made while building it)
- **Still open** — `docs/open-questions.md` (three things the couple needs to
  answer; none of them block the build)

## Changing a fact

**Everything a guest reads lives in one file: `content/invitation.ts`.** Nothing
else in the codebase contains a date, a time, an address or a sentence of copy.

To change the reception time, edit one line:

```ts
{
  id: "reception",
  label: "Reception",
  startsAt: "2026-11-28T00:00:00Z", // <- 6:00 PM CST, as a UTC instant
  startDisplay: "6:00 PM",          // <- and what the card prints
  ...
}
```

Two things to know when editing times:

1. **`startsAt` is UTC, not local.** America/Chicago is six hours behind UTC on
   this date, so 6:00 PM there is `T00:00:00Z` the following day. This is
   deliberate: it is what makes the countdown correct for a guest in Chennai and
   one in Dallas at the same moment.
2. **`startDisplay` is what a guest sees.** Change both, or the card and the
   calendar file will disagree.

Everything downstream — the countdown, the schedule, the `.ics`, the Google
Calendar link, the share card — reads from this file. Nothing needs updating
twice.

To add a line of copy about the gap between the ceremony and the reception, set
`day.gapNote`. To enable the sound toggle, set `audio` to a track and add a row
to `ASSETS.md`. Both are `null` on purpose.

## Running it

```
npm install
npm run dev        # localhost:3000
npm run build      # must pass clean before any commit
npm run lint
npx tsc --noEmit
```

### Regenerating the paper

The embossed cotton sheets are baked images. After changing the relief in
`tools/relief.py` or the filters in `components/material/MaterialDefs.tsx`:

```
cd tools && python3 emit_art.py && cd ..
node tools/bake.js && python3 tools/bake-encode.py
```

### Regenerating the illustrations

The SVG geometry is generated, not hand-written. After editing anything in
`tools/`:

```
cd tools && python3 emit_art.py
```

This rewrites `components/art/paths.ts`. Requires Python 3 with `fonttools`
and `brotli` only if you are also re-subsetting fonts.

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The framework is
   detected as Next.js; no build settings need changing.
3. Set one environment variable, **`NEXT_PUBLIC_SITE_URL`**, to the final public
   URL (for example `https://advikaandsooraj.com`). The share card's `og:image`
   must be an absolute URL, and WhatsApp will not follow a relative one.
4. Deploy, then attach the custom domain under **Settings → Domains**.
5. **Check the share card in a real WhatsApp message**, not in a preview tool.
   WhatsApp caches aggressively; if you change the card afterwards you will need
   a fresh URL or a cache-busting query to see the update.

## What has been verified

Measured on the built site, not asserted:

- **Lockout** — four tests: JavaScript disabled, every animation cancelled
  mid-sequence, `prefers-reduced-motion`, and `body` overflow sampled across the
  whole opening. The invitation is reachable and readable in all four.
- **Responsive** — no horizontal scroll at 320, 360, 390, 414, 430, 768, 1024,
  1280, 1440 or 1920px; nor at 400% reflow; nor at 2× and 3× root font size.
- **Contrast** — every rendered text/background pair sampled from the live page
  meets WCAG AA; most reach AAA. Gold is 2.9:1 and therefore carries no
  information anywhere: every gold mark is `aria-hidden`.
- **Keyboard** — every stop has a visible focus ring and a target of at least
  44px.
- **Performance** — the opening holds 60fps at 6× CPU throttle (p95 under
  19 ms) because the embossed paper is baked to images rather than filtered
  live. Photographs and sheets add about 350 KB; the page is still roughly a
  hundredth of the reference sites.
- **Calendar** — the `.ics` parses with a real iCalendar library and resolves to
  08:30 America/Chicago at UTC−06:00.
