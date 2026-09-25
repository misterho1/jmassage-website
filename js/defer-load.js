/* After-first-paint consumers for J Massage /book and /pricing (2026-09-25).
   The GoHighLevel chat widget (~215KB) loads on the first tap, scroll or key,
   or 6 s after first paint: the same rule as elitespautah.com defer-load.js.
   The widget id stays literal in the HTML on this file's tag
   (data-chat-widget-id), because tools/chat-widget.py keys on it.
   Motion is not here: gsap, ScrollTrigger, main.js and motion.js stay plain
   defer scripts so the once-per-session intro still covers the first frame.
   Vanilla, no deps. */
(function () {
  'use strict';

  var self = document.currentScript || document.querySelector('script[src*="/js/defer-load.js"]');
  var WIDGET_ID = self && self.getAttribute('data-chat-widget-id');
  if (!WIDGET_ID) return;

  var chatLoaded = false;
  function loadChat() {
    if (chatLoaded) return;
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
    // No interaction yet: load it 6 s after first paint.
    setTimeout(loadChat, 6000);
  }

  if (document.querySelector('script[src*="/js/after-paint.js"]')) {
    (window.__afterPaint = window.__afterPaint || []).push(start);
  } else {
    start();
  }
})();
