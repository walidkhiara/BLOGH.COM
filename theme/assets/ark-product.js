
(function () {
  'use strict';
  var root = document.querySelector('[data-ark]');
  if (!root) return;
  /* Stable layers: pin the studio background and the dock to <body> so no theme wrapper can scroll or clip them. */
  ['.ark__bg', '.ark-dock'].forEach(function (sel) { var n = root.querySelector(sel); if (n) document.body.appendChild(n); });
  var $ = function (s, c) { return (c || root).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || root).querySelectorAll(s)); };

  var variants = [], cfg = { lax: .02, lay: .29, rax: .98, ray: .48 };
  try { variants = JSON.parse(document.querySelector('[data-ark-variants]').textContent); } catch (e) {}
  try { cfg = JSON.parse(document.querySelector('[data-ark-config]').textContent); } catch (e) {}

  /* ---------- accordions ---------- */
  function setAcc(acc, open) {
    acc.classList.toggle('is-open', open);
    var b = $('.ark-acc__h', acc), p = $('.ark-acc__p', acc);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    drawSoon();
  }
  $$('.ark-acc').forEach(function (acc) {
    $('.ark-acc__h', acc).addEventListener('click', function () {
      setAcc(acc, !acc.classList.contains('is-open'));
    });
    $('.ark-acc__p', acc).addEventListener('transitionend', drawSoon);
  });
  $$('[data-ark-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var acc = $('[data-acc="' + b.getAttribute('data-ark-open') + '"]');
      if (!acc) return;
      setAcc(acc, true);
      var sc = $('[data-ark-scroll]');
      if (sc) setTimeout(function () { sc.scrollTo({ top: acc.offsetTop - 4, behavior: 'smooth' }); }, 60);
    });
  });

  /* ---------- gallery ---------- */
  var main = $('[data-ark-main]');
  function showThumb(btn) {
    if (!main || !btn) return;
    $$('.ark-th').forEach(function (t) { t.classList.remove('is-on'); t.removeAttribute('aria-current'); });
    btn.classList.add('is-on'); btn.setAttribute('aria-current', 'true');
    main.src = btn.getAttribute('data-src');
    main.srcset = btn.getAttribute('data-srcset');
    main.width = btn.getAttribute('data-w'); main.height = btn.getAttribute('data-h');
    main.alt = btn.getAttribute('data-alt') || '';
  }
  $$('.ark-th').forEach(function (t) { t.addEventListener('click', function () { showThumb(t); }); });
  if (main) main.addEventListener('load', drawSoon);

  /* ---------- variants ---------- */
  var form = $('#ark-form');
  var idInput = $('[data-ark-id]');
  var optEls = $$('[data-ark-opt]');
  var sel = [];
  optEls.forEach(function (fs, i) {
    var on = $('[aria-checked="true"]', fs);
    sel[+fs.getAttribute('data-ark-opt')] = on ? on.getAttribute('data-val') : null;
  });
  function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
  function norm(s) { return decode(String(s)); }

  function matches(vr, picks, skip) {
    for (var i = 0; i < picks.length; i++) {
      if (i === skip || picks[i] == null) continue;
      if (norm(vr.options[i]) !== norm(picks[i])) return false;
    }
    return true;
  }
  function find(picks) {
    for (var i = 0; i < variants.length; i++) if (matches(variants[i], picks, -1)) return variants[i];
    return null;
  }
  function refreshOptionStates() {
    optEls.forEach(function (fs) {
      var oi = +fs.getAttribute('data-ark-opt');
      $$('[data-val]', fs).forEach(function (btn) {
        var val = btn.getAttribute('data-val');
        var ok = variants.some(function (vr) { return norm(vr.options[oi]) === norm(val) && vr.available && matches(vr, sel, oi); });
        btn.disabled = !ok;
        btn.setAttribute('aria-checked', norm(sel[oi]) === norm(val) ? 'true' : 'false');
      });
    });
  }
  function applyVariant(vr) {
    if (!vr) return;
    idInput.value = vr.id;
    $$('[data-ark-price]').forEach(function (n) { n.textContent = vr.price; });
    var was = $('[data-ark-was]');
    was.textContent = vr.compare; was.hidden = !vr.onsale;
    var tag = $('[data-ark-tag]');
    tag.hidden = vr.available && !vr.pre;
    tag.textContent = vr.available ? 'Pre-order' : 'Sold out';
    var sub = $('[data-ark-submit]');
    sub.disabled = !vr.available;
    var now = $('[data-ark-now]'); if (now) now.disabled = !vr.available;
    sub.textContent = vr.available ? (vr.pre ? 'Pre-order' : 'Add to bag') : 'Sold out';
    if (vr.media) { var th = $('.ark-th[data-media="' + vr.media + '"]'); if (th) showThumb(th); }
    try { var u = new URL(location.href); u.searchParams.set('variant', vr.id); history.replaceState(null, '', u); } catch (e) {}
  }
  optEls.forEach(function (fs) {
    var oi = +fs.getAttribute('data-ark-opt');
    $$('[data-val]', fs).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        sel[oi] = btn.getAttribute('data-val');
        var vr = find(sel);
        if (!vr) {  /* keep the clicked value, relax the others to the nearest real variant */
          vr = variants.filter(function (x) { return norm(x.options[oi]) === norm(sel[oi]) && x.available; })[0] || null;
          if (vr) sel = vr.options.slice();
        }
        refreshOptionStates(); applyVariant(vr);
      });
      btn.addEventListener('keydown', function (e) {
        var k = e.key; if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
        var all = $$('[data-val]:not(:disabled)', fs); var i = all.indexOf(btn);
        var n = all[(i + (k === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
        if (n) { n.focus(); n.click(); e.preventDefault(); }
      });
    });
  });
  refreshOptionStates();

  /* ---------- save (this device only; no wishlist app is installed) ---------- */
  var save = $('[data-ark-save]');
  if (save) {
    var KEY = 'izaven:saved', h = save.getAttribute('data-handle');
    var read = function () { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
    var paint = function () { var on = read().indexOf(h) > -1; save.setAttribute('aria-pressed', on ? 'true' : 'false'); save.textContent = on ? 'Saved' : 'Save'; };
    save.addEventListener('click', function () {
      var l = read(), i = l.indexOf(h);
      if (i > -1) l.splice(i, 1); else l.push(h);
      try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {}
      paint();
    });
    paint();
  }

  /* ---------- delivery dates (calendar days, owner-set range) ---------- */
  var dl = $('[data-ark-delivery]');
  if (dl) {
    var dmin = parseInt(dl.getAttribute('data-min'), 10), dmax = parseInt(dl.getAttribute('data-max'), 10);
    if (isFinite(dmin) && isFinite(dmax) && dmax > 0) {
      try {
        var t0 = new Date(), t1 = new Date(), t2 = new Date();
        t1.setDate(t0.getDate() + dmin); t2.setDate(t0.getDate() + dmax);
        var f = function (d) { return d.toLocaleDateString(document.documentElement.lang || 'en', { month: 'short', day: 'numeric' }); };
        document.querySelectorAll('[data-ark-dates]').forEach(function (n) { n.textContent = f(t1) + ' – ' + f(t2) + ' (' + dmin + '–' + dmax + ' days)'; });
      } catch (e) {}
    }
  }

  /* ---------- liquid bag drawer ---------- */
  var cartEl = $('[data-ark-cart]');
  var cc = { pct: 30, cur: 'USD', checkout: '/checkout' }, cands = [];
  try { cc = JSON.parse(document.querySelector('[data-ark-cart-cfg]').textContent); } catch (e) {}
  try { cands = JSON.parse(document.querySelector('[data-ark-cands]').textContent); } catch (e) {}
  var cartState = null, lastFocus = null;
  function money(c) {
    try { return (c / 100).toLocaleString(undefined, { style: 'currency', currency: cc.cur }); }
    catch (e) { return '$' + (c / 100).toFixed(2); }
  }
  function mk(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function setCount(n) { $$('[data-ark-count]').forEach(function (e) { e.textContent = n; e.hidden = !n; }); }
  function cartFetch(url, body) {
    return fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) } : { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Bag error'); return j; }); });
  }
  function thumbUrl(u) { if (!u) return ''; return u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=200'; }

  function renderCart(c) {
    cartState = c; setCount(c.item_count);
    var list = $('[data-ark-cart-list]'); list.innerHTML = '';
    var has = c.items.length > 0;
    $('[data-ark-cart-empty]').hidden = has;
    $('[data-ark-cart-foot]').hidden = !has;
    $('[data-ark-cart-n]').textContent = has ? '/ ' + c.item_count : '';
    c.items.forEach(function (it, i) {
      var li = mk('li', 'ark-ci');
      var a = mk('a', 'ark-ci__img'); a.href = it.url;
      if (it.image) { var im = mk('img'); im.src = thumbUrl(it.image); im.alt = it.product_title; im.width = 78; im.height = 98; im.loading = 'lazy'; a.appendChild(im); }
      var mid = mk('div');
      var t = mk('a', 'ark-ci__t', it.product_title); t.href = it.url; mid.appendChild(t);
      if (it.variant_title && it.variant_title !== 'Default Title') mid.appendChild(mk('p', 'ark-ci__v', it.variant_title));
      var p = mk('p', 'ark-ci__p');
      if (it.final_line_price < it.original_line_price) { p.appendChild(mk('s', null, money(it.original_line_price))); }
      p.appendChild(mk('b', null, money(it.final_line_price)));
      mid.appendChild(p);
      (it.line_level_discount_allocations || []).forEach(function (d) {
        var ti = d.discount_application && d.discount_application.title; if (ti) mid.appendChild(mk('p', 'ark-ci__d', ti));
      });
      var q = mk('div', 'ark-ci__q');
      var minus = mk('button', null, '−'); minus.type = 'button'; minus.setAttribute('aria-label', 'Decrease quantity');
      var qn = mk('span', null, String(it.quantity));
      var plus = mk('button', null, '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'Increase quantity');
      minus.addEventListener('click', function () { change(i + 1, it.quantity - 1); });
      plus.addEventListener('click', function () { change(i + 1, it.quantity + 1); });
      q.appendChild(minus); q.appendChild(qn); q.appendChild(plus); mid.appendChild(q);
      var rm = mk('button', 'ark-ci__rm', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', function () { change(i + 1, 0); });
      li.appendChild(a); li.appendChild(mid); li.appendChild(rm); list.appendChild(li);
    });
    $('[data-ark-cart-sub]').textContent = money(c.original_total_price);
    var dr = $('[data-ark-cart-disc-row]'); dr.hidden = !(c.total_discount > 0);
    $('[data-ark-cart-disc]').textContent = '−' + money(c.total_discount);
    $('[data-ark-cart-total]').textContent = money(c.total_price);

    /* second-piece suggestions: only from the owner's bundle collection, only if not already in the bag */
    var inBag = {}; c.items.forEach(function (it) { inBag[it.product_id] = 1; });
    var sug = cands.filter(function (x) { return !inBag[x.pid]; }).slice(0, 2);
    var sl = $('[data-ark-cart-sug-list]'); sl.innerHTML = '';
    $('[data-ark-cart-sug]').hidden = !(has && sug.length);
    sug.forEach(function (x) {
      var li = mk('li', 'ark-si');
      if (x.img) { var im = mk('img'); im.src = x.img; im.alt = ''; im.width = 52; im.height = 64; im.loading = 'lazy'; li.appendChild(im); } else li.appendChild(mk('span'));
      var d = mk('div'); d.appendChild(mk('b', null, x.title));
      d.appendChild(mk('small', null, money(x.price) + ' → ' + money(Math.round(x.price * (100 - cc.pct) / 100))));
      var b = mk('button', null, 'Add'); b.type = 'button';
      b.addEventListener('click', function () { b.disabled = true; add({ id: x.vid, quantity: 1 }).catch(function () { b.disabled = false; }); });
      li.appendChild(d); li.appendChild(b); sl.appendChild(li);
    });
  }
  function refresh() { return cartFetch('/cart.js').then(renderCart).catch(function () {}); }
  function change(line, qty) { return cartFetch('/cart/change.js', { line: line, quantity: qty }).then(renderCart).catch(function () {}); }
  function add(item) { return cartFetch('/cart/add.js', { items: [item] }).then(refresh); }

  function openCart() {
    if (!cartEl) return;
    lastFocus = document.activeElement;
    cartEl.hidden = false;
    document.documentElement.classList.add('ark-lock');
    requestAnimationFrame(function () { requestAnimationFrame(function () { cartEl.classList.add('is-open'); }); });
    var panel = $('.ark-cart__panel'); if (panel) panel.focus();
    refresh();
  }
  function closeCart() {
    if (!cartEl || cartEl.hidden) return;
    cartEl.classList.remove('is-open');
    document.documentElement.classList.remove('ark-lock');
    setTimeout(function () { cartEl.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('[data-ark-cart-close]').forEach(function (b) { b.addEventListener('click', closeCart); });
  $$('[data-ark-bag]').forEach(function (a) { a.addEventListener('click', function (e) { if (!cartEl) return; e.preventDefault(); openCart(); }); });
  document.addEventListener('keydown', function (e) {
    if (!cartEl || cartEl.hidden) return;
    if (e.key === 'Escape') { closeCart(); return; }
    if (e.key === 'Tab') {
      var f = $$('a[href],button:not(:disabled)', $('.ark-cart__panel')).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === $('.ark-cart__panel'))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });

  /* ---------- add to bag / buy now ---------- */
  var status = $('[data-ark-status]');
  function say(msg, err) { status.textContent = msg; status.hidden = !msg; status.classList.toggle('is-err', !!err); }
  function submitToCart(btn, onDone) {
    if (btn.disabled) return;
    var label = btn.textContent; btn.disabled = true; btn.textContent = 'Adding…'; say('');
    fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.description || j.message || 'Could not add'); return j; }); })
      .then(function () { onDone(); })
      .catch(function (err) { say(String(err.message || 'Could not add to bag'), true); })
      .then(function () { btn.disabled = false; btn.textContent = label; });
  }
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitToCart($('[data-ark-submit]'), function () { document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true })); openCart(); });
  });
  var nowBtn = $('[data-ark-now]');
  if (nowBtn) nowBtn.addEventListener('click', function () {
    submitToCart(nowBtn, function () { window.location.href = cc.checkout || '/checkout'; });
  });

  var bgv = document.querySelector('.ark__bgvid');
  if (bgv && window.matchMedia('(prefers-reduced-motion:reduce)').matches) { bgv.removeAttribute('autoplay'); try { bgv.pause(); } catch (e) {} }

  /* ---------- connector lines ---------- */
  var stage = $('[data-ark-stage]'), svg = $('[data-ark-lines]');
  var mq = window.matchMedia('(min-width:1000px)');
  var raf = 0;
  function drawSoon() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function rel(el) {
    var r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
    return { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top, w: r.width, h: r.height };
  }
  function imageBox() {
    var box = rel($('[data-ark-model]'));
    var nw = main ? (main.naturalWidth || +main.getAttribute('width')) : 0;
    var nh = main ? (main.naturalHeight || +main.getAttribute('height')) : 0;
    if (!main) { var ph = $('[data-ark-main-ph]'); nw = 500; nh = 900; }
    if (!nw || !nh) return box;
    var sc = Math.min(box.w / nw, box.h / nh), iw = nw * sc, ih = nh * sc;
    return { l: box.l + (box.w - iw) / 2, t: box.t, w: iw, h: ih };   /* object-position: center top */
  }
  function path(sx, sy, ax, ay, dir) {
    /* dir = 1: panel is on the left of the garment, -1: on the right */
    var dy = Math.abs(ay - sy), dx = dy * .64;
    var kx = ax - dir * dx;
    if ((dir === 1 && kx <= sx + 6) || (dir === -1 && kx >= sx - 6)) return 'M' + sx + ' ' + sy + 'L' + ax + ' ' + ay;
    return 'M' + sx + ' ' + sy + 'H' + kx + 'L' + ax + ' ' + ay;
  }
  function draw() {
    if (!mq.matches || !stage || !svg) { if (svg) svg.innerHTML = ''; return; }
    var ib = imageBox(), L = $('.ark-panel--l'), R = $('.ark-panel--r');
    if (!L || !R) return;
    var l = rel(L), r = rel(R), t = rel($('[data-ark-title]')), b = rel($('[data-ark-buy]'));
    var lx = ib.l + ib.w * cfg.lax, ly = ib.t + ib.h * cfg.lay;
    var rx = ib.l + ib.w * cfg.rax, ry = ib.t + ib.h * cfg.ray;
    var d1 = path(l.r, t.t + t.h / 2, lx, ly, 1);
    var d2 = path(r.l, b.t + b.h / 2, rx, ry, -1);
    svg.setAttribute('viewBox', '0 0 ' + stage.clientWidth + ' ' + stage.clientHeight);
    svg.innerHTML = '<path d="' + d1 + '"/><path d="' + d2 + '"/>';
  }
  if ('ResizeObserver' in window && stage) new ResizeObserver(drawSoon).observe(stage);
  window.addEventListener('resize', drawSoon);
  if (mq.addEventListener) mq.addEventListener('change', drawSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSoon);
  window.addEventListener('load', drawSoon);
  draw();
})();
