import json

import pytest

from inkforge.animation.pose import get_preset
from inkforge.animation.skeleton import solve_fk
from inkforge.characters import load_character, load_library, resolve_pose


def test_library_loads_kazu():
    lib = load_library()
    assert "kazu" in lib
    assert lib["kazu"].display_name == "Kazu"


def test_unknown_skeleton_reference_is_rejected(tmp_path):
    path = tmp_path / "broken.json"
    path.write_text(json.dumps({"id": "x", "display_name": "X", "skeleton": "dragon_v9"}))
    with pytest.raises(KeyError, match="unknown skeleton"):
        load_character(path)


def test_unknown_pose_reference_is_rejected():
    c = load_library()["kazu"]
    with pytest.raises(KeyError, match="has no pose"):
        resolve_pose(c, "backflip")


def test_named_pose_resolution_prefers_character_poses():
    c = load_library()["kazu"]
    assert resolve_pose(c, "punch").name == "punch"
    assert resolve_pose(c, "block").name == "block"  # falls back to global preset


def test_pose_corrections_apply_without_touching_identity():
    c = load_library()["kazu"]
    before = c.model_dump()
    solve_fk(c, resolve_pose(c, "punch"))
    solve_fk(c, resolve_pose(c, "guard"))
    assert c.model_dump() == before, "rendering a pose mutated the character identity"


def test_identity_is_stable_across_poses():
    c = load_library()["kazu"]
    skins = [solve_fk(c, get_preset(n)) for n in ("guard", "punch_right", "recoil")]
    for skin in skins:
        # proportions come from identity, so every pose must agree on them
        assert skin["thigh_r"].length == pytest.approx(skins[0]["thigh_r"].length)
        assert skin["head"].length == pytest.approx(skins[0]["head"].length)
