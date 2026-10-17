import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const base = `http://localhost:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const mk = async () => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce' }); const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); }); return { ctx, page, errors }; };

// ---- not configured: the GitHub button must not exist, and the labels must not overpromise
{ const { ctx, page, errors } = await mk(); await page.goto(`${base}/?izaven-editor=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  ok('primary button says "Apply to store"', (await page.textContent('[data-act=copy]')).trim() === 'Apply to store');
  ok('the old "Save draft" wording is gone', (await page.textContent('[data-act=save]')).trim() === 'Keep draft');
  ok('the panel says changes autosave and Apply puts them on the store', /save in this browser automatically/i.test(await page.textContent('.ized-foot')) && /puts them on your store/i.test(await page.textContent('.ized-foot')));
  ok('GitHub button is hidden when no repository is configured', await page.locator('[data-act=send-github]').isHidden());
  await page.click('.ized-list li[data-id="1"]'); await page.fill('input[type=number][data-f="w"]', '14');
  await page.click('[data-act=copy]'); await page.waitForSelector('[data-status] a');
  const st = await page.textContent('[data-status]');
  ok('Apply to store spells out the remaining steps', /Two more steps/.test(st) && /Placement layout/.test(st) && /Save/.test(st), st.slice(0, 160));
  ok('…with a link to the theme editor', (await page.getAttribute('[data-status] a', 'href')).includes('/admin/themes'));
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  ok('…and the layout is on the clipboard', copied.startsWith('# handle') && copied.includes('14'));
  await page.click('.ized details summary'); await page.click('[data-act=copy-claude]');
  const claude = await page.evaluate(() => navigator.clipboard.readText());
  ok('"Copy message for Claude" has instructions plus the layout', /Apply this placement layout/.test(claude) && claude.includes('```') && claude.includes('men-s-lace-up-canvas-shoes'));
  ok('…and the layout inside it is exactly the editor layout', claude.split('```\n')[1].replace(/\n```$/, '') === copied);
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }

// ---- configured: the GitHub button opens a pre-filled issue
{ const { ctx, page, errors } = await mk(); await page.goto(`${base}/?izaven-editor=1&repo=walidkhiara/BLOGH.COM`, { waitUntil: 'networkidle' }); await page.waitForSelector('.ized [data-list]');
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
  await page.click('.ized-list li[data-id="2"]'); await page.fill('input[type=number][data-f="x"]', '60');
  await page.click('.ized details summary');
  ok('GitHub button is visible when a repository is configured', await page.locator('[data-act=send-github]').isVisible());
  await page.click('[data-act=send-github]');
  const opened = await page.evaluate(() => window.__opened);
  ok('opens exactly one GitHub new-issue page', opened.length === 1 && opened[0].startsWith('https://github.com/walidkhiara/BLOGH.COM/issues/new?'), opened[0]?.slice(0, 80));
  const u = new URL(opened[0]);
  ok('the issue title is the one the workflow listens for', u.searchParams.get('title') === 'izaven-layout');
  const body = u.searchParams.get('body');
  const inner = body.split('```\n')[1].replace(/\n$/, '');
  ok('the issue body carries the full editor layout', inner.startsWith('# handle') && inner.includes('60'), inner.split('\n').length + ' lines');
  ok('the url stays under the safe length', opened[0].length < 7500, String(opened[0].length));
  ok('the status explains what happens next', /Submit new issue/.test(await page.textContent('[data-status]')));
  // the layout in the issue must pass the same validator the workflow uses
  const { extractLayout, validateLayout } = await import('../apply-layout/apply-layout.mjs');
  const v = validateLayout(extractLayout(body));
  ok('…and it passes the workflow\'s validator', v.ok === true, JSON.stringify(v.errors || { placements: v.placements }));
  ok('no console errors', errors.length === 0, errors.join('|')); await ctx.close(); }

await b.close(); server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
