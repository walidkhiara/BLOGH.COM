# BLOGH Performance — Shopify theme

An Online Store 2.0 theme for a performance-apparel brand: edge-to-edge campaign
photography, square geometry, a heavy condensed type system and restrained motion.
Everything shoppable runs on the store's real products, variants, inventory, cart and
checkout. No products are hardcoded.

- Design system: [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)
- Reference notes (the reference site could not be inspected): [`docs/REFERENCE-NOTES.md`](docs/REFERENCE-NOTES.md)
- Test report: [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md)
- Screenshots (local harness, stand-in images): [`docs/screenshots/`](docs/screenshots)

## Structure

```
layout/theme.liquid            page shell, SEO meta, theme JS config
config/settings_schema.json    brand, colours, type, cards, cart, social, motion
templates/*.json               index, collection, product, cart, search, page, blog, article,
                               list-collections, 404, customers/*
sections/
  header-group.json            announcement bar + header (mega menu, mobile drawer)
  footer-group.json            newsletter + footer
  hero-banner                  campaign hero: desktop + mobile image, focal point, position, shade
  collection-tiles             2–4 edge-to-edge category tiles
  featured-collection          carousel or grid from any collection
  campaign-banner              full-bleed photo, or photo + panel split with angled edge
  editorial                    asymmetric two-image story
  newsletter                   Shopify customer form
  main-collection              banner, sticky toolbar, filter/sort drawer, grid, load more
  main-product                 gallery, variant picker, buy box, size guide, accordions (blocks)
  related-products             Shopify product recommendations
  main-cart / cart-drawer      cart page and drawer (Section Rendering API)
  predictive-search            rendered by /search/suggest
  main-search, main-page, main-blog, main-article, main-list-collections, main-404, main-customer
  hero-3d                      the original WebGL hero (kept, still available in the editor)
snippets/                      product-card, price, cart-line, facets, active-filters,
                               pagination, search-modal, icon, logo, meta-tags, theme-styles
assets/base.css, theme.js      all styling and behaviour (no dependencies)
tools/harness/                 local renderer + API emulator used for testing (not uploaded)
```

## Preview and upload

**Option A — Shopify CLI (recommended)**

```sh
npm i -g @shopify/cli
shopify theme check                         # lint
shopify theme dev --store your-store.myshopify.com   # live preview with hot reload
shopify theme push --unpublished --store your-store.myshopify.com
```

**Option B — ZIP upload:** build `blogh-theme.zip` from the theme folders only:

```sh
zip -r blogh-theme.zip assets config layout locales sections snippets templates
```

Then go to Online Store → Themes → Add theme → Upload zip file. Publish when ready.

## Setting up the store (one time)

1. **Menus** (Online Store → Navigation):
   - `main-menu`, three levels: *Women* → *Clothing* → *Leggings*. Second-level items
     become mega-menu columns (max 4).
   - `footer` for the help column.
   - Optionally a legal menu and a mobile utility menu (set in the header and footer sections).
2. **Filters:** install *Search & Discovery*, then add Size, Colour, Availability, Price,
   Product type. The filter drawer shows exactly what's configured there.
3. **Colour swatches:** variant options named *Color* or *Colour* render as swatches
   (configurable in *Theme settings → Product cards*). Swatch colour comes from Shopify's
   option swatches if set, otherwise the variant image, otherwise the colour name.
   Assign a variant image to each colour so the gallery and cards switch.
4. **Badges:** tag products `new` for the NEW badge. SALE is automatic when the
   compare-at price is higher than the price. SOLD OUT is automatic.
5. **Size guide:** create a page with a size table and pick it in Product → Variant picker block.
6. **Customise the homepage:** pick the hero's desktop and mobile images (set the focal
   point in the image picker), choose collections for the tiles and product rows, and add
   images to the campaign, editorial and mega-menu blocks. Every section can be
   reordered, hidden or duplicated.

## Photography brief

All photo slots are editor settings. Until you fill them, they render a designed dark
panel with the slash, not a broken image. For the intended look:
- **Hero:** 2600×1500 or larger, subject in the right ⅔, clean negative space bottom-left.
  Add a separate 1200×1800 portrait crop for mobile.
- **Tiles:** 4:5, subject centred-high, bottom third quiet for the title.
- **Product:** 4:5, one consistent background (light grey), front, back, detail and on-model.
- **Campaign split:** photo at least 1600px wide, subject away from the angled edge.

Use photography you own or have licensed.

## Status

Implemented: everything listed in the structure above. Validated with Theme Check, a
local liquidjs harness, and 29 scripted interaction tests. See the test report for
what was **not** verified on a real Shopify store.
