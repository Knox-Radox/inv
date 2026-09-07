"""
Fetches the OpenStreetMap extract the map plate is traced from.

Run: cd tools && python3 osm_fetch.py

Writes tools/data/anna-osm.json, which is committed so that `emit_art.py` runs
offline and the plate is reproducible without a network. Re-run this only if the
frame moves or a road is added to KEEP.

The extract is pruned hard on the way out. Overpass returns about 3.5 MB for
this box; almost all of it is the section-line county road grid, which the plate
deliberately does not draw — see docs/revision-7-map.md § The concept. What is
kept is the handful of named roads a guest would actually say out loud, the
waterways, the larger lakes, and the town nodes.

Map data © OpenStreetMap contributors, licensed under the ODbL. The credit is
rendered on the plate itself; see components/field/Place.tsx.
"""

import json
import urllib.request
from pathlib import Path

from frame import FRAME

OUT = Path(__file__).parent / "data" / "anna-osm.json"
ENDPOINT = "https://overpass-api.de/api/interpreter"

#: The roads the plate draws, keyed by the name it letters them with. Matched
#: against a way's `ref` first and its `name` second. Everything else is
#: dropped: a plate that draws every road is graph paper.
KEEP: dict[str, tuple[str, ...]] = {
    "US 75": ("US 75", "US 75;TX 121"),
    "TX 121": ("TX 121",),
    "TX 5": ("TX 5",),
    "FM 455": ("FM 455",),
    "Collin County Outer Loop": ("CCOL",),
    "County Road 419": (),  # matched by name; it carries no ref
}
#: Matched against a way's `name` when it carries no usable `ref`. OSM drops the
#: ref on the stretches that run through a town under a street name, and without
#: these the plate prints FM 455 and TX 5 with holes in them where Anna is.
KEEP_BY_NAME: dict[str, str] = {
    "County Road 419": "County Road 419",
    "White Street": "FM 455",
    "White Avenue": "FM 455",
    "Powell Parkway": "TX 5",
    "Sam Rayburn": "TX 121",
    "Outer Loop": "Collin County Outer Loop",
}

#: Towns lettered on the plate. Everything else in frame is a subdivision.
KEEP_PLACES = {"Anna", "Melissa"}

#: Waterways below this many points inside the frame are field drainage, not
#: creeks, and clutter the plate without telling a guest anything.
MIN_WATERWAY_POINTS = 8


def query() -> str:
    s, w, n, e = FRAME.bbox()
    box = f"{s},{w},{n},{e}"
    return f"""
[out:json][timeout:180];
(
  way["highway"]["ref"](
    {box});
  way["highway"]["name"~"County Road 419|White Street|White Avenue|Powell Parkway|Sam Rayburn|Outer Loop"](
    {box});
  way["waterway"~"^(river|stream)$"](
    {box});
  way["natural"="water"](
    {box});
  node["place"~"^(city|town|village)$"](
    {box});
);
out geom;
"""


def label_for(tags: dict) -> str | None:
    ref = tags.get("ref") or ""
    for label, refs in KEEP.items():
        if ref in refs and refs:
            return label
    name = tags.get("name") or ""
    for name_match, label in KEEP_BY_NAME.items():
        if name_match in name:
            return label
    return None


def main() -> None:
    req = urllib.request.Request(
        ENDPOINT,
        data=query().encode(),
        headers={"User-Agent": "advikaandsooraj-invitation/1.0 (map plate build)"},
    )
    with urllib.request.urlopen(req, timeout=200) as r:
        raw = json.load(r)

    roads: dict[str, list[list[list[float]]]] = {}
    water: list[dict] = []
    lakes: list[list[list[float]]] = []
    places: list[dict] = []

    for el in raw["elements"]:
        tags = el.get("tags", {})
        if el["type"] == "node":
            if tags.get("name") in KEEP_PLACES:
                places.append(
                    {"name": tags["name"], "lat": el["lat"], "lon": el["lon"]}
                )
            continue

        geom = [[g["lat"], g["lon"]] for g in el.get("geometry", [])]
        if len(geom) < 2:
            continue
        geom = [p for p in geom if FRAME.contains(*p)]
        if len(geom) < 2:
            continue

        if tags.get("highway"):
            label = label_for(tags)
            if label:
                roads.setdefault(label, []).append(geom)
        elif tags.get("waterway"):
            if len(geom) >= MIN_WATERWAY_POINTS:
                water.append({"name": tags.get("name"), "geom": geom})
        elif tags.get("natural") == "water":
            # Only lakes big enough to read at 15 km across.
            if len(geom) >= 12:
                lakes.append(geom)

    data = {
        "licence": "Map data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright",
        "frame": FRAME.describe(),
        "roads": roads,
        "water": water,
        "lakes": lakes,
        "places": places,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
    for label, ways in sorted(roads.items()):
        print(f"  {label}: {len(ways)} ways, {sum(len(w) for w in ways)} points")
    print(f"  water: {len(water)}  lakes: {len(lakes)}  places: {len(places)}")


if __name__ == "__main__":
    main()
