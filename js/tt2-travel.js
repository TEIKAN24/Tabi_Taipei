/* TABI TAIPEI v2.0.101 — js/tt2-travel.js: 旅支度: the notes pane (motion, then numbers and gists)
   Collected in 2.0.101 (cleanup phase 3) from js/figma-travel-notes-v236.js, js/figma-notes-v243.js,
   in that order; each part is still its own closed function. */

/* ════════ from js/figma-travel-notes-v236.js ════════ */
/* TABI TAIPEI v2.0.36 — 01 旅支度 / 注意事項: animated open and close.
 * The notes stay native <details> (keyboard, find-in-page, screen readers unchanged).
 * A tap on a title now slides its text open (height + fade); opening one slides the
 * open one shut at the same time. figma-stage1.js's own "only one open" listener is
 * kept out of the way for these taps, so the other note is not snapped shut. */
(() => {
  'use strict';
  const pane = document.getElementById('tt2-notes-pane');
  const list = pane?.querySelector('.tt2-note-list');
  if (!list) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const OPEN_MS = 320, CLOSE_MS = 260;
  const running = new WeakMap();
  const ours = new WeakSet(); // notes whose next toggle event we caused

  const contentOf = note => note.querySelector(':scope > .tt2-note-content');
  function stop(note) {
    const anim = running.get(note);
    if (anim) { anim.onfinish = null; anim.cancel(); running.delete(note); }
  }
  function setOpen(note, value) { if (note.open === value) return; ours.add(note); note.open = value; }

  function open(note) {
    const content = contentOf(note);
    stop(note);
    note.classList.remove('is-closing');
    setOpen(note, true);
    if (!content || reduce.matches) return;
    const h = content.getBoundingClientRect().height;
    content.style.overflow = 'hidden';
    const anim = content.animate(
      [{height: '0px', opacity: 0}, {height: h + 'px', opacity: 1}],
      {duration: OPEN_MS, easing: EASE});
    running.set(note, anim);
    anim.onfinish = () => { content.style.overflow = ''; running.delete(note); };
  }
  function close(note) {
    const content = contentOf(note);
    if (!note.open || note.classList.contains('is-closing')) return;
    stop(note);
    if (!content || reduce.matches) { setOpen(note, false); return; }
    const h = content.getBoundingClientRect().height;
    note.classList.add('is-closing');
    content.style.overflow = 'hidden';
    const anim = content.animate(
      [{height: h + 'px', opacity: 1}, {height: '0px', opacity: 0}],
      {duration: CLOSE_MS, easing: EASE, fill: 'forwards'});
    running.set(note, anim);
    anim.onfinish = () => {
      setOpen(note, false);
      note.classList.remove('is-closing');
      content.style.overflow = '';
      anim.cancel();
      running.delete(note);
    };
  }

  list.addEventListener('click', event => {
    const summary = event.target.closest('.tt2-note-summary');
    if (!summary || !list.contains(summary)) return;
    const note = summary.parentElement;
    event.preventDefault();
    // guide.js toggles every <summary> on .site-content itself; these notes are handled here.
    event.stopPropagation();
    if (note.open && !note.classList.contains('is-closing')) { close(note); return; }
    for (const other of list.querySelectorAll(':scope > .tt2-note[open]')) if (other !== note) close(other);
    open(note);
    // v2.0.102: a note opened near the foot of the pane rises into sight (above the fade)
    const fade = pane.querySelector('.tt2n-fade');
    window.tt2Reveal?.(note, {settle: list, bottom: fade ? fade.getBoundingClientRect().height : 0});
  });
  // Our own toggles must not reach figma-stage1.js's capture listener on the list
  // (it would snap the other note shut). This capture listener sits above it.
  pane.addEventListener('toggle', event => { if (ours.has(event.target)) { ours.delete(event.target); event.stopPropagation(); } }, true);
})();

/* ════════ from js/figma-notes-v243.js ════════ */
/* TABI TAIPEI v2.0.43 — 01 旅支度 / 注意事項, as settled in Figma (1-1 更新案).
 * Presentation only; the notes stay native <details> and js/figma-travel-notes-v236.js keeps
 * animating them.
 *  - an intro line (v2.0.46: the group labels 滞在 / 移動・お金 are gone)
 *  - each title gets its number (01–07, grey) and, while closed, a one-line gist
 *  - inside, the key sentence is set in gold (wrapped in place, the text is unchanged)
 * Gists and key sentences are excerpts of each note's own text; a note whose title or text
 * changes simply goes without them. */
(() => {
  'use strict';
  const pane = document.getElementById('tt2-notes-pane');
  const list = pane?.querySelector('.tt2-note-list');
  if (!list || list.dataset.tt2n) return;
  list.dataset.tt2n = '1';
  const NOTES = {
    '宿泊先のアメニティ事情': ['2025年から使い捨てアメニティは置かれていません', '歯ブラシ・くし・カミソリなどは、フロントで頼めばもらえます（無料または有料）。'],
    'トイレの紙事情': ['紙を流せる場所と、ゴミ箱に捨てる場所があります', '水に流せるティッシュがあると安心です。'],
    '水道水': ['そのまま飲むのは避けましょう', '飲み水はコンビニなどで買えるボトル入りの水がいちばん安心です。'],
    'コンセント・電圧': ['日本と同じA型、電圧は110V。変換プラグは不要です', 'スマホやPCの充電器はそのまま使えます。'],
    '交通・移動': ['MRTは改札内と車内で飲食禁止。水やガムもNG', 'MRT（地下鉄）は改札内の黄色い線から先と車内で飲食禁止。水やガムもNGです。'],
    'お金・支払い・交通系IC': ['夜市やローカル店は現金のみの店も多い', '夜市やローカル店は現金のみの店も多いので、少額の現金を持っておくと安心。'],
    'レシートは宝くじ': ['2か月に1回抽選、最高賞金はNT$1,000万', '2か月に1回抽選があり、最高賞金はNT$1,000万。']
  };
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };
  const notes = [...list.querySelectorAll(':scope > .tt2-note')];
  list.before(el('p', 'tt2n-intro', `旅行前に知っておきたい ${notes.length}項目`));
  // v2.0.44: the bottom fade is a sticky strip at the end of the pane (no mask while animating).
  pane.append(el('div', 'tt2n-fade'));
  notes.forEach((note, i) => {
    const summary = note.querySelector(':scope > .tt2-note-summary');
    const title = summary?.querySelector('.tt2-note-title');
    if (!summary || !title) return;
    const [gist, key] = NOTES[title.textContent.trim()] || [];
    summary.prepend(el('span', 'tt2n-num', String(i + 1).padStart(2, '0')));
    const text = el('span', 'tt2n-text');
    title.replaceWith(text);
    text.append(title);
    if (gist) text.append(el('span', 'tt2n-gist', gist));
    if (!key) return;
    for (const p of note.querySelectorAll('.tt2-note-copy')) {
      const node = [...p.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes(key));
      if (!node) continue;
      const at = node.nodeValue.indexOf(key);
      const rest = node.splitText(at);
      rest.splitText(key.length);
      const mark = el('span', 'tt2n-key');
      rest.replaceWith(mark);
      mark.append(rest);
      break;
    }
  });
})();
