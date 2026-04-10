// js/entities/perks/registry.js
// Perks are equippable bonuses that are SEPARATE from sphere passives.
//
// Key design rules:
//   - Perks are unlocked independently and socketed into perk slots.
//   - A perk can be equipped on any sphere that has an available slot.
//   - Perk effect keys match the same keys defined in sphere passives
//     so getCombinedValue() in runtime.js aggregates both sources cleanly.
//   - Numeric effects are additive deltas (e.g. coinMultiplierBonus: 0.15 = +15%).
//   - Boolean effects are OR'd with the passive (either source activates it).
//
// Do NOT re-add passive IDs (lives_1, ghost_save, coin_bonus_1 etc.) here.
// Those live exclusively in spheres/registry.js as sphere passive objects.

(function(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.entities = OG.entities || {};
  OG.entities.perks = OG.entities.perks || {};

  const PERKS = {

    // +1 max life — stacks with skull passive's maxLivesBonus: 1
    'vital_core': {
      id: 'vital_core',
      name: 'Vital Core',
      description: '+1 Max Lives',
      icon: '❤️',
      effects: { maxLivesBonus: 1 }
    },

    // +15% coin multiplier — stacks with prism passive's coinMultiplierBonus: 0.10
    'magnet_core': {
      id: 'magnet_core',
      name: 'Magnet Core',
      description: '+15% Coins Earned',
      icon: '🪙',
      effects: { coinMultiplierBonus: 0.15 }
    },

    // +10% hit radius — stacks with echo passive's hitRadiusBonus: 0.10
    'arc_expander': {
      id: 'arc_expander',
      name: 'Arc Expander',
      description: '+10% Hit Radius',
      icon: '🔵',
      effects: { hitRadiusBonus: 0.10 }
    },

    // Combo +1 on perfect — same effect as crimson passive, equippable on any sphere
    'edge_sync': {
      id: 'edge_sync',
      name: 'Edge Sync',
      description: 'Combo +1 on Perfect Hit',
      icon: '🔥',
      effects: { comboPerfectBonus: true }
    },

    // Near miss +1 coin — same effect as pulse passive, equippable on any sphere
    'pulse_chip': {
      id: 'pulse_chip',
      name: 'Pulse Chip',
      description: 'Near Miss grants +1 Coin',
      icon: '⚡',
      effects: { nearMissCoin: true }
    }

  };

  OG.entities.perks.registry = PERKS;
})(window);
