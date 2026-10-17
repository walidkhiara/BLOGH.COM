/* BLOGH Performance — storefront behaviour.
   No dependencies. Every module is progressive: the markup works as plain
   links and forms when this file fails to load. */
(() => {
  'use strict';

  const theme = window.theme || { routes: {}, strings: {} };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const debounce = (fn, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

  const formatMoney = (cents, format = theme.moneyFormat || '€{{amount}}') => {
    const value = Number(cents) / 100;
    const fmt = (n, decimals, thousands, decimal) => {
      const [int, frac] = n.toFixed(decimals).split('.');
      const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return frac ? withSep + decimal + frac : withSep;
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return fmt(value, 0, ',', '.');
        case 'amount_with_comma_separator': return fmt(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(value, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmt(value, 2, "'", '.');
        case 'amount_with_space_separator': return fmt(value, 2, ' ', ',');
        default: return fmt(value, 2, ',', '.');
      }
    });
  };

  /* ---------------------------------------------------------------------
     Focus trap + scroll lock shared by drawers, modals and search.
     --------------------------------------------------------------------- */
  const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let activeLayer = null;

  const openLayer = (el, { onClose, initialFocus } = {}) => {
    if (activeLayer && activeLayer.el !== el) closeLayer();
    const returnFocus = document.activeElement;
    const keydown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeLayer(); return; }
      if (e.key !== 'Tab') return;
      const items = $$(focusable, el).filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    activeLayer = { el, onClose, returnFocus, keydown };
    document.addEventListener('keydown', keydown);
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbar ? `${scrollbar}px` : '';
    document.body.classList.add('is-locked');
    el.classList.add('is-open');
    requestAnimationFrame(() => (initialFocus || el).focus({ preventScroll: true }));
  };

  const closeLayer = () => {
    if (!activeLayer) return;
    const { el, onClose, returnFocus, keydown } = activeLayer;
    activeLayer = null;
    document.removeEventListener('keydown', keydown);
    el.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    document.body.style.paddingRight = '';
    if (onClose) onClose();
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
  };

  /* ---------------------------------------------------------------------
     Drawers (menu, cart, facets)
     --------------------------------------------------------------------- */
  const Drawer = {
    open(name, trigger) {
      const drawer = $(`[data-drawer="${name}"]`);
      if (!drawer) return false;
      const overlay = $(`[data-overlay="${name}"]`);
      overlay && overlay.classList.add('is-open');
      $$(`[data-open-drawer="${name}"]`).forEach((b) => b.setAttribute('aria-expanded', 'true'));
      openLayer(drawer, {
        onClose: () => {
          overlay && overlay.classList.remove('is-open');
          $$(`[data-open-drawer="${name}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
        },
      });
      return true;
    },
    close: closeLayer,
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-drawer]');
    if (opener) {
      if (Drawer.open(opener.dataset.openDrawer, opener)) e.preventDefault();
      return;
    }
    const closer = e.target.closest('[data-close-drawer]');
    if (closer && closer.type !== 'submit') { e.preventDefault(); Drawer.close(); }
  });

  /* ---------------------------------------------------------------------
     Announcement bar rotation
     --------------------------------------------------------------------- */
  $$('[data-announcement]').forEach((bar) => {
    const msgs = $$('.announcement__msg', bar);
    if (msgs.length < 2 || reducedMotion.matches) return;
    let i = 0;
    let paused = false;
    bar.addEventListener('mouseenter', () => (paused = true));
    bar.addEventListener('mouseleave', () => (paused = false));
    bar.addEventListener('focusin', () => (paused = true));
    bar.addEventListener('focusout', () => (paused = false));
    setInterval(() => {
      if (paused || document.hidden) return;
      msgs[i].setAttribute('aria-hidden', 'true');
      i = (i + 1) % msgs.length;
      msgs[i].removeAttribute('aria-hidden');
    }, Number(bar.dataset.interval) || 5000);
  });

  /* ---------------------------------------------------------------------
     Header: mega menu with hover intent + keyboard, hide on scroll
     --------------------------------------------------------------------- */
  const header = $('[data-header]');
  if (header) {
    const inner = $('[data-header-inner]', header);
    const items = $$('[data-mega]', header);
    let closeTimer;

    const setOpen = (item, open) => {
      item.classList.toggle('is-open', open);
      const link = $('.nav__link', item);
      link && link.setAttribute('aria-expanded', String(open));
    };
    const closeAll = (except) => items.forEach((it) => it !== except && setOpen(it, false));
    const sync = () => inner.classList.toggle('has-open-mega', items.some((it) => it.classList.contains('is-open')));

    items.forEach((item) => {
      const link = $('.nav__link', item);
      item.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(closeTimer);
        closeAll(item);
        setOpen(item, true);
        sync();
      });
      item.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        closeTimer = setTimeout(() => { setOpen(item, false); sync(); }, 140);
      });
      // Touch: first tap opens, second follows the link.
      link.addEventListener('click', (e) => {
        if (!item.classList.contains('is-open') && window.matchMedia('(hover: none)').matches) {
          e.preventDefault();
          closeAll(item);
          setOpen(item, true);
          sync();
        }
      });
      link.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || (e.key === ' ' && !item.classList.contains('is-open'))) {
          e.preventDefault();
          closeAll(item);
          setOpen(item, true);
          sync();
          const first = $('.mega a', item);
          first && first.focus();
        }
      });
      item.addEventListener('focusout', (e) => {
        if (!item.contains(e.relatedTarget)) { setOpen(item, false); sync(); }
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = items.find((it) => it.classList.contains('is-open'));
      if (open) { setOpen(open, false); sync(); $('.nav__link', open).focus(); }
    });

    // Hide on scroll down, reveal on scroll up. Toolbars follow via --sticky-top.
    const root = document.documentElement;
    const setStickyTop = () => root.style.setProperty('--sticky-top', header.classList.contains('is-hidden') ? '0px' : `${header.offsetHeight}px`);
    setStickyTop();
    if (header.dataset.sticky === 'true') {
      let lastY = window.scrollY;
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          const hide = y > lastY && y > header.offsetHeight + 120 && !inner.classList.contains('has-open-mega');
          if (Math.abs(y - lastY) > 4) {
            header.classList.toggle('is-hidden', hide);
            setStickyTop();
            lastY = y;
          }
          ticking = false;
        });
      }, { passive: true });
    }
    window.addEventListener('resize', debounce(setStickyTop, 150));
  }

  /* ---------------------------------------------------------------------
     Scroll reveal. Content stays visible without JS; elements already on
     screen are marked visible before the hiding class is applied.
     --------------------------------------------------------------------- */
  const initReveal = (root = document) => {
    if (!document.body.classList.contains('reveal-on') || reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const els = $$('[data-reveal]:not(.is-visible)', root);
    const vh = window.innerHeight;
    els.forEach((el) => { if (el.getBoundingClientRect().top < vh * 0.95) el.classList.add('is-visible'); });
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((el) => !el.classList.contains('is-visible') && io.observe(el));
  };
  initReveal();

  /* Hero: settle the image once it's decoded. */
  $$('[data-hero]').forEach((hero) => {
    const img = $('.hero__media:not([style*="none"]) img', hero) || $('img', hero);
    const done = () => hero.classList.add('is-loaded');
    if (!img || img.complete) requestAnimationFrame(done);
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  });

  /* ---------------------------------------------------------------------
     Carousels (native scroll-snap + buttons + progress)
     --------------------------------------------------------------------- */
  const initCarousels = (root = document) => {
    $$('[data-carousel]', root).forEach((carousel) => {
      if (carousel.dataset.ready) return;
      carousel.dataset.ready = 'true';
      const track = $('[data-carousel-track]', carousel);
      const section = carousel.closest('section') || carousel.parentElement;
      const prev = $('[data-carousel-prev]', section);
      const next = $('[data-carousel-next]', section);
      const bar = $('[data-carousel-progress]', carousel);
      const update = () => {
        const max = track.scrollWidth - track.clientWidth;
        const x = track.scrollLeft;
        if (prev) prev.disabled = x <= 2;
        if (next) next.disabled = x >= max - 2;
        if (bar) {
          const ratio = track.clientWidth / track.scrollWidth;
          bar.style.setProperty('--p-w', `${Math.min(100, ratio * 100)}%`);
          const travel = (1 - ratio) / ratio; // in bar-widths
          bar.style.setProperty('--p-x', `${max > 0 ? (x / max) * travel * 100 : 0}%`);
        }
        carousel.closest('section').querySelector('.carousel__nav')?.toggleAttribute('hidden', max <= 2);
      };
      const step = (dir) => {
        const item = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        const w = item ? item.getBoundingClientRect().width + gap : track.clientWidth;
        const perView = Math.max(1, Math.floor((track.clientWidth + gap) / w));
        track.scrollBy({ left: dir * w * perView, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      };
      prev && prev.addEventListener('click', () => step(-1));
      next && next.addEventListener('click', () => step(1));
      track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
      track.addEventListener('keydown', (e) => {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      });
      window.addEventListener('resize', debounce(update, 120));
      update();
    });
  };
  initCarousels();

  /* ---------------------------------------------------------------------
     Product cards: swatch preview
     --------------------------------------------------------------------- */
  const swapCardImage = (swatch) => {
    const card = swatch.closest('[data-product-card]');
    const img = card && $('[data-card-img]', card);
    if (!img || !swatch.dataset.swatchImg) return;
    if (!img.dataset.origSrc) { img.dataset.origSrc = img.src; img.dataset.origSrcset = img.srcset; }
    img.srcset = '';
    img.src = swatch.dataset.swatchImg;
    const label = $('[data-card-color]', card);
    if (label) { label.dataset.orig = label.dataset.orig || label.textContent; label.textContent = swatch.dataset.swatchName; }
  };
  const restoreCardImage = (card) => {
    const img = $('[data-card-img]', card);
    if (img && img.dataset.origSrc) { img.src = img.dataset.origSrc; img.srcset = img.dataset.origSrcset; }
    const label = $('[data-card-color]', card);
    if (label && label.dataset.orig) label.textContent = label.dataset.orig;
  };
  document.addEventListener('pointerover', (e) => {
    const sw = e.target.closest('[data-swatch-img]');
    if (sw && e.pointerType === 'mouse') swapCardImage(sw);
  });
  document.addEventListener('pointerout', (e) => {
    const sw = e.target.closest('[data-swatch-img]');
    if (sw && !sw.contains(e.relatedTarget)) restoreCardImage(sw.closest('[data-product-card]'));
  });

  /* ---------------------------------------------------------------------
     Cart
     --------------------------------------------------------------------- */
  const cartSectionIds = () => {
    const ids = [];
    const drawer = $('[data-cart-drawer-inner]');
    if (drawer) ids.push(drawer.dataset.sectionId);
    const page = $('[data-cart-page]');
    if (page) ids.push(page.dataset.sectionId);
    return ids;
  };

  const renderCartSections = (sections) => {
    if (!sections) return;
    const drawer = $('[data-cart-drawer-inner]');
    if (drawer && sections[drawer.dataset.sectionId]) {
      const doc = parseHTML(sections[drawer.dataset.sectionId]);
      const fresh = $('[data-cart-drawer-inner]', doc);
      if (fresh) drawer.innerHTML = fresh.innerHTML;
      const count = $('[data-cart-count-text]', doc);
      const target = $('[data-cart-count-text]');
      if (count && target) target.textContent = count.textContent;
    }
    const page = $('[data-cart-page]');
    if (page && sections[page.dataset.sectionId]) {
      const fresh = $('[data-cart-page]', parseHTML(sections[page.dataset.sectionId]));
      if (fresh) page.innerHTML = fresh.innerHTML;
    }
  };

  const updateCount = (count) => {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count > 0 ? count : '';
      el.classList.remove('is-bumped');
      void el.offsetWidth;
      el.classList.add('is-bumped');
    });
    $$('[data-cart-link]').forEach((link) => {
      const base = link.getAttribute('aria-label').split(',')[0];
      link.setAttribute('aria-label', `${base}, ${count}`);
    });
  };

  const cartRequest = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...body, sections: cartSectionIds(), sections_url: window.location.pathname }),
    });
    const data = await res.json();
    if (!res.ok || data.status) throw new Error(data.description || data.message || theme.strings.cartError);
    return data;
  };

  const refreshCart = async () => {
    const cart = await (await fetch(`${theme.routes.cart}.js`)).json();
    updateCount(cart.item_count);
    return cart;
  };

  const addToCart = async (items) => {
    const data = await cartRequest(`${theme.routes.cartAdd}.js`, { items });
    renderCartSections(data.sections);
    await refreshCart();
    document.dispatchEvent(new CustomEvent('cart:updated'));
    if (theme.cartType === 'drawer' && $('[data-drawer="cart"]')) Drawer.open('cart');
    else window.location.href = theme.routes.cart;
    return data;
  };

  const changeLine = async (lineEl, quantity) => {
    const line = Number(lineEl.dataset.cartLine);
    const container = lineEl.closest('[data-cart-drawer-inner], [data-cart-page]');
    const errorEl = container && $('[data-cart-error]', container);
    lineEl.classList.add('is-loading');
    try {
      const data = await cartRequest(`${theme.routes.cartChange}.js`, { line, quantity });
      renderCartSections(data.sections);
      updateCount(data.item_count);
      document.dispatchEvent(new CustomEvent('cart:updated'));
      // Keep focus inside the drawer after its content is replaced.
      if (activeLayer && activeLayer.el.matches('[data-drawer="cart"]')) activeLayer.el.focus({ preventScroll: true });
    } catch (err) {
      lineEl.classList.remove('is-loading');
      if (errorEl) { errorEl.textContent = err.message; errorEl.hidden = false; }
      const input = $('[data-line-qty]', lineEl);
      if (input) input.value = input.defaultValue;
    }
  };

  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-qty-change]');
    if (step) {
      const lineEl = step.closest('[data-cart-line]');
      const input = $('[data-line-qty]', lineEl);
      const q = Math.max(0, Number(input.value) + Number(step.dataset.qtyChange));
      input.value = q;
      changeLine(lineEl, q);
      return;
    }
    const remove = e.target.closest('[data-line-remove]');
    if (remove) { changeLine(remove.closest('[data-cart-line]'), 0); return; }

    const quick = e.target.closest('[data-quick-add] [data-variant-id]');
    if (quick) {
      e.preventDefault();
      quick.setAttribute('aria-busy', 'true');
      addToCart([{ id: Number(quick.dataset.variantId), quantity: 1 }])
        .catch((err) => window.alert(err.message))
        .finally(() => quick.removeAttribute('aria-busy'));
    }
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-line-qty]');
    if (input) changeLine(input.closest('[data-cart-line]'), Math.max(0, Number(input.value) || 0));
    const note = e.target.closest('[data-cart-note]');
    if (note) fetch(`${theme.routes.cart}/update.js`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: note.value }) });
  });

  /* ---------------------------------------------------------------------
     Product page: variant picker, gallery, add to cart
     --------------------------------------------------------------------- */
  $$('[data-product]').forEach((root) => {
    const form = $('[data-product-form]', root);
    const picker = $('[data-variant-picker]', root);
    const variantsEl = $('[data-variants]', root);
    const variants = variantsEl ? JSON.parse(variantsEl.textContent) : [];
    const idInput = form && $('[data-variant-id]', form);
    const addBtn = form && $('[data-add-button]', form);
    const addLabel = form && $('[data-add-label]', form);
    const errorEl = form && $('[data-product-error]', form);
    const stockEl = form && $('[data-stock]', form);
    const priceWrap = $('[data-price-wrap]', root);
    const track = $('[data-gallery-track]', root);
    const dots = $$('.gallery__dots span', root);

    // Gallery dots on mobile.
    if (track && dots.length) {
      track.addEventListener('scroll', () => requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
      }), { passive: true });
    }

    const selectedOptions = () => $$('fieldset[data-option-index]', picker).map((fs) => {
      const checked = $('input:checked', fs);
      return checked ? checked.value : null;
    });

    const showMedia = (mediaId) => {
      if (!track || !mediaId) return;
      const item = $(`[data-media-id="${mediaId}"]`, track);
      if (!item) return;
      if (window.matchMedia('(min-width: 990px)').matches) {
        if (track.firstElementChild !== item) {
          item.style.opacity = '0';
          track.prepend(item);
          requestAnimationFrame(() => {
            item.style.transition = `opacity var(--motion-slow) var(--ease-standard)`;
            item.style.opacity = '1';
          });
        }
      } else {
        track.scrollTo({ left: item.offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    };

    const renderPrice = (v) => {
      if (!priceWrap) return;
      const price = formatMoney(v.price);
      priceWrap.querySelector('[data-price]').innerHTML = v.compare_at_price > v.price
        ? `<span class="visually-hidden">Sale price</span><span class="price__sale">${price}</span><span class="visually-hidden">Regular price</span><s class="price__compare">${formatMoney(v.compare_at_price)}</s>`
        : `<span class="price__regular">${price}</span>`;
    };

    const markAvailability = (selected) => {
      $$('fieldset[data-option-index]', picker).forEach((fs) => {
        const idx = Number(fs.dataset.optionIndex);
        $$('input', fs).forEach((input) => {
          const candidate = selected.slice();
          candidate[idx] = input.value;
          const match = variants.find((v) => v.options.every((o, i) => o === candidate[i]));
          const label = input.closest('label');
          label.classList.toggle('is-unavailable', !match || !match.available);
        });
      });
    };

    const update = (changedFieldset) => {
      const selected = selectedOptions();
      const variant = variants.find((v) => v.options.every((o, i) => o === selected[i]));
      markAvailability(selected);
      $$('fieldset[data-option-index]', picker).forEach((fs) => {
        const checked = $('input:checked', fs);
        const out = $('[data-option-value]', fs);
        if (out && checked) out.textContent = checked.value;
      });
      if (errorEl) errorEl.hidden = true;

      if (!variant) {
        addBtn.disabled = true;
        addLabel.textContent = theme.strings.unavailable;
        if (stockEl) { stockEl.className = 'stock stock--out'; stockEl.textContent = theme.strings.unavailable; }
        return;
      }
      idInput.value = variant.id;
      addBtn.disabled = !variant.available;
      addLabel.textContent = variant.available ? theme.strings.addToCart : theme.strings.soldOut;
      if (stockEl) {
        stockEl.className = variant.available ? 'stock' : 'stock stock--out';
        stockEl.textContent = variant.available ? theme.strings.inStock : theme.strings.soldOut;
      }
      renderPrice(variant);
      if (variant.featured_media && changedFieldset && changedFieldset.querySelector('.option-swatch')) showMedia(variant.featured_media.id);
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    };

    if (picker) {
      markAvailability(selectedOptions());
      picker.addEventListener('change', (e) => update(e.target.closest('fieldset')));
    }

    // Quantity stepper.
    $$('[data-qty]', root).forEach((qty) => {
      const input = $('input', qty);
      qty.addEventListener('click', (e) => {
        const b = e.target.closest('[data-qty-step]');
        if (!b) return;
        input.value = Math.max(1, (Number(input.value) || 1) + Number(b.dataset.qtyStep));
      });
    });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (addBtn.disabled) return;
        addBtn.setAttribute('aria-busy', 'true');
        errorEl.hidden = true;
        const quantity = Number((form.querySelector('[name="quantity"]') || {}).value) || 1;
        try {
          await addToCart([{ id: Number(idInput.value), quantity }]);
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        } finally {
          addBtn.removeAttribute('aria-busy');
        }
      });
    }
  });

  /* ---------------------------------------------------------------------
     Modals (size guide)
     --------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-modal]');
    if (opener) {
      const modal = document.getElementById(opener.dataset.openModal);
      if (modal) openLayer(modal, { initialFocus: $('.modal__panel', modal) });
      return;
    }
    if (e.target.closest('[data-close-modal]')) closeLayer();
  });

  /* ---------------------------------------------------------------------
     Related products (Section Rendering via recommendations endpoint)
     --------------------------------------------------------------------- */
  $$('[data-related]').forEach(async (section) => {
    if (section.querySelector('[data-carousel]')) { initCarousels(section); return; }
    try {
      const html = await (await fetch(section.dataset.url)).text();
      const fresh = $('[data-related]', parseHTML(html));
      if (fresh && fresh.innerHTML.trim()) { section.innerHTML = fresh.innerHTML; initCarousels(section); }
    } catch (_) { /* recommendations are optional */ }
  });

  /* ---------------------------------------------------------------------
     Collection / search: filters, sorting, pagination without reloads
     --------------------------------------------------------------------- */
  const results = $('[data-results-section]');
  if (results) {
    const sectionId = results.dataset.sectionId;
    let controller;

    const render = async (url, { append = false, push = true } = {}) => {
      controller && controller.abort();
      controller = new AbortController();
      const target = new URL(url, window.location.origin);
      target.searchParams.set('section_id', sectionId);
      const area = $('[data-results]', results);
      if (!append) area.classList.add('is-loading');
      try {
        const html = await (await fetch(target, { signal: controller.signal })).text();
        const doc = parseHTML(html);
        const fresh = (sel) => $(sel, doc);
        if (append) {
          const grid = $('[data-product-grid]', results);
          $$('[data-product-grid] > li', doc).forEach((li) => grid.append(li));
          const pag = $('.pagination', results);
          const freshPag = fresh('.pagination');
          if (pag) freshPag ? pag.replaceWith(freshPag) : pag.remove();
        } else {
          const swap = (sel) => { const a = $(sel, results); const b = fresh(sel); if (a && b) a.replaceWith(b); };
          swap('[data-results]');
          swap('[data-toolbar]');
          const body = $('[data-drawer="facets"] .drawer__body', results);
          const freshBody = fresh('[data-drawer="facets"] .drawer__body');
          if (body && freshBody) {
            const openStates = $$('details', body).map((d) => d.open);
            body.replaceWith(freshBody);
            $$('details', freshBody).forEach((d, i) => { if (openStates[i] !== undefined) d.open = openStates[i]; });
          }
        }
        if (push) {
          target.searchParams.delete('section_id');
          window.history.pushState({ facets: true }, '', target.toString());
        }
        initReveal(results);
      } catch (err) {
        if (err.name !== 'AbortError') window.location.href = url;
      } finally {
        const a = $('[data-results]', results);
        a && a.classList.remove('is-loading');
      }
    };

    const formUrl = (form) => {
      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => { if (value !== '') params.append(key, value); });
      return `${form.getAttribute('action')}?${params.toString()}`;
    };

    const debouncedSubmit = debounce((form) => render(formUrl(form)), 450);

    results.addEventListener('change', (e) => {
      const form = e.target.closest('[data-facets-form]');
      if (form) {
        if (e.target.type === 'number') debouncedSubmit(form);
        else render(formUrl(form));
        return;
      }
      const proxy = e.target.closest('[data-sort-proxy]');
      if (proxy) {
        const drawerSort = $('[data-facets-form] [name="sort_by"]', results);
        if (drawerSort) { drawerSort.value = proxy.value; render(formUrl(drawerSort.form)); }
        else {
          const url = new URL(window.location.href);
          url.searchParams.set('sort_by', proxy.value);
          render(url.toString());
        }
      }
    });
    results.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-facets-form]');
      if (!form) return;
      e.preventDefault();
      render(formUrl(form));
      Drawer.close();
    });
    results.addEventListener('click', (e) => {
      const more = e.target.closest('[data-load-more]');
      if (more) {
        e.preventDefault();
        more.setAttribute('aria-busy', 'true');
        render(more.href, { append: true, push: false });
        return;
      }
      const link = e.target.closest('[data-facet-link]');
      if (link) {
        e.preventDefault();
        render(link.href);
        if (link.closest('[data-drawer]')) Drawer.close();
        if (!link.closest('.active-filters')) window.scrollTo({ top: results.offsetTop - 80, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      }
    });
    window.addEventListener('popstate', () => render(window.location.href, { push: false }));
  }

  /* ---------------------------------------------------------------------
     Predictive search
     --------------------------------------------------------------------- */
  const searchModal = $('[data-search-modal]');
  if (searchModal) {
    const input = $('[data-search-input]', searchModal);
    const out = $('[data-predictive]', searchModal);
    let controller;
    let activeIndex = -1;

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-search]')) {
        e.preventDefault();
        openLayer(searchModal, { initialFocus: input });
      } else if (e.target.closest('[data-close-search]')) {
        closeLayer();
      }
    });

    const options = () => $$('[role="option"]', out);
    const setActive = (i) => {
      const opts = options();
      opts.forEach((o) => o.setAttribute('aria-selected', 'false'));
      activeIndex = i;
      if (opts[i]) {
        opts[i].setAttribute('aria-selected', 'true');
        opts[i].scrollIntoView({ block: 'nearest' });
      }
    };

    const search = debounce(async () => {
      const q = input.value.trim();
      if (!q) { out.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
      controller && controller.abort();
      controller = new AbortController();
      const url = `${theme.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product,collection,query,page&resources[limit]=4&resources[options][unavailable_products]=last&section_id=predictive-search`;
      try {
        const html = await (await fetch(url, { signal: controller.signal })).text();
        const doc = parseHTML(html);
        const section = $('.shopify-section', doc) || doc.body;
        out.innerHTML = section.innerHTML;
        input.setAttribute('aria-expanded', 'true');
        activeIndex = -1;
      } catch (err) { /* aborted or offline: keep previous results */ }
    }, 220);

    input.addEventListener('input', search);
    input.addEventListener('keydown', (e) => {
      const opts = options();
      if (!opts.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((activeIndex + 1) % opts.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((activeIndex - 1 + opts.length) % opts.length); }
      if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const link = opts[activeIndex].matches('a') ? opts[activeIndex] : $('a', opts[activeIndex]);
        if (link) window.location.href = link.href;
      }
    });
  }

  /* ---------------------------------------------------------------------
     Background videos: pause off-screen, honour reduced motion, and a
     pause/play toggle per section.
     --------------------------------------------------------------------- */
  const initVideos = (root = document) => {
    const videos = $$('[data-bg-video] video', root);
    if (!videos.length) return;
    const setToggle = (section, paused) => {
      const btn = section && $('[data-video-toggle]', section);
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(paused));
      btn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    };
    videos.forEach((video) => {
      video.muted = true;
      if (reducedMotion.matches) {
        video.removeAttribute('autoplay');
        video.pause();
        video.dataset.userPaused = 'true';
        setToggle(video.closest('section, .shopify-section'), true);
      }
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => entries.forEach(({ target, isIntersecting }) => {
        if (target.dataset.userPaused === 'true') return;
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      }), { threshold: 0.05 });
      videos.forEach((v) => io.observe(v));
    }
  };
  initVideos();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-video-toggle]');
    if (!btn) return;
    const section = btn.closest('section, .shopify-section') || btn.parentElement;
    const videos = $$('[data-bg-video] video', section);
    const pause = btn.getAttribute('aria-pressed') !== 'true';
    videos.forEach((v) => {
      v.dataset.userPaused = String(pause);
      if (pause) v.pause(); else v.play().catch(() => {});
    });
    btn.setAttribute('aria-pressed', String(pause));
    btn.setAttribute('aria-label', pause ? 'Play background video' : 'Pause background video');
  });

  /* Theme editor: re-run section-scoped modules when a section reloads. */
  document.addEventListener('shopify:section:load', (e) => {
    initCarousels(e.target);
    initReveal(e.target);
    initVideos(e.target);
  });
})();
