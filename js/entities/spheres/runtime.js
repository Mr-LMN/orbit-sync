// js/entities/spheres/runtime.js
// Single authoritative runtime resolver for sphere passives, perk effects,
// and progression reads.
//
// Gameplay code must use this module instead of bare `activeSkin === '...'`
// checks. That removes the hardcoded skin-effect coupling from loop.js.
//
// Storage key: 'orbitSync_progression'
// Migrates legacy data silently from the accidental 'undefined' key that
// the previous architecture wrote to (no-argument getJSON/setJSON calls).
//
// Public API — all methods are on OrbitGame.entities.spheres.runtime:
//
//   getSphereMeta(sphereId)                → sphere definition object | null
//   getActiveSphereMeta()                  → definition for activeSkin
//   getSphereProgress(sphereId)            → { level, xp }
//   getActiveSphereProgress()              → progress for activeSkin
//   getUnlockedPerkSlotsForSphere(id)      → number (0-3)
//   getEquippedPerksForSphere(id)          → string[] of perk IDs
//   hasEquippedPerk(perkId, sphereId?)     → bool
//   getUnlockedPerks()                     → string[] of all unlocked perk IDs
//   getSpherePassiveEffect(sphereId?)      → passive object | null
//   getPassiveLabel(sphereId?)             → string label for UI
//   getPassiveValue(effectKey, sphereId?)  → number (0 if boolean/absent)
//   hasPassiveEffect(effectKey, sphereId?) → bool
//   getEquippedPerkEffects(sphereId?)      → combined { effectKey: value } map
//   getCombinedValue(effectKey, sphereId?) → passive + perk value (number|bool)
//
// Write helpers:
//   equipPerk(sphereId, slotIndex, perkId|null)  → saves to storage
//   grantXP(sphereId, amount)                    → { leveled, newLevel }

(function(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.entities = OG.entities || {};
  OG.entities.spheres = OG.entities.spheres || {};

  // ── STORAGE ───────────────────────────────────────────────────
  // All sphere/perk progression data lives under a single JSON blob.
  // Structure:
  // {
  //   sphereProgression: { [sphereId]: { level: number, xp: number } },
  //   equippedPerks:     { [sphereId]: string[] },
  //   unlockedPerks:     string[],
  //   globalCoreFragments: number
  // }

  const STORAGE_KEY  = 'orbitSync_progression';
  const LEGACY_KEY   = 'undefined'; // accidental key from previous no-arg getJSON calls

  function _readBlob() {
    if (!OG.storage) return {};
    let blob = OG.storage.getJSON(STORAGE_KEY, null);
    if (blob === null) {
      // One-time silent migration from the legacy accidental key
      const legacy = OG.storage.getJSON(LEGACY_KEY, null);
      if (legacy !== null && typeof legacy === 'object') {
        blob = legacy;
        OG.storage.setJSON(STORAGE_KEY, blob);
      }
    }
    return blob || {};
  }

  function _writeBlob(blob) {
    if (OG.storage) OG.storage.setJSON(STORAGE_KEY, blob);
  }

  function _activeSphereId() {
    return (typeof activeSkin !== 'undefined' && activeSkin) ? activeSkin : 'classic';
  }

  // ── PUBLIC API ────────────────────────────────────────────────

  const SphereRuntime = {

    STORAGE_KEY: STORAGE_KEY,

    // ── META ─────────────────────────────────────────────────────

    getSphereMeta: function(sphereId) {
      const reg = OG.entities.spheres.registry;
      return reg ? (reg[sphereId] || null) : null;
    },

    getActiveSphereMeta: function() {
      return this.getSphereMeta(_activeSphereId());
    },

    // ── PROGRESSION ──────────────────────────────────────────────

    getSphereProgress: function(sphereId) {
      const blob = _readBlob();
      const prog = blob.sphereProgression || {};
      return Object.assign({ level: 1, xp: 0, stars: 1 }, prog[sphereId] || {});
    },

    getActiveSphereProgress: function() {
      return this.getSphereProgress(_activeSphereId());
    },

    // ── PERK SLOTS ───────────────────────────────────────────────

    // How many perk slots are unlocked for a sphere at its current level.
    getUnlockedPerkSlotsForSphere: function(sphereId) {
      const meta = this.getSphereMeta(sphereId);
      if (!meta) return 0;
      const level = this.getSphereProgress(sphereId).level || 1;
      const slotMap = meta.perkSlotsAtLevel || {};
      let slots = 0;
      for (const lvlStr of Object.keys(slotMap)) {
        if (parseInt(lvlStr, 10) <= level) {
          slots = Math.max(slots, slotMap[lvlStr]);
        }
      }
      const stars = this.getSphereProgress(sphereId).stars || 1;
      return slots + (stars - 1);
    },

    // Max perk slots a sphere can ever have (at max level).
    getMaxPerkSlotsForSphere: function(sphereId) {
      const meta = this.getSphereMeta(sphereId);
      if (!meta) return 0;
      const slotMap = meta.perkSlotsAtLevel || {};
      let max = 0;
      for (const v of Object.values(slotMap)) max = Math.max(max, v);
      return max;
    },

    // ── EQUIPPED PERKS ───────────────────────────────────────────

    // Returns equipped perk IDs respecting the current unlocked slot count.
    getEquippedPerksForSphere: function(sphereId) {
      const blob = _readBlob();

      // Prefer new equippedPerks key; fall back to old sphereProgression.perks
      let all;
      const newMap = blob.equippedPerks || {};
      if (newMap[sphereId] !== undefined) {
        all = newMap[sphereId];
      } else {
        const prog = (blob.sphereProgression || {})[sphereId] || {};
        all = prog.perks || [];
      }

      const maxSlots = this.getUnlockedPerkSlotsForSphere(sphereId);
      return all.slice(0, maxSlots).filter(Boolean);
    },

    hasEquippedPerk: function(perkId, sphereId) {
      const id = sphereId || _activeSphereId();
      return this.getEquippedPerksForSphere(id).includes(perkId);
    },

    getUnlockedPerks: function() {
      return _readBlob().unlockedPerks || [];
    },

    // ── PASSIVES ─────────────────────────────────────────────────

    getSpherePassiveEffect: function(sphereId) {
      const id = sphereId || _activeSphereId();
      const meta = this.getSphereMeta(id);
      return (meta && meta.passive) ? meta.passive : null;
    },

    getPassiveLabel: function(sphereId) {
      const passive = this.getSpherePassiveEffect(sphereId || _activeSphereId());
      return passive ? passive.label : '';
    },

    // Returns the numeric value of an effect key from the sphere passive.
    // Returns 0 for boolean effects or absent keys.
    getPassiveValue: function(effectKey, sphereId) {
      const passive = this.getSpherePassiveEffect(sphereId);
      if (!passive || !passive.effects) return 0;
      const val = passive.effects[effectKey];
      if (val === undefined || typeof val === 'boolean') return 0;
      return val;
    },

    hasPassiveEffect: function(effectKey, sphereId) {
      const passive = this.getSpherePassiveEffect(sphereId);
      if (!passive || !passive.effects) return false;
      return !!passive.effects[effectKey];
    },

    // ── PERK EFFECTS ─────────────────────────────────────────────

    // Aggregate all equipped perk effects for a sphere.
    // Numeric values are summed; booleans are OR'd.
    getEquippedPerkEffects: function(sphereId) {
      const id = sphereId || _activeSphereId();
      const perkIds = this.getEquippedPerksForSphere(id);
      const perkReg = OG.entities.perks && OG.entities.perks.registry;
      const combined = {};
      if (!perkReg) return combined;
      perkIds.forEach(function(perkId) {
        const perk = perkReg[perkId];
        if (!perk || !perk.effects) return;
        for (const key of Object.keys(perk.effects)) {
          const val = perk.effects[key];
          if (typeof val === 'boolean') {
            combined[key] = combined[key] || val;
          } else {
            combined[key] = (combined[key] || 0) + val;
          }
        }
      });
      return combined;
    },

    // ── COMBINED VALUE ───────────────────────────────────────────

    // Get the combined effect value from passive + all equipped perks.
    //
    // Boolean effects: true if passive OR any perk has the flag set.
    // Numeric effects: sum of passive delta + sum of perk deltas.
    //   e.g. getCombinedValue('coinMultiplierBonus') on prism + magnet_core
    //        → 0.10 + 0.15 = 0.25  → caller uses (1 + 0.25) as multiplier
    //
    getCombinedValue: function(effectKey, sphereId) {
      const id = sphereId || _activeSphereId();

      // Passive contribution
      const passive = this.getSpherePassiveEffect(id);
      let passiveVal = (passive && passive.effects && passive.effects[effectKey] !== undefined)
        ? passive.effects[effectKey]
        : undefined;

      const stars = this.getSphereProgress(id).stars || 1;
      if (typeof passiveVal === 'number') {
        // Apply star multiplier: +15% effectiveness per star above 1
        passiveVal = passiveVal * (1 + (stars - 1) * 0.15);
      }

      // Perk contribution
      const perkEffects = this.getEquippedPerkEffects(id);
      let perkVal = (perkEffects[effectKey] !== undefined) ? perkEffects[effectKey] : undefined;

      // Determine result type from whatever is defined
      const isBool = (typeof passiveVal === 'boolean') || (typeof perkVal === 'boolean');

      if (isBool) {
        return !!(passiveVal) || !!(perkVal);
      }

      return (passiveVal || 0) + (perkVal || 0);
    },

    // ── WRITE HELPERS ────────────────────────────────────────────

    // Equip or clear a perk in a sphere's slot.
    // perkId = null clears the slot.
    equipPerk: function(sphereId, slotIndex, perkId) {
      const blob = _readBlob();
      blob.equippedPerks = blob.equippedPerks || {};
      const arr = blob.equippedPerks[sphereId] = (blob.equippedPerks[sphereId] || []).slice();
      if (perkId === null || perkId === undefined) {
        arr.splice(slotIndex, 1);
      } else {
        arr[slotIndex] = perkId;
      }
      _writeBlob(blob);
    },

    // Ascend a sphere, increasing its star rating and resetting level
    ascendSphere: function(sphereId) {
      const meta = this.getSphereMeta(sphereId);
      if (!meta) return false;
      
      const blob = _readBlob();
      blob.sphereProgression = blob.sphereProgression || {};
      const prog = Object.assign({ level: 1, xp: 0, stars: 1 }, blob.sphereProgression[sphereId] || {});
      
      const maxStars = meta.maxStars || 1;
      if (prog.level < meta.maxLevel || prog.stars >= maxStars) {
        return false;
      }
      
      // We assume cost has been paid outside
      prog.stars++;
      prog.level = 1;
      prog.xp = 0;
      
      blob.sphereProgression[sphereId] = prog;
      _writeBlob(blob);
      return true;
    },

    // Grant XP to a sphere and level it up if the threshold is met.
    // Returns { leveled: boolean, newLevel: number }
    grantXP: function(sphereId, amount) {
      const meta = this.getSphereMeta(sphereId);
      if (!meta) return { leveled: false, newLevel: 1 };

      const blob = _readBlob();
      blob.sphereProgression = blob.sphereProgression || {};
      const prog = Object.assign({ level: 1, xp: 0, stars: 1 }, blob.sphereProgression[sphereId] || {});

      if (prog.level >= meta.maxLevel) {
        return { leveled: false, newLevel: prog.level };
      }

      prog.xp = (prog.xp || 0) + amount;
      let leveled = false;

      while (prog.level < meta.maxLevel && prog.xp >= meta.xpCurve[prog.level]) {
        prog.level++;
        leveled = true;
      }

      blob.sphereProgression[sphereId] = prog;
      _writeBlob(blob);
      return { leveled, newLevel: prog.level };
    }

  };

  OG.entities.spheres.runtime = SphereRuntime;
})(window);
