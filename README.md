# humanpush.nl – website

Statische website, zonder build-stap. Werkt op Vercel.

Alles draait onder https://humanpush.nl. Canonieke URL's en de sitemap gebruiken dat domein. AI-agents lezen https://humanpush.nl/llms.txt. Protocol v1 is in de testfase; er is nog geen publiek endpoint voor v1.

## Wat erin zit

| Bestand | Wordt | Voor wie |
|---|---|---|
| `index.html` | https://humanpush.nl/ | de voordeur: twee routekaarten, registers en sectoren, de vier stappen, een voorbeeld, wat er wordt vastgelegd |
| `hoe-het-werkt.html` | https://humanpush.nl/hoe-het-werkt | de volledige uitleg: kant kiezen (professional of bedrijf), de vier stappen, een voorbeeldgesprek per kant, wat er wordt vastgelegd, garanties G1–G8, termijnen en werkuren, geld |
| `bedrijven.html` | https://humanpush.nl/bedrijven | bedrijven die agents inzetten |
| `agents.html` | https://humanpush.nl/agents | agentbouwers (Nederlands) |
| `professionals.html` | https://humanpush.nl/professionals | professionals, met ankers `#nivre #nrvt #nrgd #octrooi #nrbi` |
| `veelgestelde-vragen.html` | https://humanpush.nl/veelgestelde-vragen | vragen per rol |
| `inloggen.html` | https://humanpush.nl/inloggen | uitleg: er is nog niets om in te loggen |
| `voorwaarden.html` | https://humanpush.nl/voorwaarden | concept, nog niet juridisch getoetst |
| `privacy.html` | https://humanpush.nl/privacy | iedereen |
| `llms.txt` | https://humanpush.nl/llms.txt | AI-agents (Engels) |
| `site.css` | gedeeld stylesheet, ontwerp variant A | — |
| `site.js` | mobiel menu, Inloggen-menu, dienstkaarten en tabs, kant kiezen, de voorbeeld-demo, vlaggen (zonder JavaScript: alles open en zichtbaar) | — |
| `config.js` | de vlaggen van de site (alles uit) | — |
| `api/` | `POST /api/ask` (achter een vlag) | agents en het chatvenster |
| `sitemap.xml` | https://humanpush.nl/sitemap.xml | canonieke URL's |
| `vercel.json` | headers (noindex), en een redirect van de host humanpush.eu (alleen `/`) naar https://humanpush.nl/bedrijven | — |

## Ontwerp

Ontwerpsysteem in `site.css` ("infrastructuur voor geregistreerde professionals"): warm gebroken wit `#F6F4EF`, navy `#0B2A5B` als basis, dunne lijnen (1px, navy op lage dekking) in plaats van kaarten met schaduw, afronding 4–6px, een 12-koloms raster en één lijn-icoonstijl. Goud `#E0A526` alleen als één accent per scherm (status of handtekening), nooit als knop- of tekstkleur. Lettertypen Inter Tight (koppen en tekst) en JetBrains Mono (labels, statussen, logregels), zelf gehost en gesubset in `/fonts` (OFL). Elke pagina heeft dezelfde banner, navigatie (met Inloggen, "komt eraan") en footer. Het garantieblok staat alleen op /hoe-het-werkt; elders staat één regel met een link. In publieke teksten heet een beurt "aangeboden opdracht" (professional) of "toegewezen aan een professional" (bedrijf); API-namen zoals `pass_turn` en `get_my_turns` blijven.

## Eén bron, geen build-stap

- `rules.json`: alle termijnen (45 werkminuten om een aangeboden opdracht aan te nemen, hooguit 2 keer aangeboden per professional, vangnet 3 werkdagen, 30 minuten betalen, 72 uur bezwaar, 25%). De aanneemtermijn heeft één bron: verandert hij, dan pas je alleen `rules.json` aan (en `llms.txt`, `kb/spelregels.md`, die het script controleert). Moet gelijk zijn aan `src/v1/params.ts` op de testversie van humanpush-mcp.
- `partials/diensten.json`: de bron van de dienstkaarten, met per register één zin wat het register is en welke sector. `node tools/sync-partials.mjs` zet ze in de pagina's tussen `<!--diensten:start view=pro|bedrijf-->` en `<!--diensten:end-->`, en vult elke `<span data-rule="…">`. `--check` faalt bij verschil. Het oude stroomdiagram, de swimlane en de infographic zijn weg.
- `kb/`: de kennisbasis. `node tools/build-kb.mjs` bouwt `kb/index.json`, `kb/faq.md` en `api/_kb.js` uit `kb/spelregels.md`, de vragenpagina, `llms.txt` en de blokken met `data-kb`. `--check` in CI.
- `npm run check` draait alles plus de tests (`tests/`, geen netwerk, geen model). CI: `.github/workflows/site-check.yml`.
- `.vercelignore`: `tests`, `tools`, `partials` en `.github` worden niet uitgeleverd.

## Vragen aan HumanPush (achter vlaggen, standaard UIT)

| Vlag | Waar | Standaard | Effect |
|---|---|---|---|
| `HP_CONFIG.chat` | `config.js` | `false` | het chatvenster (`chat.js`, `chat.css`) laadt wel/niet |
| `HP_CONFIG.ask` | `config.js` | `false` | het blok met `POST /api/ask` op /agents |
| `HP_CONFIG.testenv` | `config.js` | `false` | de knop Inloggen ("Professionals: testomgeving") en op /agents "Proberen in de testomgeving"; alleen Bob zet dit aan |
| `ASK_ENABLED` | Vercel env | uit | `/api/ask` geeft anders `503 ask_disabled` |
| `ASK_MODE` | Vercel env | `extract` | `extract` (geen model, letterlijk citaat) of `llm` (alleen met Bobs ja en sleutel) |
| `ASK_DAILY_CAP` | Vercel env | `500` | maximaal aantal modelaanroepen per dag |

`/api/ask` bewaart en logt niets van de vraag. De sleutel voor het model staat nooit in de repo.

## Contact en prijzen

Aanmelden is nog niet open: er zijn geen formulieren. Bedrijven en professionals kunnen met een mailto-knop ("Pilot aanvragen", "Interesse als professional") een mail met een paar vragen sturen; er is geen formulier-backend en de site verzamelt geen gegevens. De kosten: de HumanPush-afhandelfee is 5% over de prijs van de professional (inclusief zijn eventuele btw); over de fee betaal je 21% btw (`rules.json` `feePct`). Geen abonnement, geen minimum, geen andere kosten. Vooraf betaalt het bedrijf zijn maximumprijs plus 5% daarvan; neemt een professional aan voor minder, dan gaat het verschil in prijs en fee meteen terug. (Engels: HumanPush handling fee: 5% of the professional's price (including his VAT, if any), plus 21% VAT on the fee.) De vanaf-prijs per dienst (`partials/diensten.json` `vanaf_cents`) is nu leeg; een latere PR vult hem uit de catalogus van humanpush-mcp. De footer is: "HumanPush is een handelsnaam van HumAgent B.V. · KvK 42222476 · btw NL870249964B01 · Utrecht", met info@humanpush.nl, zonder straatadres. Op privacy en voorwaarden staat de aanbieder als "HumAgent B.V. (handelsnaam HumanPush), KvK 42222476". Rangorde in de teksten: voorwaarden boven protocol boven site.

## Live zetten

1. **GitHub.** Maak een nieuwe repository, bijvoorbeeld `humanpush-website`, zet deze bestanden erin en push.
2. **Vercel.** Kies Add New → Project, importeer de repository en kies als framework "Other". Er is geen build-commando nodig. Klik op Deploy.
3. **Domeinen.** Voeg in Vercel onder Settings → Domains `humanpush.nl` en `www.humanpush.nl` toe. Vercel toont per domein welke DNS-records nodig zijn. Zet die bij TransIP. Stuur humanpush.de en humanpush.be in TransIP door naar https://humanpush.nl.
4. **Controleren.** Open https://humanpush.nl, klik door alle pagina's in het menu en de footer, en open https://humanpush.nl/llms.txt.

## Bijwerken

Pas de bestanden aan, commit en push. Vercel zet de nieuwe versie vanzelf live.

## Automatische deploy

Pushes naar `main` worden automatisch gedeployed naar Vercel (project `humanpush-website`, productiedomein humanpush.nl). Open een pull request voor wijzigingen; merge niet automatisch.


## Woordenlijst (publieke Nederlandse tekst)

Dossier, bij de eerste vermelding "het dossier van de opdracht" (niet bewijsdossier of logboek), digitale vingerafdruk (niet hash; alleen bij de NRGD-dienst "digitale vingerafdruk (hash)"), HumanPush-scherm (niet HumanPush-agent), HumanPush-afhandelfee (niet vaste vergoeding of H), vanaf-prijs (de laagste prijs die nu geldt), handtekening met je passkey (niet passkey-handtekening), registercheck (niet registerbewijs of niveau 2), toegangscode voor je agent (op /agents: API-sleutel), HumanPush (niet protocol), jij of de professional (niet mens). "Beurt" staat alleen nog in /voorwaarden; die tekst verandert pas na akkoord van de jurist (PR #20). `tests/proces.test.mjs` bewaakt dit.
