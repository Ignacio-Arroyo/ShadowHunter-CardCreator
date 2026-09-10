/* Renders a card onto a 750 x 1050 canvas using the artwork frames.
   All internal drawing happens in the frame's native pixel space. */
(function (global) {
  'use strict';

  var T = global.SHTemplates;
  var W = T.CARD_W, H = T.CARD_H;
  var SERIF = T.SERIF;

  var imageCache = {};
  var framePromises = {};

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      if (!src) { resolve(null); return; }
      if (imageCache[src] && imageCache[src].complete) { resolve(imageCache[src]); return; }
      var img = new Image();
      img.onload = function () { imageCache[src] = img; resolve(img); };
      img.onerror = function () { reject(new Error('Could not load ' + src)); };
      img.src = src;
    });
  }

  function frameOf(tpl) {
    return imageCache[tpl.frame] || null;
  }

  function loadFrame(tpl) {
    if (!framePromises[tpl.frame]) framePromises[tpl.frame] = loadImage(tpl.frame);
    return framePromises[tpl.frame];
  }

  function preloadFrames() {
    return Promise.all(T.ORDER.map(function (id) { return loadFrame(T.get(id)); }));
  }

  /* ---------------- art window helpers ---------------- */
  function artBox(tpl) {
    var a = tpl.art;
    if (a.shape === 'rect') return { x: a.x, y: a.y, w: a.w, h: a.h };
    if (a.shape === 'circle') return { x: a.cx - a.r, y: a.cy - a.r, w: a.r * 2, h: a.r * 2 };
    return { x: a.cx - a.rx, y: a.cy - a.ry, w: a.rx * 2, h: a.ry * 2 };
  }

  function clipArt(ctx, tpl) {
    var a = tpl.art;
    ctx.beginPath();
    if (a.shape === 'rect') {
      ctx.rect(a.x, a.y, a.w, a.h);
    } else if (a.shape === 'circle') {
      ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
    } else {
      ctx.ellipse(a.cx, a.cy, a.rx, a.ry, 0, 0, Math.PI * 2);
    }
    ctx.clip();
  }

  function baseCoverScale(img, tpl) {
    var box = artBox(tpl);
    return Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  }

  function drawArtwork(ctx, tpl, img, tr) {
    var box = artBox(tpl);
    ctx.save();
    clipArt(ctx, tpl);
    if (img) {
      var scale = baseCoverScale(img, tpl) * (tr.scale || 1);
      ctx.translate(box.x + box.w / 2 + (tr.x || 0), box.y + box.h / 2 + (tr.y || 0));
      ctx.rotate(((tr.rotation || 0) * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    } else if (!tpl.artOnTop) {
      ctx.fillStyle = '#cfc9bd';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.fillStyle = '#6d6658';
      ctx.font = '30px ' + SERIF;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ajoutez une illustration', box.x + box.w / 2, box.y + box.h / 2);
    }
    ctx.restore();
  }

  /* ---------------- baked-text patch ---------------- */
  function drawPatch(ctx, frameImg, patch) {
    if (!patch || !frameImg) return;
    var t = patch.target, s = patch.src;
    var off = document.createElement('canvas');
    off.width = t.w;
    off.height = t.h;
    var octx = off.getContext('2d');
    for (var y = 0; y < t.h; y += s.h) {
      var h = Math.min(s.h, t.h - y);
      octx.drawImage(frameImg, s.x, s.y, s.w, h, 0, y, t.w, h);
    }
    var top = patch.featherTop === undefined ? 6 : patch.featherTop;
    var bottom = patch.feather || 20;
    octx.globalCompositeOperation = 'destination-in';
    var g = octx.createLinearGradient(0, 0, 0, t.h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(Math.min(0.49, top / t.h), 'rgba(0,0,0,1)');
    g.addColorStop(Math.max(0.51, 1 - bottom / t.h), 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    octx.fillStyle = g;
    octx.fillRect(0, 0, t.w, t.h);
    ctx.drawImage(off, t.x, t.y);
  }

  /* ---------------- text helpers ---------------- */
  function wrapLines(ctx, text, maxWidth) {
    var out = [];
    String(text).split(/\n/).forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      var line = words[0];
      for (var i = 1; i < words.length; i++) {
        var test = line + ' ' + words[i];
        if (ctx.measureText(test).width > maxWidth) { out.push(line); line = words[i]; }
        else { line = test; }
      }
      out.push(line);
    });
    return out;
  }

  function setLetterSpacing(ctx, px) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
  }

  // segments: [{ text, color }] -> word tokens keeping each word's colour
  function tokenize(segments) {
    var tokens = [];
    segments.forEach(function (seg) {
      String(seg.text).split(/\s+/).filter(Boolean).forEach(function (word) {
        tokens.push({ word: word, color: seg.color });
      });
    });
    return tokens;
  }

  function wrapTokens(ctx, tokens, maxWidth) {
    var lines = [], line = [], width = 0;
    var space = ctx.measureText(' ').width;
    tokens.forEach(function (tk) {
      var w = ctx.measureText(tk.word).width;
      var add = line.length ? space + w : w;
      if (line.length && width + add > maxWidth) {
        lines.push(line);
        line = [tk];
        width = w;
      } else {
        line.push(tk);
        width += add;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  }

  function drawTokenLine(ctx, tokens, cx, y, fallbackColor) {
    var space = ctx.measureText(' ').width;
    var total = 0;
    tokens.forEach(function (tk, i) {
      total += ctx.measureText(tk.word).width + (i ? space : 0);
    });
    var x = cx - total / 2;
    ctx.textAlign = 'left';
    tokens.forEach(function (tk, i) {
      if (i) x += space;
      ctx.fillStyle = tk.color || fallbackColor;
      ctx.fillText(tk.word, x, y);
      x += ctx.measureText(tk.word).width;
    });
    ctx.textAlign = 'center';
  }

  function measureBlocks(ctx, blocks, boxW, scale) {
    var items = [], total = 0;
    blocks.forEach(function (b) {
      var size = Math.max(11, Math.round(b.size * scale));
      ctx.font = (b.weight || 'normal') + ' ' + size + 'px ' + (b.family || SERIF);
      setLetterSpacing(ctx, b.spacing ? b.spacing * scale : 0);
      var lines = b.segments ? wrapTokens(ctx, tokenize(b.segments), boxW) : wrapLines(ctx, b.text, boxW);
      setLetterSpacing(ctx, 0);
      var lh = size * (b.lh || 1.28);
      var gapBefore = (b.gapBefore || 0) * scale;
      items.push({ b: b, size: size, lines: lines, lh: lh, gapBefore: gapBefore });
      total += gapBefore + lines.length * lh;
    });
    return { items: items, height: total };
  }

  function drawBlocks(ctx, blocks, box) {
    blocks = blocks.filter(function (b) {
      return b && (b.segments ? b.segments.length : String(b.text).trim());
    });
    if (!blocks.length) return;

    var layout = null;
    for (var scale = 1; scale >= 0.5; scale -= 0.04) {
      layout = measureBlocks(ctx, blocks, box.w, scale);
      if (layout.height <= box.h) break;
    }

    var y = box.y + Math.max(0, (box.h - layout.height) / 2);
    var cx = box.x + box.w / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    layout.items.forEach(function (item) {
      y += item.gapBefore;
      ctx.font = (item.b.weight || 'normal') + ' ' + item.size + 'px ' + (item.b.family || SERIF);
      ctx.fillStyle = item.b.color;
      setLetterSpacing(ctx, item.b.spacing || 0);
      item.lines.forEach(function (line) {
        var baseline = y + (item.lh - item.size) / 2;
        if (item.b.segments) drawTokenLine(ctx, line, cx, baseline, item.b.color);
        else ctx.fillText(line, cx, baseline);
        y += item.lh;
      });
      setLetterSpacing(ctx, 0);
    });
  }

  function drawFittedLine(ctx, text, box, opts) {
    var size = opts.maxSize;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    while (size > opts.minSize) {
      ctx.font = (opts.weight || 'bold') + ' ' + size + 'px ' + (opts.family || SERIF);
      if (ctx.measureText(text).width <= box.w) break;
      size -= 2;
    }
    ctx.font = (opts.weight || 'bold') + ' ' + size + 'px ' + (opts.family || SERIF);
    if (opts.shadow) {
      ctx.save();
      ctx.shadowColor = opts.shadow;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }
    ctx.fillStyle = opts.color;
    ctx.fillText(text, box.x + box.w / 2, box.y + box.h / 2);
    if (opts.shadow) ctx.restore();
  }

  /* ---------------- panel content per template kind ---------------- */
  function panelBlocks(tpl, card) {
    var c = tpl.colors;
    var blocks = [];

    if (tpl.kind === 'character') {
      var victory = card.victoryText;
      if (victory === undefined || victory === null) victory = tpl.defaultVictory || '';
      if (tpl.lockVictory) victory = tpl.defaultVictory;
      if (String(victory).trim()) {
        blocks.push({ text: tpl.victoryLabel, size: tpl.headingSize, weight: 'bold', color: c.heading, spacing: 1.5 });
        blocks.push({ text: victory, size: tpl.bodySize, color: c.body, lh: 1.24 });
      }
      var abilityHeading = tpl.abilityLabel + (String(card.abilityName || '').trim()
        ? ' : ' + String(card.abilityName).trim().toUpperCase()
        : ' :');
      if (String(card.abilityText || '').trim() || String(card.abilityName || '').trim()) {
        blocks.push({ text: abilityHeading, size: tpl.headingSize, weight: 'bold', color: c.heading, spacing: 1.5, gapBefore: 18 });
        blocks.push({ text: card.abilityText || '', size: tpl.bodySize, color: c.body, lh: 1.24 });
      }
      return blocks;
    }

    if (tpl.hasVisionTypes) {
      var chosen = (card.visionTypes || []).filter(function (t) { return T.VISION_TYPES[t]; });
      if (chosen.length) {
        var segments = [{ text: tpl.visionLead, color: c.body }];
        chosen.forEach(function (t, i) {
          if (i) segments.push({ text: tpl.visionJoin, color: c.body });
          segments.push({ text: T.VISION_TYPES[t].label, color: T.VISION_TYPES[t].color });
        });
        blocks.push({ segments: segments, size: tpl.bodySize, weight: 'bold', color: c.body, lh: 1.24 });
      }
    }

    if (tpl.hasSpellKind) {
      var label = T.SPELL_KINDS[card.spellKind || 'immediate'];
      blocks.push({ text: label, size: tpl.headingSize, weight: 'bold', color: c.heading, spacing: 2 });
    }
    blocks.push({ text: card.text || '', size: tpl.bodySize, color: c.body, lh: 1.26, gapBefore: 14 });
    return blocks;
  }

  /* ---------------- main render ---------------- */
  function renderCard(ctx, card, art) {
    var tpl = T.get(card.type);
    var frame = frameOf(tpl);
    var s = T.scaleOf(tpl);
    var tr = card.transform || {};

    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.scale(s.sx, s.sy);

    if (!tpl.artOnTop) drawArtwork(ctx, tpl, art, tr);

    if (frame) {
      ctx.drawImage(frame, 0, 0, tpl.frameW, tpl.frameH);
    } else {
      ctx.fillStyle = '#2a2833';
      ctx.fillRect(0, 0, tpl.frameW, tpl.frameH);
      ctx.fillStyle = '#8f8aa0';
      ctx.font = '28px ' + SERIF;
      ctx.textAlign = 'center';
      ctx.fillText('Chargement du gabarit…', tpl.frameW / 2, tpl.frameH / 2);
    }

    if (tpl.artOnTop) drawArtwork(ctx, tpl, art, tr);

    drawPatch(ctx, frame, tpl.patch);

    var title = String(card.title || '').trim();
    if (title) {
      drawFittedLine(ctx, title, tpl.title, {
        maxSize: tpl.title.maxSize,
        minSize: tpl.title.minSize,
        weight: tpl.title.weight,
        family: tpl.title.family,
        shadow: tpl.title.shadow,
        color: tpl.colors.title
      });
    }

    if (tpl.letter && title) {
      var l = tpl.letter;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = l.weight + ' ' + l.size + 'px ' + l.family;
      ctx.fillStyle = tpl.colors.letter;
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 10;
      ctx.fillText(title.charAt(0).toUpperCase(), l.cx, l.cy + l.size * 0.03);
      ctx.restore();
    }

    if (tpl.hasHp && card.hp !== '' && card.hp !== null && card.hp !== undefined) {
      var hp = tpl.hp;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = hp.weight + ' ' + hp.size + 'px ' + hp.family;
      ctx.fillStyle = tpl.colors.hp;
      ctx.shadowColor = 'rgba(0,0,0,.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(String(card.hp), hp.cx, hp.cy + hp.size * 0.03);
      ctx.restore();
    }

    drawBlocks(ctx, panelBlocks(tpl, card), tpl.panel);

    if (global.SH_DEBUG_BOXES) drawDebug(ctx, tpl);

    ctx.restore();
  }

  function drawDebug(ctx, tpl) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff00ff';
    var box = artBox(tpl);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#00ffff';
    ctx.strokeRect(tpl.title.x, tpl.title.y, tpl.title.w, tpl.title.h);
    ctx.strokeStyle = '#ffff00';
    ctx.strokeRect(tpl.panel.x, tpl.panel.y, tpl.panel.w, tpl.panel.h);
    if (tpl.letter) {
      ctx.strokeStyle = '#00ff00';
      ctx.beginPath(); ctx.arc(tpl.letter.cx, tpl.letter.cy, tpl.letter.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (tpl.hasHp) {
      ctx.strokeStyle = '#ff8800';
      ctx.beginPath(); ctx.arc(tpl.hp.cx, tpl.hp.cy, tpl.hp.r, 0, Math.PI * 2); ctx.stroke();
    }
    if (tpl.patch) {
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(tpl.patch.target.x, tpl.patch.target.y, tpl.patch.target.w, tpl.patch.target.h);
    }
    ctx.restore();
  }

  function renderCardAsync(ctx, card) {
    var tpl = T.get(card.type);
    return Promise.all([
      loadFrame(tpl).catch(function () { return null; }),
      loadImage(card.image).catch(function () { return null; })
    ]).then(function (res) {
      renderCard(ctx, card, res[1]);
      return res[1];
    });
  }

  function renderToCanvas(card, width) {
    var canvas = document.createElement('canvas');
    canvas.width = width || W;
    canvas.height = Math.round((width || W) * (H / W));
    var ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / W, canvas.height / H);
    return renderCardAsync(ctx, card).then(function () { return canvas; });
  }

  global.SHRenderer = {
    renderCard: renderCard,
    renderCardAsync: renderCardAsync,
    renderToCanvas: renderToCanvas,
    loadImage: loadImage,
    preloadFrames: preloadFrames,
    artBox: artBox,
    baseCoverScale: baseCoverScale
  };
})(window);
