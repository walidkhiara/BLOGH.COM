import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const POLO = 'mens-premium-polo', SHOES = 'men-s-lace-up-canvas-shoes', ZIP = 'unisex-half-zip-pullover', PANTS = 'minimalist-japanese-calligraphy-sweatpants';
const sw = (arr) => encodeURIComponent(Buffer.from(JSON.stringify(arr)).toString('base64'));
const url = (arr, extra = '') => `${base}/?sw=${sw(arr)}${extra}`;
const TWO = [{ p: POLO, n: SHOES, i: 4 }, { p: PANTS, n: ZIP, i: 6 }];
// the fake clock otherwise keeps ticking during page load, which would eat into the first interval
const freeze = async (page) => { await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z')); };
const mk = async (o = {}) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...o }); const page = await ctx.newPage(); const errors = []; page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message)); return { ctx, page, errors }; };
const shown = (page, h) => page.evaluate((h) => { const a = document.querySelector(`[data-iz-item][data-handle="${h}"]`); return { href: a.getAttribute('href').split('/').pop(), cur: a.querySelector('.iz-sw__slide.is-current')?.getAttribute('data-href')?.split('/').pop() || null, name: (a.querySelector('.iz-sw__slide.is-current .iz-item__name') || a.querySelector('.iz-item__name')).textContent }; }, h);
const rect = (page, h) => page.evaluate((h) => { const a = document.querySelector(`[data-iz-item][data-handle="${h}"]`); const r = a.getBoundingClientRect(); const s = document.querySelector('[data-iz-stage]').getBoundingClientRect(); return { cx: +(((r.left + r.width / 2 - s.left) / s.width) * 100).toFixed(2), cy: +(((r.top + r.height / 2 - s.top) / s.height) * 100).toFixed(2), w: +r.width.toFixed(1), h: +r.height.toFixed(1), stageH: +s.height.toFixed(1) }; }, h);
const same = (a, c) => a.cx === c.cx && a.cy === c.cy && Math.abs(a.w - c.w) < 0.6 && Math.abs(a.h - c.h) < 0.6 && Math.abs(a.stageH - c.stageH) < 0.6;

// ---- 1. markup: only chosen products switch
{ const { ctx, page, errors } = await mk(); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  const flags = await page.$$eval('[data-iz-item]', (els) => els.map((e) => [e.dataset.handle, e.hasAttribute('data-iz-switch'), !!e.querySelector('.iz-sw__stack')]));
  ok('only the two chosen products get switching', JSON.stringify(flags.filter((f) => f[1]).map((f) => f[0]).sort()) === JSON.stringify([PANTS, POLO].sort()), JSON.stringify(flags));
  ok('the other two placements have no extra markup', flags.filter((f) => !f[1]).every((f) => f[2] === false));
  ok('still 4 placements, no duplicates', (await page.locator('[data-iz-item]').count()) === 4);
  ok('each switching item holds exactly the original and the owner-picked product', await page.evaluate(() => [...document.querySelectorAll('[data-iz-switch]')].every((a) => a.querySelectorAll('.iz-sw__slide').length === 2)));
  ok('starts on the original product', (await shown(page, POLO)).cur === POLO && (await shown(page, PANTS)).cur === PANTS);
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }

// ---- 2. timing, independence, position, loop (controlled clock)
{ const { ctx, page } = await mk(); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  const before = { polo: await rect(page, POLO), pants: await rect(page, PANTS), shoes: await rect(page, SHOES), zip: await rect(page, ZIP) };
  const otherBefore = { shoes: await shown(page, SHOES), zip: await shown(page, ZIP) };
  await page.clock.runFor(3900);
  ok('nothing changes before 4s', (await shown(page, POLO)).cur === POLO);
  await page.clock.runFor(200); // t = 4.1s
  ok('4s: polo switches to the shoes the owner picked', (await shown(page, POLO)).cur === SHOES, JSON.stringify(await shown(page, POLO)));
  ok('4s: the link follows the new product', (await shown(page, POLO)).href === SHOES);
  ok('4s: the name shown follows the new product', (await shown(page, POLO)).name.includes('lace-up'));
  ok('4s: sweatpants (6s interval) has NOT switched', (await shown(page, PANTS)).cur === PANTS);
  ok('position and size of the switched product are identical', same(before.polo, await rect(page, POLO)), `${JSON.stringify(before.polo)} vs ${JSON.stringify(await rect(page, POLO))}`);
  await page.clock.runFor(2400); // t = 6.5s
  ok('6s: sweatpants switches to the half-zip on its own timer', (await shown(page, PANTS)).cur === ZIP);
  ok('6s: polo still shows the shoes', (await shown(page, POLO)).cur === SHOES);
  ok('sweatpants position/size identical after switching', same(before.pants, await rect(page, PANTS)));
  await page.clock.runFor(1700); // t = 8.2s
  ok('8s: polo returns to the original (continuous loop)', (await shown(page, POLO)).cur === POLO);
  ok('…and its link is the polo again', (await shown(page, POLO)).href === POLO);
  await page.clock.runFor(4000); // t = 12.2s
  ok('12s: polo switches again (keeps looping)', (await shown(page, POLO)).cur === SHOES);
  await page.clock.runFor(400); // t = 12.6s
  ok('12.4s: sweatpants returns to the original', (await shown(page, PANTS)).cur === PANTS);
  ok('products without a switch never changed', JSON.stringify(await shown(page, SHOES)) === JSON.stringify(otherBefore.shoes) && JSON.stringify(await shown(page, ZIP)) === JSON.stringify(otherBefore.zip));
  ok('their positions never moved', same(before.shoes, await rect(page, SHOES)) && same(before.zip, await rect(page, ZIP)));
  await ctx.close(); }

// ---- 2b. more than two products: an ordered cycle that wraps back to the first
{ const { ctx, page } = await mk(); await freeze(page); await page.goto(url([{ p: POLO, n: [SHOES, ZIP, PANTS], i: 3 }]), { waitUntil: 'networkidle' });
  ok('4 products in one placement', (await page.locator('[data-iz-item][data-handle="' + POLO + '"] .iz-sw__slide').count()) === 4);
  const r0 = await rect(page, POLO);
  const order = [];
  for (let i = 0; i < 9; i++) { await page.clock.runFor(i === 0 ? 3100 : 3000); order.push((await shown(page, POLO)).cur); }
  const want = [SHOES, ZIP, PANTS, POLO, SHOES, ZIP, PANTS, POLO, SHOES];
  ok('cycles in the owner\'s order and wraps back to the first (x2 laps)', JSON.stringify(order) === JSON.stringify(want), order.map((x) => x.slice(0, 8)).join(' > '));
  ok('the link and name follow every step', (await shown(page, POLO)).href === SHOES && (await shown(page, POLO)).name.includes('lace-up'));
  ok('same position and size after 9 changes', same(r0, await rect(page, POLO)));
  ok('exactly one product is visible at any time', await page.evaluate(() => document.querySelectorAll('[data-iz-item][data-handle] .iz-sw__slide.is-current').length === 1)); await ctx.close(); }
for (const [label, list, expectCount, expectOrder] of [
  ['an empty slot in the middle is skipped', [SHOES, '', PANTS], 3, [SHOES, PANTS, POLO]],
  ['a product picked twice appears once', [SHOES, SHOES, ZIP], 3, [SHOES, ZIP, POLO]],
  ['the placed product repeated in the list is ignored', [POLO, SHOES], 2, [SHOES, POLO]],
  ['a deleted product in the middle is skipped', [SHOES, 'deleted-product', ZIP], 3, [SHOES, ZIP, POLO]]]) {
  const { ctx, page } = await mk(); await freeze(page); await page.goto(url([{ p: POLO, n: list, i: 2 }]), { waitUntil: 'networkidle' });
  const n = await page.locator('[data-iz-item][data-handle="' + POLO + '"] .iz-sw__slide').count();
  const got = []; for (let i = 0; i < expectOrder.length; i++) { await page.clock.runFor(i === 0 ? 2100 : 2000); got.push((await shown(page, POLO)).cur); }
  ok(label, n === expectCount && JSON.stringify(got) === JSON.stringify(expectOrder), `${n} slides: ${got.map((x) => x.slice(0, 8)).join(' > ')}`); await ctx.close(); }
{ const schema = JSON.parse((await import('node:fs')).readFileSync('../../theme/sections/izaven-showroom.liquid', 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/)[1]);
  const ids = schema.blocks.find((x) => x.type === 'auto_switch').settings.map((x) => x.id);
  ok('the block offers 6 product pickers (placed + 5 more)', ['product', 'next_product', 'product_3', 'product_4', 'product_5', 'product_6'].every((k) => ids.includes(k)), ids.join(',')); }

// ---- 3. configuration edge cases
for (const [label, cfg, expectSwitch] of [
  ['disabled block does nothing', [{ p: POLO, n: SHOES, i: 4, e: false }], 0],
  ['next == same product is ignored', [{ p: POLO, n: POLO, i: 4 }], 0],
  ['missing / deleted next product is ignored', [{ p: POLO, n: 'deleted-product', i: 4 }], 0],
  ['block for a product that is not placed is ignored', [{ p: 'not-placed', n: SHOES, i: 4 }], 0],
  ['all four enabled works', [{ p: POLO, n: SHOES, i: 4 }, { p: SHOES, n: POLO, i: 5 }, { p: ZIP, n: PANTS, i: 6 }, { p: PANTS, n: ZIP, i: 7 }], 4],
  ['custom interval is written to the page', [{ p: POLO, n: SHOES, i: 9 }], 1]]) {
  const { ctx, page } = await mk(); await page.goto(url(cfg), { waitUntil: 'networkidle' });
  const n = await page.locator('[data-iz-switch]').count();
  ok(label, n === expectSwitch, `${n} switching`);
  if (label.startsWith('custom')) ok('interval attribute = 9 seconds', (await page.getAttribute('[data-iz-switch]', 'data-iz-switch')) === '9');
  await ctx.close(); }
{ const { ctx, page } = await mk(); await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('no blocks at all: homepage identical to before (none switch)', (await page.locator('[data-iz-switch]').count()) === 0 && (await page.locator('.iz-sw__stack').count()) === 0); await ctx.close(); }

// ---- 4. pause rules
{ const { ctx, page } = await mk({ reducedMotion: 'reduce' }); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  await page.clock.runFor(30000);
  ok('reduced motion: nothing switches automatically', (await shown(page, POLO)).cur === POLO && (await shown(page, PANTS)).cur === PANTS); await ctx.close(); }
{ const { ctx, page } = await mk(); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  await page.clock.runFor(1000);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(20000);
  ok('hidden tab: no switching while hidden', (await shown(page, POLO)).cur === POLO);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(3500);
  ok('back in view: waits a full interval, not an instant jump', (await shown(page, POLO)).cur === POLO);
  await page.clock.runFor(700);
  ok('back in view: switches after the interval', (await shown(page, POLO)).cur === SHOES); await ctx.close(); }
{ const { ctx, page } = await mk(); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  const r = await rect(page, POLO); const box = await page.evaluate(() => { const x = document.querySelector('[data-iz-stage]').getBoundingClientRect(); return { x: x.left, y: x.top, w: x.width, h: x.height }; });
  await page.mouse.move(box.x + (r.cx / 100) * box.w, box.y + (r.cy / 100) * box.h);
  await page.clock.runFor(15000);
  ok('hovering a product pauses its switch', (await shown(page, POLO)).cur === POLO);
  await page.mouse.move(5, 5); await page.clock.runFor(4300);
  ok('moving away resumes it', (await shown(page, POLO)).cur === SHOES); await ctx.close(); }

// ---- 5. real-time transition quality
{ const { ctx, page } = await mk(); await page.goto(url([{ p: POLO, n: SHOES, i: 2 }]), { waitUntil: 'networkidle' });
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.iz-sw__slide')).transitionDuration);
  ok('transition lasts 0.9s (within the 700–1000ms brief)', dur.startsWith('0.9s'), dur);
  const samples = [];
  await page.waitForFunction(() => document.querySelector('.iz-sw__slide:nth-child(2)').classList.contains('is-current'), null, { timeout: 5000 });
  for (let i = 0; i < 10; i++) { samples.push(await page.evaluate(() => { const [a, c] = document.querySelectorAll('.iz-sw__slide'); return [+getComputedStyle(a).opacity, +getComputedStyle(c).opacity, a.getBoundingClientRect().height]; })); await page.waitForTimeout(110); }
  const outgoing = samples.map((s) => s[0]); const incoming = samples.map((s) => s[1]);
  ok('outgoing fades out smoothly (never jumps, ends at 0)', outgoing[0] > 0 && outgoing.every((v, i) => i === 0 || v <= outgoing[i - 1] + 0.01) && outgoing.at(-1) < 0.02, outgoing.map((v) => v.toFixed(2)).join(' '));
  ok('incoming fades in smoothly (never jumps, ends at 1)', incoming.every((v, i) => i === 0 || v >= incoming[i - 1] - 0.01) && incoming.at(-1) > 0.98, incoming.map((v) => v.toFixed(2)).join(' '));
  ok('there is never a blank moment (combined opacity stays high)', samples.every((s) => s[0] + s[1] > 0.7), samples.map((s) => (s[0] + s[1]).toFixed(2)).join(' '));
  await ctx.close(); }

// ---- 6. mobile positioning + links
{ const { ctx, page } = await mk({ viewport: { width: 390, height: 844 } }); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  const r0 = await rect(page, POLO);
  ok('mobile: polo sits at its mobile position (50%, 80.5%)', Math.abs(r0.cx - 50) < 0.3 && Math.abs(r0.cy - 80.5) < 0.3, JSON.stringify(r0));
  await page.clock.runFor(4100);
  ok('mobile: it switches', (await shown(page, POLO)).cur === SHOES);
  ok('mobile: same position after the switch', same(r0, await rect(page, POLO)));
  ok('mobile: no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close(); }
{ const { ctx, page } = await mk(); await freeze(page); await page.goto(url(TWO), { waitUntil: 'networkidle' });
  await page.clock.runFor(4100);
  const r = await rect(page, POLO); const s = await page.evaluate(() => { const x = document.querySelector('[data-iz-stage]').getBoundingClientRect(); return { x: x.left, y: x.top, w: x.width, h: x.height }; });
  await Promise.all([page.waitForURL('**/products/' + SHOES), page.mouse.click(s.x + (r.cx / 100) * s.w, s.y + (r.cy / 100) * s.h)]);
  ok('clicking the switched product opens the product the owner picked', page.url().endsWith('/products/' + SHOES), page.url()); await ctx.close(); }

// ---- 7. the placement editor is unaffected, and never shows the swap
{ const { ctx, page, errors } = await mk({ permissions: ['clipboard-read', 'clipboard-write'] }); await freeze(page); await page.goto(url(TWO, '&izaven-editor=1'), { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  await page.clock.runFor(30000);
  ok('editor: products never swap while you edit', (await shown(page, POLO)).cur === POLO && (await shown(page, PANTS)).cur === PANTS);
  ok('editor: only the original is visible', await page.evaluate(() => [...document.querySelectorAll('.iz-sw__slide:not(.is-current)')].every((s) => getComputedStyle(s).display === 'none')));
  ok('editor: list says which placements auto-switch', (await page.textContent('.ized-list')).includes('auto-switches'));
  await page.click(`.ized-list li[data-id="2"]`);
  const d = await page.evaluate(() => { const b = document.querySelector('.ized-box').getBoundingClientRect(); const a = document.querySelector('[data-iz-item][data-id="2"]').getBoundingClientRect(); return Math.max(Math.abs(b.width - a.width), Math.abs(b.height - a.height), Math.abs(b.left - a.left), Math.abs(b.top - a.top)); });
  ok('editor: selection box still matches a switching placement', d < 1.5, `Δ ${d.toFixed(2)}px`);
  const c = await page.evaluate(() => { const r = document.querySelector('[data-iz-item][data-id="2"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x + 60, c.y + 20, { steps: 6 }); await page.mouse.up();
  ok('editor: a switching placement can still be dragged', (await page.evaluate(() => parseFloat(document.querySelector('[data-iz-item][data-id="2"]').style.getPropertyValue('--dx')))) > 57.5);
  await page.click('[data-act=copy]');
  const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok('editor: the layout text does not contain the switch settings (they live in the theme blocks)', !copied.includes('auto_switch') && !copied.includes('@switch'));
  ok('editor: no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }

await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
