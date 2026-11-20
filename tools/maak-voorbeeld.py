#!/usr/bin/env python3
"""HumanPush: maakt het fictieve voorbeeld-dossier (/voorbeeld/).

    python3 tools/maak-voorbeeld.py

Schrijft voorbeeld/rapport-voorbeeld.pdf (1 pagina, elke pagina gestempeld) en voorbeeld/dossier-voorbeeld.json.
De sha256 in de JSON is de echte hash van de pdf: een bezoeker kan hem zelf narekenen.
Alles is fictief: geen echte namen, KvK-, registratie- of rekeningnummers, geen echte verzekeraar.
De pdf wordt deterministisch gemaakt (reportlab invariant), zodat dezelfde bron dezelfde hash geeft.
"""
import hashlib, json, os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'voorbeeld')
PDF = os.path.join(OUT, 'rapport-voorbeeld.pdf')
STAMP = 'VOORBEELD · FICTIEF · GEEN ECHTE OPDRACHT'
INK = (11 / 255, 42 / 255, 91 / 255)


def stamp(c, w, h):
    c.saveState()
    c.setFillColorRGB(0.75, 0.2, 0.2)
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(w / 2, h - 12 * mm, STAMP)
    c.drawCentredString(w / 2, 10 * mm, STAMP)
    c.setFillColorRGB(0.85, 0.85, 0.85)
    c.setFont('Helvetica-Bold', 40)
    c.translate(w / 2, h / 2)
    c.rotate(35)
    c.drawCentredString(0, 0, 'VOORBEELD')
    c.restoreState()


def write_pdf():
    os.makedirs(OUT, exist_ok=True)
    c = canvas.Canvas(PDF, pagesize=A4, invariant=1, pageCompression=0)
    c.setTitle('Voorbeeld: toets van een schadevaststelling (fictief)')
    c.setAuthor('HumanPush (voorbeeld)')
    c.setCreator('HumanPush tools/maak-voorbeeld.py')
    w, h = A4
    stamp(c, w, h)
    y = h - 30 * mm
    def line(t, size=10.5, bold=False, gap=6.2):
        nonlocal y
        c.setFillColorRGB(*INK)
        c.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
        c.drawString(22 * mm, y, t)
        y -= gap * mm
    line('Toets van een schadevaststelling op basis van een compleet dossier', 15, True, 9)
    line('Opdracht HP-0001 (voorbeeld) · dienst nivre.independent_opinion · catalogusversie 2026-11-20', 9, gap=8)
    line('Opdrachtgever: Voorbeeld Schade B.V. (KvK 00000000)', bold=True)
    line('Professional: Expert B, schade-expert, NIVRE-registratie 00000 (fictief)')
    line('Registercheck bij aanname: NIVRE-register, geldig, ma 10:31', gap=9)
    line('Vraag', 12, True)
    line('Houdt de vastgestelde schadehoogte stand, op basis van het aangeleverde dossier?', gap=9)
    line('Beoordeelde stukken', 12, True)
    for t in ['1. Schademelding met foto\'s (fictief)', '2. Rapport van de eerste expertise met herstelbegroting (fictief)', '3. Offerte van de hersteller (fictief)', '4. Polisblad, alleen ter informatie: dekking valt buiten deze toets']:
        line(t)
    y -= 3 * mm
    line('Methode', 12, True)
    line('Toetsing van de herstelbegroting aan de foto\'s en de offerte: posten, hoeveelheden en tarieven.')
    line('Vergelijking met gangbare tarieven in de branche. Op stukken, zonder opname ter plaatse.', gap=9)
    line('Motivering', 12, True)
    line('De begrote posten sluiten aan bij de zichtbare schade. Hoeveelheden en tarieven liggen binnen')
    line('een gangbare bandbreedte. Er zijn geen posten gevonden die niet bij de schade passen.', gap=9)
    line('Uitkomst', 12, True)
    line('Houdt stand.', 12, True, 9)
    line('Disclaimer', 12, True)
    line('Oordeel op stukken. Geen opname ter plaatse. Alleen B2B. Geen personenschade. Geen oordeel', 9.5)
    line('over dekking. Dit is een fictief voorbeeld; er is geen echte opdracht en geen echte expert.', 9.5, gap=9)
    line('Ondertekening', 12, True)
    line('Handtekening met passkey: VOORBEELD – niet verifieerbaar.', 10)
    c.showPage()
    c.save()


def main():
    write_pdf()
    data = open(PDF, 'rb').read()
    sha = hashlib.sha256(data).hexdigest()
    dossier = {
        'example': True,
        'note': 'Fictief voorbeeld. Geen echte opdracht, geen echte expert, geen echte organisatie. De velden volgen het resultaat van v1_get_result op humanpush-mcp test/v1-stack, aangevuld met de registercheck en de stappen uit het dossier.',
        'order_id': 'HP-0001',
        'service_id': 'nivre.independent_opinion',
        'service_name': 'Toets van een schadevaststelling op basis van een compleet dossier',
        'catalog_version': '2026-11-20',
        'organisation': {'name': 'Voorbeeld Schade B.V.', 'kvk': '00000000'},
        'professional': {'name': 'Expert B', 'register': 'NIVRE', 'registration_number': '00000'},
        'registry_check': {'register': 'NIVRE', 'status': 'geldig', 'checked_at': 'ma 10:31 (voorbeeld)', 'source': 'openbaar NIVRE-register (voorbeeld)'},
        'document': {'file': 'rapport-voorbeeld.pdf', 'media_type': 'application/pdf', 'bytes': len(data)},
        'sha256': sha,
        'sha256_of': 'document',
        'signed_step_sha256': 'VOORBEELD – niet verifieerbaar',
        'signature': 'VOORBEELD – niet verifieerbaar',
        'outcome': 'houdt stand',
        'disclaimer': 'Oordeel op stukken. Geen opname ter plaatse. Alleen B2B. Geen personenschade. Geen oordeel over dekking.',
        'delivered_at': 'wo 15:12 (voorbeeld)',
        'steps': [
            {'step': 'besteld', 'at': 'ma 10:02', 'by': 'agent van het bedrijf'},
            {'step': 'betaald', 'at': 'ma 10:05', 'by': 'betaallink'},
            {'step': 'registercheck', 'at': 'ma 10:31', 'by': 'HumanPush'},
            {'step': 'aangenomen', 'at': 'ma 10:31', 'by': 'Expert B', 'signature': 'VOORBEELD – niet verifieerbaar'},
            {'step': 'opgeleverd', 'at': 'wo 15:12', 'by': 'Expert B', 'signature': 'VOORBEELD – niet verifieerbaar', 'sha256': sha},
            {'step': 'geaccepteerd', 'at': 'wo 16:40', 'by': 'bedrijf'},
            {'step': 'uitbetaald', 'at': 'wo 16:40', 'by': 'HumanPush'},
        ],
    }
    with open(os.path.join(OUT, 'dossier-voorbeeld.json'), 'w') as f:
        json.dump(dossier, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(sha)


if __name__ == '__main__':
    main()
