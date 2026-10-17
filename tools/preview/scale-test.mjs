import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const near = (a, b2, t = 0.6) => Math.abs(a - b2) <= t;
const mk = async (w, h) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); return { ctx, page: await ctx.newPage() }; };
const itemW = (page) => page.evaluate(() => { const st = document.querySelector('[data-iz-stage]').getBoundingClientRect().width; const el = document.querySelector('[data-iz-item][data-id="1"]'); return (el.getBoundingClientRect().width / st) * 100; });
const strip = (page) => page.evaluate(() => {
  const g = document.querySelector('.iz-feature__grid'); const cols = getComputedStyle(g).gridTemplateColumns.split(' ').length;
  const m = document.querySelector('.iz-card__media'); const r = m.getBoundingClientRect(); const i = m.querySelector('img').getBoundingClientRect();
  return { cols, ratio: +(r.width / r.height).toFixed(2), fit: getComputedStyle(m.querySelector('img')).objectFit, imgOfFrame: +(i.width / r.width).toFixed(2) };
});

// default layout: unchanged behaviour (shoes are 10.5% wide on desktop, 26% on mobile)
{ const { ctx, page } = await mk(1440, 900); await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('default desktop width unchanged (10.5%)', near(await itemW(page), 10.5), `${(await itemW(page)).toFixed(2)}%`);
  const s = await strip(page); ok('default strip: 4 cols, portrait, cover, full size', s.cols === 4 && s.ratio === 0.8 && s.fit === 'cover' && s.imgOfFrame > 0.97, JSON.stringify(s)); await ctx.close(); }
{ const { ctx, page } = await mk(390, 844); await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('default mobile width unchanged (26%)', near(await itemW(page), 26), `${(await itemW(page)).toFixed(2)}%`);
  const s = await strip(page); ok('default strip mobile: 2 cols', s.cols === 2, JSON.stringify(s)); await ctx.close(); }

// scenario: desktop 150%, mobile 50%, 3 / 1 columns, square, contain, 80%
{ const { ctx, page } = await mk(1440, 900); await page.goto(`${base}/?scenario=scale`, { waitUntil: 'networkidle' });
  ok('desktop scale 150% multiplies placement width', near(await itemW(page), 10.5 * 1.5), `${(await itemW(page)).toFixed(2)}% (want 15.75)`);
  const s = await strip(page);
  ok('strip: 3 desktop columns', s.cols === 3, JSON.stringify(s));
  ok('strip: square frames', s.ratio === 1, JSON.stringify(s));
  ok('strip: show whole image (contain)', s.fit === 'contain');
  ok('strip: image is 80% of its frame', near(s.imgOfFrame, 0.8, 0.03), `${s.imgOfFrame}`);
  await ctx.close(); }
{ const { ctx, page } = await mk(390, 844); await page.goto(`${base}/?scenario=scale`, { waitUntil: 'networkidle' });
  ok('mobile scale 50% multiplies placement width', near(await itemW(page), 26 * 0.5), `${(await itemW(page)).toFixed(2)}% (want 13)`);
  const s = await strip(page); ok('strip: 1 mobile column', s.cols === 1, JSON.stringify(s));
  ok('no horizontal overflow with 1 column', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await ctx.close(); }
{ const { ctx, page } = await mk(768, 900); await page.goto(`${base}/?scenario=scale`, { waitUntil: 'networkidle' });
  const s = await strip(page); ok('tablet caps columns at 3 (3 chosen)', s.cols === 3, JSON.stringify(s)); await ctx.close(); }

// editor: scale-all buttons
{ const { ctx, page } = await mk(1440, 900); await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  const w0 = await itemW(page);
  await page.click('[data-act=scale-up]');
  const w1 = await itemW(page);
  ok('Scale all +10% grows every placement', near(w1 / w0, 1.1, 0.01), `${w0.toFixed(2)} → ${w1.toFixed(2)}`);
  const all = await page.evaluate(() => [...document.querySelectorAll('[data-iz-item]')].map((e) => parseFloat(e.style.getPropertyValue('--dw'))));
  ok('…all four placements changed together', all.length === 4 && near(all[0], 11.55, 0.01) && near(all[2], 10.45, 0.01), all.join(', '));
  const mobileUntouched = await page.evaluate(() => parseFloat(document.querySelector('[data-iz-item][data-id="1"]').style.getPropertyValue('--mw')));
  ok('…the mobile layout is not changed', near(mobileUntouched, 26, 0.001));
  await page.click('[data-act=scale-down]'); await page.click('[data-act=scale-down]');
  ok('Scale all −10% shrinks them', (await itemW(page)) < w0);
  await page.click('[data-act=undo]'); await page.click('[data-act=undo]');
  ok('one undo per Scale-all click', near(await itemW(page), w1, 0.02), `${(await itemW(page)).toFixed(2)} vs ${w1.toFixed(2)}`);
  await ctx.close(); }

// editor + global scale: the selection box must sit on the picture
{ const { ctx, page } = await mk(1440, 900); await page.goto(`${base}/?izaven-editor=1&scenario=scale`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  await page.click('.ized-list li[data-id="1"]');
  const d = await page.evaluate(() => { const b = document.querySelector('.ized-box').getBoundingClientRect(); const i = document.querySelector('[data-iz-item][data-id="1"]').getBoundingClientRect(); return { dw: Math.abs(b.width - i.width), dh: Math.abs(b.height - i.height), dx: Math.abs(b.left - i.left), dy: Math.abs(b.top - i.top) }; });
  ok('selection box matches the scaled picture', d.dw < 1.5 && d.dh < 1.5 && d.dx < 1.5 && d.dy < 1.5, JSON.stringify(d));
  await ctx.close(); }

await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
