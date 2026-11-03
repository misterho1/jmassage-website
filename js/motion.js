/* J Massage SLC motion system (port of elitespautah.com assets/motion.js): GSAP 3.13 + ScrollTrigger.
   Fail-safe: the page is fully visible without JS. Every hidden/offset
   initial state is created here (gsap.from/gsap.set), never in CSS. */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var EASE = 'expo.out';

  /* Header scroll state — style state, runs regardless of motion preference. */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('site-header--scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var mm = gsap.matchMedia();

  mm.add(
    {
      motionOK: '(prefers-reduced-motion: no-preference)',
      isDesktop: '(min-width: 800px) and (pointer: fine)'
    },
    function (context) {
      var motionOK = context.conditions.motionOK;
      var isDesktop = context.conditions.isDesktop;
      if (!motionOK) return;

      /* Hero content is above the fold, and motion.js loads deferred (after
         first paint). Hiding it here would blink/blank it in while the script
         loads, so the hero is left visible; only below-the-fold content
         animates on scroll (see the reveal loops below). */

      /* Scroll reveals — once, never re-trigger. */
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        /* Already in the viewport when the (deferred) script loads -> leave it
           visible so it never blanks; only animate what scrolls into view. */
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        gsap.from(el, {
          autoAlpha: 0, y: 28, duration: 1.0, ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
      });
      gsap.utils.toArray('[data-reveal-stagger]').forEach(function (group) {
        if (group.getBoundingClientRect().top < window.innerHeight) return;
        /* Cards carry a CSS transform transition (the hover lift). Left on, it fights GSAP's inline
           transform and the cards finish 28px low, overlapping what follows. Off for the reveal; when it
           ends, transform and transition go back to the stylesheet. */
        gsap.set(group.children, { transition: 'none' });
        gsap.from(group.children, {
          autoAlpha: 0, y: 28, duration: 1.0, ease: EASE, stagger: 0.1,
          clearProps: 'transform,transition',
          scrollTrigger: { trigger: group, start: 'top 84%', once: true }
        });
      });

      /* Count-up numerals. */
      gsap.utils.toArray('[data-count]').forEach(function (el) {
        var target = parseFloat(el.getAttribute('data-count'));
        if (isNaN(target)) return;
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: function () { el.textContent = Math.round(obj.v); }
        });
      });

      /* FAQ smooth accordion — progressive enhancement over <details>. */
      gsap.utils.toArray('details.faq__item').forEach(function (d) {
        var summary = d.querySelector('summary');
        var body = d.querySelector('.faq__answer');
        // This block reruns whenever the media query flips (crossing 800px); bind once or one click opens and closes.
        if (!summary || !body || d.hasAttribute('data-faq-bound')) return;
        d.setAttribute('data-faq-bound', '');
        summary.addEventListener('click', function (e) {
          e.preventDefault();
          if (d.open) {
            gsap.to(body, {
              height: 0, autoAlpha: 0, duration: 0.4, ease: EASE,
              onComplete: function () { d.open = false; gsap.set(body, { clearProps: 'all' }); }
            });
          } else {
            d.open = true;
            gsap.from(body, {
              height: 0, autoAlpha: 0, duration: 0.55, ease: EASE,
              onComplete: function () { gsap.set(body, { clearProps: 'all' }); }
            });
          }
        });
      });

      if (!isDesktop) return;

      /* Hero parallax — image drifts as the page scrolls away. */
      var media = document.querySelector('[data-hero-media]');
      if (media) {
        gsap.to(media, {
          yPercent: 12, ease: 'none',
          scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true }
        });
      }

      /* Generic parallax. */
      gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        var amt = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        gsap.to(el, {
          yPercent: -100 * amt, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* Magnetic buttons. */
      document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
        btn.classList.add('btn-magnetic');
        var qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
        var qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
        btn.addEventListener('mousemove', function (e) {
          var r = btn.getBoundingClientRect();
          qx((e.clientX - r.left - r.width / 2) * 0.25);
          qy((e.clientY - r.top - r.height / 2) * 0.25);
        });
        btn.addEventListener('mouseleave', function () { qx(0); qy(0); });
      });
    }
  );

  /* ScrollTrigger positions depend on web-font metrics. */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
