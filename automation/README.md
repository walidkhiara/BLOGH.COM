# IZAVEN — AI shoppable outfit builder (n8n)

Import `izaven-outfit-builder.n8n.json` into n8n. Everything is pre-filled for
your store except two secrets, which n8n keeps in its own encrypted vault.

**Store:** `qi0zkk-k1.myshopify.com` · **Admin API version:** `2026-01`

## What it does

```
POST image ──► validate ──► upload to Shopify Files ──► OpenRouter vision
                                                              │
   DRAFT metaobject ◄── build hotspots ◄── match catalogue ◄──┘
```

The storefront never calls OpenRouter. Published outfits render from the saved
metaobject, so a customer page works even if the AI provider is down or out of
quota.

## Setup — two credentials, once

### 1. Shopify Admin token

1. Shopify admin → **Settings → Apps and sales channels → Develop apps → Create an app**
2. Name it `IZAVEN outfit builder` → **Configure Admin API scopes**, tick only:
   - `read_products`
   - `write_files`
   - `read_metaobjects`, `write_metaobjects`
   - `read_metaobject_definitions`
3. **Install app** → reveal the **Admin API access token** (starts `shpat_`). It
   is shown once.
4. In n8n: **Credentials → New → Header Auth**
   - Name: `IZAVEN Shopify Admin token`
   - Header name: `X-Shopify-Access-Token`
   - Header value: the `shpat_…` token

### 2. OpenRouter key

Your previous key was pasted into a chat and must be treated as compromised.
Revoke it at https://openrouter.ai/settings/keys and create a new one.

In n8n: **Credentials → New → Header Auth**
- Name: `OpenRouter API key`
- Header name: `Authorization`
- Header value: `Bearer sk-or-v1-…`

Never put either value in this repo, in theme code, or in a browser.

## Running it

```bash
curl -X POST https://<your-n8n>/webhook/izaven-outfit \
  -F "image=@outfit.jpg" \
  -F "title=Autumn layering look"
```

Response names the draft and anything needing a decision:

```json
{ "ok": true, "status": "DRAFT", "live_hotspots": 2, "needs_review": 1,
  "admin_url": "https://admin.shopify.com/store/qi0zkk-k1/content/entries/shoppable_outfit/…" }
```

Open that URL, fix the pending garments, set the entry **Active**.

## Model

Configured: `qwen/qwen2.5-vl-32b-instruct`. **Unverified** — `openrouter.ai` is
blocked from the environment this was written in, so its availability, vision
support and access under your account could not be checked. Confirm at
https://openrouter.ai/models before relying on it.

To change it, send `model` in the webhook body, or edit the
**Detect garments** node. Nothing falls back to a paid model automatically; a
quota error surfaces as an error.

## Design decisions worth knowing

**The model never supplies commerce data.** It describes pixels only. Every
product id, title, price and stock figure comes from the Shopify Admin API.

**Its output is untrusted input.** `Validate AI response` enforces a schema —
known category, coordinates inside 0–1, confidence 0–1. Anything malformed is
dropped and reported, never stored.

**Coordinates are normalised 0–1** against the original image, so hotspots
survive responsive resizing and cropping.

**Nothing auto-publishes.** Entries are created `DRAFT`. Only garments scoring
`high_confidence` *and* in stock become live hotspots; everything else goes to
`pending` for a human. A near-tie between two products is flagged `ambiguous`
rather than silently picking one.

**Match statuses:** `high_confidence` · `needs_review` · `ambiguous` ·
`unresolved` · `out_of_stock` · `no_match`.

## Limits

- The catalogue query fetches the first 100 active products. Past that, add
  pagination using the returned `endCursor`.
- Matching is keyword scoring over title, type, tags, description and colour.
  It is deterministic and explainable, not visual similarity.
- OpenRouter free tiers are rate limited; a 402 surfaces as a clear error.
- **Not executed.** No n8n instance and no OpenRouter access were available, so
  this workflow has never been run. Treat the first run as the real test.
