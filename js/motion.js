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

      /* Hero choreography — image scale-settle, masked title lines, staged
         eyebrow/sub/actions/meta. All hiding happens here (gsap.from), so
         the no-JS page is fully visible. */
      var hero = document.querySelector('.ed-hero');
      if (hero) {
        var lines = hero.querySelectorAll('.line-inner');
        var img = hero.querySelector('.ed-hero__media img');
        var eyebrow = hero.querySelector('.ed-hero__eyebrow');
        var stagedBits = [
          hero.querySelector('.ed-hero__sub'),
          hero.querySelector('.ed-hero__actions'),
          hero.querySelector('.ed-hero__meta')
        ].filter(Boolean);
        var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
        if (eyebrow) tl.from(eyebrow, { autoAlpha: 0, y: 14, duration: 0.8 }, 0.1);
        if (lines.length) tl.from(lines, { yPercent: 110, duration: 1.1, stagger: 0.14 }, 0.25);
        if (stagedBits.length) tl.from(stagedBits, { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.12 }, 0.8);
      }

      /* Scroll reveals — homepage editorial sections (new attributes only;
         the IO .reveal system on service pages stays untouched). */
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        gsap.from(el, {
          autoAlpha: 0, y: 28, duration: 1.0, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        });
      });
      gsap.utils.toArray('[data-reveal-stagger]').forEach(function (group) {
        gsap.from(group.children, {
          autoAlpha: 0, y: 28, duration: 1.0, ease: 'expo.out', stagger: 0.1,
          scrollTrigger: { trigger: group, start: 'top 84%', once: true }
        });
      });

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
