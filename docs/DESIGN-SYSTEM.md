# BLOGH design system

Original identity for a performance-apparel store. Tokens are starting values chosen
for this brief, **not** measurements of any reference site. All live in
`assets/base.css` (`:root`) or are generated from theme settings in
`snippets/theme-styles.liquid`.

## Brand
- **Wordmark:** `BLOGH` in the heading face at weight 900 with a sheared accent slash
  (`snippets/logo.liquid`). Replace with an uploaded logo in *Theme settings → Brand*.
- **The slash:** the single angular motif. It's used for eyebrows (`.slash`), the
  split-banner photo edge, the hero fallback and the mega-menu fallback. Nowhere else.

## Colour (theme settings → Colors)
| Token | Default | Use |
|---|---|---|
| `--color-bg` | `#ffffff` | Page |
| `--color-text` | `#0b0b0c` | Text, primary buttons, footer |
| `--color-surface` | `#f2f2f2` | Image wells, cart aside |
| `--color-muted` | `#6e6e73` | Secondary text |
| `--color-border` | `#e3e3e3` | Hairlines only |
| `--color-accent` | `#d7ff3a` | NEW badge, slash, one CTA style. Use sparingly |
| `--color-sale` | `#c8102e` | Sale price + badge |

No gradients except scrims behind text on photography (bottom- or side-weighted, strength set per section).

## Typography
- Heading: **Archivo** (Shopify font library, weight from setting, default 800), uppercase.
- Body: **Inter** 400/700.

| Class | Size | Line | Tracking |
|---|---|---|---|
| `.h-display` (hero) | `clamp(3rem, 8.4vw, 8.5rem)` | 0.88 | −0.055em |
| `.h-xl` (campaign, collection) | `clamp(2.25rem, 5.2vw, 5rem)` | 0.92 | −0.045em |
| `.h-lg` (section titles, PDP title) | `clamp(1.5rem, 2.6vw, 2.5rem)` | 1 | −0.035em |
| `.h-md` | `clamp(1.125rem, 1.4vw, 1.375rem)` | 1.1 | −0.02em |
| `.eyebrow` | 12px bold caps | 1 | 0.14em |
| Buttons, nav | 13px bold caps | 1 | 0.06–0.08em |
| Card title / meta / price | 14 bold / 13 muted / 14 | 1.3 | — |

Hero and campaign headings are left- or right-aligned to an image edge. Only grid
headings may be centred (a setting).

## Geometry and layout
- **Square corners everywhere.** Radius only on colour dots, the cart count and spinners.
- Max width `1600px` (setting); gutter `clamp(16px, 2.6vw, 40px)`.
- Photographic sections (hero, tiles, campaign banners, collection hero) run edge to edge.
- Split campaign is golden-ratio (`1.618fr / 1fr`) with an optional 12% angled photo edge.
- Editorial is asymmetric (`1.15fr / 0.85fr`), alternating sides.
- Product grid: 2 cols < 750px, 3 cols < 1200px, 4 cols (setting 3–5). Column gap 4px
  mobile / 8px desktop, row gap 28 / 40px. Carousels show 2.25 / 3.2 / 4 cards.
- Card image ratio 4:5 (setting: 3:4, 1:1). No card backgrounds, borders or shadows.
- Breakpoints: 750px (tablet), 990px (desktop nav, two-column PDP), 1200px (wide grid).
- Header 64px / 72px; announcement bar 34px; control height 48px; PDP add button 56px.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. Section spacing is set per section.

## Motion
| Token | Value | Used for |
|---|---|---|
| `--motion-fast` | 160ms | Colour/opacity on controls |
| `--motion-standard` | 260ms | Mega menu, underlines, quick-add reveal |
| `--motion-slow` | 420ms | Drawers, search panel, header hide |
| `--motion-image` | 900ms | Image hover scale (1.025–1.035) |
| `--ease-standard` | `cubic-bezier(.22,1,.36,1)` | Default |
| `--ease-enter` | `cubic-bezier(.16,1,.3,1)` | Panels and reveals entering |

- Hero: the image settles from 1.04 → 1 scale over 1.6s, and the copy rises 28px with an 80ms stagger.
- Scroll reveal on editorial and campaign text only (not product cards). Elements already
  on screen are never hidden, and nothing is hidden without JS.
- The header hides on scroll down and returns on scroll up. Sticky toolbars follow it.
- `prefers-reduced-motion` turns all of this off. Only transform and opacity are animated.

## Components
Buttons (`.btn`, `--light`, `--outline`, `--outline-light`, `--accent`, `--tall`, `--block`;
hover inverts, arrow nudges 4px, `aria-busy` spinner, disabled state). Product card
(`snippets/product-card.liquid`). Price (`snippets/price.liquid`). Drawer + overlay.
Accordion. Modal. Chips. Option buttons and image swatches.
