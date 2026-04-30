/* ═══════════════════════════════════════════════════════════════════════════
   J MASSAGE SLC — MAIN.JS v3.0
   • Cursor glow tracking
   • Hero clip-path text reveals
   • Smooth parallax hero
   • Intersection Observer scroll animations
   • Number counter animation
   • Service card radial hover glow
   • Mobile nav
   • Reviews carousel (Google Places API + static fallback)
   • Gift card UI with 3D tilt
   • Square booking embed
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── GOOGLE PLACES CONFIG ──────────────────────────────────────────────────
   To show LIVE Google reviews:
   1. Go to console.cloud.google.com → Enable "Places API"
   2. Create API Key → restrict it to jmassageslc.com
   3. Paste key below. Leave empty to use static reviews.
   ────────────────────────────────────────────────────────────────────────── */
const GOOGLE_PLACES_API_KEY = ''; // ← paste key here
const GOOGLE_PLACE_ID = '';       // ← paste Place ID here

/* ─── STATIC REVIEW FALLBACK ────────────────────────────────────────────── */
const STATIC_REVIEWS = [
  {
    initials: 'SM',
    name: 'Sarah M.',
    rating: 5,
    time: '2 weeks ago',
    text: "I've been to nearly every studio in SLC. J Massage isn't just the best — it's in a different category. The therapists are intuitive in a way that's almost unsettling. They found tension I didn't know I had, and I slept better than I had in months. I will not go anywhere else."
  },
  {
    initials: 'RT',
    name: 'Ryan T.',
    rating: 5,
    time: '1 month ago',
    text: "As a competitive athlete, I rely on regular sports massage to stay at peak performance. The team here understands muscle recovery better than anyone in the city. The same-day availability is a total game-changer when I'm beat up after a race. My secret weapon."
  },
  {
    initials: 'JL',
    name: 'Jessica L.',
    rating: 5,
    time: '3 weeks ago',
    text: "My partner and I booked the couples massage for our anniversary. The private suite was absolutely serene — both therapists were perfectly synchronized, like they'd choreographed it. It felt like a $500-a-night resort experience. We're already planning our next visit."
  },
  {
    initials: 'MD',
    name: 'Marcus D.',
    rating: 5,
    time: '2 months ago',
    text: "The Ashiatsu changed my life. I've had chronic lower-back pain for seven years, and this was the first treatment that actually reached the depth I needed. Not just relief — transformation. I've already booked my next four sessions. Don't hesitate. Just go."
  }
];

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initCursorGlow();
  initHeader();
  initHeroReveal();
  initParallax();
  initScrollReveal();
  initCounters();
  initCardGlow();
  initMobileNav();
  initReviews();
  initGiftCards();
  initSmoothScroll();
});

/* ═══════════════════════════════════════════════════════════════════════════
   CURSOR GLOW
   ═══════════════════════════════════════════════════════════════════════════ */
function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) {
    // Remove on touch devices
    if (glow) glow.remove();
    return;
  }

  let mouseX = -500, mouseY = -500;
  let glowX = -500, glowY = -500;
  let raf = null;

  const lerp = (a, b, t) => a + (b - a) * t;

  const update = () => {
    glowX = lerp(glowX, mouseX, 0.08);
    glowY = lerp(glowY, mouseY, 0.08);
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    raf = requestAnimationFrame(update);
  };

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADER — scroll state
   ═══════════════════════════════════════════════════════════════════════════ */
function initHeader() {
  const header = document.getElementById('header');
  const update = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO TEXT REVEAL
   ═══════════════════════════════════════════════════════════════════════════ */
function initHeroReveal() {
  const lines = document.querySelectorAll('.hero__line');
  lines.forEach((line, i) => {
    setTimeout(() => line.classList.add('revealed'), 200 + i * 180);
  });

  const fades = document.querySelectorAll('[data-reveal-fade]');
  fades.forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), 700 + i * 130);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   PARALLAX — hero background
   ═══════════════════════════════════════════════════════════════════════════ */
function initParallax() {
  const parallax = document.querySelector('.hero__parallax');
  if (!parallax || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let raf = null;
  const update = () => {
    const scrolled = window.scrollY;
    if (scrolled < window.innerHeight * 1.5) {
      parallax.style.transform = `translateY(${scrolled * 0.28}px)`;
    }
    raf = null;
  };

  window.addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(update);
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL — Intersection Observer
   ═══════════════════════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal, .reveal-card').forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════════════
   NUMBER COUNTERS — count-up animation
   ═══════════════════════════════════════════════════════════════════════════ */
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-count'), 10);

    // Reduced-motion: snap to target without animating.
    if (reducedMotion) {
      el.textContent = target;
      return;
    }

    // Reset to 0 explicitly so the count-up has a visible starting point;
    // the SSR/no-JS resting state in HTML is the real number, so this only
    // runs after intersection.
    el.textContent = '0';

    const duration = 1600;
    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.floor(easeOut(progress) * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE CARD RADIAL GLOW — follows mouse
   ═══════════════════════════════════════════════════════════════════════════ */
function initCardGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.svc-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--glow-x', x + '%');
      card.style.setProperty('--glow-y', y + '%');
      card.style.setProperty('--before-bg',
        `radial-gradient(circle at ${x}% ${y}%, rgba(200,136,42,0.13) 0%, transparent 65%)`
      );
    });

    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--before-bg');
      card.style.setProperty('--before-bg',
        'radial-gradient(circle at 50% 120%, rgba(200,136,42,0.07) 0%, transparent 65%)'
      );
    });
  });

  // CSS custom property override for ::before
  const style = document.createElement('style');
  style.textContent = `.svc-card::before { background: var(--before-bg, radial-gradient(circle at 50% 120%, rgba(200,136,42,0.07) 0%, transparent 65%)) !important; }`;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE NAV
   ═══════════════════════════════════════════════════════════════════════════ */
function initMobileNav() {
  const burger  = document.getElementById('burger');
  const navList = document.getElementById('navList');
  if (!burger || !navList) return;

  const close = () => {
    navList.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  const open = () => {
    navList.classList.add('open');
    burger.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  burger.addEventListener('click', () => {
    navList.classList.contains('open') ? close() : open();
  });

  navList.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !navList.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SMOOTH SCROLL — offset for sticky header
   ═══════════════════════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = (document.getElementById('header')?.offsetHeight || 72) + 16;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - offset,
        behavior: 'smooth'
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVIEWS CAROUSEL
   ═══════════════════════════════════════════════════════════════════════════ */
function initReviews() {
  const track  = document.getElementById('reviewsTrack');
  const dots   = document.getElementById('carouselDots');
  const prev   = document.getElementById('prevBtn');
  const next   = document.getElementById('nextBtn');
  if (!track) return;

  let current = 0;
  let autoTimer = null;

  const render = (reviews) => {
    track.innerHTML = '';
    dots.innerHTML  = '';

    reviews.forEach((r, i) => {
      const initials = r.initials ||
        r.author_name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?';
      const name   = r.name || r.author_name || 'Verified Guest';
      const time   = r.time || r.relative_time_description || '';
      const text   = r.text || '';
      const rating = r.rating || 5;

      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-card__stars">${'★'.repeat(rating)}</div>
        <p class="review-card__quote">"${text}"</p>
        <div class="review-card__author">
          <div class="review-card__avatar">${initials}</div>
          <div>
            <div class="review-card__name">${name}</div>
            <div class="review-card__date">${time}</div>
          </div>
        </div>
      `;
      track.appendChild(card);

      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Review ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); resetAuto(); });
      dots.appendChild(dot);
    });

    goTo(0, false);
    startAuto();
  };

  const goTo = (idx, animate = true) => {
    const total = track.children.length;
    current = ((idx % total) + total) % total;
    if (!animate) {
      track.style.transition = 'none';
      requestAnimationFrame(() => { track.style.transition = ''; });
    }
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.querySelectorAll('.carousel-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  };

  const startAuto = () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 5500);
  };
  const resetAuto = () => { clearInterval(autoTimer); startAuto(); };

  prev?.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  next?.addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  // Pause on hover
  const carousel = document.getElementById('reviewsCarousel');
  carousel?.addEventListener('mouseenter', () => clearInterval(autoTimer));
  carousel?.addEventListener('mouseleave', startAuto);

  // Touch/swipe
  let touchStartX = 0;
  carousel?.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  carousel?.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1); resetAuto(); }
  });

  // Fetch live or use static
  if (GOOGLE_PLACES_API_KEY && GOOGLE_PLACE_ID) {
    fetchGoogleReviews()
      .then(render)
      .catch(() => render(STATIC_REVIEWS));
  } else {
    render(STATIC_REVIEWS);
  }
}

async function fetchGoogleReviews() {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${GOOGLE_PLACE_ID}&fields=reviews&key=${GOOGLE_PLACES_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!data.result?.reviews?.length) throw new Error('No reviews');
  return data.result.reviews
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6)
    .map(r => ({
      ...r,
      initials: r.author_name.split(' ').map(w => w[0]).join('').slice(0, 2)
    }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   GIFT CARDS
   ═══════════════════════════════════════════════════════════════════════════ */
function initGiftCards() {
  const amtBtns    = document.querySelectorAll('.gift-amt');
  const customAmt  = document.getElementById('customAmt');
  const displayAmt = document.getElementById('giftDisplayAmt');
  const purchaseBtn = document.getElementById('giftPurchaseBtn');
  const mockCard   = document.getElementById('giftMock');

  let selected = 75;

  const updateDisplay = (amount) => {
    selected = amount;
    if (displayAmt) {
      displayAmt.style.transform = 'scale(1.15)';
      displayAmt.textContent = `$${amount}`;
      setTimeout(() => { displayAmt.style.transform = ''; }, 220);
    }
    if (purchaseBtn) {
      purchaseBtn.href = `https://app.squareup.com/gift/1M4AF8BFZT4F8/order?amount=${amount * 100}`;
    }
  };

  amtBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      amtBtns.forEach(b => b.classList.remove('gift-amt--active'));
      btn.classList.add('gift-amt--active');
      if (customAmt) customAmt.value = '';
      updateDisplay(parseInt(btn.dataset.amount, 10));
    });
  });

  customAmt?.addEventListener('input', () => {
    const val = parseInt(customAmt.value, 10);
    if (val >= 10 && val <= 500) {
      amtBtns.forEach(b => b.classList.remove('gift-amt--active'));
      updateDisplay(val);
    }
  });

  // 3D tilt on gift card
  if (mockCard) {
    mockCard.addEventListener('mousemove', e => {
      const rect = mockCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      mockCard.style.transform =
        `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 6}deg) translateZ(12px)`;
    });
    mockCard.addEventListener('mouseleave', () => {
      mockCard.style.transform = '';
    });
  }

  updateDisplay(selected);
}
