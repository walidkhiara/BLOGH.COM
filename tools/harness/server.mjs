// Local test harness: renders the theme's Liquid with liquidjs against a mock
// catalogue and emulates Shopify's AJAX Cart / Section Rendering / Predictive
// Search endpoints. It is NOT Shopify; it exists to screenshot layouts and to
// exercise assets/theme.js against the documented API contracts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Liquid, Tag, Hash } from 'liquidjs';

const THEME = process.argv[2];
const HERE = path.dirname(new URL(import.meta.url).pathname);
const PORT = Number(process.argv[3] || 9292);
const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
const locale = JSON.parse(read('locales/en.default.json'));

/* ---------------- mock catalogue ---------------- */
let nextId = 1000;
class Img {
  constructor(file, alt = '', w = 900, h = 1125) { this.src = `/img/${file}`; this.alt = alt; this.width = w; this.height = h; this.presentation = { focal_point: '50% 50%' }; this.id = nextId++; }
  toString() { return this.src; }
}
const COLORS = ['black', 'white', 'sage', 'navy', 'red', 'grey', 'sand', 'lilac'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const NAMES = [
  ['Velocity Seamless Leggings', 'bottom', 'Leggings', 5200, null], ['Apex Training Tee', 'top', 'T-Shirts', 3000, null],
  ['Flex Sports Bra', 'top', 'Sports Bras', 3800, 4800], ['Arrival 5" Shorts', 'bottom', 'Shorts', 3200, null],
  ['Power Oversized Hoodie', 'top', 'Hoodies', 6000, null], ['Crest Tapered Joggers', 'bottom', 'Joggers', 5500, 6500],
  ['Vital Long Sleeve', 'top', 'Tops', 3600, null], ['Studio Flare Pants', 'bottom', 'Leggings', 5000, null],
  ['Rise Tank', 'top', 'Tanks', 2600, null], ['Pulse Running Shorts', 'bottom', 'Shorts', 3400, null],
  ['Core Crop Top', 'top', 'Tops', 2800, 3500], ['Legacy Cargo Pants', 'bottom', 'Joggers', 6200, null],
];
const products = [];
for (let i = 0; i < 30; i++) {
  const [baseTitle, kind, type, price, compare] = NAMES[i % NAMES.length];
  const title = i < NAMES.length ? baseTitle : `${baseTitle} ${['II', 'Pro', 'Lite'][Math.floor(i / NAMES.length) - 1] || ''}`.trim();
  const handle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
  const colorCount = (i % 4) + 1;
  const colors = COLORS.slice(i % 5, (i % 5) + colorCount).map((c) => c[0].toUpperCase() + c.slice(1));
  const soldOut = i === 3;
  const id = nextId++;
  const media = [];
  const colorImages = {};
  colors.forEach((c) => {
    const a = new Img(`${kind}-${c.toLowerCase()}.jpg`, `${title} in ${c}`);
    const b = new Img(`${kind}-${c.toLowerCase()}-2.jpg`, `${title} in ${c}, back`);
    colorImages[c] = a;
    media.push({ id: a.id, media_type: 'image', preview_image: a, alt: a.alt, src: a.src, toString() { return a.src; } });
    media.push({ id: b.id, media_type: 'image', preview_image: b, alt: b.alt, src: b.src, toString() { return b.src; } });
  });
  const variants = [];
  colors.forEach((c) => SIZES.forEach((s, si) => {
    const vid = nextId++;
    const available = !soldOut && !(i === 0 && s === 'XS') && !(i === 1 && c === colors[0] && s === 'XL');
    variants.push({
      id: vid, title: `${c} / ${s}`, options: [c, s], option1: c, option2: s, available, price, compare_at_price: compare,
      featured_image: colorImages[c], featured_media: { id: colorImages[c].id }, url: `/products/${handle}?variant=${vid}`,
      inventory_management: 'shopify', inventory_quantity: available ? (si === 4 ? 3 : 20) : 0, inventory_policy: 'deny', sku: `BLG-${id}-${vid}`,
    });
  }));
  const first = variants.find((v) => v.available) || variants[0];
  products.push({
    id, title, handle, url: `/products/${handle}`, type, vendor: 'BLOGH', tags: i % 3 === 0 ? ['new'] : [], available: !soldOut,
    price, price_min: price, price_varies: false, compare_at_price: compare, compare_at_price_min: compare,
    options: ['Color', 'Size'],
    variants, media, featured_media: media[0], featured_image: media[0].preview_image, has_only_default_variant: false,
    description: `<p>${title} — built from a recycled four-way stretch knit with sweat-mapped ventilation where you run hottest. Squat-proof, sculpting and quick-drying.</p><ul><li>78% recycled nylon, 22% elastane</li><li>Model is 175cm and wears size S</li></ul>`,
    created: i,
  });
}
const withSelection = (p, variantId) => {
  const v = p.variants.find((x) => String(x.id) === String(variantId)) || p.variants.find((x) => x.available) || p.variants[0];
  return {
    ...p,
    selected_or_first_available_variant: v,
    options_with_values: p.options.map((name, idx) => ({ name, position: idx + 1, values: [...new Set(p.variants.map((x) => x.options[idx]))], selected_value: v.options[idx] })),
  };
};
const productDrop = (p, variantId) => withSelection(p, variantId);

/* ---------------- cart state ---------------- */
let cart = { items: [], note: '' };
const findVariant = (vid) => { for (const p of products) { const v = p.variants.find((x) => x.id === Number(vid)); if (v) return { p, v }; } return null; };
const cartDrop = () => {
  const items = cart.items.map((it) => {
    const { p, v } = findVariant(it.id);
    return {
      key: `${v.id}:k`, id: v.id, variant_id: v.id, quantity: it.quantity, product: { ...p }, variant: v, title: `${p.title} - ${v.title}`,
      url: v.url, image: v.featured_image, final_line_price: v.price * it.quantity, original_line_price: (v.compare_at_price || v.price) * it.quantity,
      final_price: v.price, options_with_values: [{ name: 'Color', value: v.options[0] }, { name: 'Size', value: v.options[1] }], properties: {}, line_level_discount_allocations: [],
    };
  });
  const total = items.reduce((s, i) => s + i.final_line_price, 0);
  return { items, item_count: items.reduce((s, i) => s + i.quantity, 0), total_price: total, currency: { iso_code: 'EUR', symbol: '€' }, note: cart.note, cart_level_discount_applications: [], taxes_included: true };
};
const cartJSON = () => {
  const c = cartDrop();
  return { ...c, items: c.items.map(({ product, variant, image, ...rest }) => ({ ...rest, product_title: product.title, image: image.src })) };
};

/* ---------------- liquid engine ---------------- */
const engine = new Liquid({ root: [path.join(THEME, 'snippets')], extname: '.liquid', jsTruthy: false, strictFilters: false, dynamicPartials: true, ownPropertyOnly: false });

const schemaOf = (name) => {
  const src = read(`sections/${name}.liquid`);
  const m = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);
  return m ? JSON.parse(m[1]) : { settings: [] };
};
const defaults = (settings = []) => Object.fromEntries(settings.filter((s) => s.id).map((s) => [s.id, s.default ?? (s.type === 'checkbox' ? false : null)]));

const IMG_SETTINGS = {};
const settingsSchema = JSON.parse(read('config/settings_schema.json'));
const globalSettings = Object.assign({}, ...settingsSchema.map((g) => defaults(g.settings)));
globalSettings.type_heading_font = { family: 'Archivo', fallback_families: 'Helvetica Neue, Arial, sans-serif', weight: 700 };
globalSettings.type_body_font = { family: 'Archivo', fallback_families: 'Helvetica Neue, Arial, sans-serif', weight: 400 };

class SchemaTag extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); while (remain.length) { const t = remain.shift(); if (t.name === 'endschema') return; } }
  * render() { return ''; }
}
engine.registerTag('schema', SchemaTag);
const wrapTag = (name, open, close) => engine.registerTag(name, class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid); this.tpls = []; this.args = token.args;
    const stream = liquid.parser.parseStream(remain).on(`tag:end${name}`, () => stream.stop()).on('template', (t) => this.tpls.push(t)).on('end', () => { throw new Error(`${name} not closed`); });
    stream.start();
  }
  * render(ctx, emitter) { emitter.write(open(this.args)); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter); emitter.write(close); }
});
wrapTag('style', () => '<style>', '</style>');
wrapTag('paginate', () => '', '');
engine.registerTag('form', class extends Tag {
  constructor(token, remain, liquid) {
    super(token, remain, liquid); this.tpls = []; this.args = token.args;
    const stream = liquid.parser.parseStream(remain).on('tag:endform', () => stream.stop()).on('template', (t) => this.tpls.push(t));
    stream.start();
  }
  * render(ctx, emitter) {
    const type = this.args.match(/'([^']+)'/)[1];
    const hash = yield new Hash(this.args.replace(/^\s*'[^']+'\s*,?\s*(product\s*,?)?\s*(customer\.new_address\s*,?)?/, '')).render(ctx);
    const action = { product: '/cart/add', customer: '/contact#newsletter', localization: '/localization' }[type] || '/account';
    const attrs = Object.entries(hash).map(([k, v]) => `${k}="${v}"`).join(' ');
    emitter.write(`<form method="post" action="${action}" ${attrs}>`);
    ctx.push({ form: { errors: null, posted_successfully: false } });
    yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
    ctx.pop();
    emitter.write('</form>');
  }
});

const sectionHtml = async (type, id, data, extra) => {
  const schema = schemaOf(type);
  const settings = { ...defaults(schema.settings), ...(data.settings || {}) };
  const resolveMenus = (defs, st) => (defs || []).forEach((d) => { if (d.type === 'link_list' && st[d.id]) st[d.id] = st[d.id] === 'main-menu' ? MENU : FOOTER_MENU; });
  resolveMenus(schema.settings, settings);
  Object.entries(IMG_SETTINGS[id] || {}).forEach(([k, v]) => (settings[k] = v));
  const blockDefs = Object.fromEntries((schema.blocks || []).map((b) => [b.type, b]));
  const blocks = (data.block_order || Object.keys(data.blocks || {})).map((bid) => {
    const b = data.blocks[bid];
    const st = { ...defaults(blockDefs[b.type]?.settings), ...(b.settings || {}) };
    Object.entries(IMG_SETTINGS[`${id}.${bid}`] || {}).forEach(([k, v]) => (st[k] = v));
    resolveMenus(blockDefs[b.type]?.settings, st);
    return { id: bid, type: b.type, settings: st, shopify_attributes: '' };
  });
  const html = await engine.parseAndRender(read(`sections/${type}.liquid`), { section: { id, settings, blocks, shopify_attributes: '' } }, { globals: extra });
  return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
};

engine.registerTag('section', class extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); this.name = token.args.replace(/['"\s]/g, ''); }
  * render(ctx, emitter) { emitter.write(yield sectionHtml(this.name, this.name, {}, { ...ctx.globals, ...ctx.getAll() })); }
});
engine.registerTag('sections', class extends Tag {
  constructor(token, remain, liquid) { super(token, remain, liquid); this.name = token.args.replace(/['"\s]/g, ''); }
  * render(ctx, emitter) {
    const group = JSON.parse(read(`sections/${this.name}.json`));
    for (const sid of group.order) emitter.write(yield sectionHtml(group.sections[sid].type, sid, group.sections[sid], { ...ctx.globals, ...ctx.getAll() }));
  }
});

const money = (c) => `€${(Number(c || 0) / 100).toFixed(2).replace('.', ',')}`;
const lookup = (key) => key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
engine.registerFilter('t', (key, ...args) => {
  let v = lookup(key);
  const vars = Object.fromEntries(args.filter(Array.isArray));
  if (v && typeof v === 'object') v = vars.count === 1 ? v.one : v.other;
  if (typeof v !== 'string') return key;
  return v.replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? '');
});
engine.registerFilter('asset_url', (f) => `/assets/${f}`);
engine.registerFilter('stylesheet_tag', (u) => `<link rel="stylesheet" href="${u}">`);
engine.registerFilter('image_url', (img, ...args) => {
  const src = img && (img.src || (img.preview_image && img.preview_image.src) || String(img));
  return src;
});
engine.registerFilter('image_tag', (src, ...args) => {
  const o = Object.fromEntries(args.filter(Array.isArray));
  const attrs = ['loading', 'sizes', 'alt', 'class', 'fetchpriority'].filter((k) => o[k] !== undefined).map((k) => `${k}="${String(o[k]).replace(/"/g, '&quot;')}"`).join(' ');
  return `<img src="${src}" ${attrs} width="900" height="1125">`;
});
engine.registerFilter('money', money);
engine.registerFilter('money_with_currency', (c) => `${money(c)} EUR`);
engine.registerFilter('money_without_currency', (c) => (Number(c || 0) / 100).toFixed(2));
engine.registerFilter('placeholder_svg_tag', (n, cls) => `<svg class="${cls || ''}" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>`);
engine.registerFilter('font_face', () => '');
engine.registerFilter('font_modify', (f, k, v) => ({ ...f, weight: Number(v) || 700 }));
engine.registerFilter('json', (v) => JSON.stringify(v));
engine.registerFilter('handle', (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
engine.registerFilter('url_encode', (v) => encodeURIComponent(v || ''));
engine.registerFilter('default_errors', () => '');
engine.registerFilter('payment_type_svg_tag', () => '');
engine.registerFilter('format_address', () => '');
engine.registerFilter('payment_button', () => '');

/* ---------------- collection filtering ---------------- */
const SORTS = [
  { value: 'manual', name: 'Featured' }, { value: 'best-selling', name: 'Best selling' }, { value: 'created-descending', name: 'Newest' },
  { value: 'price-ascending', name: 'Price, low to high' }, { value: 'price-descending', name: 'Price, high to low' },
];
const buildCollection = (url, handle) => {
  const q = url.searchParams;
  const sizes = q.getAll('filter.v.option.size');
  const colors = q.getAll('filter.v.option.color');
  const avail = q.getAll('filter.v.availability');
  const gte = q.get('filter.v.price.gte'); const lte = q.get('filter.v.price.lte');
  const sort = q.get('sort_by') || 'manual';
  const match = (p, skip) => {
    if (skip !== 'size' && sizes.length && !p.variants.some((v) => sizes.includes(v.options[1]) && v.available)) return false;
    if (skip !== 'color' && colors.length && !p.variants.some((v) => colors.includes(v.options[0]))) return false;
    if (skip !== 'avail' && avail.length && !avail.includes(p.available ? '1' : '0')) return false;
    if (skip !== 'price' && gte && p.price < Number(gte) * 100) return false;
    if (skip !== 'price' && lte && p.price > Number(lte) * 100) return false;
    return true;
  };
  let list = products.filter((p) => match(p));
  if (sort === 'price-ascending') list.sort((a, b) => a.price - b.price);
  if (sort === 'price-descending') list.sort((a, b) => b.price - a.price);
  if (sort === 'created-descending') list.sort((a, b) => b.created - a.created);
  const base = `/collections/${handle}`;
  const without = (param, value) => { const u = new URL(url); const vals = u.searchParams.getAll(param).filter((v) => v !== value); u.searchParams.delete(param); vals.forEach((v) => u.searchParams.append(param, v)); u.searchParams.delete('page'); u.searchParams.delete('section_id'); return u.pathname + u.search; };
  const listFilter = (label, param, values, active, skip) => {
    const vals = values.map((v) => ({ label: v.label || v.value || v, value: v.value || v, param_name: param, active: active.includes(v.value || v), count: products.filter((p) => match(p, skip) && (v.test ? v.test(p) : true)).length, url_to_remove: without(param, v.value || v) }));
    return { label, type: 'list', param_name: param, values: vals, active_values: vals.filter((v) => v.active) };
  };
  const filters = [
    listFilter('Size', 'filter.v.option.size', SIZES.map((s) => ({ value: s, test: (p) => p.variants.some((v) => v.options[1] === s && v.available) })), sizes, 'size'),
    listFilter('Colour', 'filter.v.option.color', COLORS.map((c) => { const C = c[0].toUpperCase() + c.slice(1); return { value: C, test: (p) => p.variants.some((v) => v.options[0] === C) }; }), colors, 'color'),
    listFilter('Availability', 'filter.v.availability', [{ label: 'In stock', value: '1', test: (p) => p.available }, { label: 'Out of stock', value: '0', test: (p) => !p.available }], avail, 'avail'),
    { label: 'Price', type: 'price_range', range_max: 6500, min_value: { param_name: 'filter.v.price.gte', value: gte ? Number(gte) * 100 : null }, max_value: { param_name: 'filter.v.price.lte', value: lte ? Number(lte) * 100 : null }, url_to_remove: (() => { const u = new URL(url); u.searchParams.delete('filter.v.price.gte'); u.searchParams.delete('filter.v.price.lte'); u.searchParams.delete('section_id'); return u.pathname + u.search; })(), active_values: [] },
  ];
  const per = 24;
  const page = Number(q.get('page') || 1);
  const pages = Math.ceil(list.length / per) || 1;
  const pageUrl = (n) => { const u = new URL(url); u.searchParams.set('page', n); u.searchParams.delete('section_id'); return u.pathname + u.search; };
  const paginate = {
    pages, items: list.length, page_size: per, current_page: page, current_offset: (page - 1) * per,
    next: page < pages ? { url: pageUrl(page + 1) } : null,
    parts: Array.from({ length: pages }, (_, i) => (i + 1 === page ? { title: i + 1, is_link: false } : { title: i + 1, is_link: true, url: pageUrl(i + 1) })),
  };
  const collection = {
    title: handle === 'all' ? 'All products' : 'Women’s training', handle, url: base, description: '<p>Sculpting seamless sets, sweat-wicking tees and shorts that stay put. Everything you need for the next session.</p>',
    image: handle === 'all' ? null : new Img('collection.jpg', 'Women’s training', 2600, 1100), products: list.slice((page - 1) * per, page * per).map((p) => productDrop(p)),
    products_count: list.length, filters, sort_options: SORTS, sort_by: sort, default_sort_by: 'manual',
  };
  return { collection, paginate };
};

/* ---------------- page rendering ---------------- */
const baseContext = (url, extra = {}) => ({
  shop: { name: 'BLOGH', description: 'Performance apparel', money_format: '€{{amount_with_comma_separator}}', customer_accounts_enabled: true, enabled_payment_types: [], shipping_policy: { body: '' } },
  settings: globalSettings,
  routes: { root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', predictive_search_url: '/search/suggest', search_url: '/search', all_products_collection_url: '/collections/all', account_url: '/account', account_login_url: '/account/login', account_register_url: '/account/register', product_recommendations_url: '/recommendations/products' },
  request: { locale: { iso_code: 'en' }, page_type: extra.page_type || 'index', origin: `http://localhost:${PORT}` },
  cart: cartDrop(),
  collections: { all: { title: 'All products', url: '/collections/all', handle: 'all', products: products.slice(0, 24).map((p) => productDrop(p)) } },
  localization: { available_countries: [], country: {} },
  canonical_url: url.href, page_title: extra.page_title || 'BLOGH', page_description: 'Performance apparel', content_for_header: '',
  template: { name: extra.page_type || 'index' }, customer: null, linklists: {},
  ...extra,
});

const MENU = {
  title: 'Main menu',
  links: ['Women', 'Men', 'Accessories'].map((t) => ({
    title: t, handle: t.toLowerCase(), url: '/collections/womens', current: false,
    links: t === 'Accessories' ? [] : [
      { title: 'New & featured', url: '/collections/all', links: ['New arrivals', 'Best sellers', 'Seamless', 'Last chance'].map((x) => ({ title: x, url: '/collections/all' })) },
      { title: 'Clothing', url: '/collections/all', links: ['Leggings', 'Sports bras', 'Shorts', 'T-shirts & tops', 'Hoodies'].map((x) => ({ title: x, url: '/collections/all' })) },
      { title: 'Shop by activity', url: '/collections/all', links: ['Training', 'Running', 'Lifting', 'Rest day'].map((x) => ({ title: x, url: '/collections/all' })) },
    ],
  })),
};

const FOOTER_MENU = { title: 'Help', links: ['Delivery', 'Returns', 'Size guide', 'Contact us', 'Track my order'].map((t) => ({ title: t, url: '/pages/help', links: [] })) };

const renderTemplate = async (name, url, extra) => {
  const tpl = JSON.parse(read(`templates/${name}.json`));
  const ctx = baseContext(url, extra);
  let content = '';
  for (const sid of tpl.order) content += await sectionHtml(tpl.sections[sid].type, sid, tpl.sections[sid], ctx);
  const layout = read('layout/theme.liquid');
  let html = await engine.parseAndRender(layout, { content_for_layout: content }, { globals: ctx });
  // harness-only: webfont for Archivo since font_face output is Shopify-hosted
  html = html.replace('</head>', `<style>@font-face{font-family:Archivo;font-weight:400;src:url(/fonts/archivo-latin-400-normal.woff2)}@font-face{font-family:Archivo;font-weight:700;src:url(/fonts/archivo-latin-700-normal.woff2)}@font-face{font-family:Archivo;font-weight:800;src:url(/fonts/archivo-latin-800-normal.woff2)}@font-face{font-family:Archivo;font-weight:900;src:url(/fonts/archivo-latin-900-normal.woff2)}</style></head>`);
  return html;
};

// Harness images assigned to image settings (in the real store these are set in the editor).
const assignImages = (useImages) => {
  for (const k of Object.keys(IMG_SETTINGS)) delete IMG_SETTINGS[k];
  if (!useImages) return;
  IMG_SETTINGS.hero = { image: new Img('hero.jpg', '', 2600, 1500), image_mobile: new Img('hero-mobile.jpg', '', 1200, 1800) };
  IMG_SETTINGS['tiles.t1'] = { image: new Img('tile-women.jpg', 'Woman training in seamless set', 1200, 1500), link: '/collections/womens' };
  IMG_SETTINGS['tiles.t2'] = { image: new Img('tile-men.jpg', 'Man lifting in training tee', 1200, 1500), link: '/collections/womens' };
  IMG_SETTINGS.campaign_split = { image: new Img('campaign-split.jpg', '', 1600, 1400) };
  IMG_SETTINGS.campaign_full = { image: new Img('campaign-full.jpg', '', 2600, 1400) };
  IMG_SETTINGS.editorial = { image: new Img('editorial.jpg', '', 1200, 1440), image_2: new Img('editorial-2.jpg', '', 1200, 900) };
};

const sectionsFor = async (ids, url) => {
  const out = {};
  for (const id of ids || []) {
    if (id === 'cart-drawer') out[id] = await sectionHtml('cart-drawer', 'cart-drawer', {}, baseContext(url));
    else if (id === 'main' && url.pathname.startsWith('/cart')) out[id] = await sectionHtml('main-cart', 'main', {}, baseContext(url));
    else if (id === 'main') out[id] = await sectionHtml('main-cart', 'main', {}, baseContext(url));
  }
  return out;
};

const MIME = { '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });
const send = (res, code, data, type = 'text/html') => { res.writeHead(code, { 'Content-Type': type }); res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  assignImages(url.searchParams.get('noimg') !== '1' && !(req.headers.referer || '').includes('noimg=1'));
  try {
    if (p.startsWith('/assets/')) return send(res, 200, fs.readFileSync(path.join(THEME, p)), MIME[path.extname(p)]);
    if (p.startsWith('/img/')) return send(res, 200, fs.readFileSync(path.join(HERE, p)), 'image/jpeg');
    if (p.startsWith('/fonts/')) return send(res, 200, fs.readFileSync(path.join(HERE, 'node_modules/@fontsource/archivo/files', path.basename(p))), 'font/woff2');
    if (p === '/__reset') { cart = { items: [], note: '' }; return send(res, 200, 'ok'); }
    if (p === '/cart.js') return send(res, 200, cartJSON(), 'application/json');
    if (p === '/cart/add.js') {
      const b = await body(req);
      for (const it of b.items) {
        const found = findVariant(it.id);
        if (!found || !found.v.available) return send(res, 422, { status: 422, message: 'Cart Error', description: `${found ? found.p.title : 'Item'} is sold out.` }, 'application/json');
        const line = cart.items.find((x) => x.id === Number(it.id));
        if (line) line.quantity += it.quantity || 1; else cart.items.push({ id: Number(it.id), quantity: it.quantity || 1 });
      }
      return send(res, 200, { items: b.items, sections: await sectionsFor(b.sections, new URL(b.sections_url || '/', url)) }, 'application/json');
    }
    if (p === '/cart/change.js') {
      const b = await body(req);
      const idx = b.line - 1;
      if (!cart.items[idx]) return send(res, 400, { status: 400, message: 'Cart Error', description: 'Line not found' }, 'application/json');
      if (b.quantity <= 0) cart.items.splice(idx, 1); else cart.items[idx].quantity = b.quantity;
      return send(res, 200, { ...cartJSON(), sections: await sectionsFor(b.sections, new URL(b.sections_url || '/', url)) }, 'application/json');
    }
    if (p === '/cart/update.js') { const b = await body(req); cart.note = b.note ?? cart.note; return send(res, 200, cartJSON(), 'application/json'); }
    if (p === '/search/suggest') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const hits = products.filter((x) => x.title.toLowerCase().includes(q) || x.type.toLowerCase().includes(q)).slice(0, 4).map((x) => productDrop(x));
      const ctx = baseContext(url, { predictive_search: { performed: true, terms: q, resources: { products: hits, queries: hits.length ? [{ url: `/search?q=${q}`, styled_text: `<mark>${q}</mark>` }] : [], collections: [], pages: [] } } });
      return send(res, 200, await sectionHtml('predictive-search', 'predictive-search', {}, ctx));
    }
    if (p === '/recommendations/products') {
      const ctx = baseContext(url, { recommendations: { performed: true, products_count: 8, products: products.slice(4, 12).map((x) => productDrop(x)) }, product: productDrop(products[0]) });
      return send(res, 200, await sectionHtml('related-products', url.searchParams.get('section_id'), {}, ctx));
    }
    if (p === '/' ) return send(res, 200, await renderTemplate('index', url, { page_type: 'index' }));
    if (p.startsWith('/collections/')) {
      const handle = p.split('/')[2];
      const { collection, paginate } = buildCollection(url, handle);
      const extra = { page_type: 'collection', collection, paginate, page_title: collection.title };
      if (url.searchParams.get('section_id')) return send(res, 200, await sectionHtml('main-collection', url.searchParams.get('section_id'), {}, baseContext(url, extra)));
      return send(res, 200, await renderTemplate('collection', url, extra));
    }
    if (p.startsWith('/products/')) {
      const prod = products.find((x) => x.handle === p.split('/')[2]);
      if (!prod) return send(res, 404, 'not found');
      return send(res, 200, await renderTemplate('product', url, { page_type: 'product', product: productDrop(prod, url.searchParams.get('variant')), page_title: prod.title, recommendations: { performed: false } }));
    }
    if (p === '/cart') return send(res, 200, await renderTemplate('cart', url, { page_type: 'cart' }));
    if (p === '/search') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const results = products.filter((x) => x.title.toLowerCase().includes(q)).map((x) => ({ ...productDrop(x), object_type: 'product' }));
      const search = { performed: !!q, terms: q, results, results_count: results.length, filters: [], sort_options: SORTS, sort_by: 'relevance', default_sort_by: 'relevance', url: '/search' };
      return send(res, 200, await renderTemplate('search', url, { page_type: 'search', search, paginate: { pages: 1 } }));
    }
    return send(res, 200, await renderTemplate('404', url, { page_type: '404' }));
  } catch (err) {
    console.error(err);
    send(res, 500, `<pre>${String(err.stack).replace(/</g, '&lt;')}</pre>`);
  }
}).listen(PORT, () => console.log(`harness on http://localhost:${PORT}`));

