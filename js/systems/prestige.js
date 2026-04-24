(function initPrestigeSystem(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  const STORAGE_KEY = 'orbitSync_orbitRank_v1';

  // ── RANK CURVE ───────────────────────────────────────────────────────────
  // XP required to reach each rank (cumulative XP threshold per level).
  // Ranks 1–50. The curve accelerates to keep early ranks fast & rewarding.
  const MAX_RANK = 50;
  function _buildCurve() {
    const curve = [0]; // curve[rank] = XP needed to reach that rank from rank-1
    for (let r = 1; r <= MAX_RANK; r++) {
      // Base 100 XP, grows by 30 per rank + 2 per rank² for late-game slowing
      curve.push(Math.floor(100 + r * 30 + r * r * 2));
    }
    return curve;
  }
  const RANK_XP_CURVE = _buildCurve(); // RANK_XP_CURVE[r] = XP needed to go from rank r-1 → r

  // ── MILESTONE PERKS ──────────────────────────────────────────────────────
  // Each entry: { rank, id, label, description, type }
  // Types: 'passive' (gameplay buff), 'cosmetic' (visual/meta), 'meta' (hub/progression)
  const RANK_PERKS = [
    { rank: 3,  id: 'extra_daily_slot',   label: 'EXPANDED BRIEFING',   description: '+1 daily challenge shown', type: 'meta' },
    { rank: 5,  id: 'bonus_starting_life',label: 'REINFORCED SHELL',    description: 'Start each run with +1 life', type: 'passive' },
    { rank: 8,  id: 'daily_coin_bonus',   label: 'RESOURCE UPLINK',     description: '+10 coins on daily login', type: 'passive' },
    { rank: 10, id: 'orbit_trail',        label: 'ORBIT TRAIL',         description: 'Animated trail unlocked in Workshop', type: 'cosmetic' },
    { rank: 15, id: 'daily_coin_bonus_2', label: 'DEEP UPLINK',         description: '+15 bonus coins on daily login', type: 'passive' },
    { rank: 20, id: 'phoenix_open',       label: 'OPEN ACCESS',         description: 'Phoenix Trial: unlimited attempts', type: 'meta' },
    { rank: 25, id: 'zone_score_bonus',   label: 'ZONE MASTERY',        description: '+5% zone score bonus', type: 'passive' },
    { rank: 30, id: 'prestige_core',      label: 'PRESTIGE CORE',       description: '"Void Core" cosmetic unlocked', type: 'cosmetic' },
    { rank: 40, id: 'phoenix_bonus_life', label: 'REBIRTH PROTOCOL',    description: 'Phoenix Trial: start with +1 rebirth', type: 'passive' },
    { rank: 50, id: 'max_rank_badge',     label: '◆ ORBIT MASTER',      description: 'Exclusive rank badge + gold orb trail', type: 'cosmetic' },
  ];

  // ── EQUIPPABLE PERK UNLOCK SCHEDULE ──────────────────────────────────────
  // These are the Workshop-socketable perks (registered in entities/perks/registry.js).
  // Distinct from RANK_PERKS above — those are always-on rank milestone buffs;
  // these are equippable into sphere slots. Ranks chosen to avoid collisions
  // with RANK_PERKS so each rank-up shows at most one perk card in the ceremony.
  //
  // NOTE: rank 1 entries are granted immediately on first boot so a brand-new
  // player always has at least one perk to equip once a slot unlocks.
  const EQUIPPABLE_PERK_UNLOCKS = [
    { rank: 1,  perkId: 'vital_core'          },
    { rank: 1,  perkId: 'prospector'          },
    { rank: 2,  perkId: 'arc_expander'        },
    { rank: 4,  perkId: 'magnet_core'         },
    { rank: 6,  perkId: 'micro_arc'           },
    { rank: 7,  perkId: 'edge_sync'           },
    { rank: 9,  perkId: 'pulse_chip'          },
    { rank: 12, perkId: 'flawless_payout'     },
    { rank: 14, perkId: 'combo_conduit'       },
    { rank: 17, perkId: 'near_miss_echo'      },
    { rank: 22, perkId: 'wide_arc_matrix'     },
    { rank: 27, perkId: 'coin_magnate'        },
    { rank: 33, perkId: 'spectral_anchor'     },
    { rank: 42, perkId: 'deep_reserve'        },
    { rank: 48, perkId: 'perfectionist_crown' },
  ];

  // Returns the perk IDs unlocked AT a specific rank (usually 0 or 1 entries,
  // but rank 1 intentionally seeds multiple).
  function _perkIdsAtRank(rank) {
    return EQUIPPABLE_PERK_UNLOCKS.filter(e => e.rank === rank).map(e => e.perkId);
  }

  // Returns all perk IDs that should be unlocked by the given rank (<= rank).
  function _perkIdsUpToRank(rank) {
    return EQUIPPABLE_PERK_UNLOCKS.filter(e => e.rank <= rank).map(e => e.perkId);
  }

  // Grant any equippable perks owed for this rank. Idempotent — unlockPerk
  // returns false if already owned. Returns array of newly-unlocked perk defs.
  function _grantEquippablePerksForRank(rank) {
    const sr = OG.entities && OG.entities.spheres && OG.entities.spheres.runtime;
    const perkReg = OG.entities && OG.entities.perks && OG.entities.perks.registry;
    if (!sr || !sr.unlockPerk || !perkReg) return [];
    const newlyUnlocked = [];
    _perkIdsAtRank(rank).forEach(function(perkId) {
      if (sr.unlockPerk(perkId) && perkReg[perkId]) {
        newlyUnlocked.push(perkReg[perkId]);
      }
    });
    return newlyUnlocked;
  }

  // Self-healing boot check — grants every perk owed for the player's current
  // rank. Handles: (1) existing players who ranked up before this feature
  // existed, (2) any case where a ceremony was skipped. Safe to call at boot.
  function _reconcileUnlockedPerks() {
    const sr = OG.entities && OG.entities.spheres && OG.entities.spheres.runtime;
    if (!sr || !sr.unlockPerk) return;
    const rank = _state.rank || 1;
    _perkIdsUpToRank(rank).forEach(function(perkId) {
      sr.unlockPerk(perkId); // idempotent
    });
  }

  // ── STATE ────────────────────────────────────────────────────────────────
  function _loadState() {
    const storage = OG.storage || window.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.rank === 'number') return parsed;
      } catch (e) {}
    }
    return { rank: 1, xp: 0, pendingCeremonyQueue: [] };
  }

  function _saveState(st) {
    const storage = OG.storage || window.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  let _state = _loadState();

  // ── XP HELPERS ───────────────────────────────────────────────────────────
  function _xpToNextRank(currentRank) {
    if (currentRank >= MAX_RANK) return 0;
    return RANK_XP_CURVE[currentRank + 1] || 0;
  }

  function _xpProgress(currentRank, currentXP) {
    // XP within the current rank bracket (0 to xpToNext)
    const needed = _xpToNextRank(currentRank);
    if (needed <= 0) return 1;
    return Math.min(1, currentXP / needed);
  }

  // ── GRANT XP ─────────────────────────────────────────────────────────────
  function grantOrbitXP(amount) {
    if (!amount || amount <= 0) return;
    if (_state.rank >= MAX_RANK) return; // already maxed

    _state.xp = (_state.xp || 0) + amount;
    let leveled = false;
    let newRank = _state.rank;

    while (newRank < MAX_RANK && _state.xp >= _xpToNextRank(newRank)) {
      _state.xp -= _xpToNextRank(newRank);
      newRank++;
      leveled = true;
      _onRankUp(newRank);
    }

    _state.rank = newRank;
    _saveState(_state);

    // Refresh the hub strip if visible
    if (typeof inMenu !== 'undefined' && inMenu) {
      if (OG.ui && OG.ui.menus && typeof OG.ui.menus.refreshOrbitRankStrip === 'function') {
        OG.ui.menus.refreshOrbitRankStrip();
      }
    }
  }

  function _onRankUp(newRank) {
    // Find any milestone (rank-bound) perk unlocked at this exact rank
    const perk = RANK_PERKS.find(p => p.rank === newRank) || null;

    // Grant any equippable (workshop-socketable) perks owed for this rank.
    // The ceremony below surfaces the first newly-unlocked one via an
    // equippablePerk payload (the existing perk card renders its label/desc).
    const newEquippable = _grantEquippablePerksForRank(newRank);
    const equippablePerk = newEquippable[0] || null;

    // Queue ceremony
    if (!_state.pendingCeremonyQueue) _state.pendingCeremonyQueue = [];
    _state.pendingCeremonyQueue.push({
      type: 'rank_up',
      rank: newRank,
      perk,
      equippablePerk
    });
    _saveState(_state);

    if (OG.systems.ceremony && typeof OG.systems.ceremony.showPendingCeremony === 'function') {
      OG.systems.ceremony.showPendingCeremony();
    }
  }

  // Reconcile on first module tick after entities/spheres/runtime is available.
  // Using setTimeout(0) avoids load-order issues since runtime.js may be parsed
  // after this file depending on script tag order.
  setTimeout(_reconcileUnlockedPerks, 0);

  // ── PUBLIC READS ─────────────────────────────────────────────────────────
  function getOrbitRank()   { return _state.rank || 1; }
  function getOrbitXP()     { return _state.xp   || 0; }
  function getXPToNextRank(){ return _xpToNextRank(_state.rank); }
  function getXPProgress()  { return _xpProgress(_state.rank, _state.xp); }

  function getActivePerks() {
    const rank = _state.rank || 1;
    return RANK_PERKS.filter(p => p.rank <= rank);
  }

  function hasPerk(perkId) {
    return getActivePerks().some(p => p.id === perkId);
  }

  function queueWorldUnlock(worldNum) {
    if (!_state.pendingCeremonyQueue) _state.pendingCeremonyQueue = [];
    _state.pendingCeremonyQueue.push({ type: 'world_unlock', worldNum });
    _saveState(_state);

    if (OG.systems.ceremony && typeof OG.systems.ceremony.showPendingCeremony === 'function') {
      OG.systems.ceremony.showPendingCeremony();
    }
  }

  function consumePendingCeremony() {
    if (!_state.pendingCeremonyQueue || _state.pendingCeremonyQueue.length === 0) return null;
    const c = _state.pendingCeremonyQueue.shift();
    _saveState(_state);
    return c;
  }

  function getRankLabel(rank) {
    const r = rank || _state.rank || 1;
    if (r >= 50) return 'ORBIT MASTER';
    if (r >= 40) return 'VOID WALKER';
    if (r >= 30) return 'PRESTIGE RUNNER';
    if (r >= 20) return 'PHOENIX AGENT';
    if (r >= 15) return 'DEEP SYNC';
    if (r >= 10) return 'SYNC RUNNER';
    if (r >= 5)  return 'ORBIT PILOT';
    return 'ORBIT RUNNER';
  }

  // ── DAILY LOGIN BONUS ────────────────────────────────────────────────────
  // Called by challenges.js auto-login mark.
  function applyDailyLoginXP() {
    let bonus = 5;
    if (hasPerk('daily_coin_bonus'))   bonus += 2; // small XP boost for uplink perks
    if (hasPerk('daily_coin_bonus_2')) bonus += 3;
    grantOrbitXP(bonus);
  }

  // ── RUNTIME PERK READS (called by game systems) ──────────────────────────
  function getBonusStartingLives() {
    return hasPerk('bonus_starting_life') ? 1 : 0;
  }

  function getLoginCoinBonus() {
    let bonus = 0;
    if (hasPerk('daily_coin_bonus'))   bonus += 10;
    if (hasPerk('daily_coin_bonus_2')) bonus += 15;
    return bonus;
  }

  function getZoneScoreBonus() {
    return hasPerk('zone_score_bonus') ? 0.05 : 0;
  }

  function isPhoenixOpenAccess() {
    return hasPerk('phoenix_open');
  }

  function getPhoenixBonusRebirth() {
    return hasPerk('phoenix_bonus_life') ? 1 : 0;
  }

  // Returns the next rank that unlocks a perk (for "next chase" hub messaging)
  function getNextPerkMilestone() {
    const rank = _state.rank || 1;
    return RANK_PERKS.find(p => p.rank > rank) || null;
  }

  // Returns total XP needed from current position to reach a target rank
  function getXPToRank(targetRank) {
    const rank = _state.rank || 1;
    if (targetRank <= rank) return 0;
    let total = _xpToNextRank(rank) - (_state.xp || 0);
    for (let r = rank + 1; r < targetRank; r++) {
      total += _xpToNextRank(r);
    }
    return Math.max(0, total);
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────
  OG.systems.prestige = {
    MAX_RANK,
    RANK_PERKS,
    RANK_XP_CURVE,
    grantOrbitXP,
    getOrbitRank,
    getOrbitXP,
    getXPToNextRank,
    getXPProgress,
    getActivePerks,
    hasPerk,
    consumePendingCeremony,
    getRankLabel,
    applyDailyLoginXP,
    getBonusStartingLives,
    getLoginCoinBonus,
    getZoneScoreBonus,
    isPhoenixOpenAccess,
    getPhoenixBonusRebirth,
    getNextPerkMilestone,
    getXPToRank,
    queueWorldUnlock,
  };

})(window);
