// HumanPush: POST /api/ask. Dun: HTTP, validatie, zachte limieten en headers. De motor staat in _engine.js.
// Vlaggen (Vercel env): ASK_ENABLED (standaard uit: 503 ask_disabled), ASK_MODE (extract | llm, standaard extract),
// ASK_DAILY_CAP (standaard 500 modelaanroepen per dag). Er wordt niets gelogd of bewaard: geen vraag, geen antwoord,
// geen IP-adres. Alleen een anonieme teller per dag, in het geheugen van deze functie.
import { answer } from './_engine.js';
import { llmCall } from './_llm.js';
import { HUMAN } from './_policy.js';

const MAX_BYTES = 4096;
const counters = { day: '', llm: 0, asks: 0, refusals: {} };

function headers(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}
function send(res, status, body) { res.statusCode = status; res.end(JSON.stringify(body)); }
function err(res, status, error, extra = {}) { send(res, status, { error, human_contact: HUMAN, ...extra }); }

export function count(day, reason, usedLlm) {
  if (counters.day !== day) { counters.day = day; counters.llm = 0; counters.asks = 0; counters.refusals = {}; }
  counters.asks++;
  if (usedLlm) counters.llm++;
  if (reason) counters.refusals[reason] = (counters.refusals[reason] || 0) + 1;
}
export const _counters = counters;

async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return { raw, parsed: typeof req.body === 'string' ? null : req.body };
  }
  const parts = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > MAX_BYTES) return { raw: null, tooLarge: true }; parts.push(c); }
  return { raw: Buffer.concat(parts).toString('utf8'), parsed: null };
}

export default async function handler(req, res, env = process.env, deps = {}) {
  headers(res);
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return err(res, 405, 'method_not_allowed');
  if (env.ASK_ENABLED !== 'true') return err(res, 503, 'ask_disabled', { message: 'Vragen aan HumanPush in tekst komen eraan.' });

  const len = Number(req.headers?.['content-length'] || 0);
  if (len > MAX_BYTES) return err(res, 413, 'too_large');
  const body = await readBody(req);
  if (body.tooLarge || (body.raw && Buffer.byteLength(body.raw) > MAX_BYTES)) return err(res, 413, 'too_large');
  let data = body.parsed;
  if (!data) { try { data = JSON.parse(body.raw || ''); } catch { return err(res, 400, 'bad_request'); } }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return err(res, 400, 'bad_request');
  const extra = Object.keys(data).filter((k) => k !== 'question' && k !== 'language');
  if (extra.length) return err(res, 400, 'bad_request');
  if (data.language !== undefined && data.language !== 'nl' && data.language !== 'en') return err(res, 400, 'bad_request');
  if (typeof data.question !== 'string' || data.question.trim().length < 3 || data.question.length > 500) return err(res, 400, 'bad_request');

  const mode = env.ASK_MODE === 'llm' ? 'llm' : 'extract';
  const day = new Date().toISOString().slice(0, 10);
  const cap = Number(env.ASK_DAILY_CAP || 500);
  if (mode === 'llm' && counters.day === day && counters.llm >= cap) return err(res, 503, 'busy', { message: 'Vandaag is het maximum aantal vragen bereikt; een mens helpt je via info@humanpush.nl.' });

  try {
    const llm = mode === 'llm' ? (deps.llm || ((args) => llmCall(args, env))) : undefined;
    const result = await Promise.race([
      answer({ question: data.question, language: data.language }, { mode, llm }),
      new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('busy'), { status: 503 })), 8000).unref?.())
    ]);
    count(day, result.refusal?.reason, mode === 'llm' && !result.refusal);
    return send(res, 200, result);
  } catch (e) {
    if (e.status === 400) return err(res, 400, 'bad_request');
    return err(res, 503, e.message === 'ask_unavailable' ? 'ask_unavailable' : 'busy');
  }
}
