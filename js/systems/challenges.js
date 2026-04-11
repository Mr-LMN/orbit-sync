(function initChallengesSystem(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  const STORAGE_KEY = 'orbitSync_dailyChallenges_v1';

  // ─── CHALLENGE POOL ──────────────────────────────────────────────────────
  // Each entry: id, label (used in UI), type (hook key), target, xp (reward)
  const CHALLENGE_POOL = [
    { id: 'stages_2',        label: 'Clear 2 campaign stages',      type: 'stages_cleared',   target: 2,   xp: 30 },
    { id: 'stages_3',        label: 'Clear 3 campaign stages',      type: 'stages_cleared',   target: 3,   xp: 50 },
    { id: 'score_400',       label: 'Score 400+ in one run',        type: 'single_run_score', target: 400, xp: 30 },
    { id: 'score_700',       label: 'Score 700+ in one run',        type: 'single_run_score', target: 700, xp: 55 },
    { id: 'perfects_8',      label: 'Hit 8 PERFECT hits total',     type: 'perfects_total',   target: 8,   xp: 35 },
    { id: 'perfects_15',     label: 'Hit 15 PERFECT hits total',    type: 'perfects_total',   target: 15,  xp: 60 },
    { id: 'combo_4',         label: 'Reach a ×4 combo',             type: 'max_combo',        target: 4,   xp: 25 },
    { id: 'combo_6',         label: 'Build a ×6 combo streak',      type: 'max_combo',        target: 6,   xp: 45 },
    { id: 'phoenix_survive', label: 'Survive 60s in Phoenix Trial', type: 'phoenix_survive',  target: 60,  xp: 70 },
    { id: 'play_runs_3',     label: 'Complete 3 runs today',        type: 'runs_completed',   target: 3,   xp: 25 },
    { id: 'play_runs_5',     label: 'Complete 5 runs today',        type: 'runs_completed',   target: 5,   xp: 40 },
    { id: 'world_2',         label: 'Play a World 2 stage',         type: 'world_reached',    target: 2,   xp: 20 },
    { id: 'world_3',         label: 'Reach World 3',                type: 'world_reached',    target: 3,   xp: 35 },
    { id: 'no_miss_stage',   label: 'Clear a stage with no misses', type: 'flawless_stage',   target: 1,   xp: 50 },
    { id: 'streak_login',    label: 'Log in today',                 type: 'daily_login',      target: 1,   xp: 10 },
  ];

  // ─── CHEST REWARD TABLE ─────────────────────────────────────────────────
  // coins awarded when the total daily challenge chest is claimed
  const CHEST_REWARD = { coins: 28, label: 'DAILY CHEST', rarity: 'RARE', color: '#00e5ff' };

  // ─── SEEDED DAILY SELECTION ──────────────────────────────────────────────
  // Everyone gets the same 3 challenges each calendar day, seeded by date.
  function _seedForToday() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function _seededRand(seed, idx) {
    // Simple deterministic hash — good enough for daily rotation
    let h = (seed ^ 0xdeadbeef) + idx * 2654435769;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }

  function _selectTodaysChallenges() {
    const seed = _seedForToday();
    const pool = CHALLENGE_POOL.slice();
    const chosen = [];
    const used = new Set();

    // Pick 3 challenges of varying difficulty
    const targets = [0, Math.floor(pool.length / 2), pool.length - 3]; // easy, mid, hard zone
    for (let i = 0; i < 3; i++) {
      let idx;
      let attempts = 0;
      do {
        const zone = targets[i];
        const zoneSize = Math.floor(pool.length / 3);
        idx = zone + Math.floor(_seededRand(seed, i * 10 + attempts) * zoneSize);
        idx = Math.max(0, Math.min(pool.length - 1, idx));
        attempts++;
      } while (used.has(idx) && attempts < 20);
      used.add(idx);
      chosen.push({ ...pool[idx] });
    }
    return chosen;
  }

  // ─── STATE ───────────────────────────────────────────────────────────────
  function _loadState() {
    const storage = OG.storage || window.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.dateKey === _seedForToday()) return parsed;
      } catch (e) { /* fallback */ }
    }
    // New day — reset progress
    const challenges = _selectTodaysChallenges();
    const newState = {
      dateKey:    _seedForToday(),
      challenges: challenges.map(c => ({ ...c, progress: 0, done: false })),
      chestClaimed: false,
      sessionStats: { stagesCleared: 0, perfects: 0, maxCombo: 0, runsCompleted: 0, phoenixSurvived: 0 }
    };
    // Daily login is always auto-done on first load
    const loginChallenge = newState.challenges.find(c => c.type === 'daily_login');
    if (loginChallenge) { loginChallenge.progress = 1; loginChallenge.done = true; }
    _saveState(newState);
    return newState;
  }

  function _saveState(st) {
    const storage = OG.storage || window.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  let _state = _loadState();

  // ─── PROGRESS HELPERS ────────────────────────────────────────────────────
  function _tick(type, value) {
    let anyChanged = false;
    for (let i = 0; i < _state.challenges.length; i++) {
      const c = _state.challenges[i];
      if (c.done) continue;
      if (c.type !== type) continue;

      if (type === 'single_run_score' || type === 'max_combo' || type === 'world_reached' || type === 'phoenix_survive') {
        // These are "reach at least X" rather than cumulative
        if (value >= c.target) { c.progress = c.target; c.done = true; anyChanged = true; }
        else { c.progress = Math.max(c.progress, value); anyChanged = true; }
      } else {
        // Cumulative
        c.progress = Math.min(c.target, c.progress + value);
        if (c.progress >= c.target) { c.done = true; }
        anyChanged = true;
      }
    }
    if (anyChanged) {
      _saveState(_state);
      refreshChallengesUI();
      _checkChestReady();
    }
  }

  function _checkChestReady() {
    if (_state.chestClaimed) return;
    const allDone = _state.challenges.every(c => c.done);
    if (allDone) {
      const claimBtn = document.getElementById('challengeClaimBtn');
      if (claimBtn) {
        claimBtn.style.display = 'block';
        claimBtn.classList.add('challenge-claim-ready');
      }
      // Subtle pulse on the hub challenge bar
      const panel = document.getElementById('dailyChallengesPanel');
      if (panel) panel.classList.add('challenges-complete');
    }
  }

  function claimChest() {
    if (_state.chestClaimed) return;
    if (!_state.challenges.every(c => c.done)) return;
    _state.chestClaimed = true;
    _saveState(_state);

    // Award coins
    if (typeof globalCoins !== 'undefined') {
      globalCoins += CHEST_REWARD.coins;
      if (typeof saveData === 'function') saveData();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
    }

    // Celebration
    const btn = document.getElementById('challengeClaimBtn');
    if (btn) { btn.innerText = '✓ CLAIMED'; btn.disabled = true; btn.style.opacity = '0.5'; }
    const panel = document.getElementById('dailyChallengesPanel');
    if (panel) panel.classList.remove('challenges-complete');

    // Pop notification
    if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
      createPopup(centerObj.x, centerObj.y - 80, `+${CHEST_REWARD.coins} COINS`, CHEST_REWARD.color);
      createPopup(centerObj.x, centerObj.y - 55, `DAILY CHEST CLAIMED`, '#ffffff');
      if (typeof createShockwave === 'function') createShockwave(CHEST_REWARD.color, 50);
      if (typeof pulseBrightness === 'function') pulseBrightness(1.6, 200);
    }
    refreshChallengesUI();
  }

  // ─── PUBLIC PROGRESS HOOKS ───────────────────────────────────────────────
  function onStageCleared()              { _tick('stages_cleared', 1); }
  function onRunCompleted()              { _tick('runs_completed', 1); }
  function onPerfectHit()                { _tick('perfects_total', 1); }
  function onComboReached(n)             { _tick('max_combo', n); }
  function onRunScore(s)                 { _tick('single_run_score', s); }
  function onWorldReached(w)             { _tick('world_reached', w); }
  function onFlawlessStage()             { _tick('flawless_stage', 1); }
  function onPhoenixSurvived(seconds)    { _tick('phoenix_survive', seconds); }

  // ─── UI RENDERER ─────────────────────────────────────────────────────────
  function refreshChallengesUI() {
    const panel = document.getElementById('dailyChallengesPanel');
    const list  = document.getElementById('challengesList');
    if (!panel || !list) return;

    list.innerHTML = '';
    _state.challenges.forEach(c => {
      const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
      const item = document.createElement('div');
      item.className = 'challenge-item' + (c.done ? ' challenge-done' : '');
      item.innerHTML = `
        <div class="challenge-row">
          <span class="challenge-check">${c.done ? '✓' : '◎'}</span>
          <span class="challenge-label">${c.label}</span>
          <span class="challenge-xp">+${c.xp} XP</span>
        </div>
        <div class="challenge-bar-track">
          <div class="challenge-bar-fill" style="width:${pct}%"></div>
        </div>
      `;
      list.appendChild(item);
    });

    const allDone = _state.challenges.every(c => c.done);
    const claimBtn = document.getElementById('challengeClaimBtn');
    if (claimBtn) {
      if (_state.chestClaimed) {
        claimBtn.style.display = 'block';
        claimBtn.innerText = '✓ CLAIMED';
        claimBtn.disabled = true;
        claimBtn.style.opacity = '0.5';
        claimBtn.classList.remove('challenge-claim-ready');
      } else if (allDone) {
        claimBtn.style.display = 'block';
        claimBtn.classList.add('challenge-claim-ready');
        claimBtn.innerText = `🎁 CLAIM CHEST (+${CHEST_REWARD.coins} COINS)`;
        claimBtn.disabled = false;
        claimBtn.style.opacity = '1';
      } else {
        claimBtn.style.display = 'none';
      }
    }
  }

  // ─── STREAK DISPLAY ──────────────────────────────────────────────────────
  function refreshStreakUI() {
    const el = document.getElementById('hubStreakDisplay');
    if (!el) return;
    const streak = typeof dailyLoginStreak !== 'undefined' ? dailyLoginStreak : 0;
    if (streak <= 0) { el.style.display = 'none'; return; }

    const milestones = [
      { day: 3,  label: 'Day 3',  bonus: '+25 coins' },
      { day: 5,  label: 'Day 5',  bonus: 'Rare Chest' },
      { day: 7,  label: 'Day 7',  bonus: '+60 + Epic Chest' },
      { day: 14, label: 'Day 14', bonus: 'Legendary Chest' },
    ];
    const next = milestones.find(m => m.day > streak);
    const flame = streak >= 7 ? '🔥🔥' : streak >= 3 ? '🔥' : '✦';

    el.style.display = 'flex';
    el.innerHTML = `
      <span class="streak-flame">${flame}</span>
      <span class="streak-count">DAY ${streak}</span>
      <span class="streak-sep">·</span>
      <span class="streak-next">${next ? `Day ${next.day}: ${next.bonus}` : '🏆 MAX STREAK!'}</span>
    `;
  }

  // ─── DAILY MIDNIGHT RESET CHECK ─────────────────────────────────────────
  function _scheduleMidnightReset() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const msUntil = midnight.getTime() - now.getTime();
    setTimeout(() => {
      _state = _loadState();
      refreshChallengesUI();
    }, msUntil);
  }
  _scheduleMidnightReset();

  // ─── EXPORT ──────────────────────────────────────────────────────────────
  OG.systems.challenges = {
    onStageCleared,
    onRunCompleted,
    onPerfectHit,
    onComboReached,
    onRunScore,
    onWorldReached,
    onFlawlessStage,
    onPhoenixSurvived,
    claimChest,
    refreshChallengesUI,
    refreshStreakUI,
    getState: () => _state
  };

  // Auto-trigger login challenge on first load
  setTimeout(function() {
    refreshChallengesUI();
    refreshStreakUI();
  }, 300);

})(window);
