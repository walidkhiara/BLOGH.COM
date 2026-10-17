import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
import fs from 'node:fs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const near = (a, b2, t = 0.6) => Math.abs(a - b2) <= t;
const mk = async (w = 1440, h = 900) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errors = []; page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message)); return { ctx, page, errors }; };
const base4 = fs.readFileSync('layout.default.txt', 'utf8').trim();
const b64 = (t) => encodeURIComponent(Buffer.from(t).toString('base64'));
// where each card's picture sits inside its own frame, as fractions of the frame
const cardGeom = (page) => page.evaluate(() => [...document.querySelectorAll('.iz-feature .iz-card')].map((a) => {
  const f = a.querySelector('.iz-card__media').getBoundingClientRect(); const i = a.querySelector('.iz-card__media img').getBoundingClientRect();
  return { h: a.getAttribute('href').split('/').pop(), l: +((i.left - f.left) / f.width).toFixed(3), t: +((i.top - f.top) / f.height).toFixed(3), w: +(i.width / f.width).toFixed(3), hh: +(i.height / f.height).toFixed(3) };
}));

// 1. storefront reads @card lines; placements ignore them
{
  const layout = base4 + '\n@card unisex-half-zip-pullover | 150,10,-20';
  const { ctx, page, errors } = await mk(); await page.goto(`${base}/?layout=${b64(layout)}`, { waitUntil: 'networkidle' });
  const g = await cardGeom(page);
  const hz = g.find((x) => x.h === 'unisex-half-zip-pullover'); const po = g.find((x) => x.h === 'mens-premium-polo');
  ok('card with @card line is scaled 150%', near(hz.w, 1.5, 0.05), JSON.stringify(hz));
  ok('card keeps default size when it has no line', near(po.w, 1, 0.03), JSON.stringify(po));
  const shiftX = (hz.l + hz.w / 2) - 0.5; const shiftY = (hz.t + hz.hh / 2) - 0.5;
  ok('card is shifted right by 10% and up by 20% of its picture', near(shiftX, 0.10, 0.01) && near(shiftY, -0.20, 0.01), `dx=${shiftX.toFixed(3)} dy=${shiftY.toFixed(3)}`);
  ok('"@card" lines are not mistaken for placements', (await page.locator('[data-iz-item]').count()) === 4);
  ok('placement ids still 1..4', JSON.stringify(await page.$$eval('[data-iz-item]', (els) => els.map((e) => +e.dataset.id))) === '[1,2,3,4]');
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close();
}

// 2. editor: cards view
const { ctx, page, errors } = await mk(); await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
ok('editor starts on the Studio view', await page.locator('[data-pane=studio]').isVisible() && !(await page.locator('[data-pane=cards]').isVisible()));
await page.click('[data-view=cards]');
ok('Latest cards view lists the 4 cards', (await page.locator('[data-card-list] li[data-card]').count()) === 4);
ok('studio controls are hidden in cards view', !(await page.locator('[data-pane=studio]').isVisible()));
ok('first card is selected with an outline', (await page.locator('.iz-card.is-selected').count()) === 1);

const first = '.iz-feature .iz-card:nth-child(1)';
const target = await page.evaluate(() => { const a = document.querySelectorAll('.iz-feature .iz-card')[1]; a.scrollIntoView({ block: 'center' }); const r = a.querySelector('.iz-card__media').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: a.getAttribute('href').split('/').pop() }; });
const t2 = await page.evaluate(() => { const r = document.querySelectorAll('.iz-feature .iz-card')[1].querySelector('.iz-card__media').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(t2.x, t2.y);
ok('clicking a card selects it', (await page.locator('[data-card-inspector] h3').textContent()).toLowerCase().includes('polo'));
const before = (await cardGeom(page))[1];
await page.mouse.move(t2.x, t2.y); await page.mouse.down(); await page.mouse.move(t2.x + 50, t2.y + 30, { steps: 8 }); await page.mouse.up();
const after = (await cardGeom(page))[1];
const imgW = await page.evaluate(() => document.querySelectorAll('.iz-feature .iz-card')[1].querySelector('.iz-card__media img').offsetWidth);
ok('dragging a card moves only its picture', near(after.l - before.l, 50 / (await page.evaluate(() => document.querySelectorAll('.iz-feature .iz-card')[1].querySelector('.iz-card__media').getBoundingClientRect().width)), 0.01), `Δleft ${(after.l - before.l).toFixed(3)}`);
const others = await cardGeom(page);
ok('other cards did not move', [0, 2, 3].every((i) => others[i].l === (i === 0 ? others[0].l : others[i].l) && near(others[i].w, 1, 0.03) && near(others[i].l, 0, 0.02)));
await page.fill('[data-card-inspector] input[type=number][data-cf=s]', '140');
const sc = (await cardGeom(page))[1];
ok('Scale % field resizes the selected card', near(sc.w, 1.4, 0.03), `w=${sc.w}`);
ok('only the selected card scaled', near((await cardGeom(page))[0].w, 1, 0.03));

// keyboard (focus must be outside the number fields, as it would be after clicking the canvas)
await page.evaluate(() => document.activeElement && document.activeElement.blur());
await page.locator('body').press('+'); await page.locator('body').press('+');
ok('+ / - keys scale the selected card', near((await cardGeom(page))[1].w, 1.44, 0.03), `w=${(await cardGeom(page))[1].w}`);
// undo
for (let i = 0; i < 6; i++) { if (await page.locator('[data-act=undo]').isDisabled()) break; await page.click('[data-act=undo]'); }
const undone = await cardGeom(page);
ok('undo walks the card changes back to default', undone.every((x) => near(x.w, 1, 0.03) && near(x.l, 0, 0.02)), JSON.stringify(undone.map((x) => [x.w, x.l])));
while (!(await page.locator('[data-act=redo]').isDisabled())) await page.click('[data-act=redo]');
ok('redo restores them', near((await cardGeom(page))[1].w, 1.44, 0.03));

// 3. save format + storefront parity
await page.click('.iz-feature .iz-card:nth-child(1) .iz-card__media');
await page.fill('[data-card-inspector] input[type=number][data-cf=s]', '75');
await page.fill('[data-card-inspector] input[type=number][data-cf=y]', '-12');
await page.click('[data-act=copy]');
const copied = await page.evaluate(() => navigator.clipboard.readText());
console.log('--- copied ---\n' + copied + '\n--------------');
ok('copy includes @card lines for changed cards only', copied.split('\n').filter((l) => l.startsWith('@card')).length === 2);
ok('unchanged cards are not written', !copied.includes('minimalist-japanese-calligraphy-sweatpants |') || !/@card minimalist/.test(copied));
const edG = await cardGeom(page);
const edNorm = edG.map((x) => ({ ...x }));
{
  const s = await mk(1440, 900); await s.page.goto(`${base}/?layout=${b64(copied)}`, { waitUntil: 'networkidle' });
  const live = await cardGeom(s.page);
  let worst = 0; edNorm.forEach((e) => { const l = live.find((x) => x.h === e.h); worst = Math.max(worst, Math.abs(l.l - e.l), Math.abs(l.t - e.t), Math.abs(l.w - e.w), Math.abs(l.hh - e.hh)); });
  ok('card geometry: editor == storefront (fractions of each frame)', worst < 0.01, `worst Δ = ${worst.toFixed(4)}`);
  await s.ctx.close();
}
// mobile preview shows the mobile columns
await page.click('[data-mode=mobile]');
ok('mobile preview: strip uses the mobile column count (2)', (await page.evaluate(() => getComputedStyle(document.querySelector('.iz-feature__grid')).gridTemplateColumns.split(' ').length)) === 2);
await page.click('[data-mode=desktop]');
ok('desktop preview: strip uses 4 columns', (await page.evaluate(() => getComputedStyle(document.querySelector('.iz-feature__grid')).gridTemplateColumns.split(' ').length)) === 4);

// 4. draft survives refresh, reset works
await page.click('[data-act=save]');
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
await page.click('[data-view=cards]');
ok('refresh restores the saved card settings', near((await cardGeom(page))[0].w, 0.75, 0.03), `w=${(await cardGeom(page))[0].w}`);
await page.click('[data-act=card-reset]');
ok('Reset this card returns it to default', near((await cardGeom(page))[0].w, 1, 0.03));
await page.click('[data-act=card-reset-all]');
await page.click('[data-act=copy]');
ok('after Reset all, no @card lines remain', !(await page.evaluate(() => navigator.clipboard.readText())).includes('@card'));
// studio still works after visiting cards
await page.click('[data-view=studio]');
const c0 = await page.evaluate(() => { const r = document.querySelector('[data-iz-item]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.evaluate(() => { document.querySelector('.iz').scrollTop = 0; });
const c1 = await page.evaluate(() => { const r = document.querySelector('[data-iz-item]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.click(c1.x, c1.y);
ok('studio selection still works after using cards', await page.locator('.ized-box').isVisible());
ok('no console errors in the editor', errors.length === 0, errors.join(' | '));
await ctx.close(); await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
