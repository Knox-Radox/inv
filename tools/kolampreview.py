"""Renders kolam candidates side by side so they can be looked at."""

import kolam as k
from ornament import curve1
from pen import chain

CANDIDATES = [
    [1, 3, 5, 7, 5, 3, 1],
    [1, 3, 5, 7, 9, 7, 5, 3, 1],
    [5, 7, 9, 7, 5],
    [7, 9, 11, 9, 7],
    [7, 9, 11, 13, 11, 9, 7],
    [9, 11, 13, 11, 9],
]

CSS = """
body{background:#F0E9DB;margin:0;padding:24px;font:13px Georgia,serif;color:#2E2A24}
.row{display:flex;flex-wrap:wrap;gap:22px}
figure{margin:0;background:#FBF7F0;padding:14px;box-shadow:0 8px 20px rgb(58 48 30/.14)}
figcaption{margin-top:8px;text-align:center}
svg{display:block;width:330px;height:auto}
.line{fill:none;stroke:#B08D57;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}
.line2{stroke:#8A9A83}
.line3{stroke:#3A5542}
.pulli{fill:#3A5542;opacity:.8}
"""


def draw(rows):
    fig = k.kolam(rows)
    b = fig["box"]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {b} {b}">']
    for i, lp in enumerate(fig["loops"]):
        cls = "line" + ("" if i == 0 else f" line{min(i + 1, 3)}")
        o.append(f'<path class="{cls}" d="{lp["d"]}"/>')
    for d in fig["dots"]:
        o.append(f'<circle class="pulli" cx="{d["cx"]}" cy="{d["cy"]}" r="{fig["dotR"]}"/>')
    o.append("</svg>")
    cap = (f'{len(fig["dots"])} dots &middot; {len(fig["loops"])} loop'
           f'{"" if len(fig["loops"]) == 1 else "s"} &middot; {fig["mirrors"]} mirrors'
           f' &middot; {fig["loops"][0]["len"]:.0f} long')
    return f"<figure>{''.join(o)}<figcaption>{rows}<br>{cap}</figcaption></figure>"


if __name__ == "__main__":
    body = "".join(draw(r) for r in CANDIDATES)
    open("/tmp/kolam.html", "w").write(
        f"<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=row>{body}</div>")
    print("wrote /tmp/kolam.html")
