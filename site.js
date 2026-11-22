// HumanPush: mobiel menu, Inloggen-menu, dienstkaarten en tabs, kant kiezen, de voorbeeld-demo en (alleen met de vlag aan) het chatvenster.
// Zonder JavaScript staat het menu open, is Inloggen verborgen (testvlag uit) en staan alle kanten, tabs en uitklappers open.
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

  // Testomgeving: alleen met de vlag aan (config.js) tonen we Inloggen en "Proberen in de testomgeving".
  document.querySelectorAll('[data-testenv]').forEach(function (el) { el.hidden = cfg.testenv !== true; });
  document.querySelectorAll('[data-testenv-off]').forEach(function (el) { el.hidden = cfg.testenv === true; });

  // Inloggen: een menu met één ingang (de testomgeving voor professionals).
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

  // Escape sluit menu en Inloggen.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (login && login.classList.contains('open')) { setLogin(false); loginBtn.focus(); }
    if (button && button.getAttribute('aria-expanded') === 'true') { setMenu(false); button.focus(); }
  });

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; } }

  // Doelgroepkeuze op home: de keuze blijft alleen in deze browser staan (localStorage) en stemt /hoe-het-werkt af.
  document.querySelectorAll('[data-aud]').forEach(function (a) {
    a.addEventListener('click', function () { store('hp-doelgroep', a.getAttribute('data-aud')); });
  });

  // Schakelaar "Voor de professional | Voor het bedrijf" op de dienstkaarten: één kant zichtbaar.
  function bindToggle(root, itemSel) {
    var btns = root.querySelectorAll(':scope > .svc-bar .svc-view');
    function set(v) {
      root.setAttribute('data-view', v);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
      root.querySelectorAll(itemSel).forEach(function (el) { if (el.getAttribute('data-v') === v) el.removeAttribute('data-off'); else el.setAttribute('data-off', ''); });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-view')); }); });
    return set;
  }

  // Dienstkaarten: tabs per register (ARIA tabs, pijltjestoetsen, Home/End), details ingeklapt.
  document.querySelectorAll('[data-svc]').forEach(function (svc) {
    var nav = svc.querySelector('.svc-tabs');
    var tabs = [].slice.call(svc.querySelectorAll('.svc-tab'));
    var panels = tabs.map(function (t) { return svc.querySelector('#' + t.getAttribute('data-tab')); });
    nav.setAttribute('role', 'tablist');
    nav.removeAttribute('aria-label'); nav.setAttribute('aria-label', 'Registers');
    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab'); t.setAttribute('aria-controls', panels[i].id); t.removeAttribute('aria-current');
      panels[i].setAttribute('role', 'tabpanel'); panels[i].setAttribute('aria-labelledby', t.id);
    });
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      // Alleen de tabrij horizontaal meeschuiven, nooit de pagina zelf.
      var t = tabs[i], l = t.offsetLeft - nav.offsetLeft, r = l + t.offsetWidth;
      if (l < nav.scrollLeft) nav.scrollLeft = l; else if (r > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = r - nav.clientWidth;
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function (e) { e.preventDefault(); select(i, false); if (history.replaceState) history.replaceState(null, '', '#' + panels[i].id); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault(); select((n + tabs.length) % tabs.length, true);
      });
    });
    svc.querySelectorAll('details.svc-more').forEach(function (d) { d.open = false; d.setAttribute('data-ready', ''); });
    var setView = bindToggle(svc, '.svc-v');
    var aud = store('hp-doelgroep');
    if (aud === 'pro' || aud === 'bedrijf') setView(aud);
    var start = tabs.findIndex(function (t) { return '#' + t.getAttribute('data-tab') === location.hash; });
    select(start < 0 ? 0 : start, false);
    svc.setAttribute('data-ready', '');
  });

  // Kant kiezen op /hoe-het-werkt: "Ik ben professional | Ik ben een bedrijf (of zijn agent)". Zonder JS: beide kanten.
  document.querySelectorAll('[data-side-root]').forEach(function (root) {
    var btns = root.querySelectorAll('.svc-view');
    var sides = document.querySelectorAll('.side[data-side]');
    function set(v, save) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-view') === v ? 'true' : 'false'); });
      sides.forEach(function (s) { if (s.getAttribute('data-side') === v) s.removeAttribute('data-off'); else s.setAttribute('data-off', ''); });
      if (save) store('hp-doelgroep', v);
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-view'), true); }); });
    var aud = store('hp-doelgroep');
    set(aud === 'pro' || aud === 'bedrijf' ? aud : 'bedrijf', false);
    document.querySelectorAll('.side[data-side]').forEach(function (s) { s.parentNode.setAttribute('data-side-ready', ''); });
  });

  // Registers en sectoren op home: een professional landt op zijn eigen pagina, een bedrijf op /bedrijven.
  if (store('hp-doelgroep') === 'pro') document.querySelectorAll('a[data-tablink]').forEach(function (a) { a.href = '/professionals#' + a.getAttribute('data-tablink'); });

  // Voorbeeld-demo in de hero: loopt stap voor stap, pauzeert bij hover, focus of de knop; stil bij verminderde beweging.
  document.querySelectorAll('.demo[data-anim]').forEach(function (demo) {
    var btn = demo.querySelector('.demo-pause');
    if (reduce) { demo.removeAttribute('data-anim'); if (btn) btn.hidden = true; return; }
    var rows = demo.querySelectorAll('li');
    var tA = demo.querySelector('[data-t="1"]'), tB = demo.querySelector('[data-t="2"]');
    // Elke rij krijgt een eigen frame (ook de laatste), dus geen rij blijft ooit verborgen. Rij met de beurten krijgt een extra frame.
    var frames = [];
    rows.forEach(function (row) {
      frames.push(function () { row.classList.add('on'); if (row.contains(tA)) { tA.classList.add('seen', 'now'); tA.textContent = 'Professional A · aangeboden'; } });
      if (tA && tB && row.contains(tA)) frames.push(function () { tA.classList.remove('now'); tA.classList.add('pass'); tA.textContent = 'Professional A · doorgegeven'; tB.classList.add('seen', 'now'); tB.textContent = 'Professional B · aangeboden'; });
    });
    frames.push(function () {}, function () {});
    function reset() {
      rows.forEach(function (r) { r.classList.remove('on'); });
      tA.className = ''; tB.className = ''; tA.textContent = 'Professional A'; tB.textContent = 'Professional B';
    }
    var f = 1, paused = false, hover = false;
    reset();
    frames[0]();
    setInterval(function () {
      if (paused || hover || document.hidden) return;
      if (f === 0) reset();
      frames[f](); f = (f + 1) % frames.length;
    }, 1400);
    demo.addEventListener('mouseenter', function () { hover = true; });
    demo.addEventListener('mouseleave', function () { hover = false; });
    demo.addEventListener('focusin', function () { hover = true; });
    demo.addEventListener('focusout', function () { hover = false; });
    btn.addEventListener('click', function () {
      paused = !paused;
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    });
  });

  // Uitklappers "Lees meer": zonder JavaScript open, met JavaScript eerst dicht.
  document.querySelectorAll('details.more').forEach(function (d) { d.open = false; d.setAttribute('data-ready', ''); });

  // Een anker in een ingeklapte uitklapper: klap die eerst open.
  function openFor(hash) {
    if (!hash || hash.length < 2) return;
    var el = document.getElementById(decodeURIComponent(hash.slice(1)));
    for (var d = el && el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    if (el) el.scrollIntoView();
  }
  if (location.hash) openFor(location.hash);
  window.addEventListener('hashchange', function () { openFor(location.hash); });

  // Blok "Vraag het HumanPush" op /agents: alleen tonen als de vlag aan staat.
  document.querySelectorAll('[data-ask-on]').forEach(function (el) { el.hidden = cfg.ask !== true; });
  document.querySelectorAll('[data-ask-off]').forEach(function (el) { el.hidden = cfg.ask === true; });

  // Chatvenster: alleen laden als de vlag aan staat. Anders wordt er geen chatbestand opgehaald.
  if (cfg.chat === true) {
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/chat.css'; document.head.appendChild(css);
    var js = document.createElement('script'); js.src = '/chat.js'; js.defer = true; document.head.appendChild(js);
  }
})();
