/* TABI TAIPEI v2.0.102 — js/tt2-reveal.js: keep what was just opened in sight.
   window.tt2Reveal(block, {settle, top, bottom}) is called right after something opens (a 旅支度
   note, a 遠出 way, a 料理辞典 entry, 条件を指定). Once the opening motion has finished (the
   animations and transitions under `settle`, default the block), the block's own scroller (the
   nearest scrolling box, else the page) moves up just enough for the block's bottom to show:
   - never further than the block's top reaching the top of the view (a tall block keeps its
     title in sight, its end then follows by scrolling as usual);
   - never past the end of the scroller (no over-scroll at the bottom);
   - `top` / `bottom` are the parts of the view covered by a header or a fade (px); on the page
     itself the fixed site header is always left out.
   Nothing moves when the block is already in sight. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const GAP = 16;

  function scrollerOf(el) {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return null; // the page
  }
  function settled(root) {
    const list = root.getAnimations ? root.getAnimations({subtree: true}) : [];
    const done = Promise.all(list.map(a => a.finished.catch(() => {})));
    return Promise.race([done, new Promise(r => setTimeout(r, 700))]);
  }

  window.tt2Reveal = (block, opts = {}) => {
    if (!block || !block.isConnected) return;
    const settle = opts.settle || block;
    // wait one frame so the opening has started, then for it to finish
    requestAnimationFrame(() => settled(settle).then(() => {
      if (!block.isConnected || !block.getClientRects().length) return;
      const box = scrollerOf(block);
      const page = !box;
      let headerBottom = 0;
      if (page) {
        const bar = document.querySelector('.tt-sitebar');
        const pos = bar ? getComputedStyle(bar).position : '';
        if (pos === 'fixed' || pos === 'sticky') headerBottom = Math.max(0, bar.getBoundingClientRect().bottom);
      }
      const view = page ? {top: headerBottom, bottom: window.innerHeight} : box.getBoundingClientRect();
      const top = view.top + (opts.top || 0) + GAP;
      const bottom = view.bottom - (opts.bottom || 0) - GAP;
      const r = block.getBoundingClientRect();
      const need = r.bottom - bottom;
      const room = r.top - top;
      if (need <= 0 || room <= 0) return;
      const now = page ? window.scrollY : box.scrollTop;
      const max = page ? document.documentElement.scrollHeight - window.innerHeight : box.scrollHeight - box.clientHeight;
      const target = Math.max(0, Math.min(max, now + Math.min(need, room)));
      if (target <= now + 1) return;
      const behavior = reduce.matches ? 'auto' : 'smooth';
      (page ? window : box).scrollTo({top: target, behavior});
    }));
  };
})();
