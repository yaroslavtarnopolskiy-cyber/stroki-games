/**
 * История диалогов: каждая показанная реплика (имя + текст) попадает в журнал,
 * кнопка «История» открывает его поверх игры.
 */
(function (global) {
  var log = [];

  function displayName(game, id) {
    var ch = game.managers.character.characters[id];
    var name = ch && ch.config && ch.config.displayName;
    return name || '';
  }

  // Разметка стилей RenJS внутри реплики: (italic)…(end), (bold), (color:…), (pause:…)
  var STYLE_TAG = /\((italic|bold|end|color:[^)]*|pause:[^)]*)\)/;

  // В журнал идёт текст без HTML-тегов; разметку RenJS сохраняем — по ней рисуется курсив
  function plain(text) {
    return String(text == null ? '' : text).replace(/<[^>]*>/g, '').trim();
  }

  /** Текст реплики с курсивом даров: (italic)яблоко(end) → <em>яблоко</em>. */
  function fillText(node, text) {
    var parts = text.split(STYLE_TAG);
    var italic = false;
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        if (parts[i] === 'italic') italic = true;
        else if (parts[i] === 'end') italic = false;
        continue;
      }
      if (!parts[i]) continue;
      if (italic) {
        var em = document.createElement('em');
        em.textContent = parts[i];
        node.appendChild(em);
      } else {
        node.appendChild(document.createTextNode(parts[i]));
      }
    }
  }

  /** Перехват вывода реплик; повторный вызов ничего не делает. */
  function install(game) {
    var tm = game && game.managers && game.managers.text;
    if (!tm || tm.__historyPatched) return;
    tm.__historyPatched = true;
    var orig = tm.characterSays;
    tm.characterSays = function (actor, look, body) {
      try {
        var text = plain(body);
        var last = log[log.length - 1];
        // одна и та же реплика может прийти дважды (перепоказ после загрузки сцены)
        if (text && !(last && last.id === actor && last.text === text)) {
          log.push({ id: actor, name: displayName(game, actor), text: text });
          if (panelOpen()) render();
        }
      } catch (e) {
        console.warn('history', e);
      }
      return orig.apply(this, arguments);
    };
  }

  function panel() {
    return document.getElementById('history-panel');
  }

  function panelOpen() {
    var p = panel();
    return !!(p && !p.hidden);
  }

  function render() {
    var list = document.querySelector('#history-panel .hist-list');
    if (!list) return;
    list.innerHTML = '';
    if (!log.length) {
      var empty = document.createElement('p');
      empty.className = 'hist-empty';
      empty.textContent = 'Здесь появятся реплики, когда начнётся история.';
      list.appendChild(empty);
      return;
    }
    log.forEach(function (entry) {
      var item = document.createElement('div');
      item.className = 'hist-item' + (entry.id === 'storyteller' ? ' is-narrator' : '');
      if (entry.name) {
        var name = document.createElement('div');
        name.className = 'hist-name';
        name.textContent = entry.name;
        item.appendChild(name);
      }
      var text = document.createElement('p');
      text.className = 'hist-text';
      fillText(text, entry.text);
      item.appendChild(text);
      list.appendChild(item);
    });
    // последняя реплика — внизу, как в окне диалога
    list.scrollTop = list.scrollHeight;
  }

  function open() {
    var p = panel();
    if (!p) return;
    render();
    p.hidden = false;
    document.body.classList.add('history-open');
    var close = p.querySelector('.hist-close');
    if (close) close.focus();
  }

  function close() {
    var p = panel();
    if (!p) return;
    p.hidden = true;
    document.body.classList.remove('history-open');
  }

  function bindUi() {
    var btn = document.getElementById('btn-history');
    var p = panel();
    if (btn) btn.addEventListener('click', open);
    if (!p) return;
    p.addEventListener('click', function (e) {
      // клик мимо окна или по крестику закрывает
      if (e.target === p || e.target.closest('.hist-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelOpen()) close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi);
  else bindUi();

  global.TridaraHistory = { install: install, open: open, close: close, entries: function () { return log.slice(); } };
})(window);
