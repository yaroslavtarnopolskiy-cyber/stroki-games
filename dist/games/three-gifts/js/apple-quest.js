/**
 * Point-and-click quest «Яблоко» — HTML overlay over RenJS.
 */
(function (global) {
  var ROOT_ID = 'apple-quest';
  var TRIPLE_MS = 650;
  var DIG_NEED = 3;
  var GROW_NEED = 4; // day transitions after watering

  var state = null;
  var onComplete = null;
  var dragItem = null;
  var hintTypeTimer = null;
  var hintHideTimer = null;

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

  function hint(text) {
    var box = $('#' + ROOT_ID + ' .aq-hint');
    if (!box) return;
    if (hintTypeTimer) {
      clearInterval(hintTypeTimer);
      hintTypeTimer = null;
    }
    clearTimeout(hintHideTimer);
    if (!text) {
      box.textContent = '';
      box.classList.add('is-empty');
      return;
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
  }

  function ensureDom() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;

    root = el('div', 'aq-overlay');
    root.id = ROOT_ID;
    root.hidden = true;
    root.innerHTML =
      '<div class="aq-stage">' +
      '  <div class="aq-bg" data-mode="day"></div>' +
      '  <div class="aq-world"></div>' +
      '  <aside class="aq-inv" aria-label="Инвентарь">' +
      '    <div class="aq-inv-title">С собой</div>' +
      '    <div class="aq-inv-slots"></div>' +
      '  </aside>' +
      '  <div class="aq-hint is-empty" role="status"></div>' +
      '  <div class="aq-drag-ghost" hidden></div>' +
      '</div>';
    document.body.appendChild(root);
    var w = $('.aq-world', root);
    w.addEventListener('pointermove', onWorldMove);
    w.addEventListener('pointerleave', function () {
      if (!dragItem) setHover(null);
    });
    w.addEventListener('click', onWorldClick);
    return root;
  }

  function syncStageSize() {
    var stage = $('#' + ROOT_ID + ' .aq-stage');
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
      var btn = el('button', 'aq-item');
      btn.type = 'button';
      btn.dataset.item = id;
      btn.dataset.src = meta.icon;
      btn.dataset.srcHl = meta.iconHl || highlightSrc(meta.icon);
      btn.title = meta.label;
      btn.innerHTML = '<img src="' + meta.icon + '" alt="' + meta.label + '" /><span>' + meta.label + '</span>';
      btn.addEventListener('pointerenter', function () {
        setHotspotHighlight(btn, true);
      });
      btn.addEventListener('pointerleave', function () {
        setHotspotHighlight(btn, false);
      });
      btn.addEventListener('pointerdown', onInvPointerDown);
      slots.appendChild(btn);
    });
  }

  function setDay(isDay) {
    state.isDay = isDay;
    var bg = $('#' + ROOT_ID + ' .aq-bg');
    if (bg) bg.dataset.mode = isDay ? 'day' : 'night';
    var root = document.getElementById(ROOT_ID);
    if (root) root.classList.toggle('is-night', !isDay);
  }

  function world() {
    return $('#' + ROOT_ID + ' .aq-world');
  }

  function clearWorld() {
    var w = world();
    if (w) w.innerHTML = '';
  }

  function highlightSrc(src) {
    if (!src) return src;
    return src.replace(/\.webp(\?|$)/i, '_hl.webp$1');
  }

  function setHotspotHighlight(node, on) {
    var img = node && node.querySelector('img');
    if (!img) return;
    var normal = node.dataset.src;
    var hl = node.dataset.srcHl;
    if (!normal || !hl) return;
    img.src = on ? hl : normal;
  }

  // Сцена свёрстана в пикселях 1920×1080: x — центр спрайта, bottom — его нижний край
  var SCENE_W = 1920;
  var SCENE_H = 1080;
  var APPLE_DIR = 'assets/quest/apple/';
  // Поднимать при перегенерации спрайтов — иначе браузер держит старые картинки
  var SPRITES_V = 7;
  var HIT_ALPHA = 40;
  var masks = {};
  var hoverNode = null;

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
    im.src = src;
  }

  // Маска попадания, производная от альфы спрайта: { w, h, pad, hit: Uint8Array }
  // fill — закрасить прозрачные дыры внутри контура (между столбами колодца, ручка кувшина),
  // close — сгладить рваный край: расширить и снова сузить на столько пикселей,
  // pad — расширить контур на столько пикселей спрайта (тонкая лопата)
  var hitMasks = {};

  function hitMask(src, fill, close, pad) {
    var key = src + '|' + (fill ? 1 : 0) + '|' + close + '|' + pad;
    if (hitMasks[key]) return hitMasks[key];
    var m = masks[src];
    if (!m || !m.ready) return null;
    var margin = Math.max(pad, close);
    var w = m.w + margin * 2;
    var h = m.h + margin * 2;
    var hit = new Uint8Array(w * h);
    for (var y = 0; y < m.h; y++) {
      for (var x = 0; x < m.w; x++) {
        if (m.data[(y * m.w + x) * 4 + 3] > HIT_ALPHA) hit[(y + margin) * w + x + margin] = 1;
      }
    }
    if (close) dilate(hit, w, h, close);
    if (fill) fillHoles(hit, w, h);
    if (close) erode(hit, w, h, close);
    if (pad) dilate(hit, w, h, pad);
    hitMasks[key] = { w: w, h: h, pad: margin, hit: hit };
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

  /** Сужение контура — расширение пустоты. */
  function erode(hit, w, h, r) {
    for (var i = 0; i < hit.length; i++) hit[i] = hit[i] ? 0 : 1;
    dilate(hit, w, h, r);
    for (var j = 0; j < hit.length; j++) hit[j] = hit[j] ? 0 : 1;
  }

  function opaqueAt(node, cx, cy) {
    var img = node.querySelector('img');
    var m = masks[node.dataset.src];
    if (!img || !m || !m.ready) return false;
    var r = img.getBoundingClientRect();
    var fill = node.dataset.hitFill === '1';
    var close = Number(node.dataset.hitClose || 0);
    var pad = Number(node.dataset.hitPad || 0);
    if (!fill && !close && !pad) {
      if (cx < r.left || cy < r.top || cx >= r.right || cy >= r.bottom) return false;
      var px = Math.floor(((cx - r.left) / r.width) * m.w);
      var py = Math.floor(((cy - r.top) / r.height) * m.h);
      return m.data[(py * m.w + px) * 4 + 3] > HIT_ALPHA;
    }
    var hm = hitMask(node.dataset.src, fill, close, pad);
    if (!hm) return false;
    var hx = Math.floor(((cx - r.left) / r.width) * m.w) + hm.pad;
    var hy = Math.floor(((cy - r.top) / r.height) * m.h) + hm.pad;
    if (hx < 0 || hy < 0 || hx >= hm.w || hy >= hm.h) return false;
    return hm.hit[hy * hm.w + hx] === 1;
  }

  /** Верхний интерактивный объект, у которого под курсором непрозрачный пиксель спрайта. */
  function hitAt(cx, cy) {
    var w = world();
    if (!w) return null;
    var nodes = Array.prototype.slice.call(w.querySelectorAll('.aq-hotspot'));
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
    if (hoverNode) setHotspotHighlight(hoverNode, false);
    hoverNode = node;
    var w = world();
    if (w) w.style.cursor = node ? 'pointer' : '';
    if (!node) return;
    setHotspotHighlight(node, true);
  }

  function onWorldMove(e) {
    if (dragItem) return;
    setHover(hitAt(e.clientX, e.clientY));
  }

  function onWorldClick(e) {
    if (dragItem) return;
    var node = hitAt(e.clientX, e.clientY);
    if (!node) return;
    e.preventDefault();
    onHotspotClick(node.dataset.id);
  }

  function makeHotspot(cfg) {
    var node = el('div', 'aq-hotspot aq-px');
    node.dataset.id = cfg.id;
    node.dataset.src = cfg.src;
    node.dataset.srcHl = cfg.srcHl || highlightSrc(cfg.src);
    if (cfg.hitFill) node.dataset.hitFill = '1';
    if (cfg.hitClose) node.dataset.hitClose = cfg.hitClose;
    if (cfg.hitPad) node.dataset.hitPad = cfg.hitPad;
    var z = cfg.z != null ? cfg.z : 2;
    node.dataset.z = z;
    node.style.zIndex = z;
    node.style.left = (cfg.x / SCENE_W) * 100 + '%';
    node.style.bottom = ((SCENE_H - cfg.bottom) / SCENE_H) * 100 + '%';
    var img = el('img');
    img.alt = cfg.alt || '';
    img.draggable = false;
    // scale — во сколько раз спрайт крупнее своего PNG (размеры по макету)
    var scale = cfg.scale || 1;
    var known = masks[cfg.src];
    if (known && known.ready) {
      node.style.width = ((known.w * scale) / SCENE_W) * 100 + '%';
    } else {
      node.style.visibility = 'hidden';
      img.onload = function () {
        node.style.width = ((img.naturalWidth * scale) / SCENE_W) * 100 + '%';
        node.style.visibility = '';
      };
    }
    img.src = cfg.src;
    node.appendChild(img);
    preload(cfg.src);
    world().appendChild(node);
    return node;
  }

  function preload(src) {
    loadMask(src);
    var hl = new Image();
    hl.src = highlightSrc(src);
  }

  var SCENE_SPRITES = [
    'sun', 'moon', 'well', 'shovel', 'pitcher', 'apple', 'trader',
    'tree_1', 'tree_2', 'tree_3', 'tree_4', 'tree_4_apple',
    'dig_spot', 'dig_hole', 'dig_seeded', 'dig_buried', 'dig_watered'
  ];

  function sprite(name) {
    return APPLE_DIR + name + '.webp?v=' + SPRITES_V;
  }

  function renderScene() {
    clearWorld();
    hoverNode = null;
    var s = state;

    var fence = el('img', 'aq-fence');
    fence.src = APPLE_DIR + 'fence_v2.webp?v=' + SPRITES_V;
    fence.alt = '';
    fence.draggable = false;
    world().appendChild(fence);

    makeHotspot({
      id: 'daynight',
      x: 366,
      bottom: 260,
      z: 2,
      scale: 1.08,
      src: sprite(s.isDay ? 'sun' : 'moon'),
      alt: s.isDay ? 'Солнце' : 'Луна',
      // дымка вокруг диска рваная — та же область, но без дырок по краю
      hitFill: true,
      hitClose: 18
    });

    // Well — fill pitcher
    if (!s.removed.well) {
      makeHotspot({
        id: 'well',
        x: 1362,
        bottom: 860,
        z: 0, // за забором (.aq-fence — z 1), как в макете
        scale: 1.67,
        src: sprite('well'),
        alt: 'Колодец',
        hitFill: true,
        hitClose: 6
      });
    }

    // Shovel on ground
    if (!s.tookShovel) {
      makeHotspot({
        id: 'shovel',
        x: 520,
        bottom: 893,
        z: 4,
        scale: 1.6,
        src: sprite('shovel'),
        alt: 'Лопата',
        hitPad: 18 // черенок тонкий — попасть по нему трудно (спрайт ×1.6, на сцене ≈ 29 px)
      });
    }

    // Pitcher on ground
    if (!s.tookPitcher) {
      makeHotspot({
        id: 'pitcher',
        x: 1153, // между тёмным деревом и колодцем
        bottom: 860,
        z: 4,
        scale: 1.3,
        src: sprite('pitcher'),
        alt: 'Кувшин',
        hitFill: true,
        hitClose: 6
      });
    }

    // Dig / plant area OR tree
    if (s.treeStage >= 1) {
      var ripe = s.treeStage >= 4 && !s.appleOnGround && !s.tookApple;
      makeHotspot({
        id: 'tree',
        x: 875,
        bottom: 902,
        z: 3,
        scale: s.treeStage >= 3 ? 1.33 : 1.15,
        src: sprite(ripe ? 'tree_4_apple' : 'tree_' + Math.min(4, s.treeStage)),
        alt: 'Дерево'
      });
    } else {
      var digSrc = sprite('dig_' + s.dig);
      makeHotspot({
        id: 'dig',
        x: 875,
        bottom: 902,
        z: 2,
        scale: 1.3,
        src: digSrc,
        alt: 'Место посадки'
      });
    }

    // Fallen apple — поверх дерева, чтобы клик попадал в яблоко
    if (s.appleOnGround && !s.tookApple) {
      makeHotspot({
        id: 'apple',
        x: 1110,
        bottom: 912,
        z: 6,
        scale: 1.33,
        src: sprite('apple'),
        alt: 'Яблоко',
        // листья нарисованы контуром — клик между линиями тоже по яблоку
        hitFill: true,
        hitClose: 6
      });
    }

    makeHotspot({
      id: 'trader',
      x: 1735,
      bottom: 955, // выше строки подсказки (её верх — 972px сцены)
      z: 5,
      src: sprite('trader'),
      alt: 'Торговец',
      hitFill: true,
      hitClose: 6
    });
  }

  function onHotspotClick(id) {
    if (dragItem) return;
    var s = state;

    if (id === 'daynight') {
      onDayNight();
      return;
    }

    if (id === 'trader') {
      hint(s.tookApple ? 'Яблоко уже у тебя.' : 'Вырастите яблоню и соберите яблоко.');
      return;
    }

    if (id === 'shovel') {
      s.tookShovel = true;
      addItem('shovel');
      hint('Лопата добавлена в инвентарь.');
      renderScene();
      return;
    }

    if (id === 'pitcher') {
      s.tookPitcher = true;
      addItem('pitcher');
      hint('Кувшин добавлен в инвентарь.');
      renderScene();
      return;
    }

    if (id === 'well') {
      if (hasItem('pitcher_full')) {
        hint('Кувшин уже полный.');
      } else if (hasItem('pitcher')) {
        hint('Чтобы набрать воды, перетащите кувшин на колодец.');
      } else {
        hint('Найдите кувшин в саду и перетащите его на колодец.');
      }
      return;
    }

    if (id === 'dig') {
      // Клик только подсказка — предметы применяются перетаскиванием из инвентаря
      hintDigOnly();
      return;
    }

    if (id === 'tree') {
      handleTreeClick();
      return;
    }

    if (id === 'apple') {
      s.tookApple = true;
      s.appleOnGround = false;
      addItem('apple');
      hint('Чудесное яблоко у вас.');
      renderScene();
      finishSoon();
    }
  }

  function hintDigOnly() {
    var s = state;
    if (s.dig === 'spot') {
      hint(
        hasItem('shovel')
          ? 'Перетащите лопату на землю, чтобы выкопать ямку.'
          : 'Найдите в саду лопату. Перетащите её на место посадки.'
      );
      return;
    }
    if (s.dig === 'hole') {
      hint('Перетащите семечко из инвентаря в ямку.');
      return;
    }
    if (s.dig === 'seeded') {
      hint('Перетащите лопату на ямку, чтобы укрыть семечко землёй.');
      return;
    }
    if (s.dig === 'buried') {
      hint(hasItem('pitcher_full') ? 'Перетащите кувшин с водой на ямку, чтобы полить семечко.' : 'Наберите в кувшин воду из колодца, затем перетащите его на ямку, чтобы полить семечко.');
      return;
    }
    if (s.dig === 'watered') {
      hint('Нажимайте на солнце и луну, чтобы сменять день и ночь.');
    }
  }

  function handleTreeClick() {
    var s = state;
    if (s.treeStage < 4) {
      hint('Яблоня ещё растёт. Нажимайте на солнце и луну.');
      return;
    }
    if (s.appleOnGround || s.tookApple) {
      hint(s.tookApple ? 'Яблоко уже у тебя.' : 'Яблоко на земле. Нажми на него, чтобы подобрать.');
      return;
    }
    var now = Date.now();
    if (now - s.lastTreeClick > TRIPLE_MS) s.treeClicks = 0;
    s.lastTreeClick = now;
    s.treeClicks += 1;
    if (s.treeClicks >= 3) {
      s.treeClicks = 0;
      s.appleOnGround = true;
      hint('Яблоко упало!');
      renderScene();
    } else if (s.treeClicks === 1) {
      hint('Быстро нажмите на яблоню три раза, чтобы стряхнуть яблоко.');
    }
  }

  function applyUse(item, targetId) {
    var s = state;

    // Seed into hole
    if (item === 'seed' && targetId === 'dig') {
      if (s.dig === 'hole') {
        removeItem('seed');
        s.dig = 'seeded';
        hint('Семечко в ямке. Теперь укройте его землёй.');
        renderScene();
        return;
      }
      hint(s.dig === 'spot' ? 'Сначала выкопайте ямку.' : 'Здесь уже посажено семечко.');
      return;
    }

    // Shovel on dig — только через drag&drop
    if (item === 'shovel' && targetId === 'dig') {
      if (s.dig === 'spot') {
        s.digClicks += 1;
        if (s.digClicks >= DIG_NEED) {
          s.dig = 'hole';
          hint('Ямка выкопана.');
          renderScene();
        } else {
          var left = DIG_NEED - s.digClicks;
          hint('Перетащите лопату на это место ещё ' + left + (left === 1 ? ' раз.' : ' раза.'));
        }
        return;
      }
      if (s.dig === 'seeded') {
        s.dig = 'buried';
        hint('Семечко укрыто землёй. Теперь полейте его.');
        renderScene();
        return;
      }
      if (s.dig === 'hole') {
        hint('Сначала положите семечко в ямку.');
        return;
      }
      hint('Здесь нужен другой предмет.');
      return;
    }

    // Fill pitcher at well
    if ((item === 'pitcher' || item === 'pitcher_full') && targetId === 'well') {
      if (item === 'pitcher') {
        removeItem('pitcher');
        addItem('pitcher_full');
        hint('Кувшин наполнен водой.');
      } else {
        hint('Кувшин уже полный.');
      }
      return;
    }

    // Water buried seed
    if (item === 'pitcher_full' && targetId === 'dig') {
      if (s.dig === 'buried') {
        removeItem('pitcher_full');
        addItem('pitcher');
        s.dig = 'watered';
        s.watered = true;
        hint('Семечко полито. Нажимайте на солнце и луну, чтобы сменять день и ночь.');
        renderScene();
        return;
      }
      hint(s.dig === 'watered' ? 'Семечко уже полито. Переключайте день и ночь — нажимайте на солнце и луну.' : 'Сначала укройте семечко землёй.');
      return;
    }

    if (item === 'pitcher' && targetId === 'dig') {
      hint(s.dig === 'watered' ? 'Семечко уже полито. Переключайте день и ночь — нажимайте на солнце и луну.' : 'Наберите в кувшин воду из колодца, затем перетащите его на ямку, чтобы полить семечко.');
      return;
    }

    // Wrong combinations
    if (targetId === 'tree' || targetId === 'apple') {
      hint('Здесь нужен другой предмет.');
      return;
    }

    hint('Здесь нужен другой предмет.');
  }

  function onInvPointerDown(e) {
    var id = e.currentTarget.dataset.item;
    if (!id) return;
    e.preventDefault();
    startDrag(id, e);
  }

  function startDrag(id, e) {
    setHover(null);
    dragItem = id;
    markSelectedItem(id);
    var ghost = $('#' + ROOT_ID + ' .aq-drag-ghost');
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
    var ghost = $('#' + ROOT_ID + ' .aq-drag-ghost');
    if (!ghost) return;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  function onDragMove(e) {
    if(e.cancelable)e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    var hs = hitAt(e.clientX, e.clientY);
    document.querySelectorAll('#' + ROOT_ID + ' .aq-hotspot.is-drop-target').forEach(function (n) {
      if (n === hs) return;
      n.classList.remove('is-drop-target');
      setHotspotHighlight(n, false);
    });
    if (hs) {
      hs.classList.add('is-drop-target');
      setHotspotHighlight(hs, true);
    }
  }

  function onDragUp(e) {
    if(e.type==='pointercancel'){endDrag(true);return;}
    var hs = hitAt(e.clientX, e.clientY);
    if (hs && dragItem) {
      applyUse(dragItem, hs.dataset.id);
      endDrag(true);
      return;
    }
    endDrag(true);
    // Вне интерактивного объекта — без надписи
  }

  function endDrag(removeListeners) {
    dragItem = null;
    markSelectedItem(null);
    var ghost = $('#' + ROOT_ID + ' .aq-drag-ghost');
    if (ghost) ghost.hidden = true;
    var root = document.getElementById(ROOT_ID);
    if (root) root.classList.remove('is-dragging');
    document.querySelectorAll('#' + ROOT_ID + ' .aq-hotspot.is-drop-target').forEach(function (n) {
      n.classList.remove('is-drop-target');
      setHotspotHighlight(n, false);
    });
    if (removeListeners) {
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragUp);
      document.removeEventListener('pointercancel', onDragUp);
    }
  }

  function onDayNight() {
    dayNightTick();
    renderScene();
  }

  function dayNightTick() {
    var s = state;
    var goingDay = !s.isDay;
    setDay(goingDay);
    if (!goingDay) {
      hint('Ночь…');
      return;
    }
    // Daylight tick grows tree if watered
    if (!s.watered) {
      hint('Настал день. Чтобы яблоня росла, сначала полейте семечко.');
      return;
    }
    if (s.treeStage >= 4) {
      hint('Яблоня уже выросла.');
      return;
    }
    s.growTicks += 1;
    // First daylight after water: sprout appears (stage 1)
    if (s.treeStage === 0) {
      s.treeStage = 1;
      hint('Показался росток.');
      return;
    }
    s.treeStage += 1;
    if (s.treeStage === 2) hint('Саженец стал выше.');
    else if (s.treeStage === 3) hint('Яблоня выросла.');
    else if (s.treeStage >= 4) {
      s.treeStage = 4;
      hint('На яблоне появились плоды.');
    }
  }

  function endWithFade(cb) {
    var root = document.getElementById(ROOT_ID);
    var done = typeof cb === 'function' ? cb : onComplete;
    if (!root || root.hidden) {
      stop();
      if (typeof done === 'function') done();
      return;
    }
    var veil = root.querySelector('.quest-exit-veil');
    if (!veil) {
      veil = el('div', 'quest-exit-veil');
      root.appendChild(veil);
    }
    void veil.offsetWidth;
    veil.classList.add('is-on');
    setTimeout(function () {
      // Колбэк с аргументом сам убирает оверлей, когда под шторкой всё готово
      if (typeof done === 'function' && done.length > 0) {
        done(stop);
        return;
      }
      stop();
      if (typeof done === 'function') done();
    }, 360);
  }

  function finishSoon() {
    setTimeout(function () {
      endWithFade(onComplete);
    }, 1500);
  }

  function onResize() {
    syncStageSize();
  }

  function start(cb) {
    onComplete = cb;
    ensureDom();
    SCENE_SPRITES.forEach(function (n) {
      preload(sprite(n));
    });
    state = {
      inventory: ['seed'],
      tookShovel: false,
      tookPitcher: false,
      dig: 'spot',
      digClicks: 0,
      watered: false,
      growTicks: 0,
      treeStage: 0,
      treeClicks: 0,
      lastTreeClick: 0,
      appleOnGround: false,
      tookApple: false,
      isDay: true,
      removed: {}
    };
    var root = document.getElementById(ROOT_ID);
    var oldVeil = root.querySelector('.quest-exit-veil');
    if (oldVeil) oldVeil.remove();
    root.hidden = false;
    root.classList.remove('aq-enter');
    void root.offsetWidth;
    root.classList.add('aq-enter');
    document.body.classList.add('quest-active');
    setDay(true);
    renderInventory();
    renderScene();
    syncStageSize();
    hint('Вырастите чудесную яблоню. Начните с лопаты и места посадки.');
    window.addEventListener('resize', onResize);
    // Keep sized to canvas
    state._fit = setInterval(syncStageSize, 500);
  }

  function stop() {
    var root = document.getElementById(ROOT_ID);
    if (root) root.hidden = true;
    document.body.classList.remove('quest-active');
    window.removeEventListener('resize', onResize);
    if (state && state._fit) clearInterval(state._fit);
    endDrag(true);
    state = null;
  }

  var ITEMS = {
    seed: { label: 'Семечко', icon: 'assets/quest/apple/item_seed.webp' },
    shovel: { label: 'Лопата', icon: 'assets/quest/apple/item_shovel.webp' },
    pitcher: { label: 'Кувшин', icon: 'assets/quest/apple/item_pitcher.webp' },
    pitcher_full: { label: 'Кувшин с водой', icon: 'assets/quest/apple/item_pitcher_full.webp' },
    apple: { label: 'Яблоко', icon: 'assets/quest/apple/item_apple.webp' }
  };

  function tweenAlpha(game, sprite, alpha, ms) {
    return new Promise(function (resolve) {
      game.managers.tween.tween(sprite, { alpha: alpha }, resolve, ms, true, 0, false);
    });
  }

  /**
   * Фон + герои появляются из затемнения одновременно (не раньше и не позже).
   * call yardAppear
   */
  function YardAppearPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  YardAppearPlugin.prototype.onInit = function () {};
  YardAppearPlugin.prototype.onStart = function () {};
  YardAppearPlugin.prototype.onCall = function (params) {
    var game = this.game;
    var bg = (params && params.bg) || 'garden';
    var chars =
      (params && params.chars) ||
      [
        { id: 'ostap', look: 'normal_yard', at: 'HERO_YARD' },
        { id: 'trader', look: 'normal', at: 'TRADER_YARD' }
      ];
    var fadeTime = (game.storyConfig && game.storyConfig.fadetime) || 280;

    var cover = game.add.graphics(0, 0);
    cover.beginFill(0, 1);
    cover.drawRect(0, 0, game.config.w, game.config.h);
    cover.endFill();
    if (game.world && game.world.bringToTop) game.world.bringToTop(cover);
    // После квеста экран уже чёрный — второе затемнение было бы просто паузой
    var curBg = game.managers.background.current;
    var fromBlack = curBg && curBg.name === 'black';
    cover.alpha = fromBlack ? 1 : 0;

    (fromBlack ? Promise.resolve() : tweenAlpha(game, cover, 1, fadeTime))
      .then(function () {
        var pos = game.storyConfig.positions;
        return game.managers.background.show(bg, 'CUT').then(function () {
          var tasks = chars.map(function (c) {
            return game.managers.character.show(c.id, 'CUT', {
              look: c.look || 'normal',
              position: pos[c.at] || pos.DEFAULT
            });
          });
          return Promise.all(tasks);
        });
      })
      .then(function () {
        return tweenAlpha(game, cover, 0, fadeTime);
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
  YardAppearPlugin.prototype.onTeardown = function () {};

  /**
   * Затемнение вместе с персонажами: сначала чёрная шторка поверх сцены,
   * и только под ней персонажи убираются — без вспышки.
   * call fadeOutTogether
   */
  function FadeOutTogetherPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  FadeOutTogetherPlugin.prototype.onInit = function () {};
  FadeOutTogetherPlugin.prototype.onStart = function () {};
  FadeOutTogetherPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var fadeTime = (game.storyConfig && game.storyConfig.fadetime) || 280;
    var chars = (params && params.chars) || null;
    var nextBg = (params && params.bg) || 'black';
    var bgWith = (params && params.bgWith) || 'FADE';

    // Без чёрной засветки: только убрать спрайты и (если нужно) сменить фон
    if (params && params.cover === false) {
      var cm = game.managers.character;
      var hideTasks = [];
      if (chars && chars.length) {
        chars.forEach(function (id) {
          var ch = cm.characters[id];
          if (ch && ch.currentLook) hideTasks.push(cm.hide(id, 'CUT'));
        });
      }
      Promise.all(hideTasks)
        .then(function () {
          if (nextBg && nextBg !== 'black') {
            return game.managers.background.show(nextBg, bgWith);
          }
        })
        .then(function () {
          game.resolveAction();
        })
        .catch(function (err) {
          console.error(err);
          game.resolveAction();
        });
      return;
    }

    var cover = game.add.graphics(0, 0);
    cover.beginFill(0, 1);
    cover.drawRect(0, 0, game.config.w, game.config.h);
    cover.alpha = 0;
    cover.endFill();
    if (game.world && game.world.bringToTop) game.world.bringToTop(cover);

    tweenAlpha(game, cover, 1, fadeTime)
      .then(function () {
        var cm = game.managers.character;
        var tasks = [];
        if (chars && chars.length) {
          chars.forEach(function (id) {
            var ch = cm.characters[id];
            if (ch && ch.currentLook) tasks.push(cm.hide(id, 'CUT'));
          });
        } else if (typeof cm.hideAll === 'function') {
          tasks.push(cm.hideAll('CUT'));
        } else {
          Object.keys(cm.characters || {}).forEach(function (id) {
            var ch = cm.characters[id];
            if (ch && ch.currentLook) tasks.push(cm.hide(id, 'CUT'));
          });
        }
        return Promise.all(tasks).then(function () {
          return game.managers.background.show(nextBg, 'CUT');
        });
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
  FadeOutTogetherPlugin.prototype.onTeardown = function () {};

  function easeSineIn(k) { return 1 - Math.cos((k * Math.PI) / 2); }
  function easeSineOut(k) { return Math.sin((k * Math.PI) / 2); }

  /**
   * Пропуск разворота/ходьбы по клику. Клик досрочно завершает текущую анимацию
   * и все, что идут за ней цепочкой (следующий муж, уход) — до следующей реплики.
   */
  var anims = [];
  var skipping = false;
  var lastAnimEnd = 0;
  var CHAIN_MS = 120;
  var skipListenerOn = false;

  function ensureSkipListener(game) {
    if (skipListenerOn || !game.canvas) return;
    skipListenerOn = true;
    game.canvas.addEventListener('pointerdown', function () {
      if (!anims.length) return;
      skipping = true;
      anims.slice().forEach(function (a) { a.finish(); });
    });
  }

  // Свой таймер по реальному времени: часы Phaser здесь идут в ~2.7 раза медленнее
  function runAnim(game, ms, apply) {
    ensureSkipListener(game);
    if (skipping && performance.now() - lastAnimEnd > CHAIN_MS) skipping = false;
    return new Promise(function (resolve) {
      var start = performance.now();
      var a = {
        done: false,
        finish: function () {
          if (a.done) return;
          a.done = true;
          apply(1);
          anims.splice(anims.indexOf(a), 1);
          lastAnimEnd = performance.now();
          resolve();
        }
      };
      if (skipping || !(ms > 0)) {
        anims.push(a);
        a.finish();
        return;
      }
      anims.push(a);
      function step(now) {
        if (a.done) return;
        var k = Math.min(1, (now - start) / ms);
        if (k < 1) {
          apply(k);
          requestAnimationFrame(step);
        } else {
          a.finish();
        }
      }
      requestAnimationFrame(step);
    });
  }

  function tweenScaleX(game, sprite, to, ms, easing) {
    var from = sprite.scale.x;
    return runAnim(game, ms, function (k) {
      sprite.scale.x = from + (to - from) * easing(k);
    });
  }

  /**
   * Разворот персонажа на месте: спрайт сужается до ребра,
   * подменяется на новый вид и раскрывается обратно.
   * call turnAround: { id, look }
   */
  function TurnAroundPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  TurnAroundPlugin.prototype.onInit = function () {};
  TurnAroundPlugin.prototype.onStart = function () {};
  TurnAroundPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var id = params && params.id;
    var look = (params && params.look) || 'back';
    var half = (params && params.ms) || 100;
    var cm = game.managers.character;
    var ch = cm.characters[id];
    var cur = ch && ch.currentLook;
    if (!cur) {
      game.resolveAction();
      return;
    }

    tweenScaleX(game, cur, 0, half, easeSineIn)
      .then(function () {
        // Не через cm.show: новый спрайт RenJS успевает мелькнуть в полную ширину
        cur.loadTexture(id + '_' + look);
        cur.name = look;
        return tweenScaleX(game, cur, 1, half, easeSineOut);
      })
      .then(function () {
        game.resolveAction();
      })
      .catch(function (err) {
        console.error(err);
        if (ch.currentLook) ch.currentLook.scale.x = 1;
        game.resolveAction();
      });
  };
  TurnAroundPlugin.prototype.onTeardown = function () {};

  var WALK_SPEED = 700;

  function tweenPosition(game, sprite, x, y, ms) {
    var x0 = sprite.x;
    var y0 = sprite.y;
    return runAnim(game, ms, function (k) {
      sprite.x = x0 + (x - x0) * k;
      sprite.y = y0 + (y - y0) * k;
    });
  }

  /**
   * Ходьба с постоянной скоростью (MOVE в RenJS тратит одно время на любой путь).
   * call walkTo: { id, to, speed, behind } — behind: идти позади остальных персонажей
   */
  function WalkToPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  WalkToPlugin.prototype.onInit = function () {};
  WalkToPlugin.prototype.onStart = function () {};
  WalkToPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var ch = params && game.managers.character.characters[params.id];
    var cur = ch && ch.currentLook;
    var pos = params && game.storyConfig.positions[params.to];
    if (!cur || !pos) {
      game.resolveAction();
      return;
    }
    if (params.behind && cur.parent && cur.parent.sendToBack) cur.parent.sendToBack(cur);
    var speed = params.speed || WALK_SPEED;
    var dist = Math.sqrt(Math.pow(pos.x - cur.x, 2) + Math.pow(pos.y - cur.y, 2));
    tweenPosition(game, cur, pos.x, pos.y, (dist / speed) * 1000).then(function () {
      game.resolveAction();
    });
  };
  WalkToPlugin.prototype.onTeardown = function () {};

  /** RenJS plugin: call appleQuest */
  function AppleQuestPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  AppleQuestPlugin.prototype.onInit = function () {};
  AppleQuestPlugin.prototype.onStart = function () {};
  AppleQuestPlugin.prototype.onCall = function () {
    var game = this.game;
    try {
      if (game.gui && game.gui.hideHUD) game.gui.hideHUD();
    } catch (e) { /* optional */ }
    start(function (closeOverlay) {
      // Под чёрной шторкой: в движке чёрный фон и никого — иначе после квеста мелькнёт сад
      var cm = game.managers.character;
      var hides = Object.keys(cm.characters || {})
        .filter(function (id) {
          return cm.characters[id].currentLook;
        })
        .map(function (id) {
          return cm.hide(id, 'CUT');
        });
      Promise.all(hides)
        .then(function () {
          return game.managers.background.show('black', 'CUT');
        })
        .catch(function (err) {
          console.error(err);
        })
        .then(function () {
          closeOverlay();
          try {
            if (game.gui && game.gui.showHUD) game.gui.showHUD();
          } catch (e2) { /* optional */ }
          game.resolveAction();
        });
    });
  };
  AppleQuestPlugin.prototype.onTeardown = function () {
    stop();
  };

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
    [APPLE_DIR + 'bg.webp', APPLE_DIR + 'fence_v2.webp?v=' + SPRITES_V].forEach(function (src) {
      new Image().src = src;
    });
  }

  // —— Управление с клавиатуры (js/keyboard.js): те же действия, что мышью ——
  var keyboardApi = {
    active: function () {
      return !!state && !dragItem;
    },
    nodes: function () {
      var w = world();
      return w ? w.querySelectorAll('.aq-hotspot') : [];
    },
    focus: function (node) {
      setHover(node);
    },
    activate: function (node) {
      onHotspotClick(node.dataset.id);
    },
    use: function (item, node) {
      applyUse(item, node.dataset.id);
    },
    items: function () {
      return state ? state.inventory.slice() : [];
    },
    select: function (id) {
      markSelectedItem(id);
    }
  };

  global.TridaraAppleQuest = {
    keyboard: keyboardApi,
    warmup: warmup,
    start: start,
    stop: stop,
    Plugin: AppleQuestPlugin,
    YardAppearPlugin: YardAppearPlugin,
    FadeOutTogetherPlugin: FadeOutTogetherPlugin,
    TurnAroundPlugin: TurnAroundPlugin,
    WalkToPlugin: WalkToPlugin
  };
})(window);
