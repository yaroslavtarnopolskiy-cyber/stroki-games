/**
 * Управление с клавиатуры — дополнительно к мыши и тачу, ничего из них не меняет.
 *
 *   Диалоги:        Пробел / Enter / →  — дальше;  H — история
 *   Главное меню:   Enter / Пробел — начать
 *   Квесты:         ← / → / Tab — выбрать предмет на сцене (подсвечивается)
 *                   Enter / Пробел — нажать на него
 *                   1–9 — взять предмет из инвентаря (ещё раз — положить), Esc — положить;
 *                     с предметом в руке Enter — применить его к выбранному на сцене
 *                   Q / E (PageUp / PageDown) — соседний экран
 *   Дар в руке:     Enter / Пробел — отдать
 *   Выбор мужа:     ← / → — герой, Enter — выбрать (или 1, 2, 3 — слева направо)
 *                   «Вы уверены?»: ← / → и Enter, Y / Д — да, N / Н / Esc — нет
 *   Подсказка-дар:  Enter / Пробел — нажать на дар
 */
(function (global) {
  var focusKey = null; // какой объект квеста выбран (data-id или осколок)
  var selItem = null; // какой предмет инвентаря «в руке»

  function game() {
    return global.Phaser && Phaser.GAMES && Phaser.GAMES[0];
  }

  function activeQuest() {
    var qs = [global.TridaraAppleQuest, global.TridaraHorseQuest, global.TridaraMirrorQuest];
    for (var i = 0; i < qs.length; i++) {
      var k = qs[i] && qs[i].keyboard;
      if (k && k.active()) return k;
    }
    return null;
  }

  function visible(n) {
    var r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden';
  }

  function keyOf(n) {
    return n.dataset.id || (n.dataset.n ? 'piece' + n.dataset.n : '');
  }

  /** Объекты текущего экрана квеста слева направо. */
  function questNodes(k) {
    return Array.prototype.slice.call(k.nodes()).filter(visible).sort(function (a, b) {
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      return ra.left + ra.width / 2 - (rb.left + rb.width / 2);
    });
  }

  function focusedNode(k) {
    var nodes = questNodes(k);
    for (var i = 0; i < nodes.length; i++) if (keyOf(nodes[i]) === focusKey) return nodes[i];
    return null;
  }

  function cycle(k, dir) {
    var nodes = questNodes(k);
    if (!nodes.length) return;
    var cur = focusedNode(k);
    var i = nodes.indexOf(cur);
    i = i < 0 ? (dir > 0 ? 0 : nodes.length - 1) : (i + dir + nodes.length) % nodes.length;
    focusKey = keyOf(nodes[i]);
    k.focus(nodes[i]);
  }

  // после действия сцена может перерисоваться — вернуть подсветку выбранному и предмет «в руку»
  function refocus(k) {
    setTimeout(function () {
      if (!k.active()) return;
      var n = focusedNode(k);
      if (n) k.focus(n);
      else focusKey = null;
      if (selItem && k.items().indexOf(selItem) < 0) selItem = null;
      k.select(selItem);
    }, 30);
  }

  function questPress(k) {
    var n = focusedNode(k);
    if (!n) {
      cycle(k, 1);
      return;
    }
    if (selItem) k.use(selItem, n);
    else k.activate(n);
    refocus(k);
  }

  function questItem(k, idx) {
    var items = k.items();
    var id = items[idx];
    if (!id) return;
    selItem = selItem === id ? null : id;
    k.select(selItem);
  }

  function questKey(k, e) {
    var code = e.code;
    if (code === 'ArrowRight' || code === 'ArrowDown' || (code === 'Tab' && !e.shiftKey)) return cycle(k, 1), true;
    if (code === 'ArrowLeft' || code === 'ArrowUp' || (code === 'Tab' && e.shiftKey)) return cycle(k, -1), true;
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') return questPress(k), true;
    if (/^Digit[1-9]$/.test(code) || /^Numpad[1-9]$/.test(code)) return questItem(k, Number(code.slice(-1)) - 1), true;
    if (code === 'Escape') {
      if (selItem) {
        selItem = null;
        k.select(null);
      } else {
        focusKey = null;
        k.focus(null);
      }
      return true;
    }
    if (k.nav && (code === 'KeyQ' || code === 'PageUp' || code === 'KeyE' || code === 'PageDown')) {
      k.nav(code === 'KeyQ' || code === 'PageUp' ? -1 : 1);
      focusKey = null;
      return true;
    }
    return false;
  }

  // —— финал: «Вы уверены?» и экран результата ——

  function moveFocus(buttons, dir) {
    var i = buttons.indexOf(document.activeElement);
    i = i < 0 ? (dir > 0 ? 0 : buttons.length - 1) : (i + dir + buttons.length) % buttons.length;
    buttons[i].focus();
  }

  function confirmKey(e) {
    var yes = document.querySelector('.choose-confirm.is-on .choose-word.is-yes');
    var no = document.querySelector('.choose-confirm.is-on .choose-word.is-no');
    if (!yes || !no) return false;
    var key = (e.key || '').toLowerCase();
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Tab') {
      moveFocus([yes, no], e.code === 'ArrowLeft' || e.shiftKey ? -1 : 1);
      return true;
    }
    if (key === 'y' || key === 'д') return yes.click(), true;
    if (key === 'n' || key === 'н' || e.code === 'Escape') return no.click(), true;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      if (document.activeElement === yes || document.activeElement === no) document.activeElement.click();
      else yes.focus();
      return true;
    }
    return true; // пока спрашивают «Вы уверены?», остальные клавиши ничего не делают
  }

  function chooseKey(ch, e) {
    if (e.code === 'ArrowRight' || e.code === 'Tab') return ch.cycle(1), true;
    if (e.code === 'ArrowLeft') return ch.cycle(-1), true;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return ch.pick(), true;
    if (/^(Digit|Numpad)[1-3]$/.test(e.code)) return ch.pickNth(Number(e.code.slice(-1)) - 1), true;
    return true;
  }

  function finalKey(screen, e) {
    var buttons = Array.prototype.slice.call(screen.querySelectorAll('.fs-actions button'));
    if (!buttons.length) return false;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') return moveFocus(buttons, -1), true;
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') return moveFocus(buttons, 1), true;
    if ((e.code === 'Enter' || e.code === 'Space') && buttons.indexOf(document.activeElement) < 0) {
      buttons[0].focus();
      return true;
    }
    return false; // Enter на кнопке в фокусе браузер нажмёт сам
  }

  function clickCanvasAt(g, x, y) {
    var c = g.canvas;
    var r = c.getBoundingClientRect();
    var o = {
      clientX: r.left + (x / g.config.w) * r.width,
      clientY: r.top + (y / g.config.h) * r.height,
      bubbles: true,
      pointerId: 1,
      button: 0
    };
    // Phaser сначала должен «увидеть» указатель над кнопкой
    ['pointermove', 'mousemove', 'pointerdown', 'mousedown'].forEach(function (t) {
      c.dispatchEvent(new (t[0] === 'p' ? PointerEvent : MouseEvent)(t, o));
    });
    setTimeout(function () {
      ['pointerup', 'mouseup'].forEach(function (t) {
        c.dispatchEvent(new (t[0] === 'p' ? PointerEvent : MouseEvent)(t, o));
      });
    }, 60);
  }

  function onKeyDown(e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    var handled = false;
    var g = game();
    var history = document.getElementById('history-panel');
    var historyOpen = history && !history.hidden;
    var final = document.getElementById('final-screen');

    if (historyOpen) {
      // в истории — только закрыть (Esc обрабатывает сама история)
      if (e.code === 'KeyH') {
        global.TridaraHistory.close();
        handled = true;
      }
    } else if (final && !final.hidden) {
      handled = finalKey(final, e);
    } else if (document.querySelector('.choose-confirm.is-on')) {
      handled = confirmKey(e);
    } else if (global.TridaraChoosing) {
      handled = chooseKey(global.TridaraChoosing, e);
    } else if (global.TridaraUseInHand) {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') global.TridaraUseInHand.use();
      handled = true;
    } else if (document.querySelector('.gift-prompt-gift:not(:disabled)')) {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        document.querySelector('.gift-prompt-gift:not(:disabled)').click();
      }
      handled = true;
    } else if (activeQuest()) {
      handled = questKey(activeQuest(), e);
    } else if (g && g.gui && g.gui.currentMenu === 'main') {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        // кнопка «Начать историю» (GUI.yaml: x 682, y 344, 555×87)
        clickCanvasAt(g, 682 + 555 / 2, 344 + 87 / 2);
        handled = true;
      }
    } else if (g && g.gui && g.gui.currentMenu === 'hud') {
      if (e.code === 'KeyH' && global.TridaraHistory) {
        global.TridaraHistory.open();
        handled = true;
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'ArrowRight') {
        // как клик или пробел у RenJS: дальше, если реплика дописана
        if (typeof g.onTap === 'function') g.onTap();
        handled = true;
      }
      // пробел RenJS обрабатывает сам
    }

    if (handled) {
      e.preventDefault();
      // RenJS (Phaser) слушает клавиши на window — до него наша клавиша не доходит
      e.stopPropagation();
    }
  }

  document.addEventListener('keydown', onKeyDown);

  // сменился квест или он закончился — забыть выбор
  setInterval(function () {
    if (!activeQuest()) {
      focusKey = null;
      selItem = null;
    }
  }, 500);
})(window);
