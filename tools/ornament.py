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
import re

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


def rosette(cx: float, cy: float, r: float, petals: int, rot: float, seed: int) -> dict:
    """A small flower seen face on, as **one closed outline** with its length.

    Built for the malai, where the first pass drew every petal as two margins
    and a midrib. Forty-six flowers at twelve strokes each is five hundred and
    fifty paths for a garland eight pixels wide, and what it actually rendered
    was a row of asterisks — at that size the strokes crossing at the centre
    are most of the ink.

    One outline through alternating tips and valleys reads as a flower, draws
    on in a single stroke, and is a twelfth of the payload. The valley radius
    is what decides whether it is a flower or a star: much below a third and
    the petals separate into spikes.
    """
    rng = random_seq(seed)
    pts: list[Point] = []
    for k in range(petals):
        a = rot + 2 * math.pi * k / petals
        half = math.pi / petals
        tip_r = r * (0.90 + 0.10 * next(rng))
        # Two points across each petal rather than one at its point. A single
        # tip with a Catmull-Rom through it overshoots into a spike, and a
        # ring of spikes is an asterisk — which is exactly what the first
        # garland rendered as at eight pixels wide.
        for u in (-0.34, 0.34):
            pts.append((cx + math.cos(a + half * u) * tip_r, cy + math.sin(a + half * u) * tip_r))
        # The valley is over half the tip radius. Much below that and the
        # petals stop being lobes and start being points.
        vr = r * (0.60 + 0.05 * next(rng))
        pts.append((cx + math.cos(a + half) * vr, cy + math.sin(a + half) * vr))
    c = chain(pts + [pts[0]])
    return {"d": curve1(c) + "Z", "len": round(path_length(c), 1)}


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


_CMD = re.compile(r"([MmCcLlHhVvZz])|(-?\d*\.?\d+(?:e-?\d+)?)")


def path_bbox(ds: list[str], pad: float = 5.0) -> list[float]:
    """The box a set of `d` strings actually occupies, plus a margin.

    Every ornament in revision 6 was authored in a round-numbered box — 300x420
    for the banana, 100x214 for the lamp — and every one of them drew outside
    it. An `<svg>` clips to its viewport, so the left banana lost a leaf, the
    urns lost the top of their jasmine and the lamps lost the tops of their
    flames, and none of it was visible in the preview harness because that had
    `overflow: visible` on the svg. The viewBox is measured now.

    Control points are counted as though they were on the curve, which
    overestimates slightly. That is the right direction to be wrong in.
    """
    xs: list[float] = []
    ys: list[float] = []
    for d in ds:
        cx = cy = 0.0
        cmd = "M"
        nums: list[float] = []

        def flush() -> None:
            nonlocal cx, cy, nums
            if not nums:
                return
            rel = cmd.islower()
            k = cmd.upper()
            step = {"M": 2, "L": 2, "C": 6, "H": 1, "V": 1}.get(k, 2)
            for i in range(0, len(nums) - step + 1, step):
                chunk = nums[i : i + step]
                if k == "H":
                    cx = cx + chunk[0] if rel else chunk[0]
                elif k == "V":
                    cy = cy + chunk[0] if rel else chunk[0]
                else:
                    for j in range(0, len(chunk), 2):
                        x = cx + chunk[j] if rel else chunk[j]
                        y = cy + chunk[j + 1] if rel else chunk[j + 1]
                        xs.append(x)
                        ys.append(y)
                    cx = cx + chunk[-2] if rel else chunk[-2]
                    cy = cy + chunk[-1] if rel else chunk[-1]
                xs.append(cx)
                ys.append(cy)
            nums = []

        for m in _CMD.finditer(d):
            if m.group(1):
                flush()
                cmd = m.group(1)
                if cmd in "Zz":
                    cmd = "M"
            else:
                nums.append(float(m.group(2)))
        flush()

    if not xs:
        return [0.0, 0.0, 1.0, 1.0]
    x0, x1 = min(xs) - pad, max(xs) + pad
    y0, y1 = min(ys) - pad, max(ys) + pad
    return [round(x0, 1), round(y0, 1), round(x1 - x0, 1), round(y1 - y0, 1)]


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
            # One closed outline, not six leaf shapes. Same lesson as the
            # malai: at this size the strokes meeting at the centre are most
            # of the ink and the flower reads as an insect.
            ring = rosette(cx_, cy_, 11.5, 6, r1 * 6.28, 500 + i * 11)
            clusters.append(
                {
                    "stalk": {**stalk, "w": 0.5},
                    "sil": ring["d"],
                    "len": ring["len"],
                    "cx": round(cx_, 1),
                    "cy": round(cy_, 1),
                    "r": 2.6,
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


# ---------------------------------------------------------------------------
# 4. The drape — CUT
# ---------------------------------------------------------------------------
# A hung length of silk sat here for three passes and never worked. It is
# recorded rather than quietly dropped, because the reason is a general one.
#
# A drape reads by **light**: alternating lit and shadowed bands running down
# its folds, one band per pleat. Everything else — the silhouette, the pleat
# lines, the hem, even a zari border — is scaffolding around that, and without
# it the piece renders as a grey rectangle with a wavy right edge. Three
# versions confirmed it: a generic curtain, a curtain with a woven gold edge,
# and the same panel brought fully into frame so the whole thing could be
# judged. All three read as a bookmark.
#
# Doing it properly needs a per-fold shading model, which is a lighting problem
# and not a drawing one, and at the end of it the page would have a European
# curtain doing work the thoranam, the malai, the columns and the lamps already
# do — and doing it with meaning, which the curtain never had. It was the only
# piece in the programme that was pure venue dressing.
#
# See docs/revision-6-ornament.md § What was cut.


# ---------------------------------------------------------------------------
# 5. The jasmine malai — docs/revision-6-ornament.md, piece 5
# ---------------------------------------------------------------------------
# The strung garland. Not a wreath and not a spray: a malai is a *line* of
# flowers, which is why jasmine was the page's motif in the first place — see
# the note at the top of tools/jasmine.py.
#
# It hangs down the field past both moments of the day, which is the same
# argument the running thread makes about the seven and a half hours between
# the ceremony and the reception, made in the other material: the day is one
# thing, and nothing about it breaks in the middle.
#
# Authored in a 130 x 940 box, bleeding off the top.
MALAI_W, MALAI_H = 130.0, 940.0


def _malai():
    w, h = MALAI_W, MALAI_H
    rng = random_seq(7717)

    def cord_x(t: float) -> float:
        """A hanging string is not plumb. Two low harmonics, no more — a third
        makes it read as a vine rather than as something under its own weight."""
        return 62.0 + 11.0 * math.sin(t * 3.05 + 0.4) + 4.5 * math.sin(t * 7.7 + 1.2)

    top, bot = -20.0, h - 96.0
    cord_pts = [(cord_x(i / 22), top + (bot - top) * i / 22) for i in range(23)]
    cord = {**line(cord_pts), "w": 1.0}

    flowers: list[dict] = []
    # Dense. A malai is a *rope* of flowers, packed so they touch and overlap;
    # thirty-two spaced along a metre of string read as a chain of asterisks
    # with the cord showing through between them, which is a zip, not a
    # garland. At this count and radius they overlap by about a third and the
    # string is hidden behind them, which is what it looks like in the hand.
    count = 54
    for i in range(count):
        t = (i + 0.5) / count
        y = top + (bot - top) * t
        r1, r2, r3 = next(rng), next(rng), next(rng)
        # Strung flowers alternate to either side of the string, which is what
        # gives a malai its thickness. The offset is not regular: a garland
        # tied by hand bunches.
        side = 1.0 if i % 2 else -1.0
        cx_ = cord_x(t) + side * (4.5 + r1 * 8.0)
        cy_ = y + (r2 - 0.5) * 6.0
        rad = 16.5 + r1 * 6.0
        n = 5 if r3 < 0.5 else 6
        ring = rosette(cx_, cy_, rad, n, r2 * 6.28, 900 + i * 13)
        flowers.append(
            {
                "sil": ring["d"],
                "len": ring["len"],
                "cx": round(cx_, 1),
                "cy": round(cy_, 1),
                "r": round(rad * 0.15, 2),
                "t": round(t, 4),
                # Bound to the string, so it turns about where it is tied.
                "ax": round(cord_x(t), 1),
                "ay": round(y, 1),
                "sway": round(5.0 + r3 * 3.6, 2),
                "phase": round(r1 * 6.0, 2),
            }
        )

    # A malai ends in a bunch, not in a last flower. Three buds and two leaves
    # on short pedicels, which is how the string is finished off and tied.
    tx, ty = cord_x(1.0), bot
    tail: list[dict] = []
    tail_sils: list[str] = []
    for k, (ang, ln) in enumerate(((-104.0, 46.0), (-84.0, 62.0), (-64.0, 40.0))):
        a = math.radians(ang + 180)
        tip = (tx + math.cos(a) * ln, ty + math.sin(a) * ln)
        pl = leafshape((tx, ty), tip, ln * 0.13, lbulge=1.0, rbulge=0.86)
        tail_sils.append(pl["sil"])
        tail += [{**pl["left"], "w": 0.7}, {**pl["right"], "w": 0.5}, {**pl["mid"], "w": 0.4}]

    return {
        "cord": cord,
        "flowers": flowers,
        "tail": {"sil": "".join(tail_sils), "lines": tail, "x": round(tx, 1), "y": round(ty, 1)},
    }


MALAI = _malai()


# ---------------------------------------------------------------------------
# Blades — the primitive the banana and the cypress need
# ---------------------------------------------------------------------------
def blade(points: list[Point], widths: list[tuple[float, float]], tol: float = 0.14) -> dict:
    """A leaf on a *curved* spine.

    `leafshape` runs between a base and a tip in a straight line, which is
    right for a mango leaf and wrong for a banana blade — a banana leaf is two
    metres long and arches under its own weight, and the arch is most of what
    identifies it. This offsets along the normal of a real curve instead, the
    same construction `pen.Spine` uses for the seal's letterforms.
    """
    segs = chain(points)
    n = 46
    left: list[Point] = []
    right: list[Point] = []
    mid: list[Point] = []

    def width_at(t: float) -> float:
        for (t0, w0), (t1, w1) in zip(widths, widths[1:]):
            if t0 <= t <= t1:
                k = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
                k = k * k * (3 - 2 * k)
                return w0 + k * (w1 - w0)
        return widths[-1][1]

    for i in range(n + 1):
        t = i / n
        raw = t * len(segs)
        j = min(int(raw), len(segs) - 1)
        lt = raw - j
        p0, p1, p2, p3 = segs[j]
        u = 1 - lt
        x = u * u * u * p0[0] + 3 * u * u * lt * p1[0] + 3 * u * lt * lt * p2[0] + lt**3 * p3[0]
        y = u * u * u * p0[1] + 3 * u * u * lt * p1[1] + 3 * u * lt * lt * p2[1] + lt**3 * p3[1]
        dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * lt * (p2[0] - p1[0]) + 3 * lt * lt * (p3[0] - p2[0])
        dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * lt * (p2[1] - p1[1]) + 3 * lt * lt * (p3[1] - p2[1])
        m = math.hypot(dx, dy) or 1e-6
        nx, ny = -dy / m, dx / m
        h = width_at(t) / 2
        left.append((x + nx * h, y + ny * h))
        right.append((x - nx * h, y - ny * h))
        mid.append((x, y))

    sil = emit(simplify(left, tol) + simplify(right[::-1], tol), close=True)
    return {
        "sil": sil,
        "left": {**line(simplify(left, tol))},
        "right": {**line(simplify(right, tol))},
        "mid": {**line(simplify(mid, tol))},
        "pts": mid,
    }


# ---------------------------------------------------------------------------
# 6. The banana stems — docs/revision-6-ornament.md, piece 6
# ---------------------------------------------------------------------------
# Vazhai: two banana plants tied either side of the entrance. The single most
# literal thing a South Indian family does to a doorway on a wedding morning,
# and the one ornament here that is not a stand-in for anything.
#
# Authored in a 300 x 420 box, standing on its own floor.
BANANA_W, BANANA_H = 300.0, 420.0


def _banana():
    rng = random_seq(3301)
    stems = []
    # Two plants, unequal, the smaller behind and to the right.
    for si, (bx, scale, lean) in enumerate(((104.0, 1.0, -1.5), (196.0, 0.78, 3.0))):
        s = scale
        base_y = 404.0
        top_y = base_y - 152.0 * s
        # The pseudostem: a sheath of rolled leaf, so it is nearly a cylinder
        # and only slightly narrower at the top.
        prof = [
            (top_y, 6.2 * s),
            (top_y + 30 * s, 7.4 * s),
            (base_y - 60 * s, 9.6 * s),
            (base_y - 16 * s, 11.8 * s),
            (base_y, 13.4 * s),
        ]
        stem_sil, stem_r, stem_l = lathe(bx + lean, prof, samples=26)

        lines = [{**stem_r, "w": 0.9}, {**stem_l, "w": 0.62}]
        blades = []
        # Four blades, alternating sides, each arching further as it goes
        # lower and older. The lowest one is torn — wind splits a banana leaf
        # along its lateral veins within days, and an unsplit one reads as
        # plastic.
        # Six blades, not four, and the lower pair springing from well down
        # the sheath. Four leaves radiating from the top of a bare stem is a
        # palm; a banana carries its whole crown low and overlapping.
        specs = [
            (-1.0, 140.0, -52.0, 0.88),
            (1.0, 126.0, -40.0, 0.78),
            (-1.0, 108.0, -14.0, 0.68),
            (1.0, 96.0, 2.0, 0.60),
            (-1.0, 78.0, 26.0, 0.50),
            (1.0, 68.0, 34.0, 0.44),
        ]
        for li, (side, length, drop, wk) in enumerate(specs):
            L = length * s
            r1 = next(rng)
            ox = bx + lean
            tipx = ox + side * L * (0.82 + r1 * 0.16)
            spine = [
                (ox, top_y + li * 5.0 * s),
                (ox + side * L * 0.34, top_y - 18 * s + drop * 0.2 * s),
                (ox + side * L * 0.70, top_y + drop * 0.55 * s),
                (tipx, top_y + drop * s + L * 0.30),
            ]
            bl = blade(
                spine,
                [(0.0, 3.0 * s), (0.22, 30.0 * s * wk), (0.62, 26.0 * s * wk), (1.0, 3.0 * s)],
            )
            blades.append(bl["sil"])
            lines += [
                {**bl["left"], "w": 0.75},
                {**bl["right"], "w": 0.5},
                {**bl["mid"], "w": 1.0},
            ]
            # Lateral veins: they leave the midrib at a shallow angle and run
            # straight to the margin, which is the other half of what makes a
            # banana leaf a banana leaf.
            def half_at(t: float, _wk=wk, _s=s) -> float:
                """The blade's own half-width where the vein leaves the midrib.

                A constant reach put every vein through the margin near the
                tip, where the profile has already tapered to nothing — the
                plant came out looking like a thistle. The stations below are
                the same ones passed to `blade`.
                """
                prof = ((0.0, 3.0 * _s), (0.22, 30.0 * _s * _wk), (0.62, 26.0 * _s * _wk), (1.0, 3.0 * _s))
                for (t0, w0), (t1, w1) in zip(prof, prof[1:]):
                    if t0 <= t <= t1:
                        k2 = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
                        k2 = k2 * k2 * (3 - 2 * k2)
                        return (w0 + k2 * (w1 - w0)) / 2
                return prof[-1][1] / 2

            for k in range(5):
                t = 0.22 + k * 0.16
                idx = int(t * (len(bl["pts"]) - 1))
                px, py = bl["pts"][idx]
                nxt = bl["pts"][min(idx + 3, len(bl["pts"]) - 1)]
                dx, dy = nxt[0] - px, nxt[1] - py
                m = math.hypot(dx, dy) or 1.0
                nx_, ny_ = -dy / m, dx / m
                reach = half_at(t) * (0.62 + 0.14 * next(rng))
                for sgn in (1, -1):
                    lines.append(
                        {
                            **bez(
                                [
                                    (px, py),
                                    (px + nx_ * reach * 0.34 * sgn + dx * 0.4, py + ny_ * reach * 0.34 * sgn + dy * 0.4),
                                    (px + nx_ * reach * 0.72 * sgn + dx * 0.7, py + ny_ * reach * 0.72 * sgn + dy * 0.7),
                                    (px + nx_ * reach * sgn + dx * 0.7, py + ny_ * reach * sgn + dy * 0.7),
                                ]
                            ),
                            "w": 0.32,
                        }
                    )
        stems.append(
            {
                "sil": stem_sil,
                "blades": "".join(blades),
                "lines": lines,
                "x": round(bx, 1),
                "y": round(base_y, 1),
                "rx": round(30.0 * s, 1),
            }
        )
    return stems


BANANA = _banana()


# ---------------------------------------------------------------------------
# 7. The cypress — CUT, and replaced by the bough below
# ---------------------------------------------------------------------------
# Two passes, two different wrong plants. A smooth spindle profile with long
# raking strokes inside rendered as three aloe leaves; adding tufts to the
# profile and making the strokes droop rendered as agave. Both failures are the
# same failure: a conifer's silhouette is not a profile with noise on it, it is
# an accumulation of overlapping sprays, and drawing one convincingly means
# stacking dozens of small dark shapes rather than lathing one and marking it.
#
# It was also, like the drape, pure venue dressing with nothing behind it. The
# thing that belongs on the other side of the map plate is the plant this whole
# page has been about since revision 1.
#
# See docs/revision-6-ornament.md § What was cut.


# ---------------------------------------------------------------------------
# 7. The jasmine bough — docs/revision-6-ornament.md, piece 7
# ---------------------------------------------------------------------------
# The spray on the card, grown up.
#
# `docs/design-plan.md` § Illustration inventory already listed this as item
# 10 — "oversized cropped jasmine, the card's spray at 340%" — and it was never
# built. It is the right answer here for the reason it was the right answer
# then: at that scale the jasmine stops being a mark on a card and becomes a
# branch leaning into the frame, and it is the one botanical on this page that
# the guests will actually be wearing.
#
# Authored in a 300 x 460 box, entering from the top right.
BOUGH_W, BOUGH_H = 300.0, 460.0


def _bough():
    rng = random_seq(5501)
    # The branch, entering top right and sweeping down and left. Four sub-paths
    # at stepped widths, thinning toward the growing tip — the same
    # construction as the card's spray, which is drawn from the Hortus plate.
    spine_pts = [(292.0, -16.0), (250.0, 60.0), (206.0, 128.0), (150.0, 196.0), (86.0, 262.0), (44.0, 336.0)]
    widths = [(0.0, 5.4), (0.35, 4.0), (0.7, 2.6), (1.0, 1.1)]
    br = blade(spine_pts, widths, tol=0.1)
    lines = [{**br["left"], "w": 0.9}, {**br["right"], "w": 0.6}]
    parts = [br["sil"]]

    pts = br["pts"]

    def at(t: float):
        i = min(int(t * (len(pts) - 1)), len(pts) - 2)
        (x, y), (nx_, ny_) = pts[i], pts[i + 1]
        dx, dy = nx_ - x, ny_ - y
        m = math.hypot(dx, dy) or 1.0
        return (x, y), (-dy / m, dx / m)

    # Leaves in opposite pairs, none matching. Jasminum sambac is ovate and
    # nearly as wide as it is long, which is what stops this reading as bay.
    leaves = []
    for i, (t, side, L, ang) in enumerate(
        (
            (0.10, -1, 74.0, 46),
            (0.15, 1, 62.0, 58),
            (0.34, -1, 84.0, 40),
            (0.40, 1, 70.0, 54),
            (0.58, -1, 76.0, 44),
            (0.63, 1, 60.0, 62),
            (0.82, -1, 58.0, 50),
        )
    ):
        (x, y), (nx_, ny_) = at(t)
        r1 = next(rng)
        a = math.radians(ang) * side
        ux, uy = nx_ * math.cos(a) - ny_ * math.sin(a), nx_ * math.sin(a) + ny_ * math.cos(a)
        Ls = L * (0.9 + r1 * 0.2)
        tip = (x + ux * Ls * side, y + uy * Ls * side)
        lf = leafshape((x, y), tip, Ls * 0.34, lbulge=1.04, rbulge=0.86, wob=1.1, seed=700 + i * 9)
        leaves.append(lf["sil"])
        lines += [{**lf["left"], "w": 0.85}, {**lf["right"], "w": 0.55}, {**lf["mid"], "w": 0.6}]

    # Open flowers and closed buds, on their own pedicels.
    flowers = []
    for i, (t, side, rad) in enumerate(((0.24, 1, 21.0), (0.48, -1, 17.5), (0.72, 1, 19.0), (0.90, -1, 14.5))):
        (x, y), (nx_, ny_) = at(t)
        r1, r2 = next(rng), next(rng)
        # Just over a radius. At 2.1 the flowers stood off the branch on long
        # visible pedicels and read as wired, the same failure the urns had.
        reach = rad * 1.05
        fx, fy = x + nx_ * reach * side, y + ny_ * reach * side
        lines.append(
            {
                **bez(
                    [
                        (x, y),
                        (x + nx_ * reach * 0.4 * side + 4, y + ny_ * reach * 0.4 * side + 5),
                        (fx - 5, fy - 4),
                        (fx, fy),
                    ]
                ),
                "w": 0.6,
            }
        )
        ring = rosette(fx, fy, rad * (0.9 + r1 * 0.2), 7 if r2 < 0.5 else 6, r1 * 6.28, 800 + i * 23)
        flowers.append(
            {"sil": ring["d"], "len": ring["len"], "cx": round(fx, 1), "cy": round(fy, 1), "r": round(rad * 0.13, 2)}
        )

    return {
        "branch": "".join(parts),
        "leaves": "".join(leaves),
        "lines": lines,
        "flowers": flowers,
    }


BOUGH = _bough()


# ---------------------------------------------------------------------------
# 8. The urns — docs/revision-6-ornament.md, piece 8
# ---------------------------------------------------------------------------
# The reference closes on two urns on plinths holding white roses. This is the
# same move with the flower the page has been about since revision 1: jasmine,
# which is what is actually worn at the wedding this invites people to.
#
# Turned solids, like the lamps and the columns, which is the construction on
# this page that has worked every time it has been used.
#
# Authored in a 180 x 400 box.
URN_W, URN_H = 180.0, 400.0


def _urn(*, scale: float, seed: int, blooms: int):
    s = scale
    cx = 90.0
    base = 392.0

    def y(v: float) -> float:
        return base - v * s

    prof = [
        (y(196.0), 30.0 * s),  # the lip, flaring
        (y(188.0), 27.0 * s),
        (y(176.0), 30.5 * s),  # the bowl's shoulder
        (y(156.0), 33.0 * s),
        (y(132.0), 30.0 * s),
        (y(112.0), 22.0 * s),
        (y(98.0), 13.5 * s),  # the waist
        (y(88.0), 11.0 * s),
        (y(78.0), 15.0 * s),  # the knop
        (y(68.0), 12.0 * s),
        (y(58.0), 9.5 * s),
        (y(48.0), 16.0 * s),  # the foot spreads
        (y(40.0), 20.0 * s),
        (y(34.0), 18.0 * s),
        # The plinth. Square in life, so its sides are parallel here and its
        # top and bottom are the only places it moves.
        (y(32.0), 27.0 * s),
        (y(28.0), 25.0 * s),
        (y(6.0), 25.0 * s),
        (y(2.0), 28.0 * s),
        (y(0.0), 27.5 * s),
    ]
    sil, right, left = lathe(cx, prof, samples=40)

    lines = [{**right, "w": 1.0}, {**left, "w": 0.68}]
    # Rules where the turning changes direction. On a real urn these are where
    # the tool was lifted, and they are what keep a lathe profile from reading
    # as a single blown shape.
    for v, wid in ((196.0, 0.9), (176.0, 0.6), (112.0, 0.55), (48.0, 0.6), (32.0, 0.85), (28.0, 0.6)):
        hw = 0.0
        for (y0, w0), (y1, w1) in zip(prof, prof[1:]):
            if min(y0, y1) <= y(v) <= max(y0, y1):
                hw = (w0 + w1) / 2
                break
        lines.append({**line([(cx - hw, y(v)), (cx, y(v) - 0.5), (cx + hw, y(v))]), "w": wid})

    # Gadroons: the vertical lobes running up the bowl. They follow the
    # profile, so they are widest where the bowl is.
    for k in range(7):
        u = (k + 0.5) / 7 * 2 - 1
        pts = []
        for j in range(6):
            v = 116.0 + (188.0 - 116.0) * j / 5
            hw = 0.0
            for (y0, w0), (y1, w1) in zip(prof, prof[1:]):
                if min(y0, y1) <= y(v) <= max(y0, y1):
                    hw = (w0 + w1) / 2
                    break
            pts.append((cx + u * hw * 0.84, y(v)))
        lines.append({**line(pts), "w": round(0.34 + 0.3 * abs(u), 2)})

    # The jasmine spilling out. Not arranged: it is a fistful of malai laid in
    # the top, so it falls over the lip on both sides and further on one.
    rng = random_seq(seed)
    flowers = []
    stems = []
    lip_y = y(194.0)
    for i in range(blooms):
        r1, r2, r3 = next(rng), next(rng), next(rng)
        a = math.radians(-172 + 164 * (i + 0.5) / blooms + (r1 - 0.5) * 26)
        # Short. At 26-60 units the flowers stood off the lip on visible wires
        # and read as a bunch of pins in a pot; jasmine laid in a bowl mounds
        # over the rim and hides its own stems.
        reach = (9.0 + r2 * 19.0) * s
        fx = cx + math.cos(a) * reach * 1.35
        fy = lip_y + math.sin(a) * reach * 0.9
        stems.append(
            {
                **bez(
                    [
                        (cx + math.cos(a) * 8 * s, lip_y + 4 * s),
                        (cx + math.cos(a) * reach * 0.5, lip_y + math.sin(a) * reach * 0.3),
                        (fx - math.cos(a) * 8, fy - math.sin(a) * 6),
                        (fx, fy),
                    ]
                ),
                "w": 0.5,
            }
        )
        rad = (9.0 + r3 * 4.0) * s
        ring = rosette(fx, fy, rad, 5 if r1 < 0.5 else 6, r2 * 6.28, seed + i * 17)
        flowers.append(
            {"sil": ring["d"], "len": ring["len"], "cx": round(fx, 1), "cy": round(fy, 1), "r": round(rad * 0.16, 2)}
        )

    return {
        "sil": sil,
        "lines": lines,
        "stems": stems,
        "flowers": flowers,
        "cx": cx,
        "base": base,
        "rx": round(34.0 * s, 1),
    }


# Unequal, and holding unequal handfuls. Two matching urns is the stencil the
# plan warns about, and it is the easiest one to fall into because an urn is
# symmetrical in itself.
URN_L = _urn(scale=1.0, seed=61, blooms=17)
URN_R = _urn(scale=0.87, seed=137, blooms=13)


# ---------------------------------------------------------------------------
# 9. The kolam — docs/revision-6-ornament.md, piece 9
# ---------------------------------------------------------------------------
# The last mark on the page.
#
# A kolam is drawn at the threshold at dawn, in rice flour, freehand, around a
# grid of dots laid down first. It is the mark that says the house is ready to
# receive you, and it is redrawn every morning because it is meant to be walked
# over. Ending an invitation on one is the correct last sentence.
#
# This is a radial pulli kolam: a centre, a ring of eight dots the petals loop
# around, and an outer ring of sixteen the closing line weaves through. The
# dots go down first and the line follows, which is the order it is drawn in
# and is the whole reason it is worth animating.
#
# Authored in a 300 x 300 box.
KOLAM_W = 300.0


def _kolam():
    c = KOLAM_W / 2
    r1, r2 = 58.0, 108.0
    dots: list[dict] = []
    dots.append({"cx": c, "cy": c, "r": 2.2, "ring": 0})
    for k in range(8):
        a = math.pi * 2 * k / 8 - math.pi / 2
        dots.append({"cx": round(c + math.cos(a) * r1, 1), "cy": round(c + math.sin(a) * r1, 1), "r": 2.0, "ring": 1})
    for k in range(16):
        a = math.pi * 2 * k / 16 - math.pi / 2 + math.pi / 16
        dots.append({"cx": round(c + math.cos(a) * r2, 1), "cy": round(c + math.sin(a) * r2, 1), "r": 1.8, "ring": 2})

    # Eight petals. Each leaves the centre, goes round the outside of its dot
    # and comes back — which is what "the line never crosses a dot" means in
    # practice, and is why a kolam has to be drawn rather than plotted.
    petals: list[dict] = []
    for k in range(8):
        a = math.pi * 2 * k / 8 - math.pi / 2
        half = math.pi / 8
        pts: list[Point] = []
        for u, rr in (
            (-0.30, 14.0),
            (-0.82, 46.0),
            (-0.58, 82.0),
            (0.0, 92.0),
            (0.58, 82.0),
            (0.82, 46.0),
            (0.30, 14.0),
        ):
            ang = a + half * u
            pts.append((c + math.cos(ang) * rr, c + math.sin(ang) * rr))
        seg = chain(pts)
        petals.append({"d": curve1(seg), "len": round(path_length(seg), 1)})

    # The closing line: one continuous scalloped ring that bulges past each
    # outer dot and dips between them, so it hugs the grid without touching it.
    ring_pts: list[Point] = []
    steps = 96
    for i in range(steps + 1):
        t = i / steps
        ang = math.pi * 2 * t - math.pi / 2 + math.pi / 16
        # Sixteen scallops, phase-locked to the sixteen dots.
        # A cosine gives sixteen rounded scallops; raising it to a fractional
        # power sharpened them into points, which is a star and not a kolam.
        rr = r2 + 13.0 * math.cos(16 * (ang + math.pi / 2 - math.pi / 16))
        ring_pts.append((c + math.cos(ang) * rr, c + math.sin(ang) * rr))
    ring_seg = chain(ring_pts)
    ring = {"d": curve1(ring_seg), "len": round(path_length(ring_seg), 1)}

    return {"dots": dots, "petals": petals, "ring": ring, "c": c}


KOLAM = _kolam()


# ---------------------------------------------------------------------------
# 10. The kalasham — docs/revision-6-ornament.md, piece 10
# ---------------------------------------------------------------------------
# The purna kumbham: a brass pot filled with water, five mango leaves set
# around its mouth, and a coconut resting on them. It stands at the entrance to
# the mandapam at every South Indian wedding and it is what the couple are
# received past.
#
# It goes on the left of the day, which is the one place on the page with
# ornament on a single side — a drape stood there for three passes and was cut.
# This is the piece that should have been there: it is a turned object, so it
# is drawn with the construction that has worked every time, and it is
# something the family carries in rather than something the venue owns.
#
# Authored in a 200 x 320 box.
def _kalasham():
    cx = 100.0
    base = 306.0
    # A kalasham is belly, shoulder, neck, flare — in that order and all of it
    # in about a hand's width. The neck has to be narrow enough that the
    # coconut looks like it is resting on the leaves and not sitting in a bowl.
    prof = [
        (base - 156, 27.0),  # the rim, flared
        (base - 150, 30.0),
        (base - 144, 22.0),  # under the rim
        (base - 136, 19.5),  # the neck, narrow
        (base - 128, 21.0),
        (base - 112, 33.0),  # the shoulder opens
        (base - 92, 43.0),
        (base - 72, 48.0),  # the belly, widest low
        (base - 50, 45.0),
        (base - 30, 35.0),
        (base - 14, 24.0),
        (base - 5, 21.5),  # the foot
        (base - 1, 24.0),
        (base, 22.0),
    ]
    sil, right, left = lathe(cx, prof, samples=44)
    lines = [{**right, "w": 1.05}, {**left, "w": 0.72}]

    # Two turned rules where the profile changes direction, and the kalava —
    # the thread tied round the neck, which is the detail that makes it a
    # kalasham rather than a jug.
    for v, w in ((150.0, 0.9), (136.0, 0.6)):
        hw = 0.0
        for (y0, w0), (y1, w1) in zip(prof, prof[1:]):
            if min(y0, y1) <= base - v <= max(y0, y1):
                hw = (w0 + w1) / 2
                break
        lines.append({**line([(cx - hw, base - v), (cx, base - v - 0.6), (cx + hw, base - v)]), "w": w})
    for k in range(2):
        y = base - 132 + k * 5.0
        lines.append(
            {**line([(cx - 20.5, y), (cx, y + 2.2), (cx + 20.5, y - 0.4)]), "w": 0.75}
        )

    # Five mango leaves set round the mouth, pointing up and out. The middle
    # one stands nearly upright and the outer pair lie almost flat, which is
    # how they sit when they are wedged under a coconut.
    rng = random_seq(6301)
    leaves = []
    neck = base - 150
    for ang, L in ((-152.0, 82.0), (-121.0, 94.0), (-90.0, 84.0), (-59.0, 98.0), (-28.0, 78.0)):
        r1 = next(rng)
        a = math.radians(ang + (r1 - 0.5) * 9)
        root = (cx + math.cos(a) * 14.0, neck + math.sin(a) * 5.0 + 2.0)
        tip = (root[0] + math.cos(a) * L, root[1] + math.sin(a) * L * 0.92)
        lf = leafshape(root, tip, L * 0.21, lbulge=1.05, rbulge=0.88, wob=0.7, seed=int(r1 * 900) + 3)
        leaves.append(lf["sil"])
        lines += [
            {**lf["left"], "w": 0.85},
            {**lf["right"], "w": 0.55},
            {**lf["mid"], "w": 0.5},
        ]

    # The coconut, resting on the leaves. An ovoid with the three eyes at its
    # foot and a short tuft of husk at the crown.
    ccx, ccy = cx + 1.5, neck - 38.0
    coconut = blob(
        [
            (ccx, ccy - 30.0),
            (ccx + 20.0, ccy - 20.0),
            (ccx + 25.0, ccy + 2.0),
            (ccx + 17.0, ccy + 24.0),
            (ccx, ccy + 30.0),
            (ccx - 17.0, ccy + 23.0),
            (ccx - 25.0, ccy + 1.0),
            (ccx - 20.0, ccy - 21.0),
        ]
    )
    for k in range(3):
        a = math.radians(-96 + k * 16)
        lines.append(
            {
                **bez(
                    [
                        (ccx + math.cos(a) * 11, ccy - 30 + 6 + k),
                        (ccx + math.cos(a) * 13, ccy - 20),
                        (ccx + math.cos(a) * 14, ccy - 8),
                        (ccx + math.cos(a) * 12, ccy + 6),
                    ]
                ),
                "w": 0.4,
            }
        )
    for k, dx in enumerate((-5.0, 0.0, 5.0)):
        lines.append(
            {
                **bez(
                    [
                        (ccx + dx, ccy - 29.0),
                        (ccx + dx * 1.6, ccy - 36.0),
                        (ccx + dx * 2.2 - 2, ccy - 41.0),
                        (ccx + dx * 2.6 - 3, ccy - 45.0),
                    ]
                ),
                "w": 0.45,
            }
        )

    return {
        "sil": sil,
        "leaves": "".join(leaves),
        "coconut": coconut,
        "lines": lines,
        "cx": cx,
        "base": base,
        "rx": 46.0,
    }


KALASHAM = _kalasham()


# ---------------------------------------------------------------------------
# 11. Fallen petals — docs/revision-6-ornament.md, piece 11
# ---------------------------------------------------------------------------
# Jasmine that has come off the garlands hanging above and settled on the
# floor. Five or six to a section, tiny, and the cheapest density on the page:
# they add life at almost no weight and they *explain* the garlands, because
# something that sheds is something that is real.
#
# Each carries where it lies, how it is turned, and how far it fell, so the
# component can drop them in at different moments.
def _petals(seed: int, count: int, w: float, h: float):
    rng = random_seq(seed)
    out = []
    for i in range(count):
        r1, r2, r3, r4 = next(rng), next(rng), next(rng), next(rng)
        cx = w * (0.06 + 0.88 * ((i + r1 * 0.7) / count))
        cy = h * (0.18 + 0.74 * r2)
        # Bigger than they look on paper. At the size a scatter renders on a
        # phone — about a fiftieth of the frame — anything under this simply
        # does not register, and an ornament nobody can see is weight for
        # nothing.
        rad = 10.5 + r3 * 5.5
        # Seen from above and lying over, so they are squashed and turned.
        ring = rosette(cx, cy, rad, 5, r4 * 6.28, 1300 + i * 31)
        out.append(
            {
                "d": ring["d"],
                "len": ring["len"],
                "cx": round(cx, 1),
                "cy": round(cy, 1),
                "r": round(rad * 0.16, 2),
                "tilt": round((r3 - 0.5) * 46, 1),
                "squash": round(0.52 + r1 * 0.26, 2),
                "fall": round(r2 * 900 + i * 120, 0),
            }
        )
    return out


PETALS = {
    "threshold": _petals(211, 7, 800.0, 150.0),
    "closing": _petals(487, 6, 400.0, 150.0),
}


# ---------------------------------------------------------------------------
# Measured viewBoxes
# ---------------------------------------------------------------------------
# One per *rendered* SVG, not per piece: the banana's two stems share a frame
# and each lamp has its own. Anything drawn that is not a path — the lamps'
# glow discs, the cast shadows under the standing objects, the kolam's dots —
# is added by hand here, because it is not in a `d` string to be measured.
def _paths(*groups) -> list[str]:
    out: list[str] = []
    for g in groups:
        if g is None:
            continue
        if isinstance(g, str):
            out.append(g)
        elif isinstance(g, dict):
            out.append(g["d"])
        else:
            for x in g:
                out.append(x if isinstance(x, str) else x["d"])
    return out


def _grow(box: list[float], x0: float, y0: float, x1: float, y1: float) -> list[float]:
    """Widen a measured box to take in something that is not a path."""
    bx, by, bw, bh = box
    nx0, ny0 = min(bx, x0), min(by, y0)
    nx1, ny1 = max(bx + bw, x1), max(by + bh, y1)
    return [round(nx0, 1), round(ny0, 1), round(nx1 - nx0, 1), round(ny1 - ny0, 1)]


def _column_box(col: dict) -> list[float]:
    return path_bbox(_paths(col["sil"], col["acanthus"], col["lines"]), pad=3.0)


def _lamp_box(lamp: dict) -> list[float]:
    box = path_bbox(
        _paths(lamp["sil"], lamp["dish"], lamp["bud"], lamp["lines"],
               [f["body"] for f in lamp["flames"]]),
        pad=3.0,
    )
    # The glow discs, and the ellipse the lamp stands on.
    for f in lamp["flames"]:
        cy = f["y"] - f["r"] * 0.3
        box = _grow(box, f["x"] - f["r"], cy - f["r"], f["x"] + f["r"], cy + f["r"])
    return _grow(box, 50 - 34, 202 - 7, 50 + 34, 202 + 7)


def _urn_box(urn: dict) -> list[float]:
    box = path_bbox(
        _paths(urn["sil"], urn["lines"], urn["stems"], [f["sil"] for f in urn["flowers"]]),
        pad=4.0,
    )
    return _grow(box, urn["cx"] - urn["rx"], urn["base"] - 8, urn["cx"] + urn["rx"], urn["base"] + 13)


def _banana_box() -> list[float]:
    ds: list[str] = []
    for st in BANANA:
        ds += _paths(st["sil"], st["blades"], st["lines"])
    box = path_bbox(ds, pad=4.0)
    for st in BANANA:
        box = _grow(box, st["x"] - st["rx"], st["y"] - 7, st["x"] + st["rx"], st["y"] + 12)
    return box


def _kolam_box() -> list[float]:
    box = path_bbox(_paths(KOLAM["ring"], KOLAM["petals"]), pad=6.0)
    for d in KOLAM["dots"]:
        r = d["r"] + 1
        box = _grow(box, d["cx"] - r, d["cy"] - r, d["cx"] + r, d["cy"] + r)
    return box


def _union(a: list[float], b: list[float]) -> list[float]:
    """One box for a pair.

    The two columns, the two lamps and the two urns each get a *shared*
    viewBox. Given separate ones they would be scaled to the same rendered
    width and the narrower of the pair would simply be blown up to match,
    which throws away the whole point of their not being mirrors.
    """
    return _grow(a, b[0], b[1], b[0] + b[2], b[1] + b[3])


BOXES = {
    "column": _union(_column_box(COLUMN_L), _column_box(COLUMN_R)),
    "thoranam": path_bbox(
        _paths(THORANAM["cord"],
               [lf["sil"] for lf in THORANAM["leaves"]],
               [ln["d"] for lf in THORANAM["leaves"] for ln in lf["lines"]],
               [cl["sil"] for cl in THORANAM["clusters"]],
               [cl["stalk"]["d"] for cl in THORANAM["clusters"]]),
        pad=4.0,
    ),
    "lamp": _union(_lamp_box(LAMP_L), _lamp_box(LAMP_R)),
    "malai": path_bbox(
        _paths(MALAI["cord"],
               [f["sil"] for f in MALAI["flowers"]],
               MALAI["tail"]["sil"], MALAI["tail"]["lines"]),
        pad=4.0,
    ),
    "banana": _banana_box(),
    "bough": path_bbox(
        _paths(BOUGH["branch"], BOUGH["leaves"], BOUGH["lines"],
               [f["sil"] for f in BOUGH["flowers"]]),
        pad=5.0,
    ),
    "urn": _union(_urn_box(URN_L), _urn_box(URN_R)),
    "kolam": _kolam_box(),
    "kalasham": _grow(
        path_bbox(_paths(KALASHAM["sil"], KALASHAM["leaves"], KALASHAM["coconut"], KALASHAM["lines"]), pad=4.0),
        KALASHAM["cx"] - KALASHAM["rx"], KALASHAM["base"] - 8,
        KALASHAM["cx"] + KALASHAM["rx"], KALASHAM["base"] + 13,
    ),
    "petalsThreshold": path_bbox(_paths([p["d"] for p in PETALS["threshold"]]), pad=6.0),
    "petalsClosing": path_bbox(_paths([p["d"] for p in PETALS["closing"]]), pad=6.0),
}
