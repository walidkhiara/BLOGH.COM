import math

import pytest

from inkforge.animation.pose import POSE_PRESETS, get_preset, interpolate_pose, blend_poses
from inkforge.animation.skeleton import contact, distance, solve_fk
from inkforge.characters import load_library, resolve_pose


def character():
    return load_library()["kazu"]


def test_limbs_stay_attached_in_every_preset():
    c = character()
    for name in POSE_PRESETS:
        skin = solve_fk(c, get_preset(name))
        for bone in c.skeleton.bones:
            if bone.parent:
                assert math.dist(skin[bone.name].start, skin[bone.parent].end) < 1e-9, (
                    f"{bone.name} detached from {bone.parent} in pose {name}"
                )


def test_bone_lengths_match_definition_times_scale():
    c = character()
    skin = solve_fk(c, get_preset("punch_right"))
    for bone in c.skeleton.bones:
        expected = bone.length * c.proportions.scale
        assert skin[bone.name].length == pytest.approx(expected, abs=1e-6)


def test_rotation_propagates_down_the_chain():
    c = character()
    base = solve_fk(c, get_preset("idle"))
    from inkforge.models import PoseDefinition

    lifted = solve_fk(c, PoseDefinition(name="lift", angles={"upper_arm_r": -80.0}))
    assert lifted["hand_r"].end[1] < base["hand_r"].end[1] - 10  # hand moved up


def test_facing_mirrors_horizontally():
    c = character()
    pose = get_preset("punch_right")
    right = solve_fk(c, pose, facing=1)
    left = solve_fk(c, pose, facing=-1)
    assert right["hand_r"].end[0] > 0 > left["hand_r"].end[0]
    assert right["hand_r"].end[1] == pytest.approx(left["hand_r"].end[1])


def test_interpolation_endpoints_and_midpoint():
    a, b = get_preset("guard"), get_preset("punch_right")
    assert interpolate_pose(a, b, 0.0).angles == pytest.approx(
        {k: a.angles.get(k, 0.0) for k in set(a.angles) | set(b.angles)}
    )
    mid = interpolate_pose(a, b, 0.5, ease=False)
    for k in set(a.angles) | set(b.angles):
        want = (a.angles.get(k, 0.0) + b.angles.get(k, 0.0)) / 2
        assert mid.angles[k] == pytest.approx(want)


def test_interpolation_rejects_out_of_range_t():
    a, b = get_preset("guard"), get_preset("block")
    with pytest.raises(ValueError):
        interpolate_pose(a, b, 1.5)


def test_blend_poses_averages():
    a, b = get_preset("guard"), get_preset("block")
    mixed = blend_poses([(a, 1.0), (b, 1.0)])
    for k in set(a.angles) | set(b.angles):
        assert mixed.angles[k] == pytest.approx(
            (a.angles.get(k, 0.0) + b.angles.get(k, 0.0)) / 2
        )


def test_distance_and_contact_helpers():
    c = character()
    a = solve_fk(c, get_preset("punch_right"), origin=(0.0, 0.0))
    b = solve_fk(c, get_preset("block"), origin=(60.0, 0.0), facing=-1)
    d = distance(a, "hand_r", b, "hand_r")
    assert d > 0
    assert contact(a, "hand_r", b, "hand_r", radius=d + 1)
    assert not contact(a, "hand_r", b, "hand_r", radius=d - 1)


def test_poses_are_visually_distinct():
    c = character()
    skins = {n: solve_fk(c, get_preset(n)) for n in ("guard", "punch_right", "recoil")}
    for x, y in (("guard", "punch_right"), ("guard", "recoil"), ("punch_right", "recoil")):
        assert math.dist(skins[x]["hand_r"].end, skins[y]["hand_r"].end) > 15.0
