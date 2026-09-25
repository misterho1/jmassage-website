/* After-first-paint gate (J Massage copy of elitespautah.com assets/after-paint.js,
   2026-09-25). The Google tag, the chat widget and the /book calendar start only
   once the first frame is on screen. Lighthouse charges every request that
   finishes before first paint to LCP, and headless Chrome can hold that paint
   1-2 s.

   Queue API, same idea as dataLayer. Safe from inline, defer or async code,
   before or after this file runs:
     (window.__afterPaint = window.__afterPaint || []).push(fn);

   The gate opens on the first-contentful-paint entry, which the browser
   delivers after the frame is presented. If no paint is ever reported
   (background tab, no Paint Timing support) it opens 3 s after window load.
   The Google tag loads first. On ad-click URLs (gclid/gbraid/wbraid) the inline
   <head> block has already loaded it at parse, and loadGtag skips.

   With data-gtag="interaction" on this file's <script> tag (used on /book and
   /pricing), the tag waits for the first tap, scroll or key after the gate
   opens, or 5 s, whichever comes first. The dataLayer queue keeps every
   gtag() call, and js/tracking.js keeps working off the inline gtag() stub.
   Vanilla, no deps. */
// Consumers find this file with script[src*="/js/after-paint.js"] (js/defer-load.js, book.html's calendar gate). Update them together if this file is renamed or moved.
(function () {
  'use strict';

  var GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-W8JB6XPYH9';
  var FALLBACK_MS = 3000;
  var TAG_WAIT_MS = 5000;
  var INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'scroll'];

  var pending = window.__afterPaint;
  if (pending && !Array.isArray(pending)) return; // already running on this page
  pending = pending || [];
  window.__afterPaint = pending;

  var self = document.currentScript || document.querySelector('script[src*="/js/after-paint.js"]');
  var tagOnInteraction = !!self && self.getAttribute('data-gtag') === 'interaction';

  var isOpen = false;
  var interacted = false;

  function run(fn) {
    try { fn(); } catch (e) {
      // Keep going with the next callback, but still report the error.
      setTimeout(function () { throw e; }, 0);
    }
  }

  function loadGtag() {
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = GTAG_SRC;
    document.head.appendChild(s);
  }

  function onInteraction() {
    if (interacted) return;
    interacted = true;
    if (isOpen) loadGtag(); // before the gate opens, startTag loads it
  }
  if (tagOnInteraction) {
    INTERACTION_EVENTS.forEach(function (evt) {
      window.addEventListener(evt, onInteraction, { once: true, passive: true });
    });
  }

  function startTag() {
    if (!tagOnInteraction || interacted) { loadGtag(); return; }
    setTimeout(loadGtag, TAG_WAIT_MS);
  }

  function openGate() {
    if (isOpen) return;
    isOpen = true;
    window.__afterPaint = {
      push: function (fn) { setTimeout(function () { run(fn); }, 0); }
    };
    run(startTag);
    for (var i = 0; i < pending.length; i++) run(pending[i]);
    pending.length = 0;
  }

  function armFallback() { setTimeout(openGate, FALLBACK_MS); }
  if (document.readyState === 'complete') armFallback();
  else window.addEventListener('load', armFallback);

  var types = window.PerformanceObserver && PerformanceObserver.supportedEntryTypes;
  if (types && types.indexOf('paint') !== -1) {
    try {
      var po = new PerformanceObserver(function (list) {
        if (list.getEntriesByName('first-contentful-paint').length) {
          po.disconnect();
          openGate();
        }
      });
      po.observe({ type: 'paint', buffered: true });
    } catch (e) { /* the load fallback above still opens the gate */ }
  }
})();
