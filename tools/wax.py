"""
The wax body — docs/design-plan.md § The A/S monogram, "The wax".

Wax is not a circle. It is poured, it spreads unevenly, it pools thicker where
it ran, and the stamp squeezes a little of it out past the edge. All of that is
an edge-and-lighting problem, solved here in geometry and in the component's
gradients — never with a CSS box-shadow under a flat circle, which reads as a
sticker and would undermine the whole page.

The body is emitted as two halves either side of an irregular fault, so beat 1
of the choreography can rotate and drop them apart independently.

Coordinate box is 100x100, centred on (50, 50).
"""

import math

from pen import Spine, chain, emit, simplify

CX = CY = 50.0
R = 43.6

#: Low harmonics only: enough that no two arcs of the edge match, not so much
#: that it reads as a spiky blob. Tuple of (harmonic, amplitude, phase).
_HARMONICS = ((2, 0.019, 0.7), (3, 0.014, 2.3), (5, 0.009, 4.1), (7, 0.005, 1.2))

#: Where the stamp pressed the wax out past its own edge, in radians with the
#: usual SVG convention (0 = 3 o'clock, increasing clockwise).
_LOBES = (
    (math.radians(38), math.radians(26), 0.030),   # ~4 o'clock
    (math.radians(186), math.radians(21), 0.024),  # ~9 o'clock
)


def radius_at(theta: float) -> float:
    k = 1.0
    for n, amp, phase in _HARMONICS:
        k += amp * math.sin(n * theta + phase)
    for centre, width, amp in _LOBES:
        d = (theta - centre + math.pi) % (2 * math.pi) - math.pi
        if abs(d) < width:
            # raised cosine, so the lobe swells and settles rather than steps
            k += amp * 0.5 * (1 + math.cos(math.pi * d / width))
    return R * k


def point_at(theta: float) -> tuple[float, float]:
    r = radius_at(theta)
    return (CX + r * math.cos(theta), CY + r * math.sin(theta))


def arc(a: float, b: float, steps: int = 150) -> list[tuple[float, float]]:
    return [point_at(a + (b - a) * i / steps) for i in range(steps + 1)]


# --- The fault ---------------------------------------------------------------
# Wax does not break on a straight line. This wanders, and it is steeper at the
# top than the bottom, so the two halves are not mirror images.
TOP = -math.pi / 2
BOTTOM = math.pi / 2

_FAULT_POINTS = [
    point_at(TOP),
    (51.6, 16.4),
    (48.9, 26.8),
    (52.4, 35.2),
    (49.4, 44.0),
    (53.1, 52.6),
    (49.8, 61.4),
    (52.9, 70.8),
    (48.6, 80.2),
    point_at(BOTTOM),
]


def _fault() -> list[tuple[float, float]]:
    """Densified so the halves' shared edge has matching vertices."""
    out: list[tuple[float, float]] = []
    for p, q in zip(_FAULT_POINTS, _FAULT_POINTS[1:]):
        for i in range(9):
            t = i / 9
            out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    out.append(_FAULT_POINTS[-1])
    return out


FAULT = _fault()

#: How far each half reaches past the fault into the other, to kill the seam.
OVERLAP = 0.35


def _shift(points: list[tuple[float, float]], dx: float) -> list[tuple[float, float]]:
    return [(x + dx, y) for x, y in points]


TOL = 0.10

#: Right half: down the right edge from top to bottom, then back up the fault.
WAX_RIGHT = emit(
    simplify(arc(TOP, BOTTOM), TOL) + simplify(_shift(FAULT, -OVERLAP)[::-1], TOL),
    close=True,
)

#: Left half: on round the left edge from bottom back to top, then down the fault.
WAX_LEFT = emit(
    simplify(arc(BOTTOM, TOP + 2 * math.pi), TOL) + simplify(_shift(FAULT, OVERLAP), TOL),
    close=True,
)

#: The whole body, for the intact state and for the filter's alpha source.
WAX_WHOLE = emit(simplify(arc(TOP, TOP + 2 * math.pi), TOL), close=True)

# --- The pooled rim ----------------------------------------------------------
# A lip only where the light is not: an arc from about 200 to 20 degrees, drawn
# just inside the edge, fading at both ends via a gradient on the stroke.
def _rim_sliver(inset: float) -> str:
    """A filled sliver that tapers to nothing at both ends.

    An earlier version faded a stroke with a linear gradient, which depends on
    the gradient's axis lining up with the arc and did not: it left two detached
    dashes. Tapering the shape itself is both honest and unconditional, and it
    is the same pen every other line on this page is drawn with.
    """
    a, b = math.radians(20), math.radians(200)
    pts = []
    for i in range(25):
        th = a + (b - a) * i / 24
        r = radius_at(th) - inset
        pts.append((CX + r * math.cos(th), CY + r * math.sin(th)))
    rim = Spine(
        segments=chain(pts),
        widths=[(0.0, 0.0), (0.16, 1.9), (0.5, 2.5), (0.84, 1.9), (1.0, 0.0)],
        samples=200,
        tolerance=0.05,
    )
    return rim.outline()


RIM_INNER = _rim_sliver(2.1)


if __name__ == "__main__":
    for name, d in (
        ("WAX_WHOLE", WAX_WHOLE),
        ("WAX_LEFT", WAX_LEFT),
        ("WAX_RIGHT", WAX_RIGHT),
        ("RIM", RIM_INNER),
    ):
        print(f'const {name} = "{d}";\n')
    print(
        "// payload: "
        + ", ".join(
            f"{n}={len(d)}"
            for n, d in (
                ("WHOLE", WAX_WHOLE),
                ("LEFT", WAX_LEFT),
                ("RIGHT", WAX_RIGHT),
                ("RIM", RIM_INNER),
            )
        )
    )
