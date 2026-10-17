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
