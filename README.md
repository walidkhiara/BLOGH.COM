# 3D Hero section for Shopify

An interactive WebGL hero (three.js) built as a drop-in Shopify theme section,
tuned for a digital-products store.

## What it does

- Renders a chrome figure on a dark stage, lit with an HDR room environment.
- Follows the pointer (parallax on the stage and camera), auto-rotates slowly,
  leans in when a CTA is hovered, and pulses when the cart updates.
- Drifting tiles orbit the figure to stand in for the "product" a digital store
  has no physical shot of.
- Respects `prefers-reduced-motion` and only renders while on screen.
- Accepts your own `.glb` model — the built-in figure is just the fallback.

## Install

1. Online Store → Themes → … → **Edit code**.
2. Upload `assets/hero-3d.js` and `assets/hero-3d.css` under **Assets**.
3. Create `sections/hero-3d.liquid` and paste in this repo's copy.
4. Save, then **Customize** → **Add section** → **3D hero**.

Or with the Shopify CLI, from a theme checkout:

```sh
cp assets/hero-3d.* <theme>/assets/
cp sections/hero-3d.liquid <theme>/sections/
shopify theme dev
```

## Settings

Heading / text / eyebrow, two buttons, a featured product (its URL and price
feed the primary button), background / text / accent colours, height, corner
radius, auto-rotate, and up to four badge blocks.

**Custom model:** Content → Files → upload a `.glb`, copy its URL, paste it into
*Custom .glb model URL*. Keep it under ~5 MB and Draco-compress it if you can —
it is fetched on every page view. If it fails to load the built-in figure stays.

## Cart reactions

The scene pulses on `cart:updated` or `cart:refresh`, which Dawn-family themes
dispatch. On a theme that does not, fire it yourself after an add-to-cart:

```js
document.dispatchEvent(new CustomEvent('hero3d:pulse'));
```

## Local preview

Three.js is loaded as an ES module, so open `preview.html` over HTTP, not
`file://`:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000/preview.html
```
