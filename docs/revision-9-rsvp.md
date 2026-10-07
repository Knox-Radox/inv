# Revision 9 — the reply card

"There is no RSVP" was the last decision `CLAUDE.md` still called settled. The
client asked for one outright, and answered twelve questions about it before a
line was written. This is what was built and why; `docs/revision-9-plan.md` has
the decisions in a table.

---

## What a guest does

```
  Your reply                                  (the page's own heading)

  ┌ mirror-work border ─────────────────────────────┐
  │   The favour of a reply is requested by         │
  │          SUNDAY, NOVEMBER 15                    │
  │                                                 │
  │   Name            ___________________________   │
  │                                                 │
  │   Muhurtham, 8:30 AM                            │
  │   (accepts with pleasure)   declines with regret│   ← circled, by a pen
  │   Number attending   ( − )  2  ( + )            │
  │                                                 │
  │   Reception, 6:00 PM          … the same        │
  │                                                 │
  │   Names of those coming with you   one line each│
  │   Dietary or allergy notes, if any              │
  │   Phone or email  ___________________________   │
  │   A note for Advika & Sooraj, if you wish       │
  │                                                 │
  │                 [ Send reply ]                  │
  └─────────────────────────────────────────────────┘
```

It is a reply card and not a form, and the difference is specific: **there is
not a box on it.** Every blank is a ruled line, the notes are ruled paper, and
the answer is given the way a printed reply card is actually filled in — the
guest circles a phrase. The ring is drawn on a stroke at the moment they choose,
which is motion answering something a person did.

The lines for other guests' names appear as the headcount rises: one per person
beyond the one writing. They are optional. An elder who gives a number and no
names has still replied.

### Then it is sealed

The guest opened the couple's envelope to get here. When the server has taken
their reply, a small card with **their own name on it, in the script**, stands
in an envelope of the same printed paper; it goes down past the same maroon
liner; the flap comes over; and the couple's seal is pressed on.

It is the cover run backwards — `components/field/ReplyEnvelope.tsx` uses the
same three painted assets — and it is the one new idea in this revision. It
takes about three seconds, it never starts until the server has said yes, and
under `prefers-reduced-motion` it does not run at all: the envelope is simply
sealed.

A guest who comes back sees it sealed, with what they answered beneath it and
"Change my reply".

---

## Where a reply goes

```
  guest's browser ── POST /api/rsvp ──▶ the site's server (Vercel)
        ▲                                   │  checks it, hashes the sender,
        │  {"ok": true}                     │  calls ONE function with the
        │  and nothing else                 ▼  secret key
        └──────────────────────────  Supabase: rsvp_submit(reply, caller)
                                            │
                                            ▼
                                  rsvp_replies   one row per household
                                  rsvp_history   every version, kept
                                  rsvp_rate      counters, swept after 2 days
```

Three rules hold all of it up.

**1. The public key reaches nothing.** Row-level security is on for all three
tables and there are no policies. The functions are the only way in, and
EXECUTE on each of the four the server calls is granted to `service_role`
alone — the role the *secret* key maps to. The other two are granted to nobody. Postgres grants EXECUTE on every new function to everybody and
Supabase's API roles inherit it, so `supabase/schema.sql` takes that back in so
many words. `tools/rsvp/roles.sql` recreates those permissive defaults on a bare
Postgres precisely so the test has something to prove.

**2. Nothing is read back.** The route answers `{"ok": true}` or a reason, and
that is all it ever says. There is no endpoint that returns a reply. A guest's
own reply is remembered on their own device (`localStorage`), which is why a
returning guest sees it sealed without the page asking the database anything.

**3. A first reply and a replacement get the same answer.** If the response
said which, the form could be used to ask whether a given phone number had
replied.

### One household, one row

`contactKey` in `lib/rsvp/reply.ts` reduces the contact to a key: an email
lower-cased, or a phone number's last ten digits. So `972-555-0123`,
`(972) 555 0123`, `+1 972 555 0123` and `19725550123` are one reply, not four.
The latest answer is the one that counts; every earlier one is in
`rsvp_history`, with a hash of who sent it.

That means a reply can be overwritten by anyone who knows the phone number it
was sent under. For a family's wedding that is the right trade — the
alternative is an elder locked out of changing their own answer from a new
phone — and it is why the history exists: nothing is lost, and a change from a
different sender shows.

### Limits, with no second service

Eight replies in ten minutes and forty in a day from one sender; six hundred an
hour from everybody; five thousand rows in the table, ever. They are counters
in Postgres, bumped inside the same function that takes the reply. The sender
is a keyed hash of the IP address (`lib/rsvp/server.ts`); the address itself is
never sent on or stored, and the hash is erased after two days (`rsvp_sweep`,
which the daily keep-alive also runs, so it goes two days after the *last*
reply and not only when the next one arrives).

There used to be a field no person could see or reach, and a reply that
arrived with it filled in was told it had been sent and was thrown away.
Browsers and password managers fill hidden fields, so a real guest could have
been told "sent" when nothing was kept. It was taken out in October 2026,
before the link went out; the limits above are what stand in front of a script.

---

## Nothing is lost

Added in October 2026, before the link went out, and all of it in
`supabase/schema.sql`:

- **Every version is written by the database itself.** A trigger on
  `rsvp_replies` writes each insert and update to `rsvp_history`, so a reply
  changed by hand in Supabase's table editor is recorded too, marked
  `by hand`, with a new revision number. `rsvp_submit` only says who sent it.
- **Nothing can be deleted by accident.** A DELETE or TRUNCATE on either table
  is refused, from anywhere, and a version in the history can never be
  rewritten. The only changes allowed are the two the database makes itself:
  the sender's hash blanked after two days, and the link to a reply that was
  deliberately removed.
- **Removing something on purpose says so first**: `set local rsvp.deliberate
  = 'yes'` in the same transaction (README § The RSVP, step 5). Even then the
  removed reply's versions stay in the history. The link from a version to its
  reply was ON DELETE CASCADE until this change, so one delete in the table
  editor would have taken every version with it.
- **The family can take a copy of everything**: `/replies` has a second
  download, every version of every reply, oldest first, with the one that
  counts marked.
- **The page says when the guards are off.** `rsvp_list` reports whether all
  seven triggers are in place and enabled; `/replies` shows a warning when
  they are not, and the keep-alive logs one.
- **The card tries twice.** When a reply could not get through — a dropped
  connection, a database slow to answer — the card waits a moment and sends it
  once more before asking the guest to. A reply sent twice is one reply.

Supabase keeps **no backups on the free plan**. Its own advice is to export
regularly; the second download is that export. The Pro plan keeps daily
backups for seven days and restores them from the dashboard.

---

## When something is wrong

| What | What the guest sees | What happens to the reply |
|---|---|---|
| A line is blank or malformed | That line marked, in words; focus goes to the first | Nothing sent |
| No network, the database paused, a timeout | Tried once more by itself; if that fails too, "Your reply did not go through. It is saved on this device…" | Kept on the device; the same button sends it again |
| Too many from one connection | Asked to wait ten minutes | Kept on the device |
| After October 30 | "Replies closed on Friday, October 30." | The server refuses, whatever the browser's clock says |
| JavaScript never loaded | A plain form that posts itself, and a plain "Reply sent" | Stored the same way |
| Environment variables not set | The same "did not go through" | Kept on the device |

A free Supabase project **pauses after a week without activity**, and a
wedding's replies arrive in a burst and stop. `vercel.json` has Vercel call
`/api/keepalive` three times a day, which runs a real query through the same
door: Supabase counts "a few requests to the database each day" as activity,
and Vercel's free plan runs each scheduled job at most once a day.
A paused project answers HTTP 540 or does not resolve at all; both are
"unavailable" to the route, and the guest is told the truth.

---

## The family's page

`/replies`, behind `REPLIES_PASSCODE`. Two headcounts, every reply, the dietary
notes, the notes to the couple, and two CSVs: the replies as they stand, and
every version of every reply. It is the only page that is rendered per request
and the only code that reads the database.

- The passcode is compared as a digest, in constant time. Every attempt is
  counted *before* it is looked at, and the ninth in ten minutes is refused.
- The cookie holds a signature over the passcode, not the passcode. Changing
  the passcode signs everyone out.
- Every cell of the CSV that a guest wrote is made safe for a spreadsheet: a
  note beginning `=` is text, not a formula.

Its words are not in `content/invitation.ts`. That file is every string a
*guest* can see; this page is never linked from the invitation.

---

## How it is tested

`tools/rsvp/test.mjs` — 64 checks. It runs against PostgREST 14, which is what
Supabase runs, on a Postgres given Supabase's roles and Supabase's defaults.

- With no key, and with the public key: cannot submit, list, touch the counters
  or read any of the three tables.
- With the secret key: a reply is taken; the same phone again replaces it and
  answers identically; a decline is a reply; the totals add up.
- Nine things the database refuses even from its own server, including a key
  with SQL in it.
- The ninth reply in ten minutes is turned away, and another sender is not.
- Two days on, the keep-alive has erased the sender's hash from the history
  and left the reply.
- Nothing is lost: a delete, a truncate or a rewrite of either table is
  refused and nothing goes; an edit by hand is a new revision and goes into
  the history marked as one; a deliberate removal works, keeps its versions,
  and the next delete is refused again; every version can be listed with the
  secret key and with nothing else.
- Through the site's route: field-by-field refusals, an oversized body, a
  reply kept even with a stray field filled in, a post from another origin, a
  plain form post, the rate limit passed on as 429, and that the history holds
  a hash where an address would be.

`tools/verify/reply.js` drives the card itself in a browser.

---

## The numeral — a bug in the font, found here

The guest count rendered as the top arc of a `2` and nothing else.

Mrs Eaves Roman carries its descender with the wrong sign:
`hhea.descent = +250` and `sTypoDescender = +250`, where both should be
negative. (So do the Bold, Italic and ligature cuts in `assets/fonts/`. The
Small Caps cut does not: it says −267, correctly.) A browser therefore believes the face is 367 units tall instead of
867 — about a third of an em. Ordinary text overflows that box and nobody ever
sees; an `<input>` *clips* to it, and at `line-height: 1` that left five pixels
of digit.

It has always been true of this page's body face and has never shown, because
until this revision the page had no inputs.

**What was done:** the numeral has a taller line box, which gives the glyph
room, and it is set in the small-caps face — Mrs Eaves Roman has only old-style
figures, and its old-style one is a small capital I, so ten guests read "IO".
The text inputs were never affected: at `line-height: 1.5` their line box is
already tall enough.

**What was not done:** correcting the sign in `tools/fonts.sh`. It is the right
fix, and it moves the baseline of every line of Mrs Eaves on the page up by a
quarter of an em, which changes the look of all of it. That is a decision for
its own revision, with the whole page re-measured — see
`docs/open-questions.md`.

---

## What was taken as a default, not asked

Each is one line to change.

| | Value | Where |
|---|---|---|
| Guests per reply, per event | 10 | `LIMITS.guests` in `lib/rsvp/reply.ts`, and the two CHECKs in `supabase/schema.sql` |
| Other guests' names | optional | `check()` in `lib/rsvp/reply.ts` |
| Replies close | midnight Central (CDT) at the end of Friday, October 30 | `rsvp.closesAt` in `content/invitation.ts` |
| A reply can be changed | until then, from any device | — |
