# InkForge Engine

A local, offline procedural drawing engine that builds manhwa-style fight art
from geometry, skeletons and deterministic drawing rules. No image-generation
models, no image APIs, no cloud services. Every pixel comes from vector
geometry this repository computes.

## Status: Milestone 1 complete (verified)

One reusable character (`kazu`), an articulated 21-bone humanoid skeleton,
named poses, rough-ink SVG rendering, PNG previews, a contact sheet, scene
metadata, and 35 passing tests.

Milestones 2-5 (second character, six-frame punch/block sequence, speed lines
and impact composition, rule-based scene parser, camera/scene export) are not
implemented yet.

## Install and run

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"

# the documented render command
inkforge poses --character kazu --poses guard punch --out output/milestone1 --seed 7
pytest -q
```

Without an install, `PYTHONPATH=src python3 -m inkforge.cli poses ...` works too.

Outputs in `output/milestone1/`: `00_guard.svg/.png`, `01_punch.svg/.png`,
`contact_sheet.png`, `scene.json`. Add `--debug-skeleton` to overlay the
bone rig (clearly labelled debugging geometry, off by default).

## Conventions

* **Units** - 1 world unit reads as ~1 cm; a default adult is ~170 units tall.
* **Axes** - +x right, +y **down** (SVG convention). Origin of a character is
  its pelvis.
* **Angles** - degrees, 0 deg = +x, increasing clockwise on screen.
* **Bones** store an absolute rest angle (character facing right). Poses supply
  per-bone deltas that accumulate down the chain, so rotating a shoulder
  carries the forearm and hand with it.
* **Identity vs pose** - `assets/characters/*.json` holds identity only
  (proportions, hair, face, clothing, line weights, named poses). Posing and
  rendering are read-only on that data; a test asserts the character is byte
  identical after rendering several poses.
* **Determinism** - all ink wobble comes from `rng_for(seed, element_key)`
  (crc32-based, not `hash()`, which is salted per process). Same seed and same
  input give byte-identical SVG.

## Modules

| module | role |
| --- | --- |
| `models/` | Pydantic schemas for characters, skeletons, poses, scenes, camera, style |
| `animation/` | skeleton definition, forward kinematics, pose presets, interpolation, distance/contact checks |
| `characters/` | identity loading from JSON, pose resolution and corrections |
| `renderer/` | rough-ink geometry + SVG painting of a posed character |
| `camera/` | 2D framing helpers |
| `panels/` | SVG/PNG export, contact sheet, scene metadata |
| `parser/` | reserved for Milestone 4 (rule-based scene parser) - empty |

## Known visual limitations (Milestone 1, from inspecting the output)

* The character is stylised and simple: a tank-top torso, bare legs, and flat
  paddle feet. No sleeves, trousers or garment folds yet.
* The face is minimal - two eyes, two brows and a mouth line. It reads at full
  frame size but not as a close-up.
* Limbs have no foreshortening. A punch toward the viewer is drawn at full
  length because the camera is 2D only.
* The camera is a pan + uniform scale transform. `perspective` only
  exaggerates scale by a supplied depth value; there is no vanishing point and
  no correct 3D perspective.
* Black spotting is a fixed-fraction band down one side of each limb, not
  light-direction aware.
* No speed lines, screentone, impact effects or multi-character staging yet
  (Milestone 3).
* The neck reads as a short stub between head and torso in some poses.
