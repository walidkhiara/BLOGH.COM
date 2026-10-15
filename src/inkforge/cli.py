"""InkForge command line entry point."""
from __future__ import annotations

import argparse
from pathlib import Path

from . import __version__
from .animation.skeleton import solve_fk
from .characters import load_library, resolve_pose
from .models import CameraDefinition, RenderStyle
from .panels import contact_sheet, export_frame, write_metadata
from .renderer import render_frame


def cmd_poses(args: argparse.Namespace) -> int:
    """Milestone 1: render one character in several named poses."""
    library = load_library(args.characters)
    if args.character not in library:
        raise SystemExit(
            f"unknown character {args.character!r}; available: {sorted(library)}"
        )
    character = library[args.character]
    camera = CameraDefinition(
        center=(0.0, 8.0), scale=args.scale, width=args.width, height=args.height
    )
    style = RenderStyle(
        seed=args.seed, debug_skeleton=args.debug_skeleton, shadows=not args.no_shadows
    )
    out_dir = Path(args.out)
    pngs: list[Path] = []
    for i, pose_name in enumerate(args.poses):
        pose = resolve_pose(character, pose_name)
        skin = solve_fk(character, pose, origin=(0.0, 0.0))
        svg = render_frame(
            [(character, skin)], camera, style,
            title=f"{character.display_name} / {pose_name}",
        )
        svg_path, png_path = export_frame(svg, out_dir, f"{i:02d}_{pose_name}")
        pngs.append(png_path)
        print(f"wrote {svg_path} and {png_path}")

    sheet = contact_sheet(
        list(pngs), out_dir / "contact_sheet.png",
        cols=min(3, len(pngs)), labels=list(args.poses),
    )
    print(f"wrote {sheet}")
    meta = write_metadata(
        {
            "inkforge_version": __version__,
            "command": "poses",
            "character": character.id,
            "poses": list(args.poses),
            "seed": args.seed,
            "camera": camera.model_dump(),
            "style": style.model_dump(),
        },
        out_dir / "scene.json",
    )
    print(f"wrote {meta}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="inkforge", description=__doc__)
    parser.add_argument("--version", action="version", version=__version__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("poses", help="render one character in named poses")
    p.add_argument("--character", default="kazu")
    p.add_argument("--poses", nargs="+", default=["guard", "punch"])
    p.add_argument("--out", default="output/milestone1")
    p.add_argument("--characters", default=None, help="character asset directory")
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--scale", type=float, default=5.0)
    p.add_argument("--width", type=int, default=760)
    p.add_argument("--height", type=int, default=1040)
    p.add_argument("--debug-skeleton", action="store_true")
    p.add_argument("--no-shadows", action="store_true")
    p.set_defaults(func=cmd_poses)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
