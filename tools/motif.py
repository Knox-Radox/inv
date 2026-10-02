"""
The revision 9 motifs — docs/revision-9-plan.md.

Three things the family's printed invitation has and this page did not: a
border of mirror-work flowers, a row of flowering butis along the foot of each
card, and a mark of Ganesha at its head. All three are redrawn here from this
page's own primitives rather than lifted — the PDF's artwork is stock, and its
own metadata flags generated content.

**The border is embroidery.** Every flower in the PDF's border has a small
silver disc at its centre inside a magenta ring. That is *shisha* work: a
mirror held to cloth by a ring of stitching, with petals worked round it. The
brief's governing metaphor has been embroidery since revision 1, so this is the
one motif from the PDF that was already this page's own.

**The buti is a carnation.** A Mughal flowering sprig: one stem, five blooms
seen from the side, leaves that sweep up from the base. It is drawn the way
`tools/ornament.py` draws everything foliate — `leafshape` for the leaves, one
closed outline for each bloom — and it is drawn once and set five times, with
alternate ones mirrored and dropped, because a row of butis is a block print
and a block repeats.

**The mark is one line.** The client lifted the brief's ban on deity imagery
for exactly this and asked for it to be subtle. So it is not a figure: it is
the ear, the brow and the trunk as a single stroke that a pen could make
without lifting, with a dot above it.

Run through tools/emit_art.py, which writes components/art/motif.ts.
"""

from __future__ import annotations

import math
from urllib.parse import quote

from ornament import bez, blob, curve1, leafshape, line, random_seq, wobble
from pen import chain, path_length

Point = tuple[float, float]

#: The three pigments revision 9 adds, and the two it already had that the
#: motifs are drawn in. app/globals.css is the definition; these are copies for
#: the two places a custom property cannot reach — a data-URI background, and
#: the raster liner.
MARIGOLD = "#D2952C"
MARIGOLD_DEEP = "#A8701C"
KUMKUM = "#C4175A"
ARAKKU = "#74172A"
GOLD = "#B08D57"
LEAF = "#3A5542"


# ---------------------------------------------------------------------------
# The buti
# ---------------------------------------------------------------------------
#: Authored in a 100 x 132 box, standing on its base at (50, 130).
BUTI_W, BUTI_H = 100.0, 132.0


def fan(base: Point, r: float, toward: float, spread: float, lobes: int, seed: int) -> dict:
    """A carnation seen from the side: a scalloped fan opening `toward`.

    One closed outline, as `ornament.rosette` is, and for the same reason: at
    the size this renders a bloom is eighteen pixels across, and petals drawn
    one by one are a dozen strokes crossing in a knot.
    """
    rng = random_seq(seed)
    a0 = math.radians(toward - spread / 2)
    da = math.radians(spread) / lobes
    pts: list[Point] = [base]
    valleys: list[Point] = []
    for k in range(lobes):
        mid = a0 + da * (k + 0.5)
        # The middle lobes stand a little taller: a carnation is a dome.
        dome = 1.0 - 0.14 * abs((k + 0.5) / lobes - 0.5) * 2
        tip = r * dome * (0.96 + 0.08 * next(rng))
        if k == 0:
            pts.append((base[0] + math.cos(a0) * r * 0.62, base[1] + math.sin(a0) * r * 0.62))
        for u in (-0.26, 0.26):
            a = mid + da * u
            pts.append((base[0] + math.cos(a) * tip, base[1] + math.sin(a) * tip))
        if k < lobes - 1:
            a = a0 + da * (k + 1)
            v = (base[0] + math.cos(a) * r * 0.66, base[1] + math.sin(a) * r * 0.66)
            pts.append(v)
            valleys.append(v)
    a1 = a0 + da * lobes
    pts.append((base[0] + math.cos(a1) * r * 0.62, base[1] + math.sin(a1) * r * 0.62))

    # The folds between petals: from just above the calyx toward each valley,
    # stopping short of it, as a fold does.
    folds = []
    for v in valleys:
        s = (base[0] + (v[0] - base[0]) * 0.30, base[1] + (v[1] - base[1]) * 0.30)
        e = (base[0] + (v[0] - base[0]) * 0.86, base[1] + (v[1] - base[1]) * 0.86)
        folds.append({**line([s, e]), "w": 0.5})
    ring = chain(pts + [pts[0]])
    return {"sil": curve1(ring) + "Z", "len": round(path_length(ring), 1), "folds": folds, "pts": pts}


def calyx(base: Point, r: float, toward: float) -> dict:
    """The green-gold cup a carnation sits in: a short, wide leaf pointing into
    the bloom, drawn over the bloom's base so the join is covered."""
    a = math.radians(toward)
    back = (base[0] - math.cos(a) * r * 0.26, base[1] - math.sin(a) * r * 0.26)
    front = (base[0] + math.cos(a) * r * 0.36, base[1] + math.sin(a) * r * 0.36)
    return leafshape(back, front, r * 0.22, lbulge=1.0, rbulge=1.0)


def _buti() -> dict:
    stem_pts = [(50.0, 130.0), (50.6, 110.0), (49.6, 90.0), (50.0, 70.0), (50.0, 56.0)]
    stems = [{**line(stem_pts), "w": 1.3}]

    # (branch point on the stem, bloom base, radius, direction, lobes)
    specs = [
        ((50.0, 56.0), (50.0, 54.0), 24.0, -90.0, 7),  # the crown
        ((49.8, 88.0), (24.5, 72.0), 15.5, -128.0, 5),
        ((49.8, 84.0), (75.5, 70.0), 15.5, -52.0, 5),
        ((50.2, 108.0), (20.5, 101.0), 12.0, -160.0, 5),
        ((50.2, 105.0), (79.5, 99.0), 12.0, -20.0, 5),
    ]
    blooms, cups, polys_bloom, polys_cup = [], [], [], []
    for i, (root, base, r, toward, lobes) in enumerate(specs):
        if i:
            # A branch leaves the stem upward and arrives at the bloom from
            # below it: one soft S.
            side = -1.0 if base[0] < 50 else 1.0
            mid = ((root[0] + base[0]) / 2 + side * 1.5, (root[1] + base[1]) / 2 + 5.5)
            stems.append({**line([root, mid, base]), "w": 0.95})
        f = fan(base, r, toward, 196.0 if i == 0 else 184.0, lobes, 300 + i * 17)
        blooms.append({"sil": f["sil"], "len": f["len"], "folds": f["folds"],
                       "x": round(base[0], 1), "y": round(base[1], 1), "r": r})
        polys_bloom.append(f["pts"])
        c = calyx(base, r, toward)
        cups.append({"sil": c["sil"], "left": c["left"], "right": c["right"]})

    # Leaves: two long ones sweeping up from the base, two shorter above them.
    leaves = []
    for a, b, w in (
        ((49.0, 128.0), (25.0, 116.0), 4.6),
        ((51.0, 128.0), (75.0, 114.0), 4.6),
        ((49.6, 117.0), (33.0, 88.0), 4.2),
        ((50.4, 114.0), (67.0, 86.0), 4.2),
        ((49.8, 78.0), (40.0, 58.0), 3.2),
        ((50.2, 76.0), (60.0, 57.0), 3.2),
    ):
        flip = a[0] > 50
        lf = leafshape(a, b, w, lbulge=0.86 if flip else 1.0, rbulge=1.0 if flip else 0.86,
                       wob=0.5, seed=round(a[1] * 7 + b[0]))
        leaves.append({"sil": lf["sil"], "mid": {**lf["mid"], "w": 0.5},
                       "left": {**lf["left"], "w": 0.5}, "right": {**lf["right"], "w": 0.5},
                       "a": a, "b": b, "w": w})

    return {"stems": stems, "blooms": blooms, "cups": cups, "leaves": leaves,
            "_bloom_pts": polys_bloom}


BUTI = _buti()


def _sample(points: list[Point], per: int = 6) -> list[Point]:
    """A Catmull-Rom chain through closed points, flattened to a polygon."""
    out: list[Point] = []
    for p0, p1, p2, p3 in chain(points + [points[0]]):
        for i in range(per):
            t = i / per
            u = 1 - t
            out.append((
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            ))
    return out


def buti_print(scale: float = 1.0) -> list[list[Point]]:
    """The buti as the block that prints the liner: silhouettes only.

    Centred on the origin and scaled to stand about 108 px tall at 2x, so
    tools/paint.py can drop it at each lattice point of its tile. A block does
    not carry folds or veins at this size — it carries the shape, and the gaps
    in the gold are the cloth showing through.
    """
    k = 0.82 * scale
    ox, oy = -BUTI_W / 2, -BUTI_H / 2

    def T(poly: list[Point]) -> list[Point]:
        return [((x + ox) * k, (y + oy) * k) for x, y in poly]

    polys: list[list[Point]] = [T(_sample(p)) for p in BUTI["_bloom_pts"]]
    for lf in BUTI["leaves"]:
        a, b, w = lf["a"], lf["b"], lf["w"]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L
        ring = [a,
                (a[0] + dx * 0.22 + nx * w, a[1] + dy * 0.22 + ny * w),
                (a[0] + dx * 0.60 + nx * w * 0.8, a[1] + dy * 0.60 + ny * w * 0.8),
                b,
                (a[0] + dx * 0.60 - nx * w * 0.7, a[1] + dy * 0.60 - ny * w * 0.7),
                (a[0] + dx * 0.22 - nx * w * 0.9, a[1] + dy * 0.22 - ny * w * 0.9)]
        polys.append(T(_sample(ring)))
    # The stem as a thin ribbon: a block cannot print a hairline.
    polys.append(T([(48.6, 130.0), (51.4, 130.0), (51.0, 56.0), (49.0, 56.0)]))
    return polys


# ---------------------------------------------------------------------------
# The mirror-work flower
# ---------------------------------------------------------------------------
#: One flower's cell. The flower itself reaches 48 of the 50 from the centre,
#: so neighbours touch tip to tip as stitched ones do.
CELL = 100.0


def _petal(cx: float, cy: float, ang: float, length: float, width: float, inner: float,
           belly: float, seed: int, wob: float) -> str:
    """One petal, base at `inner` from the centre, tip at `length`."""
    ca, sa = math.cos(ang), math.sin(ang)
    na, nb = -sa, ca

    def P(along: float, across: float) -> Point:
        return (cx + ca * along + na * across, cy + sa * along + nb * across)

    span = length - inner
    pts = [
        P(inner, 0),
        P(inner + span * belly * 0.55, width * 0.82),
        P(inner + span * belly, width),
        P(inner + span * (belly + (1 - belly) * 0.55), width * 0.52),
        P(length, 0),
        P(inner + span * (belly + (1 - belly) * 0.55), -width * 0.52),
        P(inner + span * belly, -width),
        P(inner + span * belly * 0.55, -width * 0.82),
    ]
    return blob(wobble(pts, wob, seed) if wob else pts)


def flower(cx: float, cy: float, seed: int, turn: float = 0.0) -> dict:
    """Eight petals round a mirror: four long and pointed on the axes, four
    broader and shorter on the diagonals — the PDF's star, stitched."""
    rng = random_seq(seed)
    long_, short_ = [], []
    for k in range(4):
        a = turn + math.pi / 2 * k
        long_.append(_petal(cx, cy, a, 47.0 + 1.6 * (next(rng) - 0.5), 9.6, 21.0, 0.34, seed + k, 0.5))
        b = a + math.pi / 4
        short_.append(_petal(cx, cy, b, 38.0 + 1.8 * (next(rng) - 0.5), 11.4, 21.0, 0.46, seed + 9 + k, 0.5))
    return {"long": long_, "short": short_, "cx": cx, "cy": cy}


def _flower_svg(f: dict, gid: str, tone: float) -> str:
    """One flower as SVG markup. `tone` shifts the marigold a little either way,
    so four in a row are four dips of the brush rather than one stamp."""
    cx, cy = f["cx"], f["cy"]
    out = []
    # Diagonal petals first: they sit behind the long ones.
    for d in f["short"]:
        out.append(f'<path d="{d}" fill="url(#{gid}b)" stroke="{MARIGOLD_DEEP}" stroke-width=".9" stroke-opacity=".55"/>')
    for d in f["long"]:
        out.append(f'<path d="{d}" fill="url(#{gid}a)" stroke="{MARIGOLD_DEEP}" stroke-width=".9" stroke-opacity=".62"/>')
    # The stitched ring that holds the mirror, and the mirror.
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="19.2" fill="{KUMKUM}"/>')
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="19.2" fill="none" stroke="{ARAKKU}" stroke-width="1.1" stroke-opacity=".5"/>')
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="13.4" fill="#E8D7AE"/>')
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="11.2" fill="url(#mirror)"/>')
    out.append(f'<path d="M{cx - 6.2:.1f} {cy - 2.6:.1f}Q{cx - 4.6:.1f} {cy - 7.4:.1f} {cx + 0.6:.1f} {cy - 7.6:.1f}" '
               f'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-opacity=".85"/>')
    defs = (
        f'<radialGradient id="{gid}a" gradientUnits="userSpaceOnUse" cx="{cx:.1f}" cy="{cy:.1f}" r="48">'
        f'<stop offset=".40" stop-color="{_mix(MARIGOLD_DEEP, MARIGOLD, 0.35 + tone)}"/>'
        f'<stop offset=".72" stop-color="{_mix(MARIGOLD, "#E6B450", 0.25 + tone)}"/>'
        f'<stop offset="1" stop-color="{_mix(MARIGOLD, MARIGOLD_DEEP, 0.30 - tone)}"/></radialGradient>'
        f'<radialGradient id="{gid}b" gradientUnits="userSpaceOnUse" cx="{cx:.1f}" cy="{cy:.1f}" r="40">'
        f'<stop offset=".45" stop-color="{_mix(MARIGOLD_DEEP, MARIGOLD, 0.15 + tone)}"/>'
        f'<stop offset="1" stop-color="{_mix(MARIGOLD, MARIGOLD_DEEP, 0.10 - tone)}"/></radialGradient>'
    )
    return defs, "".join(out)


def _mix(a: str, b: str, t: float) -> str:
    t = max(0.0, min(1.0, t))
    pa = [int(a[i : i + 2], 16) for i in (1, 3, 5)]
    pb = [int(b[i : i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02X}" for x, y in zip(pa, pb))


def border_tile(vertical: bool = False, count: int = 2) -> str:
    """A strip of `count` flowers as a self-contained SVG, for a CSS background.

    `background-repeat: round` is what fits a whole number of flowers to a card
    of any size, and it does it by stretching the tile along the edge. So the
    tile has to be allowed to stretch (`preserveAspectRatio="none"` — without it
    the flowers keep their shape inside a wider box and the border comes out in
    groups with gaps between them), and it has to be short, because the stretch
    is at most half a tile shared across the whole edge: with two flowers to a
    tile it is under six per cent on a phone, where four gave twelve and the
    flowers went visibly oval at 430 px.

    Two rather than one so the edge is not one stamp sixty times: each is
    turned a degree or two and dipped a little differently.
    """
    w, h = (CELL, CELL * count) if vertical else (CELL * count, CELL)
    defs = ('<radialGradient id="mirror" cx=".38" cy=".34" r=".8">'
            '<stop offset="0" stop-color="#FDFBF6"/><stop offset=".55" stop-color="#DAD8D2"/>'
            '<stop offset="1" stop-color="#A9AAA8"/></radialGradient>')
    body = ""
    for i in range(count):
        cx, cy = (CELL / 2, CELL * (i + 0.5)) if vertical else (CELL * (i + 0.5), CELL / 2)
        turn = math.radians((-1.6, 1.3, -0.7, 1.9)[i % 4])
        tone = (0.0, 0.09, -0.08, 0.05)[i % 4]
        d, b = _flower_svg(flower(cx, cy, 41 + i * 23, turn), f"f{i}", tone)
        defs += d
        body += b
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.0f} {h:.0f}" preserveAspectRatio="none">'
            f"<defs>{defs}</defs>{body}</svg>")


def data_uri(svg: str) -> str:
    """Percent-encoded, not base64: it is a third smaller for markup like this,
    and it stays readable in a stylesheet."""
    return "data:image/svg+xml," + quote(svg, safe=" =:/,.;'()-_!*@")


# ---------------------------------------------------------------------------
# The mark
# ---------------------------------------------------------------------------
#: Authored in a 100 x 104 box.
MARK_W, MARK_H = 100.0, 104.0


def _mark() -> dict:
    """Ganesha, as a few strokes a pen could make without hurry.

    Not a figure. The ears, the brow and the trunk — which falls and turns to
    the viewer's right, *vamamukhi*, the trunk toward his own left, the form
    kept in a home — then the crown's point above and the tilak beneath it,
    which are what make it him and not an elephant. One tusk whole, one broken.
    """
    ear_l = [(33.0, 63.0), (19.0, 59.0), (10.0, 46.5), (11.5, 32.0), (22.0, 23.5), (35.0, 26.5), (38.5, 31.0)]
    ear_r = [(67.0, 63.0), (81.0, 59.0), (90.0, 46.5), (88.5, 32.0), (78.0, 23.5), (65.0, 26.5), (61.5, 31.0)]
    # The brow, from inside one ear to inside the other, rising to the crown.
    brow = [(35.0, 26.5), (40.0, 20.5), (50.0, 18.0), (60.0, 20.5), (65.0, 26.5)]
    # The crown: an ogee that closes on a point.
    crown_l = [(41.5, 19.5), (43.0, 13.0), (47.5, 9.5), (50.0, 3.5)]
    crown_r = [(58.5, 19.5), (57.0, 13.0), (52.5, 9.5), (50.0, 3.5)]
    trunk = [(50.0, 41.0), (49.2, 52.0), (47.4, 62.0), (46.8, 73.0), (50.0, 83.5), (58.5, 89.5),
             (67.5, 86.5), (69.6, 78.5), (64.0, 74.0), (59.5, 77.5)]
    lines = [
        {**line(crown_l), "w": 1.5},
        {**line(crown_r), "w": 1.5},
        {**line(brow), "w": 1.9},
        {**line(ear_l[::-1]), "w": 1.9},
        {**line(ear_r[::-1]), "w": 1.9},
        {**line(trunk), "w": 2.1},
        # The eyes: two short downward arcs, which is a face at rest.
        {**line([(38.5, 40.5), (41.8, 42.8), (45.0, 41.0)]), "w": 1.4},
        {**line([(55.0, 41.0), (58.2, 42.8), (61.5, 40.5)]), "w": 1.4},
        # One whole tusk, one broken: ekadanta.
        {**line([(41.5, 56.0), (37.6, 62.5), (39.2, 68.0)]), "w": 1.4},
        {**line([(56.5, 56.0), (58.6, 59.8)]), "w": 1.4},
    ]
    # The tilak: a small upright drop between the brows.
    tilak = blob([(50.0, 24.5), (51.9, 30.0), (50.0, 33.6), (48.1, 30.0)])
    return {"lines": lines, "tilak": tilak}


MARK = _mark()


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys

    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/motif-proof.html"
    b = BUTI
    buti = []
    for lf in b["leaves"]:
        buti.append(f'<path d="{lf["sil"]}" fill="#6E8A66" stroke="{LEAF}" stroke-width=".6"/>')
        buti.append(f'<path d="{lf["mid"]["d"]}" fill="none" stroke="{LEAF}" stroke-width=".5"/>')
    for s in b["stems"]:
        buti.append(f'<path d="{s["d"]}" fill="none" stroke="{LEAF}" stroke-width="{s["w"]}" stroke-linecap="round"/>')
    for bl, cu in zip(b["blooms"], b["cups"]):
        buti.append(f'<path d="{bl["sil"]}" fill="url(#bloom)" stroke="{ARAKKU}" stroke-width=".7"/>')
        for f in bl["folds"]:
            buti.append(f'<path d="{f["d"]}" fill="none" stroke="{ARAKKU}" stroke-width=".5" stroke-opacity=".7"/>')
        buti.append(f'<path d="{cu["sil"]}" fill="{MARIGOLD}" stroke="{MARIGOLD_DEEP}" stroke-width=".6"/>')
    buti_svg = (f'<svg viewBox="0 0 {BUTI_W:.0f} {BUTI_H:.0f}" width="150"><defs>'
                f'<linearGradient id="bloom" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{ARAKKU}"/>'
                f'<stop offset="1" stop-color="{KUMKUM}"/></linearGradient></defs>{"".join(buti)}</svg>')
    mark = "".join(
        f'<path d="{ln["d"]}" fill="none" stroke="{GOLD}" stroke-width="{ln["w"]}" stroke-linecap="round" stroke-linejoin="round"/>'
        for ln in MARK["lines"]
    ) + f'<path d="{MARK["tilak"]}" fill="{ARAKKU}"/>'
    html = f"""<body style="margin:0;background:#fbf7f0;font-family:Georgia">
<div style="padding:24px;display:flex;gap:40px;align-items:flex-end;flex-wrap:wrap">
  {buti_svg}
  <svg viewBox="0 0 {BUTI_W:.0f} {BUTI_H:.0f}" width="50">{buti_svg[buti_svg.index('<defs>'):-6]}</svg>
  <svg viewBox="0 0 {MARK_W:.0f} {MARK_H:.0f}" width="220">{mark}</svg>
  <svg viewBox="0 0 {MARK_W:.0f} {MARK_H:.0f}" width="46">{mark}</svg>
</div>
<div style="padding:24px"><div style="height:110px;width:660px;background:url(&quot;{data_uri(border_tile())}&quot;) left/auto 100% round"></div>
{"".join(f'<div style="height:{t}px;margin-top:14px;width:{w}px;background:url(&quot;{data_uri(border_tile())}&quot;) left/auto 100% round"></div>' for w, t in ((320, 20), (390, 22), (430, 22), (414, 22), (700, 24), (560, 24)))}
<div style="width:22px;height:300px;position:absolute;right:60px;top:20px;background:url(&quot;{data_uri(border_tile(True))}&quot;) top/100% auto round"></div></div>
</body>"""
    open(out, "w").write(html)
    print(f"wrote {out}   border tile {len(data_uri(border_tile()))} bytes")
