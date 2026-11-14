/* TABI TAIPEI v2.0.101 — js/tt2-home.js: home: the greeting at the foot of the home
   Was js/home-greeting-v290.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.91 — the 1.0 greeting (js/hero-intro.js) on the 2.0 home, small, centred
   at the bottom, at most two lines (styles in css/tt2-home.css since 2.0.93).
   hero-intro.js still picks and changes the greeting (time of day, special days, no repeats,
   double / triple tap replies; since 2.0.91 the hello of the time of day on line 1 and the
   message on line 2). It lived in .hero-stage, which 2.0 hides, so the element is moved out to
   #top. Here:
   - emoji are left out of what is shown (the user's choice);
   - each greeting is typed in, a character at a time behind a thin caret, a little unevenly,
     with a breath after punctuation and between the lines; the caret blinks a few times and
     goes. The untyped rest is already laid out (transparent), so centred lines never shift.
     Typed again when the greeting changes or the home is opened again; shown at once under
     prefers-reduced-motion;
   - on short screens (Safari's toolbars) it moves up to 20px under the index, and is hidden
     only when even that does not fit (v2.0.102; was: hidden). */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var hero = doc.getElementById('top'), greet = doc.getElementById('hero-greeting');
  if (!hero || !greet) return;
  greet.classList.add('tt290-greeting');
  hero.appendChild(greet);

  var EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}︎️‍⃣]/gu;
  var PAUSE = /[、。，．！？!?…‥]/;
  var TYPE_MS = 85, LINE_GAP = 380, START = 450, AGAIN = 120;
  var reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* the lines as hero-intro.js wrote them: emoji out, marked as ours, full text kept */
  function take() {
    var lines = [].slice.call(greet.querySelectorAll('.hero-greeting-line')), out = [];
    lines.forEach(function (el) {
      var t = el.dataset.ttFull != null ? el.dataset.ttFull
        : el.textContent.replace(EMOJI, '').replace(/^\s+|\s+$/g, '');
      if (!t) { el.remove(); return; }
      el.dataset.ttFull = t;
      out.push(el);
    });
    return out;
  }

  var run = 0, timer = 0;
  function show(lines) { lines.forEach(function (el) { el.textContent = el.dataset.ttFull; }); }
  function type(lines, delay) {
    var my = ++run;
    clearTimeout(timer);
    if (reduce && reduce.matches) { show(lines); return; }
    var parts = lines.map(function (el) {
      var done = doc.createElement('span'), caret = doc.createElement('span'), rest = doc.createElement('span');
      caret.className = 'tt290-caret';
      rest.className = 'tt290-rest';
      rest.textContent = el.dataset.ttFull;
      el.textContent = '';
      el.appendChild(done); el.appendChild(caret); el.appendChild(rest);
      return {chars: Array.from(el.dataset.ttFull), done: done, caret: caret, rest: rest, n: 0};
    });
    var li = 0;
    parts.forEach(function (p, i) { p.caret.hidden = i !== 0; });
    function step() {
      if (my !== run) return;
      var p = parts[li];
      if (!p) return;
      if (p.n < p.chars.length) {
        var ch = p.chars[p.n++];
        p.done.textContent = p.chars.slice(0, p.n).join('');
        p.rest.textContent = p.chars.slice(p.n).join('');
        timer = setTimeout(step, TYPE_MS * (0.65 + Math.random() * 0.7) + (PAUSE.test(ch) ? 160 : 0));
        return;
      }
      if (li < parts.length - 1) {
        p.caret.hidden = true;
        parts[++li].caret.hidden = false;
        timer = setTimeout(step, LINE_GAP);
        return;
      }
      p.caret.classList.add('is-end'); // blinks a few times, then fades (css)
    }
    timer = setTimeout(step, delay);
  }

  /* v2.0.102: Safari's toolbars leave less height than the home-screen app, and the greeting
     used to vanish there. Now it keeps its place at the foot when there is room; when it would
     come within 20px of the index it sits 20px under the index instead, as long as it stays
     8px clear of the bottom; only when even that does not fit is it hidden. */
  var queued = 0, GAP = 20, FOOT = 8;
  function check() {
    queued = 0;
    if (!root.classList.contains('tt-route-home')) return;
    greet.classList.remove('tt290-off');
    greet.style.removeProperty('bottom');
    var items = doc.querySelectorAll('.tt-home-item'), bottom = 0, i, r;
    for (i = 0; i < items.length; i++) {
      r = items[i].getBoundingClientRect();
      if (r.height) bottom = Math.max(bottom, r.bottom);
    }
    var g = greet.getBoundingClientRect();
    if (!g.height) { greet.classList.add('tt290-off'); return; }
    if (g.top >= bottom + GAP) return;
    var foot = hero.getBoundingClientRect().bottom - (bottom + GAP + g.height);
    if (foot >= FOOT) greet.style.setProperty('bottom', foot + 'px', 'important');
    else greet.classList.add('tt290-off');
  }
  function later() { if (!queued) queued = requestAnimationFrame(check); }

  // hero-intro.js writes fresh lines whenever the greeting changes or answers a tap
  new MutationObserver(function () {
    var fresh = [].some.call(greet.querySelectorAll('.hero-greeting-line'), function (el) { return el.dataset.ttFull == null; });
    if (!fresh) return;
    type(take(), AGAIN);
    later();
  }).observe(greet, {childList: true});
  // back on the home: type it again
  var home = root.classList.contains('tt-route-home');
  new MutationObserver(function () {
    var now = root.classList.contains('tt-route-home');
    if (now && !home) type(take(), START);
    home = now;
    later();
  }).observe(root, {attributes: true, attributeFilter: ['class']});
  addEventListener('resize', later);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(later);

  type(take(), START);
  later();
})();
