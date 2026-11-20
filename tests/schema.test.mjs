// JSON-LD en vaste teksten na de externe review: Organization en WebSite op elke pagina, FAQPage gelijk aan de
// zichtbare vragen, Service per register, geen adres; juridisch kader, passkeys en entiteit overal hetzelfde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const PAGES = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')), ...readdirSync(join(ROOT, 'pilot')).filter((f) => f.endsWith('.html')).map((f) => 'pilot/' + f)];
const TEXT_FILES = [...PAGES, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'kb/index.json'];
const unescape = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();

function graphOf(file) {
  const html = read(file);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `${file}: precies één JSON-LD-blok`);
  assert.ok(html.indexOf(blocks[0][0]) < html.indexOf('</head>'), `${file}: JSON-LD staat in de head`);
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org', file);
  assert.ok(Array.isArray(data['@graph']), file);
  return data['@graph'];
}

// Minimale schema.org-controle per type: verplichte velden, toegestane velden, verwijzingen die bestaan.
const SCHEMA = {
  Organization: { required: ['@id', 'name', 'legalName', 'identifier', 'url'], allowed: ['@type', '@id', 'name', 'legalName', 'identifier', 'url', 'email', 'logo', 'sameAs'] },
  WebSite: { required: ['@id', 'name', 'url', 'publisher'], allowed: ['@type', '@id', 'name', 'url', 'inLanguage', 'publisher'] },
  FAQPage: { required: ['mainEntity'], allowed: ['@type', '@id', 'inLanguage', 'mainEntity'] },
  Service: { required: ['@id', 'name', 'serviceType', 'provider', 'description'], allowed: ['@type', '@id', 'name', 'serviceType', 'description', 'provider', 'areaServed', 'audience'] }
};

function validate(file, graph) {
  const ids = new Set(graph.map((n) => n['@id']).filter(Boolean));
  for (const node of graph) {
    const spec = SCHEMA[node['@type']];
    assert.ok(spec, `${file}: onbekend type ${node['@type']}`);
    for (const k of spec.required) assert.ok(node[k] !== undefined && node[k] !== '', `${file}: ${node['@type']} mist ${k}`);
    for (const k of Object.keys(node)) assert.ok(spec.allowed.includes(k), `${file}: ${node['@type']} heeft onverwacht veld ${k}`);
    for (const k of ['url', 'logo']) if (node[k]) assert.match(node[k], /^https:\/\/humanpush\.nl\//, `${file}: ${k}`);
    for (const ref of [node.publisher, node.provider]) if (ref) assert.ok(ids.has(ref['@id']), `${file}: verwijzing ${ref['@id']} bestaat niet`);
  }
  assert.doesNotMatch(JSON.stringify(graph), /"address"|PostalAddress|RSIN|vestigingsnummer|streetAddress|postalCode/i, `${file}: geen adres in JSON-LD`);
}

test('JSON-LD: Organization en WebSite op elke pagina, geldig en zonder adres', () => {
  for (const f of PAGES) {
    const g = graphOf(f);
    validate(f, g);
    const org = g.find((n) => n['@type'] === 'Organization');
    assert.equal(org.name, 'HumanPush');
    assert.equal(org.legalName, 'HumAgent B.V.');
    assert.deepEqual(org.identifier, { '@type': 'PropertyValue', propertyID: 'KvK', value: '42222476' });
    assert.equal(org.url, 'https://humanpush.nl/');
    assert.deepEqual(org.sameAs, []);
    assert.ok(g.some((n) => n['@type'] === 'WebSite'), `${f}: WebSite`);
  }
});

test('JSON-LD: FAQPage op de vragenpagina, gelijk aan de zichtbare vragen en antwoorden', () => {
  const html = read('veelgestelde-vragen.html');
  const faq = graphOf('veelgestelde-vragen.html').find((n) => n['@type'] === 'FAQPage');
  assert.ok(faq);
  const visible = [...html.matchAll(/<details[^>]*><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)].map((m) => [unescape(m[1]), unescape(m[2])]);
  assert.equal(faq.mainEntity.length, visible.length);
  faq.mainEntity.forEach((q, i) => {
    assert.equal(q['@type'], 'Question');
    assert.equal(q.acceptedAnswer['@type'], 'Answer');
    assert.equal(q.name, visible[i][0]);
    assert.equal(q.acceptedAnswer.text, visible[i][1]);
  });
  for (const f of PAGES.filter((f) => f !== 'veelgestelde-vragen.html')) assert.ok(!graphOf(f).some((n) => n['@type'] === 'FAQPage'), f);
});

test('JSON-LD: Service per register op /bedrijven en /professionals', () => {
  for (const f of ['bedrijven.html', 'professionals.html']) {
    const services = graphOf(f).filter((n) => n['@type'] === 'Service');
    assert.equal(services.length, 5, f);
    for (const r of ['NIVRE', 'NRVT', 'NRGD', 'Octrooigemachtigden', 'NRBI']) assert.ok(services.some((s) => s.description.includes(r)), `${f}: ${r}`);
  }
});

test('juridisch kader: nergens "de wet eist altijd", wel de genuanceerde formulering', () => {
  const always = /\b(wet|AVG|GDPR|AI[- ](Act|verordening)|law|regulation)\b[^.]{0,80}\b(altijd|always|verplicht(?!e conflictcheck)|vereist|eist|requires?)\b[^.]{0,60}\b(professional|mens|human|expert|deskundige|registered|geregistreerd|registratie)/i;
  for (const f of TEXT_FILES) {
    for (const sentence of read(f).replace(/<[^>]+>/g, ' ').split(/(?<=[.!?])\s+/)) {
      if (/niet altijd|not always|niet elk besluit|\?$/i.test(sentence.trim())) continue;
      if (/AI-verordening eist menselijk toezicht bij AI-systemen met een hoog risico|AI Act requires human oversight for high-risk/i.test(sentence)) continue;
      assert.doesNotMatch(sentence, always, `${f}: ${sentence.slice(0, 140)}`);
    }
  }
  assert.match(read('veelgestelde-vragen.html'), /wanneer de situatie daarom vraagt/);
  assert.match(read('bedrijven.html'), /wanneer de situatie daarom vraagt/);
  assert.match(read('llms.txt'), /when the situation calls for it/);
});

test('authenticatie: tekenen met passkey plus verplichte reserve; nergens een code per mail', () => {
  for (const f of TEXT_FILES) assert.doesNotMatch(read(f), /e-?mail-?code|code (per|via) (e-)?mail|email code|verificatiecode|sms-code|one-time code|eenmalige code/i, f);
  // Waar de eenmalige link genoemd wordt, staat er ook waarvoor hij dient.
  const pages = TEXT_FILES.filter((f) => f.endsWith('.html'));
  for (const f of pages) if (/eenmalig(e)? (een )?link/i.test(read(f))) assert.match(read(f), /link dient alleen om (je|de) (toegangscode|API-sleutel) op te halen/, f);
  for (const f of ['agents.html', 'inloggen.html', 'professionals.html']) assert.match(read(f), /link dient alleen om (je|de) (toegangscode|API-sleutel) op te halen/, f);
});

test('entiteit: alleen HumAgent B.V. (KvK 42222476), geen andere naam, geen placeholders', () => {
  for (const f of TEXT_FILES) {
    const t = read(f).replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
    assert.doesNotMatch(t, /AgentPush B\.V\.|in oprichting|\bTODO\b|\bXXX\b|\[\.\.\.\]|\[…\]|\bRSIN\b|vestigingsnummer/i, f);
    for (const m of t.matchAll(/HumAgent B\.V\.[^<\n]{0,20}/g)) assert.match(m[0], /^HumAgent B\.V\.( \(KvK 42222476\)|", )/, `${f}: ${m[0]}`);
  }
  for (const f of PAGES) assert.ok(read(f).includes('HumanPush is een handelsnaam van HumAgent B.V. (KvK 42222476).'), f);
});

test('home: definitiezin direct onder de h1', () => {
  assert.match(read('index.html'), /<\/h1>\n<p class="definition">HumanPush is de laag waarmee AI-agents geregistreerde professionals inschakelen, hun werk ontvangen en controleerbaar vastleggen wie waarvoor verantwoordelijk is\.<\/p>/);
});
