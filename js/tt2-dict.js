/* TABI TAIPEI v2.0.122 — js/tt2-dict.js: 料理辞典: the bottom sheet
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
  input.placeholder = '料理名で検索'; // v2.0.122: not only kanji

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
  // v2.0.146: 甘さ・氷 opens the drink table straight away (food/terms.json: 甜度冰塊)
  const drinkPill = el('button', 'tt2d-pill tt2d-pill--drink', '甘さ・氷');
  drinkPill.type = 'button';
  drinkPill.dataset.drink = '甜度冰塊';
  drinkPill.setAttribute('aria-label', 'ドリンクの甘さと氷の表');
  drinkPill.addEventListener('click', () => search(drinkPill.dataset.drink));
  pills.insertBefore(drinkPill, pills.children[1] || null);
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

  /* ---------- v2.0.144: menu terms (food/terms.json) ---------- */
  // 招牌・紅燒・微辣・去冰…: the words around a dish name on a Taiwanese menu. Dish names and
  // these terms form one lexicon; a search is read left to right, taking the longest known word
  // at each place, so a whole dish name always wins over a term inside it (甜不辣 never splits
  // into 甜 + 不辣). A search that holds no term keeps the dictionary exactly as before.
  const CAT = {drink: 'ドリンク', cook: '調理法', flavor: '味付け', style: '料理の形', cut: '部位', label: '表記',
    spice: '辛さ', sugar: '甘さ', ice: '氷', fixed: '甘さ・氷', custom: '追加', order: '注文・支払い'};
  const PREFIX = new Set(['cook', 'flavor', 'style', 'cut', 'label']);   // 紅燒牛肉麵, 招牌…
  const SUFFIX = new Set(['custom', 'label', 'style']);                  // 滷肉飯加蛋, 雞腿便當
  const SCALES = {spice: ['不辣', '微辣', '小辣', '中辣', '大辣']};
  // 甘さ and 氷 share one table on a percentage ruler (a common guide; shops differ a little).
  // Each row ends in 「固定」: the drink's sugar or ice is set by the shop.
  const DRINK = {
    sugar: {steps: [['無糖', 0], ['微糖', 30], ['半糖', 50], ['少糖', 70], ['全糖', 100]], fixed: '甜度固定'},
    ice: {steps: [['去冰', 0], ['微冰', 30], ['少冰', 70], ['正常冰', 100]], fixed: '冰塊固定'}
  };
  const TICKS = [0, 30, 50, 70, 100];
  const LETTER = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{L}ー々]/u;
  let termKeys = new Map(), lex = null;
  function longestTerm(text, atStart) {
    let best = null;
    for (const [key, t] of termKeys) {
      if (key.length >= text.length || (best && key.length <= best.key.length)) continue;
      if (atStart ? text.startsWith(key) : text.endsWith(key)) best = {key, t};
    }
    return best;
  }
  // The terms a dish's own name is made of: up to three in front (香煎 蒜香 雞腿排) and one at the
  // end when the rest is a dish of its own (滷肉飯 + 加蛋). 墨魚香腸 holds 魚香 only by chance,
  // so it is not read as one.
  function nameTerms(food, dishKeys) {
    let name = names(food)[0] || '';
    const displayedName = name;  // only annotate words in the displayed dish name
    const found = [];
    for (let k = 0; k < 3; k++) {
      const p = longestTerm(name, true);
      if (!p || !PREFIX.has(p.t.cat)) break;
      found.push(p.t); name = name.slice(p.key.length);
    }
    const s = longestTerm(name, false);
    if (s && SUFFIX.has(s.t.cat) && dishKeys.has(name.slice(0, -s.key.length))) found.push(s.t);
    // These two single-character words are meaningful *inside* recorded dish
    // names (肉羹・雞肉燴飯), not as arbitrary one-character query fragments.
    if (displayedName.includes('羹') && termKeys.has(N('羹'))) found.push(termKeys.get(N('羹')));
    if (/燴[飯麵]/.test(displayedName) && termKeys.has(N('燴'))) found.push(termKeys.get(N('燴')));
    return [...new Set(found)];
  }
  function lexicon() {
    const foods = dict.foods();
    if (lex && lex.foods === foods && lex.count === foods.length) return lex;
    const byFirst = new Map(), dishKeys = new Map(), uses = new Map();
    const add = entry => { const a = byFirst.get(entry.key[0]) || []; a.push(entry); byFirst.set(entry.key[0], a); };
    for (const food of foods) for (const key of names(food)) {
      if (key.length >= 2 && !dishKeys.has(key)) { dishKeys.set(key, food); add({key, food}); }
    }
    for (const [key, t] of termKeys) if (!dishKeys.has(key)) add({key, term: t});
    for (const a of byFirst.values()) a.sort((x, y) => y.key.length - x.key.length || (x.food ? -1 : 1));
    for (const food of foods) for (const t of nameTerms(food, dishKeys)) {
      if (!uses.has(t)) uses.set(t, []);
      uses.get(t).push(food);
    }
    lex = {foods, count: foods.length, byFirst, dishKeys, uses};
    return lex;
  }
  // Prices, sizes in digits, spaces and symbols split the text (a pasted menu line).
  function segment(value) {
    const L = lexicon(), segs = [];
    const text = Array.from(N(value)).map(ch => LETTER.test(ch) ? ch : '|').join('');
    for (const piece of text.split('|')) {
      let i = 0, other = '';
      while (i < piece.length) {
        const hit = (L.byFirst.get(piece[i]) || []).find(c => piece.startsWith(c.key, i));
        if (hit) {
          if (other) { segs.push({other}); other = ''; }
          segs.push(hit); i += hit.key.length;
        } else { other += piece[i]; i++; }
      }
      if (other) segs.push({other});
    }
    return segs;
  }
  // An explicit find is for literal menu terms such as 羹・燴 that may occur after the
  // main ingredient; ordinary terms keep boundary-aware nameTerms to avoid false hits
  // such as 魚香 inside 墨魚香腸.
  const relatedFoods = t => t.find
    ? dict.foods().filter(food => names(food).some(n => n.includes(N(t.find))))
    : (lex?.uses.get(t) || []);
  // 蘑菇 is a mushroom in general, but a sauce in specific breakfast dishes.
  // Only label a selected dish as sauce when its own name gives that context.
  function displayTerm(t, food) {
    if (t.id === 'mogu' && food && names(food).some(n => /^蘑菇.*(?:鐵板麵|燴飯|豬排)$/.test(n))) {
      return 'マッシュルームソース';
    }
    return t.ja;
  }
  function noteBox(head, terms, food) {
    const box = el('div', 'tt2d-notes');
    box.append(el('p', 'tt2d-notes-head', head));
    for (const t of terms) {
      const row = el('p', 'tt2d-note');
      row.append(el('span', 'tt2d-note-zh', t.zh[0]), el('span', 'tt2d-note-ja', displayTerm(t, food)));
      box.append(row);
    }
    return box;
  }
  function dishChips(foods) {
    const box = el('div', 'tt2d-chips');
    const PILL_LIMIT = 12;
    const addChip = food => {
      const name = String(food.name).split(/[／/]/)[0].trim();
      const chip = el('button', 'tt2d-chip', food.name);
      chip.type = 'button';
      chip.addEventListener('click', () => { search(name); view.scrollTop = 0; });
      box.append(chip);
    };
    foods.slice(0, PILL_LIMIT).forEach(addChip);
    if (foods.length > PILL_LIMIT) {
      const extra = foods.slice(PILL_LIMIT, CAND_LIMIT);
      const more = moreButton(foods.length - PILL_LIMIT, open => {
        box.querySelectorAll('.tt2d-chip.is-extra').forEach(n => n.remove());
        if (open) extra.forEach(food => { addChip(food); box.lastChild.classList.add('is-extra'); });
        box.append(more);
      });
      more.classList.add('tt2d-chip-more');
      box.append(more);
    }
    return box;
  }
  // A tap in the 甘さ・氷 table: that row's word in the search is swapped for the tapped one.
  function swapDrink(row, word) {
    const segs = segment(input.value);
    const keep = [];
    for (const s of segs) {
      if (s.term && (s.term.cat === row || s.term.cat === 'fixed' || s.term.cat === 'drink')) continue;
      keep.push(s.term ? s.term.zh[0] : s.key || s.other);
    }
    // a lone 固定 stands for both rows: the other row keeps it
    if (segs.some(s => s.term?.cat === 'fixed')) keep.push(DRINK[row === 'sugar' ? 'ice' : 'sugar'].fixed);
    keep.push(word);
    const y = view.scrollTop;
    search(keep.join(' '));
    setTimeout(() => { view.scrollTop = y; }, 120);
  }
  function drinkTable(terms) {
    const on = new Set(terms.map(t => t.zh[0]));
    const both = terms.some(t => t.cat === 'fixed');
    const table = el('div', 'tt2d-drink');
    const row = (cat) => {
      const line = el('div', 'tt2d-drink-row');
      line.append(el('span', 'tt2d-drink-head', CAT[cat]));
      const track = el('div', 'tt2d-drink-track');
      for (const [word, pct] of DRINK[cat].steps) {
        const b = el('button', 'tt2d-drink-step' + (on.has(word) ? ' is-on' : ''), word);
        b.type = 'button';
        b.style.left = pct + '%';
        b.setAttribute('aria-pressed', String(on.has(word)));
        b.addEventListener('click', () => swapDrink(cat, word));
        track.append(b);
      }
      const fixedOn = both || on.has(DRINK[cat].fixed);
      const fixed = el('button', 'tt2d-drink-fixed' + (fixedOn ? ' is-on' : ''), '固定');
      fixed.type = 'button';
      fixed.setAttribute('aria-pressed', String(fixedOn));
      fixed.setAttribute('aria-label', `${CAT[cat]}：固定（変えられない）`);
      fixed.addEventListener('click', () => swapDrink(cat, DRINK[cat].fixed));
      line.append(track, fixed);
      return line;
    };
    const ruler = el('div', 'tt2d-drink-ruler');
    ruler.setAttribute('aria-hidden', 'true');
    ruler.append(el('span', 'tt2d-drink-head'));
    const ticks = el('div', 'tt2d-drink-track tt2d-drink-ticks');
    for (const pct of TICKS) {
      const tick = el('span', 'tt2d-drink-tick', pct + '%');
      tick.style.left = pct + '%';
      ticks.append(tick);
    }
    ruler.append(ticks, el('span', 'tt2d-drink-fixed tt2d-drink-gap'));
    table.append(row('sugar'), ruler, row('ice'));
    return table;
  }
  // 甘さ・氷 (one table, always together) and 辛さ: the chosen steps in gold.
  function scales(terms) {
    const cats = new Set(terms.map(t => t.cat));
    const frag = [];
    if (cats.has('sugar') || cats.has('ice') || cats.has('fixed') || cats.has('drink')) {
      frag.push(el('p', 'tt2d-section', '甘さと氷の目安'), drinkTable(terms),
        el('p', 'tt2d-scale-note', '％は目安です。店によって少し違います。タップで切り替えられます。'));
    }
    if (cats.has('spice')) {
      const on = new Set(terms.map(t => t.zh[0]));
      const line = el('p', 'tt2d-scale');
      line.append(el('span', 'tt2d-scale-head', CAT.spice));
      for (const step of SCALES.spice) line.append(el('span', 'tt2d-scale-step' + (on.has(step) ? ' is-on' : ''), step));
      frag.push(el('p', 'tt2d-section', '辛さの目安'), line);
    }
    return frag;
  }
  // A term searched alone: the dish card's own layout, then the dishes that use it.
  function termCard(t) {
    const card = el('article', 'tt2d-card tt2d-card--term');
    card.append(el('p', 'tt2d-card-label', `メニューのことば・${CAT[t.cat] || ''}`));
    card.append(el('h3', 'tt2d-card-name', t.zh[0]));
    card.append(el('p', 'tt2d-card-ja', t.ja));
    if (t.note) card.append(el('p', 'tt2d-card-desc', t.note));
    const frag = [card, ...scales([t])];
    const used = relatedFoods(t);
    if (used.length) frag.push(el('p', 'tt2d-section', `「${t.zh[0]}」を使った料理　${used.length}件`), dishChips(used));
    return frag;
  }
  // Terms with no dish to hang them on (an unlisted dish, or order options only): one row each.
  function termRows(terms, unlisted) {
    const head = el('p', 'tt2d-summary', `ことば ${terms.length}語`);
    if (unlisted) head.append(el('span', 'tt2d-dot', '·'), '料理名は辞典に未収録');
    const box = el('div', 'tt2d-terms');
    for (const t of terms) {
      const row = el('div', 'tt2d-term');
      const text = el('span', 'tt2d-term-text');
      text.append(el('span', 'tt2d-term-ja', t.ja));
      if (t.note) text.append(el('span', 'tt2d-term-note', t.note));
      row.append(el('span', 'tt2d-term-zh', t.zh[0]), text, el('span', 'tt2d-term-kind', CAT[t.cat] || ''));
      box.append(row);
    }
    const frag = [head, box, ...scales(terms)];
    const near = [];
    for (const t of terms) for (const food of relatedFoods(t)) if (!near.includes(food)) near.push(food);
    if (near.length) frag.push(el('p', 'tt2d-section', unlisted ? '近い料理' : 'このことばを使った料理'), dishChips(near));
    return frag;
  }
  // null: not a term search, the dictionary goes on as before.
  function termView(value, pick) {
    if (!termKeys.size || !dict.foods().length) return null;
    const whole = N(value).replace(/\s+/g, '');
    const L = lexicon();
    if (!whole || L.dishKeys.has(whole)) return null;      // a dish name: its card, with its notes
    const segs = segment(value);
    const terms = [...new Set(segs.filter(s => s.term).map(s => s.term))];
    if (!terms.length) return null;
    if (segs.length === 1) return termCard(terms[0]);
    // the start of a dish name (鹽酥雞 → 鹽酥雞排): the usual card, as before
    const first = /\s/.test(value.trim()) ? null : lookUp(whole).found[0];
    if (first && first.rank <= 2) return null;
    const dishes = [...new Set(segs.filter(s => s.food).map(s => s.key))];
    if (dishes.length === 1) {
      const hit = lookUp(dishes[0]);
      if (!hit.found.length) return null;
      const at = segs.findIndex(s => s.food);
      const before = [...new Set(segs.slice(0, at).filter(s => s.term).map(s => s.term))];
      const after = [...new Set(segs.slice(at + 1).filter(s => s.term).map(s => s.term))].filter(t => !before.includes(t));
      const prefix = segs.slice(0, at).filter(s => s.term && PREFIX.has(s.term.cat)).map(s => s.key).join('');
      // A tapped suggestion is a different dish, not another interpretation of
      // the original query. Keep its candidate list, but drop all query-only
      // modifiers (and the grey prefix) and rebuild notes from its own name.
      return single(hit, pick, pick ? undefined : {prefix, before, after});
    }
    if (!dishes.length) {
      // a dish's own words (招牌・去骨・腿排…) with no dish found: an unlisted dish name
      const unlisted = segs.some(s => s.other && /\p{Script=Han}/u.test(s.other)) || terms.some(t => PREFIX.has(t.cat));
      return termRows(terms, unlisted);
    }
    return null;                                            // several dishes: the usual multi view
  }
  fetch('food/terms.json', {cache: 'no-cache'})
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !Array.isArray(data.terms)) return;
      termKeys = new Map();
      for (const t of data.terms) for (const z of t.zh) termKeys.set(N(z), t);
      lex = null;
      if (input.value.trim()) render();
    })
    .catch(() => {});

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
  function single(hit, pick, extra) {
    const {term, variants, found} = hit;
    const best = (pick && found.find(item => item.food === pick)) || found[0];
    const others = found.filter(item => item !== best);
    const card = el('article', 'tt2d-card');
    card.append(el('p', 'tt2d-card-label', 'いちばん近い候補'));
    const nameLine = el('h3', 'tt2d-card-name');
    // v2.0.144: a term typed in front of the dish (招牌…) stays there, small and grey
    if (extra?.prefix && best === found[0]) nameLine.append(el('span', 'tt2d-card-prefix', extra.prefix));
    nameLine.append(best.food.name);
    card.append(nameLine);
    const ja = jaName(best.food);
    if (ja) card.append(el('p', 'tt2d-card-ja', ja));   // v2.0.52: no 「日本語名」 label
    const text = bodyText(best.food);
    if (text) card.append(el('p', 'tt2d-card-desc', text));
    // v2.0.144: 「名前のことば」 in reading order: the terms typed before the dish, those its own
    // name is made of, then those typed after it (加麵, 去冰…)
    if (termKeys.size) {
      const words = [...(extra?.before || [])];
      for (const t of [...nameTerms(best.food, lexicon().dishKeys), ...(extra?.after || [])]) if (!words.includes(t)) words.push(t);
      if (words.length) card.append(noteBox('名前のことば', words, best.food));
    }
    // a drink ordered with 微糖・少冰…: the 甘さ・氷 table right under its card
    const typed = [...(extra?.before || []), ...(extra?.after || [])];
    if (typed.length) {
      const frag = [card, ...scales(typed)];
      if (frag.length > 1) { frag.push(...single(hit, pick).slice(1)); return frag; }
    }
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
    const head = el('p', 'tt2d-summary', `${hits.length}語を検索`); // v2.0.115: · as on the rest of the site
    head.append(el('span', 'tt2d-dot', '·'), summary);
    const frag = [head];
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
    if (loaded) sub.textContent = `${loaded}件。中国語・日本語どちらの表記でも探せます`;
    const shortcut = originals.some(button => button.dataset.example === value);
    pills.querySelectorAll('.tt2d-pill').forEach(p => p.setAttribute('aria-pressed', String(p.dataset.example === value)));
    // v2.0.146: while only 甘さ・氷 words are searched, the shortcuts stay (甘さ・氷 shown pressed)
    const drinkOnly = Boolean(value) && termKeys.size > 0 && dict.foods().length > 0 &&
      segment(value).every(s => s.term && ['sugar', 'ice', 'fixed', 'drink'].includes(s.term.cat));
    drinkPill.setAttribute('aria-pressed', String(drinkOnly));
    drawer.classList.toggle('tt2d-searching', Boolean(value) && !shortcut && !drinkOnly);
    let mode = 'list', nodes = null;
    const termNodes = loaded && value && !shortcut ? termView(value, pick) : null;   // v2.0.144
    if (termNodes) { mode = 'single'; nodes = termNodes; }
    else if (loaded && terms.length > 1) {
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
