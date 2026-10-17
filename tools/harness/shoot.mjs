import { chromium } from 'playwright';
const [,, outDir, ...pages] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const sizes = { d: [1440, 900], t: [768, 1024], m: [390, 844], s: [360, 800] };
for (const spec of pages) {
  const [name, path, vp = 'd', full = 'full'] = spec.split('|');
  const [w, h] = sizes[vp];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: vp === 'm' || vp === 's', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:9292' + path, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${outDir}/${name}-${vp}.png`, fullPage: full === 'full' });
  console.log(`${name}-${vp}: overflowX=${overflow} errors=${JSON.stringify(errors)}`);
  await ctx.close();
}
await browser.close();
