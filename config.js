// HumanPush: vlaggen voor de site. Standaard staat alles UIT.
// chat: laadt chat.js en chat.css (het venster "Vraag het HumanPush"). Zet pas op true als ASK_ENABLED in Vercel aan staat.
// ask: toont op /agents het blok met POST /api/ask. Zet gelijk aan ASK_ENABLED in Vercel.
// testenv: toont de knop Inloggen (Professionals: testomgeving) en op /agents "Proberen in de testomgeving". Alleen Bob zet dit aan.
window.HP_CONFIG = {
  chat: false,
  ask: false,
  testenv: false
};

// Zet de klasse "js" al vóór de eerste weergave (site.js laadt met defer), zodat het menu en de kaarten niet verspringen.
document.documentElement.classList.replace('no-js', 'js');
