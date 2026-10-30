# humanpush.nl – website

Statische website, zonder build-stap. Werkt op Vercel, net als z1nprotocol.xyz.

## Wat erin zit

| Bestand | Wordt | Voor wie |
|---|---|---|
| `index.html` | humanpush.nl | professionals |
| `bedrijven.html` | humanpush.nl/bedrijven | bedrijven die agents inzetten |
| `inloggen.html` | humanpush.nl/inloggen | uitleg over de twee accounts, werkt vanaf de start |
| `privacy.html` | humanpush.nl/privacy | iedereen |
| `llms.txt` | humanpush.eu/llms.txt (en humanpush.nl/llms.txt) | AI-agents |
| `vercel.json` | stuurt humanpush.eu door naar /bedrijven, behalve llms.txt | — |

## Eén keer invullen

Zoek en vervang in alle bestanden:

- `[FORMSPREE-ID]`: zie stap 4 (komt twee keer voor)
- `[BEDRIJFSNAAM]`, `[KVK-NUMMER]`, `[E-MAILADRES]`: je eenmanszaak met de handelsnaam HumanPush, of later de eigen BV
- `[DATUM]` en `[FORMULIERDIENST]` in privacy.html (bijvoorbeeld "Formspree")
- `[PRICE]` in llms.txt mag blijven staan zolang er geen prijs is

## Live zetten

1. **GitHub.** Maak een nieuwe repository, bijvoorbeeld `humanpush-website`, zet deze bestanden erin en push.
2. **Vercel.** Kies Add New → Project, importeer de repository en kies als framework "Other". Er is geen build-commando nodig. Klik op Deploy.
3. **Domeinen.** Voeg in Vercel onder Settings → Domains toe: `humanpush.nl`, `www.humanpush.nl` en `humanpush.eu`. Vercel toont per domein welke DNS-records nodig zijn. Zet die bij TransIP. Stuur humanpush.de en humanpush.be in TransIP door naar https://humanpush.nl.
4. **Formulieren.** Maak een gratis account bij Formspree, maak één formulier aan en vul de ID in op de plek van `[FORMSPREE-ID]`. Aanmeldingen van professionals en sandbox-aanvragen komen in hetzelfde formulier binnen. Je ziet het verschil aan het veld `soort`. Formspree is een Amerikaanse dienst. Voor een wachtlijst is dat gangbaar, maar noem het in de privacyverklaring.
5. **Controleren.** Open humanpush.nl, klik door naar /bedrijven en /inloggen, verstuur een testaanmelding en open humanpush.eu/llms.txt.

## Bijwerken

Pas de bestanden aan, commit en push. Vercel zet de nieuwe versie vanzelf live.

## Automatische deploy

Pushes naar `main` worden automatisch gedeployed naar Vercel (project `humanpush-website`, productiedomein humanpush.nl).
