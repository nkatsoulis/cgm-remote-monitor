/* Quiz engine. URL: test.html?t=<section-id>&mode=study|exam */
(function () {
  'use strict';

  var R = window.CDL_ROUTING;
  var STORE = 'wfe-cdl-best';
  var keysBound = false;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function saveBest(sectionId, pct) {
    try {
      var all = JSON.parse(localStorage.getItem(STORE)) || {};
      if (!all[sectionId] || all[sectionId].pct < pct) {
        all[sectionId] = { pct: pct, at: Date.now() };
        localStorage.setItem(STORE, JSON.stringify(all));
      }
    } catch (e) { /* private browsing, blocked storage — scores just aren't remembered */ }
  }

  function init() {
  var sections = window.CDL_SECTIONS || [];
  var bank = window.CDL_BANK || {};
  var sectionId = R.param('t');
  var section = null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].id === sectionId) { section = sections[i]; break; }
  }

  var root = document.getElementById('quiz-root');
  var titleEl = document.getElementById('quiz-title');
  var subEl = document.getElementById('quiz-sub');
  var pillEl = document.getElementById('quiz-pill');
  var barEl = document.getElementById('progress-bar');

  if (!section) {
    document.title = 'Test not found | Wichita Falls Equipment';
    root.innerHTML = '<div class="question-card"><h2>Test not found</h2>' +
      '<p>That practice test does not exist. Pick one from the list of Texas CDL tests.</p>' +
      '<a class="btn" href="' + R.homeUrl + '">Back to all tests</a></div>';
    return;
  }

  var mode = R.param('mode') === 'exam' ? 'exam' : 'study';
  var pool = bank[section.id] || [];
  var count = Math.min(section.draw, pool.length);
  var needed = Math.ceil(count * 0.8);

  document.title = section.name + ' Practice Test | Texas CDL | Wichita Falls Equipment';
  titleEl.textContent = section.name;
  subEl.textContent = section.manual;

  var questions = [];
  var answers = [];
  var index = 0;

  function start() {
    questions = shuffle(pool).slice(0, count);
    answers = new Array(count).fill(null);
    index = 0;
    render();
  }

  function setProgress(done) {
    barEl.style.width = (count ? (done / count) * 100 : 0) + '%';
  }

  function renderIntro() {
    pillEl.textContent = mode === 'exam' ? 'Exam mode' : 'Study mode';
    setProgress(0);
    root.innerHTML = '' +
      '<div class="question-card">' +
        '<h2>' + esc(section.name) + ' practice test</h2>' +
        '<p>' + esc(section.blurb) + '</p>' +
        '<div class="note"><p><b>Who needs this test:</b> ' + esc(section.who) + '</p></div>' +
        '<div class="meta" style="display:flex;gap:20px;flex-wrap:wrap;margin:20px 0;font-size:.9rem;color:var(--muted)">' +
          '<span><b style="color:var(--ink)">' + count + '</b> questions</span>' +
          '<span><b style="color:var(--ink)">' + needed + '</b> correct to pass (80%)</span>' +
          '<span>drawn from <b style="color:var(--ink)">' + pool.length + '</b> in the bank</span>' +
        '</div>' +
        '<div class="mode-choice">' +
          '<button class="mode-card" data-mode="study"><b>Study mode</b><span>Answer, then see immediately whether you were right and why. Best for learning the material.</span></button>' +
          '<button class="mode-card" data-mode="exam"><b>Exam mode</b><span>No feedback until the end, then a pass or fail against the 80% bar. Best for checking if you are ready.</span></button>' +
        '</div>' +
        '<a class="btn ghost" href="' + R.homeUrl + '">All tests</a>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.mode-card'), function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode');
        R.setMode(section.id, mode);
        start();
      });
    });
  }

  function render() {
    var q = questions[index];
    var picked = answers[index];
    var reveal = mode === 'study' && picked !== null;

    pillEl.textContent = (mode === 'exam' ? 'Exam' : 'Study') + ' · ' + (index + 1) + ' of ' + count;
    setProgress(index + (picked !== null ? 1 : 0));

    var opts = q.a.map(function (text, i) {
      var cls = 'option';
      if (reveal) {
        if (i === q.c) cls += ' correct';
        else if (i === picked) cls += ' wrong';
      } else if (i === picked) {
        cls += ' selected';
      }
      return '<button class="' + cls + '" data-i="' + i + '"' + (reveal ? ' disabled' : '') + '>' +
        '<span class="key">' + 'ABCD'.charAt(i) + '</span>' +
        '<span>' + esc(text) + '</span></button>';
    }).join('');

    var explain = '';
    if (reveal) {
      var right = picked === q.c;
      explain = '<div class="explain ' + (right ? 'right' : 'wrong') + '">' +
        '<b>' + (right ? 'Correct' : 'Not quite — the answer is ' + 'ABCD'.charAt(q.c)) + '</b>' +
        esc(q.e) + '</div>';
    }

    var isLast = index === count - 1;
    root.innerHTML = '' +
      '<div class="question-card">' +
        '<div class="qnum">Question ' + (index + 1) + ' of ' + count + '</div>' +
        '<div class="qtext">' + esc(q.q) + '</div>' +
        '<div class="options">' + opts + '</div>' +
        explain +
      '</div>' +
      '<div class="quiz-actions">' +
        '<button class="btn secondary" id="prev"' + (index === 0 ? ' disabled' : '') + '>Back</button>' +
        '<button class="btn" id="next"' + (picked === null ? ' disabled' : '') + '>' +
          (isLast ? 'Finish and see score' : 'Next question') + '</button>' +
        '<span class="spacer"></span>' +
        '<a class="btn ghost" href="' + R.homeUrl + '">Quit</a>' +
      '</div>';

    Array.prototype.forEach.call(root.querySelectorAll('.option'), function (b) {
      b.addEventListener('click', function () {
        answers[index] = parseInt(b.getAttribute('data-i'), 10);
        if (mode === 'exam' && index < count - 1) {
          index++;
          render();
        } else {
          render();
        }
      });
    });

    var prev = document.getElementById('prev');
    if (prev) prev.addEventListener('click', function () { if (index > 0) { index--; render(); } });
    var next = document.getElementById('next');
    if (next) next.addEventListener('click', function () {
      if (answers[index] === null) return;
      if (isLast) finish(); else { index++; render(); }
    });
  }

  function finish() {
    var correct = 0;
    questions.forEach(function (q, i) { if (answers[i] === q.c) correct++; });
    var pct = Math.round((correct / count) * 100);
    var passed = correct >= needed;
    saveBest(section.id, pct);
    setProgress(count);
    pillEl.textContent = 'Results';
    pillEl.className = 'pill' + (passed ? '' : ' warn');

    var missed = questions.map(function (q, i) { return { q: q, picked: answers[i] }; })
      .filter(function (r) { return r.picked !== r.q.c; });

    var reviewHtml = missed.length
      ? '<div class="question-card"><h2>Review what you missed (' + missed.length + ')</h2>' +
          missed.map(function (r) {
            return '<div class="review-item">' +
              '<div class="qtext">' + esc(r.q.q) + '</div>' +
              '<div class="review-line you"><span class="lbl">You chose</span><span class="val">' +
                esc(r.picked === null ? 'No answer' : r.q.a[r.picked]) + '</span></div>' +
              '<div class="review-line ans"><span class="lbl">Correct</span><span class="val">' +
                esc(r.q.a[r.q.c]) + '</span></div>' +
              '<div class="explain">' + esc(r.q.e) + '</div>' +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="question-card"><h2>Nothing missed</h2><p style="margin-bottom:0">A perfect run. Take it again ' +
        'in a day or two &mdash; the bank is bigger than one test, so you will see questions you have not answered yet.</p></div>';

    root.innerHTML = '' +
      '<div class="score-hero">' +
        '<div class="score-ring ' + (passed ? 'pass' : 'fail') + '">' + pct + '%</div>' +
        '<div class="verdict ' + (passed ? 'pass' : 'fail') + '">' + (passed ? 'Passed' : 'Not passing yet') + '</div>' +
        '<div class="score-detail">' + correct + ' of ' + count + ' correct. Texas requires ' + needed +
          ' correct (80%) on the ' + esc(section.name) + ' exam.</div>' +
        '<div class="quiz-actions" style="justify-content:center">' +
          '<button class="btn" id="again">Take it again</button>' +
          '<a class="btn secondary" href="' + R.testUrl(section.id, mode === 'exam' ? 'study' : 'exam') +
            '">Switch to ' + (mode === 'exam' ? 'study' : 'exam') + ' mode</a>' +
          '<a class="btn ghost" href="' + R.homeUrl + '">All tests</a>' +
        '</div>' +
        (passed ? '' : '<p style="margin:18px 0 0;font-size:.9rem;color:var(--muted)">Read ' +
          esc(section.manual) + ' before your next attempt.</p>') +
      '</div>' +
      reviewHtml;

    document.getElementById('again').addEventListener('click', function () {
      pillEl.className = 'pill';
      start();
      window.scrollTo(0, 0);
    });
  }

  if (!keysBound) {
    keysBound = true;
    document.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      var map = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      if (k in map) {
        var btn = document.querySelector('#quiz-root .option[data-i="' + map[k] + '"]:not([disabled])');
        if (btn) btn.click();
      } else if (e.key === 'Enter') {
        var next = document.getElementById('next');
        if (next && !next.disabled) next.click();
      }
    });
  }

  renderIntro();
  }

  window.CDLQuiz = { init: init };
  if (!window.CDL_ROUTER && document.getElementById('quiz-root')) init();
})();
