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
  const files = [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md', 'partials/swimlane-legenda.json', 'partials/diensten.json', 'partials/flow.html'];
  for (const f of files) {
    const t = visible(read(f)).replace(/gebeurt\w*/gi, '');
    assert.doesNotMatch(t, /\bbeurt/i, f);
  }
  for (const f of ['partials/swimlane.svg', 'partials/flow-desktop.svg', 'assets/infographic.svg']) assert.doesNotMatch(read(f).replace(/gebeurt\w*/gi, ''), /\bbeurt/i, f);
  assert.match(read('professionals.html'), /aangeboden opdracht/i);
  assert.match(read('bedrijven.html'), /toegewezen aan een professional/);
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
  assert.match(t, /<details class="more" id="systeem" open><summary>Lees meer: wat het systeem precies doet<\/summary>[\s\S]*<!--flow:start-->[\s\S]*<!--swim:start-->[\s\S]*?<\/details>/);
  assert.match(t, /<details class="more" id="g18" open[^>]*><summary>Lees meer: de garanties G1 tot en met G8<\/summary>\n<table class="table">/);
  assert.match(t, /<details class="more" id="geld" open[^>]*><summary>Lees meer: waar het geld heen gaat<\/summary>\n<table class="table">/);
  for (const m of t.matchAll(/<details class="more"[^>]*>/g)) assert.match(m[0], / open[ >]/, `zonder JS open: ${m[0]}`);
  // Steppers, schema en professional-mockup staan buiten de uitklappers.
  const outside = t.replace(/<details class="more"[\s\S]*?<\/details>/g, '');
  for (const s of ['<ol class="flow4"', 'id="sa"', 'id="sb"', 'id="scherm-professional"']) assert.ok(outside.includes(s), s);
  // Codevoorbeelden zijn echte code voor schermlezers, mockups mogen een afbeelding zijn.
  assert.doesNotMatch(t, /class="codecard[^"]*" role="img"/);
  assert.equal((t.match(/<figure class="codecard small-code"><figcaption class="hd">[\s\S]*?<pre><code>/g) || []).length, 4);
  assert.match(t, /Vooraf betaald · uitbetaling na acceptatie door het bedrijf of na <span data-rule="objectionHours">72<\/span> uur/);
  assert.doesNotMatch(t, /uitbetaling pas na acceptatie/);
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

test('home: generieke hero, twee routekaarten als gewone links, daarna 4 blokken en de demo', () => {
  const t = read('index.html');
  assert.match(t, /<h1>Waar AI-agenten werk doen, tekent een geregistreerde professional\.<\/h1>\n<p class="definition">/);
  const cards = [...t.matchAll(/<a class="routecard" href="([^"]+)" data-aud="(\w+)"><span class="rc-title">([^<]+)<\/span><span class="rc-sub">([^<]+)<\/span><\/a>/g)].map((m) => m.slice(1));
  assert.deepEqual(cards, [
    ['/bedrijven', 'bedrijf', 'Ik vertegenwoordig een bedrijf', 'of ik bouw de AI-agent van een bedrijf'],
    ['/professionals', 'pro', 'Ik ben een geregistreerde professional', 'NIVRE, NRVT, NRGD, NRBI, octrooigemachtigde']
  ]);
  // Volgorde: hero met routekaarten, dan het 4-blokkenschema, dan de demo.
  const iCards = t.indexOf('class="routecards"'), iFlow = t.indexOf('<ol class="flow4"'), iDemo = t.indexOf('<figure class="demo"');
  assert.ok(iCards > 0 && iCards < iFlow && iFlow < iDemo, 'routekaarten → 4 blokken → demo');
  assert.ok(iCards < t.indexOf('</section>'), 'routekaarten staan in de hero');
  assert.match(t, /<figure class="demo" data-anim[\s\S]*<b>Voorbeeld<\/b>[\s\S]*<button class="demo-pause" type="button" aria-pressed="false">Pauzeer animatie<\/button>/);
  assert.match(t, /class="log">#0007/);
  const demoJs = read('site.js').slice(read('site.js').indexOf('// Voorbeeld-demo'));
  assert.doesNotMatch(demoJs.slice(0, demoJs.indexOf('// Uitklappers')), /btn\.textContent/);
  assert.match(t, /<ol class="flow4"[\s\S]*Bestelling[\s\S]*Professional accepteert[\s\S]*Getekend werk[\s\S]*Bewijs[\s\S]*<a href="\/hoe-het-werkt">Zo werkt het precies<\/a>/);
  assert.doesNotMatch(t, /class="iflow"|<!--flow:start|class="audience"/);
});

test('navigatie: alleen Bedrijven, Professionals, Hoe het werkt (+ Inloggen); /agents wel in footer, sitemap en llms.txt', () => {
  for (const f of PAGES) {
    const t = read(f);
    const nav = t.match(/<ul class="nav-list">([\s\S]*?)<\/ul><\/nav>/)[1];
    const items = [...nav.matchAll(/<li(?: class="[^"]*")?><a href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(items, ['/bedrijven', '/professionals', '/hoe-het-werkt', '/inloggen'], f);
    assert.match(t, /<footer[\s\S]*<a href="\/agents">/, `${f}: /agents in de footer`);
    assert.match(t, /<footer[\s\S]*<a href="\/veelgestelde-vragen">Vragen<\/a>/, `${f}: Vragen in de footer`);
  }
  assert.match(read('sitemap.xml'), /<loc>https:\/\/humanpush\.nl\/agents<\/loc>/);
  assert.match(read('llms.txt'), /humanpush\.nl\/agents|\/agents/);
  assert.match(read('bedrijven.html'), /<h1>Je AI-agent kan veel\. Tekenen kan hij niet\.<\/h1>/);
  assert.match(read('bedrijven.html'), /id="developers"[\s\S]*Voor developers en agents[\s\S]*<pre><code>[\s\S]*v1_create_order[\s\S]*<a href="\/agents">/);
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
  assert.equal(nrgd.bedrijf.regel, 'Een getekende vaststelling of één document onveranderd is, door een NRGD-deskundige.');
  for (const f of ['professionals.html', 'bedrijven.html']) assert.doesNotMatch(read(f), /Zekerheid of één document/, f);
});

test('pilotpagina: geen "beurt", en valt onder de JSON-LD-test', () => {
  assert.doesNotMatch(visible(read('pilot/second-opinion.html')).replace(/gebeurt\w*/gi, ''), /\bbeurt/i);
  assert.match(read('tests/schema.test.mjs'), /join\(ROOT, 'pilot'\)/);
  assert.equal((read('pilot/second-opinion.html').match(/<script type="application\/ld\+json">/g) || []).length, 1);
});
