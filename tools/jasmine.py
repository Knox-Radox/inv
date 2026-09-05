"""
The jasmine (malli) spray — docs/design-plan.md § Illustration inventory, item 2.

Drawn from the line study in docs/references.md: Hortus Malabaricus tab. 86 and
the Wellcome plate of Jasminum sambac. What a burin does that a vector doesn't —
the stem tapers to nothing at the growing tip, the midrib is twice the weight of
the secondary veins, the veins stop short of the leaf margin, and nothing is
mirrored.

Everything here is a *centreline*, emitted with its length, because these paths
animate: the draw-on is stroke-dasharray, and a stroked path is the only kind
that can be drawn on. The seal's filled outlines are the exception, not the rule.

Coordinate box is 100 wide x 150 tall. The stem enters at the top centre, where
the seal broke, and ends in the dive stitch where the thread goes behind the
cloth.
"""

import math

from pen import chain, curve, path_length

Point = tuple[float, float]


def seg(points: list[Point]) -> tuple[str, float]:
    """A smooth centreline through points, with its length."""
    c = chain(points)
    return curve(c), round(path_length(c), 1)


# --- The stem ----------------------------------------------------------------
# Four sub-paths at stepped widths, joined where the direction already changes
# so the step is invisible. Thinning toward the growing tip, exactly as the
# Hortus plate does.
STEM_POINTS: list[list[Point]] = [
    [(50.0, 0.0), (50.8, 9.0), (49.4, 18.0), (47.6, 26.5)],
    [(47.6, 26.5), (46.4, 35.0), (46.9, 44.0), (48.4, 52.5)],
    [(48.4, 52.5), (49.6, 61.0), (49.0, 70.0), (47.2, 78.5)],
    [(47.2, 78.5), (45.8, 86.5), (45.0, 94.0), (45.4, 101.0)],
]
STEM_WIDTHS = [1.5, 1.15, 0.85, 0.5]


def stem_point(t: float) -> Point:
    """Position along the whole stem, 0 at the seal, 1 at the tip."""
    n = len(STEM_POINTS)
    i = min(int(t * n), n - 1)
    lt = t * n - i
    pts = STEM_POINTS[i]
    a = pts[0]
    b = pts[-1]
    mid = pts[len(pts) // 2]
    u = 1 - lt
    return (
        u * u * a[0] + 2 * u * lt * mid[0] + lt * lt * b[0],
        u * u * a[1] + 2 * u * lt * mid[1] + lt * lt * b[1],
    )


# --- Local frames ------------------------------------------------------------
def _frame(origin: Point, angle_deg: float, side: int):
    """Returns (place, along, across) for an element growing off the stem."""
    a = math.radians(angle_deg)
    ux, uy = side * math.sin(a), math.cos(a) * 0.62 + 0.38
    m = math.hypot(ux, uy)
    ux, uy = ux / m, uy / m
    vx, vy = -uy, ux

    def place(u: float, v: float) -> Point:
        return (origin[0] + ux * u + vx * v * side, origin[1] + uy * u + vy * v * side)

    return place


def _bez(pts: list[Point]) -> tuple[str, float]:
    """An explicit cubic, not a fitted chain — leaves need controlled shoulders."""
    d = f"M{pts[0][0]:.2f} {pts[0][1]:.2f}C" + " ".join(
        f"{x:.2f} {y:.2f}" for x, y in pts[1:]
    )
    segs = [(pts[0], pts[1], pts[2], pts[3])]
    return d, round(path_length(segs), 1)


# --- Leaves ------------------------------------------------------------------
# Ovate-lanceolate, built in a local frame so the shoulders are controlled
# rather than derived. Opposite pairs, but never matching: each differs in
# length by 8-12 per cent and in angle, because a plant is not a stencil.
LEAF_SPECS = [
    # (t along stem, side, length, angle from stem, width ratio)
    (0.13, -1, 17.0, 52, 0.30),
    (0.165, 1, 15.3, 58, 0.28),
    (0.45, -1, 19.4, 47, 0.31),
    (0.49, 1, 17.4, 55, 0.29),
    (0.70, -1, 15.6, 50, 0.30),
    (0.735, 1, 13.9, 61, 0.27),
]


def _leaf(t: float, side: int, length: float, angle: float, wr: float):
    place = _frame(stem_point(t), angle, side)
    L = length
    w = L * wr
    base, tip = place(0, 0), place(L, 0)
    # The lit edge is a hairline; the shaded edge carries three times the weight
    # and bulges a little further, so the leaf has a light side.
    lit, l_lit = _bez([base, place(L * 0.20, w * 0.92), place(L * 0.66, w * 0.80), tip])
    shade, l_shade = _bez(
        [base, place(L * 0.17, -w * 1.06), place(L * 0.64, -w * 0.88), tip]
    )
    mid, l_mid = _bez(
        [base, place(L * 0.34, w * 0.05), place(L * 0.70, -w * 0.04), tip]
    )
    veins = []
    for k, spread in ((0.28, 0.46), (0.48, 0.44), (0.68, 0.34)):
        for s in (1, -1):
            edge = w * (0.92 if s > 0 else 1.02)
            # Stops short of the margin, and sweeps forward, as an engraved
            # secondary vein does.
            reach = edge * spread
            d, ln = _bez(
                [
                    place(L * k, 0),
                    place(L * (k + 0.03), s * reach * 0.45),
                    place(L * (k + 0.08), s * reach * 0.85),
                    place(L * (k + 0.13), s * reach),
                ]
            )
            veins.append({"d": d, "len": ln})
    return {
        "midrib": {"d": mid, "len": l_mid},
        "lit": {"d": lit, "len": l_lit},
        "shade": {"d": shade, "len": l_shade},
        "veins": veins,
    }


LEAVES = [_leaf(*spec) for spec in LEAF_SPECS]

# --- Buds --------------------------------------------------------------------
# Jasmine buds are long and closed on a fine pedicel. Strung on a line, which is
# why this flower and not a wreath.
BUD_SPECS = [
    (0.295, -1, 11.6, 64),
    (0.335, 1, 10.1, 74),
    (0.565, 1, 12.2, 58),
    (0.815, -1, 10.6, 70),
]


def _bud(t: float, side: int, length: float, angle: float):
    place = _frame(stem_point(t), angle, side)
    L = length
    stalk = L * 0.46
    w = L * 0.115
    ped, ped_len = _bez(
        [place(0, 0), place(stalk * 0.35, w * 0.3), place(stalk * 0.7, -w * 0.2), place(stalk, 0)]
    )
    tip = place(L, 0)
    left, l_left = _bez(
        [place(stalk, 0), place(stalk + L * 0.14, w), place(L - L * 0.12, w * 0.86), tip]
    )
    right, l_right = _bez(
        [place(stalk, 0), place(stalk + L * 0.14, -w), place(L - L * 0.12, -w * 0.78), tip]
    )
    return {
        "pedicel": {"d": ped, "len": ped_len},
        "left": {"d": left, "len": l_left},
        "right": {"d": right, "len": l_right},
    }


BUDS = [_bud(*spec) for spec in BUD_SPECS]

# --- Open flowers ------------------------------------------------------------
# At the size this renders, a corolla is about twelve pixels across, so it is
# drawn the way an engraver draws one small: a few narrow petals, each a closed
# lens, and no two the same length.
FLOWER_SPECS = [(0.605, 1, 8.4, 6, 14.0), (0.885, -1, 7.2, 5, -22.0)]


def _flower(t: float, side: int, radius: float, petals: int, rotate: float):
    origin = stem_point(t)
    place = _frame(origin, 58, side)
    cx, cy = place(radius * 1.15, 0)
    ped, ped_len = _bez(
        [origin, place(radius * 0.4, radius * 0.12), place(radius * 0.8, -radius * 0.08), (cx, cy)]
    )
    out = []
    for i in range(petals):
        ang = math.radians(rotate + 360 * i / petals)
        r = radius * (0.80 + 0.20 * ((i * 3) % 4) / 3)
        ca, sa = math.cos(ang), math.sin(ang)
        na, nb = -sa, ca
        pw = r * 0.30
        tipx, tipy = cx + ca * r, cy + sa * r
        for s in (1, -1):
            d, ln = _bez(
                [
                    (cx, cy),
                    (cx + ca * r * 0.30 + na * pw * s, cy + sa * r * 0.30 + nb * pw * s),
                    (cx + ca * r * 0.74 + na * pw * 0.82 * s, cy + sa * r * 0.74 + nb * pw * 0.82 * s),
                    (tipx, tipy),
                ]
            )
            out.append({"d": d, "len": ln})
    return {
        "pedicel": {"d": ped, "len": ped_len},
        "petals": out,
        "cx": round(cx, 1),
        "cy": round(cy, 1),
    }


FLOWERS = [_flower(*spec) for spec in FLOWER_SPECS]

# --- The dive stitch ---------------------------------------------------------
# Where the thread goes behind the cloth: a short stroke that stops abruptly at
# a dimple, so the disappearance reads as deliberate rather than as a bug.
DIVE, DIVE_LEN = seg([(45.4, 101.0), (45.6, 106.0), (46.0, 110.5)])
DIMPLE = (46.0, 111.6)
