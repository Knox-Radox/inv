"""
Bakes the watercolour wash sheets — docs/revision-6-ornament.md § How
line-plus-wash is built, layer 1.

Every ornament added in revision 6 is a drawn line with a wash flooding in
behind it. The wash does not come from a stock texture and it is not a tinted
blur; it is generated here with the four behaviours that make a wash read as
paint rather than as fill:

1. **Blotching.** Multi-octave value noise. A wash laid with a loaded brush is
   never even, and the unevenness is low-frequency — broad passages, not grain.

2. **Separation.** Two or three pigments at slightly separated hues, mixed by
   an *independent* noise field. This is the one that matters most. A single
   colour varied in value looks like a gradient; two pigments drifting apart
   across the paper looks like watercolour, because that is what watercolour
   physically does as the heavier pigment settles first.

3. **Granulation.** High-frequency speckle, biased into the darker passages.
   Pigment collects in the tooth of the paper, so a granulating wash is
   speckled where it is dense and smooth where it is thin. Applying it evenly
   is the tell of a synthetic texture.

4. **Backruns.** A few soft blooms where water pushed pigment outward and left
   a pale centre inside a darker ring. Rare — three or four to a sheet. They
   are the accident that says a human hand held this.

One sheet per palette family, shared by every ornament that needs it, the way
`public/cover/card-paper.webp` is shared. Each ornament clips a different
region, which is what a real washed sheet cut up would look like.

    python3 tools/wash.py

Writes public/wash/foliage.webp
       public/wash/stone.webp
       public/wash/brass.webp
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "wash"

#: Sheet edge in pixels. Ornaments sample regions of this and scale them to
#: fit, so it does not need to be large — a wash is low-frequency by nature and
#: the only thing that suffers from upscaling is the granulation, which is
#: applied at a size chosen against this number.
SIZE = 480

#: WebP quality. These sit behind line art, under a clip, at partial alpha.
#: Above ~70 the file grows on speckle nobody can resolve there.
QUALITY = 68


def _rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def value_noise(size: int, cells: int, rng: np.random.Generator) -> np.ndarray:
    """One octave: a coarse random lattice resampled up with a cubic spline.

    Cubic rather than bilinear because bilinear leaves the lattice visible as
    diamond creases, and on a pale wash that reads as a compression artefact.
    """
    grid = rng.random((cells + 3, cells + 3))
    zoomed = ndimage.zoom(grid, size / cells, order=3, mode="reflect")
    return zoomed[:size, :size]


def fbm(size: int, octaves: list[tuple[int, float]], rng: np.random.Generator) -> np.ndarray:
    """Fractal sum of value-noise octaves as (cells, amplitude) pairs."""
    total = np.zeros((size, size), dtype=np.float64)
    weight = 0.0
    for cells, amp in octaves:
        total += value_noise(size, cells, rng) * amp
        weight += amp
    total /= weight
    lo, hi = total.min(), total.max()
    return (total - lo) / max(hi - lo, 1e-9)


def backruns(size: int, count: int, rng: np.random.Generator) -> np.ndarray:
    """Blooms: a pale centre inside a darker ring, with a ragged edge.

    Built as a signed field so it can be added to the density. The ring comes
    from the difference of two blurs of the same blob — a band that follows the
    blob's own irregular outline rather than a drawn circle.
    """
    field = np.zeros((size, size), dtype=np.float64)
    for _ in range(count):
        cx, cy = rng.integers(size // 6, size - size // 6, size=2)
        r = rng.uniform(size * 0.07, size * 0.16)

        yy, xx = np.mgrid[0:size, 0:size]
        # A circle pushed out of round by a low-frequency field, which is what
        # a water front does when it runs into a drying wash.
        wobble = ndimage.zoom(rng.random((7, 7)), size / 7, order=3, mode="reflect")[:size, :size]
        dist = np.hypot(xx - cx, yy - cy) / (r * (0.72 + 0.56 * wobble))
        blob = np.clip(1.0 - dist, 0.0, 1.0)

        soft = ndimage.gaussian_filter(blob, r * 0.10)
        softer = ndimage.gaussian_filter(blob, r * 0.28)
        # Positive where the water pushed pigment out (the ring), negative
        # inside where it carried it away.
        field += (soft - softer) * 2.6 - soft * 0.55
    return field


def granulation(size: int, rng: np.random.Generator) -> np.ndarray:
    """Pigment settling in the tooth of the paper.

    Cold-press tooth is not white noise: it clumps, at roughly the scale of the
    paper's grain rather than the pixel's. A first pass at half-pixel blur read
    as film grain — dust on a lens, not pigment in paper — so this works two
    scales up and sharpens against a tight local mean, which leaves visible
    clusters with paper showing between them.
    """
    n = rng.random((size, size))
    soft = ndimage.gaussian_filter(n, 1.35)
    local = ndimage.uniform_filter(soft, 6)
    g = soft - local
    g /= max(np.abs(g).max(), 1e-9)
    # Bias toward the dark side: pigment collects in the pits, and there are
    # more flat places than pits.
    return np.sign(g) * np.abs(g) ** 1.35


def strokes(size: int, count: int, rng: np.random.Generator) -> np.ndarray:
    """Where the brush stopped.

    The behaviour most missing from a smooth noise field. A loaded brush leaves
    a passage with a *hard* edge on the side it lifted from and a soft one
    where it kept moving, and it is that asymmetry — not the blotching — that
    separates a wash from a blur. Built by shearing a soft band and taking the
    difference of two blurs at very different radii along one axis only.
    """
    field = np.zeros((size, size), dtype=np.float64)
    yy, xx = np.mgrid[0:size, 0:size]
    for _ in range(count):
        ang = rng.uniform(0, np.pi)
        # Distance along the stroke's normal, so the band runs at `ang`.
        u = (xx - size / 2) * np.cos(ang) + (yy - size / 2) * np.sin(ang)
        centre = rng.uniform(-size * 0.34, size * 0.34)
        half = rng.uniform(size * 0.06, size * 0.19)
        # A wandering edge: the brush did not travel dead straight.
        wander = ndimage.zoom(rng.random((5, 5)), size / 5, order=3, mode="reflect")[:size, :size]
        d = (u - centre - (wander - 0.5) * size * 0.09) / half
        band = np.clip(1.0 - np.abs(d), 0.0, 1.0)
        hard = np.clip(1.0 - np.abs(d) * 1.6, 0.0, 1.0)
        # The soft side minus the hard side leaves pigment banked against one
        # edge, which is the pooled line a drying wash leaves behind.
        field += ndimage.gaussian_filter(band, size * 0.012) * 0.55
        field += (hard - ndimage.gaussian_filter(hard, size * 0.03)) * 0.9
    return field / max(count, 1)


def sheet(
    pigments: list[tuple[int, int, int]],
    *,
    seed: int,
    coverage: tuple[float, float],
    grain: float,
    blooms: int,
) -> Image.Image:
    """One washed sheet.

    `pigments` are mixed by their own field, so hue drifts across the paper
    independently of how dark the wash is. `coverage` is the alpha range: a
    wash is patchy, and the patchiness is what lets the paper show through.
    """
    rng = _rng(seed)
    size = SIZE

    # --- Density: how much pigment is sitting here.
    # Broad passages, then the brush's own edges, then the backruns. The base
    # is deliberately compressed into the middle of the range before the other
    # two are added: a first pass let fbm span 0..1 and the clip afterwards ate
    # every bloom and every pooled edge, which is why that sheet read as
    # frosted glass rather than as paint.
    density = 0.30 + 0.44 * fbm(size, [(3, 1.0), (6, 0.55), (13, 0.28), (27, 0.12)], rng)
    density += strokes(size, 5, rng)
    density += backruns(size, blooms, rng)
    density = np.clip(density, 0.0, 1.0)

    # --- Separation: which pigment, mixed on its own field at a different
    # scale, so hue and value are not correlated.
    mix = fbm(size, [(2, 1.0), (5, 0.6), (11, 0.25)], rng)

    rgb = np.zeros((size, size, 3), dtype=np.float64)
    if len(pigments) == 2:
        a, b = (np.array(p, dtype=np.float64) for p in pigments)
        t = mix[..., None]
        rgb = a * (1 - t) + b * t
    else:
        a, b, c = (np.array(p, dtype=np.float64) for p in pigments)
        # Two-stage blend: the third pigment appears only in the top third of
        # the field, so it reads as an accent that was dropped in wet rather
        # than a third of the sheet.
        t = np.clip(mix * 1.5, 0, 1)[..., None]
        u = np.clip((mix - 0.66) * 3.0, 0, 1)[..., None]
        rgb = a * (1 - t) + b * t
        rgb = rgb * (1 - u) + c * u

    # --- Value from density. More pigment is darker, and it darkens toward the
    # pigment's own shadow rather than toward black. The range is wide: a wash
    # that never gets pale enough to show the paper and never gets dense enough
    # to pool is the one that reads as a tint.
    shade = 1.0 - 0.62 * (density - 0.46)
    rgb *= shade[..., None]

    # --- Granulation, biased into the dense passages. Pigment collects in the
    # tooth where there is pigment to collect; a thin passage is smooth.
    g = granulation(size, rng) * grain
    rgb *= (1.0 + g * (0.20 + 1.25 * density))[..., None]

    # --- Coverage. Patchy, on a field of its own, and never fully opaque:
    # the ground has to breathe through a wash or it is a sticker.
    lo, hi = coverage
    cov = fbm(size, [(4, 1.0), (9, 0.5), (19, 0.22)], rng)
    alpha = lo + (hi - lo) * (0.35 + 0.65 * cov) * (0.55 + 0.45 * density)
    alpha = np.clip(alpha, 0.0, 1.0)

    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


#: The families. Every colour here is one of the tokens in app/globals.css or a
#: shade mixed from two of them; nothing introduces a hue the page does not
#: already have. In particular there is no saffron: a marigold thoranam would
#: have meant a new accent colour, which §6 of the brief rules out, so the
#: thoranam is mango leaf on a gold cord — which is also the commoner form.
FAMILIES = {
    # Mango leaf, banana, cypress, jasmine foliage. --sage and --sage-deep with
    # an olive between them, because new leaf and old leaf are not the same
    # green and a thoranam is cut fresh.
    "foliage": dict(
        pigments=[(138, 154, 131), (58, 85, 66), (126, 138, 91)],
        seed=613,
        coverage=(0.42, 0.86),
        grain=0.30,
        blooms=4,
    ),
    # Columns, urns, plinths, drapery, jasmine petals. --ground-deep down to a
    # warm grey, with a sage cast in the deepest shadow so the stone belongs to
    # the same afternoon as the leaves.
    "stone": dict(
        pigments=[(240, 233, 219), (196, 187, 170), (154, 152, 138)],
        seed=1181,
        coverage=(0.34, 0.80),
        grain=0.22,
        blooms=3,
    ),
    # Lamp brass, the thoranam cord, zari. --gold-light to --gold to a bronze.
    "brass": dict(
        pigments=[(205, 174, 122), (176, 141, 87), (126, 95, 53)],
        seed=907,
        coverage=(0.46, 0.90),
        grain=0.34,
        blooms=2,
    ),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, spec in FAMILIES.items():
        img = sheet(**spec)
        path = OUT / f"{name}.webp"
        img.save(path, "WEBP", quality=QUALITY, method=6)
        print(f"  {name:9s} {SIZE}x{SIZE}  {path.stat().st_size / 1024:6.1f} KB")


if __name__ == "__main__":
    main()
