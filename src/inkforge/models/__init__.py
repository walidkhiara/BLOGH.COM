"""Validated data structures for InkForge.

COORDINATE SYSTEM AND UNITS
---------------------------
World space:
  * Unit = 1 "ink unit", intended to read as ~1 cm of character height.
    A default adult character is ~170 units tall.
  * +x points right, +y points DOWN (screen convention, matches SVG).
  * Angles are DEGREES, 0 deg = +x (right), increasing CLOCKWISE on screen
    (because +y is down). So -90 deg points straight up.

Skeleton convention:
  * Every bone stores `rest_angle` as an ABSOLUTE world angle in the rest
    pose, for a character facing right (facing = +1).
  * A pose supplies per-bone angle DELTAS. Deltas accumulate down the chain
    (rotating `upper_arm_r` carries `forearm_r` and `hand_r` with it), so the
    hierarchy is genuinely articulated while the rest pose stays readable.
  * See animation.skeleton.solve_fk for the exact evaluation.

Screen space:
  * Pixels, origin top-left, +y down. camera.project() maps world -> pixels.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Vec2 = tuple[float, float]


class _Base(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


# --------------------------------------------------------------------------
# Skeleton
# --------------------------------------------------------------------------
class BoneDefinition(_Base):
    """One rigid segment. `parent=None` marks the root."""

    name: str = Field(min_length=1)
    parent: str | None = None
    length: float = Field(ge=0.0)
    rest_angle: float = 0.0
    # Silhouette width at the start / end of the bone, in world units.
    width_start: float = Field(default=0.0, ge=0.0)
    width_end: float = Field(default=0.0, ge=0.0)
    # Draw order: lower numbers are painted first (further from viewer).
    depth: int = 0
    # "limb" bones get a tapered silhouette; "none" bones are pure structure.
    shape: Literal["limb", "none"] = "limb"


class SkeletonDefinition(_Base):
    name: str
    bones: tuple[BoneDefinition, ...]

    @model_validator(mode="after")
    def _check_hierarchy(self) -> SkeletonDefinition:
        names = [b.name for b in self.bones]
        if len(names) != len(set(names)):
            raise ValueError("duplicate bone names in skeleton")
        index = {b.name: b for b in self.bones}
        roots = [b for b in self.bones if b.parent is None]
        if len(roots) != 1:
            raise ValueError(f"skeleton needs exactly one root bone, got {len(roots)}")
        for bone in self.bones:
            if bone.parent is not None and bone.parent not in index:
                raise ValueError(f"bone {bone.name!r} has unknown parent {bone.parent!r}")
        # Reject cycles by walking every bone up to the root.
        for bone in self.bones:
            seen = {bone.name}
            cur = bone
            while cur.parent is not None:
                if cur.parent in seen:
                    raise ValueError(f"cycle in skeleton at bone {cur.name!r}")
                seen.add(cur.parent)
                cur = index[cur.parent]
        return self

    @property
    def root(self) -> BoneDefinition:
        return next(b for b in self.bones if b.parent is None)

    def by_name(self, name: str) -> BoneDefinition:
        for bone in self.bones:
            if bone.name == name:
                return bone
        raise KeyError(f"no bone named {name!r}")

    def chain_order(self) -> tuple[BoneDefinition, ...]:
        """Bones ordered parents-before-children."""
        out: list[BoneDefinition] = []
        pending = list(self.bones)
        placed: set[str] = set()
        while pending:
            progressed = False
            for bone in list(pending):
                if bone.parent is None or bone.parent in placed:
                    out.append(bone)
                    placed.add(bone.name)
                    pending.remove(bone)
                    progressed = True
            if not progressed:  # pragma: no cover - validator rejects cycles first
                raise ValueError("unresolvable skeleton hierarchy")
        return tuple(out)


# --------------------------------------------------------------------------
# Pose
# --------------------------------------------------------------------------
class PoseDefinition(_Base):
    """Pose parameters only. Never holds identity data."""

    name: str
    # bone name -> angle delta in degrees
    angles: dict[str, float] = Field(default_factory=dict)
    # Root offset in world units, applied after identity scaling.
    root_offset: Vec2 = (0.0, 0.0)
    root_rotation: float = 0.0
    # +1 faces right, -1 faces left.
    facing: Literal[-1, 1] = 1


# --------------------------------------------------------------------------
# Character identity
# --------------------------------------------------------------------------
class Proportions(_Base):
    total_height: float = Field(default=170.0, gt=0)
    scale: float = Field(default=1.0, gt=0)
    head_width: float = Field(default=17.0, gt=0)
    head_height: float = Field(default=22.0, gt=0)
    shoulder_width: float = Field(default=21.0, gt=0)
    hip_width: float = Field(default=15.0, gt=0)
    torso_taper: float = Field(default=0.78, gt=0, le=1.5)


class HairStyle(_Base):
    style: Literal["spiky", "swept", "bowl"] = "spiky"
    spikes: int = Field(default=6, ge=0, le=24)
    length: float = Field(default=9.0, ge=0)
    fill: str = "#101010"


class FaceFeatures(_Base):
    eye_size: float = Field(default=2.2, gt=0)
    eye_spacing: float = Field(default=5.0, gt=0)
    brow_angle: float = -14.0
    mouth_width: float = Field(default=4.5, ge=0)
    expression: Literal["neutral", "grit", "shout"] = "grit"


class ClothingStyle(_Base):
    kind: Literal["jacket", "robe", "vest"] = "jacket"
    fill: str = "#141414"
    # Fraction of thigh length covered by the garment.
    skirt_length: float = Field(default=0.0, ge=0.0, le=1.0)


class LineWeights(_Base):
    outline: float = Field(default=2.6, gt=0)
    limb: float = Field(default=2.0, gt=0)
    detail: float = Field(default=1.2, gt=0)
    roughness: float = Field(default=0.9, ge=0.0, le=4.0)


class CharacterDefinition(_Base):
    """Persistent identity. Poses must never mutate this."""

    id: str = Field(min_length=1)
    display_name: str
    skeleton: SkeletonDefinition
    proportions: Proportions = Proportions()
    hair: HairStyle = HairStyle()
    face: FaceFeatures = FaceFeatures()
    clothing: ClothingStyle = ClothingStyle()
    lines: LineWeights = LineWeights()
    ink: str = "#0a0a0a"
    skin: str = "#ffffff"
    # Reusable drawing parts this character may use, by name.
    parts: tuple[str, ...] = ("torso", "limbs", "head", "hair", "face")
    # Named poses stored with the identity (presets + per-character corrections).
    named_poses: dict[str, PoseDefinition] = Field(default_factory=dict)
    pose_corrections: dict[str, dict[str, float]] = Field(default_factory=dict)


# --------------------------------------------------------------------------
# Camera / style / scene
# --------------------------------------------------------------------------
class CameraDefinition(_Base):
    """2D camera.

    LIMITATION: this is a plain 2D similarity transform (pan + uniform
    scale). `perspective` only exaggerates scale by depth; it is NOT a
    perspective projection and does not foreshorten correctly.
    """

    center: Vec2 = (0.0, 8.0)
    scale: float = Field(default=3.0, gt=0)
    width: int = Field(default=900, gt=0)
    height: int = Field(default=1200, gt=0)
    perspective: float = Field(default=0.0, ge=0.0, le=1.0)

    def project(self, point: Vec2, depth: float = 0.0) -> Vec2:
        k = self.scale * (1.0 + self.perspective * depth)
        return (
            (point[0] - self.center[0]) * k + self.width / 2.0,
            (point[1] - self.center[1]) * k + self.height / 2.0,
        )


class RenderStyle(_Base):
    seed: int = 7
    roughness: float = Field(default=1.0, ge=0.0, le=4.0)
    background: str = "#f4f1ea"
    ink: str = "#0a0a0a"
    speed_lines: int = Field(default=0, ge=0, le=400)
    impact: bool = False
    screentone: bool = True
    shadows: bool = True
    debug_skeleton: bool = False


class ActionEvent(_Base):
    actor: str
    action: str
    start: float = Field(ge=0.0)
    duration: float = Field(default=1.0, gt=0.0)
    target: str | None = None
    params: dict[str, float] = Field(default_factory=dict)


class ActorPlacement(_Base):
    character_id: str
    position: Vec2 = (0.0, 0.0)
    facing: Literal[-1, 1] = 1


class SceneDefinition(_Base):
    name: str
    actors: tuple[ActorPlacement, ...]
    events: tuple[ActionEvent, ...] = ()
    camera: CameraDefinition = CameraDefinition()
    style: RenderStyle = RenderStyle()
    frames: int = Field(default=6, ge=1, le=64)

    @field_validator("actors")
    @classmethod
    def _unique_actors(cls, v: tuple[ActorPlacement, ...]) -> tuple[ActorPlacement, ...]:
        ids = [a.character_id for a in v]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate character_id in scene actors")
        return v


__all__ = [
    "ActionEvent",
    "ActorPlacement",
    "BoneDefinition",
    "CameraDefinition",
    "CharacterDefinition",
    "ClothingStyle",
    "FaceFeatures",
    "HairStyle",
    "LineWeights",
    "PoseDefinition",
    "Proportions",
    "RenderStyle",
    "SceneDefinition",
    "SkeletonDefinition",
]
