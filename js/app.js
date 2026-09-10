/* UI wiring: template picker, live preview, art transform, collection, PDF. */
(function () {
  'use strict';

  var T = window.SHTemplates;
  var R = window.SHRenderer;
  var Store = window.SHStore;

  var $ = function (id) { return document.getElementById(id); };

  var preview = $('preview');
  var pctx = preview.getContext('2d');

  var current = newCard('shadow');
  var currentImg = null;
  var editingId = null;

  function newCard(type) {
    var tpl = T.get(type);
    return {
      id: null,
      type: type,
      title: '',
      hp: '',
      victoryText: tpl.defaultVictory || '',
      abilityName: '',
      abilityText: '',
      spellKind: 'immediate',
      visionTypes: ['hunter'],
      text: '',
      image: null,
      transform: { x: 0, y: 0, scale: 1, rotation: 0 }
    };
  }

  /* ---------------- template picker ---------------- */
  function buildTemplatePicker() {
    var wrap = $('templatePicker');
    wrap.innerHTML = '';
    T.ORDER.forEach(function (id) {
      var tpl = T.TEMPLATES[id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tpl' + (id === current.type ? ' active' : '');
      btn.dataset.type = id;
      btn.innerHTML = '<span class="swatch" style="background:' + tpl.swatch + '"></span>' +
        '<strong>' + tpl.name + '</strong>' +
        '<small>' + (tpl.hasHp ? 'character · HP' : tpl.kind) + '</small>';
      btn.addEventListener('click', function () {
        current.type = id;
        applyTemplateDefaults();
        buildTemplatePicker();
        syncFields();
        draw();
      });
      wrap.appendChild(btn);
    });
  }

  // keeps the fixed Shadow/Hunter victory wording in sync when the template changes
  function applyTemplateDefaults() {
    var tpl = T.get(current.type);
    if (tpl.kind === 'character' && (tpl.lockVictory || !String(current.victoryText || '').trim())) {
      current.victoryText = tpl.defaultVictory || '';
    }
  }

  function syncFields() {
    var tpl = T.get(current.type);
    var isCharacter = tpl.kind === 'character';

    $('fieldHp').classList.toggle('hidden', !tpl.hasHp);
    $('fieldVictory').classList.toggle('hidden', !tpl.hasVictory);
    $('fieldAbilityName').classList.toggle('hidden', !tpl.hasAbility);
    $('fieldAbilityText').classList.toggle('hidden', !tpl.hasAbility);
    $('fieldSpellKind').classList.toggle('hidden', !tpl.hasSpellKind);
    $('fieldVisionTypes').classList.toggle('hidden', !tpl.hasVisionTypes);
    $('fieldText').classList.toggle('hidden', isCharacter);

    var locked = isCharacter && tpl.lockVictory;
    $('fVictory').readOnly = locked;
    $('fVictory').value = current.victoryText || '';
    $('victoryLocked').classList.toggle('hidden', !locked);
  }

  /* ---------------- drawing ---------------- */
  var drawPending = false;
  function draw() {
    if (drawPending) return;
    drawPending = true;
    requestAnimationFrame(function () {
      drawPending = false;
      R.renderCard(pctx, current, currentImg);
    });
  }

  /* ---------------- form bindings ---------------- */
  function bindInput(el, key, transform) {
    el.addEventListener('input', function () {
      current[key] = transform ? transform(el.value) : el.value;
      draw();
    });
  }

  bindInput($('fTitle'), 'title');
  bindInput($('fText'), 'text');
  bindInput($('fVictory'), 'victoryText');
  bindInput($('fAbilityName'), 'abilityName');
  bindInput($('fAbilityText'), 'abilityText');
  bindInput($('fSpellKind'), 'spellKind');
  bindInput($('fHp'), 'hp', function (v) { return v === '' ? '' : Math.max(0, Math.min(99, Number(v))); });

  function readVisionTypes() {
    return [$('fVisionType1').value, $('fVisionType2').value].filter(Boolean);
  }

  [$('fVisionType1'), $('fVisionType2')].forEach(function (el) {
    el.addEventListener('change', function () {
      current.visionTypes = readVisionTypes();
      draw();
    });
  });

  $('fScale').addEventListener('input', function () {
    current.transform.scale = Number(this.value) / 100;
    $('outScale').textContent = this.value + '%';
    draw();
  });
  $('fRot').addEventListener('input', function () {
    current.transform.rotation = Number(this.value);
    $('outRot').textContent = this.value + '\u00B0';
    draw();
  });

  function setSliders() {
    $('fScale').value = Math.round(current.transform.scale * 100);
    $('outScale').textContent = Math.round(current.transform.scale * 100) + '%';
    $('fRot').value = current.transform.rotation;
    $('outRot').textContent = current.transform.rotation + '\u00B0';
  }

  /* ---------------- image upload (downscaled to keep localStorage happy) ---------------- */
  var MAX_DIM = 1400;

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('Could not read the file.')); };
      fr.readAsDataURL(file);
    });
  }

  function downscale(dataUrl) {
    return R.loadImage(dataUrl).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight;
      var ratio = Math.min(1, MAX_DIM / Math.max(w, h));
      if (ratio === 1 && dataUrl.length < 900000) return dataUrl;
      var cv = document.createElement('canvas');
      cv.width = Math.round(w * ratio);
      cv.height = Math.round(h * ratio);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.88);
    });
  }

  $('fImage').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Please choose an image file.'); return; }
    fileToDataUrl(file)
      .then(downscale)
      .then(function (data) {
        current.image = data;
        current.transform = { x: 0, y: 0, scale: 1, rotation: 0 };
        setSliders();
        return R.loadImage(data);
      })
      .then(function (img) { currentImg = img; draw(); })
      .catch(function (err) { alert(err.message); });
    this.value = '';
  });

  $('btnClearImage').addEventListener('click', function () {
    current.image = null;
    currentImg = null;
    current.transform = { x: 0, y: 0, scale: 1, rotation: 0 };
    setSliders();
    draw();
  });

  $('btnFitCover').addEventListener('click', function () {
    current.transform = { x: 0, y: 0, scale: 1, rotation: current.transform.rotation };
    setSliders(); draw();
  });

  $('btnFitContain').addEventListener('click', function () {
    if (!currentImg) return;
    var tpl = T.get(current.type);
    var box = R.artBox(tpl);
    var cover = R.baseCoverScale(currentImg, tpl);
    var contain = Math.min(box.w / currentImg.naturalWidth, box.h / currentImg.naturalHeight);
    current.transform.x = 0;
    current.transform.y = 0;
    current.transform.scale = contain / cover;
    setSliders(); draw();
  });

  $('btnResetArt').addEventListener('click', function () {
    current.transform = { x: 0, y: 0, scale: 1, rotation: 0 };
    setSliders(); draw();
  });

  /* ---------------- drag & wheel on the preview ---------------- */
  var dragging = false, lastX = 0, lastY = 0;

  // pointer position expressed in the current frame's native pixel space
  function toCardSpace(evt) {
    var rect = preview.getBoundingClientRect();
    var tpl = T.get(current.type);
    return {
      x: ((evt.clientX - rect.left) / rect.width) * tpl.frameW,
      y: ((evt.clientY - rect.top) / rect.height) * tpl.frameH
    };
  }

  preview.addEventListener('pointerdown', function (e) {
    if (!current.image) return;
    dragging = true;
    preview.classList.add('grabbing');
    preview.setPointerCapture(e.pointerId);
    var p = toCardSpace(e);
    lastX = p.x; lastY = p.y;
  });

  preview.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = toCardSpace(e);
    current.transform.x += p.x - lastX;
    current.transform.y += p.y - lastY;
    lastX = p.x; lastY = p.y;
    draw();
  });

  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    preview.addEventListener(ev, function () {
      dragging = false;
      preview.classList.remove('grabbing');
    });
  });

  preview.addEventListener('wheel', function (e) {
    if (!current.image) return;
    e.preventDefault();
    var factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    current.transform.scale = Math.min(4, Math.max(0.1, current.transform.scale * factor));
    setSliders();
    draw();
  }, { passive: false });

  /* ---------------- save / load / new ---------------- */
  function loadIntoForm(card) {
    current = JSON.parse(JSON.stringify(card));
    editingId = card.id || null;
    $('fTitle').value = current.title;
    $('fText').value = current.text || '';
    $('fAbilityName').value = current.abilityName || '';
    $('fAbilityText').value = current.abilityText || '';
    $('fSpellKind').value = current.spellKind || 'immediate';
    var vt = current.visionTypes || [];
    $('fVisionType1').value = vt[0] || 'hunter';
    $('fVisionType2').value = vt[1] || '';
    $('fHp').value = current.hp;
    setSliders();
    buildTemplatePicker();
    syncFields();
    updateEditingNote();
    if (current.image) {
      R.loadImage(current.image).then(function (img) { currentImg = img; draw(); });
    } else {
      currentImg = null;
      draw();
    }
  }

  function updateEditingNote() {
    var note = $('editingNote');
    if (editingId) {
      note.textContent = 'Editing a saved card — “Update card” overwrites it, “New / clear” starts a fresh one.';
      note.classList.remove('hidden');
    } else {
      note.classList.add('hidden');
    }
    $('btnSave').textContent = editingId ? 'Update card' : 'Save card';
  }

  $('btnSave').addEventListener('click', function () {
    if (!current.title.trim()) {
      if (!confirm('This card has no title. Save anyway?')) return;
    }
    var updating = !!editingId;
    current.id = editingId || Store.uid();
    var saved = Store.save(current);
    if (!saved) return;

    var type = current.type;
    editingId = null;
    loadIntoForm(newCard(type)); // next save creates another card instead of overwriting
    refreshCollection();
    flash($('btnSave'), updating ? 'Updated!' : 'Added!');
  });

  $('btnNew').addEventListener('click', function () {
    var type = current.type;
    loadIntoForm(newCard(type));
    editingId = null;
    updateEditingNote();
  });

  $('btnPng').addEventListener('click', function () {
    R.renderToCanvas(current, T.CARD_W).then(function (canvas) {
      var a = document.createElement('a');
      a.download = (current.title.trim() || 'card').replace(/[^\w\-]+/g, '_') + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
  });

  function flash(btn, msg) {
    btn.textContent = msg;
    btn.disabled = true;
    setTimeout(function () { btn.disabled = false; updateEditingNote(); }, 900);
  }

  /* ---------------- collection ---------------- */
  function refreshCollection() {
    var list = Store.all();
    $('countBadge').textContent = list.length;
    $('emptyMsg').classList.toggle('hidden', list.length > 0);

    var gallery = $('gallery');
    gallery.innerHTML = '';
    list.forEach(function (card) {
      var tile = document.createElement('div');
      tile.className = 'card-tile';
      var holder = document.createElement('div');
      tile.appendChild(holder);

      var name = document.createElement('div');
      name.className = 'name';
      name.textContent = card.title || '(untitled)';
      var type = document.createElement('div');
      type.className = 'type';
      type.textContent = T.get(card.type).name + (card.hp !== '' && card.hp !== undefined ? ' · ' + card.hp + ' PV' : '');
      tile.appendChild(name);
      tile.appendChild(type);

      var actions = document.createElement('div');
      actions.className = 'tile-actions';
      actions.appendChild(makeBtn('Edit', function () {
        loadIntoForm(card);
        switchTab('create');
      }));
      actions.appendChild(makeBtn('Copy', function () {
        var clone = JSON.parse(JSON.stringify(card));
        clone.id = Store.uid();
        clone.title = card.title + ' (copy)';
        Store.save(clone);
        refreshCollection();
      }));
      var del = makeBtn('Delete', function () {
        if (!confirm('Delete “' + (card.title || 'untitled') + '”?')) return;
        Store.remove(card.id);
        if (editingId === card.id) { editingId = null; updateEditingNote(); }
        refreshCollection();
      });
      del.className = 'danger';
      actions.appendChild(del);
      tile.appendChild(actions);

      gallery.appendChild(tile);
      R.renderToCanvas(card, 300).then(function (cv) { holder.appendChild(cv); });
    });

    buildPrintList(list);
  }

  function makeBtn(label, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ghost';
    b.textContent = label;
    b.addEventListener('click', fn);
    return b;
  }

  $('btnClearAll').addEventListener('click', function () {
    if (!confirm('Delete ALL saved cards? This cannot be undone.')) return;
    Store.clear();
    refreshCollection();
  });

  $('btnExportJson').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shadow-hunters-cards.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  $('fImport').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    file.text().then(function (txt) {
      var data = JSON.parse(txt);
      if (!Array.isArray(data)) throw new Error('Unexpected file format.');
      var merged = Store.all().concat(data.map(function (c) {
        c.id = Store.uid();
        return c;
      }));
      Store.replaceAll(merged);
      refreshCollection();
      switchTab('collection');
    }).catch(function (err) {
      alert('Import failed: ' + err.message);
    });
    this.value = '';
  });

  /* ---------------- print list ---------------- */
  var printState = {}; // id -> {selected, copies}

  function buildPrintList(list) {
    var wrap = $('printList');
    wrap.innerHTML = '';
    list.forEach(function (card) {
      if (!printState[card.id]) printState[card.id] = { selected: true, copies: 1 };
      var st = printState[card.id];

      var row = document.createElement('div');
      row.className = 'print-row';

      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = st.selected;
      chk.addEventListener('change', function () { st.selected = chk.checked; updateSummary(); });

      var thumbHolder = document.createElement('span');

      var name = document.createElement('span');
      name.className = 'rname';
      name.textContent = (card.title || '(untitled)') + ' — ' + T.get(card.type).name;

      var copies = document.createElement('input');
      copies.type = 'number';
      copies.min = 1;
      copies.max = 99;
      copies.value = st.copies;
      copies.title = 'Number of copies';
      copies.addEventListener('input', function () {
        st.copies = Math.max(1, Math.min(99, Number(copies.value) || 1));
        updateSummary();
      });

      row.appendChild(chk);
      row.appendChild(thumbHolder);
      row.appendChild(name);
      row.appendChild(copies);
      wrap.appendChild(row);

      R.renderToCanvas(card, 80).then(function (cv) { thumbHolder.appendChild(cv); });
    });
    updateSummary();
  }

  function selectedEntries() {
    return Store.all()
      .filter(function (c) { return printState[c.id] && printState[c.id].selected; })
      .map(function (c) { return { card: c, copies: printState[c.id].copies }; });
  }

  function cardMm() {
    var parts = $('pSize').value.split('x');
    return { w: Number(parts[0]), h: Number(parts[1]) };
  }

  function updateSummary() {
    var entries = selectedEntries();
    var total = entries.reduce(function (n, e) { return n + e.copies; }, 0);
    var page = window.SHPdf.PAGES[$('pPage').value];
    var size = cardMm();
    var gap = Number($('pGap').value) || 0;
    var cols = Math.max(1, Math.floor((page.w - 12 + gap) / (size.w + gap)));
    var rows = Math.max(1, Math.floor((page.h - 12 + gap) / (size.h + gap)));
    var perPage = cols * rows;
    $('printSummary').textContent = total + ' card' + (total === 1 ? '' : 's') + ' → ' +
      Math.max(1, Math.ceil(total / perPage)) + ' page(s) at ' + cols + '×' + rows + ' per sheet';
  }

  ['pPage', 'pSize', 'pGap'].forEach(function (id) {
    $(id).addEventListener('input', updateSummary);
  });

  $('btnSelAll').addEventListener('click', function () {
    Object.keys(printState).forEach(function (k) { printState[k].selected = true; });
    buildPrintList(Store.all());
  });
  $('btnSelNone').addEventListener('click', function () {
    Object.keys(printState).forEach(function (k) { printState[k].selected = false; });
    buildPrintList(Store.all());
  });

  $('btnPdf').addEventListener('click', function () {
    var entries = selectedEntries();
    if (!entries.length) { alert('Select at least one card.'); return; }
    var size = cardMm();
    var btn = this;
    btn.disabled = true;
    var status = $('pdfStatus');

    window.SHPdf.generate(entries, {
      page: $('pPage').value,
      cardW: size.w,
      cardH: size.h,
      gap: Number($('pGap').value) || 0,
      quality: $('pQuality').value,
      marks: $('pMarks').checked,
      outline: $('pOutline').checked
    }, function (done, total) {
      status.textContent = 'Rendering card ' + done + ' of ' + total + '…';
    }).then(function (res) {
      status.textContent = 'Done — ' + res.cards + ' cards on ' + res.pages + ' page(s).';
    }).catch(function (err) {
      status.textContent = '';
      alert('PDF error: ' + err.message);
    }).then(function () {
      btn.disabled = false;
    });
  });

  /* ---------------- tabs ---------------- */
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('.tabpanel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { switchTab(t.dataset.tab); });
  });

  /* ---------------- init ---------------- */
  buildTemplatePicker();
  applyTemplateDefaults();
  syncFields();
  setSliders();
  R.preloadFrames().then(function () {
    draw();
    refreshCollection();
  });
  refreshCollection();
  draw();
})();
