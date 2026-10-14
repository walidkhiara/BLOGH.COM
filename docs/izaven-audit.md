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
