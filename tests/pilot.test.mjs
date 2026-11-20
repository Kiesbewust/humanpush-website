// /pilot/second-opinion: vaste teksten, geen bedragen, geen formulier, geen tracking, gelinkt vanaf /bedrijven.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const P = read('pilot/second-opinion.html');
const main = P.slice(P.indexOf('<main'), P.indexOf('</main>'));

test('pilot: noindex, één h1, gelinkt vanaf /bedrijven en in de sitemap', () => {
  assert.match(P, /<meta name="robots" content="noindex, nofollow">/);
  assert.equal((P.match(/<h1[ >]/g) || []).length, 1);
  assert.match(P, /<link rel="canonical" href="https:\/\/humanpush\.nl\/pilot\/second-opinion">/);
  assert.match(read('bedrijven.html'), /<a href="\/pilot\/second-opinion">/);
  assert.match(read('sitemap.xml'), /<loc>https:\/\/humanpush\.nl\/pilot\/second-opinion<\/loc>/);
});

test('pilot: doelgroep, probleem zonder "de wet eist altijd", 4 stappen', () => {
  for (const s of ['Gevolmachtigde agenten', 'Schadebehandelaars', 'Leveranciers van claimsoftware']) assert.ok(main.includes(s), s);
  for (const s of ['geschil', 'complexe claim', 'tekort aan capaciteit', 'contract onafhankelijkheid']) assert.ok(main.includes(s), s);
  assert.match(main, /De wet eist dat niet altijd\./);
  assert.match(main, /wanneer de situatie daarom vraagt/);
  assert.equal((main.match(/<span class="pi">\d<\/span>/g) || []).length, 4);
  assert.match(main, /NIVRE-geregistreerde schade-expert tegelijk aan, telkens <span data-rule="turnWorkingMinutes">\d+<\/span> werkminuten/);
  assert.doesNotMatch(main.replace(/gebeurtenis/g, ''), /beurt/i);
  assert.match(main, /tekent met de passkey/);
  assert.match(main, /bewijsdossier/);
  assert.doesNotMatch(P, /<!--flow:start/);
});

test('pilot: hoe een pilot eruitziet, prijs zonder bedragen, CTA alleen mailto', () => {
  for (const s of ['Eén concrete workflow', 'beperkt aantal dossiers', 'doorlooptijd', 'kosten', 'matchsucces', 'dossier terugkomt', 'Samen evalueren']) assert.ok(main.includes(s), s);
  assert.ok(main.includes('Vaste platformvergoeding per afgeronde opdracht plus het tarief van de professional; pilotvoorwaarden in overleg.'));
  const text = main.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /€|\bEUR\b|\d+[.,]\d{2}\b|euro|\d+ ?%/i);
  assert.match(main, /Interesse in een pilot\? Mail <a href="mailto:info@humanpush\.nl[^"]*">info@humanpush\.nl<\/a>/);
  assert.doesNotMatch(P, /<form\b|<input\b|<textarea\b|<iframe\b/i);
  for (const m of main.matchAll(/href="([^"]+)"/g)) assert.match(m[1], /^(mailto:info@humanpush\.nl|\/|#)/, m[1]);
});
