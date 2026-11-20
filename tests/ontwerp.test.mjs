// Ontwerpsysteem, dienstkaarten, steppers en de voorbeeld-demo: vaste structuur, zonder JS alles zichtbaar,
// "aangeboden opdracht" in plaats van "beurt" in publieke teksten, alleen eigen lettertypen, geen verboden woorden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const PAGES = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')), ...readdirSync(join(ROOT, 'pilot')).map((f) => 'pilot/' + f)];
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '').replace(/<[^>]+>/g, ' ');

test('publieke teksten: geen "beurt" (alleen /voorwaarden mag, tot de jurist akkoord geeft), wel "aangeboden opdracht" en "toegewezen aan een professional"', () => {
  const files = [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md', 'partials/diensten.json'];
  for (const f of files) {
    const t = visible(read(f)).replace(/gebeurt\w*/gi, '');
    assert.doesNotMatch(t, /\bbeurt/i, f);
  }
  assert.match(read('professionals.html'), /aangeboden opdracht/i);
  assert.match(read('bedrijven.html'), /toegewezen aan een professional/i);
  assert.match(read('hoe-het-werkt.html'), /toegewezen aan een (geregistreerde )?professional/);
  // /voorwaarden blijft voorlopig gelijk aan de tekst op main (aparte PR "voorwaarden-woordkeuze", ter toetsing door jurist).
  assert.match(read('voorwaarden.html'), /\bbeurt/);
});

test('geen "in bewaring", "escrow" of "geld vasthouden" in uitgeleverde teksten', () => {
  for (const f of [...PAGES, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'partials/diensten.json']) assert.doesNotMatch(read(f), /in bewaring|escrow|geld vasthouden/i, f);
});

test('lettertypen: alleen eigen woff2-bestanden die bestaan, Inter Tight en JetBrains Mono', () => {
  const css = read('site.css');
  const urls = [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(urls.length >= 5);
  for (const u of urls) assert.ok(existsSync(join(ROOT, u.slice(1))), u);
  assert.match(css, /font-family: "Inter Tight"/);
  assert.match(css, /font-family: "JetBrains Mono"/);
  assert.doesNotMatch(css, /@import|url\(\s*["']?https?:/);
  for (const f of PAGES) for (const m of read(f).matchAll(/<link rel="preload" href="([^"]+)"/g)) assert.ok(existsSync(join(ROOT, m[1].slice(1))), `${f}: ${m[1]}`);
  assert.match(read('fonts/OFL.txt'), /Inter Tight[\s\S]*JetBrains Mono[\s\S]*SIL OPEN FONT LICENSE/);
});

test('dienstkaarten: 5 registers in vaste volgorde, beide kanten in de HTML, details standaard open (zonder JS)', () => {
  const data = JSON.parse(read('partials/diensten.json'));
  assert.deepEqual(data.registers.map((r) => r.tab), ['NIVRE', 'NRVT', 'NRBI', 'NRGD', 'Octrooi']);
  for (const r of data.registers) {
    assert.match(r.service_id, /^[a-z]+\.[a-z_]+$/);
    for (const k of ['pro', 'bedrijf']) assert.equal(r[k].chips.length, 3, `${r.id} ${k}: 3 chips`);
    assert.doesNotMatch(JSON.stringify(r), /TODO|\[\.\.\.\]|€/);
  }
  // /professionals toont alle vijf registers (NIVRE uitgeklapt); /bedrijven alleen de dienst die te boeken is (besluit 20-11: NIVRE eerst).
  for (const [f, view, regs] of [['professionals.html', 'pro', data.registers], ['bedrijven.html', 'bedrijf', data.registers.filter((r) => r.status === 'boekbaar')]]) {
    const t = read(f);
    assert.match(t, new RegExp(`<!--diensten:start view=${view}( only=boekbaar)?-->`), f);
    assert.match(t, new RegExp(`<div class="svc" data-svc data-view="${view}">`), f);
    for (const r of regs) {
      assert.match(t, new RegExp(`<section class="svc-card" id="${r.id}"`), `${f}: ${r.id}`);
      assert.match(t, new RegExp(`<a class="svc-tab" href="#${r.id}"`), `${f}: tab ${r.id}`);
      assert.ok(t.includes(r.service_id), `${f}: ${r.service_id}`);
    }
    assert.equal((t.match(/<div class="svc-v" data-v="pro"/g) || []).length, regs.length, f);
    assert.equal((t.match(/<div class="svc-v" data-v="bedrijf"/g) || []).length, regs.length, f);
    assert.equal((t.match(/<details class="svc-more" open>/g) || []).length, 2, `${f}: alleen NIVRE uitgeklapt (zonder JS)`);
    assert.match(t, /<button type="button" class="svc-view" data-view="pro" aria-pressed="(true|false)">Voor de professional<\/button>/);
  }
});

test('navigatie: alleen Bedrijven, Professionals, Hoe het werkt (Inloggen alleen met de testvlag); /agents wel in footer, sitemap en llms.txt', () => {
  for (const f of PAGES) {
    const t = read(f);
    const nav = t.match(/<ul class="nav-list">([\s\S]*?)<\/ul><\/nav>/)[1];
    const items = [...nav.matchAll(/<li(?: class="[^"]*")?><a href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(items, ['/bedrijven', '/professionals', '/hoe-het-werkt'], f);
    assert.match(nav, /<li class="nav-login-mobile" data-testenv hidden>/, `${f}: testomgeving alleen met de vlag`);
    assert.match(t, /<div class="login" data-testenv hidden>/, `${f}: Inloggen standaard weg`);
    assert.match(t, /<footer[\s\S]*<a href="\/agents">/, `${f}: /agents in de footer`);
    assert.match(t, /<footer[\s\S]*<a href="\/veelgestelde-vragen">Veelgestelde vragen<\/a>/, `${f}: Veelgestelde vragen in de footer`);
  }
  assert.match(read('sitemap.xml'), /<loc>https:\/\/humanpush\.nl\/agents<\/loc>/);
  assert.match(read('llms.txt'), /humanpush\.nl\/agents|\/agents/);
  assert.match(read('bedrijven.html'), /<h1>Je AI-agent kan veel\. Tekenen kan hij niet\.<\/h1>/);
  assert.match(read('bedrijven.html'), /id="developers"[\s\S]*Voor developers en agents[\s\S]*Bestellen in drie stappen: dienst kiezen, opdracht zetten, betaallink laten betalen\.[\s\S]*<a href="\/agents">[\s\S]*<details class="voor-bouwer" open><summary>Voor je bouwer<\/summary>[\s\S]*v1_create_order/);
  assert.match(read('professionals.html'), /<h1>Jouw registratie, ingezet waar AI het werk voorbereidt\.<\/h1>/);
});

test('site.js: verminderde beweging, geen autoplay in de stepper, keuze alleen lokaal bewaard', () => {
  const js = read('site.js');
  assert.match(js, /prefers-reduced-motion: reduce/);
  const stepper = js.slice(js.indexOf('// Stepper'), js.indexOf('// Voorbeeld-demo'));
  assert.doesNotMatch(stepper, /setInterval|setTimeout\([^,]+,\s*\d{3,}\)/, 'geen autoplay');
  assert.match(js, /localStorage/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon/, 'geen netwerkverkeer vanuit site.js');
  assert.match(read('privacy.html'), /onthoudt alleen je eigen browser/);
});

test('goudregel: goud alleen als accent, nooit knopachtergrond of tekstkleur', () => {
  const css = read('site.css');
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
  const gold = /var\(--gold\)|#E0A526/i;
  for (const { sel, body } of rules) {
    for (const decl of body.split(';')) {
      const [prop, val] = decl.split(':').map((s) => (s || '').trim());
      if (!val || !gold.test(val)) continue;
      // Nooit als tekstkleur.
      assert.notEqual(prop, 'color', `goud als tekstkleur in ${sel}`);
      // Nooit als achtergrond van een knop, link, de body of een tekstblok.
      if (/^background/.test(prop)) assert.doesNotMatch(sel, /\b(btn|button|a|body|p|h[1-4]|li|login|svc-view|fake|nav)\b/, `goud als achtergrond van ${sel}`);
    }
  }
  // Waar goud wel staat: stippen, strepen, focus en het handtekening-accent. Zo blijft het één accent per scherm.
  const allowed = /focus-visible|::before|::after|signed|\.arr\.sign i|tag-mens|^:root/;
  for (const { sel, body } of rules) if (gold.test(body)) assert.match(sel, allowed, `goud buiten een accent: ${sel}`);
  for (const f of PAGES) assert.doesNotMatch(read(f), /style="(?:[^"]*;)?\s*(color|background[\w-]*)\s*:[^;"]*(#E0A526|--gold)/i, `${f}: geen goud als tekst- of achtergrondkleur in inline stijl`);
});

test('dienstkaart NRGD (bedrijf): vaststelling, geen "zekerheid"', () => {
  const nrgd = JSON.parse(read('partials/diensten.json')).registers.find((r) => r.id === 'nrgd');
  assert.equal(nrgd.bedrijf.regel, 'Een getekende vaststelling of één document overeenkomt met een referentiepunt dat je meelevert, door een NRGD-deskundige.');
  assert.ok(nrgd.in_scope.includes("Je stelt vast of één aangeleverd document overeenkomt met een referentiepunt dat het bedrijf meelevert: een eerdere digitale vingerafdruk (hash), een ondertekende versie of een tijdstempel. Zonder bruikbaar referentiepunt is de uitkomst 'niet te beoordelen'."));
  assert.ok(nrgd.out_of_scope.includes('Een oordeel zonder referentiepunt'));
  assert.doesNotMatch(JSON.stringify(nrgd), /sinds (een|het opgegeven) tijdstip|onveranderd is/);
  for (const f of ['professionals.html', 'bedrijven.html']) assert.doesNotMatch(read(f), /Zekerheid of één document/, f);
});

test('pilotpagina: geen "beurt", en valt onder de JSON-LD-test', () => {
  assert.doesNotMatch(visible(read('pilot/second-opinion.html')).replace(/gebeurt\w*/gi, ''), /\bbeurt/i);
  assert.match(read('tests/schema.test.mjs'), /join\(ROOT, 'pilot'\)/);
  assert.equal((read('pilot/second-opinion.html').match(/<script type="application\/ld\+json">/g) || []).length, 1);
});

test('geen sjabloonresten: {{ of }} in zichtbare HTML (JSON-LD uitgezonderd)', () => {
  for (const f of PAGES) {
    const html = read(f).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
    assert.doesNotMatch(html, /\{\{|\}\}/, f);
  }
  assert.match(read('bedrijven.html'), /v1_create_order<\/span>\(\{\n[\s\S]*inputs: \{…\}[\s\S]*\n\}\)\n[\s\S]*→<\/span> \{ state:/);
});

test('privacy noemt de routekaarten zoals ze nu heten', () => {
  const t = read('privacy.html');
  assert.match(t, /"Ik vertegenwoordig een bedrijf" of "Ik ben een geregistreerde professional"/);
  assert.doesNotMatch(t, /"een agent"/);
});

test('mobiel menu zonder JS: standaard ingeklapt, opent via #site-nav', () => {
  for (const f of PAGES) assert.match(read(f), /<a class="menu-link" href="#site-nav">Menu<\/a>\n<nav id="site-nav"/, f);
  const css = read('site.css');
  assert.match(css, /\.no-js \.site-nav \{ display: none; \}/);
  assert.match(css, /\.no-js \.site-nav:target \{ display: block;/);
});

test('dienstkaarten volgen de opgeslagen doelgroep, net als de steppers', () => {
  const js = read('site.js');
  const svc = js.slice(js.indexOf('// Dienstkaarten'), js.indexOf('// Stepper'));
  assert.match(svc, /store\('hp-doelgroep'\)/);
  assert.match(svc, /aud === 'pro' \|\| aud === 'bedrijf'/);
});

test('visuele rust: geen raster door de hero, geen doorhaling, minder lijnen, leesbare labels, niets afgeknipt op mobiel', () => {
  const css = read('site.css');
  assert.doesNotMatch(css, /line-through/, 'geen doorgestreepte tekst');
  assert.doesNotMatch(css, /\.hero\.dark::after/, 'geen raster door de hero');
  assert.match(css, /\.section \{ border-top: 0; \}/, 'geen lijn tussen secties met een andere achtergrond');
  assert.match(css, /\.grid \{ border: 0; gap: 20px; \}/);
  assert.match(css, /\.reasons li \+ li, \.guarantees li \+ li \{ border-top/, 'alleen lijnen tussen items');
  assert.match(css, /\.c-msg \{ overflow-wrap: anywhere;/);
  assert.match(css, /\.c-code \{ white-space: pre-wrap;/);
  assert.match(css, /\.svc-tabs \{ -webkit-mask-image: linear-gradient\(to right/, 'zichtbare scrollhint op de tabs');
  // Labels die mensen lezen: sans, 14px, zinsvorm.
  const block = css.slice(css.indexOf('/* Leesbare labels'));
  assert.match(block, /\.svc-facts dt[\s\S]*?\{\s*font-family: var\(--sans\); font-size: 14px; letter-spacing: 0; text-transform: none;/);
  for (const f of PAGES) {
    const spans = read(f).match(/<p class="f-legal">([\s\S]*?)<\/p>/)[1].match(/<span>([^<]*)<\/span>/g).map((s) => s.replace(/<[^>]+>/g, ''));
    for (const s of spans) assert.doesNotMatch(s, /^·/, `${f}: footerregel begint nooit met "·"`);
  }
  assert.match(read('tools/visual-check.mjs'), /scrollWidth > r\.cw|r\.sw > r\.cw/);
  assert.match(read('.gitignore'), /tests\/screenshots\//);
});
