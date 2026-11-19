// HumanPush: het chatvenster "Vraag het HumanPush". Laadt alleen als HP_CONFIG.chat === true (zie config.js en site.js).
// Het venster praat met POST /api/ask, hetzelfde endpoint als agents. Geen cookies, geen localStorage, geen analytics:
// het gesprek leeft alleen in het geheugen van deze pagina.
(function () {
  if (!window.HP_CONFIG || window.HP_CONFIG.chat !== true) return;
  var START = ['Wat zijn werkuren?', 'Wat gebeurt er als niemand aanneemt?', 'Kan mijn agent vragen stellen?'];
  function el(tag, attrs, text) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (text) e.textContent = text; return e; }

  var btn = el('button', { type: 'button', class: 'hpchat-btn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
  btn.appendChild(el('i', { 'aria-hidden': 'true' }));
  btn.appendChild(document.createTextNode('Vraag het HumanPush'));
  btn.appendChild(el('small', null, 'AI-assistent'));

  var panel = el('div', { class: 'hpchat-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hpchat-kop', hidden: '' });
  var head = el('div', { class: 'hpchat-head' });
  head.appendChild(el('h2', { id: 'hpchat-kop' }, 'Vraag het HumanPush'));
  var close = el('button', { type: 'button', class: 'hpchat-close', 'aria-label': 'Sluiten' }, '×');
  head.appendChild(close);
  panel.appendChild(head);
  panel.appendChild(el('p', { class: 'hpchat-note' }, 'Je praat met een AI-assistent. Antwoorden komen uit de regels van HumanPush en zijn geen advies of toezegging. Deel geen persoonsgegevens.'));
  var human = el('p', { class: 'hpchat-human' }, 'Liever een mens? ');
  human.appendChild(el('a', { href: 'mailto:info@humanpush.nl' }, 'info@humanpush.nl'));
  panel.appendChild(human);
  var log = el('div', { class: 'hpchat-log', 'aria-live': 'polite' });
  panel.appendChild(log);
  var starts = el('div', { class: 'hpchat-starts' });
  START.forEach(function (q) { var b = el('button', { type: 'button' }, q); b.addEventListener('click', function () { ask(q); }); starts.appendChild(b); });
  panel.appendChild(starts);
  var form = el('form', { class: 'hpchat-form' });
  var label = el('label', { for: 'hpchat-q', class: 'hpchat-sr' }, 'Je vraag');
  var input = el('input', { id: 'hpchat-q', type: 'text', maxlength: '500', autocomplete: 'off', placeholder: 'Stel je vraag over HumanPush' });
  var send = el('button', { type: 'submit' }, 'Vraag');
  form.appendChild(label); form.appendChild(input); form.appendChild(send);
  panel.appendChild(form);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  function add(cls, text, sources, refused) {
    var m = el('div', { class: 'hpchat-msg ' + cls });
    m.appendChild(el('p', null, text));
    if (sources && sources.length) {
      var s = el('p', { class: 'hpchat-src' }, 'Bron: ');
      sources.forEach(function (src, i) { if (i) s.appendChild(document.createTextNode(', ')); s.appendChild(el('a', { href: src.url }, src.title)); });
      m.appendChild(s);
    }
    if (refused) { var h = el('p', { class: 'hpchat-src' }, 'Een mens helpt je via '); h.appendChild(el('a', { href: 'mailto:info@humanpush.nl' }, 'info@humanpush.nl')); m.appendChild(h); }
    log.appendChild(m); log.scrollTop = log.scrollHeight;
  }
  function ask(q) {
    q = (q || '').trim(); if (q.length < 3) return;
    add('me', q); input.value = ''; send.disabled = true;
    fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) { add('hp', x.j && x.j.message ? x.j.message : 'Het lukt nu niet om te antwoorden.', null, true); return; }
        add('hp', x.j.answer, x.j.sources, !x.j.answerable);
      })
      .catch(function () { add('hp', 'Het lukt nu niet om te antwoorden.', null, true); })
      .then(function () { send.disabled = false; input.focus(); });
  }
  function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); input.focus(); }
  function shut() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
  btn.addEventListener('click', open);
  close.addEventListener('click', shut);
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { shut(); return; }
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('button, a, input'); var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
