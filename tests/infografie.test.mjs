// Infografieën: echte tekst, een naam voor de voorleessoftware, geen script en geen externe URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const PAGES = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')), ...readdirSync(join(ROOT, 'pilot')).filter((f) => f.endsWith('.html')).map((f) => 'pilot/' + f)];

test('infografieën hebben een aria-label, tekst van minstens 12px, en geen script of externe URL', () => {
  const roots = ['ig-steps', 'ig-who', 'ig-rows', 'ig-money', 'ig-flow'];
  let seen = 0;
  for (const f of PAGES) {
    const t = read(f);
    for (const name of roots) {
      for (const m of t.matchAll(new RegExp(`<(?:ol|ul|div) class="${name}"([^>]*)>`, 'g'))) {
        seen++;
        assert.match(m[1], /aria-label="[^"]+"/, `${f}: ${name} mist een aria-label`);
      }
    }
    const blocks = t.match(/class="ig[\s\S]*?(?=<\/(?:section|main)>)/g) || [];
    for (const b of blocks) {
      assert.doesNotMatch(b, /<script/i, `${f}: script in een infographic`);
      assert.doesNotMatch(b, /https?:\/\//i, `${f}: externe URL in een infographic`);
    }
  }
  assert.ok(seen >= 8, `te weinig infografieën gevonden: ${seen}`);
  const css = read('site.css');
  const ig = css.slice(css.indexOf('/* Infografieën'));
  for (const m of ig.matchAll(/font-size:\s*([\d.]+)px/g)) assert.ok(Number(m[1]) >= 12, `font-size ${m[1]}px`);
});
