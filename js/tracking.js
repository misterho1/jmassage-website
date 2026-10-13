/* J Massage SLC — conversion event tracking (GA4 G-W8JB6XPYH9 / Ads AW-18046916928)
   Site-wide micro-conversions. The PRIMARY booking conversion fires on /thank-you
   (the GHL calendar redirects there on a completed booking).
   Safe: no-ops if gtag isn't present. */
(function () {
  if (typeof window.gtag !== 'function') return;
  var GA = 'G-W8JB6XPYH9';

  // Same-origin link to the booking page. pathname drops the ?query and #hash, so
  // /book, /book?service=couples and https://jmassageslc.com/book all match. Bare
  // #fragment links stay on the current page (the /book skip link), so they don't.
  function isBookLink(a) {
    return a.getAttribute('href').charAt(0) !== '#' &&
      a.origin === location.origin && /^\/book(?:\.html|\/)?$/.test(a.pathname);
  }

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

    // Booking intent (Book Now CTA / links to /book) — soft micro-conversion.
    // One emit site, so a .nav__cta that also links to /book fires once.
    var link = t.closest('a[href]');
    if (t.closest('.nav__cta') || (link && isBookLink(link))) {
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
