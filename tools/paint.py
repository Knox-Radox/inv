"""
Paints the cover — revision 9. docs/revision-9-cover.md.

Revisions 4 to 8 made the cover a photograph, because synthesising paper and
wax in code had read as fake three times running. The client then asked for the
opposite: the envelope *drawn*, in the line-and-wash the rest of the page is
made of. That is not the same thing as the first three attempts and it is worth
being exact about the difference. Those imitated a material. This is a picture
of an envelope, and a picture is allowed to look painted.

So nothing here models light on wax or fibre in paper. It models what a brush
does, which is a much shorter list:

1. **A wash stops at a wet edge.** Not the shape's mathematical boundary — a
   boundary that wandered a pixel or two while the paper was damp.
2. **It dries darker at that edge.** Pigment is carried outward and left in a
   rim. `tools/wash.py` does this with a stroked silhouette in SVG; here it is
   the difference between a mask and its own blur.
3. **It pools and separates inside.** Two pigments on independent fields.
4. **It settles into the tooth.** Granulation, denser where the wash is denser.
5. **The highlight is the paper.** A watercolourist does not paint a highlight,
   they leave it out. The wax's shine is a place the wash thins to nothing.

And the line goes on last, in one weight that swells and thins with the hand.

    python3 tools/paint.py            # writes the three cover assets
    python3 tools/paint.py --proof D  # also writes look-at-me PNGs into D

Writes public/cover/sprigs.webp      the jasmine printed on the envelope's paper
       public/cover/wax.webp         the seal, sage, struck with the wedding logo
       public/cover/liner.webp       the block-printed lining, the one maroon thing
       public/cover/card-paper.webp  the card's sheet — still a photograph
       assets/og/seal.png            the same seal for the share card

The card's paper is the one thing here that is not painted. It is a photograph
of cotton cardstock and it stays one: the client's "it looks fake" in revision 3
was about paper synthesised in code, and nothing in revision 9 asked for that
back. It used to be cut by tools/cover.py, which is gone with the photographed
cover; the six lines that did it are `card_paper()` below.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

import emboss
import motif

ROOT = Path(__file__).resolve().parent.parent
COVER = ROOT / "public" / "cover"
LOGO = ROOT / "assets" / "source" / "wedding-logo.png"

#: The page's own tokens — app/globals.css. Nothing here introduces a hue.
GROUND = np.array([251, 247, 240], dtype=np.float64)
SAGE = np.array([138, 154, 131], dtype=np.float64)
SAGE_DEEP = np.array([58, 85, 66], dtype=np.float64)
GOLD = np.array([176, 141, 87], dtype=np.float64)
GOLD_LIGHT = np.array([205, 174, 122], dtype=np.float64)
ARAKKU = np.array([116, 23, 42], dtype=np.float64)

#: Light from the upper left, as everything on this page has been since the
#: first wax seal. Unit-ish; only its direction is used.
LIGHT = (-0.64, -0.77)


# ---------------------------------------------------------------------------
# Fields
# ---------------------------------------------------------------------------
def smooth(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def noise(h: int, w: int, cells: float, rng: np.random.Generator, wrap: bool = False) -> np.ndarray:
    """One octave of value noise on a rectangle, optionally periodic.

    `wrap` is what lets the liner tile: the lattice itself repeats, so the
    field's right edge is its left edge and a repeat has no seam to find. The
    first version of this tiled the *zoomed* field instead and cropped the
    middle of it, which is periodic only when the zoom factor happens to be an
    integer; at 296 px it was not, and the liner came out as a quilt of visibly
    square patches.
    """
    gy, gx = max(2, round(cells * h / max(h, w))), max(2, round(cells * w / max(h, w)))
    if wrap:
        grid = np.pad(rng.random((gy, gx)), 3, mode="wrap")
        sc = max(2, math.ceil(max(h / gy, w / gx)))
        big = ndimage.zoom(grid, sc, order=3, mode="grid-wrap", grid_mode=True)
        one = big[3 * sc : 3 * sc + gy * sc, 3 * sc : 3 * sc + gx * sc]
        return np.asarray(Image.fromarray(one.astype(np.float32)).resize((w, h), Image.BICUBIC), dtype=np.float64)
    grid = rng.random((gy + 3, gx + 3))
    z = ndimage.zoom(grid, (h / gy, w / gx), order=3, mode="reflect")
    return z[:h, :w]


def fbm(h: int, w: int, octaves: list[tuple[float, float]], rng: np.random.Generator,
        wrap: bool = False) -> np.ndarray:
    total = np.zeros((h, w))
    weight = 0.0
    for cells, amp in octaves:
        total += noise(h, w, cells, rng, wrap) * amp
        weight += amp
    total /= weight
    lo, hi = total.min(), total.max()
    return (total - lo) / max(hi - lo, 1e-9)


def tooth(h: int, w: int, rng: np.random.Generator, scale: float = 1.35, wrap: bool = False) -> np.ndarray:
    """Cold-press tooth in [-1, 1]. Clumped, not white: see wash.granulation."""
    mode = "wrap" if wrap else "reflect"
    n = rng.random((h, w))
    soft = ndimage.gaussian_filter(n, scale, mode=mode)
    g = soft - ndimage.uniform_filter(soft, max(3, round(scale * 4.5)), mode=mode)
    g /= max(np.abs(g).max(), 1e-9)
    return np.sign(g) * np.abs(g) ** 1.3


def wet_edge(mask: np.ndarray, rng: np.random.Generator, wander: float = 1.6,
             soft: float = 0.9) -> np.ndarray:
    """The edge a wash actually stops at.

    The drawn boundary pushed about by a low-frequency field and re-cut. Without
    this every shape has the outline of its own geometry, which is the thing
    that makes a filled path look filled rather than painted.
    """
    h, w = mask.shape
    drift = fbm(h, w, [(w / 26, 1.0), (w / 9, 0.5)], rng) - 0.5
    blurred = ndimage.gaussian_filter(mask, wander)
    return smooth(0.5 - 0.5 * soft, 0.5 + 0.5 * soft, blurred + drift * 0.34)


def dried_rim(mask: np.ndarray, width: float) -> np.ndarray:
    """Where the pigment was carried to before the water went: just inside the
    edge. Zero in the body of the shape and zero outside it."""
    inner = ndimage.gaussian_filter(mask, width)
    return np.clip(mask - inner, 0.0, 1.0) * mask


class Ink:
    """A hand-weighted line, stamped rather than stroked.

    PIL strokes at one width. A pen does not: it presses into a curve and lifts
    out of it. Stamping a disc along the path at a radius that drifts gives the
    swell for nothing, and at 3x supersampling the stamps are invisible.
    """

    def __init__(self, h: int, w: int, ss: int = 3):
        self.ss = ss
        self.im = Image.new("L", (w * ss, h * ss), 0)
        self.d = ImageDraw.Draw(self.im)

    def path(self, pts: list[tuple[float, float]], width: float, rng: np.random.Generator,
             swell: float = 0.35, taper: float = 0.0, value: int = 255) -> None:
        if len(pts) < 2:
            return
        p = np.asarray(pts, dtype=np.float64) * self.ss
        seg = np.hypot(*np.diff(p, axis=0).T)
        s = np.concatenate([[0.0], np.cumsum(seg)])
        total = float(s[-1])
        if total <= 0:
            return
        n = max(2, int(total / 0.6))
        t = np.linspace(0.0, total, n)
        x = np.interp(t, s, p[:, 0])
        y = np.interp(t, s, p[:, 1])
        # Pressure: two slow sines out of phase, so no two lines swell alike.
        ph1, ph2 = rng.uniform(0, 6.28, 2)
        u = t / total
        press = 1.0 + swell * (0.6 * np.sin(u * 5.1 + ph1) + 0.4 * np.sin(u * 12.7 + ph2))
        if taper > 0:
            press *= np.clip(np.minimum(u, 1 - u) / taper, 0.25, 1.0)
        r = np.maximum(0.5, width * self.ss * 0.5 * press)
        for xi, yi, ri in zip(x, y, r):
            self.d.ellipse((xi - ri, yi - ri, xi + ri, yi + ri), fill=value)

    def array(self) -> np.ndarray:
        im = self.im.resize((self.im.width // self.ss, self.im.height // self.ss), Image.LANCZOS)
        return np.asarray(im, dtype=np.float64) / 255.0


def fill_mask(h: int, w: int, polys: list[list[tuple[float, float]]], ss: int = 3) -> np.ndarray:
    """Closed polygons as one antialiased coverage mask."""
    im = Image.new("L", (w * ss, h * ss), 0)
    d = ImageDraw.Draw(im)
    for poly in polys:
        if len(poly) >= 3:
            d.polygon([(x * ss, y * ss) for x, y in poly], fill=255)
    im = im.resize((w, h), Image.LANCZOS)
    return np.asarray(im, dtype=np.float64) / 255.0


def over(dst: np.ndarray, rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Straight alpha `rgb` over an RGBA float canvas (premultiplication done
    here, so callers never carry it)."""
    a = np.clip(alpha, 0.0, 1.0)[..., None]
    da = dst[..., 3:4]
    out_a = a + da * (1 - a)
    out_rgb = (rgb * a + dst[..., :3] * da * (1 - a)) / np.maximum(out_a, 1e-6)
    return np.concatenate([out_rgb, out_a], axis=2)


def save_rgba(arr: np.ndarray, path: Path, quality: int, lossless_alpha: bool = False) -> None:
    out = np.clip(arr, 0.0, 1.0)
    out = np.concatenate([out[..., :3] * 255.0, out[..., 3:4] * 255.0], axis=2).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".png":
        im.save(path, "PNG", optimize=True)
    else:
        im.save(path, "WEBP", quality=quality, method=6, alpha_quality=100 if lossless_alpha else 82)


# ---------------------------------------------------------------------------
# The wedding logo, as a die
# ---------------------------------------------------------------------------
#: The monogram only — tools/logo.py found these rows with `--bands`.
LOGO_CROP = (6, 10, 196, 233)


def die(height: int) -> np.ndarray:
    """The A, the S and the jasmine as ink coverage, `height` pixels tall.

    The artwork is 208 px wide, so this is an enlargement. Coverage enlarges far
    better than a picture does: resample, then re-cut the edge on a smoothstep,
    and a soft ramp becomes a hard one again. tools/seal.py did the same for the
    photographed wax and it is the one thing from that file worth keeping.
    """
    im = np.asarray(Image.open(LOGO).convert("RGB")).astype(np.float64)
    ground = np.median(np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3)]), axis=0)
    lum = im @ np.array([0.2126, 0.7152, 0.0722])
    gl = float(ground @ np.array([0.2126, 0.7152, 0.0722]))
    x0, y0, x1, y1 = LOGO_CROP
    lum = lum[y0:y1, x0:x1]
    darkest = float(np.percentile(lum, 0.5))
    a = np.clip((gl - lum) / max(gl - darkest, 1e-6), 0.0, 1.0)
    src = Image.fromarray((a * 255).astype(np.uint8))
    width = round(height * src.width / src.height)
    big = np.asarray(src.resize((width, height), Image.LANCZOS), dtype=np.float64) / 255.0
    # The hairlines of the jasmine are one or two source pixels and sit near
    # 0.3 after resampling. A cut at 0.5 would drop them; this keeps them and
    # still closes the letters' edges.
    return smooth(0.16, 0.46, ndimage.gaussian_filter(big, 0.6))


# ---------------------------------------------------------------------------
# The seal
# ---------------------------------------------------------------------------
#: Sprite edge. The seal renders at about 150 CSS px on a phone and 190 on a
#: desktop, so 420 covers a 2x screen and is soft-but-fine at 3x: it is a
#: painting, and there is no hard detail in it finer than the monogram.
SEAL = 420
#: Wax radius as a fraction of the sprite. The rest is room for its shadow.
SEAL_R = 0.405

WAX = np.array([163, 178, 147], dtype=np.float64)  # the wash at full strength
WAX_LIGHT = np.array([214, 222, 198], dtype=np.float64)  # where it thins toward paper
WAX_DEEP = np.array([112, 132, 103], dtype=np.float64)  # pooled, and in shadow
WAX_OLIVE = np.array([158, 166, 122], dtype=np.float64)  # the second pigment


def wax_outline(n: int = 720, seed: int = 41) -> np.ndarray:
    """Radius as a function of angle, as a fraction of the nominal radius.

    Poured wax is round where the die pressed it and wanders where it ran. A few
    low harmonics, and two places where it ran a little further.
    """
    rng = np.random.default_rng(seed)
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    r = np.ones(n)
    for k, amp in ((2, 0.016), (3, 0.020), (5, 0.012), (7, 0.008), (11, 0.005)):
        r += amp * np.sin(k * th + rng.uniform(0, 6.28))
    for centre, width, amp in ((2.3, 0.34, 0.035), (5.2, 0.26, 0.028), (0.5, 0.22, 0.018)):
        d = np.angle(np.exp(1j * (th - centre)))
        r += amp * np.exp(-(d / width) ** 2)
    return r


def seal(size: int = SEAL) -> np.ndarray:
    rng = np.random.default_rng(907)
    c = size / 2.0
    R = size * SEAL_R
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    dx, dy = xx - c, yy - c
    rad = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx) % (2 * np.pi)

    outline = wax_outline()
    edge_r = R * outline[(ang / (2 * np.pi) * len(outline)).astype(int) % len(outline)]
    u = rad / edge_r  # 0 at the centre, 1 on the wax's own edge

    body = smooth(1.012, 0.988, u)
    body = wet_edge(body, rng, wander=1.2, soft=0.5)

    # --- How much pigment. A wash, so it is uneven before anything else.
    blotch = fbm(size, size, [(3, 1.0), (7, 0.6), (15, 0.3)], rng)
    density = 0.60 + 0.46 * (blotch - 0.5)

    # The rolled rim: wax pushed outward by the die stands proud in a ring.
    # Painted, that is a band that is light on the side facing the lamp and
    # dark on the side facing away, and nothing more.
    rim = np.exp(-(((u - 0.90) / 0.075) ** 2))
    plateau = smooth(0.80, 0.74, u)  # the struck face inside the ring
    facing = -(dx * LIGHT[0] + dy * LIGHT[1]) / np.maximum(rad, 1e-6)  # +1 away from the light
    density += rim * 0.36 * facing
    # The struck face sits lower, so it is a touch deeper all over, and deeper
    # still under the lip on the lit side, where the lip shades it.
    density += plateau * 0.06
    lip = np.exp(-(((u - 0.775) / 0.035) ** 2))
    density += lip * 0.22 * np.clip(-facing, 0, 1)
    density -= lip * 0.10 * np.clip(facing, 0, 1)

    # Dried edge, at the wax's own outline.
    density += dried_rim(body, 3.4) * 1.7

    # One backrun: water let into a drying wash pushes the pigment out into a
    # ring and leaves a pale bloom inside it. One, off-centre, low on the face.
    bx, by = c + R * 0.34, c + R * 0.40
    wob = 0.75 + 0.5 * fbm(size, size, [(5, 1.0)], rng)
    bloom = np.clip(1.0 - np.hypot(xx - bx, yy - by) / (R * 0.34 * wob), 0, 1)
    b1, b2 = ndimage.gaussian_filter(bloom, R * 0.02), ndimage.gaussian_filter(bloom, R * 0.07)
    density += ((b1 - b2) * 1.9 - b1 * 0.20) * plateau

    # The highlight is left out, not painted in — and a place the brush did not
    # go has a *hard* edge, which is the whole difference between a highlight
    # that was reserved and one that was airbrushed on afterwards. A crescent
    # on the lit shoulder of the rim, cut on a wandering threshold, and one
    # small catch beside it.
    arc_ang = np.angle(np.exp(1j * (ang - math.atan2(LIGHT[1], LIGHT[0]))))
    drift = fbm(size, size, [(9, 1.0), (21, 0.5)], rng) - 0.5
    arc = np.exp(-((arc_ang / 0.58) ** 2)) * np.exp(-(((u - 0.900) / 0.034) ** 2))
    reserve = smooth(0.50, 0.62, arc + drift * 0.30)
    catch = np.exp(-(((arc_ang + 0.95) / 0.10) ** 2)) * np.exp(-(((u - 0.905) / 0.020) ** 2))
    reserve = np.maximum(reserve, smooth(0.50, 0.62, catch + drift * 0.2))
    density *= 1.0 - 0.86 * reserve
    # Pigment banks up against the edge of a reserved shape as it dries.
    density += dried_rim(1.0 - reserve, 1.6) * 0.5 * body * (1 - reserve) * rim

    # Granulation into the dense passages.
    density *= 1.0 + 0.30 * tooth(size, size, rng) * (0.35 + density)
    density = np.clip(density, 0.0, 1.25)

    # --- Which pigment. Two sages drifting apart.
    mix = fbm(size, size, [(3, 1.0), (7, 0.5)], rng)[..., None]
    pigment = WAX * (1 - 0.42 * mix) + WAX_OLIVE * (0.42 * mix)
    d3 = density[..., None]
    light = np.clip(1.0 - d3 / 0.62, 0, 1)  # thin wash: toward the paper
    deep = np.clip((d3 - 0.62) / 0.55, 0, 1)  # pooled: toward the shadow tone
    rgb = pigment * (1 - light) + WAX_LIGHT * light
    rgb = rgb * (1 - deep) + WAX_DEEP * deep

    canvas = np.zeros((size, size, 4))

    # --- The shadow it throws on the paper: a second, greyer wash laid first.
    sh = np.roll(np.roll(body, round(size * 0.020), axis=0), round(size * 0.013), axis=1)
    sh = ndimage.gaussian_filter(sh, size * 0.020)
    shadow_rgb = np.array([96, 88, 70], dtype=np.float64) / 255.0
    canvas = over(canvas, np.broadcast_to(shadow_rgb, (size, size, 3)), sh * 0.34 * (1 - body))
    # And tight contact under the edge, which is what seats it on the sheet.
    contact = np.roll(np.roll(body, 3, axis=0), 2, axis=1)
    contact = ndimage.gaussian_filter(contact, 2.2)
    canvas = over(canvas, np.broadcast_to(shadow_rgb * 0.8, (size, size, 3)), contact * 0.30 * (1 - body))

    canvas = over(canvas, rgb / 255.0, body)

    # --- The die. Cut in: darker where the brass went, with a thread of light
    # on the far wall of every cut.
    mark = die(round(R * 1.34))
    mh, mw = mark.shape
    stamp = np.zeros((size, size))
    y0, x0 = round(c - mh / 2 + R * 0.01), round(c - mw / 2)
    stamp[y0 : y0 + mh, x0 : x0 + mw] = mark
    stamp *= smooth(0.80, 0.70, u)
    cut = np.clip(stamp * (0.80 + 0.30 * fbm(size, size, [(18, 1.0)], rng)), 0, 1)
    ink_rgb = (SAGE_DEEP * 0.92 + WAX_DEEP * 0.08) / 255.0
    canvas = over(canvas, np.broadcast_to(ink_rgb, (size, size, 3)), cut * 0.80 * body)
    far = np.clip(np.roll(np.roll(stamp, 2, axis=0), 2, axis=1) - stamp, 0, 1)
    canvas = over(canvas, np.broadcast_to(WAX_LIGHT / 255.0, (size, size, 3)),
                  ndimage.gaussian_filter(far, 0.7) * 0.55 * body)

    # --- The line. The outline, broken where the hand lifted; the die's ring.
    ink = Ink(size, size)
    th = np.linspace(0, 2 * np.pi, 361)
    rr = R * np.interp(th % (2 * np.pi), np.linspace(0, 2 * np.pi, len(outline), endpoint=False), outline)
    pts = [(c + math.cos(t) * r_, c + math.sin(t) * r_) for t, r_ in zip(th, rr)]
    # Three runs, with gaps on the lit side: a line that closes all the way
    # round is a sticker's die-cut.
    for a0, a1, w_ in ((20, 196, 2.3), (204, 286, 1.5), (300, 372, 1.9)):
        seg = [pts[i % 360] for i in range(a0, a1)]
        ink.path(seg, w_, rng, swell=0.30, taper=0.10)
    # The die's ring, drawn freehand: a compass circle here is the one line on
    # the seal that would look ruled.
    rw = [R * 0.795 * (1 + 0.006 * math.sin(3 * t + 0.7) + 0.004 * math.sin(7 * t + 2.1)) for t in th]
    ring = [(c + math.cos(t) * r_, c + math.sin(t) * r_) for t, r_ in zip(th, rw)]
    for a0, a1 in ((35, 150), (164, 262), (282, 371)):
        ink.path([ring[i % 360] for i in range(a0, a1)], 1.0, rng, swell=0.4, taper=0.14)
    line = ink.array()
    canvas = over(canvas, np.broadcast_to(SAGE_DEEP / 255.0, (size, size, 3)), line * 0.62)

    return canvas


# ---------------------------------------------------------------------------
# The paper's print
# ---------------------------------------------------------------------------
#: The sheet the cover lays over itself, `object-fit: cover`, centred. A phone
#: sees the middle strip of it at full height; a desktop sees its full width
#: and the middle band. It is square so both get the same sprigs.
SHEET = 1000
#: One bough's height in sheet pixels: about 180 CSS px on a phone, and about
#: 300 across a desktop, where the same sheet is shown half as large again.
SPRIG_UNIT = 212.0
#: A pale wash on paper has almost nothing in it above the grain, and the
#: page lays its own grain over the top (components/PaperGrain.tsx), so the
#: encoder can be hard on this one.
SPRIG_QUALITY = 50


def _closed(a: str, b: str) -> list[tuple[float, float]]:
    """Two margins that share a base and a tip, as one closed outline."""
    return emboss.flatten(a)[0] + emboss.flatten(b)[0][::-1]


def sprigs(size: int = SHEET) -> np.ndarray:
    """Jasmine printed on the envelope, tone on tone.

    Revision 8 pressed these into a photograph of paper as a blind emboss. They
    are the same boughs on the same lattice — tools/emboss.py still lays them
    out — but painted now: each leaf a pale sage wash that stops at a wet edge
    and dries darker there, then the stem and the veins in a finer, drier line.
    The emboss was the paper's light; this is the paper's print.

    Opaque, on the page's own ground. A sheet with an alpha channel was the
    first version and cost 148 KB for what is one pigment on one paper.
    """
    import jasmine as j
    from pen import chain, curve

    rng = np.random.default_rng(1187)
    ss = 2
    leaf = Image.new("L", (size * ss, size * ss), 0)
    petal = Image.new("L", (size * ss, size * ss), 0)
    dl, dp = ImageDraw.Draw(leaf), ImageDraw.Draw(petal)
    ink = Ink(size, size, ss=ss)

    for bx, by, bu, rot, flip in emboss.boughs(size, size, SPRIG_UNIT, seed=11):
        k = bu / 150.0
        c_, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))

        def xf(pt, _bx=bx, _by=by, _k=k, _c=c_, _s=s_, _f=flip):
            x, y = (pt[0] - 50.0) * (-1 if _f else 1), pt[1] - 75.0
            return _bx + (x * _c - y * _s) * _k, _by + (x * _s + y * _c) * _k

        def P(poly):
            return [(x * ss, y * ss) for x, y in map(xf, poly)]

        def L(d, w, taper=0.0):
            for run in emboss.flatten(d):
                ink.path([xf(q) for q in run], max(0.7, w * k), rng, swell=0.25, taper=taper)

        for pts, w in zip(j.STEM_POINTS, j.STEM_WIDTHS):
            L(curve(chain(pts)), w * 1.25)
        for lf in j.LEAVES:
            dl.polygon(P(_closed(lf["lit"]["d"], lf["shade"]["d"])), fill=255)
            L(lf["midrib"]["d"], 0.62, taper=0.2)
            for v in lf["veins"]:
                L(v["d"], 0.36, taper=0.3)
        for b in j.BUDS:
            dp.polygon(P(_closed(b["left"]["d"], b["right"]["d"])), fill=255)
            L(b["pedicel"]["d"], 0.5)
        for f in j.FLOWERS:
            L(f["pedicel"]["d"], 0.5)
            for i in range(0, len(f["petals"]), 2):
                dp.polygon(P(_closed(f["petals"][i]["d"], f["petals"][i + 1]["d"])), fill=255)

    def down(im):
        return np.asarray(im.resize((size, size), Image.LANCZOS), dtype=np.float64) / 255.0

    leaf_m = wet_edge(down(leaf), rng, wander=0.9, soft=0.7)
    petal_m = wet_edge(down(petal), rng, wander=0.7, soft=0.7)
    line_m = ink.array()

    blotch = fbm(size, size, [(5, 1.0), (11, 0.55), (24, 0.25)], rng)
    grain = tooth(size, size, rng)

    d_leaf = (0.52 + 0.46 * (blotch - 0.5) + dried_rim(leaf_m, 2.0) * 1.5) * leaf_m
    d_leaf *= 1.0 + 0.34 * grain * (0.4 + d_leaf)
    # Petals are white flowers on ivory paper: barely a wash at all, held by
    # their rim and by the line.
    d_petal = (0.20 + 0.20 * (blotch - 0.5) + dried_rim(petal_m, 1.6) * 1.9) * petal_m

    # Clean paper under the wax and under the names, on a soft mask — the
    # copperplate needs somewhere quiet to sit. Centred, because the sheet is.
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64) / size
    quiet = np.exp(-(((xx - 0.5) / 0.33) ** 2 + ((yy - 0.655) / 0.235) ** 2) ** 1.5)
    quiet = np.maximum(quiet, np.exp(-(((xx - 0.5) / 0.16) ** 2 + ((yy - 0.44) / 0.125) ** 2) ** 1.6))
    strength = (1.0 - 0.90 * quiet)[..., None]

    mix = fbm(size, size, [(3, 1.0), (8, 0.5)], rng)[..., None]
    olive = np.array([150, 158, 122], dtype=np.float64)
    pigment = SAGE * (1 - 0.5 * mix) + olive * (0.5 * mix)

    # Transparent pigment over paper multiplies; it does not cover.
    paper = np.broadcast_to(GROUND, (size, size, 3)).copy()
    paper *= 1.0 - 0.006 * (fbm(size, size, [(2, 1.0), (4, 0.6)], rng)[..., None] - 0.5)

    def lay(canvas, density, pig, amount):
        t = np.clip(density, 0, 1.2)[..., None] * amount * strength
        return canvas * (1.0 - t * (1.0 - pig / 255.0))

    out = lay(paper, d_leaf, pigment, 0.56)
    out = lay(out, d_petal, np.array([168, 166, 146], dtype=np.float64), 0.52)
    out = lay(out, line_m, SAGE_DEEP * 0.55 + SAGE * 0.45, 0.40)
    return np.concatenate([np.clip(out, 0, 255) / 255.0, np.ones((size, size, 1))], axis=2)


# ---------------------------------------------------------------------------
# The liner
# ---------------------------------------------------------------------------
#: One repeat, at 2x. 148 CSS px across: about two and a half repeats on a
#: phone, which is what a hand block's repeat looks like on a sheet that size.
LINER = 296


def liner(size: int = LINER) -> np.ndarray:
    """The envelope's lining: lac maroon, block-printed in gold.

    **The one saturated surface on the page**, and it is seen for about two
    seconds, as the flap lifts. Everything about colour in revision 9 is
    organised around that: the PDFs the family sent run on full maroon grounds,
    the page stays ivory, and this is where the maroon is allowed to be a
    ground rather than a pigment.

    A half-drop repeat of one small flowering sprig — the PDF's tile without its
    elephants, which the brief bans and the client left banned. Printed, not
    painted: the gold sits a hair out of register with itself, thins where the
    block was short of ink, and the cloth shows through it.
    """
    rng = np.random.default_rng(431)
    h = w = size

    ground = fbm(h, w, [(3, 1.0), (7, 0.5), (16, 0.25)], rng, wrap=True)
    rgb = ARAKKU[None, None, :] * (0.90 + 0.20 * ground[..., None])
    deep = np.array([78, 14, 28], dtype=np.float64)
    pool = fbm(h, w, [(2, 1.0), (5, 0.5)], rng, wrap=True)[..., None]
    rgb = rgb * (1 - 0.30 * pool) + deep * (0.30 * pool)
    rgb *= (1.0 + 0.055 * tooth(h, w, rng, wrap=True))[..., None]

    # Two sprigs to a tile: one at the centre, one split across the corners.
    polys = motif.buti_print(scale=1.34 * size / 296.0)
    mask = np.zeros((h, w))
    for ox, oy in ((0.5, 0.5), (0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)):
        mask = np.maximum(mask, fill_mask(h, w, [[(x + ox * w, y + oy * h) for x, y in p] for p in polys]))
    # And between them a floret, which is what a block-printer puts in the gaps
    # so that the ground does not read as empty: four petals and a dot.
    k = size / 296.0
    floret: list[list[tuple[float, float]]] = []
    for q in range(4):
        a_ = math.pi / 2 * q + math.pi / 4
        ca, sa = math.cos(a_), math.sin(a_)
        floret.append([(ca * 2.2 * k - sa * 0.0, sa * 2.2 * k), (ca * 6.0 * k - sa * 2.6 * k, sa * 6.0 * k + ca * 2.6 * k),
                       (ca * 10.5 * k, sa * 10.5 * k), (ca * 6.0 * k + sa * 2.6 * k, sa * 6.0 * k - ca * 2.6 * k)])
    for ox, oy in ((0.5, 0.0), (0.5, 1.0), (0.0, 0.5), (1.0, 0.5)):
        mask = np.maximum(mask, fill_mask(h, w, [[(x + ox * w, y + oy * h) for x, y in p] for p in floret]))

    # Short of ink in places, and never quite opaque.
    hold = 0.62 + 0.38 * fbm(h, w, [(9, 1.0), (22, 0.6)], rng, wrap=True)
    hold *= 1.0 + 0.22 * tooth(h, w, rng, scale=1.0, wrap=True)
    a = np.clip(mask * hold, 0, 1)[..., None] * 0.86
    gold = GOLD_LIGHT * 0.72 + GOLD * 0.28
    rgb = rgb * (1 - a) + gold[None, None, :] * a

    return np.concatenate([np.clip(rgb, 0, 255) / 255.0, np.ones((h, w, 1))], axis=2)


# ---------------------------------------------------------------------------
# The card's paper
# ---------------------------------------------------------------------------
def card_paper() -> Image.Image:
    """assets/source/card-paper.jpg, small and warmed onto the page's ivory.

    A subtle, near-uniform texture: it is scaled to cover, so it does not need
    to be large, and components/Invitation.tsx inlines it into the HTML so it
    must not be.
    """
    card = Image.open(ROOT / "assets" / "source" / "card-paper.jpg").convert("RGB")
    card.thumbnail((640, 900), Image.LANCZOS)
    return Image.merge("RGB", (
        card.getchannel("R").point(lambda v: min(255, int(v * 1.02))),
        card.getchannel("G").point(lambda v: min(255, int(v * 1.005))),
        card.getchannel("B").point(lambda v: int(v * 0.965)),
    ))


# ---------------------------------------------------------------------------
def main() -> None:
    proof = Path(sys.argv[sys.argv.index("--proof") + 1]) if "--proof" in sys.argv else None
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None

    def want(name: str) -> bool:
        return only is None or only == name

    if want("wax"):
        s = seal()
        save_rgba(s, COVER / "wax.webp", quality=84, lossless_alpha=True)
        og = Image.fromarray((np.clip(s, 0, 1) * 255).astype(np.uint8), "RGBA").resize((320, 320), Image.LANCZOS)
        og.save(ROOT / "assets" / "og" / "seal.png", "PNG", optimize=True)
        print(f"  wax.webp     {SEAL}x{SEAL}  {(COVER / 'wax.webp').stat().st_size / 1024:6.1f} KB")
        if proof:
            on = np.broadcast_to(GROUND / 255.0, (SEAL, SEAL, 3)) * (1 - s[..., 3:4]) + s[..., :3] * s[..., 3:4]
            Image.fromarray((on * 255).astype(np.uint8)).save(proof / "wax.png")

    if want("sprigs"):
        sp = sprigs()
        im = Image.fromarray((np.clip(sp[..., :3], 0, 1) * 255).astype(np.uint8), "RGB")
        im.save(COVER / "sprigs.webp", "WEBP", quality=SPRIG_QUALITY, method=6)
        print(f"  sprigs.webp  {SHEET}x{SHEET}  {(COVER / 'sprigs.webp').stat().st_size / 1024:6.1f} KB")
        if proof:
            im.save(proof / "sprigs.png")

    if want("card"):
        card = card_paper()
        card.save(COVER / "card-paper.webp", "WEBP", quality=74, method=6)
        print(f"  card-paper.webp  {card.size[0]}x{card.size[1]}  "
              f"{(COVER / 'card-paper.webp').stat().st_size / 1024:6.1f} KB")

    if want("liner"):
        ln = liner()
        im = Image.fromarray((np.clip(ln[..., :3], 0, 1) * 255).astype(np.uint8), "RGB")
        im.save(COVER / "liner.webp", "WEBP", quality=80, method=6)
        print(f"  liner.webp   {LINER}x{LINER}  {(COVER / 'liner.webp').stat().st_size / 1024:6.1f} KB")
        if proof:
            tiled = Image.new("RGB", (LINER * 3, LINER * 3))
            for i in range(3):
                for j in range(3):
                    tiled.paste(im, (i * LINER, j * LINER))
            tiled.save(proof / "liner.png")


if __name__ == "__main__":
    main()
