(function initPhoenixBossSystem(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  // ─── CONFIG ──────────────────────────────────────────────────────────────
  const TIMER_START   = 30;    // seconds to begin with
  const REBIRTH_TIME  = 20;    // timer reset on rebirth
  const BONUS_LIFE_AT = 60;    // earn +1 life at this total elapsed (seconds)
  const SCORE_PER_SEC = 12;    // score points per second survived (reduced from 100)

  // Wrath pulse: how often (ms) the boss reverses all zones by phase index
  const WRATH_INTERVAL = [0, 14000, 9000, 6000, 4000];

  // Phase thresholds (total elapsed seconds since run start)
  const PHASES = [
    {
      name: 'EMBER',   threshold: 0,
      speed: 0.010,    zoneBase: Math.PI / 5.8,
      types: ['ember', 'ember'],
      reverseChance: 0, blackout: null
    },
    {
      name: 'BURN',    threshold: 25,
      speed: 0.015,    zoneBase: Math.PI / 7.0,
      types: ['ember', 'ember', 'ghost'],
      reverseChance: 0.30, blackout: null
    },
    {
      name: 'INFERNO', threshold: 50,
      speed: 0.021,    zoneBase: Math.PI / 8.8,
      types: ['ember', 'ember', 'ghost', 'inferno'],
      reverseChance: 0.50,
      blackout: { duration: 1300, interval: 7000, firstAt: 2500 }
    },
    {
      name: 'ASH',     threshold: 80,
      speed: 0.029,    zoneBase: Math.PI / 11.5,
      types: ['ember', 'ember', 'ghost', 'inferno', 'ash'],
      reverseChance: 0.60,
      blackout: { duration: 1600, interval: 4500, firstAt: 1000 }
    }
  ];

  const ZONE_COLORS = {
    ember:   '#ff7a1a',
    ghost:   '#ffb85a',
    inferno: '#ffe570',
    ash:     '#7a2020'
  };

  // Base time added per zone type on hit (before diminishing returns)
  const ZONE_TIME_ADD = { ember: 3, ghost: 5, inferno: 8, ash: -4 };
  const ZONE_PERFECT_BONUS = 1;   // extra seconds on a perfect hit

  // ─── STATE ───────────────────────────────────────────────────────────────
  let _active        = false;
  let _startAt       = 0;     // performance.now() when run began
  let _lastFrameAt   = 0;
  let _elapsed       = 0;     // total seconds since run start (never decrements)
  let _timer         = TIMER_START;   // countdown timer
  let _phaseIdx      = 0;
  let _rebirthsLeft  = 2;     // player lives (each "death" uses one)
  let _bonusLifeGiven = false;
  let _perfectMult   = 1;     // score multiplier (0.5 steps up on perfect, reset on miss)
  let _phoenixScore  = 0;
  let _waveSpawned   = false;
  // Stats tracking
  let _perfectHits   = 0;
  let _totalHits     = 0;
  let _missCount     = 0;
  // Wrath state
  let _wrathNextAt   = 0;
  let _wrathActive   = false;
  let _wrathEndsAt   = 0;

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function _phase()   { return PHASES[_phaseIdx]; }

  // Diminishing returns multiplier based on total elapsed
  // Drops off more sharply to prevent infinite runs.
  // At 60s, mult is ~0.61. At 120s, it's ~0.37. Minimum 0.15.
  function _dimMult() { return Math.max(0.15, Math.exp(-_elapsed * 0.008)); }

  function _el(id)    { return document.getElementById(id); }

  // ─── UI ──────────────────────────────────────────────────────────────────
  function _showUI() {
    const el = _el('phoenixGameUI');
    if (el) el.style.display = 'flex';
  }

  function _hideUI() {
    const el = _el('phoenixGameUI');
    if (el) el.style.display = 'none';
  }

  function _updateUI() {
    const remaining = Math.max(0, _timer);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    const ms   = Math.floor((remaining % 1) * 10);
    const timerEl = _el('phoenixTimer');
    if (timerEl) {
      timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}.${ms}`;
      timerEl.classList.toggle('phoenix-timer-critical', remaining < 8);
    }
    const phaseEl = _el('phoenixPhaseName');
    if (phaseEl) phaseEl.textContent = _phase().name;

    const multEl = _el('phoenixMult');
    if (multEl) {
      multEl.textContent = `×${_perfectMult.toFixed(1)}`;
      multEl.style.color = _perfectMult >= 3 ? '#ffe570' : (_perfectMult >= 2 ? '#ff9a46' : '#ffffff');
    }

    const livesEl = _el('phoenixLives');
    if (livesEl) {
      let dots = '';
      for (let i = 0; i < _rebirthsLeft; i++) dots += '◆';
      for (let i = _rebirthsLeft; i < 3; i++) dots += '◇';
      livesEl.textContent = dots;
    }
  }

  // ─── SPAWN ───────────────────────────────────────────────────────────────
  function spawnWave() {
    // Reset targets array (global in loop.js)
    targets = [];
    if (OG.systems && OG.systems.splitControl) {
      OG.systems.splitControl.resetSplitFamilyState();
    }

    const ph       = _phase();
    // Slight intra-phase speed escalation (capped so it doesn't go wild)
    const spd      = ph.speed + Math.min(0.008, _elapsed * 0.00006);
    const baseSize = ph.zoneBase;
    const types    = ph.types;
    const total    = types.length;
    const spread   = (Math.PI * 2) / total;
    // Random start offset so waves feel fresh each time
    const offset   = Math.random() * Math.PI * 2;

    types.forEach((type, idx) => {
      const a      = normalizeAngle(offset + idx * spread);
      const isRev  = (Math.random() < ph.reverseChance);
      const size   = type === 'inferno' ? baseSize * 0.52
                   : type === 'ghost'   ? baseSize * 0.82
                   : baseSize;
      const spd2   = isRev ? -spd : spd;

      const t = buildTarget(a, size, {
        color:        ZONE_COLORS[type],
        active:       true,
        hp:           1,
        isBossShield: false,   // ← NOT a boss shield; phoenix handles its own hits
        moveSpeed:    spd2
      });

      t.phoenixTarget = true;
      t.phoenixType   = type;

      if (type === 'ghost') {
        t.alpha        = 0;
        t.isGhost      = true;
        t.ghostVisible = false;
      }
      if (type === 'ash')     t.isAshDecoy = true;
      if (type === 'inferno') t.isInferno  = true;

      targets.push(t);
    });

    // Wire up blackout config for this phase (the engine reads levelData.blackout)
    levelData.blackout = ph.blackout ? { ...ph.blackout } : null;

    _waveSpawned = true;
  }

  // ─── PER-FRAME GHOST FLICKER ─────────────────────────────────────────────
  function _updateGhosts(frameNow) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isGhost || !t.active) continue;

      // 2.2s cycle: 0→0.32 fade in, 0.32→0.62 fully visible, 0.62→1 fade out
      const cycle   = 2200;
      const phase   = (frameNow % cycle) / cycle;
      let alpha;
      if (phase < 0.30) {
        alpha = phase / 0.30;
        t.ghostVisible = alpha > 0.55;
      } else if (phase < 0.60) {
        alpha = 1;
        t.ghostVisible = true;
      } else {
        alpha = 1 - (phase - 0.60) / 0.40;
        t.ghostVisible = alpha > 0.55;
      }
      t.alpha = alpha;
    }
  }

  // ─── PHASE TRANSITION ────────────────────────────────────────────────────
  function _doPhaseTransition(newIdx) {
    const ph   = PHASES[newIdx];
    const cols = ['#ff7a1a', '#ff5226', '#ffaa00', '#ff3333'];
    const col  = cols[newIdx] || '#ff7a1a';

    createPopup(centerObj.x, centerObj.y - 72, `PHASE ${newIdx + 1}`, col);
    createPopup(centerObj.x, centerObj.y - 46, ph.name, '#ffffff');
    createShockwave(col, 36);
    createShockwave(col, 54);
    createShockwave(col, 80);
    createParticles(centerObj.x, centerObj.y, col, 60);
    pulseBrightness(2.2 + newIdx * 0.3, 250);

    // Extreme canvas flash
    if (typeof canvas !== 'undefined' && canvas.style) {
      canvas.style.boxShadow = `inset 0 0 100px ${col}, 0 0 50px ${col}`;
      setTimeout(() => { canvas.style.boxShadow = 'none'; }, 300);
    }

    if (typeof vibrate === 'function') vibrate([60, 30, 100]);
    if (typeof soundFlameBurst === 'function') soundFlameBurst();

    // Update global shape and colors dynamically for the new phase
    if (typeof computeWorldShape === 'function') {
      window.currentWorldShape = computeWorldShape({ boss: 'phoenix' });
    }
    if (typeof computeWorldPalette === 'function') {
      window.currentWorldPalette = computeWorldPalette({ boss: 'phoenix' });
    }

    // Brief pause, then spawn the new wave
    stageClearHoldUntil = performance.now() + 700;
    setTimeout(() => { if (_active) spawnWave(); }, 700);
  }

  // ─── REBIRTH ─────────────────────────────────────────────────────────────
  function _triggerRebirth() {
    _rebirthsLeft--;
    _timer = REBIRTH_TIME;
    _perfectMult = 1;
    // Sync campaign lives counter
    lives = _rebirthsLeft;
    if (typeof ui !== 'undefined' && ui.lives) ui.lives.innerText = lives;

    createPopup(centerObj.x, centerObj.y - 56, 'REBIRTH', '#ff9a46');
    createPopup(centerObj.x, centerObj.y - 24, `${_rebirthsLeft} REMAINING`, '#ffffff');
    createShockwave('#ff7a1a', 40);
    createShockwave('#b5152a', 58);
    createParticles(centerObj.x, centerObj.y, '#ff7a1a', 32);
    pulseBrightness(1.8, 200);
    if (typeof vibrate === 'function') vibrate([50, 25, 80]);
    canvas.style.boxShadow = 'inset 0 0 60px #ff3300';
    setTimeout(() => { canvas.style.boxShadow = 'none'; }, 200);

    stageClearHoldUntil = performance.now() + 600;
    setTimeout(() => { if (_active) spawnWave(); }, 600);
  }

  // ─── TICK (called every frame from main update loop) ──────────────────────
  function tick(frameNow) {
    if (!_active || !isPlaying) return;

    // Delta time
    const dt = Math.min(0.1, (frameNow - _lastFrameAt) / 1000);
    _lastFrameAt = frameNow;

    // Tick both timers
    if (frameNow > stageClearHoldUntil) {
      _timer   -= dt;
      _elapsed += dt;
    }

    // Sync game score to phoenix score (for death-screen display)
    score = _phoenixScore + Math.floor(_elapsed * SCORE_PER_SEC);

    // Phase check
    let newPhaseIdx = 0;
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (_elapsed >= PHASES[i].threshold) { newPhaseIdx = i; break; }
    }
    if (newPhaseIdx > _phaseIdx) {
      _phaseIdx = newPhaseIdx;
      _doPhaseTransition(newPhaseIdx);
    }

    // ─── WRATH PULSE — boss reverses all zone directions briefly ─────────────
    if (_phaseIdx >= 1) {
      if (!_wrathActive && frameNow >= _wrathNextAt) {
        _wrathActive = true;
        _wrathEndsAt = frameNow + 1800;
        _wrathNextAt = frameNow + WRATH_INTERVAL[_phaseIdx] + 1800;
        // Reverse every active zone direction
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) {
            targets[wi].moveSpeed *= -1;
          }
        }
        createPopup(centerObj.x, centerObj.y - 52, 'WRATH', '#ff3300');
        createPopup(centerObj.x, centerObj.y - 24, 'REVERSAL', '#ff7a1a');
        createShockwave('#ff3300', 34);
        createShockwave('#b5152a', 50);
        pulseBrightness(1.6, 120);
        if (typeof vibrate === 'function') vibrate([50, 25, 70, 15, 40]);
      } else if (_wrathActive && frameNow >= _wrathEndsAt) {
        _wrathActive = false;
        // Reverse back to original directions
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) {
            targets[wi].moveSpeed *= -1;
          }
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Ghost alpha updates
    _updateGhosts(frameNow);

    // 60s milestone — bonus life
    if (!_bonusLifeGiven && _elapsed >= BONUS_LIFE_AT) {
      _bonusLifeGiven = true;
      _rebirthsLeft   = Math.min(_rebirthsLeft + 1, 3);
      createPopup(centerObj.x, centerObj.y - 60, '◆ REBIRTH EARNED', '#ff9a46');
      createShockwave('#ff7a1a', 34);
      pulseBrightness(1.4, 120);
      if (typeof vibrate === 'function') vibrate([30, 15, 50]);
    }

    // Wave complete check — all phoenix targets inactive
    if (_waveSpawned) {
      let anyActive = false;
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].phoenixTarget && targets[i].active) { anyActive = true; break; }
      }
      if (!anyActive) {
        _waveSpawned = false;
        // Quick respawn, brief pause
        const pauseMs = _phaseIdx >= 2 ? 280 : 450;
        stageClearHoldUntil = performance.now() + pauseMs;
        setTimeout(() => { if (_active) spawnWave(); }, pauseMs);
      }
    }

    // Countdown expiry
    if (_timer <= 0) {
      if (_rebirthsLeft > 0) {
        _triggerRebirth();
      } else {
        endRun('timeout');
      }
    }

    _updateUI();
  }

  // ─── HIT HANDLER ─────────────────────────────────────────────────────────
  // Returns true if it was a valid hit, false if the tap should be treated as a miss
  function onTargetHit(t, hitX, hitY, isPerfect) {
    const type = t.phoenixType;

    // Ghost tapped while invisible → counts as miss
    if (type === 'ghost' && !t.ghostVisible) {
      createPopup(hitX, hitY - 20, 'TOO DARK', '#ffb85a');
      createShockwave('#ffb85a', 16);
      onMiss();
      return false;
    }

    // Ash decoy — timer penalty, multiplier reset, no life lost
    if (type === 'ash') {
      _timer         = Math.max(0, _timer + ZONE_TIME_ADD.ash); // adds negative
      _perfectMult   = 1;
      score          = _phoenixScore + Math.floor(_elapsed * SCORE_PER_SEC);
      t.active       = false;
      createPopup(hitX, hitY - 24, 'ASH DECOY', '#ff3333');
      createPopup(hitX, hitY - 44, `${ZONE_TIME_ADD.ash}s`, '#ff3333');
      createShockwave('#7a2020', 24);
      if (typeof soundFail === 'function') soundFail();
      if (typeof vibrate === 'function') vibrate([30, 15, 50]);
      canvas.style.boxShadow = 'inset 0 0 40px #7a0000';
      setTimeout(() => { canvas.style.boxShadow = 'none'; }, 130);
      _updateUI();
      return true; // handled (just a bad hit, not a miss that costs a life)
    }

    // Normal hit — add time
    const baseAdd  = ZONE_TIME_ADD[type] || 3;
    const perfAdd  = isPerfect ? ZONE_PERFECT_BONUS : 0;
    const dimmed   = (baseAdd + perfAdd) * _dimMult();
    const timeAdd  = Math.max(0.5, Math.round(dimmed * 10) / 10);

    _timer       += timeAdd;
    if (isPerfect) { _perfectHits++; if (_perfectMult < 5) _perfectMult = Math.min(5, _perfectMult + 0.5); }
    _totalHits++;

    const hitBonus = Math.round(timeAdd * 8 * _perfectMult);  // was 80 — 10× reduction
    _phoenixScore += hitBonus;
    score          = _phoenixScore + Math.floor(_elapsed * SCORE_PER_SEC);

    t.active = false;

    // Hit feedback
    createParticles(hitX, hitY, t.color, 14);
    createShockwave(t.color, 22);

    const addLabel = `+${timeAdd.toFixed(1)}s`;
    if (type === 'ghost') {
      createPopup(hitX, hitY - 26, `${addLabel} GHOST`, '#ffb85a');
      createShockwave('#ffb85a', 36);
    } else if (type === 'inferno') {
      createPopup(hitX, hitY - 26, `${addLabel} INFERNO`, '#ffe570');
      pulseBrightness(1.3, 80);
      createShockwave('#ffe570', 38);
    } else {
      createPopup(hitX, hitY - 20, addLabel, t.color);
    }
    if (isPerfect) {
      createPopup(hitX, hitY - 44, 'PERFECT', '#ffffff');
    }

    markScoreCoinDirty();
    _updateUI();
    return true;
  }

  // ─── MISS HANDLER ────────────────────────────────────────────────────────
  function onMiss() {
    _missCount++;
    _perfectMult = 1;
    // Slight timer nudge on a miss (encourages aggression, not just survival)
    _timer = Math.max(0, _timer - 1.5);
    ringHitFlash = Math.max(ringHitFlash, 0.22);
    canvas.style.boxShadow = 'inset 0 0 40px #ff3300';
    setTimeout(() => { canvas.style.boxShadow = 'none'; }, 130);
    _updateUI();
  }

  // ─── END RUN ─────────────────────────────────────────────────────────────
  function endRun(reason) {
    if (!_active) return;
    _active = false;
    _wrathActive = false;
    _hideUI();

    // Snapshot stats before any async delay
    const finalScore  = score;
    const finalElapsed = _elapsed;
    const finalPerfects = _perfectHits;
    const finalMisses   = _missCount;
    const finalHits     = _totalHits;

    // Save best
    const prevBest = parseInt(OG.storage.getItem('orbitSync_phoenixBest') || '0', 10);
    const isNewBest = finalScore > prevBest;
    if (isNewBest) OG.storage.setItem('orbitSync_phoenixBest', String(finalScore));
    const displayBest = isNewBest ? finalScore : prevBest;

    const mins   = Math.floor(finalElapsed / 60);
    const secs   = Math.floor(finalElapsed % 60);
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    // Loot tier based on score
    let lootTier, lootCoins, lootColor;
    if (finalScore >= 1500) {
      lootTier = 'LEGENDARY'; lootCoins = 80; lootColor = '#ffd84d';
    } else if (finalScore >= 800) {
      lootTier = 'EPIC';      lootCoins = 40; lootColor = '#b157ff';
    } else if (finalScore >= 300) {
      lootTier = 'RARE';      lootCoins = 20; lootColor = '#00e5ff';
    } else {
      lootTier = 'COMMON';    lootCoins = 8;  lootColor = '#aaaaaa';
    }

    // Worldwide percentile estimate (score-bracket based)
    let percentile;
    if (finalScore >= 1500)     percentile = 'TOP  5%';
    else if (finalScore >= 800) percentile = 'TOP 15%';
    else if (finalScore >= 300) percentile = 'TOP 40%';
    else if (finalScore >= 100) percentile = 'TOP 70%';
    else                        percentile = 'TOP 95%';

    // Award loot coins
    if (typeof globalCoins !== 'undefined') {
      globalCoins += lootCoins;
      if (typeof saveData === 'function') saveData();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
    }

    // Track Phoenix victory for challenges (only if survived)
    if (reason === 'survived' && OG.systems && OG.systems.challenges) {
      OG.systems.challenges.onPhoenixVictory();
    }

    if (typeof stopBossDrone === 'function') stopBossDrone();
    if (typeof stopLastLifeDrone === 'function') stopLastLifeDrone();
    if (typeof updateMusicState === 'function') updateMusicState(1, false);

    const col = reason === 'survived' ? '#ff9a46' : '#ff4422';
    pulseBrightness(2.2, 200);
    createShockwave(col, 40);
    if (isNewBest) {
      createShockwave('#ffd84d', 58);
      createParticles(centerObj.x, centerObj.y, '#ffd84d', 32);
    }

    const delay = reason === 'survived' ? 900 : 350;
    setTimeout(() => {
      isPlaying = false;
      ui.topBar.style.display = 'none';
      ui.gameUI.style.display = 'none';
      if (ui.arenaInfo) ui.arenaInfo.style.display = 'none';
      if (ui.bossUI) ui.bossUI.style.display = 'none';
      ui.bigMultiplier.style.display = 'none';

      ui.overlay.style.display = 'flex';
      ui.title.style.color = col;
      ui.title.classList.add('run-title');
      // Title: never "failed" — phoenix is always a survival challenge
      if (reason === 'survived') {
        ui.title.innerText = 'PHOENIX ENDURED';
      } else if (isNewBest) {
        ui.title.innerText = 'NEW BEST';
      } else {
        ui.title.innerText = 'INCINERATED';
      }

      if (ui.subtitle) ui.subtitle.innerText = percentile + (isNewBest ? ' · NEW BEST' : '');

      // Summary card: repurpose rows for phoenix stats
      const summaryCard = document.getElementById('summaryCard');
      if (summaryCard) summaryCard.style.display = 'block';

      const runScoreEl = ui.runScoreDisplay;
      if (runScoreEl) runScoreEl.innerText = finalScore;

      const pbScoreEl = document.getElementById('pbScoreDisplay');
      if (pbScoreEl) pbScoreEl.innerText = displayBest;

      // Re-label COMBO row to show PERFECTS
      const comboLabel = document.querySelector('#summaryCard .summary-row:nth-child(3) .summary-label');
      const comboVal   = ui.runComboDisplay;
      if (comboLabel) comboLabel.innerText = 'PERFECTS';
      if (comboVal)   comboVal.innerText   = finalPerfects;

      // Coins row → show loot box reward
      const runCoinsBox = document.getElementById('runCoinsBox');
      const runCoinsEl  = ui.runCoins;
      const runCoinsHint = document.getElementById('runCoinsHint');
      if (runCoinsBox) runCoinsBox.style.display = 'flex';
      if (runCoinsEl)  {
        runCoinsEl.style.color = lootColor;
        runCoinsEl.innerText = `+${lootCoins}`;
      }
      const coinsLabel = runCoinsBox && runCoinsBox.querySelector('.summary-label');
      if (coinsLabel) { coinsLabel.innerText = `${lootTier} LOOT`; coinsLabel.style.color = lootColor; }
      if (runCoinsHint) {
        runCoinsHint.style.display = 'block';
        runCoinsHint.innerText = `${finalHits} HITS · ${finalMisses} MISSES · ${timeStr} SURVIVED`;
      }

      // Near miss msg → time survived
      const nearMissEl = ui.nearMissMsg;
      if (nearMissEl) {
        nearMissEl.innerText = isNewBest ? `PERSONAL BEST — ${timeStr}` : `SURVIVED ${timeStr}`;
        nearMissEl.style.display = 'block';
      }

      // Hide campaign-only elements that don't apply
      const newRecordBanner = document.getElementById('newRecordBanner');
      if (newRecordBanner) newRecordBanner.style.display = 'none';
      const closeMissBanner = document.getElementById('closeMissBanner');
      if (closeMissBanner) closeMissBanner.style.display = 'none';
      const adReviveBtn = document.getElementById('adReviveBtn');
      if (adReviveBtn) adReviveBtn.style.display = 'none';
      if (ui.reviveBtn) ui.reviveBtn.style.display = 'none';
      if (ui.coinReviveBtn) ui.coinReviveBtn.style.display = 'none';

      // Wire PLAY AGAIN to restart phoenix (not campaign restartFromCheckpoint)
      if (ui.btn) {
        ui.btn.innerText = 'ENTER AGAIN';
        ui.btn.onclick = function () {
          if (audioCtx && typeof soundUIClick === 'function') soundUIClick();
          ui.overlay.style.display = 'none';
          ui.title.classList.remove('run-title');
          if (typeof startPhoenixRun === 'function') startPhoenixRun();
        };
      }

      // MENU button
      const menuBtn = document.getElementById('menuBtn');
      if (menuBtn) {
        menuBtn.style.display = 'inline-block';
        menuBtn.onclick = function () {
          if (audioCtx && typeof soundUIClick === 'function') soundUIClick();
          if (typeof returnToMenu === 'function') returnToMenu();
        };
      }

      if (typeof setOverlayState === 'function') setOverlayState('gameOver');
    }, delay);
  }

  // ─── START ────────────────────────────────────────────────────────────────
  function start() {
    _active         = true;
    _startAt        = performance.now();
    _lastFrameAt    = performance.now();
    _elapsed        = 0;
    _timer          = TIMER_START;
    _phaseIdx       = 0;
    _rebirthsLeft   = 2;
    _bonusLifeGiven = false;
    _perfectMult    = 1;
    _phoenixScore   = 0;
    _waveSpawned    = false;
    _perfectHits    = 0;
    _totalHits      = 0;
    _missCount      = 0;
    _wrathActive    = false;
    _wrathNextAt    = performance.now() + WRATH_INTERVAL[1] + 3000; // first wrath delayed
    _wrathEndsAt    = 0;
    score           = 0;

    // Sync campaign lives counter to show phoenix rebirths
    lives = _rebirthsLeft;
    if (typeof ui !== 'undefined' && ui.lives) ui.lives.innerText = lives;

    _showUI();
    _updateUI();
  }

  function stop() {
    _active = false;
    _waveSpawned = false;
    _wrathActive = false;
    _wrathEndsAt = 0;
    _wrathNextAt = 0;
    _hideUI();
    const timer = _el('phoenixTimer');
    if (timer) timer.style.display = 'none';
    const phase = _el('phoenixPhaseName');
    if (phase) phase.style.display = 'none';
    const mult = _el('phoenixMult');
    if (mult) mult.style.display = 'none';
    const livesEl = _el('phoenixLives');
    if (livesEl) livesEl.style.display = 'none';
    const phoenixCoreObjV2 = document.getElementById('phoenixCoreObjV2');
    if (phoenixCoreObjV2) phoenixCoreObjV2.style.display = 'none';
    if (typeof canvas !== 'undefined' && canvas && canvas.style) {
      canvas.style.boxShadow = 'none';
      canvas.style.filter = '';
    }
  }

  function isActive() { return _active; }

  function getPhaseIdx() { return _phaseIdx; }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────
  OG.systems.phoenixBoss = {
    start,
    stop,
    tick,
    spawnWave,
    onTargetHit,
    onMiss,
    endRun,
    isActive,
    getPhaseIdx
  };

})(window);
