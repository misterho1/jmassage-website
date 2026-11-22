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

/* Thanksgiving hours card (Andrew, 2026-11-21). Shows on every page that loads this file until
   midnight Mountain time on Nov 27; after that this block does nothing. "Got it", the X or Esc
   hides it for good (localStorage "holiday-2026-11"); if storage is blocked it still shows.
   It sits above the fixed things at the bottom (Book/Call bar, cart bar, GHL chat button and
   greeting) and, when it first shows, above any Book or Call button it would cover.
   Safe to delete after Thanksgiving. */
(function () {
  'use strict';
  if (Date.now() >= Date.parse('2026-11-27T00:00:00-07:00')) return;
  var KEY = 'holiday-2026-11';
  try { if (localStorage.getItem(KEY)) return; } catch (e) { /* blocked storage: show the card */ }

  var LINES = ['Wednesday, Nov 25: 10am to 8pm', 'Thursday, Nov 26: Closed'];
  var GAP = 12;
  var style = document.createElement('style');
  style.textContent = [
    '.hh{position:fixed;left:16px;right:16px;bottom:0;z-index:950;pointer-events:none;transform:translateY(-90px)}',
    '@media (min-width:641px){.hh{left:auto;right:20px;width:360px;max-width:calc(100vw - 40px)}}',
    '.hh--live{transition:transform .3s ease}',
    'body:has(.site-nav__list--open) .hh{visibility:hidden}',
    '.hh__card{position:relative;pointer-events:auto;box-sizing:border-box;padding:14px 16px 16px 18px;border:1px solid var(--line-strong,rgba(42,38,34,.2));border-radius:var(--radius-md,10px);background:var(--surface,#fffdfb);color:var(--ink,#2a2622);box-shadow:0 12px 32px -8px rgba(20,12,4,.35);animation:hh-in .45s ease-out both}',
    '@keyframes hh-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '.hh__title{margin:0;padding-right:36px;font-family:var(--type-display,Georgia,serif);font-size:1.25rem;font-weight:400;line-height:1.3}',
    '.hh__row{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:8px 12px;margin-top:6px}',
    '.hh__line{margin:0;font-family:var(--type-ui,system-ui,sans-serif);font-size:.9375rem;line-height:1.5;color:var(--ink-muted,#5b544c)}',
    '.hh__ok{flex:0 0 auto;margin-left:auto;min-height:44px;padding:0 18px;border:0;border-radius:var(--radius-sm,4px);background:var(--ink,#2a2622);color:var(--brand-cream,#faf7f3);font-family:var(--type-ui,system-ui,sans-serif);font-size:.875rem;font-weight:600;cursor:pointer}',
    '.hh__ok:hover{background:var(--ink-deep,#1f1a16)}',
    '.hh__x{position:absolute;top:4px;right:4px;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--ink-muted,#5b544c);cursor:pointer}',
    '.hh__x:hover{background:var(--brand-cream-soft,#f5f0e8)}',
    '.hh__x::before,.hh__x::after{content:"";position:absolute;left:50%;top:50%;width:16px;margin:-1px 0 0 -8px;border-top:2px solid currentColor;transform:rotate(45deg)}',
    '.hh__x::after{transform:rotate(-45deg)}',
    '.hh button:focus-visible{outline:2px solid var(--brand-orange,#a04d2c);outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){.hh__card{animation:none}.hh--live{transition:none}}',
    '@media print{.hh{display:none}}'
  ].join('\n');
  document.head.appendChild(style);

  // The live region exists before its text arrives, so screen readers announce the text.
  var box = document.createElement('div');
  box.className = 'hh';
  box.setAttribute('role', 'status');
  document.body.appendChild(box);

  var floor = 0, timer = 0, resizing = 0;

  function shown(r) { return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight; }
  function sameColumns(r, c) { return r.left < c.right && r.right > c.left; }
  function headerBottom() {
    var h = document.querySelector('.site-header');
    return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0;
  }
  function cardAt(b) { // where the card would be with this bottom offset
    var r = box.getBoundingClientRect(), vh = window.innerHeight;
    return { left: r.left, right: r.right, top: vh - b - r.height, bottom: vh - b, height: r.height };
  }

  // Bottom offset that clears every fixed thing under the card. The GHL chat button
  // (58 px, 20 px from the corner) is reserved before it loads, so the card does not jump.
  function clearBars() {
    var vh = window.innerHeight, vw = window.innerWidth, c = cardAt(0), b = 16;
    var rects = [{ left: vw - 78, right: vw - 20, top: vh - 78, bottom: vh - 20, width: 58, height: 58 }];
    [].forEach.call(document.querySelectorAll('.m-cta, .combo-sticky-cta, .cart__bar'), function (el) { rects.push(el.getBoundingClientRect()); });
    var chat = document.querySelector('chat-widget');
    if (chat && chat.shadowRoot) {
      [].forEach.call(chat.shadowRoot.querySelectorAll('*'), function (el) {
        if (getComputedStyle(el).position === 'fixed') rects.push(el.getBoundingClientRect());
      });
    }
    rects.forEach(function (r) {
      // Only low things count: an open chat window covers the page and the card stays behind it.
      if (shown(r) && r.top > vh / 3 && sameColumns(r, c)) b = Math.max(b, vh - r.top + GAP);
    });
    return b;
  }

  // Raise the card above any Book or Call button it would cover right now, if there is room.
  function clearButtons(b) {
    var vh = window.innerHeight, limit = headerBottom() + 8, start = b;
    for (var i = 0; i < 6; i++) {
      var c = cardAt(b), need = 0;
      [].forEach.call(document.querySelectorAll('a[href^="tel:"], a[href*="/book"], .btn, button'), function (el) {
        if (box.contains(el) || el.closest('.site-header, .m-cta, .combo-sticky-cta, .cart__bar')) return;
        var r = el.getBoundingClientRect();
        if (shown(r) && sameColumns(r, c) && r.top < c.bottom && r.bottom > c.top) need = Math.max(need, vh - r.top + GAP);
      });
      if (!need) return b;
      if (vh - need - c.height < limit) return start;
      b = need;
    }
    return b;
  }

  function place(first) {
    var b = Math.max(clearBars(), floor);
    if (first) b = floor = clearButtons(b);
    if (window.innerHeight - b - box.getBoundingClientRect().height < headerBottom()) return; // no room: stay put
    box.style.transform = 'translateY(' + -b + 'px)'; // a transform, so a move is never a layout shift
  }

  function onResize() {
    cancelAnimationFrame(resizing);
    resizing = requestAnimationFrame(function () { floor = 0; place(true); });
  }

  function onKey(e) {
    if (e.key !== 'Escape' || !box.contains(document.activeElement)) return;
    if (document.querySelector('.site-nav__list--open, .cart-lock')) return; // Esc closes the open menu or cart first
    dismiss();
  }

  function dismiss() {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* hides for this page view only */ }
    clearInterval(timer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey, true);
    if (box.parentNode) box.parentNode.removeChild(box);
    if (style.parentNode) style.parentNode.removeChild(style);
  }

  function show() {
    var card = document.createElement('div');
    card.className = 'hh__card';
    var title = document.createElement('p');
    title.className = 'hh__title';
    title.textContent = 'Thanksgiving hours';
    var row = document.createElement('div');
    row.className = 'hh__row';
    var lines = document.createElement('div');
    LINES.forEach(function (t) {
      var p = document.createElement('p');
      p.className = 'hh__line';
      p.textContent = t;
      lines.appendChild(p);
    });
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'hh__ok';
    ok.textContent = 'Got it';
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'hh__x';
    x.setAttribute('aria-label', 'Close');
    ok.addEventListener('click', dismiss);
    x.addEventListener('click', dismiss);
    row.appendChild(lines);
    row.appendChild(ok);
    card.appendChild(title);
    card.appendChild(row);
    card.appendChild(x);
    box.appendChild(card);
    place(true);
    requestAnimationFrame(function () { box.classList.add('hh--live'); });
    timer = setInterval(place, 1500); // the chat button, its greeting and the cart bar come and go
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey, true);
  }

  function start() { setTimeout(show, 1000); }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();
