"""SVG frame assembly."""
from __future__ import annotations

import svgwrite

from ..animation.skeleton import Skin
from ..models import CameraDefinition, CharacterDefinition, RenderStyle
from .character import CharacterPainter

__all__ = ["CharacterPainter", "render_frame"]


def render_frame(
    entities: list[tuple[CharacterDefinition, Skin]],
    camera: CameraDefinition,
    style: RenderStyle,
    *,
    title: str = "inkforge frame",
) -> str:
    """Render one frame to an SVG document string (editable, no rasterising)."""
    dwg = svgwrite.Drawing(size=(camera.width, camera.height), profile="full")
    dwg.viewbox(0, 0, camera.width, camera.height)
    dwg.set_desc(title=title)
    dwg.add(dwg.rect(insert=(0, 0), size=(camera.width, camera.height), fill=style.background))
    for character, skin in entities:
        dwg.add(CharacterPainter(character, skin, camera, style).draw(dwg))
    return '<?xml version="1.0" encoding="utf-8"?>\n' + dwg.tostring()
