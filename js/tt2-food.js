/* TABI TAIPEI v2.0.101 — js/tt2-food.js: 味わい: the food screens
   Was js/figma-food-v232.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.32 — 02 味わい, Figma 2-1 (現在地) / 2-2 (駅から探す) / 2-3 (一覧).
 * Presentation layer only. js/recommend.js still owns the data, the ranking, GPS, stations,
 * time bands, conditions and the 一覧 list; every control here clicks the original one.
 *  - three tabs replace the front/back flip (no 3D turn)
 *  - one row shows the place (district or station) and the time band; tapping a side opens
 *    the original picker (GPS refresh, line → station menus, time options)
 *  - 注意事項: the original disclaimer and status messages, written out in place
 *  - 一覧 uses the shared infinite category wheel (js/infinite-category-wheel.js)
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const section = document.getElementById('food-recommend-section');
  const drawer = document.getElementById('taipei-recommender');
  if (!section || !drawer) return;
  const $ = id => document.getElementById(id);
  const picker = $('recommend-main-picker');
  const areaButton = $('recommend-area-trigger');
  const currentLocation = $('recommend-current-location');
  const lineTrigger = $('recommend-line-trigger');
  const stationTrigger = $('recommend-station-trigger');
  const lineMenu = $('recommend-line-menu');
  const timeButton = $('recommend-time-trigger');
  const disclaimer = $('recommend-disclaimer');
  const statusLine = $('recommend-location-status');
  const relaxed = $('recommend-relaxed');
  const isStation = () => picker?.classList.contains('is-station');
  const face = () => (window.tabiFoodFace ? window.tabiFoodFace() : 'front');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  /* ---------- tabs ---------- */
  const bar = el('nav', 'tt2-chapter-tabs tt2-food-tabs');
  bar.setAttribute('aria-label', '味わいの探し方');
  const TABS = [['current', '現在地'], ['station', '駅から探す'], ['list', '一覧']];
  const tabButtons = TABS.map(([key, label]) => {
    const b = el('button', 'tt2-chapter-tab', label);
    b.type = 'button'; b.dataset.tt2FoodTab = key;
    b.addEventListener('click', () => choose(key));
    bar.append(b);
    return b;
  });
  section.before(bar);

  // Keep the screen fixed: the original flip may scroll its panel into view.
  const keepPlace = fn => {
    const guide = $('guide'), body = section.parentElement;
    const g = guide?.scrollTop || 0, p = body?.scrollTop || 0;
    fn();
    if (guide) guide.scrollTop = g;
    if (body) body.scrollTop = p;
  };
  function choose(key) {
    if (key === 'list') {
      if (face() !== 'back') keepPlace(() => window.tabiFoodTurnTo?.('back'));
    } else {
      if (face() !== 'front') keepPlace(() => window.tabiFoodTurnTo?.('front'));
      // The original button toggles 現在地 ⇄ 駅から検索 (and refreshes GPS on return).
      if ((key === 'station') !== isStation()) areaButton?.click();
    }
    section.classList.remove('tt2-food-fade');
    void section.offsetWidth;
    section.classList.add('tt2-food-fade');
    sync();
  }

  /* ---------- place / time row ---------- */
  const where = el('div', 'tt2-food-where');
  const placeBtn = el('button', 'tt2-food-where-place');
  placeBtn.type = 'button';
  const placeLabel = el('span', 'tt2-food-where-label');
  const placeValue = el('span', 'tt2-food-where-value');
  const placeCode = el('span', 'tt2-food-where-code');
  const placeName = el('span', 'tt2-food-where-name');
  const placeHint = el('span', 'tt2-food-where-hint');
  // v2.0.79 (Figma B 細修版): a status dot before the district — grey / pulsing / sage / red.
  const placeDot = el('span', 'tt2-food-dot');
  placeDot.setAttribute('aria-hidden', 'true');
  placeValue.append(placeDot, placeCode, placeName, placeHint);
  placeBtn.append(placeLabel, placeValue);
  const timeBtn = el('button', 'tt2-food-where-time');
  timeBtn.type = 'button';
  const timeLabel = el('span', 'tt2-food-where-label', '時間帯');
  const timeValue = el('span', 'tt2-food-where-value');
  timeBtn.append(timeLabel, timeValue);
  where.append(placeBtn, timeBtn);
  drawer.querySelector('.recommend-controls')?.before(where);

  placeBtn.addEventListener('click', event => {
    event.stopPropagation();
    if (isStation()) stationPicker.toggle();
    else currentLocation?.click();
  });
  timeBtn.addEventListener('click', event => { event.stopPropagation(); stationPicker.close(); timeButton?.click(); });

  /* ---------- v2.0.79: one summary row (Figma 「味わい B 細修版」 259:1406–262:1406) ----------
     place on the left; on the right the time band and the order as capsules, then ＋.
     Outline capsule = chosen by the site (time follows Taipei time; order follows the place),
     white capsule with ✕ = set by the visitor (✕ hands it back). Every capsule and ＋ open the
     one 条件 panel, which now holds 時間帯 · 並び順 · 料理種類 (the original buttons, moved). */
  const advancedWrap = drawer.querySelector('.recommend-control-advanced-wrap');
  const advanced = $('recommend-advanced');
  const advPanel = advanced?.querySelector('.recommend-advanced-panel');
  const sortGroup = drawer.querySelector('.recommend-sort');
  const timeOptionBox = $('recommend-time-options');
  const openPanel = event => { event.stopPropagation(); stationPicker.close(); if (advanced) advanced.open = true; };
  function chip(kind, clearLabel, onClear) {
    const wrap = el('span', 'tt2-food-chip tt2-food-chip--' + kind);
    const main = el('button', 'tt2-food-chip-main');
    main.type = 'button';
    main.addEventListener('click', openPanel);
    const x = el('button', 'tt2-food-chip-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', clearLabel);
    x.addEventListener('click', event => { event.stopPropagation(); onClear(); });
    wrap.append(main, x);
    return {wrap, main};
  }
  const timeChip = chip('time', '時間帯の指定を解除（現在時刻に戻す）', () => {
    drawer.querySelector(".tt2-food-panel-time [data-value=\"current\"]")?.click();
  });
  const sortChip = chip('sort', '並び順の指定を解除', () => window.tabiFoodSortAuto?.());
  const badge = el('span', 'tt2-food-badge');
  badge.setAttribute('aria-hidden', 'true');
  where.append(timeChip.wrap, sortChip.wrap);
  if (advancedWrap) {
    where.append(advancedWrap);
    advanced?.querySelector('summary')?.append(badge);
  }
  if (advPanel) {
    const title = text => { const h = el('h3', 'tt2-food-panel-title', text); return h; };
    const timeBox = el('div', 'recommend-choices tt2-food-panel-time');
    timeBox.setAttribute('role', 'group');
    timeBox.setAttribute('aria-label', '時間帯');
    for (const b of [...(timeOptionBox?.querySelectorAll('.recommend-option') || [])]) {
      timeBox.append(b);
      b.addEventListener('click', () => { if (advanced) advanced.open = false; });
    }
    const first = advPanel.firstElementChild;
    advPanel.insertBefore(title('時間帯'), first);
    advPanel.insertBefore(timeBox, first);
    if (sortGroup) {
      sortGroup.classList.add('recommend-choices', 'tt2-food-panel-sort');
      advPanel.insertBefore(title('並び順'), first);
      advPanel.insertBefore(sortGroup, first);
    }
  }

  /* ---------- 駅検索: one panel under the station row ----------
     v2.0.43 (Figma 定案 A), v2.0.44 restyled to Figma 「Station Picker Renew」 (310×470, top-left
     where the A panel was): search · 路線 wheel (the centred chip is the line, a white mark under
     it) · line name · the line's stations one per row (badge, name, English name, ✓ on the chosen
     one). Typing shows recommend.js's own search results instead. Every tap clicks the original
     (hidden) line / station option, so recommend.js still owns the choice; the panel only reads. */
  const stationMenu = $('recommend-station-menu');
  const stationPicker = (() => {
    const panel = el('div', 'tt2-station-picker');
    panel.id = 'tt2-station-picker';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '駅を選ぶ');
    const lineTitle = el('p', 'tt2-sp-title', '路線');
    const wheel = el('div', 'tt2-sp-wheel');
    wheel.setAttribute('role', 'listbox');
    wheel.setAttribute('aria-label', '路線');
    const lineName = el('p', 'tt2-sp-line');
    const listBox = el('div', 'tt2-sp-listbox');
    const list = el('div', 'tt2-sp-list');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', '駅');
    listBox.append(list);
    const searchWrap = lineMenu?.querySelector('.recommend-station-search');
    const results = lineMenu?.querySelector('.recommend-native-list');
    if (searchWrap) panel.append(searchWrap);
    panel.append(lineTitle, wheel, el('span', 'tt2-sp-mark'), lineName, listBox);
    if (results) { results.classList.add('tt2-sp-results'); panel.append(results); }
    where.after(panel);
    let line = '';
    let lines = [];
    const input = searchWrap?.querySelector('input');
    const searching = () => !!input?.value.trim();
    function readLines() {
      const found = [...(results?.querySelectorAll('.recommend-native-option-line') || [])].map(b => {
        const badge = b.querySelector('.recommend-native-option-code');
        return {id: b.dataset.value, color: badge?.style.backgroundColor || '#4288c9',
          name: b.querySelector('strong')?.textContent || '', en: b.querySelector('small')?.textContent || ''};
      });
      if (found.length) lines = found;
    }
    function lineButton(id) {
      if (searching()) { input.value = ''; input.dispatchEvent(new Event('input', {bubbles: true})); }
      return results?.querySelector(`.recommend-native-option-line[data-value="${id}"]`);
    }
    // v2.0.46: the wheel has no ends. The lines are laid out COPIES times; whenever it comes
    // to rest outside the middle copy it is moved, unseen, to the same chip in the middle one.
    const COPIES = 7, MID = 3;
    function buildWheel() {
      const chips = [];
      for (let k = 0; k < COPIES; k++) for (const l of lines) {
        const b = el('button', 'tt2-sp-chip', l.id);
        b.type = 'button';
        b.dataset.id = l.id;
        b.dataset.copy = String(k);
        b.style.backgroundColor = l.color;
        b.setAttribute('role', 'option');
        b.setAttribute('aria-label', l.name);
        if (k !== MID) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
        b.addEventListener('click', () => { center(b, true); choose(l.id); });
        chips.push(b);
      }
      wheel.replaceChildren(...chips);
    }
    const midChip = id => [...wheel.children].find(c => c.dataset.copy === String(MID) && c.dataset.id === id);
    function recentre(chip) {
      if (!chip || chip.dataset.copy === String(MID)) return;
      quiet = true;
      center(midChip(chip.dataset.id), false);
      requestAnimationFrame(() => { quiet = false; });
    }
    function center(chip, smooth) {
      if (!chip) return;
      const left = chip.offsetLeft + chip.offsetWidth / 2 - wheel.clientWidth / 2;
      wheel.scrollTo({left, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'});
    }
    function choose(id) {
      if (!id || id === line) return;
      line = id;
      lineButton(id)?.click();     // recommend.js: state.line, station options, closes its menus
      paintList();
    }
    // After a swipe, the chip nearest the middle becomes the line.
    let settle = 0, quiet = false;
    wheel.addEventListener('scroll', () => {
      if (quiet) return;
      clearTimeout(settle);
      settle = setTimeout(() => {
        const mid = wheel.scrollLeft + wheel.clientWidth / 2;
        let best = null, dist = Infinity;
        for (const c of wheel.children) { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = c; } }
        if (best) { choose(best.dataset.id); recentre(best); }
      }, 140);
    }, {passive: true});
    function paintList() {
      for (const c of wheel.children) c.setAttribute('aria-selected', String(c.dataset.id === line));
      const current = lines.find(l => l.id === line);
      const options = [...(stationMenu?.querySelectorAll('.recommend-native-option-station') || [])];
      lineName.replaceChildren(el('b', '', current?.name || ''), document.createTextNode(current ? `  ${current.en}  ·  ${options.length}駅` : ''));
      list.replaceChildren(...options.map(o => {
        const chosen = o.getAttribute('aria-selected') === 'true';
        const row = el('button', 'tt2-sp-row');
        row.type = 'button';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(chosen));
        const badge = o.querySelector('.recommend-native-option-code')?.cloneNode(true);
        if (badge) { badge.className = 'tt2-sp-badge'; badge.dataset.line = line; row.append(badge); }
        row.append(el('span', 'tt2-sp-name', o.querySelector('strong')?.textContent || ''),
          el('span', 'tt2-sp-en', o.querySelector('small')?.textContent || ''));
        if (chosen) row.append(el('span', 'tt2-sp-check'));
        row.addEventListener('click', () => { o.click(); close(); });
        return row;
      }));
      if (!options.length) list.append(el('p', 'tt2-sp-hint', '路線を選ぶと駅が表示されます'));
      list.scrollTop = 0;
      const chosen = list.querySelector('.tt2-sp-row[aria-selected="true"]');
      if (chosen) list.scrollTop = chosen.offsetTop - list.clientHeight / 2 + chosen.offsetHeight / 2;
    }
    function open() {
      readLines();
      if (!lines.length) return;           // stations not loaded yet
      if (!wheel.children.length) buildWheel();
      const code = $('recommend-line-code')?.textContent.trim() || '';
      line = lines.some(l => l.id === code) ? code : (lines.some(l => l.id === line) ? line : ''); // v2.0.103: 「--」 is no line
      if (line && !stationMenu?.querySelector('.recommend-native-option-station')) lineButton(line)?.click();
      panel.hidden = false;
      panel.classList.toggle('is-searching', searching());
      paintList();
      quiet = true;
      const resting = midChip(line) || wheel.children[Math.floor(wheel.children.length / 2)];
      // v2.0.103: with no line chosen yet the wheel rests on the middle one (板南線); that line is
      // now chosen too, so its stations show at once (was: 「路線を選ぶと駅が表示されます」)
      if (!line && resting) choose(resting.dataset.id);
      center(resting, false);
      requestAnimationFrame(() => { quiet = false; });
      placeBtn.setAttribute('aria-expanded', 'true');
      later();
    }
    function close() {
      if (panel.hidden) return;
      panel.hidden = true;
      placeBtn.setAttribute('aria-expanded', 'false');
      if (input?.value) { input.value = ''; input.dispatchEvent(new Event('input', {bubbles: true})); }
      later();
    }
    input?.addEventListener('input', () => { if (!panel.hidden) panel.classList.toggle('is-searching', searching()); });
    // A search result (click or Enter) chooses a station: recommend.js handles it, then close.
    results?.addEventListener('click', event => { if (event.target.closest('.recommend-station-result')) setTimeout(close, 0); });
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter') setTimeout(() => { if (!searching()) close(); }, 0);
      if (event.key === 'Escape') { event.stopPropagation(); close(); placeBtn.focus({preventScroll: true}); }
    }, true);
    panel.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', event => { if (!panel.hidden && !panel.contains(event.target) && !placeBtn.contains(event.target)) close(); });
    document.addEventListener('tt:viewchange', close);
    return {open, close, toggle: () => (panel.hidden ? open() : close()), isOpen: () => !panel.hidden, panel};
  })();

  /* ---------- 注意事項 ---------- */
  // v2.0.33: written out in place (no button): the original disclaimer, plus the GPS /
  // relaxed-condition messages when there are any. Updated whenever they change.
  const notesWrap = el('div', 'tt2-food-notes');
  notesWrap.setAttribute('role', 'note');
  notesWrap.setAttribute('aria-live', 'polite');
  disclaimer?.after(notesWrap);
  const setNotes = () => {};
  function fillNotes() {
    const lines = [disclaimer?.textContent, statusLine && !statusLine.hidden ? statusLine.textContent : '', relaxed && !relaxed.hidden ? relaxed.textContent : '']
      .map(t => String(t || '').trim()).filter(Boolean);
    const next = lines.join('\n');
    if (notesWrap.dataset.text === next) return;
    notesWrap.dataset.text = next;
    notesWrap.replaceChildren(...lines.map(t => el('p', '', t)));
  }

  /* ---------- mirror the original state ---------- */
  function sync() {
    const station = isStation(), list = face() === 'back';
    const key = list ? 'list' : station ? 'station' : 'current';
    tabButtons.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tt2FoodTab === key)));
    section.dataset.tt2FoodMode = key;
    if (station) {
      placeLabel.textContent = '駅周辺';
      const name = $('recommend-station-label')?.textContent.trim() || '';
      const code = $('recommend-station-code');
      const picked = code && !code.classList.contains('is-empty');
      const preview = searchPreview();
      placeCode.hidden = !picked && !preview;
      placeValue.classList.toggle('is-preview', !!preview);
      if (preview) {
        placeCode.innerHTML = preview.code.innerHTML;
        placeCode.style.borderColor = preview.code.style.borderColor;
        placeCode.dataset.line = preview.line;
      } else if (picked) {
        placeCode.innerHTML = code.innerHTML;
        placeCode.style.borderColor = code.style.borderColor;
        const line = $('recommend-line-code')?.textContent.trim() || '';
        placeCode.dataset.line = line;
      }
      // Figma 2-2: 「府中駅」 (the station data holds 府中).
      const shown = preview ? preview.name : picked ? name : '';
      placeName.textContent = shown ? (/[駅站]$/.test(shown) ? shown : shown + '駅') : '駅を選ぶ';
      placeHint.textContent = '';
      placeBtn.setAttribute('aria-label', picked ? `駅周辺：${name}（タップして駅を変更）` : '駅を選ぶ');
    } else {
      placeLabel.textContent = '現在地';
      placeCode.hidden = true;
      const name = $('recommend-district-name')?.textContent.trim() || '現在地';
      const hint = $('recommend-district-en')?.textContent.trim() || '';
      const located = /[市区]/.test(name) && !/エリア外/.test(name);
      placeName.textContent = name === '現在地' ? '現在地を取得' : name;
      // Status messages (denied, outside the area…) are listed under 注意事項 instead.
      placeHint.textContent = '';
      placeBtn.title = hint;
      placeBtn.setAttribute('aria-label', located ? `現在地：${name}（タップして再取得）` : '現在地を取得');
    }
    // v2.0.79: the place's state, for the dot (recommend.js writes it on the drawer).
    if (!station) {
      const status = drawer.dataset.locationStatus || 'idle';
      const name = $('recommend-district-name')?.textContent.trim() || '';
      placeName.textContent = status === 'loading' ? '確認中…' : status === 'outside' ? '対象エリア外'
        : status === 'success' && name && name !== '現在地' ? name : '現在地を取得';
    }
    // the two capsules: label, and white with ✕ when the visitor chose it
    const band = $('recommend-time-label');
    const bandSet = !!band?.classList.contains('is-breathing');
    timeChip.main.textContent = band?.textContent.trim() || '';
    timeChip.wrap.classList.toggle('is-set', bandSet);
    timeChip.main.setAttribute('aria-label', `時間帯：${timeChip.main.textContent}${bandSet ? '（指定中）' : '（現在時刻）'}。条件を開く`);
    const order = sortGroup?.querySelector('[aria-pressed="true"]');
    const orderSet = drawer.dataset.sortAuto === 'false';
    sortChip.main.textContent = order?.textContent.trim() || 'おすすめ順';
    sortChip.wrap.classList.toggle('is-set', orderSet);
    sortChip.main.setAttribute('aria-label', `並び順：${sortChip.main.textContent}${orderSet ? '（指定中）' : '（自動）'}。条件を開く`);
    const picked = advPanel ? advPanel.querySelectorAll('#recommend-mood-options [aria-pressed="true"]').length : 0;
    badge.textContent = picked ? String(picked) : '';
    badge.hidden = !picked;
    const band0 = band;
    timeValue.textContent = band0?.textContent.trim() || '';
    timeValue.classList.toggle('is-breathing', !!band?.classList.contains('is-breathing'));
    timeBtn.setAttribute('aria-label', `時間帯：${timeValue.textContent}（タップして変更）`);
    fillNotes();
  }
  let queued = false;
  const later = () => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; sync(); }); };
  const watch = node => node && new MutationObserver(later)
    .observe(node, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'style']});
  // Not #food-flip's subtree: it contains this row, and sync() writes to it.
  [picker, disclaimer, statusLine, relaxed].forEach(watch);
  // v2.0.79: the capsules follow the time label, the order buttons, the cuisine choice and
  // the place / order state recommend.js writes on the drawer.
  new MutationObserver(later).observe(drawer, {attributes: true, attributeFilter: ['data-sort-auto', 'data-location-status']});
  const tl = $('recommend-time-label');
  tl && new MutationObserver(later).observe(tl, {attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true});
  advPanel && new MutationObserver(later).observe(advPanel, {subtree: true, attributes: true, attributeFilter: ['aria-pressed']});
  $('food-flip') && new MutationObserver(sync).observe($('food-flip'), {attributes: true, attributeFilter: ['data-face']});

  /* ---------- 一覧: 掲載 N店, category wheel ---------- */
  const panel = $('food-directory-panel');
  const relabel = () => {
    const count = panel?.querySelector('.food-directory-summary-count');
    const n = count?.textContent.match(/\d+/)?.[0];
    if (count && n && count.dataset.tt2 !== n) { count.dataset.tt2 = n; count.textContent = `掲載 ${n}店`; }
  };
  panel && new MutationObserver(relabel).observe(panel, {childList: true});
  relabel();
  const mountWheel = () => {
    if ($('food-directory-tabs')?.querySelector('.food-directory-tab')) window.tt2WheelMount?.('food');
  };
  const tabsNode = $('food-directory-tabs');
  if (tabsNode) {
    const once = new MutationObserver(() => { if (tabsNode.querySelector('.food-directory-tab')) { once.disconnect(); mountWheel(); } });
    once.observe(tabsNode, {childList: true});
    mountWheel();
  }

  /* ---------- v2.0.43: pager instead of 「ほかの3軒を見る」 ---------- */
  // 「17軒中 1–3軒目」 on the left, the original button (same click: next three, wrapping
  // to the start) as the white 「次の3軒 ›」 capsule on the right. recommend.js writes the
  // total and the page onto the button as data-total / data-page.
  const moreBtn = $('recommend-more');
  if (moreBtn) {
    const pager = el('div', 'tt2-food-pager');
    const pos = el('span', 'tt2-food-pager-pos');
    pos.setAttribute('aria-live', 'polite');
    moreBtn.before(pager);
    pager.append(pos, moreBtn);
    const label = el('span', 'tt2-food-pager-label', '次の3軒');
    moreBtn.append(label);
    const paint = () => {
      const total = +moreBtn.dataset.total || 0, page = +moreBtn.dataset.page || 0;
      pager.hidden = !total;
      if (!total) return;
      const a = page * 3 + 1, b = Math.min(total, page * 3 + 3);
      pos.replaceChildren(document.createTextNode(`${total}軒中  `), el('b', '', a === b ? `${a}軒目` : `${a}–${b}軒目`));
      const last = b >= total;
      label.textContent = last ? '最初から' : '次の3軒';
      moreBtn.setAttribute('aria-label', last ? '最初の3軒に戻る' : 'ほかの3軒を見る');
    };
    new MutationObserver(paint).observe(moreBtn, {attributes: true, attributeFilter: ['data-total', 'data-page', 'hidden']});
    paint();
  }

  /* ---------- v2.0.41: the station row previews the best search match ---------- */
  // While a station is being searched, the row above shows the first result live: its
  // badge (line colour, line letters, number) and its name. recommend.js re-renders the
  // results inside the picker, which the observer above already turns into a sync().
  // Closing the menu without choosing (the field is cleared or hidden) restores the row.
  const searchInput = stationPicker.panel.querySelector('.recommend-station-search-input');
  function searchPreview() {
    if (!searchInput || !stationPicker.isOpen() || !searchInput.value.trim()) return null;
    const row = stationPicker.panel.querySelector('.recommend-station-result');
    const code = row?.querySelector('.recommend-native-option-code');
    if (!row || !code) return null;
    return {code, line: row.dataset.line || (row.dataset.value || '').replace(/[^A-Z]/g, ''),
      name: row.querySelector('.recommend-native-option-copy strong')?.textContent.trim() || ''};
  }
  searchInput?.addEventListener('input', later);
  // Closing the menu by tapping elsewhere only hides it; restore the row then too.
  lineMenu && new MutationObserver(later).observe(lineMenu, {attributes: true, attributeFilter: ['hidden']});

  document.addEventListener('tt:viewchange', event => { if (event.detail?.view === 'food') sync(); setNotes(false); });
  sync();
})();
