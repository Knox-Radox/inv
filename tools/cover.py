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

#: The wax does not break on a clean chord. This is the amplitude of the
#: irregularity in the break, as a fraction of R.
BREAK_WOBBLE = 0.16


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
    lowfreq = disc.filter(ImageFilter.GaussianBlur(r * 0.55))
    # At r*0.42 a ghost of the stock trunk was still legible under the
    # monogram: the tree lives in the mid frequencies, so the blur that erases
    # it has to be wider than its grooves. The grain added back is high-passed
    # tighter than those grooves in turn — 1.0px keeps the wax's own speckle
    # and leaves anything groove-width behind.
    fine = ImageChops.subtract(
        disc, disc.filter(ImageFilter.GaussianBlur(1.0)), scale=1, offset=128
    )
    # ImageChops.add is (a+b)/scale + offset; fine is centred on 128, so the
    # offset must cancel that or the whole disc washes out.
    grain = ImageChops.add(
        lowfreq, Image.eval(fine, lambda v: int((v - 128) * 0.26 + 128)), scale=1, offset=-128
    )
    base = Image.composite(grain, disc, interior)

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
        Image.eval(out, lambda v: int(v * 0.74)), out, floor.point(lambda v: int(v * 0.78))
    )
    out = Image.composite(
        Image.eval(out, lambda v: int(v * 0.52)), out, shadow.point(lambda v: min(255, int(v * 1.9)))
    )
    out = Image.composite(
        Image.eval(out, lambda v: min(255, int(v * 1.16 + 12))),
        out,
        light.point(lambda v: min(255, int(v * 1.25))),
    )

    sealed = im.copy()
    sealed.paste(out.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS), box)
    return sealed


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

    # The wax is stuck to the flap's point and to the body underneath, so when
    # the flap lifts it shears along the line between the two places the creases
    # run into it: the flap keeps the segment above that line, the body keeps
    # the crescent below. The line is a chord, not an arc around the disc —
    # modelling it as an arc gave a polygon that crossed itself.
    #
    # Wax does not shear straight, so the chord bulges a little into the lower
    # half and carries a fixed, reproducible irregularity. This is the one
    # authored thing on the cover, and it is a break, not a material.
    N = 26
    dx, dy = lx - rx, ly - ry
    length = math.hypot(dx, dy)
    # Perpendicular, pointing down the frame.
    px, py = -dy / length, dx / length
    if py < 0:
        px, py = -px, -py
    break_pts = []
    for i in range(N + 1):
        t = i / N
        # Zero at both ends, so the break meets each crease exactly.
        envelope_ = math.sin(math.pi * t)
        off = R * envelope_ * (0.34 + BREAK_WOBBLE * math.sin(t * 11.0 + 0.6))
        break_pts.append((rx + dx * t + px * off, ry + dy * t + py * off))

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
    inset = 0.9
    # Decimated, because unlike the flap's cut this one is *animated*: the mouth
    # opens out over a second, and clip-path is not composited, so every point
    # is repaint work on every frame. At the flap's full 31 points the opening
    # measured p95 26.2ms at 6x CPU against revision 4's 19.6. The mouth is
    # inset behind the flap's edge and never has to line up with it exactly, so
    # the break can be carried by a handful of points instead of twenty-seven.
    keep = [p for i, p in enumerate(flap) if i < 3 or i == len(flap) - 1 or (i - 3) % 6 == 0]
    mouth = [(x, y if y <= fy(TOP) else y - inset) for x, y in keep]

    # The same cut with its lower boundary dropped past the foot of the frame:
    # the envelope's mouth, opened out until it is the whole picture. Same point
    # count as `mouth`, in the same order, which is what lets CSS interpolate
    # between the two — so the opening widens into the page instead of the page
    # being crossfaded in over a card still trapped in a triangle.
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
    "portrait": {"size": (1100, 2000), "sealAt": 0.478, "quality": 78},
    "landscape": {"size": (2000, 1130), "sealAt": 0.400, "quality": 76},
}


def build(photo: Image.Image, size: tuple[int, int], seal_at: float) -> tuple[Image.Image, dict]:
    W, H = size
    # Zoom is set by the widest crop the envelope can actually fill.
    max_sw = (RIGHT - LEFT) - 40
    scale = max(W / max_sw, 1.60)
    sw, sh = W / scale, H / scale
    x0 = CX - sw / 2
    # Never start above the envelope's own top edge: a few rows of the linen
    # wall at the top of frame is the one thing that gives away that this is a
    # photograph of an envelope rather than a look at one. Clamping here rather
    # than hand-tuning sealAt means a re-crop cannot reintroduce it.
    y0 = max(CY - sh * seal_at, TOP + 4)
    box = (x0, y0, x0 + sw, y0 + sh)

    src = extend_paper(photo, int(math.ceil(box[3])) + 4)
    im = src.crop(tuple(int(round(v)) for v in box)).resize((W, H), Image.LANCZOS)

    # Warmed a shade toward the invitation's ivory, so the paper on screen and
    # the paper in the photograph are the same paper.
    im = Image.merge("RGB", (
        im.getchannel("R").point(lambda v: min(255, int(v * 1.02))),
        im.getchannel("G").point(lambda v: min(255, int(v * 1.005))),
        im.getchannel("B").point(lambda v: int(v * 0.958)),
    ))
    return im, crop_geometry(tuple(int(round(v)) for v in box), size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    photo = Image.open(SRC / "envelope-photo.jpg").convert("RGB")
    sealed = press_monogram(photo, "ParfumerieScriptRegular.otf", "AS")

    geo = {}
    for name, spec in FRAMES.items():
        im, g = build(sealed, spec["size"], spec["sealAt"])
        p = OUT / f"envelope-{name}.webp"
        im.save(p, "WEBP", quality=spec["quality"], method=6)
        geo[name] = g
        print(f"  {p.name:26s} {im.size}  {p.stat().st_size // 1024} KB"
              f"  seal {g['sealX']:.0f}% x {g['sealY']:.0f}%  hinge {g['hingeY']:.1f}%")

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
