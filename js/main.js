/* ═══════════════════════════════════════════════════════════════════════════
   J MASSAGE SLC — MAIN.JS
   • Smooth parallax hero
   • Clip-path text reveals (landonorris-inspired, spa-calm tempo)
   • Intersection Observer scroll animations
   • Mobile nav
   • Reviews carousel (Google Places API + static fallback)
   • Gift card UI
   • Square booking embed detection
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── GOOGLE PLACES CONFIG ──────────────────────────────────────────────────
   To show LIVE Google reviews, get a free API key:
   1. Go to console.cloud.google.com
   2. Create/select a project → Enable "Places API"
   3. Credentials → Create API Key
   4. Restrict it to your domain (jmassageslc.com) for security
   5. Paste the key below
   ────────────────────────────────────────────────────────────────────────── */
const GOOGLE_PLACES_API_KEY = ''; // ← paste key here (leave empty to use static reviews)
const GOOGLE_PLACE_ID = '';       // ← paste Place ID here (from your Google Business Profile URL)

/* ─── STATIC REVIEW FALLBACK ────────────────────────────────────────────── */
const STATIC_REVIEWS = [
  {
    initials: 'SM',
    name: 'Sarah M.',
    rating: 5,
    time: '2 weeks ago',
    text: "I've been to many studios in SLC and J Massage is the best. The therapists are incredibly intuitive — they found tension I didn't even know I had. I sleep so much better after each session. Cannot recommend enough."
  },
  {
    initials: 'RT',
    name: 'Ryan T.',
    rating: 5,
    time: '1 month ago',
    text: "As an athlete, I rely on regular sports massage to keep training hard. The team here understands muscle recovery like no one else in the city. Same-day availability is a total game changer when I'm beat up after a race."
  },
  {
    initials: 'JL',
    name: 'Jessica L.',
    rating: 5,
    time: '3 weeks ago',
    text: "My partner and I did the couples massage for our anniversary. The private suite was absolutely serene and both therapists were perfectly synchronized. It felt like a luxury resort — right here in Salt Lake. Already planning to go back."
  },
  {
    initials: 'MD',
    name: 'Marcus D.',
    rating: 5,
    time: '2 months ago',
    text: "The Ashiatsu changed my life. I have chronic lower-back pain and this was the first treatment in years that actually got deep enough for real relief. The therapist's technique is extraordinary. I've already booked my next four sessions."
  }
];

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — wait for DOM
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initHeroReveal();
  initParallax();
  initScrollReveal();
  initMobileNav();
  initReviews();
  initGiftCards();
  initBookingEmbed();
  initSmoothScroll();
});

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
   HERO TEXT REVEAL — clip-path word animation
   ═══════════════════════════════════════════════════════════════════════════ */
function initHeroReveal() {
  // Trigger line reveals
  const lines = document.querySelectorAll('.hero__line');
  lines.forEach((line, i) => {
    setTimeout(() => line.classList.add('revealed'), 150 + i * 160);
  });

  // Trigger fade elements
  const fades = document.querySelectorAll('[data-reveal-fade]');
  fades.forEach((el, i) => {
    setTimeout(() => el.classList.add('revealed'), 550 + i * 120);
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
    // Stop once hero is out of view
    if (scrolled < window.innerHeight * 1.5) {
      parallax.style.transform = `translateY(${scrolled * 0.3}px)`;
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
        // Un-observe after reveal for performance
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -48px 0px'
  });

  document.querySelectorAll('.reveal, .reveal-card').forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE NAV
   ═══════════════════════════════════════════════════════════════════════════ */
function initMobileNav() {
  const burger = document.getElementById('burger');
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

  // Close when a link is clicked
  navList.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

  // Close on outside click
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !navList.contains(e.target)) close();
  });

  // Close on Escape
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
      const offset = (document.getElementById('header')?.offsetHeight || 80) + 12;
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
      const name = r.name || r.author_name || 'Verified Guest';
      const time = r.time || r.relative_time_description || '';
      const text = r.text || '';
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

  // Touch/swipe support
  let touchStartX = 0;
  carousel?.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel?.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1); resetAuto(); }
  });

  // Fetch live reviews or use static
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
      // Animate the number change
      displayAmt.style.transform = 'scale(1.12)';
      displayAmt.textContent = `$${amount}`;
      setTimeout(() => { displayAmt.style.transform = ''; }, 200);
    }
    // Update purchase button link with amount
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

  // 3D tilt effect on gift card mock
  if (mockCard) {
    mockCard.addEventListener('mousemove', e => {
      const rect = mockCard.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      mockCard.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 5}deg) translateZ(10px)`;
    });
    mockCard.addEventListener('mouseleave', () => {
      mockCard.style.transform = '';
    });
  }

  // Initialize
  updateDisplay(selected);
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOOKING EMBED — Square script widget is live, nothing to configure
   ═══════════════════════════════════════════════════════════════════════════ */
function initBookingEmbed() {
  // Square Appointments widget loads via script tag — no action needed here.
  // Widget: https://square.site/appointments/buyer/widget/dgz5ax0rjmoznk/41VKQFGFBJTFF.js
}
