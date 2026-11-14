/* TABI TAIPEI v2.0.101 — js/tt2-sights-list.js: 見所: the shared, editable sightseeing list (defer)
   Was js/figma-sights-v210.js until 2.0.101 (cleanup phase 3). */
/* TABI-TAIPEI v2.0.10.1 — Shared, editable sightseeing list presentation.
   Figma 4-1-2 (アート・デザイン) supplies exact first-four display labels and
   geometry. Other categories inherit the established 4-1 list component;
   no fabricated translations or destination information.
   Source of truth: existing data/sights.json and the original directory renderer.
 */
(() => {
  'use strict';
  const places = document.querySelector('[data-tt2-panel-key="places"]');
  const photo = document.querySelector('[data-tt2-panel-key="photo"]');
  if (!places && !photo) return;

  const artAliases = new Map([
    ['松山文創園區', ['松山文創園区','松山文創園區']],
    ['華山1914', ['華山1914','華山1914']],
    ['臺北市立美術館', ['台北市立美術館','臺北市立美術館']],
    ['台北當代藝術館', ['台北当代芸術館 MOCA Taipei','台北當代藝術館 MOCA Taipei']]
  ]);
  const artCategory = '3f56bda0-4caa-808e-9bda-e62f8014d993';
  const photoFilmCategory = 'photo-spots-artist';

  const create = (name, cls, content, lang) => {
    const node = document.createElement(name);
    node.className = cls;
    node.textContent = content;
    if (lang) node.lang = lang;
    return node;
  };

  function enhancePlaces() {
    if (!places) return;
    const tab = places.querySelector('.tab');
    if (!tab) return;
    const panels = [...tab.querySelectorAll('.tab-panel')];
    panels.forEach(panel => {
      const list = panel.querySelector('ol.venue-directory-list');
      if (!list || panel.id === '3f56bda0-4caa-8079-bc60-d531f3db8f89' || list.dataset.tt2SightExtra === '1') return;
      const isArt = panel.id === artCategory;
      const rows = [...list.querySelectorAll(':scope > li.venue-list-item')];
      if (!rows.length) return;
      rows.forEach(row => {
        const link = row.querySelector('a.venue-main-link');
        if (!link) return;
        const sourceName = link.textContent.trim();
        row.classList.add('tt2-sight-extra-row');
        row.dataset.tt2OriginalName = sourceName;
        const label = isArt ? artAliases.get(sourceName) : null;
        if (label) {
          const jp = create('span','tt2-sight-extra-ja',label[0],'ja');
          const zh = create('span','tt2-sight-extra-zh',label[1],'zh-Hant');
          link.replaceChildren(jp,zh);
          link.title = sourceName;
        } else {
          // This category has no finished Figma copy: keep the exact source
          // title. A corresponding 2-line caption is not invented.
          link.replaceChildren(create('span','tt2-sight-extra-ja',sourceName));
          row.classList.add('tt2-sight-extra-no-subtitle');
        }
        if (isArt) {
          // Figma shows a compact outline action '公式へ'; the source URL stays.
          const external = row.querySelector('.venue-secondary-links a.external-action-link');
          if (external && /公式/.test(external.textContent)) {
            external.title = external.textContent.trim();
            external.textContent = '公式へ';
          }
          if (sourceName === '華山1914') {
            const badgeList = row.querySelector('.venue-tag-list');
            if (badgeList) {
              const badges = [...badgeList.children];
              const exhibition = badges.find(b => b.textContent.trim() === '展覧会・雑貨');
              if (exhibition) badgeList.insertBefore(exhibition,badgeList.firstChild);
            }
          }
        }
      });
      list.dataset.tt2SightExtra = '1';
    });
    const pills = tab.querySelector('.tab-pills');
    if (pills && pills.dataset.tt2Scroll === undefined) {
      pills.dataset.tt2Scroll = '1';
      const align = () => {
        const selected = pills.querySelector('.tab-pill[aria-selected="true"]');
        if (!selected || !pills.offsetWidth) return;
        // Figma 4-1-2 scrolls the secondary bar left when Art is selected.
        // Do not move the primary navigation or document viewport.
        const left = selected.getBoundingClientRect().left;
        const wanted = pills.getBoundingClientRect().left + (selected.getAttribute('aria-controls') === artCategory ? 67 : 55);
        if (selected.getAttribute('aria-controls') !== '3f56bda0-4caa-8079-bc60-d531f3db8f89')
          pills.scrollLeft += left - wanted;
        else pills.scrollLeft = 0;
      };
      pills.addEventListener('click',() => requestAnimationFrame(align));
    }
  }

  function enhanceFilming() {
    if (!photo) return;
    const tab = photo.querySelector('.tab');
    const panel = document.getElementById(photoFilmCategory);
    const list = panel?.querySelector('ol.venue-directory-list');
    if (!tab || !list || !list.querySelector('li.venue-list-item')) return;
    if (list.dataset.tt2Film !== '1') {
      [...list.querySelectorAll(':scope > li.venue-list-item')].forEach(row => {
        const link = row.querySelector('a.venue-main-link');
        if (!link) return;
        row.classList.add('tt2-photo-row','tt2-photo-film-row');
        // The location names and artist badges come only from source JSON.
        const sourceName = link.textContent.trim();
        link.replaceChildren(create('span','tt2-photo-ja',sourceName));
      });
      list.dataset.tt2Film = '1';
    }
    const count = tab.querySelector('.tt2-photo-count');
    if (count && count.dataset.tt2Dynamic !== '1') {
      const update = () => {
        const selected = tab.querySelector('.tab-pill[aria-selected="true"]');
        const activePanel = selected && document.getElementById(selected.getAttribute('aria-controls'));
        const length = activePanel?.querySelectorAll('li.venue-list-item').length || 0;
        count.textContent = `掲載 ${length}件`;
      };
      count.dataset.tt2Dynamic = '1';
      tab.querySelector('.tab-pills')?.addEventListener('click',() => requestAnimationFrame(update));
      update();
    }
  }

  const apply = () => { enhancePlaces(); enhanceFilming(); };
  if (window.tabiDirectoryReady) Promise.resolve(window.tabiDirectoryReady).then(apply);
  else window.addEventListener('load', apply, { once: true });
})();
