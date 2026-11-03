/* Ambient hero video — progressive enhancement over the hero photo.
   The <img> underneath stays the LCP element and the only thing reduced-motion
   or Save-Data visitors ever see. The video lazy-attaches after first paint
   and the window load event (never competing with LCP), picks the portrait cut on
   narrow viewports, cross-fades in once it can play, and pauses offscreen.
   Vanilla, no deps. Matches nav.js / defer-load.js style. */
(function () {
  'use strict';

  var vids = document.querySelectorAll('video[data-src]');
  if (!vids.length) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var conn = navigator.connection || {};
  if (reduced.matches || conn.saveData) return;

  function attach(v) {
    var src = v.getAttribute('data-src');
    var portrait = v.getAttribute('data-src-portrait');
    if (portrait && window.matchMedia('(max-width: 799px)').matches) {
      src = portrait;
    }
    v.muted = true; /* belt-and-suspenders for autoplay policies */
    v.src = src;
    v.addEventListener('canplay', function () {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
      v.classList.add('is-playing');
    }, { once: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!v.src) return;
          if (e.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.1 }).observe(v);
    }
  }

  function init() {
    for (var i = 0; i < vids.length; i++) attach(vids[i]);
  }
  function initAfterLoad() {
    if (document.readyState === 'complete') {
      setTimeout(init, 60);
    } else {
      window.addEventListener('load', function () { setTimeout(init, 60); });
    }
  }
  /* After first paint AND load: with the gate (assets/after-paint.js) the clip
     never lands before the photo is on screen, even when the browser holds the
     first paint past the load event. Pages without the gate keep load + 60 ms. */
  if (document.querySelector('script[src*="/js/after-paint.js"]')) {
    (window.__afterPaint = window.__afterPaint || []).push(initAfterLoad);
  } else {
    initAfterLoad();
  }

  /* If the user flips on reduced motion mid-session, settle back to the photo. */
  if (reduced.addEventListener) {
    reduced.addEventListener('change', function (e) {
      if (!e.matches) return;
      for (var i = 0; i < vids.length; i++) {
        vids[i].pause();
        vids[i].classList.remove('is-playing');
      }
    });
  }
})();
