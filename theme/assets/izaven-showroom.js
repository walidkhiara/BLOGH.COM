/**
 * IZAVEN showroom: entrance animation, and a lazy hook for the placement editor.
 * The editor (assets/izaven-editor.js) is only fetched when the address carries
 * ?izaven-editor=1, so normal visitors never download it.
 */
(function () {
  if (window.__izShowroom) return;
  window.__izShowroom = true;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wantsEditor = /[?&]izaven-editor(=|&|$)/.test(window.location.search);

  function reveal(stage) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      stage.classList.add('is-in');
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          stage.classList.add('is-in');
          io.disconnect();
        });
      },
      { threshold: 0.12 }
    );
    io.observe(stage);
  }

  function loadEditor(root) {
    var src = root.getAttribute('data-editor-src');
    if (!src) return;
    var script = document.createElement('script');
    script.src = src;
    script.onload = function () {
      if (window.IzavenEditor) window.IzavenEditor.open(root);
    };
    document.head.appendChild(script);
  }

  function designModeHint(root) {
    var theme = window.Shopify && window.Shopify.theme;
    if (!theme || document.querySelector('.iz-editor-hint')) return;
    var link = document.createElement('a');
    link.className = 'iz-editor-hint';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open placement editor';
    link.href = window.location.origin + '/?preview_theme_id=' + theme.id + '&izaven-editor=1';
    link.style.cssText =
      'position:fixed;left:16px;bottom:16px;z-index:2147483000;padding:10px 16px;background:#0b0b0d;color:#ffeed6;' +
      'border:1px solid rgba(255,238,214,.5);font:600 11px/1 system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;text-decoration:none';
    root.appendChild(link);
  }

  /**
   * Auto-switch: a placement with data-iz-switch holds two products in one grid cell and
   * crossfades between them every N seconds (CSS does the animation; this only flips a class).
   * It stays still for visitors who prefer reduced motion, while the tab is hidden, while the
   * studio is off screen, and while the visitor hovers or focuses the product.
   */
  function startSwitching(root) {
    var items = root.querySelectorAll('[data-iz-switch]');
    if (!items.length || reduceMotion) return;
    var stage = root.querySelector('[data-iz-stage]');
    var onScreen = !('IntersectionObserver' in window);
    var players = [];

    items.forEach(function (item, order) {
      var slides = item.querySelectorAll('.iz-sw__slide');
      if (slides.length < 2) return;
      var secs = parseFloat(item.getAttribute('data-iz-switch'));
      var ms = Math.max(1000, (isNaN(secs) ? 4 : secs) * 1000);
      var current = 0; var timer = null; var started = false; var held = false;

      function flip() {
        timer = null;
        if (!document.body.contains(item)) return;
        var next = 1 - current;
        slides[current].classList.remove('is-current');
        slides[current].setAttribute('aria-hidden', 'true');
        slides[next].classList.add('is-current');
        slides[next].removeAttribute('aria-hidden');
        item.setAttribute('href', slides[next].getAttribute('data-href'));
        current = next;
        update();
      }
      function update() {
        var on = onScreen && !document.hidden && !held;
        if (on && timer === null) {
          // the first swap of each product is offset a little so several do not change on the same frame
          timer = setTimeout(flip, ms + (started ? 0 : order * 400));
          started = true;
        } else if (!on && timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      }
      item.addEventListener('mouseenter', function () { held = true; update(); });
      item.addEventListener('mouseleave', function () { held = false; update(); });
      item.addEventListener('focusin', function () { held = true; update(); });
      item.addEventListener('focusout', function () { held = false; update(); });
      players.push(update);
    });

    function updateAll() { players.forEach(function (u) { u(); }); }
    document.addEventListener('visibilitychange', updateAll);
    if (stage && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        updateAll();
      }, { threshold: 0.05 }).observe(stage);
    } else updateAll();
  }

  function init(root) {
    if (!root || root.__izReady) return;
    root.__izReady = true;
    root.classList.add('iz-js');
    var stage = root.querySelector('[data-iz-stage]');
    if (stage) reveal(stage);
    if (wantsEditor) loadEditor(root); // the editor shows the original product, never the swap
    else {
      startSwitching(root);
      if (window.Shopify && window.Shopify.designMode) designModeHint(root);
    }
  }

  function initAll() {
    document.querySelectorAll('[data-iz-root]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  document.addEventListener('shopify:section:load', function (event) {
    init(event.target && event.target.querySelector('[data-iz-root]'));
  });
})();
