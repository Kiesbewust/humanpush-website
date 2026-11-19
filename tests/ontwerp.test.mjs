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

test('publieke teksten: geen "beurt", wel "aangeboden opdracht" en "toegewezen aan een professional"', () => {
  const files = [...PAGES, 'kb/spelregels.md', 'kb/faq.md', 'partials/swimlane-legenda.json', 'partials/diensten.json', 'partials/flow.html'];
  for (const f of files) {
    const t = visible(read(f)).replace(/gebeurt\w*/gi, '');
    assert.doesNotMatch(t, /\bbeurt/i, f);
  }
  for (const f of ['partials/swimlane.svg', 'partials/flow-desktop.svg', 'assets/infographic.svg']) assert.doesNotMatch(read(f).replace(/gebeurt\w*/gi, ''), /\bbeurt/i, f);
  assert.match(read('professionals.html'), /aangeboden opdracht/i);
  assert.match(read('bedrijven.html'), /toegewezen aan een professional/);
  assert.match(read('hoe-het-werkt.html'), /toegewezen aan een (geregistreerde )?professional/);
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
  assert.deepEqual(data.registers.map((r) => r.tab), ['Octrooigemachtigden', 'NRGD', 'NRVT', 'NIVRE', 'Bouwkundig keurders']);
  for (const r of data.registers) {
    assert.match(r.service_id, /^[a-z]+\.[a-z_]+$/);
    for (const k of ['pro', 'bedrijf']) assert.equal(r[k].chips.length, 3, `${r.id} ${k}: 3 chips`);
    assert.doesNotMatch(JSON.stringify(r), /TODO|\[\.\.\.\]|€/);
  }
  for (const [f, view] of [['professionals.html', 'pro'], ['bedrijven.html', 'bedrijf']]) {
    const t = read(f);
    assert.match(t, new RegExp(`<!--diensten:start view=${view}-->`), f);
    assert.match(t, new RegExp(`<div class="svc" data-svc data-view="${view}">`), f);
    for (const r of data.registers) {
      assert.match(t, new RegExp(`<section class="svc-card" id="${r.id}"`), `${f}: ${r.id}`);
      assert.match(t, new RegExp(`<a class="svc-tab" href="#${r.id}"`), `${f}: tab ${r.id}`);
      assert.ok(t.includes(r.service_id), `${f}: ${r.service_id}`);
    }
    assert.equal((t.match(/<div class="svc-v" data-v="pro"/g) || []).length, 5, f);
    assert.equal((t.match(/<div class="svc-v" data-v="bedrijf"/g) || []).length, 5, f);
    assert.equal((t.match(/<details class="svc-more" open>/g) || []).length, 10, f);
    assert.match(t, /<button type="button" class="svc-view" data-view="pro" aria-pressed="(true|false)">Voor de professional<\/button>/);
  }
});

test('/hoe-het-werkt: 4 blokken, uitklapper met het volledige schema, twee steppers met schakelaar en veiligheidslabels', () => {
  const t = read('hoe-het-werkt.html');
  const blocks = [...t.matchAll(/<ol class="flow4"[\s\S]*?<\/ol>/g)][0][0];
  assert.deepEqual([...blocks.matchAll(/<strong>([^<]+)<\/strong>/g)].map((m) => m[1]), ['Bestelling', 'Professional accepteert', 'Getekend werk', 'Bewijs']);
  assert.match(t, /<details class="more" id="systeem"><summary>Lees meer: wat het systeem precies doet<\/summary>[\s\S]*<!--flow:start-->[\s\S]*<!--swim:start-->[\s\S]*<\/details>/);
  assert.match(t, /<summary>Lees meer: hoe we dit beveiligen<\/summary>/);
  assert.match(t, /HumanPush heeft geen certificering of keurmerk/);
  for (const [id, a, b] of [['sa', 'Voor de professional', 'Voor het bedrijf'], ['sb', 'Vanuit de agent', 'Vanuit het bedrijf']]) {
    const st = t.slice(t.indexOf(`<div class="stepper" data-stepper data-view="bedrijf" id="${id}">`));
    assert.ok(st.length < t.length, id);
    assert.ok(st.includes(`>${a}</button>`) && st.includes(`>${b}</button>`), id);
    for (let i = 1; i <= 4; i++) assert.match(st, new RegExp(`<section class="step" id="${id}-${i}"[\\s\\S]*?Stap ${i} van 4`), `${id} stap ${i}`);
    assert.match(st, /aria-label="Vorige stap"/);
    assert.match(st, /aria-label="Volgende stap"/);
  }
  assert.ok((t.match(/<ul class="safe">/g) || []).length >= 16, 'veiligheidslabel per stap en kant');
  assert.match(t, /Registercheck vlak voor aanname/);
  assert.match(t, /Alles terug als niemand binnen <span data-rule="acceptCeilingWorkdays">3<\/span> werkdagen aanneemt/);
  assert.equal((t.match(/class="fictief">Voorbeeld</g) || []).length >= 10, true, 'elke mockup gelabeld als voorbeeld');
  assert.match(t, /id="scherm-professional"[\s\S]*Accepteren[\s\S]*Doorgeven[\s\S]*Bevestig met je passkey/);
});

test('home: doelgroepkeuze, demo gelabeld "Voorbeeld" met pauzeknop, routes per doelgroep', () => {
  const t = read('index.html');
  for (const a of ['bedrijf', 'pro', 'agent']) assert.match(t, new RegExp(`data-aud="${a}"`));
  for (const id of ['route-bedrijf', 'route-professional', 'route-agent']) assert.match(t, new RegExp(`id="${id}"`));
  assert.match(t, /<figure class="demo" data-anim[\s\S]*<b>Voorbeeld<\/b>[\s\S]*class="demo-pause"/);
  assert.match(t, /class="log">#0007/);
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

test('goud alleen als accent: nooit als knop- of tekstkleur', () => {
  const css = read('site.css');
  assert.doesNotMatch(css, /\.btn[^{]*\{[^}]*background:\s*var\(--gold\)/);
  assert.doesNotMatch(css, /(^|[;{\s])color:\s*var\(--gold\)/);
});
