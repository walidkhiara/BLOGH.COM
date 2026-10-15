# IZAVEN — Shopify store audit

**Audited:** 2026-10-14
**Store:** izaven.com (`110515290437`) — Shopify **Horizon** theme + custom "glass" sections
**Working theme:** `gid://shopify/OnlineStoreTheme/208652730693` (unpublished duplicate)
**Live theme at time of audit:** `208651944261`

## How this audit was produced — and its limits

Everything below comes from **static analysis of the theme source and the Admin API**.

**Nothing was visually verified.** The sandbox cannot resolve `www.izaven.com`
(DNS `ENOTFOUND`) and the network policy blocks `cdn.shopify.com`. So there was:

- no browser rendering, no screenshots, no responsive testing
- no Lighthouse / Core Web Vitals measurement
- no click-through test of add-to-cart, variant selection, or checkout
- no inspection of the product photography itself

No performance score or visual-regression claim in this document would be
trustworthy, so none is made.

---

## Architecture

Stock **Horizon** (`blocks/`, `base.css`, `AGENTS.md`, Online Store 2.0 JSON
templates) with a parallel set of bespoke sections layered on top:

| Custom section | Purpose | Size |
|---|---|---|
| `hero-video-glass` | Homepage: hero + category rows | 16 KB |
| `product-glass` | Entire PDP incl. its own cart drawer | 56 KB |
| `collection-glass` | Entire collection page incl. own nav | 12 KB |
| `product-main-glass`, `collection-grid-glass`, `cart-drawer-glass`, `cn-*` | supporting | — |

**The core structural problem:** these sections re-implement the header, cart
drawer, product form and collection grid instead of using Horizon's own
(`product-information`, `buy-buttons`, `variant-picker`, `cart-drawer`). The
store therefore runs two parallel commerce UIs, and the Horizon one is switched
off. That is the root cause of most findings below.

---

## Findings by severity

### Critical

| # | Finding | Evidence | Status |
|---|---|---|---|
| C1 | **"Free shipping over $90" is false.** No such rate exists. US rates are $8.79+ (Printful) / $3.99+ (Trendsi). The only free threshold is **200 PLN, Poland-only**. | `deliveryProfiles` query | **Fixed** (claim hidden) |
| C2 | **"30-day returns" advertised with no refund policy published.** Only a Privacy Policy exists. | `shopPolicies` | **Fixed** (claim hidden) |
| C3 | **"Delivery in 7–14 days" unverified.** Printful zones are literally named *"Standard Delivery 12-35 business days"*; POD production is additional. | `deliveryProfiles` | **Fixed** (claim hidden) |
| C4 | **"ClothingNow" branding on live product + collection pages.** | `templates/*.json`, `collection-glass.liquid` | **Fixed** in templates; schema default remains |
| C5 | **Horizon header disabled store-wide** (`"disabled": true`) — no real nav, no search, no cart icon, no mobile menu, no market selector on most pages. | `sections/header-group.json` | **Documented** — not flipped (see Risks) |
| C6 | **"Best Seller" badge on a store with 0 orders** — fabricated trust signal. | `templates/product.json` | **Fixed** (`show_badge: false`) |

### High

| # | Finding | Status |
|---|---|---|
| H1 | 6 of 7 collections are **empty**; 1 product in the entire catalogue. | Owner action |
| H2 | All 9 product images had **empty `alt`**. | **Fixed** via API |
| H3 | Product `vendor` was **"Printify"** — shown as the brand on the PDP. | **Fixed** → `IZAVEN` |
| H4 | Hardcoded hero copy *"Find your outfit" / "Premium clothes"* — generic, not editable. | **Fixed** — editable + rewritten |
| H5 | Category rows hardcoded 5 collection headings in Liquid; renaming in admin did not propagate. | **Fixed** — editor blocks + live `collection.title` |
| H6 | No logo and no favicon configured (`logo: null`, `favicon: null`). | Owner action |
| H7 | **Four competing dropship/POD apps** have shipping profiles: Printify (product vendor), Printful, Trendsi, AutoDS, Zendrop. | Owner action |

### Medium

| # | Finding | Status |
|---|---|---|
| M1 | **Two conflicting palettes**: Horizon `#F7F6F2`/`#171717` vs glass sections' warm sand `#f5f0e8`/`#c8b89a`/`#1e1a16`. Neither matches the requested black / charcoal / off-white / crimson direction. | Not done — see Risks |
| M2 | No search entry point anywhere. | Partly fixed (homepage) |
| M3 | Collections have no descriptions and no images. | Owner action |
| M4 | Product description contains Printify boilerplate *"Available with printed or embroidered decoration options"*, contradicting the title's "Embroidered". | Owner action |
| M5 | Footer has no navigation menu — only copyright, policy list, social, email signup. | Owner action |
| M6 | `snippets/cn-home-rows.liquid` is unused dead code. | Low |
| M7 | PDP "Complete the look" pulls from `collections.all` (arbitrary), not related products. | Not done |

### Accessibility / SEO

| # | Finding | Status |
|---|---|---|
| A1 | Image `alt` missing throughout. | **Fixed** for product media |
| A2 | Hero headline was a `<p>`, not `<h1>`. | **Fixed** |
| A3 | No `:focus-visible` styles on homepage nav pills / CTA. | **Fixed** |
| A4 | No `prefers-reduced-motion` handling on the hero animations. | **Fixed** |
| A5 | Decorative second headline announced to screen readers. | **Fixed** (`aria-hidden`) |
| A6 | `layout/theme.liquid` and `snippets/meta-tags.liquid` are stock Horizon — canonical, OG and title handling are correct. | OK, no change |
| A7 | PDP emits `{{ product | structured_data }}` — native Shopify, accurate. | OK, no change |

---

## Changes made (theme `208652730693`, unpublished)

| File | Change |
|---|---|
| `templates/index.json` | Hero copy rewritten; category rows converted to 5 editor blocks |
| `templates/collection.json` | `brand_name` → IZAVEN |
| `templates/product.json` | `brand_name` → IZAVEN; badge off; claims guard added |
| `sections/hero-video-glass.liquid` | Rewritten: editable copy, `<h1>`, search + cart in nav, dynamic collection blocks, focus states, reduced-motion |
| `sections/product-claims-guard.liquid` | **New** — hides the three unsupported shipping/returns claims |
| `sections/product-gallery-polish.liquid` | (earlier) gallery quality + lightbox |

Via Admin API (applies to all themes — this is store data, not theme code):
- 9 product images given descriptive `alt` text
- Product vendor `Printify` → `IZAVEN`

---

## Risks / deliberately NOT done

**Re-enabling the Horizon header (C5).** This is the single biggest conversion
gap, but flipping `disabled: false` would put Horizon's header *and* the glass
sections' own navs on the same page, and two cart systems (Horizon's
`cart-drawer` + `product-glass`'s `cn-drw`) side by side. Resolving that
properly means removing the in-section navs from `product-glass` (56 KB) and
`collection-glass`, then verifying the cart still works — which cannot be
verified from this environment. Doing it blind risked breaking a working
purchase flow.

**Full repalette to black / charcoal / crimson (M1).** The glass sections carry
hardcoded hex values across ~5 files including the 56 KB PDP. Repainting only
the homepage would make the store *more* inconsistent, not less. This needs to
be done across all surfaces in one pass, with visual checking.

---

## Owner action checklist (priority order)

1. **Publish a Refund policy and a Shipping policy.** Three live claims were
   removed because nothing backed them. Settings → Policies.
2. **Decide the real shipping offer** and create the rate. If you want
   "free over $X" for the US, it must exist as a rate.
3. **Fill or delete the 6 empty collections.** The homepage silently skips
   empty ones, so right now only HOODIES renders.
4. **Upload a logo and favicon.** Settings → Brand; then set it on the hero
   section too.
5. **Resolve the fulfilment stack** — Printify, Printful, Trendsi, AutoDS and
   Zendrop all have shipping profiles. Keep one.
6. **Confirm the hoodie is embroidered or printed**, and remove the
   contradictory Printify boilerplate line from the description.
7. **Add real garment measurements** — the PDP size guide currently shows a
   generic chart that was not verified against this product.
8. Add Shipping / Returns / FAQ pages and a footer menu linking to them.
9. Decide on the header rebuild (C5) and the repalette (M1).

## Preview and publish

Preview: Admin → Online Store → Themes → the duplicate → **Preview**.
Check the homepage, a collection page and the hoodie PDP on desktop and phone.
Publish only after that review. **Nothing has been published by this audit.**

---

# Round 2 — further fixes

**Note:** midway through, theme `208652730693` was **published** (it is now live,
carrying all round-1 fixes). Writes to the live theme are blocked, so a new
draft was created: **`IZAVEN working draft` (`208654926149`)**, duplicated from
the live theme. Round-2 work is in that draft.

## Additional defects found and fixed

| # | Defect | Evidence | Fix |
|---|---|---|---|
| R1 | **Pagination never showed the current page number.** `part.title == paginate.current_page` compares a string to an integer, which is always false in Liquid, so the active page fell through to the `else` branch and rendered as `…`. | `collection-glass.liquid` | Discriminate on the ellipsis instead |
| R2 | **`/cart`, `/search`, `/404`, `/pages/contact`, blog and gift-card pages had no header at all** — no menu, no search, no cart, no way back. Customers landing there were stranded. | `header-group.json` `disabled: true` + those templates carry no glass nav | Header enabled; hidden only where a glass nav exists |
| R3 | **The header-hiding CSS never worked.** `hero-video-glass` used `.template-index #header-group`, but Horizon's `<body>` carries only `page-width-*` and `card-hover-effect-*` — there is no template class, so the rule matched nothing. | `layout/theme.liquid` body tag | Replaced with `body:has(.fvh / .cg / .cn-pdp)`, the pattern the theme already uses |
| R4 | **Five placeholder social links in the footer** pointing at bare platform homepages (`facebook.com/`, `instagram.com/`, `youtube.com/`, `tiktok.com/`, `x.com/`) — not IZAVEN accounts. | `footer-group.json` | Block removed; re-add in the editor when real profiles exist |
| R5 | **Size guide omits half the sizes on sale.** Generic XS–XL body chart, but the hoodie sells S–5XL, so 2XL/3XL/4XL/5XL have no measurements — and the chart was never measured from this garment. | `product-glass.liquid` vs product options | Hidden by the claims guard |
| R6 | `brand_name` schema default still read "ClothingNow" (3 occurrences). | `collection-glass.liquid` | → IZAVEN |
| R7 | No search entry point on the collection page. | `collection-glass.liquid` | Search link added to nav |
| R8 | Autoplaying decorative banner announced to screen readers; nav links had no focus ring. | `collection-glass.liquid` | `aria-hidden` + `:focus-visible` |

## Files changed in round 2

| File | Change |
|---|---|
| `sections/header-group.json` | Header enabled (Shopify normalises `disabled: false` to absent) |
| `snippets/izaven-header-visibility.liquid` | **New** — hides the header only where a glass nav exists |
| `layout/theme.liquid` | Renders the snippet above |
| `sections/collection-glass.liquid` | Pagination fix, search link, IZAVEN, a11y |
| `sections/product-claims-guard.liquid` | Also hides the incomplete size guide |
| `sections/footer-group.json` | Placeholder social block removed |

## Verified

- `templates/product.json`, `collection.json`, `index.json` re-read from the
  draft — all read `IZAVEN`, badge off, claims guard wired in, 5 hero blocks.
- `header-group.json` re-read — `disabled` key gone, i.e. enabled.
- Theme-wide grep for `ClothingNow`, demo copy, placeholder URLs, `lorem`,
  fake review counts — **0 hits** in the draft.
- All edited JSON parses; all Liquid schemas parse.

**Still not visually verified** — the sandbox cannot reach the storefront. The
header change in particular (R2/R3) alters every page's chrome and must be
checked in preview before publishing.

## What remains genuinely outside my reach

These are not refusals — they need data or decisions only you have:

1. Refund / shipping / ToS policies — writing legal terms for you would be inventing them.
2. Real shipping rates behind any offer you want to advertise.
3. Products for the 6 empty collections.
4. A logo and favicon file.
5. Which of Printify / Printful / Trendsi / AutoDS / Zendrop you actually use.
6. Whether the hoodie is embroidered or printed.
7. Real garment measurements per size.
8. The brand repalette (needs visual iteration).

---

# Round 3 — delivery tracking + delivery estimate

Theme `208654926149` ("IZAVEN working draft") was **published** mid-round and is
now live with the round-2 fixes. Round 3 is in a new draft:
**`IZAVEN delivery draft` (`208657318213`)**.

## What was built

### 1. Order tracking page — `/pages/track-your-order`

`sections/order-tracking.liquid` + `templates/page.tracking.json`, and the page
itself created in Shopify (`Page/730640154949`), published, template `tracking`.

Three routes to a parcel, all native — no app, no API key:

| Route | Who it serves | How it works |
|---|---|---|
| Tracking number → carrier | Anyone, including guests | Redirects to the carrier's own tracking page. 10 carriers incl. USPS, UPS, FedEx, DHL, Canada Post, Royal Mail, Evri, Poczta Polska, InPost, plus a 17track "not sure" fallback |
| Account orders | Signed-in customers | Links to Shopify's hosted account page, which shows the tracking Printful/Printify push into the fulfilment |
| Shipping email | Guests | Explains the "Track your order" button — that URL carries a token and is the only tokenless-free route |

Client-side validation: empty input and malformed numbers get an inline,
`aria-live` error; the field gets `aria-invalid`; opens in a new tab with
`noopener`.

**Why there is no "order number + email" lookup form:** storefront Liquid
cannot read an arbitrary order. That lookup needs an authenticated Admin API
call behind a Shopify App Proxy, i.e. a hosted app. Doing it from theme JS
would require shipping an API token to the browser.

### 2. Delivery estimate on the product page

`sections/delivery-estimate.liquid`, wired into `templates/product.json`.

- Computes `production days + transit days` in **business days** (weekends
  skipped), the way Printful and Printify quote.
- Resolves the buyer's region from `localization.country.iso_code`
  (US / CA / UK / EU / rest of world) and uses that region's figures.
- Renders real calendar dates via `toLocaleDateString`, with the Liquid-rendered
  "X–Y business days" as a no-JS fallback.
- Honours a daily cut-off hour: past it, production starts the next business day.
- The PDP is one large custom section, so a template section would land at the
  page bottom. The script relocates the estimate next to the buy button
  (`.cn-pdp .cn-trust`).

**A region renders nothing until its transit days are set**, so the page cannot
invent a promise — the same rule as the claims guard.

### Why this is not a live Printful feed

Liquid cannot make server-side HTTP calls, and a Printful/Printify API key
placed in theme JavaScript would be published to every visitor. A live feed
needs an app proxy. The section instead uses figures you enter from the
provider dashboard, and does the per-market date maths itself.

### Pre-filled vs blank

| Region | Transit | Source |
|---|---|---|
| Europe (27 countries) | 12–35 business days | Your own Printful profile names that zone *"Standard Delivery 12-35 business days"* |
| United Kingdom | 12–35 business days | Same zone |
| **United States** | **blank** | Nothing in your store states a US transit time |
| **Canada** | **blank** | Nothing in your store states one |
| **Rest of world** | **blank** | Nothing in your store states one |
| **Production** | **blank** | Not knowable from Shopify |

Until production days and the US figures are set, **the estimate does not
render for US visitors** — your primary market. That is deliberate.

## Menus updated (store data, applies to all themes)

- Footer menu → Track your order, Contact, Search, Your Privacy Choices
- Main menu → Shop, Track your order, Contact

## Verified / not verified

Verified: all four theme files re-read from the draft at expected sizes; both
schemas parse; the page exists, is published and carries `templateSuffix:
tracking`; both menus re-read with the new items.

**Not verified:** nothing rendered in a browser (sandbox cannot reach the
storefront). The store has **0 orders**, so the end-to-end path
Printful → Shopify fulfilment → tracking number → account page could not be
exercised. It relies on the provider app pushing tracking into Shopify, which
is standard behaviour but untested here.

## Owner actions for this round

1. In the theme editor, open a product → **Delivery estimate** and enter
   **production days** and **US / Canada / rest-of-world transit days** from
   your Printful/Printify dashboard. Until then the estimate is hidden for
   those markets.
2. Confirm your provider app is connected so it pushes tracking numbers into
   Shopify fulfilments — that is what makes routes 2 and 3 work.
3. Place one real test order to confirm the tracking number arrives and the
   account page shows it.

---

# Round 4 — bundle cross-sell: "add a second piece, save 30%"

Draft: **`IZAVEN bundle draft` (`208659251525`)**. The previous draft was
published mid-round again, so this is a fresh duplicate of it.

## No app required

The merchant asked for an "app". None is needed — Shopify does Buy-X-Get-Y
natively, and the storefront offer is a theme section. Nothing recurring to pay
for, no third-party script, no API key.

## 1. The discount (store data, live on every theme)

`DiscountAutomaticNode/2259374997829` — **"Bundle & save 30% — add a second
piece"**, status ACTIVE, starts 2026-10-15, no end date.
Shopify summary: *"Buy 1 item, get 1 item at 30% off"*.

BXGY discounts cannot target "all products", so a smart collection was created
to stand in for the whole catalogue:

- `Collection/707158901061` — handle `bundle-eligible`, rule
  `VARIANT_PRICE > 0`. It auto-includes every product, so the offer covers any
  pair without hardcoding product IDs. **Not added to any menu.**

Shopify applies the 30% in the cart and at checkout by itself. The theme does
not compute or apply the discount — it only advertises it.

## 2. The storefront offer — `sections/bundle-upsell.liquid`

Placed on `templates/product.json` and `templates/cart.json`.

- Pulls suggestions from Shopify's own `/recommendations/products.json`,
  trying `complementary` (curated in Search & Discovery) and falling back to
  `related`, which works with no setup. No third-party service.
- Shows each suggestion with its real price struck through and the bundle
  price beside it, **computed from the live product price**, not hardcoded.
- One-click "Add & save" posts to `/cart/add.js` and sends the shopper to the
  cart, where Shopify's discount has already applied.
- On the PDP the script relocates the card next to the buy button, because
  `product-glass` is one monolithic section and a template section would
  otherwise land at the foot of the page.
- Percentage, suggestion count and all copy are theme-editor settings.

## Known limitation — this shows nothing today

**The store has one product.** `/recommendations/products.json` needs at least
one other product to suggest, so the card renders nothing and the offer is
invisible. The discount itself is live and would apply to any 2-item cart, but
with a single product a shopper would have to add two of the same hoodie.

It starts working on its own the moment a second product exists. No code change
needed.

## Verified / not verified

Verified: discount re-read from the API as ACTIVE with the expected summary;
smart collection created with the expected rule; all three theme files re-read
at expected sizes; both JSON templates and the section schema parse.

Not verified: nothing rendered in a browser (sandbox cannot reach the
storefront), and the add-to-cart path and the discount actually applying at
checkout were not exercised — that needs a real browser session.

## Owner actions

1. **Add a second product.** Nothing about this feature is visible until then.
2. Preview a product page and the cart, add two items, and confirm the cart
   shows −30% on the cheaper one.
3. Optional: in **Search & Discovery**, curate complementary products per
   item so the suggestion is a deliberate pairing (hoodie → joggers) rather
   than Shopify's automatic "related".
4. If you change the 30% in Shopify admin, change **Bundle upsell → Discount
   percent** in the theme editor to match, or the advertised price will not
   match checkout.

---

# Round 5 — fixing "still not working"

Draft: **`IZAVEN fix draft` (`208660037957`)**. The catalogue now holds 5
products, all ACTIVE, published and in stock, so the "only one product"
blocker from round 4 is gone — but the bundle card still did not appear.
Two genuine defects, both mine.

## Root cause 1 — the recommendations API returns nothing on a new store

`sections/bundle-upsell.liquid` asked `/recommendations/products.json` for
suggestions. That endpoint is driven by Shopify's recommendation engine, which
needs traffic and order history before it returns anything. On a store with no
orders it replies `{"products":[]}`, my `render()` returned early, and the card
hid itself. The offer was never visible, whatever the catalogue size.

**Fix:** the section now picks suggestions in **Liquid, server-side**, so the
card is in the HTML on the first page view with no network call. Pool order:

1. the `bundle-eligible` smart collection
2. the current product's first collection
3. `collections.all`

The current product and anything already in the cart are skipped. Prices are
rendered with Shopify's `money` filter and the bundle price is computed in
Liquid (`(100 - pct) * price / 100`), so it tracks real prices. The remaining
JavaScript only handles the "Add & save" click.

## Root cause 2 — the smart collection was never published

`Collection/707158901061` (`bundle-eligible`) was created through the Admin API,
which does **not** publish to a sales channel by default. It had
`resourcePublicationsCount: 0`, so `collections['bundle-eligible']` resolved to
nil on the storefront and the intended pool was invisible.

**Fix:** published to the Online Store channel (`Publication/374257713477`).
Verified: `resourcePublicationsCount` is now 1 and the collection auto-matched
all 5 products via its `VARIANT_PRICE > 0` rule.

## Delivery estimate — every region now set to 5–10

Previously only US was 5–10; Canada, UK, Europe and rest-of-world were 0, which
means "render nothing". Any visitor outside the US saw no estimate at all. All
regions are now 5–10 calendar days, per the owner's instruction that delivery
is "5-10 days max".

This overrides the 12–35 figure that came from the store's own Printful zone
names. That was the owner's explicit decision, twice stated.

## Verified

- Draft re-read: all four files present at expected sizes.
- `bundle-eligible` → 5 products, 1 publication (Online Store).
- All 5 products: ACTIVE, `publishedAt` set, 1 publication, price > 0,
  `availableForSale: true`.
- Discount `DiscountAutomaticNode/2259374997829` still ACTIVE,
  "Buy 1 item, get 1 item at 30% off".
- Bundle price maths checked by hand: $114.66 → $80.26 at 30% off.
- Liquid schema and both JSON templates parse.

**Still not render-tested** — the sandbox cannot reach the storefront, so no
browser check of layout or of the add-to-cart call.
