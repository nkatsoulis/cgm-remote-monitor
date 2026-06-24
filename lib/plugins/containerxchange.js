'use strict';

var request = require('request');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var STATE_FILE = path.join(__dirname, '../../.container-xchange-state.json');
var MONITOR_URL = 'https://my-inventory.container-xchange.com/';
var USER_ID = '308163';

function init(env, ctx) {
  var settings = (env.extendedSettings && env.extendedSettings.containerxchange) || {};
  var userId = settings.userId || USER_ID;
  var intervalMs = (settings.interval || 5) * 60 * 1000;

  var monitor = create(userId, intervalMs, ctx);
  monitor.start();
  return monitor;
}

function create(userId, intervalMs, ctx) {
  var state = loadState();
  var timer = null;

  function start() {
    console.log('[containerxchange] Monitor started for user', userId, '- polling every', intervalMs / 60000, 'min');
    poll();
    timer = setInterval(poll, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function poll() {
    fetchInventory(userId, function(err, data) {
      if (err) {
        console.error('[containerxchange] Fetch error:', err.message);
        return;
      }
      processInventory(data);
    });
  }

  function fetchInventory(uid, cb) {
    var options = {
      url: MONITOR_URL,
      qs: { user: uid },
      headers: {
        'Accept': 'application/json, text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; Nightscout-ContainerMonitor/1.0)'
      },
      timeout: 30000
    };

    request(options, function(err, res, body) {
      if (err) return cb(err);
      if (res.statusCode !== 200) {
        return cb(new Error('HTTP ' + res.statusCode));
      }

      var contentType = (res.headers['content-type'] || '').toLowerCase();
      var parsed = null;

      if (contentType.indexOf('application/json') !== -1) {
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          return cb(new Error('JSON parse error: ' + e.message));
        }
      } else {
        // HTML page - extract meaningful content hash for change detection
        parsed = { _raw: body, _hash: hashContent(body), _fetchedAt: new Date().toISOString() };
      }

      cb(null, parsed);
    });
  }

  function processInventory(data) {
    var now = new Date().toISOString();

    if (data._hash !== undefined) {
      // HTML mode: detect page-level changes
      var prevHash = state.lastHash;
      if (prevHash && prevHash !== data._hash) {
        var msg = '[containerxchange] Page content changed at ' + now + ' (user=' + USER_ID + ')';
        console.log(msg);
        if (ctx && ctx.notifications) {
          ctx.notifications.requestNotify({
            level: 1,
            title: 'Container xChange Update',
            message: 'Inventory page changed for user ' + USER_ID,
            pushoverSound: 'incoming',
            plugin: { name: 'containerxchange' },
            debug: { hash: data._hash }
          });
        }
      } else if (!prevHash) {
        console.log('[containerxchange] Initial snapshot captured at', now);
      }

      state.lastHash = data._hash;
      state.lastChecked = now;
      saveState(state);
      return;
    }

    // JSON API mode: diff containers and bids
    var containers = normalizeContainers(data);
    var changes = diffContainers(state.containers || [], containers);

    if (changes.added.length || changes.removed.length || changes.modified.length) {
      reportChanges(changes, now);
    } else {
      console.log('[containerxchange] No changes detected at', now);
    }

    state.containers = containers;
    state.lastChecked = now;
    saveState(state);
  }

  function reportChanges(changes, timestamp) {
    if (changes.added.length) {
      console.log('[containerxchange] NEW containers (' + changes.added.length + '):');
      changes.added.forEach(function(c) {
        console.log('  +', c.id || c.containerId, '-', c.type || c.containerType, c.size || '', c.location || '', c.price ? ('$' + c.price) : '');
      });
    }

    if (changes.removed.length) {
      console.log('[containerxchange] REMOVED containers (' + changes.removed.length + '):');
      changes.removed.forEach(function(c) {
        console.log('  -', c.id || c.containerId, '-', c.type || c.containerType, c.size || '', c.location || '');
      });
    }

    if (changes.modified.length) {
      console.log('[containerxchange] MODIFIED containers (' + changes.modified.length + '):');
      changes.modified.forEach(function(item) {
        console.log('  ~', item.id, ':', JSON.stringify(item.diff));
      });
    }

    if (ctx && ctx.notifications) {
      var summary = [];
      if (changes.added.length) summary.push(changes.added.length + ' new');
      if (changes.removed.length) summary.push(changes.removed.length + ' removed');
      if (changes.modified.length) summary.push(changes.modified.length + ' updated');

      ctx.notifications.requestNotify({
        level: 1,
        title: 'Container xChange Update',
        message: 'Inventory changed: ' + summary.join(', ') + ' at ' + timestamp,
        pushoverSound: 'incoming',
        plugin: { name: 'containerxchange' }
      });
    }
  }

  return { start: start, stop: stop, poll: poll };
}

function normalizeContainers(data) {
  // Handle various possible API response shapes
  if (Array.isArray(data)) return data;
  if (data.containers && Array.isArray(data.containers)) return data.containers;
  if (data.inventory && Array.isArray(data.inventory)) return data.inventory;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  return [];
}

function diffContainers(prev, next) {
  var prevById = indexBy(prev, 'id') || indexBy(prev, 'containerId') || {};
  var nextById = indexBy(next, 'id') || indexBy(next, 'containerId') || {};

  var added = [];
  var removed = [];
  var modified = [];

  Object.keys(nextById).forEach(function(id) {
    if (!prevById[id]) {
      added.push(nextById[id]);
    } else {
      var diff = objectDiff(prevById[id], nextById[id]);
      if (Object.keys(diff).length) {
        modified.push({ id: id, diff: diff });
      }
    }
  });

  Object.keys(prevById).forEach(function(id) {
    if (!nextById[id]) removed.push(prevById[id]);
  });

  return { added: added, removed: removed, modified: modified };
}

function indexBy(arr, key) {
  if (!arr || !arr.length || !arr[0][key]) return null;
  return arr.reduce(function(acc, item) {
    acc[item[key]] = item;
    return acc;
  }, {});
}

function objectDiff(a, b) {
  var diff = {};
  var keys = Object.keys(Object.assign({}, a, b));
  keys.forEach(function(k) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      diff[k] = { from: a[k], to: b[k] };
    }
  });
  return diff;
}

function hashContent(str) {
  // Strip dynamic timestamps/tokens before hashing so we only detect real content changes
  var normalized = str
    .replace(/"token":"[^"]+"/g, '')
    .replace(/"timestamp":\d+/g, '')
    .replace(/data-timestamp="[^"]+"/g, '')
    .replace(/\d{13}/g, '');  // epoch ms
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[containerxchange] Could not load state file:', e.message);
  }
  return {};
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    console.warn('[containerxchange] Could not save state file:', e.message);
  }
}

module.exports = {
  init: init,
  create: create
};
