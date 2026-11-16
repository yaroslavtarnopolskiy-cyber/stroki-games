/**
 * Point-and-click quest «Зеркало» — два экрана (рынок | лес) со слайд-переходом.
 * Спрайты свёрстаны в пикселях экрана 1920×1080 (x — центр, bottom — нижний край),
 * попадание и подсветка — по непрозрачным пикселям спрайта.
 * Шесть осколков собираются в раму у второй лавки (у зеркальщицы).
 */
(function (global) {
  var ROOT_ID = 'mirror-quest';
  var BUSH_NEED = 3;
  var SHARD_NEED = 6;
  var RAPID_MS = 700;
  var FINISH_DELAY_MS = 1500;

  var SCENE_W = 1920;
  var SCENE_H = 1080;
  var DIR = 'assets/quest/mirror/';
  // Поднимать при перегенерации спрайтов — иначе браузер держит старые картинки
  var SPRITES_V = 11;
  var HIT_ALPHA = 40;

  // Как в tools/prepare_mirror_quest_sprites.py: где лежит каждый осколок на сцене
  var SHARDS = {
    ground_market: { n: 1, screen: 'market', x: 1110, bottom: 940 },
    bush: { n: 2, screen: 'market', x: 310, bottom: 875 },
    ground_forest: { n: 3, screen: 'forest', x: 880, bottom: 995 },
    mushroom: { n: 4, screen: 'forest', x: 1570, bottom: 900 },
    // Осколок сороки появляется там, где она держала его в клюве
    magpie: { n: 5, screen: 'forest', x: 652, bottom: 450 },
    merchant: { n: 6, screen: 'market', x: 1300, bottom: 945 }
  };
  var MAGPIE = { x: 735, bottom: 507 }; // на правой ветке кроны, осколок в клюве

  // Три креста: копать один раз; клад — только в кресте на рынке
  var DIGS = [
    // bottom — низ спрайта dig2 (он на 35 px ниже креста: место под овал выделения)
    { id: 'dig_market', screen: 'market', x: 1392, bottom: 1059, treasure: true },
    { id: 'dig_left', screen: 'forest', x: 460, bottom: 1030 },
    { id: 'dig_mid', screen: 'forest', x: 1307, bottom: 1056 }
  ];
  // Центр креста — на 47 px выше низа спрайта; мешок стоит в центре креста
  var DIG_CENTER = 47;

  // Место осколка в раме 444×618 (bbox слоя mirror_piece{n})
  var MIRROR_W = 444;
  var MIRROR_H = 618;
  var PIECE_BOX = {
    1: [99, 60, 294, 225],
    2: [36, 130, 184, 415],
    3: [46, 260, 259, 571],
    4: [219, 447, 329, 572],
    5: [225, 280, 405, 543],
    6: [170, 82, 405, 355]
  };
  // Где осколки лежат до вставки — слева и справа от рамы: [left %, top %, поворот°]
  var LOOSE_SLOTS = {
    1: [116, 58, 14],
    2: [-98, 6, -10],
    3: [-58, 2, 8],
    4: [-72, 62, -18],
    5: [170, 26, -8],
    6: [110, 0, 12]
  };

  var state = null;
  var onComplete = null;
  var dragItem = null;
  var followHintTimer = null;
  var hintTypeTimer = null;
  var hintHideTimer = null;
  var masks = {};
  var hoverNode = null;
  var talkTimer = null;
  var talkingId = null;

  // Выбранный (перетаскиваемый) предмет — угловые штрихи и ромб в инвентаре
  function markSelectedItem(id) {
    var btns = document.querySelectorAll('#' + ROOT_ID + ' .aq-item');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-selected', id != null && btns[i].dataset.item === id);
    }
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function sprite(name) {
    return DIR + name + '.webp?v=' + SPRITES_V;
  }

  function highlightSrc(src) {
    return src.replace(/\.webp(\?|$)/i, '_hl.webp$1');
  }

  function hint(text) {
    // любая новая надпись отменяет отложенную подсказку зеркальщицы
    clearTimeout(followHintTimer);
    followHintTimer = null;
    var box = $('#' + ROOT_ID + ' .mq-hint');
    if (!box) return 0;
    if (hintTypeTimer) {
      clearInterval(hintTypeTimer);
      hintTypeTimer = null;
    }
    clearTimeout(hintHideTimer);
    if (!text) {
      box.textContent = '';
      box.classList.add('is-empty');
      return 0;
    }
    box.classList.remove('is-empty');
    box.textContent = '';
    var i = 0;
    var charMs = 26;
    hintTypeTimer = setInterval(function () {
      i += 1;
      // строка в одну линию: длинный текст прокручивается внутри неё (story-extras.js)
      if (global.TridaraSetHintText) global.TridaraSetHintText(box, text.slice(0, i));
      else box.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(hintTypeTimer);
        hintTypeTimer = null;
        var hideHint = function () {
          // пока игрок прокручивает длинную подсказку — не прятать
          if (global.TridaraHintBusy && global.TridaraHintBusy(box)) {
            hintHideTimer = setTimeout(hideHint, 800);
            return;
          }
          box.textContent = '';
          box.classList.add('is-empty');
        };
        hintHideTimer = setTimeout(hideHint, global.TridaraHintDelay ? global.TridaraHintDelay(box, 2400) : 2400);
      }
    }, charMs);
    return text.length * charMs;
  }

  /** Реплика персонажа: подсказка + говорящий спрайт, пока печатается текст. */
  function speak(npcId, text) {
    var ms = hint(text);
    clearTimeout(talkTimer);
    setTalking(npcId);
    talkTimer = setTimeout(function () {
      setTalking(null);
    }, ms + 300);
  }

  function setTalking(npcId) {
    talkingId = npcId;
    document.querySelectorAll('#' + ROOT_ID + ' .mq-hotspot[data-src-talk]').forEach(function (n) {
      n.classList.toggle('is-talking', n.dataset.id === npcId);
      refreshSprite(n);
    });
  }

  function refreshSprite(node) {
    var img = node.querySelector('img');
    if (!img) return;
    var talking = node.classList.contains('is-talking') && node.dataset.srcTalk;
    var base = node.dataset.srcAlt || (talking ? node.dataset.srcTalk : node.dataset.src);
    var lit = node === hoverNode || node.classList.contains('is-drop-target');
    var want = lit ? highlightSrc(base) : base;
    if (img.getAttribute('src') !== want) img.src = want;
  }

  function ensureDom() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = el('div', 'mq-overlay aq-overlay');
    root.id = ROOT_ID;
    root.hidden = true;
    root.innerHTML =
      '<div class="mq-stage aq-stage">' +
      '  <div class="mq-slider">' +
      '    <div class="mq-panel" data-screen="market">' +
      '      <div class="mq-bg" data-screen="market"></div>' +
      '      <div class="mq-world" data-screen="market"></div>' +
      '    </div>' +
      '    <div class="mq-panel" data-screen="forest">' +
      '      <div class="mq-bg" data-screen="forest"></div>' +
      '      <div class="mq-world" data-screen="forest"></div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="mq-shard-counter" aria-live="polite">' +
      '    <img class="mq-shard-counter-icon" src="' + sprite('item_shard') + '" alt="" />' +
      '    <span class="mq-shard-counter-text">0/' + SHARD_NEED + '</span>' +
      '  </div>' +
      '  <aside class="aq-inv mq-inv" aria-label="Инвентарь">' +
      '    <div class="aq-inv-title">С собой</div>' +
      '    <div class="aq-inv-slots"></div>' +
      '  </aside>' +
      '  <button type="button" class="mq-nav mq-nav-left hq-nav hq-nav-left" title="К рынку" aria-label="К рынку">◀</button>' +
      '  <button type="button" class="mq-nav mq-nav-right hq-nav hq-nav-right" title="К лесу" aria-label="К лесу">▶</button>' +
      '  <div class="mq-assembly" hidden>' +
      '    <div class="mq-mirror"></div>' +
      '  </div>' +
      '  <div class="mq-hint aq-hint is-empty" role="status"></div>' +
      '  <div class="aq-drag-ghost mq-drag-ghost" hidden></div>' +
      '</div>';
    document.body.appendChild(root);
    var slider = root.querySelector('.mq-slider');
    slider.addEventListener('pointermove', onWorldMove);
    slider.addEventListener('pointerleave', function () {
      if (!dragItem) setHover(null);
    });
    slider.addEventListener('click', onWorldClick);
    return root;
  }

  function syncStageSize() {
    var stage = $('#' + ROOT_ID + ' .mq-stage');
    var canvas = document.querySelector('#game-root canvas') || document.querySelector('canvas');
    if (!stage || !canvas) return;
    var r = canvas.getBoundingClientRect();
    stage.style.width = r.width + 'px';
    stage.style.height = r.height + 'px';
    stage.style.left = r.left + 'px';
    stage.style.top = r.top + 'px';
  }

  function hasItem(id) {
    return state.inventory.indexOf(id) !== -1;
  }

  function addItem(id) {
    if (!hasItem(id)) state.inventory.push(id);
    renderInventory();
  }

  function removeItem(id) {
    state.inventory = state.inventory.filter(function (x) {
      return x !== id;
    });
    renderInventory();
  }

  function renderInventory() {
    var slots = $('#' + ROOT_ID + ' .aq-inv-slots');
    if (!slots) return;
    slots.innerHTML = '';
    state.inventory.forEach(function (id) {
      var meta = ITEMS[id];
      if (!meta) return;
      var btn = el('button', 'aq-item');
      btn.type = 'button';
      btn.dataset.item = id;
      btn.title = meta.label;
      btn.innerHTML = '<img src="' + meta.icon + '" alt="' + meta.label + '" /><span>' + meta.label + '</span>';
      var img = btn.querySelector('img');
      btn.addEventListener('pointerenter', function () {
        img.src = highlightSrc(meta.icon);
      });
      btn.addEventListener('pointerleave', function () {
        img.src = meta.icon;
      });
      btn.addEventListener('pointerdown', onInvPointerDown);
      slots.appendChild(btn);
    });
  }

  function shardTotal() {
    return Object.keys(state.got).length;
  }

  function updateShardCounter() {
    var box = $('#' + ROOT_ID + ' .mq-shard-counter-text');
    if (box) box.textContent = shardTotal() + '/' + SHARD_NEED;
  }

  function showShardPopAt(node) {
    var stage = $('#' + ROOT_ID + ' .mq-stage');
    if (!node || !stage) return;
    var nr = node.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    var pop = el('div', 'mq-shard-pop', shardTotal() + '/' + SHARD_NEED);
    pop.style.left = nr.left + nr.width / 2 - sr.left + 'px';
    pop.style.top = nr.top + nr.height / 2 - sr.top + 'px';
    stage.appendChild(pop);
    setTimeout(function () {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
    }, 1200);
  }

  function world(screen) {
    return $('#' + ROOT_ID + ' .mq-world[data-screen="' + screen + '"]');
  }

  // —— Попадание по пикселям ——

  function loadMask(src) {
    if (masks[src]) return;
    masks[src] = { ready: false };
    var im = new Image();
    im.onload = function () {
      var c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(im, 0, 0);
      masks[src] = { ready: true, w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    };
    im.onerror = function () {
      masks[src] = { ready: true, w: 1, h: 1, data: [0, 0, 0, 0] };
    };
    im.src = src;
  }

  // У декораций и масок попадания нет картинки подсветки _hl — не запрашивать её
  var NO_HL = ['jars', 'shop2_flags', 'planks', 'fence', 'bush_a', 'bush_b', 'dig2_hit', 'glow', 'glow_red'];

  function preload(src) {
    loadMask(src);
    var m = /([^\/]+)\.webp/.exec(src);
    if (m && NO_HL.indexOf(m[1]) !== -1) return;
    var hl = new Image();
    hl.src = highlightSrc(src);
  }

  // Маска попадания, производная от альфы спрайта: { w, h, pad, hit: Uint8Array }
  // fill — закрасить прозрачные дыры внутри контура (окно лавки),
  // pad — расширить контур на столько пикселей спрайта (тонкая лопата, ворона в листве)
  var hitMasks = {};

  function hitMask(src, fill, pad) {
    var key = src + '|' + (fill ? 1 : 0) + '|' + pad;
    if (hitMasks[key]) return hitMasks[key];
    var m = masks[src];
    if (!m || !m.ready) return null;
    var w = m.w + pad * 2;
    var h = m.h + pad * 2;
    var hit = new Uint8Array(w * h);
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.data[(y * m.w + x) * 4 + 3] > HIT_ALPHA) hit[(y + pad) * w + x + pad] = 1;
      }
    }
    if (fill) fillHoles(hit, w, h);
    if (pad) dilate(hit, w, h, pad);
    hitMasks[key] = { w: w, h: h, pad: pad, hit: hit };
    return hitMasks[key];
  }

  /** Всё прозрачное, до чего нельзя дойти от края картинки, считается частью объекта. */
  function fillHoles(hit, w, h) {
    var outside = new Uint8Array(w * h);
    var stack = [];
    function push(i) {
      if (!hit[i] && !outside[i]) {
        outside[i] = 1;
        stack.push(i);
      }
    }
    for (var x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (var y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (stack.length) {
      var i = stack.pop();
      var px = i % w;
      if (px > 0) push(i - 1);
      if (px < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < w * (h - 1)) push(i + w);
    }
    for (var k = 0; k < hit.length; k++) if (!outside[k]) hit[k] = 1;
  }

  /** Квадратное расширение контура: по строкам, затем по столбцам. */
  function dilate(hit, w, h, r) {
    var tmp = new Uint8Array(w * h);
    var x, y, k, on;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        on = 0;
        for (k = Math.max(0, x - r); k <= Math.min(w - 1, x + r) && !on; k++) on = hit[y * w + k];
        tmp[y * w + x] = on;
      }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        on = 0;
        for (k = Math.max(0, y - r); k <= Math.min(h - 1, y + r) && !on; k++) on = tmp[k * w + x];
        hit[y * w + x] = on;
      }
    }
  }

  function opaqueAt(node, cx, cy) {
    var img = node.querySelector('img');
    var src = node.dataset.hit || node.dataset.src;
    var m = masks[src];
    if(!img)return false;
    var r = img.getBoundingClientRect();
    // Small shards use an expanded physical target, independent of alpha-mask decoding.
    if(node.classList.contains('mq-shard')&&r.width>0&&r.height>0){
      var extra=/shard_(magpie|merchant)/.test(node.dataset.id)?22:16;
      return cx>=r.left-extra&&cx<=r.right+extra&&cy>=r.top-extra&&cy<=r.bottom+extra;
    }
    if(!m||!m.ready)return false;
    var fill = node.dataset.hitFill === '1';
    var pad = Number(node.dataset.hitPad || 0);
    if (!fill && !pad) {
      if (cx < r.left || cy < r.top || cx >= r.right || cy >= r.bottom) return false;
      var px = Math.floor(((cx - r.left) / r.width) * m.w);
      var py = Math.floor(((cy - r.top) / r.height) * m.h);
      return m.data[(py * m.w + px) * 4 + 3] > HIT_ALPHA;
    }
    var hm = hitMask(src, fill, pad);
    if (!hm) return false;
    var hx = Math.floor(((cx - r.left) / r.width) * m.w) + hm.pad;
    var hy = Math.floor(((cy - r.top) / r.height) * m.h) + hm.pad;
    if (hx < 0 || hy < 0 || hx >= hm.w || hy >= hm.h) return false;
    return hm.hit[hy * hm.w + hx] === 1;
  }

  /** Верхний объект текущего экрана с непрозрачным пикселем под курсором. */
  function hitAt(cx, cy) {
    var w = world(state.screen);
    if (!w) return null;
    var nodes = Array.prototype.slice.call(w.querySelectorAll('.mq-hotspot'));
    nodes.reverse();
    nodes.sort(function (a, b) {
      return Number(b.dataset.z || 0) - Number(a.dataset.z || 0);
    });
    for (var i = 0; i < nodes.length; i++) {
      if (opaqueAt(nodes[i], cx, cy)) return nodes[i];
    }
    return null;
  }

  function setHover(node) {
    if (node === hoverNode) return;
    var prev = hoverNode;
    hoverNode = node;
    if (prev) refreshSprite(prev);
    var slider = $('#' + ROOT_ID + ' .mq-slider');
    if (slider) slider.style.cursor = node ? 'pointer' : '';
    if (node) refreshSprite(node);
  }

  function onWorldMove(e) {
    if (dragItem || !state) return;
    setHover(hitAt(e.clientX, e.clientY));
  }

  function onWorldClick(e) {
    if (dragItem || !state || state.assembling) return;
    var node = hitAt(e.clientX, e.clientY);
    if (!node) return;
    e.preventDefault();
    onHotspotClick(node.dataset.id, node, e.clientX);
  }

  // —— Отрисовка ——

  function place(node, x, bottom, z) {
    node.style.left = (x / SCENE_W) * 100 + '%';
    node.style.bottom = ((SCENE_H - bottom) / SCENE_H) * 100 + '%';
    node.style.zIndex = z;
  }

  function sizeFromImage(node, img, src) {
    var known = masks[src];
    if (known && known.ready) {
      node.style.width = (known.w / SCENE_W) * 100 + '%';
      return;
    }
    node.style.visibility = 'hidden';
    img.onload = function () {
      node.style.width = (img.naturalWidth / SCENE_W) * 100 + '%';
      node.style.visibility = '';
    };
  }

  /** cfg: { id, x, bottom, z, src, srcTalk?, alt, spawn?, cls?, glow?, hitFill?, hitPad? } */
  function makeHotspot(screen, cfg) {
    var node = el('div', 'aq-hotspot mq-hotspot mq-px' + (cfg.spawn ? ' hq-spawn-in' : '') + (cfg.cls ? ' ' + cfg.cls : ''));
    node.dataset.id = cfg.id;
    node.dataset.src = cfg.src;
    if (cfg.srcTalk) node.dataset.srcTalk = cfg.srcTalk;
    if (cfg.hit) node.dataset.hit = cfg.hit;
    if (cfg.hitFill) node.dataset.hitFill = '1';
    if (cfg.hitPad) node.dataset.hitPad = cfg.hitPad;
    if (cfg.srcTalk && talkingId === cfg.id) node.classList.add('is-talking');
    node.dataset.z = cfg.z || 2;
    place(node, cfg.x, cfg.bottom, cfg.z || 2);
    var img = el('img');
    img.alt = cfg.alt || '';
    img.draggable = false;
    sizeFromImage(node, img, cfg.src);
    img.src = node.classList.contains('is-talking') ? cfg.srcTalk : cfg.src;
    if (cfg.glow) {
      // div, а не img: попадание и подсветка ищут спрайт через querySelector('img')
      var glow = el('div', 'mq-glow');
      // белая подсветка; на телефонах CSS берёт красную (--glow-red)
      // полный адрес: url() из переменной браузер иначе считает от файла стилей
      glow.style.setProperty('--glow-white', 'url("' + new URL(sprite('glow'), document.baseURI).href + '")');
      glow.style.setProperty('--glow-red', 'url("' + new URL(sprite('glow_red'), document.baseURI).href + '")');
      // glow: { w, x, y, opacity } — свой размер (% ширины спрайта), центр (% спрайта) и яркость
      if (typeof cfg.glow === 'object') {
        if (cfg.glow.w != null) glow.style.width = cfg.glow.w + '%';
        if (cfg.glow.x != null) glow.style.left = cfg.glow.x + '%';
        if (cfg.glow.y != null) glow.style.top = cfg.glow.y + '%';
        if (cfg.glow.opacity != null) glow.style.opacity = cfg.glow.opacity;
      }
      node.appendChild(glow);
    }
    node.appendChild(img);
    preload(cfg.src);
    if (cfg.srcTalk) preload(cfg.srcTalk);
    if (cfg.hit) loadMask(cfg.hit);
    world(screen).appendChild(node);
    if (cfg.spawn) {
      setTimeout(function () {
        node.classList.remove('hq-spawn-in');
      }, 700);
    }
    return node;
  }

  function makeDecor(screen, name, x, bottom, z) {
    var node = el('div', 'mq-decor');
    place(node, x, bottom, z);
    var img = el('img');
    img.alt = '';
    img.draggable = false;
    var src = sprite(name);
    sizeFromImage(node, img, src);
    loadMask(src);
    img.src = src;
    node.appendChild(img);
    world(screen).appendChild(node);
  }

  function shardHotspot(key, z) {
    var s = state;
    var sh = SHARDS[key];
    var spawn = s.justSpawned === key;
    var node = makeHotspot(sh.screen, {
      id: 'shard_' + key,
      x: sh.x,
      bottom: sh.bottom,
      z: z || 8,
      src: sprite('shard' + sh.n),
      alt: 'Осколок',
      spawn: spawn,
      cls: 'mq-shard',
      // осколок маленький — пятно крупнее обычного, примерно как у лопаты
      glow: { w: 420 }
    });
    if (spawn) s.justSpawned = null;
  }

  function renderDigs(screen) {
    var s = state;
    DIGS.forEach(function (d) {
      if (d.screen !== screen) return;
      if (!s.dug[d.id]) {
        makeHotspot(screen, { id: d.id, x: d.x, bottom: d.bottom, z: 3, src: sprite('dig2'), hit: sprite('dig2_hit'), alt: 'Крест' });
        return;
      }
      // Выкопанный крест просто исчезает; клад — на его месте
      if (!d.treasure || s.treasureTaken) return;
      makeHotspot(screen, {
        id: 'treasure',
        x: d.x,
        bottom: d.bottom - DIG_CENTER + 30,
        z: 4,
        src: sprite('sack'),
        alt: 'Клад',
        spawn: s.justSpawned === 'treasure',
        glow: true
      });
      if (s.justSpawned === 'treasure') s.justSpawned = null;
    });
  }

  function renderMarket() {
    var w = world('market');
    w.innerHTML = '';
    var s = state;

    makeHotspot('market', {
      id: 'bush',
      x: 280,
      bottom: 880,
      z: 3,
      // в кусте торчит осколок; когда он выпал — тот же куст без осколка
      src: sprite(s.bushOpen ? 'bush_empty' : 'bush'),
      alt: 'Куст'
    });
    if (s.bushOpen && !s.got.bush) shardHotspot('bush');

    makeHotspot('market', {
      id: 'shop1',
      x: 670,
      bottom: 866,
      z: 2,
      // торговец в полный рост за прилавком (tools/make_mirror_shop.py)
      src: sprite('shop1b'),
      srcTalk: sprite('shop1b_talk'),
      alt: 'Лавка торговца'
    });
    makeDecor('market', 'jars', 690, 755, 4);
    if (!s.tookCheese) {
      makeHotspot('market', { id: 'drop_cheese', x: 520, bottom: 757, z: 5, src: sprite('cheese'), alt: 'Сыр', glow: true });
    }
    if (!s.tookKnife) {
      makeHotspot('market', { id: 'drop_knife', x: 820, bottom: 764, z: 5, src: sprite('knife'), alt: 'Нож', glow: true });
    }

    makeHotspot('market', {
      id: 'shop2',
      x: 1374,
      bottom: 860,
      z: 1,
      src: sprite('shop2b'), // только здание; гирлянда — отдельный декор ниже
      alt: 'Лавка зеркальщицы',
      hitFill: true // окно слева прозрачное — клик сквозь него тоже по лавке
    });
    makeDecor('market', 'shop2_flags', 1374, 860, 1);
    makeDecor('market', 'planks', 1720, 930, 2);
    // Забор с соседнего экрана заходит краем
    makeDecor('market', 'fence', 2007, 872, 2);
    renderDigs('market');

    if (!s.got.ground_market) shardHotspot('ground_market');
  }

  function renderForest() {
    var w = world('forest');
    w.innerHTML = '';
    var s = state;

    makeDecor('forest', 'fence', 87, 872, 2);
    if (!s.tookShovel) {
      makeHotspot('forest', {
        id: 'shovel',
        x: 290,
        bottom: 885,
        z: 3,
        src: sprite('shovel'),
        alt: 'Лопата',
        glow: true,
        hitPad: 28 // черенок тонкий — попасть по нему трудно
      });
    }

    makeHotspot('forest', { id: 'aspen', x: 470, bottom: 900, z: 1, src: sprite('aspen'), alt: 'Осина' });
    if (!s.magpieGone) {
      makeHotspot('forest', {
        id: 'magpie',
        x: MAGPIE.x,
        bottom: MAGPIE.bottom,
        z: 4,
        src: sprite('magpie'),
        alt: 'Сорока',
        cls: s.magpieFlying ? 'mq-fly-away' : '',
        // лёгкий ореол за головой и спиной, а не пятно на всю крону
        glow: { w: 135, x: 28, y: 30, opacity: 1 },
        hitPad: 22 // чтобы клик рядом с вороной не уходил в крону осины
      });
    }
    if (s.magpieDropped && !s.got.magpie) shardHotspot('magpie', 5);

    makeDecor('forest', 'bush_a', 808, 830, 2);
    makeDecor('forest', 'bush_b', 1815, 905, 2);

    if (!s.mushroomCut) {
      makeHotspot('forest', {
        id: 'mushroom',
        x: 1570,
        bottom: 900,
        z: 3,
        src: sprite('mushroom'),
        alt: 'Гриб',
        hitPad: 20 // гриб мелкий, а нож на него перетаскивают
      });
    } else if (!s.got.mushroom) {
      shardHotspot('mushroom');
    }

    renderDigs('forest');

    if (!s.got.ground_forest) shardHotspot('ground_forest');
  }

  function renderAll() {
    hoverNode = null;
    renderMarket();
    renderForest();
    renderInventory();
    updateShardCounter();
    updateNav();
    setScreen(state.screen, false);
  }

  function updateNav() {
    var left = $('#' + ROOT_ID + ' .mq-nav-left');
    var right = $('#' + ROOT_ID + ' .mq-nav-right');
    if (!left || !right) return;
    left.hidden = right.hidden = !!state.assembling;
    left.disabled = state.screen === 'market';
    right.disabled = state.screen === 'forest';
    left.classList.toggle('is-disabled', state.screen === 'market');
    right.classList.toggle('is-disabled', state.screen === 'forest');
  }

  function setScreen(screen, animate) {
    var slider = $('#' + ROOT_ID + ' .mq-slider');
    if (!slider) return;
    state.screen = screen;
    setHover(null);
    if (!animate) {
      // Без слайда: экран встаёт сразу (иначе при старте видно, как он проезжает)
      slider.style.transition = 'none';
      slider.dataset.screen = screen;
      void slider.offsetWidth;
      slider.style.transition = '';
    } else {
      slider.dataset.screen = screen;
    }
    updateNav();
  }

  /** Короткая смена спрайта (куст трясётся). */
  function flashSprite(node, name, ms) {
    if (!node) return;
    clearTimeout(node._flashTimer);
    node.dataset.srcAlt = sprite(name);
    refreshSprite(node);
    node._flashTimer = setTimeout(function () {
      delete node.dataset.srcAlt;
      refreshSprite(node);
    }, ms || 160);
  }

  // —— Логика ——

  function giveShard(key, node) {
    if (state.got[key]) return;
    state.got[key] = true;
    updateShardCounter();
    showShardPopAt(node);
    if (SHARDS[key].screen === 'market') renderMarket();
    else renderForest();
    if (shardTotal() >= SHARD_NEED) hint('Все шесть осколков найдены. Вернитесь к лавочнице в соседнюю лавку.');
  }

  function payForShop() {
    var s = state;
    if (s.shopPaid) return;
    removeItem('gold');
    s.shopPaid = true;
    speak('shop1', 'Вот и плата. Сыр и нож на прилавке – забирай.');
  }

  function tryTakeShopItem(kind) {
    var s = state;
    // Без надписей при тыке по товарам на лавке
    if (!s.shopPaid) return;
    if (kind === 'cheese' && !s.tookCheese) {
      s.tookCheese = true;
      addItem('cheese');
    } else if (kind === 'knife' && !s.tookKnife) {
      s.tookKnife = true;
      addItem('knife');
    } else {
      return;
    }
    renderMarket();
  }

  function onTraderClick() {
    var s = state;
    if (!(s.tookCheese && s.tookKnife)) {
      if (s.shopPaid) {
        speak('shop1', 'Ты уже заплатил. Забирай сыр и нож с прилавка.');
        return;
      }
      if (hasItem('gold')) {
        speak('shop1', 'Нашёл клад? Отдай его мне – получишь сыр и нож.');
        return;
      }
      speak('shop1', 'Нужны сыр и нож? Принеси плату. Говорят, у рынка и в лесу есть метки зарытого клада.');
      return;
    }
    speak('shop1', 'Сыр и нож у тебя. Зеркало ищи в соседней лавке.');
  }

  function onMirrorShopClick(node) {
    var s = state;
    if (!s.merchantTold) {
      s.merchantTold = true;
      giveShard('merchant', node);
      hint('Моё зеркало разбилось на шесть частей. Одну я сберегла. Остальные ищи на рынке и в лесу. Принесёшь все – сложим зеркало.');
      return;
    }
    if (shardTotal() < SHARD_NEED) {
      var ms = hint('Осталось найти осколков: ' + (SHARD_NEED - shardTotal()) + '.');
      var next = nextMirrorTip();
      // через секунду после остатка — одна подсказка, новой надписью вместо прежней
      if (next) {
        followHintTimer = setTimeout(function () {
          hint(next);
        }, ms + 1000);
      }
      return;
    }
    openAssembly();
  }

  // Подсказки лавочницы: по одной за нажатие —
  // по кругу сорока → куст → гриб → земля, пропуская уже найденные осколки
  var MIRROR_TIPS = [
    { found: function (g) { return g.magpie; }, text: 'Сорока унесла что-то блестящее. Может, согласится обменять на угощение?' },
    { found: function (g) { return g.bush; }, text: 'Пошевели куст у рынка. Среди ветвей мог застрять осколок.' },
    { found: function (g) { return g.mushroom; }, text: 'Осмотри гриб у осины. Нож поможет заглянуть под него.' },
    {
      found: function (g) { return g.ground_market && g.ground_forest; },
      text: 'Проверь землю на рынке и в лесу. Там тоже остались осколки.'
    }
  ];

  function nextMirrorTip() {
    var s = state;
    for (var k = 0; k < MIRROR_TIPS.length; k++) {
      var idx = (s.mirrorTipNext + k) % MIRROR_TIPS.length;
      if (!MIRROR_TIPS[idx].found(s.got)) {
        s.mirrorTipNext = (idx + 1) % MIRROR_TIPS.length;
        return MIRROR_TIPS[idx].text;
      }
    }
    return null;
  }

  function onHotspotClick(id, node, clientX) {
    if (dragItem) return;
    var s = state;

    var shard = /^shard_(.+)$/.exec(id);
    if (shard) {
      giveShard(shard[1], node);
      return;
    }

    if (id === 'shop1') {
      // После оплаты лавка делится пополам: слева лежит сыр, справа — нож
      if (s.shopPaid && clientX != null) {
        var r = node.getBoundingClientRect();
        var kind = clientX < r.left + r.width / 2 ? 'cheese' : 'knife';
        if (kind === 'cheese' ? !s.tookCheese : !s.tookKnife) {
          tryTakeShopItem(kind);
          return;
        }
      }
      onTraderClick();
      return;
    }
    if (id === 'shop2') {
      onMirrorShopClick(node);
      return;
    }
    if (id === 'drop_cheese') {
      tryTakeShopItem('cheese');
      return;
    }
    if (id === 'drop_knife') {
      tryTakeShopItem('knife');
      return;
    }

    if (id === 'shovel') {
      s.tookShovel = true;
      addItem('shovel');
      renderForest();
      return;
    }

    if (id === 'treasure') {
      s.treasureTaken = true;
      addItem('gold');
      renderMarket();
      return;
    }

    var dig = digById(id);
    if (dig) {
      if (!hasItem('shovel')) hint('Здесь что-то зарыто. Нужна лопата.');
      else hint('Перетащите лопату на метку.');
      return;
    }

    if (id === 'bush') {
      if (s.bushOpen) return;
      var now = Date.now();
      if (!s.lastBushClick || now - s.lastBushClick > RAPID_MS * 2) s.bushClicks = 0;
      s.lastBushClick = now;
      s.bushClicks += 1;
      flashSprite(node, 'bush_shake');
      if (s.bushClicks >= BUSH_NEED) {
        s.bushOpen = true;
        s.justSpawned = 'bush';
        setTimeout(function () {
          if (state) renderMarket();
        }, 170);
      }
      return;
    }

    if (id === 'magpie') {
      hint('Сорока прячет что-то блестящее.');
      return;
    }
  }

  function applyUse(item, targetId) {
    var s = state;

    var dig = digById(targetId);
    if (item === 'shovel' && dig) {
      if (s.dug[dig.id]) {
        hint('Это место уже проверено.');
        return;
      }
      s.dug[dig.id] = true;
      if (dig.treasure) s.justSpawned = 'treasure';
      else hint('Здесь пусто. Проверьте другую метку.');
      if (dig.screen === 'market') renderMarket();
      else renderForest();
      return;
    }

    if (item === 'gold' && targetId === 'shop1') {
      payForShop();
      return;
    }

    if (item === 'cheese' && targetId === 'magpie') {
      if (s.magpieGone) return;
      removeItem('cheese');
      s.magpieFlying = true;
      renderForest();
      setTimeout(function () {
        if (!state) return;
        state.magpieFlying = false;
        state.magpieGone = true;
        state.magpieDropped = true;
        state.justSpawned = 'magpie';
        renderForest();
      }, 650);
      return;
    }

    if (item === 'knife' && (targetId === 'mushroom' || targetId === 'aspen')) {
      if (s.mushroomCut) return;
      removeItem('knife');
      s.mushroomCut = true;
      s.justSpawned = 'mushroom';
      renderForest();
      return;
    }

    if (targetId) hint('Здесь нужен другой предмет.');
  }

  function digById(id) {
    for (var i = 0; i < DIGS.length; i++) if (DIGS[i].id === id) return DIGS[i];
    return null;
  }

  // —— Сборка зеркала у зеркальщицы ——

  function openAssembly() {
    var s = state;
    s.assembling = true;
    s.placed = {};
    setHover(null);
    var view = $('#' + ROOT_ID + ' .mq-assembly');
    var mirror = $('#' + ROOT_ID + ' .mq-mirror');
    mirror.innerHTML = '';
    mirror.appendChild(mirrorLayer('mirror_back', 'mq-mirror-back'));
    var frame = mirrorLayer('mirror_frame', 'mq-mirror-frame');
    Object.keys(PIECE_BOX).forEach(function (n) {
      var b = PIECE_BOX[n];
      var slot = LOOSE_SLOTS[n];
      var piece = el('button', 'mq-piece');
      piece.type = 'button';
      piece.dataset.n = n;
      piece.style.width = ((b[2] - b[0]) / MIRROR_W) * 100 + '%';
      piece.style.left = slot[0] + '%';
      piece.style.top = slot[1] + '%';
      piece.style.transform = 'rotate(' + slot[2] + 'deg)';
      piece.innerHTML = '<img src="' + sprite('mirror_piece' + n) + '" alt="Осколок" draggable="false" />';
      piece.addEventListener('pointerdown', function (e) {
        startPieceDrag(piece, e);
      });
      mirror.appendChild(piece);
    });
    mirror.appendChild(frame);
    view.hidden = false;
    void view.offsetWidth;
    view.classList.add('is-open');
    updateNav();
    hint('Перетащите каждый осколок на его место в раме.');
  }

  function mirrorLayer(name, cls) {
    var img = el('img', cls);
    img.src = sprite(name);
    img.alt = '';
    img.draggable = false;
    return img;
  }

  // Осколок встаёт на место, если отпустить его не дальше этой доли ширины рамы от цели
  var PIECE_SNAP = window.matchMedia&&window.matchMedia('(pointer: coarse)').matches?0.17:0.12;

  /** Перетаскивание осколка в раму: рядом со своим местом — встаёт, иначе возвращается. */
  function startPieceDrag(piece, e) {
    var s = state;
    var n = piece.dataset.n;
    if (!s || s.placed[n]) return;
    e.preventDefault();
    var mirror = piece.parentNode;
    var mr = mirror.getBoundingClientRect();
    var pr = piece.getBoundingClientRect();
    // где внутри осколка за него взялись — чтобы он не прыгал под курсор углом
    var grabX = e.clientX - (mr.left + (parseFloat(piece.style.left) / 100) * mr.width);
    var grabY = e.clientY - (mr.top + (parseFloat(piece.style.top) / 100) * mr.height);
    if (!isFinite(grabX)) grabX = e.clientX - pr.left;
    if (!isFinite(grabY)) grabY = e.clientY - pr.top;
    piece.classList.add('is-dragging');
    piece.style.transform = 'none';
    try {
      piece.setPointerCapture(e.pointerId);
    } catch (err) { /* старые браузеры */ }

    function move(ev) {
      piece.style.left = ((ev.clientX - mr.left - grabX) / mr.width) * 100 + '%';
      piece.style.top = ((ev.clientY - mr.top - grabY) / mr.height) * 100 + '%';
    }

    function up(ev) {
      piece.removeEventListener('pointermove', move);
      piece.removeEventListener('pointerup', up);
      piece.removeEventListener('pointercancel', up);
      piece.classList.remove('is-dragging');
      if (!state) return;
      var b = PIECE_BOX[n];
      var dx = ev.clientX - grabX - (mr.left + (b[0] / MIRROR_W) * mr.width);
      var dy = ev.clientY - grabY - (mr.top + (b[1] / MIRROR_H) * mr.height);
      if (ev.type !== 'pointercancel' && Math.sqrt(dx * dx + dy * dy) <= PIECE_SNAP * mr.width) {
        placePiece(piece);
        return;
      }
      // мимо — обратно на своё место рядом с рамой
      var slot = LOOSE_SLOTS[n];
      piece.style.left = slot[0] + '%';
      piece.style.top = slot[1] + '%';
      piece.style.transform = 'rotate(' + slot[2] + 'deg)';
    }

    piece.addEventListener('pointermove', move);
    piece.addEventListener('pointerup', up);
    piece.addEventListener('pointercancel', up);
  }

  function placePiece(piece) {
    var s = state;
    var n = piece.dataset.n;
    if (!s || s.placed[n]) return;
    s.placed[n] = true;
    var b = PIECE_BOX[n];
    piece.classList.add('is-placed');
    piece.style.left = (b[0] / MIRROR_W) * 100 + '%';
    piece.style.top = (b[1] / MIRROR_H) * 100 + '%';
    piece.style.transform = 'none';
    if (Object.keys(s.placed).length < SHARD_NEED) return;
    setTimeout(function () {
      if (!state) return;
      $('#' + ROOT_ID + ' .mq-mirror').classList.add('is-whole');
      hint('Зеркало собрано. Теперь в нём можно увидеть любимую.');
      setTimeout(function () {
        endWithFade(onComplete);
      }, FINISH_DELAY_MS);
    }, 520);
  }

  function ensureVeil() {
    var root = document.getElementById(ROOT_ID);
    var veil = root.querySelector('.quest-exit-veil');
    if (!veil) {
      veil = el('div', 'quest-exit-veil');
      root.appendChild(veil);
    }
    return veil;
  }

  function endWithFade(cb) {
    var root = document.getElementById(ROOT_ID);
    var done = typeof cb === 'function' ? cb : onComplete;
    if (!root || root.hidden) {
      stop();
      if (typeof done === 'function') done();
      return;
    }
    var veil = ensureVeil();
    void veil.offsetWidth;
    veil.classList.add('is-on');
    setTimeout(function () {
      stop();
      if (typeof done === 'function') done();
    }, 580);
  }

  // —— Перетаскивание ——

  function onInvPointerDown(e) {
    var id = e.currentTarget.dataset.item;
    if (!id || state.assembling) return;
    e.preventDefault();
    startDrag(id, e);
  }

  function startDrag(id, e) {
    setHover(null);
    dragItem = id;
    markSelectedItem(id);
    var ghost = $('#' + ROOT_ID + ' .mq-drag-ghost');
    var meta = ITEMS[id];
    ghost.hidden = false;
    ghost.style.backgroundImage = 'url(' + meta.icon + ')';
    moveGhost(e.clientX, e.clientY);
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragUp);
    document.addEventListener('pointercancel', onDragUp);
    document.getElementById(ROOT_ID).classList.add('is-dragging');
  }

  function moveGhost(x, y) {
    var ghost = $('#' + ROOT_ID + ' .mq-drag-ghost');
    if (!ghost) return;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  function setDropTarget(hs) {
    var prev = $('#' + ROOT_ID + ' .is-drop-target');
    if (prev === hs) return;
    if (prev) {
      prev.classList.remove('is-drop-target');
      refreshSprite(prev);
    }
    if (hs) {
      hs.classList.add('is-drop-target');
      refreshSprite(hs);
    }
  }

  function onDragMove(e) {
    if(e.cancelable)e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    setDropTarget(hitAt(e.clientX, e.clientY));
  }

  function onDragUp(e) {
    if(e.type==='pointercancel'){endDrag(true);return;}
    var hs = hitAt(e.clientX, e.clientY);
    var item = dragItem;
    endDrag(true);
    // Вне интерактивного объекта — без надписи
    if (hs && item) applyUse(item, hs.dataset.id);
  }

  function endDrag(removeListeners) {
    dragItem = null;
    markSelectedItem(null);
    var ghost = $('#' + ROOT_ID + ' .mq-drag-ghost');
    if (ghost) ghost.hidden = true;
    var root = document.getElementById(ROOT_ID);
    if (root) root.classList.remove('is-dragging');
    document.querySelectorAll('#' + ROOT_ID + ' .is-drop-target').forEach(function (n) {
      n.classList.remove('is-drop-target');
      refreshSprite(n);
    });
    if (removeListeners) {
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragUp);
      document.removeEventListener('pointercancel', onDragUp);
    }
  }

  function onResize() {
    syncStageSize();
  }

  var SCENE_SPRITES = [
    'bush', 'bush_shake', 'bush_empty', 'shop1b', 'shop1b_talk', 'jars', 'cheese', 'knife', 'shop2b', 'shop2_flags', 'planks', 'fence',
    'shovel', 'aspen', 'magpie', 'bush_a', 'bush_b', 'mushroom', 'dig2', 'dig2_hit', 'sack',
    'shard1', 'shard2', 'shard3', 'shard4', 'shard5', 'shard6', 'glow', 'glow_red'
  ];

  var LOAD_TIMEOUT_MS = 3000;

  function whenImagesReady(done) {
    var srcs = [DIR + 'bg_market.webp', DIR + 'bg_forest.webp'];
    SCENE_SPRITES.forEach(function (n) {
      srcs.push(sprite(n));
    });
    var left = srcs.length;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }
    srcs.forEach(function (src) {
      var im = new Image();
      im.onload = im.onerror = function () {
        left -= 1;
        // Маски нужны для размеров спрайтов — ждём и их
        if (left === 0) waitMasks();
      };
      im.src = src;
    });
    function waitMasks() {
      var pending = Object.keys(masks).some(function (k) {
        return !masks[k].ready;
      });
      if (pending) setTimeout(waitMasks, 30);
      else finish();
    }
    setTimeout(finish, LOAD_TIMEOUT_MS);
  }

  function start(cb) {
    onComplete = cb;
    var root = ensureDom();
    SCENE_SPRITES.forEach(function (n) {
      preload(sprite(n));
    });
    var oldVeil = root.querySelector('.quest-exit-veil');
    if (oldVeil) oldVeil.remove();
    var view = $('#' + ROOT_ID + ' .mq-assembly');
    view.hidden = true;
    view.classList.remove('is-open');
    $('#' + ROOT_ID + ' .mq-mirror').classList.remove('is-whole');
    state = {
      screen: 'market',
      inventory: [],
      got: {},
      justSpawned: null,
      tookShovel: false,
      dug: {},
      treasureTaken: false,
      shopPaid: false,
      tookCheese: false,
      tookKnife: false,
      bushClicks: 0,
      lastBushClick: 0,
      bushOpen: false,
      mushroomCut: false,
      magpieFlying: false,
      magpieGone: false,
      magpieDropped: false,
      merchantTold: false,
      mirrorTipNext: 0,
      assembling: false,
      placed: {}
    };
    // Проявляется из чёрного только когда все картинки готовы — иначе объекты выскакивают по одному
    root.classList.remove('mq-enter');
    root.classList.add('mq-loading');
    root.hidden = false;
    document.body.classList.add('quest-active');
    hint('');
    var run = state;
    whenImagesReady(function () {
      if (state !== run) return;
      renderAll();
      syncStageSize();
      requestAnimationFrame(function () {
        root.classList.remove('mq-loading');
        root.classList.add('mq-enter');
      });
    });
    $('#' + ROOT_ID + ' .mq-nav-left').onclick = function () {
      if (state.screen !== 'market') setScreen('market', true);
    };
    $('#' + ROOT_ID + ' .mq-nav-right').onclick = function () {
      if (state.screen !== 'forest') setScreen('forest', true);
    };
    window.addEventListener('resize', onResize);
    state._fit = setInterval(syncStageSize, 500);
  }

  function stop() {
    var root = document.getElementById(ROOT_ID);
    if (root) root.hidden = true;
    document.body.classList.remove('quest-active');
    window.removeEventListener('resize', onResize);
    if (state && state._fit) clearInterval(state._fit);
    clearTimeout(talkTimer);
    clearTimeout(followHintTimer);
    talkingId = null;
    endDrag(true);
    hoverNode = null;
    state = null;
  }

  var ITEMS = {
    shovel: { label: 'Лопата', icon: sprite('item_shovel') },
    gold: { label: 'Клад', icon: sprite('item_gold') },
    cheese: { label: 'Сыр', icon: sprite('item_cheese') },
    knife: { label: 'Нож', icon: sprite('item_knife') }
  };

  function MirrorQuestPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  MirrorQuestPlugin.prototype.onInit = function () {};
  MirrorQuestPlugin.prototype.onStart = function () {};
  MirrorQuestPlugin.prototype.onCall = function () {
    var game = this.game;
    try {
      if (game.gui && game.gui.hideHUD) game.gui.hideHUD();
    } catch (e) { /* optional */ }
    start(function () {
      try {
        if (game.gui && game.gui.showHUD) game.gui.showHUD();
      } catch (e2) { /* optional */ }
      game.resolveAction();
    });
  };
  MirrorQuestPlugin.prototype.onTeardown = function () {
    stop();
  };

  function MirrorSquareAppearPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  MirrorSquareAppearPlugin.prototype.onInit = function () {};
  MirrorSquareAppearPlugin.prototype.onStart = function () {};
  MirrorSquareAppearPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var fadeTime = (game.storyConfig && game.storyConfig.fadetime) || 280;
    var bg = (params && params.bg) || 'village';

    function tweenAlpha(sprite, alpha, ms) {
      return new Promise(function (resolve) {
        game.managers.tween.tween(sprite, { alpha: alpha }, resolve, ms, true, 0, false);
      });
    }

    var cover = game.add.graphics(0, 0);
    cover.beginFill(0, 1);
    cover.drawRect(0, 0, game.config.w, game.config.h);
    cover.alpha = 0;
    cover.endFill();
    if (game.world && game.world.bringToTop) game.world.bringToTop(cover);

    tweenAlpha(cover, 1, fadeTime)
      .then(function () {
        var pos = game.storyConfig.positions;
        return game.managers.background.show(bg, 'CUT').then(function () {
          return game.managers.character.show('timofey', 'CUT', {
            look: 'normal',
            position: pos.HERO_MIRROR || pos.HERO || pos.DEFAULT
          });
        });
      })
      .then(function () {
        return tweenAlpha(cover, 0, fadeTime);
      })
      .then(function () {
        cover.destroy();
        game.resolveAction();
      })
      .catch(function (err) {
        console.error(err);
        try {
          cover.destroy();
        } catch (e) { /* ignore */ }
        game.resolveAction();
      });
  };
  MirrorSquareAppearPlugin.prototype.onTeardown = function () {};

  // Фоновая подгрузка картинок квеста заранее (с главного меню), чтобы в самом квесте
  // спрайты появлялись сразу; повторно уже загруженное браузер берёт из кэша
  var warmedUp = false;
  function warmup() {
    if (warmedUp) return;
    warmedUp = true;
    SCENE_SPRITES.forEach(function (n) {
      preload(sprite(n));
    });
    Object.keys(ITEMS).forEach(function (k) {
      new Image().src = ITEMS[k].icon;
      new Image().src = highlightSrc(ITEMS[k].icon);
    });
    [DIR + 'bg_market.webp', DIR + 'bg_forest.webp', sprite('item_shard'), sprite('mirror_back'), sprite('mirror_frame'),
      sprite('mirror_piece1'), sprite('mirror_piece2'), sprite('mirror_piece3'),
      sprite('mirror_piece4'), sprite('mirror_piece5'), sprite('mirror_piece6')].forEach(function (src) {
      new Image().src = src;
    });
  }

  // —— Управление с клавиатуры (js/keyboard.js): те же действия, что мышью ——
  var keyboardApi = {
    active: function () {
      return !!state && !dragItem;
    },
    nodes: function () {
      // при сборке зеркала выбираем осколки, которые ещё не в раме
      if (state.assembling) return document.querySelectorAll('#' + ROOT_ID + ' .mq-piece:not(.is-placed)');
      var w = world(state.screen);
      return w ? w.querySelectorAll('.mq-hotspot') : [];
    },
    focus: function (node) {
      document.querySelectorAll('#' + ROOT_ID + ' .mq-piece.kb-focus').forEach(function (n) {
        n.classList.remove('kb-focus');
      });
      if (node && node.classList.contains('mq-piece')) {
        setHover(null);
        node.classList.add('kb-focus');
        return;
      }
      setHover(node);
    },
    activate: function (node) {
      if (node.classList.contains('mq-piece')) {
        node.classList.remove('kb-focus');
        placePiece(node);
        return;
      }
      if (state.assembling) return;
      onHotspotClick(node.dataset.id, node);
    },
    use: function (item, node) {
      if (state.assembling) return;
      applyUse(item, node.dataset.id);
    },
    items: function () {
      return state && !state.assembling ? state.inventory.slice() : [];
    },
    select: function (id) {
      markSelectedItem(id);
    },
    nav: function (dir) {
      if (state.assembling) return;
      var b = $('#' + ROOT_ID + ' .mq-nav-' + (dir < 0 ? 'left' : 'right'));
      if (b && !b.disabled) b.click();
    }
  };

  global.TridaraMirrorQuest = {
    keyboard: keyboardApi,
    warmup: warmup,
    Plugin: MirrorQuestPlugin,
    SquareAppearPlugin: MirrorSquareAppearPlugin,
    start: start,
    stop: stop
  };
})(window);
