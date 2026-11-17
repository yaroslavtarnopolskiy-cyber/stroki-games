/**
 * Сюжетные вставки визуальной новеллы (не квесты).
 *
 * call giftPrompt: { gift, text, x, bottom }
 *   Поверх кадра появляется дар (assets/gui/gifts/<gift>.webp), сверху — задание.
 *   При наведении — красная обводка (<gift>_hl.webp), по клику дар исчезает и история продолжается.
 *   x — центр, bottom — нижний край в пикселях экрана 1920×1080.
 */
(function (global) {
  // Подсказка квеста всегда в одну строку, рамка и значки неподвижны.
  // Длинный текст прокручивается внутри строки: при печати строка едет за
  // последней буквой (начало уходит за левый значок), потом её можно
  // прокрутить колесом мыши или перетаскиванием.
  function hintText(box) {
    var span = box.querySelector('.aq-hint-text');
    if (span) return span;
    span = document.createElement('span');
    span.className = 'aq-hint-text';
    box.appendChild(span);
    span.addEventListener('scroll', function () { hintEdges(box, span); });
    span.addEventListener('wheel', function (e) {
      if (!box.classList.contains('is-overflow')) return;
      e.preventDefault();
      span.scrollLeft += e.deltaX || e.deltaY;
      box._hintTouched = Date.now();
    }, { passive: false });
    span.addEventListener('pointerdown', function (e) {
      if (!box.classList.contains('is-overflow')) return;
      e.preventDefault();
      var x0 = e.clientX;
      var s0 = span.scrollLeft;
      box._hintDragging = true;
      span.setPointerCapture(e.pointerId);
      function move(ev) {
        span.scrollLeft = s0 - (ev.clientX - x0);
        box._hintTouched = Date.now();
      }
      function up() {
        box._hintDragging = false;
        span.removeEventListener('pointermove', move);
        span.removeEventListener('pointerup', up);
        span.removeEventListener('pointercancel', up);
      }
      span.addEventListener('pointermove', move);
      span.addEventListener('pointerup', up);
      span.addEventListener('pointercancel', up);
    });
    return span;
  }

  // Затухание только с той стороны, где за краем есть текст
  function hintEdges(box, span) {
    var max = span.scrollWidth - span.clientWidth;
    box.classList.toggle('fade-l', span.scrollLeft > 1);
    box.classList.toggle('fade-r', span.scrollLeft < max - 1);
  }

  global.TridaraSetHintText = function (box, text) {
    var span = hintText(box);
    span.textContent = text;
    var over = span.scrollWidth > span.clientWidth + 1;
    box.classList.toggle('is-overflow', over);
    if (over) span.scrollLeft = span.scrollWidth; // видна последняя буква
    hintEdges(box, span);
  };

  // Длинной подсказке — больше времени на экране
  global.TridaraHintDelay = function (box, base) {
    return box.classList.contains('is-overflow') ? base + 3000 : base;
  };

  // Игрок держит/крутит строку или навёл на неё курсор — не прятать
  global.TridaraHintBusy = function (box) {
    if (!box.classList.contains('is-overflow')) return false;
    var span = box.querySelector('.aq-hint-text');
    return !!(box._hintDragging || (span && span.matches(':hover')) ||
      (box._hintTouched && Date.now() - box._hintTouched < 1500));
  };

  var SCENE_W = 1920;
  var SCENE_H = 1080;
  var DIR = 'assets/gui/gifts/';
  var FADE_MS = 300;

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function fitToCanvas(node) {
    var canvas = document.querySelector('#game-root canvas') || document.querySelector('canvas');
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    node.style.left = r.left + 'px';
    node.style.top = r.top + 'px';
    node.style.width = r.width + 'px';
    node.style.height = r.height + 'px';
    node.style.fontSize = (r.width / SCENE_W) * 34 + 'px';
  }

  function GiftPromptPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  GiftPromptPlugin.prototype.onInit = function () {};
  GiftPromptPlugin.prototype.onStart = function () {};
  GiftPromptPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    params = params || {};
    var src = DIR + params.gift + '.webp';
    var srcHl = DIR + params.gift + '_hl.webp';

    var root = el('div', 'gift-prompt');
    var task = el('div', 'gift-prompt-task');
    task.textContent = params.text || '';
    var btn = el('button', 'gift-prompt-gift');
    btn.type = 'button';
    btn.setAttribute('aria-label', params.text || '');
    var img = el('img');
    img.alt = '';
    img.draggable = false;
    btn.appendChild(img);
    root.appendChild(btn);
    root.appendChild(task);
    document.body.appendChild(root);

    btn.style.left = ((params.x != null ? params.x : 960) / SCENE_W) * 100 + '%';
    btn.style.bottom = ((SCENE_H - (params.bottom != null ? params.bottom : 900)) / SCENE_H) * 100 + '%';
    img.onload = function () {
      btn.style.width = (img.naturalWidth / SCENE_W) * 100 + '%';
      fitToCanvas(root);
      requestAnimationFrame(function () {
        root.classList.add('is-on');
      });
    };
    img.src = src;
    new Image().src = srcHl;

    var fit = setInterval(function () {
      fitToCanvas(root);
    }, 300);
    btn.addEventListener('pointerenter', function () {
      img.src = srcHl;
    });
    btn.addEventListener('pointerleave', function () {
      img.src = src;
    });
    btn.addEventListener(
      'click',
      function () {
        btn.disabled = true;
        root.classList.remove('is-on');
        setTimeout(function () {
          clearInterval(fit);
          root.remove();
          game.resolveAction();
        }, FADE_MS);
      },
      { once: true }
    );
  };
  GiftPromptPlugin.prototype.onTeardown = function () {
    document.querySelectorAll('.gift-prompt').forEach(function (n) {
      n.remove();
    });
  };

  /**
   * call videoBg: { src, rate?, pause? }
   *   Видео вместо фона (видение в зеркале). Плавно проявляется поверх текущего фона
   *   и уходит само, когда сцена показывает следующий фон.
   *   Между проигрываниями стоит на кадре (pause мс), само проигрывание — с замедлением rate.
   */
  var videoState = null;
  global.TridaraVideoElement = function(){return videoState && videoState.video && videoState.video.video;};
  var VIDEO_OUT_MS = 450; // зеркало гаснет медленно — успевает исчезнуть до следующего кадра

  function dropVideo(game, ms) {
    var vs = videoState;
    if (!vs) return;
    videoState = null;
    clearTimeout(vs.timer);
    var removed = false;
    function remove() {
      if (removed) return;
      removed = true;
      try {
        if(vs.playButton)vs.playButton.remove();
        vs.video.stop();
        vs.image.destroy();
        vs.video.destroy();
      } catch (e) { /* уже удалено */ }
    }
    // свой таймер по реальному времени: твины RenJS могут не доиграть, и тогда видео
    // остаётся под следующим фоном и выглядывает при его смене
    var from = vs.image.alpha;
    var start = performance.now();
    (function frame() {
      if (removed) return;
      var k = ms > 0 ? Math.min(1, (performance.now() - start) / ms) : 1;
      vs.image.alpha = from * (1 - k);
      if (k < 1) requestAnimationFrame(frame);
      else remove();
    })();
    setTimeout(remove, ms + 300);
  }

  function VideoBgPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  VideoBgPlugin.prototype.onInit = function () {};
  VideoBgPlugin.prototype.onStart = function () {};
  VideoBgPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var fadeTime = (game.storyConfig && game.storyConfig.fadetime) || 280;
    var bgm = game.managers.background;
    // новый фон сцены убирает видео (один раз ставим обёртку)
    if (!bgm.__videoPatched) {
      bgm.__videoPatched = true;
      var origShow = bgm.show;
      bgm.show = function () {
        dropVideo(game, VIDEO_OUT_MS);
        return origShow.apply(this, arguments);
      };
    }
    dropVideo(game, 0);
    try {
      var video = game.add.video();
      video.createVideoFromURL(params.src, false);
      var media=video.video;
      media.muted=true;media.defaultMuted=true;media.playsInline=true;media.preload='auto';
      media.setAttribute('muted','');media.setAttribute('playsinline','');media.setAttribute('webkit-playsinline','');
      // This reflection has no audio; browser autoplay policy still decides whether it can play.
      video.touchLocked=false;
      video.mute = true;
      var image = game.make.image(game.world.centerX, game.world.centerY, video);
      image.anchor.set(0.5);
      image.alpha = 0;
      // в слой фонов — под персонажами и плашкой текста
      game.managers.story.backgroundSprites.add(image);
      videoState = { video: video, image: image };
      var started = false;
      function playInline(){
        var promise=media.play();
        if(promise&&promise.catch)promise.catch(function(){
          var vs=videoState;if(!vs||vs.video!==video||vs.playButton)return;
          var button=el('button','mirror-video-play','Показать отражение');button.type='button';vs.playButton=button;
          button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();media.play().then(function(){button.remove();if(videoState===vs)vs.playButton=null}).catch(function(){button.textContent='Попробовать ещё раз'})});
          document.body.appendChild(button);
        });
      }
      var start = function () {
        if (started||media.readyState<2) return;
        started = true;
        image.width = game.config.w;
        image.height = game.config.h;
        var rate = params.rate || 1;
        var pause = params.pause != null ? params.pause : 2200;
        video.play(false, rate);
        playInline();
        // доиграло — стоим на кадре (последний кадр совпадает с первым), потом ещё раз с начала
        video.onComplete.add(function () {
          var vs = videoState;
          if (!vs || vs.video !== video) return;
          clearTimeout(vs.timer);
          vs.timer = setTimeout(function () {
            if (videoState !== vs) return;
            video.video.currentTime = 0;
            video.play(false, rate);
          }, pause);
        });
        game.managers.tween.tween(image, { alpha: 1 }, function () {
          game.resolveAction();
        }, fadeTime * 2, true, 0, false);
      };
      video.onChangeSource.addOnce(start);
      media.addEventListener('loadeddata',function(){if(videoState&&videoState.video===video){video.updateTexture();start()}},{once:true});
      media.addEventListener('canplay',start,{once:true});
      media.addEventListener('error',function(){if(!started){started=true;game.resolveAction()}},{once:true});
      // запасной путь, если событие не пришло
      setTimeout(start, 1500);
    } catch (e) {
      console.warn('videoBg', e);
      game.resolveAction();
    }
  };
  VideoBgPlugin.prototype.onTeardown = function () {
    dropVideo(this.game, 0);
  };

  /**
   * call chooseHusband
   *   Игрок выбирает, кто станет мужем Амипат: наведение — красная обводка (поза <look>_hl),
   *   клик — выбор. Попадание по непрозрачным пикселям, Амипат перекрывает того, кто за ней.
   *   Выбор кладётся в window.TridaraChoice для экрана результата (finalScreen).
   */
  var CHOICES = [
    // порядок — спереди назад, как на сцене
    { id: 'ostap', look: 'finale', hover: 'finale_apple_hl', text: 'Тот, кто принёс яблоко.' },
    { id: 'nazar', look: 'finale', hover: 'finale_hl', text: 'Тот, кто привёл коня.' },
    { id: 'amipat_stand', blocker: true },
    { id: 'timofey', look: 'finale', hover: 'finale_hl', text: 'Тот, кто принёс зеркало.' }
  ];
  var HIT_ALPHA = 40;
  var maskCache = {};

  function maskFor(game, key) {
    if (maskCache[key]) return maskCache[key];
    var img = game.cache.getImage(key);
    if (!img) return null;
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    maskCache[key] = { w: c.width, h: c.height, data: ctx.getImageData(0, 0, c.width, c.height).data };
    return maskCache[key];
  }

  /**
   * Непрозрачный ли пиксель спрайта персонажа в точке сцены (gx, gy).
   * maskLook — проверять по другой позе того же размера (например, зона клика по яблоку).
   */
  function charHit(game, id, gx, gy, maskLook) {
    var ch = game.managers.character.characters[id];
    var sp = ch && ch.currentLook;
    if (!sp || !sp.visible) return false;
    var m = maskFor(game, maskLook ? ch.keyName + '_' + maskLook : sp.key);
    if (!m) return false;
    // якорь спрайта — низ по центру
    var px = Math.floor(gx - (sp.x - m.w / 2));
    var py = Math.floor(gy - (sp.y - m.h));
    if (px < 0 || py < 0 || px >= m.w || py >= m.h) return false;
    return m.data[(py * m.w + px) * 4 + 3] > HIT_ALPHA;
  }

  function setCharTexture(game, id, look) {
    var ch = game.managers.character.characters[id];
    var key = ch && ch.keyName + '_' + look;
    if (ch && ch.currentLook && game.cache.checkImageKey(key)) ch.currentLook.loadTexture(key);
  }

  var LOOK_FADE_MS = 450;

  /**
   * Плавная смена позы: копия спрайта с новой позой проявляется поверх старой,
   * потом становится самим спрайтом. reveal: false — наоборот, старая поза тает над новой
   * (так уходит то, что было только в старой позе, например яблоко из руки).
   */
  function fadeCharLook(game, id, look, reveal) {
    var ch = game.managers.character.characters[id];
    var sp = ch && ch.currentLook;
    var key = ch && ch.keyName + '_' + look;
    if (!sp || !game.cache.checkImageKey(key)) return Promise.resolve();
    var top = game.make.image(sp.x, sp.y, reveal === false ? sp.key : key);
    top.anchor.set(0.5, 1);
    top.scale.x = sp.scale.x;
    top.alpha = reveal === false ? 1 : 0;
    sp.parent.addChildAt(top, sp.parent.getChildIndex(sp) + 1);
    if (reveal === false) sp.loadTexture(key);
    // свой таймер по реальному времени: менеджер твинов RenJS тут не всегда сообщает о конце
    var from = top.alpha;
    var to = reveal === false ? 0 : 1;
    var start = performance.now();
    return new Promise(function (resolve) {
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        if (reveal !== false) sp.loadTexture(key);
        top.destroy();
        resolve();
      }
      (function frame() {
        if (finished) return;
        var k = Math.min(1, (performance.now() - start) / LOOK_FADE_MS);
        top.alpha = from + (to - from) * k;
        if (k < 1) requestAnimationFrame(frame);
        else finish();
      })();
      // если кадры не идут (вкладка в фоне) — всё равно закончить, иначе игрок застрянет
      setTimeout(finish, LOOK_FADE_MS + 300);
    });
  }

  function scenePoint(game, e) {
    var r = game.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * game.config.w,
      y: ((e.clientY - r.top) / r.height) * game.config.h
    };
  }

  // —— Подсказка в плашке диалога (как реплики, но без имени и без «дальше») ——

  function dialogBox(game) {
    var mb = game.gui && game.gui.hud && game.gui.hud.mBoxes;
    return mb && (mb['default'] || mb[Object.keys(mb)[0]]);
  }

  /** Показать текст в плашке; instant — сразу целиком, без печати. */
  function boxShow(game, text, instant) {
    var hud = game.gui.hud;
    var mb = dialogBox(game);
    if (!mb) return Promise.resolve();
    Object.keys(hud.nBoxes || {}).forEach(function (k) { hud.hideName(k); });
    var was = game.control.skipping;
    // RenJS печатает текст мгновенно, пока идёт пропуск; флаг читается сразу при вызове
    if (instant) game.control.skipping = true;
    var p;
    try {
      p = mb.show(text);
    } finally {
      game.control.skipping = was;
    }
    if (mb.ctc) mb.ctc.visible = false;
    return Promise.resolve(p).then(function () {
      // ждать клика не нужно — значок «дальше» не показываем
      if (mb.ctc) mb.ctc.visible = false;
    });
  }

  function boxHide(game) {
    var mb = dialogBox(game);
    return mb ? Promise.resolve(mb.hide()) : Promise.resolve();
  }

  /** Пока ждём действия игрока, значок «дальше» не нужен — клик мимо иначе его показывает. */
  function hideCtcWhile(game) {
    var timer = setInterval(function () {
      var mb = dialogBox(game);
      if (mb && mb.ctc) mb.ctc.visible = false;
    }, 50);
    return function () { clearInterval(timer); };
  }

  /**
   * Пока игрок выбирает (дар, мужа), клики по холсту не должны доходить до RenJS —
   * иначе он считает их «дальше» и сбивает сцену. Ловим их раньше Phaser (захват на document)
   * и отдаём только своему обработчику. Возвращает функцию снятия.
   */
  function captureCanvas(canvas, handler) {
    var types = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'];
    function block(e) {
      if (e.target !== canvas) return;
      e.stopPropagation();
      if (e.type === 'pointerdown') handler(e);
    }
    types.forEach(function (t) { document.addEventListener(t, block, true); });
    // пробел у RenJS — тоже «дальше»: пока идёт выбор, клавиатуру Phaser выключаем
    var game = global.Phaser && Phaser.GAMES && Phaser.GAMES[0];
    var kb = game && game.input && game.input.keyboard;
    if (kb) kb.enabled = false;
    return function () {
      types.forEach(function (t) { document.removeEventListener(t, block, true); });
      if (kb) kb.enabled = true;
    };
  }

  /**
   * call useInHand: { char, look, hover, hit?, hitEllipse?, after, text? }
   *   Персонаж держит дар в руке (поза look), игрок нажимает на сам дар:
   *   наведение — поза hover (обводка вокруг дара), попадание — по маске позы hit
   *   или по овалу hitEllipse [cx, cy, rx, ry] в пикселях спрайта (может выходить за его край).
   *   После клика — поза after (дар отдан).
   */
  function UseInHandPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  UseInHandPlugin.prototype.onInit = function () {};
  UseInHandPlugin.prototype.onStart = function () {};
  UseInHandPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var canvas = game.canvas;
    var lit = false;
    var done = false;
    var ready = false; // пока яблоко проявляется, нажимать нельзя
    var stopCtc = hideCtcWhile(game);
    fadeCharLook(game, params.char, params.look).then(function () {
      ready = true;
    });
    // подсказка в плашке — только если задана
    if (params.text) boxShow(game, params.text);

    function over(e) {
      var p = scenePoint(game, e);
      var el_ = params.hitEllipse;
      if (!el_) return charHit(game, params.char, p.x, p.y, params.hit);
      var ch = game.managers.character.characters[params.char];
      var sp = ch && ch.currentLook;
      if (!sp) return false;
      // якорь спрайта — низ по центру
      var dx = (p.x - (sp.x - sp.width / 2) - el_[0]) / el_[2];
      var dy = (p.y - (sp.y - sp.height) - el_[1]) / el_[3];
      return dx * dx + dy * dy <= 1;
    }

    function onMove(e) {
      if (done || !ready) return;
      var on = over(e);
      if (on === lit) return;
      lit = on;
      setCharTexture(game, params.char, lit ? params.hover : params.look);
      canvas.style.cursor = lit ? 'pointer' : '';
    }

    function onDown(e) {
      if (!over(e)) return;
      give();
    }

    function give() {
      if (done || !ready) return;
      done = true;
      global.TridaraUseInHand = null;
      canvas.removeEventListener('pointermove', onMove);
      release();
      canvas.style.cursor = '';
      // без обводки — и дар тает из руки
      setCharTexture(game, params.char, params.look);
      stopCtc();
      Promise.all([
        fadeCharLook(game, params.char, params.after || params.look, false),
        params.text ? boxHide(game) : Promise.resolve()
      ]).then(function () { game.resolveAction(); });
    }

    canvas.addEventListener('pointermove', onMove);
    var release = captureCanvas(canvas, onDown);
    // клавиатура (js/keyboard.js): Enter / пробел — отдать дар
    global.TridaraUseInHand = { use: give };
  };
  UseInHandPlugin.prototype.onTeardown = function () {
    global.TridaraUseInHand = null;
  };

  function ChooseHusbandPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  ChooseHusbandPlugin.prototype.onInit = function () {};
  ChooseHusbandPlugin.prototype.onStart = function () {};
  ChooseHusbandPlugin.prototype.onCall = function () {
    var game = this.game;
    var canvas = game.canvas;
    var QUESTION = 'Как думаешь, кто станет мужем Амипат?';
    var hover = null;
    var picked = null; // выбран, ждёт подтверждения
    var done = false;
    var ready = false; // пока вопрос печатается, выбирать нельзя
    var stopCtc = hideCtcWhile(game);
    var confirm = makeConfirm(game);
    boxShow(game, QUESTION).then(function () {
      ready = true;
    });

    function pick(e) {
      var p = scenePoint(game, e);
      for (var i = 0; i < CHOICES.length; i++) {
        if (charHit(game, CHOICES[i].id, p.x, p.y)) return CHOICES[i].blocker ? null : CHOICES[i];
      }
      return null;
    }

    // обводка — у того, на кого наведён курсор, а без наведения — у выбранного
    function outline() {
      var lit = hover || picked;
      CHOICES.forEach(function (c) {
        if (c.blocker) return;
        setCharTexture(game, c.id, c === lit ? c.hover : c.look);
      });
    }

    function setHover(c) {
      if (c === hover) return;
      hover = c;
      canvas.style.cursor = hover ? 'pointer' : '';
      outline();
    }

    // Выбор: затемнение как в диалогах, нажать можно только «Да» или «Нет»
    function select(c) {
      picked = c;
      ready = false;
      hover = null;
      canvas.style.cursor = '';
      outline();
      dim(game, true);
      boxShow(game, '(italic)' + c.text + '(end)\nВы уверены?').then(function () {
        if (!done && picked) confirm.show();
      });
    }

    function unselect() {
      picked = null;
      confirm.hide();
      outline();
      dim(game, false);
      // вопрос уже читали — сразу целиком, и героев можно выбирать сразу
      boxShow(game, QUESTION, true);
      ready = true;
    }

    function onMove(e) {
      if (!done && ready) setHover(pick(e));
    }

    function onDown(e) {
      if (done || !ready) return;
      var c = pick(e);
      if (c) select(c);
    }

    // клавиатура (js/keyboard.js): герои слева направо, как стоят на сцене
    var BY_X = ['ostap', 'timofey', 'nazar'].map(function (id) {
      return CHOICES.filter(function (c) { return c.id === id; })[0];
    });
    global.TridaraChoosing = {
      cycle: function (dir) {
        if (done || !ready) return;
        var i = BY_X.indexOf(hover);
        i = i < 0 ? (dir > 0 ? 0 : BY_X.length - 1) : (i + dir + BY_X.length) % BY_X.length;
        setHover(BY_X[i]);
        canvas.style.cursor = '';
      },
      pickNth: function (n) {
        if (done || !ready || !BY_X[n]) return;
        select(BY_X[n]);
      },
      pick: function () {
        if (done || !ready) return;
        if (hover) select(hover);
        else this.cycle(1);
      },
      confirming: function () {
        return !!picked && !done;
      }
    };

    confirm.onNo = function () {
      if (!done && picked) unselect();
    };
    confirm.onYes = function () {
      if (done || !picked) return;
      done = true;
      global.TridaraChoosing = null;
      global.TridaraChoice = picked.id;
      canvas.removeEventListener('pointermove', onMove);
      release();
      canvas.style.cursor = '';
      hover = null;
      outline();
      confirm.remove();
      stopCtc();
      dim(game, false);
      boxHide(game).then(function () { game.resolveAction(); });
    };

    canvas.addEventListener('pointermove', onMove);
    // клики по холсту — только наши: RenJS не должен принять их за «дальше»
    var release = captureCanvas(canvas, onDown);
  };

  /** Затемнение сцены — тот же спрайт dialog_dim, что под портретами в диалогах. */
  function dim(game, on) {
    var cm = game.managers.character;
    var ch = cm.characters.dialog_dim;
    var shown = !!(ch && ch.currentLook);
    if (on && !shown) {
      var pos = game.storyConfig.positions.FULLSCREEN;
      cm.show('dialog_dim', 'FADE', { look: 'normal', position: pos });
    } else if (!on && shown) {
      cm.hide('dialog_dim', 'FADE');
    }
  }

  /** «Да» и «Нет» — просто слова курсивом слева и справа от героев. */
  function makeConfirm(game) {
    var root = el('div', 'choose-confirm');
    var api = { onYes: null, onNo: null };
    [['Да', 'onYes', 'is-yes'], ['Нет', 'onNo', 'is-no']].forEach(function (b) {
      var btn = el('button', 'choose-word ' + b[2]);
      btn.type = 'button';
      btn.textContent = b[0];
      btn.addEventListener('click', function () {
        if (root.classList.contains('is-on') && api[b[1]]) api[b[1]]();
      });
      root.appendChild(btn);
    });
    document.body.appendChild(root);
    var fit = setInterval(function () { fitToCanvas(root); }, 300);
    fitToCanvas(root);
    api.show = function () {
      root.classList.add('is-on');
    };
    api.hide = function () {
      root.classList.remove('is-on');
    };
    api.remove = function () {
      clearInterval(fit);
      root.remove();
    };
    return api;
  }

  ChooseHusbandPlugin.prototype.onTeardown = function () {
    global.TridaraChoosing = null;
    document.querySelectorAll('.choose-confirm').forEach(function (n) { n.remove(); });
  };

  global.TridaraStoryExtras = {
    // для проверки: текущий <video> видения (или null)
    currentVideo: function () { return videoState && videoState.video.video; },
    GiftPromptPlugin: GiftPromptPlugin,
    VideoBgPlugin: VideoBgPlugin,
    UseInHandPlugin: UseInHandPlugin,
    ChooseHusbandPlugin: ChooseHusbandPlugin
  };
})(window);
