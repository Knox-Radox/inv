"""
The embossed floral relief — revision 3.

The client's reference has blind-embossed florals across the whole envelope,
lit from the top-left, tone on tone. This composes the jasmine spray into a
full relief: several sprays at varied scale and rotation, plus scattered single
blossoms and buds, drawn as WHITE fills and strokes so the SVG lighting filter
can read them as a height map. The lighting itself lives in the components.

Two compositions: ENVELOPE (440x700, dense) and CARD (620x900, sparse corners
so the type has room).
"""

import math
import sys

sys.setrecursionlimit(20000)

import jasmine as j
from pen import chain, curve


def spray(tx: float, ty: float, sc: float, rot: float, flip: bool = False) -> str:
    parts = []
    for pts, w in zip(j.STEM_POINTS, j.STEM_WIDTHS):
        parts.append(f'<path d="{curve(chain(pts))}" stroke-width="{w * 1.7:.2f}"/>')
    for lf in j.LEAVES:
        shade_join = lf["shade"]["d"].replace("M", "L", 1)
        parts.append(f'<path d="{lf["lit"]["d"]} {shade_join}" fill="#fff" stroke="#fff" stroke-width="0.8"/>')
        parts.append(f'<path d="{lf["midrib"]["d"]}" stroke="#000" stroke-width="0.9" opacity="0.55"/>')
    for b in j.BUDS:
        parts.append(f'<path d="{b["pedicel"]["d"]}" stroke-width="0.9"/>')
        parts.append(f'<path d="{b["left"]["d"]} {b["right"]["d"].replace("M", "L", 1)}" fill="#fff" stroke="#fff" stroke-width="0.6"/>')
    for f in j.FLOWERS:
        parts.append(f'<path d="{f["pedicel"]["d"]}" stroke-width="0.9"/>')
        for q in f["petals"]:
            parts.append(f'<path d="{q["d"]}" stroke-width="1.1"/>')
        parts.append(f'<circle cx="{f["cx"]}" cy="{f["cy"]}" r="1.5" fill="#fff"/>')
    sx = -sc if flip else sc
    return (
        f'<g transform="translate({tx} {ty}) rotate({rot}) scale({sx} {sc})" '
        f'fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">'
        + "".join(parts)
        + "</g>"
    )


def blossom(cx: float, cy: float, r: float, petals: int, rot: float) -> str:
    """A single open flower, for scattering between the sprays."""
    out = []
    for i in range(petals):
        a = math.radians(rot + 360 * i / petals)
        rr = r * (0.84 + 0.16 * ((i * 3) % 4) / 3)
        ca, sa = math.cos(a), math.sin(a)
        na, nb = -sa, ca
        pw = rr * 0.34
        out.append(
            f'<path d="M{cx:.1f} {cy:.1f}'
            f'C{cx + ca * rr * 0.3 + na * pw:.1f} {cy + sa * rr * 0.3 + nb * pw:.1f} '
            f'{cx + ca * rr * 0.75 + na * pw * 0.8:.1f} {cy + sa * rr * 0.75 + nb * pw * 0.8:.1f} '
            f'{cx + ca * rr:.1f} {cy + sa * rr:.1f}'
            f'C{cx + ca * rr * 0.75 - na * pw * 0.8:.1f} {cy + sa * rr * 0.75 - nb * pw * 0.8:.1f} '
            f'{cx + ca * rr * 0.3 - na * pw:.1f} {cy + sa * rr * 0.3 - nb * pw:.1f} '
            f'{cx:.1f} {cy:.1f}Z" fill="#fff" stroke="#fff" stroke-width="0.6"/>'
        )
    out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r * 0.18:.1f}" fill="#000" opacity="0.5"/>')
    return f'<g stroke-linejoin="round">{"".join(out)}</g>'


ENVELOPE = "".join(
    [
        spray(58, -34, 2.2, 22),
        spray(392, 10, 2.0, -148, flip=True),
        spray(-14, 250, 1.9, 34),
        spray(430, 300, 1.85, -170, flip=True),
        spray(110, 470, 1.7, 26),
        spray(350, 560, 1.75, -158, flip=True),
        spray(20, 640, 1.5, 12),
        spray(250, 200, 1.35, 62),
        spray(150, 700, 1.4, -20, flip=True),
        spray(420, 470, 1.3, 118, flip=True),
        blossom(232, 128, 15, 6, 12),
        blossom(60, 520, 13, 6, 88),
        blossom(410, 610, 11, 5, -50),
        blossom(320, 20, 10, 6, 30),
        blossom(140, 240, 9, 5, 130),
        blossom(180, 604, 12, 5, -30),
        blossom(300, 400, 13, 6, 40),
        blossom(84, 356, 10, 5, 70),
        blossom(378, 178, 11, 6, -15),
    ]
)

CARD = "".join(
    [
        spray(30, -20, 1.9, 24),
        spray(600, 0, 1.8, -152, flip=True),
        spray(-10, 700, 1.6, 8),
        spray(630, 640, 1.7, -166, flip=True),
        blossom(586, 130, 12, 6, 20),
        blossom(48, 210, 11, 5, -40),
        blossom(560, 820, 12, 6, 55),
    ]
)

if __name__ == "__main__":
    print(f"envelope relief {len(ENVELOPE)} chars, card relief {len(CARD)} chars")
