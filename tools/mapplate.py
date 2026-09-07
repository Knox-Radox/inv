"""
The map plate — docs/revision-7-map.md.

Revision 6's plate invented its geography and the client rejected it: *"the hand
drawn map is of no use."* Every line here is traced instead from the
OpenStreetMap extract in `tools/data/anna-osm.json`. The drawing is still made
by hand — every road is a tapered burin outline from the same pen as the
monogram, never a uniform stroke — but the shape under the hand is true.

What makes it read as a plate rather than a screenshot is *selection*. Collin
County at 15 km across is a dense grid of section-line county roads; drawing all
of them would produce graph paper. Six roads are drawn, and they are the six a
guest would say out loud. Everything else in the extract is dropped, and what is
kept is kept at full fidelity, because the authenticity lives in the real curve
of the Outer Loop, not in the count of roads.

Coordinate box is 100 wide x 74 tall, projected by `frame.py`.

Map data © OpenStreetMap contributors, ODbL 1.0.
"""

import json
import math
from pathlib import Path

from frame import FRAME, H, VENUE_X, VENUE_Y, W
from ornament import random_seq, wobble
from pen import Spine, chain, curve, path_length, simplify

Point = tuple[float, float]

DATA = json.loads((Path(__file__).parent / "data" / "anna-osm.json").read_text())

# --- Turning ways into roads -------------------------------------------------
# OSM gives a road as dozens of fragments, split wherever a tag changes, and a
# divided highway twice over — once per carriageway. A plate draws one line.

#: Endpoints are matched on the shared OSM node, not on proximity. The first
#: version of this used 60 m, which is narrower than a Texas freeway median: it
#: joined the northbound carriageway of US 75 to the southbound one at the top
#: of the plate and folded the whole road back on itself, so a 52-unit run
#: started and finished 7 units apart. Roads are chained by identity here, and
#: only the fetcher's own clipping is repaired by distance, at one metre.
_NODE_DP = 7
_REPAIR_TOL = 1e-5


def _key(p: Point) -> tuple[float, float]:
    return (round(p[0], _NODE_DP), round(p[1], _NODE_DP))


def _heading(a: Point, b: Point) -> float:
    return math.atan2(b[1] - a[1], b[0] - a[0])


def _turn(h0: float, h1: float) -> float:
    """How far a driver would have to turn, in radians, 0 for straight on."""
    return abs((h1 - h0 + math.pi) % (2 * math.pi) - math.pi)


def _chain_ways(ways: list[list[list[float]]]) -> list[list[Point]]:
    """Join fragments into the longest runs they will make — the cartographer's
    *stroke*, not merely a connected component.

    At a junction the run continues into whichever branch a driver would call
    straight on. Without that rule a greedy walk turns off US 75 onto the first
    fragment it finds sharing the node and the road ends in the wrong county.
    """
    segs = [[(q[0], q[1]) for q in w] for w in ways]
    ends: dict[tuple[float, float], list[tuple[int, int]]] = {}
    for i, w in enumerate(segs):
        ends.setdefault(_key(w[0]), []).append((i, 0))
        ends.setdefault(_key(w[-1]), []).append((i, 1))

    used = [False] * len(segs)
    out: list[list[Point]] = []

    def extend(run: list[Point]) -> list[Point]:
        while True:
            tail = run[-1]
            incoming = _heading(run[-2], tail) if len(run) >= 2 else 0.0
            best, best_turn = None, math.pi / 2  # never take a right-angle turn
            for j, side in ends.get(_key(tail), ()):
                if used[j]:
                    continue
                seg = segs[j] if side == 0 else list(reversed(segs[j]))
                if len(seg) < 2:
                    continue
                turn = _turn(incoming, _heading(seg[0], seg[1])) if len(run) >= 2 else 0.0
                if turn < best_turn:
                    best, best_turn = (j, seg), turn
            if best is None:
                return run
            j, seg = best
            used[j] = True
            run = run + seg[1:]

    # Start from the loose ends first, so a run is walked from one tip of the
    # road rather than from its middle.
    order = sorted(
        range(len(segs)),
        key=lambda i: (len(ends.get(_key(segs[i][0]), ())) + len(ends.get(_key(segs[i][-1]), ()))),
    )
    for i in order:
        if used[i]:
            continue
        used[i] = True
        run = extend(list(segs[i]))
        run = list(reversed(extend(list(reversed(run)))))
        out.append(run)

    return _repair(out)


def _repair(runs: list[list[Point]]) -> list[list[Point]]:
    """Rejoin runs the fetcher's frame clipping split by a single dropped point."""
    pool = list(runs)
    out: list[list[Point]] = []
    while pool:
        run = pool.pop(0)
        joined = True
        while joined:
            joined = False
            for i, w in enumerate(pool):
                for a, b, fr, fw in (
                    (run[-1], w[0], False, False),
                    (run[-1], w[-1], False, True),
                    (run[0], w[-1], True, False),
                    (run[0], w[0], True, True),
                ):
                    if math.dist(a, b) > _REPAIR_TOL:
                        continue
                    seg = list(reversed(w)) if fw else list(w)
                    run = (list(reversed(run)) if fr else run) + seg[1:]
                    pool.pop(i)
                    joined = True
                    break
                if joined:
                    break
        out.append(run)
    return out


def _project(run: list[Point]) -> list[Point]:
    return [FRAME.xy(lat, lon) for lat, lon in run]


def _length(pts: list[Point]) -> float:
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def _near(p: Point, other: list[Point], tol: float) -> bool:
    return any(math.dist(p, q) < tol for q in other)


def _dedupe(runs: list[list[Point]], tol: float = 1.1) -> list[list[Point]]:
    """Drop a run that shadows one already kept — the second carriageway of a
    divided highway, or a frontage road running alongside it. At this scale the
    two are half a plate unit apart and would print as one thick smear."""
    kept: list[list[Point]] = []
    for run in sorted(runs, key=_length, reverse=True):
        pool = [p for k in kept for p in k]
        if pool:
            hits = sum(1 for p in run[::3] if _near(p, pool, tol))
            if hits > len(run[::3]) * 0.6:
                continue
        kept.append(run)
    return kept


def _clip(pts: list[Point], pad: float = 3.0) -> list[list[Point]]:
    """Split a run wherever it leaves the plate, so nothing is drawn far outside
    the rule and no line re-enters by cutting across the paper."""
    out: list[list[Point]] = []
    cur: list[Point] = []
    for x, y in pts:
        inside = -pad <= x <= W + pad and -pad <= y <= H + pad
        if inside:
            cur.append((x, y))
        elif cur:
            cur.append((x, y))  # carry one point out, so the line reaches the edge
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return [r for r in out if len(r) >= 2 and _length(r) > 1.5]


def road_runs(label: str, tol: float, dedupe_tol: float = 1.1) -> list[list[Point]]:
    runs = [_project(r) for r in _chain_ways(DATA["roads"][label])]
    runs = _dedupe(runs, dedupe_tol)
    out: list[list[Point]] = []
    for run in runs:
        for piece in _clip(run):
            s = simplify(piece, tol)
            if len(s) >= 2:
                out.append(s)
    return sorted(out, key=_length, reverse=True)


# --- The pen -----------------------------------------------------------------


def stroke(pts: list[Point], w0: float, wmid: float, w1: float, tol: float = 0.05) -> str:
    """A road as a tapered filled outline. Thickest through the middle of its
    run and thinning as it leaves the plate, the way a burin lifts."""
    return Spine(
        segments=chain(pts),
        widths=[(0.0, w0), (0.3, wmid), (0.7, wmid * 0.95), (1.0, w1)],
        samples=max(160, min(520, len(pts) * 8)),
        tolerance=tol,
    ).outline()


def centre(pts: list[Point]) -> tuple[str, float]:
    c = chain(pts)
    return curve(c), round(path_length(c), 1)


# --- Lettering ---------------------------------------------------------------
# A label on a plate follows the thing it names, so roads and creeks are
# lettered along their own line with <textPath>. Each carries a second, smoother
# path used only for the type: the drawn line keeps every real kink and the
# letters would trip over them.
#
# Placement is global rather than per-label. The first pass placed each name on
# the straightest run of its own road and produced "Collin County Outer Loop"
# written straight through "County Road 419". Names are laid down in order of
# how much a guest needs them, and each one reserves the box it occupies, so a
# later name has to find somewhere else to stand or go unlettered.

#: Roughly how wide a character of Mrs Eaves sets, as a fraction of its size.
_CHAR_W = 0.46

RESERVED: list[tuple[float, float, float, float]] = []


def _overlaps(box: tuple[float, float, float, float]) -> bool:
    x0, y0, x1, y1 = box
    return any(not (x1 < b[0] or b[2] < x0 or y1 < b[1] or b[3] < y0) for b in RESERVED)


def reserve(x0: float, y0: float, x1: float, y1: float) -> None:
    RESERVED.append((x0, y0, x1, y1))


def _resample(pts: list[Point], step: float = 0.35) -> list[Point]:
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        d = math.dist(a, b)
        n = max(1, int(d / step))
        for i in range(1, n + 1):
            u = i / n
            out.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
    return out


def _straightness(win: list[Point]) -> float:
    """Chord over arc. 1.0 is dead straight; type wants as close to it as the
    road will give, or the letters fan out at the bends."""
    arc = _length(win)
    return (math.dist(win[0], win[-1]) / arc) if arc else 0.0


def _box(win: list[Point], size: float) -> tuple[float, float, float, float]:
    pad = size * 0.9
    xs = [q[0] for q in win]
    ys = [q[1] for q in win]
    return (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)


def label_path(
    runs: list[list[Point]],
    text: str,
    size: float,
    *,
    inset: float = 7.0,
    prefer: float | None = None,
    claim: bool = True,
    straight_floor: float = 0.985,
) -> str | None:
    """The smoothest clear run along a road that will hold `text`, kept `inset`
    from the plate edge, oriented so the type reads left to right — or bottom to
    top on a road that runs north, which is the convention — and not overlapping
    anything already lettered. None when the road has nowhere left to say it."""
    want = len(text) * _CHAR_W * size + size
    best, best_score = None, -1.0
    for pts in runs:
        r = [q for q in _resample(pts) if inset <= q[0] <= W - inset and inset <= q[1] <= H - inset]
        n = max(4, int(want / 0.35))
        if len(r) <= n:
            continue
        for i in range(0, len(r) - n, 2):
            win = r[i : i + n]
            if _overlaps(_box(win, size)):
                continue
            straight = _straightness(win)
            # Below this the letters visibly fan and one of them is swallowed by
            # the bend — which is how "Collin County Outer Loop" first printed
            # as "Collin County Cuter Loop". A creek is held to a looser floor
            # than a road, because a creek that ran that straight would be a
            # canal and none of these are.
            if straight < straight_floor:
                continue
            score = straight
            if prefer is not None:
                mid = win[len(win) // 2]
                # Nudge a name toward a chosen height so two of them do not
                # crowd the same corner — without letting position beat
                # legibility, which is what the weighting keeps small.
                score -= min(0.3, abs(mid[1] - prefer) / H * 0.8)
            if score > best_score:
                best, best_score = win, score
    if best is None:
        return None
    # A textPath sets type along the path's own direction, so a run walked from
    # right to left prints the name upside down — which is what the first pass
    # did to Sister Grove Creek. The only rule that never does is: the baseline
    # must point into the right-hand half plane.
    dx, dy = best[-1][0] - best[0][0], best[-1][1] - best[0][1]
    if dx < 0 or (abs(dx) < 1e-9 and dy > 0):
        best = list(reversed(best))
    fitted = _fit_arc(best)
    if fitted is None:
        return None
    if claim:
        reserve(*_box(best, size))
    return fitted


def _fit_arc(win: list[Point], max_dev: float = 0.75) -> str | None:
    """A single smooth arc through the window, as one quadratic Bézier.

    The first version lettered along the road's own simplified polyline and the
    type came apart on it: the letters of "Collin County Outer Loop" bounced off
    the baseline at every join, and Chromium dropped the O of Outer outright.
    A textPath samples its path per glyph, so any kink in it is a kink in the
    word.

    A label is supposed to follow the *trend* of what it names rather than its
    every meander, so the window is reduced to its principal axis, a quadratic
    is fitted in that frame by least squares, and the result is emitted exactly
    — a quadratic in a rotated frame is a quadratic Bézier, with no error at
    all. If the road wanders further than `max_dev` from that arc the label
    would float off it, and the window is rejected instead.
    """
    n = len(win)
    mx = sum(q[0] for q in win) / n
    my = sum(q[1] for q in win) / n
    sxx = sum((q[0] - mx) ** 2 for q in win)
    syy = sum((q[1] - my) ** 2 for q in win)
    sxy = sum((q[0] - mx) * (q[1] - my) for q in win)
    # Principal axis of the window: the direction the name runs in.
    ang = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ca, sa = math.cos(ang), math.sin(ang)
    uv = [((q[0] - mx) * ca + (q[1] - my) * sa, -(q[0] - mx) * sa + (q[1] - my) * ca) for q in win]
    if uv[-1][0] < uv[0][0]:
        ca, sa = -ca, -sa
        uv = [(-u, -v) for u, v in uv]

    # Least squares v = a + b u + c u^2.
    s = [sum(u**k for u, _ in uv) for k in range(5)]
    tv = [sum(v * u**k for u, v in uv) for k in range(3)]
    m = [[s[0], s[1], s[2]], [s[1], s[2], s[3]], [s[2], s[3], s[4]]]
    coef = _solve3(m, tv)
    if coef is None:
        return None
    a, b, c = coef
    if any(abs(v - (a + b * u + c * u * u)) > max_dev for u, v in uv):
        return None

    u0, u1 = uv[0][0], uv[-1][0]
    d = u1 - u0
    if d <= 0.5:
        return None
    v0 = a + b * u0 + c * u0 * u0
    v1 = a + b * u1 + c * u1 * u1
    # The control point that makes the Bézier reproduce the quadratic exactly.
    cu = (u0 + u1) / 2
    cvv = v0 + (b * d + 2 * c * u0 * d) / 2

    def back(u: float, v: float) -> str:
        return f"{mx + u * ca - v * sa:.2f} {my + u * sa + v * ca:.2f}"

    return f"M{back(u0, v0)}Q{back(cu, cvv)} {back(u1, v1)}"


def _solve3(m: list[list[float]], rhs: list[float]) -> tuple[float, float, float] | None:
    """Gaussian elimination on the 3x3 normal equations."""
    a = [row[:] + [rhs[i]] for i, row in enumerate(m)]
    for i in range(3):
        pivot = max(range(i, 3), key=lambda r: abs(a[r][i]))
        if abs(a[pivot][i]) < 1e-12:
            return None
        a[i], a[pivot] = a[pivot], a[i]
        for r in range(3):
            if r == i:
                continue
            f = a[r][i] / a[i][i]
            for col in range(i, 4):
                a[r][col] -= f * a[i][col]
    return (a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2])


# --- The roads ---------------------------------------------------------------
# Six roads, five weights, and no two alike. The order is the hierarchy a driver
# actually feels: a freeway, two highways, a county loop, a town street, and the
# last lane. US 75 is nearly three times the weight of County Road 419 — the
# first pass drew them within a hair of each other and the plate read flat.

ROADS: list[dict] = []

_SPEC = [
    # label,                     simplify, w0,   wmid, w1,   dedupe
    ("US 75", 0.10, 0.46, 1.46, 0.46, 1.8),
    ("TX 121", 0.10, 0.30, 0.86, 0.30, 1.5),
    ("Collin County Outer Loop", 0.10, 0.24, 0.66, 0.24, 1.5),
    ("FM 455", 0.10, 0.22, 0.58, 0.22, 1.2),
    ("TX 5", 0.10, 0.20, 0.50, 0.20, 1.2),
    ("County Road 419", 0.05, 0.20, 0.46, 0.20, 0.8),
]

for _label, _tol, _w0, _wmid, _w1, _dd in _SPEC:
    _runs = road_runs(_label, _tol, _dd)
    ROADS.append(
        {
            "label": _label,
            "runs": [
                {"d": stroke(r, _w0, _wmid, _w1), **dict(zip(("c", "len"), centre(r)))}
                for r in _runs
            ],
            "pts": _runs,
        }
    )

# --- Water -------------------------------------------------------------------
# Three named creeks, and no more. The first pass drew five and sixteen stock
# ponds, and the plate read as scribble: at 15 km across a creek's real meanders
# are finer than the pen, so they have to be simplified until the line has a
# shape rather than a texture. They are the plate's only organic line and its
# counterpoint to the roads, so they are drawn finer than anything else on it
# and never in gold.

_WATER_KEEP = ("Slayter Creek", "Throckmorton Creek", "Sister Grove Creek")


def _water() -> list[dict]:
    by_name: dict[str, list[list[Point]]] = {}
    for w in DATA["water"]:
        if w["name"] not in _WATER_KEEP:
            continue
        by_name.setdefault(w["name"], []).append([(q[0], q[1]) for q in w["geom"]])
    out = []
    for name in _WATER_KEEP:
        runs = _dedupe([_project(r) for r in _chain_ways(by_name.get(name, []))], 1.2)
        pieces = []
        for run in runs:
            for piece in _clip(run, pad=1.0):
                s = simplify(piece, 0.3)
                if len(s) >= 3 and _length(s) > 9:
                    pieces.append(s)
        if not pieces:
            continue
        pieces.sort(key=_length, reverse=True)
        out.append(
            {
                "name": name,
                "pts": pieces,
                "d": [stroke(s, 0.07, 0.22, 0.07, tol=0.05) for s in pieces],
            }
        )
    return out


WATER = _water()

# --- Towns -------------------------------------------------------------------
# A town is built ground, not a dot. The first pass drew three concentric rings
# and they read as sonar. What an engraved plate actually cuts is an irregular
# edge with a few blocks inside it, and that is what this is: a wobbled outline
# for the wash to fill, and five small blocks laid on the street grid's angle.

_TOWN_R = {"Anna": 4.6, "Melissa": 3.6}
_TOWN_ANGLE = {"Anna": -0.06, "Melissa": 0.10}  # both towns sit on their railroad


def _town_edge(cx: float, cy: float, r: float, seed: int) -> str:
    ring = [
        (cx + math.cos(a) * r * (1.0 + 0.10 * math.sin(a * 3 + seed)),
         cy + math.sin(a) * r * (0.78 + 0.08 * math.cos(a * 2 + seed)))
        for a in (i * math.tau / 18 for i in range(18))
    ]
    ring = wobble(ring, r * 0.09, seed)
    return curve(chain(ring + [ring[0]])) + "Z"


def _town_blocks(cx: float, cy: float, r: float, ang: float, seed: int) -> str:
    rng = random_seq(seed)
    out = []
    for i in range(5):
        u, v = (next(rng) - 0.5) * r * 1.15, (next(rng) - 0.5) * r * 0.85
        w, h = r * (0.20 + 0.14 * next(rng)), r * (0.13 + 0.09 * next(rng))
        ca, sa = math.cos(ang), math.sin(ang)
        px, py = cx + u * ca - v * sa, cy + u * sa + v * ca
        corners = [(-w, -h), (w, -h), (w, h), (-w, h)]
        pts = [f"{px + x * ca - y * sa:.2f} {py + x * sa + y * ca:.2f}" for x, y in corners]
        out.append("M" + "L".join(pts) + "Z")
    return "".join(out)


TOWNS: list[dict] = []
for _i, _p in enumerate(sorted(DATA["places"], key=lambda q: q["name"])):
    _x, _y = FRAME.xy(_p["lat"], _p["lon"])
    _r = _TOWN_R.get(_p["name"], 3.6)
    _a = _TOWN_ANGLE.get(_p["name"], 0.0)
    TOWNS.append(
        {
            "name": _p["name"],
            "x": round(_x, 2),
            "y": round(_y, 2),
            "r": _r,
            "edge": _town_edge(_x, _y, _r, 7 + _i * 5),
            "blocks": _town_blocks(_x, _y, _r, _a, 23 + _i * 9),
        }
    )

# --- The venue ---------------------------------------------------------------
# Not a pin, and not a building — revision 6's gabled house read as a chapel,
# which is the one thing the brief forbids. Two passes were spent on a jasmine
# bloom before the obvious answer: an estate plate marks a property with its
# owner's seal, and this page already has one. The A and S monogram is pressed
# into the map where the wedding is, inside the same reku ring it wears on the
# wax, and it is the only mark on the plate at full-strength gold.
#
# No new construction — the geometry is the monogram's own, scaled. That is the
# rule the revision-6 handoff put first and every piece that broke this build
# broke it by ignoring it.

import monogram as mg  # noqa: E402


def _circle(cx: float, cy: float, r: float) -> str:
    return (
        f"M{cx - r:.2f} {cy:.2f}a{r:.2f} {r:.2f} 0 1 1 {r * 2:.2f} 0"
        f"a{r:.2f} {r:.2f} 0 1 1 {-r * 2:.2f} 0"
    )


#: The monogram is drawn in a 100 x 100 box about (50, 50), and it reads as a
#: mark rather than as letters at this size — which is what a seal on a map is.
#: Its own reku ring is set to 72% of the seal's radius so the A's feet, which
#: reach further than the ring does, still clear the rim. At parity they broke
#: through it.
SEAL_R = 5.6
_MONO_SCALE = 0.72 * SEAL_R / 37.6

VENUE = {
    "x": VENUE_X,
    "y": VENUE_Y,
    "r": SEAL_R,
    #: translate/scale that drops the monogram's own box onto the plate.
    "sealTransform": (
        f"translate({VENUE_X - 50 * _MONO_SCALE:.3f} {VENUE_Y - 50 * _MONO_SCALE:.3f})"
        f" scale({_MONO_SCALE:.5f})"
    ),
    "monoA": mg.a.outline() + mg.SERIFS,
    "monoS": mg.s.outline(),
    "reku": mg.reku_ring(50, 50, 37.6, 52, 2.2, 0.25),
    #: Two rules, as on the plate's own border, so the seal belongs to the plate
    #: rather than sitting on top of it.
    "rim": _circle(VENUE_X, VENUE_Y, SEAL_R),
    "rimInner": _circle(VENUE_X, VENUE_Y, SEAL_R - 0.62),
    "rimLen": round(2 * math.pi * SEAL_R, 1),
    #: The radius the wash under the seal reaches. Painted as a gradient in the
    #: component, not as a flat disc: at flat 14% it printed as a stain.
    "haloR": round(SEAL_R * 2.4, 2),
    #: County Road 419 is too short inside the frame to carry its own name along
    #: itself — nineteen units of type on a run that clears the seal by nine —
    #: so the seal carries it as a second line instead. It is the one road a
    #: guest still has to find after the highway, so it is lettered.
    "nameX": round(VENUE_X + SEAL_R + 1.9, 2),
    "nameY": round(VENUE_Y - 0.2, 2),
    "roadY": round(VENUE_Y + 3.9, 2),
}

# --- Lettering, placed -------------------------------------------------------
# In the order a guest needs the names. Whatever is placed first gets the best
# run; whatever comes last has to fit around it.

# The venue's own name and its bloom are reserved before anything else, so no
# road is lettered across the one thing the plate is for.
reserve(VENUE_X - 6.6, VENUE_Y - 6.6, VENUE_X + 6.6, VENUE_Y + 6.6)  # the seal
reserve(VENUE_X + 5.6, VENUE_Y - 5.0, VENUE_X + 36.0, VENUE_Y + 6.4)  # and its name
for _t in TOWNS:
    reserve(_t["x"] - 4.0, _t["y"] - 4.0, _t["x"] + 22.0, _t["y"] + 4.0)

ROAD_LABEL_SIZE = 2.6
WATER_LABEL_SIZE = 2.05

#: Where each name would rather sit, so the plate does not letter everything in
#: the same band. Only a nudge — a clear straight run still wins.
_PREFER = {
    "US 75": 56.0,
    "TX 121": 62.0,
    "Collin County Outer Loop": 45.0,
    "FM 455": 12.0,
}

_BY_LABEL = {r["label"]: r for r in ROADS}
for _name in ("US 75", "Collin County Outer Loop", "TX 121", "FM 455"):
    _r = _BY_LABEL[_name]
    _r["labelPath"] = label_path(
        _r["pts"], _name, ROAD_LABEL_SIZE, prefer=_PREFER.get(_name)
    )
# TX 5 is drawn but not lettered. It is Anna's main street, so the town's own
# name says where it is, and a sixth road name is one more than the plate holds.
_BY_LABEL["TX 5"]["labelPath"] = None
# County Road 419 is lettered under the venue's name — see VENUE["roadY"].
_BY_LABEL["County Road 419"]["labelPath"] = None

for _w in WATER:
    _w["labelPath"] = label_path(
        _w["pts"], _w["name"], WATER_LABEL_SIZE, inset=5.0, straight_floor=0.90
    )

# --- Scale bar and north -----------------------------------------------------
# The engraved conventions, and — now that the plate is true — the scale bar is
# actually readable: a guest can see that the venue is about four miles from the
# freeway. Both sit in the one band of the plate nothing else crosses, which is
# the strip below Melissa and east of TX 121. The first pass put the bar in the
# bottom-left corner, straight across US 75.

_MILE = 1.609344 / FRAME.km_per_unit
SCALE = {
    "x": 40.0,
    "y": 66.4,
    "mile": round(_MILE, 3),
    #: Two miles, in four half-mile blocks, alternately cut and open.
    "blocks": 4,
    "block": round(_MILE / 2, 3),
    "height": 1.0,
    #: One numeral, not three. Mrs Eaves has no lining figures — the licensed
    #: file carries no GSUB at all — so "0 1 2 miles" set as "O I 2 miles",
    #: with the zero reading as a letter. A bar that is exactly two miles long
    #: and says so once is both clearer and quieter.
    "label": "2 miles",
}
reserve(SCALE["x"] - 3.0, SCALE["y"] - 4.0, SCALE["x"] + 2 * _MILE + 12.0, SCALE["y"] + 3.0)

#: A single slim arrow, not a compass rose. The rose weighed as much as the
#: venue mark and competed with it for the one bold place on the plate.
_NX, _NY, _NL = 88.0, 66.0, 5.8
NORTH = {
    "x": _NX,
    "y": _NY,
    "shaft": f"M{_NX} {_NY}L{_NX} {_NY - _NL}",
    "head": (
        f"M{_NX} {_NY - _NL - 1.5}L{_NX + 1.0} {_NY - _NL + 0.95}"
        f"L{_NX} {_NY - _NL + 0.3}L{_NX - 1.0} {_NY - _NL + 0.95}Z"
    ),
}
reserve(_NX - 3.5, _NY - _NL - 3.0, _NX + 3.5, _NY + 4.0)

# --- Plate rules -------------------------------------------------------------
BORDER_OUTER = f"M1.2 1.2H{W - 1.2}V{H - 1.2}H1.2Z"
BORDER_INNER = f"M3.0 3.0H{W - 3.0}V{H - 3.0}H3.0Z"
CLIP = BORDER_INNER


if __name__ == "__main__":
    for r in ROADS:
        print(f"{r['label']:26s} {len(r['runs'])} runs, {sum(len(x['d']) for x in r['runs'])} chars")
    print(f"water {len(WATER)}: " + ", ".join(sorted({w['name'] for w in WATER})))
    print(f"lakes {len(LAKES)}  towns {[t['name'] for t in TOWNS]}")
    print(f"one mile = {_MILE:.2f} plate units")
