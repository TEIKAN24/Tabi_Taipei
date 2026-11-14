/* TABI TAIPEI • screen visibility compatibility v1.2.
 * The original map, events, day-trip and route implementation remains untouched.
 * A hash-view switch changes display:none on existing ancestors, not the native
 * <details> or tab nodes those modules watch. Announce a reflow after reveal.
 */
(() => {
  'use strict';
  let sequence = 0;
  const ready = el => !!el && !!el.getClientRects().length;
  const daytripSection = () => document.querySelector('#guide .sights-day-trips');

  function onViewChange(event) {
    const next = event.detail?.view;
    const previous = event.detail?.previous;
    const token = ++sequence;
    // The legacy route observer resets when nested tabs become hidden, but the
    // new router hides an ancestor using a class. Reset its play-once flag here
    // so the next visit will run the original drawing animation again.
    if (previous === 'day-trips' && next !== 'day-trips') {
      daytripSection()?.querySelectorAll('.daytrip-airport-reuse .timeline').forEach(timeline => {
        timeline.dataset.daytripPlayed = 'false';
        timeline.classList.remove('airsel-timeline-animating');
      });
    }
    // Wait until display and font layouts have settled; suppress stale work
    // if the user changes screens again within the same frame.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== sequence) return;
      if (next === 'city-walk') {
        const map = document.querySelector('.nm-map');
        if (ready(map)) {
          window.dispatchEvent(new Event('ct-resize'));
          window.dispatchEvent(new Event('resize'));
        }
      }
      if (next === 'sights') {
        const calendar = document.getElementById('event-calendar-section');
        if (calendar?.open && ready(calendar)) {
          window.dispatchEvent(new Event('resize'));
        }
      }
      if (next === 'day-trips') {
        // The existing route module already owns visibility and playback; its
        // scroll handler calls scan() and starts any newly visible timeline.
        window.dispatchEvent(new Event('scroll'));
      }
    }));
  }
  document.addEventListener('tt:viewchange', onViewChange);
})();
