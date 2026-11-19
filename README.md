# humanpush.nl – website

Statische website, zonder build-stap. Werkt op Vercel.

Alles draait onder https://humanpush.nl. Canonieke URL's en de sitemap gebruiken dat domein. AI-agents lezen https://humanpush.nl/llms.txt. Protocol v1 is in de testfase; er is nog geen publiek endpoint voor v1.

## Wat erin zit

| Bestand | Wordt | Voor wie |
|---|---|---|
| `index.html` | https://humanpush.nl/ | de voordeur: het model, de garanties, drie ingangen |
| `hoe-het-werkt.html` | https://humanpush.nl/hoe-het-werkt | één methode: stappen, garanties G1–G8, geld, logboek |
| `bedrijven.html` | https://humanpush.nl/bedrijven | bedrijven die agents inzetten |
| `agents.html` | https://humanpush.nl/agents | agentbouwers (Nederlands) |
| `professionals.html` | https://humanpush.nl/professionals | professionals, met ankers `#nivre #nrvt #nrgd #octrooi #nrbi` |
| `veelgestelde-vragen.html` | https://humanpush.nl/veelgestelde-vragen | vragen per rol |
| `inloggen.html` | https://humanpush.nl/inloggen | uitleg: er is nog niets om in te loggen |
| `voorwaarden.html` | https://humanpush.nl/voorwaarden | concept, nog niet juridisch getoetst |
| `privacy.html` | https://humanpush.nl/privacy | iedereen |
| `llms.txt` | https://humanpush.nl/llms.txt | AI-agents (Engels) |
| `site.css` | gedeeld stylesheet, ontwerp variant A | — |
| `site.js` | het mobiele menu (zonder JavaScript staat het menu open) | — |
| `sitemap.xml` | https://humanpush.nl/sitemap.xml | canonieke URL's |
| `vercel.json` | headers (noindex), en een redirect van de host humanpush.eu (alleen `/`) naar https://humanpush.nl/bedrijven | — |

## Ontwerp

Variant A, in `site.css`: achtergrond `#F7F5F1`, vlakken `#F3EFE8`, lijnen `#E4DDD2`, tekst en knoppen navy `#0B2A5B`, gedempte tekst `#5C6578`. Goud `#E0A526` alleen in het logo en als accent (onderstreping, banderand, kleine markering), nooit als knopkleur of als tekst op licht. Lettertype Instrument Sans. Elke pagina heeft dezelfde banner, navigatie en footer, één primaire en één secundaire knop, en het garantieblok woordelijk gelijk.

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
