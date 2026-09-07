"""
Cuts the couple's own wedding logo down to the mark the map plate wears.

    cd tools && python3 logo.py

Reads assets/source/wedding-logo.png — the client's artwork, an A and S
monogram with jasmine growing through it, gold on a flat ivory ground — and
writes public/mark/monogram.webp.

Three things happen to it:

1. **It is cropped to the monogram.** The original carries the couple's names
   and a lotus below the mark. Both come off: at the size the seal renders on
   the plate, about seventy pixels across, "ADVIKA & SOORAJ" would be four
   pixels tall and unreadable, and the names are already the page's h1.

2. **The ivory ground becomes alpha.** The artwork is opaque ink on opaque
   paper, so the paper is un-composited out: coverage comes from how far each
   pixel falls below the ground's luminance, and the ink's own colour is
   recovered by inverting the composite. That keeps the gold's gradient — the
   mark is lighter at the top of the A and deeper in the S — which a threshold
   trace would have flattened and which is most of why it looks expensive.

3. **The gold is pulled onto the page's own.** The artwork's gold is a shade
   greener and darker than `--gold`; left alone the seal read as a sticker from
   another set. The hue is rotated onto the page's and the value range is kept,
   so the gradient survives the correction.

The output is raster, and the quality floor asks for inline SVG over raster.
This is the exception the floor already makes for the cover: it is a supplied
photograph-grade asset, tracing it would flatten the one thing that makes it
good, and at 12 KB it is cheaper than the vector would be.
"""

import numpy as np
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "assets" / "source" / "wedding-logo.png"
OUT = ROOT / "public" / "mark" / "monogram.webp"

#: The monogram only. Found by `python3 logo.py --bands`, which prints the rows
#: that carry ink: the mark, then the names, then the lotus.
CROP = (6, 10, 196, 233)

#: --gold, the page's own. The artwork's gold is pulled onto this hue.
GOLD = np.array([0xB0, 0x8D, 0x57], dtype=float)

#: Below this much ink coverage a pixel is paper, and un-compositing it only
#: amplifies the scan's noise into visible speckle around the strokes.
FLOOR = 0.02

#: The seal renders at about 75 CSS pixels on the plate at 1440 and about 55 on
#: a phone, so 160 device pixels is the most any screen asks for. 240 leaves
#: room and anything wider is bytes nobody sees.
WIDE = 240


def bands(ink: np.ndarray) -> list[tuple[int, int]]:
    rows = ink.max(1)
    out, start, inrun = [], 0, False
    for y, v in enumerate(rows):
        if v > 0.10 and not inrun:
            start, inrun = y, True
        elif v <= 0.10 and inrun:
            out.append((start, y))
            inrun = False
    if inrun:
        out.append((start, len(rows)))
    return out


def main(show_bands: bool = False) -> None:
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(float)

    # The ground, from the margins the artwork never reaches into.
    ground = np.median(
        np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3)]), axis=0
    )
    lum = im @ np.array([0.2126, 0.7152, 0.0722])
    gl = float(ground @ np.array([0.2126, 0.7152, 0.0722]))

    if show_bands:
        print(f"ground {ground}  bands {bands(np.clip((gl - lum) / gl, 0, 1))}")
        return

    x0, y0, x1, y1 = CROP
    im = im[y0:y1, x0:x1]
    lum = lum[y0:y1, x0:x1]

    # Coverage, scaled so the darkest ink in the mark is fully opaque.
    darkest = float(np.percentile(lum, 0.5))
    a = np.clip((gl - lum) / max(gl - darkest, 1e-6), 0.0, 1.0)
    a[a < FLOOR] = 0.0

    # Invert the composite to recover the ink. Where coverage is thin the
    # division is noisy, but a pixel that thin is invisible either way.
    safe = np.maximum(a, 0.08)[..., None]
    ink = (im - (1 - safe) * ground) / safe
    ink = np.clip(ink, 0, 255)

    # Pull the gold onto the page's own: keep each pixel's brightness relative
    # to the mark's mean, and take the hue from --gold. The gradient is carried
    # by that ratio, so it survives.
    weight = a[..., None]
    mean = (ink * weight).sum((0, 1)) / max(weight.sum(), 1e-6)
    scale = ink.mean(2, keepdims=True) / max(float(mean.mean()), 1e-6)
    ink = np.clip(GOLD[None, None, :] * scale, 0, 255)

    rgba = np.dstack([ink, a * 255]).astype(np.uint8)
    out = Image.fromarray(rgba)
    out = out.resize((WIDE, round(WIDE * out.height / out.width)), Image.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, "WEBP", quality=88, method=6)

    # How far the ink actually reaches from the middle, as a fraction of the
    # mark's height. `tools/mapplate.py` sizes the seal from this rather than by
    # eye, so the jasmine clears the rim by a known margin instead of a guess.
    fin = np.asarray(out).astype(float)
    alpha = fin[..., 3] / 255
    ys, xs = np.nonzero(alpha > 0.15)
    reach = np.hypot(xs - out.width / 2, ys - out.height / 2).max() / out.height

    print(f"wrote {OUT.relative_to(ROOT)}  {out.size[0]}x{out.size[1]}  "
          f"{OUT.stat().st_size / 1024:.1f} KB")
    print(f"  aspect {out.width / out.height:.4f}   ink reaches {reach:.4f} of its height")


if __name__ == "__main__":
    import sys

    main(show_bands="--bands" in sys.argv)
