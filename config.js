// HumanPush: vlaggen voor de site. Standaard staat alles UIT.
// chat: laadt chat.js en chat.css (het venster "Vraag het HumanPush"). Zet pas op true als ASK_ENABLED in Vercel aan staat.
// ask: toont op /agents het blok met POST /api/ask. Zet gelijk aan ASK_ENABLED in Vercel.
// LOGIN_PRO_URL / LOGIN_BIZ_URL: null = "komt eraan" (de links gaan naar /inloggen).
window.HP_CONFIG = {
  chat: false,
  ask: false,
  LOGIN_PRO_URL: null,
  LOGIN_BIZ_URL: null
};
