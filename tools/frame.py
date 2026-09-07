"""
The map plate's frame, and the projection from the ground into it.

One module, imported by both `osm_fetch.py` (which uses it to bound the
Overpass query) and `mapplate.py` (which uses it to place every point), so the
extract and the drawing can never disagree about where the edges are.

The projection is equirectangular about the frame's own centre latitude. Over
15 km that is within a metre of Web Mercator, and unlike Mercator it keeps the
plate's vertical scale equal to its horizontal one, so a mile is the same length
whichever way it is measured — which is what makes the scale bar honest.

The venue is deliberately not at the centre. Guests come north up US 75 out of
Dallas and turn east, so the plate is composed to read bottom-left to top-right
with the venue high and to the right, where the eye lands last. See
docs/revision-7-map.md § Composition.
"""

import math

#: The address, geocoded. 9981 County Road 419, Anna, TX 75409.
VENUE_LAT = 33.325274
VENUE_LON = -96.523372

#: Where the venue sits in the 100 x 74 plate box. Its name is set to the right
#: of the bloom, so it sits left of centre by about the width of that name —
#: at x = 62 the name ran into the plate rule.
VENUE_X = 57.0
VENUE_Y = 31.0

#: Plate box. 100 x 74 is the aspect the section's column wants at every width.
W = 100.0
H = 74.0

#: Ground units per plate unit, chosen so that US 75 — 6.15 km west of the
#: venue — lands at x = 22 and the whole approach is in frame.
_DEG_LON_PER_X = 0.00162

_KM_PER_DEG_LAT = 110.92
_KM_PER_DEG_LON = 111.32 * math.cos(math.radians(VENUE_LAT))


class Frame:
    def __init__(self) -> None:
        self.lon0 = VENUE_LON - VENUE_X * _DEG_LON_PER_X
        self.dlon = _DEG_LON_PER_X
        #: Isotropic: one plate unit is the same distance on the ground in both
        #: directions, so shapes are not stretched and the scale bar is true.
        self.km_per_unit = self.dlon * _KM_PER_DEG_LON
        self.dlat = self.km_per_unit / _KM_PER_DEG_LAT
        self.lat0 = VENUE_LAT + VENUE_Y * self.dlat  # y grows downward

    def xy(self, lat: float, lon: float) -> tuple[float, float]:
        return ((lon - self.lon0) / self.dlon, (self.lat0 - lat) / self.dlat)

    def bbox(self) -> tuple[float, float, float, float]:
        """south, west, north, east — with a margin, so a road that leaves and
        re-enters the plate is fetched whole and clipped by the drawing."""
        m = 6.0
        south = self.lat0 - (H + m) * self.dlat
        north = self.lat0 + m * self.dlat
        west = self.lon0 - m * self.dlon
        east = self.lon0 + (W + m) * self.dlon
        return (round(south, 5), round(west, 5), round(north, 5), round(east, 5))

    def contains(self, lat: float, lon: float, pad: float = 8.0) -> bool:
        x, y = self.xy(lat, lon)
        return -pad <= x <= W + pad and -pad <= y <= H + pad

    def describe(self) -> dict:
        s, w, n, e = self.bbox()
        return {
            "venue": [VENUE_LAT, VENUE_LON],
            "venueXY": [VENUE_X, VENUE_Y],
            "box": [W, H],
            "kmPerUnit": round(self.km_per_unit, 5),
            "bbox": [s, w, n, e],
        }


FRAME = Frame()


if __name__ == "__main__":
    f = FRAME
    print(f.describe())
    print(f"plate is {W * f.km_per_unit:.2f} km x {H * f.km_per_unit:.2f} km")
