/* TABI TAIPEI v2.0.101 — js/tt2-airport.js: 空港アクセス: the route finder
   Was js/figma-airport-v259.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.59 — 空港アクセス, Figma 「空港アクセス 新案 A1 / A2」 (css/figma-airport-v255.css).
 * guide.js rebuilds the timeline for every route; after each build this adds what the markup lacks:
 *   - 台北MRT station codes as a square two-line badge (BR / 13); 空港MRT codes stay as they are
 *   - a mark on every ride, on the line: BR / BL in the line colour, the 空港MRT logo on white,
 *     or the bus / taxi icon on grey
 *   - the transfer row: 「乗換」 on the line, a rule across, and 「{next line}に乗り換え」
 * Nothing is computed here; everything comes from the timeline guide.js wrote. */
(() => {
  'use strict';
  const timeline = document.getElementById('airsel-timeline');
  if (!timeline) return;
  const el = (tag, cls, text) => { const n = document.createElement(tag); n.className = cls; if (text) n.textContent = text; return n; };
  const AIRPORT = /A978D5|478ED1/i, BUS = /AEB4BC/i, TAXI = /D9B65F/i;

  function codes() {
    for (const c of timeline.querySelectorAll('.stop-body .code:not([data-tt2a])')) {
      c.dataset.tt2a = '1';
      const m = c.textContent.trim().match(/^(BR|BL)(\d+)$/);
      if (!m) continue;                       // 空港MRT (A12, A1…) keeps the horizontal badge
      c.classList.add('tt2a-code-sq');
      c.replaceChildren(el('span', 'tt2a-code-l', m[1]), el('span', 'tt2a-code-n', m[2]));
    }
  }
  function marks() {
    for (const leg of timeline.querySelectorAll(':scope > .timeline-leg')) {
      const content = leg.querySelector('.leg-content');
      if (!content || content.querySelector(':scope > .tt2a-mark')) continue;
      const line = leg.querySelector('.line-name')?.textContent.trim() || '';
      const style = leg.getAttribute('style') || '';
      let mark;
      if (line === '文湖線') mark = el('span', 'tt2a-mark tt2a-mark--br', 'BR');
      else if (line === '板南線') mark = el('span', 'tt2a-mark tt2a-mark--bl', 'BL');
      else if (AIRPORT.test(style)) mark = el('span', 'tt2a-mark tt2a-mark--ty');
      else {
        mark = el('span', 'tt2a-mark tt2a-mark--ground');
        const icon = document.querySelector('#airsel-company-fallback svg');   // the bus / taxi icon of this tab
        if (icon && (BUS.test(style) || TAXI.test(style))) mark.append(icon.cloneNode(true));
      }
      mark.setAttribute('aria-hidden', 'true');
      content.prepend(mark);
    }
  }
  function transfers() {
    for (const stop of timeline.querySelectorAll(':scope > .timeline-stop.transfer')) {
      const body = stop.querySelector('.stop-body');
      if (!body || body.querySelector('.tt2a-xfer-text')) continue;
      const next = stop.nextElementSibling?.querySelector('.line-name')?.textContent.trim();
      body.append(el('span', 'tt2a-xfer-rule'), el('span', 'tt2a-xfer-text', next ? `${next}に乗り換え` : '乗り換え'), el('span', 'tt2a-xfer-end'));
    }
  }
  // v2.0.60: each ride's order, for the line that grows from the top (css: --tt2a-leg-i)
  const order = () => timeline.querySelectorAll(':scope > .timeline-leg').forEach((leg, i) => leg.style.setProperty('--tt2a-leg-i', i));
  const run = () => { codes(); marks(); transfers(); order(); };
  new MutationObserver(run).observe(timeline, {childList: true});
  run();

})();
