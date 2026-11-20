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
    for (const m of t.matchAll(/\S*sleutel\S*/gi)) assert.ok(/^versleuteld/i.test(m[0]) || (f === 'agents.html' && /API-sleutel/.test(m[0])), `${f}: "${m[0]}"`);
  }
  for (const f of ['index.html', 'bedrijven.html', 'professionals.html']) assert.doesNotMatch(visible(read(f)).replace(/versleuteld/g, ''), /sleutel/i, f);
  assert.match(read('bedrijven.html'), /toegangscode/);
  assert.match(read('professionals.html'), /toegangscode voor je agent/);
});

test('woordenlijst: uitleg van digitale vingerafdruk, handtekening met je passkey en dossier', () => {
  const vinger = 'Bij de oplevering berekent HumanPush uit het stuk een unieke code van 64 tekens. Verander je één komma, dan komt er een totaal andere code uit.';
  const passkey = 'Daarmee bevestig jij als geregistreerde professional dat jij de opdracht aanneemt, dat jij het opgeleverde werk hebt gemaakt of gecontroleerd, en dat jij ervoor instaat.';
  for (const f of ['index.html', 'hoe-het-werkt.html']) {
    const t = read(f);
    assert.ok(t.includes(vinger), `${f}: vingerafdruk`);
    assert.ok(t.includes(passkey), `${f}: passkey`);
    assert.match(t, /Dossier<\/h3><p>Per opdracht de afspraken en elke getekende stap in het proces\./, `${f}: dossier`);
  }
  assert.ok(read('bedrijven.html').includes(vinger));
});

test('stappenblok: één bron (partials/stappen.json), vijf stappen met rol, op elke pagina via sync-partials', () => {
  const src = JSON.parse(read('partials/stappen.json'));
  for (const v of ['neutraal', 'pro']) {
    assert.deepEqual(src[v].map((x) => x.titel), ['Opdracht', 'Aannemen', 'Uitvoeren en tekenen', 'Akkoord', 'Dossier'], v);
    assert.deepEqual(src[v].map((x) => x.rol), ['bedrijf', 'professional', 'professional', 'bedrijf', 'iedereen'], v);
  }
  assert.ok(src.pro.some((x) => x.rolnaam === 'Jij'), 'pro-variant spreekt de professional aan met jij');
  const pages = { 'index.html': ['neutraal'], 'hoe-het-werkt.html': ['pro', 'neutraal'], 'bedrijven.html': ['neutraal'], 'professionals.html': ['pro'], 'agents.html': ['neutraal'], 'pilot/second-opinion.html': ['neutraal'] };
  for (const [f, views] of Object.entries(pages)) {
    const t = read(f);
    assert.deepEqual([...t.matchAll(/<!--stappen:start view=(\w+)-->/g)].map((m) => m[1]), views, f);
    assert.equal((t.match(/<li class="tl-step/g) || []).length, 5 * views.length, f);
    assert.doesNotMatch(t, /class="steps4"|in vier stappen|De vier stappen/, f);
  }
  const step2 = read('index.html').match(/<h3>Aannemen<\/h3><p>([\s\S]*?)<\/p>/)[1];
  assert.match(step2, /<span data-rule="turnWorkingMinutes">\d+<\/span> minuten binnen werktijd \(ma–vr 9–17 uur\)/);
  assert.match(read('index.html'), /<p class="tl-rule">HumanPush controleert het proces, niet de inhoud\. <a href="\/hoe-het-werkt#controle">Lees wat HumanPush controleert<\/a><\/p>/);
  const css = read('site.css');
  assert.ok(Number(css.match(/\.tl-step p \{ font-size: ([\d.]+)px/)[1]) >= 15, 'stappen in leesbare grootte');
});

test('demo op home: elke rij krijgt een frame, "Bewijs" is geen actor, zonder JS alles zichtbaar', () => {
  const t = read('index.html');
  const demo = t.match(/<figure class="demo" data-anim[\s\S]*?<\/figure>/)[0];
  const who = [...demo.matchAll(/<span class="who">([^<]+)<\/span>/g)].map((m) => m[1]);
  assert.deepEqual(who, ['Agent van het bedrijf', 'HumanPush', 'Expert B', 'Bedrijf', 'HumanPush']);
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

test('/hoe-het-werkt: kant-keuze bovenaan, een gesprek per kant tot de uitbetaling, en 4 punten "Wat wordt er vastgelegd"', () => {
  const t = read('hoe-het-werkt.html');
  assert.match(t, /<div class="side-bar" data-side-root>\n<p class="side-hint">[^<]*<\/p>\n<div class="svc-toggle side-toggle" role="group" aria-label="Kies je kant"><button type="button" class="svc-view" data-view="pro" aria-pressed="false">Ik ben professional<\/button><button type="button" class="svc-view" data-view="bedrijf" aria-pressed="true">Ik ben een bedrijf \(of zijn agent\)<\/button><\/div>/);
  assert.ok(t.indexOf('data-side-root') < t.indexOf('class="tl"'), 'keuze staat bovenaan');
  for (const side of ['pro', 'bedrijf']) {
    const vb = t.slice(t.indexOf('id="voorbeeld"'));
    const s = vb.match(new RegExp(`<div class="side" data-side="${side}">[\\s\\S]*?<\\/figure>`))[0];
    assert.match(s, /<figure class="chat"[\s\S]*class="fictief">Voorbeeld<\/span>/, side);
    assert.match(s, /uitbetaald/, `${side}: tot de uitbetaling`);
    assert.match(s, /Expert B|jij bent Expert B/i, side);
  }
  assert.match(t, /Expert B heeft het rapport opgeleverd en getekend[\s\S]*Accepteren\.[\s\S]*Expert B wordt uitbetaald/);
  assert.match(t, /Aannemen<\/span><span class="fake sec">Doorgeven/, 'professional neemt aan, het bedrijf accepteert');
  assert.doesNotMatch(t, /rapport\.pdf|uploadt|Bewijsdossier downloaden/);
  assert.match(t, /id="controle"[\s\S]*HumanPush oordeelt niet over de inhoud/);
  assert.match(t, /<h2 id="via-kop">Alles loopt via HumanPush<\/h2>/);
  assert.match(t, /<figure class="dossierkaart"/);
  const v = t.match(/<ol class="vastgelegd">[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...v.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ['Registercheck', 'Digitale vingerafdruk', 'Handtekening met je passkey', 'Dossier']);
  assert.equal((v.match(/Waarom het belangrijk is:/g) || []).length, 4);
  assert.doesNotMatch(t, /Waarom het telt/);
  assert.doesNotMatch(t, /class="infographic"|class="swimcard"|<!--(flow|swim)/, 'geen oude schema-onderdelen');
  const js = read('site.js');
  assert.match(js, /\[data-side-root\][\s\S]*store\('hp-doelgroep', v\)/, 'keuze wordt bewaard');
});

test('/professionals: twee manieren met eigen flow, onboarding, uitbetaling, te laat (regels uit rules.json), voordelen', () => {
  const t = read('professionals.html');
  const manieren = [...t.matchAll(/<a class="svc-tab" href="#manier-[\w-]+" id="tab-manier-[\w-]+" data-tab="manier-[\w-]+">([^<]+)<\/a>/g)].map((m) => m[1]);
  assert.deepEqual(manieren, ['Op het HumanPush-scherm', 'Met je eigen agent']);
  assert.match(t, /Twee manieren, dezelfde regels: op het HumanPush-scherm of met je eigen agent\./);
  assert.match(t, /<h2 id="humanpush-scherm-kop">Geen eigen agent\? Gebruik het HumanPush-scherm\.<\/h2>/);
  for (const f of PAGES) assert.doesNotMatch(read(f), /HumanPush-agent/, f);
  for (const k of ['scherm', 'eigen-agent']) assert.equal((t.match(new RegExp(`id="manier-${k}"[\\s\\S]*?</section>`))[0].match(/<li>/g) || []).length, 4, k);
  const begin = t.match(/id="zo-begin-je"[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...begin.matchAll(/<li><strong>([^<]+)<\/strong>/g)].map((m) => m[1]), ['Aanmelden', 'Registercheck', 'Twee passkeys instellen', 'Je eerste aangeboden opdracht']);
  // Zo word je uitbetaald: drie kaarten, elk zonder uitklap te begrijpen; detail achter "Hoe precies?" (een <details>, tikken, geen hover).
  const pay = t.match(/<ol class="paycards"[\s\S]*?<\/ol>/)[0];
  assert.deepEqual([...pay.matchAll(/<p class="pay-t">([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, '')), ['Je levert op.', 'Het bedrijf heeft 72 uur om te reageren.', 'Je krijgt je volledige prijs.']);
  assert.equal((pay.match(/<details class="pay-more"><summary>Hoe precies\?<\/summary>/g) || []).length, 3);
  assert.match(pay, /Zegt het niets, dan geldt je werk als geaccepteerd\./);
  const qs = [...t.matchAll(/<details class="pay-q"><summary>([^<]+)<\/summary>/g)].map((m) => m[1]);
  assert.deepEqual(qs, ['Wanneer krijg ik niets?', 'En als het bedrijf het inhoudelijk oneens is?', 'Annuleert het bedrijf nadat je hebt aangenomen?', 'Wie bepaalt mijn prijs?']);
  assert.match(t, /Alleen als iets objectief misgaat: deadline gemist, bewijs ontbreekt, verkeerd formaat of registerinschrijving ongeldig\. Het systeem checkt dat automatisch en het bedrijf krijgt zijn geld terug\. Niemand beoordeelt de inhoud van je werk\./);
  assert.doesNotMatch(read('site.css'), /\.pay-(card|more|q)[^{]*:hover/, 'geen hover-uitklap');
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
  for (const r of DIENSTEN) assert.match(r.uitleg, new RegExp(`^${r.beroep.replace(/[()]/g, '\\$&')}, ingeschreven [^.]+\\. Sector: [^.]+\\.$`), r.id);
  for (const f of ['professionals.html', 'bedrijven.html']) {
    for (const r of DIENSTEN) assert.ok(read(f).includes(`<p class="svc-uitleg"><strong>${r.tab}:</strong> ${r.uitleg}</p>`), `${f}: ${r.id}`);
  }
  assert.equal(DIENSTEN.find((r) => r.id === 'nivre').uitleg, 'Schade-expert, ingeschreven bij NIVRE. Sector: schade en verzekeringen.');
  assert.doesNotMatch(read('professionals.html'), /geen facturen/i);
});

test('home: rij "Registers en sectoren" onder de routekaarten, als links naar de juiste tab', () => {
  const t = read('index.html');
  const row = t.match(/<nav class="sectoren"[\s\S]*?<\/nav>/)[0];
  assert.ok(t.indexOf('class="routecards"') < t.indexOf('class="sectoren"'));
  const links = [...row.matchAll(/<a href="\/bedrijven#(\w+)" data-tablink="\1"><span class="sec-name">([^<]+)<\/span><span class="sec-reg">([^<]+)<\/span><\/a>/g)].map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(links.map((l) => l[1]), ['Schade-expert', 'Register-taxateur (wonen)', 'Bouwkundig inspecteur', 'Gerechtelijk deskundige (digitaal onderzoek)', 'Octrooigemachtigde']);
  for (const [id] of links) assert.ok(DIENSTEN.some((r) => r.id === id), id);
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
  assert.match(k, /HumanPush-afhandelfee: <span data-rule="feePct">5<\/span>% van die prijs, plus btw over de fee\. Geen abonnement, geen minimum, geen andere kosten\./);
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
    assert.equal((t.match(/<p class="svc-vanaf">Vanaf-prijs: volgt zodra professionals zich hebben aangemeld<\/p>/g) || []).length, regs.length * 2, f);
  }
});

test('/hoe-het-werkt per kant: wat je nodig hebt, wat het kost en wat er daarna gebeurt (termijnen uit rules.json)', () => {
  const t = read('hoe-het-werkt.html');
  for (const side of ['pro', 'bedrijf']) {
    const s = t.match(new RegExp(`<div class="side" data-side="${side}"><p class="side-for">[^<]+</p><!--stappen:start[\\s\\S]*?<div class="next-grid">([\\s\\S]*?)</div>\\n</div></div>`))[1];
    for (const h of ['Wat je nodig hebt', 'Wat het kost', 'Wat er daarna gebeurt']) assert.ok(s.includes(`<h3>${h}</h3>`), `${side}: ${h}`);
    assert.equal((s.match(/<ol class="next-steps">[\s\S]*?<\/ol>/)[0].match(/<li>/g) || []).length, 5, `${side}: één zin per stap`);
    assert.match(s, /<span data-rule="turnWorkingMinutes">\d+<\/span> minuten binnen werktijd \(ma–vr 9–17 uur\)/, side);
    assert.match(s, /<span data-rule="objectionHours">\d+<\/span> uur/, side);
    assert.match(s, /href="\/bedrijven#kosten"/, side);
  }
  const pro = t.match(/<div class="side" data-side="pro">[\s\S]*?<\/ol><\/div>\n<\/div><\/div>/)[0];
  for (const x of ['registratienummer', 'KvK-nummer', 'btw-situatie', 'bankrekening op naam van je onderneming', '2 passkeys', 'DAC7']) assert.ok(pro.includes(x), x);
  const biz = t.match(/<div class="side" data-side="bedrijf">[\s\S]*?<\/ol><\/div>\n<\/div><\/div>/)[0];
  for (const x of ['KvK-nummer', 'MCP', 'betaallink binnen <span data-rule="payMinutes">30</span> minuten']) assert.ok(biz.includes(x), x);
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
    assert.equal((t.match(/<details class="voor-bouwer"><summary>Voor je bouwer<\/summary>/g) || []).length, 5, `${f}: per dienstkaart een uitklap voor de bouwer`);
    assert.match(t, /<span class="status"><span data-rule="turnWorkingMinutes">45<\/span> min binnen werktijd om aan te nemen<\/span>/);
    assert.deepEqual([...t.matchAll(/<a class="svc-tab" href="#[\w-]+" id="tab-[\w-]+" data-tab="([\w-]+)"[^>]*>([^<]+)<\/a>/g)].filter((m) => !m[1].startsWith('manier-')).map((m) => m[2]), ['NIVRE', 'NRVT', 'NRBI', 'NRGD', 'Octrooi'], `${f}: tabvolgorde, pilot eerst`);
  }
  const regs = JSON.parse(read('partials/diensten.json')).registers;
  assert.deepEqual(regs.map((r) => [r.tab, r.beroep, r.registernaam]), [
    ['NIVRE', 'Schade-expert', 'NIVRE'], ['NRVT', 'Register-taxateur (wonen)', 'NRVT'], ['NRBI', 'Bouwkundig inspecteur', 'NRBI'],
    ['NRGD', 'Gerechtelijk deskundige (digitaal onderzoek)', 'NRGD'], ['Octrooi', 'Octrooigemachtigde', 'Register van octrooigemachtigden']]);
  for (const r of regs) assert.ok(r.pro.chips.includes('Rapport als pdf') && r.pro.chips.includes('Getekend met passkey') && r.bedrijf.chips.includes('Vaste uitkomst'), r.id);
  const home = read('index.html');
  assert.deepEqual([...home.matchAll(/<span class="sec-reg">([^<]+)<\/span>/g)].map((m) => m[1]), ['NIVRE', 'NRVT', 'NRBI', 'NRGD', 'Register van octrooigemachtigden']);
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
  assert.match(read('bedrijven.html'), /<span class="fake sec">Dossier bekijken<\/span><span class="soon">Voorbeeld · komt eraan<\/span>/);
  for (const f of ['bedrijven.html', 'hoe-het-werkt.html', 'index.html', 'pilot/second-opinion.html']) assert.doesNotMatch(peopleText(read(f)), /AVG \(art\. 22\)|AI-verordening eist/, `${f}: wetsalinea alleen in de FAQ`);
  assert.match(read('veelgestelde-vragen.html'), /id="wet"[\s\S]*AVG \(art\. 22\)/);
});

test('professional weet waar hij aan toe is: checklist, wanneer het geld komt, DAC7; niets over wie factureert', () => {
  const t = read('professionals.html');
  const begin = t.match(/id="zo-begin-je"[\s\S]*?<\/section>/)[0];
  for (const x of ['registratienummer', 'KvK-nummer', 'btw-situatie', 'bankrekening op naam van je onderneming', '2 passkeys', 'DAC7']) assert.ok(begin.includes(x), x);
  assert.match(begin, /Als platform is HumanPush wettelijk verplicht \(DAC7\) om gegevens over je opdrachten en inkomsten jaarlijks aan de Belastingdienst door te geven\./);
  const faq = read('veelgestelde-vragen.html');
  assert.match(faq, /<summary>Wanneer krijg ik mijn geld\?<\/summary><p>Na acceptatie door het bedrijf, of na <span data-rule="objectionHours">72<\/span> uur zonder geldig bezwaar, zet HumanPush de uitbetaling klaar\. De precieze termijn tot je rekening volgt na de testfase\.<\/p>/);
  assert.match(faq, /<summary>Hoe weet ik dat er een opdracht voor mij is\?<\/summary><p>Op je scherm bij HumanPush, of je agent vraagt het op\. Er gaat nog geen mail of push\./);
  for (const f of PAGES.filter((f) => f !== 'voorwaarden.html')) assert.doesNotMatch(read(f), /factur/i, `${f}: wie factureert wacht op jurist en fiscalist`);
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
  assert.match(read('bedrijven.html'), /<p class="grenzen-kort">[\s\S]*?<a href="\/hoe-het-werkt#grenzen">Wat het dossier aantoont, en wat niet<\/a><\/p>/);
  assert.match(read('veelgestelde-vragen.html'), /id="handtekening"[\s\S]*?href="\/hoe-het-werkt#grenzen"/);
  const ok = /geen gekwalificeerde|niet aantoont|Dat het een gekwalificeerde elektronische handtekening is\.|\?\s*$/i;
  for (const f of [...PAGES, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md']) {
    const t = (f.endsWith('.html') ? read(f).slice(read(f).indexOf('<body')).replace(/<[^>]+>/g, ' ') : read(f)).replace(/\s+/g, ' ');
    assert.doesNotMatch(t, /juridisch bindend|rechtsgeldig|onweerlegbaar|garantie op kwaliteit/i, f);
    for (const s of t.split(/(?<=[.?!])\s+/)) if (/gekwalificeerd/i.test(s)) assert.match(s, ok, `${f}: "${s.slice(0, 120)}"`);
  }
});
