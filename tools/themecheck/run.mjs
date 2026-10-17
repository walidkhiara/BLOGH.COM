import { themeCheckRun } from '@shopify/theme-check-node';
import path from 'node:path';
const root = path.resolve('../../theme');
const t0 = Date.now();
const { offenses, theme } = await themeCheckRun(root, undefined, (m) => console.error('[log]', m));
console.log('files checked:', theme.length, ' offenses:', offenses.length, ' in', Date.now() - t0, 'ms');
const sev = ['ERROR', 'WARNING', 'INFO'];
for (const o of offenses) {
  const f = o.uri.replace('file://' + root + '/', '');
  console.log(`${sev[o.severity] || o.severity}  ${f}:${(o.start?.line ?? 0) + 1}  [${o.check}]  ${o.message}`);
}

// Shopify limits that Theme Check does not enforce. Breaking one makes Shopify refuse the file on upload,
// and an upload by URL does not report why, so check them here.
import fs from 'node:fs';
const problems = [];
for (const f of fs.readdirSync(path.join(root, 'sections')).filter((x) => x.endsWith('.liquid'))) {
  const m = fs.readFileSync(path.join(root, 'sections', f), 'utf8').match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/);
  if (!m) continue;
  const sch = JSON.parse(m[1]);
  const long = (label, v) => { if (typeof v === 'string' && !v.startsWith('t:') && v.length > 25) problems.push(`${f}: ${label} "${v}" is ${v.length} characters (max 25)`); };
  long('section name', sch.name);
  (sch.blocks || []).forEach((b) => long(`block name`, b.name));
  (sch.presets || []).forEach((p) => long('preset name', p.name));
  const ranges = (list, where) => (list || []).forEach((s) => { if (s.type === 'range') { const steps = (s.max - s.min) / s.step; if (steps > 101 || Math.abs(steps - Math.round(steps)) > 1e-9) problems.push(`${f}: ${where} range "${s.id}" has ${steps} steps (max 101, whole number)`); } });
  ranges(sch.settings, 'section'); (sch.blocks || []).forEach((b) => ranges(b.settings, 'block ' + b.type));
}
console.log('shopify limits:', problems.length ? '' : 'ok');
problems.forEach((p) => console.log('  ERROR  ' + p));
if (problems.length) process.exitCode = 1;
