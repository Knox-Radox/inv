"""
Builds the cover assets from a photograph of a real sealed envelope.

Revision 5. Revisions 1-3 synthesised paper and wax with SVG lighting filters
and the client's verdict was that it looked fake. It did: the reference's
quality comes from photography, not from code. Revision 4 made the cover a
photograph but framed it as an *object* — a whole envelope, small, floating on
a backdrop, with dead space around it. The reference is not that. The reference
is a **macro**: cotton paper edge to edge, the flap's V converging on the wax,
nothing else in frame.

So this script now crops into the photograph rather than compositing it onto a
surface, and emits the geometry the opening needs: where the flap's hinge is,
where its two edges run, and where the wax breaks.

    python3 tools/cover.py

Reads  assets/source/envelope-photo.jpg
       assets/fonts/ParfumerieScript*.otf
Writes public/cover/envelope-portrait.webp
       public/cover/envelope-landscape.webp
       public/cover/card-paper.webp
       assets/og/seal.png\n       components/coverGeometry.ts
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter
from scipy.optimize import nnls

import emboss
import seal

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
FONTS = ROOT / "assets" / "fonts"
OUT = ROOT / "public" / "cover"

# --------------------------------------------------------------------------
# Measured on assets/source/envelope-photo.jpg (1600x2000). Swap the
# photograph and every one of these has to be re-measured; tools/guides.py
# draws the grid these came off.
# --------------------------------------------------------------------------

#: The top envelope's wax.
CX, CY, R = 809, 672, 132

#: The envelope's own edges.
TOP, LEFT, RIGHT, BOTTOM = 98, 203, 1412, 965

#: The flap's two lower edges, as x = X0 + (y - Y0) * SLOPE. These are the
#: creases visible in the photograph, so cutting the image along them shows no
#: seam: the cut follows a line that is already there.
FLAP_LEFT = (253, 200, 0.9900)
FLAP_RIGHT = (1378, 200, -0.9767)

#: Below the flap the envelope body is featureless paper — measured stddev ~3
#: over y 820-945 — carrying only a gentle top-to-bottom gradient. There is not
#: enough of it under the seal to fill a portrait frame, so it is extended
#: downward from this row. Anything below EXTEND_FROM in the source is the next
#: envelope in the flat-lay and must never appear.
EXTEND_FROM = 945


#: Where the two creases actually meet — the flap's point. It sits inside the
#: wax, 100px below the disc's centre, which is why the seal reads as stuck to
#: the point of the flap.
def warm(im: Image.Image) -> Image.Image:
    """Warmed a shade toward the invitation's ivory, so the paper on screen and
    the paper in the photograph are the same paper. Everything cut from the
    photograph has to go through this or it will not match what it sits next
    to: the seal patch skipped it and read as a cool, pale disc against the
    graded envelope."""
    bands = im.split()
    rgb = Image.merge("RGB", (
        bands[0].point(lambda v: min(255, int(v * 1.02))),
        bands[1].point(lambda v: min(255, int(v * 1.005))),
        bands[2].point(lambda v: int(v * 0.958)),
    ))
    if im.mode == "RGBA":
        rgb = rgb.convert("RGBA")
        rgb.putalpha(bands[3])
    return rgb


def flap_vertex() -> tuple[float, float]:
    (ax, ay, am), (bx, by, bm) = FLAP_LEFT, FLAP_RIGHT
    y = ((bx - ax) + am * ay - bm * by) / (am - bm)
    return ax + am * (y - ay), y


#: A patch of the envelope with nothing on it: below where the two creases meet
#: and left of the wax's shadow. Everything the reconstruction knows about what
#: paper looks like comes from here.
CLEAN = (250, 795, 762, 955)


#: The scales the synthesised paper is fitted at, as Gaussian sigmas in pixels,
#: and the octaves it is built from. Four measurements, five unknowns, solved
#: without negative weights.
FIT_AT = (2.0, 5.0, 12.0, 30.0)
OCTAVES = (0.7, 1.5, 3.2, 7.0, 15.0)


def paper_texture(im: Image.Image, shape: tuple[int, int], seed: int = 5) -> np.ndarray:
    """Paper grain, synthesised to match real paper at every scale that shows.

    The reconstruction used to lay down a 1.2 px high-pass of a sample patch,
    tiled. It matched the paper's *mean* — 228.5 against 228.6 around it — and
    still read as a disc, because paper is not only speckle: it has a mottle
    running out to tens of pixels and a 1.2 px high-pass carries none of it.
    Under the flap that did not matter. With the flap lifting it sat there as a
    conspicuously smooth circle, detail sd 1.5 against real paper's 3.3.

    Tiling a wider high-pass would carry the mottle and repeat it, which on a
    354 px disc from a 211 px sample is two visible seams. So it is generated:
    a stack of blurred noise octaves whose weights are fitted so the result has
    the same detail at 2, 5, 12 and 30 px as the real paper does. Independent
    octaves, so their variances add and the fit is a plain non-negative least
    squares on the squared standard deviations.

    One noise field, shared by all three channels and scaled per channel. An
    earlier pass drew each channel independently, which is not what paper does:
    it came out mottled in pastel, and the disc was more obvious in colour than
    it had ever been in tone.
    """
    sample = np.asarray(im.crop(CLEAN)).astype(np.float32)
    lum = sample @ np.array([0.2126, 0.7152, 0.0722], np.float32)

    h, w = shape
    rng = np.random.default_rng(seed)
    basis = []
    for sigma in OCTAVES:
        n = gaussian_filter(rng.standard_normal((h, w)).astype(np.float32), sigma)
        basis.append(n / max(n.std(), 1e-6))

    def detail(a: np.ndarray, sigma: float) -> float:
        return float((a - gaussian_filter(a, sigma)).std())

    A = np.array([[detail(b, s) ** 2 for b in basis] for s in FIT_AT], np.float64)
    target = np.array([detail(lum, s) ** 2 for s in FIT_AT], np.float64)
    weights = np.sqrt(np.maximum(nnls(A, target)[0], 0.0)).astype(np.float32)

    field = sum(wt * b for wt, b in zip(weights, basis))
    # The fit is on luminance; each channel then takes its own level, which is
    # how the paper's slight warmth survives into the grain.
    scale = np.array([
        detail(sample[..., c], 30.0) / max(detail(lum, 30.0), 1e-6) for c in range(3)
    ], np.float32)
    return field[..., None] * scale


def strip_wax(im: Image.Image) -> Image.Image:
    """The envelope with no wax on it at all.

    This replaces `seal_patch`, which reconstructed the same paper as a
    *separate* 352 px sprite composited over the photograph at runtime. That
    sprite is the pale half-disc the client reported: it had to agree with the
    paper it covered on tone, on grain, on the gradient running down the sheet
    and — once the emboss landed — on the phase of the florals passing
    underneath it. Four ways to be caught out, and it was caught out on the
    first two.

    Baking the reconstruction into the sheet removes every one of them, because
    there is no longer a join. The wax comes back as its own sprite from
    tools/seal.py, riding on the flap, and under it is the same continuous
    sheet of paper that was always there.

    The fill is a plane fitted to a ring of real paper just outside the wax,
    carried across the gap, with the paper's own speckle laid over it. A plane
    rather than an angular average: the paper above the wax is lighter than the
    body below it, and an average of the ring came out lighter than the paper it
    had to sit against — which is exactly how the old patch read as a pale disc.
    A plane keeps that gradient.
    """
    src = np.asarray(im).astype(np.float32)
    H, W = src.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    dy, dx = yy - CY, xx - CX
    rad = np.hypot(dx, dy)

    # One robust pass on the fit: the two creases and the wax's own shadow cross
    # the sampling ring and would otherwise tilt the plane toward them.
    ring = (rad > R * 1.34) & (rad < R * 1.62)
    A = np.stack([np.ones(int(ring.sum()), np.float32), dx[ring], dy[ring]], 1)
    G = np.stack([np.ones(H * W, np.float32), dx.ravel(), dy.ravel()], 1)
    fill = np.empty((H, W, 3), np.float32)
    for c in range(3):
        v = src[..., c][ring]
        coef, *_ = np.linalg.lstsq(A, v, rcond=None)
        resid = np.abs(v - A @ coef)
        keep = resid < 2.0 * np.median(resid)
        coef, *_ = np.linalg.lstsq(A[keep], v[keep], rcond=None)
        fill[..., c] = (G @ coef).reshape(H, W)

    fill = fill + paper_texture(im, (H, W))

    # Full strength only where there is actually wax to remove, then a very
    # long fade.
    #
    # The wax reaches 1.057 R at its widest — measured, and it is not a circle —
    # and its cast shadow is -6 levels at 1.04 R, -3 at 1.12 R, -2 at 1.17 R and
    # under -1.5 past 1.24 R. So everything that has to go is inside 1.10 R,
    # and the rest is a shadow fading below what anyone can see.
    #
    # The old blend was opaque to 1.30 R and finished in 0.04 R. That put a
    # 354 px disc of synthesised paper on the sheet with a hard shoulder, and
    # synthesised paper is only ever statistically right — it matches real paper
    # at 2, 5, 12 and 30 px and still mottles differently. Over a disc that size
    # the difference reads. Over this ramp it never gets to full strength
    # anywhere it is visible: the wax sprite's own alpha covers to 1.20 R, and
    # by there the blend is already mostly the photograph.
    a = np.clip((R * 1.55 - rad) / (R * 0.45), 0, 1)
    a = (a * a * (3 - 2 * a))[..., None]
    return Image.fromarray(
        np.clip(src * (1 - a) + fill * a, 0, 255).astype(np.uint8)
    )


def extend_paper(im: Image.Image, to_y: int) -> Image.Image:
    """Carry the envelope body's paper down past the bottom of the photograph.

    The frame wants more paper under the seal than the flat-lay has: below
    y=BOTTOM is the next envelope. The band above it is featureless — a gentle
    gradient over fine grain — so it continues by mirroring the band downward,
    which keeps real grain and never repeats a recognisable feature, with the
    gradient carried on at the rate it was already falling.
    """
    if to_y <= EXTEND_FROM:
        return im

    band_h = 125
    band = im.crop((0, EXTEND_FROM - band_h, im.width, EXTEND_FROM))

    # Mirroring the band wholesale left visible seams every 125 rows: the join
    # is invisible in the grain but not in the shading, because each repeat
    # restarted the band's own gradient and its across-the-width variation.
    # So the two are separated. The low frequencies are extrapolated as one
    # continuous surface from the last real rows, and only the zero-mean grain
    # is tiled — and grain, having no feature to recognise, tiles invisibly.
    a = np.asarray(band).astype(np.float32)
    lowband = np.asarray(
        band.filter(ImageFilter.GaussianBlur(24)).resize(band.size)
    ).astype(np.float32)
    grain = a - lowband

    # The surface to carry on: the last real rows, across the full width.
    profile = lowband[-12:].mean(axis=0)
    # Measured over y 820-945: about -0.055 levels per row.
    slope = 0.055

    rows = to_y - EXTEND_FROM
    out_a = np.empty((rows, im.width, 3), dtype=np.float32)
    for i in range(rows):
        # Ping-pong the grain so no join repeats a row against itself.
        j = i % (2 * band_h)
        j = j if j < band_h else (2 * band_h - 1 - j)
        out_a[i] = profile - slope * (i + 1) + grain[j]

    out = im.copy()
    out.paste(
        Image.fromarray(np.clip(out_a, 0, 255).astype(np.uint8)), (0, EXTEND_FROM)
    )
    return out


def crop_geometry(box: tuple[int, int, int, int], size: tuple[int, int],
                  photo: Image.Image) -> dict:
    """Where everything lands in the emitted image, as fractions of it.

    The component pins its clip paths and its hinge to these, so the cut always
    follows the crease in the photograph rather than a guess about it.
    """
    x0, y0, x1, y1 = box
    sw, sh = x1 - x0, y1 - y0
    W, H = size

    def fx(x: float) -> float:
        return round((x - x0) / sw * 100, 3)

    def fy(y: float) -> float:
        return round((y - y0) / sh * 100, 3)

    def edge(spec: tuple[float, float, float], y: float) -> float:
        ex, ey, slope = spec
        return ex + (y - ey) * slope

    # The wax's own silhouette, as a radius against angle, sampled densely
    # enough to interpolate. Both the creases' endpoints and the cut around the
    # wax are resolved against *this*, which is what makes them meet.
    grid = np.linspace(-math.pi, math.pi, 721)
    ring = seal.outline(photo, grid)

    def wax_r(angle: float) -> float:
        return float(np.interp((angle + math.pi) % (2 * math.pi) - math.pi, grid, ring))

    # Where each crease runs into the wax.
    #
    # This used to solve against a circle of radius R. Once the cut started
    # following the wax's real outline — which reaches 1.057 R — the two stopped
    # agreeing, and the flap's polygon jumped from the crease's end at 1.0 R to
    # the outline's start at 1.05 R. That left an uncovered wedge at each side
    # of the seal with the envelope's dark showing through it: a grey spike out
    # of the wax at three o'clock, plainly visible on a desktop frame.
    def meet(spec: tuple[float, float, float]) -> tuple[float, float]:
        lo, hi = TOP, CY
        for _ in range(60):
            mid = (lo + hi) / 2
            x = edge(spec, mid)
            if math.hypot(x - CX, mid - CY) > R * wax_r(math.atan2(mid - CY, x - CX)):
                lo = mid
            else:
                hi = mid
        return edge(spec, hi), hi

    lx, ly = meet(FLAP_LEFT)
    rx, ry = meet(FLAP_RIGHT)

    # The seal does not break. Earlier revisions sheared it along a chord
    # between the two creases and let each half travel with the paper it was
    # stuck to, which is what a wax seal really does — and it read as damage.
    # The reference lifts the whole flap with the seal whole on it, so the cut
    # runs around the outside of the disc instead of across it, and the wax
    # goes up in one piece.
    #
    # Around the *wax*, though, and not around a circle enclosing it. This was
    # a circle at 1.31 R, and the wax only reaches 1.057 R at its widest — so a
    # crescent of bare paper up to a quarter of R deep hung off the flap below
    # the creases, uncovered by anything, and swung away with it. That crescent
    # is the semicircle in the client's note; it was invisible until the flap
    # started rendering and unmissable the moment it did. Cut to the wax's own
    # silhouette, what hangs below the V is the wax and nothing else.
    NB = 48
    a_r = math.atan2(ry - CY, rx - CX)
    a_l = math.atan2(ly - CY, lx - CX)
    # Sweep from the right crease the long way round, under the disc, to the
    # left one: the two meet the wax above its centre, so the path that keeps
    # the whole seal is the one through the bottom.
    while a_l < a_r:
        a_l += 2 * math.pi
    angles = a_r + (a_l - a_r) * np.arange(NB + 1) / NB
    break_pts = [
        (CX + R * wax_r(t) * math.cos(t), CY + R * wax_r(t) * math.sin(t))
        for t in angles
    ]

    # Both crops turn about the frame's own top edge in CSS — .flap's
    # transform-origin is a hardcoded `50% 0`, not `var(--hinge)` — because on
    # the landscape crop the true hinge (hingeY, reported below) sits 38% of a
    # frame above the picture, and rotating about an axis that far outside the
    # element does not open the flap, it launches it (see Envelope.module.css).
    # A polygon vertex above that origin rotates the *other* way as the flap
    # turns, and on the landscape crop that used to be a 38%-tall strip of the
    # flap doing exactly that: it did not fold, it glitched out almost
    # instantly. So the polygons are pinned to the same origin the CSS turns
    # them on, not to the true hinge.
    STAGE_TOP = 0.0

    # The flap: along its hinge, down the right crease, across the wax, back up
    # the left crease. The hinge runs the full width of the envelope, which is
    # wider than either frame, so its corners sit outside 0-100% and the stage
    # clips them.
    flap = [
        (-40.0, STAGE_TOP),
        (140.0, STAGE_TOP),
        (fx(edge(FLAP_RIGHT, ry)), fy(ry)),
    ]
    flap += [(fx(x), fy(y)) for x, y in break_pts]
    flap.append((fx(edge(FLAP_LEFT, ly)), fy(ly)))

    # The mouth — what the flap uncovers — is the same cut pulled a little way
    # into the flap's own side of it. Given the identical polygon, the two
    # antialiased edges land on the same pixels: the mouth's edge lets the card
    # through at part alpha and the flap's edge only half covers it, and the
    # result was a hairline drawn across the wax and out along both creases at
    # rest. Inset, the flap's solid interior covers the mouth's edge, and the
    # flap's own edge has nothing behind it but the same photograph.
    # The mouth is the flap's own cut, not an inset copy of it.
    #
    # It used to be pulled 0.9% clear so the flap's solid interior would cover
    # the mouth's antialiased edge — necessary back when the card inside was
    # painted at rest and bled a hairline through. It is `visibility: hidden`
    # until the envelope opens now, so there is nothing behind the edge to
    # bleed and nothing to inset for. Worse, once the cut wrapped the whole
    # seal, an inset arc no longer followed the disc: it cut a boxy notch
    # around it, and in the gap between the two the body photograph's own seal
    # showed through as a second, ghosted one.
    # The mouth is the flap's *footprint* — the triangle between the creases,
    # down to the point where they meet — and not the flap's cut. The two differ
    # by the wax's overhang: the seal travels with the flap, but the paper it was
    # sitting on is the front of the envelope, not a hole into it. Cutting the
    # mouth to the flap's shape put a round bump of darkness below the V.
    vx, vy = flap_vertex()
    NC = 7
    # Same top edge as the flap, and for the same reason: the mouth does not
    # rotate, but it is the flap's own footprint and the two should describe
    # the same stage rather than disagree above frame.
    right_pts = []
    for i in range(NC + 1):
        y = TOP + (vy - TOP) * i / NC
        right_pts.append((fx(edge(FLAP_RIGHT, y)), fy(y)))
    left_pts = []
    for i in range(NC + 1):
        y = vy - (vy - TOP) * i / NC
        left_pts.append((fx(edge(FLAP_LEFT, y)), fy(y)))
    mouth = [(-40.0, STAGE_TOP), (140.0, STAGE_TOP)] + right_pts + left_pts

    # The same cut with its lower boundary dropped past the foot of the frame:
    # the envelope's mouth, opened out until it is the whole picture. Same point
    # count and order as `mouth`, which is what lets CSS interpolate between the
    # two — so the opening widens into the page instead of the page being
    # crossfaded in over a card still trapped behind the flap.
    #
    # "Which points stay at the roof" used to be answered by comparing each
    # point's y against fy(TOP), which worked only because every roof point's
    # y happened to equal it exactly. Now that the roof points are emitted as
    # STAGE_TOP instead, that comparison would misfire on the two hardcoded
    # corners (no longer equal to fy(TOP)) while still wrongly matching the
    # crease loops' *early* points — the ones between TOP and the vertex that
    # are merely above frame, not on the roof. So the roof is named by
    # position, not inferred from value: the two hardcoded corners, plus
    # exactly where each crease loop touches TOP (its own start for the right
    # side, i=0; its own end for the left side, i=NC — the loops run from TOP
    # to the vertex and back, so the vertex itself, shared at the midpoint, is
    # never a roof point).
    roof = {0, 1, 2, len(mouth) - 1}
    opened = [
        (x, STAGE_TOP) if i in roof else (x, 130.0) for i, (x, y) in enumerate(mouth)
    ]

    return {
        "width": W,
        "height": H,
        "aspect": round(W / H, 5),
        "hingeY": fy(TOP),
        "sealX": fx(CX),
        "sealY": fy(CY),
        "sealR": round(R / sw * 100, 3),
        #: The same radius against the frame's height, which is what the type
        #: below the wax has to clear.
        "sealRy": round(R / sh * 100, 3),
        "flap": [[round(x, 2), round(y, 2)] for x, y in flap],
        "mouth": [[round(x, 2), round(y, 2)] for x, y in mouth],
        "opened": [[round(x, 2), round(y, 2)] for x, y in opened],
        "throatTop": fy(TOP),
        #: Half-width of public/cover/seal.webp against the frame, so the
        #: component can lay the wax back on exactly the paper it was lifted
        #: from. The sprite is cut at 1.45 R; its alpha is zero past 1.20 R,
        #: which is inside the flap's own 1.31 R cut, so the flap clips none of
        #: it and the geometry above did not have to move to make room.
        "spriteR": round(R * seal.SPRITE_REACH / sw * 100, 3),
    }


#: The two frames. Both are macro crops of the same photograph with the wax in
#: the same place, so switching between them at a breakpoint does not move the
#: composition; they differ only in how much paper is left around it.
#:
#: Portrait is cropped so the flap's hinge lands exactly on the top of the
#: frame, which is what lets the flap rotate on the axis it really turns on.
#: Landscape cannot do that and stay inside the envelope's width, so its hinge
#: sits above the frame and hingeY comes out negative — a rotation about an
#: off-frame axis, which is what opening a letter held close to you looks like.
#: The seal sprite's own size, and how hard it is compressed.
#:
#: 640 at quality 92 came to 33 KB and cost 940 ms of LCP on a Slow 4G throttle,
#: measured against the same build without it — real money against a budget the
#: page is already over. 512 at 86 is 21 KB and covers every screen this is
#: actually opened on: the wax renders at 143 CSS px on a 390 px phone, which is
#: 429 device pixels at 3x, and 325 on a 1440 desktop. Only a 2x desktop asks
#: for more, and it gets a mild downscale rather than a soft one.
#: 448 with seal.SPRITE_REACH at 1.26 puts 355 pixels across the wax — the same
#: resolution on the wax as 512 did at a reach of 1.45, in three quarters of the
#: canvas. Shrinking the reach without shrinking the canvas is not a saving: it
#: just spends the pixels on a bigger wax.
SEAL_SPRITE, SEAL_QUALITY = 448, 86

#: Quality was 84 and 88 before revision 8 added the wax sprite to the critical
#: path. Dropping four points each gives back 24 KB — slightly more than the
#: sprite costs — for an emboss that measures the same (detail sd 7.92 against
#: 7.95) and an error of 1.3 levels on paper whose grain is already 2.4. The
#: relief survives compression well because it is low-frequency by construction:
#: it is a *shoulder*, not an edge.
FRAMES = {
    # Portrait is cropped so the flap's hinge lands on the top of the frame,
    # which is the axis the real flap turns on.
    # The wax reads at 38% of the frame's width, near the reference's own 42%.
    "portrait": {"size": (1060, 1930), "sealAt": 0.478, "sealFrac": 0.384, "quality": 80},
    # 16:10, so on a desktop the frame's width is the viewport's width and
    # nothing overflows sideways. At 2000x1130 it overflowed to 1593px on a
    # 1440px screen and the seal rendered 360px across; at this aspect the same
    # crop lands at 325px, and the file carries a 1.36x upscale instead of 1.71.
    # Zoomed out as far as the envelope allows — sealFrac is clamped to the
    # envelope's width, which lands it at 22.6%.
    "landscape": {"size": (1600, 1000), "sealAt": 0.400, "sealFrac": 0.10, "quality": 84},
}


def build(
    photo: Image.Image, source: Image.Image, size: tuple[int, int],
    seal_at: float, seal_frac: float,
) -> tuple[Image.Image, dict]:
    W, H = size
    # Zoom is set by the widest crop the envelope can actually fill: the seal's
    # share of the frame is 2R over that width and there is no way to make it
    # smaller without showing the wall behind the envelope.
    #
    # There was a `max(..., 1.60)` floor here, which on a landscape frame forced
    # a *tighter* crop than the envelope allowed and baked a 1.71x upscale into
    # the file — most of why the wax looked soft. Gone: the frames are sized so
    # the upscale is small and the browser does the rest.
    max_sw = (RIGHT - LEFT) - 40
    # The seal's share of the frame is the thing being chosen; the crop width
    # follows from it. It cannot exceed the envelope's own width without
    # showing the wall behind it, which is the hard limit on how small the wax
    # can be made to read.
    sw = min(2 * R / seal_frac, max_sw)
    scale = W / sw
    sh = H / scale
    x0 = CX - sw / 2
    # Never start above the envelope's own top edge: a few rows of the linen
    # wall at the top of frame is the one thing that gives away that this is a
    # photograph of an envelope rather than a look at one. Clamping here rather
    # than hand-tuning sealAt means a re-crop cannot reintroduce it.
    y0 = max(CY - sh * seal_at, TOP + 4)
    box = (x0, y0, x0 + sw, y0 + sh)

    box = tuple(int(round(v)) for v in box)
    im = warm(photo.crop(box).resize((W, H), Image.LANCZOS))
    im = relief(im, box, photo.size)
    return im, crop_geometry(box, size, source)


#: How far down the sheet has to reach. The lowest crop any frame takes is the
#: portrait one at about y=1358; below y=EXTEND_FROM the photograph is the next
#: envelope in the flat-lay, so the paper is carried down before anything else
#: touches it — once, for both frames, so they emboss in phase.
SHEET_TO = 1400

#: One jasmine spray's height, in the photograph's own pixels. The portrait crop
#: is 687 source pixels wide and lands at 1060, so a spray at this size reads
#: about 29% of the frame across — near the reference plate's own repeat.
BOUGH = 300


def sheet(photo: Image.Image) -> Image.Image:
    """The envelope as one continuous sheet: extended and wax-free.

    Not embossed here. The relief is drawn per frame instead, at the frame's own
    resolution and phase-locked to this sheet's coordinates — see `relief`.
    Embossing the sheet and letting the crop resample it put a 1.5x upscale on
    the portrait frame's florals and softened the one thing an emboss is made
    of, which is its edges.
    """
    return strip_wax(extend_paper(photo, SHEET_TO))


def relief(im: Image.Image, box: tuple[int, int, int, int],
           sheet_size: tuple[int, int]) -> Image.Image:
    """Press the florals into one already-cropped frame.

    The field is generated across the whole sheet and only the boughs falling in
    this window are drawn, so the two frames are two views of one sheet rather
    than two patterns that happen to disagree at the breakpoint.
    """
    W, H = im.size
    x0, y0, x1, y1 = box
    k = W / (x1 - x0)

    # Where the relief steps back. The names sit under the wax in both crops,
    # and the reference does the same — its florals thin out behind "Requests
    # the pleasure of your company". Blind emboss under a hairline copperplate
    # is the one place this treatment can cost legibility, so it is the one
    # place it is taken away. Wide and very soft: a tight mask reads as a bald
    # patch, which is a more obvious flaw than the one it fixes.
    yy, xx = np.mgrid[0:H, 0:W]
    sx, sy = (xx / k + x0), (yy / k + y0)
    quiet = np.hypot((sx - CX) / (R * 3.4), (sy - (CY + R * 2.2)) / (R * 2.0))
    mask = np.clip((quiet - 0.55) / 0.85, 0, 1).astype(np.float32)

    field = emboss.field(*sheet_size, BOUGH, window=box, out=(W, H))
    return emboss.press(im, field, mask=mask)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    photo = Image.open(SRC / "envelope-photo.jpg").convert("RGB")
    paper = sheet(photo)

    geo = {}
    for name, spec in FRAMES.items():
        im, g = build(paper, photo, spec["size"], spec["sealAt"], spec["sealFrac"])
        p = OUT / f"envelope-{name}.webp"
        im.save(p, "WEBP", quality=spec["quality"], method=6)
        geo[name] = g
        print(f"  {p.name:26s} {im.size}  {p.stat().st_size // 1024} KB"
              f"  seal {g['sealX']:.0f}% x {g['sealY']:.0f}%  hinge {g['hingeY']:.1f}%")

    sprite = seal.build(photo, SEAL_SPRITE)
    sprite.save(OUT / "seal.webp", "WEBP", quality=SEAL_QUALITY, method=6, exact=True)
    print(f"  seal.webp                  {sprite.size}  "
          f"{(OUT / 'seal.webp').stat().st_size // 1024} KB")

    card = Image.open(SRC / "card-paper.jpg").convert("RGB")
    # A subtle, near-uniform texture: it is scaled to cover, so it does not
    # need to be large, and it is inlined into the HTML so it must not be.
    card.thumbnail((640, 900), Image.LANCZOS)
    card = Image.merge("RGB", (
        card.getchannel("R").point(lambda v: min(255, int(v * 1.02))),
        card.getchannel("G").point(lambda v: min(255, int(v * 1.005))),
        card.getchannel("B").point(lambda v: int(v * 0.965)),
    ))
    card.save(OUT / "card-paper.webp", "WEBP", quality=74, method=6)

    # The share card's seal. It used to be lib/sealSvg.ts — a drawn sage disc
    # with a blocky AS — which is the same synthesised wax the client rejected,
    # and it sat next to a page whose wax is a photograph. This is that
    # photograph, cropped to the disc and masked to it, so the first thing
    # anyone sees in WhatsApp is the same object the cover shows.
    # It is the sprite, downsampled — the same object the cover shows, and no
    # longer a second copy cropped out of the photograph with an ellipse punched
    # through it. That ellipse was a circle and the wax is not, so the share
    # card used to show a disc with its poured edge shaved off two sides.
    disc = sprite.resize((320, 320), Image.LANCZOS)
    og = ROOT / "assets" / "og"
    og.mkdir(parents=True, exist_ok=True)
    disc.save(og / "seal.png")
    print(f"  assets/og/seal.png          {disc.size}  "
          f"{(og / 'seal.png').stat().st_size // 1024} KB")
    print(f"  card-paper.webp            {card.size}  "
          f"{(OUT / 'card-paper.webp').stat().st_size // 1024} KB")

    ts = ROOT / "components" / "coverGeometry.ts"
    ts.write_text(
        "// Generated by tools/cover.py — do not edit.\n"
        "//\n"
        "// Where the flap's hinge, its two creases and the wax's break land in\n"
        "// public/cover/envelope-*.webp, as percentages of each image. The\n"
        "// opening cuts along these, so the cut follows the crease that is\n"
        "// already in the photograph instead of a guess about where it is.\n"
        f"export const coverGeometry = {json.dumps(geo, indent=2)} as const;\n"
        "\nexport type CoverFrame = keyof typeof coverGeometry;\n",
        encoding="utf-8",
    )
    print(f"  {ts.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
