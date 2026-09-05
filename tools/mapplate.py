"""
The engraved map plate — docs/design-plan.md § Illustration inventory, item 7.

The map carries no navigation job: no link, no embed, no deep link, no
interactivity. Because of that it has to carry a decorative one instead, and a
plain road diagram with a pin dropped on it reads as a placeholder — which is
exactly what the first version of this file produced, and why it was scrapped.

What makes a plate a plate is not the roads. It is the *line*: every stroke
tapers, the land carries hatching whose density is the drawing, water is a
double line with fine cross-strokes, and the ornament is cut, not placed. So
the roads here are tapered filled outlines from the same pen as the monogram,
not uniform strokes.

Only County Road 419 is lettered, because it is the only road the address gives
us. The others are drawn but unnamed; see docs/open-questions.md #2.

Coordinate box is 100 wide x 74 tall. Everything is clipped to the inner rule.
"""

import math

from pen import Spine, chain, curve, path_length

Point = tuple[float, float]


def road(points: list[Point], w0: float, wmid: float, w1: float, tol: float = 0.06) -> str:
    """A road as a tapered filled outline — thickest in the middle of its run,
    thinning as it leaves the plate, the way a burin lifts."""
    return Spine(
        segments=chain(points),
        widths=[(0.0, w0), (0.35, wmid), (0.68, wmid * 0.94), (1.0, w1)],
        samples=260,
        tolerance=tol,
    ).outline()


def line(points: list[Point]) -> tuple[str, float]:
    c = chain(points)
    return curve(c), round(path_length(c), 1)


# --- County Road 419 ---------------------------------------------------------
# Enters at the left edge exactly where the thread branches in. Heaviest line on
# the plate, and the only one that draws on.
MAIN_POINTS: list[Point] = [
    (2.0, 29.0),
    (14.0, 30.2),
    (26.0, 33.0),
    (38.0, 38.4),
    (49.0, 42.6),
    (60.0, 43.8),
    (72.0, 42.2),
    (85.0, 38.6),
    (98.0, 36.4),
]
MAIN_CENTRE, MAIN_LEN = line(MAIN_POINTS)
MAIN = road(MAIN_POINTS, 0.9, 1.5, 1.0)

# --- Approach roads, unnamed -------------------------------------------------
# Lighter, and no two the same weight. Trimmed inside the plate rule so nothing
# runs off the copper.
APPROACHES = [
    road([(31.0, 4.0), (31.6, 15.0), (30.6, 25.0), (32.0, 34.0), (33.2, 46.0), (32.2, 58.0), (33.0, 70.0)], 0.34, 0.78, 0.40),
    road([(71.0, 4.0), (70.2, 15.0), (71.2, 27.0), (71.8, 40.5), (70.8, 55.0), (71.8, 70.0)], 0.30, 0.66, 0.34),
    road([(4.0, 63.0), (15.0, 59.0), (25.0, 52.0), (32.6, 46.0)], 0.30, 0.58, 0.30),
    road([(71.6, 42.8), (79.0, 51.0), (85.0, 60.0), (89.0, 70.0)], 0.34, 0.60, 0.30),
]

# --- The creek ---------------------------------------------------------------
# Two banks, not a dashed arc, with fine cross-strokes between them — the way a
# plate draws water it has not room to hatch.
_CREEK: list[Point] = [
    (98.0, 9.0),
    (87.0, 12.0),
    (76.0, 16.4),
    (65.0, 18.6),
    (54.0, 17.2),
    (44.0, 13.0),
    (36.0, 7.4),
    (32.0, 4.0),
]
CREEK_A = road(_CREEK, 0.16, 0.3, 0.16, tol=0.05)


def _creek_ticks() -> str:
    """Cross-strokes between the banks, shortening upstream."""
    c = chain(_CREEK)
    out = []
    n = len(c)
    for i in range(1, 15):
        t = i / 15
        raw = t * n
        s = min(int(raw), n - 1)
        lt = raw - s
        p0, p1, p2, p3 = c[s]
        u = 1 - lt
        x = u**3 * p0[0] + 3 * u * u * lt * p1[0] + 3 * u * lt * lt * p2[0] + lt**3 * p3[0]
        y = u**3 * p0[1] + 3 * u * u * lt * p1[1] + 3 * u * lt * lt * p2[1] + lt**3 * p3[1]
        dx = p3[0] - p0[0]
        dy = p3[1] - p0[1]
        m = math.hypot(dx, dy) or 1
        nx, ny = -dy / m, dx / m
        r = 1.5 * (1 - t * 0.55)
        out.append(f"M{x - nx * r:.1f} {y - ny * r:.1f}L{x + nx * r:.1f} {y + ny * r:.1f}")
    return "".join(out)


CREEK_TICKS = _creek_ticks()

# --- Hatching ----------------------------------------------------------------
# Land tone, laid in two small fields at different angles. The density is the
# drawing; without it a plate is a diagram.
def _hatch(x0: float, y0: float, x1: float, y1: float, angle: float, gap: float, jitter: float) -> str:
    a = math.radians(angle)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    half = math.hypot(x1 - x0, y1 - y0) / 2
    out = []
    n = int(half * 2 / gap)
    for i in range(n + 1):
        off = -half + i * gap
        # Every line a slightly different length, as a cut hatch is.
        run = half * (0.62 + 0.3 * ((i * 5) % 7) / 6) - abs(off) * 0.45
        if run <= 0.6:
            continue
        px, py = cx + nx * off, cy + ny * off
        j = jitter * (((i * 3) % 5) / 4 - 0.5)
        out.append(
            f"M{px - dx * run + j:.1f} {py - dy * run:.1f}L{px + dx * run + j:.1f} {py + dy * run:.1f}"
        )
    return "".join(out)


HATCH_A = _hatch(8.0, 40.0, 26.0, 56.0, 28, 1.5, 0.5)
HATCH_B = _hatch(74.0, 27.0, 90.0, 38.0, -34, 1.7, 0.5)

# --- Trees -------------------------------------------------------------------
# Four, small, at the sizes a plate draws them: a stem and a crown of ticks.
_TREE_AT = [(21.0, 24.0), (44.0, 55.0), (62.0, 28.0), (84.0, 52.0)]


def _trees() -> str:
    """A crown of three overlapping arcs on a short trunk. No two the same, and
    none of them regular — a plate's trees are cut quickly and it shows."""
    out = []
    for i, (x, y) in enumerate(_TREE_AT):
        h = 2.2 + (i % 3) * 0.35
        r = h * 0.72
        out.append(f"M{x:.1f} {y:.1f}L{x + 0.15:.1f} {y - h * 0.75:.1f}")
        for k, (ox, oy, rr) in enumerate(
            ((-r * 0.5, 0.0, r * 0.62), (r * 0.48, -r * 0.12, r * 0.58), (0.0, -r * 0.6, r * 0.66))
        ):
            cx2, cy2 = x + ox, y - h * 0.78 + oy
            wob = 0.06 * ((i + k) % 3)
            out.append(
                f"M{cx2 - rr:.2f} {cy2:.2f}"
                f"a{rr:.2f} {rr * (0.92 + wob):.2f} 0 1 1 {rr * 2:.2f} 0"
                f"a{rr:.2f} {rr * (0.92 + wob):.2f} 0 1 1 {-rr * 2:.2f} 0"
            )
    return "".join(out)


TREES = _trees()

# --- The venue ---------------------------------------------------------------
# A gabled building set back from the road with a short drive, which is what a
# plate puts at a named property. Not a pin.
VX, VY = 56.4, 48.6
VS = 0.74  # the building was overpowering the plate at full size

def _v(dx: float, dy: float) -> str:
    return f"{VX + dx * VS:.2f} {VY + dy * VS:.2f}"


VENUE_BODY = (
    f"M{_v(-4.6, 3.0)}L{_v(-4.6, -1.4)}L{_v(0, -4.4)}"
    f"L{_v(4.6, -1.4)}L{_v(4.6, 3.0)}Z"
)
VENUE_ROOF = f"M{_v(-5.4, -1.1)}L{_v(0, -4.9)}L{_v(5.4, -1.1)}"
VENUE_DOOR = (
    f"M{_v(-0.9, 3.0)}L{_v(-0.9, 0.6)}L{_v(0.9, 0.6)}L{_v(0.9, 3.0)}"
)
# The drive runs from the door up to the road, and stops there.
VENUE_DRIVE, VENUE_DRIVE_LEN = line(
    [(VX, VY - 4.9 * VS), (VX + 0.4, VY - 7.4), (VX + 1.0, 43.6)]
)

# --- Compass -----------------------------------------------------------------
CX, CY, CR = 87.0, 15.0, 5.6


def _compass_star() -> tuple[str, str]:
    """A four-point star with alternating filled and open halves — the engraved
    convention for which way is north."""
    filled, open_ = [], []
    for i in range(4):
        a = -math.pi / 2 + i * math.pi / 2
        r = CR if i % 2 == 0 else CR * 0.72
        tip = (CX + r * math.cos(a), CY + r * math.sin(a))
        wa = a + math.pi / 2
        w = CR * 0.19
        l = (CX + w * math.cos(wa), CY + w * math.sin(wa))
        rt = (CX - w * math.cos(wa), CY - w * math.sin(wa))
        filled.append(f"M{CX:.1f} {CY:.1f}L{l[0]:.1f} {l[1]:.1f}L{tip[0]:.1f} {tip[1]:.1f}Z")
        open_.append(f"M{CX:.1f} {CY:.1f}L{rt[0]:.1f} {rt[1]:.1f}L{tip[0]:.1f} {tip[1]:.1f}Z")
    return "".join(filled), "".join(open_)


COMPASS_FILLED, COMPASS_OPEN = _compass_star()

# --- Cartouche ---------------------------------------------------------------
# Smaller than the first attempt, clipped-corner, with a fine inner rule.
CART_X, CART_Y, CART_W, CART_H = 15.0, 60.0, 40.0, 9.6
_c = 2.0


def _panel(x, y, w, h, c):
    return (
        f"M{x + c} {y}H{x + w - c}L{x + w} {y + c}V{y + h - c}"
        f"L{x + w - c} {y + h}H{x + c}L{x} {y + h - c}V{y + c}Z"
    )


CARTOUCHE = _panel(CART_X, CART_Y, CART_W, CART_H, _c)
CARTOUCHE_INNER = _panel(CART_X + 1.1, CART_Y + 1.1, CART_W - 2.2, CART_H - 2.2, _c * 0.7)

# --- Plate rules -------------------------------------------------------------
BORDER_OUTER = "M1.4 1.4H98.6V72.6H1.4Z"
BORDER_INNER = "M3.4 3.4H96.6V70.6H3.4Z"
#: Everything inside the plate is clipped to this, so no line runs off the copper.
CLIP = "M3.4 3.4H96.6V70.6H3.4Z"


if __name__ == "__main__":
    print(f"main {len(MAIN)}, approaches {sum(len(a) for a in APPROACHES)}")
    print(f"hatch {len(HATCH_A) + len(HATCH_B)}, trees {len(TREES)}, creek {len(CREEK_A)}")
