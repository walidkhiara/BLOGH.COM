"""Draw a posed character as rough-ink SVG geometry.

Layer order (painted first -> last):
    far-side limbs, torso/clothing, head, hair, face, near-side limbs.
The near-side arm is painted last on purpose, so a raised guard fist reads
as being in front of the face.
"""
from __future__ import annotations

import math

import svgwrite

from ..animation.skeleton import Skin
from ..models import CameraDefinition, CharacterDefinition, RenderStyle
from .rough import (
    Pt,
    chain_outline,
    chain_shadow,
    ellipse_points,
    offset,
    perp,
    rng_for,
    roughen,
    smooth_path_d,
    tapered_quad,
)


class CharacterPainter:
    def __init__(
        self,
        character: CharacterDefinition,
        skin: Skin,
        camera: CameraDefinition,
        style: RenderStyle,
    ) -> None:
        self.c = character
        self.skin = skin
        self.cam = camera
        self.style = style
        # Line weights are authored for camera.scale == 3.
        self.px = camera.scale / 3.0
        self.rough_amp = 1.6 * style.roughness * character.lines.roughness

    # -- geometry helpers ---------------------------------------------------
    def proj(self, points: list[Pt]) -> list[Pt]:
        return [self.cam.project(p) for p in points]

    def _ink(self, key: str, points: list[Pt], closed: bool) -> str:
        rng = rng_for(self.style.seed, f"{self.c.id}:{key}")
        return smooth_path_d(roughen(points, rng, self.rough_amp), closed)

    def _stroke(self, weight: float) -> dict:
        return {
            "stroke": self.c.ink,
            "stroke_width": max(0.6, weight * self.px),
            "stroke_linejoin": "round",
            "stroke_linecap": "round",
        }

    # -- parts --------------------------------------------------------------
    LIMB_CHAINS: dict[str, tuple[str, ...]] = {
        "arm_l": ("upper_arm_l", "forearm_l", "hand_l"),
        "arm_r": ("upper_arm_r", "forearm_r", "hand_r"),
        "leg_l": ("thigh_l", "shin_l", "foot_l"),
        "leg_r": ("thigh_r", "shin_r", "foot_r"),
        "neck": ("neck",),
    }

    def _segments(self, chain: tuple[str, ...]):
        segs = []
        for name in chain:
            b = self.skin[name]
            segs.append((b.start, b.end, b.width_start, b.width_end))
        return segs

    def chain_paths(self, key: str, chain: tuple[str, ...]) -> list:
        """One closed silhouette for the whole chain - no seams at joints."""
        segs = self._segments(chain)
        bulge = 0.12 if key.startswith(("arm", "leg")) else 0.0
        outline = self.proj(chain_outline(segs, bulge=bulge))
        out = [
            svgwrite.path.Path(
                d=self._ink(f"limb:{key}", outline, True),
                fill=self.c.skin,
                **self._stroke(self.c.lines.limb),
            )
        ]
        if self.style.shadows and key != "neck":
            out.append(
                svgwrite.path.Path(
                    d=self._ink(f"shadow:{key}", self.proj(chain_shadow(segs)), True),
                    fill=self.c.ink,
                    fill_opacity=0.9,
                    stroke="none",
                )
            )
        return out

    def torso_path(self) -> list[svgwrite.base.BaseElement]:
        pelvis = self.skin["pelvis"].end
        waist = self.skin["spine"].end
        shoulders = self.skin["chest"].end
        p = self.c.proportions
        s = p.scale
        n = perp(pelvis, shoulders)
        hw, mw, sw = (
            p.hip_width * s,
            (p.hip_width + p.shoulder_width) / 2.0 * p.torso_taper * s,
            p.shoulder_width * s,
        )
        poly = [
            offset(pelvis, n, hw / 2),
            offset(waist, n, mw / 2),
            offset(shoulders, n, sw / 2),
            offset(shoulders, n, -sw / 2),
            offset(waist, n, -mw / 2),
            offset(pelvis, n, -hw / 2),
        ]
        elements = [
            svgwrite.path.Path(
                d=self._ink("torso", self.proj(poly), True),
                fill=self.c.clothing.fill,
                **self._stroke(self.c.lines.outline),
            )
        ]
        if self.style.shadows:
            # Spotting wedge down the trailing side of the torso.
            wedge = [
                offset(shoulders, n, -sw / 2),
                offset(waist, n, -mw / 2),
                offset(pelvis, n, -hw / 2),
                offset(pelvis, n, -hw / 2 + hw * 0.34),
                offset(shoulders, n, -sw / 2 + sw * 0.30),
            ]
            elements.append(
                svgwrite.path.Path(
                    d=self._ink("torso_shadow", self.proj(wedge), True),
                    fill=self.c.ink,
                    fill_opacity=0.95,
                    stroke="none",
                )
            )
        return elements

    # -- head ---------------------------------------------------------------
    def _head_frame(self) -> tuple[Pt, float, float, float]:
        head = self.skin["head"]
        s = self.c.proportions.scale
        rx = self.c.proportions.head_width / 2.0 * s
        ry = self.c.proportions.head_height / 2.0 * s
        ang = head.angle
        rad = math.radians(ang)
        center = (
            head.start[0] + math.cos(rad) * ry * 0.92,
            head.start[1] + math.sin(rad) * ry * 0.92,
        )
        return center, rx, ry, ang

    def _head_local(self, center: Pt, ang: float, u: float, v: float) -> Pt:
        ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        return (center[0] + ca * u - sa * v, center[1] + sa * u + ca * v)

    def head_path(self) -> list[svgwrite.base.BaseElement]:
        center, rx, ry, ang = self._head_frame()
        pts = ellipse_points(center, rx, ry, ang, samples=20, jaw_taper=0.76)
        return [
            svgwrite.path.Path(
                d=self._ink("head", self.proj(pts), True),
                fill=self.c.skin,
                **self._stroke(self.c.lines.outline),
            )
        ]

    def hair_path(self) -> list[svgwrite.base.BaseElement]:
        hair = self.c.hair
        if hair.spikes == 0 and hair.length <= 0:
            return []
        center, rx, ry, ang = self._head_frame()
        s = self.c.proportions.scale
        length = hair.length * s
        rng = rng_for(self.style.seed, f"{self.c.id}:hair")
        face = self.skin["head"]
        sign = 1.0 if math.cos(math.radians(face.angle - 90)) >= 0 else -1.0

        pts: list[Pt] = []
        n = max(2, hair.spikes)
        # Sweep across the crown from one temple to the other.
        for i in range(n + 1):
            t = i / n
            th = math.pi * (0.9 - 0.8 * t)  # crown band only, clear of the eyes
            u = math.sin(th) * ry * 1.02
            v = math.cos(th) * rx * 1.02
            pts.append(self._head_local(center, ang, u, v))
            if i < n:
                tm = (i + 0.5) / n
                thm = math.pi * (0.9 - 0.8 * tm)
                ex = 1.0 + (0.5 + 0.5 * math.sin(thm)) * (length / max(ry, 1e-6))
                jitter = rng.uniform(0.75, 1.25)
                if hair.style == "swept":
                    shift = sign * 0.45 * length
                elif hair.style == "bowl":
                    shift = 0.0
                    ex = 1.0 + 0.25 * (length / max(ry, 1e-6))
                else:
                    shift = sign * 0.15 * length
                um = math.sin(thm) * ry * ex * jitter
                vm = math.cos(thm) * rx * ex * jitter + shift
                pts.append(self._head_local(center, ang, um, vm))
        # Close back under the crown so the fill hugs the skull.
        pts.append(self._head_local(center, ang, ry * 0.12, -rx * 0.95))
        pts.append(self._head_local(center, ang, ry * 0.12, rx * 0.95))
        return [
            svgwrite.path.Path(
                d=self._ink("hair", self.proj(pts), True),
                fill=hair.fill,
                **self._stroke(self.c.lines.detail),
            )
        ]

    def face_paths(self) -> list[svgwrite.base.BaseElement]:
        center, rx, ry, ang = self._head_frame()
        f = self.c.face
        s = self.c.proportions.scale
        head = self.skin["head"]
        sign = 1.0 if math.cos(math.radians(head.angle - 90)) >= 0 else -1.0
        bias = sign * rx * 0.22  # shift features toward the facing side
        out: list[svgwrite.base.BaseElement] = []
        for k in (-1, 1):
            v = bias + k * f.eye_spacing / 2.0 * s
            eye_c = self._head_local(center, ang, -ry * 0.05, v)
            e = ellipse_points(eye_c, f.eye_size * s * 0.75, f.eye_size * s * 0.5, ang, 10)
            out.append(
                svgwrite.path.Path(
                    d=smooth_path_d(self.proj(e), True), fill=self.c.ink, stroke="none"
                )
            )
            brow_a = self._head_local(center, ang, ry * 0.22, v - f.eye_size * s * 0.9)
            brow_b = self._head_local(
                center, ang, ry * 0.22 + f.brow_angle * 0.06 * s * k, v + f.eye_size * s * 0.9
            )
            out.append(
                svgwrite.path.Path(
                    d=self._ink(f"brow{k}", self.proj([brow_a, brow_b]), False),
                    fill="none",
                    **self._stroke(self.c.lines.detail * 1.8),
                )
            )
        if f.mouth_width > 0:
            w = f.mouth_width * s / 2.0
            open_mouth = f.expression == "shout"
            m0 = self._head_local(center, ang, -ry * 0.48, bias - w)
            m1 = self._head_local(center, ang, -ry * 0.48, bias + w)
            if open_mouth:
                m2 = self._head_local(center, ang, -ry * 0.70, bias)
                out.append(
                    svgwrite.path.Path(
                        d=smooth_path_d(self.proj([m0, m1, m2]), True),
                        fill=self.c.ink,
                        stroke="none",
                    )
                )
            else:
                out.append(
                    svgwrite.path.Path(
                        d=self._ink("mouth", self.proj([m0, m1]), False),
                        fill="none",
                        **self._stroke(self.c.lines.detail * 1.4),
                    )
                )
        return out

    # -- assembly -----------------------------------------------------------
    def draw(self, dwg: svgwrite.Drawing) -> svgwrite.container.Group:
        g = dwg.g(id=f"char-{self.c.id}")
        order = [
            ("neck", -3),
            ("arm_l", -2),
            ("leg_l", -1),
            ("__torso__", 0),
            ("__head__", 1),
            ("leg_r", 2),
            ("arm_r", 3),
        ]
        for key, _ in sorted(order, key=lambda kv: kv[1]):
            if key == "__torso__":
                for el in self.torso_path():
                    g.add(el)
            elif key == "__head__":
                for el in self.head_path() + self.hair_path() + self.face_paths():
                    g.add(el)
            else:
                for el in self.chain_paths(key, self.LIMB_CHAINS[key]):
                    g.add(el)

        if self.style.debug_skeleton:
            dbg = dwg.g(id=f"debug-{self.c.id}")
            for b in self.skin.values():
                p0, p1 = self.cam.project(b.start), self.cam.project(b.end)
                dbg.add(
                    svgwrite.shapes.Line(
                        start=p0, end=p1, stroke="#e0115f", stroke_width=1.5
                    )
                )
                dbg.add(svgwrite.shapes.Circle(center=p0, r=2.5, fill="#0066ff"))
            g.add(dbg)
        return g
