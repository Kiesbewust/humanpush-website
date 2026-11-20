// "Het HumanPush-proces helder": woordenlijst, de vier stappen, de kant-keuze, de gesprekken, de pagina-onderdelen
// en de registerzinnen. /voorwaarden blijft woordelijk gelijk (aparte PR, ter toetsing door jurist).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const PAGES = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')), ...readdirSync(join(ROOT, 'pilot')).map((f) => 'pilot/' + f)];
const visible = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
const DIENSTEN = JSON.parse(read('partials/diensten.json')).registers;

test('woordenlijst: geen logboek, hash, passkey-handtekening, protocol, "mens", "niveau 2" of registerbewijs in Nederlandse publieke tekst', () => {
  const files = [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md', 'partials/diensten.json'];
  const bad = /logboek|\bhash(es)?\b|inhoudshash|passkey-handtekening|\bprotocol\b|\bmens\b|niveau 2|\bniveau\b|registerbewijs|registerverklaring|tijdstip-hash/i;
  for (const f of files) {
    const m = visible(read(f)).match(bad);
    assert.equal(m, null, `${f}: "${m && m[0]}"`);
  }
});

test('woordenlijst: "sleutel" alleen als API-sleutel op /agents; elders "toegangscode voor je agent"', () => {
  for (const f of [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md']) {
    const t = visible(read(f));
    for (const m of t.matchAll(/\S*sleutel\S*/gi)) assert.ok(f === 'agents.html' && /API-sleutel/.test(m[0]), `${f}: "${m[0]}"`);
  }
  for (const f of ['index.html', 'bedrijven.html', 'professionals.html']) assert.doesNotMatch(visible(read(f)), /sleutel/i, f);
  assert.match(read('bedrijven.html'), /toegangscode/);
  assert.match(read('professionals.html'), /toegangscode voor je agent/);
});

test('woordenlijst: uitleg van digitale vingerafdruk, handtekening met je passkey en bewijsdossier', () => {
  const vinger = 'Een unieke code van het opgeleverde stuk. Verandert er later één letter, dan klopt de vingerafdruk niet meer. Zo is aantoonbaar dat het stuk niet is aangepast.';
  const passkey = 'Daarmee bevestig jij als geregistreerde professional dat jij dit werk levert en ervoor instaat. HumanPush controleert vooraf dat je in het register staat.';
  for (const f of ['index.html', 'hoe-het-werkt.html']) {
    const t = read(f);
    assert.ok(t.includes(vinger), `${f}: vingerafdruk`);
    assert.ok(t.includes(passkey), `${f}: passkey`);
    assert.match(t, /Bewijsdossier<\/h3><p>Per opdracht de afspraken en elke getekende stap\./, `${f}: bewijsdossier`);
  }
  assert.ok(read('bedrijven.html').includes(vinger));
});

test('de vier stappen op home en /hoe-het-werkt: vaste tekst, in gewone lettergrootte, en "hetzelfde voor elk register"', () => {
  const steps = [
    ['Opdracht', 'De agent van een bedrijf zet een opdracht uit bij HumanPush. Het bedrijf betaalt vooraf.'],
    ['Aannemen', 'HumanPush biedt de opdracht aan één geregistreerde professional aan. Die heeft <span data-rule="turnWorkingMinutes">45</span> werkminuten om ja te zeggen. Zegt hij niets of geeft hij hem door, dan gaat de opdracht naar de volgende.'],
    ['Uitvoeren en tekenen', 'De professional doet het werk, zelf of met hulp van een agent, en levert het op. Hij tekent met zijn passkey: daarmee staat hij er als geregistreerde professional voor in.'],
    ['Bewijs', 'Elke stap komt in het bewijsdossier van de opdracht. Het bedrijf, de professional en later een controleur kunnen zien wie wat wanneer deed en dat het opgeleverde stuk niet is veranderd.']
  ];
  for (const f of ['index.html', 'hoe-het-werkt.html', 'professionals.html', 'bedrijven.html']) {
    const t = read(f);
    const ol = t.match(/<ol class="steps4"[\s\S]*?<\/ol>/);
    assert.ok(ol, f);
    const found = [...ol[0].matchAll(/<h3>([^<]+)<\/h3><p>([\s\S]*?)<\/p>/g)].map((m) => [m[1], m[2]]);
    assert.deepEqual(found, steps, f);
    assert.match(t, /<\/ol>\n<p class="same">Dit proces is hetzelfde voor elk register\.<\/p>/, f);
  }
  const css = read('site.css');
  const px = Number(css.match(/\.steps4 p \{ font-size: ([\d.]+)px/)[1]);
  assert.ok(px >= 16, `stappen in leesbare grootte (${px}px)`);
});

test('/hoe-het-werkt: kant-keuze bovenaan, een gesprek per kant tot de uitbetaling, en 4 punten "Wat wordt er vastgelegd"', () => {
  const t = read('hoe-het-werkt.html');
  assert.match(t, /<div class="side-bar" data-side-root>\n<p class="side-hint">[^<]*<\/p>\n<div class="svc-toggle side-toggle" role="group" aria-label="Kies je kant"><button type="button" class="svc-view" data-view="pro" aria-pressed="false">Ik ben professional<\/button><button type="button" class="svc-view" data-view="bedrijf" aria-pressed="true">Ik ben een bedrijf \(of zijn agent\)<\/button><\/div>/);
  assert.ok(t.indexOf('data-side-root') < t.indexOf('class="steps4"'), 'keuze staat bovenaan');
  for (const side of ['pro', 'bedrijf']) {
    const s = t.match(new RegExp(`<div class="side" data-side="${side}">[\\s\\S]*?<\\/figure>`))[0];
    assert.match(s, /<figure class="chat"[\s\S]*class="fictief">Voorbeeld<\/span>/, side);
    assert.match(s, /uitbetaald/, `${side}: tot de uitbetaling`);
    assert.match(s, /Expert B|jij bent Expert B/i, side);
  }
  assert.match(t, /Expert B heeft het rapport opgeleverd en getekend[\s\S]*Accepteren\.[\s\S]*Expert B wordt uitbetaald/);
  const v = t.match(/<ol class="vastgelegd">[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...v.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ['Registercheck', 'Digitale vingerafdruk', 'Handtekening met je passkey', 'Bewijsdossier']);
  assert.equal((v.match(/Waarom het telt:/g) || []).length, 4);
  assert.doesNotMatch(t, /class="infographic"|class="swimcard"|<!--(flow|swim)/, 'geen oude schema-onderdelen');
  const js = read('site.js');
  assert.match(js, /\[data-side-root\][\s\S]*store\('hp-doelgroep', v\)/, 'keuze wordt bewaard');
});

test('/professionals: drie manieren met eigen flow, onboarding, uitbetaling, te laat (regels uit rules.json), voordelen', () => {
  const t = read('professionals.html');
  const manieren = [...t.matchAll(/<a class="svc-tab" href="#manier-[\w-]+" id="tab-manier-[\w-]+" data-tab="manier-[\w-]+">([^<]+)<\/a>/g)].map((m) => m[1]);
  assert.deepEqual(manieren, ['Zelf, zoals je gewend bent', 'Met je eigen agent', 'Met de HumanPush-agent']);
  for (const k of ['zelf', 'eigen-agent', 'humanpush-agent']) assert.equal((t.match(new RegExp(`id="manier-${k}"[\\s\\S]*?</section>`))[0].match(/<li>/g) || []).length, 4, k);
  const begin = t.match(/id="zo-begin-je"[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...begin.matchAll(/<li><strong>([^<]+)<\/strong>/g)].map((m) => m[1]), ['Aanmelden', 'Registercheck', 'Twee passkeys instellen', 'Je eerste aangeboden opdracht']);
  assert.match(t, /<ol class="payschema"[\s\S]*Het bedrijf accepteert[\s\S]*<span data-rule="objectionHours">72<\/span> uur niets[\s\S]*Je wordt uitbetaald/);
  assert.match(t, /Een agent werkt namens een bedrijf door zodra jouw handtekening er is\. Elke vertraging houdt het hele proces op\./);
  const laat = t.match(/id="te-laat"[\s\S]*?<\/section>/)[0];
  for (const k of ['turnWorkingMinutes', 'maxTurnsPerPro']) assert.match(laat, new RegExp(`data-rule="${k}"`), k);
  assert.match(laat, /09:00 tot 17:00/);
  assert.doesNotMatch(visible(t), /€\s?\d/, 'geen bedragen');
  for (const v of ['Instappen in agentic werk', 'Weten waar je aan toe bent', 'Geen acquisitie en geen incasso', 'Je registratie beter benut']) assert.ok(t.includes(v), v);
  assert.match(visible(t), /\bjij\b|\bjouw\b/i);
});

test('/bedrijven: zelfde opbouw vanuit het bedrijf, bewijsdossier en vier voordelen', () => {
  const t = read('bedrijven.html');
  for (const id of ['stappen', 'zo-werkt-het', 'hoe', 'bewijsdossier', 'developers', 'diensten']) assert.match(t, new RegExp(`id="${id}"`), id);
  assert.match(t, /Zo zet je agent een opdracht uit/);
  assert.match(t, /Wat je ziet[\s\S]*class="fictief">Voorbeeld/);
  assert.match(t, /Betaling en geld terug/);
  for (const v of ['Een geregistreerde professional in je agentworkflow', 'Aantoonbare verantwoording', 'Vooraf duidelijke prijs en termijnen', 'Geld terug als niemand aanneemt']) assert.ok(t.includes(v), v);
  assert.match(t, /Neemt niemand aan binnen <span data-rule="acceptCeilingWorkdays">3<\/span> werkdagen, dan krijg je alles terug\./);
});

test('registers: op elke registertab en dienstkaart één zin wat het register is, met sector', () => {
  for (const r of DIENSTEN) assert.match(r.uitleg, /^Het [^.]+\. Sector: [^.]+\.$/, r.id);
  for (const f of ['professionals.html', 'bedrijven.html']) {
    for (const r of DIENSTEN) assert.ok(read(f).includes(`<p class="svc-uitleg"><strong>${r.tab}:</strong> ${r.uitleg}</p>`), `${f}: ${r.id}`);
  }
  assert.equal(DIENSTEN.find((r) => r.id === 'nivre').uitleg, 'Het NIVRE-register van schade-experts. Sector: schade en verzekeringen.');
  assert.doesNotMatch(read('professionals.html'), /geen facturen/i);
});

test('home: rij "Registers en sectoren" onder de routekaarten, als links naar de juiste tab', () => {
  const t = read('index.html');
  const row = t.match(/<nav class="sectoren"[\s\S]*?<\/nav>/)[0];
  assert.ok(t.indexOf('class="routecards"') < t.indexOf('class="sectoren"'));
  const links = [...row.matchAll(/<a href="\/bedrijven#(\w+)" data-tablink="\1"><span class="sec-name">([^<]+)<\/span><span class="sec-reg">([^<]+)<\/span><\/a>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(links.map((l) => l[1]), ['Schade', 'Taxatie', 'Gerechtelijke expertise', 'Bouwkundige keuring', 'Octrooien']);
  for (const [id] of links) assert.ok(DIENSTEN.some((r) => r.id === id), id);
});

test('footer: Bedrijven, Professionals, Over HumanPush, Juridisch, plus de HumAgent-regel', () => {
  for (const f of PAGES) {
    const foot = read(f).match(/<footer[\s\S]*<\/footer>/)[0];
    assert.deepEqual([...foot.matchAll(/<p class="h">([^<]+)<\/p>/g)].map((m) => m[1]), ['Bedrijven', 'Professionals', 'Over HumanPush', 'Juridisch'], f);
    for (const href of ['/hoe-het-werkt', '/veelgestelde-vragen', '/pilot/second-opinion', '/agents', '/privacy', '/voorwaarden']) assert.ok(foot.includes(`href="${href}"`), `${f}: ${href}`);
    assert.ok(foot.includes('HumanPush is een handelsnaam van HumAgent B.V. (KvK 42222476).'), f);
  }
});

test('/voorwaarden: tekst ongewijzigd (aparte PR, ter toetsing door jurist)', () => {
  const main = read('voorwaarden.html').match(/<main id="inhoud">([\s\S]*?)<\/main>/)[1];
  assert.equal(createHash('sha256').update(main).digest('hex'), '47030ea70990b6fae41da6aec427f1e495b4257c77aa4451a2b42bdb60f03a5b');
});

test('kennisbasis: elk anker in een bronlink bestaat echt op die pagina', () => {
  const kb = JSON.parse(read('kb/index.json'));
  const file = (path) => (path === '/' ? 'index.html' : path.slice(1) + (path.endsWith('.txt') ? '' : '.html'));
  let checked = 0;
  for (const c of kb.chunks) {
    const u = new URL(c.url);
    assert.equal(u.origin, 'https://humanpush.nl', c.id);
    const html = read(file(u.pathname));
    if (u.hash) { assert.match(html, new RegExp(`id="${u.hash.slice(1)}"`), `${c.id}: ${c.url}`); checked++; }
  }
  assert.ok(checked > 50, `ankers gecontroleerd: ${checked}`);
});

test('meta-, og- en twitter-teksten en JSON-LD volgen de woordenlijst', () => {
  const bad = /logboek|\bhash(es)?\b|passkey-handtekening|\bprotocol\b|\bmens\b|niveau 2|registerbewijs|stroomdiagram|swimlane|infographic/i;
  for (const f of PAGES.filter((f) => f !== 'voorwaarden.html')) {
    const t = read(f);
    for (const m of t.matchAll(/<meta (?:name|property)="(description|og:[\w:]+|twitter:[\w:]+)" content="([^"]*)"/g)) assert.doesNotMatch(m[2], bad, `${f} ${m[1]}: ${m[2]}`);
    assert.doesNotMatch(t.match(/<title>([^<]*)<\/title>/)[1], bad, `${f} title`);
    for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) assert.doesNotMatch(m[1], bad, `${f} JSON-LD`);
  }
});

test('llms.txt (Engels): registry check, digital fingerprint, evidence file en HumanPush', () => {
  const t = read('llms.txt');
  assert.doesNotMatch(t, /register proof|level 2|\bhash\b|\bthe log\b|signed log|\blogged\b|\bprotocol\b|attestation/i);
  for (const w of ['registry check', 'digital fingerprint', 'evidence file']) assert.match(t, new RegExp(w, 'i'), w);
  assert.equal((read('sitemap.xml').match(/<lastmod>2026-11-20<\/lastmod>/g) || []).length, (read('sitemap.xml').match(/<loc>/g) || []).length);
});

test('zonder JS geen zin over een keuze zonder knoppen; mockup-labels minstens 12px; geen dode CSS van het oude schema', () => {
  const t = read('hoe-het-werkt.html');
  assert.match(t, /<div class="side-bar" data-side-root>\n<p class="side-hint">Kies je kant; je keuze blijft bewaard\.<\/p>/);
  assert.doesNotMatch(t.match(/<p class="lead">[^<]*<\/p>/)[0], /keuze/);
  const css = read('site.css');
  assert.match(css, /\.no-js \.side-bar \{ display: none; \}/);
  for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) assert.ok(Number(m[1]) >= 12, `font-size ${m[1]}px`);
  assert.doesNotMatch(css, /\.infographic|\.swim|\.hp-flow-|\.iflow|\.stepper|\.flow-figure/);
  assert.doesNotMatch(read('rules.json'), /swimlane/);
});

test('site.css: accolades in balans, geen @media binnen een regel', () => {
  const css = read('site.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\("[^"]*"\)/g, 'url()');
  let depth = 0;
  for (const [i, line] of css.split('\n').entries()) {
    if (/@media/.test(line)) assert.equal(depth, 0, `regel ${i + 1}: @media binnen een andere regel`);
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    assert.ok(depth >= 0 && depth <= 2, `regel ${i + 1}: diepte ${depth}`);
  }
  assert.equal(depth, 0);
});
