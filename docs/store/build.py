import json
SPORT_US_EU = ["78% polyester, 22% elastane (US fulfillment)", "84% polyester, 16% elastane (EU fulfillment)", "Fabric weight: 8.56 oz/yd² (290 g/m²) US · 6.78 oz/yd² (230 g/m²) EU"]
CARE_SYN = "Machine wash cold, inside out, on a gentle cycle. Skip the fabric softener and bleach. Hang to dry — the stretch and print last longest away from the dryer."
CARE_COTTON = "Machine wash cold, inside out, with similar colours. Tumble dry low or hang dry. Don't iron directly on the print."
CARE_SHOES = "Spot clean with a damp cloth and mild soap. Air dry away from direct heat. Remove the insole to dry faster after a hard session."

def desc(intro, wear, fit, specs, care, note=None):
    h = f"<p><strong>{intro[0]}</strong> {intro[1]}</p>"
    h += "<h3>Why you'll wear it</h3><ul>" + "".join(f"<li>{w}</li>" for w in wear) + "</ul>"
    h += f"<h3>Fit</h3><p>{fit}</p>"
    h += "<h3>Fabric &amp; details</h3><ul>" + "".join(f"<li>{s}</li>" for s in specs) + "</ul>"
    h += f"<h3>Care</h3><p>{care}</p>"
    if note:
        h += "<h3>Good to know</h3><ul>" + "".join(f"<li>{n}</li>" for n in note) + "</ul>"
    return h

P = {}
P["16275768181061"] = (desc(
    ("Quiet statement. Heavy comfort.", "Heavyweight brushed-fleece sweatpants in a soft Dust tone, finished with a single black Japanese calligraphy character at the lower leg. Minimal on purpose — the kind of piece you reach for on rest days, late walks and everything in between."),
    ["Brushed fleece interior that stays warm and soft wash after wash", "Relaxed, boxy streetwear cut that drapes instead of clings", "Side-seam pockets that hold your phone without adding bulk", "Interior drawcord and elastic cuffs to dial in the fit and stack cleanly over sneakers"],
    "Relaxed and roomy. Take your usual size for the intended oversized look, or size down for a closer fit.",
    ["Heavyweight 60% Airlume combed and ring-spun cotton, 40% polyester fleece (Athletic Heather: 94% cotton, 6% polyester)", "Brushed fleece interior", "Side-seam pockets", "Interior drawcord, elastic leg cuffs", "Small black calligraphy character graphic near the lower leg"],
    CARE_COTTON),
    "Japanese Calligraphy Sweatpants – Heavyweight Fleece | IZAVEN",
    "Heavyweight brushed-fleece sweatpants in Dust with a minimal Japanese calligraphy detail. Relaxed streetwear fit, side pockets, drawcord waist. Sizes S–3XL.")
P["16275849216325"] = (desc(
    ("Second skin for hard sessions.", "A slim, long-sleeve rash guard built for training, grappling, surfing and everything outdoors. Four-way stretch moves with you, flat seams stay out of the way, and the longer cut keeps you covered when you reach, roll and lift."),
    ["Four-way stretch fabric that stretches and snaps back on every axis", "Flat seams and coverstitch — no rubbing under pressure", "Longer body and sleeves that stay put through every rep and roll", "Helps shield your skin from sun, wind and sand"],
    "Compression-style and fitted — it runs small. For a more comfortable fit we recommend going one size up.",
    SPORT_US_EU + ["Very soft four-way stretch fabric", "Longer body and sleeves", "Flat seam and coverstitch", "Blank components sourced from Mexico and China"],
    "Rinse thoroughly in fresh water after every use to remove chlorine and salt. " + CARE_SYN,
    ["Runs small and fitted — size up for a relaxed feel."]),
    "Men's Long-Sleeve Rash Guard – 4-Way Stretch | IZAVEN",
    "Slim long-sleeve rash guard with four-way stretch, flat seams and a longer cut. Built for BJJ, surf and training. Runs small — size up. Sizes XS–3XL.")
P["16275850461509"] = (desc(
    ("Built to move. Made to layer.", "Men's performance leggings with a soft, sculpted feel. Wear them solo for the gym and the trail, or under shorts for runs and cold-weather sessions."),
    ["Four-way stretch that moves with squats, sprints and stretches", "Front gusset for freedom of movement and extra comfort", "Elastic waistband that stays in place without digging in", "Flat seams and coverstitch to reduce chafing"],
    "Fitted, second-skin design. Take your usual size; size up if you're between sizes or prefer less compression.",
    SPORT_US_EU + ["Very soft four-way stretch fabric", "Front gusset", "Elastic waistband", "Flatseam and coverstitch", "Blank components sourced from Mexico and China"],
    CARE_SYN),
    "Men's Performance Leggings – 4-Way Stretch | IZAVEN",
    "Soft, fitted men's leggings with four-way stretch, front gusset and flat seams. Wear solo or under shorts for gym, running and training. XS–3XL.")
P["16275852165445"] = (desc(
    ("Long, heavy, effortless.", "Heavyweight cotton long shorts with a relaxed, longer cut — built for rest days, warm-ups and city miles. Thick enough to hold their shape, with just enough stretch to move."),
    ["300 g/m² heavyweight cotton with a structured, premium hand", "A touch of elastane for comfort when you sit, squat or walk all day", "Longer, relaxed length for a modern streetwear silhouette", "Unisex fit across an extended 2XS–6XL range"],
    "Unisex, relaxed fit. Take your usual size; women may prefer one size down.",
    ["95% cotton, 5% elastane", "Fabric weight: 8.85 oz/yd² (300 g/m²)", "Heavyweight cotton-spandex blend with a medium-soft feel", "Unisex fit", "Blank components sourced from Mexico"],
    CARE_COTTON),
    "Unisex Heavyweight Cotton Long Shorts | IZAVEN",
    "Heavyweight 300 g/m² cotton long shorts with a relaxed, longer cut and a touch of stretch. Unisex streetwear fit in sizes 2XS–6XL.")
P["16275853607237"] = (desc(
    ("Lock in. Lift heavy.", "A longline sports bra with compression fabric, a double-layered front and double-layered straps — support for running, jumping and pumping iron, with a clean silhouette that works as a top on its own."),
    ["Compression fabric and double-layered front for confident support", "Non-see-through, fully lined with mesh", "Removable padding included — wear it your way", "Longline cut that doubles as a training top or streetwear layer"],
    "Snug, supportive compression fit. Take your usual size; size up for lighter support.",
    ["78% polyester, 22% elastane (US fulfillment)", "74% recycled polyester, 26% elastane (EU fulfillment) — recycled content certified under GRS (Global Recycled Standard)", "Fabric weight: 8.56 oz/yd² (290 g/m²) US · 7.37 oz/yd² (250 g/m²) EU", "Lining: 92% polyester, 8% elastane (US) · 90% polyester, 10% elastane (EU); 4.42 oz/yd² (150 g/m²), may vary by 5%", "Openings for removable padding, fully lined with mesh", "Double-layered front, longline silhouette", "Blank components sourced from Mexico and China"],
    CARE_SYN,
    ["Where the fabric is double-layered, details from the inner layer may subtly show through, especially with lighter designs.", "Avoid rough surfaces — they can pull white fibres from the fabric."]),
    "Longline Sports Bra – Compression Support | IZAVEN",
    "Longline compression sports bra with double-layered front, mesh lining and removable padding. Non-see-through support for running and lifting. XS–3XL.")
P["16275854065989"] = (desc(
    ("Short, sharp, unstoppable.", "Training shorts in smooth microfiber with four-way stretch — light enough for sprints, strong enough for leg day, bold enough to stand out on the floor."),
    ["Four-way stretch that moves with every stride and squat", "Smooth microfiber yarn that feels soft on skin", "Comfortable elastic waistband that stays put", "Overlock and coverstitch seams built for repetition"],
    "Close, athletic fit. Take your usual size; size up for a looser feel.",
    SPORT_US_EU + ["Four-way stretch fabric", "Smooth microfiber yarn", "Overlock and coverstitch", "Elastic waistband", "Blank components sourced from Mexico and China"],
    CARE_SYN),
    "Performance Training Shorts – 4-Way Stretch | IZAVEN",
    "Smooth microfiber training shorts with four-way stretch and an elastic waistband. Built for sprints, lifting and everyday training. Sizes XS–3XL.")
P["16275854131525"] = (desc(
    ("Sculpted. Smooth. Staying power.", "Everyday performance leggings in a smooth microfiber knit that holds its stretch session after session — from the squat rack to the street."),
    ["Four-way stretch that recovers its shape on every axis", "Smooth, soft microfiber yarn for all-day comfort", "Elastic waistband with a secure, comfortable hold", "Overlock and coverstitch seams for durability"],
    "Fitted. Take your usual size; size up if you prefer less compression.",
    SPORT_US_EU + ["Microfiber yarn for a smooth, comfortable feel", "Four-way stretch fabric", "Elastic waistband", "Overlock and coverstitch", "Blank components sourced from Mexico and China"],
    CARE_SYN),
    "Performance Leggings – Smooth 4-Way Stretch | IZAVEN",
    "Smooth microfiber leggings with four-way stretch and a secure elastic waistband. Made for training and everyday wear. Sizes XS–XL.")
P["16275856032069"] = (desc(
    ("Strip it back.", "A soft, lightweight cotton tank for hot sessions, pump days and summer layering. Simple cut, clean finish, nothing in the way."),
    ["Combed and ring-spun cotton that feels soft from the first wear", "Lightweight and breathable for hot training days", "Side-seamed for a clean shape that holds after washing", "Easy to layer under a hoodie or over a sports bra"],
    "Unisex, regular fit. Take your usual size; size down for a closer fit.",
    ["100% combed and ring-spun cotton", "Tri-blends: 50% polyester, 25% combed ring-spun cotton, 25% rayon", "Fabric weight: 4.2 oz/yd² (142.4 g/m²); tri-blends 3.8 oz/yd²", "30 singles thread weight", "Side-seamed", "Blank sourced from Nicaragua, Honduras or the US"],
    CARE_COTTON),
    "Unisex Cotton Training Tank Top | IZAVEN",
    "Soft, lightweight combed ring-spun cotton tank for training and summer layering. Unisex regular fit, side-seamed. Sizes XS–2XL.")
P["16275864781125"] = (desc(
    ("Your warm-up, your cool-down, your everything.", "A heavy-blend zip hoodie with soft fleece inside and out — the layer you throw on before the first set and keep on long after the last."),
    ["Soft fleece inside and outside", "Air-jet spun yarn for reduced pilling", "Sturdy metal zipper and front pouch pockets", "Hood with colour-matched drawcord"],
    "Regular unisex fit. Take your usual size, or size up for an oversized look.",
    ["50% cotton, 50% polyester", "Fabric weight: 8 oz/yd² (271 g/m²)", "Yarn diameter: 20 singles", "Air-jet spun yarn", "Metal zipper, front pouch pockets", "Unlined hood with colour-matched drawcord", "Double-needle stitching at shoulders, armholes, neck, waistband and cuffs", "Safety Green: compliant with ANSI/ISEA 107", "Blank sourced from Honduras and El Salvador"],
    CARE_COTTON,
    ["Due to the fabric, the White colour may appear off-white rather than bright white."]),
    "Unisex Heavy Blend Zip Hoodie – Fleece | IZAVEN",
    "Heavy-blend zip hoodie with soft fleece inside and out, metal zipper and front pockets. Low-pill yarn, regular unisex fit. Sizes S–5XL.")
SHOE_SPECS = ["100% polyester ultralight flyknit upper", "EVA rubber outsole", "Breathable lining", "Soft insole and padded collar", "Lace-up front", "Soles and laces in matching colours", "Blank sourced from China"]
SHOE_NOTE = ["The outsole design varies by size: EU 37.5–40 have a point-like pattern, 40.5–47.5 feature stripes.", "A strong glue smell is normal on arrival — let the shoes air out for a couple of days and it disappears."]
P["16275875791173"] = (desc(
    ("Light on your feet. All week long.", "Ultralight flyknit trainers with a padded collar and soft insole — built for gym days, long walks and everything in between."),
    ["Ultralight, breathable flyknit upper", "Soft insole and padded collar for all-day comfort", "EVA rubber outsole for grip and stability", "Matching soles and laces for a clean, considered look"],
    "True to size. If you're between sizes, go half a size up.",
    SHOE_SPECS, CARE_SHOES, SHOE_NOTE),
    "Men's Flyknit Athletic Shoes – Ultralight | IZAVEN",
    "Ultralight men's flyknit trainers with padded collar, soft insole and EVA outsole. Breathable, all-day comfort for gym and street. US 5–13.")
P["16275881328965"] = (desc(
    ("Lightweight energy, all day.", "Breathable flyknit trainers with a padded collar and grippy outsole — your go-to pair for training, errands and long days on your feet."),
    ["Ultralight, breathable flyknit upper", "Soft insole and padded collar for all-day comfort", "EVA rubber outsole for grip and stability", "Matching soles and laces for a clean, considered look"],
    "True to size. If you're between sizes, go half a size up.",
    SHOE_SPECS, CARE_SHOES, SHOE_NOTE),
    "Women's Flyknit Athletic Shoes – Ultralight | IZAVEN",
    "Lightweight women's flyknit trainers with padded collar, soft insole and EVA outsole. Breathable comfort for training and everyday. US 5–12.")
TEE = (desc(
    ("Heavy cotton. Lived-in colour.", "A structured, garment-dyed heavyweight tee in 100% ring-spun cotton — thick enough to hold its shape, soft enough to live in. Every piece is dyed after sewing for a rich, slightly washed colour."),
    ["Garment-dyed for a soft, lived-in feel from day one", "Thick, structured 100% ring-spun cotton", "Twill-taped neck and shoulders that hold their shape", "Relaxed fit that works with everything"],
    "Relaxed fit. Take your usual size, or size up for an oversized look.",
    ["100% ring-spun cotton", "Fabric weight: 6.1 oz/yd² (206.8 g/m²)", "Garment-dyed", "Relaxed fit", "7/8″ double-needle topstitched collar", "Twill-taped neck and shoulders", "Double-needle armhole, sleeve and bottom hems", "Blank sourced from Honduras"],
    CARE_COTTON, ["Because each tee is garment-dyed, colour can vary slightly from piece to piece."]),
    "Garment-Dyed Heavyweight T-Shirt – Unisex | IZAVEN",
    "Structured 100% ring-spun cotton heavyweight tee, garment-dyed for a soft, lived-in feel. Twill-taped neck, relaxed unisex fit. Sizes S–4XL.")
P["16275890635077"] = TEE
P["16275898532165"] = TEE
P["16275896762693"] = (desc(
    ("Cropped. Heavy. Holds its shape.", "A form-fitting crop top in heavyweight cotton with a touch of stretch — sharp enough for the street, comfortable enough for a light session."),
    ["Heavyweight 300 g/m² cotton with a premium feel", "5% elastane for stretch and recovery", "Form-fitting cropped silhouette", "Pairs with high-waisted leggings, joggers or long shorts"],
    "Form-fitting. Take your usual size; size up for a relaxed look.",
    ["95% cotton, 5% elastane", "Fabric weight: 8.85 oz/yd² (300 g/m²)", "Heavyweight cotton-spandex blend with a medium-soft feel", "Form-fitting silhouette", "Blank components sourced from Mexico"],
    CARE_COTTON),
    "Heavyweight Cotton Crop Top – Form Fitting | IZAVEN",
    "Form-fitting heavyweight cotton crop top with a touch of stretch. Premium 300 g/m² fabric for training and streetwear. Sizes XS–XL.")

for k, (h, t, d) in P.items():
    assert len(t) <= 70, (t, len(t)); assert len(d) <= 160, (d, len(d))
out = {f"p{k}": {"id": f"gid://shopify/Product/{k}", "descriptionHtml": h, "seo": {"title": t, "description": d}} for k, (h, t, d) in P.items()}
json.dump(out, open("new-descriptions.json", "w"), indent=1, ensure_ascii=False)
print(len(out), "products")
