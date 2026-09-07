"""
Renders the map plate to a standalone HTML file so it can be looked at while it
is being drawn, without a build and without the app around it.

Run: cd tools && python3 mappreview.py && open /tmp/mapplate.html

The CSS here is a copy of the component's, deliberately. It exists so the
geometry can be judged at the weights it will actually print at; when the two
drift, the component is right and this is stale.
"""

import mapplate as m
from frame import H, W

CSS = """
:root{--ground:#FBF7F0;--ground-deep:#F0E9DB;--sage:#8A9A83;--sage-deep:#3A5542;
--gold:#B08D57;--gold-light:#CDAE7A;--ink:#2E2A24;}
body{background:var(--ground-deep);margin:0;padding:28px;font-family:Georgia,serif}
.wrap{max-width:980px;margin:0 auto}
svg{display:block;width:100%;height:auto;filter:drop-shadow(0 10px 22px rgb(58 48 30/.16))}
.plateGround{fill:var(--ground)}
.borderOuter{fill:none;stroke:var(--gold);stroke-width:.5;opacity:.75}
.borderInner{fill:none;stroke:var(--gold);stroke-width:.18;opacity:.5}
.lake{fill:var(--sage);fill-opacity:.30;stroke:var(--sage);stroke-width:.1;stroke-opacity:.5}
.water{fill:var(--sage);fill-opacity:.62}
.road{fill:var(--gold)}
.r0{fill-opacity:.95}.r1{fill-opacity:.88}.r2{fill-opacity:.8}
.r3{fill-opacity:.8}.r4{fill-opacity:.86}.r5{fill-opacity:.95}
text{font-family:Georgia,serif;paint-order:stroke fill;stroke:var(--ground);
stroke-width:.85;stroke-linejoin:round}
.roadName{font-size:2.5px;letter-spacing:.04em;fill:var(--ink);fill-opacity:.85}
.waterName{font-size:2.1px;font-style:italic;letter-spacing:.03em;fill:var(--sage);
stroke-width:.7}
.townName{font-size:3.1px;letter-spacing:.12em;fill:var(--sage-deep)}
.townWash{fill:var(--sage);fill-opacity:.16}
.townEdge{fill:none;stroke:var(--sage);stroke-width:.16;opacity:.55}
.townBlocks{fill:var(--sage);fill-opacity:.5}
.halo{fill:url(#halo)}
.bloom{fill:var(--gold);fill-opacity:.82;stroke:var(--gold);stroke-width:.14}
.whorl{fill:var(--ground);fill-opacity:.55;stroke:var(--gold);stroke-width:.12}
.seal{fill:var(--ground);fill-opacity:.85}
.rim{fill:none;stroke:var(--gold);stroke-width:.4}
.rimInner{fill:none;stroke:var(--gold);stroke-width:.14;opacity:.6}
.reku{fill:var(--gold);fill-opacity:.55}
.mono{fill:var(--gold)}
.core{fill:var(--ground)}
.venueName{font-size:4.4px;fill:var(--sage-deep);letter-spacing:.01em}
.venueRoad{font-size:2.45px;fill:var(--ink);fill-opacity:.8;letter-spacing:.04em}
.rule{fill:none;stroke:var(--gold);stroke-width:.22;opacity:.8}
.barFill{fill:var(--gold);fill-opacity:.8}
.barOpen{fill:none;stroke:var(--gold);stroke-width:.18;opacity:.8}
.barLabel{font-size:2px;fill:var(--ink);fill-opacity:.7;stroke-width:.6}
.north{fill:var(--gold);fill-opacity:.85}
.northShaft{fill:none;stroke:var(--gold);stroke-width:.26;opacity:.85}
.northLetter{font-size:2.9px;fill:var(--sage-deep);text-anchor:middle;stroke-width:.7}
"""


def svg() -> str:
    o: list[str] = []
    a = o.append
    a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}">')
    a("<defs><clipPath id='cl'><path d='" + m.CLIP + "'/></clipPath>"
      "<radialGradient id='halo'>"
      "<stop offset='0' stop-color='#B08D57' stop-opacity='.16'/>"
      "<stop offset='.55' stop-color='#B08D57' stop-opacity='.07'/>"
      "<stop offset='1' stop-color='#B08D57' stop-opacity='0'/>"
      "</radialGradient></defs>")
    a(f'<rect class="plateGround" width="{W:g}" height="{H:g}"/>')
    a("<g clip-path='url(#cl)'>")

    for w in m.WATER:
        for d in w["d"]:
            a(f'<path class="water" d="{d}"/>')
    for i, r in enumerate(m.ROADS):
        for run in r["runs"]:
            a(f'<path class="road r{i}" d="{run["d"]}"/>')

    for t in m.TOWNS:
        a(f'<path class="townWash" d="{t["edge"]}"/>')
        a(f'<path class="townEdge" d="{t["edge"]}"/>')
        a(f'<path class="townBlocks" d="{t["blocks"]}"/>')

    # Lettering
    for i, r in enumerate(m.ROADS):
        if not r["labelPath"]:
            continue
        a(f'<path id="rl{i}" d="{r["labelPath"]}" fill="none"/>')
        a(
            f'<text class="roadName"><textPath href="#rl{i}" startOffset="50%" '
            f'text-anchor="middle">{r["label"]}</textPath></text>'
        )
    for i, w in enumerate(m.WATER):
        if not w["labelPath"]:
            continue
        a(f'<path id="wl{i}" d="{w["labelPath"]}" fill="none"/>')
        a(
            f'<text class="waterName"><textPath href="#wl{i}" startOffset="50%" '
            f'text-anchor="middle">{w["name"]}</textPath></text>'
        )
    for t in m.TOWNS:
        a(f'<text class="townName" x="{t["x"] + t["r"] + 1.4}" y="{t["y"] + 1.1}">{t["name"]}</text>')

    # The venue
    v = m.VENUE
    a(f'<circle class="halo" cx="{v["x"]}" cy="{v["y"]}" r="{v["haloR"]}"/>')
    a(f'<path class="seal" d="{v["rim"]}"/>')
    a(f'<g transform="{v["sealTransform"]}">')
    a(f'<path class="reku" d="{v["reku"]}"/>')
    a(f'<path class="mono" d="{v["monoA"]}"/>')
    a(f'<path class="mono" d="{v["monoS"]}"/>')
    a("</g>")
    a(f'<path class="rim" d="{v["rim"]}"/>')
    a(f'<path class="rimInner" d="{v["rimInner"]}"/>')
    a(f'<text class="venueName" x="{v["nameX"]}" y="{v["nameY"]}">Artistry Venue</text>')
    a(f'<text class="venueRoad" x="{v["nameX"]}" y="{v["roadY"]}">County Road 419</text>')

    # Scale bar
    s = m.SCALE
    for k in range(s["blocks"]):
        x = s["x"] + k * s["block"]
        cls = "barFill" if k % 2 == 0 else "barOpen"
        a(f'<path class="{cls}" d="M{x:.2f} {s["y"]:.2f}h{s["block"]:.2f}v{s["height"]}h-{s["block"]:.2f}Z"/>')
    a(f'<text class="barLabel" x="{s["x"]}" y="{s["y"] - 1.1}">0</text>')
    a(f'<text class="barLabel" x="{s["x"] + s["mile"] - 1:.2f}" y="{s["y"] - 1.1}">1</text>')
    a(f'<text class="barLabel" x="{s["x"] + 2 * s["mile"] - 3.4:.2f}" y="{s["y"] - 1.1}">2 miles</text>')

    # North
    n = m.NORTH
    a(f'<path class="northShaft" d="{n["shaft"]}"/>')
    a(f'<path class="north" d="{n["head"]}"/>')
    a(f'<text class="northLetter" x="{n["x"]}" y="{n["y"] + 3.0}">N</text>')

    a("</g>")
    a(f'<path class="borderOuter" d="{m.BORDER_OUTER}"/>')
    a(f'<path class="borderInner" d="{m.BORDER_INNER}"/>')
    a("</svg>")
    return "".join(o)


if __name__ == "__main__":
    html = f"<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=wrap>{svg()}</div>"
    open("/tmp/mapplate.html", "w").write(html)
    print("wrote /tmp/mapplate.html", len(html), "bytes")
