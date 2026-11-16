/* TABI TAIPEI v2.0.119 — js/tt2-reset.js: nothing a visitor did on a page is kept once they leave it.
   Leaving a chapter (the menu, a link, home) puts it back as it first opens; switching one of a
   chapter's own tabs puts the tab that was left back the same way:
   - 見所: 名所・博物館 first, its wheel on the first category, 撮影スポット on the first pill
     (イベント resets itself when its section folds: js/events.js);
   - 散策: 夜市 first, no detail page, the map as it opens (js/night-markets.js), 商圏 closed and
     its remembered categories forgotten (js/guide.js) — both through the 'tt2:reset-places' event;
   - 体験 / おみやげ: the wheel on the first category;
   - 遠出: 九份 (the first place); 旅支度: 注意事項;
   - 味わい: 現在地 first, 一覧's wheel on the first category, the 条件 panel closed;
   - every list scrolled back to its top.
   The clicks run while the page is hidden; window.tt2Resetting keeps js/tt2-motion.js still. */
(() => {
  'use strict';
  const guide = document.getElementById('guide');
  if (!guide) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const on = b => b?.getAttribute('aria-selected') === 'true' || b?.getAttribute('aria-expanded') === 'true';

  function quietly(fn) {
    window.tt2Resetting = true;
    try { fn(); } catch (err) { console.warn('tt2-reset', err); } finally { window.tt2Resetting = false; }
  }
  const pick = b => { if (b && !on(b)) b.click(); };
  function wheel(view) {
    for (const w of window.tt2WheelInstances || []) {
      if (w.source.view !== view || w.selected === 0) continue;
      if (view === 'food') pick($('#food-directory-tabs > button.food-directory-tab'));
      else pick(w.buttons[0]);
    }
  }
  const places = map => document.dispatchEvent(new CustomEvent('tt2:reset-places', {detail: {map}}));

  // one part of a chapter: what its own tab shows
  const PART = {
    'sights:places': () => wheel('sights'),
    'sights:photo': () => pick($('#guide > details[data-tt2-panel-key="photo"] .tab > .tab-pills > .tab-pill')),
    'city-walk:night': () => places(false),
    'city-walk:area': () => places(false),
    'food:list': () => wheel('food'),
  };
  // the whole chapter
  const CHAPTER = {
    sights() {
      pick($('#guide .tt2-chapter-tab[data-tt2-chapter="sights"]'));
      PART['sights:places'](); PART['sights:photo']();
    },
    'city-walk'() { pick($('#guide .tt2-chapter-tab[data-tt2-chapter="city-walk"]')); places(true); },
    experiences: () => wheel('experiences'),
    souvenirs: () => wheel('souvenirs'),
    'day-trips': () => pick($('#guide .daytrip-destination-buttons > .daytrip-destination-button')),
    travel: () => pick($('#guide [data-tt-travel-tab]')),
    food() {
      pick($('#guide [data-tt2-food-tab]'));
      wheel('food');
      const adv = $('#recommend-advanced');
      if (adv?.open) adv.open = false;
    },
  };
  function scrollTops() {
    for (const e of guide.querySelectorAll('*')) if (e.scrollTop) e.scrollTop = 0;
  }

  // leaving a chapter
  document.addEventListener('tt:viewchange', e => {
    const {previous, changed} = e.detail || {};
    if (!changed || !previous || !CHAPTER[previous]) return;
    quietly(() => { CHAPTER[previous](); scrollTops(); });
  });

  // switching a chapter's own tab: the part left goes back too
  const TABS = '.tt2-chapter-tab[data-tt2-chapter], [data-tt2-food-tab]';
  const keyOf = b => b.dataset.tt2Chapter ? b.dataset.tt2Chapter + ':' + b.dataset.tt2Tab : 'food:' + b.dataset.tt2FoodTab;
  addEventListener('click', e => {
    if (window.tt2Resetting || !(e.target instanceof Element)) return;
    const tab = e.target.closest(TABS);
    if (!tab || !guide.contains(tab) || on(tab)) return;
    const group = tab.parentElement;
    const left = group && $$(':scope > ' + (tab.matches('[data-tt2-food-tab]') ? '[data-tt2-food-tab]' : '.tt2-chapter-tab'), group).find(on);
    if (!left) return;
    const part = PART[keyOf(left)];
    // after the switch has run (the part left is hidden by then)
    if (part) setTimeout(() => quietly(part), 0);
  }, true);
})();
