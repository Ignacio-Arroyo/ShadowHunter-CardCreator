/* Card template definitions.
   Every geometry value below is expressed in the NATIVE pixel space of the frame PNG
   (see frameW / frameH); the renderer scales that space onto the 750 x 1050 print card. */
(function (global) {
  'use strict';
 
  var CARD_W = 750;   // 63.5 mm @ 300 DPI
  var CARD_H = 1050;  // 88.9 mm @ 300 DPI
 
  var SERIF = 'Georgia, "Times New Roman", serif';
 
  /* ---- shared geometry of the three character frames (873 x 1216) ---- */
  function characterBase(extra) {
    var base = {
      kind: 'character',
      hasHp: true,
      hasVictory: true,
      hasAbility: true,
      hasSpellKind: false,
      frameW: 873,
      frameH: 1216,
      artOnTop: false,
      // slightly larger than the transparent window so no gap shows at its edges
      art: { shape: 'rect', x: 100, y: 110, w: 672, h: 560 },
      // title box starts just right of the letter badge (badge ends at x = 137 + 75 = 212)
      title: { x: 225, y: 15, w: 575, h: 92, maxSize: 80, minSize: 60, weight: 'bold', variant: 'small-caps', family: SERIF, shadow: null, outline: {color: 'rgba(255,255,255,.55)', width: 3} },
      letter: { cx: 130, cy: 120, r: 75, size: 110, weight: 'bold', family: SERIF, outline: {color: 'rgba(255,255,255,.55)', width: 3} },
      hp: { cx: 775, cy: 710, r: 52, size: 70, weight: 'bold', family: SERIF, outline: {color: 'rgba(255,255,255,.55)', width: 3} },
      panel: { x: 100, y: 785, w: 672, h: 282 },
      headingSize: 30,
      bodySize: 32,
      victoryLabel: 'Conditions de victoire :',
      abilityLabel: 'Capacité spéciale'
    };
    Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    return base;
  }
 
  var TEMPLATES = {
    shadow: characterBase({
      id: 'shadow',
      name: 'Shadow',
      frame: 'shadow.png',
      swatch: 'linear-gradient(135deg,#7d1330,#3a0a16)',
      defaultVictory: 'Tous les personnages Hunter sont morts\nou 3 personnages Neutres sont morts.',
      lockVictory: true,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#C4423C', body: '#EFE3CB'
      },
      // hides the victory text baked into the artwork so we can typeset our own
      patch: { target: { x: 104, y: 786, w: 668, h: 124 }, src: { x: 104, y: 950, w: 668, h: 60 }, feather: 26 }
    }),
 
    hunter: characterBase({
      id: 'hunter',
      name: 'Hunter',
      frame: 'hunter.png',
      swatch: 'linear-gradient(135deg,#17567f,#0a2438)',
      defaultVictory: 'Tous les personnages Shadow sont morts.',
      lockVictory: true,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#79B0E2', body: '#EFE3CB'
      },
      patch: null
    }),
 
    neutral: characterBase({
      id: 'neutral',
      name: 'Neutral',
      frame: 'neutral.png',
      swatch: 'linear-gradient(135deg,#e0a83c,#8a5a12)',
      defaultVictory: '',
      lockVictory: false,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#E7BA5A', body: '#EFE3CB'
      },
      patch: { target: { x: 104, y: 786, w: 668, h: 200 }, src: { x: 104, y: 1000, w: 668, h: 58 }, feather: 26 }
    }),
 
    vision: {
      id: 'vision',
      name: 'Vision',
      kind: 'vision',
      frame: 'vision_spell.png',
      swatch: 'linear-gradient(135deg,#4e7d33,#1d3a17)',
      hasHp: false,
      hasVictory: false,
      hasAbility: false,
      hasSpellKind: false,
      hasVisionTypes: true,
      visionLead: 'Je pense que tu es',
      visionJoin: 'ou',
      frameW: 873,
      frameH: 1216,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 436, cy: 505, rx: 320, ry: 293 },
      title: { x: 130, y: 58, w: 610, h: 122, maxSize: 54, minSize: 24, weight: 'bold', variant: 'small-caps', family: SERIF, shadow: 'rgba(0,0,0,.5)' },
      panel: { x: 100, y: 884, w: 672, h: 246 },
      headingSize: 32,
      bodySize: 32,
      colors: { title: '#F3EBD2', heading: '#D8E8B4', body: '#F2ECD8' },
      patch: null
    },
 
    hunterSpell: {
      id: 'hunterSpell',
      name: 'Hunter Spell',
      kind: 'spell',
      frame: 'hunter_spell.png',
      swatch: 'linear-gradient(135deg,#eef6fb,#a9cbe3)',
      hasHp: false,
      hasVictory: false,
      hasAbility: false,
      hasSpellKind: true,
      frameW: 873,
      frameH: 1216,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 436, cy: 506, rx: 309, ry: 293 },
      title: { x: 130, y: 58, w: 610, h: 122, maxSize: 54, minSize: 24, weight: 'bold', variant: 'small-caps', family: SERIF, shadow: null },
      panel: { x: 100, y: 884, w: 672, h: 246 },
      headingSize: 32,
      bodySize: 32,
      colors: { title: '#2E6E9E', heading: '#2E6E9E', body: '#1B1B1B' },
      patch: null
    },
 
    shadowSpell: {
      id: 'shadowSpell',
      name: 'Shadow Spell',
      kind: 'spell',
      frame: 'shadow_spell.png',
      swatch: 'linear-gradient(135deg,#3a3a3a,#0c0c0c)',
      hasHp: false,
      hasVictory: false,
      hasAbility: false,
      hasSpellKind: true,
      frameW: 873,
      frameH: 1216,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 436, cy: 505.5, rx: 314, ry: 292 },
      title: { x: 130, y: 58, w: 610, h: 122, maxSize: 54, minSize: 24, weight: 'bold', variant: 'small-caps', family: SERIF, shadow: 'rgba(0,0,0,.5)' },
      panel: { x: 100, y: 884, w: 672, h: 246 },
      headingSize: 32,
      bodySize: 32,
      colors: { title: '#C9A227', heading: '#C9A227', body: '#EDE3CC' },
      patch: null
    }
  };
 
  var SPELL_KINDS = {
    immediate: 'À jouer immédiatement',
    equipment: 'Équipement'
  };
 
  var VISION_TYPES = {
    hunter: { label: 'HUNTER', color: '#79B0E2' },
    shadow: { label: 'SHADOW', color: '#C4423C' },
    neutral: { label: 'NEUTRE', color: '#E7BA5A' }
  };
 
  var ORDER = ['shadow', 'hunter', 'neutral', 'vision', 'hunterSpell', 'shadowSpell'];
 
  global.SHTemplates = {
    CARD_W: CARD_W,
    CARD_H: CARD_H,
    SERIF: SERIF,
    TEMPLATES: TEMPLATES,
    ORDER: ORDER,
    SPELL_KINDS: SPELL_KINDS,
    VISION_TYPES: VISION_TYPES,
    get: function (id) { return TEMPLATES[id] || TEMPLATES.shadow; },
    scaleOf: function (tpl) { return { sx: CARD_W / tpl.frameW, sy: CARD_H / tpl.frameH }; }
  };
})(window);
