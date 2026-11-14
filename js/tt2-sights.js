/* TABI TAIPEI v2.0.101 — js/tt2-sights.js: 見所: list frames, photo spots, events
   Collected in 2.0.101 (cleanup phase 3) from js/figma-sights-v206.js, js/figma-photo-v207.js, js/figma-events-v229.js,
   in that order; each part is still its own closed function. */

/* ════════ from js/figma-sights-v206.js ════════ */
/* TABI TAIPEI v2.0.6 — Figma 4-1-1 museum-list presentation adapter.
 * The original directory JSON, link hrefs, tags and filtering/list code remain
 * authoritative. Only the DOM presentation of the first museum category is
 * extended with the Japanese/Chinese typographic hierarchy from Figma.
 */
(() => {
  'use strict';
  const section = document.querySelector('[data-tt2-panel-key="places"]');
  if (!section || !window.tabiDirectoryReady) return;
  const displayNames = new Map([
    ['國立故宮博物院','国立故宮博物院'],
    ['北投溫泉博物館','北投温泉博物館'],
    ['國家鐵道博物館','国家鉄道博物館'],
    ['國立臺灣博物館','国立台湾博物館']
  ]);
  const order = ['國立故宮博物院','北投溫泉博物館','國家鐵道博物館','國立臺灣博物館'];
  function enhanceMuseum() {
    const museum = section.querySelector('.tab-panel .venue-directory-list');
    if (!museum || museum.dataset.tt2Museums === '1') return;
    const entries = [...museum.querySelectorAll(':scope > li.venue-list-item')];
    if (!entries.length) return;
    entries.forEach((row) => {
      const a = row.querySelector('a.venue-main-link');
      if (!a) return;
      const original = a.textContent.trim();
      row.classList.add('tt2-museum-row');
      row.dataset.tt2OriginalName = original;
      if (!displayNames.has(original)) return;
      a.textContent = '';
      const ja = document.createElement('span');
      ja.className = 'tt2-museum-ja'; ja.lang = 'ja'; ja.textContent = displayNames.get(original);
      a.append(ja); // original-name small line removed (user, 2026-11-14)
      a.title = original;
      const red = row.querySelector('.venue-tag--tone-red');
      if (red && original === '北投溫泉博物館') {
        // Figma text is the shorter visual label; retain the full original
        // status from the JSON in the tooltip/accessible text.
        red.title = red.textContent.trim();
        const concise = document.createElement('span');
        concise.className = 'tt2-museum-status-short';
        concise.textContent = '2027年10月まで休館';
        const full = document.createElement('span');
        full.className = 'tt2-museum-status-source';
        full.textContent = red.textContent.trim();
        red.replaceChildren(concise, full);
      }
    });
    const keyed = entries.map((row,i) => ({row,i,priority:order.indexOf(row.dataset.tt2OriginalName)}));
    keyed.sort((a,b) => (a.priority < 0 ? 99+a.i : a.priority) - (b.priority < 0 ? 99+b.i : b.priority));
    museum.replaceChildren(...keyed.map(x => x.row));
    museum.dataset.tt2Museums = '1';
    const tab = section.querySelector('.tab');
    const panels = tab?.querySelector('.tab-panels');
    if (tab && panels && !tab.querySelector('.tt2-sight-count')) {
      const count = document.createElement('div');
      count.className = 'tt2-sight-count';
      count.setAttribute('aria-live','polite');
      panels.prepend(count);
      const refresh = () => {
        const selected = tab.querySelector('.tab-pill[aria-selected="true"]');
        const panel = selected && document.getElementById(selected.getAttribute('aria-controls'));
        const all = panel?.querySelectorAll('.venue-list-item').length || 0;
        const closed = panel?.querySelectorAll('.venue-tag--tone-red').length || 0;
        count.textContent = `掲載 ${all}件　 /　 休館中 ${closed}件`;
      };
      tab.querySelector('.tab-pills')?.addEventListener('click',() => requestAnimationFrame(refresh));
      refresh();
    }
  }
  Promise.resolve(window.tabiDirectoryReady).then(enhanceMuseum);
})();

/* ════════ from js/figma-photo-v207.js ════════ */
/* TABI-TAIPEI v2.0.7 — exact Figma 4-2 presentation for 撮影スポット.
   This script only enhances the rendered, ORIGINAL data/sights.json rows.
   All fourteen popular places, their links and source tags remain in the DOM.
   No demonstration data or screenshots are used. */
(() => {
  'use strict';
  const section = document.querySelector('[data-tt2-panel-key="photo"]');
  if (!section || !window.tabiDirectoryReady) return;
  const figmaCopy = new Map([
    ['象山',{name:'象山自然歩道',caption:'台北101を大きく捉え、市街地の夜景を一望できる。'}],
    ['竹村居酒屋',{name:'竹村居酒屋',caption:'赤い提灯と台北101が重なる夜景スポット。'}],
    ['波士頓理髮廳',{name:'波士頓理髮廳',caption:'レトロな看板と緑のタイルが印象的。'}],
    ['四四南村',{name:'四四南村',caption:'昔ながらの家並みと台北101の対比が魅力。'}],
    // v2.0.107: the other ten, checked against the sources named in the 2.0.107 PR
    ['華江整宅社區',{name:'華江整宅社區',caption:'環状の空中歩道と給水塔が残る70年代の団地。'}],
    ['台湾大学文学院',{name:'台湾大学文学院',caption:'1929年築の市定古蹟。アーチ窓とタイル外壁が美しい。'}],
    ['新文化運動紀念館',{name:'新文化運動紀念館',caption:'1933年築の旧台北北警察署を生かした記念館。'}],
    ['馬偕街の教会',{name:'馬偕街の教会',caption:'赤レンガの尖塔が美しい1933年落成の淡水礼拝堂。'}],
    ['剣潭駅前地下連絡通路',{name:'剣潭駅前地下連絡通路',caption:'SF映画のような近未来感のある地下通路。'}],
    ['萬年商業大樓',{name:'萬年商業大樓',caption:'1973年開業。70年代の面影が残る西門町の商業ビル。'}],
    ['淡江大橋',{name:'淡江大橋',caption:'夕日に映える世界最長の単塔非対称斜張橋。'}],
    ['台北橋',{name:'台北橋',caption:'平日朝、三重側から押し寄せる「バイクの滝」。'}],
    ['飛機巷',{name:'飛機巷',caption:'松山空港の滑走路脇。着陸機が頭上を通過する。'}],
    ['寶藏巖',{name:'寶藏巖',caption:'60年代の丘の集落を生かした国際アートビレッジ。'}]
  ]);
  const displayOrder=['象山','竹村居酒屋','波士頓理髮廳','四四南村'];
  const popularId='photo-spots-popular';
  function enhance() {
    const tab=section.querySelector('.tab');
    const popular=section.querySelector('#'+popularId);
    const list=popular?.querySelector('ol.venue-directory-list');
    if (!tab || !list || list.dataset.tt2Photo==='1') return;
    const rows=[...list.querySelectorAll(':scope > li.venue-list-item')];
    if (!rows.length) return;
    rows.forEach(row=>{
      const a=row.querySelector('a.venue-main-link');
      if (!a) return;
      const sourceName=a.textContent.trim();
      row.classList.add('tt2-photo-row');
      row.dataset.tt2OriginalName=sourceName;
      const info=figmaCopy.get(sourceName);
      if (!info) return;
      const ja=document.createElement('span');ja.className='tt2-photo-ja';ja.lang='ja';ja.textContent=info.name;
      const desc=document.createElement('span');desc.className='tt2-photo-desc';desc.lang='ja';desc.textContent=info.caption;
      a.replaceChildren(ja,desc);
      a.setAttribute('title',sourceName);
    });
    const ordered=rows.map((row,i)=>({row,i,rank:displayOrder.indexOf(row.dataset.tt2OriginalName)}))
      .sort((a,b)=>(a.rank<0?100+a.i:a.rank)-(b.rank<0?100+b.i:b.rank));
    list.replaceChildren(...ordered.map(x=>x.row));
    const pills=tab.querySelector('.tab-pills');
    const popularButton=pills?.querySelector('[aria-controls="'+popularId+'"]');
    if (popularButton) {
      // The designer's 4-2 first visible category is 映えスポット.
      // Keep original DOM order: guide.js binds tab indices at startup.
      // CSS alone swaps the VISUAL order, without mismatching ARIA/panels.
      // Reuse the site's existing tab controller, keyboard behavior and ARIA.
      if (popularButton.getAttribute('aria-selected')!=='true') popularButton.click();
    }
    if (!tab.querySelector('.tt2-photo-count')) {
      const count=document.createElement('div');count.className='tt2-photo-count';
      count.textContent='掲載 '+rows.length+'件';
      const container=tab.querySelector('.tab-panels');
      container?.prepend(count);
    }
    list.dataset.tt2Photo='1';
  }
  Promise.resolve(window.tabiDirectoryReady).then(enhance);
})();

/* ════════ from js/figma-events-v229.js ════════ */
/* TABI TAIPEI v2.0.29 — イベント: 「条件を指定」button (replaces figma-events-v207.js, which
   was empty, and figma-events-v209.js). js/events.js still owns the filter state: this only
   adds a visible trigger that clicks the count button, and closes the panel after a choice.
   With conditions set, CSS turns the button into a round「＋」at the end of the chips. */
(()=>{'use strict';
  const root=document.getElementById('event-calendar');
  if(!root)return;
  const label=()=>root.querySelector('.ec-chips .ec-chip')?'条件を追加・変更':'イベントの条件を指定';
  const ensure=()=>{
    const summary=root.querySelector('.ec-summary');
    if(!summary)return;
    let button=summary.querySelector('.ec-condition-open');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='ec-condition-open';
      button.textContent='条件を指定';
      button.setAttribute('aria-controls','ec-filter-panel');
      button.addEventListener('click',()=>summary.querySelector('.ec-sum-total')?.click());
      summary.appendChild(button);
    }
    button.setAttribute('aria-label',label());
  };
  const summary=root.querySelector('.ec-summary');
  if(!summary)return;
  new MutationObserver(ensure).observe(summary,{childList:true});
  const chips=root.querySelector('.ec-chips');
  if(chips)new MutationObserver(ensure).observe(chips,{childList:true});
  ensure();
  // After choosing one option, go back to the compact chips (Figma 4-3-3).
  root.querySelector('.ec-filter-panel')?.addEventListener('click',ev=>{
    if(!ev.target.closest('.ec-option'))return;
    queueMicrotask(()=>{
      const panel=root.querySelector('.ec-filter-panel');
      if(panel&&!panel.hidden)root.querySelector('.ec-sum-total')?.click();
    });
  });
})();
