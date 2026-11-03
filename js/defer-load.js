/* Defer heavy, non-critical scripts until after first paint (same rules as elitespautah.com assets/defer-load.js).
   The page is fully visible and usable without any of these:
   - Motion (GSAP + ScrollTrigger + motion.js, ~116KB) only adds reveal/parallax
     animation, so it loads on the first idle moment after first paint.
   - The GoHighLevel chat widget (~215KB) loads on the first tap, scroll or key,
     or 6 s after first paint.
   The widget id stays literal in the HTML on this file's tag
   (data-chat-widget-id), because tools/chat-widget.py keys on it.
   First paint comes from the gate in /js/after-paint.js. A page without
   the gate starts this work at once.
   Vanilla, no deps. */
(function () {
  'use strict';

  var self = document.currentScript || document.querySelector('script[src*="/js/defer-load.js"]');
  var WIDGET_ID = self && self.getAttribute('data-chat-widget-id');

  var motionLoaded = false;
  function loadMotion() {
    if (motionLoaded) return;
    motionLoaded = true;
    var srcs = [
      '/js/vendor/gsap.min.js?v=1',
      '/js/vendor/ScrollTrigger.min.js?v=1',
      '/js/motion.js?v=4'
    ];
    srcs.forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false; // preserve execution order so motion.js sees gsap
      document.head.appendChild(s);
    });
  }

  var chatLoaded = false;
  function loadChat() {
    if (chatLoaded || !WIDGET_ID) return;
    chatLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://widgets.leadconnectorhq.com/loader.js';
    s.setAttribute('data-resources-url', 'https://widgets.leadconnectorhq.com/chat-widget/loader.js');
    s.setAttribute('data-widget-id', WIDGET_ID);
    s.setAttribute('data-source', 'WEB_USER');
    document.body.appendChild(s);
  }

  // Chat: first interaction loads it right away.
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (evt) {
    window.addEventListener(evt, loadChat, { once: true, passive: true });
  });

  function start() {
    // Motion: first idle moment (short fallback for browsers without rIC).
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadMotion, { timeout: 2000 });
    } else {
      setTimeout(loadMotion, 200);
    }
    // Chat: no interaction yet, so load it 6 s later.
    setTimeout(loadChat, 6000);
  }

  if (document.querySelector('script[src*="/js/after-paint.js"]')) {
    (window.__afterPaint = window.__afterPaint || []).push(start);
  } else {
    start();
  }
})();
