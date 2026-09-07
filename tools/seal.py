"""
The wax seal, as a sprite — revision 8.

The client's verdict on the old one: "the wax seal looks very very low quality
compared to the reference, it doesnt even look like a natural wax seal and its
blurred". All three are fair, and they have one cause.

The old seal was a *repair*. The photograph carries a stock tree impression, so
tools/cover.py blurred it out of the wax at 0.70r and pressed "AS" back in as
rasterised Parfumerie text with a hand-built bump map. Blurring hard enough to
erase the tree is blurring hard enough to erase the wax, and what came back was
soft by construction. Then a patch of reconstructed paper was composited over
the whole thing to take the wax away again when the flap lifted — the pale
half-disc the client also reported.

So this stops repairing and starts authoring. The seal leaves the photograph as
its own sprite with an alpha channel, and the photograph keeps no wax at all.

What is kept from the photograph, because it is what made revision 4 work:
the dome's real lighting, the poured edge that is not a circle, the beaded rim
where the die squeezed wax out past itself, and the surface grain.

What is replaced:

* **The colour.** Sampled from the client's own reference plate rather than
  invented — see RAMP. Our wax's luminance is histogram-matched onto the
  reference's first, so the sprite wears the reference's material over our
  photograph's geometry.
* **The impression.** The couple's own wedding logo, cut in as depth. A brass
  die leaves depth and not colour, so the artwork's gold becomes light and
  shadow and the wax stays one colour throughout. Gold ink sitting on green wax
  is a sticker, and stickers are what revisions 1-3 were rejected for.

    python3 tools/seal.py            # writes a proof sheet to /tmp
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import (
    binary_closing,
    distance_transform_edt,
    binary_fill_holes,
    gaussian_filter,
    grey_dilation,
    label,
)

from emboss import LIGHT

ROOT = Path(__file__).resolve().parent.parent
ROOT_LOGO = ROOT / "assets" / "source" / "wedding-logo.png"

#: The wax in assets/source/envelope-photo.jpg.
CX, CY, R = 809, 672, 132

#: The monogram in assets/source/wedding-logo.png, from tools/logo.py, which
#: found it by printing the rows that carry ink.
LOGO_CROP = (6, 10, 196, 233)

#: The reference plate's own wax, measured off docs/reference/maison-doree/
#: 01-cover.webp: luminance against mean RGB at that luminance, at seven
#: percentiles through the disc. Every colour in the finished seal is
#: interpolated between these, so the material is the client's benchmark
#: rather than a green this file picked.
#:
#: Note what the top of the ramp does — R and G level off while B climbs 40
#: points to meet them. Wax is a dielectric: its specular is the colour of the
#: light, not of the wax, so the highlight desaturates toward white. A flat hue
#: rotation of the bronze cannot produce that and comes out looking like
#: painted metal, which is what the first attempt at this looked like.
#: The percentiles RAMP's rows were taken at. Not evenly spaced, and it
#: matters: read as 0/17/33/50/67/83/100 the ramp stretches the shadow end over
#: a third of the wax and the whole seal comes out pale and chalky.
RAMP_AT = np.array([2.0, 10.0, 25.0, 50.0, 75.0, 90.0, 98.0])

RAMP = np.array([
    [85.6, 84.7, 88.8, 57.2],
    [118.7, 119.3, 121.7, 89.3],
    [146.3, 146.1, 149.4, 116.7],
    [161.5, 161.0, 164.8, 131.6],
    [172.4, 171.8, 175.2, 143.6],
    [195.6, 195.7, 198.0, 170.1],
    [230.0, 232.5, 231.5, 210.3],
])

#: How far past R the sprite is cut. Wide enough to carry the wax's own contact
#: shadow — the paper under it is reconstructed flat, so a shadow left behind
#: would have to be painted on the paper, and then the seal could never move —
#: and no wider. It was 1.45, which put a ring of guaranteed-empty pixels around
#: every edge: the wax reaches 1.057 R and its shadow dies by 1.20 R, measured
#: on the sprite's own alpha. Cutting to 1.26 R drops a quarter of the file for
#: nothing, which on a Slow 4G throttle is real time.
SPRITE_REACH = 1.26

#: How much of the wax's width the impression fills. The reference's initial
#: takes a little over half the disc; the jasmine in this logo reaches further
#: from its own centre than a letter does, so it is set smaller and still
#: covers more.
MARK_FILL = 0.72

#: The impression's depth, and the darkening at the bottom of it. Same two-term
#: model as the paper's emboss — see emboss.press — at a wax scale, where the
#: die goes far deeper than a paper press can.
MARK_RELIEF, MARK_OCCLUSION = 340.0, 30.0


def _chroma(a: np.ndarray) -> np.ndarray:
    """Red minus blue. The bronze wax runs about 69; the paper about 7, so this
    separates them with a margin no threshold on luminance has — the rim's
    highlight is brighter than the paper it sits on."""
    return a[..., 0] - a[..., 2]


def wax_alpha(a: np.ndarray, soft: float = 1.5) -> np.ndarray:
    """Coverage of the wax, from its chroma.

    Thresholded, then reduced to one solid blob before it is softened. The
    plain ramp on chroma that this replaces was picking up the envelope's two
    creases — they are shadow lines, and a shadow on warm paper carries enough
    red over blue to clear the threshold — so the sprite arrived with two
    hairlines ruled across its transparent margin. Taking the largest connected
    component and filling it drops them, and closing the boundary first stops
    the wax's own grain from serrating the edge.

    Softened only at the end, and only a little: the real edge is a poured
    meniscus rather than a cut, but it is still an edge.
    """
    solid = _chroma(a) > 34.0
    solid = binary_closing(solid, np.ones((5, 5), bool))
    lab, n = label(solid)
    if n:
        solid = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    solid = binary_fill_holes(solid)
    return gaussian_filter(solid.astype(np.float32), soft)


def outline(photo: Image.Image, angles: np.ndarray, outset: float = 0.012) -> np.ndarray:
    """The wax's own silhouette: its radius, in units of R, at each angle.

    The flap is cut along this. It used to be cut along a circle at 1.31 R,
    which is a quarter wider than the wax actually is, so a crescent of bare
    paper hung off the flap below the creases with nothing covering it — and
    that crescent, swinging away as the flap lifted, is the "unnatural
    semicircle" in the client's note. Cut to the wax's own edge there is no
    crescent: what hangs below the V is the wax, which is what is really stuck
    across the joint.

    `outset` puts the cut a hair outside the wax so the sprite's own soft edge
    covers the seam rather than landing exactly on it.
    """
    pad = int(R * 1.6)
    a = np.asarray(photo.crop((CX - pad, CY - pad, CX + pad, CY + pad))).astype(np.float32)
    alpha = wax_alpha(a)
    n = alpha.shape[0]
    # March out from the middle and take the last crossing of half coverage, so
    # a speck of chroma noise near the centre cannot end the search early.
    steps = np.linspace(0.2, 1.6, 700)
    out = np.empty(len(angles), np.float64)
    for i, ang in enumerate(angles):
        xs = (n - 1) / 2 + np.cos(ang) * steps * R
        ys = (n - 1) / 2 + np.sin(ang) * steps * R
        xi = np.clip(np.rint(xs).astype(int), 0, n - 1)
        yi = np.clip(np.rint(ys).astype(int), 0, n - 1)
        hit = alpha[yi, xi] > 0.5
        out[i] = steps[np.nonzero(hit)[0][-1]] if hit.any() else 1.0
    return out + outset


def surface(a: np.ndarray, alpha: np.ndarray, r: float) -> np.ndarray:
    """The wax's luminance with the stock impression taken out of it.

    Normalised convolution, not a plain blur. A blur wide enough to erase the
    tree also reaches outside the disc and drags the pale paper in, which
    lightened and flattened the whole seal — the measured failure that made the
    old wax read as translucent plastic. Weighting by the wax's own coverage and
    dividing by the blurred coverage means only wax contributes, so the level
    and the dome's shape survive the smoothing.

    The grain is then put back from the wax's own 1 px high-pass, attenuated
    where the mid frequencies swing. That last part matters: a groove's wall is
    a sharp 1-2 px transition, so the tree's edges live at the same frequency as
    the speckle and come back with it unless they are told apart by *where* they
    are. Full grain on flat wax, none along what used to be a groove.
    """
    lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    w = np.maximum(alpha, 1e-3)
    k = r * 0.42
    dome = gaussian_filter(lum * w, k) / np.maximum(gaussian_filter(w, k), 1e-3)

    # Smoothed on the face and left alone at the rim.
    #
    # A blur wide enough to erase the tree also erases the beading where the die
    # squeezed wax out past its own edge, and that beading is most of what makes
    # the thing read as wax rather than as a green counter. But the tree only
    # ever covers the face, so the rim does not need smoothing: the two are
    # separated by depth into the disc.
    #
    # Measured from the wax's own edge, not from a circle around the sprite's
    # centre. The wax is a poured blob — it sits left of centre and it is not
    # round — so a concentric ring cut across the real rim and left a crescent
    # of raw photograph behind, which the colour match then drove to white.
    face = np.clip((distance_transform_edt(alpha > 0.5) - 0.04 * r) / (0.10 * r), 0, 1)

    # The rim is a *narrow* normalised convolution rather than the raw
    # photograph. Two reasons, and the first is a bug: at the very edge the raw
    # luminance is the paper's, not the wax's, so the seal came out ringed in
    # white where the colour match drove bare paper to the top of the ramp.
    # Weighting by the wax's coverage keeps paper out of it. The second is that
    # the same narrow blur takes the speckle off the beading without taking the
    # beading off the rim.
    q = r * 0.035
    rim = gaussian_filter(lum * w, q) / np.maximum(gaussian_filter(w, q), 1e-3)
    out = dome * face + rim * (1 - face)

    # The wax's own speckle, put back over the smoothed face. Gently: at 1.15
    # this was sandpaper, and the tree's groove walls are the same 1-2 px
    # frequency as the speckle, so they came back with it. `keep` tells the two
    # apart by where they are rather than by how sharp they are — full grain on
    # flat wax, none along what used to be a groove.
    tooth = lum - gaussian_filter(lum, 1.0)
    swing = np.abs(gaussian_filter(lum, 1.2) - gaussian_filter(lum, 10.0))
    keep = 1.0 / (1.0 + (swing / 2.2) ** 2)
    return out + tooth * 0.45 * keep * face * alpha


def match(src: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Histogram-match the wax's luminance onto the reference plate's.

    The bronze in the photograph and the sage in the reference do not merely
    differ in hue; the bronze is darker and lower in contrast. Mapping
    percentile to percentile carries our dome and rim onto the reference's tonal
    range, so the colour ramp below lands where it was measured to land.
    """
    sel = mask > 0.5
    qs = np.linspace(0, 100, 33)
    ours = np.percentile(src[sel], qs)
    theirs = np.interp(qs, RAMP_AT, RAMP[:, 0])
    # np.interp needs a non-decreasing x, which percentiles of anything are.
    return np.interp(src, ours, theirs)


def logo_height(size: int) -> np.ndarray:
    """The wedding logo as a depth map, square, centred, in 0..1.

    The artwork is 208x306 — small — but a deboss needs the *shape*, not the
    ink, and coverage upscales far better than a photograph does. Recovered the
    way tools/logo.py recovers it, by un-compositing the ivory ground, then
    resampled and re-crisped so a 3x lift lands on a hard edge instead of a
    ramp. That re-crisping is the difference between a die strike and the blur
    the client is complaining about.
    """
    src = Image.open(ROOT_LOGO).convert("RGB")
    im = np.asarray(src).astype(np.float32)
    ground = np.median(np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3)]), 0)
    k = np.array([0.2126, 0.7152, 0.0722], np.float32)
    lum, gl = im @ k, float(ground @ k)

    x0, y0, x1, y1 = LOGO_CROP
    lum = lum[y0:y1, x0:x1]
    cov = np.clip((gl - lum) / max(gl - float(np.percentile(lum, 0.5)), 1e-6), 0, 1)

    # Square, with the mark centred and its aspect kept.
    h, w = cov.shape
    side = max(h, w)
    pad = np.zeros((side, side), np.float32)
    pad[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = cov

    up = np.asarray(
        Image.fromarray(pad).resize((size, size), Image.LANCZOS), dtype=np.float32
    )
    # Re-crisp: a smoothstep across the coverage ramp the resample introduced.
    t = np.clip((up - 0.26) / 0.30, 0, 1)
    up = t * t * (3 - 2 * t)
    # The jasmine is drawn in 1-2 px hairlines in the source. At any useful
    # depth they would sit shallower than the letters and disappear into the
    # wax, so every stroke gets a floor: a dilation the letters are already
    # deeper than and only the hairlines are lifted by.
    return np.maximum(up, grey_dilation(up, size=3) * 0.72)


def colourise(lum: np.ndarray) -> np.ndarray:
    """Luminance to sage, through the reference's own measured ramp."""
    return np.stack(
        [np.interp(lum, RAMP[:, 0], RAMP[:, c + 1]) for c in range(3)], axis=-1
    )


def build(photo: Image.Image, size: int = 640) -> Image.Image:
    """The seal, ready to be laid on the paper it was cut from.

    The sprite reaches to 1.45 R so it can carry its own contact shadow: the
    paper under this is reconstructed flat by tools/cover.py, so the shadow the
    wax casts has to travel with the wax or the seal floats.
    """
    pad = R * SPRITE_REACH
    box = (int(CX - pad), int(CY - pad), int(CX + pad), int(CY + pad))
    crop = photo.crop(box).resize((size, size), Image.LANCZOS)
    a = np.asarray(crop).astype(np.float32)
    r = R * size / (2 * pad)

    alpha = wax_alpha(a)
    lum = match(surface(a, alpha, r), alpha)

    # The impression, cut into the surface.
    mark = np.zeros((size, size), np.float32)
    m = int(round(size * MARK_FILL * (R / pad)))
    o = (size - m) // 2
    mark[o:o + m, o:o + m] = np.asarray(
        Image.fromarray(logo_height(m)), dtype=np.float32
    )
    # Only inside the wax: the die cannot press paper.
    # Barely blurred. The die's own edge is nearly square at this scale, and
    # every level of blur here is a level of the softness the client reported.
    mark = gaussian_filter(mark, max(0.5, size / 900)) * (alpha > 0.9)

    gy, gx = np.gradient(mark)
    lum = lum + (gx * LIGHT[0] + gy * LIGHT[1]) * MARK_RELIEF - mark * MARK_OCCLUSION

    rgb = colourise(np.clip(lum, 0, 255))

    # The contact shadow: the wax's own silhouette, offset away from the light,
    # blurred, and carried in alpha so it darkens whatever paper it lands on
    # rather than painting a grey ring on it.
    drop = gaussian_filter(
        np.roll(np.roll(alpha, int(size * 0.012), 0), int(size * 0.010), 1), size * 0.020
    )
    shadow = np.clip(drop - alpha, 0, 1) * 0.42

    out = np.zeros((size, size, 4), np.float32)
    out[..., :3] = rgb * alpha[..., None] + np.array([70.0, 62.0, 48.0]) * (1 - alpha[..., None])
    out[..., 3] = np.clip(alpha + shadow, 0, 1) * 255
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def main() -> None:
    photo = Image.open(ROOT / "assets" / "source" / "envelope-photo.jpg").convert("RGB")
    sprite = build(photo)
    proof = Image.new("RGB", (sprite.width, sprite.height), (247, 243, 235))
    proof.paste(sprite, (0, 0), sprite)
    proof.save("/tmp/seal-proof.png")
    print(f"wrote /tmp/seal-proof.png  {sprite.size}")


if __name__ == "__main__":
    main()
