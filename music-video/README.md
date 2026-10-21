# Music video clip

An original, fully animated music video: an anime-style (cel-shaded, ink
outlined) 3D dancer modelled on kiara, on a neon stage,
rendered in 1080p. Nothing here is cut from source footage; the character is
built from scratch and its look lives in `likeness.json`.

The clip is silent. Motion, cuts and light flashes are locked to **120 BPM**
(one bar = 2 s), so a song at 120 BPM drops straight on; for another tempo,
change `BPM` in `scene.js` and re-render.

## Files

- `scene.js`: the character, the choreography, the camera shots and the stage.
  Every frame is a pure function of time, so renders are exact and repeatable.
- `likeness.json`: skin, hair, eyes, outfit colours, height and build. These are
  placeholders until they are matched to reference photos.
- `render.mjs`: steps through the clip in headless Chromium and encodes with ffmpeg.

## Render

```sh
npm install
node render.mjs                       # full clip  -> out/clip-1080p.mp4
node render.mjs --from 24 --to 32     # one section
node render.mjs --stills              # a PNG per shot -> out/stills/
```

Needs Node 18+, ffmpeg and a Chromium (`CHROMIUM=/path/to/chrome` to override).

## Shot list (64 s, 32 bars)

| Time | Bars | Move | Shot |
|---|---|---|---|
| 0:00 | 1-2 | Opening pose | Wide, slow push in |
| 0:04 | 3-6 | Groove (bounce, shoulder roll) | 0:04 wide push, 0:08 face close-up dolly |
| 0:12 | 7-10 | Step-touch with claps | Orbit, medium |
| 0:20 | 11-12 | Body wave | Low angle hero shot |
| 0:24 | 13 | Spin | Overhead |
| 0:26 | 14-17 | Hype, arms up (chorus) | Wide orbit, light wall chases |
| 0:34 | 18-19 | Groove | Face close-up |
| 0:38 | 20-21 | Step-touch | Tracking left to right |
| 0:42 | 22-23 | Body wave | Low orbit |
| 0:46 | 24 | Spin | Overhead |
| 0:48 | 25-28 | Hype (chorus 2) | Crane up from low and wide |
| 0:56 | 29-30 | Step-touch | Medium tracking |
| 1:00 | 31-32 | Final pose | Pull back to wide |
