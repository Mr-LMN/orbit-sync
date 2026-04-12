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

  // ─── WEEKLY CHALLENGE POOL ──────────────────────────────────────────────
  // Harder challenges that refresh weekly (Monday UTC)
  const WEEKLY_CHALLENGE_POOL = [
    { id: 'weekly_world_boss', label: 'Defeat a World Boss', type: 'boss_defeated', target: 1, xp: 150, rarity: 'EPIC' },
    { id: 'weekly_perfects_50', label: 'Land 50 PERFECT hits', type: 'perfects_total', target: 50, xp: 120, rarity: 'EPIC' },
    { id: 'weekly_score_5000', label: 'Score 5000+ total', type: 'single_run_score', target: 5000, xp: 100, rarity: 'RARE' },
    { id: 'weekly_runs_20', label: 'Complete 20 runs', type: 'runs_completed', target: 20, xp: 80, rarity: 'RARE' },
    { id: 'weekly_phoenix_clear', label: 'Defeat the Phoenix', type: 'phoenix_victory', target: 1, xp: 200, rarity: 'LEGENDARY' },
  ];

  // ─── CHEST REWARD TABLE ─────────────────────────────────────────────────
  // coins awarded when the total daily challenge chest is claimed
  const CHEST_REWARD = { coins: 28, gems: 2, sphereXP: 50, label: 'DAILY CHEST', rarity: 'RARE', color: '#00e5ff' };
  const WEEKLY_REWARD = { coins: 100, gems: 15, sphereXP: 300, label: 'WEEKLY CHEST', rarity: 'LEGENDARY', color: '#ffd700' };

  // ─── SEEDED DAILY SELECTION ──────────────────────────────────────────────
  // Everyone gets the same 3 challenges each calendar day, seeded by date.
  function _seedForToday() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function _seedForWeek() {
    // Monday = start of week (week 0 = first monday of year)
    const d = new Date();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1)); // Adjust to Monday
    return weekStart.getFullYear() * 10000 + (weekStart.getMonth() + 1) * 100 + weekStart.getDate();
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

  function _selectWeeksChallenges() {
    const seed = _seedForWeek();
    const pool = WEEKLY_CHALLENGE_POOL.slice();
    const chosen = [];
    const used = new Set();

    // Pick 2 weekly challenges
    for (let i = 0; i < 2 && pool.length > 0; i++) {
      let idx;
      let attempts = 0;
      do {
        idx = Math.floor(_seededRand(seed, i * 10 + attempts) * pool.length);
        attempts++;
      } while (used.has(idx) && attempts < 20);
      used.add(idx);
      chosen.push({ ...pool[idx], isWeekly: true });
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
        if (parsed && parsed.dateKey === _seedForToday() && parsed.weekKey === _seedForWeek()) return parsed;
      } catch (e) { /* fallback */ }
    }
    // New day — reset progress
    const dailyChallenges = _selectTodaysChallenges();
    const weeklyChallenges = _selectWeeksChallenges();
    const newState = {
      dateKey:    _seedForToday(),
      weekKey:    _seedForWeek(),
      dailyChallenges: dailyChallenges.map(c => ({ ...c, progress: 0, done: false })),
      weeklyChallenges: weeklyChallenges.map(c => ({ ...c, progress: 0, done: false })),
      dailyChestClaimed: false,
      weeklyChestClaimed: false,
      sessionStats: { stagesCleared: 0, perfects: 0, maxCombo: 0, runsCompleted: 0, phoenixSurvived: 0 }
    };
    // Daily login is always auto-done on first load
    const loginChallenge = newState.dailyChallenges.find(c => c.type === 'daily_login');
    if (loginChallenge) { 
      loginChallenge.progress = 1; 
      loginChallenge.done = true; 
      // Show dopamine splash on first load of the day
      setTimeout(() => {
        showLoginSplash(typeof dailyLoginStreak !== 'undefined' ? dailyLoginStreak : 1);
        if (typeof grantOrbitXP === 'function') grantOrbitXP(5);
      }, 800);
    }
    _saveState(newState);
    return newState;
  }

  function _saveState(st) {
    const storage = OG.storage || window.localStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(st));
  }

  function showLoginSplash(streak) {
    const overlay = document.getElementById('loginSplashOverlay');
    const title = document.getElementById('loginStreakTitle');
    if (!overlay || !title) return;

    title.innerText = `DAY ${streak} STREAK`;
    overlay.classList.add('active');

    // Auto-hide after 4s if user doesn't click collect
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 4000);
  }

  let _state = _loadState();

  // ─── PROGRESS HELPERS ────────────────────────────────────────────────────
  function _tick(type, value) {
    let anyChanged = false;
    
    // Update daily challenges
    for (let i = 0; i < _state.dailyChallenges.length; i++) {
      const c = _state.dailyChallenges[i];
      if (c.done) continue;
      if (c.type !== type) continue;

      if (type === 'single_run_score' || type === 'max_combo' || type === 'world_reached' || type === 'phoenix_survive') {
        // These are "reach at least X" rather than cumulative
        if (value >= c.target) { c.progress = c.target; c.done = true; anyChanged = true; }
        else { c.progress = Math.max(c.progress, value); anyChanged = true; }
      } else {
        // Cumulative
        c.progress = Math.min(c.target, c.progress + value);
        if (c.progress >= c.target) { 
          c.done = true; 
          c.justDone = true; // Temporary flag for UI flash
        }
        anyChanged = true;
      }
    }

    // Update weekly challenges
    for (let i = 0; i < _state.weeklyChallenges.length; i++) {
      const c = _state.weeklyChallenges[i];
      if (c.done) continue;
      if (c.type !== type) continue;

      if (type === 'single_run_score' || type === 'max_combo' || type === 'world_reached' || type === 'phoenix_survive' || type === 'boss_defeated' || type === 'phoenix_victory') {
        if (value >= c.target) { c.progress = c.target; c.done = true; anyChanged = true; }
        else { c.progress = Math.max(c.progress, value); anyChanged = true; }
      } else {
        c.progress = Math.min(c.target, c.progress + value);
        if (c.progress >= c.target) { 
          c.done = true; 
          c.justDone = true;
        }
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
    if (_state.dailyChestClaimed) {
      const claimBtn = document.getElementById('challengeClaimBtn');
      if (claimBtn) claimBtn.style.display = 'none';
    } else {
      const allDaily = _state.dailyChallenges.every(c => c.done);
      if (allDaily) {
        const claimBtn = document.getElementById('challengeClaimBtn');
        if (claimBtn) {
          claimBtn.style.display = 'block';
          claimBtn.classList.add('challenge-claim-ready');
        }
        const panel = document.getElementById('dailyChallengesPanel');
        if (panel) panel.classList.add('challenges-complete');
        const btn = document.getElementById('dailyChallengesBtn');
        if (btn) btn.classList.add('challenges-complete');
      }
    }

    if (_state.weeklyChestClaimed) {
      const claimBtn = document.getElementById('weeklyChallengeClaimBtn');
      if (claimBtn) claimBtn.style.display = 'none';
    } else {
      const allWeekly = _state.weeklyChallenges.every(c => c.done);
      if (allWeekly) {
        const claimBtn = document.getElementById('weeklyChallengeClaimBtn');
        if (claimBtn) {
          claimBtn.style.display = 'block';
          claimBtn.classList.add('challenge-claim-ready');
        }
      }
    }
  }

  function claimChest() {
    if (_state.dailyChestClaimed) return;
    if (!_state.dailyChallenges.every(c => c.done)) return;
    _state.dailyChestClaimed = true;
    _saveState(_state);

    // Award coins + gems + sphere XP items
    if (typeof globalCoins !== 'undefined') {
      globalCoins += CHEST_REWARD.coins;
      if (typeof saveData === 'function') saveData();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
    }
    if (typeof globalCrystals !== 'undefined') {
      globalCrystals += CHEST_REWARD.gems;
    }

    // Sphere XP item to inventory (stored in progression data)
    if (OG.storage && OG.storage.getJSON) {
      const progData = OG.storage.getJSON('orbitSync_progression', {}) || {};
      progData.sphereXPItems = (progData.sphereXPItems || 0) + CHEST_REWARD.sphereXP;
      OG.storage.setJSON('orbitSync_progression', progData);
    }

    // Celebration
    const btn = document.getElementById('challengeClaimBtn');
    if (btn) { btn.innerText = '✓ CLAIMED'; btn.disabled = true; btn.style.opacity = '0.5'; }
    const panel = document.getElementById('dailyChallengesPanel');
    if (panel) panel.classList.remove('challenges-complete');
    const mainBtn = document.getElementById('dailyChallengesBtn');
    if (mainBtn) mainBtn.classList.remove('challenges-complete');

    // Pop notification
    if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
      createPopup(centerObj.x, centerObj.y - 80, `+${CHEST_REWARD.coins} COINS`, CHEST_REWARD.color);
      createPopup(centerObj.x, centerObj.y - 55, `+${CHEST_REWARD.gems} GEMS`, '#ff00ff');
      createPopup(centerObj.x, centerObj.y - 30, `+${CHEST_REWARD.sphereXP} SPHERE XP`, '#ffd700');
      if (typeof createShockwave === 'function') createShockwave(CHEST_REWARD.color, 50);
      if (typeof pulseBrightness === 'function') pulseBrightness(1.6, 200);
    }
    refreshChallengesUI();
  }

  function claimWeeklyChest() {
    if (_state.weeklyChestClaimed) return;
    if (!_state.weeklyChallenges.every(c => c.done)) return;
    _state.weeklyChestClaimed = true;
    _saveState(_state);

    // Award coins + gems + sphere XP items (much higher)
    if (typeof globalCoins !== 'undefined') {
      globalCoins += WEEKLY_REWARD.coins;
      if (typeof saveData === 'function') saveData();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
    }
    if (typeof globalCrystals !== 'undefined') {
      globalCrystals += WEEKLY_REWARD.gems;
    }

    // Sphere XP items
    if (OG.storage && OG.storage.getJSON) {
      const progData = OG.storage.getJSON('orbitSync_progression', {}) || {};
      progData.sphereXPItems = (progData.sphereXPItems || 0) + WEEKLY_REWARD.sphereXP;
      OG.storage.setJSON('orbitSync_progression', progData);
    }

    // Celebration (more intense)
    const btn = document.getElementById('weeklyChallengeClaimBtn');
    if (btn) { btn.innerText = '✓ CLAIMED'; btn.disabled = true; btn.style.opacity = '0.5'; }

    if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
      createPopup(centerObj.x, centerObj.y - 100, `🎖 WEEKLY COMPLETE 🎖`, '#ffd700');
      createPopup(centerObj.x, centerObj.y - 80, `+${WEEKLY_REWARD.coins} COINS`, WEEKLY_REWARD.color);
      createPopup(centerObj.x, centerObj.y - 55, `+${WEEKLY_REWARD.gems} GEMS`, '#ff00ff');
      createPopup(centerObj.x, centerObj.y - 30, `+${WEEKLY_REWARD.sphereXP} SPHERE XP`, '#00ff88');
      if (typeof createShockwave === 'function') createShockwave(WEEKLY_REWARD.color, 80);
      if (typeof pulseBrightness === 'function') pulseBrightness(2.0, 400);
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
  function onBossDefeated()              { _tick('boss_defeated', 1); }
  function onPhoenixVictory()            { _tick('phoenix_victory', 1); }

  // ─── UI RENDERER ─────────────────────────────────────────────────────────
  function refreshChallengesUI() {
    const panel = document.getElementById('dailyChallengesPanel');
    const list  = document.getElementById('challengesList');
    if (!panel || !list) return;

    let completedCount = 0;

    list.innerHTML = '';
    
    // Add header for daily challenges
    const dailyHeader = document.createElement('div');
    dailyHeader.style.cssText = 'font-family: Orbitron, sans-serif; font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 2px; margin-bottom: 8px; text-transform: uppercase;';
    dailyHeader.textContent = '⭐ DAILY CHALLENGES';
    list.appendChild(dailyHeader);

    // Render daily challenges
    _state.dailyChallenges.forEach(c => {
      if (c.done) completedCount++;
      const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
      const item = document.createElement('div');
      item.className = 'challenge-item' + (c.done ? ' challenge-done' : '');
      if (c.justDone) {
        item.classList.add('challenge-just-done');
        delete c.justDone;
      }
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

    // Add weekly challenges if available
    if (_state.weeklyChallenges && _state.weeklyChallenges.length > 0) {
      const weeklyHeader = document.createElement('div');
      weeklyHeader.style.cssText = 'font-family: Orbitron, sans-serif; font-size: 0.65rem; color: rgba(255,215,0,0.5); letter-spacing: 2px; margin-top: 16px; margin-bottom: 8px; text-transform: uppercase;';
      weeklyHeader.textContent = '🏆 WEEKLY CHALLENGES';
      list.appendChild(weeklyHeader);

      _state.weeklyChallenges.forEach(c => {
        const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
        const item = document.createElement('div');
        item.className = 'challenge-item' + (c.done ? ' challenge-done challenge-weekly' : 'challenge-weekly');
        if (c.justDone) {
          item.classList.add('challenge-just-done');
          delete c.justDone;
        }
        item.innerHTML = `
          <div class="challenge-row">
            <span class="challenge-check">${c.done ? '✓' : '◎'}</span>
            <span class="challenge-label">${c.label}</span>
            <span class="challenge-xp" style="color: #ffd700;">+${c.xp} XP</span>
          </div>
          <div class="challenge-bar-track">
            <div class="challenge-bar-fill" style="width:${pct}%; background: linear-gradient(90deg, #ffd700, #ffaa00);"></div>
          </div>
        `;
        list.appendChild(item);
      });
    }

    const allDone = _state.dailyChallenges.every(c => c.done);
    const allWeekly = _state.weeklyChallenges && _state.weeklyChallenges.every(c => c.done);
    const claimBtn = document.getElementById('challengeClaimBtn');
    const claimWeekly = document.getElementById('weeklyChallengeClaimBtn');
    const statusBtn = document.getElementById('challengesBtnStatus');

    if (statusBtn) {
      if (_state.dailyChestClaimed) {
        statusBtn.innerText = 'DONE';
        statusBtn.style.color = '#888';
        statusBtn.style.borderColor = '#888';
        statusBtn.style.background = 'rgba(255,255,255,0.05)';
      } else if (allDone) {
        statusBtn.innerText = 'CLAIM DAILY';
        statusBtn.style.color = '#00e5ff';
        statusBtn.style.borderColor = '#00e5ff';
        statusBtn.style.background = 'rgba(0,229,255,0.15)';
      } else {
        statusBtn.innerText = `${completedCount}/3 DAILY`;
        statusBtn.style.color = '#ffaa00';
        statusBtn.style.borderColor = 'rgba(255, 170, 0, 0.3)';
        statusBtn.style.background = 'rgba(255, 170, 0, 0.1)';
      }
    }

    if (claimBtn) {
      if (_state.dailyChestClaimed) {
        claimBtn.style.display = 'block';
        claimBtn.innerText = '✓ DAILY CLAIMED';
        claimBtn.disabled = true;
        claimBtn.style.opacity = '0.5';
        claimBtn.classList.remove('challenge-claim-ready');
      } else if (allDone) {
        claimBtn.style.display = 'block';
        claimBtn.classList.add('challenge-claim-ready');
        claimBtn.innerText = `🎁 CLAIM DAILY (+${CHEST_REWARD.coins} 🪙 +${CHEST_REWARD.gems} 💎)`;
        claimBtn.disabled = false;
        claimBtn.style.opacity = '1';
      } else {
        claimBtn.style.display = 'none';
      }
    }

    if (claimWeekly) {
      if (_state.weeklyChestClaimed) {
        claimWeekly.style.display = 'block';
        claimWeekly.innerText = '✓ WEEKLY CLAIMED';
        claimWeekly.disabled = true;
        claimWeekly.style.opacity = '0.5';
        claimWeekly.classList.remove('challenge-claim-ready');
      } else if (allWeekly) {
        claimWeekly.style.display = 'block';
        claimWeekly.classList.add('challenge-claim-ready');
        claimWeekly.innerText = `🏆 CLAIM WEEKLY (+${WEEKLY_REWARD.coins} 🪙 +${WEEKLY_REWARD.gems} 💎)`;
        claimWeekly.disabled = false;
        claimWeekly.style.opacity = '1';
      } else {
        claimWeekly.style.display = 'none';
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
    onBossDefeated,
    onPhoenixVictory,
    claimChest,
    claimWeeklyChest,
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
