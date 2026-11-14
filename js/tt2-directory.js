/* TABI TAIPEI v2.0.101 — js/tt2-directory.js: 体験・おみやげ: the directory screens
   Was js/figma-directory-v211.js until 2.0.101 (cleanup phase 3). */
/* TABI TAIPEI 2.0.11 — Figma 5-1 and 7-1: presentation only.
 * Retain original data/experiences.json and data/souvenirs.json, existing
 * links, labels, working original tab controller and source row identities. */
(() => {
  'use strict';
  const sources = [
    { view:'experiences', id:'3f76bda0-4caa-80d2-8841-c76e1f8f749a' },
    { view:'souvenirs', id:'3f66bda0-4caa-8038-8328-e8b12e95336f' }
  ];
  function shortLabel(view, row, panelLabel) {
    if (view !== 'experiences') return '';
    if (panelLabel.includes('プリクラ')) {
      const source = row.querySelector('.venue-main-link')?.textContent?.trim() || '';
      return /レトロ衣装|旗袍|変身体験/.test(source) ? '変身体験' : 'プリクラ';
    }
    // v2.0.109 (the user's labels): 手作り has none; 占い・カラオケ and the シャンプー・マッサージ
    // list name each place by what it is (from its name / its own tag)
    if (panelLabel.includes('手作り')) return '';
    if (panelLabel.includes('占い')) return /占い/.test(row.querySelector('.venue-main-link')?.textContent || '') ? '占い' : 'カラオケ';
    if (/シャンプー|マッサージ/.test(panelLabel)) {
      const tags = [...row.querySelectorAll('.venue-tag')].map(t => t.textContent.trim());
      if (tags.includes('マッサージ')) return 'マッサージ';
      if (tags.includes('台湾式シャンプー')) return '台湾式シャンプー';
    }
    return panelLabel;
  }
  function initChapter(source) {
    const root = document.getElementById(source.id);
    const tab = root?.querySelector('.tab');
    const controls = tab?.querySelector('.tab-pills');
    const content = tab?.querySelector('.tab-panels');
    if (!root || !tab || !controls || !content || root.dataset.tt2DirectoryEnhanced === '1') return;
    root.classList.add('tt2-directory-section');
    root.dataset.tt2DirectoryEnhanced = '1';
    const buttons = Array.from(controls.querySelectorAll('.tab-pill'));
    if (source.view === 'souvenirs') {
      const notionButton = buttons.find(b => b.textContent.includes('雑貨'));
      if (notionButton) notionButton.replaceChildren(document.createTextNode('雑貨・小物'));
    }
    buttons.forEach(button => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      const all = [...panel.querySelectorAll('li.venue-row')];
      const panelLabel = button.textContent.trim();
      for (const row of all) {
        row.classList.add('tt2-directory-row');
        const body = row.querySelector('.venue-row-body');
        if (!body) continue;
        const label = shortLabel(source.view, row, panelLabel);
        if (label) {
          const kicker = document.createElement('span');
          kicker.className = 'tt2-directory-kicker';
          kicker.textContent = label;
          body.prepend(kicker);
          // v2.0.109: the tag that now stands above (マッサージ / 台湾式シャンプー) leaves the tag line
          if (/^(マッサージ|台湾式シャンプー)$/.test(label)) {
            row.querySelectorAll('.venue-tag').forEach(t => { if (t.textContent.trim() === label) t.remove(); });
            const list = row.querySelector('.venue-tag-list');
            list?.classList.toggle('tt2l-empty', !list.querySelector('.venue-tag'));
          }
        } else row.classList.add('tt2-directory-no-kicker');
        // Designer's visible tag order, with both original source tags intact.
        if (source.view === 'experiences' && panelLabel.includes('プリクラ')) {
          const name = row.querySelector('.venue-main-link')?.textContent.trim();
          const preferred = name === 'pick my ccd' ? 'Y2K' : name === 'More and more' ? 'かわいい' : null;
          const tags = row.querySelector('.venue-tag-list');
          if (preferred && tags) {
            const tag = [...tags.children].find(n => n.textContent.trim() === preferred);
            if (tag) tags.prepend(tag);
          }
        }
        if (source.view === 'souvenirs') {
          const tags = row.querySelector('.venue-tag-list');
          const emphasis = tags && [...tags.children].find(n => n.textContent.trim() === 'おすすめ');
          if (emphasis) tags.prepend(emphasis);
        }
      }
    });
    // Figma 5-1 specifies the first four visible cards. The original guide
    // ranks the rows by tag weight at runtime; restore only these designer-
    // defined placements while leaving every remaining source record intact.
    if (source.view === 'experiences') {
      const first = document.getElementById('3f76bda0-4caa-8069-9f71-c1e593688b35');
      const list = first?.querySelector('ol.venue-directory-list');
      if (list) {
        const desired = ['pick my ccd','More and more','レトロ衣装（旗袍）変身体験','SNAPPP小福星拍貼機'];
        const rows = [...list.querySelectorAll(':scope > li')];
        const named = new Map(rows.map(row => [row.querySelector('.venue-main-link')?.textContent.trim(),row]));
        const featured = desired.map(name => named.get(name)).filter(Boolean);
        list.replaceChildren(...featured,...rows.filter(row=>!featured.includes(row)));
      }
    }
    const count = document.createElement('div');
    count.className = 'tt2-directory-count';
    count.setAttribute('aria-live', 'polite');
    tab.append(count);
    const sync = () => {
      const chosen = buttons.find(b => b.getAttribute('aria-selected') === 'true');
      if (!chosen) return;
      const panel = document.getElementById(chosen.getAttribute('aria-controls'));
      const total = panel?.querySelectorAll('li.venue-row').length || 0;
      count.textContent = `掲載 ${total}件`;
    };
    controls.addEventListener('click', () => requestAnimationFrame(() => {
      sync();
      // Keep the selected category in view, but never scroll the whole page.
      const selected = buttons.find(b => b.getAttribute('aria-selected') === 'true');
      if (selected) {
        const c = controls.getBoundingClientRect(), t = selected.getBoundingClientRect();
        if (t.left < c.left || t.right > c.right) {
          controls.scrollTo({left: Math.max(0, controls.scrollLeft + t.left-c.left - 8), behavior:'smooth'});
        }
      }
    }));
    sync();
  }
  function init() { for (const source of sources) initChapter(source); }
  if (window.tabiDirectoryReady) Promise.resolve(window.tabiDirectoryReady).then(init);
  else window.addEventListener('load', init, {once:true});
})();
