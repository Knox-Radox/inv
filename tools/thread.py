"""
The knot and the korvai edge band.

The knot — docs/design-plan.md § The stitch idiom, item 5. A French knot, and
there is exactly one on the page, where the thread ties off at the closing note.
Three turns drawn as a single centreline that visibly overlaps itself twice, so
you can see the thread wrap. Not a circle with a dot in it.

The korvai band — § Korvai, the real job. The card's bottom edge is a woven
border: a reku temple band between two hairlines, emitted as one repeating tile.
"""

import math

from pen import path_length

Point = tuple[float, float]


def _spiral(turns: float, r0: float, r1: float, cx: float, cy: float, steps: int = 90):
    pts: list[Point] = []
    for i in range(steps + 1):
        f = i / steps
        ang = -math.pi / 2 + turns * 2 * math.pi * f
        # Radius grows unevenly, so the wrap does not read as a machined coil.
        r = r0 + (r1 - r0) * (f**0.78)
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang) * 0.94))
    return pts


def _poly(pts: list[Point]) -> tuple[str, float]:
    d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}" + "".join(f"L{x:.2f} {y:.2f}" for x, y in pts[1:])
    total = sum(
        math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])
    )
    return d, round(total, 1)


# The thread arrives down the left, then coils. Centre at (10, 10) in a 20x20 box.
_TAIL: list[Point] = [(10.0, 0.0), (10.0, 2.2), (9.7, 4.0)]
_COIL = _spiral(2.85, 0.9, 5.2, 10.0, 9.4)

KNOT, KNOT_LEN = _poly(_TAIL + _COIL)

#: The catch of light on the upper-left of the coil — one short arc, not a
#: highlight layer.
KNOT_LIGHT, KNOT_LIGHT_LEN = _poly(_spiral(0.42, 3.4, 4.4, 10.0, 9.4, 22))


# --- Korvai edge band --------------------------------------------------------
#: One tile of the reku band: a triangle pointing down into the field, the
#: direction of travel. Tile is 4 wide by 6 tall; the component repeats it.
KORVAI_TILE = "M0 0.9L2 5.1L4 0.9Z"
KORVAI_TILE_W = 4
KORVAI_TILE_H = 6


if __name__ == "__main__":
    print(f'export const KNOT = "{KNOT}";')
    print(f"export const KNOT_LEN = {KNOT_LEN};")
    print(f'export const KNOT_LIGHT = "{KNOT_LIGHT}";')
    print(f"// knot {len(KNOT)} chars, length {KNOT_LEN}")
