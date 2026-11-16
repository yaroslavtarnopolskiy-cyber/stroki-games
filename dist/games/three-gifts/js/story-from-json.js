/**
 * Converts story/dialogues.json into a RenJS story object.
 */
(function (global) {
  var SPEAKER_AT = {
    amipat: 'AMIPAT_FACE',
    trader: 'TRADER_YARD',
    trader2: 'TRADER',
    trader2_stand: 'KEEPER',
    horse: 'RIGHT',
    ostap: 'MAN1',
    nazar: 'MAN2',
    timofey: 'MAN3'
  };

  function actionShowBackground(step) {
    var key = 'show ' + step.show;
    var val = 'WITH ' + (step.with || 'FADE');
    if (step.continue) val += ' CONTINUE';
    var obj = {};
    obj[key] = val;
    return obj;
  }

  function walkTo(id, to, speed, behind) {
    var params = { id: id, to: to };
    if (speed) params.speed = speed;
    if (behind) params.behind = true;
    return { 'call walkTo': params };
  }

  function actionShowCharacter(step) {
    var look = step.look || 'normal';
    var at = step.at || 'DEFAULT';
    var key = 'show ' + step.showCharacter;

    if (step.from) {
      var place = {};
      place[key] = look + ' AT ' + step.from + ' WITH CUT';
      return [place, walkTo(step.showCharacter, at, step.speed)];
    }

    var val = look + ' AT ' + at + ' WITH ' + (step.with || 'FADE');
    if (step.continue) val += ' CONTINUE';
    var obj = {};
    obj[key] = val;
    return obj;
  }

  function actionHideCharacter(step) {
    var id = step.hideCharacter;
    var look = step.look || 'normal';

    if (step.to) {
      var actions = [];
      if (step.turn !== false) {
        actions.push({ 'call turnAround': { id: id, look: look } });
      }
      actions.push(walkTo(id, step.to, step.speed, step.behind !== false));
      var hide = {};
      hide['hide ' + id] = 'WITH CUT';
      if (step.continue) hide['hide ' + id] += ' CONTINUE';
      actions.push(hide);
      return actions;
    }

    var key = 'hide ' + id;
    var val = 'WITH ' + (step.with || 'FADE');
    if (step.continue) val += ' CONTINUE';
    var obj = {};
    obj[key] = val;
    return obj;
  }

  function actionShowCG(step) {
    var key = 'show ' + step.showCG;
    if (step.at && typeof step.at.x === 'number') {
      var obj = {};
      obj[key] = 'WITH ' + (step.with || 'FADE') + ' AT ' + step.at.x + ',' + step.at.y;
      if (step.continue) obj[key] += ' CONTINUE';
      return obj;
    }
    var obj2 = {};
    obj2[key] = 'WITH ' + (step.with || 'FADE') + (step.continue ? ' CONTINUE' : '');
    return obj2;
  }

  function actionHideCG(step) {
    var key = 'hide ' + step.hideCG;
    var obj = {};
    obj[key] = 'WITH ' + (step.with || 'FADE');
    return obj;
  }

  function isPortraitSay(step, char) {
    return !!(step && step.say && step.say.portrait && step.say.character === char);
  }

  function actionSay(step, prev, next) {
    var s = step.say;
    var char = s.character;
    var look = s.look || 'talk';
    var hideSprite = s.hideSprite === true;
    var at = hideSprite ? null : s.at || SPEAKER_AT[char];
    var restore = s.restore != null ? s.restore : 'normal';
    var actions = [];
    var speakingLook = look === 'normal' ? 'talk' : look;

    // Портрет поверх сцены: появляется на серию реплик подряд и уходит после последней
    if (s.portrait && at) {
      var opening = !isPortraitSay(prev, char);
      var closing = !isPortraitSay(next, char);
      if (opening) actions.push({ 'show dialog_dim': 'normal AT FULLSCREEN WITH FADE CONTINUE' });
      var inTalk = {};
      inTalk['show ' + char] = speakingLook + ' AT ' + at + ' WITH ' + (opening ? 'FADE' : 'CUT');
      actions.push(inTalk);
      var line = {};
      line[char + ' says ' + speakingLook] = s.text;
      actions.push(line);
      if (closing) {
        var out = {};
        out['hide ' + char] = 'WITH FADE CONTINUE';
        actions.push(out);
        actions.push({ 'hide dialog_dim': 'WITH FADE' });
      } else {
        var after = {};
        after['show ' + char] = restore + ' AT ' + at + ' WITH CUT';
        actions.push(after);
      }
      return actions;
    }

    // Только имя в окне диалога, без спрайта на сцене (RenJS: «char says» без look)
    if (hideSprite) {
      var hideFirst = {};
      hideFirst['hide ' + char] = 'WITH CUT CONTINUE';
      actions.push(hideFirst);
      var voiceOnly = {};
      voiceOnly[char + ' says'] = s.text;
      actions.push(voiceOnly);
      return actions;
    }

    // Говорящий спрайт только на время этой реплики
    if (at) {
      var showTalk = {};
      showTalk['show ' + char] = speakingLook + ' AT ' + at + ' WITH CUT';
      actions.push(showTalk);
    }

    var key = char + ' says ' + speakingLook;
    var say = {};
    say[key] = s.text;
    actions.push(say);

    // Сразу после фразы — исходный (неговорящий) спрайт
    if (at && s.keepTalk !== true && restore) {
      var showBack = {};
      showBack['show ' + char] = restore + ' AT ' + at + ' WITH CUT';
      actions.push(showBack);
    }

    return actions;
  }

  function convertStep(step, prev, next) {
    if (step.show) return actionShowBackground(step);
    if (step.showCharacter) return actionShowCharacter(step);
    if (step.hideCharacter) return actionHideCharacter(step);
    if (step.showCG) return actionShowCG(step);
    if (step.hideCG) return actionHideCG(step);
    if (step.say) return actionSay(step, prev, next);
    if (step.call) {
      var call = {};
      call['call ' + step.call] = step.params && typeof step.params === 'object' ? step.params : {};
      return call;
    }
    // Повествование — от имени «Рассказчика» (табличка с именем, без спрайта)
    if (typeof step.text === 'string') return { 'storyteller says': step.text };
    if (typeof step.wait === 'number') return { wait: step.wait };
    if (step.scene) return { scene: step.scene };
    if (step.end) {
      return {
        'effect ROLLINGCREDITS': {
          endGame: true,
          timePerLine: 1200,
          text: ['Три Дара', null, 'Спасибо за игру']
        }
      };
    }
    if (step.raw && typeof step.raw === 'object') return step.raw;
    console.warn('Unknown dialogue step', step);
    return { text: '…' };
  }

  // Лица в диалогах: у говорящего поверх затемнения — его портрет.
  // Амипат и торговец — справа (сам персонаж и есть портрет), друзья — слева (отдельный *_face).
  // На экране всегда одно лицо — того, кто говорит последним; на чужой реплике оно сменяется
  // без анимации, плавно появляется только первое лицо куска.
  var FACES = {
    amipat: { face: 'amipat' },
    trader_face: { face: 'trader_face' },
    ostap: { face: 'ostap_face', at: 'FRIEND_FACE', friend: true },
    nazar: { face: 'nazar_face', at: 'FRIEND_FACE', friend: true },
    timofey: { face: 'timofey_face', at: 'FRIEND_FACE', friend: true }
  };

  function silentLook(look) {
    return (look || 'talk').replace('talk', 'normal');
  }

  function isDialogueStep(step) {
    return !!(step && (step.say || typeof step.text === 'string'));
  }

  function hasFace(step) {
    return !!(step && step.say && FACES[step.say.character]);
  }

  // Сплошной кусок реплик, где говорит кто-то с лицом из FACES:
  // реплики до первой такой фразы — как обычно; затемнение и лицо появляются
  // с первой фразой и держатся до конца куска
  function convertPortraitBlock(block, out) {
    var first = 0;
    while (!hasFace(block[first])) first++;
    for (var b = 0; b < first; b++) {
      var conv = convertStep(block[b], block[b - 1], block[b + 1]);
      if (Array.isArray(conv)) conv.forEach(function (a) { out.push(a); });
      else out.push(conv);
    }
    block = block.slice(first);
    // Амипат уходит плавно (портрет и плашка гаснут вместе), остальные — сразу, вместе с плашкой
    var fadeOut = block.some(function (st) { return st.say && st.say.character === 'amipat'; });
    var shown = null; // { face, at, look } — лицо, которое сейчас на экране
    var opened = false; // первое лицо куска уже появилось (плавно — только оно)

    out.push({ 'show dialog_dim': 'normal AT FULLSCREEN WITH FADE CONTINUE' });
    block.forEach(function (st, idx) {
      var line = {};
      // FADE: последняя реплика остаётся на экране, пока гаснет портрет (portraitOut)
      if (fadeOut && idx === block.length - 1) out.push({ 'call holdText': {} });
      if (!st.say) {
        // рассказчик говорит без лиц на экране
        if (shown) {
          var hideFace = {};
          hideFace['hide ' + shown.face] = 'WITH CUT CONTINUE';
          out.push(hideFace);
          shown = null;
        }
        out.push({ 'storyteller says': st.text });
        return;
      }
      var who = st.say.character;
      var f = FACES[who];
      var look = st.say.look || 'talk';
      var speaking = look === 'normal' ? 'talk' : look;
      if (f) {
        var at = f.at || st.say.at || SPEAKER_AT[who];
        // у лиц друзей своя поза — поза их фигуры на сцене (talk_yard, talk_far…) тут не подходит;
        // say.face задаёт эмоцию лица (sad — пока Амипат умирает)
        var faceLook = st.say.face || (f.friend ? 'talk' : look);
        var show = {};
        if (!opened) {
          // CONTINUE: анимация идёт параллельно с репликой — плашка с текстом не пропадает
          show['show ' + f.face] = faceLook + ' AT ' + at + ' WITH FADE CONTINUE';
          opened = true;
        } else {
          if (shown && shown.face !== f.face) {
            var hidePrev = {};
            hidePrev['hide ' + shown.face] = 'WITH CUT CONTINUE';
            out.push(hidePrev);
          }
          show['show ' + f.face] = faceLook + ' AT ' + at + ' WITH CUT';
        }
        out.push(show);
        if (st.say.hideSprite) {
          // только голос: фигуры на сцене быть не должно
          var hideFigure = {};
          hideFigure['hide ' + who] = 'WITH CUT CONTINUE';
          out.push(hideFigure);
        }
        // фигура друга на сцене тоже открывает рот (если она там стоит)
        if (f.friend && !st.say.hideSprite) out.push({ 'call setLook': { char: who, look: speaking } });
        // без позы в «says»: иначе RenJS сам перепоказывает спрайт рывком поверх плавного появления
        line[who + ' says'] = st.say.text;
        out.push(line);
        if (f.friend && !st.say.hideSprite) {
          out.push({ 'call setLook': { char: who, look: st.say.restore != null ? st.say.restore : 'normal' } });
        }
        shown = { face: f.face, at: at, look: silentLook(faceLook) };
        var back = {};
        back['show ' + f.face] = shown.look + ' AT ' + at + ' WITH CUT';
        out.push(back);
        return;
      }
      // говорящий без лица: меняем картинку у стоящего спрайта (setLook),
      // а не показываем новый — новый спрайт RenJS кладёт поверх затемнения
      out.push({ 'call setLook': { char: who, look: speaking } });
      line[who + ' says'] = st.say.text;
      out.push(line);
      out.push({ 'call setLook': { char: who, look: st.say.restore != null ? st.say.restore : 'normal' } });
    });
    if (fadeOut) {
      // сперва гаснет портрет с затемнением, потом исчезает плашка текста
      // (если последним говорил рассказчик, лица уже нет — гаснет только затемнение)
      out.push({ 'call portraitOut': { char: shown ? shown.face : null } });
      return;
    }
    if (shown) {
      var close = {};
      close['hide ' + shown.face] = 'WITH CUT CONTINUE';
      out.push(close);
    }
    out.push({ 'hide dialog_dim': 'WITH CUT CONTINUE' });
  }

  function convertDialogues(data) {
    var story = {};
    var scenes = data.scenes || {};
    Object.keys(scenes).forEach(function (name) {
      var list = [];
      var steps = scenes[name] || [];
      var i = 0;
      while (i < steps.length) {
        if (isDialogueStep(steps[i])) {
          var j = i;
          while (j < steps.length && isDialogueStep(steps[j])) j++;
          var block = steps.slice(i, j);
          if (block.some(hasFace)) {
            convertPortraitBlock(block, list);
            i = j;
            continue;
          }
        }
        var converted = convertStep(steps[i], steps[i - 1], steps[i + 1]);
        if (Array.isArray(converted)) {
          for (var k = 0; k < converted.length; k++) list.push(converted[k]);
        } else {
          list.push(converted);
        }
        i++;
      }
      story[name] = list;
    });
    return story;
  }

  async function loadStoryFromDialogues(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Cannot load ' + url + ' (' + res.status + ')');
    var data = await res.json();
    var story = convertDialogues(data);
    var storyUrl =
      'data:application/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(story));
    return {
      title: data.title || 'Три Дара',
      startScene: data.startScene || 'start',
      storyUrl: storyUrl,
      story: story
    };
  }

  // Смена позы персонажа без пересоздания спрайта: та же позиция и слой
  function SetLookPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  SetLookPlugin.prototype.onInit = function () {};
  SetLookPlugin.prototype.onStart = function () {};
  SetLookPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    try {
      var ch = game.managers.character.characters[params.char];
      var sprite = ch && ch.currentLook;
      var key = ch && ch.keyName + '_' + params.look;
      if (sprite && game.cache.checkImageKey(key)) {
        sprite.loadTexture(key);
        sprite.name = params.look;
      }
    } catch (e) {
      console.warn('setLook', e);
    }
    game.resolveAction();
  };
  SetLookPlugin.prototype.onTeardown = function () {};

  // holdText: следующая реплика после клика не убирает плашку и табличку имени
  function HoldTextPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  HoldTextPlugin.prototype.onInit = function () {};
  HoldTextPlugin.prototype.onStart = function () {};
  HoldTextPlugin.prototype.onCall = function () {
    var game = this.game;
    var tm = game.managers.text;
    if (!tm.__holdPatched) {
      tm.__holdPatched = true;
      var orig = tm.characterSays;
      tm.characterSays = function (actor, look, body, boxId, dontHide) {
        if (game.__holdNextText) {
          game.__holdNextText = false;
          dontHide = true;
        }
        return orig.call(this, actor, look, body, boxId, dontHide);
      };
    }
    game.__holdNextText = true;
    game.resolveAction();
  };
  HoldTextPlugin.prototype.onTeardown = function () {};

  // portraitOut: портрет, затемнение и плашка текста с табличкой имени плавно гаснут вместе
  function PortraitOutPlugin(name, game) {
    this.name = name;
    this.game = game;
  }
  PortraitOutPlugin.prototype.onInit = function () {};
  PortraitOutPlugin.prototype.onStart = function () {};
  PortraitOutPlugin.prototype.onCall = function (params) {
    var game = this.game;
    if (params && params.body && typeof params.body === 'object') params = params.body;
    var cm = game.managers.character;
    var ms = (game.storyConfig && game.storyConfig.fadetime) || 280;
    var ids = [params.char, 'dialog_dim'];
    var hud = game.gui.hud;
    var boxes = [hud.mBoxes && hud.mBoxes['default']].concat(
      Object.keys(hud.nBoxes || {}).map(function (k) { return hud.nBoxes[k]; })
    ).filter(function (b) { return b && b.visible; });
    var sprites = ids.map(function (id) {
      return cm.characters[id] && cm.characters[id].currentLook;
    }).concat(boxes).filter(Boolean);
    var fades = sprites.map(function (sp) {
      return new Promise(function (res) {
        game.managers.tween.tween(sp, { alpha: 0 }, res, ms, true, 0, false);
      });
    });
    Promise.all(fades)
      .then(function () {
        return Promise.all(ids.map(function (id) {
          return cm.characters[id] && cm.characters[id].currentLook ? cm.hide(id, 'CUT') : null;
        }));
      })
      .then(function () {
        Object.keys(hud.nBoxes || {}).forEach(function (k) { hud.hideName(k); });
        return hud.hideText('default');
      })
      .then(function () {
        // вернуть прозрачность — следующая реплика покажет плашку как обычно
        boxes.forEach(function (b) { b.alpha = 1; });
      })
      .catch(function (e) { console.warn('portraitOut', e); })
      .then(function () { game.resolveAction(); });
  };
  PortraitOutPlugin.prototype.onTeardown = function () {};

  // Табличка с именем: пока слева видно лицо друга, она уходит на правый край плашки
  // (зеркально своему месту слева), чтобы не лежать на лице
  var FRIEND_FACE_IDS = ['ostap_face', 'nazar_face', 'timofey_face'];

  function friendFaceShown(game) {
    var cm = game.managers && game.managers.character;
    if (!cm) return false;
    return FRIEND_FACE_IDS.some(function (id) {
      return cm.characters[id] && cm.characters[id].currentLook;
    });
  }

  function installNameSide(game) {
    var hud = game && game.gui && game.gui.hud;
    if (!hud || hud.__nameSide) return;
    hud.__nameSide = true;
    var orig = hud.showName;
    hud.showName = function (id) {
      var box = this.nBoxes && this.nBoxes[id];
      var mb = this.mBoxes && this.mBoxes[Object.keys(this.mBoxes)[0]];
      if (box && mb) {
        if (box.__leftX == null) box.__leftX = box.x;
        var right = mb.x + mb.width - (box.__leftX - mb.x) - box.width;
        box.x = friendFaceShown(game) ? right : box.__leftX;
      }
      return orig.apply(this, arguments);
    };
  }

  global.TridaraStory = {
    installNameSide: installNameSide,
    SetLookPlugin: SetLookPlugin,
    HoldTextPlugin: HoldTextPlugin,
    PortraitOutPlugin: PortraitOutPlugin,
    convertDialogues: convertDialogues,
    loadStoryFromDialogues: loadStoryFromDialogues
  };
})(window);
