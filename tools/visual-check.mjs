#!/usr/bin/env node
// HumanPush: visuele controle met Playwright. Draait lokaal, niet in CI (heeft een browser nodig).
//
//   node tools/visual-check.mjs [--root <map>] [--out tests/screenshots/after]
//
// Start een eigen statische server op de map (standaard deze repo), opent 8 pagina's op 360, 768 en 1440 px en controleert:
//   (a) geen horizontale scroll: scrollWidth <= clientWidth;
//   (b) geen zichtbare tekst die wordt afgeknipt door overflow:hidden;
//   (c) een screenshot van de hele pagina naar <out>/<pagina>-<breedte>.png (tests/ wordt niet uitgeleverd, zie .vercelignore).
// Zonder Playwright stopt het script met een melding (exitcode 0), zodat het nergens iets breekt.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = resolve(arg('--root', join(dirname(fileURLToPath(import.meta.url)), '..')));
const OUT = resolve(arg('--out', join(ROOT, 'tests/screenshots/after')));
const PAGES = ['/', '/bedrijven', '/professionals', '/hoe-het-werkt', '/agents', '/veelgestelde-vragen', '/inloggen', '/pilot/second-opinion'];
const WIDTHS = [360, 768, 1440];

let chromium;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch {
  console.log('Playwright ontbreekt: visuele controle overgeslagen.');
  process.exit(0);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index';
  let f = join(ROOT, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f += '.html';
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const problems = [];
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  for (const p of PAGES) {
    await page.goto(base + p, { waitUntil: 'load' });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const clipped = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (!/hidden|clip/.test(cs.overflowX + cs.overflow) || cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (el.closest('[hidden], .vh, .skip, pre')) continue;
        if (!el.innerText || !el.innerText.trim()) continue;
        if (el.scrollWidth > el.clientWidth + 2) clipped.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${el.scrollWidth} > ${el.clientWidth})`);
      }
      return { sw: de.scrollWidth, cw: de.clientWidth, clipped: clipped.slice(0, 5) };
    });
    if (r.sw > r.cw) problems.push(`${p} @${w}: horizontale scroll (${r.sw} > ${r.cw})`);
    for (const c of r.clipped) problems.push(`${p} @${w}: afgeknipte tekst in ${c}`);
    const name = (p === '/' ? 'home' : p.slice(1).replace(/\//g, '-')) + `-${w}.png`;
    await page.screenshot({ path: join(OUT, name), fullPage: true });
  }
  await page.close();
}
await browser.close();
server.close();
if (problems.length) { console.error(problems.map((x) => '✗ ' + x).join('\n')); process.exit(1); }
console.log(`✓ ${PAGES.length} pagina's × ${WIDTHS.length} breedtes: geen horizontale scroll, geen afgeknipte tekst. Screenshots in ${OUT}`);
