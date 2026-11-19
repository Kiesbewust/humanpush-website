// HumanPush: de weigerregels van de antwoordmotor. Draait vóór elk zoeken of model, op de vraag als data.
// Volgorde: persoonsgegevens, injectie, buiten de bronnen, buiten scope, toezegging, advies, bedragen.

export const REASONS = ['out_of_scope', 'advice', 'commitment', 'amounts', 'personal_data', 'no_source', 'injection'];

const HUMAN = 'info@humanpush.nl';

export const REFUSAL_TEXT = {
  nl: {
    out_of_scope: 'Ik beantwoord alleen vragen over hoe HumanPush werkt.',
    advice: 'Ik geef geen juridisch, fiscaal of vakinhoudelijk advies en beoordeel geen specifieke situatie. Een mens helpt je via info@humanpush.nl.',
    commitment: 'Ik kan niets toezeggen, geen uitzonderingen maken en niets zeggen over een specifieke opdracht of persoon. Een mens beantwoordt vragen via info@humanpush.nl; uitzonderingen per geval bestaan niet.',
    amounts: 'Bedragen volgen na de testfase. De vaste vergoeding staat in list_services vóór je bestelt.',
    personal_data: 'Deel geen persoonsgegevens. Stel je vraag opnieuw zonder e-mailadres, telefoonnummer, IBAN of naam.',
    no_source: 'Dat staat niet in onze regels. Een mens helpt je via info@humanpush.nl.',
    injection: 'Ik volg alleen de vaste regels van HumanPush en beantwoord alleen vragen daarover.'
  },
  en: {
    out_of_scope: 'I only answer questions about how HumanPush works.',
    advice: 'I do not give legal, tax or professional advice and do not assess a specific situation. A human helps you at info@humanpush.nl.',
    commitment: 'I cannot promise anything, make exceptions or say anything about a specific order or person. A human answers questions at info@humanpush.nl; there are no exceptions per case.',
    amounts: 'Amounts follow after the test phase. The fixed fee is in list_services before you order.',
    personal_data: 'Do not share personal data. Ask again without an email address, phone number, IBAN or name.',
    no_source: 'That is not in our rules. A human helps you at info@humanpush.nl.',
    injection: 'I only follow the fixed rules of HumanPush and only answer questions about them.'
  }
};

export const DISCLAIMER = {
  nl: 'Dit is informatie uit de regels van HumanPush, geen advies en geen toezegging.',
  en: "This is information from HumanPush's rules, not advice and not a commitment."
};
export { HUMAN };

const EN_WORDS = new Set('the a an is are does do how what when who why which can my your our you i it to of for in on with without and or not if will should would long much does agent order professional accept turn working hours paid pay connect ask questions'.split(' '));
const NL_WORDS = new Set('de het een is zijn hoe wat wanneer wie waarom welke kan kun mijn je jij jullie ik om te van voor in op met zonder en of niet als wordt worden heeft hebben lang aannemen beurt werkuren betalen opdracht vragen stellen mag'.split(' '));

export function detectLanguage(q, hint) {
  if (hint === 'nl' || hint === 'en') return hint;
  const words = q.toLowerCase().match(/[a-zà-ÿ]+/g) || [];
  let en = 0, nl = 0;
  for (const w of words) { if (EN_WORDS.has(w)) en++; if (NL_WORDS.has(w)) nl++; }
  return en > nl ? 'en' : 'nl';
}

const RE = {
  email: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
  phone: /(\+31|\b0)[\s-]?\d([\s-]?\d){8}\b/,
  iban: /\b[A-Z]{2}\d{2}\s?[A-Z]{4}(\s?\d){10}\b/i,
  bsn: /\b\d{9}\b/,
  namedPerson: /\b(mijn naam is|ik heet|my name is)\b/i,
  injection: /\b(negeer|vergeet|ignore|forget|disregard)\b[\s\S]{0,40}\b(instructies|instructions|regels|rules|prompt|opdracht)\b|\b(systeemprompt|system ?prompt|jailbreak|developer mode|ontwikkelaarsmodus)\b|\b(you are now|jij bent nu|je bent nu|act as|doe alsof|pretend to be)\b/i,
  noSourceTopic: /\b(adres|address|bezoekadres|postadres|postcode|rsin|vestigingsnummer|blockchain|telefoonnummer van (jullie|humanpush)|phone number of)\b/i,
  outOfScope: /\b(gedicht|poem|recept|recipe|weerbericht|weather|het weer|vertaal|translate|grap|joke|huiswerk|homework|schrijf (een|mij|me|code)|write (a|me|code|an)|code schrijven|programmeer|opstel|essay|lied|song|sport|voetbal)\b/i,
  advice: /\b(juridisch|juridische|fiscaal|fiscale|belasting|advies|adviseer|advice|advise|legal(ly)?|tax|rechtsgeldig|geldig in de rechtbank|valid in court)\b|\bmag ik\b|\bis (dit|het) (wel )?(geldig|legaal|toegestaan)\b|\bis this (legal|valid|allowed)\b|\bkan ik mijn\b[\s\S]{0,60}\b(laten|gebruiken voor)\b|\bshould i\b/i,
  commitment: /\b(uitzondering|exception|korting|discount|beloof|belofte|garandeer jullie|promise|verleng(en)?|extend|extension)\b|\b(status|stand) van (mijn |de |onze )?(opdracht|bestelling|order)\b|\b(opdracht|bestelling|order) (nr\.? ?|nummer )?#?\d+\b|\bwie is (professional|de professional|deze professional|expert|de expert|deskundige|taxateur)\b|\bwho is (the )?(professional|expert)\b|\bkunnen jullie (voor mij|mij|me|ons)\b|\bcan you (do|make|give|arrange)\b[\s\S]{0,40}\bfor (me|us)\b|\bvoor mij (regelen|doen)\b/i,
  amounts: /\b(hoeveel kost|wat kost|wat kosten|hoe duur|hoe hoog is (de|het)|hoeveel (euro|geld|betaal)|wat is de prijs|wat zijn de prijzen|prijslijst|tarieven|how much|what does it cost|what is the price|price list|prices)\b|€\s?\d|\beur\s?\d/i
};

// Geeft { reason } bij een weigering, of null als de vraag naar de zoekstap mag.
export function prefilter(question) {
  const q = question.normalize('NFC');
  if (RE.email.test(q) || RE.phone.test(q) || RE.iban.test(q) || RE.bsn.test(q) || RE.namedPerson.test(q)) return { reason: 'personal_data' };
  if (RE.injection.test(q)) return { reason: 'injection' };
  if (RE.noSourceTopic.test(q)) return { reason: 'no_source' };
  if (RE.outOfScope.test(q)) return { reason: 'out_of_scope' };
  if (RE.commitment.test(q)) return { reason: 'commitment' };
  if (RE.advice.test(q)) return { reason: 'advice' };
  if (RE.amounts.test(q)) return { reason: 'amounts' };
  return null;
}

// Woorden waaraan je ziet dat een vraag over HumanPush gaat. Zonder zo'n woord en zonder goede treffer: buiten scope.
export const DOMAIN = /\b(humanpush|agent|agents|professional|professionals|opdracht|opdrachten|order|orders|bestel\w*|beurt\w*|aangeboden|aanbied\w*|doorge\w*|turn|turns|register\w*|passkey\w*|betal\w*|pay\w*|bezwaar|dispute|annuler\w*|cancel\w*|aanne\w*|aanname|accept\w*|werkuren|working|mcp|dienst\w*|service\w*|llms|tool\w*|aanmeld\w*|sign|logboek|log|bewijs|proof|vergoeding|fee|tekenen|teken\w*|sign\w*|nivre|nrvt|nrgd|nrbi|octrooi\w*|patent|testfase|test|inlog\w*|login|jullie|you|garantie\w*|niemand|nobody|werkminuten)\b/i;
