// Applies a placement layout (from the editor) to the showroom section of a Shopify theme.
//
//   SHOPIFY_STORE         e.g. qi0zkk-k1.myshopify.com
//   SHOPIFY_ADMIN_TOKEN   Admin API token of a custom app with read_themes + write_themes
//   SHOPIFY_THEME_ID      numeric theme id, or empty / "main" for the published theme
//   ISSUE_BODY            the GitHub issue body that contains the layout in a ``` block
//
// Only the "layout" setting of the izaven-showroom section is replaced. Every other setting,
// block and section in templates/index.json is left exactly as it is.
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const HANDLE = /^[a-z0-9][a-z0-9-]{0,254}$/;
const NUM = /^-?\d+(\.\d+)?$/;
const LIMITS = [[0, 100], [0, 100], [1, 95], [-180, 180], [1, 99], [0, 100], [0, 100], [0, 1]]; // x,y,w,r,z,o,s,v
const FILE = 'templates/index.json';

export function extractLayout(body) {
  const m = String(body || '').match(/```[a-z]*\r?\n([\s\S]*?)```/i);
  return (m ? m[1] : String(body || '')).replace(/\r\n/g, '\n').trim();
}

function checkNums(str, label, errors) {
  const parts = str.split(',').map((x) => x.trim());
  if (parts.length !== 8) { errors.push(`${label}: expected 8 numbers x,y,w,r,z,o,s,v, got ${parts.length}`); return; }
  parts.forEach((p, i) => {
    if (!NUM.test(p)) errors.push(`${label}: "${p}" is not a number`);
    else if (+p < LIMITS[i][0] || +p > LIMITS[i][1]) errors.push(`${label}: ${p} is outside ${LIMITS[i][0]}..${LIMITS[i][1]}`);
  });
}

// Strict on purpose: this text goes into your live theme, so anything unexpected is refused.
export function validateLayout(text) {
  const errors = [];
  if (!text || text.length > 8000) return { ok: false, errors: ['layout is empty or longer than 8000 characters'] };
  const out = [];
  let placements = 0; let cards = 0;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim(); const at = `line ${i + 1}`;
    if (!line) return;
    if (/[\u0000-\u0008\u000b-\u001f]/.test(line)) { errors.push(`${at}: control characters`); return; }
    if (line.startsWith('#')) { if (line.length > 200) errors.push(`${at}: comment too long`); else out.push(line); return; }
    if (line.startsWith('@card ')) {
      const f = line.slice(6).split('|').map((x) => x.trim());
      const nums = (f[1] || '').split(',').map((x) => x.trim());
      if (f.length !== 2 || !HANDLE.test(f[0])) errors.push(`${at}: bad @card handle`);
      else if (nums.length !== 3 || nums.some((n) => !NUM.test(n))) errors.push(`${at}: @card needs scale,x,y`);
      else if (+nums[0] < 20 || +nums[0] > 300 || Math.abs(+nums[1]) > 100 || Math.abs(+nums[2]) > 100) errors.push(`${at}: @card value out of range`);
      else { cards++; out.push(line); }
      return;
    }
    const f = line.split('|').map((x) => x.trim());
    if (f.length < 4 || f.length > 5) { errors.push(`${at}: expected handle | style | desktop | mobile [| image]`); return; }
    if (!HANDLE.test(f[0])) errors.push(`${at}: bad product handle "${f[0]}"`);
    if (!['f', 'c'].includes(f[1])) errors.push(`${at}: style must be f or c`);
    checkNums(f[2], `${at} desktop`, errors); checkNums(f[3], `${at} mobile`, errors);
    if (f[4] !== undefined && !/^https:\/\/cdn\.shopify\.com\/[A-Za-z0-9_\-./%?=&~]+$/.test(f[4])) errors.push(`${at}: image must be a https://cdn.shopify.com/ link`);
    placements++; out.push(line);
  });
  if (placements > 20) errors.push(`more than 20 placements (${placements})`);
  if (cards > 60) errors.push('too many @card lines');
  if (!placements) errors.push('no placements found');
  return errors.length ? { ok: false, errors } : { ok: true, layout: out.join('\n'), placements, cards };
}

export function patchTemplate(fileText, layout) {
  const json = fileText.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, '');
  const tpl = JSON.parse(json);
  const key = Object.keys(tpl.sections || {}).find((k) => tpl.sections[k].type === 'izaven-showroom');
  if (!key) throw new Error('templates/index.json has no izaven-showroom section; is this the right theme?');
  tpl.sections[key].settings = { ...(tpl.sections[key].settings || {}), layout };
  return JSON.stringify(tpl, null, 2) + '\n';
}

function storedLayout(fileText) {
  try {
    const tpl = JSON.parse(String(fileText || '').replace(/^\s*\/\*[\s\S]*?\*\/\s*/, ''));
    const key = Object.keys(tpl.sections).find((k) => tpl.sections[k].type === 'izaven-showroom');
    return tpl.sections[key].settings.layout;
  } catch (e) { return undefined; }
}

export async function apply({ store, token, themeId, layout, base, fetchImpl = fetch }) {
  const version = process.env.SHOPIFY_API_VERSION || '2026-07';
  const endpoint = base || `https://${store}/admin/api/${version}/graphql.json`;
  const gql = async (query, variables) => {
    const r = await fetchImpl(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'x-shopify-access-token': token }, body: JSON.stringify({ query, variables }) });
    if (!r.ok) throw new Error(`Shopify answered HTTP ${r.status}${r.status === 401 || r.status === 403 ? ' (check the token and its read_themes / write_themes scopes)' : ''}`);
    const j = await r.json();
    if (j.errors) throw new Error('Shopify error: ' + JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  };
  let id = /^\d+$/.test(String(themeId || '')) ? `gid://shopify/OnlineStoreTheme/${themeId}` : String(themeId || '').startsWith('gid://') ? themeId : null;
  let name = '';
  if (!id) {
    const d = await gql('query { themes(first: 1, roles: [MAIN]) { nodes { id name } } }');
    if (!d.themes.nodes[0]) throw new Error('no published theme found');
    id = d.themes.nodes[0].id; name = d.themes.nodes[0].name;
  }
  const read = async () => (await gql('query($id: ID!) { theme(id: $id) { name files(first: 1, filenames: ["' + FILE + '"]) { nodes { body { ... on OnlineStoreThemeFileBodyText { content } } } } } }', { id })).theme;
  const t = await read(); name = name || t.name;
  const current = t.files.nodes[0]?.body?.content;
  if (!current) throw new Error(`could not read ${FILE} from theme "${name}"`);
  const next = patchTemplate(current, layout);
  const d = await gql('mutation($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) { themeFilesUpsert(themeId: $themeId, files: $files) { upsertedThemeFiles { filename } userErrors { field message code } } }',
    { themeId: id, files: [{ filename: FILE, body: { type: 'TEXT', value: next } }] });
  if (d.themeFilesUpsert.userErrors.length) throw new Error('Shopify refused the update: ' + JSON.stringify(d.themeFilesUpsert.userErrors));
  // saving is asynchronous: wait until the stored file really contains the layout
  for (let i = 0; i < 12; i++) {
    if (storedLayout((await read()).files.nodes[0]?.body?.content) === layout) return { theme: name, id };
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('the update was accepted but the stored file did not change within 12 seconds; check the theme');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN, SHOPIFY_THEME_ID, ISSUE_BODY } = process.env;
  try {
    if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) throw new Error('SHOPIFY_STORE (variable) and SHOPIFY_ADMIN_TOKEN (secret) are not set in the repository settings');
    const v = validateLayout(extractLayout(ISSUE_BODY));
    if (!v.ok) throw new Error('the layout was refused, nothing was changed:\n- ' + v.errors.join('\n- '));
    const r = await apply({ store: SHOPIFY_STORE, token: SHOPIFY_ADMIN_TOKEN, themeId: SHOPIFY_THEME_ID, layout: v.layout });
    console.log(`Applied ${v.placements} placement(s) and ${v.cards} card setting(s) to theme "${r.theme}". Reload the storefront to see it.`);
  } catch (e) { console.log('Not applied: ' + e.message); process.exitCode = 1; }
}
