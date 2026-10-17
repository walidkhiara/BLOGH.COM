/**
 * IZAVEN placement editor.
 *
 * Opened with ?izaven-editor=1 on the page that holds the "Studio showroom"
 * section. It edits the real section markup (same CSS, same percentage
 * coordinates), so what you see while editing is what visitors get.
 *
 * What it can and cannot do (a storefront page cannot write to Shopify):
 *   - "Save draft" keeps your work in this browser, and restores it on refresh.
 *   - "Copy layout" produces the lines you paste into the section's
 *     "Placement layout" box in the theme editor. That paste is what publishes.
 */
(function () {
  'use strict';

  var MAX_ITEMS = 20;
  var HEADER = '# handle | style | desktop x,y,w,r,z,o,s,v | mobile x,y,w,r,z,o,s,v | image (optional)';
  var KEYS = ['x', 'y', 'w', 'r', 'z', 'o', 's', 'v'];
  var DESKTOP_DEFAULT = { x: 50, y: 70, w: 12, r: 0, z: 1, o: 100, s: 35, v: 1 };
  var MOBILE_DEFAULT = { x: 50, y: 60, w: 28, r: 0, z: 1, o: 100, s: 35, v: 1 };
  var LIMITS = { x: [0, 100], y: [0, 100], w: [1, 95], r: [-180, 180], z: [1, 99], o: [0, 100], s: [0, 100], v: [0, 1] };
  var DEVICES = {
    desktop: [['fit', 'Fit to window'], ['1920', '1920 px'], ['1440', '1440 px'], ['1024', '1024 px'], ['768', '768 px (tablet)']],
    mobile: [['390', '390 px (iPhone)'], ['360', '360 px (small Android)'], ['430', '430 px (large iPhone)']]
  };

  /* ---------- format ---------- */

  function parseNums(str, base) {
    var parts = String(str || '').split(',');
    var out = {};
    KEYS.forEach(function (k, i) {
      var v = parseFloat(parts[i]);
      out[k] = isNaN(v) ? base[k] : v;
    });
    return out;
  }

  function parseLayout(text) {
    var items = [];
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#' || line.charAt(0) === '@' || line.indexOf('|') < 0) return;
      var f = line.split('|').map(function (s) { return s.trim(); });
      items.push({
        id: items.length + 1,
        handle: f[0] || '',
        style: f[1] === 'c' ? 'c' : 'f',
        d: parseNums(f[2], DESKTOP_DEFAULT),
        m: parseNums(f[3], MOBILE_DEFAULT),
        img: f[4] || ''
      });
    });
    return items;
  }

  var CARD_LIMITS = { s: [20, 300], x: [-100, 100], y: [-100, 100] };
  function parseCards(text) {
    var out = {};
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (line.indexOf('@card') !== 0) return;
      var f = line.slice(5).split('|').map(function (x) { return x.trim(); });
      if (!f[0]) return;
      var p = String(f[1] || '').split(',').map(parseFloat);
      out[f[0]] = { s: isNaN(p[0]) ? 100 : p[0], x: isNaN(p[1]) ? 0 : p[1], y: isNaN(p[2]) ? 0 : p[2] };
    });
    return out;
  }

  function num(v, dp) { return String(+(+v).toFixed(dp)); }
  function fmt(c) {
    return [num(c.x, 2), num(c.y, 2), num(c.w, 2), num(c.r, 1), num(c.z, 0), num(c.o, 0), num(c.s, 0), c.v ? 1 : 0].join(',');
  }
  function serialize(items, cards) {
    var lines = [HEADER].concat(items.map(function (it) {
      return [it.handle, it.style, fmt(it.d), fmt(it.m)].concat(it.img ? [it.img] : []).join(' | ');
    }));
    Object.keys(cards || {}).forEach(function (h) {
      var c = cards[h];
      if (c.s === 100 && c.x === 0 && c.y === 0) return; // defaults are not stored
      lines.push('@card ' + h + ' | ' + [num(c.s, 1), num(c.x, 1), num(c.y, 1)].join(','));
    });
    return lines.join('\n');
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- styles ---------- */

  var CSS = [
    'html.iz-editing,html.iz-editing body{overflow:hidden!important}',
    'html.iz-editing .iz{position:fixed;inset:0 360px 0 0;z-index:2147482000;overflow:auto;background:#0a0a0c;overscroll-behavior:contain}',
    'html.iz-editing .iz-stage{margin:0 auto;flex:none;max-width:100%;box-shadow:0 0 0 1px rgba(255,255,255,.08)}',
    'html.iz-editing .iz-fade,html.iz-editing .iz-editor-hint{display:none!important}',
    'html.iz-editing .iz-card{cursor:grab;touch-action:none}',
    'html.iz-editing .iz-card__media img{scale:none!important;transition:none!important;-webkit-user-drag:none}',
    'html.iz-editing .iz-card.is-selected .iz-card__media{outline:2px solid #ffeed6;outline-offset:-2px}',
    'html.iz-editing .iz-nav,html.iz-editing .iz-hero-copy{opacity:.3;pointer-events:none}',
    'html.iz-editing .iz-item{cursor:grab;touch-action:none;transition:none!important;translate:none!important;scale:none!important;opacity:calc(var(--o)/100)!important}',
    'html.iz-editing .iz-item.is-ghost{display:block!important;opacity:.26!important;outline:1px dashed rgba(255,255,255,.6)}',
    'html.iz-editing .iz-item__tag{display:none}',
    'html.iz-editing .iz-sw__slide:not(.is-current){display:none}',
    'html.iz-editing .iz-sw__slide{transition:none!important}',
    'html.iz-editing .iz-item.is-dragging{cursor:grabbing}',
    '.ized-box,.ized-box *{transition:none!important}',
    '.ized-box{position:absolute;z-index:200;border:1px solid #ffeed6;pointer-events:none;box-sizing:border-box}',
    '.ized-box[hidden]{display:none}',
    '.ized-h{position:absolute;width:14px;height:14px;background:#0a0a0c;border:1.5px solid #ffeed6;pointer-events:auto;touch-action:none;box-sizing:border-box}',
    '.ized-h[data-h=nw]{left:-7px;top:-7px;cursor:nwse-resize}.ized-h[data-h=ne]{right:-7px;top:-7px;cursor:nesw-resize}',
    '.ized-h[data-h=se]{right:-7px;bottom:-7px;cursor:nwse-resize}.ized-h[data-h=sw]{left:-7px;bottom:-7px;cursor:nesw-resize}',
    '.ized-h[data-h=rot]{left:50%;top:-34px;margin-left:-8px;width:16px;height:16px;border-radius:50%;cursor:grab}',
    '.ized-stem{position:absolute;left:50%;top:-20px;width:1px;height:20px;background:#ffeed6;pointer-events:none}',

    '.ized{--bg:#0e0e11;--bg2:#15151a;--line:rgba(255,255,255,.12);--text:#ececee;--mut:#8b8d94;--warm:#ffeed6;',
    'position:fixed;inset:0 0 0 auto;width:360px;z-index:2147483001;background:var(--bg);color:var(--text);border-left:1px solid var(--line);',
    'display:flex;flex-direction:column;font:13px/1.45 var(--font-body--family,system-ui,sans-serif);-webkit-font-smoothing:antialiased}',
    '.ized *{box-sizing:border-box}',
    '.ized button,.ized input,.ized select,.ized textarea{font:inherit;color:inherit}',
    '.ized-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line)}',
    '.ized-head strong{font-size:11px;letter-spacing:.26em;text-transform:uppercase}',
    '.ized-scroll{flex:1;overflow:auto;padding:4px 16px 16px}',
    '.ized section{padding:14px 0;border-bottom:1px solid var(--line)}',
    '.ized h3{margin:0 0 10px;font-size:10px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:var(--mut);display:flex;justify-content:space-between}',
    '.ized-btn{min-height:34px;padding:0 12px;background:transparent;border:1px solid var(--line);cursor:pointer;font-size:12px}',
    '.ized-btn:hover:not(:disabled){border-color:rgba(255,238,214,.6)}',
    '.ized-btn:disabled{opacity:.35;cursor:default}',
    '.ized .ized-btn--primary{background:var(--warm);color:#111;border-color:var(--warm);font-weight:600}',
    '.ized .ized-btn--primary:hover:not(:disabled){color:#111}',
    '.ized-btn--danger:hover:not(:disabled){border-color:#e07a6a;color:#e07a6a}',
    '.ized :focus-visible{outline:2px solid var(--warm);outline-offset:2px}',
    '.ized-seg{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line)}',
    '.ized-seg button{min-height:38px;background:transparent;border:0;cursor:pointer;font-size:11px;letter-spacing:.18em;text-transform:uppercase}',
    '.ized-seg button[aria-pressed=true]{background:var(--warm);color:#111;font-weight:600}',
    '.ized label.row{display:grid;grid-template-columns:78px 1fr 62px;align-items:center;gap:8px;margin:0 0 8px;color:var(--mut)}',
    '.ized label.row span{font-size:11px}',
    '.ized input[type=number],.ized input[type=text],.ized input[type=search],.ized select,.ized textarea{width:100%;min-height:32px;padding:0 8px;background:var(--bg2);border:1px solid var(--line);color:var(--text)}',
    '.ized textarea{padding:8px;min-height:120px;font:11px/1.5 ui-monospace,Menlo,monospace;resize:vertical}',
    '.ized input[type=range]{width:100%;accent-color:#ffeed6;min-height:24px}',
    '.ized-list,.ized-results{list-style:none;margin:0;padding:0;display:grid;gap:4px}',
    '.ized-list li,.ized-results li{display:grid;grid-template-columns:40px 1fr auto;align-items:center;gap:10px;padding:5px;border:1px solid transparent;background:var(--bg2);cursor:pointer}',
    '.ized-list li[aria-selected=true]{border-color:var(--warm)}',
    '.ized-list li.is-off{opacity:.55}',
    '.ized-thumb{width:40px;height:40px;object-fit:cover;background:#000;display:block}',
    '.ized-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.ized-sub{display:block;font-size:10px;color:var(--mut);letter-spacing:.06em}',
    '.ized-ico{width:30px;height:30px;display:grid;place-items:center;background:transparent;border:0;cursor:pointer}',
    '.ized-results{max-height:190px;overflow:auto;margin-top:8px}',
    '.ized-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
    '.ized-foot{display:grid;gap:8px;padding:12px 16px;border-top:1px solid var(--line);background:var(--bg)}',
    '.ized-foot .line{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.ized-status{font-size:11px;color:var(--mut);min-height:16px}',
    '.ized-status b{color:var(--warm);font-weight:600}',
    '.ized-empty{color:var(--mut);font-size:12px;padding:6px 0}',
    '.ized-help{font-size:11px;color:var(--mut);margin:8px 0 0}',
    '.ized details{margin-top:10px}',
    '.ized summary{cursor:pointer;font-size:11px;color:var(--mut);letter-spacing:.1em}',
    '.ized-gate{display:none;position:fixed;inset:0;z-index:2147483002;background:#0a0a0c;color:#ececee;place-items:center;padding:24px;text-align:center;font:14px/1.5 system-ui}',
    '@media (max-width:1000px){.ized-gate{display:grid}}'
  ].join('');

  /* ---------- editor ---------- */

  function open(root) {
    if (root.__izEditor) return;
    root.__izEditor = true;

    var stage = root.querySelector('[data-iz-stage]');
    var layer = root.querySelector('[data-iz-layer]');
    var template = root.querySelector('template[data-iz-layout]');
    if (!stage || !layer) return;

    var shopKey = (root.getAttribute('data-shop-handle') || location.host) + ':' +
      ((window.Shopify && window.Shopify.theme && window.Shopify.theme.id) || 'live') + ':' + root.getAttribute('data-section-id');
    var shopName = root.getAttribute('data-shop-handle') || location.host;
    var STORE_KEY = 'izaven:placements:' + shopName + ':' + root.getAttribute('data-section-id');
    var LEGACY_KEY = 'izaven:placements:' + shopKey;
    var storageOk = true;
    var lastCopied = null;
    var exitArmed = false;
    var autosaveTimer = null;
    var restoredNote = false;
    var applyRepo = (root.getAttribute('data-apply-repo') || '').trim();

    var liveText = template ? (template.content ? template.content.textContent : template.textContent) : '';
    var catalog = {};
    var catalogList = [];
    var els = {}; // id -> element (kept after removal so undo can restore it)
    var items = parseLayout(liveText);
    var cards = parseCards(liveText);
    var view = 'studio';
    var selCard = null;
    var cardGesture = null;
    var nextId = items.length + 1;
    var mode = 'desktop';
    var device = 'fit';
    var selId = null;
    var past = [];
    var future = [];
    var grouping = false;
    var groupTimer = null;
    var savedText = serialize(parseLayout(liveText), parseCards(liveText));
    var liveNormalized = savedText;
    var gesture = null;
    var bgSource = root.querySelector('picture source');
    var bgMedia = bgSource ? bgSource.getAttribute('media') : null;

    /* draft restore */
    var restored = false;
    try {
      var raw = localStorage.getItem(STORE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (raw) {
        var draft = JSON.parse(raw);
        if (draft && draft.text && draft.text !== liveNormalized) {
          items = parseLayout(draft.text);
          cards = parseCards(draft.text);
          nextId = items.length + 1;
          savedText = serialize(items, cards);
          restored = true;
        }
      }
    } catch (e) { /* storage unavailable */ }

    /* shell */
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    document.documentElement.classList.add('iz-editing');
    document.body.appendChild(root); // escape any ancestor that would trap position:fixed

    var gate = document.createElement('div');
    gate.className = 'ized-gate';
    gate.innerHTML = '<div><strong>Open the placement editor on a computer.</strong><br>It needs a window at least 1000 px wide. Use the Mobile switch inside it to design the phone layout.</div>';
    document.body.appendChild(gate);

    var panel = document.createElement('aside');
    panel.className = 'ized';
    panel.setAttribute('aria-label', 'IZAVEN placement editor');
    panel.innerHTML =
      '<header class="ized-head"><strong>Placement studio</strong><button type="button" class="ized-btn" data-act="exit">Exit</button></header>' +
      '<div class="ized-scroll">' +
        '<section><div class="ized-seg" role="group" aria-label="What you are editing">' +
          '<button type="button" data-view="studio" aria-pressed="true">Studio</button>' +
          '<button type="button" data-view="cards" aria-pressed="false">Latest cards</button></div></section>' +
        '<section><div class="ized-seg" role="group" aria-label="Which layout you are editing">' +
          '<button type="button" data-mode="desktop" aria-pressed="true">Desktop</button>' +
          '<button type="button" data-mode="mobile" aria-pressed="false">Mobile</button></div>' +
          '<label class="row" style="grid-template-columns:78px 1fr;margin-top:10px"><span>Preview</span><select data-ctl="device" aria-label="Preview width"></select></label>' +
          '<p class="ized-help">Desktop and mobile are separate layouts on separate photographs. Editing one never changes the other.</p></section>' +
        '<div data-pane="studio">' +
        '<section><h3>Placements <span data-count></span></h3><ul class="ized-list" data-list></ul>' +
          '<div class="ized-two"><button type="button" class="ized-btn" data-act="scale-down" title="Make every placement 10% smaller on this layout">Scale all −10%</button><button type="button" class="ized-btn" data-act="scale-up" title="Make every placement 10% larger on this layout">Scale all +10%</button></div>' +
          '<div style="margin-top:10px"><input type="search" data-ctl="search" placeholder="Add a product from your store…" aria-label="Search products to add"><ul class="ized-results" data-results></ul></div></section>' +
        '<section data-inspector></section></div>' +
        '<div data-pane="cards" hidden><section><h3>Latest cards <span data-card-count></span></h3><ul class="ized-list" data-card-list></ul>' +
          '<p class="ized-help">Click a card, then drag its picture inside its frame, or use the sliders. Each card is independent. The same setting applies on desktop and mobile.</p></section>' +
          '<section data-card-inspector></section></div>' +
        '<section><details><summary>Layout text (advanced)</summary>' +
          '<textarea data-ctl="text" spellcheck="false" aria-label="Layout text"></textarea>' +
          '<div class="ized-two"><button type="button" class="ized-btn" data-act="apply-text">Load this text</button><button type="button" class="ized-btn" data-act="download">Download .txt</button></div>' +
          '<div class="ized-two"><button type="button" class="ized-btn" data-act="copy-claude">Copy message for Claude</button><button type="button" class="ized-btn" data-act="send-github"' + (applyRepo ? '' : ' hidden') + '>Send to store via GitHub</button></div></details></section>' +
      '</div>' +
      '<footer class="ized-foot">' +
        '<div class="line"><button type="button" class="ized-btn" data-act="undo" title="Undo (Ctrl/Cmd+Z)">Undo</button><button type="button" class="ized-btn" data-act="redo" title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button><button type="button" class="ized-btn ized-btn--danger" data-act="cancel" title="Discard changes since your last save">Cancel</button></div>' +
        '<div class="line" style="grid-template-columns:1fr 1.4fr"><button type="button" class="ized-btn" data-act="save" title="Your changes already save automatically in this browser">Keep draft</button><button type="button" class="ized-btn ized-btn--primary" data-act="copy" title="Copies the layout and shows how to put it on your store">Apply to store</button></div>' +
        '<p class="ized-help" style="margin:0">Changes save in this browser automatically. <b>Apply to store</b> is what puts them on your store.</p>' +
        '<div class="ized-status" role="status" aria-live="polite" data-status></div>' +
      '</footer>';
    document.body.appendChild(panel);

    var box = document.createElement('div');
    box.className = 'ized-box';
    box.hidden = true;
    box.innerHTML = '<span class="ized-stem"></span><span class="ized-h" data-h="rot" title="Rotate (hold Shift to snap)"></span>' +
      '<span class="ized-h" data-h="nw"></span><span class="ized-h" data-h="ne"></span><span class="ized-h" data-h="se"></span><span class="ized-h" data-h="sw"></span>';
    stage.appendChild(box);

    var $ = function (sel) { return panel.querySelector(sel); };
    var feature = root.querySelector('.iz-feature');
    var listEl = $('[data-list]');
    var resultsEl = $('[data-results]');
    var inspector = $('[data-inspector]');
    var statusEl = $('[data-status]');
    var textEl = $('[data-ctl="text"]');
    var deviceEl = $('[data-ctl="device"]');

    /* ---------- model helpers ---------- */

    function snap() { return JSON.stringify({ i: items, c: cards }); }
    function ser() { return serialize(items, cards); }
    function pack(text) { return JSON.stringify({ i: parseLayout(text), c: parseCards(text) }); }
    function cfg(it) { return mode === 'desktop' ? it.d : it.m; }
    function cur() { for (var i = 0; i < items.length; i++) if (items[i].id === selId) return items[i]; return null; }
    function byId(id) { for (var i = 0; i < items.length; i++) if (items[i].id === +id) return items[i]; return null; }
    function productOf(it) { return catalog[it.handle] || null; }
    function titleOf(it) {
      var p = productOf(it);
      if (p) return p.title;
      var el = els[it.id];
      var n = el && el.querySelector('.iz-item__name');
      return n ? n.textContent : it.handle;
    }
    function thumbOf(it) {
      if (it.img) return it.img;
      var p = productOf(it);
      if (p && p.img) return sized(p.img, 120);
      var el = els[it.id];
      var img = el && el.querySelector('img');
      return img ? img.currentSrc || img.src : '';
    }
    function sized(src, w) { return src ? src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w : ''; }

    function pushHistory() {
      past.push(snap());
      if (past.length > 120) past.shift();
      future.length = 0;
      buttons();
    }
    function touch() {
      if (!grouping) { pushHistory(); grouping = true; }
      clearTimeout(groupTimer);
      groupTimer = setTimeout(function () { grouping = false; }, 700);
    }

    /* ---------- DOM sync ---------- */

    function makeEl(it) {
      var p = productOf(it);
      var a = document.createElement('a');
      a.className = 'iz-item';
      a.setAttribute('data-iz-item', '');
      a.setAttribute('data-id', it.id);
      a.setAttribute('data-handle', it.handle);
      a.href = p ? p.url : '#';
      a.draggable = false;
      var img = new Image();
      img.className = 'iz-item__img';
      img.alt = p ? p.title : it.handle;
      img.draggable = false;
      img.decoding = 'async';
      img.addEventListener('load', placeBox);
      a.appendChild(img);
      var tag = document.createElement('span');
      tag.className = 'iz-item__tag';
      tag.innerHTML = '<span class="iz-item__name">' + esc(p ? p.title : it.handle) + '</span><span class="iz-item__price"></span>';
      a.appendChild(tag);
      return a;
    }

    function syncEl(it) {
      var el = els[it.id];
      if (!el) return;
      var s = el.style;
      ['x', 'y', 'w', 'r', 'z'].forEach(function (k) { s.setProperty('--d' + k, it.d[k]); s.setProperty('--m' + k, it.m[k]); });
      s.setProperty('--do', it.d.o); s.setProperty('--mo', it.m.o);
      s.setProperty('--ds', it.d.s); s.setProperty('--ms', it.m.s);
      el.classList.toggle('iz-item--f', it.style === 'f');
      el.classList.toggle('iz-item--c', it.style === 'c');
      el.toggleAttribute('data-hd', !it.d.v);
      el.toggleAttribute('data-hm', !it.m.v);
      el.classList.toggle('is-ghost', !cfg(it).v);
      el.classList.toggle('is-selected', it.id === selId);
      var img = el.querySelector('img');
      if (img) {
        var want = it.img || (productOf(it) ? sized(productOf(it).img, 900) : '');
        if (want && img.getAttribute('data-want') !== want) {
          img.setAttribute('data-want', want);
          if (it.img || !img.getAttribute('src')) img.removeAttribute('srcset');
          if (it.img) img.src = want;
          else if (!img.getAttribute('src')) img.src = want;
          else if (img.getAttribute('data-custom')) img.src = want;
        }
        img.setAttribute('data-custom', it.img ? '1' : '');
      }
    }

    function syncAll() {
      var live = {};
      items.forEach(function (it) {
        live[it.id] = true;
        if (!els[it.id]) {
          var existing = layer.querySelector('[data-iz-item][data-id="' + it.id + '"]');
          if (existing && existing.getAttribute('data-handle') === it.handle) els[it.id] = existing;
          else if (productOf(it)) els[it.id] = makeEl(it);
        }
        var el = els[it.id];
        if (el && !el.parentNode) layer.appendChild(el);
        syncEl(it);
      });
      Object.keys(els).forEach(function (id) {
        if (!live[id] && els[id].parentNode) els[id].parentNode.removeChild(els[id]);
      });
    }

    function applyMode() {
      stage.setAttribute('data-force', mode);
      if (bgSource) bgSource.setAttribute('media', mode === 'mobile' ? 'all' : '(max-width: 0px)');
      var w = device === 'fit' ? '100%' : device + 'px';
      stage.style.width = w;
      if (feature) {
        feature.style.width = w; feature.style.maxWidth = '100%'; feature.style.margin = '0 auto';
        feature.setAttribute('data-force', mode === 'mobile' ? 'mobile' : (device !== 'fit' && +device <= 989 ? 'tablet' : 'desktop'));
      }
      panel.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      deviceEl.innerHTML = DEVICES[mode].map(function (d) {
        return '<option value="' + d[0] + '"' + (d[0] === device ? ' selected' : '') + '>' + d[1] + '</option>';
      }).join('');
      syncAll();
      syncCards();
      renderList();
      renderInspector();
      placeBox();
    }

    /* ---------- selection box ---------- */

    function placeBox() {
      var it = cur();
      var el = it && els[it.id];
      if (!it || !el || !el.parentNode) { box.hidden = true; return; }
      var c = cfg(it);
      var sw = stage.clientWidth;
      var sh = stage.clientHeight;
      var sc = parseFloat(getComputedStyle(stage).getPropertyValue('--sc')) || 1;
      var w = (c.w * sc / 100) * sw;
      var h = el.offsetHeight || w;
      box.hidden = false;
      box.style.left = (c.x / 100) * sw - w / 2 + 'px';
      box.style.top = (c.y / 100) * sh - h / 2 + 'px';
      box.style.width = w + 'px';
      box.style.height = h + 'px';
      box.style.transform = 'rotate(' + c.r + 'deg)';
      var hh = $('[data-readout-h]');
      if (hh) hh.textContent = num((h / sh) * 100, 1) + '% of stage height';
    }

    /* ---------- panel rendering ---------- */

    function renderList() {
      $('[data-count]').textContent = items.length + ' / ' + MAX_ITEMS;
      if (!items.length) {
        listEl.innerHTML = '<li class="ized-empty" style="display:block;cursor:default;background:none">No placements yet. Search for a product below to add the first one.</li>';
        return;
      }
      var order = items.slice().sort(function (a, b) { return cfg(b).z - cfg(a).z; });
      listEl.innerHTML = order.map(function (it) {
        var c = cfg(it);
        var missing = !els[it.id] && !productOf(it);
        return '<li data-id="' + it.id + '" tabindex="0" role="option" aria-selected="' + (it.id === selId) + '"' + (c.v ? '' : ' class="is-off"') + '>' +
          '<img class="ized-thumb" alt="" src="' + esc(thumbOf(it)) + '">' +
          '<span class="ized-name">' + esc(titleOf(it)) + '<span class="ized-sub">' + (missing ? 'Product not found' : 'Layer ' + c.z + (c.v ? '' : ' · hidden') + (els[it.id] && els[it.id].hasAttribute('data-iz-switch') ? ' · auto-switches' : '')) + '</span></span>' +
          '<button type="button" class="ized-ico" data-toggle="' + it.id + '" aria-label="' + (c.v ? 'Hide ' : 'Show ') + esc(titleOf(it)) + ' on ' + mode + '" aria-pressed="' + !!c.v + '">' +
          (c.v ? '&#9673;' : '&#9676;') + '</button></li>';
      }).join('');
      listEl.setAttribute('role', 'listbox');
    }

    function field(label, key, c, step) {
      var lim = LIMITS[key];
      var v = c[key];
      return '<label class="row"><span>' + label + '</span>' +
        '<input type="range" data-f="' + key + '" min="' + lim[0] + '" max="' + lim[1] + '" step="' + step + '" value="' + v + '" aria-label="' + label + '">' +
        '<input type="number" data-f="' + key + '" min="' + lim[0] + '" max="' + lim[1] + '" step="' + step + '" value="' + num(v, 2) + '" aria-label="' + label + ' value"></label>';
    }

    function renderInspector() {
      var it = cur();
      if (!it) {
        inspector.innerHTML = '<h3>Selected placement</h3><p class="ized-empty">Click a product on the studio, or pick one from the list.</p>';
        return;
      }
      var c = cfg(it);
      var other = mode === 'desktop' ? 'mobile' : 'desktop';
      inspector.innerHTML = '<h3>' + esc(titleOf(it)) + '</h3>' +
        field('X position', 'x', c, 0.1) + field('Y position', 'y', c, 0.1) +
        field('Width / scale', 'w', c, 0.1) +
        '<p class="ized-help" style="margin:-2px 0 8px 86px" data-readout-h></p>' +
        field('Rotation', 'r', c, 0.5) + field('Opacity', 'o', c, 1) + field('Shadow', 's', c, 1) + field('Layer', 'z', c, 1) +
        '<label class="row" style="grid-template-columns:78px 1fr"><span>Style</span><select data-style aria-label="Image style">' +
          '<option value="f"' + (it.style === 'f' ? ' selected' : '') + '>Framed (photo has a background)</option>' +
          '<option value="c"' + (it.style === 'c' ? ' selected' : '') + '>Cutout (transparent PNG / WebP)</option></select></label>' +
        '<label class="row" style="grid-template-columns:78px 1fr"><span>Image URL</span><input type="text" data-img placeholder="Optional: a Shopify Files link" value="' + esc(it.img) + '" aria-label="Custom image URL"></label>' +
        '<label class="row" style="grid-template-columns:78px 1fr"><span>Visible</span><span><input type="checkbox" data-f="v" ' + (c.v ? 'checked' : '') + ' aria-label="Visible on ' + mode + '"> on ' + mode + '</span></label>' +
        '<div class="ized-two"><button type="button" class="ized-btn" data-act="forward">Bring forward</button><button type="button" class="ized-btn" data-act="backward">Send backward</button>' +
          '<button type="button" class="ized-btn" data-act="copy-other">Copy from ' + other + '</button><button type="button" class="ized-btn" data-act="reset-item">Reset position</button></div>' +
        '<div class="ized-two" style="grid-template-columns:1fr"><button type="button" class="ized-btn ized-btn--danger" data-act="remove">Remove placement</button></div>' +
        '<p class="ized-help">Removing only takes the picture off the studio. The product stays in your store.</p>';
      placeBox();
    }

    function refreshValues(except) {
      var it = cur();
      if (!it) return;
      var c = cfg(it);
      inspector.querySelectorAll('[data-f]').forEach(function (inp) {
        if (inp === except) return;
        var k = inp.getAttribute('data-f');
        if (inp.type === 'checkbox') inp.checked = !!c[k];
        else inp.value = inp.type === 'number' ? num(c[k], 2) : c[k];
      });
    }

    function renderResults() {
      var q = $('[data-ctl="search"]').value.trim().toLowerCase();
      if (!catalogList.length) { resultsEl.innerHTML = '<li class="ized-empty" style="display:block;cursor:default;background:none">Loading your products…</li>'; return; }
      var hits = catalogList.filter(function (p) { return !q || p.title.toLowerCase().indexOf(q) > -1 || p.handle.indexOf(q) > -1; }).slice(0, 40);
      if (!hits.length) { resultsEl.innerHTML = '<li class="ized-empty" style="display:block;cursor:default;background:none">No product matches.</li>'; return; }
      var placed = {};
      items.forEach(function (it) { placed[it.handle] = (placed[it.handle] || 0) + 1; });
      var full = items.length >= MAX_ITEMS;
      resultsEl.innerHTML = hits.map(function (p) {
        return '<li data-add="' + esc(p.handle) + '"' + (full ? ' style="opacity:.4;cursor:default"' : '') + '><img class="ized-thumb" alt="" src="' + esc(sized(p.img, 120)) + '">' +
          '<span class="ized-name">' + esc(p.title) + '<span class="ized-sub">' + (placed[p.handle] ? 'Already placed ×' + placed[p.handle] : 'Add to studio') + '</span></span><span aria-hidden="true">+</span></li>';
      }).join('');
    }

    function buttons() {
      var u = panel.querySelector('[data-act="undo"]');
      var r = panel.querySelector('[data-act="redo"]');
      if (u) u.disabled = !past.length;
      if (r) r.disabled = !future.length;
    }

    // Every change is kept in this browser automatically, so a refresh never loses work.
    function persist() {
      var text = ser();
      try {
        if (text === liveNormalized) localStorage.removeItem(STORE_KEY);
        else localStorage.setItem(STORE_KEY, JSON.stringify({ at: Date.now(), text: text }));
        storageOk = true;
      } catch (err) { storageOk = false; }
    }
    function scheduleAutosave() {
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(function () { persist(); dirtyState(true); }, 350);
    }

    function dirtyState(fromAutosave) {
      var now = ser();
      textEl.value = now;
      exitArmed = false;
      if (!fromAutosave) { restoredNote = false; scheduleAutosave(); }
      if (now === liveNormalized) { statusEl.innerHTML = '<b>Matches your store.</b>'; return; }
      var where = storageOk
        ? '<b>Saved automatically in this browser.</b>'
        : '<b>Could not save in this browser.</b> Use Copy layout so you do not lose this.';
      statusEl.innerHTML = (restoredNote ? '<b>Restored your saved draft.</b> ' : '') + where + ' <b>Not on your store yet.</b> Press Copy layout and paste it into the theme editor.';
    }

    function say(html) { statusEl.innerHTML = html; }

    /* ---------- actions ---------- */

    function select(id) {
      selId = id;
      syncAll();
      renderList();
      renderInspector();
      placeBox();
    }

    function setField(it, k, v) {
      var lim = LIMITS[k];
      v = clamp(v, lim[0], lim[1]);
      if (k === 'z') v = Math.round(v);
      cfg(it)[k] = v;
    }

    function addProduct(handle) {
      if (items.length >= MAX_ITEMS) { say('<b>Limit reached.</b> A page can show up to ' + MAX_ITEMS + ' placements. Remove one first.'); return; }
      var p = catalog[handle];
      if (!p) return;
      pushHistory();
      var n = items.length;
      var maxD = 0; var maxM = 0;
      items.forEach(function (it) { maxD = Math.max(maxD, it.d.z); maxM = Math.max(maxM, it.m.z); });
      var jitter = ((n % 5) - 2) * 4;
      var it = {
        id: nextId++, handle: handle, style: 'f', img: '',
        d: Object.assign({}, DESKTOP_DEFAULT, { x: 50 + jitter, z: maxD + 1 }),
        m: Object.assign({}, MOBILE_DEFAULT, { x: 50 + jitter, z: maxM + 1 })
      };
      items.push(it);
      select(it.id);
      renderResults();
      dirtyState();
      say('<b>Added.</b> Drag it into place.');
    }

    function removeSel() {
      var it = cur();
      if (!it) return;
      pushHistory();
      items = items.filter(function (x) { return x.id !== it.id; });
      select(null);
      renderResults();
      dirtyState();
    }

    function scaleAll(factor) {
      if (!items.length) return;
      pushHistory();
      items.forEach(function (it) { var c = cfg(it); c.w = clamp(Math.round(c.w * factor * 100) / 100, LIMITS.w[0], LIMITS.w[1]); syncEl(it); });
      refreshValues(); placeBox(); dirtyState();
      say('<b>All placements scaled ' + (factor > 1 ? 'up' : 'down') + '</b> on ' + mode + '. Undo reverses it in one step.');
    }

    function swapLayer(dir) {
      var it = cur();
      if (!it) return;
      var order = items.slice().sort(function (a, b) { return cfg(a).z - cfg(b).z; });
      var i = order.indexOf(it);
      var j = i + dir;
      if (j < 0 || j >= order.length) return;
      pushHistory();
      var other = order[j];
      var a = cfg(it); var b = cfg(other);
      if (a.z === b.z) a.z = clamp(a.z + dir, 1, 99);
      else { var t = a.z; a.z = b.z; b.z = t; }
      syncAll(); renderList(); refreshValues(); dirtyState();
    }

    function baselineFor(it) {
      var base = parseLayout(liveNormalized);
      for (var i = 0; i < base.length; i++) if (base[i].handle === it.handle && base[i].id === it.id) return base[i];
      return null;
    }

    function restore(text) {
      var o = JSON.parse(text);
      items = o.i;
      cards = o.c || {};
      if (!byId(selId)) selId = null;
      nextId = Math.max.apply(null, [nextId].concat(items.map(function (x) { return x.id + 1; })));
      syncAll(); syncCards(); renderList(); renderInspector(); renderResults(); renderCardList(); renderCardInspector(); placeBox(); dirtyState();
    }

    function undo() { if (!past.length) return; future.push(snap()); restore(past.pop()); buttons(); }
    function redo() { if (!future.length) return; past.push(snap()); restore(future.pop()); buttons(); }

    function save() {
      var text = ser();
      persist();
      if (!storageOk) { say('<b>Could not save.</b> This browser blocks storage here. Use Copy layout instead.'); return; }
      savedText = text;
      dirtyState(true);
      say('<b>Draft saved in this browser</b> at ' + new Date().toLocaleTimeString() + '. It is not on your store yet: use Copy layout.');
    }

    function copyLayout() {
      var text = ser();
      var done = function () {
        lastCopied = text;
        var shop = (window.Shopify && window.Shopify.shop) || shopName;
        var tid = window.Shopify && window.Shopify.theme && window.Shopify.theme.id;
        var link = 'https://' + shop + '/admin/themes' + (tid ? '/' + tid + '/editor' : '');
        say('<b>Layout copied. Two more steps put it on your store:</b><br>1. <a href="' + esc(link) + '" target="_blank" rel="noopener" style="color:#ffeed6">Open the theme editor</a>, then Home → Studio showroom → Placement layout.<br>2. Select all, paste, and press <b>Save</b> at the top right of the theme editor.');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); });
      } else fallbackCopy(text);
    }
    function fallbackCopy(text) {
      var d = panel.querySelector('details'); d.open = true;
      textEl.value = text; textEl.focus(); textEl.select();
      say('<b>Press Ctrl/Cmd+C</b> to copy the selected text, then paste it into the theme editor.');
    }

    function exitEditor() {
      var now = ser();
      if (now !== liveNormalized && now !== lastCopied && !exitArmed) {
        exitArmed = true;
        say('<b>These changes are not on your store yet.</b> They are saved in this browser only. Press Copy layout first, or press Exit again to leave.');
        return;
      }
      persist();
      var u = new URL(location.href);
      u.searchParams.delete('izaven-editor');
      location.href = u.toString();
    }

    /* ---------- latest cards ---------- */

    function cardHandle(a) {
      var m = (a.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    }
    function cardLinks() { return feature ? [].slice.call(feature.querySelectorAll('.iz-card')) : []; }
    function cardOf(h) { return cards[h] || { s: 100, x: 0, y: 0 }; }
    function cardLink(h) { return cardLinks().filter(function (a) { return cardHandle(a) === h; })[0]; }

    function syncCards() {
      cardLinks().forEach(function (a) {
        var h = cardHandle(a); var c = cardOf(h); var m = a.querySelector('.iz-card__media');
        if (m) { m.style.setProperty('--cs', c.s); m.style.setProperty('--cx', c.x); m.style.setProperty('--cy', c.y); }
        a.classList.toggle('is-selected', view === 'cards' && h === selCard);
      });
    }

    function renderCardList() {
      var list = $('[data-card-list]'); var links = cardLinks();
      $('[data-card-count]').textContent = links.length ? String(links.length) : '';
      if (!links.length) {
        list.innerHTML = '<li class="ized-empty" style="display:block;cursor:default;background:none">The Latest strip is hidden or empty. Raise "Products to show" in the section settings.</li>';
        return;
      }
      list.innerHTML = links.map(function (a) {
        var h = cardHandle(a); var c = cardOf(h); var img = a.querySelector('img');
        var moved = c.s !== 100 || c.x !== 0 || c.y !== 0;
        return '<li data-card="' + esc(h) + '" tabindex="0" role="option" aria-selected="' + (h === selCard) + '">' +
          '<img class="ized-thumb" alt="" src="' + esc(img ? img.currentSrc || img.src : '') + '">' +
          '<span class="ized-name">' + esc((a.querySelector('.iz-card__name') || {}).textContent || h) + '<span class="ized-sub">' + (moved ? 'Scale ' + num(c.s, 0) + '% · moved' : 'Default') + '</span></span><span></span></li>';
      }).join('');
    }

    function cardField(label, key, c, step) {
      var lim = CARD_LIMITS[key];
      return '<label class="row"><span>' + label + '</span>' +
        '<input type="range" data-cf="' + key + '" min="' + lim[0] + '" max="' + lim[1] + '" step="' + step + '" value="' + c[key] + '" aria-label="' + label + '">' +
        '<input type="number" data-cf="' + key + '" min="' + lim[0] + '" max="' + lim[1] + '" step="' + step + '" value="' + num(c[key], 1) + '" aria-label="' + label + ' value"></label>';
    }

    function renderCardInspector() {
      var box_ = $('[data-card-inspector]');
      var a = selCard && cardLink(selCard);
      if (!a) { box_.innerHTML = '<h3>Selected card</h3><p class="ized-empty">Click a card in the strip, or pick one above.</p>'; return; }
      var c = cardOf(selCard);
      box_.innerHTML = '<h3>' + esc((a.querySelector('.iz-card__name') || {}).textContent || selCard) + '</h3>' +
        cardField('Scale %', 's', c, 1) + cardField('Move left / right', 'x', c, 0.5) + cardField('Move up / down', 'y', c, 0.5) +
        '<div class="ized-two"><button type="button" class="ized-btn" data-act="card-reset">Reset this card</button><button type="button" class="ized-btn" data-act="card-reset-all">Reset all cards</button></div>' +
        '<p class="ized-help">Scale grows the picture from its centre. Parts that leave the frame are cropped, exactly as on your store.</p>';
    }

    function refreshCardValues(except) {
      if (!selCard) return;
      var c = cardOf(selCard);
      panel.querySelectorAll('[data-card-inspector] [data-cf]').forEach(function (inp) {
        if (inp !== except) inp.value = inp.type === 'number' ? num(c[inp.getAttribute('data-cf')], 1) : c[inp.getAttribute('data-cf')];
      });
    }

    function setCard(h, k, v) {
      var lim = CARD_LIMITS[k];
      var c = cards[h] ? cards[h] : (cards[h] = { s: 100, x: 0, y: 0 });
      c[k] = clamp(v, lim[0], lim[1]);
    }

    function selectCard(h) {
      selCard = h;
      syncCards(); renderCardList(); renderCardInspector();
    }

    function setView(v) {
      view = v;
      panel.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
      panel.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== v; });
      if (v === 'cards') {
        box.hidden = true;
        if (!selCard && cardLinks()[0]) selCard = cardHandle(cardLinks()[0]);
        if (feature) root.scrollTop = feature.offsetTop - 16;
      } else placeBox();
      syncCards(); renderCardList(); renderCardInspector();
    }

    if (feature) {
      feature.addEventListener('click', function (e) { if (e.target.closest('.iz-card')) e.preventDefault(); }, true);
      feature.addEventListener('pointerdown', function (e) {
        if (view !== 'cards' || (e.pointerType === 'mouse' && e.button !== 0)) return;
        var a = e.target.closest('.iz-card');
        if (!a) return;
        e.preventDefault();
        var h = cardHandle(a); var c = cardOf(h);
        var img = a.querySelector('.iz-card__media img');
        selectCard(h);
        cardGesture = { h: h, x0: c.x, y0: c.y, sx: e.clientX, sy: e.clientY, w: (img && img.offsetWidth) || 1, hh: (img && img.offsetHeight) || 1, moved: false };
        try { feature.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      feature.addEventListener('pointermove', function (e) {
        var g = cardGesture; if (!g) return;
        if (!g.moved) { g.moved = true; pushHistory(); }
        setCard(g.h, 'x', g.x0 + ((e.clientX - g.sx) / g.w) * 100);
        setCard(g.h, 'y', g.y0 + ((e.clientY - g.sy) / g.hh) * 100);
        syncCards(); refreshCardValues();
      });
      var endCard = function (e) {
        if (!cardGesture) return;
        var moved = cardGesture.moved; cardGesture = null;
        try { feature.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (moved) { renderCardList(); dirtyState(); }
      };
      feature.addEventListener('pointerup', endCard);
      feature.addEventListener('pointercancel', endCard);
    }

    /* ---------- pointer gestures ---------- */

    function pct(e) {
      var r = stage.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, r: r };
    }

    stage.addEventListener('click', function (e) {
      if (e.target.closest('[data-iz-item]')) e.preventDefault();
    }, true);

    stage.addEventListener('pointerdown', function (e) {
      if (view !== 'studio') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var h = e.target.closest('[data-h]');
      var a = e.target.closest('[data-iz-item]');
      var it = h ? cur() : a ? byId(a.getAttribute('data-id')) : null;
      if (!it) { if (!h) select(null); return; }
      e.preventDefault();
      if (!h && it.id !== selId) select(it.id);
      var p = pct(e);
      var c = cfg(it);
      var cx = p.r.left + (c.x / 100) * p.r.width;
      var cy = p.r.top + (c.y / 100) * p.r.height;
      gesture = {
        type: h ? h.getAttribute('data-h') : 'drag', it: it, moved: false,
        offX: c.x - p.x, offY: c.y - p.y,
        w0: c.w, r0: c.r, cx: cx, cy: cy,
        d0: Math.max(6, Math.hypot(e.clientX - cx, e.clientY - cy)),
        a0: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI
      };
      var el = els[it.id];
      if (el && !h) el.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    stage.addEventListener('pointermove', function (e) {
      if (!gesture) return;
      var g = gesture; var c = cfg(g.it);
      if (!g.moved) { g.moved = true; pushHistory(); }
      if (g.type === 'drag') {
        var p = pct(e);
        c.x = clamp(p.x + g.offX, 0, 100);
        c.y = clamp(p.y + g.offY, 0, 100);
      } else if (g.type === 'rot') {
        var a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180 / Math.PI;
        var r = g.r0 + (a - g.a0);
        r = ((r + 540) % 360) - 180;
        c.r = e.shiftKey ? Math.round(r / 15) * 15 : Math.round(r * 2) / 2;
      } else {
        var d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
        c.w = clamp(g.w0 * (d / g.d0), LIMITS.w[0], LIMITS.w[1]);
      }
      syncEl(g.it); placeBox(); refreshValues();
    });

    function endGesture(e) {
      if (!gesture) return;
      var el = els[gesture.it.id];
      if (el) el.classList.remove('is-dragging');
      var moved = gesture.moved;
      gesture = null;
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (moved) { dirtyState(); }
    }
    stage.addEventListener('pointerup', endGesture);
    stage.addEventListener('pointercancel', endGesture);

    /* ---------- panel events ---------- */

    panel.addEventListener('click', function (e) {
      var t = e.target;
      var vw = t.closest('[data-view]');
      if (vw) { setView(vw.getAttribute('data-view')); return; }
      var crow = t.closest('[data-card]');
      if (crow) { selectCard(crow.getAttribute('data-card')); var la = cardLink(selCard); if (la) la.scrollIntoView({ block: 'center' }); return; }
      var m = t.closest('[data-mode]');
      if (m) { mode = m.getAttribute('data-mode'); device = DEVICES[mode][0][0]; applyMode(); return; }
      var tog = t.closest('[data-toggle]');
      if (tog) {
        e.stopPropagation();
        var it0 = byId(tog.getAttribute('data-toggle'));
        if (it0) { pushHistory(); cfg(it0).v = cfg(it0).v ? 0 : 1; syncEl(it0); renderList(); renderInspector(); dirtyState(); }
        return;
      }
      var row = t.closest('.ized-list li[data-id]');
      if (row) { select(+row.getAttribute('data-id')); return; }
      var add = t.closest('[data-add]');
      if (add) { addProduct(add.getAttribute('data-add')); return; }
      var act = t.closest('[data-act]');
      if (!act) return;
      var it = cur();
      switch (act.getAttribute('data-act')) {
        case 'exit': exitEditor(); break;
        case 'undo': undo(); break;
        case 'redo': redo(); break;
        case 'save': save(); break;
        case 'copy': copyLayout(); break;
        case 'remove': removeSel(); break;
        case 'copy-claude': {
          var msg = 'Apply this placement layout to my IZAVEN SHOWROOM theme (Studio showroom > Placement layout):\n```\n' + ser() + '\n```';
          var fin = function () { lastCopied = ser(); say('<b>Message copied.</b> Paste it into your chat with Claude and ask it to apply it. That also puts it on the draft theme.'); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg).then(fin, function () { fallbackCopy(msg); }); else fallbackCopy(msg);
          break;
        }
        case 'send-github': {
          var body = 'Layout from the placement editor. Do not edit.\n\n```\n' + ser() + '\n```\n';
          var gh = 'https://github.com/' + applyRepo + '/issues/new?title=' + encodeURIComponent('izaven-layout') + '&body=' + encodeURIComponent(body);
          if (gh.length > 7500) { say('<b>This layout is too long to send this way.</b> Use Apply to store instead.'); break; }
          lastCopied = ser();
          window.open(gh, '_blank', 'noopener');
          say('<b>GitHub opened.</b> Press <b>Submit new issue</b> there. Your store updates within about a minute, and a comment on that issue tells you the result.');
          break;
        }
        case 'card-reset':
          if (selCard) { pushHistory(); delete cards[selCard]; syncCards(); renderCardInspector(); renderCardList(); dirtyState(); }
          break;
        case 'card-reset-all':
          pushHistory(); cards = {}; syncCards(); renderCardInspector(); renderCardList(); dirtyState(); say('<b>All cards reset</b> to the default.');
          break;
        case 'scale-down': scaleAll(0.9); break;
        case 'scale-up': scaleAll(1.1); break;
        case 'forward': swapLayer(1); break;
        case 'backward': swapLayer(-1); break;
        case 'copy-other':
          if (it) { pushHistory(); var src = mode === 'desktop' ? it.m : it.d; var dst = cfg(it); KEYS.forEach(function (k) { dst[k] = src[k]; }); syncEl(it); refreshValues(); placeBox(); renderList(); dirtyState(); }
          break;
        case 'reset-item':
          if (it) {
            pushHistory();
            var base = baselineFor(it);
            var def = base ? (mode === 'desktop' ? base.d : base.m) : (mode === 'desktop' ? DESKTOP_DEFAULT : MOBILE_DEFAULT);
            var dst2 = cfg(it); KEYS.forEach(function (k) { dst2[k] = def[k]; });
            syncEl(it); refreshValues(); placeBox(); renderList(); dirtyState();
            say(base ? '<b>Reset</b> to the layout on your store.' : '<b>Reset</b> to the default position (this placement is not on your store yet).');
          }
          break;
        case 'cancel':
          pushHistory(); restore(pack(savedText)); say('<b>Cancelled.</b> Back to your last saved state.'); break;
        case 'apply-text':
          pushHistory(); items = parseLayout(textEl.value); cards = parseCards(textEl.value); nextId = items.length + 1; selId = null; syncAll(); syncCards(); renderCardList(); renderCardInspector(); renderList(); renderInspector(); renderResults(); placeBox(); dirtyState(); say('<b>Layout text applied.</b>'); break;
        case 'download': {
          var blob = new Blob([ser()], { type: 'text/plain' });
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'izaven-placements.txt'; a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
          break;
        }
      }
    });

    panel.addEventListener('keydown', function (e) {
      var row = e.target.closest && e.target.closest('.ized-list li[data-id]');
      if (row && (e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); select(+row.getAttribute('data-id')); }
      var add = e.target.closest && e.target.closest('[data-add]');
      if (add && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addProduct(add.getAttribute('data-add')); }
    });

    panel.addEventListener('input', function (e) {
      var t = e.target;
      if (t.getAttribute('data-ctl') === 'search') { renderResults(); return; }
      if (t.getAttribute('data-ctl') === 'device') return;
      var ck = t.getAttribute('data-cf');
      if (ck) {
        var cv = parseFloat(t.value);
        if (!selCard || isNaN(cv)) return;
        touch(); setCard(selCard, ck, cv); syncCards(); refreshCardValues(t); renderCardList(); dirtyState();
        return;
      }
      var it = cur();
      if (!it) return;
      if (t.hasAttribute('data-img')) { touch(); it.img = t.value.trim(); syncEl(it); renderList(); dirtyState(); return; }
      var k = t.getAttribute('data-f');
      if (!k) return;
      var v = t.type === 'checkbox' ? (t.checked ? 1 : 0) : parseFloat(t.value);
      if (isNaN(v)) return;
      touch();
      setField(it, k, v);
      syncEl(it);
      refreshValues(t);
      placeBox();
      if (k === 'z' || k === 'v') renderList();
      dirtyState();
    });

    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t.getAttribute('data-ctl') === 'device') { device = t.value; applyMode(); return; }
      if (t.hasAttribute('data-style')) {
        var it = cur();
        if (it) { pushHistory(); it.style = t.value; syncEl(it); dirtyState(); }
      }
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { if (typing && tag === 'textarea') return; e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (typing) return;
      if (view === 'cards') {
        if (!selCard) return;
        var cc = cardOf(selCard); var st = e.shiftKey ? 5 : 0.5; var ok_ = true;
        switch (e.key) {
          case 'ArrowLeft': touch(); setCard(selCard, 'x', cc.x - st); break;
          case 'ArrowRight': touch(); setCard(selCard, 'x', cc.x + st); break;
          case 'ArrowUp': touch(); setCard(selCard, 'y', cc.y - st); break;
          case 'ArrowDown': touch(); setCard(selCard, 'y', cc.y + st); break;
          case '+': case '=': touch(); setCard(selCard, 's', cc.s + (e.shiftKey ? 10 : 2)); break;
          case '-': case '_': touch(); setCard(selCard, 's', cc.s - (e.shiftKey ? 10 : 2)); break;
          case 'Escape': selCard = null; syncCards(); renderCardList(); renderCardInspector(); return;
          default: ok_ = false;
        }
        if (ok_) { e.preventDefault(); syncCards(); refreshCardValues(); renderCardList(); dirtyState(); }
        return;
      }
      var it = cur();
      if (!it) return;
      var c = cfg(it);
      var step = e.shiftKey ? 1 : 0.1;
      var handled = true;
      switch (e.key) {
        case 'ArrowLeft': touch(); c.x = clamp(c.x - step, 0, 100); break;
        case 'ArrowRight': touch(); c.x = clamp(c.x + step, 0, 100); break;
        case 'ArrowUp': touch(); c.y = clamp(c.y - step, 0, 100); break;
        case 'ArrowDown': touch(); c.y = clamp(c.y + step, 0, 100); break;
        case '+': case '=': touch(); c.w = clamp(c.w + step, LIMITS.w[0], LIMITS.w[1]); break;
        case '-': case '_': touch(); c.w = clamp(c.w - step, LIMITS.w[0], LIMITS.w[1]); break;
        case ']': swapLayer(1); return;
        case '[': swapLayer(-1); return;
        case 'Delete': case 'Backspace': removeSel(); e.preventDefault(); return;
        case 'Escape': select(null); return;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); syncEl(it); refreshValues(); placeBox(); dirtyState(); }
    });

    window.addEventListener('beforeunload', function (e) {
      persist();
      if (!storageOk && ser() !== liveNormalized) { e.preventDefault(); e.returnValue = ''; }
    });

    document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });
    window.addEventListener('pagehide', persist);
    if ('ResizeObserver' in window) new ResizeObserver(placeBox).observe(stage);
    window.addEventListener('resize', placeBox);

    /* ---------- boot ---------- */

    // Items already rendered by Liquid keep their element.
    items.forEach(function (it) {
      var el = layer.querySelector('[data-iz-item][data-id="' + it.id + '"]');
      if (el && el.getAttribute('data-handle') === it.handle) els[it.id] = el;
    });
    applyMode();
    renderCardList();
    renderCardInspector();
    buttons();
    restoredNote = restored;
    dirtyState(true);
    renderResults();

    var root_ = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
    fetch(root_ + 'products.json?limit=250', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        (j.products || []).forEach(function (p) {
          var prod = {
            handle: p.handle, title: p.title, url: root_ + 'products/' + p.handle,
            img: p.images && p.images[0] ? p.images[0].src : ''
          };
          catalog[p.handle] = prod;
          catalogList.push(prod);
        });
        syncAll(); renderList(); renderInspector(); renderResults(); placeBox();
      })
      .catch(function (err) {
        resultsEl.innerHTML = '<li class="ized-empty" style="display:block;cursor:default;background:none">Could not load your product list (' + esc(err.message) +
          '). Placements already on the studio still work. If the store is password protected, unlock it first.</li>';
      });
  }

  window.IzavenEditor = { open: open, parse: parseLayout, parseCards: parseCards, serialize: serialize };
})();
