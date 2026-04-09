(function initPhoenixBossSystem(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  // ─── CONFIG ──────────────────────────────────────────────────────────────
  const TIMER_START   = 30;    // seconds to begin with
  const REBIRTH_TIME  = 20;    // timer reset on rebirth
  const BONUS_LIFE_AT = 60;    // earn +1 life at this total elapsed (seconds)
  const SCORE_PER_SEC = 100;   // score points per second survived

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

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function _phase()   { return PHASES[_phaseIdx]; }

  // Diminishing returns multiplier based on total elapsed
  function _dimMult() { return Math.max(0.40, 1.0 - _elapsed * 0.0042); }

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
    createParticles(centerObj.x, centerObj.y, col, 28);
    pulseBrightness(1.5 + newIdx * 0.18, 150);
    if (typeof vibrate === 'function') vibrate([40, 20, 70]);

    // Brief pause, then spawn the new wave
    stageClearHoldUntil = performance.now() + 700;
    setTimeout(() => { if (_active) spawnWave(); }, 700);
  }

  // ─── REBIRTH ─────────────────────────────────────────────────────────────
  function _triggerRebirth() {
    _rebirthsLeft--;
    _timer = REBIRTH_TIME;
    _perfectMult = 1;

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
    if (isPerfect && _perfectMult < 5) _perfectMult = Math.min(5, _perfectMult + 0.5);

    const hitBonus = Math.round(timeAdd * 80 * _perfectMult);
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
    _hideUI();

    // Save best
    const finalScore = score;
    const prevBest   = parseInt(OG.storage.getItem('orbitSync_phoenixBest') || '0', 10);
    if (finalScore > prevBest) OG.storage.setItem('orbitSync_phoenixBest', String(finalScore));

    const mins = Math.floor(_elapsed / 60);
    const secs = Math.floor(_elapsed % 60);
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    if (typeof stopBossDrone === 'function') stopBossDrone();
    if (typeof stopLastLifeDrone === 'function') stopLastLifeDrone();
    if (typeof updateMusicState === 'function') updateMusicState(1, false);

    // Brief flash before overlay
    const col = reason === 'survived' ? '#ff9a46' : '#ff3333';
    pulseBrightness(2.2, 200);
    createShockwave(col, 40);

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
      ui.title.innerText = reason === 'survived' ? 'PHOENIX ENDURED' : 'INCINERATED';
      if (ui.subtitle) {
        ui.subtitle.innerText = '';
      }
      // Reuse existing run-score display
      const runScoreEl = ui.runScoreDisplay;
      if (runScoreEl) runScoreEl.innerText = finalScore;
      const runStatsBlock = ui.runStatsBlock;
      if (runStatsBlock) runStatsBlock.style.display = 'block';
      // Store time survived for display
      const nearMissEl = ui.nearMissMsg;
      if (nearMissEl) {
        nearMissEl.innerText = `SURVIVED ${timeStr}`;
        nearMissEl.style.display = 'block';
      }
    }, reason === 'survived' ? 900 : 350);
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
    score           = 0;

    _showUI();
    _updateUI();

    // First wave spawns after boss intro finishes (intro calls spawnTargets which
    // we reroute to phoenix-boss.spawnWave)
  }

  function stop() {
    _active = false;
    _hideUI();
  }

  function isActive() { return _active; }

  // ─── EXPORTS ─────────────────────────────────────────────────────────────
  OG.systems.phoenixBoss = {
    start,
    stop,
    tick,
    spawnWave,
    onTargetHit,
    onMiss,
    endRun,
    isActive
  };

})(window);
