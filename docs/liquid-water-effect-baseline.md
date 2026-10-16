# IZAVEN — liquid-water effect: preservation baseline

Recorded before any redesign work, so the effect can be compared afterwards.
**Nothing in this inventory has been restyled, retimed or recoloured.**

## Where the effect lives

| File | Size | Role |
|---|---|---|
| `assets/liquid-chrome.css` | 7,972 B | The water glass, shimmer, ripple, chrome button, reveals |
| `assets/liquid-chrome.js` | 5,211 B | Transparent↔water-glass header on scroll, scroll reveals, lightbox |
| `assets/cn-ambient.js` | 4,637 B | `CNAmbient` — canvas that samples a product image and glides a colour glow |

Both `liquid-chrome.*` files are linked from `layout/theme.liquid` **on every
page**, directly after `color-palette`.

## The exact values — do not drift from these

### Water glass (`.lc-scrolled`)
```
background:        rgba(210,235,255,0.30)
backdrop-filter:   blur(20px) saturate(1.5) brightness(1.05)
border-bottom:     1px solid rgba(180,220,255,0.45)
box-shadow:        0 1px 0 rgba(255,255,255,.6) inset,
                   0 -1px 0 rgba(255,255,255,.3) inset,
                   0 8px 32px -8px rgba(100,160,255,.12)
```

### Water shimmer (`.lc-scrolled::before`) — `lc-water-shimmer 7s ease-in-out infinite alternate`
Three stacked layers: two blue radial ellipses anchored below the header
(`rgba(160,210,255,.15)`, `rgba(120,190,255,.10)`) over a vertical
`rgba(180,225,255,.12)` wash. Animates opacity `.7 → 1 → .8` with a
±1% horizontal scale.

### Water ripple (`.lc-scrolled::after`) — `lc-ripple 5s ease-in-out infinite`
A 10px blurred band, 110% wide, 6px below the header. The illusion is a
**morphing border-radius**, cycling
`55%/45% → 45%/55% → 60%/40%` with ±1px vertical drift and ±2% scale.

### Off-homepage frosted water
```
background:      rgba(225,240,255,0.80)
backdrop-filter: blur(16px) saturate(1.3)
border-bottom:   1px solid rgba(180,220,255,0.35)
```

### Cart drawer water
`rgba(220,238,255,0.88)` + `blur(18px)`

### Ambient glow (`cn-ambient.js`)
64×40 canvas, 12 radial blobs, samples a 4×4 average of the product image,
boosts saturation ×1.3, mixes 30% toward sand `rgb(200,184,154)`, eases at
`0.06`/frame **and stops the rAF loop once colours settle**. Already cheap.

`prefers-reduced-motion` is already handled throughout — shimmer, ripple,
wipe and reveals all disable. No change needed.

## Defect found: the effect never ran

Both files gate on `.template-index`:

```js
var isHome = document.body.classList.contains('template-index');   // liquid-chrome.js
```
```css
.template-index #header-component { ... }                           /* liquid-chrome.css */
```

Horizon's body was:

```html
<body class="page-width-{{ settings.page_width }} card-hover-effect-{{ settings.card_hover_effect }}">
```

**No `template-index` class exists.** Consequences:

- `isHome` was permanently `false`, so the scroll listener was never attached
- `.lc-scrolled` was therefore never applied to anything
- The water glass, the `lc-water-shimmer` gradient and the `lc-ripple` edge
  **never rendered on any page**
- Every `.template-index` rule was dead
- Only `:not(.template-index)` matched — and it matched everywhere, including
  the homepage, which is the flat frosted blue header currently visible

This is the same root cause as the round-2 header finding: the theme assumed a
template body class that Horizon does not emit.

### Fix applied

`layout/theme.liquid` body tag, in theme `208782328133`:

```html
<body class="page-width-… card-hover-effect-… template-{{ template.name }}">
```

One class. **No colour, timing, keyframe, blur radius or opacity was touched.**
It only lets the author's own code execute. On the homepage `template.name` is
`index`, so `.template-index` now matches as written.

## Expected change after the fix

| Surface | Before | After |
|---|---|---|
| Homepage header, at top | Flat frosted blue | Fully transparent over the hero, white text |
| Homepage header, scrolled >40px | Flat frosted blue | **Water glass + shimmer + ripple**, dark text |
| Other pages | Flat frosted blue | Unchanged |

This is a visible change to the homepage header — it is the effect appearing
for the first time, not a redesign of it.

## Verification still owed

Not render-tested. The sandbox cannot resolve `www.izaven.com` and the Shopify
CDN is blocked, so there is no browser check, no screenshot and no profiling.
Specifically unverified:

- that the shimmer and ripple look as intended once live
- scroll, resize and mobile behaviour
- CPU/GPU cost of the two infinite animations now that they actually run
- whether the glass sections' own `backdrop-filter` layers compound with it

Compare the homepage before and after publishing this draft, on desktop and
on a phone, before going further.
