"""
The kolam — a real one.

Revision 6 drew an eight-petal rosette inside a scalloped ring and called it a
kolam. It is a pretty mandala and it is not a kolam: a kolam is not a flower
with a border, it is *one line that loops around a grid of dots*.

This builds the real thing, a **sikku** (interlaced) **pulli kolam**, by the
mirror-curve construction that underlies both the Tamil kolam and the Angolan
sona drawing. The rule the whole form comes from is simple and absolute:

    The line never crosses a dot, never lifts, and comes back to where it began.

That last clause is why this piece belongs at the end of a wedding invitation
and not merely at the end of the page. A one-stroke kolam whose path closes on
its own start is called an *infinite* kolam, and what it is understood to mean
is continuity — a life that goes on without a seam in it. It is drawn at the
threshold of a house on the morning of a wedding.

## The construction

Dots sit on even coordinates. The line lives on the odd-parity lattice — every
point it touches has `x + y` odd — so it is arithmetically incapable of
touching a dot. It travels at 45 degrees in unit steps, and where the next step
would carry it out of the figure it reflects off that edge like a billiard.

    dots   .   .   .        the line runs between them, diagonally,
             \ /            turning only where it meets the outside
    line      X

Trace until the ray returns to its starting position *and* heading; that closes
one loop. If any edge is still unvisited, another loop starts there. The number
of loops a region yields is a property of the region, not a choice — for an m x n
rectangle it is exactly gcd(m, n) — which is why the diamond is searched rather
than assumed: `single_stroke_diamond` returns the largest diamond in range that
a single unbroken line can draw.

Authored so the figure is centred on the origin, then translated into a box by
`kolam()`.
"""

import math

Point = tuple[float, float]
Cell = tuple[int, int]
State = tuple[int, int, int, int]  # x, y, dx, dy

DIRS = ((1, 1), (1, -1), (-1, 1), (-1, -1))


def diamond(rows: list[int]) -> set[Cell]:
    """A pulli grid from a list of dots per row, e.g. [1, 3, 5, 7, 5, 3, 1].

    The diamond is the dominant kolam shape and rows of odd length centred on
    one another are how it is laid out on a doorstep. Dots land on even
    coordinates, two apart, which is what leaves room for the line between them.
    """
    cells: set[Cell] = set()
    top = -(len(rows) - 1)
    for r, n in enumerate(rows):
        y = top + 2 * r
        for k in range(n):
            cells.add((2 * (k - (n - 1) // 2), y))
    return cells


def diamond_rows(half: int, widest: int) -> list[int]:
    """Rows for a diamond `2*half+1` rows tall whose middle row is `widest`."""
    step = 2
    return [widest - step * abs(half - r) for r in range(2 * half + 1)]


def _cell_ahead(x: int, y: int, dx: int, dy: int) -> Cell:
    """The cell a step from (x, y) heading (dx, dy) would cross.

    One of x, y is even and the other odd — that is what being on the odd
    lattice means — so the midpoint of the step lands exactly on a cell centre
    and there is nothing to round.
    """
    return (x if x % 2 == 0 else x + dx, y if y % 2 == 0 else y + dy)


def _reflect(x: int, y: int, dx: int, dy: int) -> tuple[int, int]:
    """Bounce off the edge the ray is standing on.

    An even x means the point is the midpoint of a horizontal edge, so the wall
    is horizontal and the vertical component flips; an odd x means a vertical
    edge and the horizontal component flips. There is no third case.
    """
    return (dx, -dy) if x % 2 == 0 else (-dx, dy)


def _step(state: State, cells: set[Cell], mirrors: frozenset[Point] = frozenset()) -> State:
    x, y, dx, dy = state
    if (x, y) in mirrors or _cell_ahead(x, y, dx, dy) not in cells:
        dx, dy = _reflect(x, y, dx, dy)
    return (x + dx, y + dy, dx, dy)


def internal_edges(cells: set[Cell]) -> list[Point]:
    """Every edge with a cell on both sides — the places a mirror may go.

    An edge on the outside of the figure already reflects, so putting a mirror
    there changes nothing.
    """
    out = set()
    for cx, cy in cells:
        for ex, ey in ((cx, cy - 1), (cx, cy + 1), (cx - 1, cy), (cx + 1, cy)):
            a = (ex if ex % 2 == 0 else ex + 1, ey if ey % 2 == 0 else ey + 1)
            b = (ex if ex % 2 == 0 else ex - 1, ey if ey % 2 == 0 else ey - 1)
            if a in cells and b in cells:
                out.add((ex, ey))
    return sorted(out)


def _orbit(e: Point) -> frozenset[Point]:
    """An edge and its seven reflections, under the symmetry of a square.

    Mirrors are added a whole orbit at a time. Added one at a time they fuse the
    loops just as well and leave the kolam lopsided, and a lopsided kolam is a
    mistake rather than a variation — the symmetry is the form.
    """
    x, y = e
    return frozenset(
        {(x, y), (-x, y), (x, -y), (-x, -y), (y, x), (-y, x), (y, -x), (-y, -x)}
    )


def _start_states(cells: set[Cell]) -> list[State]:
    """Every edge midpoint of every cell, with every heading that leaves it."""
    out = []
    for cx, cy in sorted(cells):
        for ex, ey in ((cx, cy - 1), (cx, cy + 1), (cx - 1, cy), (cx + 1, cy)):
            for dx, dy in DIRS:
                out.append((ex, ey, dx, dy))
    return out


def trace(cells: set[Cell], mirrors: frozenset[Point] = frozenset()) -> list[list[Point]]:
    """Every closed loop the figure contains, longest first.

    The step is very nearly a bijection on states, but not quite: a heading
    `_start_states` offers may be one no arrival could produce, and such a state
    sits on a *tail* running into a cycle rather than on the cycle itself. So
    each walk runs until a state repeats, keeps the cycle and discards the
    run-in.
    """
    seen: set[State] = set()
    loops: list[list[Point]] = []
    for start in _start_states(cells):
        if start in seen:
            continue
        at: dict[State, int] = {}
        walked: list[State] = []
        state = start
        while state not in at:
            at[state] = len(walked)
            walked.append(state)
            state = _step(state, cells, mirrors)
            if len(walked) > 20000:
                break
        walked = walked[at.get(state, 0):]

        # Everything the walk touched is retired, run-in included. Whether the
        # loop is *recorded* is decided on the cycle rather than on the start:
        # a tail is only ever discovered by starting on it, so twenty-five
        # different headings ran into the same cycle and each wrote it down.
        fresh = walked[0] not in seen
        seen.update(at)
        # The same loop run backwards is a different sequence of states and the
        # same drawing, so its reverse is retired with it. The reverse arrives
        # at each point from the one *after* it, which is why the heading comes
        # from the next state rather than from this one — a state's own heading
        # is the one it arrived on, and that may have been reflected since.
        n = len(walked)
        for i, (x, y, _, _) in enumerate(walked):
            _, _, ndx, ndy = walked[(i + 1) % n]
            seen.add((x, y, -ndx, -ndy))
        if fresh and len(walked) > 3:
            loops.append([(float(s[0]), float(s[1])) for s in walked])
    loops.sort(key=len, reverse=True)
    return loops


def fuse(cells: set[Cell], limit: int = 60) -> frozenset[Point]:
    """Mirrors that reduce the figure to as few loops as it will go to.

    Adding a mirror to an edge either fuses the two loops that cross it into one
    or cuts one loop into two — it can never do anything else, and that is the
    whole content of the mirror-curve construction. So this is a search, and it
    is worth being more than greedy about: the first version took the first
    orbit that improved anything and stalled at three loops on every diamond.

    Two things fix that. It takes the *best* orbit rather than the first, and
    when nothing improves it will accept a move that leaves the count where it
    is — a plateau — because the fusions that matter are often two moves deep.
    A tabu list keeps it from walking back the way it came.
    """
    edges = internal_edges(cells)
    orbits: list[frozenset[Point]] = []
    claimed: set[Point] = set()
    for e in edges:
        if e in claimed:
            continue
        orb = _orbit(e) & set(edges)
        if orb:
            orbits.append(orb)
            claimed |= orb

    mirrors: frozenset[Point] = frozenset()
    best_count = len(trace(cells, mirrors))
    best_mirrors = mirrors
    if best_count == 1:
        return mirrors

    current, count = mirrors, best_count
    tabu: list[frozenset[Point]] = []
    for _ in range(limit):
        moves = []
        for orb in orbits:
            if orb in tabu:
                continue
            nxt = current ^ orb  # toggling: a mirror may be worth taking back
            moves.append((len(trace(cells, nxt)), len(nxt), orb, nxt))
        if not moves:
            break
        moves.sort(key=lambda m: (m[0], m[1]))
        n, _, orb, nxt = moves[0]
        if n < best_count:
            best_count, best_mirrors = n, nxt
            if n == 1:
                return nxt
        # Take the move even on a plateau; stop only when it would make things
        # worse than where the search already is.
        if n > count and n > best_count:
            break
        current, count = nxt, n
        tabu.append(orb)
        if len(tabu) > 3:
            tabu.pop(0)
    return best_mirrors


def single_stroke_diamond(max_half: int = 6, widest_max: int = 15) -> list[int]:
    """The largest diamond in range that one unbroken line can draw.

    The loop count is a property of the region rather than something to choose,
    so it is searched for. Reported by `__main__` below, with what each
    candidate actually yields.
    """
    best: list[int] | None = None
    for half in range(2, max_half + 1):
        for widest in range(3, widest_max + 1, 2):
            if widest - 2 * half < 1:
                continue
            rows = diamond_rows(half, widest)
            cells = diamond(rows)
            if len(trace(cells)) == 1:
                if best is None or len(cells) > len(diamond(best)):
                    best = rows
    return best or [1, 3, 5, 3, 1]


if __name__ == "__main__":
    for half in range(2, 7):
        for widest in range(3, 16, 2):
            if widest - 2 * half < 1:
                continue
            rows = diamond_rows(half, widest)
            cells = diamond(rows)
            bare = trace(cells)
            m = fuse(cells)
            fused = trace(cells, m)
            square = "square" if widest == 2 * half + 1 else "      "
            print(f"rows={str(rows):46s} {square} dots={len(cells):3d} "
                  f"loops={len(bare):2d} -> {len(fused):2d} with {len(m):2d} mirrors "
                  f"steps={len(fused[0])}")


# ---------------------------------------------------------------------------
# From lattice to line
# ---------------------------------------------------------------------------


def _turns(path: list[Point]) -> list[tuple[Point, Point | None]]:
    """Each vertex with the direction the line is pushed out at, or None.

    A vertex where the heading changes is a reflection, and a reflection is
    where a kolam's line bellies out around the dot it is turning about. The
    push direction is `d_in - d_out`, which for a 90-degree turn is exactly the
    normal of the edge it bounced off. A vertex the line runs straight through
    is left alone.
    """
    n = len(path)
    out: list[tuple[Point, Point | None]] = []
    for i, p in enumerate(path):
        a = path[(i - 1) % n]
        b = path[(i + 1) % n]
        din = (p[0] - a[0], p[1] - a[1])
        dout = (b[0] - p[0], b[1] - p[1])
        if din == dout:
            out.append((p, None))
            continue
        nx, ny = din[0] - dout[0], din[1] - dout[1]
        m = math.hypot(nx, ny) or 1.0
        out.append((p, (nx / m, ny / m)))
    return out


def loop_points(
    path: list[Point],
    cells: set[Cell],
    *,
    edge_bulge: float = 0.62,
    knot_bulge: float = 0.30,
) -> list[Point]:
    """One loop as a ring of points ready to be splined.

    A turn on the outside of the figure is swung wide — that is the round lobe
    a kolam makes as it comes back in off the edge. A turn on an internal
    mirror is swung much less, because the strand facing it across that edge is
    doing the same thing and at the outer radius the two would collide.
    """
    out: list[Point] = []
    for (x, y), push in _turns(path):
        if push is None:
            out.append((x, y))
            continue
        # The cell on the far side of the edge that was bounced off.
        ax = int(x) if int(x) % 2 == 0 else int(x + push[0])
        ay = int(y) if int(y) % 2 == 0 else int(y + push[1])
        outside = (ax, ay) not in cells
        b = edge_bulge if outside else knot_bulge
        out.append((x + push[0] * b, y + push[1] * b))
    return out


def ring(points: list[Point]) -> tuple[str, float]:
    """A closed Catmull-Rom through a ring of points, and its length.

    `pen.chain` clamps its tangents at the two ends, which is right for an open
    line and wrong for a loop: closing one by repeating its first point leaves a
    visible kink where the two ends meet, and every kolam in the first preview
    had a small hook hanging off it. Here the neighbours wrap, so the seam is
    not a seam.
    """
    n = len(points)
    segs = []
    for i in range(n):
        a = points[(i - 1) % n]
        p0 = points[i]
        p1 = points[(i + 1) % n]
        b = points[(i + 2) % n]
        c1 = (p0[0] + (p1[0] - a[0]) / 6, p0[1] + (p1[1] - a[1]) / 6)
        c2 = (p1[0] - (b[0] - p0[0]) / 6, p1[1] - (b[1] - p0[1]) / 6)
        segs.append((p0, c1, c2, p1))
    d = f"M{segs[0][0][0]:.2f} {segs[0][0][1]:.2f}"
    for _, c1, c2, p3 in segs:
        d += f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p3[0]:.2f} {p3[1]:.2f}"
    return d + "Z", _ring_length(segs)


def _ring_length(segs, steps: int = 24) -> float:
    total = 0.0
    for p0, c1, c2, p3 in segs:
        prev = p0
        for s in range(1, steps + 1):
            u = s / steps
            v = 1 - u
            q = (
                v ** 3 * p0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * p3[0],
                v ** 3 * p0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * p3[1],
            )
            total += math.dist(prev, q)
            prev = q
    return round(total, 1)


def kolam(
    rows: list[int], *, seek_single: bool = True, scale: float = 300.0, pad: float = 14.0
) -> dict:
    """The whole figure: its dots, its loops, and the mirrors it took.

    Emitted into a square box `scale + 2 * pad` on a side, with the figure
    centred in it. Each loop carries its own length so the draw-on never has to
    measure a path at runtime, and each dot carries how far out it sits so the
    pulli can go down from the middle outward.
    """
    cells = diamond(rows)
    mirrors = fuse(cells) if seek_single else frozenset()
    loops = trace(cells, mirrors)
    rings = [loop_points(l, cells) for l in loops]

    # Scale before emitting: paths are written to two decimals, and on a
    # thirteen-unit lattice that would quantise the curve into visible steps.
    everything = [p for r in rings for p in r] + [(float(x), float(y)) for x, y in cells]
    xs = [p[0] for p in everything]
    ys = [p[1] for p in everything]
    s = scale / (max(xs) - min(xs))
    x0, y0 = min(xs), min(ys)
    w = (max(xs) - min(xs)) * s + 2 * pad
    h = (max(ys) - min(ys)) * s + 2 * pad

    def to_box(p: Point) -> Point:
        return ((p[0] - x0) * s + pad, (p[1] - y0) * s + pad)

    drawn = []
    for r in rings:
        d, length = ring([to_box(p) for p in r])
        drawn.append({"d": d, "len": length})

    # The pulli go down from the middle outward, the way a hand lays them, so
    # each carries how far out it sits and the component turns that into a
    # delay. Sorted by it as well, which keeps the markup in the same order.
    reach = max(math.hypot(x, y) for x, y in cells) or 1.0
    dots = []
    for x, y in sorted(cells, key=lambda c: (math.hypot(*c), c[1], c[0])):
        bx, by = to_box((float(x), float(y)))
        dots.append({"cx": round(bx, 1), "cy": round(by, 1),
                     "t": round(math.hypot(x, y) / reach, 3)})

    return {
        "rows": rows,
        "box": [0.0, 0.0, round(w, 1), round(h, 1)],
        "dots": dots,
        "dotR": round(s * 0.26, 2),
        "mirrors": len(mirrors),
        "loops": drawn,
        "steps": [len(l) for l in loops],
    }
