/* localStorage-backed card collection (no server, no login). */
(function (global) {
  'use strict';

  var KEY = 'shadowhunters.cards.v1';

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      alert('Storage is full — browsers allow only a few MB.\nExport your collection to a .json file and delete some cards.');
      return false;
    }
  }

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

  var Store = {
    all: read,
    get: function (id) {
      return read().filter(function (c) { return c.id === id; })[0] || null;
    },
    save: function (card) {
      var list = read();
      var clean = sanitize(card);
      var idx = list.findIndex(function (c) { return c.id === clean.id; });
      if (idx >= 0) list[idx] = clean; else list.push(clean);
      return write(list) ? clean : null;
    },
    remove: function (id) {
      write(read().filter(function (c) { return c.id !== id; }));
    },
    clear: function () { write([]); },
    replaceAll: function (list) {
      write(list.map(sanitize));
    },
    uid: uid
  };

  global.SHStore = Store;
})(window);
