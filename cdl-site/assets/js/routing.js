/* URL scheme seam.
 * The deployed multi-page site uses real URLs (test.html?t=...&mode=...).
 * The single-file build (dist/index.html) sets window.CDL_ROUTING to a hash-based
 * implementation before this file loads, so home.js and quiz.js work unchanged in both. */
window.CDL_ROUTING = window.CDL_ROUTING || {
  homeUrl: './',
  testUrl: function (id, mode) {
    return 'test.html?t=' + encodeURIComponent(id) + '&mode=' + encodeURIComponent(mode);
  },
  param: function (name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  },
  setMode: function (id, mode) {
    history.replaceState(null, '', 'test.html?t=' + encodeURIComponent(id) + '&mode=' + mode);
  }
};
