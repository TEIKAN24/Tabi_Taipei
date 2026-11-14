/* TABI TAIPEI v2.0.101 — js/tt2-lists.js: venue lists: rows, tags, links
   Was js/figma-lists-v243.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.43 — one list row for 名所・博物館 / 撮影スポット / 体験 / おみやげ
 * (Figma proposal 「Proposal / List Row」, 2026-11-11). Presentation only: rows are built by
 * js/directory.js + guide.js and decorated by the 2.0 layers; this reorders what they made.
 *   meta line : category (体験・おみやげ) or the original name (名所) on the left,
 *               the row's links (公式サイト・予約・紹介) on the right
 *   name      : the main map link, unchanged
 *   sub       : the 撮影スポット description, one line
 *   tags      : plain text (CSS); red tags move to a note line under them
 * Nothing is removed: the original-name / description spans stay in the link (hidden by CSS)
 * and the red tags keep their classes, so counts such as 休館中 still find them. */
(() => {
  'use strict';
  const guide = document.getElementById('guide');
  if (!guide) return;
  const SEL = 'li.venue-row:is(.tt2-museum-row,.tt2-sight-extra-row,.tt2-photo-row,.tt2-directory-row):not([data-tt2l])';
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };

  function shape(li) {
    const body = li.querySelector(':scope > .venue-row-body');
    if (!body) return;
    li.dataset.tt2l = '1';
    li.classList.add('tt2l-row');
    const links = body.querySelector('.venue-secondary-links');
    links?.querySelectorAll('a').forEach(a => {
      if (a.textContent.trim() === '公式') a.textContent = '公式サイト';
      a.classList.add('tt2l-link');
    });
    // 体験・おみやげ: the category line. 名所: no original (Chinese) name line since v2.0.108; it
    // existed for only part of the list, and filling it in left it patchy (the user's call).
    body.querySelector(':scope > .tt2-directory-kicker')?.classList.add('tt2l-kind');
    li.classList.toggle('tt2l-has-link', !!links);
    // v2.0.107 (Figma 「見所リスト 改善案 C」): the links are capsules in a column of their own at
    // the right of the row, centred; the official site comes first.
    if (links) {
      [...links.querySelectorAll('a')].filter(a => /^公式/.test(a.textContent.trim())).reverse().forEach(a => links.prepend(a));
      li.append(links);
    }
    const desc = li.querySelector('.tt2-photo-desc')?.textContent.trim();
    if (desc) body.querySelector(':scope > .venue-name-line')?.after(el('div', 'tt2l-sub', desc));
    const tags = body.querySelector(':scope > .venue-tag-list');
    if (tags) {
      const red = [...tags.querySelectorAll('.venue-tag--tone-red, .venue-tag--caution')];
      if (red.length) { const note = el('div', 'tt2l-note'); note.append(...red); tags.after(note); }
      tags.classList.toggle('tt2l-empty', !tags.querySelector('.venue-tag'));
    }
  }
  /* One bottom line for the four lists. guide.js (JS 32) gives every bubble panel of a block
     the height of its tallest list, inline and !important, on resize and on every switch;
     here the shown list is set back to the frame css/figma-lists-v243.css draws (its box
     minus the count row), so all four end on the same line and their fade is visible. */
  const PANELS = '#guide > details:is(.tt2-directory-section,[data-tt2-panel-key="places"],[data-tt2-panel-key="photo"]) .tab-panels > .tab-panel';
  function fit() {
    if (!root.classList.contains('tt2-fidelity')) return;
    for (const panel of document.querySelectorAll(PANELS)) {
      if (panel.hidden) continue;
      const box = panel.parentElement, cs = getComputedStyle(box);
      const h = Math.round(box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
      if (!(h > 0)) continue;
      for (const prop of ['min-height', 'max-height', 'height']) {
        if (panel.style.getPropertyValue(prop) !== h + 'px' || panel.style.getPropertyPriority(prop) !== 'important')
          panel.style.setProperty(prop, h + 'px', 'important');
      }
    }
  }
  const root = document.documentElement;
  let queued = false;
  const run = () => { queued = false; guide.querySelectorAll(SEL).forEach(shape); fit(); };
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(run); } };
  // New rows, and inline heights / switches on the list panels of the four sections only
  // (the rest of the page, e.g. the event calendar, restyles every frame and is ignored).
  const ours = node => node.nodeType === 1 && node.matches?.(PANELS);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'childList' || ours(r.target))) later();
  }).observe(guide, {childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'hidden']});
  window.addEventListener('resize', later, {passive: true});
  document.addEventListener('tt:viewchange', later);
  window.tabiDirectoryReady?.then(later);
  run();
})();
