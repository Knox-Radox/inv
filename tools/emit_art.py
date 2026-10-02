"""
Emits the generated geometry the components import.

Run: cd tools && python3 emit_art.py

    components/art/paths.ts      the one knot on the page
    components/art/ornament.ts   the revision 6 pieces
    components/art/map.ts        the plate, traced from OpenStreetMap
    components/art/motif.ts      the revision 9 buti and the mark
    app/motif.css                the mirror-work border's two tiles

Everything here is authored at build time so the browser never measures a path,
never runs a solver, and never sees a number that was not decided deliberately.

paths.ts used to carry a great deal more: a drawn wax seal, a drawn monogram,
two blind-emboss reliefs, the jasmine spray above the names and the korvai band
at the card's foot. The first three had been dead since revision 4 made the
cover a photograph, and revision 9 took the last two off the card when it put a
border round it. What nothing imports is no longer emitted, and the tools that
drew it (wax.py, monogram.py, relief.py) are gone with it.
"""

import sys
from pathlib import Path

sys.setrecursionlimit(20000)
sys.path.insert(0, str(Path(__file__).parent))

import mapplate as mp  # noqa: E402
import motif as mt  # noqa: E402
import ornament as orn  # noqa: E402
import thread as th  # noqa: E402

OUT = Path(__file__).parent.parent / "components" / "art" / "paths.ts"
ORN_OUT = Path(__file__).parent.parent / "components" / "art" / "ornament.ts"
MAP_OUT = Path(__file__).parent.parent / "components" / "art" / "map.ts"
MOTIF_OUT = Path(__file__).parent.parent / "components" / "art" / "motif.ts"
MOTIF_CSS = Path(__file__).parent.parent / "app" / "motif.css"


def write_map() -> None:
    """components/art/map.ts — the plate's traced geometry.

    Kept out of paths.ts for the same reason the ornament is: paths.ts is
    imported by the cover, which is on the critical path, and the plate is four
    screens down. Emitting it here cost paths.ts 4.8 KB gzipped and bought
    nothing above the fold.
    """
    import json

    data = {
        "frame": {"w": mp.W, "h": mp.H, "kmPerUnit": round(mp.FRAME.km_per_unit, 5)},
        "roads": [
            {
                "label": r["label"],
                "runs": [{"d": run["d"], "c": run["c"], "len": run["len"]} for run in r["runs"]],
                "labelPath": r["labelPath"],
            }
            for r in mp.ROADS
        ],
        "water": [
            {"name": w["name"], "d": list(w["d"]), "labelPath": w["labelPath"]}
            for w in mp.WATER
        ],
        "towns": mp.TOWNS,
        "venue": mp.VENUE,
        "scale": mp.SCALE,
        "north": mp.NORTH,
        "borderOuter": mp.BORDER_OUTER,
        "borderInner": mp.BORDER_INNER,
        "clip": mp.CLIP,
    }
    body = (
        "/**\n"
        " * The map plate, traced from OpenStreetMap around the venue — see\n"
        " * docs/revision-7-map.md. Roads carry their own centreline and its length\n"
        " * so the draw-on never measures a path, and a `labelPath` that is a single\n"
        " * smooth arc: a textPath run along the road's real polyline drops glyphs.\n"
        " *\n"
        " * Map data \u00a9 OpenStreetMap contributors, ODbL 1.0.\n"
        " */\n"
        "export const MAP = " + json.dumps(data, separators=(",", ":")) + " as const;\n"
    )
    MAP_OUT.write_text(body)
    print(f"wrote {MAP_OUT.relative_to(MAP_OUT.parent.parent.parent)}  ({MAP_OUT.stat().st_size} bytes)")


def write_ornament() -> None:
    """components/art/ornament.ts — the revision 6 pieces.

    Kept out of paths.ts because that file is imported by the cover, which is
    on the critical path, and none of this is. Two files, two budgets.
    """
    import json

    data = {
        "column": {"left": orn.COLUMN_L, "right": orn.COLUMN_R},
        "thoranam": orn.THORANAM,
        "lamp": {"left": orn.LAMP_L, "right": orn.LAMP_R},
        "malai": orn.MALAI,
        "banana": orn.BANANA,
        "bough": orn.BOUGH,
        "urn": {"left": orn.URN_L, "right": orn.URN_R},
        "kolam": orn.KOLAM,
        "kalasham": orn.KALASHAM,
        "petals": orn.PETALS,
        "box": orn.BOXES,
    }
    ORN_OUT.write_text(
        "\n".join(
            [
                "/**",
                " * Generated ornament geometry — do not edit by hand.",
                " *",
                " * Emitted by tools/emit_art.py from tools/ornament.py. See",
                " * docs/revision-6-ornament.md for what each piece is and why.",
                " *",
                " * Every piece carries a closed `sil` for the wash to be clipped to and",
                " * open `lines` with their lengths for the draw-on, because those are two",
                " * different kinds of path and only the second can be stroked on.",
                " */",
                "",
                "export const ORNAMENT = " + json.dumps(data, indent=2) + " as const;",
                "",
            ]
        )
    )
    print(f"wrote {ORN_OUT.relative_to(ORN_OUT.parent.parent.parent)}  ({ORN_OUT.stat().st_size} bytes)")


def write_motif() -> None:
    """components/art/motif.ts and app/motif.css — the revision 9 motifs.

    Two files because they are two kinds of thing. The buti and the mark are
    paths a component draws and can draw on, so they are geometry in a module.
    The border is a repeat, and the only thing on the web that fits a whole
    number of repeats to a box of any size without script is a CSS background,
    so its tiles are data URIs in a stylesheet — where they are also written
    once, instead of once per card in the HTML and again in the RSC payload.
    """
    import json

    b = mt.BUTI
    data = {
        "buti": {
            "box": [0, 0, mt.BUTI_W, mt.BUTI_H],
            "stems": b["stems"],
            "blooms": [{k: v for k, v in bl.items()} for bl in b["blooms"]],
            "cups": [{"sil": c["sil"]} for c in b["cups"]],
            "leaves": [{"sil": lf["sil"], "mid": lf["mid"]} for lf in b["leaves"]],
        },
        "mark": {"box": [0, 0, mt.MARK_W, mt.MARK_H], **mt.MARK},
    }
    MOTIF_OUT.write_text(
        "\n".join(
            [
                "/**",
                " * Generated motif geometry — do not edit by hand.",
                " *",
                " * Emitted by tools/emit_art.py from tools/motif.py. See",
                " * docs/revision-9-plan.md for what each piece is and why.",
                " */",
                "",
                "export const MOTIF = " + json.dumps(data, indent=2) + " as const;",
                "",
            ]
        )
    )
    MOTIF_CSS.write_text(
        "\n".join(
            [
                "/*",
                " * Generated — do not edit by hand. tools/emit_art.py, from tools/motif.py.",
                " *",
                " * The mirror-work border's two tiles, as custom properties so that",
                " * components/art/Border.module.css can lay them without carrying them.",
                " * Two flowers to a tile, and stretchable: see motif.border_tile().",
                " */",
                ":root {",
                f'  --border-h: url("{mt.data_uri(mt.border_tile(False))}");',
                f'  --border-v: url("{mt.data_uri(mt.border_tile(True))}");',
                "}",
                "",
            ]
        )
    )
    for path in (MOTIF_OUT, MOTIF_CSS):
        print(f"wrote {path.relative_to(path.parent.parent)}  ({path.stat().st_size} bytes)")


def main() -> None:
    lines = [
        "/**",
        " * Generated geometry — do not edit by hand.",
        " *",
        " * Emitted by tools/emit_art.py. Re-run `cd tools && python3 emit_art.py`",
        " * after changing tools/thread.py.",
        " */",
        "",
        "/** The one knot on the page, where the thread ties off. */",
        f'export const KNOT =\n  "{th.KNOT}";',
        f"export const KNOT_LEN = {th.KNOT_LEN};",
        f'export const KNOT_LIGHT =\n  "{th.KNOT_LIGHT}";',
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    print(f"wrote {OUT.relative_to(OUT.parent.parent.parent)}  ({OUT.stat().st_size} bytes)")
    write_ornament()
    write_map()
    write_motif()


if __name__ == "__main__":
    main()
