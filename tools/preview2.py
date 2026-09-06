"""Standalone preview of the revision 6 pieces added after the threshold.

Not shipped. Same purpose as preview_ornament.py: look at the drawing before
building a component around it.

    python3 tools/preview2.py OUT.html
"""
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import ornament as o  # noqa: E402

BASE = {"foliage": "#DCE0D2", "stone": "#E1DACA", "brass": "#E4D3B4"}
RIM = {"foliage": "#3A5542", "stone": "#9A9A8A", "brass": "#7E5F35"}
_n = [0]


def paths(lines, stroke):
    return "".join(
        f'<path d="{l["d"]}" fill="none" stroke="{stroke}" stroke-width="{l["w"]}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>' for l in lines)


def washed(sil, sheet, box, rimw=2.2):
    _n[0] += 1
    k = f"p{_n[0]}"
    x, y, w, h = box
    return (f'<defs><clipPath id="{k}"><path d="{sil}"/></clipPath></defs>'
            f'<path d="{sil}" fill="{BASE[sheet]}"/>'
            f'<g clip-path="url(#{k})">'
            f'<image href="/wash/{sheet}.webp" x="{x}" y="{y}" width="{w}" height="{h}" '
            f'preserveAspectRatio="xMidYMid slice"/>'
            f'<path d="{sil}" fill="none" stroke="{RIM[sheet]}" stroke-width="{rimw}" opacity=".3"/></g>')


def main(out: Path) -> None:
    ban = ""
    for st in o.BANANA:
        ban += (f'<ellipse cx="{st["x"]}" cy="{st["y"] + 4}" rx="{st["rx"]}" ry="6" fill="#8A9A83" opacity=".16"/>'
                + washed(st["sil"], "foliage", (60, 180, 180, 240))
                + washed(st["blades"], "foliage", (0, 100, 300, 300))
                + paths(st["lines"], "#3A5542"))
    banana = f'<svg viewBox="0 0 300 420" width="300" height="420">{ban}</svg>'

    b = o.BOUGH
    bg = washed(b["branch"], "foliage", (0, 0, 300, 460))
    bg += washed(b["leaves"], "foliage", (-40, -40, 380, 540))
    bg += paths(b["lines"], "#3A5542")
    for f in b["flowers"]:
        bg += washed(f["sil"], "stone", (f["cx"] - 30, f["cy"] - 30, 60, 60), 1.3)
        bg += paths([{"d": f["sil"], "w": 0.7}], "#3A5542")
        bg += f'<circle cx="{f["cx"]}" cy="{f["cy"]}" r="{f["r"]}" fill="#B08D57" opacity=".8"/>'
    cypress = f'<svg viewBox="0 0 300 460" width="300" height="460">{bg}</svg>'

    def urn(u):
        s = (f'<ellipse cx="{u["cx"]}" cy="{u["base"] + 3}" rx="{u["rx"]}" ry="7" fill="#8A9A83" opacity=".18"/>'
             + washed(u["sil"], "stone", (20, 150, 140, 260))
             + paths(u["lines"], "#7E8A75")
             + paths(u["stems"], "#8A9A83"))
        for f in u["flowers"]:
            s += washed(f["sil"], "stone", (f["cx"] - 20, f["cy"] - 20, 40, 40), 1.2)
            s += paths([{"d": f["sil"], "w": 0.6}], "#8A9A83")
            s += f'<circle cx="{f["cx"]}" cy="{f["cy"]}" r="{f["r"]}" fill="#B08D57" opacity=".75"/>'
        return f'<svg viewBox="0 0 180 400" width="180" height="400">{s}</svg>'

    k = o.KOLAM
    ks = paths([{"d": k["ring"]["d"], "w": 1.5}], "#B08D57")
    ks += paths([{"d": p["d"], "w": 1.4} for p in k["petals"]], "#B08D57")
    for d in k["dots"]:
        ks += f'<circle cx="{d["cx"]}" cy="{d["cy"]}" r="{d["r"]}" fill="#3A5542" opacity=".8"/>'
    kolam = f'<svg viewBox="0 0 300 300" width="300" height="300">{ks}</svg>'

    out.write_text(f"""<!doctype html><meta charset=utf-8>
<style>body{{margin:0;background:#F0E9DB;font:13px Georgia,serif;color:#2E2A24}}
section{{padding:20px 28px;border-bottom:1px solid #ddd6c6;background:#FBF7F0}}
h2{{font-size:12px;letter-spacing:.08em;color:#8A9A83;margin:0 0 10px;font-weight:400}}
.row{{display:flex;gap:36px;align-items:flex-end}} svg{{display:block}}</style>
<section><h2>banana (vazhai)</h2>{banana}</section>
<section><h2>jasmine bough</h2>{cypress}</section>
<section><h2>urns — left, right</h2><div class=row>{urn(o.URN_L)}{urn(o.URN_R)}</div></section>
<section><h2>kolam</h2>{kolam}</section>
""", encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
