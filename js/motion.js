/* J Massage motion layer — GSAP 3.13 + ScrollTrigger + Lenis.
   Layered over the existing vanilla systems (carousel, counters, IO reveals,
   cursor glow stay untouched). main.js skips its hero fallback when this runs.
   Fail-safe: no GSAP = vanilla behavior; no JS = fully visible static page.
   Cinematic layer (2026-07): Lenis smooth scroll, loading-reveal intro,
   ambient video hero, live scroll-progress counter, pinned philosophy scrub.
   The heavy layer runs desktop + motionOK only — mobile and reduced-motion
   pay zero bytes and see the static editorial page. */
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

      /* Cinematic tiers (2026-07 mobile pass): scrub scenes, pins, the intro
         and the progress counter run on ALL motion-OK devices — they are
         transform/opacity-only and cost no extra bytes. Pointer-driven extras
         (Lenis, parallax, magnetic) stay desktop; phones attach the hero
         video after load, on decent connections only, so LCP is untouched. */
      var cinematic = true;
      var heavy = isDesktop;
      if (!isDesktop) ScrollTrigger.normalizeScroll(true);

      /* ── Lenis smooth scroll (cinematic) ──────────────────────────────
         Drives window scroll through GSAP's ticker; ScrollTrigger stays in
         sync via lenis.on('scroll'). main.js routes #anchor clicks through
         window.__lenis so the two never fight. */
      var lenis = null;
      if (heavy && window.Lenis) {
        lenis = new Lenis({ duration: 1.15, smoothWheel: true });
        window.__lenis = lenis;
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      }

      /* ── Loading-reveal intro (cinematic, once per session) ─────────── */
      var introDelay = 0;
      var playIntro = false;
      if (cinematic) {
        try {
          playIntro = !sessionStorage.getItem('jm-intro');
          if (playIntro) sessionStorage.setItem('jm-intro', '1');
        } catch (e) { /* private mode — skip intro rather than replay forever */ }
      }
      if (playIntro) {
        introDelay = 1.05;
        var intro = document.createElement('div');
        intro.className = 'cine-intro';
        intro.setAttribute('aria-hidden', 'true');
        intro.innerHTML =
          '<div class="cine-intro__mark"><span class="cine-intro__j">J</span>' +
          '<span class="cine-intro__word">Massage <em>SLC</em></span></div>' +
          '<div class="cine-intro__line"></div>';
        document.body.appendChild(intro);
        document.documentElement.classList.add('cine-lock');
        gsap.timeline({
          onComplete: function () {
            intro.remove();
            document.documentElement.classList.remove('cine-lock');
          }
        })
          .from(intro.querySelector('.cine-intro__j'), { yPercent: 130, duration: 0.7, ease: 'expo.out' }, 0.1)
          .from(intro.querySelector('.cine-intro__word'), { autoAlpha: 0, x: 16, duration: 0.6, ease: 'expo.out' }, 0.35)
          .fromTo(intro.querySelector('.cine-intro__line'), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, 0.3)
          .to(intro, { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, 1.15);
      }

      /* Hero choreography — media scale-settle, masked title lines, staged
         eyebrow/sub/actions/meta. All hiding happens here (gsap.from), so
         the no-JS page is fully visible. Settle now targets the media
         CONTAINER so the still image and the ambient video move as one. */
      var hero = document.querySelector('.ed-hero');
      if (hero) {
        var lines = hero.querySelectorAll('.line-inner');
        var media = hero.querySelector('.ed-hero__media');
        var eyebrow = hero.querySelector('.ed-hero__eyebrow');
        var stagedBits = [
          hero.querySelector('.ed-hero__sub'),
          hero.querySelector('.ed-hero__actions'),
          hero.querySelector('.ed-hero__meta')
        ].filter(Boolean);
        var tl = gsap.timeline({ delay: introDelay, defaults: { ease: 'expo.out' } });
        if (media) tl.fromTo(media, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0);
        if (eyebrow) tl.from(eyebrow, { autoAlpha: 0, y: 14, duration: 0.8 }, 0.1);
        if (lines.length) tl.from(lines, { yPercent: 110, duration: 1.1, stagger: 0.14 }, 0.25);
        if (stagedBits.length) tl.from(stagedBits, { autoAlpha: 0, y: 18, duration: 0.9, stagger: 0.12 }, 0.8);

        /* Ambient video hero (cinematic) — src attaches only now, so mobile
           and reduced-motion never download a byte. The still and the clip
           are two different scenes (portrait → room), so the crossfade is
           gated behind the load choreography: it always lands as the hero's
           deliberate second beat, never at a random network moment. */
        var vid = hero.querySelector('.ed-hero__video');
        if (cinematic && vid && vid.dataset.src && !vid.getAttribute('src')) {
          var vidCanPlay = false;
          var vidTimeUp = false;
          var tryFadeIn = function () {
            if (!vidCanPlay || !vidTimeUp) return;
            var p = vid.play();
            if (p && p.then) {
              p.then(function () {
                gsap.to(vid, { autoAlpha: 1, duration: 2.0, ease: 'power2.inOut' });
              }).catch(function () { /* autoplay refused — still image stays */ });
            }
          };
          gsap.delayedCall(introDelay + 2.2, function () { vidTimeUp = true; tryFadeIn(); });
          vid.addEventListener('canplaythrough', function once() {
            vid.removeEventListener('canplaythrough', once);
            vidCanPlay = true;
            tryFadeIn();
          });
          /* Attach: desktop right away; mobile only after the page has fully
             loaded (poster stays the LCP) and never on save-data/slow nets. */
          var conn = navigator.connection || {};
          var okNet = !conn.saveData && !/(slow-2g|2g|3g)/.test(conn.effectiveType || '');
          /* Portrait screens get the 9:16 cut when one is declared —
             matches the portrait poster/still so the crossfade holds. */
          var heroPortrait = window.matchMedia('(orientation: portrait)').matches;
          var attachVid = function () {
            vid.src = (heroPortrait && vid.dataset.srcPortrait) ? vid.dataset.srcPortrait : vid.dataset.src;
            vid.load();
          };
          if (isDesktop) {
            attachVid();
          } else if (okNet) {
            if (document.readyState === 'complete') gsap.delayedCall(2.0, attachVid);
            else window.addEventListener('load', function () { gsap.delayedCall(2.0, attachVid); });
          }
          ScrollTrigger.create({
            trigger: hero,
            start: 'top bottom',
            end: 'bottom top',
            onLeave: function () { vid.pause(); },
            onEnterBack: function () { var p = vid.play(); if (p && p.catch) p.catch(function () {}); }
          });
        }

        /* Hero exit — content lifts away and media drifts on scrub, so the
           scroll out of the hero feels like a scene change, not a cut. */
        var heroContent = hero.querySelector('.ed-hero__content');
        var exitTl = gsap.timeline({
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
        });
        if (heroContent) exitTl.to(heroContent, { yPercent: -16, autoAlpha: 0, ease: 'none' }, 0);
        if (media) exitTl.to(media, { yPercent: 7, ease: 'none' }, 0);
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

      /* ── Philosophy quote + session band ride the standard [data-reveal]
         fades. The pinned scroll-scrub versions were retired 2026-08-27:
         simpler Elite-style sections, no scroll hijack. ── */

      /* ── Live scroll-progress counter (cinematic) — climbs 000 → 100. ── */
      if (cinematic) {
        var prog = document.createElement('div');
        prog.className = 'cine-progress';
        prog.setAttribute('aria-hidden', 'true');
        prog.innerHTML = '<span class="cine-progress__num">000</span>';
        document.body.appendChild(prog);
        var num = prog.querySelector('.cine-progress__num');
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: function (self) {
            var v = Math.round(self.progress * 100);
            num.textContent = (v < 10 ? '00' : v < 100 ? '0' : '') + v;
          }
        });
      }

      /* matchMedia cleanup — registered for BOTH tiers: hand scrolling back
         to the browser if conditions flip (resize, RM toggle). */
      var cleanup = function () {
        if (!isDesktop) ScrollTrigger.normalizeScroll(false);
        if (lenis) {
          lenis.destroy();
          if (window.__lenis === lenis) window.__lenis = null;
        }
      };

      /* ── Ambient video layers (playbook pass) — couples band + final CTA.
         Same attach policy as the hero: desktop now, phones post-load on
         decent connections; fade in on canplaythrough; pause offscreen. ── */
      var ambConn = navigator.connection || {};
      var ambOkNet = !ambConn.saveData && !/(slow-2g|2g|3g)/.test(ambConn.effectiveType || '');
      gsap.utils.toArray('.ed-ambient-video').forEach(function (av) {
        if (!av.dataset.src || av.getAttribute('src')) return;
        av.addEventListener('canplaythrough', function once() {
          av.removeEventListener('canplaythrough', once);
          var p = av.play();
          if (p && p.then) {
            p.then(function () {
              gsap.to(av, { autoAlpha: 1, duration: 1.6, ease: 'power2.inOut' });
            }).catch(function () {});
          }
        });
        var avPortrait = window.matchMedia('(orientation: portrait)').matches;
        var attach = function () {
          av.src = (avPortrait && av.dataset.srcPortrait) ? av.dataset.srcPortrait : av.dataset.src;
          av.load();
        };
        if (isDesktop) attach();
        else if (ambOkNet) {
          if (document.readyState === 'complete') gsap.delayedCall(2.5, attach);
          else window.addEventListener('load', function () { gsap.delayedCall(2.5, attach); });
        }
        ScrollTrigger.create({
          trigger: av.closest('section') || av,
          start: 'top bottom',
          end: 'bottom top',
          onLeave: function () { av.pause(); },
          onEnter: function () { var p = av.play(); if (p && p.catch) p.catch(function () {}); },
          onEnterBack: function () { var p = av.play(); if (p && p.catch) p.catch(function () {}); }
        });
      });

      /* ── Film grain — static texture overlay, JS-injected (no-JS safe). ── */
      if (!document.querySelector('.cine-grain')) {
        var grain = document.createElement('div');
        grain.className = 'cine-grain';
        grain.setAttribute('aria-hidden', 'true');
        document.body.appendChild(grain);
      }

      /* ── Masked title reveals — section titles wipe up from their baseline
         on entry. clip-path only, so HTML inside titles (<em>, <br>) is safe. ── */
      gsap.utils.toArray('.ed-section-title').forEach(function (t) {
        gsap.fromTo(t,
          { clipPath: 'inset(0 0 100% 0)', y: 24 },
          {
            clipPath: 'inset(0 0 -8% 0)', y: 0, duration: 1.1, ease: 'expo.out',
            scrollTrigger: { trigger: t, start: 'top 88%', once: true }
          });
      });

      if (!isDesktop) return cleanup;

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

      return cleanup;
    }
  );

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
