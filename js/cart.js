/* Online cart: several massages, one time for the group, one card payment.
   Talks to the spa-phone-booking Worker (GET /api/cart/menu, GET /api/cart/times,
   POST /api/cart/checkout, GET /api/cart/order/:id). Every price and total comes from
   the Worker. Card numbers never touch this page: Pay opens Authorize.Net's hosted
   card form (AcceptUI), loaded on the first Pay tap.

   <section id="cart" data-spa="elite" data-api="https://..." hidden> — while the section
   is hidden the page makes no cart request at all, unless a staff preview link
   (#cartpreview=) opened it. Shared with jmassageslc.com (same file, own CSS).
   Vanilla, no deps. Matches nav.js / defer-load.js. */
(function () {
  'use strict';

  var root = document.getElementById('cart');
  if (!root) return;
  var API = root.getAttribute('data-api');
  var SPA = root.getAttribute('data-spa');
  var TZ = 'America/Denver';
  // Per-site look: each site's button classes and its copy of cart.css.
  var BTN = root.getAttribute('data-btn') || 'btn btn--primary';
  var BTN2 = root.getAttribute('data-btn-secondary') || 'btn btn--secondary';
  var CSS = root.getAttribute('data-css') || '/assets/cart.css?v=1';

  // Staff preview token: the page's inline loader takes it from #cartpreview= and strips it from
  // the address bar before analytics loads (never in the query string or a referrer).
  var preview = window.__cartPreview || null;
  try { preview = preview || sessionStorage.getItem('cartpreview'); } catch (e) {}
  if (root.hidden && !preview) return; // staff-only for now: nothing to load for guests

  var menu = null, lines = [], times = [], start = '', total = null, pass = '';
  var busy = false, ts = null, timesSeq = 0; // timesSeq: only the newest times request may update the page

  // ---------- helpers ----------
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'on') for (var ev in attrs.on) n.addEventListener(ev, attrs.on[ev]);
      else if (attrs[k] === true) n.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); }
  function denverDate(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d); }
  function timeLabel(iso) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }); }
  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (preview) headers['X-Cart-Preview'] = preview;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false }; }).then(function (j) { j.status = r.status; return j; });
      });
  }
  function kindOf(k) { for (var i = 0; i < menu.kinds.length; i++) if (menu.kinds[i].kind === k) return menu.kinds[i]; return null; }
  function guestCount() { return lines.reduce(function (s, l) { return s + l.guests.length; }, 0); }

  // ---------- cart state ----------
  function newGuest(kind, format) {
    var k = kindOf(kind), g = { addons: [] };
    if (k.picks) g.picks = ['headspa', 'massage'];
    if (k.styles && (!format || format === 'massage')) g.style = k.styles[0];
    return g;
  }
  function newLine(kind) {
    var k = kindOf(kind || menu.kinds[0].kind);
    var line = { kind: k.kind, minutes: k.minutes[0], format: k.formats ? 'massage' : undefined, guests: [] };
    for (var i = 0; i < k.guests.min; i++) line.guests.push(newGuest(k.kind, line.format));
    return line;
  }
  function styled(line, g) {
    var k = kindOf(line.kind);
    if (!k.styles) return false;
    if (k.picks) return (g.picks || []).indexOf('massage') >= 0;
    return !line.format || line.format === 'massage';
  }
  // The cart exactly as the Worker reads it: no style where none applies, picks only on packages.
  function cartJSON() {
    return { lines: lines.map(function (l) {
      var out = { kind: l.kind, minutes: l.minutes, guests: l.guests.map(function (g) {
        var o = { addons: g.addons.slice() };
        if (styled(l, g)) o.style = g.style || kindOf(l.kind).styles[0];
        if (kindOf(l.kind).picks) o.picks = g.picks.slice();
        return o;
      }) };
      if (l.format && l.format !== 'massage') out.format = l.format;
      return out;
    }) };
  }
  // Any cart edit drops the old times and total; with a date picked, fresh ones load shortly after.
  var reload = null;
  function changed() {
    times = []; start = ''; total = null; timesSeq++; say(''); render();
    clearTimeout(reload);
    if ($date.value) reload = setTimeout(loadTimes, 700);
  }
  // Deep tissue surcharge for this line, exact for its length: packages use one massage hour,
  // 4-hand has two therapists.
  function deepLabel(line) {
    var single = kindOf('single');
    if (!single || !single.deepPrices) return '';
    var m = kindOf(line.kind).picks ? 60 : line.minutes;
    var extra = (single.deepPrices[m] - single.prices[m]) * (line.kind === 'fourhand' ? 2 : 1);
    return extra > 0 ? ' (+' + money(extra) + ')' : '';
  }

  // ---------- rendering ----------
  var $lines, $date, $times, $total, $say, $contact, $pay, $tsBox;

  function say(msg, kind) {
    $say.textContent = msg || '';
    $say.className = 'cart__say' + (kind ? ' cart__say--' + kind : '');
  }

  function guestBlock(line, li, g, gi) {
    var k = kindOf(line.kind), box = el('fieldset', { class: 'cart__guest' }, [el('legend', { text: 'Person ' + (gi + 1) })]);
    if (k.picks) {
      var picks = el('div', { class: 'cart__picks' }, [el('p', { class: 'cart__hint', text: 'Pick two' })]);
      k.picks.forEach(function (p) {
        var id = 'c' + li + 'g' + gi + 'p' + p;
        picks.appendChild(el('label', { for: id, class: 'cart__check' }, [
          el('input', { type: 'checkbox', id: id, checked: g.picks.indexOf(p) >= 0, on: { change: function (e) {
            if (e.target.checked) { g.picks.push(p); if (g.picks.length > 2) g.picks.shift(); }
            else g.picks = g.picks.filter(function (x) { return x !== p; });
            changed();
          } } }),
          ' ' + ({ headspa: 'Head spa', foot: 'Foot massage', massage: 'Massage' })[p]]));
      });
      box.appendChild(picks);
    }
    if (styled(line, g)) {
      var sid = 'c' + li + 'g' + gi + 's';
      var sel = el('select', { id: sid, on: { change: function (e) { g.style = e.target.value; changed(); } } },
        k.styles.map(function (s) { return el('option', { value: s, selected: (g.style || k.styles[0]) === s, text: menu.styleNames[s] + (s === 'deep' ? deepLabel(line) : '') }); }));
      box.appendChild(el('label', { for: sid, class: 'cart__field' }, [el('span', { text: 'Massage style' }), sel]));
    }
    var adds = menu.addons.filter(function (a) { return !a.only || a.only.indexOf(line.kind) >= 0; });
    if (adds.length) {
      var list = el('div', { class: 'cart__addons' }, [el('p', { class: 'cart__hint', text: 'Add-ons' })]);
      adds.forEach(function (a) {
        var id = 'c' + li + 'g' + gi + 'a' + a.id;
        list.appendChild(el('label', { for: id, class: 'cart__check' }, [
          el('input', { type: 'checkbox', id: id, checked: g.addons.indexOf(a.id) >= 0, on: { change: function (e) {
            g.addons = g.addons.filter(function (x) { return x !== a.id; });
            if (e.target.checked) {
              if (a.group) g.addons = g.addons.filter(function (x) { var o = menu.addons.filter(function (m) { return m.id === x; })[0]; return !o || o.group !== a.group; });
              g.addons.push(a.id);
            }
            changed();
          } } }),
          ' ' + a.name + ' · ' + money(a.price)]));
      });
      box.appendChild(list);
    }
    return box;
  }

  function lineCard(line, li) {
    var k = kindOf(line.kind), card = el('article', { class: 'cart__line' });
    var head = el('div', { class: 'cart__line-head' }, [el('h3', { text: 'Massage ' + (li + 1) })]);
    if (lines.length > 1) head.appendChild(el('button', { type: 'button', class: 'cart__remove', 'aria-label': 'Remove massage ' + (li + 1),
      text: 'Remove', on: { click: function () { lines.splice(li, 1); changed(); } } }));
    card.appendChild(head);

    var kid = 'c' + li + 'k', mid = 'c' + li + 'm';
    card.appendChild(el('label', { for: kid, class: 'cart__field' }, [el('span', { text: 'Service' }),
      el('select', { id: kid, on: { change: function (e) { lines[li] = newLine(e.target.value); changed(); } } },
        menu.kinds.map(function (x) { return el('option', { value: x.kind, selected: x.kind === line.kind, text: x.name }); }))]));
    card.appendChild(el('label', { for: mid, class: 'cart__field' }, [el('span', { text: 'Length' }),
      el('select', { id: mid, on: { change: function (e) { line.minutes = Number(e.target.value); changed(); } } },
        k.minutes.map(function (m) { return el('option', { value: m, selected: m === line.minutes, text: m + ' min · ' + money(k.prices[m]) + (k.guests.max === 1 || k.guests.min === k.guests.max ? '' : ' each') }); }))]));
    if (k.formats) {
      var fid = 'c' + li + 'f';
      card.appendChild(el('label', { for: fid, class: 'cart__field' }, [el('span', { text: 'Type' }),
        el('select', { id: fid, on: { change: function (e) {
          line.format = e.target.value;
          line.guests = line.guests.map(function () { return newGuest(line.kind, line.format); });
          changed();
        } } }, k.formats.map(function (f) { return el('option', { value: f, selected: f === line.format, text: ({ massage: 'Massage', headspa: 'Head spa', foot: 'Foot massage' })[f] }); }))]));
    }
    if (k.guests.min !== k.guests.max) {
      var room = menu.limits.guests - guestCount();
      card.appendChild(el('div', { class: 'cart__people' }, [
        el('span', { text: 'People' }),
        el('button', { type: 'button', class: 'cart__step', 'aria-label': 'One fewer person', disabled: line.guests.length <= 1,
          text: '−', on: { click: function () { line.guests.pop(); changed(); } } }),
        el('output', { 'aria-live': 'polite', text: String(line.guests.length) }),
        el('button', { type: 'button', class: 'cart__step', 'aria-label': 'One more person', disabled: room <= 0 || line.guests.length >= k.guests.max,
          text: '+', on: { click: function () { line.guests.push(newGuest(line.kind, line.format)); changed(); } } })]));
    }
    line.guests.forEach(function (g, gi) { card.appendChild(guestBlock(line, li, g, gi)); });
    return card;
  }

  function render() {
    $lines.textContent = '';
    lines.forEach(function (l, i) { $lines.appendChild(lineCard(l, i)); });
    var more = lines.length < menu.limits.lines && guestCount() < menu.limits.guests;
    $lines.appendChild(more
      ? el('button', { type: 'button', class: BTN2 + ' cart__add', text: 'Add another person or massage', on: { click: function () { lines.push(newLine()); changed(); } } })
      : el('p', { class: 'cart__hint', text: 'For larger groups, please call us at ' + menu.phone + '.' }));

    $times.textContent = '';
    times.forEach(function (iso) {
      $times.appendChild(el('button', { type: 'button', class: 'cart__time' + (iso === start ? ' is-active' : ''), 'aria-pressed': iso === start ? 'true' : 'false',
        text: timeLabel(iso), on: { click: function () { start = iso; render(); } } }));
    });
    $total.textContent = total == null ? 'Pick a date to see times and your total.' : 'Total ' + money(total) + ' for ' + guestCount() + (guestCount() > 1 ? ' people' : ' person');
    $contact.hidden = !start;
    $pay.disabled = !start || busy;
  }

  // ---------- bot check (Turnstile), loaded on first need ----------
  // Every run settles: a token, or a failure after an error, Turnstile's own timeout, or 20 s without
  // an answer, loading Cloudflare's script included (unless Cloudflare asks the guest to tap the box).
  // Each run gets its own widget, so an answer from a run the page gave up on is dropped, never used.
  var TS_WAIT = 20000, tsScript = null;
  function loadTurnstile() { // one load, shared by every run
    if (!tsScript) tsScript = new Promise(function (ok, fail) {
      var s = el('script', { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
      s.onload = ok; s.onerror = function () { tsScript = null; fail(); };
      document.head.appendChild(s);
    });
    return tsScript;
  }
  function turnstileToken() {
    return new Promise(function (resolve, reject) {
      var timer, run = {
        done: function (t) {
          if (turnstileToken.pending !== run) return;
          turnstileToken.pending = null; clearTimeout(timer);
          if (t) resolve(t); else reject(new Error('turnstile'));
        }
      };
      if (turnstileToken.pending) turnstileToken.pending.done(null); // an older run never hangs
      turnstileToken.pending = run;
      timer = setTimeout(function () { run.done(null); }, TS_WAIT);
      var mine = function (fn) { return function (x) { if (turnstileToken.pending === run) fn(x); }; };
      var go = function () {
        if (turnstileToken.pending !== run) return; // given up while the script loaded
        if (ts != null) window.turnstile.remove(ts);
        ts = window.turnstile.render($tsBox, { sitekey: menu.turnstileSiteKey, execution: 'execute', appearance: 'interaction-only',
          callback: mine(function (t) { run.done(t); }),
          'error-callback': mine(function () { run.done(null); }), 'expired-callback': mine(function () { run.done(null); }),
          'timeout-callback': mine(function () { run.done(null); }),
          'before-interactive-callback': mine(function () {
            clearTimeout(timer); $tsBox.scrollIntoView({ block: 'center' });
            say('Tap the check box to confirm you are not a robot.');
          }) });
        window.turnstile.execute(ts);
      };
      (window.turnstile ? Promise.resolve() : loadTurnstile()).then(go, function () { run.done(null); });
    });
  }

  function loadTimes(keep) { // keep: leave the current message (after a refusal)
    if (!$date.value) { if (!keep) say('Pick a date.', 'error'); return; }
    if (!keep) say('Finding times…');
    var seq = ++timesSeq;
    var path = '/api/cart/times?spa=' + SPA + '&date=' + $date.value + '&cart=' + encodeURIComponent(JSON.stringify(cartJSON()));
    var withPass = pass ? Promise.resolve({ 'X-Cart-Pass': pass }) : turnstileToken().then(function (t) { return { 'X-Turnstile': t }; });
    withPass.then(function (h) { return api(path, { headers: h }); }).then(function (r) {
      if (seq !== timesSeq) return; // an older date or cart: a newer request owns the page
      if (r.status === 401 && pass) { pass = ''; return loadTimes(keep); }
      if (!r.ok) { times = []; start = ''; total = null; render(); if (!keep) say(r.message || 'We could not load times. Please try again.', 'error'); return; }
      pass = r.pass || ''; times = r.times; total = r.total; start = '';
      render();
      if (!keep) say(times.length ? 'Pick a start time for everyone.' : 'No time fits your whole group that day. Try another day, or call us at ' + menu.phone + '.', times.length ? '' : 'error');
    }).catch(function () { if (seq === timesSeq && !keep) say('We could not load times. Please try again.', 'error'); });
  }

  // ---------- pay: Authorize.Net hosted form, then one checkout ----------
  var acceptBtn = null, order = null;
  function openCardForm() {
    if (acceptBtn) { acceptBtn.click(); return; }
    acceptBtn = el('button', { type: 'button', class: 'AcceptUI', hidden: true, 'data-billingAddressOptions': '{"show":false,"required":false}',
      'data-apiLoginID': menu.payment.loginId, 'data-clientKey': menu.payment.clientKey, 'data-acceptUIFormBtnTxt': 'Pay',
      'data-acceptUIFormHeaderTxt': 'Card details', 'data-paymentOptions': '{"showCreditCard":true,"showBankAccount":false}',
      'data-responseHandler': 'cartCardResponse' });
    root.appendChild(acceptBtn);
    var s = el('script', { src: menu.payment.env === 'production' ? 'https://js.authorize.net/v3/AcceptUI.js' : 'https://jstest.authorize.net/v3/AcceptUI.js', charset: 'utf-8' });
    s.onload = function () { setTimeout(function () { acceptBtn.click(); }, 50); };
    s.onerror = function () { acceptBtn.remove(); acceptBtn = null; busy = false; render(); say('The card form did not load. Please try again.', 'error'); };
    document.body.appendChild(s);
  }

  function remember(id) { try { sessionStorage.setItem('cart-order', JSON.stringify({ id: id, spa: SPA, at: Date.now() })); } catch (e) {} }
  function forget() { try { sessionStorage.removeItem('cart-order'); } catch (e) {} }
  function savedOrder() {
    try { var o = JSON.parse(sessionStorage.getItem('cart-order')); return o && o.spa === SPA && Date.now() - o.at < 30 * 60000 ? o : null; } catch (e) { return null; }
  }
  // After a refresh or a closed tab: the outcome of the saved order id. Never pays again.
  function resume(id) {
    order = { id: id }; busy = true; render(); say('Checking your order…');
    api('/api/cart/order/' + id).then(function (r) {
      if (r.status === 404) { forget(); busy = false; render(); say(''); return; } // never reached the Worker: nothing charged
      if (r.pending) return poll(id, 0);
      show(r);
    }).catch(function () { poll(id, 0); });
  }

  function show(r) {
    busy = false;
    if (!r.pending) forget();
    if (r.ok && r.thankYouUrl) { location.href = r.thankYouUrl; return; }
    if (r.pending) return poll(order.id, 0);
    if (r.stage === 'price' && r.total != null) { total = r.total; render(); say(r.message, 'error'); return; }
    if (r.stage === 'time') { times = []; start = ''; render(); say(r.message || 'That time just filled. Pick another time.', 'error'); loadTimes(true); return; }
    if (r.reversed) start = '';
    render();
    say(r.message || 'Something went wrong. Please call us before paying again.', r.reversed || r.paid ? 'notice' : 'error');
    if (r.reversed) loadTimes(true);
  }

  // A lost response: ask the Worker what happened to this order id. Never pays again.
  function poll(id, n) {
    say('Checking your order…');
    setTimeout(function () {
      api('/api/cart/order/' + id).then(function (r) {
        if (r.pending && n < 8) return poll(id, n + 1);
        if (r.pending || r.status === 404) { busy = false; render(); say('We could not confirm your order yet. Please do not pay again. Call us at ' + menu.phone + '.', 'error'); return; }
        show(r);
      }).catch(function () {
        if (n < 8) return poll(id, n + 1);
        busy = false; render();
        say('We could not confirm your order yet. Please do not pay again. Call us at ' + menu.phone + '.', 'error');
      });
    }, 2500);
  }

  window.cartCardResponse = function (res) {
    if (!res || !res.opaqueData) {
      busy = false; render();
      var m = res && res.messages && res.messages.message && res.messages.message[0];
      say(m && m.text ? m.text : 'Your card was not accepted. Please check it and try again.', 'error');
      return;
    }
    order = { id: uid() }; // one id per payment attempt; a lost response is looked up by it
    remember(order.id);
    busy = true; render();
    say('Paying and booking…');
    var f = $contact.elements;
    turnstileToken().then(function (token) {
      api('/api/cart/checkout', { method: 'POST', body: { orderId: order.id, spa: SPA, cart: cartJSON(), start: start, shownTotal: total,
        customer: { name: f.name.value, phone: f.phone.value, email: f.email.value }, opaqueData: res.opaqueData, turnstileToken: token } }).then(function (r) {
        if (r.status >= 500 && !r.message) return poll(order.id, 0);
        show(r);
      }).catch(function () { poll(order.id, 0); });
    }, function () { // the robot check did not finish, so the order was never sent
      forget(); busy = false; render();
      say('The robot check did not finish, so nothing was charged. Tap Pay and book to try again.', 'error');
    });
  };

  function pay() {
    if (busy) return;
    if (!$contact.reportValidity()) return;
    var f = $contact.elements;
    if (!f.name.value.trim() || f.phone.value.replace(/\D/g, '').length < 10) { say('Enter your name and a 10-digit phone number.', 'error'); f.name.focus(); return; }
    busy = true; order = null; render(); say('');
    openCardForm();
    // The hosted form has no "closed" event: Pay works again after a short wait.
    setTimeout(function () { if (busy && !order) { busy = false; render(); } }, 4000);
  }

  // ---------- start ----------
  function build() {
    root.textContent = '';
    var today = denverDate(new Date()), last = denverDate(new Date(Date.now() + 60 * 864e5));
    $lines = el('div', { class: 'cart__lines' });
    $date = el('input', { type: 'date', id: 'cart-date', min: today, max: last, on: { change: function () { times = []; start = ''; total = null; render(); loadTimes(); } } });
    $times = el('div', { class: 'cart__times', role: 'group', 'aria-label': 'Start times' });
    $total = el('p', { class: 'cart__total', 'aria-live': 'polite' });
    $say = el('p', { class: 'cart__say', role: 'status', 'aria-live': 'polite' });
    $tsBox = el('div', { class: 'cart__ts' });
    $contact = el('form', { class: 'cart__contact', hidden: true, on: { submit: function (e) { e.preventDefault(); pay(); } } }, [
      el('label', { for: 'cart-name', class: 'cart__field' }, [el('span', { text: 'Name' }), el('input', { id: 'cart-name', name: 'name', autocomplete: 'name', required: true })]),
      el('label', { for: 'cart-phone', class: 'cart__field' }, [el('span', { text: 'Phone' }), el('input', { id: 'cart-phone', name: 'phone', type: 'tel', autocomplete: 'tel', required: true })]),
      el('label', { for: 'cart-email', class: 'cart__field' }, [el('span', { text: 'Email' }), el('input', { id: 'cart-email', name: 'email', type: 'email', autocomplete: 'email', pattern: '[^@\\s]+@[^@\\s]+\\.[^@\\s]+', title: 'An email like name@example.com' })])]);
    $pay = el('button', { type: 'button', class: BTN + ' cart__pay', text: 'Pay and book', on: { click: pay } });
    root.appendChild(el('div', { class: 'cart__inner' }, [
      el('h2', { class: 'cart__title', text: 'Book one or more massages' }),
      el('p', { class: 'cart__lead', text: 'Add each person and massage, pick one start time for everyone, and pay once.' }),
      $lines,
      el('div', { class: 'cart__when' }, [el('label', { for: 'cart-date', class: 'cart__field' }, [el('span', { text: 'Date' }), $date]), $times]),
      $total, $tsBox, $contact, $pay, $say,
      el('p', { class: 'cart__alt' }, [el('a', { href: '#book-one', text: 'Booking one massage? Use the calendar below.' })])]));
    root.hidden = false;
    render();
  }

  function startCart() {
    if (!document.querySelector('link[href="' + CSS + '"]')) document.head.appendChild(el('link', { rel: 'stylesheet', href: CSS }));
    api('/api/cart/menu?spa=' + SPA).then(function (r) {
      if (!r.ok) {
        if (!root.hidden) { root.textContent = ''; root.appendChild(el('p', { class: 'cart__closed', text: r.message || 'Online group booking is not available right now.' })); }
        return;
      }
      menu = r; menu.phone = root.getAttribute('data-phone') || '';
      lines = [newLine()];
      build();
      var saved = savedOrder();
      if (saved) resume(saved.id);
    }).catch(function () {});
  }

  if (document.querySelector('script[src*="/assets/after-paint.js"]')) (window.__afterPaint = window.__afterPaint || []).push(startCart);
  else startCart();
})();
