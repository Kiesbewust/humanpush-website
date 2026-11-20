// HumanPush: mobiel menu, Inloggen-menu, interactieve flow, dienstkaarten, steppers, de voorbeeld-demo en (alleen met de vlag aan) het chatvenster.
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

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { return null; } }

  // Doelgroepkeuze op home: de keuze blijft alleen in deze browser staan (localStorage) en stemt /hoe-het-werkt af.
  document.querySelectorAll('[data-aud]').forEach(function (a) {
    a.addEventListener('click', function () { store('hp-doelgroep', a.getAttribute('data-aud')); });
  });

  // Schakelaar "Voor de professional | Voor het bedrijf" (dienstkaarten en steppers): één kant zichtbaar.
  function bindToggle(root, itemSel) {
    var btns = root.querySelectorAll(':scope > .svc-bar .svc-view, :scope > .stepper-bar .svc-view');
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
    bindToggle(svc, '.svc-v');
    var start = tabs.findIndex(function (t) { return '#' + t.getAttribute('data-tab') === location.hash; });
    select(start < 0 ? 0 : start, false);
    svc.setAttribute('data-ready', '');
  });

  // Stepper: 4 stappen, pijlen, swipe (scroll-snap) en pijltjestoetsen. Geen autoplay.
  document.querySelectorAll('[data-stepper]').forEach(function (st) {
    var track = st.querySelector('.stepper-track');
    var steps = [].slice.call(st.querySelectorAll('.step'));
    var dots = [].slice.call(st.querySelectorAll('.stepper-dot'));
    var pos = st.querySelector('[data-pos]');
    var prev = st.querySelector('[data-prev]'), next = st.querySelector('[data-next]');
    var idx = 0;
    var set = bindToggle(st, '.step-v');
    var aud = store('hp-doelgroep');
    var views = [].map.call(st.querySelectorAll('.svc-view'), function (b) { return b.getAttribute('data-view'); });
    if (aud && views.indexOf(aud) >= 0) set(aud);
    st.setAttribute('data-ready', '');
    steps.forEach(function (s, i) { s.setAttribute('role', 'group'); s.setAttribute('aria-roledescription', 'stap'); });
    function show(i, scroll) {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      pos.textContent = idx + 1;
      prev.disabled = idx === 0; next.disabled = idx === steps.length - 1;
      dots.forEach(function (d, j) { if (j === idx) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      steps.forEach(function (s, j) { s.setAttribute('aria-hidden', j === idx ? 'false' : 'true'); s.inert = j !== idx; });
      if (scroll) track.scrollTo({ left: steps[idx].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    }
    prev.addEventListener('click', function () { show(idx - 1, true); });
    next.addEventListener('click', function () { show(idx + 1, true); });
    dots.forEach(function (d, j) { d.addEventListener('click', function () { show(j, true); }); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1, true); }
    });
    var t;
    track.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var w = track.clientWidth || 1;
        var i = Math.round(track.scrollLeft / (steps[0].offsetWidth + 16 || w));
        if (i !== idx) show(i, false);
      }, 80);
    }, { passive: true });
    show(0, false);
  });

  // Voorbeeld-demo in de hero: loopt stap voor stap, pauzeert bij hover, focus of de knop; stil bij verminderde beweging.
  document.querySelectorAll('.demo[data-anim]').forEach(function (demo) {
    var btn = demo.querySelector('.demo-pause');
    if (reduce) { demo.removeAttribute('data-anim'); if (btn) btn.hidden = true; return; }
    var rows = demo.querySelectorAll('li');
    var tA = demo.querySelector('[data-t="1"]'), tB = demo.querySelector('[data-t="2"]');
    var frames = [
      function () { rows[0].classList.add('on'); },
      function () { rows[1].classList.add('on'); tA.classList.add('seen', 'now'); tA.textContent = 'Expert A · aangeboden'; },
      function () { tA.classList.remove('now'); tA.classList.add('pass'); tA.textContent = 'Expert A · doorgegeven'; tB.classList.add('seen', 'now'); tB.textContent = 'Expert B · aangeboden'; },
      function () { rows[2].classList.add('on'); },
      function () { rows[3].classList.add('on'); },
      function () {}, function () {}
    ];
    function reset() {
      rows.forEach(function (r) { r.classList.remove('on'); });
      tA.className = ''; tB.className = ''; tA.textContent = 'Expert A'; tB.textContent = 'Expert B';
    }
    var f = 0, paused = false, hover = false;
    reset();
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
