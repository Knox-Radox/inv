"""
The revision 6 ornament geometry — docs/revision-6-ornament.md.

Every piece is emitted twice, because line-plus-wash needs both:

* `sil` — one closed silhouette. It clips the wash sheet, and it is drawn again
  as a stroke inside its own clip to give the rim a drying wash leaves.
* `lines` — open centrelines with their lengths, which is the only kind of path
  `components/art/Stitch.tsx` can pull through the cloth.

Nothing here is mirrored. Two columns, two lamps and two urns that match are a
stencil, so every pair differs in height, in swell, or in where its detail
falls, by enough to see and not enough to look like a mistake.

Run through tools/emit_art.py, which writes components/art/ornament.ts.
"""

from __future__ import annotations

import math

from pen import chain, emit, path_length, simplify

Point = tuple[float, float]


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------
#: One decimal, not two.
#:
#: `pen.curve` emits hundredths, which is right for the seal — it is 40 px
#: across and a hundredth of a unit is a real distance there. None of this is:
#: the largest piece is a column authored in a 120-unit box and drawn at about
#: 110 px, so a hundredth of a unit is a nine-thousandth of a pixel. Emitting
#: it cost 5 KB gzipped of numbers nobody can see, over a third of this file.
def curve1(segments: list[tuple[Point, Point, Point, Point]]) -> str:
    p0 = segments[0][0]
    d = f"M{p0[0]:.1f} {p0[1]:.1f}"
    for _, p1, p2, p3 in segments:
        d += f"C{p1[0]:.1f} {p1[1]:.1f} {p2[0]:.1f} {p2[1]:.1f} {p3[0]:.1f} {p3[1]:.1f}"
    return d


def line(points: list[Point], w: float = 1.0) -> dict:
    """A smooth centreline through points, with its length and weight."""
    c = chain(points)
    return {"d": curve1(c), "len": round(path_length(c), 1), "w": w}


def bez(pts: list[Point], w: float = 1.0) -> dict:
    """An explicit cubic, where the shoulders have to be controlled."""
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}C" + " ".join(f"{x:.1f} {y:.1f}" for x, y in pts[1:])
    return {"d": d, "len": round(path_length([(pts[0], pts[1], pts[2], pts[3])]), 1), "w": w}


def _catmull(profile: list[tuple[float, float]], samples: int) -> list[tuple[float, float]]:
    """Resample a (y, half-width) profile smoothly.

    A lathe profile given as a handful of stations is a chain of straight
    ramps, and a turned object read as faceted. Catmull-Rom through the
    stations gives the swellings their shoulders back.
    """
    pts = [profile[0]] + list(profile) + [profile[-1]]
    out: list[tuple[float, float]] = []
    for i in range(len(profile) - 1):
        p0, p1, p2, p3 = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
        steps = max(2, int(samples * abs(p2[0] - p1[0]) / abs(profile[-1][0] - profile[0][0])))
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            y = 0.5 * (
                2 * p1[0]
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            w = 0.5 * (
                2 * p1[1]
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            out.append((y, max(w, 0.0)))
    out.append(profile[-1])
    return out


def lathe(cx: float, profile: list[tuple[float, float]], samples: int = 40, tol: float = 0.12):
    """A turned object from a (y, half-width) profile.

    Columns, lamp stems, urns and plinths are all one construction: a shape
    swept about a vertical axis. This returns the closed silhouette and the two
    edge centrelines separately, because the silhouette clips the wash and only
    an open centreline can be drawn on.
    """
    pts = _catmull(profile, samples)
    right = [(cx + w, y) for y, w in pts]
    left = [(cx - w, y) for y, w in pts]
    ring = simplify(right, tol) + simplify(left[::-1], tol)
    sil = emit(ring, close=True)

    def edge(side: list[Point]) -> dict:
        s = simplify(side, tol)
        segs = chain(s)
        return {"d": curve1(segs), "len": round(path_length(segs), 1)}

    return sil, edge(right), edge(left)


def leafshape(
    a: Point,
    b: Point,
    w: float,
    *,
    lbulge: float = 1.0,
    rbulge: float = 0.86,
    wob: float = 0.0,
    seed: int = 1,
) -> dict:
    """A leaf between a base and a tip: two margins, a midrib, a silhouette.

    Generalised out of the jasmine's `_leaf`, which is the construction on this
    page that already works — the two margins carry different weight and bulge
    by different amounts, so the leaf has a light side, and the midrib runs
    between them rather than down a mathematical centre.

    Everything botanical in revision 6 goes through this: the mango leaves of
    the thoranam, the acanthus of the capital, the banana blades, the cypress
    sprays. Drawing each of them freehand is how the capital ended up as a
    scribble of crossing curves; there is one leaf on this page and it is here.
    """
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1e-6
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux

    def P(t: float, v: float) -> Point:
        return (a[0] + ux * L * t + nx * v, a[1] + uy * L * t + ny * v)

    sil_pts = [
        a,
        P(0.20, w * lbulge * 0.98),
        P(0.56, w * lbulge * 0.80),
        b,
        P(0.60, -w * rbulge * 0.70),
        P(0.22, -w * rbulge * 0.88),
    ]
    return {
        "sil": blob(wobble(sil_pts, wob, seed) if wob else sil_pts),
        "left": bez([a, P(0.20, w * lbulge * 1.08), P(0.68, w * lbulge * 0.74), b]),
        "right": bez([a, P(0.26, -w * rbulge * 0.94), P(0.72, -w * rbulge * 0.64), b]),
        "mid": bez([a, P(0.40, w * 0.06), P(0.76, -w * 0.04), b]),
    }


def blob(points: list[Point], tol: float = 0.1) -> str:
    """A closed silhouette through points, for shapes that are not turned."""
    return curve1(chain(points + [points[0]])) + "Z"


def wobble(points: list[Point], amp: float, seed: int) -> list[Point]:
    """Push a silhouette out of true.

    The wash bleeding a hair past the line in places is the strongest single
    tell that something was painted rather than filled, so the shape the wash
    is clipped to is never the shape the line draws.
    """
    rng = random_seq(seed)
    out = []
    n = len(points)
    for i, (x, y) in enumerate(points):
        # Push along the local normal, so the shape swells and pinches rather
        # than jittering.
        px, py = points[(i - 1) % n]
        nx_, ny_ = points[(i + 1) % n]
        dx, dy = nx_ - px, ny_ - py
        m = math.hypot(dx, dy) or 1.0
        k = (next(rng) - 0.5) * 2 * amp
        out.append((x + (-dy / m) * k, y + (dx / m) * k))
    return out


def random_seq(seed: int):
    """A small deterministic sequence. The geometry must not change between
    runs, so this never touches the system RNG."""
    state = seed
    while True:
        state = (1103515245 * state + 12345) % 2147483648
        yield state / 2147483648


# ---------------------------------------------------------------------------
# 1. The column — docs/revision-6-ornament.md, piece 1
# ---------------------------------------------------------------------------
# Authored in a 120 x 460 box. The capital sits near the top and the shaft runs
# down and off the bottom edge, which is the reference's own framing: you are
# standing close enough that the building does not fit.
#
# The profile is read bottom-up in the list and top-down on the page, so y
# increases downward as everywhere else in this project.
def _column(cx: float, *, swell: float, height: float, flutes: int, seed: int):
    # Stations, top to bottom: abacus, the bell of the capital, the astragal
    # collar, then the shaft.
    #
    # Two proportions matter and a first pass got both wrong. The shaft was
    # sixteen diameters tall, which is a candlestick — Corinthian runs about
    # ten — and it tapered as a straight cone. A cone reads pinched, because
    # the eye supplies a curve that is not there. The stations below give the
    # shaft **entasis**: the half-width grows downward but the growth
    # decelerates, so the silhouette is faintly convex, which is the whole
    # trick and is invisible until it is missing.
    # A Corinthian capital is taller than it is wide — about one and a sixth
    # diameters. The first pass made it wide and shallow, which is an Ionic
    # proportion, and squeezing two tiers of acanthus into it turned the
    # carving into scribble. The bell runs to y=62 now and the abacus is
    # narrower, which buys the lobes room to be read.
    prof = [
        (0.0, 30.0 * swell),  # abacus, cropped away by the frame
        (9.0, 30.4 * swell),
        (11.5, 26.2 * swell),
        (14.0, 25.4 * swell),  # the bell, widest just under the abacus
        (26.0, 23.8 * swell),
        (40.0, 21.6 * swell),
        (54.0, 19.6 * swell),  # the bell meets the collar
        (58.0, 20.6 * swell),  # astragal
        (62.0, 19.2 * swell),
        (70.0, 19.4 * swell),  # top of the shaft
        (height * 0.32, 21.3 * swell),
        (height * 0.64, 22.2 * swell),
        (height, 22.6 * swell),
    ]
    sil, right, left = lathe(cx, prof, samples=46)

    lines: list[dict] = [
        {**right, "w": 1.2},
        {**left, "w": 0.85},
    ]

    def half_at(y: float) -> float:
        for (y0, w0), (y1, w1) in zip(prof, prof[1:]):
            if y0 <= y <= y1:
                k = 0.0 if y1 == y0 else (y - y0) / (y1 - y0)
                return w0 + k * (w1 - w0)
        return prof[-1][1]

    # Flutes. They follow the taper, start below the collar, and are not evenly
    # weighted: the light comes from the upper left, so the ones curving away
    # to the right carry more line.
    top, bot = 72.0, height
    for i in range(flutes):
        u = (i + 0.5) / flutes * 2 - 1  # -1 .. 1 across the shaft
        pts = []
        for s in range(7):
            y = top + (bot - top) * s / 6
            pts.append((cx + u * half_at(y) * 0.84, y))
        w = 0.40 + 0.46 * max(0.0, u) + 0.16 * abs(u)
        lines.append({**line(pts), "w": round(w, 2)})

    # The capital's acanthus. Drawn as lobes with two margins and a midrib
    # rather than one stroke each: a single curve per lobe read as a scratch,
    # and three read as a leaf even when the leaf is nine pixels tall.
    # The acanthus. Two passes drew each lobe as a bundle of hand-placed
    # cubics and both produced crossing curves that read as a monogram
    # scratched on a plate — the control points were mirrored across the axis
    # and the curves swapped sides. Every lobe is a `leafshape` now: a real
    # leaf with a base, a tip, two unequal margins and a midrib, drooping
    # outward and down from the bell exactly as carved acanthus does.
    rng = random_seq(seed)
    acanthus: list[str] = []
    for tier, (y0, y1, count, root_k, tip_k, wk) in enumerate(
        ((17.0, 39.0, 3, 0.26, 0.80, 0.30), (34.0, 59.0, 4, 0.20, 1.02, 0.26))
    ):
        hw = half_at(y1)
        for i in range(count):
            u = (i + 0.5) / count * 2 - 1
            j = (next(rng) - 0.5) * 1.6
            base = (cx + u * hw * root_k, y0 + j * 0.5)
            tip = (cx + u * hw * tip_k, y1 + j)
            span = math.hypot(tip[0] - base[0], tip[1] - base[1])
            lf = leafshape(base, tip, span * wk, lbulge=1.0, rbulge=0.82)
            acanthus.append(lf["sil"])
            lines.append({**lf["left"], "w": 0.8 if tier else 0.68})
            lines.append({**lf["right"], "w": 0.5 if tier else 0.44})
            lines.append({**lf["mid"], "w": 0.42})

    # The volutes: the two stems that curl out from under the abacus. They are
    # what says Corinthian rather than "a capital of some sort", so they are
    # drawn at shaft weight and given room by the taller bell.
    for side in (-1.0, 1.0):
        hw = half_at(14.0)
        ex, ey = cx + side * hw * 0.80, 19.0
        lines.append(
            {
                **bez(
                    [
                        (cx + side * hw * 0.22, 34.0),
                        (cx + side * hw * 0.56, 28.0),
                        (ex + side * 2.2, 23.0),
                        (ex, ey),
                    ]
                ),
                "w": 0.85,
            }
        )
        # The curl itself, a half turn tightening inward.
        lines.append(
            {
                **bez(
                    [
                        (ex, ey),
                        (ex - side * 4.4, ey - 1.8),
                        (ex - side * 4.8, ey + 3.6),
                        (ex - side * 1.2, ey + 3.4),
                    ]
                ),
                "w": 0.65,
            }
        )

    # The abacus and the astragal. Straight rules against all that curvature —
    # a capital is the one place a column is allowed to be architectural.
    for y, w in ((10.2, 1.1), (13.4, 0.75), (55.4, 1.0), (61.4, 0.85)):
        hw = half_at(y)
        lines.append({**line([(cx - hw, y), (cx, y - 0.4), (cx + hw, y)]), "w": w})

    return {
        "sil": sil,
        # The carved leaves are washed a shade deeper than the shaft, which is
        # what puts the capital in front of it. One path, so it is one clip.
        "acanthus": "".join(acanthus),
        "lines": lines,
        "cx": cx,
        "height": height,
    }


#: 120 x 760, not 120 x 460.
#:
#: At the shorter box the shaft ran out well above the lamps, so the stage read
#: as two disconnected bands — a row of columns that stopped, and below it a
#: pair of lamps standing on nothing. A column is cut off by the frame or it is
#: not a column, and at this length it is always the frame that ends it.
COLUMN_H = 760.0

COLUMN_L = _column(60.0, swell=1.0, height=COLUMN_H, flutes=6, seed=17)
# Not a mirror: a hair narrower, a different flute count so the rhythm does not
# rhyme across the page, and its acanthus falls differently.
COLUMN_R = _column(60.0, swell=0.94, height=COLUMN_H, flutes=7, seed=91)


# ---------------------------------------------------------------------------
# 2. The thoranam — docs/revision-6-ornament.md, piece 2
# ---------------------------------------------------------------------------
# Mango leaves on a gold cord, strung across a doorway. The commonest form of
# the thing, and the one that stays inside the palette: a marigold thoranam
# would have meant introducing saffron, and §6 of the brief rules out adding an
# accent colour.
#
# Authored in an 800 x 150 box. The cord runs off both edges — it is tied to
# something out of frame, which is both true of a real one and cheaper than
# drawing two more capitals.
THORANAM_W, THORANAM_H = 800.0, 210.0


def _thoranam():
    # A first pass hung twenty-one small leaves at even spacing on a shallow
    # cord and it read as bunting. Three things were wrong and all three are
    # about a real thoranam being *made in a hurry by hand on a morning*: the
    # cord sags much further than looks right on paper, the leaves are long and
    # overlap their neighbours, and no two are tied at the same angle.
    w, sag = THORANAM_W, 74.0

    def cord_y(x: float) -> float:
        """A cord hanging under its own weight — cosh, not a parabola. A
        parabola is a *loaded* cable and reads stiff at the ends."""
        t = (x / w) * 2 - 1
        return 8.0 + sag * (1.0 - math.cosh(t * 1.36) / math.cosh(1.36)) / (
            1.0 - 1.0 / math.cosh(1.36)
        )

    cord_pts = [(x, cord_y(x)) for x in [w * i / 26 for i in range(27)]]
    cord = {**line(cord_pts), "w": 1.6}

    rng = random_seq(2207)
    leaves: list[dict] = []
    clusters: list[dict] = []
    count = 26
    for i in range(count):
        # Spacing is uneven. Leaves tied by hand bunch and gap.
        jitterx = (next(rng) - 0.5) * (w / count) * 0.55
        x = w * (i + 0.5) / count + jitterx
        y = cord_y(x)
        r1, r2, r3 = next(rng), next(rng), next(rng)

        # Mango leaves are lanceolate — four or five times as long as wide,
        # widest below the middle, drawn to a fine point.
        L = 44.0 + r1 * 30.0
        W = L * (0.19 + r2 * 0.05)
        # They hang, so the lean is small, but it is never zero and it is not a
        # function of position alone or the string reads as a fan.
        ang = math.radians((x / w - 0.5) * 15.0 + (r3 - 0.5) * 34.0)
        ca, sa = math.sin(ang), math.cos(ang)

        def place(u: float, v: float, _x=x, _y=y, _ca=ca, _sa=sa) -> Point:
            return (_x + _ca * u + _sa * v, _y + _sa * u - _ca * v)

        # A short tie from the cord to the leaf's stalk. Without it every leaf
        # grows straight out of the rope, which is the bunting tell.
        tie_len = 4.0 + r2 * 5.0
        tie = bez(
            [
                (x, y),
                place(tie_len * 0.4, 0.6),
                place(tie_len * 0.7, -0.4),
                place(tie_len, 0),
            ]
        )

        base = place(tie_len, 0)
        tip = place(tie_len + L, 0)
        lf = leafshape(base, tip, W, lbulge=1.06, rbulge=0.88, wob=0.8, seed=400 + i * 7)
        leaves.append(
            {
                "sil": lf["sil"],
                "lines": [
                    {**tie, "w": 0.55},
                    {**lf["left"], "w": 1.0},
                    {**lf["right"], "w": 0.68},
                    {**lf["mid"], "w": 0.5},
                ],
                # Where along the cord it hangs, so it can drop in as the cord
                # reaches it rather than the whole string arriving at once.
                "t": round(min(1.0, max(0.0, x / w)), 4),
                # Each leaf swings on its own period, or the string pulses as
                # one object, which is the thing that would give it away.
                "sway": round(4.2 + r2 * 3.4, 2),
                "phase": round(r3 * 5.0, 2),
                "x": round(x, 1),
                "y": round(y, 1),
            }
        )

        # A jasmine cluster every sixth tie, hung below the leaf line on its
        # own thread so it is not lost behind a leaf. The flower the page
        # already knows, doing the job a marigold would otherwise do.
        if i % 6 == 3:
            drop = tie_len + L * (0.52 + r1 * 0.2)
            cx_, cy_ = place(drop, W * 1.9)
            stalk = bez(
                [(x, y), place(drop * 0.4, W * 1.1), place(drop * 0.75, W * 1.9), (cx_, cy_)]
            )
            # Petals as real leaf shapes rather than hairlines. At six units
            # across, a jasmine drawn in single strokes read as an insect on
            # the string; drawn as six small filled petals it reads as a
            # flower, which is the same lesson the acanthus taught.
            petals = []
            sils = []
            for k in range(6):
                a2 = 2 * math.pi * k / 6 + r1 * 2.0
                r = 10.5 + (k % 2) * 2.2
                tipk = (cx_ + math.cos(a2) * r, cy_ + math.sin(a2) * r)
                pl = leafshape((cx_, cy_), tipk, r * 0.34, lbulge=1.0, rbulge=0.94)
                sils.append(pl["sil"])
                petals += [{**pl["left"], "w": 0.55}, {**pl["right"], "w": 0.45}]
            clusters.append(
                {
                    "stalk": {**stalk, "w": 0.5},
                    "sil": "".join(sils),
                    "petals": petals,
                    "cx": round(cx_, 1),
                    "cy": round(cy_, 1),
                    "r": 3.0,
                    "t": round(min(1.0, max(0.0, x / w)), 4),
                }
            )

    return {"cord": cord, "leaves": leaves, "clusters": clusters, "sag": sag}


THORANAM = _thoranam()


# ---------------------------------------------------------------------------
# 3. The kuthuvilakku — docs/revision-6-ornament.md, piece 3
# ---------------------------------------------------------------------------
# The standing brass lamp lit at a South Indian threshold. A turned stem, a
# wide oil dish with beaks for the wicks, and a peacock at the crest — which is
# the classic finial and is also the page's only peacock, so it is not a motif
# being repeated for effect.
#
# Authored in a 100 x 210 box, the flame separate so it can burn on its own.
def _lamp(cx: float, *, scale: float, tall: float, seed: int):
    s = scale
    # The stem, as a lathe profile. y grows downward; the foot is at 200.
    #
    # Proportion note from the first pass: the dish was as wide as the base and
    # the whole thing read as a bird bath. On a real kuthuvilakku the dish is
    # narrower than the foot and sits high on a long stem — the lamp is *tall*,
    # and that is what makes it read as a lamp rather than as a bowl.
    def y(v: float) -> float:
        return 200.0 - (200.0 - v) * tall

    prof = [
        (y(72.0), 3.9 * s),  # top of the stem, under the dish
        (y(80.0), 5.2 * s),
        (y(90.0), 3.6 * s),  # collar
        (y(96.0), 4.4 * s),
        (y(108.0), 8.2 * s),  # upper baluster
        (y(118.0), 8.4 * s),
        (y(128.0), 5.2 * s),
        (y(134.0), 3.8 * s),  # collar
        (y(140.0), 4.8 * s),
        (y(150.0), 9.0 * s),  # lower baluster, heavier than the upper
        (y(160.0), 9.6 * s),
        (y(170.0), 5.6 * s),
        (y(176.0), 5.2 * s),
        (y(186.0), 13.0 * s),  # the foot flares
        (y(193.0), 19.5 * s),
        (y(197.0), 22.0 * s),
        (y(200.0), 21.0 * s),  # the base, spread wide to stand on
    ]
    stem_sil, stem_r, stem_l = lathe(cx, prof, samples=44)

    # The dish: a shallow boat with a beak at each end, seen a little from
    # above so its mouth is an ellipse rather than a line. The beaks are part
    # of the silhouette rather than strokes hung off it, which is why they now
    # read as spouts instead of as curls.
    dy = y(66.0)
    dw = 15.0 * s
    beak = 22.5 * s
    dish_pts = [
        (cx - beak, dy - 0.6 * s),  # left beak tip
        (cx - dw * 0.80, dy + 6.2 * s),
        (cx, dy + 9.2 * s),  # deeper than it is wide: an oil bowl, not a saucer
        (cx + dw * 0.80, dy + 6.2 * s),
        (cx + beak, dy - 1.4 * s),  # right beak tip, not level with the left
        (cx + dw * 0.74, dy - 5.0 * s),
        (cx, dy - 6.2 * s),
        (cx - dw * 0.74, dy - 4.8 * s),
    ]
    dish_sil = blob(dish_pts)

    lines = [
        {**stem_r, "w": 1.05},
        {**stem_l, "w": 0.72},
        # The rim, the far lip, and the oil standing inside it.
        {**line([(cx - beak, dy - 0.6 * s), (cx, dy + 9.2 * s), (cx + beak, dy - 1.4 * s)]), "w": 1.0},
        {**line([(cx - beak, dy - 0.6 * s), (cx, dy - 6.2 * s), (cx + beak, dy - 1.4 * s)]), "w": 0.85},
        {
            **line(
                [
                    (cx - dw * 0.70, dy - 0.8 * s),
                    (cx, dy - 3.4 * s),
                    (cx + dw * 0.70, dy - 1.2 * s),
                ]
            ),
            "w": 0.45,
        },
    ]

    # The finial: a lotus bud.
    #
    # This was a peacock for two passes, because a peacock is the classic
    # kuthuvilakku crest and it is the better idea on paper. It does not
    # survive the size. Drawn in strokes it was a scribble; redrawn as a filled
    # silhouette it read as a bird but its tail read as antennae, and at the
    # ~70 px the lamp gets on a phone the whole finial is fifteen pixels tall.
    # This is exactly the failure the plan predicted for lobe-by-lobe carving
    # and then walked into anyway.
    #
    # A lotus bud is the other finial these lamps are actually made with, it is
    # three curves, and it is unmistakable at any size. Choosing the form that
    # survives the medium is not a compromise; drawing a bird nobody can see
    # would have been the compromise.
    px, py = cx, dy - 6.0 * s
    h = 22.0 * s * (0.55 + 0.45 * tall)
    bud = blob(
        [
            (px, py + 1.0 * s),
            (px + 4.6 * s, py - h * 0.26),
            (px + 3.4 * s, py - h * 0.62),
            (px + 0.9 * s, py - h * 0.88),
            (px, py - h),  # the point
            (px - 0.9 * s, py - h * 0.88),
            (px - 3.4 * s, py - h * 0.60),
            (px - 4.6 * s, py - h * 0.24),
        ]
    )
    # Two petal seams, so the bud is a bud and not a leaf. They stop short of
    # the point, the way the outer petals of a closed lotus do.
    for side in (-1.0, 1.0):
        lines.append(
            {
                **bez(
                    [
                        (px + side * 0.4 * s, py + 0.4 * s),
                        (px + side * 3.0 * s, py - h * 0.22),
                        (px + side * 2.4 * s, py - h * 0.56),
                        (px + side * 0.5 * s, py - h * 0.80),
                    ]
                ),
                "w": 0.5,
            }
        )
    # The collar it stands on.
    lines.append(
        {**line([(px - 5.0 * s, py + 1.2 * s), (px, py - 0.4 * s), (px + 5.0 * s, py + 1.2 * s)]), "w": 0.6}
    )

    # The flames, one on each beak. Anchored *on* the beak tips rather than
    # floated beside the lamp, which is what made the first pass look pasted.
    flames = []
    for side, k in ((-1.0, 1.0), (1.0, 0.86)):
        fx = cx + side * beak
        fy = dy - (0.6 if side < 0 else 1.4) * s
        fh = 15.0 * s * k
        flames.append(
            {
                "body": blob(
                    [
                        (fx + 0.4 * side * s, fy),
                        (fx + 3.0 * s * k, fy - fh * 0.36),
                        (fx + 1.4 * s * k, fy - fh * 0.76),
                        (fx + 0.1 * s, fy - fh),
                        (fx - 1.9 * s * k, fy - fh * 0.70),
                        (fx - 3.0 * s * k, fy - fh * 0.32),
                    ]
                ),
                "core": blob(
                    [
                        (fx + 0.1 * s, fy - fh * 0.10),
                        (fx + 1.4 * s * k, fy - fh * 0.32),
                        (fx + 0.3 * s, fy - fh * 0.60),
                        (fx - 1.2 * s * k, fy - fh * 0.32),
                    ]
                ),
                "x": round(fx, 1),
                "y": round(fy, 1),
                "r": round(fh * 2.4, 1),
                # The two never flicker together.
                "period": 2.6 if side < 0 else 3.7,
                "delay": 0.0 if side < 0 else -1.3,
            }
        )

    return {"sil": stem_sil, "dish": dish_sil, "bud": bud, "lines": lines, "flames": flames}


# The left lamp stands taller and heavier. Two identical lamps either side of a
# countdown is a stencil; a pair that was made by hand is not a pair.
LAMP_L = _lamp(50.0, scale=1.0, tall=1.0, seed=5)
LAMP_R = _lamp(50.0, scale=0.93, tall=0.86, seed=23)
