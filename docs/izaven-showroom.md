# IZAVEN showroom: homepage, placement editor, footer

Files live in `theme/` and mirror a Shopify theme (Horizon). Nothing here touches your live theme until you publish a theme that contains them.

| File | What it is |
|---|---|
| `sections/izaven-showroom.liquid` | The studio hero. Full-width desktop photo, a separate tall mobile photo, product placements on top, a dark "Latest" strip underneath. |
| `assets/izaven-showroom.js` | Entrance animation. Loads the editor only when asked. |
| `assets/izaven-editor.js` | The visual placement editor. |
| `sections/izaven-footer.liquid`, `snippets/izaven-footer-link.liquid`, `assets/izaven-footer.js` | The footer. Built from HTML/CSS and your PNG. The studio photo is never used as its background. |
| `assets/izaven-studio-desktop.webp`, `izaven-studio-mobile.webp`, `izaven-logo.png` | Your supplied artwork, unmodified. |
| `templates/index.json`, `sections/footer-group.json` | Wire the two sections in. |

## Using the editor

1. Open your home page with `?izaven-editor=1` on the end of the address.
   For an unpublished theme, open its **Preview** link first, then add `&izaven-editor=1`.
   Inside the theme editor, the **Open placement editor** button (bottom left) does this for you.
2. Click a product on the studio, or pick it in the list. Drag it. Use the corner squares to resize and the circle on top to rotate (hold Shift to snap to 15°). Or type exact numbers.
3. **Desktop / Mobile** switches which layout you are editing. They are stored separately, on separate photographs. Editing one never changes the other. The **Preview** menu shows 1920, 1440, 1024 and 768 px for desktop and 360, 390 and 430 px for mobile.
4. **Scale all −10% / +10%** resizes every placement on the current layout at once (one undo step). To resize one product, select it and use the corner squares or the **Width / scale** box.
5. **Add a product** from the search box. **Remove** only takes it off the studio; the product stays in your store. The eye icon hides it on the current layout only.
6. Your work is **saved automatically in this browser** as you go, so a refresh or an accidental close never loses it. (**Save draft** just confirms it.) It is only in that browser until you publish.
7. **Copy layout**, then in the theme editor open **Home → Studio showroom → Placement layout**, paste, and **Save**. That paste is what puts it on the live store.

Keyboard: arrows nudge 0.1% (Shift: 1%), `+`/`-` resize, `[` / `]` change layer, Delete removes, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo.

## Resizing and moving a product from the theme editor (saves automatically)

In **Home → Studio showroom → Add block → Adjust product size and position**:

1. **Product on the studio:** pick a product that is already placed.
2. **Desktop** and **Mobile** each have their own **Size** (30–250%), **Move left / right** and **Move up / down** (±25% of the studio), **Rotate** (±45°) and a **Hide** checkbox.
3. Press **Save** at the top right of the theme editor. Shopify applies it to the store itself; there is nothing to copy or paste.

These sliders are applied **on top of the Placement layout**: Size 100% and Move 0 mean no change, Size 150% makes the product one and a half times as wide as the layout says. Add one block per product. If two blocks name the same product, the first one is used. Moves are clamped to stay inside the studio.

The placement editor (drag and resize) shows the plain layout without these sliders, and marks the affected products. Use whichever method you prefer; the sliders are the one that saves by itself.

## Putting your changes on the store

A page on your storefront cannot write to Shopify (that needs a private admin key, which must never sit in a public page). There are three ways to get the editor's layout onto the store:

1. **Apply to store** (no setup). It copies the layout, links to the theme editor and lists the two remaining steps: paste into **Home → Studio showroom → Placement layout**, then press **Save** in the theme editor.
2. **Ask Claude** (no setup). Under **Layout text (advanced)** press **Copy message for Claude**, paste it into the chat, and Claude applies it to the draft theme.
3. **One click via GitHub** (one-time setup, below). The editor opens a pre-filled GitHub issue; pressing **Submit new issue** applies the layout to your theme within about a minute.

### One-time setup for option 3

1. **Shopify admin → Settings → Apps and sales channels → Develop apps → Create an app.** Under **Configure Admin API scopes** tick `read_themes` and `write_themes`, install the app, and **reveal the Admin API access token once** (copy it).
2. **GitHub repository → Settings → Secrets and variables → Actions.** Add a **secret** `SHOPIFY_ADMIN_TOKEN` (the token) and two **variables**: `SHOPIFY_STORE` = your `…myshopify.com` domain, and `SHOPIFY_THEME_ID` = the numeric id of the theme to update (leave it empty to update the published theme).
3. **Merge this branch into the repository's default branch.** GitHub only runs issue workflows from the default branch.
4. In the theme editor, **Home → Studio showroom → GitHub repository for one-click apply**: enter `owner/repository`. Until this is filled in, the GitHub button stays hidden.
5. In the editor open **Layout text (advanced) → Send to store via GitHub**, then press **Submit new issue**. A comment on the issue reports the result.

Safety: the workflow acts only on issues opened by the repository owner whose title is `izaven-layout`. It refuses anything that is not a well-formed layout (unknown fields, numbers out of range, images from outside `cdn.shopify.com`, more than 20 placements). It changes only the layout setting of the showroom section and leaves every other setting and block alone, then reads the file back to confirm. `tools/apply-layout/test.mjs` tests this against a mock Shopify.

## Auto-switching a product

Make a product on the studio swap to another one you choose, in exactly the same spot.

1. In the theme editor open **Home → Studio showroom** and click **Add block → Auto-switch product**.
2. **Product on the studio:** pick a product that is already placed in the Placement layout.
3. **Enable automatic switching:** on or off, per product.
4. **Product 2 (next):** you pick it. Nothing is ever chosen for you.
5. **Products 3 to 6 (optional):** add more products if you want a longer cycle. Empty slots are skipped and a product picked twice appears once.
6. **Switching interval:** 2–30 seconds, default 4.

The products **cycle in the order you set** (the placed product, then Product 2, 3, and so on, then back to the first and repeating) with a 0.9 second fade and a slight scale, using the original placement's position, width, rotation, layer, opacity and shadow, on desktop and on mobile. The next product uses its own store photo and its own title, price and link. Add one block per product; any number of products can switch, each on its own timer, and products without a block never change. A block is ignored if it is switched off, if the next product is the same one or has been deleted, or if the product is not placed.

It pauses while the tab is hidden, while the studio is off screen, and while a visitor hovers or focuses that product. For visitors who prefer reduced motion it does not switch automatically. The placement editor always shows the original product so you can position it, and marks those placements "auto-switches".

## Scaling and moving each product on its own

- **Studio placements:** select one, then drag it, use the corner squares to resize and the circle to rotate, or type exact values. Every placement is independent.
- **Latest cards:** switch to **Latest cards** at the top of the editor panel. Click a card, then drag its picture inside its frame, or use the **Scale %**, **Move left / right** and **Move up / down** sliders. Arrow keys nudge it and `+` / `-` scale it. Each card is independent. Scale grows the picture from its centre and anything outside the frame is cropped, exactly as on the store. One setting applies to both desktop and mobile. **Reset this card** and **Reset all cards** return to the default.

Card settings are saved in the same layout text as `@card handle | scale,x,y` lines, so there is still one paste. Cards you have not changed are not written.

## Sizing without the editor (theme editor settings)

In **Home → Studio showroom**:

- **Scale all placements: desktop / mobile** (50–200%) multiplies every placement's width on that layout.
- **Latest strip:** columns for desktop (2–6) and mobile (1–3), image shape (portrait, square, landscape, original), image fit (fill or show whole image) and image size inside the frame (40–100%). Fewer columns means larger product images.

## What it cannot do, and why

- **It cannot publish by itself.** The editor saves automatically in your browser, but a storefront page cannot write to Shopify. A storefront page cannot write to Shopify, and putting an admin key in the page would expose it to everyone. So publishing is one paste. "Save draft" is per browser and is not shared.
- **No login on the editor URL.** It can only read your public product list and produce text, so there is nothing to protect, but anyone who knows the address can open it and play. They cannot change your store.
- **Layers are between products only.** The studio is one flat photograph, so a product cannot go *behind* the podium or a clothing rack. That would need a separate cut-out layer of the foreground artwork.
- **Up to 20 placements per page.** Shopify limits how many different products a page may look up by handle.
- **Photos with a background look like pasted cards.** Product mockups with a white background appear as white rectangles on the black floor. Use transparent PNG/WebP cut-outs and set the placement's **Style** to *Cutout*. To use a different image for a placement, paste a Shopify Files link into **Image URL**. Files cannot be uploaded from the editor itself.
- **Height is derived, never set.** Images keep their proportions, so width is the only size control.

## Placement layout format

One placement per line, so the storefront can render it with no JavaScript:

```
handle | style | desktop x,y,w,r,z,o,s,v | mobile x,y,w,r,z,o,s,v | image-url (optional)
```

`style`: `f` framed or `c` cutout. Numbers: `x`,`y` = centre as % of the stage width/height; `w` = width as % of stage width; `r` = rotation in degrees; `z` = layer; `o` = opacity 0-100; `s` = shadow 0-100; `v` = visible 1/0. Lines starting with `#` are comments.

Percentages are relative to the photograph, so a position means the same spot on the picture at every screen size.

## Footer

Every link renders only if its target exists: a page, a collection with products in it, or a store policy. Create a page with one of these handles and its link appears: `about`, `our-story`, `lookbook`, `size-guide`, `care-instructions`, `contact`, `faq`, `shipping`, `returns`, `tracking`. Social links appear only when you paste a URL into the section. The newsletter uses Shopify's own customer form, so sign-ups appear under Customers with email marketing consent. It is not connected to Klaviyo or another service.

## Checking it

`tools/preview/` holds a local harness: an open-source Liquid engine plus headless Chromium. `node editor-test.mjs` runs the editor test suite and `node shots.mjs` captures the six widths. This is **not Shopify**. It proves layout, scripts and editor behaviour against test data; it does not prove Shopify's renderer accepts every tag.
