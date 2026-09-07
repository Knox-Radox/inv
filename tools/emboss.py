"""
Blind-embossed jasmine for the cover paper — revision 8.

The client's reference is cotton paper with florals pressed into it to all four
edges, tone on tone, lit from the upper left. Ours was featureless ivory, and
that gap is most of "the envelope looks very plain".

`RELIEF_ENVELOPE` in components/art/paths.ts was built for this in revision 3
and has been dead since revision 4 made the cover a photograph. It is the right
composition and the wrong delivery: a live SVG lighting filter, and
tools/verify/README.md records what those cost — 1.3 to 7.3 s per repaint, which
is why every other wash on this page is baked. So this bakes.

There is no SVG rasteriser on this machine — cairosvg, skia, wand and svglib are
all absent — and putting Chromium in the asset chain to rasterise one height map
is not worth it. Nothing needs rasterising, though: tools/jasmine.py holds the
bough as Bézier geometry and pen.curve() emits only absolute M and C, so the
flattener below reads it directly. The height map is therefore drawn at whatever
resolution the crop asks for, with no upscaling anywhere.

    python3 tools/emboss.py          # writes a proof sheet to /tmp

Used by tools/cover.py, which presses the field into the envelope photograph
before cropping — so the portrait and landscape frames are two windows onto one
continuous sheet rather than two patterns that disagree at the breakpoint.
"""
from __future__ import annotations

import math
import random
import re

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter

import jasmine as j

#: Blind emboss is only light. Beyond about six levels either way it stops
#: reading as pressed paper and starts reading as a printed pattern, which is
#: the failure mode the whole revision is trying to get away from.
AMPLITUDE = 88.0

#: How much darker the bottom of a recess is than the flat paper beside it,
#: at full depth. Calibrated against the reference plate — see press().
OCCLUSION = 27.0

#: Light from the upper left, as in the reference plate. A surface tilted toward
#: it lightens; the far wall of the same groove darkens.
LIGHT = (-0.62, -0.78)

_NUM = re.compile(r"-?\d*\.?\d+")


def flatten(d: str, steps: int = 14) -> list[list[tuple[float, float]]]:
    """An "M x y C …" path from pen.curve() as polylines.

    Deliberately not a general SVG path parser. Everything jasmine.py emits
    comes through pen.curve(), which writes absolute M and C and nothing else,
    so handling the rest would be untested code guarding against input that
    cannot arrive.
    """
    out: list[list[tuple[float, float]]] = []
    cur: list[tuple[float, float]] = []
    pos = (0.0, 0.0)
    for cmd in re.findall(r"[MC][^MC]*", d):
        n = [float(v) for v in _NUM.findall(cmd)]
        if cmd[0] == "M":
            if len(cur) > 1:
                out.append(cur)
            pos = (n[0], n[1])
            cur = [pos]
        else:
            for k in range(0, len(n), 6):
                p0, (x1, y1), (x2, y2), (x3, y3) = (
                    pos, (n[k], n[k + 1]), (n[k + 2], n[k + 3]), (n[k + 4], n[k + 5]),
                )
                for i in range(1, steps + 1):
                    t = i / steps
                    u = 1 - t
                    cur.append((
                        u**3 * p0[0] + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3,
                        u**3 * p0[1] + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3,
                    ))
                pos = (x3, y3)
    if len(cur) > 1:
        out.append(cur)
    return out


class Plate:
    """A height map being drawn into, in the bough's own 100x150 coordinates.

    Heights accumulate by `max` rather than by addition: where a leaf crosses a
    stem the two are one surface at one depth, and adding them would emboss a
    bright knot at every crossing.
    """

    def __init__(self, w: int, h: int, ss: int = 2):
        self.ss = ss
        self.im = Image.new("F", (w * ss, h * ss), 0.0)
        self.d = ImageDraw.Draw(self.im)

    def stroke(self, d: str, width: float, depth: float, xf) -> None:
        for poly in flatten(d):
            pts = [xf(x, y) for x, y in poly]
            pts = [(x * self.ss, y * self.ss) for x, y in pts]
            w = max(1.0, width * self.ss)
            # Round joins and caps. PIL's `joint="curve"` only fills the joins,
            # so the two end caps are drawn by hand — without them every stroke
            # ends in a chopped-off square that reads as a printing error at
            # emboss amplitudes.
            self.d.line(pts, fill=depth, width=round(w), joint="curve")
            for x, y in (pts[0], pts[-1]):
                self.d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=depth)

    def array(self) -> np.ndarray:
        im = self.im
        if self.ss > 1:
            im = im.resize((im.width // self.ss, im.height // self.ss), Image.LANCZOS)
        return np.asarray(im, dtype=np.float32)


def bough(plate: Plate, cx: float, cy: float, scale: float, rot: float, flip: bool) -> None:
    """One jasmine spray pressed into the plate.

    Weights are the relief's, not the page's. On screen the bough is a drawn
    line where the midrib must out-weigh the veins to read; pressed into paper
    it is a *surface*, so the leaf blades are laid in as broad shallow strokes
    and only the veins stay fine. Emitting the page's own stroke widths here
    gave a wire diagram of a leaf rather than a leaf.
    """
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))

    def xf(x: float, y: float) -> tuple[float, float]:
        x, y = (x - 50.0) * (-1 if flip else 1), y - 75.0
        return cx + (x * c - y * s) * scale, cy + (x * s + y * c) * scale

    for pts, w in zip(j.STEM_POINTS, j.STEM_WIDTHS):
        from pen import chain, curve

        plate.stroke(curve(chain(pts)), w * 1.5 * scale, 1.0, xf)

    for lf in j.LEAVES:
        # The blade: its two margins laid in wide enough to meet, which fills
        # the leaf as a raised surface without needing a polygon fill.
        for side in ("lit", "shade"):
            plate.stroke(lf[side]["d"], 2.6 * scale, 0.86, xf)
        plate.stroke(lf["midrib"]["d"], 1.0 * scale, 1.0, xf)
        for v in lf["veins"]:
            plate.stroke(v["d"], 0.55 * scale, 0.62, xf)

    for b in j.BUDS:
        for side in ("left", "right"):
            plate.stroke(b[side]["d"], 2.0 * scale, 0.9, xf)
        plate.stroke(b["pedicel"]["d"], 0.7 * scale, 0.8, xf)

    for f in j.FLOWERS:
        plate.stroke(f["pedicel"]["d"], 0.7 * scale, 0.8, xf)
        for p in f["petals"]:
            plate.stroke(p["d"], 1.5 * scale, 0.92, xf)


#: The lattice the boughs are laid on, as multiples of one bough's height.
#: Staggered rather than square — a square grid of anything reads as a grid at
#: the first glance, and this has to read as paper.
STEP_X, STEP_Y, STAGGER = 0.66, 0.56, 0.5

#: How far each bough may wander from its lattice point, and how far its scale
#: and rotation may drift. Enough that no two are alike; not so much that they
#: collide, which is what an unconstrained scatter does about one time in four.
#: The rotation is the full circle. A narrow band was tried first, on the
#: reasoning that a real spray grows one way; laid on a lattice it put every
#: bough on the same diagonal and the sheet read as striped.
JITTER, SCALE_RANGE, ROT_RANGE = 0.24, (0.70, 1.08), (0.0, 360.0)


def boughs(w: float, h: float, unit: float, seed: int = 11):
    """Where every bough on a sheet `w` x `h` falls, in sheet coordinates.

    Yielded rather than drawn, because the sheet is never rasterised at its own
    resolution: each crop renders the field again at its own, and both have to
    agree about where the boughs are. Iterating the lattice in sheet space and
    transforming afterwards is what keeps them in phase — the alternative,
    drawing once and resampling, put a 1.5x upscale on the relief in the
    portrait frame and softened exactly the detail the emboss is made of.
    """
    rng = random.Random(seed)
    sx, sy = STEP_X * unit, STEP_Y * unit
    # A margin of one bough all round: a spray cut off at the paper's edge is
    # what the reference does, and stopping short of it would draw a border.
    for row, cy in enumerate(np.arange(-sy, h + sy, sy)):
        for cx in np.arange(-sx, w + sx, sx):
            yield (
                cx + (sx * STAGGER if row % 2 else 0) + rng.uniform(-1, 1) * JITTER * sx,
                cy + rng.uniform(-1, 1) * JITTER * sy,
                unit * rng.uniform(*SCALE_RANGE),
                rng.uniform(*ROT_RANGE),
                rng.random() < 0.5,
            )


def field(w: int, h: int, unit: float, seed: int = 11,
          window: tuple[float, float, float, float] | None = None,
          out: tuple[int, int] | None = None) -> np.ndarray:
    """The sheet's height map, or a window onto it drawn at its own resolution.

    `window` is a box in sheet coordinates and `out` the pixel size to draw it
    at; with neither, the whole sheet is drawn 1:1.
    """
    x0, y0, x1, y1 = window if window else (0.0, 0.0, float(w), float(h))
    ow, oh = out if out else (int(round(x1 - x0)), int(round(y1 - y0)))
    k = ow / (x1 - x0)

    plate = Plate(ow, oh)
    for bx, by, bu, rot, flip in boughs(w, h, unit, seed):
        # Off the window by more than its own reach: nothing to draw.
        if not (-bu < (bx - x0) * k < ow + bu and -bu < (by - y0) * k < oh + bu):
            continue
        bough(plate, (bx - x0) * k, (by - y0) * k, bu * k / 150.0, rot, flip)
    a = plate.array()
    # Paper does not hold a knife edge: the press rounds every shoulder, and it
    # is that rounding the light actually reads. scipy rather than PIL, which
    # cannot blur a float image.
    return gaussian_filter(a, max(0.8, unit * k / 260))


def press(paper: Image.Image, height: np.ndarray, amplitude: float = AMPLITUDE,
          mask: np.ndarray | None = None) -> Image.Image:
    """Light the height map and multiply it into the paper.

    No colour and no outline: a blind emboss is only the shadow the paper casts
    on itself.

    Two terms, because one is not enough. The directional term is the height
    map's own slope dotted with the light — a normal-map lighting reduced to
    what a near-flat surface needs, since at these amplitudes the full
    normalisation is indistinguishable and costs a square root per pixel. On its
    own it draws every shape as a pair of matched light and dark rims, which is
    an engraving of a leaf and not a pressed one.

    The second term is the occlusion: a recess is darker overall, because less
    of the room reaches the bottom of it. It is what makes the difference
    between an outline and a surface, and it is measurable in the client's
    reference — the embossed paper there runs to -23 levels in shadow but only
    +14 in highlight, so the florals are pressed *in*, not raised. Ours are
    pressed in to match, which is also what OCCLUSION being subtracted means.
    """
    gy, gx = np.gradient(height.astype(np.float32))
    shade = (gx * LIGHT[0] + gy * LIGHT[1]) * amplitude - height * OCCLUSION
    if mask is not None:
        shade = shade * mask
    a = np.asarray(paper).astype(np.float32)
    return Image.fromarray(np.clip(a + shade[..., None], 0, 255).astype(np.uint8))


def main() -> None:
    w, h = 700, 900
    paper = Image.new("RGB", (w, h), (238, 238, 238))
    out = press(paper, field(w, h, 300))
    out.save("/tmp/emboss-proof.png")
    lum = np.asarray(out).astype(np.float32) @ [0.2126, 0.7152, 0.0722]
    hi = lum - gaussian_filter(lum, 26)
    print(f"wrote /tmp/emboss-proof.png  {w}x{h}   "
          f"detail sd {hi.std():.2f}  p1 {np.percentile(hi, 1):.1f}  "
          f"p99 {np.percentile(hi, 99):.1f}   (reference: 6.36, -23.4, +13.7)")


if __name__ == "__main__":
    random.seed(7)
    main()
