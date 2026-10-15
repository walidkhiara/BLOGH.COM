"""2D camera helpers.

LIMITATIONS (deliberate, documented):
  * The camera is a 2D similarity transform: pan + uniform scale only.
  * `CameraDefinition.perspective` scales a drawable by a caller-supplied
    depth value. It is an artistic exaggeration, not a perspective
    projection: there is no vanishing point and no correct foreshortening.
  * There is no rotation and no lens distortion yet.
"""
from __future__ import annotations

from ..models import CameraDefinition

__all__ = ["CameraDefinition", "frame_on", "close_up"]


def frame_on(point: tuple[float, float], scale: float, base: CameraDefinition) -> CameraDefinition:
    """Re-centre the camera on a world point at a new scale."""
    return base.model_copy(update={"center": point, "scale": scale})


def close_up(point: tuple[float, float], base: CameraDefinition, zoom: float = 2.4) -> CameraDefinition:
    """Zoomed composition centred on an impact point."""
    return frame_on(point, base.scale * zoom, base)
