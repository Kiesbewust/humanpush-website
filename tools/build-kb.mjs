#!/usr/bin/env node
// HumanPush: bouwt de kennisbasis kb/index.json (en kb/faq.md) uit de bronnen in de repo. Geen dependencies.
//
//   node tools/build-kb.mjs          schrijft kb/index.json en kb/faq.md
//   node tools/build-kb.mjs --check  faalt als de kennisbasis niet bij de bronnen past (voor CI)
//
// Bronnen: kb/spelregels.md (per regel), veelgestelde-vragen.html (per vraag), llms.txt (per kop)
// en de blokken met data-kb="anker|titel" op de pagina's.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const BASE = 'https://humanpush.nl';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sha = (s) => createHash('sha256').update(s).digest('hex');

const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
export function htmlToText(h) {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(h\d|li|summary)>/gi, '. ')
    .replace(/<(br|\/p|\/div)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENT[e] ?? ' ')
    .replace(/\s+/g, ' ')
    .replace(/([.?!:;])\s*\.(\s|$)/g, '$1$2')
    .replace(/\s+\./g, '.')
    .trim();
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// Waar elk hoofdstuk van de spelregels op de site staat.
const RULE_URL = { 1: '/hoe-het-werkt#logboek', 2: '/hoe-het-werkt#g18', 3: '/bedrijven#hoe', 4: '/hoe-het-werkt#aannemen', 5: '/hoe-het-werkt#stappen', 6: '/hoe-het-werkt#g18', 7: '/hoe-het-werkt#geld', 8: '/hoe-het-werkt#geld', 9: '/professionals#betrouwbaar', 10: '/hoe-het-werkt#logboek' };

function fromSpelregels() {
  const out = [];
  const md = read('kb/spelregels.md');
  const re = /^### (R(\d+)\.(\d+)) · (.+)\n([\s\S]*?)(?=^#{2,3} |(?![\s\S]))/gm;
  for (const m of md.matchAll(re)) {
    const [, code, ch, n, title, body] = m;
    out.push({ id: `spelregels-r${ch}-${n}`, title: `${code} ${title.trim()}`, url: BASE + RULE_URL[Number(ch)], lang: 'nl', source: 'spelregels', text: body.replace(/\s+/g, ' ').trim() });
  }
  return out;
}

function fromFaq() {
  const out = [];
  const html = read('veelgestelde-vragen.html');
  const sections = [...html.matchAll(/<h2 id="([\w-]+)">([^<]+)<\/h2>([\s\S]*?)(?=<h2 id=|<\/main>)/g)];
  const md = ['# Veelgestelde vragen (gegenereerd uit veelgestelde-vragen.html door tools/build-kb.mjs)', ''];
  for (const [, sid, sname, body] of sections) {
    md.push(`## ${sname}`, '');
    for (const d of body.matchAll(/<details( id="([\w-]+)")?><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)) {
      const q = htmlToText(d[3]);
      const a = htmlToText(d[4]);
      const anchor = d[2] || sid;
      out.push({ id: `faq-${sid}-${slug(q)}`, title: q, url: `${BASE}/veelgestelde-vragen#${anchor}`, lang: 'nl', source: 'faq', text: a });
      md.push(`### ${q}`, '', a, '');
    }
  }
  return { chunks: out, md: md.join('\n') };
}

function fromLlms() {
  const out = [];
  const t = read('llms.txt');
  for (const m of t.matchAll(/^## (.+)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)) {
    const title = m[1].trim();
    if (title === 'Links') continue;
    const text = m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^- /gm, '').replace(/\s+/g, ' ').trim();
    out.push({ id: `llms-${slug(title)}`, title: `llms.txt: ${title}`, url: `${BASE}/llms.txt`, lang: 'en', source: 'llms', text });
  }
  return out;
}

// Een element met data-kb="anker|titel": de inhoud tot de bijbehorende sluittag.
function innerOf(html, start, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('</')) { depth--; if (depth === 0) return html.slice(start, m.index); }
    else depth++;
  }
  throw new Error('geen sluittag voor ' + tag);
}
function fromPages() {
  const out = [];
  const pages = { 'hoe-het-werkt.html': '/hoe-het-werkt', 'bedrijven.html': '/bedrijven', 'professionals.html': '/professionals', 'agents.html': '/agents' };
  for (const [file, path] of Object.entries(pages)) {
    const html = read(file);
    for (const m of html.matchAll(/<(\w+)\b[^>]*data-kb="([\w-]+)\|([^"]+)"[^>]*>/g)) {
      const inner = innerOf(html, m.index, m[1]);
      out.push({ id: `pagina-${path.slice(1)}-${m[2]}`, title: m[3], url: `${BASE}${path}#${m[2]}`, lang: 'nl', source: 'pagina', text: htmlToText(inner) });
    }
  }
  return out;
}

export function buildKb() {
  const rules = JSON.parse(read('rules.json'));
  const faq = fromFaq();
  const chunks = [...fromSpelregels(), ...faq.chunks, ...fromLlms(), ...fromPages()].map((c) => ({ ...c, hash: sha(c.text).slice(0, 16) }));
  const ids = new Set();
  for (const c of chunks) { if (ids.has(c.id)) throw new Error('dubbele id ' + c.id); ids.add(c.id); }
  const kb_hash = sha(JSON.stringify(chunks));
  return { index: { kb_version: rules.version, kb_hash, chunks }, faqMd: faq.md + '\n' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { index, faqMd } = buildKb();
  const json = JSON.stringify(index, null, 1) + '\n';
  const bad = /sandbox|blockchain|v1-testtak|\/v1\/pro\b|\bRSIN\b|vestigingsnummer/i;
  const problems = [];
  for (const c of index.chunks) { const m = c.text.match(bad); if (m) problems.push(`${c.id}: verboden woord "${m[0]}"`); }
  // api/_kb.js is dezelfde index als JavaScript-module, zodat de serverless functie hem zeker meeneemt.
  const mod = '// Gegenereerd door tools/build-kb.mjs uit kb/index.json. Niet met de hand wijzigen.\nexport default ' + JSON.stringify(index) + ';\n';
  if (CHECK) {
    if (!existsSync(join(ROOT, 'kb/index.json')) || read('kb/index.json') !== json) problems.push('kb/index.json past niet bij de bronnen (draai node tools/build-kb.mjs)');
    if (!existsSync(join(ROOT, 'kb/faq.md')) || read('kb/faq.md') !== faqMd) problems.push('kb/faq.md past niet bij veelgestelde-vragen.html');
    if (!existsSync(join(ROOT, 'api/_kb.js')) || read('api/_kb.js') !== mod) problems.push('api/_kb.js past niet bij kb/index.json');
  } else {
    writeFileSync(join(ROOT, 'kb/index.json'), json);
    writeFileSync(join(ROOT, 'kb/faq.md'), faqMd);
    writeFileSync(join(ROOT, 'api/_kb.js'), mod);
  }
  if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
  const tokens = Math.round(json.length / 4);
  console.log(`✓ kennisbasis ${CHECK ? 'klopt' : 'gebouwd'}: ${index.chunks.length} stukken, ±${tokens} tokens, kb_hash ${index.kb_hash.slice(0, 12)}`);
}
