// Tests voor de antwoordmotor en POST /api/ask. Geen netwerk, geen model: de modelstap is altijd een mock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { answer, validateSources } from '../api/_engine.js';
import { prefilter, REASONS } from '../api/_policy.js';
import handler from '../api/ask.js';
import KB from '../api/_kb.js';

const golden = JSON.parse(readFileSync(new URL('./ask-golden.json', import.meta.url), 'utf8'));
const FORBIDDEN = /€\s?\d|sandbox|blockchain|\bRSIN\b|vestigingsnummer|v1-testtak|\/v1\/pro\b/i;

test('gouden set: minstens 30 vragen', () => {
  assert.ok(golden.length >= 30, `${golden.length} vragen`);
  for (const g of golden) assert.ok(g.expect === 'answer' || REASONS.includes(g.expect), g.question);
});

for (const g of golden) {
  test(`gouden set (extract): ${g.question}`, async () => {
    const r = await answer({ question: g.question }, { mode: 'extract' });
    assert.equal(r.engine.mode, 'extract');
    assert.equal(r.human_contact, 'info@humanpush.nl');
    assert.ok(r.disclaimer.length > 20);
    if (g.language) assert.equal(r.language, g.language);
    assert.doesNotMatch(r.answer, FORBIDDEN);
    if (g.expect === 'answer') {
      assert.equal(r.answerable, true, `verwacht antwoord, kreeg ${r.refusal?.reason}`);
      assert.equal(r.refusal, null);
      assert.ok(r.sources.length >= 1);
      assert.ok(validateSources(r), 'elke bron bestaat en het citaat staat letterlijk in de bron');
      for (const s of r.sources) assert.match(s.url, /^https:\/\/humanpush\.nl\//);
      for (const m of g.must_contain || []) assert.ok(r.answer.includes(m), `"${m}" ontbreekt in: ${r.answer}`);
      if (g.must_contain_any) assert.ok(g.must_contain_any.some((m) => r.answer.includes(m)), `geen van ${g.must_contain_any} in: ${r.answer}`);
      if (g.must_cite_any) assert.ok(r.sources.some((s) => g.must_cite_any.includes(s.id)), `bron ${r.sources[0].id}`);
    } else {
      assert.equal(r.answerable, false);
      assert.deepEqual(r.refusal, { reason: g.expect });
      assert.deepEqual(r.sources, []);
    }
  });
}

test('de kennisbasis bevat geen verboden woorden en geen bedragen', () => {
  for (const c of KB.chunks) assert.doesNotMatch(c.text, FORBIDDEN, c.id);
  assert.ok(KB.kb_hash && KB.kb_version);
});

test('voorfilter: persoonsgegevens gaan nooit naar het model', async () => {
  let called = false;
  const llm = async () => { called = true; return { answerable: true, answer: 'x', source_ids: [KB.chunks[0].id] }; };
  const r = await answer({ question: 'Mijn mail is a@b.nl, wanneer wordt ik betaald?' }, { mode: 'llm', llm });
  assert.equal(r.refusal.reason, 'personal_data');
  assert.equal(called, false);
});

test('llm-modus (mock): onbekende bron-id wordt no_source', async () => {
  const llm = async () => ({ answerable: true, answer: 'Een beurt duurt lang.', source_ids: ['bestaat-niet'] });
  const r = await answer({ question: 'Hoe lang duurt een beurt?' }, { mode: 'llm', llm });
  assert.equal(r.refusal.reason, 'no_source');
});

test('llm-modus (mock): geldige bron geeft antwoord met letterlijk citaat uit de bron', async () => {
  const id = KB.chunks.find((c) => c.id === 'spelregels-r4-2').id;
  const llm = async ({ candidates }) => { assert.ok(candidates.length > 0); return { answerable: true, answer: 'Een beurt duurt 45 werkminuten.', source_ids: [id] }; };
  const r = await answer({ question: 'Hoe lang duurt een beurt?' }, { mode: 'llm', llm });
  assert.equal(r.answerable, true);
  assert.equal(r.engine.mode, 'llm');
  assert.ok(validateSources(r));
});

test('llm-modus (mock): een antwoord met een bedrag wordt geweigerd', async () => {
  const llm = async () => ({ answerable: true, answer: 'Het kost €12.', source_ids: ['spelregels-r3-3'] });
  const r = await answer({ question: 'Wat is de vaste vergoeding?' }, { mode: 'llm', llm });
  assert.equal(r.answerable, false);
});

test('llm-modus (mock): het model weigert, de reden blijft staan', async () => {
  const llm = async () => ({ answerable: false, refusal_reason: 'advice' });
  const r = await answer({ question: 'Hoe werkt bezwaar bij een NIVRE-oordeel?' }, { mode: 'llm', llm });
  assert.equal(r.refusal.reason, 'advice');
});

// --- POST /api/ask ---
function mockRes() {
  return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } };
}
async function call(body, env = { ASK_ENABLED: 'true' }, method = 'POST', headers = {}, deps) {
  const res = mockRes();
  await handler({ method, headers, body }, res, env, deps);
  return { status: res.statusCode, headers: res.headers, json: res.body ? JSON.parse(res.body) : null };
}

test('api: vlag uit geeft 503 ask_disabled', async () => {
  const r = await call({ question: 'Wat zijn werkuren?' }, {});
  assert.equal(r.status, 503);
  assert.equal(r.json.error, 'ask_disabled');
  assert.equal(r.json.human_contact, 'info@humanpush.nl');
});

test('api: headers (CORS, no-store, noindex)', async () => {
  const r = await call({ question: 'Wat zijn werkuren?' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['access-control-allow-origin'], '*');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['x-robots-tag'], 'noindex');
  assert.equal(r.json.engine.mode, 'extract');
  const o = await call(undefined, { ASK_ENABLED: 'true' }, 'OPTIONS');
  assert.equal(o.status, 204);
});

test('api: standaard extract, ook als ASK_MODE leeg is', async () => {
  const r = await call({ question: 'Wat zijn werkuren?' }, { ASK_ENABLED: 'true', ASK_MODE: '' });
  assert.equal(r.json.engine.mode, 'extract');
});

test('api: 400 bij lege, te korte, te lange of onbekende invoer', async () => {
  assert.equal((await call({})).status, 400);
  assert.equal((await call({ question: 'a' })).status, 400);
  assert.equal((await call({ question: 'x'.repeat(501) })).status, 400);
  assert.equal((await call({ question: 'Wat zijn werkuren?', language: 'de' })).status, 400);
  assert.equal((await call({ question: 'Wat zijn werkuren?', extra: 1 })).status, 400);
  assert.equal((await call('geen json')).status, 400);
});

test('api: 413 bij meer dan 4 KB', async () => {
  const r = await call({ question: 'Wat zijn werkuren?' }, { ASK_ENABLED: 'true' }, 'POST', { 'content-length': '5000' });
  assert.equal(r.status, 413);
});

test('api: llm-modus zonder sleutel geeft 503, niet een antwoord', async () => {
  const r = await call({ question: 'Wat zijn werkuren?' }, { ASK_ENABLED: 'true', ASK_MODE: 'llm' });
  assert.equal(r.status, 503);
});

test('api: dagplafond in llm-modus geeft 503 busy', async () => {
  const llm = async () => ({ answerable: true, answer: 'Maandag tot en met vrijdag.', source_ids: ['faq-bedrijven-wat-zijn-werkuren'] });
  const env = { ASK_ENABLED: 'true', ASK_MODE: 'llm', ASK_DAILY_CAP: '1' };
  const a = await call({ question: 'Wat zijn werkuren?' }, env, 'POST', {}, { llm });
  assert.equal(a.status, 200);
  const b = await call({ question: 'Wat zijn werkuren?' }, env, 'POST', {}, { llm });
  assert.equal(b.status, 503);
  assert.equal(b.json.error, 'busy');
});

test('api: logt niets van de vraag', async () => {
  const orig = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  const seen = [];
  for (const k of Object.keys(orig)) console[k] = (...a) => seen.push(a.join(' '));
  try { await call({ question: 'Wat zijn werkuren? geheimwoord' }); } finally { Object.assign(console, orig); }
  assert.ok(!seen.some((l) => l.includes('geheimwoord')));
});

test('api-code en site bevatten geen sleutels', () => {
  const files = ['api/ask.js', 'api/_engine.js', 'api/_policy.js', 'api/_llm.js', 'config.js', 'chat.js'];
  for (const f of files) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(t, /xai-[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{10,}/, f);
  }
});

test('met de vlaggen uit laadt geen pagina een chatbestand', () => {
  const cfg = readFileSync(new URL('../config.js', import.meta.url), 'utf8');
  assert.match(cfg, /chat:\s*false/);
  assert.match(cfg, /ask:\s*false/);
  const dir = new URL('../', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const t = readFileSync(new URL(f, dir), 'utf8');
    assert.doesNotMatch(t, /chat\.(js|css)/, f);
  }
});

test('prefilter blijft stil bij gewone vragen uit de FAQ', () => {
  for (const q of ['Wie is waarvoor verantwoordelijk?', 'Hoe werkt betalen zonder dat ik bedragen zie?', 'Kan ik bezwaar maken als ik het niet eens ben met de conclusie?', 'Wat als ik na aanname een belangenconflict ontdek?']) {
    assert.equal(prefilter(q), null, q);
  }
});
