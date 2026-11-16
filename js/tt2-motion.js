/* TABI TAIPEI v2.0.116 — js/tt2-motion.js: motion between and inside chapters.
   1. Chapter to chapter (the menu, links): #guide fades in like the way in from the home
      (css/tt2-shared.css tt2-chapter-in): 0.6s from 60ms, 遠出 0.7s from 180ms, opacity only.
   2. A chapter's own tabs (名所・博物館 / 撮影スポット / イベント, 現在地 / 駅から探す / 一覧, 夜市 /
      商圏): what appears fades in, 0.4s (1.5× the chapter fade), no movement; 旅支度's 注意事項 /
      入国カード / 交通パス at the chapter speed, 0.6s (v2.0.111); 見所's 名所・博物館 / 撮影スポット / イベント and 遠出's
      four places too (v2.0.115; 遠出's 1.0 slide in guide.js removed). How: a capture listener notes what is on screen before the switch;
      each new box is faded as soon as it appears, before it is first drawn (v2.0.116; was two frames late: a blink).
   3. The category wheels (and their pills; 味わい 一覧 too) change the list with no motion; a list only comes in
      with its chapter (v2.0.110, the user's call; was a row-by-row rise).
   4. 味わい: the three restaurants slide in from the left one after another, top to bottom
      (28px, 0.56s, 0.15s apart), as if the list had just been run — when the result changes,
      on 味わい's tabs and on entering the chapter. A refresh of the same three does not replay.
   Inside #guide only opacity-like changes that never make it a box for position:fixed children:
   #guide itself takes `opacity`; blocks and cards take `filter: opacity()` and `translate`
   (a card whose opacity is pinned !important still fades). Nothing moves under
   prefers-reduced-motion. */
(() => {
  'use strict';
  const guide = document.getElementById('guide');
  if (!guide || !Element.prototype.animate) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const SWITCH = '[role="tab"], .ct-tab, .tt2-chapter-tab, .tab-pill, .tt2-wheel, [data-tt-travel-tab], .daytrip-destination-button';
  // v2.0.115: 旅支度's three tabs, 見所's three and 遠出's four places fade at the chapter speed (0.6s)
  const SLOW = '[data-tt-travel-tab], .tt2-chapter-tab[data-tt2-chapter="sights"], .daytrip-destination-button';
  const WHEEL = '.tab-pill, .tt2-wheel, .tab-pills, .food-directory-tab, .food-directory-tabs'; // + 味わい 一覧's wheel (v2.0.111)
  const SKIP = '.ct-tabs, .tt2-chapter-tabs, .tt-travel-tabs, .tt2-wheel, .tab-pills, [role="tablist"], .nm-map, #recommend-results, #food-search, .tt-chapter-heading';

  const shown = e => e.getClientRects().length > 0;
  const flipBack = document.getElementById('food-flip-back');
  const onScreen = e => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && (r.width || r.height); };
  function visibleSet() {
    const set = new Set();
    for (const e of guide.querySelectorAll('*')) if (shown(e)) set.add(e);
    return set;
  }

  /* ---------- 2. a chapter's own tabs ---------- */
  // v2.0.116: the fade starts before the new content is first drawn. It used to start two frames
  // after the click, so the new page showed at full strength for a frame and then went to nothing:
  // a blink. What appears is now caught, always before a paint, (a) right after the click's own
  // handlers, (b) on each DOM change for 0.5s — MutationObserver callbacks run before the frame is
  // drawn, which catches pages built a frame later (遠出, 旅支度, イベント's calendar) — and (c) two
  // frames on, a last look.
  let switching = null, tabInTimer = 0;
  const watcher = new MutationObserver(muts => { if (switching) sweep(switching, muts); });
  function end() {
    if (!switching) return;
    watcher.disconnect(); clearTimeout(switching.timer); cancelAnimationFrame(switching.frame);
    switching = null;
  }
  addEventListener('click', e => {
    if (reduce.matches || window.tt2Resetting || !(e.target instanceof Element)) return; // js/tt2-reset.js clicks unseen
    const control = e.target.closest(SWITCH);
    if (!control || !guide.contains(control)) return;
    // 3. the wheel: no motion. 味わい 一覧 rebuilds its summary (and so its glow) on every turn:
    // it stays still until 一覧 or the chapter is opened again
    if (control.closest(WHEEL)) { if (control.closest('.food-directory-tabs, .food-directory-tab')) flipBack?.classList.add('tt2-still'); return; }
    if (control.closest('[data-tt2-food-tab="list"]') && flipBack) { flipBack.classList.add('tt2-still'); requestAnimationFrame(() => requestAnimationFrame(() => flipBack.classList.remove('tt2-still'))); } // 一覧 opened: its glow plays (again)
    end();
    const s = switching = {before: visibleSet(), faded: new Set(), food: !!control.closest('[data-tt2-food-tab]'), slow: !!control.closest(SLOW), dropped: false};
    if (s.slow) { // their own older entrances (イベント's bars growing) stay still: this fade is the only motion
      document.documentElement.classList.add('tt2-tab-in');
      clearTimeout(tabInTimer); tabInTimer = setTimeout(() => document.documentElement.classList.remove('tt2-tab-in'), 900);
    }
    addEventListener('click', () => sweep(s), {once: true}); // (a) after the handlers (same click, bubbling)
    watcher.observe(guide, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-hidden', 'open']}); // (b)
    s.timer = setTimeout(end, 500);
    s.frame = requestAnimationFrame(() => { s.frame = requestAnimationFrame(() => { // (c)
      sweep(s);
      if (s.food && !s.dropped) { s.dropped = true; dropCards(true); }
    }); });
  }, true);

  // fade what is new on screen since the click: each topmost new box once
  function sweep(s, muts) {
    if (s !== switching) return;
    const roots = muts ? [...new Set(muts.map(m => m.target))].filter(n => n.nodeType === 1 && guide.contains(n)) : [guide];
    const top = e => { let t = e; for (let p = e.parentElement; p && p !== guide && !s.before.has(p); p = p.parentElement) t = p; return t; };
    for (const r of roots) {
      for (const e of r === guide ? r.querySelectorAll('*') : [r, ...r.querySelectorAll('*')]) {
        if (s.before.has(e) || !shown(e)) continue;
        const t = top(e);
        if (s.faded.has(t)) continue;
        s.faded.add(t);
        if (t.closest(SKIP)) continue;
        // 味わい's own tabs (現在地 / 駅から探す): the three that show come in again
        if (!s.dropped && (s.food || t.contains(results))) { s.dropped = true; dropCards(true); }
        if (onScreen(t)) t.animate([{filter: 'opacity(0)'}, {filter: 'opacity(1)'}],
          {duration: s.slow ? 600 : 400, easing: 'ease-out', fill: 'backwards'});
      }
    }
  }

  /* ---------- 1a. the fade from the home plays once ---------- */
  // css/tt2-shared.css tt2-chapter-in. The 料理辞典 sheet stops it (animation:none) while open, and a
  // stopped CSS animation starts over when the rule matches again: closing the sheet looked like a
  // reload (v2.0.115). Once it has ended — or the sheet stopped it — the rule is switched off.
  const html = document.documentElement;
  const markShown = () => html.classList.add('tt2-chapter-shown');
  guide.addEventListener('animationend', e => { if (e.target === guide && e.animationName === 'tt2-chapter-in') markShown(); });
  guide.addEventListener('animationcancel', e => {
    if (e.target === guide && e.animationName === 'tt2-chapter-in' && document.body.matches('.tt2d-on, .food-swipe-active')) markShown();
  });
  document.addEventListener('tt:viewchange', e => { if (e.detail?.view === 'home') html.classList.remove('tt2-chapter-shown'); });

  /* ---------- 1. chapter to chapter ---------- */
  // only a real change of chapter (view-router also tells of a refresh: changed false)
  document.addEventListener('tt:viewchange', e => {
    const {view: next, previous: from, changed} = e.detail || {};
    if (reduce.matches || !changed || !next || !from || next === 'home' || from === 'home') return; // the home → chapter fade is css
    const trip = next === 'day-trips';
    guide.animate([{opacity: 0}, {opacity: 1}], {duration: trip ? 700 : 600, delay: trip ? 180 : 60, easing: 'ease-out', fill: 'backwards'});
  });

  /* ---------- 4. 味わい: three restaurants, from the left, top to bottom ---------- */
  const results = document.getElementById('recommend-results');
  let lastSig = '', forceUntil = 0;
  function dropCards(force) {
    if (!results || reduce.matches) return;
    // recommend.js may build the three again right after a switch: the new ones drop in too
    if (force) forceUntil = performance.now() + 600; else if (performance.now() < forceUntil) force = true;
    const cards = [...results.querySelectorAll(':scope > .recommend-card')].filter(shown);
    if (!cards.length) return;
    const sig = cards.map(c => c.querySelector('.recommend-venue')?.textContent.trim() || '').join('|');
    if (!force && sig === lastSig) return;
    lastSig = sig;
    cards.forEach((c, i) => c.animate(
      [{filter: 'opacity(0)', translate: '-28px 0'}, {filter: 'opacity(1)', translate: '0 0'}],
      {duration: 560, delay: 80 + i * 150, easing: EASE, fill: 'backwards'}));
  }
  if (results) {
    let queued = 0;
    new MutationObserver(() => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => { if (shown(results)) dropCards(false); });
    }).observe(results, {childList: true});
  }
  // into the 味わい chapter: the first look at the three also drops in
  document.addEventListener('tt:viewchange', () => {
    if (document.documentElement.dataset.ttView === 'food') flipBack?.classList.remove('tt2-still');
    if (document.documentElement.dataset.ttView === 'food') requestAnimationFrame(() => requestAnimationFrame(() => dropCards(true)));
  });
})();
