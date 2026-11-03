/* J Massage SLC: minimal site JS (port of elitespautah.com assets/nav.js)
   Mobile nav toggle, plus Escape and outside-tap close. That's the whole script. */
(function () {
  'use strict';
  var toggle = document.querySelector('.site-nav__menu-toggle');
  var list = document.querySelector('.site-nav__list');
  if (!toggle || !list) return;
  function close() {
    list.classList.remove('site-nav__list--open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    list.classList.toggle('site-nav__list--open');
  });
  // Close menu when a nav link is clicked (mobile)
  list.addEventListener('click', function (e) {
    if (e.target.matches('a')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && list.classList.contains('site-nav__list--open')) { close(); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (list.classList.contains('site-nav__list--open') && !list.contains(e.target) && !toggle.contains(e.target)) close();
  });
})();
