// js/entities/spheres/registry.js

(function(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.entities = OG.entities || {};
  OG.entities.spheres = OG.entities.spheres || {};

  const spheres = {
    'classic': {
      id: 'classic',
      name: 'CLASSIC CORE',
      rarity: 'COMMON',
      maxLevel: 5,
      xpCurve: [0, 100, 250, 500, 1000],
      perkSlotsAtLevel: {
        1: 0,
        2: 1,
        3: 1,
        4: 2,
        5: 2
      },
      passiveAbilities: []
    },
    'skull': {
      id: 'skull',
      name: 'NEON SKULL',
      rarity: 'UNCOMMON',
      maxLevel: 10,
      xpCurve: [0, 150, 400, 800, 1500, 2500, 4000, 6000, 8500, 12000],
      perkSlotsAtLevel: {
        1: 0, 2: 1, 4: 2, 6: 3, 8: 4, 10: 4
      },
      passiveAbilities: ['lives_1']
    },
    'prism': {
      id: 'prism',
      name: 'PRISM CORE',
      rarity: 'RARE',
      maxLevel: 15,
      xpCurve: [0, 200, 500, 1000, 1800, 3000, 4500, 6500, 9000, 12000, 16000, 21000, 27000, 34000, 42000],
      perkSlotsAtLevel: {
        1: 0, 3: 1, 6: 2, 9: 3, 12: 4, 15: 5
      },
      passiveAbilities: ['coin_bonus_1']
    },
    'echo': {
      id: 'echo',
      name: 'ECHO TRAIL',
      rarity: 'RARE',
      maxLevel: 15,
      xpCurve: [0, 200, 500, 1000, 1800, 3000, 4500, 6500, 9000, 12000, 16000, 21000, 27000, 34000, 42000],
      perkSlotsAtLevel: {
         1: 0, 3: 1, 6: 2, 9: 3, 12: 4, 15: 5
      },
      passiveAbilities: ['radius_1']
    },
    'crimson': {
      id: 'crimson',
      name: 'CRIMSON RAIL',
      rarity: 'EPIC',
      maxLevel: 20,
      xpCurve: [0, 300, 750, 1500, 2500, 4000, 6000, 8500, 11500, 15000, 19000, 24000, 30000, 37000, 45000, 54000, 64000, 75000, 87000, 100000],
      perkSlotsAtLevel: {
        1: 1, 4: 2, 8: 3, 12: 4, 16: 5, 20: 6
      },
      passiveAbilities: ['combo_perfect']
    },
    'pulse': {
      id: 'pulse',
      name: 'PULSE CORE',
      rarity: 'EPIC',
      maxLevel: 20,
      xpCurve: [0, 300, 750, 1500, 2500, 4000, 6000, 8500, 11500, 15000, 19000, 24000, 30000, 37000, 45000, 54000, 64000, 75000, 87000, 100000],
      perkSlotsAtLevel: {
         1: 1, 4: 2, 8: 3, 12: 4, 16: 5, 20: 6
      },
      passiveAbilities: ['near_miss_coin']
    },
    'ghost': {
      id: 'ghost',
      name: 'GHOST ORB',
      rarity: 'LEGENDARY',
      maxLevel: 30,
      xpCurve: [0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000, 65000, 76000, 88000, 101000, 115000, 130000, 146000, 163000, 181000, 200000, 220000, 241000, 263000, 286000],
      perkSlotsAtLevel: {
        1: 2, 5: 3, 10: 4, 15: 5, 20: 6, 25: 7, 30: 8
      },
      passiveAbilities: ['ghost_save']
    },
    'storm': {
      id: 'storm',
      name: 'STORM CORE',
      rarity: 'LEGENDARY',
      maxLevel: 30,
      xpCurve: [0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000, 20000, 25000, 31000, 38000, 46000, 55000, 65000, 76000, 88000, 101000, 115000, 130000, 146000, 163000, 181000, 200000, 220000, 241000, 263000, 286000],
      perkSlotsAtLevel: {
        1: 2, 5: 3, 10: 4, 15: 5, 20: 6, 25: 7, 30: 8
      },
      passiveAbilities: ['flawless_bonus']
    }
  };

  OG.entities.spheres.registry = spheres;
})(window);
