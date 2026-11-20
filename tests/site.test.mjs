// Controles op de uitgeleverde site (brief 9.1): verboden woorden, garantieblok op één plek, links, vlaggen, noindex.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const ignored = read('.vercelignore').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
function shipped(dir = ROOT) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f); const rel = relative(ROOT, p);
    if (f.startsWith('.') || f === 'node_modules' || ignored.includes(rel.split('/')[0])) continue;
    if (statSync(p).isDirectory()) out.push(...shipped(p));
    else if (/\.(html|js|json|txt|svg|md|css|xml)$/.test(f)) out.push(rel);
  }
  return out;
}
const FILES = shipped();
const PAGES = FILES.filter((f) => f.endsWith('.html'));

test('verboden woorden staan niet in uitgeleverde bestanden', () => {
  const bad = /sandbox|blockchain|v1-testtak|\/v1\/pro\b|\bRSIN\b|vestigingsnummer|test branch|tekenpagina|backup-passkey/i;
  // De bron van de functies in api/ wordt niet als bestand uitgeleverd (Vercel draait ze alleen); de weigerregels
  // moeten zulke woorden in een vraag kunnen herkennen. De kennisbasis in api/_kb.js telt wel mee.
  for (const f of FILES.filter((f) => !f.startsWith('api/') || f === 'api/_kb.js')) { const m = read(f).match(bad); assert.equal(m, null, `${f}: "${m && m[0]}"`); }
});

test('geen adres of postcode op de site', () => {
  for (const f of FILES.filter((f) => !f.startsWith('api/_kb') && !f.startsWith('kb/index'))) {
    assert.doesNotMatch(read(f), /\b\d{4}\s?[A-Z]{2}\b(?![A-Za-z])|\b(straat|laan|weg|plein|gracht) \d+/, f);
  }
});

test('geen interne woorden, ook niet hold_2a (QA 19 nov)', () => {
  for (const f of FILES) assert.doesNotMatch(read(f), /hold_2a|v1-testtak|test branch|\/v1\/pro\b|tekenpagina/i, f);
});

test('geen bezoekersteller of andere externe scripts: "we verzamelen geen gegevens" klopt (QA 19 nov)', () => {
  for (const f of PAGES) { const x = read(f); assert.doesNotMatch(x, /goatcounter|gc\.zgo\.at/i, f); assert.doesNotMatch(x, /<script[^>]+src="(https?:)?\/\//i, f); }
  assert.match(read('professionals.html'), /Aanmelden is nog niet open\. Er is nu geen formulier en we verzamelen geen gegevens\./);
  assert.doesNotMatch(read('rules.json'), /src\/|tools\/|\.ts\b|\.mjs\b/, 'geen interne paden in rules.json');
});


test('het garantieblok staat alleen op /hoe-het-werkt; elders één regel met link', () => {
  for (const f of PAGES) {
    const has = read(f).includes('class="guarantees"');
    assert.equal(has, f === 'hoe-het-werkt.html', f);
  }
  for (const f of ['index.html', 'agents.html', 'bedrijven.html', 'professionals.html', 'veelgestelde-vragen.html']) {
    assert.match(read(f), /Wat het systeem garandeert staat op <a href="\/hoe-het-werkt#garanties">/, f);
  }
});

test('elke pagina: noindex, banner, footer zonder adres, Inloggen met "komt eraan", geen Google Fonts', () => {
  const banner = 'HumanPush is in de testfase: er lopen nog geen echte opdrachten of betalingen en alle bedragen en termijnen zijn testwaarden. Aanmelden opent na afronding van de testfase.';
  for (const f of PAGES) {
    const t = read(f);
    assert.match(t, /<meta name="robots" content="noindex, nofollow">/, f);
    assert.ok(t.includes(banner), f + ' banner');
    assert.ok(t.includes('<p>HumanPush is een handelsnaam van HumAgent B.V. · KvK 42222476 · btw NL870249964B01 · Utrecht</p><p><a href="mailto:info@humanpush.nl">info@humanpush.nl</a></p>'), f + ' footer');
    assert.match(t, /Inloggen[\s\S]{0,400}komt eraan/, f + ' inloggen');
    assert.doesNotMatch(t, /fonts\.googleapis|fonts\.gstatic/, f);
    assert.equal((t.match(/<h1[ >]/g) || []).length, 1, f + ' één h1');
  }
});

test('"Aanmelden is nog niet open" blijft staan, zonder formulier', () => {
  assert.match(read('professionals.html'), /Aanmelden is nog niet open/);
  assert.match(read('bedrijven.html'), /Aanmelden is nog niet open/);
  for (const f of PAGES) { assert.doesNotMatch(read(f), /<form\b|<input\b|meld je aan/i, f); }
});

test('vercel.json: noindex-headers en de humanpush.eu-redirect staan er nog', () => {
  const v = JSON.parse(read('vercel.json'));
  assert.equal(v.headers[0].headers[0].value, 'noindex, nofollow');
  assert.equal(v.redirects[0].destination, 'https://humanpush.nl/bedrijven');
  assert.equal(v.redirects.length, 2);
});

test('interne links verwijzen naar een bestaande pagina en een bestaand anker', () => {
  const ids = {};
  for (const f of PAGES) ids['/' + f.replace(/\.html$/, '').replace(/^index$/, '')] = new Set([...read(f).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const exists = (p) => ids[p] || existsSync(join(ROOT, p.slice(1)));
  for (const f of PAGES) {
    const self = '/' + f.replace(/\.html$/, '').replace(/^index$/, '');
    for (const m of read(f).matchAll(/href="(\/[^"#]*)?(#[^"]*)?"/g)) {
      const path = m[1] === undefined ? self : m[1];
      assert.ok(exists(path), `${f}: ${path}`);
      if (m[2] && ids[path]) assert.ok(ids[path].has(m[2].slice(1)), `${f}: ${path}${m[2]}`);
    }
  }
});

test('voorbeelden zonder datum uit het verleden', () => {
  for (const f of PAGES.filter((f) => f !== 'privacy.html')) assert.doesNotMatch(read(f), /\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) 20\d\d\b/i, f);
});

test('goud nooit als knopkleur', () => {
  assert.doesNotMatch(read('site.css'), /\.btn[^{]*\{[^}]*background:\s*(var\(--gold\)|#E0A526)/i);
});
