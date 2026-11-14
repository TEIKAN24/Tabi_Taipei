/* TABI TAIPEI • view router v1.2.
 * Screen changes preserve all original HTML nodes, loaded data, DOM listeners,
 * map/canvas state and calendar state. Chapter boundaries are resolved from
 * semantic anchors, rather than fragile nth-child offsets.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const hero = document.getElementById('top');
  const main = document.getElementById('guide');
  const body = main?.querySelector(':scope > .page-body');
  if (!hero || !main || !body) return;

  const screens = new Set(['home', 'travel', 'food', 'sights', 'city-walk',
    'experiences', 'souvenirs', 'day-trips', 'emergency']);
  const legacy = {
    top: 'home', travel: 'travel', food: 'food', sights: 'sights',
    'city-walk': 'city-walk', 'night-markets': 'city-walk', areas: 'city-walk',
    experiences: 'experiences', 'experience-souvenirs': 'experiences',
    souvenirs: 'souvenirs', 'day-trips': 'day-trips',
    'airport-route-selector': 'travel'
  };

  // Keep all original section markup in place. Older modules rely on parent
  // selectors such as .page-body > details and stable node identities.
  const direct = element => Array.from(element.children);
  const mainNodes = direct(main);
  const bodyNodes = direct(body);
  const atId = (nodes, id) => nodes.findIndex(n => n.id === id);
  const beforeDivider = (nodes, index) => {
    if (index < 0) return -1;
    for (let i = index; i >= 0; i--) {
      if (nodes[i].matches('hr.chapter-divider')) return i;
    }
    return index;
  };
  const mainStops = [
    {name: 'sights', start: beforeDivider(mainNodes, atId(mainNodes, 'sights'))},
    {name: 'city-walk', start: beforeDivider(mainNodes, atId(mainNodes, 'city-walk'))},
    {name: 'experiences', start: beforeDivider(mainNodes, atId(mainNodes, 'experiences'))},
    {name: 'souvenirs', start: atId(mainNodes, 'souvenirs')},
    {name: 'day-trips', start: beforeDivider(mainNodes, atId(mainNodes, 'day-trips'))},
    {name: 'emergency', start: mainNodes.findIndex(n => n.matches('hr.chapter-glow--emergency'))},
    {name: '_end', start: mainNodes.findIndex(n => n.matches('.food-theme-dock'))}
  ];
  const visibleSets = {};
  for (let i = 0; i < mainStops.length - 1; i++) {
    const current = mainStops[i], following = mainStops[i + 1];
    if (current.start >= 0 && following.start > current.start) {
      visibleSets[current.name] = mainNodes.slice(current.start, following.start);
    } else {
      console.warn('[TABI TAIPEI] Screen boundary missing:', current.name);
      visibleSets[current.name] = [];
    }
  }
  const firstMain = mainStops[0].start;
  const lastMain = mainStops[mainStops.length - 1].start;
  const routedMain = firstMain >= 0 && lastMain > firstMain
    ? mainNodes.slice(firstMain, lastMain) : [];
  const foodStart = beforeDivider(bodyNodes, atId(bodyNodes, 'food'));
  if (foodStart >= 0) {
    visibleSets.travel = bodyNodes.slice(0, foodStart);
    visibleSets.food = bodyNodes.slice(foodStart);
  } else {
    console.warn('[TABI TAIPEI] Travel/food boundary not found');
    visibleSets.travel = bodyNodes;
    visibleSets.food = [];
  }
  const routedBody = bodyNodes;

  const parse = () => {
    let path;
    try { path = decodeURIComponent(location.hash.replace(/^#/, '')); }
    catch { path = location.hash.replace(/^#/, ''); }
    if (path.startsWith('view/')) path = path.slice(5).split('/')[0];
    return screens.has(path) ? path : (legacy[path] || 'home');
  };
  let current = 'home';
  function activateChapterDetails(next) {
    // Don't recreate content or reset maps, event filters, timelines or tab state.
    if (next === 'experiences' || next === 'souvenirs') {
      const id = next === 'experiences'
        ? '3f76bda0-4caa-80d2-8841-c76e1f8f749a'
        : '3f66bda0-4caa-8038-8328-e8b12e95336f';
      const details = document.getElementById(id);
      if (details instanceof HTMLDetailsElement) details.open = true;
    }
    if (next === 'travel') {
      const tab = document.querySelector('[data-tt-travel-tab="notes"]');
      if (tab?.getAttribute('aria-selected') !== 'true') tab?.click();
    }
  }

  function show(next, options = {}) {
    if (!screens.has(next)) next = 'home';
    const isHome = next === 'home';
    const changed = next !== current;
    const previous = current;
    root.classList.toggle('tt-route-home', isHome);
    root.classList.toggle('tt-route-chapter', !isHome);
    root.dataset.ttView = next;
    if (next !== 'travel') root.classList.remove('tt2-airport-open');
    hero.classList.toggle('tt-view-hidden', !isHome);
    main.classList.toggle('tt-view-hidden', isHome);
    body.classList.toggle('tt-view-hidden', !['travel', 'food'].includes(next));
    const visible = new Set(visibleSets[next] || []);
    for (const node of routedMain) node.classList.toggle('tt-view-hidden', !visible.has(node));
    for (const node of routedBody) node.classList.toggle('tt-view-hidden', !visible.has(node));
    root.classList.toggle('tt-at-home', isHome);
    document.querySelectorAll('.tt-home-item, .tt-side-link').forEach(link => {
      if (link.dataset.ttTarget === next) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (changed || options.force) {
      current = next;
      activateChapterDetails(next);
      window.scrollTo({top: 0, behavior: 'auto'});
      main.scrollTop = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new CustomEvent('tt:viewchange', {
          detail: {view: next, previous, changed}
        }));
        setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
      }));
    }
  }
  function go(next, replace = false) {
    if (!screens.has(next)) return;
    const hash = '#view/' + next;
    if (location.hash !== hash) {
      if (replace) location.replace(hash);
      else location.hash = hash;
    }
    show(next);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('[data-tt-target], .tt-brand');
    if (!link) return;
    const raw = link.classList.contains('tt-brand') ? 'home' : link.dataset.ttTarget;
    const next = legacy[raw] || raw;
    if (!screens.has(next)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const toggle = document.getElementById('tt-menu-toggle');
    if (root.classList.contains('tt-nav-open')) toggle?.click();
    if (raw === 'travel') root.classList.remove('tt2-airport-open');
    go(next);
    // The original airport controls stay alive in the travel screen, using
    // a bounded inner pane because the document itself no longer scrolls.
    if (raw === 'airport-route-selector') {
      root.classList.add('tt2-airport-open');
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  }, true);
  addEventListener('popstate', () => show(parse(), {force: true}));
  addEventListener('hashchange', () => show(parse(), {force: true}));
  show(parse(), {force: true});
})();
