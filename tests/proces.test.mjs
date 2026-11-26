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
    // Eén uitzondering: "digitale vingerafdruk (hash)" in de NRGD-dienst, waar het referentiepunt precies moet zijn.
    const m = visible(read(f)).replace(/digitale vingerafdruk \(hash\)/g, "").match(bad);
    assert.equal(m, null, `${f}: "${m && m[0]}"`);
  }
});

test('woordenlijst: "sleutel" alleen als API-sleutel op /agents; elders "toegangscode voor je agent"', () => {
  for (const f of [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md']) {
    const t = visible(read(f));
    for (const m of t.matchAll(/\S*sleutel\S*/gi)) assert.ok(/^versleuteld/i.test(m[0]) || (f === 'agents.html' && /API-sleutel/.test(m[0])), `${f}: "${m[0]}"`);
  }
  for (const f of ['index.html', 'bedrijven.html', 'professionals.html']) assert.doesNotMatch(visible(read(f)).replace(/versleuteld/g, ''), /sleutel/i, f);
  assert.match(read('bedrijven.html'), /toegangscode/);
  assert.match(read('professionals.html'), /toegangscode voor je agent/);
});

test('woordenlijst: uitleg van digitale vingerafdruk, handtekening met je passkey en dossier', () => {
  const vinger = 'Bij de oplevering berekent HumanPush uit het stuk een unieke code van 64 tekens. Verandert er één komma, dan verandert de hele code.';
  const passkey = 'Daarmee sta jij als geregistreerde professional voor het werk in (geen gekwalificeerde e-handtekening; zie <a href="/hoe-het-werkt#grenzen">wat het dossier aantoont</a>).';
  for (const f of ['hoe-het-werkt.html']) {
    const t = read(f);
    assert.ok(t.includes(vinger), `${f}: vingerafdruk`);
    assert.ok(t.includes(passkey), `${f}: passkey`);
    assert.match(t, /Dossier<\/h3><p>Per opdracht de afspraken en elke getekende stap in het proces\./, `${f}: dossier`);
  }
  assert.ok(read('bedrijven.html').includes(vinger));
});

test('stappenblok: één bron (partials/stappen.json), vier stappen plus dossierlint, op de pagina\'s via sync-partials', () => {
  const src = JSON.parse(read('partials/stappen.json'));
  for (const v of ['neutraal', 'pro']) {
    assert.equal(src[v].length, 4, v);
    assert.ok(src[v].every((x) => x.titel && x.tekst && x.tijd && x.ico), v);
  }
  assert.equal(src.lint.strong, 'Alles staat in het dossier:');
  assert.ok(src.pro.some((x) => /je|jij/i.test(x.tekst)), 'pro-variant spreekt de professional aan met jij');
  const pages = { 'index.html': ['neutraal'], 'hoe-het-werkt.html': ['pro', 'neutraal'], 'bedrijven.html': ['neutraal'], 'professionals.html': ['pro'], 'pilot/second-opinion.html': ['neutraal'] };
  for (const [f, views] of Object.entries(pages)) {
    const t = read(f);
    assert.deepEqual([...t.matchAll(/<!--stappen:start view=(\w+)-->/g)].map((m) => m[1]), views, f);
    assert.equal((t.match(/<li class="ig-step/g) || []).length, 4 * views.length, f);
    assert.ok(t.includes('aria-label="De vier stappen"'), f);
    assert.ok(t.includes('class="ig-ribbon"'), f);
  }
  assert.doesNotMatch(read('agents.html'), /<!--stappen:start/, 'agents verwijst, herhaalt de stappen niet');
  assert.match(read('index.html'), /<h3>Een professional neemt aan<\/h3>[\s\S]*?<span data-rule="turnWorkingMinutes">/);
  assert.match(read('index.html'), /<p class="tl-rule">HumanPush controleert het proces, niet de inhoud\. <a href="\/hoe-het-werkt#controle">Lees wat HumanPush controleert<\/a><\/p>/);
  const css = read('site.css');
  assert.ok(Number(css.match(/\.tl-step p \{ font-size: ([\d.]+)px/)[1]) >= 15, 'stappen in leesbare grootte');
  assert.ok(Number(css.match(/\.ig-step p \{ font-size: ([\d.]+)px/)[1]) >= 15, 'infographic in leesbare grootte');
});

test('demo op home is weg; de animatiecode blijft veilig als er ooit weer een demo staat', () => {
  assert.equal(read('index.html').match(/<figure class="demo"/), null, 'de donkere demo staat niet meer op de home');
  const js = read('site.js');
  const anim = js.slice(js.indexOf(".demo[data-anim]"), js.indexOf('details.more'));
  assert.doesNotMatch(anim, /rows\[\d\]/, 'geen vaste rijnummers: elke rij krijgt een frame');
  assert.match(anim, /rows\.forEach\(function \(row\) \{\s*frames\.push/);
  assert.match(js, /if \(reduce\) \{ demo\.removeAttribute\('data-anim'\)/, 'bij verminderde beweging staat alles stil en zichtbaar');
  assert.doesNotMatch(read('site.css'), /\.demo[^{]*\{[^}]*visibility: hidden/, 'geen demo-rij ooit verborgen');
});

test('geen zichtbare backslash in de tekst van een pagina; linkregel is gewone tekst', () => {
  for (const f of PAGES) {
    const visible = read(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(visible, /\\/, f);
    assert.doesNotMatch(read(f), /Wat het systeem garandeert staat op/, f);
  }
});

test('/hoe-het-werkt: kant-keuze bovenaan, vier stappen per kant, wie doet wat, en 4 punten "Wat wordt er vastgelegd"', () => {
  const t = read('hoe-het-werkt.html');
  assert.match(t, /<div class="side-bar" data-side-root>\n<p class="side-hint">[^<]*<\/p>\n<div class="svc-toggle side-toggle" role="group" aria-label="Kies je kant"><button type="button" class="svc-view" data-view="pro" aria-pressed="false">Ik ben professional<\/button><button type="button" class="svc-view" data-view="bedrijf" aria-pressed="true">Ik ben een bedrijf \(of zijn agent\)<\/button><\/div>/);
  assert.ok(t.indexOf('data-side-root') < t.indexOf('class="ig-steps"'), 'keuze staat bovenaan');
  assert.doesNotMatch(t, /<figure class="chat"/, 'de twee gesprekken-demo\'s zijn weg');
  assert.match(t, /id="controle"[\s\S]*HumanPush oordeelt niet over de inhoud/);
  assert.match(t, /<h2 id="via-kop">Wie doet wat<\/h2>/);
  assert.match(t, /<figure class="dossierkaart"/);
  const v = t.match(/<ol class="vastgelegd">[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...v.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ['Registercheck', 'Digitale vingerafdruk', 'Handtekening met je passkey', 'Dossier']);
  assert.equal((v.match(/<p class="why"><strong>Waarom:<\/strong> [^<.]+\.<\/p>/g) || []).length, 4, "elke waarom-tekst één zin, label Waarom:");
  assert.doesNotMatch(t, /Waarom het telt/);
  assert.doesNotMatch(t, /class="infographic"|class="swimcard"|<!--(flow|swim)/, 'geen oude schema-onderdelen');
  const js = read('site.js');
  assert.match(js, /\[data-side-root\][\s\S]*store\('hp-doelgroep', v\)/, 'keuze wordt bewaard');
});

test('/professionals: twee korte manieren, checklist, uitbetaling, te laat (regels uit rules.json)', () => {
  const t = read('professionals.html');
  assert.match(t, /Twee manieren, dezelfde regels: op het HumanPush-scherm of met je eigen agent\./);
  assert.match(t, /<h2 id="humanpush-scherm-kop">Geen eigen agent\? Gebruik het HumanPush-scherm\.<\/h2>/);
  assert.match(t, /id="manier-scherm"/);
  assert.match(t, /id="manier-eigen-agent"/);
  for (const f of PAGES) assert.doesNotMatch(read(f), /HumanPush-agent/, f);
  const begin = t.match(/id="zo-begin-je"[\s\S]*?<\/section>/)[0];
  for (const x of ['registratienummer', 'KvK-nummer', 'btw-situatie', 'bankrekening op naam van je onderneming', '2 passkeys']) assert.ok(begin.includes(x), x);
  const qs = [...t.matchAll(/<details class="pay-q"><summary>([^<]+)<\/summary>/g)].map((m) => m[1]);
  assert.deepEqual(qs, ['Wanneer krijg ik niets?', 'En als het bedrijf het inhoudelijk oneens is?', 'Annuleert het bedrijf nadat je hebt aangenomen?', 'Wie bepaalt mijn prijs?']);
  assert.match(t, /Alleen als iets objectief misgaat: deadline gemist, bewijs ontbreekt, verkeerd formaat of registerinschrijving ongeldig\. Het systeem checkt dat automatisch en het bedrijf krijgt zijn geld terug\. Niemand beoordeelt de inhoud van je werk\./);
  assert.doesNotMatch(read('site.css'), /\.pay-(card|more|q)[^{]*:hover/, 'geen hover-uitklap');
  assert.match(t, /Een agent werkt namens een bedrijf door zodra jouw handtekening er is\. Elke vertraging houdt het hele proces op\./);
  const laat = t.match(/id="te-laat"[\s\S]*?<\/section>/)[0];
  for (const k of ['turnWorkingMinutes', 'maxTurnsPerPro']) assert.match(laat, new RegExp(`data-rule="${k}"`), k);
  assert.match(laat, /09:00 tot 17:00/);
  assert.doesNotMatch(visible(t), /€\s?\d/, 'geen bedragen');
  assert.match(visible(t), /\bjij\b|\bjouw\b/i);
});

test('/bedrijven: stappen, kosten, misgaat, dossier en de drie voordelen', () => {
  const t = read('bedrijven.html');
  for (const id of ['stappen', 'zo-werkt-het', 'hoe', 'bewijsdossier', 'developers', 'diensten']) assert.match(t, new RegExp(`id="${id}"`), id);
  assert.match(t, /Zo werkt het/);
  assert.match(t, /Als het misgaat/);
  for (const v of ['Getekend door een professional uit een openbaar register', 'Vooraf een duidelijke prijs en uiterste datum', 'Automatisch geld terug als het misgaat']) assert.ok(t.includes(v), v);
  assert.match(t, /Neemt niemand aan binnen <span data-rule="acceptCeilingWorkdays">3<\/span> werkdagen, dan krijg je alles terug\./);
  assert.match(t, /toegewezen aan een professional/);
});

test('registers: op elke registertab en dienstkaart één zin wat het register is, met sector', () => {
  for (const r of DIENSTEN) assert.match(r.uitleg, new RegExp(`^${r.beroep.replace(/[()]/g, '\\$&')}, ingeschreven [^.]+\\. Sector: [^.]+\\.$`), r.id);
  for (const f of ['professionals.html', 'bedrijven.html']) {
    for (const r of DIENSTEN.filter((r) => f === 'professionals.html' || r.status === 'boekbaar')) assert.ok(read(f).includes(`<p class="svc-uitleg"><strong>${r.tab}:</strong> ${r.uitleg}</p>`), `${f}: ${r.id}`);
  }
  assert.equal(DIENSTEN.find((r) => r.id === 'nivre').uitleg, 'Schade-expert, ingeschreven bij NIVRE. Sector: schade en verzekeringen.');
  assert.doesNotMatch(read('professionals.html'), /geen facturen/i);
});

test('catalogus: alle vijf registers gelijkwaardig, NIVRE eerst, eerlijke status; geen "We beginnen" of "Ook in voorbereiding"', () => {
  const label = { boekbaar: 'Eerste dienst', in_toetsing: 'In toetsing', in_voorbereiding: 'Volgt' };
  const show = { nivre: 'Schade-expert', nrvt: 'Woningtaxateur', nrbi: 'Bouwkundig inspecteur', nrgd: 'Gerechtelijk deskundige digitaal onderzoek', octrooi: 'Octrooigemachtigde' };
  assert.deepEqual(DIENSTEN.map((r) => [r.id, r.status]), [['nivre', 'boekbaar'], ['nrvt', 'in_toetsing'], ['nrbi', 'in_voorbereiding'], ['nrgd', 'in_voorbereiding'], ['octrooi', 'in_voorbereiding']]);
  const home = read('index.html');
  const cat = home.match(/<ul class="regs">([\s\S]*?)<\/ul>/)[1];
  assert.equal((cat.match(/<li/g) || []).length, 5);
  for (const r of DIENSTEN) assert.ok(cat.includes(`<b>${show[r.id]}</b>`) && cat.includes(`<span>${label[r.status]}</span>`), r.id);
  const b = read('bedrijven.html');
  assert.equal((b.match(/<section class="svc-card"/g) || []).length, 5, '/bedrijven: alle vijf dienstkaarten');
  for (const r of DIENSTEN) assert.match(b.match(new RegExp(`<section class="svc-card" id="${r.id}"[\\s\\S]*?</section>`))[0], new RegExp(`<span class="status( prep)?">${label[r.status]}</span>`), r.id);
  for (const f of [...PAGES, 'llms.txt', ...readdirSync(join(ROOT, 'kb')).filter((x) => x.endsWith('.md')).map((x) => 'kb/' + x), 'kb/index.json', 'api/_kb.js']) assert.doesNotMatch(read(f), /We beginnen met|Ook in voorbereiding|We start with NIVRE|bookable first/, f);
  assert.match(read('llms.txt'), /During the test phase only the NIVRE service can be booked/);
});

test('footer: Bedrijven, Professionals, Over HumanPush, Juridisch, plus de HumAgent-regel', () => {
  for (const f of PAGES) {
    const foot = read(f).match(/<footer[\s\S]*<\/footer>/)[0];
    assert.deepEqual([...foot.matchAll(/<p class="h">([^<]+)<\/p>/g)].map((m) => m[1]), ['Bedrijven', 'Professionals', 'Over HumanPush', 'Juridisch'], f);
    for (const href of ['/hoe-het-werkt', '/veelgestelde-vragen', '/pilot/second-opinion', '/agents', '/privacy', '/voorwaarden']) assert.ok(foot.includes(`href="${href}"`), `${f}: ${href}`);
    assert.equal(foot.match(/<p class="f-legal">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, ''), 'HumanPush is een handelsnaam van HumAgent B.V. · KvK 42222476 · btw NL870249964B01 · Utrecht', f);
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

test('/hoe-het-werkt: in de uitklappers termijnen, G1–G8 en geld heet het bedrijf "het bedrijf", niet "je"', () => {
  const t = read('hoe-het-werkt.html');
  for (const id of ['termijnen', 'g18', 'geld']) {
    const block = t.match(new RegExp(`<details class="more" id="${id}"[\\s\\S]*?</details>`))[0];
    assert.doesNotMatch(visible(block), /\b(je|jij|jou|jouw)\b/i, id);
  }
  assert.match(t, /<strong>Snelle duidelijkheid\.<\/strong>/);
  assert.doesNotMatch(t, /Snel duidelijkheid/);
});

test('codevoorbeeld in de bedrijf-mockup: minstens 12px', () => {
  const css = read('site.css');
  assert.match(css, /\.c-code \{[^}]*font-size: (1[2-9]|[2-9]\d)px/);
  assert.match(css, /\.c-code code \{[^}]*font-size: inherit;/);
});

test('kosten: 5% afhandelfee uit rules.json, rekenvoorbeeld klopt, geen "vaste vergoeding", "platformvergoeding" of "H"', () => {
  const rules = JSON.parse(read('rules.json'));
  assert.equal(rules.feePct, 5);
  const b = read('bedrijven.html');
  const k = b.match(/<section class="section" id="kosten"[\s\S]*?<\/section>/)[0];
  assert.match(k, /<h2 id="kosten-kop">Wat kost het\?<\/h2>/);
  assert.match(k, /HumanPush-afhandelfee: <span data-rule="feePct">5<\/span>% over de prijs van de professional \(inclusief zijn eventuele btw\)\. Over de fee betaal je 21% btw\. Geen abonnement, geen minimum, geen andere kosten\./);
  assert.match(k, /Je maximumprijs is inclusief de eventuele btw van de professional\./);
  for (const f of [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'README.md']) assert.doesNotMatch(read(f), /van die prijs, excl\. btw|excl\. btw, plus btw|fixed HumanPush fee|excluding VAT/i, `${f}: één feezin`);
  assert.match(read('hoe-het-werkt.html'), /G4 · 100% vooraf[\s\S]*?<span data-rule="feePct">5<\/span>% over de prijs van de professional \(inclusief zijn eventuele btw\)\. Over de fee betaalt het bedrijf 21% btw\./);
  assert.match(k, /Wat is de vanaf-prijs\?/);
  assert.ok(b.indexOf('id="zo-werkt-het"') < b.indexOf('id="kosten"'), 'kosten staat onder "Zo zet je agent een opdracht uit"');
  // Rekenvoorbeeld narekenen: 5% fee, 21% btw over de fee, afronden op centen.
  const c = (x) => Math.round(x);
  const pre = 50000 + c(50000 * 0.05) + c(c(50000 * 0.05) * 0.21), post = 45000 + c(45000 * 0.05) + c(c(45000 * 0.05) * 0.21);
  assert.equal(pre, 53025); assert.equal(post, 47723); assert.equal(pre - post, 5302);
  for (const amt of ['€ 530,25', '€ 53,02', '€ 477,23']) assert.ok(k.includes(amt), amt);
  const people = ['index.html', 'bedrijven.html', 'professionals.html', 'hoe-het-werkt.html', 'veelgestelde-vragen.html', 'pilot/second-opinion.html', 'inloggen.html'];
  for (const f of [...people, 'agents.html', 'kb/spelregels.md', 'kb/faq.md']) assert.doesNotMatch(read(f), /vaste vergoeding|platformvergoeding/i, f);
  for (const f of people) {
    const visible = read(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(visible, /(^|[\s(])H([\s).,;]|$)/, `${f}: geen "H" voor de fee`);
  }
  for (const f of read('veelgestelde-vragen.html').match(/<summary>[^<]+<\/summary>/g)) assert.doesNotMatch(f, /zonder dat ik bedragen zie/);
  const faq = read('veelgestelde-vragen.html');
  for (const q of ['Wat kost het?', 'Hoe kies ik mijn maximumprijs?', 'Is mijn prijs inclusief btw?']) assert.ok(faq.includes(`<summary>${q}</summary>`), q);
  assert.match(read('professionals.html'), /Er gaat niets van je prijs af: de afhandelfee van <span data-rule="feePct">5<\/span>% betaalt het bedrijf bovenop je prijs\. Reken je btw, dan is je prijs inclusief btw\./);
  const v = JSON.parse(read('vercel.json')).redirects;
  assert.ok(v.some((r) => r.source === '/prijzen' && r.destination === '/bedrijven#kosten'));
  assert.ok(v.some((r) => r.source === '/diensten' && r.destination === '/bedrijven#diensten'));
});

test('vanaf-prijs: veld vanaf_cents per dienst (nu null), regel op elke kaart in beide kijkrichtingen', async () => {
  const { vanafLine } = await import('../tools/sync-partials.mjs');
  assert.equal(vanafLine(null), '<p class="svc-vanaf">Vanaf-prijs: volgt zodra professionals zich hebben aangemeld</p>');
  assert.equal(vanafLine(45000), '<p class="svc-vanaf">Vanaf € 450 · laagste prijs die nu geldt</p>');
  assert.throws(() => vanafLine(-1));
  const regs = JSON.parse(read('partials/diensten.json')).registers;
  for (const r of regs) assert.ok('vanaf_cents' in r && r.vanaf_cents === null, `${r.id}: geen verzonnen bedrag in de testfase`);
  for (const f of ['bedrijven.html', 'professionals.html']) {
    const t = read(f);
    const n = regs.length;
    assert.equal((t.match(/<p class="svc-vanaf">Vanaf-prijs: volgt zodra professionals zich hebben aangemeld<\/p>/g) || []).length, n * 2, f);
  }
});

test('/hoe-het-werkt per kant: vier stappen met de termijnen uit rules.json; DAC7 staat in de FAQ', () => {
  const t = read('hoe-het-werkt.html');
  for (const side of ['pro', 'bedrijf']) {
    const s = t.match(new RegExp(`<div class="side" data-side="${side}">[\\s\\S]*?<!--stappen:end-->`))[0];
    assert.equal((s.match(/<li class="ig-step/g) || []).length, 4, side);
    assert.match(s, /<span data-rule="turnWorkingMinutes">\d+<\/span>/, side);
    assert.match(s, /<span data-rule="objectionHours">\d+<\/span>/, side);
  }
  assert.doesNotMatch(t, /belastingregels voor platforms \(DAC7\)/, 'DAC7 staat niet meer in de checklist op deze pagina');
  assert.match(read('veelgestelde-vragen.html'), /belastingregels voor platforms \(DAC7\)/);
});

// Zichtbare tekst voor mensen: zonder "Voor je bouwer", zonder code in de voorbeelddemo's, zonder head en scripts.
export function peopleText(html) {
  return html.slice(html.indexOf('<body'))
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<details class="voor-bouwer"[\s\S]*?<\/details>/g, ' ')
    .replace(/<span class="voor-bouwer">[\s\S]*?<\/span>/g, ' ')
    .replace(/<figure class="(demo|chat)"[\s\S]*?<\/figure>/g, (m) => m.replace(/<code>[\s\S]*?<\/code>/g, ' '))
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
}
const PEOPLE = ['index.html', 'bedrijven.html', 'professionals.html', 'hoe-het-werkt.html', 'veelgestelde-vragen.html', 'pilot/second-opinion.html'];
const JARGON = /service_id|\bv1_\w+|max_price_cents|list_services|MCP-aanroep|werkmin|\bOCNL\b|pdf\/a|pdf \+ json|\bmarkering\b|\bbinair\b/i;

test('jargon: geen toolnamen, codes of interne woorden op pagina\'s voor mensen (buiten "Voor je bouwer")', () => {
  for (const f of PEOPLE) {
    const t = peopleText(read(f));
    const m = t.match(JARGON);
    // "markering" en "tekortkoming" worden alleen in de FAQ uitgelegd, in één zin.
    if (m && f === 'veelgestelde-vragen.html' && /markering/i.test(m[0])) {
      const rest = t.replace(/[^.]*dat heet een markering[^.]*\./i, '');
      assert.doesNotMatch(rest, JARGON, f);
      continue;
    }
    assert.equal(m, null, `${f}: "${m && m[0]}"`);
    for (const h of read(f).matchAll(/<(h[1-4]|summary)[^>]*>([\s\S]*?)<\/\1>/g)) assert.doesNotMatch(h[2], /G1\s*(–|tot en met)\s*G8/, `${f}: G1–G8 als kop`);
  }
  for (const f of ['bedrijven.html', 'professionals.html']) {
    const t = read(f);
    assert.equal((t.match(/<details class="voor-bouwer"><summary>Voor je bouwer<\/summary>/g) || []).length, (t.match(/<section class="svc-card"/g) || []).length - (t.match(/<p class="svc-toetsing">/g) || []).length, `${f}: per te bestellen dienstkaart een uitklap voor de bouwer`);
    assert.match(t, /<span class="status">Eerste dienst<\/span>/);
    assert.deepEqual([...t.matchAll(/<a class="svc-tab" href="#[\w-]+" id="tab-[\w-]+" data-tab="([\w-]+)"[^>]*>([^<]+)<\/a>/g)].filter((m) => !m[1].startsWith('manier-')).map((m) => m[2]), ['NIVRE', 'NRVT', 'NRBI', 'NRGD', 'Octrooi'], `${f}: tabvolgorde, NIVRE eerst`);
  }
  const regs = JSON.parse(read('partials/diensten.json')).registers;
  assert.deepEqual(regs.map((r) => [r.tab, r.beroep, r.registernaam]), [
    ['NIVRE', 'Schade-expert', 'NIVRE'], ['NRVT', 'Register-taxateur (wonen)', 'NRVT'], ['NRBI', 'Bouwkundig inspecteur', 'NRBI'],
    ['NRGD', 'Gerechtelijk deskundige (digitaal onderzoek)', 'NRGD'], ['Octrooi', 'Octrooigemachtigde', 'Register van octrooigemachtigden']]);
  for (const r of regs) assert.ok(r.pro.chips.includes('Rapport als pdf') && r.pro.chips.includes('Getekend met passkey') && r.bedrijf.chips.includes('Vaste uitkomst'), r.id);
  const home = read('index.html');

  assert.match(read('hoe-het-werkt.html'), /<summary>De garanties in detail<\/summary>/);
});

test('geen overdrijven, geen doodlopende knoppen: testvlag uit, scherm in plaats van agent, toon', () => {
  const cfg = read('config.js');
  assert.match(cfg, /testenv: false/, 'testvlag staat standaard uit');
  assert.doesNotMatch(cfg, /LOGIN_PRO_URL|LOGIN_BIZ_URL/);
  const ag = read('agents.html');
  assert.match(ag, /<section class="section mist" id="testomgeving" aria-labelledby="test-kop" data-testenv hidden>/);
  assert.match(ag, /Dit is een testomgeving met nepgeld\. Er lopen geen echte opdrachten\./);
  assert.equal((ag.match(/id="testomgeving"[\s\S]*?<\/ol>/)[0].match(/<li>/g) || []).length, 5);
  assert.match(ag, /<section class="section mist" aria-labelledby="status" data-testenv-off>/, 'met de vlag uit blijft de statustekst');
  const js = read('site.js');
  assert.match(js, /\[data-testenv\]'\)\.forEach\(function \(el\) \{ el\.hidden = cfg\.testenv !== true; \}\)/);
  for (const f of PAGES) {
    const t = read(f);
    assert.doesNotMatch(t, /Geen helpdesk die regels buigt|uitzonderingen per geval bestaan niet|Eén MCP-aanroep/i, f);
    if (f !== 'voorwaarden.html') assert.doesNotMatch(t.replace(/<details class="voor-bouwer"[\s\S]*?<\/details>/g, ''), /HumanPush-MCP/, f);
  }
  assert.match(read('professionals.html'), /<h2 id="humanpush-scherm-kop">Geen eigen agent\? Gebruik het HumanPush-scherm\.<\/h2>/);
  for (const f of ['bedrijven.html', 'hoe-het-werkt.html', 'index.html', 'pilot/second-opinion.html']) assert.doesNotMatch(peopleText(read(f)), /AVG \(art\. 22\)|AI-verordening eist/, `${f}: wetsalinea alleen in de FAQ`);
  assert.match(read('veelgestelde-vragen.html'), /id="wet"[\s\S]*AVG \(art\. 22\)/);
});

test('professional weet waar hij aan toe is: checklist, wanneer het geld komt, DAC7 in de FAQ; niets over wie factureert', () => {
  const t = read('professionals.html');
  const begin = t.match(/id="zo-begin-je"[\s\S]*?<\/section>/)[0];
  for (const x of ['registratienummer', 'KvK-nummer', 'btw-situatie', 'bankrekening op naam van je onderneming', '2 passkeys']) assert.ok(begin.includes(x), x);
  assert.doesNotMatch(begin, /belastingregels voor platforms|DAC7/, 'DAC7 alleen in de FAQ');
  assert.match(read('veelgestelde-vragen.html'), /Later vragen we ook gegevens voor de belastingregels voor platforms \(DAC7\)\. Platforms moeten daarover mogelijk gegevens aan de Belastingdienst doorgeven\. We laten juridisch toetsen welke gegevens dat zijn\. Je hoort het vóór je eerste opdracht\./);
  for (const f of PAGES) assert.doesNotMatch(read(f), /wettelijk verplicht \(DAC7\)|We slaan die versleuteld op/, f);
  assert.doesNotMatch(read('hoe-het-werkt.html'), /de gegevens die nodig zijn voor de belastingregels voor platforms \(DAC7\)/);
  assert.match(read('veelgestelde-vragen.html'), /Het wettelijke herroepingsrecht is bedoeld voor consumenten; hoe dat voor deze dienst uitpakt, laten we juridisch toetsen\./);
  for (const f of PAGES) assert.doesNotMatch(read(f), /binnen het bereik van de dienst|het prijsbereik/, f);
  assert.equal((read('professionals.html').match(/Is jouw prijs de laagste die de deadline haalt/g) || []).length, 1, 'de prijsalinea staat er één keer');
  const faq = read('veelgestelde-vragen.html');
  assert.match(faq, /<summary>Wanneer krijg ik mijn geld\?<\/summary><p>Na acceptatie door het bedrijf, of na <span data-rule="objectionHours">72<\/span> uur zonder geldig bezwaar, zet HumanPush de uitbetaling klaar\. De precieze termijn tot je rekening volgt zodra er echte opdrachten lopen\.<\/p>/);
  assert.match(faq, /<summary>Hoe weet ik dat er een opdracht voor mij is\?<\/summary><p>Op je scherm bij HumanPush, of je agent vraagt het op\. Er gaat nog geen mail of push\./);
  for (const f of PAGES.filter((f) => f !== 'voorwaarden.html')) assert.doesNotMatch(read(f), /factureer|facturatie|factuur/i, `${f}: wie factureert wacht op jurist en fiscalist`);
});

test('code is law: nergens meer een collega of beoordelaar die beslist, geen "voldoet / voldoet niet" (site, kennisbank, llms.txt)', () => {
  for (const f of [...PAGES.filter((f) => f !== 'voorwaarden.html'), 'kb/spelregels.md', 'kb/faq.md']) {
    const t = read(f).replace(/er is geen beoordelaar/g, '');
    assert.doesNotMatch(t, /collega uit (jouw|hetzelfde) register|collega van de professional|beoordelaar|"?voldoet( niet)?"?\b|binair/i, f);
  }
  const llms = read('llms.txt');
  assert.doesNotMatch(llms, /reviewer|meets|no_reviewer|review_fails|binary/i);
  for (const c of ['deadline_gemist', 'bewijs_ontbreekt', 'registerstatus_ongeldig', 'formaat_onjuist']) assert.ok(llms.includes(c), c);
  assert.match(read('hoe-het-werkt.html'), /G6 · 72 uur bezwaar, alleen objectieve fouten/);
  assert.match(read('veelgestelde-vragen.html'), /<summary>Wat als ik het niet eens ben met de conclusie\?<\/summary>/);
});

test('grenzen van het bewijs: blok op /hoe-het-werkt#grenzen, kort op /bedrijven, link uit de FAQ; geen overclaim-woorden', () => {
  const h = read('hoe-het-werkt.html');
  const g = h.match(/<section class="section" id="grenzen"[\s\S]*?<\/section>/)[0];
  assert.match(g, /<h2 id="grenzen-kop">Wat het dossier aantoont, en wat niet<\/h2>/);
  assert.equal((g.match(/<ol class="grenzen-wel">[\s\S]*?<\/ol>/)[0].match(/<li>/g) || []).length, 3);
  assert.equal((g.match(/<ul class="crosses grenzen-niet">[\s\S]*?<\/ul>/)[0].match(/<li>/g) || []).length, 4);
  assert.match(g, /<em>\(Voor zover de dienstkaart dat als verplicht onderdeel vraagt\.\)<\/em>/, 'eerlijk zolang de catalogus methode en ontvangen stukken niet overal verplicht stelt');
  assert.match(g, /geen gekwalificeerde elektronische handtekening \(QES\) in de zin van de Europese eIDAS-verordening/);
  assert.match(read('bedrijven.html'), /<p class="grenzen-kort">[\s\S]*?<a href="\/hoe-het-werkt#grenzen">Wat het dossier aantoont, en wat niet\.<\/a><\/p>/);
  assert.match(read('veelgestelde-vragen.html'), /id="handtekening"[\s\S]*?href="\/hoe-het-werkt#grenzen"/);
  const ok = /geen gekwalificeerde|niet aantoont|Dat het een gekwalificeerde elektronische handtekening is\.|\?\s*$/i;
  for (const f of [...PAGES, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md']) {
    const t = (f.endsWith('.html') ? read(f).slice(read(f).indexOf('<body')).replace(/<[^>]+>/g, ' ') : read(f)).replace(/\s+/g, ' ');
    assert.doesNotMatch(t, /juridisch bindend|rechtsgeldig|onweerlegbaar|garantie op kwaliteit/i, f);
    for (const s of t.split(/(?<=[.?!])\s+/)) if (/gekwalificeerd/i.test(s)) assert.match(s, ok, `${f}: "${s.slice(0, 120)}"`);
  }
});

test('tekenen uitgelegd: lead onder de h1 zegt wat tekenen betekent; per pagina één keer de passkey-kanttekening', () => {
  const home = read('index.html');
  assert.match(home, /<h1>Je agent bestelt\. Een geregistreerde professional tekent\.<\/h1>\n<p class="definition">Een professional uit een openbaar register doet het werk en zet zijn naam eronder\. Jij betaalt vooraf\. Is het te laat of mist er iets verplicht, dan krijg je automatisch je geld terug\.<\/p>/);
  assert.doesNotMatch(home.match(/<meta name="description" content="([^"]*)"/)[1], /HumanPush-MCP|voert de regels uit/);
  for (const f of ['index.html', 'hoe-het-werkt.html', 'bedrijven.html', 'professionals.html', 'agents.html', 'pilot/second-opinion.html']) {
    assert.equal((read(f).match(/\(geen gekwalificeerde e-handtekening; zie <a href="\/hoe-het-werkt#grenzen">wat het dossier aantoont<\/a>\)/g) || []).length, 1, f);
  }
});

test('status: "Wat werkt al, en wat nog niet" op /hoe-het-werkt#status, gelinkt vanaf home en /agents; testlinks alleen met de vlag', () => {
  const h = read('hoe-het-werkt.html');
  const s = h.match(/<section class="section mist" id="status"[\s\S]*?<\/section>/)[0];
  const rows = [...s.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th><td>([\s\S]*?)<\/td><\/tr>/g)].map((m) => [m[1].replace(/<[^>]+>/g, ''), m[2].replace(/<a[\s\S]*?<\/a>/g, '').trim()]);
  assert.deepEqual(rows.map((r) => r[0]), ['Dienstkaarten, regels, registercheck-logica', 'Bestellen en vooraf betalen', 'Aannemen, opleveren, tekenen met passkey', 'Dossier en controle met verify_proof', 'Bezwaar alleen bij een objectieve fout', 'Bedrijfsscherm voor mensen, dossier-export', 'Echte opdrachten en echte betalingen', 'Uitbetaling aan professionals, facturen']);
  assert.deepEqual(rows.find((r) => r[0].startsWith('Echte')), ['Echte opdrachten en echte betalingen', 'nog niet: we starten met schade-experts (NIVRE).']);
  for (const a of s.matchAll(/<a [^>]*>/g)) assert.match(a[0], /data-testenv hidden/, 'link naar de testomgeving alleen met de vlag');
  assert.doesNotMatch(s, /\b20\d\d\b|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|Q[1-4]/i, 'geen beloften met datums');
  for (const f of ['index.html', 'agents.html']) assert.match(read(f), /<a href="\/hoe-het-werkt#status">Wat werkt al, en wat nog niet<\/a>/, f);
});

test('rolverdeling voor kopers in één blok: HumanPush voor het proces, de professional voor de inhoud', () => {
  assert.match(read('bedrijven.html'), /<p class="rolverdeling" id="rolverdeling">Gaat er iets mis dat het systeem kan meten\?[\s\S]*Over de inhoud van een oordeel beslissen wij niet\. Dat blijft tussen jou en de professional\.<\/p>/);
});

test('NRVT "in toetsing": label, de zin over de praktijkhandreiking, geen bestelinstructies', () => {
  const r = DIENSTEN.find((x) => x.id === 'nrvt');
  assert.equal(r.status, 'in_toetsing');
  const p = read('professionals.html');
  const card = p.match(/<section class="svc-card" id="nrvt"[\s\S]*?<\/section>/)[0];
  assert.match(card, /<span class="status prep">In toetsing<\/span>/);
  assert.match(card, /<p class="svc-toetsing">We laten eerst toetsen hoe deze dienst past bij de NRVT-praktijkhandreiking \(bezichtiging door de taxateur zelf\)\.<\/p>/);
  assert.doesNotMatch(card, /Zo vraag je aan|voor-bouwer|v1_create_order/);
  assert.match(read('index.html'), /<b>Woningtaxateur<\/b>NRVT<span>In toetsing<\/span>/);
  assert.match(read('bedrijven.html').match(/<section class="svc-card" id="nrvt"[\s\S]*?<\/section>/)[0], /<span class="status prep">In toetsing<\/span>/);
});

test('NIVRE eerst, overal: "toets van een schadevaststelling" in plaats van "oordeel over een claimbesluit"; voorbeeldoverzicht alleen NIVRE', () => {
  for (const f of ['index.html', 'bedrijven.html', 'professionals.html', 'hoe-het-werkt.html', 'pilot/second-opinion.html']) {
    assert.doesNotMatch(read(f), /oordeel over een claimbesluit|Oordeel claimbesluit|vijf diensten/i, f);
  }
  assert.match(read('pilot/second-opinion.html'), /<h1>Een schadevaststelling onafhankelijk laten toetsen<\/h1>/);
  assert.match(read('pilot/second-opinion.html'), /NIVRE-geregistreerde schade-expert/);
});

test('PR B: llms.txt met 5% afhandelfee en zonder H; klachtroute per register op de dienstkaart; "niet opleveren tot het compleet is"', () => {
  const l = read('llms.txt');
  assert.match(l, /you prepay max_price \+ 5% \+ VAT on the fee; the difference is refunded when a cheaper professional accepts/);
  assert.doesNotMatch(l, /\bH\b|fixed fee per service|price range/);
  for (const f of ['fee_pct', 'fee_vat_pct', 'fee_excl_vat']) assert.ok(l.includes(f), f);
  assert.match(l, /There is no public v1 endpoint yet/);
  assert.match(l, /matches a reference point the company supplies/);
  for (const r of DIENSTEN) {
    assert.ok(r.klacht && r.klacht.links.length >= 1, r.id);
    for (const k of r.klacht.links) assert.match(k.url, /^https:\/\//, r.id);
  }
  assert.match(read('professionals.html'), /<dt>Oneens met de inhoud<\/dt><dd>Geen grond voor geld terug\. Ga naar de professional, of naar NIVRE: <a href="https:\/\/nivre\.nl\/over-het-nivre\/klachten\/" rel="noopener">/);
  for (const f of ['bedrijven.html', 'hoe-het-werkt.html', 'veelgestelde-vragen.html']) {
    assert.match(read(f), /Het systeem laat geen oplevering toe waarin een verplicht onderdeel ontbreekt; mist er na oplevering toch iets, dan is dat een objectieve fout en (krijg je|krijgt het bedrijf) alles terug\./, f);
    assert.doesNotMatch(read(f), /kan de professional niet opleveren tot het compleet is/, f);
  }
  assert.match(l, /5% of the professional's price \(including his VAT, if any\); the fee itself excludes VAT, plus 21% VAT on the fee/);
});

test('rolnaam overal "professional": geen generieke Expert A/B of "expert" meer (vaktermen blijven)', () => {
  const vak = /schade-experts?|NIVRE-expert|court experts?|court expert reports|eerste expertise|gerechtelijke? deskundig\w*/gi;
  for (const f of [...PAGES, 'llms.txt', 'site.js', 'voorbeeld/dossier-voorbeeld.json', 'tools/maak-voorbeeld.py']) {
    if (f === 'voorwaarden.html') continue;
    const t = read(f).replace(vak, '');
    assert.doesNotMatch(t, /\bExpert [AB]\b|\bexperts?\b/i, f);
  }
  assert.match(read('site.js'), /Professional A · aangeboden/);
  assert.doesNotMatch(read('index.html'), /id="voorbeeld"/, 'geen demo-sectie meer op de home');
  const css = read('site.css');
  assert.match(css, /\.vastgelegd \.why \{[^}]*background: var\(--mist\); border-left: 3px solid var\(--ink\);/);
  assert.doesNotMatch(css.match(/\.vastgelegd \.why[^}]*\}/g).join(''), /--gold/);
});
