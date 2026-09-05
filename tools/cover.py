"""
Builds the cover assets from a photograph of a real sealed envelope.

Revision 4. Revisions 1-3 synthesised paper and wax with SVG lighting filters
and the client's verdict was that it looked fake. It did: the reference's
quality comes from photography, not from code. So the envelope is now a
photograph, and the only thing this script authors is the impression pressed
into the wax — Advika and Sooraj's monogram in place of the stock one.

    python3 tools/cover.py

Reads  assets/source/envelope-photo.jpg, assets/source/PinyonScript.ttf
Writes public/cover/envelope.webp, public/cover/card-paper.webp
"""
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source"
OUT = ROOT / "public" / "cover"

#: The top envelope's wax, measured on the source photograph.
CX, CY, R = 809, 672, 132
#: The envelope itself, so the second and third in the flat-lay are cropped away.
ENVELOPE = (150, 40, 1470, 950)


def fit(font_path, text, w, h):
    lo, hi = 20, 600
    while lo < hi:
        mid = (lo + hi + 1) // 2
        l, t, r, b = ImageFont.truetype(str(font_path), mid).getbbox(text)
        lo, hi = (mid, hi) if (r - l <= w and b - t <= h) else (lo, mid - 1)
    return ImageFont.truetype(str(font_path), lo)


def press_monogram(im: Image.Image, text: str = "AS") -> Image.Image:
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
    lowfreq = disc.filter(ImageFilter.GaussianBlur(r * 0.42))
    fine = ImageChops.subtract(
        disc, disc.filter(ImageFilter.GaussianBlur(1.6)), scale=1, offset=128
    )
    # ImageChops.add is (a+b)/scale + offset; fine is centred on 128, so the
    # offset must cancel that or the whole disc washes out.
    grain = ImageChops.add(
        lowfreq, Image.eval(fine, lambda v: int((v - 128) * 0.30 + 128)), scale=1, offset=-128
    )
    base = Image.composite(grain, disc, interior)

    font = fit(SRC / "PinyonScript.ttf", text, r * 1.34, r * 1.26)
    mark = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mark)
    l, t, rr, bb = d.textbbox((0, 0), text, font=font)
    d.text((cx - (rr + l) / 2, cy - (bb + t) / 2 - r * 0.02), text, font=font, fill=255)

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


#: Where the wax sits inside the cropped envelope, as a fraction of it.
SEAL_IN_ENVELOPE = ((CX - ENVELOPE[0]) / (ENVELOPE[2] - ENVELOPE[0]),
                    (CY - ENVELOPE[1]) / (ENVELOPE[3] - ENVELOPE[1]))

#: The portrait cover, and where the seal lands in it. A phone is portrait and
#: the photograph is a landscape flat-lay, so cropping to fill showed a narrow
#: band of blank paper. The envelope is composited onto its own surface instead,
#: which shows the whole object and leaves the lower third for the names.
#: Close to a phone's own proportion (390x756 is 0.516), so `cover` crops the
#: envelope's sides by almost nothing.
CANVAS = (1000, 1900)
SEAL_ON_CANVAS = (0.5, 0.38)
ENVELOPE_WIDTH = 0.92


def surface(size: tuple[int, int]) -> Image.Image:
    """The surface the envelope lies on: a photograph of cotton paper.

    Sampling the backdrop out of the envelope photograph and stretching it —
    either a vertical strip to full width, or a horizontal band to full height —
    turned its own gentle gradient into visible streaks. Real paper, scaled to
    cover, has real texture and no direction.
    """
    tex = Image.open(SRC / "card-paper.jpg").convert("RGB")
    ratio = max(size[0] / tex.width, size[1] / tex.height)
    tex = tex.resize((int(tex.width * ratio) + 1, int(tex.height * ratio) + 1), Image.LANCZOS)
    tex = tex.crop((0, 0, size[0], size[1]))
    # A touch cooler and darker than the envelope, so the envelope reads as
    # sitting on it rather than merging into it.
    return Image.merge("RGB", (
        tex.getchannel("R").point(lambda v: int(v * 0.955)),
        tex.getchannel("G").point(lambda v: int(v * 0.962)),
        tex.getchannel("B").point(lambda v: int(v * 0.965)),
    ))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    photo = Image.open(SRC / "envelope-photo.jpg").convert("RGB")
    sealed = press_monogram(photo)
    env = sealed.crop(ENVELOPE)

    W, H = CANVAS
    ew = int(W * ENVELOPE_WIDTH)
    eh = int(ew * env.height / env.width)
    env = env.resize((ew, eh), Image.LANCZOS)

    ex = int(W * SEAL_ON_CANVAS[0] - ew * SEAL_IN_ENVELOPE[0])
    ey = int(H * SEAL_ON_CANVAS[1] - eh * SEAL_IN_ENVELOPE[1])

    cover = surface(CANVAS)

    # The shadow the envelope casts on the surface, so it lies on it rather
    # than floating over it.
    shadow = Image.new("L", CANVAS, 0)
    ImageDraw.Draw(shadow).rectangle((ex + 8, ey + 12, ex + ew + 8, ey + eh + 18), fill=140)
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    cover = Image.composite(Image.eval(cover, lambda v: int(v * 0.78)), cover, shadow)

    cover.paste(env, (ex, ey))

    # Warmed a shade toward the invitation's ivory, so the paper on screen and
    # the paper in the photograph are the same paper.
    cover = Image.merge("RGB", (
        cover.getchannel("R").point(lambda v: min(255, int(v * 1.02))),
        cover.getchannel("G").point(lambda v: min(255, int(v * 1.005))),
        cover.getchannel("B").point(lambda v: int(v * 0.958)),
    ))
    cover.save(OUT / "envelope.webp", "WEBP", quality=88, method=6)
    print(f"  seal lands at {SEAL_ON_CANVAS[0]:.0%} x {SEAL_ON_CANVAS[1]:.0%} of the cover")

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

    for f in ("envelope.webp", "card-paper.webp"):
        p = OUT / f
        print(f"  {f:20s} {Image.open(p).size}  {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
