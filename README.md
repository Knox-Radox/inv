# Advika & Sooraj

A single-link digital wedding invitation. One page, opened on a phone from a
WhatsApp message: an envelope, the invitation, the day, the place, where to
stay, and a reply card.

- **The brief** — `docs/design-brief.md` (the client's word; it outranks
  everything else here)
- **Where it stands** — `docs/handoff-revision-9.md`, then
  `docs/revision-9-plan.md`
- **Still open** — `docs/open-questions.md`

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

The same file holds:

- **The reply-by date** — `rsvp.closesAt` (the instant replies stop being
  taken, in UTC) and `rsvp.replyByDisplay` (what the card prints). Change both.
- **The hotels** — `travel.hotels`. Each one's Google Maps link is built from
  its own name and address.
- **Every word on the reply card**, including what it says when a reply could
  not be sent.

To add a line of copy about the gap between the Muhurtham and the reception, set
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

The page works without any environment variables. The reply card then says a
reply "did not go through" when one is sent, which is the truth.

## The RSVP

Replies are kept in a free [Supabase](https://supabase.com) project. Setting it
up is five steps and takes about ten minutes. Nothing here costs money.

### 1. Create the project

At supabase.com, **New project**, on the Free plan. Any name; a region in the
United States. It asks for a database password: keep it somewhere, but the site
never uses it.

### 2. Create the tables

In the project's dashboard open **SQL Editor**, choose **New query**, paste in
the whole of [`supabase/schema.sql`](supabase/schema.sql), and press **Run**.
It should say *Success. No rows returned.* It is safe to run twice.

Then run the short check at the very bottom of that file (it is in a comment).
Every column should read `false`: that is the public key being able to do
nothing.

### 3. Copy two values

- **The project's URL** — dashboard, **Integrations → Data API**, under
  *API URL*. It looks like `https://abcdefgh.supabase.co`.
- **The secret key** — **Settings → API Keys**, under *Secret keys*. It starts
  `sb_secret_`. Use the **secret** key, not the publishable one: the
  publishable key is deliberately unable to do anything here.

### 4. Give them to Vercel

In the Vercel project, **Settings → Environment Variables**, add four:

| Name | Value |
|---|---|
| `SUPABASE_URL` | the project's URL |
| `SUPABASE_SECRET_KEY` | the secret key |
| `REPLIES_PASSCODE` | what the family will type to read the replies. Six characters or more |
| `CRON_SECRET` | any long random string, e.g. the output of `openssl rand -hex 24` |

None of them may begin `NEXT_PUBLIC_`. That prefix ships a value to every
guest's browser, and all four of these are secrets.

Then **redeploy**: a deployment only sees the variables that existed when it was
built.

### 5. Try it, then clear it

Open the site, send a reply, and open **`/replies`** with the passcode. The reply
should be there. Before the link goes out to guests, empty the test replies in
the SQL Editor:

```sql
truncate public.rsvp_replies cascade;
truncate public.rsvp_rate;
```

### Reading the replies

`https://<the site>/replies`, with the passcode. Two headcounts — the Muhurtham
and the reception — then every reply, newest first, and **Download as a
spreadsheet** for whoever is talking to the caterer. A household that replies
twice is counted once, by its latest answer; every earlier answer is kept in
`rsvp_history`.

Changing `REPLIES_PASSCODE` in Vercel (and redeploying) signs everybody out.

### Things worth knowing

- **A free Supabase project is paused after a week without activity.**
  `vercel.json` has Vercel call `/api/keepalive` once a day, which runs a real
  query and keeps it awake. That schedule runs on the *production* deployment
  only. If the project is ever paused anyway, Supabase emails the owner, and
  **Restore** in the dashboard brings it back with its data; meanwhile the reply
  card tells guests their reply did not go through and keeps what they typed.
- **Preview deployments are private by default.** A link to a branch preview
  asks a visitor to log in to Vercel. To show a preview to family, change
  **Settings → Deployment Protection**, or use the production URL.
- **What is stored**: the name, the phone or email, the two headcounts, the
  names of the others, the two notes, and the time. A guest's IP address is
  never stored: it is hashed with a secret, and only to count attempts.
- **What can read it**: only the site's server, with the secret key. Nothing a
  guest's browser can reach will read a reply back, and the site does not say
  whether a phone number has already replied.
- `docs/revision-9-rsvp.md` has the rest.

### Working on it locally

`tools/rsvp/local.sh` stands up what Supabase provides — a Postgres with
Supabase's three API roles and PostgREST in front of it — and
`tools/rsvp/test.mjs` runs 46 checks against it and against the site's route:

```
tools/rsvp/local.sh up
tools/rsvp/local.sh env > .env.local       # then add REPLIES_PASSCODE=...
npm run dev
node tools/rsvp/test.mjs http://localhost:3000
```

It needs a local Postgres and the `postgrest` binary; the script's header says
how to point it at them.

## Regenerating the artwork

Nothing drawn on this page is hand-written SVG or a downloaded image. It is
generated by the Python in `tools/`, and the outputs are committed, so none of
this is needed to build or deploy — only to change the art.

```
cd tools
python3 emit_art.py   # geometry: components/art/{paths,ornament,map,motif}.ts,
                      #           app/motif.css, lib/borderTile.ts
python3 paint.py      # the cover: public/cover/{sprigs,wax,liner,card-paper}.webp,
                      #            assets/og/seal.png
python3 wash.py       # the watercolour sheets: public/wash/*.webp
python3 logo.py       # the monogram on the map: public/mark/monogram.webp
cd .. && tools/fonts.sh   # the subset web fonts and the share card's
```

`emit_art.py` needs only the standard library. `paint.py`, `wash.py` and
`logo.py` need `numpy`, `Pillow` and `scipy`; `fonts.sh` needs `fonttools`
and `brotli`. `python3 tools/paint.py --proof <dir>` also writes look-at-me
PNGs of each piece on the page's paper.

| To change | Edit |
|---|---|
| The envelope's printed jasmine, the wax seal, the liner | `tools/paint.py` |
| The border's flower, the butis, the mark of Ganesha | `tools/motif.py` |
| Columns, garlands, lamps, urns, the kolam | `tools/ornament.py`, `tools/kolam.py` |
| The map | `tools/mapplate.py` (from `tools/data/anna-osm.json`) |
| The watercolour's pigments | `tools/wash.py` |

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository. The framework is
   detected as Next.js; no build settings need changing.
3. Set **`NEXT_PUBLIC_SITE_URL`** to the final public URL (for example
   `https://advikaandsooraj.com`). The share card's `og:image` must be an
   absolute URL, and WhatsApp will not follow a relative one. Then the four
   variables in *The RSVP*, above.
4. Deploy, then attach the custom domain under **Settings → Domains**.
5. **Check the share card in a real WhatsApp message**, not in a preview tool.
   WhatsApp caches aggressively; if you change the card afterwards you will need
   a fresh URL or a cache-busting query to see the update.

## What has been verified

`tools/verify/` is a Playwright harness; every number in `docs/` came from it,
measured on the built site. `tools/verify/README.md` lists each check and how
to run it. The current results are in `docs/handoff-revision-9.md`.
