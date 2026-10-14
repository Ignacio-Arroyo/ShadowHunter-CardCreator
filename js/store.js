/* Card collection stored in the browser (no server, no login).
 
   Cards live in IndexedDB, which offers far more room than localStorage (hundreds of MB).
   The public API stays synchronous: the whole collection is kept in memory, loaded once at
   start-up (wait for Store.ready), and every change is written to IndexedDB in the background.
   If IndexedDB is not available, the old localStorage storage is used instead.
 
   Cards saved by the previous version (localStorage) are copied to IndexedDB automatically
   the first time; the old data is left untouched. */
(function (global) {
  'use strict';
 
  var LEGACY_KEY = 'shadowhunters.cards.v1';
  var MIGRATED_KEY = 'shadowhunters.cards.v1.migrated';
  var DB_NAME = 'shadowhunters';
  var DB_VERSION = 1;
  var STORE_NAME = 'cards';
 
  var db = null;    // IndexedDB handle (null = localStorage fallback)
  var cache = [];   // in-memory copy of the collection
 
  /* ---------------- localStorage (legacy / fallback) ---------------- */
  function readLocal() {
    try {
      var raw = localStorage.getItem(LEGACY_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
 
  function writeLocal(list) {
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      alert('Storage is full — browsers allow only a few MB.\nExport your collection to a .json file and delete some cards.');
      return false;
    }
  }
 
  /* ---------------- IndexedDB ---------------- */
  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('IndexedDB is not available.')); return; }
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Could not open the database.')); };
    });
  }
 
  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('Transaction aborted.')); };
    });
  }
 
  function loadAll(d) {
    return new Promise(function (resolve, reject) {
      var req = d.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  }
 
  function putCards(cards) {
    var tx = db.transaction(STORE_NAME, 'readwrite');
    var os = tx.objectStore(STORE_NAME);
    cards.forEach(function (c) { os.put(c); });
    return txDone(tx);
  }
 
  function deleteCard(id) {
    var tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    return txDone(tx);
  }
 
  function replaceInDb(cards) {
    var tx = db.transaction(STORE_NAME, 'readwrite');
    var os = tx.objectStore(STORE_NAME);
    os.clear();
    cards.forEach(function (c) { os.put(c); });
    return txDone(tx);
  }
 
  // background writes: tell the user if one fails (quota, disk full...)
  function report(promise) {
    promise.catch(function (err) {
      alert('Could not save to the browser storage' + (err && err.message ? ' (' + err.message + ')' : '') +
        '.\nExport your collection to a .json file and free some space.');
    });
  }
 
  /* ---------------- cards ---------------- */
  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
 
  function sanitize(card) {
    return {
      id: card.id || uid(),
      type: card.type,
      title: String(card.title || ''),
      text: String(card.text || ''),
      victoryText: String(card.victoryText || ''),
      abilityName: String(card.abilityName || ''),
      abilityText: String(card.abilityText || ''),
      spellKind: card.spellKind === 'equipment' ? 'equipment' : 'immediate',
      visionTypes: (Array.isArray(card.visionTypes) ? card.visionTypes : [])
        .filter(function (t) { return t === 'hunter' || t === 'shadow' || t === 'neutral'; })
        .slice(0, 2),
      hp: card.hp === '' || card.hp === null || card.hp === undefined ? '' : Number(card.hp),
      image: card.image || null,
      transform: {
        x: Number((card.transform && card.transform.x) || 0),
        y: Number((card.transform && card.transform.y) || 0),
        scale: Number((card.transform && card.transform.scale) || 1),
        rotation: Number((card.transform && card.transform.rotation) || 0)
      },
      updatedAt: Date.now()
    };
  }
 
  function byId(a, b) {
    return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
  }
 
  /* ---------------- one-time copy from the old localStorage storage ---------------- */
  function migrateLegacy() {
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return Promise.resolve();
      var legacy = readLocal();
      var known = {};
      cache.forEach(function (c) { known[c.id] = true; });
      var added = legacy
        .filter(function (c) { return c && c.id && !known[c.id]; })
        .map(sanitize);
      if (!added.length) {
        localStorage.setItem(MIGRATED_KEY, '1');
        return Promise.resolve();
      }
      return putCards(added).then(function () {
        cache = cache.concat(added);
        localStorage.setItem(MIGRATED_KEY, '1');
      }).catch(function () { /* will be tried again next time */ });
    } catch (e) {
      return Promise.resolve();
    }
  }
 
  /* ---------------- start-up ---------------- */
  var ready = openDb()
    .then(function (d) { db = d; return loadAll(d); })
    .then(function (list) { cache = list; return migrateLegacy(); })
    .catch(function () { db = null; cache = readLocal(); })
    .then(function () {
      cache.sort(byId);
      // ask the browser not to clear the data when space runs low
      try { if (global.navigator.storage && global.navigator.storage.persist) global.navigator.storage.persist(); } catch (e) {}
    });
 
  /* ---------------- public API ---------------- */
  var Store = {
    ready: ready,
 
    all: function () { return cache.slice(); },
 
    get: function (id) {
      return cache.filter(function (c) { return c.id === id; })[0] || null;
    },
 
    save: function (card) {
      var clean = sanitize(card);
      var next = cache.slice();
      var idx = next.findIndex(function (c) { return c.id === clean.id; });
      if (idx >= 0) next[idx] = clean; else next.push(clean);
      if (!db) {
        if (!writeLocal(next)) return null;
        cache = next;
        return clean;
      }
      cache = next;
      report(putCards([clean]));
      return clean;
    },
 
    remove: function (id) {
      cache = cache.filter(function (c) { return c.id !== id; });
      if (!db) { writeLocal(cache); return; }
      report(deleteCard(id));
    },
 
    clear: function () {
      cache = [];
      if (!db) { writeLocal([]); return; }
      report(replaceInDb([]));
    },
 
    replaceAll: function (list) {
      var next = list.map(sanitize);
      if (!db) {
        if (writeLocal(next)) cache = next;
        return;
      }
      cache = next;
      report(replaceInDb(next));
    },
 
    uid: uid
  };
 
  global.SHStore = Store;
})(window);
 
