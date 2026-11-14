/* TABI TAIPEI v2.0.111 — js/tt2-motion.js: motion between and inside chapters.
   1. Chapter to chapter (the menu, links): #guide fades in like the way in from the home
      (css/tt2-shared.css tt2-chapter-in): 0.6s from 60ms, 遠出 0.7s from 180ms, opacity only.
   2. A chapter's own tabs (名所・博物館 / 撮影スポット / イベント, 現在地 / 駅から探す / 一覧, 夜市 /
      商圏): what appears fades in, 0.4s (1.5× the chapter fade), no movement; 旅支度's 注意事項 /
      入国カード / 交通パス at the chapter speed, 0.6s (v2.0.111). How: a capture listener notes what is on screen before the switch;
      two frames later the new boxes are faded.
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
  const SWITCH = '[role="tab"], .ct-tab, .tt2-chapter-tab, .tab-pill, .tt2-wheel, [data-tt-travel-tab]';
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
  let before = null, frame = 0, food = false, slow = false;
  addEventListener('click', e => {
    if (reduce.matches || !(e.target instanceof Element)) return;
    const control = e.target.closest(SWITCH);
    if (!control || !guide.contains(control)) return;
    // 3. the wheel: no motion. 味わい 一覧 rebuilds its summary (and so its glow) on every turn:
    // it stays still until 一覧 or the chapter is opened again
    if (control.closest(WHEEL)) { if (control.closest('.food-directory-tabs, .food-directory-tab')) flipBack?.classList.add('tt2-still'); return; }
    if (control.closest('[data-tt2-food-tab="list"]') && flipBack) { flipBack.classList.add('tt2-still'); requestAnimationFrame(() => requestAnimationFrame(() => flipBack.classList.remove('tt2-still'))); } // 一覧 opened: its glow plays (again)
    before = visibleSet();
    food = !!control.closest('[data-tt2-food-tab]');
    slow = !!control.closest('[data-tt-travel-tab]');
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(play); });
  }, true);

  function play() {
    const was = before; before = null;
    if (!was) return;
    const fresh = new Set();
    for (const e of guide.querySelectorAll('*')) if (!was.has(e) && shown(e) && !e.closest(SKIP)) fresh.add(e);
    if (!fresh.size) { if (food) dropCards(true); return; }
    const tops = [...fresh].filter(e => { for (let p = e.parentElement; p && p !== guide; p = p.parentElement) if (fresh.has(p)) return false; return true; });
    // 味わい's own tabs (現在地 / 駅から探す): the three that show come in again
    if (food || [...fresh].some(e => e.contains?.(results))) dropCards(true);
    tops.filter(onScreen).forEach(t => t.animate([{filter: 'opacity(0)'}, {filter: 'opacity(1)'}],
      {duration: slow ? 600 : 400, easing: 'ease-out', fill: 'backwards'}));
  }

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
