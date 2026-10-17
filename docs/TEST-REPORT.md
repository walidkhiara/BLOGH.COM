# Test report

Date: 2026-10-17. **Nothing was tested on Shopify.** No store credentials were available
in this session, so the theme was not uploaded or previewed on Shopify.

## 1. Shopify Theme Check
`shopify theme check` (Shopify CLI): **59 files inspected, no offenses.**

## 2. Local harness (tools/harness)
`server.mjs` renders this repo's Liquid with liquidjs against a 30-product mock catalogue
(colour × size variants, sale prices, one sold-out product, unavailable sizes). It emulates
`/cart/add.js`, `/cart/change.js`, `/cart.js`, Section Rendering (`section_id`, `sections`),
`/search/suggest` and `/recommendations/products` from Shopify's documented contracts.
It is not Shopify. Liquid edge cases, real filter data from Search & Discovery,
markets/currency and checkout are not covered.

Images in the screenshots are flat generated stand-ins (`make-images.py`), used to judge
layout, crop and proportion. They are not the store's photography.

### Layout (Chromium, overflow-x measured)
| Page | 1440×900 | 768×1024 | 390×844 | 360×800 |
|---|---|---|---|---|
| Home | ok, 0px | — | ok, 0px | ok, 0px |
| Collection | ok, 0px | ok, 0px | ok, 0px | — |
| Product | ok, 0px | — | ok, 0px | — |

Fixed after the first visual pass: category tiles were too tall at desktop (now 4:5
capped at 86svh), the hero headline broke into three lines with an orphan, the delivery
list lost its padding (selector specificity), swatch outlines were clipped, and the
mega-menu fallback label was duplicated. Collection snippet scope was also corrected:
`section` isn't available inside `render`.

### Interactions (29/29 pass, 0 console errors)
Mega menu hover/leave/keyboard/Escape · search open, focus, product suggestions, empty
state, Escape · unavailable size disables add · colour switch updates label, URL and
availability · add to cart opens drawer with the correct line and quantity · header count ·
drawer quantity + and subtotal · Escape closes drawer · sold-out product state · quick-add
from card · sort by price · colour filter updates results and URL, drawer stays open ·
active chip · clear all · load more (24 → 30) · cart page removal to empty state · mobile
menu drawer · mobile filter drawer.

Reproduce: `cd tools/harness && npm i && npm run images && npm start`, then
`CHROME_PATH=/path/to/chrome npm test` in a second shell.

## 3. Not verified
- Anything on a real Shopify store: Liquid on Shopify's renderer, Search & Discovery
  filters, predictive search ranking, product recommendations, Markets/currency
  formatting, dynamic checkout buttons, checkout itself, customer account templates,
  newsletter form submission, localization form.
- Theme editor behaviour: settings, reordering, `shopify:section:load` re-init.
- Font handles `archivo_n7` / `inter_n4` resolving in the Shopify font library. If either
  fails, pick any font in *Theme settings → Typography*.
- Real photography crops and focal points.
- Tablet layout of home and PDP, and non-Chromium browsers (Safari/Firefox).
- Visual comparison with eu.gymshark.com: not possible, the site was blocked.
