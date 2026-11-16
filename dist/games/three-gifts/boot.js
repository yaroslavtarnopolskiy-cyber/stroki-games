(async function () {
  // Из file:// браузер не даёт загрузить YAML/JSON — игра падает в чёрный экран
  if (window.location.protocol === 'file:') {
    throw new Error(
      'игру нужно открывать через локальный сервер, а не двойным кликом по index.html. ' +
        'Запустите start.bat (или «py -m http.server 8000» в папке игры) и откройте http://localhost:8000'
    );
  }

  // Phaser много раз читает пиксели из служебных 2D-холстов (шрифты, проверки, эффекты) —
  // помечаем их willReadFrequently, иначе Chrome сыплет предупреждениями.
  // Сама игра рисуется через WebGL, её холста это не касается.
  var origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type === '2d') {
      attrs = Object.assign({ willReadFrequently: true }, attrs || {});
    }
    return origGetContext.call(this, type, attrs);
  };
  // Холст для замера шрифтов Phaser создаёт ещё до этого кода — пересоздаём его с флагом
  if (window.Phaser && Phaser.Text) {
    Phaser.Text.fontPropertiesCanvas = document.createElement('canvas');
    Phaser.Text.fontPropertiesContext = Phaser.Text.fontPropertiesCanvas.getContext('2d');
  }

  var title = 'Три Дара';
  var storyJson = null;

  // Прогрев шрифтов до старта RenJS — меньше ожидания на загрузочном экране
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('400 32px literata'),
          document.fonts.load('700 32px literata'),
          document.fonts.load('italic 400 32px literata'),
          document.fonts.load('italic 700 32px literata'),
          document.fonts.load('400 32px golostext'),
          document.fonts.load('400 32px ponomar')
        ]),
        new Promise(function (r) { setTimeout(r, 800); })
      ]);
    } catch (e) { /* ignore */ }
  }

  try {
    var metaRes = await fetch('story/dialogues.json', { cache: 'no-store' });
    if (!metaRes.ok) throw new Error('dialogues.json HTTP ' + metaRes.status);
    var meta = await metaRes.json();
    if (meta && meta.title) title = meta.title;
    storyJson = JSON.stringify(window.TridaraStory.convertDialogues(meta));
  } catch (e) {
    console.warn('dialogues.json:', e);
    throw e;
  }

  // Подмена Story.json актуальным сюжетом из dialogues.json (без ручной пересборки)
  if (storyJson) {
    var matches = function (url) {
      return String(url || '').indexOf('story/Story.json') !== -1;
    };
    var origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      if (matches(url)) {
        return Promise.resolve(
          new Response(storyJson, {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          })
        );
      }
      return origFetch(input, init);
    };

    var XO = XMLHttpRequest.prototype.open;
    var XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__tridaraStory = matches(url);
      return XO.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      if (!this.__tridaraStory) return XS.apply(this, arguments);
      var xhr = this;
      var body = storyJson;
      setTimeout(function () {
        Object.defineProperty(xhr, 'readyState', { configurable: true, get: function () { return 4; } });
        Object.defineProperty(xhr, 'status', { configurable: true, get: function () { return 200; } });
        Object.defineProperty(xhr, 'statusText', { configurable: true, get: function () { return 'OK'; } });
        Object.defineProperty(xhr, 'responseText', { configurable: true, get: function () { return body; } });
        Object.defineProperty(xhr, 'response', { configurable: true, get: function () { return body; } });
        if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
        if (typeof xhr.onload === 'function') xhr.onload();
        if (typeof xhr.onloadend === 'function') xhr.onloadend();
      }, 0);
    };
  }

  // Браузер держит старые YAML в кэше даже после перезагрузки
  var fresh = '?v=site2';
  const RenJSConfig = {
    name: title,
    w: 1920,
    h: 1080,
    renderer: Phaser.AUTO,
    scaleMode: Phaser.ScaleManager.SHOW_ALL,
    parent: 'game-root',
    guiConfig: 'story/GUI.yaml' + fresh,
    storySetup: 'story/Setup.yaml' + fresh,
    storyConfig: 'story/Config.yaml' + fresh,
    storyAccessibility: 'story/Accessibility.yaml' + fresh,
    storyText: ['story/Story.json'],
    loadingScreen: {
      background: 'assets/gui/loaderbg.webp',
      loadingBar: {
        asset: 'assets/gui/loading-bar.webp',
        position: { x: 560, y: 820 },
        size: { w: 800, h: 36 }
      },
      minTime: 0
    },
    fonts: 'assets/gui/fonts.css?v=site2'
  };

  document.title = title;
  const game = new RenJS.game(RenJSConfig);
  window.TridaraGame = game;
  if (window.TridaraAppleQuest && window.TridaraAppleQuest.Plugin) {
    game.addPlugin('appleQuest', window.TridaraAppleQuest.Plugin);
  }
  if (window.TridaraAppleQuest && window.TridaraAppleQuest.YardAppearPlugin) {
    game.addPlugin('yardAppear', window.TridaraAppleQuest.YardAppearPlugin);
  }
  if (window.TridaraAppleQuest && window.TridaraAppleQuest.FadeOutTogetherPlugin) {
    game.addPlugin('fadeOutTogether', window.TridaraAppleQuest.FadeOutTogetherPlugin);
  }
  if (window.TridaraAppleQuest && window.TridaraAppleQuest.TurnAroundPlugin) {
    game.addPlugin('turnAround', window.TridaraAppleQuest.TurnAroundPlugin);
  }
  if (window.TridaraAppleQuest && window.TridaraAppleQuest.WalkToPlugin) {
    game.addPlugin('walkTo', window.TridaraAppleQuest.WalkToPlugin);
  }
  if (window.TridaraHorseQuest && window.TridaraHorseQuest.Plugin) {
    game.addPlugin('horseQuest', window.TridaraHorseQuest.Plugin);
  }
  if (window.TridaraHorseQuest && window.TridaraHorseQuest.YardAppearPlugin) {
    game.addPlugin('horseYardAppear', window.TridaraHorseQuest.YardAppearPlugin);
  }
  if (window.TridaraStoryExtras) {
    game.addPlugin('giftPrompt', window.TridaraStoryExtras.GiftPromptPlugin);
    game.addPlugin('videoBg', window.TridaraStoryExtras.VideoBgPlugin);
    game.addPlugin('useInHand', window.TridaraStoryExtras.UseInHandPlugin);
    game.addPlugin('chooseHusband', window.TridaraStoryExtras.ChooseHusbandPlugin);
  }
  if (window.TridaraMirrorQuest && window.TridaraMirrorQuest.Plugin) {
    game.addPlugin('mirrorQuest', window.TridaraMirrorQuest.Plugin);
  }
  if (window.TridaraMirrorQuest && window.TridaraMirrorQuest.SquareAppearPlugin) {
    game.addPlugin('mirrorSquareAppear', window.TridaraMirrorQuest.SquareAppearPlugin);
  }
  if (window.TridaraStory && window.TridaraStory.SetLookPlugin) {
    game.addPlugin('setLook', window.TridaraStory.SetLookPlugin);
    game.addPlugin('holdText', window.TridaraStory.HoldTextPlugin);
    game.addPlugin('portraitOut', window.TridaraStory.PortraitOutPlugin);
  }
  game.launch();

  // Скорость печати реплик: RenJS ждёт (100 − value) мс на букву; по умолчанию value 20 → 80 мс.
  // 60 → 40 мс на букву
  var TEXT_SPEED_VALUE = 60;
  var speedTimer = setInterval(function () {
    var p = game.userPreferences && game.userPreferences.preferences;
    if (!p || !p.textSpeed) return;
    p.textSpeed.value = TEXT_SPEED_VALUE;
    clearInterval(speedTimer);
  }, 50);

  // Постоянные кнопки + финальный экран: поделиться / читать на КИОН
  var SHARE_TITLE = 'Три дара — Песни Земли';
  var SHARE_TEXT = 'Трое друзей, три дара и один непростой выбор. Пройди испытания и помоги Амипат выбрать любимого в игре «Три дара».';
  var KION_BOOK_URL = 'https://mtsbooks.onelink.me/zdZb/t75hb4td';

  function gameUrl() {
    return window.GiftsIntegration?.shareUrl || window.location.href.split('#')[0].split('?')[0];
  }

  function offerShare() {
    if(window.GiftsIntegration){window.GiftsIntegration.share();return;}
    var url = gameUrl();
    if (navigator.share) {
      navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SHARE_TEXT+'\n'+url).then(
        function () {
          window.alert('Ссылка на игру скопирована:\n' + url);
        },
        function () {
          window.prompt('Скопируйте приглашение в игру:', SHARE_TEXT+'\n'+url);
        }
      );
    } else {
      window.prompt('Скопируйте приглашение в игру:', SHARE_TEXT+'\n'+url);
    }
  }

  function offerKion() {
    window.open(KION_BOOK_URL, '_blank', 'noopener,noreferrer');
  }

  // Экран выбранного героя: его лицо, его дар и строка о выборе (дар — курсивом)
  // Финальный экран выбранного героя: его мир, он сам и его дар (макеты assets/newAssets/finals)
  var CHOSEN = {
    ostap: { bg: 'assets/quest/apple/tree_3.webp', gift: 'assets/gui/gifts/apple.webp' },
    nazar: { bg: 'assets/quest/horse/stable.webp', gift: 'assets/gui/gifts/horse.webp' },
    timofey: { bg: 'assets/quest/mirror/bg_market.webp', gift: 'assets/characters/timofey_finale_mirror.webp' }
  };

  // Печать текста по буквам с той же скоростью, что у реплик (RenJS: 100 − textSpeed мс на букву)
  var FINAL_TYPE_DELAY_MS = 1800;

  function typeText(root, delay, done) {
    var nodes = [];
    (function collect(n) {
      for (var ch = n.firstChild; ch; ch = ch.nextSibling) {
        if (ch.nodeType === 3) nodes.push({ node: ch, text: ch.nodeValue });
        // кнопки не печатаются — они появляются целиком в конце
        else if (ch.tagName !== 'BUTTON') collect(ch);
      }
    })(root);
    nodes.forEach(function (t) { t.node.nodeValue = ''; });
    var ms = Math.max(5, 100 - TEXT_SPEED_VALUE);
    var i = 0;
    var pos = 0;
    setTimeout(function tick() {
      if (i >= nodes.length) {
        if (done) done();
        return;
      }
      var t = nodes[i];
      pos += 1;
      t.node.nodeValue = t.text.slice(0, pos);
      if (pos >= t.text.length) {
        i += 1;
        pos = 0;
      }
      setTimeout(tick, ms);
    }, delay);
  }

  function showFinalScreen() {
    var screen = document.getElementById('final-screen');
    if (!screen) return;
    window.GiftsIntegration?.screen('final');
    finalGate.reset();
    var id = CHOSEN[window.TridaraChoice] ? window.TridaraChoice : 'ostap';
    var c = CHOSEN[id];
    screen.dataset.chosen = id;
    screen.querySelector('.fs-bg').src = c.bg;
    screen.querySelector('.fs-hero').src = 'assets/characters/' + id + '_full.webp';
    screen.querySelector('.fs-gift').src = c.gift;
    var imageLoads=Array.prototype.map.call(screen.querySelectorAll('img'),function(image){return image.decode?image.decode().catch(function(){}):Promise.resolve()});
    var assetsReady=Promise.race([Promise.all(imageLoads),new Promise(function(resolve){setTimeout(resolve,8000)})]);
    screen.classList.remove('is-typed');
    screen.hidden = false;
    // плашка выезжает к ~2.4 с — потом буквы печатаются, как в репликах; кнопки — в конце
    typeText(screen.querySelector('.fs-copy'), FINAL_TYPE_DELAY_MS, function () {
      screen.classList.add('is-typed');
      assetsReady.then(function(){setTimeout(function(){finalGate.enable()},650)});
    });
    document.body.classList.add('final-screen-active');
  }

  var btnShare = document.getElementById('btn-share');
  var btnKion = document.getElementById('btn-kion');
  var finalRestart = document.getElementById('final-restart');
  var finalKion = document.getElementById('final-kion');

  if (btnShare) btnShare.addEventListener('click', offerShare);
  if (btnKion) btnKion.addEventListener('click', offerKion);
  var finalGate=window.createGiftsFinalGate({
    screen:document.getElementById('final-screen'),readButton:finalKion,restartButton:finalRestart,
    read:offerKion,restart:function(){window.GiftsIntegration ? window.GiftsIntegration.restart() : window.location.reload()}
  });

  function FinalScreenPlugin(name, gameRef) {
    this.name = name;
    this.game = gameRef;
  }
  FinalScreenPlugin.prototype.onInit = function () {};
  FinalScreenPlugin.prototype.onStart = function () {};
  FinalScreenPlugin.prototype.onCall = function () {
    var g = this.game;
    try {
      if (g.gui && g.gui.hideHUD) g.gui.hideHUD();
    } catch (e) { /* optional */ }
    showFinalScreen();
    // Финал: экран остаётся, историю не продолжаем
  };
  FinalScreenPlugin.prototype.onTeardown = function () {};
  game.addPlugin('finalScreen', FinalScreenPlugin);

  // Как только показан главный экран — заранее подгружаем картинки квестов в фоне,
  // по одному квесту с паузой, чтобы не тормозить меню
  var questsWarmed = false;
  function warmupQuests() {
    if (questsWarmed) return;
    questsWarmed = true;
    var connection=navigator.connection;if(connection&&(connection.saveData||/^(slow-)?2g$/.test(connection.effectiveType)))return;
    ['TridaraAppleQuest', 'TridaraHorseQuest', 'TridaraMirrorQuest'].forEach(function (q, i) {
      setTimeout(function () {
        try {
          if (window[q] && window[q].warmup) window[q].warmup();
        } catch (e) { console.warn(q, e); }
      }, 800 + i * 2500);
    });
  }
  var ensureStartClickable = setInterval(function () {
    var g = typeof Phaser !== 'undefined' && Phaser.GAMES && Phaser.GAMES[0];
    if (!g || !g.gui) return;
    // табличка с именем — справа, пока слева лицо друга (hud появляется не сразу)
    if (window.TridaraStory && window.TridaraStory.installNameSide) window.TridaraStory.installNameSide(g);
    // журнал реплик для кнопки «История» (менеджер текста появляется не сразу)
    if (window.TridaraHistory) window.TridaraHistory.install(g);
    var onMain = g.gui.currentMenu === 'main';
    document.body.classList.toggle('in-game', g.gui.currentMenu === 'hud');
    if (onMain) window.GiftsIntegration?.ready(g);
    if (onMain || g.gui.currentMenu === 'hud') warmupQuests();
    if (!onMain) return;
    try {
      var menu = g.gui.menus && g.gui.menus.main;
      if (menu) {
        menu.ignoreChildInput = false;
        menu.inputEnableChildren = true;
        if (menu.children) {
          for (var i = 0; i < menu.children.length; i++) {
            var c = menu.children[i];
            if (c && c.inputEnabled === false) c.inputEnabled = true;
            if (c && c.input) c.input.enabled = true;
          }
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }, 200);
  // Не снимаем интервал — кнопка снова появится при возврате в main
})().catch(function (err) {
  console.error(err);
  window.GiftsIntegration?.fail(err);
  var el = document.getElementById('boot-error');
  if (el) {
    el.hidden = false;
    el.textContent = 'Не удалось запустить игру: ' + (err && err.message ? err.message : err);
  }
});
