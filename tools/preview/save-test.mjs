import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const near = (a, b2, t = 0.02) => Math.abs(a - b2) <= t;
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' });
const page = await ctx.newPage();
const v = (id, k) => page.evaluate(([id, k]) => parseFloat(document.querySelector(`[data-iz-item][data-id="${id}"]`).style.getPropertyValue(k)), [id, k]);
const card = () => page.evaluate(() => { const m = document.querySelectorAll('.iz-feature .iz-card__media')[0]; return parseFloat(m.style.getPropertyValue('--cs')); });
await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');

// every way of changing scale
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="w"]', '17.3');            // width field (desktop)
await page.click('[data-act=scale-up]');                                 // scale all +10%  -> 17.3*1.1 = 19.03, others x1.1
await page.click('[data-mode=mobile]');
await page.click('.ized-list li[data-id="1"]');
await page.fill('input[type=number][data-f="w"]', '33.3');            // width field (mobile)
await page.click('[data-view=cards]');
await page.click('.iz-feature li:nth-child(1) .iz-card__media');
await page.fill('[data-card-inspector] input[type=number][data-cf=s]', '140');
const want = { dw1: await v(1, '--dw'), mw1: await v(1, '--mw'), dw2: await v(2, '--dw'), card: await card() };
console.log('values just before saving:', JSON.stringify(want));

// 1) save draft, 2) refresh
await page.click('[data-act=save]');
const stored = await page.evaluate(() => Object.keys(localStorage).map((k) => [k, localStorage.getItem(k).length]));
console.log('localStorage keys:', JSON.stringify(stored));
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
const got = { dw1: await v(1, '--dw'), mw1: await v(1, '--mw'), dw2: await v(2, '--dw'), card: await card() };
ok('width field (desktop) survives Save + refresh', near(got.dw1, want.dw1), `${want.dw1} → ${got.dw1}`);
ok('Scale all survives Save + refresh (other placements)', near(got.dw2, want.dw2), `${want.dw2} → ${got.dw2}`);
ok('mobile width survives', near(got.mw1, want.mw1), `${want.mw1} → ${got.mw1}`);
ok('card scale survives', near(got.card, want.card), `${want.card} → ${got.card}`);

// 3) change WITHOUT pressing Save, then refresh — what a user expects to be kept
await page.click('.ized-list li[data-id="3"]');
await page.fill('input[type=number][data-f="w"]', '22');
const unsavedW = await v(3, '--dw');
page.on('dialog', (d) => d.accept());
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
ok('a change made WITHOUT pressing Save is still there after refresh', near(await v(3, '--dw'), unsavedW), `${unsavedW} → ${await v(3, '--dw')}`);

// 4) the real storefront: is the saved layout live?
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
const live = await page.evaluate(() => parseFloat(document.querySelector('[data-iz-item][data-id="1"]').style.getPropertyValue('--dw')));
console.log('plain storefront shows width of item 1 =', live, '(the saved layout is NOT here until it is pasted into the theme)');

// 5) same draft, different address (apex vs www, or preview param) — does the editor find it?
await page.goto(`${base}/?izaven-editor=1&preview_theme_id=999`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
ok('opening the editor via a different URL still finds the draft', near(await v(1, '--dw'), want.dw1), `${await v(1, '--dw')} (want ${want.dw1})`);

// 6) autosave must survive an immediate refresh (flush on page hide), with no waiting and no Save button
await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
await page.click('.ized-list li[data-id="4"]'); await page.fill('input[type=number][data-f="w"]', '25.5');
await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
ok('an edit survives an IMMEDIATE refresh (no wait, no Save)', near(await v(4, '--dw'), 25.5), `${await v(4, '--dw')}`);
ok('status says it is saved automatically and not on the store yet', /Saved automatically/.test(await page.textContent('[data-status]')) && /Not on your store yet/.test(await page.textContent('[data-status]')), (await page.textContent('[data-status]')).slice(0, 120));

// 7) leaving with unpublished work is guarded in-page, not lost silently
await page.click('[data-act=exit]');
ok('Exit warns that the work is not on the store yet', /not on your store yet/i.test(await page.textContent('[data-status]')) && page.url().includes('izaven-editor'));
await page.click('[data-act=copy]');
await page.waitForSelector('[data-status] a');
ok('copy offers a one-click link to the theme editor', (await page.locator('[data-status] a').count()) === 1, await page.getAttribute('[data-status] a', 'href'));
await page.click('[data-act=exit]'); await page.waitForLoadState('networkidle');
ok('after copying, Exit leaves straight away', !page.url().includes('izaven-editor'), page.url());

// 8) resetting to the store layout clears the draft, so it cannot resurface
await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
ok('the draft is back after leaving and returning', near(await v(4, '--dw'), 25.5), `${await v(4, '--dw')}`);
await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
