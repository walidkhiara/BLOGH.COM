"""Character identity loading.

Identity (proportions, hair, face, clothing, line weights, named poses)
lives in assets/characters/*.json and is loaded read-only. Poses are
separate data; rendering a pose never writes back to a character file.
"""
from __future__ import annotations

import json
from pathlib import Path

from ..animation.skeleton import humanoid_skeleton
from ..animation.pose import POSE_PRESETS
from ..models import CharacterDefinition, PoseDefinition, SkeletonDefinition

SKELETONS: dict[str, SkeletonDefinition] = {"humanoid_v1": humanoid_skeleton()}

ASSET_DIR = Path(__file__).resolve().parents[3] / "assets" / "characters"

__all__ = ["ASSET_DIR", "SKELETONS", "load_character", "load_library", "resolve_pose"]


def load_character(path: str | Path) -> CharacterDefinition:
    """Load one identity file. Raises on an unknown skeleton reference."""
    path = Path(path)
    data = json.loads(path.read_text())
    skeleton_name = data.pop("skeleton", "humanoid_v1")
    if skeleton_name not in SKELETONS:
        raise KeyError(
            f"{path.name}: unknown skeleton {skeleton_name!r}; "
            f"available: {sorted(SKELETONS)}"
        )
    data["skeleton"] = SKELETONS[skeleton_name]
    named = data.pop("named_poses", {})
    data["named_poses"] = {
        name: (
            POSE_PRESETS[spec].model_copy(update={"name": name})
            if isinstance(spec, str)
            else PoseDefinition(**spec)
        )
        for name, spec in named.items()
    }
    for name, spec in data["named_poses"].items():
        if isinstance(named.get(name), str) and named[name] not in POSE_PRESETS:
            raise KeyError(f"{path.name}: unknown pose preset {named[name]!r}")
    return CharacterDefinition(**data)


def load_library(directory: str | Path | None = None) -> dict[str, CharacterDefinition]:
    directory = Path(directory) if directory else ASSET_DIR
    library: dict[str, CharacterDefinition] = {}
    for path in sorted(directory.glob("*.json")):
        character = load_character(path)
        library[character.id] = character
    return library


def resolve_pose(character: CharacterDefinition, name: str) -> PoseDefinition:
    """Character-local named pose first, then the global presets."""
    if name in character.named_poses:
        return character.named_poses[name]
    if name in POSE_PRESETS:
        return POSE_PRESETS[name]
    raise KeyError(
        f"character {character.id!r} has no pose {name!r}; "
        f"known: {sorted(set(character.named_poses) | set(POSE_PRESETS))}"
    )
