"""Frame and contact-sheet export."""
from __future__ import annotations

import json
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw

__all__ = ["export_frame", "contact_sheet", "write_metadata"]


def export_frame(svg: str, out_dir: str | Path, stem: str) -> tuple[Path, Path]:
    """Write `stem.svg` (editable) and `stem.png` (preview). Returns both paths."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    svg_path = out_dir / f"{stem}.svg"
    png_path = out_dir / f"{stem}.png"
    svg_path.write_text(svg)
    cairosvg.svg2png(bytestring=svg.encode(), write_to=str(png_path))
    return svg_path, png_path


def contact_sheet(
    png_paths: list[str | Path],
    out_path: str | Path,
    *,
    cols: int = 3,
    cell_width: int = 420,
    pad: int = 14,
    background: str = "#e8e4da",
    labels: list[str] | None = None,
) -> Path:
    """Tile PNG frames into a single sheet image."""
    if not png_paths:
        raise ValueError("contact_sheet needs at least one frame")
    images = [Image.open(p).convert("RGB") for p in png_paths]
    ratio = images[0].height / images[0].width
    cell_h = int(cell_width * ratio)
    thumbs = [im.resize((cell_width, cell_h), Image.LANCZOS) for im in images]
    rows = (len(thumbs) + cols - 1) // cols
    label_h = 22 if labels else 0
    sheet = Image.new(
        "RGB",
        (cols * cell_width + pad * (cols + 1),
         rows * (cell_h + label_h) + pad * (rows + 1)),
        background,
    )
    draw = ImageDraw.Draw(sheet)
    for i, thumb in enumerate(thumbs):
        cx, cy = i % cols, i // cols
        x = pad + cx * (cell_width + pad)
        y = pad + cy * (cell_h + label_h + pad)
        sheet.paste(thumb, (x, y))
        draw.rectangle([x - 1, y - 1, x + cell_width, y + cell_h], outline="#1b1b1b")
        if labels and i < len(labels):
            draw.text((x + 4, y + cell_h + 5), labels[i], fill="#1b1b1b")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    return out_path


def write_metadata(data: dict, out_path: str | Path) -> Path:
    """Write a JSON file sufficient to reproduce the render."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, indent=2, sort_keys=True))
    return out_path
