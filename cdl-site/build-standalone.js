#!/usr/bin/env node
/* Builds dist/index.html: the whole site as one self-contained HTML file.
 * Same CSS, same question banks, same quiz engine as the multi-page site —
 * only the URL scheme differs (hash routes instead of test.html?t=...).
 * Run: node build-standalone.js */
'use strict';
const fs = require('fs');
const path = require('path');

const here = __dirname;
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');

const banks = [
  'general-knowledge', 'air-brakes', 'combination', 'doubles-triples',
  'tanker', 'hazmat', 'passenger', 'school-bus', 'pre-trip'
];

const css = read('assets/css/styles.css');
const data = ['data/sections.js'].concat(banks.map(b => `data/questions-${b}.js`))
  .map(read).join('\n');
const homeJs = read('assets/js/home.js');
const quizJs = read('assets/js/quiz.js');
const favicon = read('assets/img/favicon.svg');
const faviconUri = 'data:image/svg+xml;base64,' + Buffer.from(favicon).toString('base64');

// Pull the two <body> fragments out of the real pages so the markup stays in one place.
const grab = (file, startMarker, endMarker) => {
  const s = read(file);
  const a = s.indexOf(startMarker);
  const b = s.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error(`could not extract ${startMarker} from ${file}`);
  return s.slice(a, b);
};
const homeMain = grab('index.html', '<main>', '</main>') + '</main>';
const quizMain = grab('test.html', '<div class="quiz-top">', '</main>') + '</main>';
const footer = grab('index.html', '<footer class="site-footer">', '</footer>') + '</footer>';

const routing = `
window.CDL_ROUTER = true;
window.CDL_ROUTING = {
  homeUrl: '#/',
  testUrl: function (id, mode) { return '#/t/' + id + '/' + mode; },
  param: function (name) {
    var m = /^#\\/t\\/([^/]+)\\/([^/]+)/.exec(window.location.hash || '');
    if (!m) return '';
    if (name === 't') return decodeURIComponent(m[1]);
    if (name === 'mode') return decodeURIComponent(m[2]);
    return '';
  },
  setMode: function (id, mode) {
    suppress = true;
    window.location.hash = '#/t/' + id + '/' + mode;
  }
};
var suppress = false;
`;

const router = `
function route() {
  if (suppress) { suppress = false; return; }
  var onTest = /^#\\/t\\//.test(window.location.hash || '');
  document.getElementById('view-home').hidden = onTest;
  document.getElementById('view-test').hidden = !onTest;
  if (onTest) { window.CDLQuiz.init(); } else { window.CDLHome.render(); }
  // Only jump to the top for app routes; in-page anchors (#which, #howto) keep browser behavior.
  if (/^#\\/(?:$|t\\/)/.test(window.location.hash || '#/')) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Texas CDL Practice Tests</title>
<meta name="description" content="Free practice tests for every Texas CDL knowledge exam, scored against the state's 80% passing requirement.">
<link rel="icon" href="${faviconUri}" type="image/svg+xml">
<meta name="theme-color" content="#16202c">
<style>
${css}
</style>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="#/">
      <span class="mark">WF</span>
      <span class="name">Wichita Falls Equipment<span>Texas CDL Test Prep</span></span>
    </a>
    <nav class="site-nav">
      <a href="#/">Practice tests</a>
      <a href="#which">Which tests do I need?</a>
      <a href="#howto">How the exam works</a>
    </nav>
  </div>
</header>

<div id="view-home">
<section class="hero">
  <div class="wrap">
    <span class="eyebrow">Texas Department of Public Safety &middot; Knowledge exams</span>
    <h1>Pass every Texas CDL knowledge test.</h1>
    <p class="lede">Free practice exams for all nine sections a Texas commercial driver may need &mdash; written from the
      Texas Commercial Motor Vehicle Drivers Handbook, scored the way the state scores you, with an explanation on
      every question. No account, no download, nothing to pay.</p>
    <div class="stat-row">
      <div class="stat"><b id="stat-questions">295</b><span>Practice questions</span></div>
      <div class="stat"><b>9</b><span>Test sections</span></div>
      <div class="stat"><b>80%</b><span>Required to pass</span></div>
    </div>
  </div>
</section>
${homeMain}
</div>

<div id="view-test" hidden>
${quizMain}
</div>

${footer}

<script>
${routing}
${data}
${homeJs}
${quizJs}
${router}
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist/index.html'), html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`dist/index.html written — ${kb} KB`);
