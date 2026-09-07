# Open questions

Three open, one closed. Every fact in the brief is confirmed, so this list is
short by design and is not padded. Nothing here is blocking the plan — the build can start and each
of these can land later without rework, except where noted.

---

### 1. The gap in the day

The ceremony ends at 10:30 AM and the reception begins at 6:00 PM at the same
venue. Guests will want to know whether they are meant to leave and come back.

The design answers the *shape* of it without words — the thread runs unbroken
between the two events, so the day reads as one thing rather than two — but that
is a drawing, not an instruction.

**Do you want a line of copy there?** If so, please supply the wording; we will
not write one for you. If not, the thread carries it and nothing is said.

**Related, and part of the same decision:** should "Add to calendar" produce
**one** entry covering the whole day, or **two** separate entries (Ceremony
8:30–10:30 AM, Reception from 6:00 PM)? This matters practically as well as
editorially — iOS often imports only the first event from a multi-event `.ics`
file, so if you want two, the button needs to behave differently from the
default. Whichever you choose should match the answer above: one day, or two
events.

---

### 2. What the map plate should show — **answered, revision 7**

*Was: which direction do guests arrive from, and is there a road to name?*

Closed, and not by an answer. The client's instruction in revision 7 was that
the plate be traced from real ground and open Google Maps, so there is nothing
left to invent and nothing left to ask. Six roads are drawn and five of them are
lettered — US 75, TX 121, the Collin County Outer Loop, FM 455 and County Road
419 — because that is what is actually there. See `docs/revision-7-map.md`.

---

### 3. The background audio

The brief calls for a sound toggle and for audio that starts on the seal tap, but
does not say what plays. This is a personal and cultural choice and it is not one
to guess at.

**What would you like the track to be?** Please note it also has to be something
we can ship legally — either a recording you own or have permission for, or
something released under CC0 / public domain. We will not put a copyrighted
recording on your invitation.

If you would rather have no audio at all, say so and the toggle comes out
entirely; nothing else in the design depends on it.

---

### 4. The cover loads too slowly, and fixing it is a trade

**This is a decision for you, not a bug to be fixed quietly.**

The brief sets one hard performance line: the first thing on screen should paint
within 2.5 seconds on a slow connection. It does not, and it has not since
revision 5 — measured at 7.6 s before this revision's work and 6.2–7.0 s after.
(The figure recorded in `docs/handoff-revision-5.md` was measured on a run where
the envelope happened not to be armed, so it timed the invitation card rather
than the cover. `docs/revision-8-cover.md` has the detail.)

The cause is not the photograph. Everything the page needs starts downloading at
the same moment and shares a narrow pipe, and the cover photograph finishes
last — behind the **Parfumerie Script webfont, which is 60 KB on its own**, and
the JavaScript.

There are three ways out and each costs something:

1. **Stop preloading Parfumerie.** Fastest fix by far. The cost is that
   "Advika and Sooraj" on the cover would appear in a fallback face for a
   moment and then snap into the script — on the very first thing anyone sees.
2. **Cut the cover photograph further.** It has already come down from 70 KB to
   51 KB in this revision with no visible loss. Going much further starts to
   show, and "it looks fake" is the note that began this whole rebuild.
3. **Accept it.** On a real phone on real WiFi or 5G this is well under a
   second. The 2.5 s line is measured on a deliberately punishing throttle —
   400 kbps with a 4× CPU slowdown — which is a worst case, not a typical one.
   Most of the people opening this will be on good connections.

Our recommendation is **(3) for now and (1) if you want it faster**, because a
brief flash of a fallback face is a real cost on a page whose whole argument is
that it looks expensive. But it is your call and we have not made it.
