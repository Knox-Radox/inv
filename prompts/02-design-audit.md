# Prompt 02 — Design audit

Run this **in a fresh session** after the build. `/clear` first, or better, start
a new `claude` session in the same directory. The whole value of this prompt is
that the reviewer has not spent the last two hours convincing itself the work is
good.

This is the step that separates a good result from a great one. Expect it to find
real problems.

---

You did not build this. You have been brought in as an outside design director to
review a finished piece before it goes to the client, and your reputation depends
on catching what the build team stopped being able to see.

Read `CLAUDE.md`, `docs/design-brief.md`, and `docs/design-plan.md`. Then run the
site and look at it properly: 390px, 430px, 768px, 1440px, plus 200% zoom and
`prefers-reduced-motion`. Watch the envelope sequence three times.

Write `docs/design-audit.md` covering:

**1. The slop audit.** Go through the brief's ban list line by line and report
honestly on each. Then go further: name every element on this page that you would
expect to find on *any* AI-generated luxury wedding invitation. Be specific and
be uncomfortable about it. This section is worthless if it is flattering.

**2. Does the ornament read as stitched?** The governing metaphor is embroidery.
Look at the actual rendered lines. Do they read as hand-made thread, or as vector
paths with a wedding-adjacent shape? If it is the latter, say exactly which
illustrations fail and what the line quality is missing.

**3. Is the South Indian element present and subtle?** It should be legible to
someone who knows what to look for and invisible as "theming" to someone who does
not. Check both failure directions: absent, or costumey.

**4. Motion.** Count every animated moment against the budget. Is the envelope
genuinely the memorable thing, or has ambient motion elsewhere diluted it? Any
easing that reads mechanical rather than expensive? Does the reduced-motion
version look designed or look broken?

**5. The phone test.** Walk through the page as a 68-year-old relative on a
mid-range Android who received this on WhatsApp. Where do they hesitate? What do
they miss? Can they find the time, the address, and the calendar button without
being told? Is any text too small, any tap target too tight, any control
ambiguous about its state?

**6. Correctness.** The things that are embarrassing rather than merely
imperfect: countdown target and timezone, the `.ics` importing cleanly into both
Apple and Google Calendar with the correct 8:30 AM start, the OG preview, the
date, the address as written on the card, and the spelling of both names. Verify
each one rather than reading the code and assuming.

Also confirm the two settled client decisions have not crept back in: there is no
RSVP anywhere, and the map has no button, embed, or interactivity of any kind.

**7. The Chanel edit.** Name the one element you would remove. Then name a second.

Finish with a prioritised fix list: P0 (embarrassing), P1 (materially weakens the
work), P2 (polish). Be specific — "the seal reads flat because the shadow is
outside the SVG" beats "improve the seal".

Then stop and show me the audit before changing anything.
