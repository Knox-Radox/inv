"""
Emits components/art/paths.ts — the generated geometry the components import.

Run: cd tools && python3 emit_art.py

Everything here is authored at build time so the browser never measures a path,
never runs a solver, and never sees a number that was not decided deliberately.
"""

import sys
from pathlib import Path

sys.setrecursionlimit(20000)
sys.path.insert(0, str(Path(__file__).parent))

import jasmine as jm  # noqa: E402
import mapplate as mp  # noqa: E402
import ornament as orn  # noqa: E402
import relief as rl  # noqa: E402
import monogram as mg  # noqa: E402
import thread as th  # noqa: E402
import wax as wx  # noqa: E402

OUT = Path(__file__).parent.parent / "components" / "art" / "paths.ts"
ORN_OUT = Path(__file__).parent.parent / "components" / "art" / "ornament.ts"

# The korvai ring sits inside the wax, not on its silhouette.
REKU = mg.reku_ring(50, 50, 37.6, 52, 2.2, 0.25)
RING_OUTER = 39.9
RING_INNER = 34.9

BLOCKS: list[tuple[str, str, str]] = [
    (
        "WAX_WHOLE",
        wx.WAX_WHOLE,
        "The wax body, intact. Perimeter is a circle perturbed by four low "
        "harmonics with two squeeze-out lobes, so no two arcs of the edge match.",
    ),
    ("WAX_LEFT", wx.WAX_LEFT, "Left of the fault. Rotates and drops on beat 1."),
    ("WAX_RIGHT", wx.WAX_RIGHT, "Right of the fault. Rotates further, and later."),
    (
        "WAX_RIM",
        wx.RIM_INNER,
        "The lip where the wax pooled — an arc from about 200 to 20 degrees only, "
        "because a rim is visible where the light is not.",
    ),
    ("MONO_A", mg.a.outline() + mg.SERIFS, "The A, with its cut slab serifs."),
    (
        "MONO_S",
        mg.s.outline(),
        "The S, which is also the A's crossbar — they share the whole stroke.",
    ),
    ("KORVAI_REKU", REKU, "The reku temple border ringing the monogram."),
]


def jasmine_block() -> str:
    """The spray, as data rather than markup: every element carries its own
    path length so the draw-on never measures anything at runtime."""
    import json

    def part(p):
        return {"d": p["d"], "len": p["len"]}

    data = {
        "stem": [
            {"d": d, "len": ln, "w": w}
            for (d, ln), w in zip(
                (jm.seg(pts) for pts in jm.STEM_POINTS), jm.STEM_WIDTHS
            )
        ],
        "leaves": [
            {
                "midrib": part(lf["midrib"]),
                "lit": part(lf["lit"]),
                "shade": part(lf["shade"]),
                "veins": [part(v) for v in lf["veins"]],
            }
            for lf in jm.LEAVES
        ],
        "buds": [
            {"pedicel": part(b["pedicel"]), "left": part(b["left"]), "right": part(b["right"])}
            for b in jm.BUDS
        ],
        "flowers": [
            {
                "pedicel": part(f["pedicel"]),
                "petals": [part(q) for q in f["petals"]],
                "cx": f["cx"],
                "cy": f["cy"],
            }
            for f in jm.FLOWERS
        ],
        "dive": {"d": jm.DIVE, "len": jm.DIVE_LEN},
        "dimple": {"cx": jm.DIMPLE[0], "cy": jm.DIMPLE[1]},
    }
    return (
        "/**\n"
        " * The jasmine spray. Every element carries its own path length so the\n"
        " * draw-on can set stroke-dasharray without reading the DOM.\n"
        " */\n"
        "export const JASMINE = " + json.dumps(data, indent=2) + " as const;\n"
    )


def map_block() -> str:
    import json

    data = {
        "main": mp.MAIN,
        "mainCentre": {"d": mp.MAIN_CENTRE, "len": mp.MAIN_LEN},
        "approaches": list(mp.APPROACHES),
        "creek": mp.CREEK_A,
        "creekTicks": mp.CREEK_TICKS,
        "hatch": [mp.HATCH_A, mp.HATCH_B],
        "trees": mp.TREES,
        "venue": {
            "body": mp.VENUE_BODY,
            "roof": mp.VENUE_ROOF,
            "door": mp.VENUE_DOOR,
            "drive": mp.VENUE_DRIVE,
        },
        "compass": {
            "filled": mp.COMPASS_FILLED,
            "open": mp.COMPASS_OPEN,
            "cx": mp.CX,
            "cy": mp.CY,
            "r": mp.CR,
        },
        "cartouche": {
            "d": mp.CARTOUCHE,
            "inner": mp.CARTOUCHE_INNER,
            "x": mp.CART_X,
            "y": mp.CART_Y,
            "w": mp.CART_W,
            "h": mp.CART_H,
        },
        "borderOuter": mp.BORDER_OUTER,
        "borderInner": mp.BORDER_INNER,
        "clip": mp.CLIP,
    }
    return (
        "/**\n"
        " * The engraved map plate. Only County Road 419 is lettered, because it\n"
        " * is the only road the address gives us — see docs/open-questions.md #2.\n"
        " */\n"
        "export const MAP = " + json.dumps(data, indent=2) + " as const;\n"
    )


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


def main() -> None:
    lines = [
        "/**",
        " * Generated geometry — do not edit by hand.",
        " *",
        " * Emitted by tools/emit_art.py. Re-run `cd tools && python3 emit_art.py`",
        " * after changing tools/monogram.py, tools/wax.py or tools/jasmine.py.",
        " *",
        " * Paths are authored in a 100x100 box, simplified to a 0.07-unit tolerance",
        " * and emitted as relative commands — see tools/pen.py.",
        " */",
        "",
    ]
    for name, d, doc in BLOCKS:
        lines.append(f"/** {doc} */")
        lines.append(f'export const {name} =\n  "{d}";')
        lines.append("")
    lines.append(jasmine_block())
    lines.append(map_block())
    lines += [
        "/** Blind-embossed floral relief for the envelope, as SVG markup drawn in",
        " *  white on transparent: a height map for the lighting filter. 440x700. */",
        "export const RELIEF_ENVELOPE =",
        "  " + __import__("json").dumps(rl.ENVELOPE) + ";",
        "",
        "/** The card's relief: corners only, so the type has room. 620x900. */",
        "export const RELIEF_CARD =",
        "  " + __import__("json").dumps(rl.CARD) + ";",
        "",
    ]
    lines += [
        "/** The one knot on the page, where the thread ties off. */",
        f'export const KNOT =\n  "{th.KNOT}";',
        f"export const KNOT_LEN = {th.KNOT_LEN};",
        f'export const KNOT_LIGHT =\n  "{th.KNOT_LIGHT}";',
        "",
        "/** One tile of the korvai reku band along the card's bottom edge. */",
        f'export const KORVAI_TILE = "{th.KORVAI_TILE}";',
        f"export const KORVAI_TILE_W = {th.KORVAI_TILE_W};",
        f"export const KORVAI_TILE_H = {th.KORVAI_TILE_H};",
        "",
        "/** Radii of the two hairlines either side of the reku band. */",
        f"export const RING_OUTER = {RING_OUTER};",
        f"export const RING_INNER = {RING_INNER};",
        "",
        "/** The monogram is drawn large for construction, then fitted to the ring. */",
        f"export const MARK_SCALE = {round(mg.MARK_SCALE * 0.92, 4)};",
        "/** Optical centring: the A's mass sits low, so the mark is lifted. */",
        f"export const MARK_LIFT = {mg.MARK_LIFT};",
        "",
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    total = sum(len(d) for _, d, _ in BLOCKS)
    print(f"wrote {OUT.relative_to(OUT.parent.parent.parent)}  ({OUT.stat().st_size} bytes)")
    for name, d, _ in BLOCKS:
        print(f"  {name:14s} {len(d):5d} chars")
    print(f"  {'TOTAL':14s} {total:5d} chars of path data")
    write_ornament()


if __name__ == "__main__":
    main()
