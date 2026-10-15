import pytest
from pydantic import ValidationError

from inkforge.animation.skeleton import humanoid_skeleton
from inkforge.models import BoneDefinition, PoseDefinition, SceneDefinition, SkeletonDefinition, ActorPlacement


def _sk(bones):
    return SkeletonDefinition(name="t", bones=tuple(bones))


def test_skeleton_requires_single_root():
    with pytest.raises(ValidationError, match="exactly one root"):
        _sk([BoneDefinition(name="a", length=1), BoneDefinition(name="b", length=1)])


def test_skeleton_rejects_duplicate_names():
    with pytest.raises(ValidationError, match="duplicate bone names"):
        _sk([BoneDefinition(name="a", length=1),
             BoneDefinition(name="a", parent="a", length=1)])


def test_skeleton_rejects_unknown_parent():
    with pytest.raises(ValidationError, match="unknown parent"):
        _sk([BoneDefinition(name="a", length=1),
             BoneDefinition(name="b", parent="ghost", length=1)])


def test_skeleton_rejects_cycle():
    with pytest.raises(ValidationError, match="cycle|root"):
        _sk([BoneDefinition(name="a", parent="b", length=1),
             BoneDefinition(name="b", parent="a", length=1)])


def test_humanoid_skeleton_is_valid_and_ordered():
    sk = humanoid_skeleton()
    order = [b.name for b in sk.chain_order()]
    assert order[0] == "pelvis"
    for bone in sk.bones:
        if bone.parent:
            assert order.index(bone.parent) < order.index(bone.name)


def test_pose_rejects_bad_facing():
    with pytest.raises(ValidationError):
        PoseDefinition(name="p", facing=0)


def test_scene_rejects_duplicate_actors():
    with pytest.raises(ValidationError, match="duplicate character_id"):
        SceneDefinition(
            name="s",
            actors=(ActorPlacement(character_id="a"), ActorPlacement(character_id="a")),
        )


def test_models_are_immutable():
    pose = PoseDefinition(name="p")
    with pytest.raises(ValidationError):
        pose.name = "other"
