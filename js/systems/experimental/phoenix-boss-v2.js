(function initPhoenixBossV2System(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  // ─── CONFIG V2 ───────────────────────────────────────────────────────────
  const TIMER_START   = 30;    // seconds to begin with
  const REBIRTH_TIME  = 20;    // timer reset on rebirth
  const BONUS_LIFE_AT = 60;    // earn +1 life at this total elapsed (seconds)
  const SCORE_PER_SEC = 25;    // score points per second survived (increased for V2)
  const FIGHT_END_AT  = 120;   // The fight ends at 120 seconds (VICTORY)

  // Wrath pulse: how often (ms) the boss reverses all zones by phase index
  const WRATH_INTERVAL = [0, 14000, 9000, 6000, 4000, 3000];

  // Phase thresholds (total elapsed seconds since run start)
  const PHASES = [
    { name: 'EMBER',   threshold: 0,   speed: 0.010, zoneBase: Math.PI / 5.8, types: ['ember', 'ember'], reverseChance: 0 },
    { name: 'BURN',    threshold: 25,  speed: 0.015, zoneBase: Math.PI / 7.0, types: ['ember', 'ember', 'ghost'], reverseChance: 0.30 },
    { name: 'INFERNO', threshold: 50,  speed: 0.021, zoneBase: Math.PI / 8.8, types: ['ember', 'ember', 'ghost', 'inferno'], reverseChance: 0.50, blackout: { duration: 1300, interval: 7000, firstAt: 2500 } },
    { name: 'ASH',     threshold: 80,  speed: 0.029, zoneBase: Math.PI / 11.5, types: ['ember', 'ember', 'ghost', 'inferno', 'ash'], reverseChance: 0.60, blackout: { duration: 1600, interval: 4500, firstAt: 1000 } },
    { name: 'SUPERNOVA', threshold: 100, speed: 0.038, zoneBase: Math.PI / 12, types: ['ash', 'ash', 'ash', 'inferno'], reverseChance: 0.80, blackout: { duration: 800, interval: 2000, firstAt: 500 } }
  ];

  const ZONE_COLORS = { ember: '#ff7a1a', ghost: '#ffb85a', inferno: '#ffe570', ash: '#7a2020' };
  const ZONE_TIME_ADD = { ember: 3, ghost: 5, inferno: 8, ash: -4 };
  const ZONE_PERFECT_BONUS = 2; // Extra seconds on perfect (buffed in V2 to reward precision/speed)

  // ─── STATE V2 ────────────────────────────────────────────────────────────
  let _active        = false;
  let _startAt       = 0;
  let _lastFrameAt   = 0;
  let _elapsed       = 0;
  let _timer         = TIMER_START;
  let _phaseIdx      = 0;
  let _rebirthsLeft  = 3; // Start with 3 lives for max completion rewards
  let _bonusLifeGiven = false;
  let _perfectMult   = 1;
  let _phoenixScore  = 0;
  let _waveSpawned   = false;
  let _waveCount     = 0;
  // Stats
  let _perfectHits   = 0;
  let _totalHits     = 0;
  let _missCount     = 0;
  let _wrathActive   = false;
  let _wrathEndsAt   = 0;
  let _wrathNextAt   = 0;
  
  // V2 Specific State
  let _coreEl        = null;
  let _milestones    = { 300: false, 800: false, 1500: false };

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function _phase()   { return PHASES[_phaseIdx] || PHASES[PHASES.length-1]; }
  function _dimMult() { return Math.max(0.20, Math.exp(-_elapsed * 0.007)); } // slightly less harsh dimming for fixed duration fight
  function _el(id)    { return document.getElementById(id); }

  // ─── V2 UI CORE ──────────────────────────────────────────────────────────
  function _createCore() {
    if (!_coreEl) {
      _coreEl = document.createElement('div');
      _coreEl.id = 'phoenixCoreObjV2';
      _coreEl.style.cssText = `
        position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: 160px; height: 160px; border-radius: 50%;
        background: radial-gradient(circle, #ffe570 0%, #ff7a1a 40%, #7a2020 80%, transparent 100%);
        box-shadow: 0 0 80px #ff3300, inset 0 0 40px #ffffff;
        pointer-events: none; z-index: 5;
        transition: transform 0.1s ease, background 0.3s ease;
        mix-blend-mode: screen; opacity: 0;
      `;
      document.body.appendChild(_coreEl);
    }
    _coreEl.style.opacity = '1';
    _coreEl.style.display = 'block';
  }

  function _hideCore() {
    if (_coreEl) {
       _coreEl.style.opacity = '0';
       setTimeout(() => { if (!_active) _coreEl.style.display = 'none'; }, 300);
    }
  }

  function _pulseCore(scale = 1.3, pulseColor = null) {
    if (!_coreEl) return;
    _coreEl.dataset.pulsing = "true";
    _coreEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
    if (pulseColor) _coreEl.style.boxShadow = `0 0 100px ${pulseColor}, inset 0 0 60px #ffffff`;
    setTimeout(() => {
      if (_coreEl) {
        _coreEl.style.transform = `translate(-50%, -50%) scale(1)`;
        _coreEl.style.boxShadow = `0 0 80px #ff3300, inset 0 0 40px #ffffff`;
        _coreEl.dataset.pulsing = "false";
      }
    }, 250);
  }

  function _updateCorePos() {
    if (_coreEl && _active && typeof centerObj !== 'undefined') {
      _coreEl.style.left = `${centerObj.x}px`;
      _coreEl.style.top = `${centerObj.y}px`;
      if (_coreEl.dataset.pulsing !== "true") {
         const beat = 1 + 0.08 * Math.sin(performance.now() * (_phaseIdx >= 4 ? 0.015 : 0.008));
         _coreEl.style.transform = `translate(-50%, -50%) scale(${beat})`;
      }
    }
  }

  function _showMilestoneUI(text, color) {
    createPopup(centerObj.x, centerObj.y + 100, "CHEST UNLOCKED!", color);
    createPopup(centerObj.x, centerObj.y + 120, text, color);
    createShockwave(color, 80);
    pulseBrightness(1.5, 300);
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
    if (phaseEl) phaseEl.textContent = _phase().name + " (V2 BETA)";

    const multEl = _el('phoenixMult');
    if (multEl) {
      multEl.textContent = `×${_perfectMult.toFixed(1)}`;
      multEl.style.color = _perfectMult >= 3 ? '#ffe570' : (_perfectMult >= 2 ? '#ff9a46' : '#ffffff');
    }

    const livesEl = _el('phoenixLives');
    if (livesEl) {
      let dots = '';
      for (let i = 0; i < _rebirthsLeft; i++) dots += '◆';
      for (let i = _rebirthsLeft; i < 4; i++) dots += '◇';
      livesEl.textContent = dots;
    }
  }

  // ─── SPAWN V2 ────────────────────────────────────────────────────────────
  function spawnWave() {
    targets = [];
    if (OG.systems && OG.systems.splitControl) OG.systems.splitControl.resetSplitFamilyState();

    _waveCount++;
    const ph = _phase();
    const spd = ph.speed + Math.min(0.01, _elapsed * 0.0001);

    // V2 Mechanics
    const isMeteor = _waveCount > 3 && _waveCount % 7 === 0;
    const isSolarFlare = _waveCount > 5 && _waveCount % 7 === 4;

    if (isMeteor) {
       // METEOR SWARM: Multi-tap shield
       createPopup(centerObj.x, centerObj.y - 80, "METEOR SWARM!", "#ffaa00");
       _pulseCore(1.6, '#ffaa00');
       let t = buildTarget(0, Math.PI, {
           color: '#ffaa00', active: true, hp: 5, isBossShield: false, moveSpeed: 0.015
       });
       t.phoenixTarget = true; t.phoenixType = 'meteor';
       t.meteorHp = 5;
       targets.push(t);
    } else if (isSolarFlare) {
       // SOLAR FLARE: 1 safe target, many decoys
       createPopup(centerObj.x, centerObj.y - 80, "SOLAR FLARE!", "#ffe570");
       _pulseCore(1.6, '#ffe570');
       const totalTargets = 8;
       const safeIdx = Math.floor(Math.random() * totalTargets);
       const spread = (Math.PI * 2) / totalTargets;
       const offset = Math.random() * Math.PI;

       for(let i=0; i<totalTargets; i++) {
          const type = (i === safeIdx) ? 'inferno' : 'ash';
          const a = normalizeAngle(offset + i * spread);
          let t = buildTarget(a, Math.PI/6, {
             color: ZONE_COLORS[type], active: true, hp: 1, isBossShield: false, moveSpeed: 0.025
          });
          t.phoenixTarget = true; t.phoenixType = type;
          if (type === 'ash') t.isAshDecoy = true;
          if (type === 'inferno') t.isInferno = true;
          targets.push(t);
       }
    } else {
       // Standard Phoenix Wave
       const baseSize = ph.zoneBase;
       const types = ph.types;
       const total = types.length;
       const spread = (Math.PI * 2) / total;
       const offset = Math.random() * Math.PI * 2;

       types.forEach((type, idx) => {
          const a = normalizeAngle(offset + idx * spread);
          const isRev = (Math.random() < ph.reverseChance);
          const size = type === 'inferno' ? baseSize * 0.52 : type === 'ghost' ? baseSize * 0.82 : baseSize;
          const spd2 = isRev ? -spd : spd;
          const t = buildTarget(a, size, {
             color: ZONE_COLORS[type], active: true, hp: 1, isBossShield: false, moveSpeed: spd2
          });

          t.phoenixTarget = true; t.phoenixType = type;
          if (type === 'ghost') { t.alpha = 0; t.isGhost = true; t.ghostVisible = false; }
          if (type === 'ash') t.isAshDecoy = true;
          if (type === 'inferno') t.isInferno = true;
          targets.push(t);
       });
    }

    if (levelData) levelData.blackout = ph.blackout ? { ...ph.blackout } : null;
    _waveSpawned = true;
  }

  function _updateGhosts(frameNow) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isGhost || !t.active) continue;
      const cycle = 2200;
      const phase = (frameNow % cycle) / cycle;
      let alpha;
      if (phase < 0.30) { alpha = phase / 0.30; t.ghostVisible = alpha > 0.55; }
      else if (phase < 0.60) { alpha = 1; t.ghostVisible = true; }
      else { alpha = 1 - (phase - 0.60) / 0.40; t.ghostVisible = alpha > 0.55; }
      t.alpha = alpha;
    }
  }

  function _doPhaseTransition(newIdx) {
    const ph = PHASES[newIdx];
    const cols = ['#ff7a1a', '#ff5226', '#ffaa00', '#ff3333', '#ffffff'];
    const col  = cols[newIdx] || '#ff7a1a';

    pulseBrightness(3.0, 500);
    _pulseCore(2.0, col);
    if (newIdx === 4 && typeof soundBossDefeated === 'function') soundBossDefeated(); // SUPERNOVA epic sound!

    createPopup(centerObj.x, centerObj.y - 80, `PHASE ${newIdx + 1}: ${ph.name}`, col);
    createShockwave(col, 40); createShockwave('#ffffff', 80);
    createParticles(centerObj.x, centerObj.y, col, 100);

    if (typeof canvas !== 'undefined' && canvas.style) {
      canvas.style.boxShadow = `inset 0 0 150px ${col}, 0 0 100px ${col}`;
      setTimeout(() => { canvas.style.boxShadow = 'none'; }, 400);
    }
    if (typeof vibrate === 'function') vibrate([80, 50, 150]);
    if (typeof soundFlameBurst === 'function') soundFlameBurst();

    if (typeof computeWorldShape === 'function') window.currentWorldShape = computeWorldShape({ boss: 'phoenix' });
    if (typeof computeWorldPalette === 'function') window.currentWorldPalette = computeWorldPalette({ boss: 'phoenix' });

    stageClearHoldUntil = performance.now() + 1000; // longer pause for V2 phases
    setTimeout(() => { if (_active) spawnWave(); }, 1000);
  }

  function _triggerRebirth() {
    _rebirthsLeft--;
    _timer = REBIRTH_TIME;
    _perfectMult = 1;
    lives = _rebirthsLeft;
    if (typeof ui !== 'undefined' && ui.lives) ui.lives.innerText = lives;

    createPopup(centerObj.x, centerObj.y - 56, 'REBIRTH', '#ff9a46');
    _pulseCore(1.5, '#ff3300');
    pulseBrightness(1.8, 200);
    if (typeof vibrate === 'function') vibrate([50, 25, 80]);

    stageClearHoldUntil = performance.now() + 600;
    setTimeout(() => { if (_active) spawnWave(); }, 600);
  }

  // ─── TICK ────────────────────────────────────────────────────────────────
  function tick(frameNow) {
    if (!_active || typeof isPlaying === 'undefined' || !isPlaying) return;
    const dt = Math.min(0.1, (frameNow - _lastFrameAt) / 1000);
    _lastFrameAt = frameNow;

    if (frameNow > stageClearHoldUntil) {
      _timer -= dt;
      _elapsed += dt;
    }

    _updateCorePos();

    // VICTORY CONDITION: Surviving to 120s!
    if (_elapsed >= FIGHT_END_AT) {
       endRun('victory');
       return;
    }

    let newPhaseIdx = 0;
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (_elapsed >= PHASES[i].threshold) { newPhaseIdx = i; break; }
    }
    if (newPhaseIdx > _phaseIdx) {
      _phaseIdx = newPhaseIdx;
      _doPhaseTransition(newPhaseIdx);
    }

    if (_phaseIdx >= 1) {
      if (!_wrathActive && frameNow >= _wrathNextAt) {
        _wrathActive = true;
        _wrathEndsAt = frameNow + 1800;
        _wrathNextAt = frameNow + WRATH_INTERVAL[_phaseIdx] + 1800;
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) targets[wi].moveSpeed *= -1;
        }
        createPopup(centerObj.x, centerObj.y - 52, 'WRATH PULSE', '#ff3300');
        _pulseCore(1.6, '#ff3300');
        if (typeof canvas !== 'undefined') canvas.style.boxShadow = 'inset 0 0 50px #ff3300';
        pulseBrightness(1.6, 120);
      } else if (_wrathActive && frameNow >= _wrathEndsAt) {
        _wrathActive = false;
        if (typeof canvas !== 'undefined') canvas.style.boxShadow = 'none';
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) targets[wi].moveSpeed *= -1;
        }
      }
    }

    _updateGhosts(frameNow);

    // V2 MILESTONES
    score = _phoenixScore + Math.floor(_elapsed * SCORE_PER_SEC);
    if (score >= 300 && !_milestones[300]) { _milestones[300] = true; _showMilestoneUI("RARE CHEST", "#00e5ff"); }
    if (score >= 800 && !_milestones[800]) { _milestones[800] = true; _showMilestoneUI("EPIC CHEST", "#b157ff"); }
    if (score >= 1500 && !_milestones[1500]) { _milestones[1500] = true; _showMilestoneUI("LEGENDARY CHEST", "#ffd84d"); }

    if (!_bonusLifeGiven && _elapsed >= BONUS_LIFE_AT) {
      _bonusLifeGiven = true;
      _rebirthsLeft = Math.min(_rebirthsLeft + 1, 4);
      createPopup(centerObj.x, centerObj.y - 60, '◆ REBIRTH EARNED', '#ff9a46');
    }

    if (_waveSpawned) {
      let anyActive = false;
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].phoenixTarget && targets[i].active) { anyActive = true; break; }
      }
      if (!anyActive) {
        _waveSpawned = false;
        const pauseMs = _phaseIdx >= 2 ? 280 : 450;
        stageClearHoldUntil = performance.now() + pauseMs;
        setTimeout(() => { if (_active) spawnWave(); }, pauseMs);
      }
    }

    if (_timer <= 0) {
      if (_rebirthsLeft > 0) _triggerRebirth();
      else endRun('timeout');
    }
    _updateUI();
  }

  // ─── HIT HANDLER ─────────────────────────────────────────────────────────
  function onTargetHit(t, hitX, hitY, isPerfect) {
    const type = t.phoenixType;

    if (type === 'meteor') {
       t.meteorHp--;
       createParticles(hitX, hitY, '#ffaa00', 10);
       _pulseCore(1.2, '#ffffff');
       if (t.meteorHp > 0) {
          createPopup(hitX, hitY - 20, `${t.meteorHp} LEFT`, '#ffffff');
          _timer += 0.5; // micro addition per tap
          return true;
       }
       // Dead!
       _timer += 8;
       _phoenixScore += 500 * _perfectMult;
       if (isPerfect) _perfectMult = Math.min(5, _perfectMult + 1);
       t.active = false;
       createShockwave('#ffaa00', 50); createPopup(hitX, hitY - 30, 'SHATTERED!', '#ffffff');
       _updateUI();
       return true;
    }

    if (type === 'ghost' && !t.ghostVisible) {
      createPopup(hitX, hitY - 20, 'TOO DARK', '#ffb85a');
      onMiss();
      return false;
    }

    if (type === 'ash') {
      _timer = Math.max(0, _timer + ZONE_TIME_ADD.ash);
      _perfectMult = 1;
      t.active = false;
      createPopup(hitX, hitY - 24, 'ASH DECOY', '#ff3333');
      _pulseCore(1.1, '#ff3333');
      if (typeof soundFail === 'function') soundFail();
      _updateUI();
      return true;
    }

    const baseAdd = ZONE_TIME_ADD[type] || 3;
    const perfAdd = isPerfect ? ZONE_PERFECT_BONUS : 0;
    const timeAdd = Math.max(0.5, Math.round((baseAdd + perfAdd) * _dimMult() * 10) / 10);

    _timer += timeAdd;
    if (isPerfect) { _perfectHits++; if (_perfectMult < 5) _perfectMult = Math.min(5, _perfectMult + 0.5); }
    _totalHits++;

    _phoenixScore += Math.round(timeAdd * 12 * _perfectMult); 
    t.active = false;

    createParticles(hitX, hitY, t.color, 14);
    createShockwave(t.color, 22);

    const addLabel = `+${timeAdd.toFixed(1)}s`;
    createPopup(hitX, hitY - 20, addLabel, t.color);
    if (isPerfect) createPopup(hitX, hitY - 44, 'PERFECT', '#ffffff');
    if (typeof markScoreCoinDirty === 'function') markScoreCoinDirty();
    _updateUI();
    return true;
  }

  function onMiss() {
    _missCount++;
    _perfectMult = 1;
    _timer = Math.max(0, _timer - 2.0); // harsher penalty in V2
    if (typeof canvas !== 'undefined') {
       canvas.style.boxShadow = 'inset 0 0 40px #ff3300';
       setTimeout(() => { canvas.style.boxShadow = 'none'; }, 130);
    }
    _updateUI();
  }

  // ─── END RUN ─────────────────────────────────────────────────────────────
  function endRun(reason) {
    if (!_active) return;
    _active = false;
    _hideUI();
    _hideCore();

    let finalScore = score;
    // V2 BONUS SCORING
    // Reward Speed (DPS), Precision (Misses), and Lives remaining
    if (reason === 'victory') {
       finalScore += 5000; // Base completion
       finalScore += _rebirthsLeft * 1000; 
       finalScore += _perfectHits * 10;
       finalScore -= _missCount * 50; 
    }

    finalScore = Math.max(0, finalScore);
    const mins = Math.floor(_elapsed / 60);
    const secs = Math.floor(_elapsed % 60);

    let lootTier, lootCoins, lootColor;
    if (reason === 'victory') {
       lootTier = 'MYTHIC'; lootCoins = 150; lootColor = '#ff00ff';
    } else if (finalScore >= 1500) {
       lootTier = 'LEGENDARY'; lootCoins = 80; lootColor = '#ffd84d';
    } else if (finalScore >= 800) {
       lootTier = 'EPIC'; lootCoins = 40; lootColor = '#b157ff';
    } else {
       lootTier = 'RARE'; lootCoins = 20; lootColor = '#00e5ff';
    }

    if (typeof globalCoins !== 'undefined') {
      globalCoins += lootCoins;
      if (typeof saveData === 'function') saveData();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
    }

    pulseBrightness(3.0, 400);
    setTimeout(() => {
      if (typeof isPlaying !== 'undefined') isPlaying = false;
      if (typeof ui !== 'undefined') {
        ui.overlay.style.display = 'flex';
        ui.title.innerText = reason === 'victory' ? 'PHOENIX VANQUISHED' : 'INCINERATED';
        ui.title.classList.add('run-title');
        ui.title.style.color = reason === 'victory' ? '#ff00ff' : '#ff4422';
        
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard) summaryCard.style.display = 'block';

        if (ui.runScoreDisplay) ui.runScoreDisplay.innerText = Math.floor(finalScore);
        const comboLabel = document.querySelector('#summaryCard .summary-row:nth-child(3) .summary-label');
        if (comboLabel) comboLabel.innerText = 'PERFECTS';
        if (ui.runComboDisplay) ui.runComboDisplay.innerText = _perfectHits;

        const runCoinsBox = document.getElementById('runCoinsBox');
        if (runCoinsBox) runCoinsBox.style.display = 'flex';
        if (ui.runCoins) { ui.runCoins.style.color = lootColor; ui.runCoins.innerText = `+${lootCoins}`; }
        const coinsLabel = runCoinsBox && runCoinsBox.querySelector('.summary-label');
        if (coinsLabel) { coinsLabel.innerText = `${lootTier} LOOT`; coinsLabel.style.color = lootColor; }

        const hint = document.getElementById('runCoinsHint');
        if (hint) {
           hint.style.display = 'block';
           hint.innerText = reason === 'victory' 
             ? `V2 BETA CLEARED! ${_rebirthsLeft} LIVES LEFT` 
             : `SURVIVED ${mins}:${String(secs).padStart(2,'0')}`;
        }

        if (ui.btn) {
          ui.btn.innerText = 'TEST V2 AGAIN';
          ui.btn.onclick = function() {
            ui.overlay.style.display = 'none';
            ui.title.classList.remove('run-title');
            if (typeof audioCtx!=='undefined'&&audioCtx) soundUIClick();
            startPhoenixRunV2();
          };
        }

        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
          menuBtn.style.display = 'inline-block';
          menuBtn.onclick = function () {
            if (audioCtx && typeof soundUIClick === 'function') soundUIClick();
            if (typeof returnToMenu === 'function') returnToMenu();
          };
        }
      }
    }, 1000);
  }

  // ─── INIT ────────────────────────────────────────────────────────────────
  function start() {
    // Only works if the game isn't already playing another mode
    if (typeof isPlaying !== 'undefined' && isPlaying) return;
    
    // Reset environment
    if (typeof levelData !== 'undefined') {
      levelData = { id: 'phoenix-trial', boss: 'phoenix', speed: 1.0 }; // Mock level
    }

    _active = true;
    _startAt = performance.now();
    _lastFrameAt = performance.now();
    _elapsed = 0; _timer = TIMER_START; _phaseIdx = 0;
    _rebirthsLeft = 3; _bonusLifeGiven = false;
    _perfectMult = 1; _phoenixScore = 0; _waveSpawned = false; _waveCount = 0;
    _perfectHits = 0; _totalHits = 0; _missCount = 0;
    _wrathActive = false; _wrathNextAt = performance.now() + 10000;
    _milestones = { 300: false, 800: false, 1500: false };
    if (typeof score !== 'undefined') score = 0;

    const gameUI = _el('phoenixGameUI');
    if (gameUI) gameUI.style.display = 'flex';
    
    _createCore();
    _updateUI();
    
    // Initial Wave
    stageClearHoldUntil = performance.now() + 1500;
    setTimeout(() => { if (_active) spawnWave(); }, 1500);

    // Audio setup
    if (typeof updateMusicState === 'function') updateMusicState(1, true);
    if (typeof startBossDrone === 'function') startBossDrone();
  }

  function stop() { _active = false; _hideCore(); const el = _el('phoenixGameUI'); if(el) el.style.display = 'none'; }
  function isActive() { return _active; }
  function getPhaseIdx() { return _phaseIdx; }

  // ─── EXPORT ──────────────────────────────────────────────────────────────
  OG.systems.phoenixBossV2 = { start, stop, tick, spawnWave, onTargetHit, onMiss, endRun, isActive, getPhaseIdx };

})(window);
