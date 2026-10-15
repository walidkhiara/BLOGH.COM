"""Deterministic rough-ink geometry helpers.

Roughness is seeded per drawing element, so the same (seed, element key)
always produces the same wobble. That keeps a character's identity stable
across frames instead of re-randomising the anatomy every render.
"""
from __future__ import annotations

import math
import random
import zlib

Pt = tuple[float, float]


def rng_for(seed: int, key: str) -> random.Random:
    """Stable RNG. Uses crc32, not hash(), because hash() is salted per run."""
    return random.Random(zlib.crc32(f"{seed}:{key}".encode()) & 0xFFFFFFFF)


def perp(a: Pt, b: Pt) -> Pt:
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    return (-dy / n, dx / n)


def offset(p: Pt, direction: Pt, amount: float) -> Pt:
    return (p[0] + direction[0] * amount, p[1] + direction[1] * amount)


def roughen(points: list[Pt], rng: random.Random, amp: float, subdiv: int = 2) -> list[Pt]:
    """Subdivide a polyline and nudge interior samples perpendicular to it.

    End points are preserved exactly, so adjoining shapes stay connected and
    limbs never detach.
    """
    if amp <= 0 or len(points) < 2:
        return list(points)
    out: list[Pt] = [points[0]]
    for a, b in zip(points, points[1:]):
        n = perp(a, b)
        for i in range(1, subdiv + 1):
            t = i / (subdiv + 1)
            mid = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            out.append(offset(mid, n, rng.uniform(-amp, amp)))
        out.append(b)
    return out


def smooth_path_d(points: list[Pt], closed: bool = False) -> str:
    """Quadratic-smoothed SVG path through `points`."""
    if len(points) < 2:
        return ""
    pts = points + [points[0]] if closed else points
    d = [f"M {pts[0][0]:.2f},{pts[0][1]:.2f}"]
    for i in range(1, len(pts) - 1):
        cx, cy = pts[i]
        mx = (pts[i][0] + pts[i + 1][0]) / 2.0
        my = (pts[i][1] + pts[i + 1][1]) / 2.0
        d.append(f"Q {cx:.2f},{cy:.2f} {mx:.2f},{my:.2f}")
    last = pts[-1]
    d.append(f"L {last[0]:.2f},{last[1]:.2f}")
    if closed:
        d.append("Z")
    return " ".join(d)


def tapered_quad(a: Pt, b: Pt, w_start: float, w_end: float, bulge: float = 0.0) -> list[Pt]:
    """Silhouette outline of a limb from `a` to `b`, widening/narrowing.

    `bulge` (0..1) pushes the mid-samples outward for a muscled look.
    """
    n = perp(a, b)
    mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)
    w_mid = (w_start + w_end) / 2.0 * (1.0 + bulge)
    side_a = [
        offset(a, n, w_start / 2.0),
        offset(mid, n, w_mid / 2.0),
        offset(b, n, w_end / 2.0),
    ]
    side_b = [
        offset(b, n, -w_end / 2.0),
        offset(mid, n, -w_mid / 2.0),
        offset(a, n, -w_start / 2.0),
    ]
    return side_a + side_b


def ellipse_points(
    center: Pt, rx: float, ry: float, angle_deg: float, samples: int = 16,
    jaw_taper: float = 1.0,
) -> list[Pt]:
    """Oriented ellipse samples; `jaw_taper` narrows the far (chin) end."""
    ca, sa = math.cos(math.radians(angle_deg)), math.sin(math.radians(angle_deg))
    out: list[Pt] = []
    for i in range(samples):
        th = 2.0 * math.pi * i / samples
        # local frame: +u along the head axis (crown direction), +v sideways
        u = math.cos(th) * ry
        v = math.sin(th) * rx
        if u < 0:  # chin half
            v *= jaw_taper
        out.append((center[0] + ca * u - sa * v, center[1] + sa * u + ca * v))
    return out


def chain_outline(
    segments: list[tuple[Pt, Pt, float, float]], bulge: float = 0.0, cap: float = 0.5
) -> list[Pt]:
    """Single silhouette around a whole limb chain (e.g. upper arm -> hand).

    Drawing a chain as one closed outline instead of one quad per bone is
    what keeps elbows and knees from showing a seam, and guarantees the
    limb cannot visually detach at a joint.
    """
    side_a: list[Pt] = []
    side_b: list[Pt] = []
    for a, b, w0, w1 in segments:
        n = perp(a, b)
        mid = ((a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0)
        wm = (w0 + w1) / 2.0 * (1.0 + bulge)
        side_a += [offset(a, n, w0 / 2), offset(mid, n, wm / 2), offset(b, n, w1 / 2)]
        side_b += [offset(a, n, -w0 / 2), offset(mid, n, -wm / 2), offset(b, n, -w1 / 2)]
    # Round the far tip (hand / foot) so the chain reads as closed, not cut.
    ta, tb, _, tw = segments[-1]
    d = (tb[0] - ta[0], tb[1] - ta[1])
    n = math.hypot(*d) or 1.0
    tip = (tb[0] + d[0] / n * tw * cap, tb[1] + d[1] / n * tw * cap)
    return side_a + [tip] + list(reversed(side_b))


def chain_shadow(
    segments: list[tuple[Pt, Pt, float, float]], fraction: float = 0.34
) -> list[Pt]:
    """Inner band along one side of a chain, for solid black spotting."""
    edge: list[Pt] = []
    inner: list[Pt] = []
    for a, b, w0, w1 in segments:
        n = perp(a, b)
        edge += [offset(a, n, -w0 / 2), offset(b, n, -w1 / 2)]
        inner += [
            offset(a, n, -w0 / 2 + w0 * fraction),
            offset(b, n, -w1 / 2 + w1 * fraction),
        ]
    return edge + list(reversed(inner))
