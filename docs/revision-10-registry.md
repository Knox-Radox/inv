# Revision 10: the registry

A wish list for guests who want one, on its own page, `/registry`. Asked for in
October 2026; every decision below was put to the client first, and the answers
are recorded as they were given.

## What was decided, and by whom

| Question | Answer |
|---|---|
| Can a guest say "I'll give this"? | Yes, anonymously. No name is asked or kept. |
| What do the gifts look like? | The shop's photograph exactly as the shop has it. Not laid into the paper. |
| Where does it live? | Its own page. The invitation carries one plain line, "Our registry", under the signature. The bottom bar is unchanged. |
| How are gifts added? | A manual form: name, link, photo, price, a line. No scraping of a shop's page. |
| Where do the photos come from? | Either a pasted address, or an uploaded file. |
| Cash gifts | **A note, no mechanism.** No account, handle, QR code or button. See below. |
| After a gift is chosen | Dimmed, "Already chosen". The guest who chose it can undo it on that phone. |
| Prices | Shown, in US dollars, when the family fills one in. |
| Delivery address | None on the page. |
| Order | One list, in the order the family arranges. Chosen gifts sink below the free ones. |
| Removing a gift | Archive. Nothing is deleted. |
| Passcode | The same as `/replies`, and the same sign-in. |

The note about money is the whole of the cash-gift feature, as the client put it:
a note is enough. It reads:

> Your presence is the gift we most wish for. Should you wish to give something
> more, a gift of money is as gratefully received as anything below, and this
> list is here only if it helps.

It is in `content/invitation.ts` under `registry.welcome`, and it is in the page
itself, not the database, so it is there when the database is not. It does not
say what the money is for: nothing on this site says where the couple will live,
and nothing may be invented about their lives.

## What it is made of

- `supabase/registry.sql`: two tables (`registry_gifts`, `registry_log`) and six
  functions, run after `supabase/schema.sql`, which it borrows the rate limiter
  from. Same rules as the replies: row-level security with no policies,
  `EXECUTE` granted to `service_role` alone, so the public key reaches nothing.
  A bucket, `registry`, for uploaded photographs, made at the foot of the file
  (public to read; 1.5 MB; JPEG, PNG or WebP only).
- `app/registry/page.tsx` and `components/registry/RegistryList.tsx`: the page.
- `app/api/registry/claim/route.ts`: the one thing a guest's browser writes.
- `app/replies/registry/`: the family's page, and the two form posts behind it
  (`save`, `act`). Under `/replies` so the existing cookie opens it.
- `lib/registry/gift.ts`: what a gift is and what is acceptable, shared by the
  form and the route.
- `storeImage` in `lib/rsvp/server.ts`: the one place the site writes to Storage.

## How a choice works without asking anybody who they are

The guest's browser makes 32 random bytes when it chooses a gift and keeps them
in local storage. The site hashes them (SHA-256) and the database keeps only the
hash. The same phone can therefore take the choice back; no other can, and the
database cannot be used to do it either. A choice a guest cannot undo (a new
phone, cleared storage) is the family's to release: **Let go of the choice** on
their page.

The page never says who chose a gift, and neither does the family's page: only
that a gift was chosen, and when. The log records `claimed`, `taken back by the
guest`, `released by the family` and the rest, with no identity.

Two guests choosing the same gift at the same moment is settled by one `UPDATE
… WHERE claimed_at IS NULL`: the second gets `taken`, and the card tells them so
and goes quiet.

## Nothing is lost

As for replies: `DELETE` and `TRUNCATE` on either table are refused, the log
cannot be edited, and a gift taken off the page is archived. To remove one on
purpose, say so in the same transaction (`set local registry.deliberate =
'yes'`); the file's header shows how. Its log lines stay.

## The free tiers

**Supabase.** About 20 kB of rows for a hundred gifts. Each guest's visit is one
small function call; each choice is another. Uploaded photographs are resized in
the family's browser to 900px on the long side before they are sent (a phone
photograph is 3 to 8 MB), so a gift costs about 50 to 400 kB of the 1 GB of
Storage, and are served with a year's `Cache-Control`. The daily keep-alive
already calls the database, which is what stops a free project pausing.

**Vercel.** `/registry` is rendered per request, because what it says changes as
gifts are chosen and a cached copy would show a free gift that someone had just
taken. That is one function invocation per visit, well inside the Hobby plan.
Shop photographs are plain `<img>` tags and never go through Vercel's image
optimisation, which has a source-image quota that a list of arbitrary shops'
photographs would use up.

## What to know before relying on it

- **The photographs are the shops'.** A pasted address is a link to the shop's
  own file, shown as a shop's own affiliate or review page would show it. It is
  not in the repository and not served from this site. A shop can change or
  remove it, and then the gift shows a blank of paper with its first letter. The
  family's form says so and offers the upload instead. An uploaded picture is
  the family's own responsibility to have the right to use; the page cannot
  check.
- **A choice is a courtesy, not a purchase.** Nothing checks that a guest who
  chose a gift bought it, and the family can let go of any choice.
- **Anyone with the link can choose a gift.** The rate limits (20 attempts in ten
  minutes and 60 a day from one sender, 1,500 an hour from everybody) stop a
  script, not a determined person with many phones, and the family can release
  any choice. Nothing is private about the registry.
- **A guest with JavaScript off** sees the list and the links to each shop; the
  "I'll give this" button is hidden, because it could do nothing without script.

## Tests

`tools/rsvp/registry.test.mjs`, against the same local stack as the RSVP's:

```
tools/rsvp/local.sh up
node tools/rsvp/registry.test.mjs                        # the database's own rules
node tools/rsvp/registry.test.mjs http://localhost:3000  # and the site's route
```

It covers: the public key reaching nothing, every refusal the constraints make,
order and sinking, double choice, undo with the wrong and right token, the
family's actions, archive and restore, `DELETE`/`TRUNCATE`/log edits being
refused and the deliberate removal working, and the rate limit. The Storage
upload is not in it, because a bare PostgREST has no Storage; it was checked
against a stub that recorded the request (a `POST` to
`/storage/v1/object/registry/<uuid>.jpg`, `image/jpeg`, the key in `apikey`, a
year's cache, `x-upsert: false`, and the bytes starting `ffd8ff`). Run it once
against the real project after setting it up.

Looked at, at 390, 768 and 1440px, with the claim flow, undo, a second phone,
JavaScript off, and the family's page at 390px.
