/**
 * Point-and-click quest «Лошадь» — два экрана (поле | конюшня) со слайд-переходом.
 * Спрайты свёрстаны в пикселях экрана 1920×1080 (x — центр, bottom — нижний край),
 * попадание и подсветка — по непрозрачным пикселям спрайта.
 */
(function (global) {
  var ROOT_ID = 'horse-quest';
  var WHEAT_NEED = 3;
  var RUB_NEED_MS = 1000; // водить щёткой 1 с суммарно (не сбрасывается); было 1,5 с
  var FINISH_DELAY_MS = 1500;

  var SCENE_W = 1920;
  var SCENE_H = 1080;
  var DIR = 'assets/quest/horse/';
  // Поднимать при перегенерации спрайтов — иначе браузер держит старые картинки
  var SPRITES_V = 2;
  var HIT_ALPHA = 40;

  // Места появления предметов у торговца конюшни (x центра), низ — PICKUP_BOTTOM
  var PICKUP_X = [1400, 1270, 1130];
  var PICKUP_BOTTOM = 880;
  // Насколько зона клика у предметов шире самого спрайта (px спрайта = px сцены)
  var PICKUP_PAD = 14;

  // Три куста пшеницы (как в tools/prepare_horse_quest_sprites.py); z — ближний поверх дальнего
  var WHEAT_BUSHES = [
    { x: 930, bottom: 935, z: 4 },
    { x: 1330, bottom: 840, z: 2 },
    { x: 1640, bottom: 905, z: 3 }
  ];

  var state = null;
  var onComplete = null;
  var dragItem = null;
  var hintTypeTimer = null;
  var hintHideTimer = null;
  var rubActive = false;
  var lastRub = null;
  var lastRubTs = null;
  var masks = {};
  var hoverNode = null;
  var talkTimer = null;

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
    var box = $('#' + ROOT_ID + ' .hq-hint');
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

  // Кто сейчас говорит — переживает перерисовку экрана посреди реплики
  var talkingId = null;

  function setTalking(npcId) {
    talkingId = npcId;
    document.querySelectorAll('#' + ROOT_ID + ' .hq-hotspot[data-src-talk]').forEach(function (n) {
      n.classList.toggle('is-talking', n.dataset.id === npcId);
      refreshSprite(n);
    });
  }

  function refreshSprite(node) {
    var img = node.querySelector('img');
    if (!img) return;
    var talking = node.classList.contains('is-talking') && node.dataset.srcTalk;
    var base = talking ? node.dataset.srcTalk : node.dataset.src;
    var lit = node === hoverNode || node.classList.contains('is-drop-target');
    var want = lit ? highlightSrc(base) : base;
    if (img.getAttribute('src') !== want) img.src = want;
  }

  function ensureDom() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = el('div', 'hq-overlay aq-overlay');
    root.id = ROOT_ID;
    root.hidden = true;
    root.innerHTML =
      '<div class="hq-stage aq-stage">' +
      '  <div class="hq-slider">' +
      '    <div class="hq-panel" data-screen="field">' +
      '      <div class="hq-bg" data-screen="field"></div>' +
      '      <div class="hq-world" data-screen="field"></div>' +
      '    </div>' +
      '    <div class="hq-panel" data-screen="stable">' +
      '      <div class="hq-bg" data-screen="stable"></div>' +
      '      <div class="hq-world" data-screen="stable"></div>' +
      '    </div>' +
      '  </div>' +
      '  <aside class="aq-inv hq-inv" aria-label="Инвентарь">' +
      '    <div class="aq-inv-title">С собой</div>' +
      '    <div class="aq-inv-slots"></div>' +
      '  </aside>' +
      '  <button type="button" class="hq-nav hq-nav-left" title="К полю" aria-label="К полю">◀</button>' +
      '  <button type="button" class="hq-nav hq-nav-right" title="К конюшне" aria-label="К конюшне">▶</button>' +
      '  <div class="hq-hint aq-hint is-empty" role="status"></div>' +
      '  <div class="aq-drag-ghost hq-drag-ghost" hidden></div>' +
      '</div>';
    document.body.appendChild(root);
    var slider = root.querySelector('.hq-slider');
    slider.addEventListener('pointermove', onWorldMove);
    slider.addEventListener('pointerleave', function () {
      if (!dragItem) setHover(null);
    });
    slider.addEventListener('click', onWorldClick);
    return root;
  }

  function syncStageSize() {
    var stage = $('#' + ROOT_ID + ' .hq-stage');
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

  function world(screen) {
    return $('#' + ROOT_ID + ' .hq-world[data-screen="' + screen + '"]');
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
    im.src = src;
  }

  // У декораций и масок попадания нет картинки подсветки _hl — не запрашивать её
  var NO_HL = ['stable'];

  function preload(src) {
    loadMask(src);
    var m = /([^\/]+)\.webp/.exec(src);
    if (m && NO_HL.indexOf(m[1]) !== -1) return;
    var hl = new Image();
    hl.src = highlightSrc(src);
  }

  // Маска попадания, производная от альфы спрайта: { w, h, pad, hit: Uint8Array }
  // fill — закрасить прозрачные дыры внутри контура,
  // close — замкнуть разрывы и рваный край: расширить и снова сузить на столько пикселей
  // (у серпа так закрывается полумесяц лезвия),
  // pad — расширить контур на столько пикселей спрайта (мелкие предметы)
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

  /** Верхний объект текущего экрана с непрозрачным пикселем под курсором. */
  function hitAt(cx, cy) {
    var w = world(state.screen);
    if (!w) return null;
    var nodes = Array.prototype.slice.call(w.querySelectorAll('.hq-hotspot'));
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
    var slider = $('#' + ROOT_ID + ' .hq-slider');
    if (slider) slider.style.cursor = node ? 'pointer' : '';
    if (node) refreshSprite(node);
  }

  function onWorldMove(e) {
    if (dragItem || !state) return;
    setHover(hitAt(e.clientX, e.clientY));
  }

  function onWorldClick(e) {
    if (dragItem || !state) return;
    var node = hitAt(e.clientX, e.clientY);
    if (!node) return;
    e.preventDefault();
    onHotspotClick(node.dataset.id);
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

  /** cfg: { id, x, bottom, z, src, srcTalk?, alt, spawn?, hitFill?, hitClose?, hitPad? } */
  function makeHotspot(screen, cfg) {
    var node = el('div', 'aq-hotspot hq-hotspot hq-px' + (cfg.spawn ? ' hq-spawn-in' : ''));
    node.dataset.id = cfg.id;
    node.dataset.src = cfg.src;
    if (cfg.srcTalk) node.dataset.srcTalk = cfg.srcTalk;
    if (cfg.hitFill) node.dataset.hitFill = '1';
    if (cfg.hitClose) node.dataset.hitClose = cfg.hitClose;
    if (cfg.hitPad) node.dataset.hitPad = cfg.hitPad;
    if (cfg.srcTalk && talkingId === cfg.id) node.classList.add('is-talking');
    node.dataset.z = cfg.z || 2;
    place(node, cfg.x, cfg.bottom, cfg.z || 2);
    var img = el('img');
    img.alt = cfg.alt || '';
    img.draggable = false;
    sizeFromImage(node, img, cfg.src);
    img.src = node.classList.contains('is-talking') ? cfg.srcTalk : cfg.src;
    node.appendChild(img);
    preload(cfg.src);
    if (cfg.srcTalk) preload(cfg.srcTalk);
    world(screen).appendChild(node);
    if (cfg.spawn) {
      setTimeout(function () {
        node.classList.remove('hq-spawn-in');
      }, 700);
    }
    return node;
  }

  function makeDecor(screen, name, x, bottom, z) {
    var node = el('div', 'hq-decor');
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

  function renderField() {
    var w = world('field');
    w.innerHTML = '';
    var s = state;

    // сдвинута влево-вниз на 14 px: левый и нижний края (и их обводка) за краем экрана
    makeHotspot('field', { id: 'river', x: 216, bottom: 1094, z: 2, src: sprite('river'), alt: 'Река' });

    makeHotspot('field', {
      id: 'woman',
      x: 528,
      bottom: 880,
      z: 3,
      src: sprite('woman'),
      srcTalk: sprite('woman_talk'),
      alt: 'Девушка у реки'
    });

    WHEAT_BUSHES.forEach(function (b, i) {
      makeHotspot('field', {
        id: 'wheat' + (i + 1),
        x: b.x,
        bottom: b.bottom,
        z: b.z,
        src: sprite('wheat' + (i + 1) + (s.wheatCut[i] ? '_cut' : '')),
        alt: 'Пшеница'
      });
    });

    // Урожай на месте скоса
    if (s.wheatOnGround && !s.tookWheat) {
      makeHotspot('field', {
        id: 'wheat_drop',
        x: 1560,
        bottom: 880,
        z: 5,
        src: sprite('wheat_drop'),
        alt: 'Пшеница',
        spawn: s.justSpawned === 'wheat',
        hitPad: PICKUP_PAD
      });
      if (s.justSpawned === 'wheat') s.justSpawned = null;
    }
  }

  function renderStable() {
    var w = world('stable');
    w.innerHTML = '';
    var s = state;

    makeDecor('stable', 'stable', 1052, 856, 1);

    makeHotspot('stable', {
      id: 'horses',
      x: 958,
      bottom: 697,
      z: 2,
      src: sprite(s.horsesClean ? 'horses_clean' : 'horses_dirty'),
      alt: 'Лошади'
    });

    makeHotspot('stable', {
      id: 'trough',
      x: 1021,
      bottom: 852,
      z: 3,
      src: sprite(s.horsesFed ? 'trough_food' : 'trough'),
      alt: 'Кормушки'
    });

    makeHotspot('stable', {
      id: 'keeper',
      x: 1629,
      bottom: 898,
      z: 4,
      src: sprite('keeper'),
      srcTalk: sprite('keeper_talk'),
      alt: 'Хозяин конюшни'
    });

    // Предметы у торговца конюшни (появляются по сюжету)
    var spawned = s.justSpawned;
    var slot = 0;
    function pickup(id, name, alt, key) {
      makeHotspot('stable', {
        id: id,
        x: PICKUP_X[Math.min(slot, PICKUP_X.length - 1)],
        bottom: PICKUP_BOTTOM,
        z: 5,
        src: sprite(name),
        alt: alt,
        spawn: spawned === key,
        hitPad: PICKUP_PAD,
        // у серпа полумесяц лезвия открыт — замыкаем, чтобы клик внутри него тоже попадал
        hitFill: name === 'sickle',
        hitClose: name === 'sickle' ? 16 : 0
      });
      slot += 1;
    }
    if (s.bucketOnGround && !s.tookBucket) pickup('bucket', 'bucket', 'Ведро', 'bucket');
    if (s.sickleOnGround && !s.tookSickle) pickup('sickle_drop', 'sickle', 'Серп', 'sickle');
    if (s.spongeOnGround && !s.tookSponge) pickup('sponge_drop', 'brush', 'Щётка', 'sponge');
    if (s.coinOnGround && !s.tookCoin) pickup('coin_drop', 'coin', 'Монета', 'coin');
    if (spawned && spawned !== 'wheat') s.justSpawned = null;
  }

  function renderAll() {
    hoverNode = null;
    renderField();
    renderStable();
    renderInventory();
    updateNav();
    setScreen(state.screen, false);
  }

  function updateNav() {
    var left = $('#' + ROOT_ID + ' .hq-nav-left');
    var right = $('#' + ROOT_ID + ' .hq-nav-right');
    if (!left || !right) return;
    left.disabled = state.screen === 'field';
    right.disabled = state.screen === 'stable';
    left.classList.toggle('is-disabled', state.screen === 'field');
    right.classList.toggle('is-disabled', state.screen === 'stable');
  }

  function setScreen(screen, animate) {
    var slider = $('#' + ROOT_ID + ' .hq-slider');
    if (!slider) return;
    var from = state.screen;
    state.screen = screen;
    setHover(null);
    if (animate && from !== screen) {
      slider.classList.add('is-animating');
      slider.dataset.from = from;
      slider.dataset.to = screen;
      slider.dataset.screen = screen;
    } else {
      // Без слайда: экран встаёт сразу (иначе при старте видно, как он проезжает)
      slider.style.transition = 'none';
      slider.dataset.screen = screen;
      void slider.offsetWidth;
      slider.style.transition = '';
    }
    updateNav();
    setTimeout(function () {
      slider.classList.remove('is-animating');
    }, 480);
  }

  // —— Логика ——

  function onWomanClick() {
    var s = state;
    if (hasItem('bucket') && !s.horsesDrunk) {
      speak('woman', 'Набери воды в реке. Для лошадей в самый раз.');
      return;
    }
    if (hasItem('sickle')) {
      speak('woman', 'Пшеница растёт тут же, на поле.');
      return;
    }
    if (!s.introSaid) {
      speak('woman', 'Ищешь работу? Хозяин конюшни платит за помощь.');
      return;
    }
    speak('woman', 'Помоги хозяину конюшни – он заплатит монету.');
  }

  function onKeeperClick() {
    var s = state;
    if (s.coinOnGround && !s.tookCoin) {
      speak('keeper', 'Ты всё сделал. Забирай монету.');
      return;
    }
    if (s.horsesClean && !s.coinOnGround) {
      s.coinOnGround = true;
      s.justSpawned = 'coin';
      renderStable();
      speak('keeper', 'Спасибо за помощь. Вот твоя монета.');
      return;
    }
    if (!s.introSaid) {
      s.introSaid = true;
      speak('keeper', 'Помоги с лошадьми – получишь монету. Сначала напои, потом накорми и вычисти. Ведро здесь, вода – у реки.');
      // Ведро появляется после реплики
      setTimeout(function () {
        if (!state || state.tookBucket) return;
        state.bucketOnGround = true;
        state.justSpawned = 'bucket';
        renderStable();
      }, 900);
      return;
    }
    if (s.spongeOnGround && !s.tookSponge) {
      speak('keeper', 'Возьми щётку. Облей лошадей водой, а потом вычисти.');
      return;
    }
    if (s.sickleOnGround && !s.tookSickle) {
      speak('keeper', 'Возьми серп и срежь пшеницу в поле. Положи её в кормушку.');
      return;
    }
    if (s.bucketOnGround && !s.tookBucket) {
      speak('keeper', 'Сначала напои лошадей. Возьми ведро и сходи к реке.');
      return;
    }
    speak('keeper', 'Сначала вода, потом корм. После этого вычисти лошадей.');
  }

  function onHotspotClick(id) {
    if (dragItem) return;
    var s = state;

    if (id === 'woman') {
      onWomanClick();
      return;
    }
    if (id === 'keeper') {
      onKeeperClick();
      return;
    }

    if (id === 'bucket') {
      s.tookBucket = true;
      s.bucketOnGround = false;
      addItem('bucket');
      renderStable();
      return;
    }

    if (id === 'sickle_drop') {
      s.tookSickle = true;
      s.sickleOnGround = false;
      s.hasSickle = true;
      addItem('sickle');
      renderStable();
      hint('Срежьте серпом все три пучка пшеницы. Перетащите сноп в кормушку.');
      return;
    }

    if (id === 'sponge_drop') {
      s.tookSponge = true;
      s.spongeOnGround = false;
      s.hasSponge = true;
      addItem('sponge');
      renderStable();
      hint('Сначала облейте лошадей водой. Затем проведите по ним щёткой.');
      return;
    }

    if (id === 'coin_drop') {
      finishQuest();
      return;
    }

    if (id === 'wheat_drop') {
      s.tookWheat = true;
      s.wheatOnGround = false;
      addItem('wheat');
      renderField();
      return;
    }
  }

  function applyUse(item, targetId) {
    var s = state;

    // Реакции торговца конюшни на предметы из инвентаря
    if (targetId === 'keeper') {
      if (item === 'bucket' || item === 'bucket_full') {
        if (s.horsesDrunk) {
          speak('keeper', 'Ведро оставь себе: ещё понадобится, чтобы вымыть лошадей.');
        } else {
          speak('keeper', 'Помоги с лошадьми – получишь монету. Сначала напои, потом накорми и вычисти. Ведро здесь, вода – у реки.');
        }
        return;
      }
      if (item === 'sickle') {
        speak('keeper', s.wheatDone ? 'Серп больше не нужен.' : 'Срежь серпом все три пучка пшеницы. Положи сноп в кормушку.');
        return;
      }
      if (item === 'wheat') {
        speak('keeper', 'Положи сноп в кормушку.');
        return;
      }
      if (item === 'sponge') {
        speak('keeper', s.horsesClean ? 'Щётка больше не нужна.' : 'Сначала облей лошадей водой. Потом вычисти их щёткой.');
        return;
      }
      speak('keeper', 'Для этой работы нужно другое.');
      return;
    }

    if (targetId === 'woman') {
      if (item === 'bucket') {
        speak('woman', 'Набери воды в реке. Для лошадей в самый раз.');
        return;
      }
      speak('woman', 'Мне это не нужно. Спроси хозяина конюшни.');
      return;
    }

    // Fill bucket at river
    if (item === 'bucket' && targetId === 'river') {
      removeItem('bucket');
      addItem('bucket_full');
      return;
    }
    if (item === 'bucket_full' && targetId === 'river') {
      return;
    }

    // Water trough
    if (item === 'bucket_full' && targetId === 'trough') {
      if (s.horsesDrunk) {
        hint('Лошади напоены. Теперь положите пшеницу в кормушку.');
        return;
      }
      removeItem('bucket_full');
      addItem('bucket');
      s.horsesDrunk = true;
      if (!s.tookSickle && !s.hasSickle) {
        s.sickleOnGround = true;
        s.justSpawned = 'sickle';
      }
      // без надписи при поении
      renderStable();
      return;
    }

    // Water horses (перед мытьём)
    if (item === 'bucket_full' && targetId === 'horses') {
      // пока лошадей нужно напоить — подсказать про кормушки
      if (!s.horsesDrunk) {
        hint('Перетащите ведро с водой на кормушки.');
        return;
      }
      if (!s.horsesFed) {
        hint('Сначала накормите лошадей.');
        return;
      }
      if (s.stableWatered) {
        hint('Лошади уже облиты водой. Теперь проведите по ним щёткой.');
        return;
      }
      removeItem('bucket_full');
      addItem('bucket');
      s.stableWatered = true;
      renderStable();
      return;
    }

    // Серп на куст — куст скошен с одного взмаха, без надписей; сноп — когда скошены все
    var bush = /^wheat(\d)$/.exec(targetId);
    if (item === 'sickle' && bush) {
      var bi = Number(bush[1]) - 1;
      if (!s.hasSickle || s.wheatDone) return;
      if (s.wheatCut[bi]) {
        hint('Эта пшеница уже срезана.');
        return;
      }
      s.wheatCut[bi] = true;
      s.wheatCuts += 1;
      if (s.wheatCuts >= WHEAT_NEED) {
        s.wheatDone = true;
        s.wheatOnGround = true;
        s.tookWheat = false;
        s.justSpawned = 'wheat';
        removeItem('sickle');
      }
      renderField();
      return;
    }

    // Wheat to trough
    if (item === 'wheat' && targetId === 'trough') {
      if (!s.horsesDrunk) {
        hint('Сначала напоите лошадей.');
        return;
      }
      if (s.horsesFed) {
        hint('Лошади уже накормлены.');
        return;
      }
      removeItem('wheat');
      s.horsesFed = true;
      if (!s.tookSponge && !s.hasSponge) {
        s.spongeOnGround = true;
        s.justSpawned = 'sponge';
      }
      // без надписи при кормлении
      renderStable();
      return;
    }

    if (item === 'sponge' && targetId === 'horses') {
      if (!s.stableWatered) {
        hint('Сначала облейте лошадей водой из ведра.');
        return;
      }
      if (s.horsesClean) {
        hint('Лошади уже чистые.');
        return;
      }
      hint('Проведите щёткой по лошадям.');
      return;
    }

    hint('Здесь нужен другой предмет.');
  }

  function finishWash() {
    var s = state;
    s.horsesClean = true;
    s.rubTimeMs = 0;
    lastRubTs = null;
    if (!s.coinOnGround && !s.tookCoin) {
      s.coinOnGround = true;
      s.justSpawned = 'coin';
    }
    renderStable();
  }

  function finishQuest() {
    var s = state;
    if (s.tookCoin) return;
    s.tookCoin = true;
    s.coinOnGround = false;
    addItem('coin');
    renderStable();
    hint('Монета заработана. Можно вернуться за конём.');
    setTimeout(function () {
      endWithFade(onComplete);
    }, FINISH_DELAY_MS);
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
      stop();
      if (typeof done === 'function') done();
    }, 580);
  }

  // —— Перетаскивание ——

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
    rubActive = id === 'sponge';
    lastRub = { x: e.clientX, y: e.clientY };
    lastRubTs = null;
    var ghost = $('#' + ROOT_ID + ' .hq-drag-ghost');
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
    var ghost = $('#' + ROOT_ID + ' .hq-drag-ghost');
    if (!ghost) return;
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
  }

  function pointOverHorses(x, y) {
    var node = state.screen === 'stable' && $('#' + ROOT_ID + ' [data-id="horses"]');
    if (!node) return false;
    var r = node.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function onRubMove(e) {
    var now = Date.now();
    if (!lastRub) {
      lastRub = { x: e.clientX, y: e.clientY };
      lastRubTs = now;
      return;
    }
    if (lastRubTs == null) {
      lastRub = { x: e.clientX, y: e.clientY };
      lastRubTs = now;
      return;
    }
    // Сдвиг считаем от последней засчитанной точки, а не от прошлого события:
    // события мыши идут часто, и при медленном движении каждый шаг — 1 px,
    // поэтому раньше такие движения не засчитывались вовсе
    var dx = e.clientX - lastRub.x;
    var dy = e.clientY - lastRub.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= 3) {
      state.rubTimeMs += Math.min(120, now - lastRubTs);
      lastRub = { x: e.clientX, y: e.clientY };
      lastRubTs = now;
    }
    if (state.rubTimeMs >= RUB_NEED_MS && !state.horsesClean && state.stableWatered) {
      finishWash();
      endDrag(true);
    }
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
    var rubbing = rubActive && dragItem === 'sponge' && state.stableWatered && !state.horsesClean;
    if (rubbing && pointOverHorses(e.clientX, e.clientY)) {
      setDropTarget($('#' + ROOT_ID + ' [data-id="horses"]'));
      onRubMove(e);
      return;
    }
    if (rubbing) lastRubTs = null;
    setDropTarget(hitAt(e.clientX, e.clientY));
  }

  function onDragUp(e) {
    if(e.type==='pointercancel'){endDrag(true);return;}
    if (dragItem === 'sponge' && pointOverHorses(e.clientX, e.clientY)) {
      if (state.rubTimeMs >= RUB_NEED_MS && state.stableWatered && !state.horsesClean) {
        finishWash();
      } else if (!state.horsesClean) {
        hint(state.stableWatered ? 'Проведите щёткой ещё немного.' : 'Сначала облейте лошадей водой.');
      }
      endDrag(true);
      return;
    }
    var hs = hitAt(e.clientX, e.clientY);
    var item = dragItem;
    endDrag(true);
    // Вне интерактивного объекта — без надписи
    if (hs && item) applyUse(item, hs.dataset.id);
  }

  function endDrag(removeListeners) {
    dragItem = null;
    markSelectedItem(null);
    rubActive = false;
    lastRub = null;
    lastRubTs = null;
    var ghost = $('#' + ROOT_ID + ' .hq-drag-ghost');
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
    'river', 'woman', 'woman_talk', 'wheat1', 'wheat2', 'wheat3', 'wheat1_cut', 'wheat2_cut', 'wheat3_cut', 'wheat_drop',
    'stable', 'horses_dirty', 'horses_clean', 'trough', 'trough_food',
    'keeper', 'keeper_talk', 'bucket', 'sickle', 'brush', 'coin'
  ];

  var LOAD_TIMEOUT_MS = 3000;

  function whenImagesReady(done) {
    var srcs = [DIR + 'bg_field.webp', DIR + 'bg_stable.webp'];
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
    state = {
      screen: 'stable',
      inventory: [],
      tookBucket: false,
      bucketOnGround: false,
      horsesDrunk: false,
      horsesFed: false,
      hasSickle: false,
      tookSickle: false,
      sickleOnGround: false,
      wheatCuts: 0,
      wheatCut: [false, false, false],
      wheatDone: false,
      wheatOnGround: false,
      tookWheat: false,
      hasSponge: false,
      tookSponge: false,
      spongeOnGround: false,
      coinOnGround: false,
      tookCoin: false,
      justSpawned: null,
      stableWatered: false,
      rubTimeMs: 0,
      horsesClean: false,
      introSaid: false
    };
    // Проявляется из чёрного только когда все картинки готовы — иначе объекты выскакивают по одному
    root.classList.remove('hq-enter');
    root.classList.add('hq-loading');
    root.hidden = false;
    document.body.classList.add('quest-active');
    hint('');
    var run = state;
    whenImagesReady(function () {
      if (state !== run) return;
      renderAll();
      syncStageSize();
      requestAnimationFrame(function () {
        root.classList.remove('hq-loading');
        root.classList.add('hq-enter');
      });
    });
    $('#' + ROOT_ID + ' .hq-nav-left').onclick = function () {
      if (state.screen !== 'field') setScreen('field', true);
    };
    $('#' + ROOT_ID + ' .hq-nav-right').onclick = function () {
      if (state.screen !== 'stable') setScreen('stable', true);
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
    talkingId = null;
    endDrag(true);
    hoverNode = null;
    state = null;
  }

  var ITEMS = {
    bucket: { label: 'Ведро', icon: sprite('item_bucket') },
    bucket_full: { label: 'Ведро с водой', icon: sprite('item_bucket_full') },
    sickle: { label: 'Серп', icon: sprite('item_sickle') },
    wheat: { label: 'Пшеница', icon: sprite('item_wheat') },
    sponge: { label: 'Щётка', icon: sprite('item_brush') },
    coin: { label: 'Монета', icon: sprite('item_coin') }
  };

  function HorseQuestPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  HorseQuestPlugin.prototype.onInit = function () {};
  HorseQuestPlugin.prototype.onStart = function () {};
  HorseQuestPlugin.prototype.onCall = function () {
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
  HorseQuestPlugin.prototype.onTeardown = function () {
    stop();
  };

  /**
   * call horseYardAppear — второй друг, торговец2 и лошадь вместе из затемнения
   */
  function HorseYardAppearPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  HorseYardAppearPlugin.prototype.onInit = function () {};
  HorseYardAppearPlugin.prototype.onStart = function () {};
  HorseYardAppearPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var fadeTime = (game.storyConfig && game.storyConfig.fadetime) || 280;
    var bg = (params && params.bg) || 'horse_yard_start';
    // Начальная и конечная катсцены одинаковы (по макету): фон без лошади,
    // лошадь — отдельный спрайт (horse_yard_end — та же картинка, что и start)
    if (bg === 'horse_yard_start' || bg === 'horse_yard_end') bg = 'horse_yard_start_clean';
    var chars = [
      { id: 'horse_yard', look: 'normal', at: 'HORSE_YARD' },
      { id: 'nazar', look: 'normal', at: 'NAZAR_YARD' },
      { id: 'trader2_stand', look: 'normal', at: 'KEEPER_YARD' }
    ];

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
          return Promise.all(
            chars.map(function (c) {
              return game.managers.character.show(c.id, 'CUT', {
                look: c.look,
                position: pos[c.at] || pos.DEFAULT
              });
            })
          );
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
  HorseYardAppearPlugin.prototype.onTeardown = function () {};

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
    [DIR + 'bg_field.webp', DIR + 'bg_stable.webp'].forEach(function (src) {
      new Image().src = src;
    });
  }

  // —— Управление с клавиатуры (js/keyboard.js): те же действия, что мышью ——
  // Щётка по лошадям: каждое нажатие (и автоповтор при удержании) — как короткий мазок мышью
  var KEY_RUB_MS = 150;

  var keyboardApi = {
    active: function () {
      return !!state && !dragItem;
    },
    nodes: function () {
      var w = world(state.screen);
      return w ? w.querySelectorAll('.hq-hotspot') : [];
    },
    focus: function (node) {
      setHover(node);
    },
    activate: function (node) {
      onHotspotClick(node.dataset.id);
    },
    use: function (item, node) {
      var s = state;
      if (item === 'sponge' && node.dataset.id === 'horses' && s.stableWatered && !s.horsesClean) {
        if (!s.rubTimeMs) hint('Удерживайте Enter, чтобы почистить лошадей.');
        s.rubTimeMs += KEY_RUB_MS;
        if (s.rubTimeMs >= RUB_NEED_MS) finishWash();
        return;
      }
      applyUse(item, node.dataset.id);
    },
    items: function () {
      return state ? state.inventory.slice() : [];
    },
    select: function (id) {
      markSelectedItem(id);
    },
    nav: function (dir) {
      var b = $('#' + ROOT_ID + ' .hq-nav-' + (dir < 0 ? 'left' : 'right'));
      if (b && !b.disabled) b.click();
    }
  };

  global.TridaraHorseQuest = {
    keyboard: keyboardApi,
    warmup: warmup,
    start: start,
    stop: stop,
    Plugin: HorseQuestPlugin,
    YardAppearPlugin: HorseYardAppearPlugin
  };
})(window);
