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

test('pilot: doelgroep, probleem zonder "de wet eist altijd", het stappenblok met vijf stappen', () => {
  for (const s of ['Gevolmachtigde agenten', 'Schadebehandelaars', 'Leveranciers van claimsoftware']) assert.ok(main.includes(s), s);
  for (const s of ['geschil', 'complexe claim', 'tekort aan capaciteit', 'contract onafhankelijkheid']) assert.ok(main.includes(s), s);
  assert.match(main, /De wet eist dat niet altijd; HumanPush levert het oordeel wanneer de situatie daarom vraagt\. <a href="\/veelgestelde-vragen#wet">/);
  assert.doesNotMatch(main, /AVG|AI-verordening/, 'de wetsalinea staat alleen in de FAQ');
  assert.match(main, /wanneer de situatie daarom vraagt/);
  assert.match(main, /<!--stappen:start view=neutraal-->/);
  assert.equal((main.match(/<li class="tl-step/g) || []).length, 5);
  assert.match(main, /NIVRE-geregistreerde schade-expert/);
  assert.match(main, /<span data-rule="turnWorkingMinutes">\d+<\/span> minuten binnen werktijd/);
  assert.doesNotMatch(main.replace(/gebeurtenis/g, ''), /beurt/i);
  assert.match(main, /tekent met zijn passkey/);
  assert.match(main, /dossier van de opdracht/);
  assert.doesNotMatch(main, /bewijsdossier|controleur/);
  assert.doesNotMatch(P, /<!--flow:start/);
});

test('pilot: hoe een pilot eruitziet, 5% afhandelfee zonder bedragen, CTA alleen mailto', () => {
  for (const s of ['Eén concrete workflow', 'beperkt aantal schadezaken', 'doorlooptijd', 'kosten', 'matchsucces', 'zaak terugkomt', 'Samen evalueren']) assert.ok(main.includes(s), s);
  assert.match(main, /HumanPush-afhandelfee: <span data-rule="feePct">5<\/span>% over de prijs van de professional \(inclusief zijn eventuele btw\)\. Over de fee betaal je 21% btw\. Ook in de pilot\./);
  assert.doesNotMatch(main, /pilotvoorwaarden in overleg|platformvergoeding|vaste vergoeding/i);
  const text = main.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(text, /€|\bEUR\b|\d+[.,]\d{2}\b|euro/i, 'geen bedragen op de pilotpagina');
  assert.equal((main.match(/<a class="btn btn-primary" href="mailto:info@humanpush\.nl\?subject=Pilot%20aanvragen&amp;body=Organisatie%3A[^"]*">Pilot aanvragen<\/a>/g) || []).length, 2);
  assert.match(main, /Er is geen formulier en we verzamelen via deze site geen gegevens; je mail komt binnen in onze gewone mailbox\./);
  assert.doesNotMatch(P, /<form\b|<input\b|<textarea\b|<iframe\b/i);
  for (const m of main.matchAll(/href="([^"]+)"/g)) assert.match(m[1], /^(mailto:info@humanpush\.nl|\/|#)/, m[1]);
});
