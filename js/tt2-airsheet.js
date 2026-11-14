/* TABI TAIPEI v2.0.103 — js/tt2-airsheet.js: 空港アクセス as a sheet over the page.
   Figma 「空港アクセス シート案 S1A」 (277:1955, nothing chosen yet: a lower sheet with the route
   field) and 「S1A-2」 (277:2771, a route chosen: the sheet grows to the 料理辞典 height and shows
   行き方, the train type, the timeline and the facts).
   The route finder itself is unchanged: the original #airport-route-selector (guide.js builds the
   routes, tt2-airport.js adds the marks) is moved into the sheet; css/tt2-airport.css gives every
   airport rule a twin selector for #tt2-airport-sheet, so it keeps its look here.
   - the side menu's 空港アクセス opens the sheet over the page the visitor is on (it used to open
     a screen of its own in 旅支度); an old #view/airport-route-selector link opens it over home;
   - 閉じる, a tap on the dimmed page or Esc closes it;
   - the 交通手段 tabs become chips under 「行き方」, with the train type select on their right;
     the rail chip takes the line's name (空港MRT / 台北MRT). */
(() => {
  'use strict';
  const doc = document, root = doc.documentElement;
  const finder = doc.getElementById('airport-route-selector');
  if (!finder) return;
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };

  root.classList.add('tt2-airsheet');
  const backdrop = el('div', 'tt2-airsheet-backdrop');
  const sheet = el('aside', 'tt2-airsheet');
  sheet.id = 'tt2-airport-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', '空港アクセス');
  sheet.tabIndex = -1; // v2.0.106: the sheet takes the focus when it opens (no ring on 閉じる)
  const head = el('div', 'tt2-airsheet-head');
  const titles = el('div', 'tt2-airsheet-titles');
  titles.append(el('h2', 'tt2-airsheet-title', '空港アクセス'), el('p', 'tt2-airsheet-sub', '桃園・松山の空港と台北駅のあいだの行き方'));
  const close = el('button', 'tt2-airsheet-close', '閉じる');
  close.type = 'button';
  head.append(titles, close);
  const body = el('div', 'tt2-airsheet-body');
  sheet.append(el('div', 'tt2-airsheet-grab'), head, body);
  body.append(finder); // (the old 「空港アクセス」 heading stays in 旅支度, hidden by css)
  doc.body.append(backdrop, sheet);

  // 行き方: chips with the train type on the right
  const tabs = doc.getElementById('airsel-transport-tabs');
  const train = doc.getElementById('airsel-train-tabs');
  const badge = doc.getElementById('airsel-recommend-badge');
  if (tabs) {
    const row = el('div', 'tt2-airsheet-moderow');
    const side = el('div', 'tt2-airsheet-trainside');
    tabs.before(el('p', 'tt2-airsheet-label', '行き方'), row);
    row.append(tabs);
    if (train) side.append(train);
    if (badge) side.append(badge);
    row.append(side);
  }
  const railTab = tabs?.querySelector('[data-transport="rail"]');
  const headName = doc.getElementById('airsel-rail-head-name');
  const syncRail = () => {
    if (!railTab || !headName) return;
    if (railTab.getAttribute('aria-selected') === 'true') {
      const n = headName.textContent.trim();
      if (/MRT/.test(n) && railTab.textContent !== n) railTab.textContent = n;
    }
  };
  if (headName) new MutationObserver(syncRail).observe(headName, {childList: true, characterData: true, subtree: true});
  if (railTab) new MutationObserver(syncRail).observe(railTab, {attributes: true, attributeFilter: ['aria-selected']});

  // grows once a route is shown
  const clip = doc.getElementById('airsel-results-clip');
  const syncSize = () => sheet.classList.toggle('is-expanded', !!clip && clip.classList.contains('is-open'));
  if (clip) new MutationObserver(syncSize).observe(clip, {attributes: true, attributeFilter: ['class']});

  let lastFocus = null;
  const isOpen = () => root.classList.contains('tt2-airsheet-open');
  function open() {
    if (isOpen()) return;
    lastFocus = doc.activeElement;
    syncSize(); syncRail();
    root.classList.add('tt2-airsheet-open');
    sheet.inert = false; sheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => sheet.focus({preventScroll: true}));
  }
  function shut() {
    if (!isOpen()) return;
    root.classList.remove('tt2-airsheet-open');
    sheet.inert = true; sheet.setAttribute('aria-hidden', 'true');
    if (lastFocus?.isConnected) lastFocus.focus({preventScroll: true});
  }
  sheet.inert = true; sheet.setAttribute('aria-hidden', 'true');
  close.addEventListener('click', shut);
  backdrop.addEventListener('click', shut);
  doc.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); shut(); } });

  // the menu's 空港アクセス (window capture: before view-router.js and first-wave.js)
  addEventListener('click', e => {
    const link = e.target instanceof Element && e.target.closest('[data-tt-target="airport-route-selector"]');
    if (!link) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (root.classList.contains('tt-nav-open')) doc.getElementById('tt-menu-toggle')?.click();
    open();
  }, true);
  window.tt2AirSheet = {open, close: shut};

  // an old link straight to the airport screen: home, with the sheet open
  const fromHash = () => {
    if (!/^#view\/airport-route-selector\b/.test(location.hash)) return;
    root.classList.remove('tt2-airport-open');
    history.replaceState(history.state, '', '#view/home');
    dispatchEvent(new HashChangeEvent('hashchange'));
    requestAnimationFrame(open);
  };
  addEventListener('hashchange', fromHash);
  fromHash();
})();
