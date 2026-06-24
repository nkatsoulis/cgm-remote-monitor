#!/usr/bin/env node
'use strict';

/**
 * Standalone Container xChange inventory monitor
 *
 * Usage:
 *   node monitors/container-xchange.js
 *
 * Env vars:
 *   CX_USER_ID       Container xChange user ID (default: 308163)
 *   CX_INTERVAL_MIN  Poll interval in minutes (default: 5)
 *   CX_WEBHOOK_URL   Optional webhook URL for change notifications (Slack/Discord/etc.)
 *   CX_API_TOKEN     Optional Bearer token if the API requires auth
 */

var request = require('request');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var USER_ID = process.env.CX_USER_ID || '308163';
var INTERVAL_MIN = parseFloat(process.env.CX_INTERVAL_MIN || '5');
var WEBHOOK_URL = process.env.CX_WEBHOOK_URL || null;
var API_TOKEN = process.env.CX_API_TOKEN || null;
var STATE_FILE = path.join(__dirname, '../.container-xchange-state.json');
var BASE_URL = 'https://my-inventory.container-xchange.com/';

var state = loadState();

console.log('=== Container xChange Monitor ===');
console.log('User ID :', USER_ID);
console.log('Interval:', INTERVAL_MIN, 'minutes');
console.log('State   :', STATE_FILE);
if (WEBHOOK_URL) console.log('Webhook : configured');
console.log('Starting...\n');

function buildRequestOptions() {
  var headers = {
    'Accept': 'application/json, text/html, */*',
    'User-Agent': 'Mozilla/5.0 (compatible; ContainerXchangeMonitor/1.0)'
  };
  if (API_TOKEN) headers['Authorization'] = 'Bearer ' + API_TOKEN;

  return {
    url: BASE_URL,
    qs: { user: USER_ID },
    headers: headers,
    timeout: 30000,
    followAllRedirects: true
  };
}

function poll() {
  var timestamp = new Date().toISOString();
  process.stdout.write('[' + timestamp + '] Polling... ');

  request(buildRequestOptions(), function(err, res, body) {
    if (err) {
      console.error('ERROR -', err.message);
      return;
    }

    if (res.statusCode !== 200) {
      console.error('HTTP', res.statusCode);
      return;
    }

    var contentType = (res.headers['content-type'] || '').toLowerCase();

    if (contentType.indexOf('application/json') !== -1) {
      handleJsonResponse(body, timestamp);
    } else {
      handleHtmlResponse(body, timestamp);
    }
  });
}

function handleHtmlResponse(body, timestamp) {
  var currentHash = hashContent(body);
  var prevHash = state.lastHash;

  console.log('HTML page, hash:', currentHash.slice(0, 12) + '...');

  if (!prevHash) {
    console.log('Initial snapshot saved.');
    state.lastHash = currentHash;
    state.lastChecked = timestamp;
    state.firstSeen = timestamp;
    saveState(state);
    return;
  }

  if (prevHash !== currentHash) {
    var msg = 'CHANGE DETECTED for user ' + USER_ID + ' at ' + timestamp;
    console.log('\n*** ' + msg + ' ***\n');

    var prevChecked = state.lastChecked || 'unknown';
    var payload = {
      event: 'container_inventory_changed',
      userId: USER_ID,
      detectedAt: timestamp,
      previousCheck: prevChecked,
      url: BASE_URL + '?user=' + USER_ID
    };

    logChange(payload);
    if (WEBHOOK_URL) sendWebhook(payload);

    state.lastHash = currentHash;
    state.lastChanged = timestamp;
  } else {
    console.log('No change.');
  }

  state.lastChecked = timestamp;
  saveState(state);
}

function handleJsonResponse(body, timestamp) {
  var data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return;
  }

  var containers = normalizeContainers(data);
  console.log(containers.length, 'containers in response.');

  var prevContainers = state.containers || [];
  var changes = diffContainers(prevContainers, containers);

  var hasChanges = changes.added.length || changes.removed.length || changes.modified.length;

  if (!state.containers) {
    console.log('Initial snapshot saved (' + containers.length + ' containers).');
  } else if (hasChanges) {
    reportChanges(changes, timestamp);
  } else {
    console.log('No change.');
  }

  state.containers = containers;
  state.lastChecked = timestamp;
  saveState(state);
}

function reportChanges(changes, timestamp) {
  console.log('\n=== CHANGES DETECTED at ' + timestamp + ' ===');

  if (changes.added.length) {
    console.log('\nNEW (' + changes.added.length + '):');
    changes.added.forEach(function(c) {
      var id = c.id || c.containerId || c.container_id || '?';
      var type = c.type || c.containerType || c.container_type || '';
      var size = c.size || c.containerSize || '';
      var loc = c.location || c.depot || c.city || '';
      var price = c.price || c.leaseRate || c.rate || '';
      console.log('  +', id, type, size, loc, price ? ('- $' + price) : '');
    });
  }

  if (changes.removed.length) {
    console.log('\nREMOVED (' + changes.removed.length + '):');
    changes.removed.forEach(function(c) {
      var id = c.id || c.containerId || c.container_id || '?';
      var type = c.type || c.containerType || '';
      console.log('  -', id, type);
    });
  }

  if (changes.modified.length) {
    console.log('\nUPDATED (' + changes.modified.length + '):');
    changes.modified.forEach(function(item) {
      console.log('  ~', item.id, JSON.stringify(item.diff));
    });
  }

  console.log('');

  var payload = {
    event: 'container_inventory_changed',
    userId: USER_ID,
    detectedAt: timestamp,
    url: BASE_URL + '?user=' + USER_ID,
    summary: {
      added: changes.added.length,
      removed: changes.removed.length,
      modified: changes.modified.length
    },
    added: changes.added,
    removed: changes.removed,
    modified: changes.modified
  };

  logChange(payload);
  if (WEBHOOK_URL) sendWebhook(payload);
}

function sendWebhook(payload) {
  var body = JSON.stringify({
    text: formatSlackMessage(payload),
    attachments: [{
      color: 'warning',
      fields: [
        { title: 'User ID', value: payload.userId, short: true },
        { title: 'Detected At', value: payload.detectedAt, short: true },
        { title: 'URL', value: payload.url, short: false }
      ]
    }]
  });

  request({
    url: WEBHOOK_URL,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body,
    timeout: 10000
  }, function(err, res) {
    if (err) {
      console.warn('[webhook] Failed:', err.message);
    } else {
      console.log('[webhook] Sent, status', res.statusCode);
    }
  });
}

function formatSlackMessage(payload) {
  if (payload.summary) {
    var parts = [];
    if (payload.summary.added) parts.push(payload.summary.added + ' new container(s)');
    if (payload.summary.removed) parts.push(payload.summary.removed + ' removed');
    if (payload.summary.modified) parts.push(payload.summary.modified + ' updated');
    return ':shipping_container: Container xChange inventory changed: ' + parts.join(', ') + '\n' + payload.url;
  }
  return ':shipping_container: Container xChange inventory page changed\n' + payload.url;
}

function logChange(payload) {
  var logFile = path.join(__dirname, '../.container-xchange-changes.log');
  var line = JSON.stringify(payload) + '\n';
  fs.appendFileSync(logFile, line);
}

// --- Utilities ---

function normalizeContainers(data) {
  if (Array.isArray(data)) return data;
  if (data.containers && Array.isArray(data.containers)) return data.containers;
  if (data.inventory && Array.isArray(data.inventory)) return data.inventory;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.results && Array.isArray(data.results)) return data.results;
  if (data.items && Array.isArray(data.items)) return data.items;
  return [];
}

function diffContainers(prev, next) {
  var KEY_CANDIDATES = ['id', 'containerId', 'container_id', 'uuid'];

  function findKey(arr) {
    if (!arr.length) return null;
    return KEY_CANDIDATES.find(function(k) { return arr[0][k] !== undefined; });
  }

  var key = findKey(next) || findKey(prev);

  if (!key) {
    // No identifiable key — fall back to hash comparison
    var prevHash = hashContent(JSON.stringify(prev));
    var nextHash = hashContent(JSON.stringify(next));
    if (prevHash !== nextHash) {
      return { added: [], removed: [], modified: [{ id: 'unknown', diff: { data: { from: '(previous)', to: '(current)' } } }] };
    }
    return { added: [], removed: [], modified: [] };
  }

  var prevById = indexBy(prev, key);
  var nextById = indexBy(next, key);

  var added = [], removed = [], modified = [];

  Object.keys(nextById).forEach(function(id) {
    if (!prevById[id]) {
      added.push(nextById[id]);
    } else {
      var diff = objectDiff(prevById[id], nextById[id]);
      if (Object.keys(diff).length) modified.push({ id: id, diff: diff });
    }
  });

  Object.keys(prevById).forEach(function(id) {
    if (!nextById[id]) removed.push(prevById[id]);
  });

  return { added: added, removed: removed, modified: modified };
}

function indexBy(arr, key) {
  return arr.reduce(function(acc, item) {
    if (item[key] !== undefined) acc[String(item[key])] = item;
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
  var normalized = str
    .replace(/"token":"[^"]+"/g, '')
    .replace(/"timestamp":\d+/g, '')
    .replace(/data-timestamp="[^"]+"/g, '')
    .replace(/\b\d{13}\b/g, '');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load state:', e.message);
  }
  return {};
}

function saveState(s) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    console.warn('Could not save state:', e.message);
  }
}

// --- Run ---

poll();
setInterval(poll, INTERVAL_MIN * 60 * 1000);

process.on('SIGINT', function() {
  console.log('\nShutting down monitor.');
  process.exit(0);
});
