import re
import xml.etree.ElementTree as ET

from PIL import Image

from inkforge.animation.skeleton import solve_fk
from inkforge.characters import load_library, resolve_pose
from inkforge.models import CameraDefinition, RenderStyle
from inkforge.panels import contact_sheet, export_frame
from inkforge.renderer import render_frame


def frame(seed=7, pose="guard", camera=None):
    c = load_library()["kazu"]
    cam = camera or CameraDefinition(center=(0, 8), scale=5.0, width=760, height=1040)
    skin = solve_fk(c, resolve_pose(c, pose))
    return render_frame([(c, skin)], cam, RenderStyle(seed=seed))


def test_svg_is_well_formed_and_has_geometry():
    svg = frame()
    root = ET.fromstring(svg)
    paths = root.findall(".//{http://www.w3.org/2000/svg}path")
    assert len(paths) >= 10, "frame has suspiciously little geometry"
    assert all(p.get("d") for p in paths)


def test_svg_declares_requested_dimensions():
    svg = frame()
    root = ET.fromstring(svg)
    assert root.get("width") == "760"
    assert root.get("height") == "1040"
    assert root.get("viewBox").replace(",", " ") == "0 0 760 1040"


def test_no_placeholder_rectangles_besides_the_background():
    root = ET.fromstring(frame())
    rects = root.findall(".//{http://www.w3.org/2000/svg}rect")
    assert len(rects) == 1, "only the background may be a plain rectangle"


def test_render_is_reproducible_for_a_fixed_seed():
    assert frame(seed=7) == frame(seed=7)


def test_seed_changes_the_ink_wobble():
    assert frame(seed=7) != frame(seed=99)


def test_poses_produce_different_drawings():
    assert frame(pose="guard") != frame(pose="punch")


def test_png_export_matches_camera_dimensions(tmp_path):
    svg_path, png_path = export_frame(frame(), tmp_path, "f0")
    assert svg_path.exists() and png_path.exists()
    assert svg_path.read_text().startswith("<?xml")
    with Image.open(png_path) as im:
        assert im.size == (760, 1040)


def test_png_is_not_blank(tmp_path):
    _, png_path = export_frame(frame(), tmp_path, "f0")
    with Image.open(png_path).convert("L") as im:
        dark = sum(1 for px in list(im.tobytes()) if px < 80)
    assert dark > 2000, "rendered frame appears to be empty"


def test_contact_sheet_tiles_every_frame(tmp_path):
    pngs = [export_frame(frame(pose=p), tmp_path, p)[1] for p in ("guard", "punch")]
    sheet = contact_sheet(pngs, tmp_path / "sheet.png", cols=2, cell_width=200)
    with Image.open(sheet) as im:
        assert im.width > 400 and im.height > 200
