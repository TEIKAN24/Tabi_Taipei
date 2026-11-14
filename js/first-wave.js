/* TABI TAIPEI — first wave UI shell.
   Does not redefine existing map, calendar, venue, airport, recommendation, or route APIs. */
(() => {
  'use strict';
  const html = document.documentElement;
  const button = document.getElementById('tt-menu-toggle');
  const backdrop = document.getElementById('tt-menu-backdrop');
  const panel = document.getElementById('tt-side-menu');
  const hero = document.getElementById('top');
  const travelTabs = Array.from(document.querySelectorAll('[data-tt-travel-tab]'));
  const detailMap = {
    notes: document.querySelector('.page-body > details.travel-caution'),
    twac: document.querySelector('.page-body > details.travel-twac'),
    pass: document.querySelector('.page-body > details.travel-passes')
  };
  if (!button || !backdrop || !panel || !hero || !detailMap.notes) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let previousFocus = null;
  let closingTimer = 0;
  const menuOpen = () => html.classList.contains('tt-nav-open');
  const setMenu = (open) => {
    clearTimeout(closingTimer);
    if (open === menuOpen()) return;
    if (open) previousFocus = document.activeElement;
    html.classList.toggle('tt-nav-open', open);
    html.classList.toggle('tt-scroll-locked', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    panel.setAttribute('aria-hidden', String(!open));
    backdrop.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (!open) {
      closingTimer = window.setTimeout(() => { if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); }, reduce.matches ? 0 : 185);
    }
  };
  button.addEventListener('click', () => setMenu(!menuOpen()));
  backdrop.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuOpen()) {event.preventDefault();setMenu(false);button.focus();}
    if (event.key === 'Tab' && menuOpen()) {
      const list = Array.from(panel.querySelectorAll('a[href],button:not([disabled])'));
      const first = list[0], last = list[list.length-1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();button.focus();}
      else if (!event.shiftKey && document.activeElement === button) {event.preventDefault();first?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();button.focus();}
    }
  });

  // Hand navigation to the original guide handlers whenever a corresponding quick-nav
  // action exists. This preserves accordion opening and tab synchronization.
  function navigateTo(id) {
    setMenu(false);
    if (id === 'top') { window.scrollTo({top:0,behavior:reduce.matches?'instant':'smooth'}); return; }
    const anchor = document.getElementById(id);
    if (!anchor) return;
    // Original quick-nav treats "travel" as a folding command. Calling it while
    // our Notes tab is already open would CLOSE the visible tab, leaving an empty
    // first chapter. The new travel tab bar is its own navigation owner.
    if (id === 'travel') {
      activateTravel('notes');
      requestAnimationFrame(() => anchor.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'}));
      return;
    }
    const original = document.querySelector(`.quick-nav > .nav-button[data-target="${CSS.escape(id)}"]`);
    if (original) original.click();
    else {
      if (id === 'souvenirs') {
        const d = document.getElementById('3f66bda0-4caa-8038-8328-e8b12e95336f');
        if (d instanceof HTMLDetailsElement) d.open = true;
      }
      if (id === 'experiences') {
        const d = document.getElementById('3f76bda0-4caa-80d2-8841-c76e1f8f749a');
        if (d instanceof HTMLDetailsElement) d.open = true;
      }
      requestAnimationFrame(() => anchor.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'}));
    }
  }
  document.querySelectorAll('[data-tt-target]').forEach(link => {
    link.addEventListener('click', event => {
      const id = link.dataset.ttTarget;
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      navigateTo(id);
    });
  });
  document.querySelector('.tt-brand')?.addEventListener('click', event => {
    event.preventDefault();navigateTo('top');
  });

  // Mark home while the first viewport is visible, so the tiny mint subtitle
  // appears beside the logo only at the entrance.
  let scrollQueued=false;
  function syncHome() {
    scrollQueued=false;
    const y=hero.getBoundingClientRect().bottom;
    html.classList.toggle('tt-at-home', y > innerHeight * .45);
  }
  addEventListener('scroll', () => { if (!scrollQueued) {scrollQueued=true;requestAnimationFrame(syncHome);} }, {passive:true});
  addEventListener('resize', syncHome, {passive:true});
  syncHome();

  // Chapter 01 tab bar works on the existing details nodes; no content duplication.
  function activateTravel(which) {
    if (!detailMap[which]) return;
    travelTabs.forEach(tab => {
      const active = tab.dataset.ttTravelTab === which;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    Object.entries(detailMap).forEach(([key,d]) => {if (d) d.open=(key===which);});
  }
  travelTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTravel(tab.dataset.ttTravelTab));
    tab.addEventListener('keydown', event => {
      if (event.key!=='ArrowRight' && event.key!=='ArrowLeft') return;
      event.preventDefault();
      const next = travelTabs[(index+(event.key==='ArrowRight'?1:travelTabs.length-1))%travelTabs.length];
      next.focus();next.click();
    });
  });
  activateTravel('notes');
  const notes=Array.from(detailMap.notes.querySelectorAll('details.nested-accordion'));
  notes.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) notes.forEach(other=>{if(other!==item)other.open=false;});
  }));

  // Do not force the guide into chapter mode when loading a deep link: the existing
  // guide.js hash handler owns that decision. Only honor an explicit section deep link.
  if (location.hash.startsWith('#') && location.hash.length>1) {
    html.classList.remove('tt-at-home');
  }
})();
