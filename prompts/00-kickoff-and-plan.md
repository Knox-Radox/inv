# Prompt 00 — Kickoff and design plan

Paste this as your first message. It produces a plan and stops. Do not skip the
approval gate; a reviewed plan is the difference between one build and four.

---

You are the design lead at a studio known for giving every client a visual
identity that is not mistaken for anyone else's. This client has already rejected
work that felt templated. Use the `frontend-design` skill throughout.

Read `CLAUDE.md` and `docs/design-brief.md` in full before doing anything else.
The brief is long and every part of it is load-bearing, including §6.

**Do not write any application code in this turn.** This turn produces a plan.

## Step 1 — Study the references

Open these two in the browser and actually watch them. They are client-side
rendered, so fetching HTML gives you nothing; you need to render and interact.

- https://www.thedigitalyes.com/demo/bellagio
- https://www.thedigitalyes.com/demo/maison-doree

Take screenshots of the moments that work. The client's interest is specific:
the smoothness and pacing of the motion, and the sense that the ornament was
embroidered by hand rather than dragged out of a design tool. Write 150–250 words
in `docs/references.md` on what these get right, what they get wrong, and — more
usefully — what they do *not* attempt that leaves you room to be better. Do not
plan to copy their layout.

While you are there, look at two or three public-domain botanical engravings for
line quality (Biodiversity Heritage Library, Rawpixel PD). You are studying how a
hand-cut line varies in weight, not collecting assets.

## Step 2 — Produce the design plan

Write `docs/design-plan.md` containing:

**Palette.** Five to seven named tokens with hex values, each with one line on
what it is for. Start from the brief's anchors. Justify any deviation. State the
contrast ratio for every text-on-ground pairing.

**Type.** Two families maximum, named, with roles. For the display face, name the
three alternatives you rejected and why. Give the full scale — sizes, weights,
line-heights, letter-spacing, measure — as the actual clamp() values you will
ship. Separately, sketch the **A**/**S** monogram for the wax seal: it is a drawn
mark rather than two set characters, so describe how the two letters interlock
and confirm it ships as outlined SVG paths.

**Layout.** ASCII wireframes for mobile (390px) and desktop (1440px), section by
section. One sentence of prose per section on the compositional idea. State the
alignment strategy explicitly and say why — centred is the wedding-invitation
default and if you choose it, it has to be a choice.

**The stitch idiom.** This is the design's signature. Describe in concrete terms
how a "stitched" line differs from a printed one in your implementation: stroke
weight and variation, line cap, the draw-on mechanic, the knot detail, the
texture underneath. If you cannot describe it concretely, you have not designed
it yet.

**Illustration inventory.** Every SVG you will hand-author, listed, each with its
motif source (kolam, thoranam, jasmine, gopuram, korvai, kasu), where it appears,
its rough complexity, and whether it animates. Pick two or three motifs and use
them properly rather than sampling all six.

**Envelope choreography.** A beat-by-beat timeline with durations and easing
curves. Five to seven seconds. Name what happens in each beat, what eases how,
and what the guest sees at second 1, 3, and 6. Include the reduced-motion
variant and the skip affordance.

**Motion score.** Every animated moment in the entire page, in a table, with its
trigger. If the table has more than about eight rows you have overspent — cut
until it fits the budget in the brief.

**Principles.** Three to five sentences on what makes *this* invitation
specifically Advika and Sooraj's and not a generic luxury wedding template.

## Step 3 — Review your own plan against the brief

Then, in a section at the end of `docs/design-plan.md` headed **Self-review**:

Work through what you would produce if someone handed you a similar prompt with
no brief attached. Compare. Any part of your plan that lands in the same place is
a default rather than a decision — revise it, and state plainly what you changed
and why.

Check yourself explicitly against the brief's ban list. Then apply the Chanel
test: name the one element you are removing before leaving the house, and remove
it from the plan.

Confirm you have understood §6 correctly by stating, in one sentence, where the
distinctiveness of this design comes from given that the palette and the typeface
category are both fixed by the client.

## Step 4 — Open questions

Write `docs/open-questions.md` with anything you cannot responsibly guess. Every
fact in the brief is confirmed, so this list should be short. One is already
known:

1. The gap in the day — the ceremony ends at 10:30 AM and the reception starts at
   6:00 PM at the same venue. Guests will want to know whether they are meant to
   leave and come back. Ask whether a line of copy should address it; do not
   invent one.

Add anything else you genuinely need. Do not pad the list to look thorough, and
do not list questions the brief already answers.

## Then stop

End your turn with a short summary of the design decision you feel least certain
about, and wait for approval. Do not scaffold the project, do not install
dependencies, do not write components.
