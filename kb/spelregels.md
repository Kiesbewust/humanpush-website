# Spelregels van HumanPush (publieke versie)

Testversie. Alle bedragen en termijnen zijn testwaarden of werkregels in de testfase. Rangorde: eerst de voorwaarden, dan het systeem van HumanPush, dan de site. Elke regel heeft een vast nummer. HumanPush voert de regels automatisch uit; het dossier van elke opdracht is het bewijs.

## 1. Grondregels

### R1.1 · HumanPush voert de voorwaarden uit
Elke opdracht loopt alleen door de vaste stappen van HumanPush. Er is geen handmatige route ernaast. Elke stap staat getekend in het dossier van de opdracht, en elke stap verwijst naar de vorige.

### R1.2 · Geen uitzonderingen per geval
Geen helpdesk die regels buigt: een medewerker beantwoordt vragen via info@humanpush.nl, maar uitzonderingen per geval bestaan niet. Niemand bij HumanPush kan een termijn verlengen, een bedrag aanpassen of een lopende opdracht beslissen. v1_explain legt elke status en elke weigering uit.

### R1.3 · Beheer heeft alleen een pauzeknop
De pauze stopt nieuwe opdrachten voor iedereen. Lopende opdrachten lopen door onder hun eigen termijnen.

### R1.4 · Regels liggen vast bij het bestellen
De regels en de catalogus die golden bij het bestellen, gelden voor die hele opdracht. Een nieuwe versie geldt alleen voor nieuwe opdrachten.

### R1.5 · Eén systeem voor alle beroepen
Termijnen, geldregels, bezwaar en bewijsvloer zijn voor alle vijf diensten gelijk. Per dienst verschillen alleen het register, de invoer, de uitkomsten, het prijsbereik, de disclaimer, de verklaring, de toetsingspunten en wat wel en niet in de dienst valt.

### R1.6 · Alleen zakelijk
Opdrachtgevers hebben een KvK-nummer. Professionals staan in een openbaar register. Niet voor particulieren of consumenten.

### R1.7 · Eén route en één toegangscode per partij
Het bedrijf werkt via de toegangscode van zijn agent. De professional werkt met zijn passkey: met zijn eigen agent (MCP), of zonder MCP met de HumanPush-agent op het scherm van HumanPush. Die komt eraan.

## 2. Registercheck

### R2.1 · Registercheck vooraf, voor iedereen
Zonder geldige registercheck krijgt niemand een opdracht aangeboden. De registercheck betekent: een medewerker van HumanPush zocht de professional met een vaste checklist op in het openbare register.

### R2.2 · Alleen de agent mag een strengere check eisen
Een agent kan per opdracht een strengere registercheck eisen (min_proof_level), nooit een lichtere. Bij de start biedt geen register een strengere check, dus wie die eist, vindt nu niemand en krijgt alles terug.

### R2.6 · Hoe lang een registercheck geldt
Een registercheck telt hooguit 30 dagen. Bij octrooigemachtigden geldt daarbovenop: de peildatum van de lijst is bij de controle hooguit 120 dagen oud. Het is een registercheck met een geldigheidsduur, geen live koppeling met het register.

### R2.7 · Hercontrole bij elke aanname
Vlak voor een aanname wordt het register opnieuw gecontroleerd. Doorgehaald of geschorst: de aangeboden opdracht vervalt.

### R2.8 · Schorsing en doorhaling
Meldt het register een schorsing of doorhaling, dan krijgt de professional geen nieuwe opdrachten. Een lopende opdracht die nog niet is opgeleverd, stopt: het bedrijf krijgt alles terug, de professional krijgt niets.

### R2.12 · Twee passkeys
Een professional maakt een passkey aan op zijn eigen telefoon of computer, en een tweede passkey als reserve. Zonder tweede passkey krijgt hij geen opdracht aangeboden.

## 3. Bestellen en betalen

### R3.1 · De agent kiest een dienst, geen persoon
Bestellen is: dienst, invoer, uiterste datum en maximumprijs. Onbekende velden worden geweigerd. De agent kiest nooit zelf een professional.

### R3.2 · 100% vooraf, binnen 30 minuten
Het bedrijf betaalt vooraf de maximumprijs plus de HumanPush-afhandelfee (5% daarvan) en btw over de fee, binnen 30 minuten, via een betaallink. Niet betaald in 30 minuten: de bestelling vervalt, zonder gevolgen. Pas na betaling gaat de opdracht naar professionals.

### R3.3 · De HumanPush-afhandelfee
De afhandelfee is 5% van de prijs van de professional, excl. btw; het bedrijf betaalt btw over de fee. Geen abonnement, geen minimum, geen andere kosten. Neemt een professional aan tegen een lagere prijs, dan gaat het verschil in prijs en fee meteen terug. HumanPush houdt de fee alleen als een opdracht slaagt.

### R3.5 · Herhaalde aanroep is één uitvoering
Dezelfde idempotency_key met dezelfde gegevens geeft hetzelfde antwoord en voert niets twee keer uit.

## 4. Aanbieden en aanname

### R4.1 · Vaste volgorde
HumanPush zet passende professionals op volgorde: laagste eigen prijs, dan kortste levertijd, dan eerlijke rotatie. Passend is: geldige registercheck, juiste dienst, capaciteit vrij, geen afkoelperiode, en op tijd kunnen leveren.

### R4.2 · Telkens 45 minuten binnen werktijd aangeboden, tot iemand aanneemt
Na de betaling wordt de opdracht aangeboden aan één passende professional tegelijk. De professional heeft 45 minuten binnen werktijd om aan te nemen of door te geven. Neemt hij niet aan, of geeft hij de opdracht door, dan gaat de opdracht meteen naar de volgende. Na elke ronde maakt HumanPush de volgorde opnieuw. Elke professional krijgt dezelfde opdracht hooguit 2 keer aangeboden. Dat gaat door tot de opdracht is toegewezen aan een professional of het bedrijf annuleert. Werktijd is maandag tot en met vrijdag, 09:00 tot 17:00 uur Nederlandse tijd, zonder Nederlandse feestdagen; buiten werktijd staat de klok stil.

### R4.4 · Niet aannemen kost niets: doorgeven
Een professional kan een aangeboden opdracht doorgeven. Dat is een getekende stap, staat in het dossier en kost niets: de opdracht gaat direct naar de volgende. Een aangeboden opdracht laten verlopen is ook geen tekortkoming. Bij een dienst met verplichte conflictcheck kun je bij een aangeboden opdracht een belang melden; ook dat kost niets.

### R4.5 · Aannemen is tekenen
De professional tekent de aanname met zijn passkey. Daarna zijn beide partijen gebonden. Neemt hij aan tegen een lagere eigen prijs, dan gaat het verschil meteen terug naar het bedrijf.

### R4.6 · Niemand neemt aan: alles terug
Kan geen passende professional meer op tijd leveren, of neemt niemand aan binnen 3 werkdagen (het vangnet), dan krijgt het bedrijf alles terug, ook de afhandelfee.

### R4.7 · Hoe een professional een aangeboden opdracht ziet
De agent van de professional vraagt zijn aangeboden opdrachten op met get_my_turns. Zonder eigen agent meldt de HumanPush-agent de aangeboden opdracht op het scherm van HumanPush. Er gaat geen mail of sms.

## 5. Werk en oplevering

### R5.1 · Levertermijn
De uiterste leverdatum is de vroegste van: aanname plus eigen levertijd, en de uiterste datum van het bedrijf. Die schuift nooit.

### R5.2 · Opleveren is tekenen
De professional levert het stuk, kiest een vaste uitkomst van de dienst en tekent met zijn passkey. Het stuk krijgt een digitale vingerafdruk: een unieke code van het opgeleverde stuk. Verandert er later één letter, dan klopt de vingerafdruk niet meer. Zo is aantoonbaar dat het stuk niet is aangepast.

## 6. 72 uur en bezwaar

### R6.1 · 72 uur na oplevering
Het bedrijf accepteert, of maakt bezwaar. Zegt het niets, dan geldt het werk na 72 uur als geaccepteerd. De 72 uur zijn gewone klokuren.

### R6.2 · Bezwaar alleen bij een objectieve fout
Een bezwaar telt alleen bij een fout die het systeem zelf vaststelt: te laat (geen levering vóór de deadline), een verplicht onderdeel van de dienstkaart ontbreekt, de registratie van de professional was bij aanname niet geldig, of het formaat klopt niet (documenttype, handtekening met de passkey of digitale vingerafdruk). Een andere conclusie willen is geen grond.

### R6.3 · Niemand beoordeelt de inhoud
HumanPush oordeelt niet over de inhoud en er is geen beoordelaar. Is het bedrijf het inhoudelijk oneens, dan wordt de professional na 72 uur betaald. Het bedrijf gaat naar de professional, of naar de klacht- of tuchtregeling van het register van de professional.

### R6.4 · Objectieve fout: alles terug
Bij een objectieve fout krijgt het bedrijf automatisch alles terug, ook de afhandelfee. Niemand hoeft te beslissen. De professional krijgt niets.

### R6.6 · Storing bij HumanPush
Kan HumanPush niet aantonen dat zijn eigen dienst werkte, dan krijgt het bedrijf alles terug en betaalt HumanPush de professional uit zijn eigen reserve. De uitbetaling kan dan hooguit 5 werkdagen opschuiven.

## 7. Annuleren, terugtrekken, te laat

### R7.1 · Vóór aanname annuleren: alles terug
Annuleren vóór de aanname kost niets.

### R7.2 · Annuleren na aanname, vóór oplevering: 25% van de prijs
De professional krijgt 25% van zijn eigen prijs. Het bedrijf krijgt de rest terug, ook de afhandelfee.

### R7.3 · Na oplevering kan niet meer worden geannuleerd
Na de oplevering blijft alleen accepteren of bezwaar over.

### R7.4 · Te laat of terugtrekken: alles terug
Levert de professional niet op tijd, of trekt hij zich na aanname terug, dan krijgt het bedrijf alles terug en telt het als tekortkoming. Er wordt niemand anders ingezet; het bedrijf kan opnieuw bestellen.

### R7.5 · Conflict na aanname, alleen bij verplichte conflictcheck
Nu alleen bij octrooigemachtigden. Vóór oplevering mag de professional teruggeven. Het bedrijf krijgt alles terug, zonder 25%. De professional krijgt een markering; 3 markeringen in 12 maanden tellen als 1 tekortkoming.

## 8. Uitbetaling

### R8.1 · Na het venster
De professional krijgt zijn prijs na acceptatie, of na 72 uur zonder geldig bezwaar. Er gaat niets van af.

## 9. Betrouwbaarheid

### R9.1 · 3 tekortkomingen in 12 maanden
Na 3 tekortkomingen in 12 maanden volgt een afkoelperiode van 3 maanden zonder nieuwe opdrachten. Daarna automatisch weer open.

### R9.2 · Wat geen tekortkoming is
Een aangeboden opdracht doorgeven of laten verlopen, een belang melden bij een aangeboden opdracht, een geslaagde conflictteruggave (markering), een doorhaling of schorsing.

## 10. Bewijs

### R10.1 · Iedereen kan het bewijs zelf controleren
Het dossier van een opdracht bevat de digitale vingerafdruk van het stuk, de handtekeningen met de passkey van de professional, de registercheck en elke stap in volgorde. verify_proof controleert vingerafdruk, handtekening en volgorde.

### R10.3 · Persoonsgegevens niet leesbaar in het dossier
De stappen in het dossier bevatten digitale vingerafdrukken van de inhoud, nooit de inhoud zelf.
