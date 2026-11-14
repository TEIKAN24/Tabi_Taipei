/* TABI TAIPEI v2.0.101 — js/tt2-dict.js: 料理辞典: the bottom sheet
   Was js/figma-dict-v245.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.45 — 料理辞典 V4 (Figma 「料理辞典 V4-a / b / c」, 2026-11-11).
 * The dictionary drawer becomes a bottom sheet (css/figma-dict-v245.css) and shows one of
 * three states. The search itself stays in guide.js (JS 03); this layer reads it through
 * window.tabiFoodDict and only adds what the original list cannot show:
 *   a  empty search       → the original list (すべての料理), restyled
 *   b  one word           → 「いちばん近い候補」 card, 「含む料理」 pills, 「ほかの候補」 rows;
 *                           a broad word (no clear name match) keeps the original list
 *   c  words with spaces  → one group per word: its best dish, 「ほかN件」 to open the rest,
 *                           「見つかりません」 when a word finds nothing
 * Gold marks only the characters that match what was typed. */
(() => {
  'use strict';
  const drawer = document.getElementById('food-search');
  const dict = window.tabiFoodDict;
  const panel = drawer?.querySelector('.food-panel');
  const input = drawer?.querySelector('#search');
  const results = drawer?.querySelector('#results');
  const list = drawer?.querySelector('.food-list');
  if (!drawer || !dict || !panel || !input || !results || !list) return;
  const N = dict.normalized;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const MORE_ICON = '<svg class="tt2d-more-icon" width="10" height="7" viewBox="0 0 10 7" fill="none" aria-hidden="true"><path d="M.5 3.414h3.328M2.034 5.21l1.794-1.796L2.034 1.62M4.086.5h5M4.086 6.5h5M6.086 3.5H9" stroke="currentColor" stroke-linecap="round"/></svg>';

  /* ---------- sheet head, search, shortcuts ---------- */
  drawer.classList.add('tt2d');
  const grab = el('div', 'tt2d-grab');
  grab.setAttribute('aria-hidden', 'true');
  const head = el('div', 'tt2d-head');
  const titles = el('div', 'tt2d-titles');
  const title = drawer.querySelector('#food-drawer-title') || el('h2');
  title.textContent = '料理辞典';
  title.classList.add('tt2d-title');
  const sub = drawer.querySelector('.intro') || el('p');
  sub.classList.add('tt2d-sub');
  const close = el('button', 'tt2d-close', '閉じる');
  close.type = 'button';
  close.setAttribute('aria-label', '料理辞典を閉じる');
  close.addEventListener('click', () => document.querySelector('.food-drawer-backdrop')?.click());
  titles.append(title, sub);
  head.append(titles, close);
  panel.prepend(grab, head);
  input.placeholder = '料理名・漢字で検索（スペースで複数）';

  // The original shortcuts are emoji buttons in a pop-up; here they are one row of words
  // (kanji in the serif) that press the same buttons, so their toggling stays as it was.
  const LABELS = {'🐔': '鶏', '🍚': 'ご飯', '🍜': '麺類', '🦐': 'エビ', '🍪': 'お菓子'};
  const shortcuts = el('div', 'tt2d-short');
  const pills = el('div', 'tt2d-pills');
  pills.setAttribute('role', 'group');
  pills.setAttribute('aria-label', 'よく使う字・種類');
  const originals = [...drawer.querySelectorAll('.food-tools [data-example]')];
  for (const button of originals) {
    const example = button.dataset.example;
    const pill = el('button', 'tt2d-pill' + (LABELS[example] ? '' : ' is-char'), LABELS[example] || example);
    pill.type = 'button';
    pill.dataset.example = example;
    pill.setAttribute('aria-label', button.getAttribute('aria-label') || example);
    pill.addEventListener('click', () => { button.click(); input.blur(); });
    pills.append(pill);
  }
  shortcuts.append(el('p', 'tt2d-label', 'よく使う字・種類'), pills);
  drawer.querySelector('.search-shell')?.after(shortcuts);

  const view = el('div', 'tt2d-view');
  view.hidden = true;
  view.setAttribute('role', 'region');
  view.setAttribute('aria-label', '料理の検索結果');
  results.before(view);
  const listTitle = drawer.querySelector('#list-title');

  /* ---------- matching ---------- */
  const names = food => String(food.name).split(/[／/]/).map(s => N(s.trim())).filter(Boolean);
  const jaName = food => {
    const d = String(food.description || '');
    return dict.graphemes(d).length <= 15 ? d : '';
  };
  const bodyText = food => {
    if (food.detail) return String(food.detail);
    const d = String(food.description || '');
    return dict.graphemes(d).length > 15 ? d : '';
  };
  // 0 a name is the word · 1 the Japanese name is · 2 a name starts with it ·
  // 3 a name contains it · 4 found elsewhere (description, tags)
  function rank(food, variants) {
    const ns = names(food), ja = N(food.description || '');
    if (variants.some(v => ns.includes(v))) return 0;
    if (variants.includes(ja)) return 1;
    if (variants.some(v => ns.some(n => n.startsWith(v)))) return 2;
    if (variants.some(v => ns.some(n => n.includes(v)))) return 3;
    return 4;
  }
  function lookUp(term) {
    const variants = dict.variants(term);
    const check = dict.matcher(term);
    const found = [];
    dict.foods().forEach((food, order) => {
      if (check(food)) found.push({food, order, rank: rank(food, variants)});
    });
    found.sort((a, b) => a.rank - b.rank || names(a.food)[0].length - names(b.food)[0].length || a.order - b.order);
    return {term, variants, found};
  }

  /* ---------- pieces ---------- */
  function mark(parent, text, variants) {
    if (variants) dict.highlight(parent, text, variants);
    else parent.textContent = text;
    return parent;
  }
  function candidate(food, variants, onPick) {
    const row = el('button', 'tt2d-cand');
    row.type = 'button';
    row.append(mark(el('span', 'tt2d-cand-name'), food.name, variants));
    const ja = jaName(food);
    if (ja) row.append(el('span', 'tt2d-cand-ja', ja));
    row.setAttribute('aria-label', `${food.name}${ja ? '（' + ja + '）' : ''}を表示`);
    row.addEventListener('click', () => onPick(food));
    return row;
  }
  function moreButton(count, onClick, open = false) {
    const button = el('button', 'tt2d-more');
    button.type = 'button';
    button.setAttribute('aria-expanded', String(open));
    const label = el('span', 'tt2d-more-label', open ? 'たたむ' : `ほか${count}件`);
    button.append(label);
    button.insertAdjacentHTML('beforeend', MORE_ICON);
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'たたむ' : `ほか${count}件`;
      onClick(open);
    });
    return button;
  }
  const CAND_LIMIT = 60;
  function candidates(box, items, variants, onPick, term) {
    for (const {food} of items.slice(0, CAND_LIMIT)) box.append(candidate(food, variants, onPick));
    if (items.length > CAND_LIMIT && term) {
      const all = el('button', 'tt2d-all', `「${term}」の${items.length}件を一覧で見る`);
      all.type = 'button';
      all.addEventListener('click', () => search(term));
      box.append(all);
    }
  }
  function search(value) {
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.blur();
  }

  /* ---------- b: one word ---------- */
  function single(hit, pick) {
    const {term, variants, found} = hit;
    const best = pick ? found.find(item => item.food === pick) : found[0];
    const others = found.filter(item => item !== best);
    const card = el('article', 'tt2d-card');
    card.append(el('p', 'tt2d-card-label', 'いちばん近い候補'));
    card.append(el('h3', 'tt2d-card-name', best.food.name));
    const ja = jaName(best.food);
    if (ja) card.append(el('p', 'tt2d-card-ja', ja));   // v2.0.52: no 「日本語名」 label
    const text = bodyText(best.food);
    if (text) card.append(el('p', 'tt2d-card-desc', text));
    const frag = [card];
    const show = food => { render(food); view.scrollTop = 0; };
    // 「含む料理」: other dishes whose name holds the word; 「ほかの候補」: the rest.
    const named = others.filter(item => item.rank <= 3);
    const rest = others.filter(item => item.rank > 3);
    if (named.length) {
      const label = LABELS[term] || term;
      frag.push(el('p', 'tt2d-section', `「${label}」を含む料理　${named.length}件`));
      const box = el('div', 'tt2d-chips');
      const PILL_LIMIT = 12;
      const addChip = ({food}) => {
        const chip = el('button', 'tt2d-chip', food.name);
        chip.type = 'button';
        chip.addEventListener('click', () => show(food));
        box.append(chip);
      };
      named.slice(0, PILL_LIMIT).forEach(addChip);
      if (named.length > PILL_LIMIT) {
        const extra = named.slice(PILL_LIMIT, CAND_LIMIT);
        const more = moreButton(named.length - PILL_LIMIT, open => {
          box.querySelectorAll('.tt2d-chip.is-extra').forEach(n => n.remove());
          if (open) extra.forEach(item => { addChip(item); box.lastChild.classList.add('is-extra'); });
          box.append(more);
        });
        more.classList.add('tt2d-chip-more');
        box.append(more);
      }
      frag.push(box);
    }
    if (rest.length) {
      frag.push(el('p', 'tt2d-section tt2d-section--cands', 'ほかの候補'));
      const box = el('div', 'tt2d-cands');
      candidates(box, rest, variants, show, term);
      frag.push(box);
    }
    return frag;
  }

  /* ---------- c: several words ---------- */
  const picks = new Map(), opened = new Set();
  function multi(hits) {
    const found = hits.filter(hit => hit.found.length).length;
    const summary = found === hits.length ? `${hits.length}語すべて見つかりました`
      : found ? `${found}語が見つかりました` : '見つかりませんでした';
    const frag = [el('p', 'tt2d-summary', `${hits.length}語を検索　·　${summary}`)];
    for (const hit of hits) {
      const group = el('section', 'tt2d-group');
      const top = el('div', 'tt2d-group-head');
      top.append(el('p', 'tt2d-group-title', hit.found.length ? `「${hit.term}」 ${hit.found.length}件` : `「${hit.term}」`));
      group.append(top);
      if (!hit.found.length) {
        const none = el('div', 'tt2d-none');
        none.append(el('p', 'tt2d-none-title', '見つかりません'),
          el('p', 'tt2d-none-hint', '別の書き方（かな・漢字）でもお試しください。'));
        group.append(none);
        frag.push(group);
        continue;
      }
      const pick = picks.get(hit.term);
      const best = hit.found.find(item => item.food === pick) || hit.found[0];
      const card = el('article', 'tt2d-mini');
      const line = el('div', 'tt2d-mini-line');
      line.append(mark(el('h3', 'tt2d-mini-name'), best.food.name, hit.variants));
      const ja = jaName(best.food);
      if (ja) line.append(el('span', 'tt2d-mini-ja', ja));
      card.append(line);
      const text = bodyText(best.food);
      if (text) card.append(el('p', 'tt2d-mini-desc', text));
      group.append(card);
      const others = hit.found.filter(item => item !== best);
      if (others.length) {
        const box = el('div', 'tt2d-cands');
        box.hidden = !opened.has(hit.term);
        const choose = food => {
          picks.set(hit.term, food);
          const y = view.scrollTop;
          render();
          view.scrollTop = y;
        };
        candidates(box, others, hit.variants, choose, hit.term);
        top.append(moreButton(others.length, open => {
          box.hidden = !open;
          if (open) opened.add(hit.term); else opened.delete(hit.term);
        }, !box.hidden));
        group.append(box);
      }
      frag.push(group);
    }
    return frag;
  }

  /* ---------- state ---------- */
  let lastKey = '', pendingPick = null;
  function render(pick) {
    const value = input.value.trim();
    const terms = N(value).split(/\s+/).filter(Boolean);
    const loaded = dict.foods().length;
    if (loaded) sub.textContent = `${loaded}品。中国語・日本語どちらの表記でも探せます`;
    const shortcut = originals.some(button => button.dataset.example === value);
    pills.querySelectorAll('.tt2d-pill').forEach(p => p.setAttribute('aria-pressed', String(p.dataset.example === value)));
    drawer.classList.toggle('tt2d-searching', Boolean(value) && !shortcut);
    let mode = 'list', nodes = null;
    if (loaded && terms.length > 1) {
      mode = 'multi';
      nodes = multi([...new Set(terms)].map(lookUp));
    } else if (loaded && terms.length === 1 && !shortcut) {   // a shortcut always lists
      const hit = lookUp(terms[0]);
      const best = hit.found[0];
      const clear = best && (best.rank <= 1 || (best.rank === 2 && dict.graphemes(terms[0]).length >= 2 && hit.found.length <= 60));
      if (clear || (pick && hit.found.some(item => item.food === pick))) { mode = 'single'; nodes = single(hit, pick); }
    }
    drawer.dataset.tt2dMode = mode;
    view.hidden = mode === 'list';
    results.hidden = mode !== 'list';
    if (nodes) view.replaceChildren(...nodes);
    else view.replaceChildren();
    if (listTitle) {
      const label = LABELS[value] || value;
      listTitle.textContent = !terms.length ? 'すべての料理'
        : /^メニュー/.test(drawer.querySelector('#result-count')?.textContent || '') ? '' : `「${label}」を含む料理`;
    }
  }
  // A newly drawn list (after typing, a shortcut, ×, a 名物 tile…) is redrawn here when the
  // search changed; rows added while scrolling only get their line breaks undone.
  const unwrap = row => row.querySelectorAll('.food-desc-full').forEach(full => {
    const walker = document.createTreeWalker(full, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (node.nodeValue.includes('\n')) node.nodeValue = node.nodeValue.replace(/\n/g, '');
  });
  new MutationObserver(records => {
    for (const record of records) record.addedNodes.forEach(node => { if (node.nodeType === 1 && node.matches('.result')) unwrap(node); });
    const key = input.value.trim() + '|' + dict.foods().length;
    if (key !== lastKey) { lastKey = key; picks.clear(); opened.clear(); render(pendingPick); pendingPick = null; view.scrollTop = 0; }
  }).observe(results, {childList: true});
  results.querySelectorAll('.result').forEach(unwrap);
  render();

  /* ---------- v2.0.46: a dish in the list opens its card (a → b) ---------- */
  // guide.js expands a row on pointerup (touch) or click; here the tap is taken first (window,
  // capture) and the search is set to the dish, shown as 「いちばん近い候補」.
  function openDish(row) {
    const name = row.querySelector('.dish')?.textContent.trim();
    const food = name && dict.foods().find(f => String(f.name).trim() === name);
    if (!food) return;
    pendingPick = food;
    search(String(food.name).split(/[／/]/)[0].trim());
    if (lastKey === input.value.trim() + '|' + dict.foods().length) { render(food); pendingPick = null; view.scrollTop = 0; }
  }
  const rowAt = target => target instanceof Element && drawer.dataset.tt2dMode === 'list' && target.closest('#results .result');
  let touch = null, swallowClick = 0;
  window.addEventListener('pointerdown', event => {
    touch = event.pointerType === 'touch' && event.isPrimary && rowAt(event.target)
      ? {id: event.pointerId, row: rowAt(event.target), x: event.clientX, y: event.clientY, scroll: results.scrollTop} : null;
  }, {capture: true, passive: true});
  window.addEventListener('pointerup', event => {
    const tap = touch;
    touch = null;
    if (!tap || tap.id !== event.pointerId || !tap.row.isConnected) return;
    event.stopPropagation();
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 13 || Math.abs(results.scrollTop - tap.scroll) > 7) return;
    swallowClick = performance.now();
    openDish(tap.row);
  }, true);
  window.addEventListener('click', event => {
    if (performance.now() - swallowClick < 450 && event.target instanceof Element && event.target.closest('#food-search')) {
      swallowClick = 0; event.preventDefault(); event.stopPropagation(); return;
    }
    const row = rowAt(event.target);
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    openDish(row);
  }, true);

  /* ---------- v2.0.46: the side menu's 料理検索 opens this dictionary ---------- */
  document.addEventListener('click', event => {
    const link = event.target instanceof Element && event.target.closest('[data-tt-dict]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    const root = document.documentElement;
    if (root.classList.contains('tt-nav-open')) document.getElementById('tt-menu-toggle')?.click();
    // v2.0.47: opened over the page the visitor is on (css/figma-dict-v245.css lets the sheet
    // show on every page, the home page included).
    requestAnimationFrame(() => document.dispatchEvent(new CustomEvent('tabi:open-food-search')));
  }, true);

  /* ---------- v2.0.48: body.tt2d-on while the sheet is on screen ---------- */
  // guide.js drops body.food-swipe-active 0.36s after closing starts; the sheet now takes 0.42s
  // to leave, and on the home page #guide is only shown while one of these classes is set.
  let offTimer = 0;
  new MutationObserver(() => {
    clearTimeout(offTimer);
    if (drawer.getAttribute('aria-hidden') === 'false') document.body.classList.add('tt2d-on');
    else offTimer = setTimeout(() => document.body.classList.remove('tt2d-on'), 480);
  }).observe(drawer, {attributes: true, attributeFilter: ['aria-hidden']});

  /* ---------- keep the sheet's place ---------- */
  // guide.js (food-search keyboard) pins the open window's top and height inline, measured
  // with getBoundingClientRect. The old window slid sideways; this sheet slides up, so that
  // measure can include the slide. Re-pin to the resting place (offset* ignore transforms).
  let pinned = '';
  new MutationObserver(() => {
    const top = drawer.style.getPropertyValue('top');
    if (!top || top === pinned) return;
    drawer.style.removeProperty('top');
    drawer.style.removeProperty('height');
    const rest = drawer.offsetTop, height = drawer.offsetHeight;
    pinned = rest + 'px';
    drawer.style.setProperty('top', pinned, 'important');
    drawer.style.setProperty('height', height + 'px', 'important');
  }).observe(drawer, {attributes: true, attributeFilter: ['style']});

  /* ---------- drag the sheet down to close ---------- */
  let drag = null;
  const handle = event => event.target instanceof Element && event.target.closest('.tt2d-grab, .tt2d-head') && !event.target.closest('button');
  drawer.addEventListener('pointerdown', event => {
    if (!handle(event) || event.button > 0) return;
    drag = {y: event.clientY, dy: 0, t: performance.now(), id: event.pointerId};
    drawer.classList.add('tt2d-dragging');
  });
  window.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dy = Math.max(0, event.clientY - drag.y);
    drawer.style.setProperty('--tt2d-drag', drag.dy + 'px');
  }, {passive: true});
  const end = event => {
    if (!drag || event.pointerId !== drag.id) return;
    const fast = drag.dy > 30 && drag.dy / Math.max(1, performance.now() - drag.t) > .6;
    const shut = drag.dy > 110 || fast;
    drag = null;
    drawer.classList.remove('tt2d-dragging');
    drawer.style.setProperty('--tt2d-drag', '0px');
    if (shut) close.click();
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
})();
