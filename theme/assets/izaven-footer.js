/**
 * IZAVEN footer: reveal on entry, and phone accordions.
 * The footer is complete without this file. Columns are <details open> in the
 * markup, so without JS everything is visible; this script only collapses
 * them on phones and keeps them open on larger screens.
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 749px)');

  function setup(footer) {
    if (footer.__izfReady) return;
    footer.__izfReady = true;
    footer.classList.add('izf-js');

    var panels = Array.prototype.slice.call(footer.querySelectorAll('.izf__acc'));

    function apply() {
      panels.forEach(function (d) { d.open = !phone.matches; });
    }
    apply();
    (phone.addEventListener ? phone.addEventListener.bind(phone, 'change') : phone.addListener.bind(phone))(apply);

    panels.forEach(function (d) {
      d.querySelector('summary').addEventListener('click', function (e) {
        if (!phone.matches) e.preventDefault(); // wide screens: columns stay open
      });
    });

    if (reduce || !('IntersectionObserver' in window)) { footer.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        footer.classList.add('is-in');
        io.disconnect();
      });
    }, { threshold: 0.08 });
    io.observe(footer);
  }

  function init() { document.querySelectorAll('[data-izf]').forEach(setup); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', init);
})();
