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
// Effect keys currently READ by gameplay code (loop.js). Any new perk MUST
// use one of these keys — a new key with no reader does nothing:
//   - maxLivesBonus        (number)  starting lives +N
//   - ghostSave            (boolean) survive 1 fatal hit per run
//   - hitRadiusBonus       (number)  +N% hit radius
//   - comboPerfectBonus    (boolean) +1 combo on perfect hit
//   - coinMultiplierBonus  (number)  +N% coins earned
//   - flawlessBonus        (number)  bonus coins on flawless stage
//   - nearMissCoin         (boolean) +1 coin on near miss
//
// Do NOT re-add passive IDs (lives_1, ghost_save, coin_bonus_1 etc.) here.
// Those live exclusively in spheres/registry.js as sphere passive objects.

(function(window, OG) {

  const PERKS = {

    // ── DEFENSIVE ──────────────────────────────────────────────

    // +1 max life — stacks with skull passive's maxLivesBonus: 1
    'vital_core': {
      id: 'vital_core',
      name: 'Vital Core',
      description: '+1 Max Lives',
      icon: '❤️',
      role: 'defensive',
      effects: { maxLivesBonus: 1 }
    },

    // +2 max lives — premium defensive option, stacks with vital_core and skull
    'deep_reserve': {
      id: 'deep_reserve',
      name: 'Deep Reserve',
      description: '+2 Max Lives',
      icon: '🛡️',
      role: 'defensive',
      effects: { maxLivesBonus: 2 }
    },

    // Port of ghost passive — ghost save on any sphere
    'spectral_anchor': {
      id: 'spectral_anchor',
      name: 'Spectral Anchor',
      description: 'Survive 1 Fatal Hit per Run',
      icon: '👻',
      role: 'defensive',
      effects: { ghostSave: true }
    },

    // ── PRECISION ──────────────────────────────────────────────

    // +10% hit radius — stacks with echo passive's hitRadiusBonus: 0.10
    'arc_expander': {
      id: 'arc_expander',
      name: 'Arc Expander',
      description: '+10% Hit Radius',
      icon: '🔵',
      role: 'precision',
      effects: { hitRadiusBonus: 0.10 }
    },

    // +5% hit radius — cheap early-game precision option
    'micro_arc': {
      id: 'micro_arc',
      name: 'Micro Arc',
      description: '+5% Hit Radius',
      icon: '◌',
      role: 'precision',
      effects: { hitRadiusBonus: 0.05 }
    },

    // +20% hit radius — premium precision option
    'wide_arc_matrix': {
      id: 'wide_arc_matrix',
      name: 'Wide Arc Matrix',
      description: '+20% Hit Radius',
      icon: '◉',
      role: 'precision',
      effects: { hitRadiusBonus: 0.20 }
    },

    // ── ECONOMY ────────────────────────────────────────────────

    // +8% coin multiplier — cheap early economy option
    'prospector': {
      id: 'prospector',
      name: 'Prospector',
      description: '+8% Coins Earned',
      icon: '💰',
      role: 'economy',
      effects: { coinMultiplierBonus: 0.08 }
    },

    // +15% coin multiplier — stacks with prism passive's coinMultiplierBonus: 0.10
    'magnet_core': {
      id: 'magnet_core',
      name: 'Magnet Core',
      description: '+15% Coins Earned',
      icon: '🪙',
      role: 'economy',
      effects: { coinMultiplierBonus: 0.15 }
    },

    // +25% coin multiplier — premium economy option
    'coin_magnate': {
      id: 'coin_magnate',
      name: 'Coin Magnate',
      description: '+25% Coins Earned',
      icon: '💎',
      role: 'economy',
      effects: { coinMultiplierBonus: 0.25 }
    },

    // ── FLAWLESS SPECIALIST ────────────────────────────────────

    // +10 coin bonus on flawless stage — mid-tier flawless build
    'flawless_payout': {
      id: 'flawless_payout',
      name: 'Flawless Payout',
      description: '+10 Coins on Flawless Stage',
      icon: '✦',
      role: 'event',
      effects: { flawlessBonus: 10 }
    },

    // +20 coin bonus on flawless stage — top-tier flawless build
    'perfectionist_crown': {
      id: 'perfectionist_crown',
      name: "Perfectionist's Crown",
      description: '+20 Coins on Flawless Stage',
      icon: '👑',
      role: 'event',
      effects: { flawlessBonus: 20 }
    },

    // ── COMBO CONTROL ──────────────────────────────────────────

    // Combo +1 on perfect — same effect as crimson passive, equippable on any sphere
    'edge_sync': {
      id: 'edge_sync',
      name: 'Edge Sync',
      description: 'Combo +1 on Perfect Hit',
      icon: '🔥',
      role: 'combo',
      effects: { comboPerfectBonus: true }
    },

    // Hybrid — combo perfect bonus + small flawless synergy
    'combo_conduit': {
      id: 'combo_conduit',
      name: 'Combo Conduit',
      description: 'Combo +1 on Perfect · +3 Flawless Bonus',
      icon: '⚡',
      role: 'combo',
      effects: { comboPerfectBonus: true, flawlessBonus: 3 }
    },

    // ── NEAR-MISS / HYBRID ─────────────────────────────────────

    // Near miss +1 coin — same effect as pulse passive, equippable on any sphere
    'pulse_chip': {
      id: 'pulse_chip',
      name: 'Pulse Chip',
      description: 'Near Miss grants +1 Coin',
      icon: '⚡',
      role: 'economy',
      effects: { nearMissCoin: true }
    },

    // Hybrid — near-miss coin + small hit radius for aggressive grinders
    'near_miss_echo': {
      id: 'near_miss_echo',
      name: 'Near Miss Echo',
      description: 'Near Miss Coin · +5% Hit Radius',
      icon: '↯',
      role: 'economy',
      effects: { nearMissCoin: true, hitRadiusBonus: 0.05 }
    }

  };

  OG.entities.perks.registry = PERKS;
})(window, window.OG);
