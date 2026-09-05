"""
The A/S monogram — docs/design-plan.md § The A/S monogram.

One mark, not two characters.

The A is the architecture: wide, stable, drawn as a single continuous stroke so
its apex turns rather than cusps, with the traditional Roman stress — thin left
limb, thick right — and small cut serifs at the feet.

The S *is* the A's crossbar. It spans the counter from the right limb down to
the left, joined into both, so the two letters do not merely overlap: they share
the whole stroke. Read quickly it is a clean A with an ornate bar; read closely
the bar resolves into an S. That is the strongest available interlock for these
two letters and the only one that survives being 60px across.

The weave is a single quiet over-under where the S's spine crosses back over the
A's left limb — the kolam gesture, stated once.

Coordinate box is 100x100, drawn large and scaled to fit the ring in the
component. Emits the `d` strings pasted into WaxSeal.tsx.
"""

import math

from pen import Spine, chain

# --- The A -------------------------------------------------------------------
APEX = (50.0, 15.0)
FOOT_L = (21.2, 87.2)
FOOT_R = (79.0, 87.2)
BASELINE = 87.2
SERIF_TOP = 82.4

# One spine, left foot up over the apex and down to the right foot. Extra points
# either side of the apex turn the pen over a small radius instead of a cusp.
A_POINTS = [
    FOOT_L,
    (29.6, 65.6),
    (38.6, 42.6),
    (45.8, 23.8),
    (47.9, 18.2),
    (49.1, 15.6),
    APEX,
    (51.1, 15.7),
    (52.3, 18.4),
    (54.6, 24.4),
    (62.0, 43.0),
    (71.0, 65.8),
    FOOT_R,
]

A_WIDTHS = [
    (0.00, 4.6),
    (0.18, 4.2),
    (0.44, 3.7),
    (0.50, 3.6),
    (0.56, 5.4),
    (0.82, 6.8),
    (1.00, 7.4),
]

a = Spine(segments=chain(A_POINTS), widths=A_WIDTHS, samples=300)


def limb_x(y: float, right: bool) -> float:
    """Centreline x of a limb at height y."""
    foot = FOOT_R if right else FOOT_L
    t = (y - APEX[1]) / (foot[1] - APEX[1])
    return APEX[0] + t * (foot[0] - APEX[0])


# --- The S, which is the crossbar --------------------------------------------
# Anchored into the right limb at the top and the left limb at the bottom, so it
# spans the counter the way a crossbar does. An S's axis runs upper-right to
# lower-left, which is why the bar is canted up to the right.
S_TOP = (limb_x(50.0, True) + 1.2, 50.0)
S_BOTTOM = (limb_x(72.5, False) - 7.4, 69.8)

S_POINTS = [
    S_TOP,
    (57.0, 45.2),
    (48.0, 43.6),
    (40.6, 46.6),
    (38.8, 52.4),
    (43.0, 57.2),
    (50.6, 60.0),   # the spine, crossing the counter
    (57.4, 63.2),
    (59.6, 68.4),
    (56.4, 74.0),
    (48.0, 77.4),
    (37.6, 77.0),
    (30.4, 74.4),
    (25.0, 72.8),
    S_BOTTOM,
]

# Thin where it joins each limb so the junction reads as a join rather than a
# collision, heaviest at the two shoulders.
S_WIDTHS = [
    (0.00, 2.6),
    (0.08, 3.6),
    (0.22, 5.8),
    (0.36, 4.8),
    (0.50, 4.2),
    (0.62, 4.8),
    (0.76, 6.0),
    (0.88, 3.6),
    (1.00, 1.9),
]

s = Spine(segments=chain(S_POINTS), widths=S_WIDTHS, samples=340)

# --- The weave ---------------------------------------------------------------
# The S's lower bowl swings back across the A's left limb on its way to the
# lower anchor. There, and only there, the S passes over and the limb is
# interrupted by a hairline gap on each side.
def _find_crossing() -> tuple[tuple[float, float], float]:
    """Where the S's tail actually crosses the A's left limb.

    Computed rather than assumed: an earlier version hardcoded a y that the tail
    never reaches, which put the gap in bare limb and read as a chip.
    """
    prev_side = None
    for i in range(400, 1001):
        t = i / 1000
        (x, y), _ = s.point_at(t)
        side = x - limb_x(y, right=False)
        if prev_side is not None and side * prev_side < 0:
            return (x, y), t
        prev_side = side
    raise RuntimeError("the S's tail does not cross the A's left limb")


CROSS, t_cross_s = _find_crossing()
t_cross_a = a.t_at_point(CROSS, 0.0, 0.35)
a.breaks = [a.gap_around(t_cross_a, s.width_at(t_cross_s) / 2 + 0.55)]


# --- Cut serifs at the feet --------------------------------------------------
def foot_serif(x: float, half: float, tilt: float, waist: float) -> str:
    """A cut slab serif: wide on the baseline, narrowing as it rises into the
    limb, so the junction is a bracket rather than a butt joint. Deliberately
    asymmetric — a serif cut by hand never is."""
    return (
        f"M{x - half:.1f} {BASELINE:.1f}"
        f"L{x + half + tilt:.1f} {BASELINE:.1f}"
        f"L{x + waist + tilt:.1f} {SERIF_TOP:.1f}"
        f"L{x - waist:.1f} {SERIF_TOP:.1f}Z"
    )


SERIFS = foot_serif(FOOT_L[0] - 0.4, 5.6, 0.5, 2.6) + foot_serif(
    FOOT_R[0] + 0.5, 6.8, 0.6, 3.9
)


# --- The korvai ring ---------------------------------------------------------
def reku_ring(cx: float, cy: float, r: float, count: int, depth: float, half: float) -> str:
    """A reku temple border: fine isoceles triangles pointing inward."""
    out = []
    for i in range(count):
        ang = 2 * math.pi * i / count - math.pi / 2
        aw = half * 2 * math.pi / count
        x1, y1 = cx + r * math.cos(ang - aw), cy + r * math.sin(ang - aw)
        x2, y2 = cx + r * math.cos(ang + aw), cy + r * math.sin(ang + aw)
        tx, ty = cx + (r - depth) * math.cos(ang), cy + (r - depth) * math.sin(ang)
        out.append(f"M{x1:.1f} {y1:.1f}L{tx:.1f} {ty:.1f}L{x2:.1f} {y2:.1f}Z")
    return "".join(out)


REKU = reku_ring(50, 50, 44.0, 56, 2.4, 0.24)

#: The mark is drawn large for legibility of construction, then scaled to sit
#: inside the ring. Applied as a transform in the component.
MARK_SCALE = 0.74

#: Optical centring — the A's mass sits low, so the mark is lifted slightly.
MARK_LIFT = -2.2


if __name__ == "__main__":
    paths = {"A": a.outline() + SERIFS, "S": s.outline(), "REKU": REKU}
    for k, v in paths.items():
        print(f'const {k} = "{v}";\n')
    print("// payload: " + ", ".join(f"{k}={len(v)}" for k, v in paths.items()))
    print(f"// total {sum(len(v) for v in paths.values())} chars")
    print(f"// S anchors: top={S_TOP} bottom={S_BOTTOM}")
    print(f"// weave: A interrupted at t={a.breaks[0][0]:.4f}..{a.breaks[0][1]:.4f} near {CROSS}")
