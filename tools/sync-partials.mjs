#!/usr/bin/env node
// HumanPush: één bron voor de dienstkaarten en de termijnen. Geen dependencies.
//
//   node tools/sync-partials.mjs          schrijft de partials en de termijnen in de pagina's
//   node tools/sync-partials.mjs --check  faalt als een pagina afwijkt van de bron (voor CI)
//
// Bronnen: partials/diensten.json en rules.json.
// Markers in de pagina's:
//   <!--diensten:start view=pro|bedrijf--> … <!--diensten:end-->
//   <span data-rule="turnWorkingMinutes">45</span>      (overal waar een termijn genoemd wordt)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const rules = JSON.parse(read('rules.json'));
const ruleKeys = Object.keys(rules).filter((k) => typeof rules[k] === 'number');
const rv = (k) => {
  if (!ruleKeys.includes(k)) throw new Error(`onbekende regel in data-rule: ${k}`);
  return String(rules[k]);
};
const span = (k) => `<span data-rule="${k}">${rv(k)}</span>`;

// Dienstkaarten: één bron (partials/diensten.json), twee kijkrichtingen. Zonder JavaScript staat alles open en zichtbaar;
// site.js maakt er tabs (per register), een schakelaar (professional | bedrijf) en ingeklapte details van.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Vanaf-prijs op elke dienstkaart: de laagste prijs die nu geldt, voor iedereen dezelfde. null = nog geen professionals aangemeld.
export function vanafLine(cents) {
  if (cents === null || cents === undefined) return '<p class="svc-vanaf">Vanaf-prijs: volgt zodra professionals zich hebben aangemeld</p>';
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`ongeldige vanaf_cents: ${cents}`);
  const euro = (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace('.', ',')).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `<p class="svc-vanaf">Vanaf € ${euro} · laagste prijs die nu geldt</p>`;
}
const withRules = (s) => esc(s).replace(/\{(\w+)\}/g, (_, k) => span(k));
const STATUS = { boekbaar: null, in_voorbereiding: 'In voorbereiding', in_toetsing: 'In toetsing: niet te boeken' };
function dienstenBlock(view, only) {
  if (view !== 'pro' && view !== 'bedrijf') throw new Error(`onbekende dienstenweergave: ${view}`);
  let { registers } = JSON.parse(read('partials/diensten.json'));
  for (const r of registers) if (!(r.status in STATUS)) throw new Error(`${r.id}: onbekende status ${r.status}`);
  if (only) registers = registers.filter((r) => r.status === only);
  const li = (xs) => xs.map((x) => `<li>${withRules(x)}</li>`).join('');
  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const tabs = registers.map((r, i) => `<a class="svc-tab" href="#${r.id}" id="tab-${r.id}" data-tab="${r.id}"${i ? '' : ' aria-current="true"'}>${esc(r.tab)}</a>`).join('');
  const views = [['pro', 'Voor de professional'], ['bedrijf', 'Voor het bedrijf']];
  const toggle = views.map(([v, label]) => `<button type="button" class="svc-view" data-view="${v}" aria-pressed="${v === view}">${label}</button>`).join('');
  const panels = registers.map((r) => {
    const p = r.pro, b = r.bedrijf;
    const scope = `<div class="svc-scope"><div><p class="label">Valt in de dienst</p><ul class="ticks">${li(r.in_scope)}</ul></div><div><p class="label">Valt erbuiten</p><ul class="crosses">${li(r.out_of_scope)}</ul></div></div>`;
    const proBody = `<dl class="svc-facts">${row('Wat je levert', withRules(p.levert))}${row('Vereiste registratie', withRules(p.registratie))}${row('Tijd om te reageren', `${span('turnWorkingMinutes')} minuten binnen werktijd per aangeboden opdracht, hooguit ${span('maxTurnsPerPro')} keer per opdracht. Doorgeven kost niets.`)}${row('Je prijs', `Je zet zelf je prijs en levertijd. Er gaat niets van af: de afhandelfee van ${span('feePct')}% betaalt het bedrijf bovenop je prijs. Reken je btw, dan is je prijs inclusief btw.`)}${row('Wat je tekent', withRules(p.tekent) + ' Altijd met je passkey.')}</dl>`;
    const bizBody = `<dl class="svc-facts">${row('Wat je krijgt', withRules(b.krijgt))}${row('Levertijd', 'De eigen levertijd van de professional, nooit later dan jouw uiterste datum.')}${row('Zo vraag je aan', 'Je agent kiest deze dienst, levert de stukken aan en geeft een uiterste datum en een maximumprijs. Het bedrijf betaalt via een betaallink.')}${row('Bewijs', `Registercheck (hooguit ${span('attestationMaxAgeDays')} dagen oud, opnieuw gedaan bij de aanname), de digitale vingerafdruk van het stuk, de handtekening met de passkey van de professional en het dossier van de opdracht.`)}</dl>`;
    const part = (v, x, body, r) => `<div class="svc-v" data-v="${v}"${v === view ? '' : ' data-off'}><p class="svc-for">${v === 'pro' ? 'Voor de professional' : 'Voor het bedrijf'}</p><ul class="chips">${x.chips.map((c) => `<li>${withRules(c)}</li>`).join('')}</ul><p class="svc-line">${withRules(x.regel)}</p>${vanafLine(r.vanaf_cents)}<details class="svc-more"${r.status === 'boekbaar' ? ' open' : ''}><summary>Details</summary>${body}${scope}</details></div>`;
    return `<section class="svc-card" id="${r.id}" aria-labelledby="${r.id}-kop" data-panel="${r.id}">`
      + `<header class="svc-top"><span class="badge">${esc(r.badge)}</span><span class="status${STATUS[r.status] ? ' prep' : ''}">${STATUS[r.status] || `${span('turnWorkingMinutes')} min binnen werktijd om aan te nemen`}</span></header>`
      + `<h3 id="${r.id}-kop">${esc(r.dienst)}</h3><p class="svc-uitleg"><strong>${esc(r.tab)}:</strong> ${esc(r.uitleg)}</p><p class="svc-reg">${esc(r.beroep)} · ${esc(r.registernaam)}</p>`
      + part('pro', p, proBody, r) + part('bedrijf', b, bizBody, r) + `<details class="voor-bouwer"><summary>Voor je bouwer</summary><p>Dienst <code>${esc(r.service_id)}</code>. Bestellen met <code>v1_create_order</code>: <code>service_id</code>, de invoer uit <code>list_services</code>, een uiterste datum en <code>max_price_cents</code>. Meer op <a href="/agents">/agents</a>.</p></details></section>`;
  }).join('\n');
  return `<div class="svc" data-svc data-view="${view}">\n<div class="svc-bar"><nav class="svc-tabs" aria-label="Registers">${tabs}</nav><div class="svc-toggle" role="group" aria-label="Bekijk de dienst als">${toggle}</div></div>\n<div class="svc-panels">\n${panels}\n</div>\n</div>`;
}

// Stappenblok: één bron (partials/stappen.json), twee kijkrichtingen (neutraal voor bedrijven en agents, pro met "jij").
// Een tijdlijn met vijf stappen, per stap een rol. Zonder JavaScript gewoon een genummerde lijst.
const ICON = {
  agent: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="4" width="11" height="8" rx="1.5"/><path d="M6 8h.01M10 8h.01M8 2v2"/></svg>',
  hp: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3v10M13 3v10M3 8h10"/></svg>',
  pro: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.6-2.4 2.6-3.7 5-3.7s4.4 1.3 5 3.7"/></svg>'
};
function stappenBlock(view) {
  const s = JSON.parse(read('partials/stappen.json'));
  const steps = s[view];
  if (!steps) throw new Error(`onbekende stappenweergave: ${view}`);
  const lis = steps.map((st, i) => {
    const t = s.tijden[String(i + 1)];
    const time = t ? `<span class="tl-time">${withRules(t)}</span>` : '';
    return `<li class="tl-step r-${st.rol}${st.rol === 'professional' ? ' signed' : ''}"><span class="tl-dot" aria-hidden="true">${i + 1}</span><span class="tl-role">${esc(st.rolnaam)}</span><h3>${esc(st.titel)}</h3><p>${withRules(st.tekst)}</p>${time}</li>`;
  }).join('');
  const band = `<p class="tl-band"><span class="tl-ic">${ICON.agent}Agent</span><span aria-hidden="true">↔</span><span class="tl-ic">${ICON.hp}HumanPush</span><span aria-hidden="true">↔</span><span class="tl-ic">${ICON.pro}Professional</span><span class="tl-band-t">${esc(s.onderkop)}</span></p>`;
  const rule = `<p class="tl-rule">${esc(s.regel)} <a href="${s.regel_link.href}">${esc(s.regel_link.tekst)}</a></p>`;
  return `<div class="stappen" data-view="${view}">\n<ol class="tl">${lis}</ol>\n${band}\n${rule}\n</div>`;
}

// "Ook in voorbereiding": de diensten die nog niet te boeken zijn, elk in één regel.
function voorbereidingBlock() {
  const { registers } = JSON.parse(read('partials/diensten.json'));
  const li = registers.filter((r) => r.status !== 'boekbaar').map((r) => `<li><strong>${esc(r.beroep)} (${esc(r.tab)}).</strong> ${esc(r.kort)} <span class="status prep">${STATUS[r.status]}</span></li>`).join('');
  return `<ul class="voorbereiding">${li}</ul>`;
}

function fill(html, file) {
  let out = html;
  out = out.replace(/<!--stappen:start view=(\w+)-->[\s\S]*?<!--stappen:end-->/g, (m, v) => `<!--stappen:start view=${v}-->\n${stappenBlock(v)}\n<!--stappen:end-->`);
  out = out.replace(/<!--diensten:start view=(\w+)( only=(\w+))?-->[\s\S]*?<!--diensten:end-->/g, (m, v, o, only) => `<!--diensten:start view=${v}${o || ''}-->\n${dienstenBlock(v, only)}\n<!--diensten:end-->`);
  out = out.replace(/<!--voorbereiding:start-->[\s\S]*?<!--voorbereiding:end-->/g, () => `<!--voorbereiding:start-->\n${voorbereidingBlock()}\n<!--voorbereiding:end-->`);
  out = out.replace(/<(span|tspan) data-rule="(\w+)">[^<]*<\/\1>/g, (m, tag, k) => `<${tag} data-rule="${k}">${rv(k)}</${tag}>`);
  if (/<!--(flow|flowsvg|swim):start/.test(out)) throw new Error(`${file}: het oude stroomdiagram of de swimlane staat er nog`);
  return out;
}

function main() {
const problems = [];
const pages = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...(existsSync(join(ROOT, 'pilot')) ? readdirSync(join(ROOT, 'pilot')).filter((f) => f.endsWith('.html')).map((f) => 'pilot/' + f) : [])];
for (const f of pages) {
  const before = read(f);
  const after = fill(before, f);
  if (before !== after) {
    if (CHECK) problems.push(`${f}: wijkt af van de partials of rules.json (draai node tools/sync-partials.mjs)`);
    else writeFileSync(join(ROOT, f), after);
  }
}

// Termijnen die niet als <span data-rule> kunnen staan (platte tekst): vaste zinnen uit rules.json.
const required = {
  'llms.txt': [
    `${rules.turnWorkingMinutes} working minutes`,
    `at most ${rules.maxTurnsPerPro} turns per professional`,
    `${rules.acceptCeilingWorkdays} working days`,
    `within ${rules.payMinutes} minutes`,
    `${rules.objectionHours} hours`,
    `${rules.cancelSharePct}%`,
    'Monday–Friday 09:00–17:00 Europe/Amsterdam'
  ],
  'kb/spelregels.md': [
    `${rules.turnWorkingMinutes} minuten binnen werktijd`,
    `hooguit ${rules.maxTurnsPerPro} keer aangeboden`,
    `${rules.acceptCeilingWorkdays} werkdagen`,
    `${rules.payMinutes} minuten`,
    `${rules.objectionHours} uur`,
    `${rules.cancelSharePct}%`
  ]
};
for (const [f, phrases] of Object.entries(required)) {
  if (!existsSync(join(ROOT, f))) { problems.push(`${f}: ontbreekt`); continue; }
  const t = read(f);
  for (const p of phrases) if (!t.includes(p)) problems.push(`${f}: mist "${p}" (uit rules.json)`);
}

// Oude regel (4 werkuren, 3 beurten van 80 minuten) mag nergens meer staan.
const stale = /4 werkuren|4 working hours|80 werkminuten|80 working minutes|hooguit 3 (passende )?professionals|at most 3 matching|samen 4 werkuren/i;
const scan = [...pages, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'partials/diensten.json', 'chat.js'];
for (const f of scan) {
  if (!existsSync(join(ROOT, f))) continue;
  const m = read(f).match(stale);
  if (m) problems.push(`${f}: oude aanneemregel gevonden: "${m[0]}"`);
}

if (problems.length) {
  console.error(problems.map((p) => '✗ ' + p).join('\n'));
  process.exit(1);
}
console.log(CHECK ? `✓ partials en termijnen kloppen (${pages.length} pagina's)` : `✓ bijgewerkt (${pages.length} pagina's)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
