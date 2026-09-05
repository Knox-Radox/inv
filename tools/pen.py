"""
Centreline-to-outline pen.

Hand-authoring filled letterform outlines by guessing coordinates produces
lifeless shapes. This does what a punchcutter does instead: define a skeleton
and a width profile along it, then generate the outline by offsetting along the
normal. It is what gives the monogram, the jasmine stems and the map's roads
their weight modulation — docs/design-plan.md § The stitch idiom, item 2.

Not shipped to the browser. Run at author time; the emitted `d` strings are
pasted into the components.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


Point = tuple[float, float]


def _bez(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    u = 1 - t
    return (
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    )


def _bez_d(p0: Point, p1: Point, p2: Point, p3: Point, t: float) -> Point:
    u = 1 - t
    return (
        3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]),
        3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]),
    )


@dataclass
class Spine:
    """A skeleton: a chain of cubic segments plus a width profile along it.

    `segments` is [(p0,p1,p2,p3), ...] with each segment's p0 equal to the
    previous p3. `widths` is [(t, w), ...] over the whole chain, 0..1,
    interpolated linearly and read as the full stroke width at that point.
    """

    segments: list[tuple[Point, Point, Point, Point]]
    widths: list[tuple[float, float]]
    samples: int = 220
    #: Fraction of the chain trimmed from each end, used to open a gap where
    #: another stroke passes over this one (the weave).
    trim_start: float = 0.0
    trim_end: float = 0.0
    breaks: list[tuple[float, float]] = field(default_factory=list)

    def width_at(self, t: float) -> float:
        pts = self.widths
        if t <= pts[0][0]:
            return pts[0][1]
        if t >= pts[-1][0]:
            return pts[-1][1]
        for (t0, w0), (t1, w1) in zip(pts, pts[1:]):
            if t0 <= t <= t1:
                k = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
                # smoothstep, so width changes read as a swelling rather than a ramp
                k = k * k * (3 - 2 * k)
                return w0 + k * (w1 - w0)
        return pts[-1][1]

    def speed_at(self, t: float) -> float:
        """|dP/dt| over the whole chain, so a gap in user units converts to a
        gap in t without assuming uniform parameterisation."""
        n = len(self.segments)
        raw = min(max(t, 0.0), 1.0) * n
        i = min(int(raw), n - 1)
        lt = raw - i
        p0, p1, p2, p3 = self.segments[i]
        dx, dy = _bez_d(p0, p1, p2, p3, lt)
        return math.hypot(dx, dy) * n

    def gap_around(self, t: float, half: float) -> tuple[float, float]:
        """A break centred on t, `half` user units wide on each side."""
        dt = half / max(self.speed_at(t), 1e-6)
        return (max(0.0, t - dt), min(1.0, t + dt))

    def t_at_point(self, target: Point, lo: float = 0.0, hi: float = 1.0) -> float:
        best, bd = lo, 1e18
        steps = 1200
        for i in range(steps + 1):
            t = lo + (hi - lo) * i / steps
            (x, y), _ = self.point_at(t)
            d = (x - target[0]) ** 2 + (y - target[1]) ** 2
            if d < bd:
                bd, best = d, t
        return best

    def point_at(self, t: float) -> tuple[Point, Point]:
        """Returns (position, unit normal) at chain parameter t."""
        n = len(self.segments)
        raw = min(max(t, 0.0), 1.0) * n
        i = min(int(raw), n - 1)
        lt = raw - i
        p0, p1, p2, p3 = self.segments[i]
        pos = _bez(p0, p1, p2, p3, lt)
        dx, dy = _bez_d(p0, p1, p2, p3, lt)
        m = math.hypot(dx, dy) or 1e-6
        return pos, (-dy / m, dx / m)

    #: Max deviation, in user units, allowed when simplifying the offset
    #: polyline. On a 100-unit box rendered at 96px this is well under a tenth
    #: of a pixel, and it cuts the emitted path by roughly three quarters.
    tolerance: float = 0.07

    def _outline_over(self, a: float, b: float) -> str:
        left: list[Point] = []
        right: list[Point] = []
        steps = max(8, int(self.samples * (b - a)))
        for i in range(steps + 1):
            t = a + (b - a) * i / steps
            (x, y), (nx, ny) = self.point_at(t)
            h = self.width_at(t) / 2
            left.append((x + nx * h, y + ny * h))
            right.append((x - nx * h, y - ny * h))
        ring = simplify(left, self.tolerance) + simplify(right[::-1], self.tolerance)
        return emit(ring, close=True)

    def outline(self) -> str:
        """Filled outline, honouring trims and any weave breaks."""
        spans: list[tuple[float, float]] = []
        cursor = self.trim_start
        for b0, b1 in sorted(self.breaks):
            if b0 > cursor:
                spans.append((cursor, b0))
            cursor = max(cursor, b1)
        end = 1.0 - self.trim_end
        if cursor < end:
            spans.append((cursor, end))
        return "".join(self._outline_over(a, b) for a, b in spans if b - a > 1e-4)


def simplify(points: list[Point], tol: float) -> list[Point]:
    """Ramer-Douglas-Peucker. Offsetting a curve produces hundreds of nearly
    collinear points; keeping them all is pure payload."""
    if len(points) < 3:
        return points
    ax, ay = points[0]
    bx, by = points[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy)
    worst, idx = -1.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if norm < 1e-9:
            d = math.hypot(px - ax, py - ay)
        else:
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
        if d > worst:
            worst, idx = d, i
    if worst <= tol:
        return [points[0], points[-1]]
    return simplify(points[: idx + 1], tol)[:-1] + simplify(points[idx:], tol)


def emit(points: list[Point], close: bool = False) -> str:
    """Relative line commands, one decimal. Relative keeps the numbers short."""
    out = [f"M{points[0][0]:.1f} {points[0][1]:.1f}"]
    px, py = points[0]
    for x, y in points[1:]:
        ddx, ddy = round(x - px, 1), round(y - py, 1)
        if ddx == 0 and ddy == 0:
            continue
        if ddy == 0:
            out.append(f"h{ddx:g}")
        elif ddx == 0:
            out.append(f"v{ddy:g}")
        else:
            out.append(f"l{ddx:g} {ddy:g}")
        px, py = px + ddx, py + ddy
    return "".join(out) + ("Z" if close else "")


def polyline(points: list[Point], close: bool = False) -> str:
    return emit(points, close)


def curve(segments: list[tuple[Point, Point, Point, Point]]) -> str:
    """A plain stroked centreline, for paths that keep a uniform width."""
    p0 = segments[0][0]
    d = f"M{p0[0]:.2f} {p0[1]:.2f}"
    for _, p1, p2, p3 in segments:
        d += f"C{p1[0]:.2f} {p1[1]:.2f} {p2[0]:.2f} {p2[1]:.2f} {p3[0]:.2f} {p3[1]:.2f}"
    return d


def chain(points: list[Point]) -> list[tuple[Point, Point, Point, Point]]:
    """Build a smooth cubic chain through points using Catmull-Rom conversion."""
    if len(points) < 2:
        raise ValueError("need at least two points")
    pts = [points[0]] + points + [points[-1]]
    out = []
    for i in range(len(points) - 1):
        p_prev, p0, p1, p_next = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
        c1 = (p0[0] + (p1[0] - p_prev[0]) / 6, p0[1] + (p1[1] - p_prev[1]) / 6)
        c2 = (p1[0] - (p_next[0] - p0[0]) / 6, p1[1] - (p_next[1] - p0[1]) / 6)
        out.append((p0, c1, c2, p1))
    return out


def path_length(segments: list[tuple[Point, Point, Point, Point]], steps: int = 400) -> float:
    """Length of a cubic chain, for hard-coding stroke-dasharray at author time
    rather than reading it from the DOM at runtime."""
    total = 0.0
    prev = segments[0][0]
    n = len(segments)
    for i in range(1, steps + 1):
        raw = i / steps * n
        seg = min(int(raw), n - 1)
        lt = raw - seg
        p0, p1, p2, p3 = segments[seg]
        cur = _bez(p0, p1, p2, p3, lt)
        total += math.hypot(cur[0] - prev[0], cur[1] - prev[1])
        prev = cur
    return total
