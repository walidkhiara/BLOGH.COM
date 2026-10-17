// Local preview harness. Renders the theme's Liquid with an open-source engine
// and test data, then serves it. It proves layout, scripts and editor behaviour
// in a real browser; it is NOT Shopify rendering the files.
import { Liquid } from 'liquidjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(here, '../../theme');

const FIX = {
  'unisex-half-zip-pullover': { title: 'Unisex half-zip pullover', price: 4807, src: '/fixtures/halfzip.png', w: 800, h: 1000 },
  'mens-premium-polo': { title: "Men's Premium Polo", price: 3500, src: '/fixtures/polo.png', w: 800, h: 1000 },
  'men-s-lace-up-canvas-shoes': { title: 'Men’s lace-up canvas shoes', price: 5999, src: '/fixtures/shoes.png', w: 1000, h: 1000 },
  'minimalist-japanese-calligraphy-sweatpants': { title: 'Minimalist Japanese Calligraphy Sweatpants', price: 6288, src: '/fixtures/sweatpants.png', w: 800, h: 1000 }
};
const dims = Object.fromEntries(Object.values(FIX).map((p) => [p.src, p]));

function product(handle) {
  const p = FIX[handle];
  if (!p) return undefined;
  return { title: p.title, handle, url: `/products/${handle}`, price: p.price, price_varies: false, featured_media: { src: p.src } };
}

function makeEngine(globals) {
  const engine = new Liquid({ root: [path.join(theme, 'sections')], partials: [path.join(theme, 'snippets')], extname: '.liquid', ownPropertyOnly: false, strictVariables: false, strictFilters: false, globals });
  engine.registerFilter('asset_url', (n) => `/assets/${n}`);
  engine.registerFilter('image_url', (o) => (o && o.src) || '');
  // liquidjs passes named filter arguments as [key, value] pairs; Shopify passes an options hash.
  const opts = (args) => Object.fromEntries(args.filter(Array.isArray));
  engine.registerFilter('image_tag', (url, ...args) => {
    const o = opts(args);
    const d = dims[url] || {};
    return `<img src="${url}"${d.w ? ` width="${d.w}" height="${d.h}"` : ''} class="${o.class || ''}" alt="${(o.alt || '').replace(/"/g, '&quot;')}" loading="${o.loading || 'lazy'}"${o.draggable ? ` draggable="${o.draggable}"` : ''}>`;
  });
  engine.registerFilter('money', (c) => `$${(Number(c) / 100).toFixed(2)}`);
  engine.registerFilter('payment_type_svg_tag', (t, ...args) => { const o = opts(args); return `<svg class="${o.class || ''}" viewBox="0 0 38 24" width="38" height="24" role="img" aria-labelledby="pi-${t}"><title id="pi-${t}">${t}</title><rect width="38" height="24" rx="3" fill="#fff"/></svg>`; });
  return engine;
}

function prep(src) {
  let schema = null;
  let css = '';
  src = src.replace(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/, (_, j) => { schema = JSON.parse(j); return ''; });
  src = src.replace(/\{%-?\s*stylesheet\s*-?%\}([\s\S]*?)\{%-?\s*endstylesheet\s*-?%\}/g, (_, c) => { css += c; return ''; });
  src = src.replace(/\{%-?\s*form\s+'customer'[^%]*-?%\}/g, '<form method="post" action="/contact#izf-newsletter" class="izf__form">').replace(/\{%-?\s*endform\s*-?%\}/g, '</form>');
  return { src, schema, css };
}

function defaults(schema) {
  const o = {};
  (schema.settings || []).forEach((s) => { if (s.id) o[s.id] = s.default !== undefined ? s.default : ''; });
  return o;
}

export async function buildPage(opts = {}) {
  const pagesExisting = opts.pages || ['contact'];
  const globals = {
    shop: { name: 'IZAVEN', permanent_domain: 'izaven.myshopify.com', privacy_policy: { url: '/policies/privacy-policy' }, refund_policy: { url: '/policies/refund-policy' }, shipping_policy: opts.noShipping ? undefined : { url: '/policies/shipping-policy' }, terms_of_service: { url: '/policies/terms-of-service' }, enabled_payment_types: ['visa', 'master', 'american_express'] },
    routes: { root_url: '/', all_products_collection_url: '/collections/all', search_url: '/search', cart_url: '/cart' },
    cart: { item_count: opts.cartCount || 0 },
    settings: {},
    linklists: {},
    pages: new Proxy({}, { get: (_, h) => (pagesExisting.includes(String(h)) ? { url: `/pages/${String(h)}` } : undefined) }),
    collections: new Proxy({}, { get: (_, h) => ({ all: { url: '/collections/all', products_count: 4, products: Object.keys(FIX).map(product) }, 'men-tops-shirts': { url: '/collections/men-tops-shirts', title: 'Tops', products_count: 2 }, bottoms: { url: '/collections/bottoms', title: 'Bottoms', products_count: 1 }, 'sneakers-shoes': { url: '/collections/sneakers-shoes', title: 'Sneakers & Shoes', products_count: 1 }, 'men-leather-jackets': { url: '/collections/men-leather-jackets', title: 'Men Leather Jackets', products_count: 0 } })[String(h)] }),
    all_products: new Proxy({}, { get: (_, h) => product(String(h)) }),
    form: { email: '', errors: false, 'posted_successfully?': false }
  };

  const engine = makeEngine(globals);
  async function section(file, overrides, blocks = []) {
    const p = prep(fs.readFileSync(path.join(theme, 'sections', file), 'utf8'));
    const settings = { ...defaults(p.schema), ...overrides };
    for (const k of ['shop_menu', 'brand_menu', 'help_menu']) if (settings[k] === '') settings[k] = undefined;
    for (const k of ['shop_menu', 'brand_menu', 'help_menu']) if (settings[k] === '') settings[k] = undefined;
    const html = await engine.parseAndRender(p.src, { section: { id: file.replace('.liquid', ''), settings, blocks } });
    return { html, css: p.css };
  }

  const defaultLayout = fs.readFileSync(path.join(here, 'layout.default.txt'), 'utf8');
  const layout = opts.layout !== undefined ? opts.layout : defaultLayout;
  const blocks = (opts.switches || []).map((s) => {
    const list = Array.isArray(s.n) ? s.n : [s.n];
    const keys = ['next_product', 'product_3', 'product_4', 'product_5', 'product_6'];
    const settings = { enabled: s.e !== false, product: product(s.p), interval: s.i };
    keys.forEach((k, i) => { settings[k] = list[i] ? product(list[i]) : undefined; });
    return { type: 'auto_switch', settings };
  });
  const show = await section('izaven-showroom.liquid', { layout, ...(opts.showroom || {}) }, blocks);
  const foot = await section('izaven-footer.liquid', opts.footer || {});

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>harness</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#f7f6f2;color:#171717}</style>
<style>${show.css}</style><style>${foot.css}</style></head>
<body class="template-index"><div class="page-wrapper"><div id="header-group"><div style="background:#e8e0d0;height:60px;padding:20px">THEME HEADER (hidden on home by the section)</div></div>
<main id="MainContent"><div id="shopify-section-showroom" class="shopify-section">${show.html}</div></main>
<footer><div id="shopify-section-footer" class="shopify-section">${foot.html}</div></footer></div></body></html>`;
}

export const catalog = Object.entries(FIX).map(([handle, p]) => ({ handle, title: p.title, images: [{ src: p.src }], variants: [{ price: (p.price / 100).toFixed(2) }] }));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

export function serve(port = 0, defaults_ = {}) {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    try {
      if (u.pathname === '/products.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ products: catalog })); }
      if (u.pathname.startsWith('/assets/')) { const f = path.join(theme, 'assets', path.basename(u.pathname)); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); return res.end(fs.readFileSync(f)); }
      if (u.pathname.startsWith('/fixtures/')) { const f = path.join(here, 'fixtures', path.basename(u.pathname)); res.writeHead(200, { 'content-type': 'image/png' }); return res.end(fs.readFileSync(f)); }
      if (u.pathname.startsWith('/products/')) { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<h1>product page</h1>'); }
      if (u.pathname === '/') {
        const sc = u.searchParams.get('scenario') || 'default';
        const o = { ...defaults_ };
        if (u.searchParams.get('layout')) o.layout = Buffer.from(u.searchParams.get('layout'), 'base64').toString('utf8');
        if (u.searchParams.get('sw')) o.switches = JSON.parse(Buffer.from(u.searchParams.get('sw'), 'base64').toString('utf8'));
        if (u.searchParams.get('repo')) o.showroom = { ...(o.showroom || {}), apply_repo: u.searchParams.get('repo') };
        if (sc === 'empty') o.layout = '';
        if (sc === 'missing') o.layout = '# test\nthis-product-was-deleted | f | 50,50,12,0,1,100,0,1 | 50,50,24,0,1,100,0,1\nmens-premium-polo | f | 50,60,12,0,2,100,0,1 | 50,40,26,0,2,100,0,1';
        if (sc === 'crlf') o.layout = fs.readFileSync(path.join(here, 'layout.default.txt'), 'utf8').replace(/\n/g, '\r\n');
        if (sc === 'nofeature') o.showroom = { featured_count: 0 };
        if (sc === 'scale') o.showroom = { placement_scale_desktop: 150, placement_scale_mobile: 50, featured_columns_desktop: 3, featured_columns_mobile: 1, featured_image_ratio: 'square', featured_image_fit: 'contain', featured_image_size: 80 };
        if (sc === 'heading') o.showroom = { heading: 'Quiet power', eyebrow: 'Collection 01' };
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(await buildPage(o));
      }
      res.writeHead(404); res.end('not found');
    } catch (e) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(e.stack || e)); }
  });
  return new Promise((r) => server.listen(port, () => r({ server, port: server.address().port })));
}
