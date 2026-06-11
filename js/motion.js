/* J Massage motion layer — GSAP 3.13 + ScrollTrigger.
   Layered over the existing vanilla systems (carousel, counters, IO reveals,
   cursor glow stay untouched). main.js skips its hero fallback when this runs.
   Fail-safe: no GSAP = vanilla behavior; no JS = fully visible static page. */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();

  mm.add(
    {
      motionOK: '(prefers-reduced-motion: no-preference)',
      isDesktop: '(min-width: 820px) and (pointer: fine)'
    },
    function (context) {
      var motionOK = context.conditions.motionOK;
      var isDesktop = context.conditions.isDesktop;
      if (!motionOK) return;

      /* Hero choreography — same visual language as the vanilla reveal,
         tighter rhythm, plus the image scale-settle. */
      var hero = document.querySelector('.ed-hero');
      if (hero) {
        hero.classList.add('gsap-driven');
        var lines = hero.querySelectorAll('.hero__line > span');
        var fades = hero.querySelectorAll('[data-reveal-fade]');
        var img = hero.querySelector('.ed-hero__media img');
        var tl = gsap.timeline({
          defaults: { ease: 'expo.out' },
          onComplete: function () {
            hero.querySelectorAll('.hero__line').forEach(function (l) { l.classList.add('revealed'); });
            fades.forEach(function (f) { f.classList.add('revealed'); });
            gsap.set(lines, { clearProps: 'all' });
            gsap.set(fades, { clearProps: 'all' });
          }
        });
        if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
        if (lines.length) tl.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.14 }, 0.15);
        if (fades.length) tl.fromTo(fades, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.6);
      }

      if (!isDesktop) return;

      /* Editorial image parallax — scoped to the new attribute only,
         never the existing .reveal system. */
      gsap.utils.toArray('[data-parallax]').forEach(function (el) {
        var amt = parseFloat(el.getAttribute('data-parallax')) || 0.06;
        gsap.to(el, {
          yPercent: -100 * amt, ease: 'none',
          scrollTrigger: {
            trigger: el.closest('picture') ? el.closest('picture').parentElement : el.parentElement,
            start: 'top bottom', end: 'bottom top', scrub: true
          }
        });
      });

      /* Magnetic CTAs. */
      document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
        var qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
        var qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
        btn.addEventListener('mousemove', function (e) {
          var r = btn.getBoundingClientRect();
          qx((e.clientX - r.left - r.width / 2) * 0.22);
          qy((e.clientY - r.top - r.height / 2) * 0.22);
        });
        btn.addEventListener('mouseleave', function () { qx(0); qy(0); });
      });
    }
  );

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
