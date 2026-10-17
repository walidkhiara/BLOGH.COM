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

  function init(root) {
    if (!root || root.__izReady) return;
    root.__izReady = true;
    root.classList.add('iz-js');
    var stage = root.querySelector('[data-iz-stage]');
    if (stage) reveal(stage);
    if (wantsEditor) loadEditor(root);
    else if (window.Shopify && window.Shopify.designMode) designModeHint(root);
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
