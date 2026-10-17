import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';

const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const results = [];
const ok = (name, cond, detail = '') => { results.push({ name, pass: !!cond, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const near = (a, b, tol = 0.35) => Math.abs(a - b) <= tol;

async function newPage(viewport = { width: 1440, height: 900 }, extra = {}) {
  const ctx = await b.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce', ...extra });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  return { ctx, page, errors };
}
const vals = (page, id) => page.evaluate((id) => {
  const el = document.querySelector(`[data-iz-item][data-id="${id}"]`); if (!el) return null;
  const g = (k) => parseFloat(el.style.getPropertyValue(k));
  return { dx: g('--dx'), dy: g('--dy'), dw: g('--dw'), dr: g('--dr'), mx: g('--mx'), my: g('--my'), mw: g('--mw') };
}, id);
const center = (page, sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, sel);
const norm = (page) => page.evaluate(() => {
  const st = document.querySelector('[data-iz-stage]').getBoundingClientRect();
  return [...document.querySelectorAll('[data-iz-item]')].filter((e) => getComputedStyle(e).display !== 'none' && !e.classList.contains('is-ghost')).map((e) => {
    const r = e.getBoundingClientRect();
    return { h: e.dataset.handle, cx: +(((r.left + r.width / 2 - st.left) / st.width) * 100).toFixed(2), cy: +(((r.top + r.height / 2 - st.top) / st.height) * 100).toFixed(2), w: +((r.width / st.width) * 100).toFixed(2) };
  });
});
const openEditor = async (page, q = '') => {
  await page.goto(`${base}/?izaven-editor=1${q}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.ized [data-list]');
  await page.waitForFunction(() => document.querySelectorAll('.ized-results li[data-add]').length > 0, null, { timeout: 8000 }).catch(() => {});
};
const statusText = (page) => page.textContent('[data-status]');
const listCount = (page) => page.locator('.ized-list li[data-id]').count();

// ---------------------------------------------------------------- 0. storefront does not ship the editor
{
  const { ctx, page, errors } = await newPage();
  const reqs = []; page.on('request', (r) => reqs.push(r.url()));
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('storefront never downloads the editor script', !reqs.some((u) => u.includes('izaven-editor.js')));
  ok('storefront has no editor UI', (await page.locator('.ized').count()) === 0);
  ok('no console errors on storefront', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------------------------------------------------------------- 1. open + select + drag + resize + rotate
const { ctx, page, errors } = await newPage();
await openEditor(page);
ok('editor panel opens', await page.locator('.ized').isVisible());
ok('4 placements listed from live layout', (await listCount(page)) === 4);
ok('product catalog loaded for adding', (await page.locator('.ized-results li[data-add]').count()) === 4);
ok('stage is a fixed overlay (not trapped by an ancestor)', await page.evaluate(() => getComputedStyle(document.querySelector('.iz')).position === 'fixed' && document.querySelector('.iz').parentElement === document.body));

const shoes = '[data-iz-item][data-handle="men-s-lace-up-canvas-shoes"]';
const c0 = await center(page, shoes);
await page.mouse.click(c0.x, c0.y);
ok('click selects and shows bounding box', await page.locator('.ized-box').isVisible());
ok('inspector shows the selection', (await page.locator('.ized [data-inspector] h3').textContent()).includes('canvas shoes'));
const v0 = await vals(page, 1);
ok('starting values match the live layout', near(v0.dx, 45) && near(v0.dy, 63.5) && near(v0.dw, 10.5), JSON.stringify(v0));

// drag by 10% of stage in both axes
const stageR = await page.evaluate(() => { const r = document.querySelector('[data-iz-stage]').getBoundingClientRect(); return { w: r.width, h: r.height }; });
await page.mouse.move(c0.x, c0.y); await page.mouse.down();
await page.mouse.move(c0.x + stageR.w * 0.1, c0.y + stageR.h * 0.1, { steps: 8 }); await page.mouse.up();
const v1 = await vals(page, 1);
ok('drag moves by the same % of the stage', near(v1.dx, v0.dx + 10, 0.6) && near(v1.dy, v0.dy + 10, 0.6), `x ${v0.dx}→${v1.dx}  y ${v0.dy}→${v1.dy}`);
ok('drag does not change the mobile layout', (await vals(page, 1)).mx === v0.mx && (await vals(page, 1)).my === v0.my);
ok('numeric X field follows the drag', near(parseFloat(await page.inputValue('input[type=number][data-f="x"]')), v1.dx, 0.05));

// resize from the SE corner
const box1 = await center(page, '.ized-box');
const se = await page.evaluate(() => { const r = document.querySelector('.ized-h[data-h=se]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(se.x, se.y); await page.mouse.down(); await page.mouse.move(se.x + 60, se.y + 60, { steps: 6 }); await page.mouse.up();
const v2 = await vals(page, 1);
ok('corner handle scales the width up', v2.dw > v1.dw + 1, `w ${v1.dw}→${v2.dw}`);
const ratio = await page.evaluate(() => { const i = document.querySelector('[data-iz-item][data-id="1"] img'); return i.getBoundingClientRect().width / i.getBoundingClientRect().height; });
ok('image keeps its proportions (never stretched)', near(ratio, 1, 0.02), `ratio ${ratio.toFixed(3)} (source is 1:1)`);

// rotate
const rot = await page.evaluate(() => { const r = document.querySelector('.ized-h[data-h=rot]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const cc = await center(page, '.ized-box');
await page.mouse.move(rot.x, rot.y); await page.mouse.down(); await page.mouse.move(cc.x + 120, cc.y, { steps: 8 }); await page.mouse.up();
const v3 = await vals(page, 1);
ok('rotate handle turns the item (~90° to the right)', v3.dr > 60 && v3.dr < 120, `r = ${v3.dr}`);

// numeric entry
await page.fill('input[type=number][data-f="x"]', '30');
await page.fill('input[type=number][data-f="y"]', '70');
await page.fill('input[type=number][data-f="r"]', '0');
const v4 = await vals(page, 1);
const leftPx = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-iz-item][data-id="1"]')).left));
ok('typing X/Y updates the live element', near(v4.dx, 30, 0.01) && near(v4.dy, 70, 0.01) && near(v4.dr, 0, 0.01));
ok('left px = 30% of the stage', near(leftPx, stageR.w * 0.3, 1.5), `${leftPx.toFixed(1)} vs ${(stageR.w * 0.3).toFixed(1)}`);

// ---------------------------------------------------------------- 2. undo / redo
const history = [];
for (let i = 0; i < 12; i++) { if (await page.locator('[data-act=undo]').isDisabled()) break; await page.click('[data-act=undo]'); history.push((await vals(page, 1)).dx); }
const vUndo = await vals(page, 1);
ok('undo walks all the way back to the live layout', near(vUndo.dx, 45) && near(vUndo.dy, 63.5) && near(vUndo.dw, 10.5), JSON.stringify(vUndo));
ok('undo is disabled once at the start', await page.locator('[data-act=undo]').isDisabled());
await page.click('[data-act=redo]');
ok('redo re-applies a change', (await vals(page, 1)).dx !== vUndo.dx || (await vals(page, 1)).dy !== vUndo.dy || (await vals(page, 1)).dw !== vUndo.dw);
while (!(await page.locator('[data-act=redo]').isDisabled())) await page.click('[data-act=redo]');
ok('redo reaches the final state', near((await vals(page, 1)).dx, 30, 0.01));

// ---------------------------------------------------------------- 3. mobile is independent
const desktopBefore = await vals(page, 2);
await page.click('[data-mode=mobile]');
ok('mobile mode forces the mobile layout', (await page.getAttribute('[data-iz-stage]', 'data-force')) === 'mobile');
ok('mobile mode shows the mobile studio photo', await page.waitForFunction(() => document.querySelector('.iz-bg').currentSrc.includes('studio-mobile'), null, { timeout: 3000 }).then(() => true, () => false));
ok('mobile preview is a phone-width frame (390)', near(await page.evaluate(() => document.querySelector('[data-iz-stage]').getBoundingClientRect().width), 390, 1));
ok('mobile frame has the tall photo ratio', near(await page.evaluate(() => { const r = document.querySelector('[data-iz-stage]').getBoundingClientRect(); return r.width / r.height; }), 0.3865, 0.002));
await page.click('.ized-list li[data-id="2"]');
await page.fill('input[type=number][data-f="x"]', '62');
await page.fill('input[type=number][data-f="w"]', '40');
const m2 = await vals(page, 2);
ok('editing mobile changes only the mobile values', near(m2.mx, 62, 0.01) && near(m2.mw, 40, 0.01) && m2.dx === desktopBefore.dx && m2.dw === desktopBefore.dw, JSON.stringify(m2));
// hide on mobile only
await page.click('.ized-list li[data-id="2"] [data-toggle]');
ok('hidden-on-mobile item shows as a ghost, stays selectable', await page.evaluate(() => document.querySelector('[data-iz-item][data-id="2"]').classList.contains('is-ghost')));
await page.click('[data-mode=desktop]');
ok('same item is still visible on desktop', await page.evaluate(() => { const el = document.querySelector('[data-iz-item][data-id="2"]'); return getComputedStyle(el).display !== 'none' && !el.classList.contains('is-ghost'); }));
ok('desktop mode shows the desktop studio photo', await page.waitForFunction(() => document.querySelector('.iz-bg').currentSrc.includes('studio-desktop'), null, { timeout: 3000 }).then(() => true, () => false));
// device presets
await page.selectOption('[data-ctl=device]', '768');
ok('desktop preview at 768 px uses the desktop layout', near(await page.evaluate(() => document.querySelector('[data-iz-stage]').getBoundingClientRect().width), 768, 1) && (await page.getAttribute('[data-iz-stage]', 'data-force')) === 'desktop');
await page.selectOption('[data-ctl=device]', 'fit');
await page.click('[data-mode=mobile]'); await page.selectOption('[data-ctl=device]', '360');
ok('mobile preset 360 px', near(await page.evaluate(() => document.querySelector('[data-iz-stage]').getBoundingClientRect().width), 360, 1));
await page.selectOption('[data-ctl=device]', '430');
ok('mobile preset 430 px', near(await page.evaluate(() => document.querySelector('[data-iz-stage]').getBoundingClientRect().width), 430, 1));
await page.click('[data-mode=desktop]');

// ---------------------------------------------------------------- 4. remove / add / reorder / keyboard
const n0 = await listCount(page);
await page.click('.ized-list li[data-id="3"]');
await page.click('[data-act=remove]');
ok('remove takes it off the studio', (await listCount(page)) === n0 - 1 && (await page.locator('[data-iz-item][data-id="3"]').count()) === 0);
ok('removing never deletes the store product (still addable)', (await page.locator('.ized-results li[data-add="unisex-half-zip-pullover"]').count()) === 1);
await page.click('[data-act=undo]');
ok('undo restores a removed placement with its element', (await listCount(page)) === n0 && (await page.locator('[data-iz-item][data-id="3"]').count()) === 1);

await page.fill('[data-ctl=search]', 'polo');
ok('product search filters the list', (await page.locator('.ized-results li[data-add]').count()) === 1);
await page.click('.ized-results li[data-add="mens-premium-polo"]');
ok('adding creates a new selected placement', (await listCount(page)) === n0 + 1 && (await page.locator('.ized-box').isVisible()));
ok('new placement is rendered with the product image', await page.evaluate(() => { const els = [...document.querySelectorAll('[data-iz-item]')]; const el = els[els.length - 1]; const i = el.querySelector('img'); return !!i && i.complete && i.naturalWidth > 0; }));
await page.fill('[data-ctl=search]', '');

// layering
const zBefore = await page.evaluate(() => getComputedStyle(document.querySelector('[data-iz-item][data-id="1"]')).zIndex);
await page.click('.ized-list li[data-id="1"]');
await page.click('[data-act=forward]');
const zAfter = await page.evaluate(() => getComputedStyle(document.querySelector('[data-iz-item][data-id="1"]')).zIndex);
ok('bring forward raises the layer', +zAfter > +zBefore, `z ${zBefore}→${zAfter}`);

// keyboard
await page.click('.ized-list li[data-id="1"]');
const kx0 = (await vals(page, 1)).dx;
await page.locator('body').press('ArrowRight');
const kx1 = (await vals(page, 1)).dx;
await page.locator('body').press('Shift+ArrowRight');
const kx2 = (await vals(page, 1)).dx;
ok('arrow nudges 0.1%, Shift+arrow nudges 1%', near(kx1 - kx0, 0.1, 0.02) && near(kx2 - kx1, 1, 0.02), `${kx0}→${kx1}→${kx2}`);
await page.locator('body').press('Control+z'); await page.locator('body').press('Control+z');
ok('Ctrl+Z undoes keyboard nudges', near((await vals(page, 1)).dx, kx0, 0.02));

// ---------------------------------------------------------------- 5. save draft, refresh restores
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="x"]', '41.5');
await page.click('[data-act=save]');
ok('save reports a saved draft', /Draft saved/i.test(await statusText(page)));
const savedCount = await listCount(page);
const savedX = (await vals(page, 1)).dx;
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.ized [data-list]');
ok('refresh restores the saved draft', (await listCount(page)) === savedCount && near((await vals(page, 1)).dx, savedX, 0.01), `${await listCount(page)} items, x=${(await vals(page, 1)).dx}`);
ok('restore is announced', /Restored/i.test(await statusText(page)));

// cancel returns to the saved state
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="x"]', '80');
await page.click('[data-act=cancel]');
ok('cancel returns to the last saved state', near((await vals(page, 1)).dx, savedX, 0.01));

// reset position -> live baseline
await page.click('.ized-list li[data-id="1"]');
await page.click('[data-act=reset-item]');
const vr = await vals(page, 1);
ok('reset position returns to the live store layout', near(vr.dx, 45) && near(vr.dy, 63.5) && near(vr.dw, 10.5), JSON.stringify(vr));

// ---------------------------------------------------------------- 6. copy layout + WYSIWYG against the storefront
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="x"]', '52.25');
await page.fill('input[type=number][data-f="y"]', '61');
await page.fill('input[type=number][data-f="w"]', '13');
await page.click('.ized-list li[data-id="2"]');
await page.fill('input[type=number][data-f="r"]', '-8');
await page.click('[data-mode=mobile]');
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="y"]', '44');
await page.fill('input[type=number][data-f="w"]', '30');
await page.click('[data-act=copy]');
const copied = await page.evaluate(() => navigator.clipboard.readText());
ok('Copy layout puts the layout text on the clipboard', copied.startsWith('# handle') && copied.split('\n').filter((l) => l && !l.startsWith('#')).length === savedCount, `${copied.split('\n').length} lines`);
ok('copied text matches the Layout text box', copied === (await page.inputValue('[data-ctl=text]')));
ok('copy tells you where to paste it', /theme editor/i.test(await statusText(page)));

console.log('--- copied layout ---\n' + copied + '\n---------------------');
// editor (desktop fit) vs real storefront, normalised to the stage
await page.click('[data-mode=desktop]');
const edDesktop = await norm(page);
const edMobile = await (async () => { await page.click('[data-mode=mobile]'); return norm(page); })();
const b64 = Buffer.from(copied).toString('base64');
for (const [label, vp, ed] of [['desktop 1440', { width: 1440, height: 900 }, edDesktop], ['mobile 390', { width: 390, height: 844 }, edMobile]]) {
  const s = await newPage(vp);
  await s.page.goto(`${base}/?layout=${encodeURIComponent(b64)}`, { waitUntil: 'networkidle' });
  const live = await norm(s.page);
  const key = (a, b) => a.h.localeCompare(b.h) || a.cx - b.cx || a.cy - b.cy;
  const A = [...ed].sort(key); const B = [...live].sort(key);
  let worst = 0;
  if (A.length === B.length) A.forEach((e, i) => { worst = Math.max(worst, Math.abs(B[i].cx - e.cx), Math.abs(B[i].cy - e.cy), Math.abs(B[i].w - e.w)); });
  ok(`WYSIWYG ${label}: editor == storefront for every item`, A.length > 0 && A.length === B.length && worst < 0.35, `${A.length} in editor, ${B.length} on storefront, worst Δ = ${worst.toFixed(3)}% of stage`);
  await s.ctx.close();
}

ok('no console errors during the whole editor session', errors.length === 0, errors.join(' | '));
await ctx.close();

// ---------------------------------------------------------------- 7. awkward inputs
{
  const s = await newPage();
  await openEditor(s.page, '&scenario=missing');
  ok('deleted product: storefront renders the rest, no crash', (await s.page.locator('[data-iz-item]').count()) === 1 && s.errors.length === 0, s.errors.join(' | '));
  ok('deleted product: editor keeps and flags the line', (await s.page.locator('.ized-list li[data-id]').count()) === 2 && (await s.page.textContent('.ized-list')).includes('Product not found'));
  await s.page.click('[data-act=copy]');
  const t = await s.page.evaluate(() => navigator.clipboard.readText());
  ok('deleted product: its line survives a copy (nothing silently lost)', t.includes('this-product-was-deleted'));
  await s.ctx.close();
}
{
  const s = await newPage();
  await s.page.goto(`${base}/?scenario=crlf`, { waitUntil: 'networkidle' });
  ok('Windows (CRLF) line endings render all 4 items', (await s.page.locator('[data-iz-item]').count()) === 4);
  await s.ctx.close();
}
{
  const s = await newPage();
  await openEditor(s.page, '&scenario=empty');
  ok('empty layout: friendly empty state', (await s.page.textContent('.ized-list')).includes('No placements yet'));
  await s.page.click('.ized-results li[data-add="mens-premium-polo"]');
  ok('empty layout: first placement can be added', (await s.page.locator('.ized-list li[data-id]').count()) === 1);
  await s.ctx.close();
}
{
  const s = await newPage({ width: 1440, height: 900 });
  await s.page.goto(`${base}/?scenario=nofeature`, { waitUntil: 'networkidle' });
  ok('featured strip hides when count is 0', (await s.page.locator('.iz-feature').count()) === 0);
  await s.ctx.close();
}
{
  const s = await newPage({ width: 800, height: 700 });
  await s.page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' });
  ok('narrow window shows the "use a computer" gate', await s.page.locator('.ized-gate').isVisible());
  await s.ctx.close();
}

await b.close(); server.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); failed.forEach((f) => console.log(' -', f.name, f.detail)); process.exitCode = 1; }
