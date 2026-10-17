import { chromium } from 'playwright-core';
import { serve } from './harness.mjs';
const { server, port } = await serve();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const widths = [[360, 800], [390, 844], [430, 932], [768, 1024], [1440, 900], [1920, 1080]];
const report = [];
for (const [w, h] of widths) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  p.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (const y of [0.3, 0.6, 1]) { window.scrollTo(0, document.body.scrollHeight * y); await new Promise((r) => setTimeout(r, 250)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(400);
  const m = await p.evaluate(() => {
    const stage = document.querySelector('[data-iz-stage]').getBoundingClientRect();
    const bg = document.querySelector('.iz-bg');
    const items = [...document.querySelectorAll('[data-iz-item]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { h: el.dataset.handle.slice(0, 14), inStage: r.left >= stage.left - 1 && r.right <= stage.right + 1 && r.top >= stage.top - 1 && r.bottom <= stage.bottom + 1, disp: getComputedStyle(el).display };
    });
    return {
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      stage: [Math.round(stage.width), Math.round(stage.height)],
      ratio: +(stage.width / stage.height).toFixed(4),
      bgSrc: bg.currentSrc.split('/').pop(),
      headerHidden: getComputedStyle(document.getElementById('header-group')).display === 'none',
      items,
      footerH: Math.round(document.querySelector('.izf').getBoundingClientRect().height),
      docH: document.documentElement.scrollHeight
    };
  });
  report.push({ w, errors, ...m });
  await p.screenshot({ path: `out/home-${w}.png`, fullPage: true });
  await ctx.close();
}
for (const r of report) console.log(JSON.stringify(r));
await b.close(); server.close();
