from PIL import Image

from inkforge.cli import main


def test_poses_command_exports_everything(tmp_path):
    out = tmp_path / "m1"
    assert main(["poses", "--out", str(out), "--poses", "guard", "punch", "--seed", "7"]) == 0
    for stem in ("00_guard", "01_punch"):
        assert (out / f"{stem}.svg").exists()
        assert (out / f"{stem}.png").exists()
    assert (out / "contact_sheet.png").exists()
    assert (out / "scene.json").exists()


def test_rendering_is_reproducible_end_to_end(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    main(["poses", "--out", str(a), "--seed", "11"])
    main(["poses", "--out", str(b), "--seed", "11"])
    assert (a / "00_guard.svg").read_text() == (b / "00_guard.svg").read_text()


def test_unknown_character_fails_loudly(tmp_path):
    import pytest

    with pytest.raises(SystemExit, match="unknown character"):
        main(["poses", "--character", "nobody", "--out", str(tmp_path)])
