/* TABI TAIPEI v2.0.101 — js/tt2-type.js: type: the outlined display type (.tt2o)
   Was js/figma-type-v276.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI v2.0.76 — Figma's display type as outlines.
   かすみ青嵐明朝 and 石井明朝 オールドスタイル are not installed on phones, so these fixed
   words are drawn from outline SVGs exported from the Figma file
   (assets/figma/outlines/type, user-confirmed licence for outlining). The SVG is a CSS
   mask painted in the element's own text colour (css/figma-system-v273.css, .tt2o);
   the word itself stays in the DOM at font-size 0 for screen readers and search.
   A word with no outline yet keeps its text (Hiragino Mincho on every device). */
(() => {
  const DIR = new URL('assets/figma/outlines/type/', document.baseURI).href;
  const V = '?v=2.0.77';
  // word → [file, Figma text box width, height, Figma font size]
  const WORDS = {
    '旅支度': ['name-travel', 45, 30, 15],
    '味わい': ['name-food', 45, 30, 15],
    '散策': ['name-walk', 30, 30, 15],
    '体験': ['name-exp', 30, 30, 15],
    '遠出': ['name-day', 30, 30, 15],
    'おみやげ': ['name-souvenir', 60, 30, 15],
    '空港アクセス': ['name-airport', 87, 30, 15],
    // v2.0.77: outlined by the user in Figma (frame 250:1406); tight glyph boxes
    '見所': ['name-sights', 30, 13, 15],
    '緊急連絡先': ['name-emergency', 72, 13, 15],
    '九份': ['place-jiufen', 76, 33, 40],
    '十分': ['place-shifen', 77, 33, 40],
    '基隆': ['place-keelung', 79, 33, 40],
    '野柳': ['place-yehliu', 74, 34, 40],
    '赤い提灯が灯る、山あいのレトロな街': ['tag-jiufen', 237, 12, 14],
    '願いを込めて、天燈を空へ': ['tag-shifen', 166, 12, 14],
    '港町の夜景とローカルグルメ': ['tag-keelung', 175, 12, 14],
    '海がつくり出した、不思議な奇岩群': ['tag-yehliu', 223, 13, 14]
  };
  for (let i = 1; i <= 7; i++) WORDS['0' + i] = ['num-0' + i, 21, 36, 18];
  // where the words appear, and the size they are set at there
  const TARGETS = [
    ['.tt-chapter-name', 15],
    ['#airport-route-selector .section-top h2', 15],
    ['.tt-chapter-number', 18],
    ['.tt-home-number', 10],
    ['.tt269-place', 40],
    ['.tt269-tagline', 14]
  ];

  function apply() {
    for (const [sel, size] of TARGETS) {
      for (const el of document.querySelectorAll(sel)) {
        if (el.classList.contains('tt2o')) continue;
        const spec = WORDS[el.textContent.trim()];
        if (!spec) continue;
        const [file, w, h, at] = spec, k = size / at;
        const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 1.1;
        el.style.setProperty('--tt2o-url', `url("${DIR}${file}.svg${V}")`);
        el.style.setProperty('--tt2o-w', (w * k).toFixed(2) + 'px');
        el.style.setProperty('--tt2o-mh', (h * k).toFixed(2) + 'px');
        el.style.setProperty('--tt2o-h', lh.toFixed(2) + 'px');
        el.classList.add('tt2o');
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  document.addEventListener('tt:viewchange', () => requestAnimationFrame(apply));
  // 遠出 redraws its hero on every destination tap: outline the new words too.
  let queued = false;
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; apply(); }); } };
  const guide = document.getElementById('guide');
  if (guide && window.MutationObserver) new MutationObserver(later).observe(guide, {childList: true, subtree: true});
  window.tabiOutlineType = apply;
})();
