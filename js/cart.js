/* Online cart: several massages, one time for the group, one card payment, set up like a
   store cart. Talks to the spa-phone-booking Worker (GET /api/cart/menu, GET /api/cart/times,
   POST /api/cart/checkout, GET /api/cart/order/:id, POST /api/cart/order/:id/timing). The page
   prices each line from the menu so totals move as options are tapped; the Worker's priceCart is
   the only source of the charged amount, and a browser test proves the two agree. Card numbers
   never touch this page: Pay opens Authorize.Net's hosted card form (AcceptUI), loaded on the
   first Pay tap. Turnstile loads on first need, and checkout's token is fetched while the guest
   types and pays.

   <section id="cart" data-spa="elite" data-api="https://..." hidden> — while the section
   is hidden the page makes no cart request at all, unless a staff preview link
   (#cartpreview=) opened it. One file for both spa sites, copied byte for byte, with the same cart.css.
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
  var CSS = root.getAttribute('data-css') || '/assets/cart.css?v=3';

  // Staff preview token: the page's inline loader takes it from #cartpreview= and strips it from
  // the address bar before analytics loads (never in the query string or a referrer).
  var preview = window.__cartPreview || null;
  try { preview = preview || sessionStorage.getItem('cartpreview'); } catch (e) {}
  if (root.hidden && !preview) return; // staff-only for now: nothing to load for guests

  // The cart. A line is { kind, minutes, format, qty, guests }; a guest is { style, addons: [], picks }.
  // Kinds booked per person (menu guests 1-8): ONE template guest, and qty people share its choices.
  // Couples, Couples Spa Day Combo and 4-Hand: qty 1 and exactly guests.min guests.
  var menu = null, lines = [];
  // The Add panel: `draft` is the line being built (or edited), `editIndex` its place in `lines`
  // (-1 while adding). Edits stay in the draft until Save changes.
  var draft = null, editIndex = -1, sheetEl = null;
  // The cart page. `screen` is 'cards' or 'cart'. `notice` is the one line of news for the guest (an
  // item we removed, a time we cleared). `day` and `start` are the picked day and time: the time
  // step sets them, the cart keeps them through a refresh and clears the time when the cart changes.
  var KEY = 'cart-v2:' + SPA;
  var day = null, start = null, screen = 'cards', notice = '';
  var inner = null, barEl = null, panelEl = null, orderEl = null;
  // The time step. `times` is the list for `day` and the current cart, null while it loads or after
  // the cart changed; `timesErr` is the message when it could not load. `pass` is the Worker's
  // 20-min browsing pass, so only the first times request needs a Turnstile run. timesSeq: only the
  // newest times request may update the page. autoLeft: days the first open may still skip ahead.
  var times = null, timesErr = '', timesLoading = false, timesSeq = 0, pass = '', reload = null, autoLeft = 0;
  // The time, details and Pay sections: made once and moved into each new cart page, so what the
  // guest typed survives every redraw. tsBox holds the Turnstile widget.
  var whenEl = null, daysEl = null, otherEl = null, timesEl = null, formEl = null, payboxEl = null, payEl = null, sayEl = null, tsBox = null;
  // busy: the card form is opening or a payment is under way. order: the payment attempt (checkout).
  // paying: from the card form's answer until that order's outcome is handled; the cart is locked.
  // ended: the message of an order that ended paid, held or unclear; the cart is cleared, Pay stays off.
  // progEl: the progress steps while an order runs.
  var busy = false, order = null, paying = false, ended = '', progEl = null;

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
  function addonOf(id) { for (var i = 0; i < menu.addons.length; i++) if (menu.addons[i].id === id) return menu.addons[i]; return null; }

  // ---------- cart state and prices ----------
  function exact(k) { return k.guests.min === k.guests.max; }
  // Only a guest who gets a massage picks a style and can pay the deep surcharge: a styled kind,
  // couples in the massage format, or a combo with Massage among its two picks.
  function getsMassage(line, g) {
    var k = kindOf(line.kind);
    if (!k || !k.styles) return false;
    if (k.picks) return !!g.picks && g.picks.indexOf('massage') >= 0;
    return !line.format || line.format === 'massage';
  }
  function people(line) { return line.guests.length * line.qty; }
  // Rows and total as priceCart charges them. Per-person kinds: qty x (length price + deep
  // surcharge + add-ons). Exact kinds (qty 1): one length price + each guest's surcharge and add-ons.
  // A row after the first carries the index of the guest it belongs to.
  function priceLine(line) {
    var k = kindOf(line.kind), m = line.minutes, q = line.qty, two = line.guests.length > 1;
    var rows = [{ label: m + ' min', amount: k.prices[m] * q }];
    line.guests.forEach(function (g, i) {
      var who = two ? 'Guest ' + (i + 1) + ' · ' : '';
      if (g.style === 'deep' && getsMassage(line, g)) rows.push({ label: who + menu.styleNames.deep, amount: k.deepAdd[m] * q, guest: i });
      g.addons.forEach(function (id) { var a = addonOf(id); rows.push({ label: who + a.name, amount: a.price * q, guest: i }); });
    });
    return { rows: rows, total: rows.reduce(function (s, r) { return s + r.amount; }, 0) };
  }
  function sumLines(ls) { return ls.reduce(function (s, l) { return s + priceLine(l).total; }, 0); }
  function cartTotal() { return sumLines(lines); }
  // The cart exactly as the Worker reads it, and the only shape ever sent: each guest repeated qty
  // times, a style only for a guest who gets a massage, picks only on the combo kinds.
  function toWorker(ls) {
    return { lines: (ls || lines).map(function (l) {
      var k = kindOf(l.kind), guests = [];
      for (var i = 0; i < l.qty; i++) l.guests.forEach(function (g) {
        var o = { addons: g.addons.slice() };
        if (getsMassage(l, g)) o.style = g.style;
        if (k && k.picks) o.picks = g.picks.slice();
        guests.push(o);
      });
      var out = { kind: l.kind, minutes: l.minutes, guests: guests };
      if (l.format) out.format = l.format;
      return out;
    }) };
  }
  // Would the Worker take this line? Mirrors priceCart's refusals against the loaded menu, so a
  // line saved under an older menu is dropped, never posted.
  function validLine(l) {
    var k = l && kindOf(l.kind);
    if (!k || k.minutes.indexOf(l.minutes) < 0) return false;
    if (l.format != null && !(k.formats && k.formats.indexOf(l.format) >= 0)) return false;
    if (!Array.isArray(l.guests) || typeof l.qty !== 'number' || !(l.qty >= 1 && l.qty % 1 === 0)) return false;
    if (exact(k) ? l.qty !== 1 || l.guests.length !== k.guests.min : l.guests.length !== 1 || l.qty > k.guests.max) return false;
    return l.guests.every(function (g) {
      if (!g || !Array.isArray(g.addons)) return false;
      var groups = {};
      for (var i = 0; i < g.addons.length; i++) {
        var a = addonOf(g.addons[i]);
        if (!a || g.addons.indexOf(a.id) !== i || (a.only && a.only.indexOf(l.kind) < 0)) return false;
        if (a.group) { if (groups[a.group]) return false; groups[a.group] = true; }
      }
      var p = g.picks;
      if (k.picks && !(Array.isArray(p) && p.length === 2 && p[0] !== p[1] && k.picks.indexOf(p[0]) >= 0 && k.picks.indexOf(p[1]) >= 0)) return false;
      return !getsMassage(l, g) || k.styles.indexOf(g.style) >= 0;
    });
  }

  // ---------- the Add panel ----------
  // Names for the couples formats and the combo picks (the menu sends only their ids).
  var PART = { massage: 'Massage', headspa: 'Head Spa', foot: 'Foot' };
  function partName(id) { return PART[id] || id; }
  // A guest has a style only while they get a massage: any other guest has none, and a guest who
  // starts getting one starts on the kind's first style.
  function settleStyle(line, g) {
    var k = kindOf(line.kind);
    if (!getsMassage(line, g)) g.style = null;
    else if (!g.style || k.styles.indexOf(g.style) < 0) g.style = k.styles[0];
  }
  // A new line: shortest length, first style, one person. Combo picks start empty.
  function newLine(k) {
    var line = { kind: k.kind, minutes: Math.min.apply(null, k.minutes), format: k.formats && k.formats.length > 1 ? k.formats[0] : null, qty: 1, guests: [] };
    for (var i = 0; i < k.guests.min; i++) {
      var g = { style: null, addons: [], picks: k.picks ? [] : null };
      settleStyle(line, g);
      line.guests.push(g);
    }
    return line;
  }
  function cloneLine(l) {
    return { kind: l.kind, minutes: l.minutes, format: l.format, qty: l.qty, guests: l.guests.map(function (g) {
      return { style: g.style, addons: g.addons.slice(), picks: g.picks ? g.picks.slice() : g.picks };
    }) };
  }
  function perPerson(k) { return k.guests.min === 1 && k.guests.max > 1; }
  function lowestPrice(k) {
    var p = [];
    for (var m in k.prices) p.push(k.prices[m]);
    return Math.min.apply(null, p);
  }

  // ---------- limits (menu.limits: 6 lines, 8 guests; quantity and both couples guests count) ----------
  // People in the cart, leaving out the line at index `skip` (-1 leaves none out).
  function peopleIn(ls, skip) {
    var n = 0;
    ls.forEach(function (l, i) { if (i !== skip) n += people(l); });
    return n;
  }
  // Most people one line of kind k can hold: the kind's own cap, then what the other lines leave.
  // `skip` is the line being edited (default: the one in the panel; -1 while adding a new line).
  function qtyMax(k, skip) {
    return Math.min(k.guests.max, menu.limits.guests - peopleIn(lines, skip === undefined ? editIndex : skip));
  }
  // Is there room for one more line of kind k, and would a finished line fit (skip = line it replaces)?
  function canAdd(k) { return lines.length < menu.limits.lines && peopleIn(lines, -1) + k.guests.min <= menu.limits.guests; }
  function fits(line, skip) { return (skip >= 0 || lines.length < menu.limits.lines) && peopleIn(lines, skip) + people(line) <= menu.limits.guests; }
  // One sentence per limit, shown only while that limit is what holds a control back: the line limit
  // disables every card (and "massages" is how it is worded), the guest limit disables the kinds
  // that need more people than are left (and "people" is how it is worded).
  function limitEl(n, what) {
    return el('p', { class: 'cart__limit', role: 'status', text: 'Up to ' + n + ' ' + what + ' per online order. Please call us' + (menu.phone ? ' at ' + menu.phone : '') + ' for larger groups.' });
  }
  function guestLimitEl() { return limitEl(menu.limits.guests, 'people'); }
  function limitEls() {
    var out = [];
    if (lines.length >= menu.limits.lines) out.push(limitEl(menu.limits.lines, 'massages'));
    if (menu.kinds.some(function (k) { return peopleIn(lines, -1) + k.guests.min > menu.limits.guests; })) out.push(guestLimitEl());
    return out;
  }

  // ---------- the two dialogs: page lock, focus, Tab, Escape ----------
  // The Add panel (sheetEl) and the cart page (panelEl) are modal. While either is open the page behind
  // stays where it was (its scroll position is kept and put back), Tab stays inside the top dialog,
  // Escape closes it, and focus goes back to the control that opened it. sheetFrom and cartFrom are
  // those controls as selectors, because the cards and the cart page are drawn again after each change.
  var lockY = null, sheetFrom = '', cartFrom = '';
  function lockPage() {
    if (lockY !== null) return;
    var b = document.body, gap = window.innerWidth - document.documentElement.clientWidth;
    lockY = window.pageYOffset;
    b.style.top = -lockY + 'px';
    if (gap > 0) b.style.paddingRight = gap + 'px'; // the scroll bar goes: the page must not widen
    b.classList.add('cart-lock');
  }
  function unlockPage() {
    if (lockY === null) return;
    var b = document.body, y = lockY;
    lockY = null;
    b.classList.remove('cart-lock'); b.style.top = ''; b.style.paddingRight = '';
    // instant: the page's smooth scrolling must not animate the put-back (older browsers: plain scrollTo)
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
  }
  function syncLock() { if ((sheetEl && sheetEl.parentNode) || screen === 'cart') lockPage(); else unlockPage(); }
  function cardAddSel(kind) { return '.cart__card[data-kind="' + kind + '"] .cart__card-add'; }
  // After a dialog closes: the control that opened it, else the first service card, else the cart bar.
  function focusBack(sel) {
    var t = sel ? root.querySelector(sel) : null;
    if (!t || t.disabled) t = root.querySelector('.cart__card-add:not(:disabled)') || root.querySelector('.cart__bar') || root.querySelector('.cart__title');
    if (t) t.focus({ preventScroll: true });
  }
  function tabbables(box) {
    return Array.prototype.filter.call(box.querySelectorAll('button, input, select, textarea, a[href], iframe, [tabindex]'), function (n) {
      return !n.disabled && n.getAttribute('tabindex') !== '-1' && !n.classList.contains('cart__trap') && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
    });
  }
  // A stop at each end of a dialog. Keys pressed inside the robot-check iframe never reach onKey, so a Tab out of
  // it (Pay off, the box last) lands here and goes round to the first control; Shift+Tab out of the first goes to the last.
  // Not a global focusin guard: that could take focus from Authorize.Net's card form, which sits outside the dialogs.
  function trap(which) {
    return el('span', { class: 'cart__trap', tabindex: '0', 'data-trap': which, on: { focus: function (e) {
      var d = e.currentTarget.parentNode, list = tabbables(d), from = e.relatedTarget;
      var last = which === 'start' && from && from !== d && d.contains(from); // coming back from the first control
      (list.length ? list[last ? list.length - 1 : 0] : d).focus({ preventScroll: true });
    } } });
  }
  function onKey(e) {
    var d = sheetEl && sheetEl.parentNode ? sheetEl : screen === 'cart' ? panelEl : null;
    if (!d || e.defaultPrevented) return;
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      if (d === sheetEl) closeSheet(true); else closeCart();
      return;
    }
    if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
    var list = tabbables(d), a = document.activeElement;
    if (!list.length) { e.preventDefault(); d.focus({ preventScroll: true }); return; }
    var first = list[0], last = list[list.length - 1];
    if (!d.contains(a) || a === d) { e.preventDefault(); (e.shiftKey ? last : first).focus({ preventScroll: true }); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus({ preventScroll: true }); }
  }

  // Open the panel on a new line of a kind (a kind key) or on a cart line to edit (its index).
  function openSheet(which) {
    if (locked()) return;
    if (typeof which === 'number') {
      if (!lines[which]) return;
      draft = cloneLine(lines[which]); editIndex = which;
    } else {
      var k = kindOf(which);
      if (!k || !canAdd(k)) return;
      draft = newLine(k); editIndex = -1;
    }
    if (!sheetEl || !sheetEl.parentNode) {
      sheetFrom = typeof which === 'number' ? '.cart__panel .cart__line-edit[data-line="' + which + '"]' : cardAddSel(which);
      sheetEl = el('div', { class: 'cart__sheet', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' });
      root.appendChild(sheetEl);
    }
    renderSheet();
    syncLock();
    sheetEl.focus({ preventScroll: true });
  }
  // back: give focus to the control that opened the panel (Escape, Close, a tap outside the panel).
  function closeSheet(back) {
    if (sheetEl && sheetEl.parentNode) sheetEl.parentNode.removeChild(sheetEl);
    sheetEl = null; draft = null; editIndex = -1;
    syncLock();
    if (back === true) focusBack(sheetFrom);
  }
  // Add to cart pushes the draft, Save changes replaces the line it came from. Either way the cart opens.
  function addDraft() {
    if (locked() || !draft || !validLine(draft) || !fits(draft, editIndex)) return;
    if (editIndex >= 0) lines[editIndex] = draft; else lines.push(draft);
    closeSheet();
    cartChanged();
    openCart(sheetFrom);
  }

  function chip(kids, attrs, on, fn) {
    attrs['class'] = 'cart__chip'; attrs.type = 'button'; attrs['aria-pressed'] = on ? 'true' : 'false'; attrs.on = { click: fn };
    return el('button', attrs, kids);
  }
  function group(label, nodes) {
    return el('div', { class: 'cart__group', role: 'group', 'aria-label': label }, [
      el('p', { class: 'cart__label', text: label }),
      el('div', { class: 'cart__chips' }, nodes)]);
  }
  function togglePick(g, id) {
    var at = g.picks.indexOf(id);
    if (at >= 0) g.picks.splice(at, 1);
    else { if (g.picks.length >= 2) g.picks.shift(); g.picks.push(id); }
    settleStyle(draft, g);
    renderSheet();
  }
  // Within one add-on group (the foot add-ons) turning one on turns the other off.
  function toggleAddon(g, a) {
    var at = g.addons.indexOf(a.id);
    if (at >= 0) g.addons.splice(at, 1);
    else {
      if (a.group) g.addons = g.addons.filter(function (id) { var o = addonOf(id); return !(o && o.group === a.group); });
      g.addons.push(a.id);
    }
    renderSheet();
  }
  // Which button had focus, so the same one can take it back after the panel redraws.
  function keyOf(n) {
    var s = n.className;
    for (var i = 0; i < n.attributes.length; i++) if (n.attributes[i].name.indexOf('data-') === 0) s += '|' + n.attributes[i].name + '=' + n.attributes[i].value;
    return s;
  }

  function renderSheet() {
    var k = kindOf(draft.kind), m = draft.minutes, two = draft.guests.length > 1, edit = editIndex >= 0;
    var oldMain = sheetEl.querySelector('.cart__sheet-main'), scroll = oldMain ? oldMain.scrollTop : 0;
    var active = document.activeElement, key = active && sheetEl.contains(active) && active.tagName === 'BUTTON' ? keyOf(active) : '';
    var parts = [];

    parts.push(group('Length', k.minutes.map(function (n) {
      return chip([el('span', { class: 'cart__chip-main', text: n + ' min' }), ' ', el('span', { class: 'cart__chip-sub', text: money(k.prices[n]) })],
        { 'data-len': n }, n === m, function () { draft.minutes = n; renderSheet(); });
    })));

    if (k.formats && k.formats.length > 1) parts.push(group('Format', k.formats.map(function (f) {
      return chip([partName(f)], { 'data-format': f }, draft.format === f, function () {
        draft.format = f;
        draft.guests.forEach(function (g) { settleStyle(draft, g); });
        renderSheet();
      });
    })));

    if (perPerson(k)) parts.push(el('div', { class: 'cart__group cart__qty', role: 'group', 'aria-label': 'How many people' }, [
      el('p', { class: 'cart__label', text: 'How many people' }),
      el('div', { class: 'cart__qty-row' }, [
        el('button', { type: 'button', class: 'cart__qty-minus', 'aria-label': 'One fewer person', text: '−', disabled: draft.qty <= 1,
          on: { click: function () { if (draft.qty > 1) { draft.qty--; renderSheet(); } } } }),
        el('span', { class: 'cart__qty-n', text: String(draft.qty) }),
        el('button', { type: 'button', class: 'cart__qty-plus', 'aria-label': 'One more person', text: '+', disabled: draft.qty >= qtyMax(k),
          on: { click: function () { if (draft.qty < qtyMax(k)) { draft.qty++; renderSheet(); } } } })]),
      el('p', { class: 'cart__hint', text: 'Same choices for each person. Want different ones? Add another line.' }),
      peopleIn(lines, editIndex) + draft.qty >= menu.limits.guests ? guestLimitEl() : null]));

    draft.guests.forEach(function (g, gi) {
      var who = two ? ' for guest ' + (gi + 1) : '', box = [];
      if (two) box.push(el('p', { class: 'cart__guest-label', text: 'Guest ' + (gi + 1) }));
      if (k.picks) box.push(group('Pick two' + who, k.picks.map(function (p) {
        return chip([partName(p)], { 'data-pick': p, 'data-guest': gi }, g.picks.indexOf(p) >= 0, function () { togglePick(g, p); });
      })));
      if (getsMassage(draft, g)) box.push(group('Massage style' + who, k.styles.map(function (s) {
        var label = (menu.styleNames[s] || s) + (s === 'deep' && k.deepAdd && k.deepAdd[m] != null ? ' +' + money(k.deepAdd[m]) : '');
        return chip([label], { 'data-style': s, 'data-guest': gi }, g.style === s, function () { g.style = s; renderSheet(); });
      })));
      var opts = menu.addons.filter(function (a) { return !a.only || a.only.indexOf(draft.kind) >= 0; });
      if (opts.length) box.push(el('div', { class: 'cart__group', role: 'group', 'aria-label': 'Add-ons' + who }, [
        el('p', { class: 'cart__label', text: 'Add-ons' }),
        el('div', { class: 'cart__addons' }, opts.map(function (a) {
          return el('button', { type: 'button', class: 'cart__addon', 'data-addon': a.id, 'data-guest': gi, 'aria-pressed': g.addons.indexOf(a.id) >= 0 ? 'true' : 'false',
            on: { click: function () { toggleAddon(g, a); } } },
          [el('span', { class: 'cart__addon-name', text: a.name }), ' ', el('span', { class: 'cart__addon-price', text: '+' + money(a.price) })]);
        }))]));
      parts.push(el('div', { class: 'cart__guest' }, box));
    });

    var ready = validLine(draft);
    var go = el('button', { type: 'button', class: BTN + ' cart__sheet-go', disabled: !ready, on: { click: addDraft },
      text: ready ? (edit ? 'Save changes' : 'Add to cart') + ' · ' + money(priceLine(draft).total) : 'Pick two' });

    var main = el('div', { class: 'cart__sheet-main' }, parts);
    sheetEl.setAttribute('aria-label', k.name);
    sheetEl.textContent = '';
    sheetEl.appendChild(trap('start'));
    // The tap-outside area is for fingers and mice only: screen readers and the keyboard have the Close button and Escape.
    sheetEl.appendChild(el('div', { class: 'cart__sheet-scrim', 'aria-hidden': 'true', on: { click: function () { closeSheet(true); } } }));
    sheetEl.appendChild(el('div', { class: 'cart__sheet-panel' }, [
      el('div', { class: 'cart__sheet-head' }, [
        el('h3', { class: 'cart__sheet-title', text: k.name }),
        el('button', { type: 'button', class: 'cart__sheet-close', 'aria-label': 'Close', text: '×', on: { click: function () { closeSheet(true); } } })]),
      main,
      el('div', { class: 'cart__sheet-foot' }, [go])]));
    sheetEl.appendChild(trap('end'));
    main.scrollTop = scroll;
    if (key) refocus(sheetEl, key);
  }
  // After a redraw, give focus back to the button that had it (same classes and data-*), else to the box.
  function refocus(box, key) {
    var target = null, btns = box.querySelectorAll('button');
    for (var i = 0; i < btns.length && !target; i++) if (keyOf(btns[i]) === key) target = btns[i];
    (target && !target.disabled ? target : box).focus({ preventScroll: true });
  }

  // ---------- keeping the cart ----------
  // sessionStorage holds { v: 1, lines, day, start } under cart-v2:<spa>. Every read and write is
  // wrapped: private mode and blocked storage throw, and the cart must work without them.
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ v: 1, lines: lines, day: day, start: start })); } catch (e) {}
  }
  // Runs once the menu is in. A saved line the menu no longer takes is dropped with a notice and
  // never posted: validLine goes first because priceLine throws on a kind or add-on that is gone.
  // The limits across lines are applied here too, since validLine only looks at one line.
  function restore() {
    var raw = null;
    try { raw = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (!raw || raw.v !== 1 || !Array.isArray(raw.lines)) return;
    var kept = [], dropped = false;
    raw.lines.forEach(function (l) {
      if (validLine(l) && kept.length < menu.limits.lines && peopleIn(kept, -1) + people(l) <= menu.limits.guests) kept.push(cloneLine(l));
      else dropped = true;
    });
    lines = kept;
    day = typeof raw.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.day) && raw.day >= denverDate(new Date()) ? raw.day : null;
    start = day && typeof raw.start === 'string' && !isNaN(Date.parse(raw.start)) ? raw.start : null;
    if (dropped) {
      start = null;
      notice = 'We removed an item that is no longer offered online.';
      save();
    }
  }
  // Every change to the cart comes through here: save it, drop the picked time (the times on offer
  // depend on the cart) and say so, reload the times, and redraw.
  function cartChanged() {
    notice = start ? 'We cleared your time because your cart changed. Pick a time again.' : '';
    start = null;
    save();
    timesSoon();
    paint();
  }

  // ---------- pick a time ----------
  var DAYS = 14, AHEAD = 60; // day buttons; the furthest day Other date offers (today's range)
  function today() { return denverDate(new Date()); }
  // Calendar days after a Denver date (noon UTC never crosses a date line, so DST cannot skip a day).
  function addDays(ymd, n) { var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function sameTime(a, b) { return Date.parse(a) === Date.parse(b); }
  function offered(iso) { return !!times && times.some(function (t) { return sameTime(t, iso); }); }
  // The cart changed: the old times no longer apply. Fresh ones load shortly (700 ms, so quick taps
  // send one request), and only while the cart page is open; a closed cart loads them when it opens.
  function timesSoon() {
    clearTimeout(reload); reload = null;
    timesSeq++; timesLoading = false; times = null; timesErr = '';
    if (screen === 'cart') reload = setTimeout(function () { reload = null; loadTimes(); }, 700);
  }
  // Times for `day` and the cart exactly as the Worker reads it. The first request runs Turnstile,
  // later ones send the pass. On first open (no day yet) it starts today and skips ahead at most 2
  // days to the first day with times, so the per-IP limit (30 times requests an hour) is not burned.
  // keep: leave the message under Pay as it is (after a refused checkout).
  function loadTimes(keep) {
    clearTimeout(reload); reload = null;
    if (screen !== 'cart' || !lines.length || locked()) return; // loads when the cart page opens (or the order ends)
    if (!day) { day = today(); autoLeft = 2; save(); }
    if (!keep && !asking) say('');
    var seq = ++timesSeq, d = day, sent = pass;
    times = null; timesErr = ''; timesLoading = true;
    paintWhen(); paintPay();
    var path = '/api/cart/times?spa=' + SPA + '&date=' + d + '&cart=' + encodeURIComponent(JSON.stringify(toWorker()));
    var withPass = sent ? Promise.resolve({ 'X-Cart-Pass': sent }) : turnstileToken().then(function (t) { return { 'X-Turnstile': t }; });
    // A request that went stale while its robot check ran is not sent (each one counts against the limit).
    withPass.then(function (h) { return seq === timesSeq ? api(path, { headers: h }) : null; }).then(function (r) {
      if (r && r.ok && r.pass) pass = r.pass; // a pass is good for any day and cart
      if (!r || seq !== timesSeq) return; // an older day or cart: a newer request owns the page
      if (r.status === 401 && sent) { if (pass === sent) pass = ''; return loadTimes(keep); } // the pass expired
      timesLoading = false;
      if (!r.ok) { autoLeft = 0; timesErr = r.message || 'We could not load times. Please try again.'; return timesFailed(); }
      var list = Array.isArray(r.times) ? r.times : [];
      if (!list.length && autoLeft > 0) { autoLeft--; day = addDays(d, 1); save(); return loadTimes(keep); }
      autoLeft = 0;
      times = list;
      if (start && !offered(start)) { start = null; save(); }
      paintWhen(); paintPay();
      prerunTs();
    }).catch(function () {
      if (seq !== timesSeq) return;
      timesLoading = false; autoLeft = 0;
      timesErr = 'We could not load times. Please try again.';
      timesFailed();
    });
  }
  function timesFailed() {
    times = [];
    if (start) { start = null; save(); }
    paintWhen(); paintPay();
  }
  // A day button or Other date: a new day drops the picked time and loads that day's times. The same
  // day again only reloads after an error.
  function pickDay(date) {
    var t0 = today();
    if (locked() || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < t0 || date > addDays(t0, AHEAD)) return;
    if (date === day && !timesErr && (times || timesLoading || reload)) return;
    day = date; start = null; autoLeft = 0;
    save();
    loadTimes();
  }
  function pickTime(iso) {
    if (locked() || !offered(iso)) return;
    start = iso; notice = '';
    save();
    paint();
    prerunTs();
  }
  function dayButton(d, i) {
    var at = new Date(d + 'T12:00:00Z'), on = d === day;
    var fmt = function (o) { o.timeZone = 'UTC'; return at.toLocaleDateString('en-US', o); };
    return el('button', { type: 'button', class: 'cart__day', 'data-date': d, 'aria-pressed': on ? 'true' : 'false', disabled: locked(),
      'aria-label': fmt({ weekday: 'long', month: 'long', day: 'numeric' }), on: { click: function () { pickDay(d); } } }, [
      el('span', { class: 'cart__day-wd', text: i === 0 ? 'Today' : fmt({ weekday: 'short' }) }), ' ',
      el('span', { class: 'cart__day-d', text: fmt({ month: 'short', day: 'numeric' }) })]);
  }
  // Redraw the day buttons and times in place, keeping focus on the button that had it.
  function paintWhen() {
    if (!whenEl) return;
    var a = document.activeElement, key = a && whenEl.contains(a) && a.tagName === 'BUTTON' ? keyOf(a) : '';
    var t0 = today(), row = [];
    for (var i = 0; i < DAYS; i++) row.push(addDays(t0, i));
    daysEl.textContent = '';
    row.forEach(function (d, i) { daysEl.appendChild(dayButton(d, i)); });
    otherEl.min = t0; otherEl.max = addDays(t0, AHEAD); otherEl.disabled = locked();
    if (document.activeElement !== otherEl) otherEl.value = day && row.indexOf(day) < 0 ? day : '';
    timesEl.textContent = '';
    if (times && times.length) times.forEach(function (iso) {
      var on = !!start && sameTime(iso, start);
      timesEl.appendChild(el('button', { type: 'button', class: 'cart__time', 'data-start': iso, 'aria-pressed': on ? 'true' : 'false', disabled: locked(),
        text: timeLabel(iso), on: { click: function () { pickTime(iso); } } }));
    });
    else timesEl.appendChild(el('p', { class: 'cart__times-msg' + (timesErr ? ' cart__times-msg--error' : ''), role: 'status',
      text: times == null ? 'Finding times…' : timesErr || 'No times left on this day. Try another day.' }));
    if (key && !whenEl.contains(document.activeElement)) refocus(panelEl || whenEl, key);
  }

  // ---------- your details and the Pay button ----------
  function ready() {
    var f = formEl && formEl.elements;
    return !!start && offered(start) && !!f && !!f.name.value.trim() && f.phone.value.replace(/\D/g, '').length >= 10;
  }
  // "Pick a time to continue" until a time, a name and a 10-digit phone are in; then "Pay $X and book".
  function paintPay() {
    if (!payEl) return;
    var had = document.activeElement === payEl;
    if (ended) payEl.disabled = true; // the order ended: Pay stays off
    else {
      var ok = ready();
      payEl.disabled = !ok || busy || paying;
      payEl.textContent = ok ? 'Pay ' + money(cartTotal()) + ' and book' : 'Pick a time to continue';
    }
    // A disabled button cannot keep focus (the browser drops it to the page): keep it in the cart.
    if (had && payEl.disabled && panelEl) panelEl.focus({ preventScroll: true });
  }
  // The line of news under the time step and over Pay (the robot check, the card form, checkout).
  function say(msg, kind) {
    if (!sayEl) return;
    sayEl.textContent = msg || '';
    sayEl.className = 'cart__say' + (kind ? ' cart__say--' + kind : '');
  }
  function checkoutEls() {
    if (whenEl) return [whenEl, formEl, payboxEl];
    daysEl = el('div', { class: 'cart__days', role: 'group', 'aria-label': 'Day' });
    otherEl = el('input', { type: 'date', id: 'cart-other', class: 'cart__other', on: { change: function () { pickDay(otherEl.value); } } });
    timesEl = el('div', { class: 'cart__times', role: 'group', 'aria-label': 'Start times' });
    whenEl = el('section', { class: 'cart__when', 'aria-label': 'Pick a time' }, [
      el('h3', { class: 'cart__when-title', text: 'Pick a time' }),
      daysEl,
      el('label', { for: 'cart-other', class: 'cart__other-label' }, [el('span', { text: 'Other date' }), ' ', otherEl]),
      timesEl,
      el('p', { class: 'cart__same', text: 'Everyone in your order starts at the same time.' })]);
    var typed = { input: function () { paintPay(); } };
    formEl = el('form', { class: 'cart__details', 'aria-label': 'Your details', on: { submit: function (e) { e.preventDefault(); pay(); } } }, [
      el('h3', { class: 'cart__details-title', text: 'Your details' }),
      el('label', { for: 'cart-name', class: 'cart__field' }, [el('span', { text: 'Name' }),
        el('input', { id: 'cart-name', name: 'name', autocomplete: 'name', required: true, on: typed })]),
      el('label', { for: 'cart-phone', class: 'cart__field' }, [el('span', { text: 'Mobile phone' }),
        el('input', { id: 'cart-phone', name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', required: true, on: typed })]),
      // data-opinly-no-capture: the Opinly pixel must not read a typed email (site rule).
      el('label', { for: 'cart-email', class: 'cart__field' }, [el('span', { text: 'Email (optional)' }),
        el('input', { id: 'cart-email', name: 'email', type: 'email', autocomplete: 'email', pattern: '[^@\\s]+@[^@\\s]+\\.[^@\\s]+',
          title: 'An email like name@example.com', 'data-opinly-no-capture': true })])]);
    tsBox = el('div', { class: 'cart__ts' });
    sayEl = el('p', { class: 'cart__say', role: 'status', 'aria-live': 'polite' });
    payEl = el('button', { type: 'button', class: BTN + ' cart__pay', disabled: true, text: 'Pick a time to continue', on: { click: function () { pay(); } } });
    payboxEl = el('div', { class: 'cart__paybox' }, [tsBox, sayEl, payEl, el('p', { class: 'cart__pay-note', text: 'You enter your card on Authorize.Net\'s secure form.' })]);
    if (window.ResizeObserver) new ResizeObserver(fitPay).observe(payboxEl); // it grows with the robot-check box, a message, the steps
    return [whenEl, formEl, payboxEl];
  }
  // The Pay area is stuck to the bottom of the cart page: a field that takes focus is scrolled to clear it.
  function fitPay() {
    var body = panelEl && panelEl.querySelector('.cart__panel-body');
    if (body && payboxEl) body.style.scrollPaddingBottom = payboxEl.offsetHeight + 'px';
  }
  // The cart page closed, and the Turnstile box with it: a run still going could never answer, so it
  // is settled now (a pre-run then leaves no token). A times request in flight is dropped and the
  // times load again when the cart opens.
  function leftCart() {
    clearTimeout(reload); reload = null;
    if (timesLoading) { timesSeq++; timesLoading = false; times = null; }
    if (turnstileToken.pending) turnstileToken.pending.done(null);
  }

  // ---------- robot check (Turnstile), loaded on first need ----------
  // Every run settles: a token, or a failure after an error, Turnstile's own timeout, or 20 s without
  // an answer, loading Cloudflare's script included (unless Cloudflare asks the guest to tap the box).
  // Each run gets its own widget, and only the newest run may answer: starting a run settles the one
  // before it as failed, so an answer from a run the page gave up on is dropped, never used.
  var TS_WAIT = 20000, tsScript = null, ts = null, asking = false;
  var ASK = 'Tap the check box to confirm you are not a robot.';
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
          if (asking) { asking = false; tsBox.removeAttribute('data-asking'); if (sayEl.textContent === ASK) say(''); }
          if (t) resolve(t); else reject(new Error('turnstile'));
        }
      };
      if (turnstileToken.pending) turnstileToken.pending.done(null); // an older run never hangs
      turnstileToken.pending = run;
      timer = setTimeout(function () { run.done(null); }, TS_WAIT);
      var mine = function (fn) { return function (x) { if (turnstileToken.pending === run) fn(x); }; };
      var go = function () {
        if (turnstileToken.pending !== run) return; // given up while the script loaded
        if (ts != null) try { window.turnstile.remove(ts); } catch (e) {}
        ts = window.turnstile.render(tsBox, { sitekey: menu.turnstileSiteKey, execution: 'execute', appearance: 'interaction-only',
          callback: mine(function (t) { run.done(t); }),
          'error-callback': mine(function () { run.done(null); }), 'expired-callback': mine(function () { run.done(null); }),
          'timeout-callback': mine(function () { run.done(null); }),
          'before-interactive-callback': mine(function () {
            clearTimeout(timer); asking = true; tsBox.setAttribute('data-asking', 'true');
            // No scrolling: the box is in the Pay area, stuck to the bottom of the cart page, so it is always in view
            // (a scroll here would also fight the room fitPay keeps clear above that area).
            say(ASK);
          }) });
        window.turnstile.execute(ts);
      };
      (window.turnstile ? Promise.resolve() : loadTurnstile()).then(go, function () { run.done(null); });
    });
  }

  // ---------- the robot check before Pay ----------
  // Checkout needs a fresh Turnstile token (the times pass never pays). The pre-run gets it once the
  // cart is open and a time is picked, so it is ready when the card form answers. held: its answer,
  // good for 4.5 min (Turnstile keeps a token 5) and used once. prerun: the pre-run still going.
  var TOKEN_AGE = 270000, held = null, prerun = null;
  function fresh() { return !!held && Date.now() - held.at < TOKEN_AGE; }
  function prerunTs() {
    if (screen !== 'cart' || !start || prerun || fresh() || locked()) return; // locked: checkout's own takeToken owns the widget
    if (turnstileToken.pending) return; // another run (times) owns the widget; its end calls this again
    held = null;
    prerun = turnstileToken().then(function (t) { return t; }, function () { return null; }).then(function (t) {
      prerun = null;
      if (t) held = { token: t, at: Date.now() }; // dropped or failed: no token, takeToken runs fresh
    });
  }
  // The token for one checkout: the pre-run's while it is under 4.5 min old, else a fresh run. A
  // pre-run still going is waited for (its own 20 s limit applies); if it ends without a token, a
  // fresh run follows. Either way the token is used once.
  function takeToken() {
    var use = function () { var t = fresh() ? held.token : null; held = null; return t; };
    var t = use();
    if (t) return Promise.resolve(t);
    if (prerun) return prerun.then(function () { return use() || turnstileToken(); });
    return turnstileToken();
  }

  // ---------- Pay: Authorize.Net's hosted card form ----------
  // The form's answer goes to window.cartCardResponse (data-responseHandler), which posts the checkout.
  var acceptBtn = null;
  function openCardForm() {
    if (acceptBtn) { acceptBtn.click(); return; }
    acceptBtn = el('button', { type: 'button', class: 'AcceptUI', hidden: true, 'data-billingAddressOptions': '{"show":false,"required":false}',
      'data-apiLoginID': menu.payment.loginId, 'data-clientKey': menu.payment.clientKey, 'data-acceptUIFormBtnTxt': 'Pay',
      'data-acceptUIFormHeaderTxt': 'Card details', 'data-paymentOptions': '{"showCreditCard":true,"showBankAccount":false}',
      'data-responseHandler': 'cartCardResponse' });
    root.appendChild(acceptBtn);
    var s = el('script', { src: menu.payment.env === 'production' ? 'https://js.authorize.net/v3/AcceptUI.js' : 'https://jstest.authorize.net/v3/AcceptUI.js', charset: 'utf-8' });
    s.onload = function () { setTimeout(function () { acceptBtn.click(); }, 50); };
    s.onerror = function () { acceptBtn.remove(); acceptBtn = null; busy = false; paintPay(); say('The card form did not load. Please try again.', 'error'); };
    document.body.appendChild(s);
  }
  function pay() {
    if (busy || locked() || !ready()) return;
    if (!formEl.reportValidity()) return;
    busy = true; order = null; paintPay();
    if (!asking) say('');
    prerunTs(); // no token yet, or an old one: get one while the card is typed
    openCardForm();
    // The hosted form has no "closed" event: Pay works again after a short wait.
    setTimeout(function () { if (busy && !order) { busy = false; paintPay(); } }, 4000);
  }

  // ---------- checkout: one order per card-form answer, live progress, the outcome ----------
  // An order is { id, t0, charged, booked, of, lost, tries, resumed, sent, missed, done, timer }. Its id
  // is kept in sessionStorage (cart-order, 30 min), so a refresh asks the Worker about it and never pays
  // again; `sent: 1` is added just before the checkout POST goes out (an older value without it reads
  // as not sent). From the card form's answer until the outcome is handled the cart is locked: a times
  // reload or a robot-check run could otherwise start under the order, or the cart change under a paid order.
  function locked() { return paying || !!ended; }
  function remember(id, sent) {
    var v = { id: id, spa: SPA, at: Date.now() };
    if (sent) v.sent = 1;
    try { sessionStorage.setItem('cart-order', JSON.stringify(v)); } catch (e) {}
  }
  function forget() { try { sessionStorage.removeItem('cart-order'); } catch (e) {} }
  function savedOrder() {
    try { var o = JSON.parse(sessionStorage.getItem('cart-order')); return o && o.spa === SPA && Date.now() - o.at < 30 * 60000 ? o : null; } catch (e) { return null; }
  }
  function unconfirmed() { return 'We could not confirm your order yet. Please do not pay again. Call us' + (menu.phone ? ' at ' + menu.phone : '') + '.'; }
  // Appointments in the cart until the Worker says (`of`): one per person on a per-person line, one
  // for each couples, couples combo or 4-hand line.
  function appointments() { return lines.reduce(function (n, l) { return n + (exact(kindOf(l.kind)) ? 1 : l.qty); }, 0); }

  // The steps follow the Worker: "Checking your time" until the card is charged (a 404 or
  // charged:false keeps it: the order may not be saved yet), then "Card approved" and "Booking
  // massage k of N". booked only goes up: during a reversal the Worker's count falls.
  function progress(r) {
    var o = order;
    if (r && r.pending && r.charged) {
      o.charged = true;
      o.booked = Math.max(o.booked, r.booked || 0);
      if (r.of) o.of = r.of;
    }
    var n = o.of || appointments() || 1, k = Math.min(o.booked + 1, n), on = o.charged;
    var steps = [['Checking your time', on ? 'done' : 'active'], ['Card approved', on ? 'done' : 'todo'],
      ['Booking massage ' + k + ' of ' + n, on ? 'active' : 'todo']];
    if (!progEl) progEl = el('ol', { class: 'cart__progress', 'aria-label': 'Order progress', 'aria-live': 'polite' },
      steps.map(function () { return el('li', { class: 'cart__step' }); }));
    if (!progEl.parentNode && payboxEl) payboxEl.insertBefore(progEl, payboxEl.firstChild); // above the robot-check box, which stays usable
    steps.forEach(function (s, i) { // only what changed, so a screen reader hears each change once
      var li = progEl.children[i];
      if (li.textContent !== s[0]) li.textContent = s[0];
      if (li.getAttribute('data-state') === s[1]) return;
      li.setAttribute('data-state', s[1]);
      if (s[1] === 'active') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  function dropProgress() {
    if (progEl && progEl.parentNode) progEl.parentNode.removeChild(progEl);
    progEl = null;
  }
  // Lock the cart and show the first step at once, so the page never looks frozen (takeToken() can
  // wait up to ~40 s on the robot check).
  function begin(o) {
    o.charged = false; o.booked = 0; o.tries = 0; o.missed = 0;
    order = o; paying = busy = true;
    screen = 'cart'; // the steps are on the cart page: they must never start off screen
    paint();
    progress();
    if (panelEl && !panelEl.contains(document.activeElement)) panelEl.focus({ preventScroll: true });
  }

  // Status checks for the open order: every 700 ms while its checkout request is in flight, every
  // 2.5 s once that answer is lost or says pending, 9 at most, then "do not pay again". While the
  // request is in flight they only move the steps and its own answer decides: a status can be a
  // passing state (during a reversal it reads pending until the refund lands, then reversed).
  // After a refresh (resumed), a 404 for an order whose POST never went out means nothing was charged.
  // One whose POST went out may still be on its way (the Worker saves it within about a second of
  // receiving it), so its 404s are checked again every 700 ms for about 10 s, still locked, before
  // the cart comes back. Any 200 answer means the Worker has it: from then on a 404 never ends it.
  var GRACE = 14;
  function poll(o, wait) {
    o.timer = setTimeout(function () {
      if (o !== order || o.done) return;
      api('/api/cart/order/' + o.id).then(function (r) {
        if (o !== order || o.done) return;
        if (r.status === 404 && o.resumed) return o.sent && ++o.missed <= GRACE ? poll(o, 700) : settle({ nothing: true });
        if (r.status === 200) o.resumed = false;
        if (o.lost && r.status === 200 && !r.pending && (r.ok || r.message)) return settle(r);
        progress(r);
        next(o);
      }, function () { if (o === order && !o.done) next(o); });
    }, wait);
  }
  function next(o) {
    if (o.lost && ++o.tries > 8) return settle({ unconfirmed: true });
    poll(o, o.lost ? 2500 : 700);
  }

  // Where an answer leads. Paid, held, unclear or unconfirmed: the cart is cleared and Pay stays off,
  // because a kept cart would invite a second charge (staff may still approve a held one). Anything
  // else charged nothing, or was reversed: back to the cart as it was, with the Worker's message.
  function settle(r) {
    var o = order;
    if (!o || o.done) return;
    if (r.pending) { o.lost = true; progress(r); return; } // still running: the status checks carry on
    o.done = true; clearTimeout(o.timer);
    if (r.ok && r.thankYouUrl) return thank(o, r.thankYouUrl);
    forget();
    if (r.ok || r.paid || r.held || r.uncertain || r.duplicate || r.unconfirmed) return stop(r.unconfirmed || !r.message ? unconfirmed() : r.message, r.paid ? 'notice' : 'error');
    var refill = r.stage === 'time' || !!r.reversed; // that time is gone: reload the times, keep the message
    if (refill) { start = null; save(); }
    order = null; paying = busy = false;
    dropProgress();
    paint();
    if (refill || times == null) loadTimes(true);
    if (r.stage === 'price') reloadMenu();
    var msg = r.nothing ? '' : r.message || '';
    say(msg, msg && (r.reversed ? 'notice' : 'error'));
  }
  // Paid and booked: clear the cart and the saved order, send the page's own time (card form answer to
  // the redirect) beside the Worker's stage times, then go to the thank-you page.
  function thank(o, url) {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    forget();
    if (o.t0 != null) { // a resumed order has no start time on this page
      var ms = Math.max(1, Math.round(performance.now() - o.t0));
      try { navigator.sendBeacon(API + '/api/cart/order/' + o.id + '/timing', new Blob([JSON.stringify({ pageMs: ms })], { type: 'text/plain' })); } catch (e) {}
      if (window.console && console.info) console.info('cart timing page ' + ms + ' ms');
    }
    location.href = url;
  }
  // The order ended without a booking we can confirm: clear the cart and its storage, keep the message
  // (it is also the cards' notice if the cart is closed), and leave Pay off for this page.
  function stop(msg, kind) {
    ended = notice = msg;
    lines = []; start = null;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    order = null; paying = busy = false; // busy too: closing the cart is refused while it is on (Pay stays off, `ended`)
    dropProgress();
    paint();
    say(msg, kind);
  }
  // A refused total means this page's menu is out of date: load it again, so every price shown and
  // the next shownTotal come from the current menu. If an item in the cart left the menu, the old menu
  // stays (a refresh then drops that item with a notice) and the Worker's message says the total.
  function reloadMenu() {
    api('/api/cart/menu?spa=' + SPA).then(function (r) {
      if (!r.ok || locked()) return;
      var old = menu;
      r.phone = old.phone; menu = r;
      if (!lines.every(validLine)) { menu = old; return; }
      paint();
    }).catch(function () {});
  }

  // Authorize.Net's card form answers here (data-responseHandler). One answer, one order: the cart,
  // time and details are taken now, then the robot-check token, then one checkout.
  window.cartCardResponse = function (res) {
    var t0 = performance.now();
    if (locked()) return; // an order is already under way, or has ended
    if (!res || !res.opaqueData) {
      busy = false; paintPay();
      var m = res && res.messages && res.messages.message && res.messages.message[0];
      say(m && m.text ? m.text : 'Your card was not accepted. Please check it and try again.', 'error');
      return;
    }
    var o = { id: uid(), t0: t0 }, f = formEl.elements;
    var body = { orderId: o.id, spa: SPA, cart: toWorker(), start: start, shownTotal: cartTotal(),
      customer: { name: f.name.value, phone: f.phone.value, email: f.email.value }, opaqueData: res.opaqueData };
    remember(o.id);
    begin(o);
    if (!asking) say('');
    takeToken().then(function (token) {
      if (o !== order) return;
      body.turnstileToken = token;
      poll(o, 700);
      remember(o.id, true); // from here a refresh must allow for the POST arriving late
      api('/api/cart/checkout', { method: 'POST', body: body }).then(function (r) {
        if (o !== order || o.done) return;
        // An answer the page cannot read, or a server error that is not one of checkout's own replies,
        // may come after the charge: the status checks find out what happened.
        if ((!r.ok && !r.message) || (r.status >= 500 && !r.stage)) { o.lost = true; return; }
        settle(r);
      }, function () { if (o === order) o.lost = true; });
    }, function () { // the robot check did not finish, so the order was never sent
      if (o === order) settle({ message: 'The robot check did not finish, so nothing was charged. Tap Pay and book to try again.' });
    });
  };
  // After a refresh mid-payment (or a tab reopened within 30 min): ask about the saved order.
  function resume(saved) {
    screen = 'cart';
    begin({ id: saved.id, t0: null, lost: true, resumed: true, sent: !!saved.sent });
    if (panelEl) panelEl.focus({ preventScroll: true });
    poll(order, 0);
  }

  // ---------- the cards and the cart bar ----------
  function peopleLabel(n) { return n + (n === 1 ? ' person' : ' people'); }
  function noticeEl() { return el('p', { class: 'cart__notice', role: 'status', text: notice }); }
  // The root keeps its children in this order: cards, cart bar, cart page, Add panel.
  function place(node) { root.insertBefore(node, sheetEl && sheetEl.parentNode === root ? sheetEl : null); }
  function cards() {
    return el('div', { class: 'cart__cards' }, menu.kinds.map(function (k) {
      return el('div', { class: 'cart__card', 'data-kind': k.kind }, [
        el('div', { class: 'cart__card-info' }, [
          el('h3', { class: 'cart__card-name', text: k.name }),
          el('p', { class: 'cart__card-sub', text: k.minutes.join(' · ') + ' min' }),
          el('p', { class: 'cart__card-from', text: 'From ' + money(lowestPrice(k)) })]),
        el('button', { type: 'button', class: BTN + ' cart__card-add', 'aria-label': 'Add ' + k.name, text: 'Add', disabled: locked() || !canAdd(k), on: { click: function () { openSheet(k.kind); } } })]);
    }));
  }
  function paintCards() {
    var onCards = screen === 'cards';
    inner.textContent = '';
    [el('h2', { class: 'cart__title', tabindex: '-1', text: 'Book one or more massages' }), // tabindex: the place focus goes when nothing else on the cards can take it
      el('p', { class: 'cart__lead', text: 'Add each massage to your cart. Pay once for everyone.' }),
      onCards && notice ? noticeEl() : null
    ].concat(onCards ? limitEls() : [], [
      cards(),
      el('p', { class: 'cart__alt' }, [el('a', { href: '#book-one', text: 'Booking one massage? Use the calendar below.' })])
    ]).forEach(function (n) { if (n) inner.appendChild(n); });
  }
  // "View cart (N people) · $total": only while the cart is closed and has lines.
  function paintBar() {
    if (barEl && barEl.parentNode) barEl.parentNode.removeChild(barEl);
    barEl = null;
    if (screen === 'cart' || !lines.length) return;
    barEl = el('button', { type: 'button', class: 'cart__bar', text: 'View cart (' + peopleLabel(peopleIn(lines, -1)) + ') · ' + money(cartTotal()), on: { click: function () { openCart('.cart__bar'); } } });
    place(barEl);
  }

  // ---------- the cart page ----------
  function lineTitle(l) {
    var k = kindOf(l.kind), g = l.guests[0];
    return (l.kind === 'single' && g.style ? (menu.styleNames[g.style] || g.style) + ' ' : '') + k.name + (l.qty > 1 ? ' × ' + l.qty : '');
  }
  // What a line shows under its title. Every amount comes from priceLine (nothing is priced here);
  // rows without an amount only say what was chosen: a couples format other than Massage (the title
  // says Massage), combo picks, a guest's style (the title already names a single massage's style),
  // each in its guest's turn.
  function lineRows(line, pl) {
    var k = kindOf(line.kind), q = line.qty, xq = q > 1 ? ' × ' + q : '', two = line.guests.length > 1;
    var rows = [{ label: pl.rows[0].label + (exact(k) ? (line.kind === 'fourhand' ? ', 2 therapists' : ', 2 guests') : xq), amount: pl.rows[0].amount }];
    if (line.format && line.format !== 'massage') rows.push({ label: partName(line.format) });
    line.guests.forEach(function (g, i) {
      var who = two ? 'Guest ' + (i + 1) + ' · ' : '', said = false;
      if (g.picks && g.picks.length) { rows.push({ label: who + g.picks.map(partName).join(' + ') }); said = true; }
      if (getsMassage(line, g)) {
        if (g.style === 'deep') said = true;
        else if (two || line.kind !== 'single') { rows.push({ label: who + (menu.styleNames[g.style] || g.style) }); said = true; }
      }
      // Guests of a couples line are always listed: a guest with nothing to say (Head Spa or Foot
      // format, no extras) gets a bare "Guest N". A Deep Tissue guest is named by the surcharge row.
      if (two && !said) rows.push({ label: 'Guest ' + (i + 1) });
      pl.rows.forEach(function (r) { if (r.guest === i) rows.push({ label: r.label + xq, amount: r.amount, plus: true }); });
    });
    return rows;
  }
  function rowEl(r) {
    return el('div', { class: 'cart__row' }, [el('span', { class: 'cart__row-label', text: r.label }),
      r.amount == null ? null : ' ', r.amount == null ? null : el('span', { class: 'cart__row-amt', text: (r.plus ? '+' : '') + money(r.amount) })]);
  }
  function setQty(i, n) {
    if (locked()) return;
    var l = lines[i];
    n = Math.max(1, Math.min(n, qtyMax(kindOf(l.kind), i)));
    if (n === l.qty) return;
    l.qty = n;
    cartChanged();
  }
  function removeLine(i) {
    if (locked()) return;
    lines.splice(i, 1);
    cartChanged(); // paint() closes the cart page when the last line goes
  }
  function lineEl(l, i) {
    var k = kindOf(l.kind), pl = priceLine(l), name = lineTitle(l), off = locked(), foot = [
      el('button', { type: 'button', class: 'cart__line-edit', 'data-line': i, 'aria-label': 'Edit ' + name, text: 'Edit', disabled: off, on: { click: function () { openSheet(i); } } }),
      el('button', { type: 'button', class: 'cart__line-remove', 'data-line': i, 'aria-label': 'Remove ' + name, text: 'Remove', disabled: off, on: { click: function () { removeLine(i); } } })];
    if (perPerson(k)) foot.push(el('div', { class: 'cart__line-qtybox', role: 'group', 'aria-label': 'How many people' }, [
      el('button', { type: 'button', class: 'cart__line-minus', 'data-line': i, 'aria-label': 'One fewer person', text: '−', disabled: off || l.qty <= 1, on: { click: function () { setQty(i, l.qty - 1); } } }),
      el('span', { class: 'cart__line-qty', text: String(l.qty) }),
      el('button', { type: 'button', class: 'cart__line-plus', 'data-line': i, 'aria-label': 'One more person', text: '+', disabled: off || l.qty >= qtyMax(k, i), on: { click: function () { setQty(i, l.qty + 1); } } })]));
    return el('div', { class: 'cart__line', 'data-line': i }, [
      el('div', { class: 'cart__line-head' }, [el('h3', { class: 'cart__line-title', text: name }), ' ', el('span', { class: 'cart__line-total', text: money(pl.total) })]),
      el('div', { class: 'cart__rows' }, lineRows(l, pl).map(rowEl)),
      el('div', { class: 'cart__line-foot' }, foot)]);
  }
  function sumRow(cls, label, amount) {
    return el('p', { class: cls }, [el('span', { class: 'cart__sum-label', text: label }), ' ', el('span', { class: 'cart__sum-amt', text: money(amount) })]);
  }
  // The whole page: lines, "Add another massage", totals, then the time, details and Pay sections at
  // the end of .cart__panel-body. While the cart is open the page stays: each redraw rebuilds the
  // order part (.cart__order) and updates the rest in place, so a typed field keeps its focus.
  function paintPanel() {
    if (screen !== 'cart') {
      if (panelEl) {
        var held = panelEl.contains(document.activeElement); // the last line removed, an ended order closed: focus must not fall to the page
        if (panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
        panelEl = null;
        leftCart();
        if (held) focusBack(cartFrom);
      }
      return;
    }
    var a = document.activeElement, had = !!panelEl && panelEl.contains(a), key = had && a.tagName === 'BUTTON' ? keyOf(a) : '';
    if (!panelEl) {
      orderEl = el('div', { class: 'cart__order' });
      // A tap on the dimmed page beside the panel (wide screens) lands on the panel's own box and closes it.
      panelEl = el('div', { class: 'cart__panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Your cart', tabindex: '-1',
        on: { click: function (e) { if (e.target === panelEl) closeCart(); } } }, [
        trap('start'),
        el('div', { class: 'cart__panel-head' }, [
          el('h2', { class: 'cart__panel-title', text: 'Your cart' }),
          el('button', { type: 'button', class: 'cart__panel-close', 'aria-label': 'Close cart', text: '×', on: { click: function () { closeCart(); } } })]),
        el('div', { class: 'cart__panel-body' }, [orderEl].concat(checkoutEls())),
        trap('end')]);
      place(panelEl);
      fitPay();
    }
    orderEl.textContent = '';
    // An ended order leaves only its message and Pay, off: no lines, times or details.
    if (!ended) [notice ? noticeEl() : null,
      el('div', { class: 'cart__lines' }, lines.map(lineEl)),
      el('button', { type: 'button', class: 'cart__more', text: 'Add another massage', disabled: locked(), on: { click: function () { closeCart(true); } } })
    ].concat(limitEls(), [
      el('div', { class: 'cart__sum' }, [
        sumRow('cart__subtotal', 'Subtotal (' + peopleLabel(peopleIn(lines, -1)) + ')', cartTotal()),
        sumRow('cart__total', 'Total today', cartTotal())])
    ]).forEach(function (n) { if (n) orderEl.appendChild(n); });
    whenEl.hidden = formEl.hidden = !!ended;
    panelEl.querySelector('.cart__panel-close').disabled = paying; // the progress stays in view until the order is settled
    paintWhen();
    paintPay();
    if (had && !panelEl.contains(document.activeElement)) refocus(panelEl, key);
  }
  // Opening the page loads the times when there are none yet (first open: today, or the next day
  // with times), and starts the robot check when a time is already picked (after a refresh).
  // from: the control that opened the cart (a selector), so Escape and Close can give focus back to it.
  function openCart(from) {
    if (screen !== 'cart') cartFrom = from || '';
    screen = 'cart';
    paint();
    if (panelEl) panelEl.focus({ preventScroll: true });
    if (times == null && !reload && !timesLoading) loadTimes();
    prerunTs();
  }
  // toCards: Add another massage, which goes on to the service cards; otherwise focus goes back to the opener.
  function closeCart(toCards) {
    if (paying || busy) return; // the card form is open, or a payment is under way: the cart stays
    screen = 'cards';
    paint();
    focusBack(toCards === true ? '' : cartFrom);
  }
  // Redraw everything that shows the cart. An empty cart has no page to show, unless an order is
  // running or has ended (its progress or message is on that page).
  function paint() {
    if (screen === 'cart' && !lines.length && !locked()) screen = 'cards';
    paintCards();
    paintBar();
    paintPanel();
    root.setAttribute('data-screen', screen);
    syncLock();
    // After the lock, so a scroll position being saved or put back is never clamped by a page that just got shorter.
    document.body.classList.toggle('cart-has-bar', lines.length > 0);
  }
  function build() {
    root.textContent = '';
    inner = el('div', { class: 'cart__inner' });
    root.appendChild(inner);
    root.hidden = false;
    paint();
  }

  // ---------- start ----------
  // The stylesheet comes in before the cards are drawn, so they never show unstyled and then jump (a
  // layout shift). One that fails, or takes over 4 s, no longer holds the cart back.
  function styled() {
    var link = document.querySelector('link[href="' + CSS + '"]');
    if (!link) { link = el('link', { rel: 'stylesheet', href: CSS }); document.head.appendChild(link); }
    return link.sheet ? Promise.resolve() : new Promise(function (ok) {
      link.addEventListener('load', ok); link.addEventListener('error', ok); setTimeout(ok, 4000);
    });
  }
  function startCart() {
    var css = styled();
    api('/api/cart/menu?spa=' + SPA).then(function (r) { return css.then(function () { return r; }); }).then(function (r) {
      if (!r.ok) {
        // A closed cart shows only its message and the phone, even on a staff preview where the section is still hidden.
        if (r.closed || !root.hidden) {
          var phone = root.getAttribute('data-phone') || '', msg = r.message || (r.closed ? 'Online booking is closed right now.' : 'Online group booking is not available right now.');
          // The Worker's message already names the phone; if it does not, add this page's.
          if (r.closed && phone && msg.replace(/\D/g, '').indexOf(phone.replace(/\D/g, '')) < 0) msg += ' Please call us at ' + phone + '.';
          root.textContent = ''; root.appendChild(el('p', { class: 'cart__closed', text: msg }));
          root.hidden = false;
        }
        return;
      }
      menu = r; menu.phone = root.getAttribute('data-phone') || '';
      // Test hook for the browser harness (on the element, never a global).
      root.__cart = {
        price: function (ls) { return { lines: ls.map(function (l) { return priceLine(l).total; }), total: sumLines(ls) }; },
        state: function () { return lines; },
        draft: function () { return draft; },
        openSheet: openSheet,
        closeSheet: closeSheet,
        toWorker: toWorker,
        validLine: validLine,
        when: function () { return { day: day, start: start }; },
        takeToken: takeToken,
        prerun: function () { return { held: fresh(), pending: !!prerun }; }
      };
      restore();
      document.addEventListener('keydown', onKey);
      build();
      var saved = savedOrder();
      if (saved) resume(saved);
    }).catch(function () {});
  }

  if (document.querySelector('script[src*="/after-paint.js"]')) (window.__afterPaint = window.__afterPaint || []).push(startCart);
  else startCart();
})();
