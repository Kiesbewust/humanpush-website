# humanpush.nl – website

Statische website, zonder build-stap. Werkt op Vercel.

Alles draait onder https://humanpush.nl. Canonieke URL's en de sitemap gebruiken dat domein. AI-agents lezen https://humanpush.nl/llms.txt. De sandbox die nu werkt staat op https://mcp.humanpush.nl/ en het MCP-pad is https://mcp.humanpush.nl/mcp.

## Wat erin zit

| Bestand | Wordt | Voor wie |
|---|---|---|
| `index.html` | https://humanpush.nl/ | professionals, met reis per beroep |
| `bedrijven.html` | https://humanpush.nl/bedrijven | bedrijven, met reis per sector |
| `agents.html` | https://humanpush.nl/agents | bouwers van agents |
| `inloggen.html` | https://humanpush.nl/inloggen | uitleg over de twee accounts, werkt vanaf de start |
| `privacy.html` | https://humanpush.nl/privacy | iedereen |
| `llms.txt` | https://humanpush.nl/llms.txt | AI-agents |
| `sitemap.xml` | https://humanpush.nl/sitemap.xml | canonieke URL's |
| `vercel.json` | headers, en een redirect van de host humanpush.eu (alleen `/`) naar https://humanpush.nl/bedrijven | — |

## Contact en prijzen

Aanmelden gaat per e-mail naar info@humanpush.nl. De formulieren openen een mailto; er is geen formulierdienst. Prijzen op de site zijn "Prijs op aanvraag" (Nederlands) en "Price on request" (Engels, in llms.txt). Verzin geen KvK-nummer. De footer blijft: HumanPush, een handelsnaam van AgentPush B.V.

## Live zetten

1. **GitHub.** Maak een nieuwe repository, bijvoorbeeld `humanpush-website`, zet deze bestanden erin en push.
2. **Vercel.** Kies Add New → Project, importeer de repository en kies als framework "Other". Er is geen build-commando nodig. Klik op Deploy.
3. **Domeinen.** Voeg in Vercel onder Settings → Domains `humanpush.nl` en `www.humanpush.nl` toe. Vercel toont per domein welke DNS-records nodig zijn. Zet die bij TransIP. Stuur humanpush.de en humanpush.be in TransIP door naar https://humanpush.nl.
4. **Controleren.** Open https://humanpush.nl, klik door naar /bedrijven en /inloggen, gebruik de mailto-link en open https://humanpush.nl/llms.txt.

## Bijwerken

Pas de bestanden aan, commit en push. Vercel zet de nieuwe versie vanzelf live.

## Automatische deploy

Pushes naar `main` worden automatisch gedeployed naar Vercel (project `humanpush-website`, productiedomein humanpush.nl). Open een pull request voor wijzigingen; merge niet automatisch.
