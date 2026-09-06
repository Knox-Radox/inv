"""
Renders the ornament geometry to a standalone HTML page so it can be looked at
before it is wired into the page.

Not shipped, and not part of the build. It exists because the alternative is
building a React component around a shape nobody has seen, and every hour spent
that way in revisions 1-3 produced something the client called fake.

    python3 tools/preview_ornament.py OUT.html
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import ornament as o  # noqa: E402

GROUND = "#FBF7F0"
DEEP = "#F0E9DB"


def paths(lines, stroke: str) -> str:
    return "".join(
        f'<path d="{ln["d"]}" fill="none" stroke="{stroke}" stroke-width="{ln["w"]}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
        for ln in lines
    )


#: An opaque base under each wash. Without it the sheets — which are patchy
#: by design, because a wash has to let paper through — leave every shape
#: translucent, and overlapping leaves show through one another like cellophane.
#: The base is the shape's own palest tone; the wash then does what a wash does,
#: which is vary what is already there.
BASE = {"foliage": "#DCE0D2", "stone": "#EDE6D8", "brass": "#E4D3B4"}
RIM = {"foliage": "#3A5542", "stone": "#9A9A8A", "brass": "#7E5F35"}


def washed(sil: str, sheet: str, box: tuple[float, float, float, float], key: str) -> str:
    """A silhouette filled from a wash sheet, with the rim a drying wash leaves."""
    x, y, w, h = box
    return (
        f'<defs><clipPath id="c{key}"><path d="{sil}"/></clipPath></defs>'
        f'<path d="{sil}" fill="{BASE[sheet]}"/>'
        f'<g clip-path="url(#c{key})">'
        f'<image href="/wash/{sheet}.webp" x="{x}" y="{y}" width="{w}" height="{h}" '
        f'preserveAspectRatio="xMidYMid slice"/>'
        f'<path d="{sil}" fill="none" stroke="{RIM[sheet]}" stroke-width="2.6" opacity="0.30"/>'
        f"</g>"
    )


def main(out: Path) -> None:
    col_l = o.COLUMN_L
    col_r = o.COLUMN_R
    th = o.THORANAM
    lamp = o.LAMP_L

    # A column is a cylinder and a flat wash makes it a plank. The gradient is
    # the form layer: dark at both edges, a lit band a third of the way across
    # from the light, and a faint bounce on the shadow side because stone next
    # to stone is never black.
    ROUND = (
        '<linearGradient id="round" x1="0" x2="1" y1="0" y2="0">'
        '<stop offset="0" stop-color="#7E8A75" stop-opacity=".34"/>'
        '<stop offset=".18" stop-color="#7E8A75" stop-opacity=".13"/>'
        '<stop offset=".36" stop-color="#FBF7F0" stop-opacity=".40"/>'
        '<stop offset=".62" stop-color="#7E8A75" stop-opacity="0"/>'
        '<stop offset=".88" stop-color="#7E8A75" stop-opacity=".30"/>'
        '<stop offset="1" stop-color="#CFC6B4" stop-opacity=".16"/>'
        "</linearGradient>"
    )

    def column_svg_for(col, key):
        return (
            f'<svg viewBox="0 0 120 460" width="120" height="460">'
            f"<defs>{ROUND}</defs>"
            + washed(col["sil"], "stone", (0, 0, 120, 460), f"col{key}")
            + f'<clipPath id="rc{key}"><path d="{col["sil"]}"/></clipPath>'
            f'<rect x="0" y="0" width="120" height="460" fill="url(#round)" clip-path="url(#rc{key})"/>'
            + washed(col["acanthus"], "stone", (10, 0, 100, 100), f"aca{key}")
            + paths(col["lines"], "#8A9A83")
            + "</svg>"
        )

    column_svg = column_svg_for(col_l, "a")
    column_r_svg = column_svg_for(col_r, "b")

    leaf_bits = []
    for i, lf in enumerate(th["leaves"]):
        leaf_bits.append(
            washed(lf["sil"], "foliage", (lf["x"] - 40, lf["y"] - 10, 90, 90), f"lf{i}")
            + paths(lf["lines"], "#3A5542")
        )
    cluster_bits = []
    for i, cl in enumerate(th["clusters"]):
        cluster_bits.append(
            paths([cl["stalk"]], "#8A9A83")
            + paths(cl["petals"], "#8A9A83")
            + f'<circle cx="{cl["cx"]}" cy="{cl["cy"]}" r="1.5" fill="#B08D57"/>'
        )
    thoranam_svg = (
        '<svg viewBox="0 0 800 210" width="800" height="210">'
        + paths([th["cord"]], "#B08D57")
        + "".join(leaf_bits)
        + "".join(cluster_bits)
        + "</svg>"
    )

    def lamp_svg_for(lp, key):
        glows = "".join(
            f'<radialGradient id="g{key}{i}"><stop offset="0" stop-color="#CDAE7A" stop-opacity=".5"/>'
            f'<stop offset="1" stop-color="#CDAE7A" stop-opacity="0"/></radialGradient>'
            for i in range(len(lp["flames"]))
        )
        out = f"<defs>{glows}</defs>"
        for i, fl in enumerate(lp["flames"]):
            out += (f'<circle cx="{fl["x"]}" cy="{fl["y"] - fl["r"] * 0.3}" r="{fl["r"]}" '
                    f'fill="url(#g{key}{i})"/>')
        out += washed(lp["sil"], "brass", (20, 60, 60, 140), f"lamp{key}")
        out += washed(lp["dish"], "brass", (10, 40, 80, 40), f"dish{key}")
        out += washed(lp["bud"], "brass", (34, 20, 32, 32), f"bud{key}")
        out += paths(lp["lines"], "#7E5F35")
        for fl in lp["flames"]:
            out += f'<path d="{fl["body"]}" fill="#CDAE7A" opacity="0.88"/>'
            out += f'<path d="{fl["core"]}" fill="#FBF7F0" opacity="0.92"/>'
        return f'<svg viewBox="0 0 100 210" width="140" height="294">{out}</svg>'

    lamp_svg = lamp_svg_for(o.LAMP_L, "a") + lamp_svg_for(o.LAMP_R, "b")

    out.write_text(
        f"""<!doctype html><meta charset=utf-8>
<style>
  body {{ margin:0; background:{DEEP}; font:14px Georgia,serif; color:#2E2A24; }}
  section {{ padding:24px 32px; border-bottom:1px solid #ddd6c6; background:{GROUND}; }}
  h2 {{ font-size:13px; letter-spacing:.08em; color:#8A9A83; margin:0 0 12px; font-weight:400; }}
  .row {{ display:flex; align-items:flex-start; gap:40px; }}
  svg {{ display:block; overflow:visible; }}
</style>
<section><h2>columns — left, right</h2><div class=row>{column_svg}{column_r_svg}</div></section>
<section><h2>thoranam</h2>{thoranam_svg}</section>
<section><h2>kuthuvilakku — left, right</h2><div class=row>{lamp_svg}</div></section>
""",
        encoding="utf-8",
    )
    print(f"wrote {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
