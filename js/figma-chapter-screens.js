/* TABI TAIPEI 2.0.5: Figma's fixed chapter panels, driven by ORIGINAL nodes.
 * No reparenting of maps, venue lists, event calendar or other legacy modules.
 * Original IDs, data sources, event listeners, and scroll/list APIs are kept.
 */
(() => {
  'use strict';
  const main = document.getElementById('guide');
  if (!main) return;
  const chapters = {
    'city-walk': [
      {key:'night',label:'夜市',node:document.getElementById('night-markets-section')},
      {key:'area',label:'商圏',node:document.getElementById('3f66bda0-4caa-800d-95db-dea98f822273')}
    ],
    'sights': [
      {key:'places',label:'名所・博物館',node:document.getElementById('3f56bda0-4caa-8046-a491-c25321b680c1')},
      {key:'photo',label:'撮影スポット',node:document.getElementById('photo-spots-section')},
      {key:'event',label:'イベント',node:document.getElementById('event-calendar-section')}
    ]
  };
  const bars = {};
  const choices = {'city-walk':'night',sights:'places'};
  for (const [chapter, items] of Object.entries(chapters)) {
    if (items.some(x=>!(x.node instanceof HTMLDetailsElement))) {
      console.warn('[TABI 2.0] Missing original panel for '+chapter);
      continue;
    }
    const bar = document.createElement('nav');
    bar.className='tt2-chapter-tabs';
    bar.setAttribute('aria-label', chapter==='sights'?'見所の分類':'散策の分類');
    bar.dataset.tt2Chapter=chapter;
    items.forEach((item,index)=>{
      item.node.dataset.tt2Panel=chapter;
      item.node.dataset.tt2PanelKey=item.key;
      const btn=document.createElement('button');
      btn.type='button';btn.className='tt2-chapter-tab';
      btn.textContent=item.label;
      btn.dataset.tt2Tab=item.key;
      btn.dataset.tt2Chapter=chapter;
      btn.setAttribute('aria-controls',item.node.id);
      btn.setAttribute('aria-selected',String(index===0));
      btn.addEventListener('click',()=>activate(chapter,item.key));
      bar.appendChild(btn);
    });
    const first=items[0].node;
    main.insertBefore(bar, first);
    bars[chapter]=bar;
  }

  function notify(view) {
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      // All original listeners retain ownership of repaint & map sizing.
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('ct-resize'));
      document.dispatchEvent(new CustomEvent('tt:panelchange',{detail:{view}}));
    }));
  }
  function activate(chapter, key, silent=false) {
    if (!bars[chapter]) return;
    const items=chapters[chapter];
    if (!items.some(x=>x.key===key)) key=items[0].key;
    choices[chapter]=key;
    for (const item of items) {
      const active=item.key===key;
      item.node.classList.toggle('tt2-panel-current',active);
      // Initialize original module only when its panel is visible.
      // Do not replace its HTML or create a parallel map/list/calendar.
      if (active && !item.node.open) item.node.open=true;
      if (!active && item.node.open) item.node.open=false;
      if (active) {
        item.node.scrollTop=0;
        item.node.querySelector('.tab-panel[aria-hidden="false"]')?.scrollTo(0,0);
      }
      const button=bars[chapter].querySelector(`[data-tt2-tab="${item.key}"]`);
      if (button) button.setAttribute('aria-selected',String(active));
    }
    if (!silent) notify(chapter);
  }
  const setChapter = name => {
    if (name!=='city-walk'&&name!=='sights') return;
    // Restore the user's last chosen category when returning to a chapter.
    activate(name,choices[name]);
  };
  // The original day-trip timeline listens to window scroll. Forward only
  // scrolls inside its bounded panel, without enabling document scrolling.
  main.addEventListener('scroll',()=>{
    if (document.documentElement.dataset.ttView === 'day-trips') {
      window.dispatchEvent(new Event('scroll'));
    }
  },{passive:true});
  document.addEventListener('tt:viewchange',event=>setChapter(event.detail?.view));
  setChapter(document.documentElement.dataset.ttView);
})();
