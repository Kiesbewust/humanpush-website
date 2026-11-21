// HumanPush: de antwoordmotor. Eén codepad voor het chatvenster, POST /api/ask en de MCP-tool.
//   answer({ question, language }, { mode, kb, llm }) -> Result
// mode "extract" (standaard): geen model. BM25 over de kennisbasis, antwoord = letterlijk citaat + bron.
// mode "llm": het model kiest bron-id's; de server controleert elke id en haalt het citaat zelf uit de bron.
import KB from './_kb.js';
import { prefilter, detectLanguage, REFUSAL_TEXT, DISCLAIMER, HUMAN, DOMAIN } from './_policy.js';

const STOP = new Set(('zegt zeggen hoeveel gebeurt gebeuren happens happen de het een en of van voor in op met te om aan als dat die dit is zijn wordt worden kan kun kunnen mag moet je jij jouw ik mijn we wij ons onze er wat hoe wie welke wanneer waar waarom niet geen ook nog al dan nu bij naar over uit tot door heeft hebben heb had was zo wel mij me hij zijn haar ze zij hun deze dat '
  + 'the a an and or of for in on with to at is are be been does do did can could may might must my your our you i it its this that these those what how who which when where why not no also there here from by as about into than then them they he she his her we us').split(' '));

// Een paar vaste synoniemen, zodat "aannemen", "aanname" en "accept" hetzelfde woord zijn.
const SYN = [
  [/^(aanne\w*|aanname\w*|aangenomen|nemen|accept\w*)$/, 'aanname'],
  [/^(werkuur|werkuren|werktijd|working|werkminuten|werkdagen)$/, 'werkuren'],
  [/^(beurt\w*|turns?|aangeboden|aanbied\w*|aanbieding\w*|aanbod|doorge\w*|doorgeeft|doorgaf)$/, 'beurt'],
  [/^(betaa?l\w*|pay\w*|paid)$/, 'betalen'],
  [/^(annule\w*|cancel\w*)$/, 'annuleren'],
  [/^(bezwaar\w*|dispute\w*|object\w*)$/, 'bezwaar'],
  [/^(verbind\w*|koppel\w*|connect\w*)$/, 'verbinden'],
  [/^(aanmeld\w*|sign-?up|register(ing)?)$/, 'aanmelden'],
  [/^(vragen|vraag|ask\w*|questions?)$/, 'vragen'],
  [/^(niemand|nobody|no-one)$/, 'niemand'],
  [/^(lang|hoelang|duur\w*|long|reageren|respond|lasts?)$/, 'duur'],
  [/^(passkeys?)$/, 'passkey'],
  [/^(kiez\w*|kies\w*|kiest|choose|chooses|choosing|pick\w*)$/, 'kiezen'],
  [/^(professionals?|deskundigen?|experts?)$/, 'professional'],
  [/^(agents?)$/, 'agent'],
  [/^(registerbewijs\w*|registercheck\w*|registerverklaring\w*)$/, 'registercheck'],
  [/^(logboek\w*|bewijsdossier\w*|dossier\w*)$/, 'bewijsdossier'],
  [/^(hash\w*|vingerafdruk\w*|sha-?256)$/, 'vingerafdruk'],
  [/^(sleutel\w*|toegangscode\w*)$/, 'toegangscode']
];
export function tokens(s) {
  const out = [];
  for (let w of s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9_]+/g) || []) {
    if (STOP.has(w) || w.length < 2) continue;
    let mapped = null;
    for (const [re, to] of SYN) if (re.test(w)) { mapped = to; break; }
    if (!mapped) mapped = w.length > 5 ? w.replace(/(heden|ingen|en|es|s|e)$/, '') : w;
    out.push(mapped);
  }
  return out;
}

function makeIndex(kb) {
  const docs = kb.chunks.map((c) => { const t = tokens(c.title + ' ' + c.text); const tf = new Map(); for (const w of t) tf.set(w, (tf.get(w) || 0) + 1); return { c, tf, len: t.length, title: new Set(tokens(c.title.replace(/^llms\.txt: /, ''))) }; });
  const df = new Map();
  for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) || 0) + 1);
  const avg = docs.reduce((a, d) => a + d.len, 0) / docs.length;
  return { docs, df, avg, N: docs.length };
}
const cache = new WeakMap();
function indexOf(kb) { if (!cache.has(kb)) cache.set(kb, makeIndex(kb)); return cache.get(kb); }

export function search(kb, question, lang, k = 3) {
  const ix = indexOf(kb);
  const q = [...new Set(tokens(question))];
  const scored = ix.docs.map((d) => {
    let s = 0;
    for (const w of q) {
      const f = d.tf.get(w); if (!f) continue;
      const idf = Math.log(1 + (ix.N - ix.df.get(w) + 0.5) / (ix.df.get(w) + 0.5));
      s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.len / ix.avg));
      if (d.title.has(w)) s += idf * 1.5;
    }
    s *= d.c.lang === lang ? 2.5 : 1;
    if (d.c.source === 'faq' || d.c.source === 'spelregels') s *= 1.1;
    return { chunk: d.c, score: s };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return { hits: scored.slice(0, k), qtokens: q };
}

// Het citaat: de één of twee opeenvolgende zinnen uit de bron die het best bij de vraag passen. Altijd letterlijk.
export function bestQuote(text, qtokens) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9À-Ý"(])/).map((s) => s.trim()).filter(Boolean);
  const qs = new Set(qtokens);
  let best = { score: -1, quote: sentences[0] };
  for (let i = 0; i < sentences.length; i++) {
    for (const n of [1, 2]) {
      if (i + n > sentences.length) continue;
      const quote = sentences.slice(i, i + n).join(' ');
      if (quote.length > 480) continue;
      const t = tokens(quote);
      const hit = new Set(t.filter((w) => qs.has(w))).size;
      const score = hit - (n - 1) * 0.35 - (i === 0 ? 0 : 0.05) - (quote.length < 40 ? 1 : 0);
      if (score > best.score) best = { score, quote };
    }
  }
  if (!text.includes(best.quote)) throw new Error('citaat niet letterlijk');
  return best.quote;
}

const MIN_SCORE = 2.2;

function refusal(reason, lang, engine) {
  return { answerable: false, answer: REFUSAL_TEXT[lang][reason], language: lang, sources: [], refusal: { reason }, human_contact: HUMAN, disclaimer: DISCLAIMER[lang], engine };
}

function validQuestion(question) {
  return typeof question === 'string' && question.trim().length >= 3 && question.length <= 500;
}

export async function answer({ question, language } = {}, opts = {}) {
  const kb = opts.kb || KB;
  const mode = opts.mode === 'llm' ? 'llm' : 'extract';
  const engine = { mode, kb_hash: kb.kb_hash, kb_version: kb.kb_version };
  if (!validQuestion(question)) { const e = new Error('bad_request'); e.status = 400; throw e; }
  const q = question.trim();
  const lang = detectLanguage(q, language);

  const pre = prefilter(q);
  if (pre) return refusal(pre.reason, lang, engine);

  const { hits, qtokens } = search(kb, q, lang, 5);
  const inDomain = DOMAIN.test(q);
  if (!inDomain) return refusal('out_of_scope', lang, engine);
  if (!hits.length || hits[0].score < MIN_SCORE) return refusal('no_source', lang, engine);

  let chosen = [hits[0].chunk];
  if (mode === 'llm') {
    if (typeof opts.llm !== 'function') { const e = new Error('ask_unavailable'); e.status = 503; throw e; }
    const out = await opts.llm({ question: q, language: lang, candidates: hits.map((h) => ({ id: h.chunk.id, title: h.chunk.title, text: h.chunk.text })) });
    if (!out || out.answerable !== true) return refusal(REFUSAL_TEXT[lang][out?.refusal_reason] ? out.refusal_reason : 'no_source', lang, engine);
    const byId = new Map(kb.chunks.map((c) => [c.id, c]));
    const ids = Array.isArray(out.source_ids) ? out.source_ids.filter((id) => byId.has(id)) : [];
    if (!ids.length) return refusal('no_source', lang, engine);
    chosen = ids.slice(0, 2).map((id) => byId.get(id));
    const sources = chosen.map((c) => ({ id: c.id, title: c.title, url: c.url, quote: bestQuote(c.text, qtokens) }));
    const text = typeof out.answer === 'string' ? out.answer.slice(0, 1200) : '';
    if (!text || /€\s?\d|sandbox|blockchain/i.test(text)) return refusal('no_source', lang, engine);
    return { answerable: true, answer: text, language: lang, sources, refusal: null, human_contact: HUMAN, disclaimer: DISCLAIMER[lang], engine };
  }

  const quote = bestQuote(chosen[0].text, qtokens);
  const sources = [{ id: chosen[0].id, title: chosen[0].title, url: chosen[0].url, quote }];
  return { answerable: true, answer: quote, language: lang, sources, refusal: null, human_contact: HUMAN, disclaimer: DISCLAIMER[lang], engine };
}

// Voor de server en de tests: controleert dat elke bron bestaat en dat het citaat letterlijk in de bron staat.
export function validateSources(result, kb = KB) {
  const byId = new Map(kb.chunks.map((c) => [c.id, c]));
  return result.sources.every((s) => byId.has(s.id) && byId.get(s.id).text.includes(s.quote));
}
