/* Home page: render the test cards and the saved best scores. */
(function () {
  'use strict';

  var STORE = 'wfe-cdl-best';

  function bestScores() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var sections = window.CDL_SECTIONS || [];
  var bank = window.CDL_BANK || {};
  var best = bestScores();

  var total = 0;
  sections.forEach(function (s) { total += (bank[s.id] || []).length; });
  var statEl = document.getElementById('stat-questions');
  if (statEl) statEl.textContent = total;

  var grid = document.getElementById('test-grid');
  if (grid) {
    grid.innerHTML = sections.map(function (s) {
      var pool = (bank[s.id] || []).length;
      var draw = Math.min(s.draw, pool);
      var b = best[s.id];
      var bestHtml = '';
      if (b && typeof b.pct === 'number') {
        var passed = b.pct >= 80;
        bestHtml = '<div class="best' + (passed ? '' : ' fail') + '">Best score: ' + b.pct + '%' +
          (passed ? ' &mdash; passing' : ' &mdash; keep going') + '</div>';
      }
      return '' +
        '<article class="card">' +
          '<span class="tag' + (s.tier === 'core' ? ' req' : '') + '">' + esc(s.code) + '</span>' +
          '<h3>' + esc(s.name) + '</h3>' +
          '<p class="blurb">' + esc(s.blurb) + '</p>' +
          bestHtml +
          '<div class="meta">' +
            '<span><b>' + draw + '</b> questions</span>' +
            '<span><b>' + s.pass + '</b> to pass (80%)</span>' +
            '<span><b>' + pool + '</b> in the bank</span>' +
          '</div>' +
          '<div class="actions">' +
            '<a class="btn" href="test.html?t=' + encodeURIComponent(s.id) + '&amp;mode=study">Study mode</a>' +
            '<a class="btn secondary" href="test.html?t=' + encodeURIComponent(s.id) + '&amp;mode=exam">Exam mode</a>' +
          '</div>' +
        '</article>';
    }).join('');
  }

  var links = document.getElementById('footer-links');
  if (links) {
    links.innerHTML = sections.map(function (s) {
      return '<a href="test.html?t=' + encodeURIComponent(s.id) + '&amp;mode=study">' + esc(s.name) + '</a>';
    }).join('<br>');
  }
})();
