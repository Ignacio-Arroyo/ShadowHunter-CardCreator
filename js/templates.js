/* Card template definitions.
   Every geometry value below is expressed in the NATIVE pixel space of the frame PNG
   (see frameW / frameH); the renderer scales that space onto the 750 x 1050 print card.
 
   NOTE: the coordinates of the 825 x 1125 frames are STARTING ESTIMATES (the old
   873 x 1216 values rescaled). Turn on SH_DEBUG_BOXES in the console and adjust them. */
(function (global) {
  'use strict';
 
  var CARD_W = 750;   // 63.5 mm @ 300 DPI
  var CARD_H = 1050;  // 88.9 mm @ 300 DPI
 
  var SERIF = 'Georgia, "Times New Roman", serif';
  var UNICORN = 'Unicorn, Georgia, "Times New Roman", serif';
 
  /* ---- shared geometry of the three character cards (one frame: personnages.png, 825 x 1125) ---- */
  function characterBase(extra) {
    var base = {
      kind: 'character',
      hasHp: true,
      hasVictory: true,
      hasAbility: true,
      hasSpellKind: false,
      frame: 'personnages.png',
      frameW: 825,
      frameH: 1125,
      artOnTop: false,
 
      // illustration window
      art: { shape: 'rect', x: 95, y: 102, w: 635, h: 518 },
 
      // title: the first letter goes in the badge, the rest is drawn left-aligned in this box
      title: { x: 222, y: 19, w: 534, h: 85, maxSize: 65, minSize: 56, weight: 'normal', variant: 'small-caps', family: UNICORN, shadow: null, uppercase: true, outline: { color: 'rgba(255,255,255,.55)', width: 3 } },
 
      // coloured round zone (top left). Filled with colors.badge. onTop: false = drawn behind the frame
      badge: { cx: 123, cy: 111, r: 70, onTop: true },
 
      // the big letter, centred in the badge
      letter: { cx: 123, cy: 111, r: 70, size: 112, weight: 'bold', family: UNICORN, outline: { color: 'rgba(255,255,255,.55)', width: 3 } },
 
      // HP counter
      hp: { cx: 732, cy: 661, r: 52, size: 65, weight: 'normal', family: UNICORN, outline: { color: 'rgba(255,255,255,.55)', width: 3 } },
 
      // "SHADOW" / "HUNTER" / "NEUTRE" (text comes from factionText), left side, middle
      factionLabel: { x: 95, y: 631, w: 300, h: 60, maxSize: 48, minSize: 24, weight: 'normal', family: UNICORN, align: 'left' },
 
      // "PV" just before the HP counter, right side, middle
      pvLabel: { text: 'PV', x: 552, y: 631, w: 120, h: 60, maxSize: 48, minSize: 24, weight: 'normal', family: UNICORN, align: 'right' },
 
      // victory conditions: top-aligned in this box (move it with x / y)
      victoryPanel: { x: 95, y: 728, w: 635, h: 130 },
      // special ability: starts right under the victory text (+ gap) and may go down to `bottom`
      abilityPanel: { x: 95, w: 635, gap: 12, bottom: 988 },
 
      headingSize: 28,
      bodySize: 30,
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
      swatch: 'linear-gradient(135deg,#7d1330,#3a0a16)',
      factionText: 'SHADOW',
      defaultVictory: 'Tous les personnages Hunter sont morts\nou 3 personnages Neutres sont morts.',
      lockVictory: true,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#C4423C', body: '#EFE3CB',
        badge: '#C4423C', faction: '#C4423C', pvLabel: '#EFE3CB'
      },
      patch: null
    }),
 
    hunter: characterBase({
      id: 'hunter',
      name: 'Hunter',
      swatch: 'linear-gradient(135deg,#17567f,#0a2438)',
      factionText: 'HUNTER',
      defaultVictory: 'Tous les personnages Shadow sont morts.',
      lockVictory: true,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#3A6FD0', body: '#EFE3CB',
        badge: '#3A6FD0', faction: '#3A6FD0', pvLabel: '#EFE3CB'
      },
      patch: null
    }),
 
    neutral: characterBase({
      id: 'neutral',
      name: 'Neutral',
      swatch: 'linear-gradient(135deg,#e0a83c,#8a5a12)',
      factionText: 'NEUTRE',
      defaultVictory: '',
      lockVictory: false,
      colors: {
        title: '#000000', letter: '#000000', hp: '#000000',
        heading: '#E7BA5A', body: '#EFE3CB',
        badge: '#E7BA5A', faction: '#E7BA5A', pvLabel: '#EFE3CB'
      },
      patch: null
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
      visionTypeFont: UNICORN,
      frameW: 825,
      frameH: 1125,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 412, cy: 467, rx: 302, ry: 271 },
      title: { x: 123, y: 54, w: 576, h: 113, maxSize: 50, minSize: 22, weight: 'normal', variant: 'small-caps', family: UNICORN, shadow: 'rgba(0,0,0,.5)' },
      panel: { x: 85, y: 818, w: 654, h: 228 },
      headingSize: 30,
      bodySize: 30,
      colors: { title: '#F3EBD2', heading: '#D8E8B4', body: '#F2ECD8' },
      patch: null
    },
 
    hunterSpell: {
      id: 'hunterSpell',
      name: 'Hunter Spell',
      kind: 'spell',
      frame: 'lumiere_spell.png',
      swatch: 'linear-gradient(135deg,#eef6fb,#a9cbe3)',
      hasHp: false,
      hasVictory: false,
      hasAbility: false,
      hasSpellKind: true,
      frameW: 825,
      frameH: 1125,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 412, cy: 468, rx: 292, ry: 271 },
      title: { x: 123, y: 54, w: 576, h: 113, maxSize: 50, minSize: 22, weight: 'normal', variant: 'small-caps', family: UNICORN, shadow: null },
      panel: { x: 85, y: 818, w: 654, h: 228 },
      headingSize: 30,
      bodySize: 30,
      colors: { title: '#2E6E9E', heading: '#2E6E9E', body: '#1B1B1B' },
      patch: null
    },
 
    shadowSpell: {
      id: 'shadowSpell',
      name: 'Shadow Spell',
      kind: 'spell',
      frame: 'tenebres_spell.png',
      swatch: 'linear-gradient(135deg,#3a3a3a,#0c0c0c)',
      hasHp: false,
      hasVictory: false,
      hasAbility: false,
      hasSpellKind: true,
      frameW: 825,
      frameH: 1125,
      artOnTop: true, // this frame has no transparent window: art is masked onto the disc
      art: { shape: 'ellipse', cx: 412, cy: 468, rx: 297, ry: 270 },
      title: { x: 123, y: 54, w: 576, h: 113, maxSize: 50, minSize: 22, weight: 'normal', variant: 'small-caps', family: UNICORN, shadow: 'rgba(0,0,0,.5)' },
      panel: { x: 85, y: 818, w: 654, h: 228 },
      headingSize: 30,
      bodySize: 30,
      colors: { title: '#C9A227', heading: '#C9A227', body: '#EDE3CC' },
      patch: null
    }
  };
 
  var SPELL_KINDS = {
    immediate: 'À jouer immédiatement',
    equipment: 'Équipement'
  };
 
  var VISION_TYPES = {
    hunter: { label: 'HUNTER', color: '#3A6FD0' },
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
 
