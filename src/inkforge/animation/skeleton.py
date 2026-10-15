"""Hierarchical skeleton + forward kinematics.

See inkforge.models for the coordinate and angle conventions.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from ..models import (
    BoneDefinition,
    CharacterDefinition,
    PoseDefinition,
    SkeletonDefinition,
    Vec2,
)


@dataclass(frozen=True)
class BoneTransform:
    name: str
    start: Vec2
    end: Vec2
    angle: float          # absolute world angle, degrees
    width_start: float
    width_end: float
    depth: int
    shape: str

    @property
    def length(self) -> float:
        return math.dist(self.start, self.end)


class Skin(dict[str, BoneTransform]):
    """Evaluated skeleton: bone name -> world transform."""

    def point(self, bone: str, t: float = 1.0) -> Vec2:
        b = self[bone]
        return (
            b.start[0] + (b.end[0] - b.start[0]) * t,
            b.start[1] + (b.end[1] - b.start[1]) * t,
        )

    def bbox(self) -> tuple[float, float, float, float]:
        xs = [p for b in self.values() for p in (b.start[0], b.end[0])]
        ys = [p for b in self.values() for p in (b.start[1], b.end[1])]
        return min(xs), min(ys), max(xs), max(ys)


def _mirror(angle: float, facing: int) -> float:
    """Reflect a world angle about the vertical axis when facing left."""
    return angle if facing == 1 else 180.0 - angle


def solve_fk(
    character: CharacterDefinition,
    pose: PoseDefinition,
    origin: Vec2 = (0.0, 0.0),
    facing: int | None = None,
) -> Skin:
    """Evaluate the skeleton into world space.

    Angle deltas accumulate from the root down each chain; bone lengths and
    widths are scaled by the character's identity scale. Pose data is read
    only - the CharacterDefinition is never modified.
    """
    skeleton: SkeletonDefinition = character.skeleton
    scale = character.proportions.scale
    face = facing if facing is not None else pose.facing
    corrections = character.pose_corrections.get(pose.name, {})

    accumulated: dict[str, float] = {}
    skin = Skin()
    root_x = origin[0] + pose.root_offset[0] * face
    root_y = origin[1] + pose.root_offset[1]

    for bone in skeleton.chain_order():
        delta = pose.angles.get(bone.name, 0.0) + corrections.get(bone.name, 0.0)
        parent_delta = accumulated.get(bone.parent, pose.root_rotation) if bone.parent else pose.root_rotation
        total_delta = parent_delta + delta
        accumulated[bone.name] = total_delta

        start = (root_x, root_y) if bone.parent is None else skin[bone.parent].end
        world_angle = _mirror(bone.rest_angle + total_delta, face)
        rad = math.radians(world_angle)
        length = bone.length * scale
        end = (start[0] + math.cos(rad) * length, start[1] + math.sin(rad) * length)

        skin[bone.name] = BoneTransform(
            name=bone.name,
            start=start,
            end=end,
            angle=world_angle,
            width_start=bone.width_start * scale,
            width_end=bone.width_end * scale,
            depth=bone.depth,
            shape=bone.shape,
        )
    return skin


def distance(skin_a: Skin, bone_a: str, skin_b: Skin, bone_b: str) -> float:
    """Distance between the tips of two bones, in world units."""
    return math.dist(skin_a[bone_a].end, skin_b[bone_b].end)


def contact(skin_a: Skin, bone_a: str, skin_b: Skin, bone_b: str, radius: float) -> bool:
    """Crude collision check: are two bone tips within `radius` units?"""
    return distance(skin_a, bone_a, skin_b, bone_b) <= radius


def humanoid_skeleton(name: str = "humanoid_v1") -> SkeletonDefinition:
    """The reusable articulated body used by every character so far.

    Rest pose: standing, facing right (+x), arms down, legs straight.
    Depth: negative = far side of the body, positive = near side.
    """
    B = BoneDefinition
    bones = (
        B(name="pelvis", parent=None, length=0.0, rest_angle=0.0, shape="none"),
        B(name="spine", parent="pelvis", length=22.0, rest_angle=-90.0,
          width_start=14.0, width_end=17.0, depth=0, shape="none"),
        B(name="chest", parent="spine", length=16.0, rest_angle=-90.0,
          width_start=17.0, width_end=19.0, depth=0, shape="none"),
        B(name="neck", parent="chest", length=6.0, rest_angle=-90.0,
          width_start=7.0, width_end=6.5, depth=1),
        B(name="head", parent="neck", length=20.0, rest_angle=-90.0, shape="none"),
        # far arm (behind torso)
        B(name="clavicle_l", parent="chest", length=9.0, rest_angle=185.0, shape="none"),
        B(name="upper_arm_l", parent="clavicle_l", length=27.0, rest_angle=100.0,
          width_start=7.5, width_end=6.0, depth=-2),
        B(name="forearm_l", parent="upper_arm_l", length=25.0, rest_angle=95.0,
          width_start=6.0, width_end=4.6, depth=-2),
        B(name="hand_l", parent="forearm_l", length=8.0, rest_angle=95.0,
          width_start=6.4, width_end=5.4, depth=-2),
        # near arm (in front of torso)
        B(name="clavicle_r", parent="chest", length=9.0, rest_angle=-5.0, shape="none"),
        B(name="upper_arm_r", parent="clavicle_r", length=27.0, rest_angle=80.0,
          width_start=8.0, width_end=6.4, depth=3),
        B(name="forearm_r", parent="upper_arm_r", length=25.0, rest_angle=85.0,
          width_start=6.4, width_end=5.0, depth=3),
        B(name="hand_r", parent="forearm_r", length=8.0, rest_angle=85.0,
          width_start=7.0, width_end=6.0, depth=3),
        # far leg
        B(name="hip_l", parent="pelvis", length=7.5, rest_angle=160.0, shape="none"),
        B(name="thigh_l", parent="hip_l", length=42.0, rest_angle=95.0,
          width_start=12.0, width_end=9.0, depth=-1),
        B(name="shin_l", parent="thigh_l", length=40.0, rest_angle=90.0,
          width_start=9.0, width_end=5.5, depth=-1),
        B(name="foot_l", parent="shin_l", length=13.0, rest_angle=5.0,
          width_start=6.0, width_end=3.5, depth=-1),
        # near leg
        B(name="hip_r", parent="pelvis", length=7.5, rest_angle=20.0, shape="none"),
        B(name="thigh_r", parent="hip_r", length=42.0, rest_angle=85.0,
          width_start=12.5, width_end=9.5, depth=2),
        B(name="shin_r", parent="thigh_r", length=40.0, rest_angle=90.0,
          width_start=9.5, width_end=6.0, depth=2),
        B(name="foot_r", parent="shin_r", length=13.0, rest_angle=5.0,
          width_start=6.5, width_end=3.8, depth=2),
    )
    return SkeletonDefinition(name=name, bones=bones)
