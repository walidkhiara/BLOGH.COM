import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const near = (a, c, t = 0.011) => Math.abs(a - c) <= t;
const POLO = 'mens-premium-polo', SHOES = 'men-s-lace-up-canvas-shoes', ZIP = 'unisex-half-zip-pullover', PANTS = 'minimalist-japanese-calligraphy-sweatpants';
const enc = (o) => encodeURIComponent(Buffer.from(JSON.stringify(o)).toString('base64'));
const mk = async (vp = { width: 1440, height: 900 }) => { const ctx = await b.newContext({ viewport: vp, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); }); return { ctx, page, errors }; };
const vars = (page, h) => page.evaluate((h) => { const el = document.querySelector(`[data-iz-item][data-handle="${h}"]`); const g = (k) => parseFloat(el.style.getPropertyValue(k)); return { dx: g('--dx'), dy: g('--dy'), dw: g('--dw'), dr: g('--dr'), mx: g('--mx'), my: g('--my'), mw: g('--mw'), mr: g('--mr'), hd: el.hasAttribute('data-hd'), hm: el.hasAttribute('data-hm'), adj: el.hasAttribute('data-adjusted') }; }, h);
const BASE = { [POLO]: { dx: 57, dy: 64.5, dw: 8.5, dr: 0, mx: 50, my: 80.5, mw: 30, mr: 0 }, [SHOES]: { dx: 45, dy: 63.5, dw: 10.5, dr: 0, mx: 50, my: 46.5, mw: 26, mr: 0 }, [ZIP]: { dx: 27, dy: 80, dw: 9.5, dr: -3, mx: 30, my: 60, mw: 34, mr: -3 }, [PANTS]: { dx: 73, dy: 80, dw: 9.5, dr: 3, mx: 70, my: 68, mw: 34, mr: 3 } };
const closeTo = (v, want) => Object.keys(want).every((k) => near(v[k], want[k]));

// ---- no blocks: identical to the layout
{ const { ctx, page } = await mk(); await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const all = await Promise.all([POLO, SHOES, ZIP, PANTS].map((h) => vars(page, h)));
  ok('no adjust blocks: every value equals the layout', [POLO, SHOES, ZIP, PANTS].every((h, i) => closeTo(all[i], BASE[h]) && !all[i].adj && !all[i].hd && !all[i].hm)); await ctx.close(); }

// ---- sliders on one product, desktop and mobile separately
const ADJ = [{ p: POLO, ds: 150, dx: 3, dy: -2, dr: 10, ms: 80, mx: -5, my: 4, mr: -7, hm: true }];
{ const { ctx, page, errors } = await mk(); await page.goto(`${base}/?adj=${enc(ADJ)}`, { waitUntil: 'networkidle' });
  const v = await vars(page, POLO);
  ok('desktop size slider multiplies the layout width (8.5 x 150% = 12.75)', near(v.dw, 12.75), `${v.dw}`);
  ok('desktop move sliders are added to the layout position (57+3, 64.5-2)', near(v.dx, 60) && near(v.dy, 62.5), `${v.dx},${v.dy}`);
  ok('desktop rotate is added (0 + 10)', near(v.dr, 10), `${v.dr}`);
  ok('mobile has its own sliders (30 x 80% = 24; 50-5; 80.5+4; -7)', near(v.mw, 24) && near(v.mx, 45) && near(v.my, 84.5) && near(v.mr, -7), JSON.stringify([v.mw, v.mx, v.my, v.mr]));
  ok('"Hide on mobile" hides only on mobile', v.hm === true && v.hd === false);
  ok('the adjusted product is marked for the editor', v.adj === true);
  const others = await Promise.all([SHOES, ZIP, PANTS].map((h) => vars(page, h)));
  ok('the other three products are untouched', [SHOES, ZIP, PANTS].every((h, i) => closeTo(others[i], BASE[h]) && !others[i].adj));
  const r = await page.evaluate(() => { const el = document.querySelector(`[data-iz-item][data-handle="mens-premium-polo"]`).getBoundingClientRect(); const s = document.querySelector('[data-iz-stage]').getBoundingClientRect(); const node = document.querySelector(`[data-iz-item][data-handle="mens-premium-polo"]`); return { cx: ((el.left + el.width / 2 - s.left) / s.width) * 100, w: (node.offsetWidth / s.width) * 100 }; });
  ok('on screen it really sits at x=60% and is 12.75% wide', near(r.cx, 60, 0.3) && near(r.w, 12.75, 0.3), `${r.cx.toFixed(2)} / ${r.w.toFixed(2)}`);
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }
{ const { ctx, page } = await mk({ width: 390, height: 844 }); await page.goto(`${base}/?adj=${enc(ADJ)}`, { waitUntil: 'networkidle' });
  ok('on a phone the polo is hidden by "Hide on mobile"', await page.evaluate(() => getComputedStyle(document.querySelector('[data-iz-item][data-handle="mens-premium-polo"]')).display === 'none'));
  ok('on a phone the other products still show', (await page.evaluate(() => [...document.querySelectorAll('[data-iz-item]')].filter((e) => getComputedStyle(e).display !== 'none').length)) === 3); await ctx.close(); }
{ const { ctx, page } = await mk(); await page.goto(`${base}/?adj=${enc([{ p: POLO, hd: true }])}`, { waitUntil: 'networkidle' });
  ok('"Hide on desktop" hides it on desktop', await page.evaluate(() => getComputedStyle(document.querySelector('[data-iz-item][data-handle="mens-premium-polo"]')).display === 'none')); await ctx.close(); }

// ---- edge cases
for (const [label, adj, check] of [
  ['defaults (100% / 0) change nothing', [{ p: POLO }], (v) => closeTo(v[POLO], BASE[POLO])],
  ['a block for a product that is not placed does nothing', [{ p: 'not-placed', ds: 200 }], (v) => [POLO, SHOES, ZIP, PANTS].every((h) => closeTo(v[h], BASE[h]))],
  ['two blocks for the same product: the first wins', [{ p: POLO, ds: 200 }, { p: POLO, ds: 50 }], (v) => near(v[POLO].dw, 17)],
  ['moving past the edge is clamped to the studio (x 73+25 -> 98, then 100 max)', [{ p: PANTS, dx: 25 }, { p: ZIP, dx: -25 }], (v) => near(v[PANTS].dx, 98) && near(v[ZIP].dx, 2)],
  ['size is clamped (huge size cannot exceed 95%)', [{ p: SHOES, ds: 250 }], (v) => near(v[SHOES].dw, 26.25)],
  ['several products can be adjusted independently', [{ p: POLO, ds: 120 }, { p: SHOES, ds: 90 }, { p: ZIP, dy: 2 }], (v) => near(v[POLO].dw, 10.2) && near(v[SHOES].dw, 9.45) && near(v[ZIP].dy, 82) && closeTo(v[PANTS], BASE[PANTS])]]) {
  const { ctx, page } = await mk(); await page.goto(`${base}/?adj=${enc(adj)}`, { waitUntil: 'networkidle' });
  const v = {}; for (const h of [POLO, SHOES, ZIP, PANTS]) v[h] = await vars(page, h);
  ok(label, check(v), JSON.stringify(Object.fromEntries(Object.entries(v).map(([k, x]) => [k.slice(0, 5), [x.dx, x.dy, x.dw]])))); await ctx.close(); }

// ---- together with auto-switch, and the placement editor
{ const { ctx, page } = await mk(); await page.goto(`${base}/?adj=${enc([{ p: POLO, ds: 140 }])}&sw=${enc([{ p: POLO, n: [SHOES, ZIP], i: 4 }])}`, { waitUntil: 'networkidle' });
  const v = await vars(page, POLO);
  ok('sliders and auto-switch work together on one product', near(v.dw, 11.9) && (await page.locator(`[data-iz-item][data-handle="${POLO}"] .iz-sw__slide`).count()) === 3, `${v.dw}`); await ctx.close(); }
{ const { ctx, page, errors } = await mk(); await page.goto(`${base}/?izaven-editor=1&adj=${enc([{ p: POLO, ds: 150, dx: 4 }])}`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  ok('editor explains that sliders apply on top of the layout', await page.locator('[data-adj-note]').isVisible() && /on top of this layout/.test(await page.textContent('[data-adj-note]')));
  ok('editor marks the adjusted product', (await page.textContent('.ized-list')).includes('size sliders applied on store'));
  const e = await vars(page, POLO);
  ok('editor shows the plain layout (8.5 wide at x=57), so what you drag is what you copy', near(e.dw, 8.5) && near(e.dx, 57), `${e.dw},${e.dx}`);
  await page.click('.ized-list li[data-id="2"]');
  const d = await page.evaluate(() => { const bx = document.querySelector('.ized-box').getBoundingClientRect(); const a = document.querySelector('[data-iz-item][data-id="2"]').getBoundingClientRect(); return Math.max(Math.abs(bx.width - a.width), Math.abs(bx.left - a.left), Math.abs(bx.top - a.top)); });
  ok('editor selection box still sits on the picture', d < 1.5, `Δ ${d.toFixed(2)}px`);
  await page.click('[data-act=copy]'); const copied = await page.evaluate(() => navigator.clipboard.readText());
  ok('the copied layout does not contain the slider values (they live in the theme blocks)', !/12\.75|d_size/.test(copied) && copied.includes('57,64.5,8.5'));
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }
await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
