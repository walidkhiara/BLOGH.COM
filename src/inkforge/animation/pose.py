"""Named pose presets, authoring helpers and pose interpolation."""
from __future__ import annotations

from ..models import PoseDefinition, SkeletonDefinition
from .skeleton import humanoid_skeleton

# Poses are authored as ABSOLUTE world angles (easier to reason about) and
# converted to the hierarchical deltas the FK solver consumes.
_HUMANOID = humanoid_skeleton()


def pose_from_world_angles(
    skeleton: SkeletonDefinition,
    name: str,
    targets: dict[str, float],
    *,
    root_offset: tuple[float, float] = (0.0, 0.0),
    root_rotation: float = 0.0,
    facing: int = 1,
) -> PoseDefinition:
    """Build a PoseDefinition from desired world angles, facing right.

    Bones left out of `targets` inherit their parent's accumulated rotation,
    which keeps limbs attached and rigid instead of snapping back to rest.
    """
    unknown = set(targets) - {b.name for b in skeleton.bones}
    if unknown:
        raise KeyError(f"unknown bone(s) in pose {name!r}: {sorted(unknown)}")

    accumulated: dict[str, float] = {}
    angles: dict[str, float] = {}
    for bone in skeleton.chain_order():
        parent_acc = accumulated.get(bone.parent, 0.0) if bone.parent else 0.0
        if bone.name in targets:
            acc = targets[bone.name] - bone.rest_angle
        else:
            acc = parent_acc
        accumulated[bone.name] = acc
        delta = acc - parent_acc
        if abs(delta) > 1e-9:
            angles[bone.name] = round(delta, 4)
    return PoseDefinition(
        name=name,
        angles=angles,
        root_offset=root_offset,
        root_rotation=root_rotation,
        facing=facing,  # type: ignore[arg-type]
    )


_PRESET_WORLD_ANGLES: dict[str, dict[str, float]] = {
    "idle": {
        "spine": -90, "chest": -90, "neck": -88, "head": -88,
        "upper_arm_r": 83, "forearm_r": 88, "hand_r": 88,
        "upper_arm_l": 97, "forearm_l": 92, "hand_l": 92,
        "thigh_r": 88, "shin_r": 91, "foot_r": 5,
        "thigh_l": 93, "shin_l": 89, "foot_l": 2,
    },
    "guard": {
        "spine": -96, "chest": -88, "neck": -84, "head": -82,
        "upper_arm_r": 62, "forearm_r": -52, "hand_r": -48,
        "upper_arm_l": 100, "forearm_l": 8, "hand_l": 2,
        "thigh_r": 78, "shin_r": 96, "foot_r": 4,
        "thigh_l": 107, "shin_l": 84, "foot_l": 0,
    },
    "punch_right": {
        "spine": -92, "chest": -92, "neck": -82, "head": -80,
        "upper_arm_r": 6, "forearm_r": 1, "hand_r": 0,
        "upper_arm_l": 126, "forearm_l": 152, "hand_l": 154,
        "thigh_r": 66, "shin_r": 88, "foot_r": 0,
        "thigh_l": 118, "shin_l": 102, "foot_l": 14,
    },
    "block": {
        "spine": -101, "chest": -95, "neck": -88, "head": -92,
        "upper_arm_r": 34, "forearm_r": -66, "hand_r": -70,
        "upper_arm_l": 56, "forearm_l": -28, "hand_l": -24,
        "thigh_r": 97, "shin_r": 92, "foot_r": 6,
        "thigh_l": 116, "shin_l": 79, "foot_l": -2,
    },
    "recoil": {
        "spine": -114, "chest": -110, "neck": -122, "head": -126,
        "upper_arm_r": 148, "forearm_r": 172, "hand_r": 176,
        "upper_arm_l": 188, "forearm_l": 202, "hand_l": 206,
        "thigh_r": 58, "shin_r": 42, "foot_r": -22,
        "thigh_l": 112, "shin_l": 124, "foot_l": 34,
    },
    "step_forward": {
        "spine": -94, "chest": -90, "neck": -84, "head": -82,
        "upper_arm_r": 58, "forearm_r": -30, "hand_r": -28,
        "upper_arm_l": 118, "forearm_l": 132, "hand_l": 134,
        "thigh_r": 62, "shin_r": 84, "foot_r": -4,
        "thigh_l": 112, "shin_l": 108, "foot_l": 20,
    },
}

POSE_PRESETS: dict[str, PoseDefinition] = {
    name: pose_from_world_angles(_HUMANOID, name, angles)
    for name, angles in _PRESET_WORLD_ANGLES.items()
}


def get_preset(name: str) -> PoseDefinition:
    if name not in POSE_PRESETS:
        raise KeyError(
            f"unknown pose preset {name!r}; available: {sorted(POSE_PRESETS)}"
        )
    return POSE_PRESETS[name]


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def smoothstep(t: float) -> float:
    """Ease-in-out on [0, 1]."""
    t = min(1.0, max(0.0, t))
    return t * t * (3.0 - 2.0 * t)


def interpolate_pose(
    a: PoseDefinition,
    b: PoseDefinition,
    t: float,
    *,
    name: str | None = None,
    ease: bool = True,
) -> PoseDefinition:
    """Linear (optionally eased) blend between two poses.

    Bones present in only one pose are blended against 0, so a missing bone
    means "rest", never a discontinuity.
    """
    if not 0.0 <= t <= 1.0:
        raise ValueError(f"t must be in [0, 1], got {t}")
    u = smoothstep(t) if ease else t
    keys = set(a.angles) | set(b.angles)
    angles = {k: _lerp(a.angles.get(k, 0.0), b.angles.get(k, 0.0), u) for k in keys}
    return PoseDefinition(
        name=name or f"{a.name}->{b.name}@{t:.2f}",
        angles=angles,
        root_offset=(
            _lerp(a.root_offset[0], b.root_offset[0], u),
            _lerp(a.root_offset[1], b.root_offset[1], u),
        ),
        root_rotation=_lerp(a.root_rotation, b.root_rotation, u),
        facing=a.facing if u < 0.5 else b.facing,
    )


def blend_poses(
    poses: list[tuple[PoseDefinition, float]], name: str = "blend"
) -> PoseDefinition:
    """Weighted average of several poses. Weights are normalised."""
    if not poses:
        raise ValueError("blend_poses needs at least one pose")
    total = sum(w for _, w in poses)
    if total <= 0:
        raise ValueError("blend weights must sum to a positive value")
    keys = {k for p, _ in poses for k in p.angles}
    angles = {
        k: sum(p.angles.get(k, 0.0) * w for p, w in poses) / total for k in keys
    }
    offset = (
        sum(p.root_offset[0] * w for p, w in poses) / total,
        sum(p.root_offset[1] * w for p, w in poses) / total,
    )
    rot = sum(p.root_rotation * w for p, w in poses) / total
    return PoseDefinition(
        name=name, angles=angles, root_offset=offset, root_rotation=rot,
        facing=max(poses, key=lambda pw: pw[1])[0].facing,
    )
