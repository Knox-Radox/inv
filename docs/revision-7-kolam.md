# Revision 7 — the kolam

## What was there

Revision 6's kolam was an eight-petal rosette inside a scalloped ring. It is a
pretty mandala and it is not a kolam. A kolam is not a flower with a border; it
is **one line looping around a grid of dots**, and the three rules that make it
one are absolute:

    The line never crosses a dot. It never lifts. It comes back to where it began.

The old piece satisfied none of them. Its petals each left the centre and
returned, so the line lifted eight times; its dots were decoration the line
ignored; and its ring closed around the outside rather than being the drawing.

## What is there now

A **sikku** — interlaced — **pulli kolam** on a grid of fifty-three dots, built
by `tools/kolam.py` from the mirror-curve construction that underlies both the
Tamil kolam and the Angolan *sona* drawing.

Dots sit on even coordinates. The line lives on the odd-parity lattice — every
point it touches has `x + y` odd — so it is *arithmetically* incapable of
touching a dot. It runs at 45 degrees in unit steps and reflects off the outside
of the figure like a billiard:

```
    .   .   .        dots on even coordinates
      \ /            the line between them, at 45 degrees,
       X             turning only where it meets the edge
      / \
    .   .   .
```

Trace until the ray returns to the state it started in — position *and* heading
— and that closes one loop. How many loops a grid yields is a **property of the
grid**, not a choice: for an m x n rectangle it is exactly `gcd(m, n)`. So the
grid was searched for rather than picked. Nine, eleven, thirteen, eleven, nine
gives:

| | |
|---|---|
| Dots | 53 |
| Loops | **1** |
| Mirrors needed | **0** |
| Length of the line | 3,714 units, about 87 steps |

**One unbroken line, closing on its own start.** That is called an *infinite*
kolam, and what it is understood to mean is continuity — a life without a seam
in it. It is drawn at the threshold of a house on the morning of a wedding.
There is no better last mark for an invitation, and no argument for it that
needed inventing: it is what the form already means.

## Why it is wide

Because a kolam is drawn *across a threshold*, not in the middle of a room. The
old one sat centred in a 150px square like a medallion. This one runs the width
of the card.

That is also what makes fifty-three dots legible on a phone. At 150px they were
a smudge; at the card's measure each cell is about thirty pixels across, and the
figure survives 320px with room to spare.

## The animation

This is the piece where the animation carries the meaning, so it is the longest
on the page and the only one that asks to be watched twice.

1. **The pulli go down**, from the middle outward, over 900 ms. That is the
   order a hand lays them, and a kolam without its grid showing is a drawing
   rather than a kolam.
2. **The line is drawn**, in one unbroken stroke, over 4.2 seconds. One path,
   one `stroke-dasharray`: the whole of it is a single animated element.
3. **A point of light travels at its head** — the fingertip letting the rice
   flour fall — on `offset-path` along the same path at the same speed. It is
   only ever visible while the line is being drawn.

`prefers-reduced-motion: reduce` gets the finished kolam, which is what a guest
would actually see at a door.

## Four things worth not relearning

**1. `Painting` settles at 5,200 ms, and it will cut you off.** The kolam's
sequence runs to 5,960 ms, and `Painting` switches every entrance animation off
in favour of its finished state once `settleAfter` passes. The one piece on the
page whose animation carries the meaning was the one piece that never finished
it — silently, and only when watched in real time. `KolamDeco` passes its own
`settleAfter` now.

**2. `Stitch` front-loads, and a hand does not.** `--ease-needle` is right for a
thread pulled through cloth and wrong for a four-second stroke: the line was
three-quarters drawn at the half-way mark and read as a swipe. `Stitch` takes a
`pace` now — `needle` or `hand` — and the kolam is the only thing that asks for
the second.

**3. Three bugs in the tracer, all of them about where a walk stops.** They are
worth naming because each looked correct:

- Stopping at the first state *already seen* cuts a loop in half wherever the
  line crosses its own path. Every figure had a small curl hanging off it.
- Stopping only on returning to the start never terminates, because the step is
  not quite a bijection: a heading the enumerator offers may be one no arrival
  could produce, and such a state sits on a *tail* running into a cycle rather
  than on the cycle. Walk until a state repeats, keep the cycle, discard the
  run-in.
- Deciding whether to *record* a loop by looking at the start rather than at the
  cycle counts the same loop once per tail that runs into it — twenty-five
  times, for one of these grids.

And a fourth, about the reverse: a loop run backwards is the same drawing, so
its states are retired with it — but the reverse arrives at each point from the
one *after* it, so the heading comes from the next state and not from this one.
A state's own heading is the one it arrived on, and it may have been reflected
since.

**4. `pen.chain` clamps its tangents at the ends.** That is right for an open
line and wrong for a loop; closing one by repeating its first point leaves a
visible kink at the seam. `kolam.ring` wraps instead.

## What was not built

**Mirrors, in the end.** `tools/kolam.py` can add them — a mirror on an internal
edge fuses the two loops crossing it, or splits one in two, and that is the
whole content of the construction — and the search for them is there and works.
It is not used, because the grid that was chosen needs none. It stays because
the next grid may: a pointed diamond of the classic 1-3-5-7-5-3-1 shape yields
five loops and cannot be reduced to one by symmetric mirrors alone.
