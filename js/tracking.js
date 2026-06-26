/* J Massage SLC — conversion event tracking (GA4 G-HR9MP6ENEP / Ads AW-18046916928)
   Site-wide micro-conversions. The PRIMARY booking conversion fires on /thank-you
   (the GHL calendar redirects there on a completed booking).
   Safe: no-ops if gtag isn't present. */
(function () {
  if (typeof window.gtag !== 'function') return;
  var GA = 'G-HR9MP6ENEP';

  // Phone clicks (any tel: link)
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var tel = t.closest('a[href^="tel:"]');
    if (tel) {
      gtag('event', 'phone_click', {
        send_to: GA,
        phone_number: tel.getAttribute('href').replace('tel:', '')
      });
      return;
    }

    // Booking intent (Book Now CTA / links to /book) — soft micro-conversion
    var book = t.closest('a[href$="/book"], a[href="/book"], a[href="book.html"], a[href$="/book.html"], .nav__cta');
    if (book) {
      gtag('event', 'begin_checkout', { send_to: GA, item_category: 'booking' });
    }
  }, true);

  // Contact / lead form submit
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.tagName === 'FORM') {
      gtag('event', 'generate_lead', { send_to: GA, method: 'contact_form' });
    }
  }, true);
})();
