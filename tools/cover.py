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

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

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


def fit(font_path: Path, text: str, w: float, h: float) -> ImageFont.FreeTypeFont:
    lo, hi = 20, 900
    while lo < hi:
        mid = (lo + hi + 1) // 2
        l, t, r, b = ImageFont.truetype(str(font_path), mid).getbbox(text)
        lo, hi = (mid, hi) if (r - l <= w and b - t <= h) else (lo, mid - 1)
    return ImageFont.truetype(str(font_path), lo)


def press_monogram(im: Image.Image, face: str, text: str) -> Image.Image:
    """Replace the stock impression with ours, pressed into the same wax."""
    pad = int(R * 1.35)
    box = (CX - pad, CY - pad, CX + pad, CY + pad)
    S = 720
    disc = im.crop(box).resize((S, S), Image.LANCZOS)
    scale = S / (2 * pad)
    r = R * scale
    cx = cy = S / 2

    # Rebuild the wax surface. Smoothing alone left a ghost of the stock design,
    # so: a heavy blur keeps only the real, asymmetric dome lighting, and a
    # little of the original high-frequency detail is added back so the surface
    # keeps the grain of wax rather than the sheen of plastic.
    interior = Image.new("L", (S, S), 0)
    ImageDraw.Draw(interior).ellipse(
        (cx - r * 0.90, cy - r * 0.90, cx + r * 0.90, cy + r * 0.90), fill=255
    )
    interior = interior.filter(ImageFilter.GaussianBlur(r * 0.10))

    # Normalised convolution, not a plain blur. A blur wide enough to erase the
    # stock impression (0.55r) also reaches well outside the disc and drags the
    # pale paper in, and the wax came out lighter and greyer than it really is:
    # measured mean (190,165,141) against the original's (168,133,106), and
    # stddev 20 against 51. That is what "translucent" was. Weighting by the
    # disc's own mask and dividing by the blurred mask means only wax
    # contributes, so the level and the colour survive the smoothing.
    import numpy as np

    wax_mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(wax_mask).ellipse(
        (cx - r * 0.97, cy - r * 0.97, cx + r * 0.97, cy + r * 0.97), fill=255
    )
    mf = np.asarray(wax_mask.filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255.0
    da = np.asarray(disc).astype(np.float32)
    blur = lambda arr: np.asarray(
        Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(r * 0.70)
        )
    ).astype(np.float32)
    num = blur(da * mf[..., None])
    den = blur(np.repeat(mf[..., None], 3, axis=2) * 255.0) / 255.0
    dome = num / np.maximum(den, 1e-3)

    # The stock tree covers most of the face, so it is smoothed out of the
    # low-pass entirely and the surface put back from the disc's own speckle.
    #
    # Two approaches were tried and abandoned before this one. Blurring at 0.55r
    # left a ghost of the canopy and trunk legible under the monogram. Tiling a
    # high-passed patch of the rim across the face painted a visible damask
    # repeat, because the rim's beading is structure, not grain. What works is
    # the plainest thing: a 1px high-pass of the wax itself. The tree's grooves
    # are ten to thirty pixels wide and do not survive that cut, while the
    # speckle that makes wax look like wax does — and it is this wax's own,
    # which is the whole point after revisions 1-3.
    tooth = da - np.asarray(
        Image.fromarray(np.clip(da, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.0)
        )
    ).astype(np.float32)
    # One catch: a groove's wall is a sharp 1-2px transition, so the tree's
    # edges live at the same frequency as the speckle and came back with it.
    # They are separable by *where* they are, though — the speckle is spread
    # evenly and the tree's edges sit exactly where the mid frequencies swing.
    # So the tooth is attenuated in proportion to that swing: full grain on
    # flat wax, none along what used to be a groove.
    mid = np.asarray(
        Image.fromarray(np.clip(da, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.0)
        )
    ).astype(np.float32) - np.asarray(
        Image.fromarray(np.clip(da, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(8.0)
        )
    ).astype(np.float32)
    swing = np.abs(mid).mean(axis=2, keepdims=True)
    keep = 1.0 / (1.0 + (swing / 5.0) ** 2)
    grain_a = dome + tooth * 1.25 * keep * mf[..., None]
    base = Image.composite(
        Image.fromarray(np.clip(grain_a, 0, 255).astype(np.uint8)), disc, interior
    )

    # The impression is cut at 3x and downsampled. A copperplate script is
    # mostly hairline, and rasterising those strokes straight into the relief
    # broke them up into dashes. It sits a little below the disc centre: the
    # caps carry swashes above and nothing below, so optical centre is lower
    # than the bounding box says.
    K = 3
    font = fit(FONTS / face, text, r * 1.30 * K, r * 1.16 * K)
    big = Image.new("L", (S * K, S * K), 0)
    d = ImageDraw.Draw(big)
    l, t, rr, bb = d.textbbox((0, 0), text, font=font)
    d.text(
        (cx * K - (rr + l) / 2, cy * K - (bb + t) / 2 + r * 0.05 * K),
        text,
        font=font,
        fill=255,
    )
    mark = big.resize((S, S), Image.LANCZOS)
    # A hairline that survives downsampling still reads as too thin to have been
    # cut into a brass die. One dilation pass gives every stroke a floor.
    mark = ImageChops.lighter(mark, mark.filter(ImageFilter.MaxFilter(3)).point(
        lambda v: int(v * 0.78)
    ))

    # Light falls from the upper left, so a groove's upper-left wall is in
    # shadow and its lower-right wall catches the light.
    soft = mark.filter(ImageFilter.GaussianBlur(2.6))
    shadow = ImageChops.subtract(ImageChops.offset(soft, 4, 5), soft).filter(
        ImageFilter.GaussianBlur(1.4)
    )
    light = ImageChops.subtract(ImageChops.offset(soft, -4, -5), soft).filter(
        ImageFilter.GaussianBlur(1.4)
    )
    floor = mark.filter(ImageFilter.GaussianBlur(1.2))

    out = base.convert("RGB")
    out = Image.composite(
        Image.eval(out, lambda v: int(v * 0.62)), out, floor.point(lambda v: int(v * 0.86))
    )
    out = Image.composite(
        Image.eval(out, lambda v: int(v * 0.34)), out, shadow.point(lambda v: min(255, int(v * 2.3)))
    )
    out = Image.composite(
        Image.eval(out, lambda v: min(255, int(v * 1.30 + 20))),
        out,
        light.point(lambda v: min(255, int(v * 1.45))),
    )

    sealed = im.copy()
    sealed.paste(out.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS), box)
    return sealed


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


def seal_patch(im: Image.Image) -> Image.Image:
    """The envelope's front face with the wax taken off it.

    The seal lifts with the flap, whole, because that is what the client asked
    for and what the reference does. But the wax overhangs the flap's point onto
    the front of the envelope, and the photograph has it printed there: lift the
    flap and a crescent of the old seal stayed behind, which is the broken look
    all over again. This is that area of paper, reconstructed, to sit under the
    seal and be uncovered when it goes.

    The fill is extrapolated inward from a ring of real paper just outside the
    wax. The ring's colour is smoothed hard around the circle first, because the
    two creases cross it and an unsmoothed extrapolation dragged them into the
    middle as spokes — and the creases belong to the flap, so once it has lifted
    they are not there to draw.
    """
    import numpy as np

    P = int(R * 1.34)
    box = (int(CX - P), int(CY - P), int(CX + P), int(CY + P))
    src = np.asarray(im.crop(box)).astype(np.float32)
    n = 2 * P
    yy, xx = np.mgrid[0:n, 0:n]
    dy, dx = yy - P, xx - P
    rad = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)

    # Fit the surrounding paper as a plane and carry it across the gap.
    #
    # The first version averaged a ring of paper by angle and smoothed that hard
    # around the circle. It killed the creases, which is what it was for, but it
    # also collapsed the tone: the paper just above the wax is lighter than the
    # body below it, and a single angular average came out lighter than the
    # paper it had to sit against, so the patch read as a pale disc. Paper this
    # close to flat is a plane in x and y, and a plane keeps that gradient.
    ring = (rad > R * 1.12) & (rad < R * 1.30)
    A = np.stack([np.ones(ring.sum(), np.float32), dx[ring], dy[ring]], 1)
    fill = np.empty((n, n, 3), np.float32)
    G = np.stack([np.ones(n * n, np.float32), dx.ravel(), dy.ravel()], 1)
    for c in range(3):
        v = src[..., c][ring]
        coef, *_ = np.linalg.lstsq(A, v, rcond=None)
        # One robust pass: the creases and the wax's own shadow cross the ring
        # and would otherwise tilt the plane toward them.
        resid = np.abs(v - A @ coef)
        keep_px = resid < 2.0 * np.median(resid)
        coef, *_ = np.linalg.lstsq(A[keep_px], v[keep_px], rcond=None)
        fill[..., c] = (G @ coef).reshape(n, n)

    # The paper's own speckle. Taken from beside the wax, left of the crease and
    # well inside the envelope: the first sample sat directly below it and ran
    # off the envelope's bottom edge into the next one in the flat-lay, which
    # tiled a band of that edge straight across the patch.
    g = int(R * 0.8)
    gx, gy = int(CX - R * 3.2), int(CY + R * 0.2)
    patch = np.asarray(
        im.crop((gx - g, gy - g, gx + g, gy + g))
    ).astype(np.float32)
    tooth = patch - np.asarray(
        Image.fromarray(np.clip(patch, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(1.2))
    ).astype(np.float32)
    reps = n // (2 * g) + 2
    tile = np.concatenate([tooth, tooth[::-1]], 0)
    tile = np.concatenate([tile, tile[:, ::-1]], 1)
    fill = fill + np.tile(tile, (reps, reps, 1))[:n, :n]

    # Opaque over everything the photograph has wax in — the disc and its
    # shadow, out to about 1.18R — and faded to nothing by 1.30R, inside the
    # 1.31R the flap's cut carries away. Any of it outside that cut is not
    # covered when the envelope is shut, and haloed around the seal.
    a = np.clip((R * 1.30 - rad) / (R * 0.12), 0, 1)
    out = Image.fromarray(np.clip(fill, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8), "L"))
    return warm(out)


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
    import numpy as np

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


def crop_geometry(box: tuple[int, int, int, int], size: tuple[int, int]) -> dict:
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

    # Where each crease meets the wax: the point on the circle it runs into.
    def meet(spec: tuple[float, float, float], sign: int) -> tuple[float, float]:
        lo, hi = TOP, CY
        for _ in range(60):
            mid = (lo + hi) / 2
            x = edge(spec, mid)
            if math.hypot(x - CX, mid - CY) > R:
                lo = mid
            else:
                hi = mid
        return edge(spec, hi), hi

    lx, ly = meet(FLAP_LEFT, -1)
    rx, ry = meet(FLAP_RIGHT, +1)

    # The seal does not break. Earlier revisions sheared it along a chord
    # between the two creases and let each half travel with the paper it was
    # stuck to, which is what a wax seal really does — and it read as damage.
    # The reference lifts the whole flap with the seal whole on it, so the cut
    # runs around the outside of the disc instead of across it, and the wax
    # goes up in one piece.
    def arc(mul: float, n: int = 22) -> list[tuple[float, float]]:
        a_r = math.atan2(ry - CY, rx - CX)
        a_l = math.atan2(ly - CY, lx - CX)
        # Sweep from the right crease the long way round, under the disc, to
        # the left one: those two meet the circle above its centre, so the path
        # that keeps the whole seal is the one through the bottom.
        while a_l < a_r:
            a_l += 2 * math.pi
        return [
            (
                CX + R * mul * math.cos(a_r + (a_l - a_r) * i / n),
                CY + R * mul * math.sin(a_r + (a_l - a_r) * i / n),
            )
            for i in range(n + 1)
        ]

    break_pts = arc(1.31)

    # The flap: along its hinge, down the right crease, across the wax, back up
    # the left crease. The hinge runs the full width of the envelope, which is
    # wider than either frame, so its corners sit outside 0-100% and the stage
    # clips them.
    flap = [
        (-40.0, fy(TOP)),
        (140.0, fy(TOP)),
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
    mouth = [(-40.0, fy(TOP)), (140.0, fy(TOP))]
    for i in range(NC + 1):
        y = TOP + (vy - TOP) * i / NC
        mouth.append((fx(edge(FLAP_RIGHT, y)), fy(y)))
    for i in range(NC + 1):
        y = vy - (vy - TOP) * i / NC
        mouth.append((fx(edge(FLAP_LEFT, y)), fy(y)))

    # The same cut with its lower boundary dropped past the foot of the frame:
    # the envelope's mouth, opened out until it is the whole picture. Same point
    # count and order as `mouth`, which is what lets CSS interpolate between the
    # two — so the opening widens into the page instead of the page being
    # crossfaded in over a card still trapped behind the flap.
    opened = [(x, y) if y <= fy(TOP) else (x, 130.0) for x, y in mouth]

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
        #: Half-width of public/cover/seal-patch.webp against the frame, so the
        #: component can place it over exactly the paper it reconstructs.
        "patchR": round(R * 1.34 / sw * 100, 3),
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
FRAMES = {
    # Portrait is cropped so the flap's hinge lands on the top of the frame,
    # which is the axis the real flap turns on.
    # The wax reads at 38% of the frame's width, near the reference's own 42%.
    "portrait": {"size": (1060, 1930), "sealAt": 0.478, "sealFrac": 0.384, "quality": 84},
    # 16:10, so on a desktop the frame's width is the viewport's width and
    # nothing overflows sideways. At 2000x1130 it overflowed to 1593px on a
    # 1440px screen and the seal rendered 360px across; at this aspect the same
    # crop lands at 325px, and the file carries a 1.36x upscale instead of 1.71.
    # Zoomed out as far as the envelope allows — sealFrac is clamped to the
    # envelope's width, which lands it at 22.6%.
    "landscape": {"size": (1600, 1000), "sealAt": 0.400, "sealFrac": 0.10, "quality": 88},
}


def build(
    photo: Image.Image, size: tuple[int, int], seal_at: float, seal_frac: float
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

    src = extend_paper(photo, int(math.ceil(box[3])) + 4)
    im = src.crop(tuple(int(round(v)) for v in box)).resize((W, H), Image.LANCZOS)

    im = warm(im)
    return im, crop_geometry(tuple(int(round(v)) for v in box), size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    photo = Image.open(SRC / "envelope-photo.jpg").convert("RGB")
    sealed = press_monogram(photo, "ParfumerieScriptRegular.otf", "AS")

    geo = {}
    for name, spec in FRAMES.items():
        im, g = build(sealed, spec["size"], spec["sealAt"], spec["sealFrac"])
        p = OUT / f"envelope-{name}.webp"
        im.save(p, "WEBP", quality=spec["quality"], method=6)
        geo[name] = g
        print(f"  {p.name:26s} {im.size}  {p.stat().st_size // 1024} KB"
              f"  seal {g['sealX']:.0f}% x {g['sealY']:.0f}%  hinge {g['hingeY']:.1f}%")

    patch = seal_patch(photo)
    patch.save(OUT / "seal-patch.webp", "WEBP", quality=88, method=6)
    print(f"  seal-patch.webp            {patch.size}  "
          f"{(OUT / 'seal-patch.webp').stat().st_size // 1024} KB")

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
    S = 320
    # Just past the rim: at 1.16 the crop caught the two creases running into the
    # wax and they read as scratches across a floating disc.
    pad = int(R * 1.045)
    disc = sealed.crop((CX - pad, CY - pad, CX + pad, CY + pad)).resize((S, S), Image.LANCZOS)
    mask = Image.new("L", (S * 4, S * 4), 0)
    ImageDraw.Draw(mask).ellipse((6, 6, S * 4 - 6, S * 4 - 6), fill=255)
    mask = mask.resize((S, S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    disc = disc.convert("RGBA")
    disc.putalpha(mask)
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
