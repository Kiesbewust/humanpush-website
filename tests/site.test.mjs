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
const gated2 = (t) => t.replace(/<(li|div|section)[^>]*data-testenv hidden[^>]*>[\s\S]*?<\/\1>/g, '');
const PAGES = FILES.filter((f) => f.endsWith('.html'));

test('verboden woorden staan niet in uitgeleverde bestanden', () => {
  const bad = /sandbox|blockchain|v1-testtak|\/v1\/pro\b|\bRSIN\b|vestigingsnummer|test branch|tekenpagina|backup-passkey/i;
  // De bron van de functies in api/ wordt niet als bestand uitgeleverd (Vercel draait ze alleen); de weigerregels
  // moeten zulke woorden in een vraag kunnen herkennen. De kennisbasis in api/_kb.js telt wel mee.
  // Uitzondering: de link naar de testomgeving (/v1/pro) mag alleen in een blok met data-testenv, standaard verborgen (vlag testenv uit).
  const gated = (t) => t.replace(/<(li|div|section)[^>]*data-testenv hidden[^>]*>[\s\S]*?<\/\1>/g, '');
  for (const f of FILES.filter((f) => !f.startsWith('api/') || f === 'api/_kb.js')) { const m = gated(read(f)).match(bad); assert.equal(m, null, `${f}: "${m && m[0]}"`); }
});

test('geen adres of postcode op de site', () => {
  for (const f of FILES.filter((f) => !f.startsWith('api/_kb') && !f.startsWith('kb/index'))) {
    assert.doesNotMatch(read(f), /\b\d{4}\s?[A-Z]{2}\b(?![A-Za-z])|\b(straat|laan|weg|plein|gracht) \d+/, f);
  }
});

test('geen interne woorden, ook niet hold_2a (QA 19 nov)', () => {
  for (const f of FILES) assert.doesNotMatch(gated2(read(f)), /hold_2a|v1-testtak|test branch|\/v1\/pro\b|tekenpagina/i, f);
});

test('geen bezoekersteller of andere externe scripts: "we verzamelen geen gegevens" klopt (QA 19 nov)', () => {
  for (const f of PAGES) { const x = read(f); assert.doesNotMatch(x, /goatcounter|gc\.zgo\.at/i, f); assert.doesNotMatch(x, /<script[^>]+src="(https?:)?\/\//i, f); }
  assert.match(read('professionals.html'), /Aanmelden is nog niet open\./);
  assert.doesNotMatch(read('rules.json'), /src\/|tools\/|\.ts\b|\.mjs\b/, 'geen interne paden in rules.json');
});


test('het garantieblok staat alleen op /hoe-het-werkt; elders één regel met link', () => {
  for (const f of PAGES) {
    const has = read(f).includes('class="guarantees"');
    assert.equal(has, f === 'hoe-het-werkt.html', f);
  }
  for (const f of ['index.html', 'agents.html', 'bedrijven.html', 'professionals.html', 'veelgestelde-vragen.html']) {
    assert.match(read(f), /<a href="\/hoe-het-werkt#garanties">Lees wat HumanPush garandeert<\/a>/, f);
  }
});

test('elke pagina: noindex, statusregel in plaats van de banner, footer zonder adres, Inloggen met "komt eraan", geen Google Fonts', () => {
  // De banner op elke pagina is vervangen door één statusregel op de home.
  const status = 'Nog geen echte opdrachten. We starten met schade-experts (NIVRE).';
  for (const f of PAGES) {
    const t = read(f);
    assert.match(t, /<meta name="robots" content="noindex, nofollow">/, f);
    assert.equal(t.includes(status), f === 'index.html', f + ' statusregel');
    assert.doesNotMatch(t, /HumanPush is in de testfase: er lopen nog geen echte opdrachten/, f);
    assert.ok(t.includes('<p><a href="mailto:info@humanpush.nl">info@humanpush.nl</a></p><p class="f-legal">'), f + ' footer');
    assert.equal(t.match(/<p class="f-legal">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, ''), 'HumanPush is een handelsnaam van HumAgent B.V. · KvK 42222476 · btw NL870249964B01 · Utrecht', f + ' footerregel');
    assert.match(t, /<div class="login" data-testenv hidden>/, f + ' inloggen alleen met de testvlag');
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
  assert.equal(v.redirects.length, 4);
  assert.deepEqual(v.redirects.slice(2).map((r) => [r.source, r.destination]), [['/prijzen', '/bedrijven#kosten'], ['/diensten', '/bedrijven#diensten']]);
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

test('regressie (al opgelost, 20-11): nergens "4 werkuren"/"vier werkuren" of NRGD 008.4', () => {
  for (const f of [...PAGES, 'llms.txt']) {
    const t = f.endsWith('.html') ? read(f).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ') : read(f);
    assert.doesNotMatch(t, /\b(4|vier) werkuren\b|008\.4/i, f);
  }
});

test('geen straatadres of postcode in een publiek bestand', () => {
  const pub = [...PAGES, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'kb/index.json', 'sitemap.xml', 'robots.txt'].filter((f) => existsSync(join(ROOT, f)));
  const street = /\b[A-Z][a-zà-ÿ]+(straat|laan|weg|plein|gracht|kade|singel|dijk|park|steeg|hof)\s+\d{1,4}\s?[a-zA-Z]?\b/;
  for (const f of pub) {
    const t = read(f);
    assert.doesNotMatch(t, /\b\d{4}\s?[A-Z]{2}\b/, `${f}: postcode`);
    assert.doesNotMatch(t, street, `${f}: straat met huisnummer`);
  }
});

test('pilotaanvraag zonder backend: mailto-knoppen met sjabloon, geen formulier naar buiten, geen trackers, geen cookies', () => {
  const NOTE = 'Er is geen formulier en we verzamelen via deze site geen gegevens; je mail komt binnen in onze gewone mailbox.';
  assert.match(read('bedrijven.html'), /href="mailto:info@humanpush\.nl\?subject=Kennismaken&amp;body=Organisatie%3A%0ASoort%20schadezaken%3A%0AOngeveer%20hoeveel%20per%20maand%3A%0AWerk%20je%20al%20met%20AI-agents%20of%20claimsoftware%20%28welke%29%3A%0ATelefoon%20%28optioneel%29%3A%0A">Neem contact op<\/a>/);
  assert.match(read('professionals.html'), /href="mailto:info@humanpush\.nl\?subject=Interesse%20als%20professional&amp;body=Register%20en%20registratienummer%3A%0ABranche%3A%0AZelfstandig%20of%20bureau%3A%0A">Stuur een mail<\/a>/);
  for (const f of ['bedrijven.html', 'professionals.html', 'pilot/second-opinion.html']) assert.ok(read(f).includes(NOTE), f);
  const trackers = /google-analytics|googletagmanager|gtag\(|plausible\.io|matomo|hotjar|segment\.(io|com)|facebook\.net|fbq\(|clarity\.ms|goatcounter|umami|mixpanel|hubspot|typeform|tally\.so|jotform|formspree|getform|document\.cookie/i;
  for (const f of FILES.filter((f) => /\.(html|js|css|txt|json)$/.test(f) && !f.startsWith('api/'))) {
    const t = read(f);
    assert.doesNotMatch(t, trackers, f);
    for (const m of t.matchAll(/<form\b[^>]*action="([^"]*)"/gi)) assert.match(m[1], /^\//, `${f}: formulier naar buiten`);
  }
});

test('voorbeeld-dossier: fictief, gestempeld, en de sha256 in de JSON is de echte hash van de pdf', async () => {
  const { createHash } = await import('node:crypto');
  const pdf = readFileSync(join(ROOT, 'voorbeeld/rapport-voorbeeld.pdf'));
  const d = JSON.parse(read('voorbeeld/dossier-voorbeeld.json'));
  assert.equal(d.example, true);
  assert.equal(d.sha256, createHash('sha256').update(pdf).digest('hex'), 'hash van de pdf klopt');
  assert.equal(d.signature, 'VOORBEELD – niet verifieerbaar');
  assert.equal(d.organisation.kvk, '00000000');
  const text = pdf.toString('latin1');
  assert.ok(text.includes('VOORBEELD') && text.includes('FICTIEF') && text.includes('GEEN ECHTE OPDRACHT'), 'gestempeld');
  assert.doesNotMatch(JSON.stringify(d), /NL\d{2}[A-Z]{4}\d{6,}|\b(?!00000000\b)\d{8}\b/, 'geen echte KvK- of rekeningnummers');
  const b = read('bedrijven.html');
  assert.match(b, /id="voorbeeld-dossier"[\s\S]*href="\/voorbeeld\/rapport-voorbeeld\.pdf"[\s\S]*href="\/voorbeeld\/dossier-voorbeeld\.json"[\s\S]*shasum -a 256 rapport-voorbeeld\.pdf[\s\S]*VOORBEELD – niet verifieerbaar/);
  assert.match(read('hoe-het-werkt.html'), /id="grenzen"[\s\S]*?<a href="\/bedrijven#voorbeeld-dossier">Bekijk een voorbeeld-dossier<\/a>/);
});
