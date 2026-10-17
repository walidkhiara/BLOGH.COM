import { chromium } from 'playwright';
const B = 'http://localhost:9292';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = [];
const check = (name, ok, info = '') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? ' — ' + info : ''}`); };
const errors = [];
const mk = async (w, h, touch = false) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return p;
};
await fetch(B + '/__reset');

// Desktop: mega menu
let p = await mk(1440, 900);
await p.goto(B + '/', { waitUntil: 'networkidle' });
await p.hover('.nav__item:first-child .nav__link');
await p.waitForTimeout(400);
check('Mega menu opens on hover', await p.isVisible('#Mega-1 .mega__links a'));
await p.screenshot({ path: `${out}/i-mega.png` });
await p.mouse.move(700, 600); await p.waitForTimeout(500);
check('Mega menu closes on leave', !(await p.isVisible('#Mega-1 .mega__links a')));
await p.focus('.nav__item:first-child .nav__link'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(300);
check('Mega menu keyboard ArrowDown focuses first link', await p.evaluate(() => document.activeElement.closest('.mega') !== null));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
check('Escape closes mega menu', !(await p.isVisible('#Mega-1 .mega__links a')));

// Search
await p.click('[data-open-search]'); await p.waitForTimeout(450);
check('Search opens and focuses input', await p.evaluate(() => document.activeElement.id === 'SearchInput'));
await p.keyboard.type('short'); await p.waitForTimeout(900);
const hits = await p.locator('#PredictiveResults .card').count();
check('Predictive search returns product cards', hits > 0, `${hits} cards`);
await p.screenshot({ path: `${out}/i-search.png` });
await p.keyboard.type('zzzz'); await p.waitForTimeout(900);
check('Predictive search empty state', (await p.textContent('#PredictiveResults')).includes('No results'));
await p.keyboard.press('Escape'); await p.waitForTimeout(450);
check('Escape closes search', !(await p.evaluate(() => document.querySelector('[data-search-modal]').classList.contains('is-open'))));

// PDP variant + add to cart
await p.goto(B + '/products/apex-training-tee', { waitUntil: 'networkidle' });
const price0 = await p.textContent('[data-price]');
await p.click('label.option-btn:has-text("XL")');
check('Unavailable size disables add button', await p.isDisabled('[data-add-button]'), await p.textContent('[data-add-label]'));
await p.click('label.option-swatch >> nth=1');
await p.waitForTimeout(300);
check('Colour switch updates legend + URL', (await p.textContent('fieldset[data-option-index="0"] [data-option-value]')).trim() === 'Sage' && p.url().includes('variant='), p.url().split('?')[1]);
check('XL available in Sage re-enables add', !(await p.isDisabled('[data-add-button]')));
await p.click('label.option-btn:has-text("M")');
await p.click('[data-qty-step="1"]');
await p.click('[data-add-button]');
await p.waitForSelector('#CartDrawer.is-open', { timeout: 4000 }).catch(() => {});
await p.waitForTimeout(600);
check('Add to cart opens drawer', await p.evaluate(() => document.querySelector('#CartDrawer').classList.contains('is-open')));
const lineText = await p.textContent('#CartDrawer .cart-item');
check('Drawer shows real line (Sage / M, qty 2)', /Sage \/ M/.test(lineText) && (await p.inputValue('#CartDrawer [data-line-qty]')) === '2');
check('Header count updated', (await p.textContent('[data-cart-count]')).trim() === '2');
await p.screenshot({ path: `${out}/i-drawer.png` });
await p.click('#CartDrawer [data-qty-change="1"]'); await p.waitForTimeout(700);
check('Drawer qty + updates', (await p.inputValue('#CartDrawer [data-line-qty]')) === '3' && (await p.textContent('[data-cart-count]')).trim() === '3');
check('Subtotal updated', (await p.textContent('#CartDrawer .cart-totals__row')).includes('90,00'), (await p.textContent('#CartDrawer .cart-totals__row')).replace(/\s+/g, ' '));
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
check('Escape closes drawer', !(await p.evaluate(() => document.querySelector('#CartDrawer').classList.contains('is-open'))));

// Sold-out product
await p.goto(B + '/products/arrival-5-shorts', { waitUntil: 'networkidle' });
check('Sold-out product: button disabled + label', await p.isDisabled('[data-add-button]') && (await p.textContent('[data-add-label]')).includes('Sold out'));

// Quick add from card
await p.goto(B + '/collections/womens', { waitUntil: 'networkidle' });
await p.hover('.card >> nth=0'); await p.waitForTimeout(400);
await p.click('.card >> nth=0 >> .card__quick-size:not([disabled]) >> nth=0');
await p.waitForTimeout(900);
check('Quick add adds item', (await p.textContent('[data-cart-count]')).trim() === '4');
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// Filters + sort + load more
await p.selectOption('[data-sort-proxy]', 'price-ascending'); await p.waitForTimeout(900);
const firstPrice = await p.textContent('[data-product-grid] .card >> nth=0 >> .price');
check('Sort by price ascending', p.url().includes('sort_by=price-ascending') && firstPrice.includes('26,00'), firstPrice.trim());
await p.click('[data-open-drawer="facets"]'); await p.waitForTimeout(500);
await p.check('[data-drawer="facets"] input[value="Navy"]', { force: true }); await p.waitForTimeout(900);
const count = await p.textContent('.toolbar__count');
check('Colour filter updates results + URL', p.url().includes('filter.v.option.color=Navy') && !count.includes('30'), count.trim());
check('Drawer stays open while filtering', await p.evaluate(() => document.querySelector('#FacetsDrawer').classList.contains('is-open')));
await p.screenshot({ path: `${out}/i-facets.png` });
await p.click('[data-drawer="facets"] button[type="submit"]'); await p.waitForTimeout(500);
check('Active filter chip visible', await p.isVisible('.active-filters .chip'));
await p.click('.active-filters .chip-- , .active-filters .chip--clear').catch(async () => p.click('.active-filters .chip--clear'));
await p.waitForTimeout(900);
check('Clear all restores results', (await p.textContent('.toolbar__count')).includes('30'));
const before = await p.locator('[data-product-grid] > li').count();
await p.click('[data-load-more]'); await p.waitForTimeout(1000);
const after = await p.locator('[data-product-grid] > li').count();
check('Load more appends products', after > before, `${before} → ${after}`);

// Cart page: remove all → empty state
await p.goto(B + '/cart', { waitUntil: 'networkidle' });
while (await p.locator('[data-cart-page] [data-line-remove]').count()) { await p.click('[data-cart-page] [data-line-remove] >> nth=0'); await p.waitForTimeout(700); }
check('Cart page removal → empty state', (await p.textContent('[data-cart-page]')).includes('Your bag is empty'));
check('Header count cleared', (await p.textContent('[data-cart-count]')).trim() === '');
await p.close();

// Mobile: menu drawer + filter drawer
p = await mk(390, 844, true);
await p.goto(B + '/', { waitUntil: 'networkidle' });
await p.click('.header__menu-toggle'); await p.waitForTimeout(500);
check('Mobile menu opens', await p.evaluate(() => document.querySelector('#MenuDrawer').classList.contains('is-open')));
await p.click('#MenuDrawer summary >> nth=0'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/i-mobile-menu.png` });
await p.click('#MenuDrawer [data-close-drawer]'); await p.waitForTimeout(500);
await p.goto(B + '/collections/womens', { waitUntil: 'networkidle' });
await p.click('[data-open-drawer="facets"]'); await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/i-mobile-filters.png` });
check('Mobile filter drawer opens', await p.evaluate(() => document.querySelector('#FacetsDrawer').classList.contains('is-open')));
await p.close();

results.push(`Console/page errors: ${errors.length ? JSON.stringify(errors) : 'none'}`);
console.log(results.join('\n'));
await browser.close();
