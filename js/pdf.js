/* Builds print-ready PDF sheets with jsPDF. */
(function (global) {
  'use strict';

  var PAGES = {
    a4: { w: 210, h: 297, format: 'a4' },
    letter: { w: 215.9, h: 279.4, format: 'letter' }
  };

  function generate(entries, opts, onProgress) {
    var jsPDFCtor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDFCtor) {
      return Promise.reject(new Error('jsPDF library could not be loaded (check your internet connection).'));
    }

    var page = PAGES[opts.page] || PAGES.a4;
    var cw = opts.cardW, ch = opts.cardH;
    var gap = opts.gap || 0;
    var margin = 6;

    var cols = Math.max(1, Math.floor((page.w - margin * 2 + gap) / (cw + gap)));
    var rows = Math.max(1, Math.floor((page.h - margin * 2 + gap) / (ch + gap)));
    var perPage = cols * rows;

    var gridW = cols * cw + (cols - 1) * gap;
    var gridH = rows * ch + (rows - 1) * gap;
    var ox = (page.w - gridW) / 2;
    var oy = (page.h - gridH) / 2;

    var pdf = new jsPDFCtor({ unit: 'mm', format: page.format, orientation: 'portrait', compress: true });

    // expand copies
    var queue = [];
    entries.forEach(function (e) {
      for (var i = 0; i < e.copies; i++) queue.push(e.card);
    });
    if (!queue.length) return Promise.reject(new Error('No cards selected.'));

    var usePng = Number(opts.quality) >= 1;
    var chain = Promise.resolve();

    queue.forEach(function (card, index) {
      chain = chain.then(function () {
        if (onProgress) onProgress(index + 1, queue.length);
        return global.SHRenderer.renderToCanvas(card, 1050);
      }).then(function (canvas) {
        var slot = index % perPage;
        if (index > 0 && slot === 0) pdf.addPage(page.format, 'portrait');

        var col = slot % cols;
        var row = Math.floor(slot / cols);
        var x = ox + col * (cw + gap);
        var y = oy + row * (ch + gap);

        var data = usePng ? canvas.toDataURL('image/png')
                          : canvas.toDataURL('image/jpeg', Number(opts.quality) || 0.92);
        pdf.addImage(data, usePng ? 'PNG' : 'JPEG', x, y, cw, ch, undefined, 'FAST');

        if (opts.outline) {
          pdf.setDrawColor(120);
          pdf.setLineWidth(0.1);
          pdf.rect(x, y, cw, ch);
        }

        if (opts.marks) {
          pdf.setDrawColor(90);
          pdf.setLineWidth(0.15);
          var m = 3.5;
          // vertical guides at card edges, into the page margins
          [x, x + cw].forEach(function (gx) {
            pdf.line(gx, Math.max(0, oy - m), gx, oy);
            pdf.line(gx, oy + gridH, gx, Math.min(page.h, oy + gridH + m));
          });
          [y, y + ch].forEach(function (gy) {
            pdf.line(Math.max(0, ox - m), gy, ox, gy);
            pdf.line(ox + gridW, gy, Math.min(page.w, ox + gridW + m), gy);
          });
        }
      });
    });

    return chain.then(function () {
      pdf.save('shadow-hunters-proxies.pdf');
      return { cards: queue.length, pages: Math.ceil(queue.length / perPage), perPage: perPage };
    });
  }

  global.SHPdf = { generate: generate, PAGES: PAGES };
})(window);
