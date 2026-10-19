// Story engine: renders STORY nodes, tracks stats/items/flags, saves to localStorage.
(function () {
  'use strict';

  const SAVE_KEY = 'blackwater-save';
  const ENDINGS_KEY = 'blackwater-endings';
  const $ = (id) => document.getElementById(id);

  let state;

  function freshState() {
    return { node: 'start', hp: 10, courage: 0, clues: 0, items: [], flags: {} };
  }

  function storage(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function foundEndings() {
    return storage(() => JSON.parse(localStorage.getItem(ENDINGS_KEY)) || [], []);
  }

  function recordEnding(id) {
    const list = foundEndings();
    if (!list.includes(id)) {
      list.push(id);
      storage(() => localStorage.setItem(ENDINGS_KEY, JSON.stringify(list)));
    }
  }

  // Checks a choice's `if` requirements against current state.
  function meets(req) {
    if (!req) return true;
    if (req.item && !state.items.includes(req.item)) return false;
    if (req.noItem && state.items.includes(req.noItem)) return false;
    if (req.flag && !state.flags[req.flag]) return false;
    if (req.noFlag && state.flags[req.noFlag]) return false;
    if (req.courage && state.courage < req.courage) return false;
    if (req.clues && state.clues < req.clues) return false;
    return true;
  }

  function apply(fx) {
    if (!fx) return;
    if (fx.hp) state.hp = Math.min(10, state.hp + fx.hp);
    if (fx.courage) state.courage += fx.courage;
    if (fx.clue && !state.flags['clue:' + fx.clue]) {
      state.flags['clue:' + fx.clue] = true;
      state.clues += 1;
    }
    if (fx.give && !state.items.includes(fx.give)) state.items.push(fx.give);
    if (fx.take) state.items = state.items.filter((i) => i !== fx.take);
    if (fx.flag) state.flags[fx.flag] = true;
  }

  function go(target, fx) {
    apply(fx);
    state.node = state.hp <= 0 ? 'death' : target;
    const node = STORY[state.node];
    apply(node.enter);
    if (state.hp <= 0 && state.node !== 'death') state.node = 'death';
    render();
  }

  function renderText(node) {
    const text = $('text');
    text.innerHTML = '';
    const paras = typeof node.text === 'function' ? node.text(state) : node.text;
    paras.forEach((p) => {
      const el = document.createElement('p');
      el.textContent = p;
      text.appendChild(el);
    });
    if (node.ending) {
      const el = document.createElement('p');
      el.className = 'ending-title';
      el.textContent = '— ' + ENDINGS[node.ending] + ' —';
      text.appendChild(el);
    }
  }

  function renderChoices(node) {
    const box = $('choices');
    box.innerHTML = '';
    const choices = node.ending
      ? [{ label: 'Begin again', restart: true }]
      : node.choices.filter((c) => meets(c.if) || c.showLocked);

    choices.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      const ok = meets(c.if);
      if (!ok) {
        b.disabled = true;
        const r = document.createElement('span');
        r.className = 'req';
        r.textContent = '(' + c.showLocked + ')';
        b.appendChild(r);
      }
      b.addEventListener('click', () => (c.restart ? restart() : go(c.to, c.fx)));
      box.appendChild(b);
    });
    const first = box.querySelector('button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }

  function renderSide() {
    $('hp').textContent = state.hp;
    $('hp').parentElement.classList.toggle('low', state.hp <= 3);
    $('courage').textContent = state.courage;
    $('clues').textContent = state.clues;

    const inv = $('inventory');
    inv.innerHTML = '';
    state.items.forEach((i) => {
      const li = document.createElement('li');
      li.textContent = i;
      inv.appendChild(li);
    });

    const found = foundEndings();
    const list = $('endings');
    list.innerHTML = '';
    Object.keys(ENDINGS).forEach((id) => {
      const li = document.createElement('li');
      const has = found.includes(id);
      li.textContent = has ? ENDINGS[id] : '???';
      li.className = has ? '' : 'locked';
      list.appendChild(li);
    });
    $('endings-count').textContent = found.length + '/' + Object.keys(ENDINGS).length;
  }

  function render() {
    const node = STORY[state.node];
    if (node.ending) recordEnding(node.ending);
    $('chapter').textContent = node.chapter || '';
    renderText(node);
    renderChoices(node);
    renderSide();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toast(msg) {
    $('toast').textContent = msg;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ($('toast').textContent = ''), 2000);
  }

  function restart() {
    state = freshState();
    render();
  }

  $('save').addEventListener('click', () => {
    const ok = storage(() => (localStorage.setItem(SAVE_KEY, JSON.stringify(state)), true), false);
    toast(ok ? 'Game saved.' : 'Saving is unavailable here.');
  });

  $('load').addEventListener('click', () => {
    const saved = storage(() => JSON.parse(localStorage.getItem(SAVE_KEY)), null);
    if (saved && STORY[saved.node]) {
      state = saved;
      render();
      toast('Game loaded.');
    } else {
      toast('No save found.');
    }
  });

  $('restart').addEventListener('click', () => {
    if (confirm('Restart from the beginning?')) restart();
  });

  restart();
})();
