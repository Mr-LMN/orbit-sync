// js/entities/spheres/registry.js
// Sphere definitions: rarity tiers, XP progression curves, passive effects.
//
// Design contract (do not inflate):
//   COMMON:    maxLevel  2  |  maxPerkSlots 0
//   UNCOMMON:  maxLevel  3  |  maxPerkSlots 1
//   RARE:      maxLevel  5  |  maxPerkSlots 1
//   EPIC:      maxLevel  7  |  maxPerkSlots 2
//   LEGENDARY: maxLevel 10  |  maxPerkSlots 3
//
// xpCurve:  Array of length = maxLevel.
//   xpCurve[0]  = 0           (always — the floor of level 1)
//   xpCurve[n]  = cumulative XP required to have reached level (n+1)
//   Example: maxLevel 3, xpCurve [0, 300, 700]
//     level 1 → xp in [0, 300)
//     level 2 → xp in [300, 700)
//     level 3 → xp >= 700 (max — bar shows full)
//
// perkSlotsAtLevel: maps level thresholds to cumulative unlocked slot count.
//   Slots ramp up as you level so there is always a reason to progress.
//
// passive: Sphere-bound, always-active, non-swappable effect.
//   effects = plain object of effectKey → value.
//   Boolean effects are treated as flags (present = active).
//   Numeric effects are additive deltas (see runtime.js getCombinedValue).

(function(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.entities = OG.entities || {};
  OG.entities.spheres = OG.entities.spheres || {};

  const SPHERES = {

    // ── COMMON ────────────────────────────────────────────────────
    'classic': {
      id: 'classic',
      name: 'CLASSIC CORE',
      rarity: 'COMMON',
      maxLevel: 2,
      maxStars: 1,
      xpCurve: [0, 200],
      perkSlotsAtLevel: { 1: 0, 2: 0 },
      passive: {
        id: 'classic_passive',
        label: 'Standard Operations',
        effects: {}
      }
    },

    // ── UNCOMMON ──────────────────────────────────────────────────
    'skull': {
      id: 'skull',
      name: 'NEON SKULL',
      rarity: 'UNCOMMON',
      maxLevel: 3,
      maxStars: 2,
      xpCurve: [0, 300, 700],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1 },
      passive: {
        id: 'skull_passive',
        label: '+1 Max Lives',
        effects: { maxLivesBonus: 1 }
      }
    },

    // ── RARE ──────────────────────────────────────────────────────
    'prism': {
      id: 'prism',
      name: 'PRISM CORE',
      rarity: 'RARE',
      maxLevel: 5,
      maxStars: 3,
      xpCurve: [0, 200, 500, 1000, 2000],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
      passive: {
        id: 'prism_passive',
        label: '+10% Coins Earned',
        effects: { coinMultiplierBonus: 0.10 }
      }
    },

    'echo': {
      id: 'echo',
      name: 'ECHO TRAIL',
      rarity: 'RARE',
      maxLevel: 5,
      maxStars: 3,
      xpCurve: [0, 200, 500, 1000, 2000],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
      passive: {
        id: 'echo_passive',
        label: '+10% Hit Radius',
        effects: { hitRadiusBonus: 0.10 }
      }
    },

    // ── EPIC ──────────────────────────────────────────────────────
    'crimson': {
      id: 'crimson',
      name: 'CRIMSON RAIL',
      rarity: 'EPIC',
      maxLevel: 7,
      maxStars: 4,
      xpCurve: [0, 300, 700, 1400, 2400, 3800, 5600],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 2 },
      passive: {
        id: 'crimson_passive',
        label: 'Combo +1 on Perfect Hit',
        effects: { comboPerfectBonus: true }
      }
    },

    'pulse': {
      id: 'pulse',
      name: 'PULSE CORE',
      rarity: 'EPIC',
      maxLevel: 7,
      maxStars: 4,
      xpCurve: [0, 300, 700, 1400, 2400, 3800, 5600],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 2 },
      passive: {
        id: 'pulse_passive',
        label: 'Near Miss grants +1 Coin',
        effects: { nearMissCoin: true }
      }
    },

    // ── LEGENDARY ─────────────────────────────────────────────────
    'ghost': {
      id: 'ghost',
      name: 'GHOST ORB',
      rarity: 'LEGENDARY',
      maxLevel: 10,
      maxStars: 5,
      xpCurve: [0, 400, 900, 1800, 3000, 4700, 6800, 9500, 13000, 17500],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 3 },
      passive: {
        id: 'ghost_passive',
        label: 'Survive 1 Fatal Hit per Run',
        effects: { ghostSave: true }
      }
    },

    'storm': {
      id: 'storm',
      name: 'STORM CORE',
      rarity: 'LEGENDARY',
      maxLevel: 10,
      maxStars: 5,
      xpCurve: [0, 400, 900, 1800, 3000, 4700, 6800, 9500, 13000, 17500],
      perkSlotsAtLevel: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 3 },
      passive: {
        id: 'storm_passive',
        label: '+5 Coins on Flawless Stage',
        effects: { flawlessBonus: 5 }
      }
    }

  };

  OG.entities.spheres.registry = SPHERES;
})(window);
