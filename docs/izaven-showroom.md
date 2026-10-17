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
4. **Add a product** from the search box. **Remove** only takes it off the studio; the product stays in your store. The eye icon hides it on the current layout only.
5. **Save draft** keeps your work in this browser and restores it if you refresh.
6. **Copy layout**, then in the theme editor open **Home → Studio showroom → Placement layout**, paste, and **Save**. That paste is what puts it on the live store.

Keyboard: arrows nudge 0.1% (Shift: 1%), `+`/`-` resize, `[` / `]` change layer, Delete removes, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo.

## What it cannot do, and why

- **It cannot publish by itself.** A storefront page cannot write to Shopify, and putting an admin key in the page would expose it to everyone. So publishing is one paste. "Save draft" is per browser and is not shared.
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
