# humanpush.nl – website

Statische website, zonder build-stap. Werkt op Vercel.

Alles draait onder https://humanpush.nl. Canonieke URL's en de sitemap gebruiken dat domein. AI-agents lezen https://humanpush.nl/llms.txt. Protocol v1 is in de testfase; er is nog geen publiek endpoint voor v1.

## Wat erin zit

| Bestand | Wordt | Voor wie |
|---|---|---|
| `index.html` | https://humanpush.nl/ | de voordeur: drie routes, interactieve flow, swimlane, HumanPush-agent |
| `hoe-het-werkt.html` | https://humanpush.nl/hoe-het-werkt | de enige plek met de volledige uitleg: flow, swimlane, infographic, werkuren, garanties G1–G8, geld, logboek |
| `bedrijven.html` | https://humanpush.nl/bedrijven | bedrijven die agents inzetten |
| `agents.html` | https://humanpush.nl/agents | agentbouwers (Nederlands) |
| `professionals.html` | https://humanpush.nl/professionals | professionals, met ankers `#nivre #nrvt #nrgd #octrooi #nrbi` |
| `veelgestelde-vragen.html` | https://humanpush.nl/veelgestelde-vragen | vragen per rol |
| `inloggen.html` | https://humanpush.nl/inloggen | uitleg: er is nog niets om in te loggen |
| `voorwaarden.html` | https://humanpush.nl/voorwaarden | concept, nog niet juridisch getoetst |
| `privacy.html` | https://humanpush.nl/privacy | iedereen |
| `llms.txt` | https://humanpush.nl/llms.txt | AI-agents (Engels) |
| `site.css` | gedeeld stylesheet, ontwerp variant A | — |
| `site.js` | mobiel menu, Inloggen-menu, interactieve flow, vlaggen (zonder JavaScript: menu open, flow als lijst) | — |
| `config.js` | de vlaggen van de site (alles uit) | — |
| `api/` | `POST /api/ask` (achter een vlag) | agents en het chatvenster |
| `sitemap.xml` | https://humanpush.nl/sitemap.xml | canonieke URL's |
| `vercel.json` | headers (noindex), en een redirect van de host humanpush.eu (alleen `/`) naar https://humanpush.nl/bedrijven | — |

## Ontwerp

Variant A, in `site.css`: achtergrond `#F7F5F1`, vlakken `#F3EFE8`, lijnen `#E4DDD2`, tekst en knoppen navy `#0B2A5B`, gedempte tekst `#5C6578`. Goud `#E0A526` alleen in het logo en als accent (onderstreping, banderand, kleine markering), nooit als knopkleur of als tekst op licht. Lettertype Instrument Sans. Elke pagina heeft dezelfde banner, navigatie (met Inloggen, "komt eraan") en footer, één primaire en één secundaire knop per blok. Het garantieblok staat alleen op /hoe-het-werkt; elders staat één regel met een link. Instrument Sans staat zelf gehost in `/fonts` (geen Google Fonts).

## Eén bron, geen build-stap

- `rules.json`: alle termijnen (beurt van 45 werkminuten, hooguit 2 beurten per professional, vangnet 3 werkdagen, 30 minuten betalen, 72 uur bezwaar, 25%). De aanneemtermijn heeft één bron: verandert hij, dan pas je alleen `rules.json` aan (en `llms.txt`, `kb/spelregels.md` en de infographic, die het script controleert). Moet gelijk zijn aan `src/v1/params.ts` op de testversie van humanpush-mcp.
- `partials/`: het stroomdiagram (`flow.html` + twee SVG's) en de swimlane (`swimlane.svg` + `swimlane-legenda.json`). `node tools/sync-partials.mjs` zet ze in de pagina's tussen `<!--flow:start-->`/`<!--flow:end-->`, `<!--flowsvg:…-->` en `<!--swim:…-->`, en vult elke `<span data-rule="…">`. `--check` faalt bij verschil of bij de oude regel "4 werkuren".
- `kb/`: de kennisbasis. `node tools/build-kb.mjs` bouwt `kb/index.json`, `kb/faq.md` en `api/_kb.js` uit `kb/spelregels.md`, de vragenpagina, `llms.txt` en de blokken met `data-kb`. `--check` in CI.
- `npm run check` draait alles plus de tests (`tests/`, geen netwerk, geen model). CI: `.github/workflows/site-check.yml`.
- `.vercelignore`: `tests`, `tools`, `partials` en `.github` worden niet uitgeleverd.

## Vragen aan HumanPush (achter vlaggen, standaard UIT)

| Vlag | Waar | Standaard | Effect |
|---|---|---|---|
| `HP_CONFIG.chat` | `config.js` | `false` | het chatvenster (`chat.js`, `chat.css`) laadt wel/niet |
| `HP_CONFIG.ask` | `config.js` | `false` | het blok met `POST /api/ask` op /agents |
| `ASK_ENABLED` | Vercel env | uit | `/api/ask` geeft anders `503 ask_disabled` |
| `ASK_MODE` | Vercel env | `extract` | `extract` (geen model, letterlijk citaat) of `llm` (alleen met Bobs ja en sleutel) |
| `ASK_DAILY_CAP` | Vercel env | `500` | maximaal aantal modelaanroepen per dag |

`/api/ask` bewaart en logt niets van de vraag. De sleutel voor het model staat nooit in de repo.

## Contact en prijzen

Aanmelden is nog niet open: er zijn geen formulieren en geen mailto-knoppen als call-to-action. info@humanpush.nl staat alleen als contactadres in de footer, de voorwaarden en de privacyverklaring. De vergoeding van HumanPush: een vaste vergoeding per dienst, voor elk bedrijf hetzelfde, excl. btw, zichtbaar vóór je bestelt. Een wijziging geldt alleen voor nieuwe opdrachten. (Engels: a fixed fee per service, the same for every company, excluding VAT, visible before you order. A change applies only to new orders.) De footer is: "HumanPush is een handelsnaam van HumAgent B.V. · KvK 42222476", gevolgd door info@humanpush.nl, zonder adres. Op privacy en voorwaarden staat de aanbieder als "HumAgent B.V. (handelsnaam HumanPush), KvK 42222476". Rangorde in de teksten: voorwaarden boven protocol boven site.

## Live zetten

1. **GitHub.** Maak een nieuwe repository, bijvoorbeeld `humanpush-website`, zet deze bestanden erin en push.
2. **Vercel.** Kies Add New → Project, importeer de repository en kies als framework "Other". Er is geen build-commando nodig. Klik op Deploy.
3. **Domeinen.** Voeg in Vercel onder Settings → Domains `humanpush.nl` en `www.humanpush.nl` toe. Vercel toont per domein welke DNS-records nodig zijn. Zet die bij TransIP. Stuur humanpush.de en humanpush.be in TransIP door naar https://humanpush.nl.
4. **Controleren.** Open https://humanpush.nl, klik door alle pagina's in het menu en de footer, en open https://humanpush.nl/llms.txt.

## Bijwerken

Pas de bestanden aan, commit en push. Vercel zet de nieuwe versie vanzelf live.

## Automatische deploy

Pushes naar `main` worden automatisch gedeployed naar Vercel (project `humanpush-website`, productiedomein humanpush.nl). Open een pull request voor wijzigingen; merge niet automatisch.
