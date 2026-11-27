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
const STATUS = { boekbaar: 'Eerste dienst', in_voorbereiding: 'Volgt', in_toetsing: 'In toetsing' };
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
    const klacht = r.klacht ? row('Oneens met de inhoud', `Geen grond voor geld terug. Ga naar de professional, of naar ${esc(r.klacht.naar)}: ${r.klacht.links.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.title)}</a>`).join(', ')}.`) : '';
    const scope = `<div class="svc-scope"><div><p class="label">Valt in de dienst</p><ul class="ticks">${li(r.in_scope)}</ul></div><div><p class="label">Valt erbuiten</p><ul class="crosses">${li(r.out_of_scope)}</ul></div></div>`;
    const proBody = `<dl class="svc-facts">${row('Wat je levert', withRules(p.levert))}${row('Vereiste registratie', withRules(p.registratie))}${row('Tijd om te reageren', `${span('turnWorkingMinutes')} minuten binnen werktijd per aangeboden opdracht, hooguit ${span('maxTurnsPerPro')} keer per opdracht. Doorgeven kost niets.`)}${row('Je prijs', `Je zet zelf je prijs en levertijd. Er gaat niets van af: de afhandelfee van ${span('feePct')}% betaalt het bedrijf bovenop je prijs. Reken je btw, dan is je prijs inclusief btw.`)}${row('Wat je tekent', withRules(p.tekent) + ' Altijd met je passkey.')}</dl>`;
    const bizBody = `<dl class="svc-facts">${row('Wat je krijgt', withRules(b.krijgt))}${row('Levertijd', 'De eigen levertijd van de professional, nooit later dan jouw uiterste datum.')}${r.status === 'in_toetsing' ? '' : row('Zo vraag je aan', 'Je agent kiest deze dienst, levert de stukken aan en geeft een uiterste datum en een maximumprijs. Het bedrijf betaalt via een betaallink.')}${klacht}${row('Bewijs', `Registercheck (hooguit ${span('attestationMaxAgeDays')} dagen oud, opnieuw gedaan bij de aanname), de digitale vingerafdruk van het stuk, de handtekening met de passkey van de professional en het dossier van de opdracht.`)}</dl>`;
    const part = (v, x, body, r) => `<div class="svc-v" data-v="${v}"${v === view ? '' : ' data-off'}><p class="svc-for">${v === 'pro' ? 'Voor de professional' : 'Voor het bedrijf'}</p><ul class="chips">${x.chips.map((c) => `<li>${withRules(c)}</li>`).join('')}</ul><p class="svc-line">${withRules(x.regel)}</p>${vanafLine(r.vanaf_cents)}<details class="svc-more"><summary>Details</summary>${body}${scope}</details></div>`;
    return `<section class="svc-card" id="${r.id}" aria-labelledby="${r.id}-kop" data-panel="${r.id}">`
      + `<header class="svc-top"><span class="badge">${esc(r.badge)}</span><span class="status${r.status === 'boekbaar' ? '' : ' prep'}">${STATUS[r.status]}</span></header>`
      + `<h3 id="${r.id}-kop">${esc(r.dienst)}</h3><p class="svc-uitleg"><strong>${esc(r.tab)}:</strong> ${esc(r.uitleg)}</p><p class="svc-reg">${esc(r.beroep)} · ${esc(r.registernaam)}</p>`
      + (r.toetsing ? `<p class="svc-toetsing">${esc(r.toetsing)}</p>` : '') + part('pro', p, proBody, r) + part('bedrijf', b, bizBody, r) + (r.status === 'in_toetsing' ? '</section>' : `<details class="voor-bouwer"><summary>Voor je bouwer</summary><p>Dienst <code>${esc(r.service_id)}</code>. Bestellen met <code>v1_create_order</code>: <code>service_id</code>, de invoer uit <code>list_services</code>, een uiterste datum en <code>max_price_cents</code>. Meer op <a href="/agents">/agents</a>.</p></details></section>`);
  }).join('\n');
  return `<div class="svc" data-svc data-view="${view}">\n<div class="svc-bar"><nav class="svc-tabs" aria-label="Registers">${tabs}</nav><div class="svc-toggle" role="group" aria-label="Bekijk de dienst als">${toggle}</div></div>\n<div class="svc-panels">\n${panels}\n</div>\n</div>`;
}

// Stappen: één bron (partials/stappen.json). Vier stappen plus een dossierlint.
// De vijfde stap (Dossier) is het lint, niet een vijfde kolom.
const ico = (n, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function stappenBlock(view) {
  const s = JSON.parse(read('partials/stappen.json'));
  const steps = s[view];
  if (!steps || steps.length !== 4) throw new Error(`stappenweergave ${view}: verwacht 4 stappen`);
  const lis = steps.map((st) => `<li class="ig-step"><span class="ig-badge">${ico(st.ico)}</span><h3>${esc(st.titel)}</h3><p>${withRules(st.tekst)}</p><span class="ig-time">${ico('clock')}${withRules(st.tijd)}</span></li>`).join('');
  const lint = s.lint;
  const ribbon = `<div class="ig-ribbon">${ico('doc')}<p><strong>${esc(lint.strong)}</strong> ${esc(lint.tekst)} <a href="${esc(lint.href)}">${esc(lint.link)}</a></p></div>`;
  const rule = `<p class="tl-rule">${esc(s.regel)} <a href="${s.regel_link.href}">${esc(s.regel_link.tekst)}</a></p>`;
  return `<div class="ig" data-view="${view}">\n<ol class="ig-steps" aria-label="De vier stappen">${lis}</ol>\n${ribbon}\n${rule}\n</div>`;
}

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="i-order" viewBox="0 0 28 28"><path d="M7 3.5h10l5 5V24a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M17 3.5v5h5M10 14h8M10 18h8"/></symbol>
<symbol id="i-person" viewBox="0 0 28 28"><circle cx="14" cy="9.5" r="4.5"/><path d="M5.5 24c.8-5 4-7.5 8.5-7.5s7.7 2.5 8.5 7.5"/></symbol>
<symbol id="i-pen" viewBox="0 0 28 28"><path d="M5 23l1.2-5L18.5 5.7a2.1 2.1 0 0 1 3 0l.8.8a2.1 2.1 0 0 1 0 3L10 21.8z"/><path d="M16.5 7.7l3.8 3.8M14 23h9"/></symbol>
<symbol id="i-check" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10"/><path d="M9.5 14.5l3.3 3.3 6-6.6"/></symbol>
<symbol id="i-doc" viewBox="0 0 28 28"><rect x="5" y="3.5" width="18" height="21" rx="1.5"/><path d="M9 9h10M9 13h10M9 17h6"/><path d="M17.5 20.5l1.7 1.7 3-3.4"/></symbol>
<symbol id="i-building" viewBox="0 0 28 28"><rect x="6" y="4" width="16" height="20" rx="1"/><path d="M10 9h2M16 9h2M10 13h2M16 13h2M10 17h2M16 17h2M12 24v-3.5h4V24"/></symbol>
<symbol id="i-shield" viewBox="0 0 28 28"><path d="M14 3.5l9 3.3v6.7c0 5.6-3.8 9.4-9 11-5.2-1.6-9-5.4-9-11V6.8z"/><path d="M10 13.8l3 3 5-5.4"/></symbol>
<symbol id="i-clock" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10"/><path d="M14 8v6l4 2.5"/></symbol>
<symbol id="i-euro" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10"/><path d="M18.5 10.5a5 5 0 1 0 0 7M8.5 13h6.5M8.5 15.2H15"/></symbol>
<symbol id="i-key" viewBox="0 0 28 28"><circle cx="9.5" cy="14" r="4.5"/><path d="M14 14h10M20 14v4M23.5 14v3"/></symbol>
<symbol id="i-mail" viewBox="0 0 28 28"><rect x="4" y="6.5" width="20" height="15" rx="1.5"/><path d="M4.5 8l9.5 7 9.5-7"/></symbol>
<symbol id="i-phone" viewBox="0 0 28 28"><rect x="8" y="3.5" width="12" height="21" rx="2"/><path d="M12.5 21h3"/><path d="M11.5 12.5l2 2 3.5-4"/></symbol>
<symbol id="i-arrow" viewBox="0 0 28 28"><path d="M5 14h17M16 8l6 6-6 6"/></symbol>
<symbol id="i-yes" viewBox="0 0 18 18"><path d="M3.5 9.5l3.5 3.5 7.5-8"/></symbol>
<symbol id="i-no" viewBox="0 0 18 18"><path d="M4.5 4.5l9 9M13.5 4.5l-9 9"/></symbol>
</defs></svg>`;

function who() {
  return `<div class="ig-who" aria-label="Wie doet wat">
<article class="who"><header>${ico('building')}<h3>Het bedrijf en zijn agent</h3></header><ul>
<li>${ico('yes') }Kiest de dienst en geeft de stukken en de uiterste datum</li>
<li>${ico('yes') }Betaalt vooraf en keurt goed</li>
<li class="no">${ico('no') }Kiest nooit zelf een persoon</li></ul></article>
<article class="who"><header>${ico('person')}<h3>De professional</h3></header><ul>
<li>${ico('yes') }Doet het vakwerk en tekent met zijn passkey</li>
<li>${ico('yes') }Staat voor de inhoud in, onder zijn eigen beroepsregels</li>
<li class="no">${ico('no') }Tekent altijd zelf; een agent kan niet voor hem tekenen</li></ul></article>
<article class="who hp"><header>${ico('shield')}<h3>HumanPush</h3></header><ul>
<li>${ico('yes') }Let op het proces: in het register, op tijd, getekend, niet veranderd</li>
<li>${ico('yes') }Regelt de betaling en het dossier</li>
<li class="no">${ico('no') }Oordeelt niet over de inhoud van het werk</li></ul></article>
</div>`;
}

function misgaat(full, voice) {
  const je = voice === 'bedrijf';
  const rows = [
    ['all', 'Alles terug', '', 'Niemand neemt de opdracht aan', 'Professionals nemen de opdracht niet aan, of niemand kan leveren binnen 72 uur.'],
    ['all', 'Alles terug', '', 'De professional levert te laat of het stuk klopt niet', je
      ? `De professional levert later dan de uiterste datum. Of er mist iets verplicht, de registratie was niet geldig, of het formaat klopt niet. Het systeem stelt dit zelf vast. Meld het binnen ${span('objectionHours')} uur na oplevering. Dan krijg je alles terug.`
      : `De professional levert later dan de uiterste datum. Of er mist iets verplicht, de registratie was niet geldig, of het formaat klopt niet. Het systeem stelt dit zelf vast. Het bedrijf meldt het binnen ${span('objectionHours')} uur na oplevering. Dan krijgt het bedrijf alles terug.`],
    ['space', 'Alles terug', '', 'De professional trekt zich terug of levert later dan de uiterste datum', je ? 'Je kunt opnieuw bestellen.' : 'Het bedrijf kan opnieuw bestellen.'],
    ['all', 'Alles terug', '', je ? 'Je annuleert vóór iemand de opdracht heeft aangenomen' : 'Het bedrijf annuleert vóór iemand de opdracht heeft aangenomen', '']
  ];
  if (full) rows.push(['part', 'Rest terug', `de professional houdt ${span('cancelSharePct')}%`, je ? 'Je annuleert na aanname, vóór de oplevering' : 'Het bedrijf annuleert na aanname, vóór de oplevering', `De professional houdt ${span('cancelSharePct')}% van zijn prijs. De rest gaat terug.`]);
  rows.push(['none', 'Geen terugbetaling', 'via ons', je ? 'Je bent het niet eens met het oordeel van de professional' : 'Het bedrijf is het niet eens met het oordeel van de professional', je ? 'Wij beslissen daar niet over. Een bezwaar kan alleen bij een fout die het systeem meet. Praat met de professional, of ga naar de klachtroute van zijn register.' : 'HumanPush beslist daar niet over. Een bezwaar kan alleen bij een fout die het systeem meet. Het bedrijf praat met de professional, of gaat naar de klachtroute van zijn register.']);
  const out = rows.map(([k, b, extra, when, small]) => {
    const ex = extra ? `<span>${extra}</span>` : '';
    const sm = small ? `<small>${small}</small>` : '';
    const tone = k === 'space' ? 'all' : k;
    const cls = k === 'none' ? 'row sep' : (k === 'space' ? 'row space-after' : 'row');
    return `<li class="${cls}"><div class="when">${when}${sm}</div><div class="arrow">${ico('arrow', 'ico ico-s')}</div><div class="out ${tone}"><b>${b}</b>${ex}</div></li>`;
  }).join('');
  return `<ul class="ig-rows" aria-label="Wat gebeurt er als het misgaat">${out}</ul>`;
}

function geld(voice) {
  const je = voice === 'bedrijf';
  const label = je ? 'Wat jij betaalt, als bedrijf' : 'Wat het bedrijf betaalt';
  const note = je
    ? 'Voorbeeld met ronde bedragen. De opdracht is € 1.000. HumanPush is 5%, dat is € 50. Jij betaalt € 1.050. Alle bedragen zijn exclusief btw.'
    : 'Voorbeeld met ronde bedragen. De opdracht is € 1.000. HumanPush is 5%, dat is € 50. Het bedrijf betaalt € 1.050. Alle bedragen zijn exclusief btw.';
  const uur = je ? 'Jij reclameert, of zegt niets' : 'Het bedrijf reclameert, of zegt niets';
  return `<div class="ig-money" aria-label="${label}">
<p class="ig-kicker">${label}</p>
<div><p class="barlabel"><span>Prijs van de opdracht plus 5% HumanPush</span><em>€ 1.050</em></p>
<div class="bar" role="img" aria-label="Opdracht 1000 euro, HumanPush 50 euro, samen 1050 euro, exclusief btw"><span class="p" style="flex:1000">Opdracht € 1.000</span><span class="f" style="flex:50"></span></div></div>
<p class="ig-note">${note}</p>
<ol class="ig-time-line"><li><i></i><b>Bestellen</b>${je ? 'Jij betaalt vooraf' : 'Het bedrijf betaalt vooraf'}</li><li><i></i><b>Aanname</b>Een lagere prijs gaat terug</li><li><i></i><b>Oplevering</b>Getekend stuk</li><li><i></i><b>72 uur</b>${uur}</li><li><i></i><b>Uitbetaling</b>De professional krijgt zijn volledige prijs</li></ol>
</div>`;
}

function toegang() {
  return `<ol class="ig-flow" aria-label="Zo kom je erin">
<li class="flow">${ico('mail')}<p class="n">Stap 1</p><h3>Je krijgt één link</h3><p>We sturen hem naar een contactadres dat wij zelf controleren, bijvoorbeeld uit het register. Nooit naar een adres dat je zelf opgeeft.</p></li>
<li class="flow">${ico('phone')}<p class="n">Stap 2</p><h3>Je maakt twee passkeys</h3><p>Eén om mee te werken en één als reserve. Met een eigen agent haal je via dezelfde link ook de toegangscode voor je agent op.</p></li>
<li class="flow">${ico('pen')}<p class="n">Stap 3</p><h3>Tekenen doe je zelf</h3><p>Altijd met je passkey. Een agent kan nooit voor je tekenen.</p></li>
</ol>
<p class="ig-note">De link werkt één keer en dient alleen hiervoor.</p>`;
}

const ROLLABEL = {
  nivre: ['Schade-expert', 'NIVRE'],
  nrvt: ['Woningtaxateur', 'NRVT'],
  nrbi: ['Bouwkundig inspecteur', 'NRBI'],
  nrgd: ['Gerechtelijk deskundige digitaal onderzoek', 'NRGD'],
  octrooi: ['Octrooigemachtigde', 'Octrooiregister']
};
function rollenBlock() {
  const { registers } = JSON.parse(read('partials/diensten.json'));
  const li = registers.map((r) => {
    const naam = ROLLABEL[r.id];
    if (!naam) throw new Error(`geen rollabel voor ${r.id}`);
    return `<li${r.status === 'boekbaar' ? ' class="first"' : ''}><b>${esc(naam[0])}</b>${esc(naam[1])}<span>${STATUS[r.status]}</span></li>`;
  }).join('');
  return `<ul class="regs">${li}</ul>`;
}

function igBlock(name, variant) {
  if (name === 'who') return who();
  if (name === 'misgaat') return misgaat(variant === 'vol' || variant === 'volbedrijf', variant === 'volbedrijf' ? 'bedrijf' : 'algemeen');
  if (name === 'geld') return geld(variant === 'bedrijf' ? 'bedrijf' : 'algemeen');
  if (name === 'toegang') return toegang();
  throw new Error(`onbekende infographic: ${name}`);
}

// Catalogus: alle registers gelijkwaardig, NIVRE eerst, elk met een eerlijke status.
function catalogusBlock() {
  const { registers } = JSON.parse(read('partials/diensten.json'));
  const li = registers.map((r) => `<li><strong>${esc(r.beroep)} (${esc(r.tab)}).</strong> ${esc(r.kort)} <span class="status${r.status === 'boekbaar' ? '' : ' prep'}">${STATUS[r.status]}</span></li>`).join('');
  return `<ul class="catalogus">${li}</ul>`;
}

function fill(html, file) {
  let out = html;
  out = out.replace(/<!--stappen:start view=(\w+)-->[\s\S]*?<!--stappen:end-->/g, (m, v) => `<!--stappen:start view=${v}-->\n${stappenBlock(v)}\n<!--stappen:end-->`);
  out = out.replace(/<!--diensten:start view=(\w+)( only=(\w+))?-->[\s\S]*?<!--diensten:end-->/g, (m, v, o, only) => `<!--diensten:start view=${v}${o || ''}-->\n${dienstenBlock(v, only)}\n<!--diensten:end-->`);
  out = out.replace(/<!--catalogus:start-->[\s\S]*?<!--catalogus:end-->/g, () => `<!--catalogus:start-->\n${catalogusBlock()}\n<!--catalogus:end-->`);
  out = out.replace(/<!--sprite:start-->[\s\S]*?<!--sprite:end-->/g, () => `<!--sprite:start-->\n${SPRITE}\n<!--sprite:end-->`);
  out = out.replace(/<!--rollen:start-->[\s\S]*?<!--rollen:end-->/g, () => `<!--rollen:start-->\n${rollenBlock()}\n<!--rollen:end-->`);
  out = out.replace(/<!--ig:start name=(\w+)(?: variant=(\w+))?-->[\s\S]*?<!--ig:end-->/g, (m, name, variant) => `<!--ig:start name=${name}${variant ? ` variant=${variant}` : ''}-->\n${igBlock(name, variant)}\n<!--ig:end-->`);
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
