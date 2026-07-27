/* Endless drawing — progress ticks and the warm-up timer.
   Everything here is optional. With JavaScript off the lessons still read fine;
   you just lose the ticks and the timer. */
(function () {
  'use strict';

  var KEY = 'endless-drawing.done';

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter(function (n) { return typeof n === 'number'; }) : [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list.slice().sort(function (a, b) { return a - b; })));
    } catch (e) {
      /* Private browsing, a full disk — nothing here is worth interrupting her for. */
    }
  }

  var done = load();
  var has = function (n) { return done.indexOf(n) !== -1; };

  /* ------------------------------------------------------------------ home */

  function paintHome() {
    var cells = document.querySelectorAll('[data-lesson]');
    var total = document.querySelectorAll('.cell[data-lesson]').length;
    var next = 0;
    var i;

    for (i = 1; i <= total; i++) {
      if (!has(i)) { next = i; break; }
    }

    for (i = 0; i < cells.length; i++) {
      var el = cells[i];
      var n = Number(el.getAttribute('data-lesson'));
      el.classList.toggle('is-done', has(n));
      el.classList.toggle('is-next', n === next);
    }

    var summary = document.querySelector('[data-progress-summary]');
    if (summary) {
      summary.textContent = done.length + ' of ' + total + ' lessons marked done.';
    }
  }

  if (document.body.classList.contains('home')) {
    paintHome();
  }

  /* ------------------------------------------------------------ lesson page */

  var lessonNumber = Number(document.body.getAttribute('data-lesson'));
  var doneBtn = document.querySelector('[data-done-btn]');

  if (lessonNumber && doneBtn) {
    var box = doneBtn.closest('.donebox');
    var label = doneBtn.querySelector('[data-done-label]');
    if (box) box.hidden = false;

    var paintDone = function () {
      var isDone = has(lessonNumber);
      doneBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      label.textContent = isDone ? 'Done. Tap to unmark' : 'Mark this done';
    };

    doneBtn.addEventListener('click', function () {
      if (has(lessonNumber)) {
        done = done.filter(function (n) { return n !== lessonNumber; });
      } else {
        done = done.concat([lessonNumber]);
      }
      save(done);
      paintDone();
    });

    paintDone();
  }

  /* ------------------------------------------------------------------ timer */

  var timer = document.querySelector('.timer');

  if (timer) {
    var minutes = Number(timer.getAttribute('data-minutes'));
    var total = minutes * 60;
    var go = timer.querySelector('[data-timer-go]');
    var read = timer.querySelector('[data-timer-read]');
    var bar = timer.querySelector('[data-timer-bar]');
    var endsAt = 0;
    var tick = null;

    timer.hidden = false;

    var show = function (secondsLeft) {
      var s = Math.max(0, Math.ceil(secondsLeft));
      var mm = Math.floor(s / 60);
      var ss = s % 60;
      read.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      bar.style.width = ((total - s) / total * 100) + '%';
    };

    var stop = function (finished) {
      window.clearInterval(tick);
      tick = null;
      timer.classList.remove('is-running');
      timer.classList.toggle('is-done', !!finished);
      if (finished) {
        read.textContent = 'Time';
        bar.style.width = '100%';
        go.textContent = 'Start again';
      } else {
        show(total);
        go.textContent = 'Start ' + minutes + (minutes === 1 ? ' minute' : ' minutes');
      }
    };

    go.addEventListener('click', function () {
      if (tick) { stop(false); return; }
      timer.classList.remove('is-done');
      timer.classList.add('is-running');
      go.textContent = 'Stop';
      endsAt = Date.now() + total * 1000;
      show(total);
      tick = window.setInterval(function () {
        var left = (endsAt - Date.now()) / 1000;
        if (left <= 0) { stop(true); return; }
        show(left);
      }, 250);
    });

    show(total);
  }

  /* --------------------------------------------------- clear progress */
  /* Two taps, no modal dialog — she has a stylus in one hand. */

  var clears = document.querySelectorAll('[data-clear]');

  for (var c = 0; c < clears.length; c++) {
    (function (btn) {
      var wrap = btn.parentNode;
      if (wrap && wrap.hidden) wrap.hidden = false;
      var armed = false;
      var reset = null;

      btn.addEventListener('click', function () {
        if (!armed) {
          armed = true;
          btn.setAttribute('data-armed', '');
          btn.textContent = 'Tap again to clear everything';
          reset = window.setTimeout(function () {
            armed = false;
            btn.removeAttribute('data-armed');
            btn.textContent = 'Clear my progress';
          }, 5000);
          return;
        }
        window.clearTimeout(reset);
        armed = false;
        btn.removeAttribute('data-armed');
        done = [];
        save(done);
        btn.textContent = 'Cleared';
        window.setTimeout(function () { btn.textContent = 'Clear my progress'; }, 2000);
        if (document.body.classList.contains('home')) paintHome();
      });
    })(clears[c]);
  }
})();
