import http from 'node:http';
import { extractLayout, validateLayout, patchTemplate, apply } from './apply-layout.mjs';
let fails = 0;
const ok = (n, c, d = '') => { if (!c) fails++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

const GOOD = `# handle | style | desktop | mobile | image
men-s-lace-up-canvas-shoes | f | 45,63.5,10.5,0,4,100,45,1 | 50,46.5,26,0,4,100,45,1
mens-premium-polo | c | 57,64.5,8.5,-8,3,100,45,1 | 50,80.5,30,0,3,100,45,0 | https://cdn.shopify.com/s/files/1/0000/files/polo.png?v=1
@card unisex-half-zip-pullover | 140,10,-12.5`;
const issueBody = (t) => `Layout from the editor\r\n\`\`\`\r\n${t.replace(/\n/g, '\r\n')}\r\n\`\`\`\r\n`;

// ---- extraction and validation
ok('extracts the fenced layout from an issue body (CRLF safe)', extractLayout(issueBody(GOOD)) === GOOD);
ok('accepts a good layout', validateLayout(GOOD).ok === true && validateLayout(GOOD).placements === 2 && validateLayout(GOOD).cards === 1);
const bad = (label, text, hint) => { const v = validateLayout(text); ok(`refuses: ${label}`, v.ok === false && (!hint || v.errors.join(' ').includes(hint)), v.errors?.[0]); };
bad('empty', '', 'empty');
bad('script injection in a handle', 'x"><script>alert(1)</script> | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1', 'handle');
bad('liquid injection in a handle', '{{ shop.name }} | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1', 'handle');
bad('image from another site', 'a-b | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1 | https://evil.example/x.png', 'cdn.shopify.com');
bad('image with a javascript: url', 'a-b | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1 | javascript:alert(1)', 'cdn.shopify.com');
bad('number out of range (x = 500)', 'a-b | f | 500,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1', 'outside');
bad('not a number', 'a-b | f | abc,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1', 'not a number');
bad('wrong number of fields', 'a-b | f | 1,1,1 | 1,1,1,0,1,100,0,1', '8 numbers');
bad('unknown style', 'a-b | z | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1', 'style');
bad('too many placements', Array.from({ length: 21 }, (_, i) => `p${i} | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1`).join('\n'), '20');
bad('oversized', 'a-b | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1\n# ' + 'x'.repeat(9000), '8000');
bad('only comments', '# nothing here', 'no placements');
bad('@card out of range', 'a-b | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1\n@card a-b | 900,0,0', '@card');
ok('a pipe inside the image url cannot sneak extra fields in', validateLayout('a-b | f | 1,1,1,0,1,100,0,1 | 1,1,1,0,1,100,0,1 | https://cdn.shopify.com/a|b').ok === false);

// ---- patching keeps everything else in the template
const TEMPLATE = `/*\n * IMPORTANT: auto-generated\n */\n` + JSON.stringify({ sections: { hero: { type: 'something-else', settings: { a: 1 } }, showroom: { type: 'izaven-showroom', settings: { cta_label: 'Shop', layout: 'old', featured_count: 8 }, blocks: { b1: { type: 'auto_switch', settings: { interval: 4 } } }, block_order: ['b1'] } }, order: ['hero', 'showroom'] });
const patched = JSON.parse(patchTemplate(TEMPLATE, GOOD));
ok('only the layout setting changes', patched.sections.showroom.settings.layout === GOOD && patched.sections.showroom.settings.cta_label === 'Shop' && patched.sections.showroom.settings.featured_count === 8);
ok('blocks, other sections and order are untouched', patched.sections.showroom.blocks.b1.settings.interval === 4 && patched.sections.hero.settings.a === 1 && patched.order.join() === 'hero,showroom');
let threw = false; try { patchTemplate(JSON.stringify({ sections: { x: { type: 'other' } } }), GOOD); } catch (e) { threw = /izaven-showroom/.test(e.message); }
ok('refuses a theme that has no showroom section', threw);

// ---- end to end against a mock Shopify Admin API
let file = TEMPLATE; const calls = []; let failMode = null;
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const { query, variables } = JSON.parse(body); calls.push({ token: req.headers['x-shopify-access-token'], q: query.slice(0, 40) });
    const send = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (failMode === '401') return send({}, 401);
    if (query.includes('themes(first: 1')) return send({ data: { themes: { nodes: [{ id: 'gid://shopify/OnlineStoreTheme/111', name: 'Live theme' }] } } });
    if (query.includes('themeFilesUpsert')) { if (failMode === 'usererror') return send({ data: { themeFilesUpsert: { userErrors: [{ message: 'denied' }] } } }); if (failMode !== 'never') file = variables.files[0].body.value; return send({ data: { themeFilesUpsert: { upsertedThemeFiles: [], userErrors: [] } } }); }
    return send({ data: { theme: { name: 'Draft', files: { nodes: [{ body: { content: file } }] } } } });
  });
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/graphql`;
const run = (o = {}) => apply({ store: 'x', token: 'TOKEN', layout: GOOD, base, ...o });

let r = await run({ themeId: '999' });
ok('applies to the chosen theme and confirms by reading it back', r.theme === 'Draft' && JSON.parse(file.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '')).sections.showroom.settings.layout === GOOD, JSON.stringify(r));
ok('sends the token as the Shopify header', calls.every((c) => c.token === 'TOKEN'));
file = TEMPLATE; calls.length = 0;
r = await run({ themeId: '' });
ok('with no theme id it targets the published theme', r.theme === 'Draft' || r.theme === 'Live theme', JSON.stringify(r));
ok('…and looked the published theme up first', calls[0].q.includes('themes(first: 1'));
failMode = '401'; let msg = ''; try { await run({ themeId: '1' }); } catch (e) { msg = e.message; }
ok('a bad token gives a clear message', /HTTP 401/.test(msg) && /write_themes/.test(msg), msg);
failMode = 'usererror'; msg = ''; try { await run({ themeId: '1' }); } catch (e) { msg = e.message; }
ok('a Shopify refusal is reported, not swallowed', /refused/.test(msg), msg);
failMode = null; server.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed'); process.exitCode = fails ? 1 : 0;
