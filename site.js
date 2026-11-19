// HumanPush: mobiel menu, Inloggen-menu, interactieve flow en (alleen met de vlag aan) het chatvenster.
// Zonder JavaScript staat het menu open, gaat Inloggen naar /inloggen en toont de flow een statische lijst.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
  var cfg = window.HP_CONFIG || {};

  // Mobiel menu
  var button = document.querySelector('.menu-button');
  var nav = document.getElementById('site-nav');
  function setMenu(open) {
    if (!button || !nav) return;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('open', open);
  }
  if (button && nav) {
    button.addEventListener('click', function () { setMenu(button.getAttribute('aria-expanded') !== 'true'); });
  }

  // Inloggen: een menu met twee ingangen. Is een URL in config.js null, dan blijft de link naar /inloggen.
  var login = document.querySelector('.login');
  var loginBtn = login && login.querySelector('.login-btn');
  function setLogin(open) {
    if (!login) return;
    login.classList.toggle('open', open);
    loginBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (login && loginBtn) {
    loginBtn.setAttribute('role', 'button');
    loginBtn.setAttribute('aria-expanded', 'false');
    loginBtn.addEventListener('click', function (e) { e.preventDefault(); setLogin(!login.classList.contains('open')); });
    loginBtn.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); setLogin(!login.classList.contains('open')); } });
    document.addEventListener('click', function (e) { if (!login.contains(e.target)) setLogin(false); });
  }
  var urls = { pro: cfg.LOGIN_PRO_URL, biz: cfg.LOGIN_BIZ_URL };
  document.querySelectorAll('[data-login]').forEach(function (a) {
    var u = urls[a.getAttribute('data-login')];
    if (typeof u === 'string' && u) { a.href = u; var s = a.querySelector('.soon'); if (s) s.remove(); }
  });

  // Interactieve flow: hover, focus en tik tonen de uitleg; Esc sluit; hooguit één tegelijk.
  document.querySelectorAll('[data-flow]').forEach(function (f) {
    function closeAll(except) {
      f.querySelectorAll('.fn.is-open').forEach(function (n) {
        if (n !== except) { n.classList.remove('is-open'); delete n.dataset.pinned; n.querySelector('.fbtn').setAttribute('aria-expanded', 'false'); }
      });
    }
    f.querySelectorAll('.fbtn').forEach(function (b) {
      var n = b.parentNode;
      function open() { closeAll(n); n.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); }
      function close() { if (n.dataset.pinned) return; n.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); }
      n.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') open(); });
      n.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') close(); });
      b.addEventListener('focus', open);
      b.addEventListener('blur', close);
      b.addEventListener('click', function () {
        if (n.dataset.pinned) { delete n.dataset.pinned; n.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); }
        else { open(); n.dataset.pinned = '1'; }
      });
    });
    document.addEventListener('click', function (e) { if (!f.contains(e.target)) closeAll(null); });
  });

  // Escape sluit menu, Inloggen en de flow.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (login && login.classList.contains('open')) { setLogin(false); loginBtn.focus(); }
    if (button && button.getAttribute('aria-expanded') === 'true') { setMenu(false); button.focus(); }
    document.querySelectorAll('[data-flow] .fn.is-open').forEach(function (n) { n.classList.remove('is-open'); delete n.dataset.pinned; n.querySelector('.fbtn').setAttribute('aria-expanded', 'false'); });
  });

  // Blok "Vraag het HumanPush" op /agents: alleen tonen als de vlag aan staat.
  document.querySelectorAll('[data-ask-on]').forEach(function (el) { el.hidden = cfg.ask !== true; });
  document.querySelectorAll('[data-ask-off]').forEach(function (el) { el.hidden = cfg.ask === true; });

  // Chatvenster: alleen laden als de vlag aan staat. Anders wordt er geen chatbestand opgehaald.
  if (cfg.chat === true) {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/chat.css'; document.head.appendChild(css);
    var js = document.createElement('script'); js.src = '/chat.js'; js.defer = true; document.head.appendChild(js);
  }
})();
