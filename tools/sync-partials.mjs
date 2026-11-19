#!/usr/bin/env node
// HumanPush: één bron voor het stroomdiagram, de swimlane en de termijnen. Geen dependencies.
//
//   node tools/sync-partials.mjs          schrijft de partials en de termijnen in de pagina's
//   node tools/sync-partials.mjs --check  faalt als een pagina afwijkt van de bron (voor CI)
//
// Bronnen: partials/flow.html (+ flow-desktop.svg, flow-mobiel.svg, flow-leads.json),
// partials/swimlane.svg (+ swimlane-legenda.json) en rules.json.
// Markers in de pagina's:
//   <!--flow:start--> … <!--flow:end-->                 (optioneel: <!--flow:start variant=professionals-->)
//   <!--flowsvg:start--> … <!--flowsvg:end-->           (alleen de twee SVG's, voor de terugval op de homepage)
//   <!--swim:start--> … <!--swim:end-->
//   <span data-rule="turnWorkingMinutes">45</span>      (overal waar een termijn genoemd wordt)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const desktop = read('partials/flow-desktop.svg').trim();
const mobile = read('partials/flow-mobiel.svg').trim();
const leads = JSON.parse(read('partials/flow-leads.json'));

function flowBlock(variant) {
  const lead = leads[variant || 'default'];
  if (!lead) throw new Error(`onbekende flow-variant: ${variant}`);
  return read('partials/flow.html').trim()
    .replace('<!-- lead -->', `<p class="lead">${lead}</p>`)
    .replace('<!-- desktop-svg -->', desktop)
    .replace('<!-- mobiel-svg -->', mobile);
}
const flowSvgBlock = () => `<figure class="flow-figure">\n${desktop}\n${mobile}\n</figure>`;

function swimBlock() {
  const svg = read('partials/swimlane.svg').trim();
  const legend = JSON.parse(read('partials/swimlane-legenda.json'));
  const items = legend.map((t, i) => `<li><span class="ln" aria-hidden="true">${i + 1}</span><span>${t.replace(/\{(\w+)\}/g, (_, k) => span(k))}</span></li>`).join('');
  return `<div class="swimcard">\n${svg}\n</div>\n<p class="scroll-hint">Op een smal scherm schuift het diagram opzij; de genummerde lijst hieronder zegt hetzelfde.</p>\n<ol class="swimleg" aria-label="Legenda bij het diagram">${items}</ol>`;
}

function fill(html, file) {
  let out = html;
  out = out.replace(/<!--flow:start(?: variant=(\w+))?-->[\s\S]*?<!--flow:end-->/g, (m, v) => `<!--flow:start${v ? ' variant=' + v : ''}-->\n${flowBlock(v)}\n<!--flow:end-->`);
  out = out.replace(/<!--flowsvg:start-->[\s\S]*?<!--flowsvg:end-->/g, () => `<!--flowsvg:start-->\n${flowSvgBlock()}\n<!--flowsvg:end-->`);
  out = out.replace(/<!--swim:start-->[\s\S]*?<!--swim:end-->/g, () => `<!--swim:start-->\n${swimBlock()}\n<!--swim:end-->`);
  out = out.replace(/<(span|tspan) data-rule="(\w+)">[^<]*<\/\1>/g, (m, tag, k) => `<${tag} data-rule="${k}">${rv(k)}</${tag}>`);
  if ((out.match(/<!--flow:start/g) || []).length !== (out.match(/<!--flow:end-->/g) || []).length) throw new Error(`${file}: flow-markers kloppen niet`);
  return out;
}

const problems = [];
const pages = [...readdirSync(ROOT).filter((f) => f.endsWith('.html')),
  ...(existsSync(join(ROOT, 'pilot')) ? readdirSync(join(ROOT, 'pilot')).filter((f) => f.endsWith('.html')).map((f) => 'pilot/' + f) : [])];
const mustHaveFlow = ['index.html', 'hoe-het-werkt.html', 'agents.html', 'professionals.html'];
for (const f of pages) {
  const before = read(f);
  const after = fill(before, f);
  if (mustHaveFlow.includes(f) && !/<!--(flow|flowsvg):start/.test(after)) problems.push(`${f}: het stroomdiagram ontbreekt`);
  if (before !== after) {
    if (CHECK) problems.push(`${f}: wijkt af van de partials of rules.json (draai node tools/sync-partials.mjs)`);
    else writeFileSync(join(ROOT, f), after);
  }
}

// Termijnen die niet als <span data-rule> kunnen staan (platte tekst en de infographic): vaste zinnen uit rules.json.
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
    `${rules.turnWorkingMinutes} werkminuten`,
    `hooguit ${rules.maxTurnsPerPro} beurten`,
    `${rules.acceptCeilingWorkdays} werkdagen`,
    `${rules.payMinutes} minuten`,
    `${rules.objectionHours} uur`,
    `${rules.cancelSharePct}%`
  ],
  'assets/infographic.svg': [`${rules.turnWorkingMinutes} werkminuten`, `${rules.acceptCeilingWorkdays} werkdagen`]
};
for (const [f, phrases] of Object.entries(required)) {
  if (!existsSync(join(ROOT, f))) { problems.push(`${f}: ontbreekt`); continue; }
  const t = read(f);
  for (const p of phrases) if (!t.includes(p)) problems.push(`${f}: mist "${p}" (uit rules.json)`);
}

// Oude regel (4 werkuren, 3 beurten van 80 minuten) mag nergens meer staan.
const stale = /4 werkuren|4 working hours|80 werkminuten|80 working minutes|hooguit 3 (passende )?professionals|at most 3 matching|samen 4 werkuren/i;
const scan = [...pages, 'llms.txt', 'kb/spelregels.md', 'kb/faq.md', 'assets/infographic.svg', 'partials/swimlane.svg', 'partials/swimlane-legenda.json', 'partials/flow.html', 'chat.js'];
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
