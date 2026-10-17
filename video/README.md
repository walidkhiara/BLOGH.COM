# IZAVEN logo sting

A 4s seamless loop of the Z mark drawing itself on, built to sit in the
storefront's own palette rather than next to it.

Colours and proportions come from the live Horizon theme
(`config/settings_data.json` → `settings.color_palette`): bone `#F7F6F2`
background, ink `#171717` mark. See `src/brand.ts`.

## Outputs (`out/`)

| File | Use |
|---|---|
| `izaven-sting.mp4` | 1920×1080, mark + wordmark |
| `izaven-stingvertical.mp4` | 1080×1920, Reels / TikTok / Stories |
| `izaven-stingsquare.mp4` | 1080×1080, feed posts |
| `izaven-stingheroloop.mp4/.webm` | 1920×1080, mark only — for the homepage hero video slot, where the header already carries the wordmark |
| `izaven-poster.png` | Still of the settled lockup; use as the hero `poster` so the first paint is not blank |

## How the reveal works

The mark is traced vector artwork (`src/zmark-path.ts`), filled and then
masked by a linear gradient that travels across it. The gradient runs mostly
top-to-bottom with a slight left lead, which is the order a Z is actually
written in, and its edge is feathered so the mark reads as ink arriving
rather than a wipe passing over.

The piece opens and closes on an empty bone field, so frame 120 matches
frame 0 and the loop has no seam.

## Editing

```sh
npm i
npx remotion studio          # preview and tweak
npx remotion render Sting out/izaven-sting.mp4 --codec=h264 --crf=16
```

Timings live in `BEATS` in `src/brand.ts`.

**Note on this container:** Remotion cannot reach its Chrome download host
here, so `remotion.config.ts` points at the preinstalled Playwright
Chromium. On a normal machine you can delete that line.

## Regenerating the traced paths

`src/*-path.ts` are auto-traced from the supplied PNG/WebP artwork with
`potrace`. If the artwork changes, re-trace rather than hand-editing the
path data.
