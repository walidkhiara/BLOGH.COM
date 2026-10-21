/*
 * render.mjs — renders scene.js frame by frame in headless Chromium and
 * pipes the frames into ffmpeg.
 *
 *   node render.mjs                     full clip -> out/clip-1080p.mp4
 *   node render.mjs --from 10 --to 14   a section only
 *   node render.mjs --stills            one PNG per shot -> out/stills/
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
};
const stills = process.argv.includes('--stills');
const fps = Number(arg('--fps', 30));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!path.startsWith(here)) throw new Error('outside');
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(url);
await page.waitForFunction(() => window.sceneReady, null, { timeout: 120000 });
const { DURATION } = await page.evaluate(() => window.clipInfo);

const grab = (t) => page.evaluate((t) => {
  window.renderFrame(t);
  return document.querySelector('canvas').toDataURL('image/png').split(',')[1];
}, t);

await mkdir(join(here, 'out'), { recursive: true });

if (stills) {
  await mkdir(join(here, 'out/stills'), { recursive: true });
  const times = (arg('--times', '') || '1,9,14,21,25,27,31,36,40,43,47,53,58,62').split(',').map(Number);
  for (const t of times) {
    await writeFile(join(here, `out/stills/t${String(t).padStart(5, '0')}.png`), Buffer.from(await grab(t), 'base64'));
    console.log('still', t);
  }
} else {
  const from = Number(arg('--from', 0));
  const to = Math.min(Number(arg('--to', DURATION)), DURATION);
  const out = join(here, arg('--out', 'out/clip-1080p.mp4'));
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round((to - from) * fps);
  const started = Date.now();
  for (let f = 0; f < frames; f++) {
    const png = Buffer.from(await grab(from + f / fps), 'base64');
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) {
      const per = (Date.now() - started) / (f + 1) / 1000;
      console.log(`frame ${f}/${frames}  ${per.toFixed(2)}s/frame  ~${Math.round(per * (frames - f) / 60)} min left`);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', out);
}

await browser.close();
server.close();
