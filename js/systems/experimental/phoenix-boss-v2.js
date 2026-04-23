(function initPhoenixBossV2System(window, OG) {
  'use strict';

  // ─── CONFIG V2 ───────────────────────────────────────────────────────────
  const BONUS_LIFE_AT   = 60;    // earn +1 life at this total elapsed (seconds)
  const FIGHT_END_AT    = 120;   // the fight ends at 120 seconds (VICTORY)
  const WRATH_WARN_LEAD = 2200;  // ms before wrath fires, start warning strobe

  // Wrath pulse: how often (ms) the boss reverses all zones by phase index
  const WRATH_INTERVAL = [0, 14000, 9000, 6000, 4000, 3000];

  // Phase thresholds (total elapsed seconds since run start)
  const PHASES = [
    // EMBER is intentionally the onboarding phase before the shell goes fully hostile.
    { name: 'EMBER',    threshold: 0,   speed: 0.0049, zoneBase: Math.PI / 5.8,  types: ['ember', 'ember'],                              reverseChance: 0 },
    { name: 'BURN',     threshold: 25,  speed: 0.0085, zoneBase: Math.PI / 7.0,  types: ['ember', 'ember', 'ghost'],                     reverseChance: 0.30 },
    { name: 'INFERNO',  threshold: 50,  speed: 0.012,  zoneBase: Math.PI / 8.8,  types: ['ember', 'ember', 'ghost', 'inferno'],           reverseChance: 0.50, blackout: { duration: 1300, interval: 7000, firstAt: 2500 } },
    { name: 'ASH',      threshold: 80,  speed: 0.016,  zoneBase: Math.PI / 11.5, types: ['ember', 'ember', 'ghost', 'inferno', 'ash'],    reverseChance: 0.60, blackout: { duration: 1600, interval: 4500, firstAt: 1000 } },
    { name: 'SUPERNOVA',threshold: 100, speed: 0.021,  zoneBase: Math.PI / 12,   types: ['ash', 'ash', 'ash', 'inferno'],                 reverseChance: 0.80, blackout: { duration: 800,  interval: 2000, firstAt: 500  } }
  ];

  const ZONE_COLORS       = { ember: '#ff7a1a', ghost: '#ffb85a', inferno: '#ffe570', ash: '#7a2020' };
  const ZONE_TIME_ADD     = { ember: 3, ghost: 5, inferno: 8, ash: -4 };
  const ZONE_PERFECT_BONUS = 2;
  const EMBER_FIRST_WAVE_SOFT_MULT = 0.82;
  const EMBER_FIRST_WAVE_GRACE_MS  = 900;
  const PHASE_MUSIC_INTENSITY = [1, 1, 2, 2, 3];
  const PHASE_FLAVOR = ['READ THE SHELL', 'TEMPERATURE RISING', 'ARMOR ADAPTS', 'CORRUPTED PATTERN', 'CRITICAL MELTDOWN'];
  const PHASE_THEME = [
    { popup: '#ff9f5d', pulse: '#ff9f5d', ambientShadow: '0 0 14px rgba(255,124,58,0.12)',  ambientFilter: 'saturate(1.02) brightness(1.00)' },
    { popup: '#ff6a2c', pulse: '#ff6a2c', ambientShadow: '0 0 18px rgba(255,72,30,0.18)',    ambientFilter: 'saturate(1.08) brightness(1.02)' },
    { popup: '#ff8c2e', pulse: '#ff8c2e', ambientShadow: '0 0 22px rgba(255,120,36,0.20)',   ambientFilter: 'saturate(1.14) contrast(1.04) brightness(1.03)' },
    { popup: '#ff3d42', pulse: '#ff3d42', ambientShadow: '0 0 26px rgba(255,50,58,0.22)',    ambientFilter: 'saturate(1.24) contrast(1.08) brightness(1.05)' },
    { popup: '#ff5b9a', pulse: '#ff5b9a', ambientShadow: '0 0 30px rgba(255,90,165,0.30)',   ambientFilter: 'saturate(1.34) contrast(1.12) brightness(1.08)' }
  ];

  // ─── STATE V2 ────────────────────────────────────────────────────────────
  let _active           = false;
  let _startAt          = 0;
  let _lastFrameAt      = 0;
  let _elapsed          = 0;
  let _phaseIdx         = 0;
  let _rebirthsLeft     = 3;
  let _bonusLifeGiven   = false;
  let _perfectMult      = 1;
  let _phoenixScore     = 0;
  let _waveSpawned      = false;
  let _waveCount        = 0;

  // Stats
  let _perfectHits      = 0;
  let _totalHits        = 0;
  let _missCount        = 0;

  // Wrath
  let _wrathActive      = false;
  let _wrathEndsAt      = 0;
  let _wrathNextAt      = 0;
  let _wrathWarned      = false;  // pre-warning strobe fired

  // DPS tracking — rolling 5s window
  let _dpsLog           = [];     // [{t: ms, dmg: number}]

  // V2 Specific State
  let _coreEl           = null;
  let _milestones       = { 300: false, 800: false, 1500: false };

  // Supernova core collapse
  let _collapseNextWave = 0;      // wave count when next collapse fires
  let _collapseInProgress = false;

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  function _phase()   { return PHASES[_phaseIdx] || PHASES[PHASES.length - 1]; }
  function _el(id)    { return document.getElementById(id); }

  // ─── DPS TRACKER ─────────────────────────────────────────────────────────
  function _recordDamage(dmg) {
    _dpsLog.push({ t: performance.now(), dmg });
  }

  function _getDPS() {
    const now = performance.now();
    _dpsLog = _dpsLog.filter(e => now - e.t < 5000);
    const total = _dpsLog.reduce((s, e) => s + e.dmg, 0);
    return Math.round(total / 5);
  }

  // ─── V2 UI CORE ──────────────────────────────────────────────────────────
  function _createCore() {
    if (!_coreEl) {
      _coreEl = document.createElement('div');
      _coreEl.id = 'phoenixCoreObjV2';
      _coreEl.style.cssText = `
        position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: 80px; height: 80px; border-radius: 50%;
        background: radial-gradient(circle, #fff6c2 0%, #ffe570 14%, #ff7a1a 41%, #641010 82%, rgba(0,0,0,0) 100%);
        box-shadow: 0 0 64px rgba(255,56,0,0.82), 0 0 14px rgba(255,120,40,0.55), inset 0 0 34px rgba(255,255,255,0.98), inset 0 0 18px rgba(255,120,0,0.45);
        pointer-events: none; z-index: 7;
        transition: transform 0.08s ease, background 0.3s ease, box-shadow 0.2s ease;
        mix-blend-mode: normal; isolation: isolate; filter: none; opacity: 0;
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
    _coreEl.dataset.pulsing = 'true';
    _coreEl.style.transform = `translate(-50%, -50%) scale(${scale})`;
    if (pulseColor) {
      _coreEl.style.boxShadow = `0 0 88px ${pulseColor}, 0 0 16px rgba(255,160,70,0.45), inset 0 0 54px #ffffff, inset 0 0 20px rgba(255,110,0,0.45)`;
    }
    setTimeout(() => {
      if (_coreEl) {
        _coreEl.style.transform = `translate(-50%, -50%) scale(1)`;
        _coreEl.style.boxShadow = `0 0 64px rgba(255,56,0,0.82), 0 0 14px rgba(255,120,40,0.55), inset 0 0 34px rgba(255,255,255,0.98), inset 0 0 18px rgba(255,120,0,0.45)`;
        _coreEl.dataset.pulsing = 'false';
      }
    }, 250);
  }

  function _updateCorePos() {
    if (_coreEl && _active && typeof centerObj !== 'undefined') {
      _coreEl.style.left = `${centerObj.x}px`;
      _coreEl.style.top  = `${centerObj.y}px`;
      if (_coreEl.dataset.pulsing !== 'true') {
        // Faster heartbeat as phase escalates, plus lives-based urgency
        const lifeStress = Math.max(0, (3 - _rebirthsLeft) * 0.003);
        const rate = 0.008 + (_phaseIdx * 0.002) + lifeStress;
        const beat = 1 + 0.08 * Math.sin(performance.now() * rate);
        _coreEl.style.transform = `translate(-50%, -50%) scale(${beat})`;
      }
    }
  }

  function _showMilestoneUI(text, color) {
    createPopup(centerObj.x, centerObj.y + 100, 'CHEST UNLOCKED!', color);
    createPopup(centerObj.x, centerObj.y + 120, text, color);
    createShockwave(color, 80);
    pulseBrightness(1.5, 300);
  }

  function _applyPhaseAmbientVisuals() {
    if (typeof canvas === 'undefined' || !canvas || !canvas.style || _wrathActive) return;
    const theme = PHASE_THEME[_phaseIdx] || PHASE_THEME[0];
    canvas.style.boxShadow = theme.ambientShadow;
    canvas.style.filter    = theme.ambientFilter;
  }

  function _updateUI() {
    // DAMAGE OUTPUT (with rolling DPS)
    const timerEl = _el('phoenixTimer');
    if (timerEl) {
      const dps = _getDPS();
      const dpsDisplay = dps > 0 ? `<span style="font-size:0.38em; opacity:0.5; letter-spacing:1px;">~${dps}/s</span>` : '';
      timerEl.innerHTML = `<span style="font-size:0.5em; opacity:0.75; letter-spacing:2px;">DAMAGE OUTPUT</span><br/>${Math.floor(_phoenixScore).toLocaleString()} ${dpsDisplay}`;
      timerEl.style.lineHeight  = '0.9';
      timerEl.style.textShadow  = '0 0 20px #ff3300';
      timerEl.classList.remove('phoenix-timer-critical');
    }

    // Phase name — no beta label
    const phaseEl = _el('phoenixPhaseName');
    if (phaseEl) {
      phaseEl.textContent = _phase().name;
      const theme = PHASE_THEME[_phaseIdx] || PHASE_THEME[0];
      phaseEl.style.color         = theme.popup;
      phaseEl.style.textShadow    = `0 0 14px ${theme.pulse}`;
      phaseEl.style.letterSpacing = _phaseIdx >= 3 ? '2.5px' : '2px';
    }

    // Multiplier
    const multEl = _el('phoenixMult');
    if (multEl) {
      multEl.textContent = `×${_perfectMult.toFixed(1)}`;
      multEl.style.color = _perfectMult >= 3 ? '#ffe570' : (_perfectMult >= 2 ? '#ff9a46' : '#ffffff');
    }

    // Lives — pulse speed tied to lives remaining
    const livesEl = _el('phoenixLives');
    if (livesEl) {
      let dots = '';
      for (let i = 0; i < _rebirthsLeft; i++) dots += '◆';
      for (let i = _rebirthsLeft; i < 4; i++) dots += '◇';
      livesEl.textContent = dots;
      // Urgent pulse when low
      livesEl.style.color = _rebirthsLeft <= 1 ? '#ff3344' : (_rebirthsLeft <= 2 ? '#ff9a46' : '#ffffff');
      livesEl.style.textShadow = _rebirthsLeft <= 1 ? '0 0 12px rgba(255,50,50,0.8)' : 'none';
    }

    // Phase progress bar
    const barEl = _el('phoenixPhaseBar');
    if (barEl) {
      const cur    = PHASES[_phaseIdx];
      const next   = PHASES[_phaseIdx + 1];
      const from   = cur.threshold;
      const to     = next ? next.threshold : FIGHT_END_AT;
      const pct    = Math.min(100, Math.max(0, ((_elapsed - from) / (to - from)) * 100));
      const theme  = PHASE_THEME[_phaseIdx] || PHASE_THEME[0];
      barEl.style.width      = `${pct}%`;
      barEl.style.background = theme.popup;
      barEl.style.boxShadow  = `0 0 8px ${theme.pulse}`;
    }
  }

  // ─── WRATH WARNING ────────────────────────────────────────────────────────
  function _fireWrathWarning() {
    _wrathWarned = true;
    createPopup(centerObj.x, centerObj.y - 70, '⚠ WRATH INCOMING', '#ff3300');
    _pulseCore(1.3, '#ff3300');
    // Apply strobe class to canvas for CSS-driven flicker
    if (typeof canvas !== 'undefined' && canvas) {
      canvas.classList.add('wrath-warning');
      setTimeout(() => { if (canvas) canvas.classList.remove('wrath-warning'); }, 1600);
    }
  }

  // ─── SUPERNOVA CORE COLLAPSE ──────────────────────────────────────────────
  function _triggerCoreCollapse() {
    if (!_active || _collapseInProgress) return;
    _collapseInProgress = true;

    createPopup(centerObj.x, centerObj.y - 96, '☢ CORE COLLAPSE', '#ff00cc');
    createPopup(centerObj.x, centerObj.y - 72, 'ORBITS REVERSED', '#ffffff');
    _pulseCore(0.05, '#ff00cc');
    pulseBrightness(2.8, 250);

    if (typeof canvas !== 'undefined' && canvas && canvas.style) {
      canvas.style.boxShadow = '0 0 56px rgba(255,0,180,0.55)';
    }

    // Reverse all active zones immediately
    for (let wi = 0; wi < targets.length; wi++) {
      if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) {
        targets[wi].moveSpeed *= -1;
      }
    }
    if (typeof vibrate === 'function') vibrate([120, 40, 200]);

    // Re-expand 800ms later with a burst
    setTimeout(() => {
      if (!_active) { _collapseInProgress = false; return; }
      _pulseCore(2.4, '#ff00ff');
      createShockwave('#ff00ff', 80);
      createShockwave('#ffffff', 110);
      createParticles(centerObj.x, centerObj.y, '#ff00ff', 70);
      pulseBrightness(1.9, 180);
      if (typeof canvas !== 'undefined' && canvas && canvas.style) {
        const theme = PHASE_THEME[4];
        setTimeout(() => { if (canvas && canvas.style && _active) canvas.style.boxShadow = theme.ambientShadow; }, 120);
      }
      _collapseInProgress = false;
    }, 800);

    // Schedule next collapse (every 5 waves, so check in spawnWave)
    _collapseNextWave = _waveCount + 5;
  }

  // ─── SPAWN V2 ────────────────────────────────────────────────────────────
  function spawnWave() {
    targets = [];
    if (OG.systems && OG.systems.splitControl) OG.systems.splitControl.resetSplitFamilyState();

    _waveCount++;
    const ph = _phase();
    const spd = ph.speed + Math.min(0.004, _elapsed * 0.00004);
    const isFirstEmberWave = (_phaseIdx === 0 && _waveCount === 1);
    const waveDriftMult    = isFirstEmberWave ? EMBER_FIRST_WAVE_SOFT_MULT : 1;

    // Asymmetric wave every 5th wave (after wave 5) — breaks rotational symmetry
    const isAsymmetric = (_waveCount % 5 === 0 && _waveCount > 5);

    // SUPERNOVA Core Collapse trigger
    if (_phaseIdx >= 4 && _waveCount >= _collapseNextWave && _collapseNextWave > 0) {
      setTimeout(_triggerCoreCollapse, 400); // slight delay so wave spawns first
    }

    // V2 Special Mechanics
    const isMeteor     = _waveCount > 3  && _waveCount % 7 === 0;
    const isSolarFlare = _waveCount > 5  && _waveCount % 7 === 4;

    if (isMeteor) {
      createPopup(centerObj.x, centerObj.y - 84, '☄ METEOR SWARM!', '#ffaa00');
      createPopup(centerObj.x, centerObj.y - 62, 'BREAK THE SHIELD', 'rgba(255,200,100,0.7)');
      _pulseCore(1.6, '#ffaa00');
      let t = buildTarget(0, Math.PI, {
        color: '#ffaa00', active: true, hp: 5, isBossShield: false, moveSpeed: 0.015
      });
      t.phoenixTarget = true; t.phoenixType = 'meteor';
      t.meteorHp = 5;
      targets.push(t);

    } else if (isSolarFlare) {
      createPopup(centerObj.x, centerObj.y - 84, '☀ SOLAR FLARE!', '#ffe570');
      createPopup(centerObj.x, centerObj.y - 62, 'FIND THE REAL ONE', 'rgba(255,220,100,0.7)');
      _pulseCore(1.6, '#ffe570');
      const totalTargets = 8;
      const safeIdx = Math.floor(Math.random() * totalTargets);
      const spread  = (Math.PI * 2) / totalTargets;
      const offset  = Math.random() * Math.PI;

      for (let i = 0; i < totalTargets; i++) {
        const type = (i === safeIdx) ? 'inferno' : 'ash';
        const a    = normalizeAngle(offset + i * spread);
        let t = buildTarget(a, Math.PI / 6, {
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
      const types    = ph.types;
      const total    = types.length;
      const spread   = (Math.PI * 2) / total;
      const offset   = Math.random() * Math.PI * 2;

      // Warn player if wave contains ash decoys
      const hasAsh = types.includes('ash');
      if (hasAsh) {
        setTimeout(() => {
          if (_active) {
            createPopup(centerObj.x, centerObj.y - 70, '⚠ ASH IN PATTERN', '#ff3333');
            createPopup(centerObj.x, centerObj.y - 48, 'DARK ZONES = DEATH', 'rgba(200,80,80,0.8)');
            _pulseCore(1.25, '#ff3333');
          }
        }, 80);
      }

      types.forEach((type, idx) => {
        // Asymmetric jitter — up to ±20% of the zone spread
        const jitter = isAsymmetric ? (Math.random() - 0.5) * (spread * 0.4) : 0;
        const a      = normalizeAngle(offset + idx * spread + jitter);
        const isRev  = (Math.random() < ph.reverseChance);
        const size   = type === 'inferno' ? baseSize * 0.52 : type === 'ghost' ? baseSize * 0.82 : baseSize;
        const spd2   = (isRev ? -spd : spd) * waveDriftMult;
        const t      = buildTarget(a, size, {
          color: ZONE_COLORS[type], active: true, hp: 1, isBossShield: false, moveSpeed: spd2
        });

        t.phoenixTarget = true; t.phoenixType = type;
        if (type === 'ghost') { t.alpha = 0; t.isGhost = true; t.ghostVisible = false; }
        if (type === 'ash')   { t.isAshDecoy = true; }
        if (type === 'inferno') { t.isInferno = true; }
        targets.push(t);
      });
    }

    if (levelData) levelData.blackout = ph.blackout ? { ...ph.blackout } : null;
    _waveSpawned = true;

    if (isFirstEmberWave) {
      setTimeout(() => {
        if (!_active || _phaseIdx !== 0) return;
        for (let i = 0; i < targets.length; i++) {
          const t = targets[i];
          if (!t || !t.active || !t.phoenixTarget || t.phoenixType !== 'ember' || !t.moveSpeed) continue;
          t.moveSpeed /= EMBER_FIRST_WAVE_SOFT_MULT;
        }
      }, EMBER_FIRST_WAVE_GRACE_MS);
    }

    // Init collapse counter on first SUPERNOVA wave
    if (_phaseIdx >= 4 && _collapseNextWave === 0) {
      _collapseNextWave = _waveCount + 5;
    }
  }

  function _updateGhosts(frameNow) {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.isGhost || !t.active) continue;
      // Tighter ghost cycle: 1400ms visible + 900ms invisible = 2300ms total
      const cycle  = 2300;
      const phase  = (frameNow % cycle) / cycle;
      const fadeIn = 0.13;   // 0→300ms  : fade in
      const hold   = 0.609;  // 300→1400ms: fully visible
      const fadeOut= 0.739;  // 1400→1700ms: fade out
      // 1700→2300ms: ghost (invisible), alpha at 0.08 shimmer hint for veteran tracking

      let alpha;
      const wasVisible = t.ghostVisible;
      if (phase < fadeIn) {
        alpha = phase / fadeIn;
        t.ghostVisible = false;
      } else if (phase < hold) {
        alpha = 1;
        t.ghostVisible = true;
      } else if (phase < fadeOut) {
        alpha = 1 - (phase - hold) / (fadeOut - hold);
        t.ghostVisible = alpha > 0.55;
      } else {
        // Shimmer hint — barely perceptible but trackable with experience
        alpha = 0.08;
        t.ghostVisible = false;
      }
      t.alpha = alpha;
      // Whoosh sound on first moment of becoming visible each cycle
      if (!wasVisible && t.ghostVisible && typeof soundZoneGhostAppear === 'function') {
        soundZoneGhostAppear();
      }
    }
  }

  function _doPhaseTransition(newIdx) {
    const ph    = PHASES[newIdx];
    const theme = PHASE_THEME[newIdx] || PHASE_THEME[0];
    const col   = theme.popup;
    const musicIntensity  = PHASE_MUSIC_INTENSITY[newIdx] || 1;
    const transitionBurst = 2.6 + (newIdx * 0.20);

    // ── Cinematic slow-mo moment ──────────────────────────────────
    if (typeof targetTimeScale !== 'undefined') {
      targetTimeScale = 0.12;
      setTimeout(() => { if (_active && typeof targetTimeScale !== 'undefined') targetTimeScale = 1.0; }, 560);
    }

    pulseBrightness(transitionBurst, 500);
    _pulseCore(2.1 + newIdx * 0.08, theme.pulse);
    if (newIdx === 4 && typeof soundBossDefeated === 'function') soundBossDefeated();

    createPopup(centerObj.x, centerObj.y - 100, `PHASE ${newIdx + 1}: ${ph.name}`, col);
    createPopup(centerObj.x, centerObj.y - 70,  PHASE_FLAVOR[newIdx] || 'MUTATION SPIKE', '#ffffff');
    createShockwave(col, 40); createShockwave('#ffffff', 80);
    createParticles(centerObj.x, centerObj.y, col, 100 + newIdx * 16);

    if (typeof canvas !== 'undefined' && canvas.style) {
      canvas.style.boxShadow = `inset 0 0 180px ${col}, inset 0 0 260px rgba(38,0,0,0.64), 0 0 70px ${col}`;
      setTimeout(() => {
        if (!canvas || !canvas.style) return;
        canvas.style.boxShadow = theme.ambientShadow;
        canvas.style.filter    = theme.ambientFilter;
      }, 180);
    }
    setTimeout(() => { if (_active) pulseBrightness(1.7, 180); }, 80);
    setTimeout(() => { if (_active) _pulseCore(1.3, '#ffb14d'); }, 140);
    if (typeof vibrate === 'function') vibrate([80, 50, 150]);
    if (typeof soundFlameBurst === 'function') soundFlameBurst();
    if (typeof updateMusicState === 'function') updateMusicState(musicIntensity, true);
    // Phase 2 audio: layer new sound into the drone per phase
    if (typeof phoenixPhaseAudio === 'function') phoenixPhaseAudio(newIdx);
    // SUPERNOVA: full orchestral climax hit
    if (newIdx === 4 && typeof soundSupernovaHit === 'function') {
      setTimeout(function() { if (_active) soundSupernovaHit(); }, 120);
    }

    if (typeof computeWorldShape === 'function')   window.currentWorldShape   = computeWorldShape({ boss: 'phoenix' });
    if (typeof computeWorldPalette === 'function') window.currentWorldPalette = computeWorldPalette({ boss: 'phoenix' });

    stageClearHoldUntil = performance.now() + 1100;
    setTimeout(() => { if (_active) spawnWave(); }, 1100);
  }

  function _triggerRebirth() {
    _rebirthsLeft--;
    _perfectMult = 1;
    lives = _rebirthsLeft;
    if (typeof ui !== 'undefined' && ui.lives) ui.lives.innerText = lives;

    createPopup(centerObj.x, centerObj.y - 56, 'FATAL STRIKE!', '#ff0000');
    _pulseCore(1.8, '#ff0000');
    pulseBrightness(2.2, 300);
    if (typeof vibrate === 'function') vibrate([50, 25, 80]);

    if (_rebirthsLeft < 0) {
      endRun('death');
      return;
    }

    stageClearHoldUntil = performance.now() + 600;
    setTimeout(() => { if (_active) spawnWave(); }, 600);
  }

  // ─── TICK ────────────────────────────────────────────────────────────────
  function tick(frameNow) {
    if (!_active || typeof isPlaying === 'undefined' || !isPlaying) return;
    const dt = Math.min(0.1, (frameNow - _lastFrameAt) / 1000);
    _lastFrameAt = frameNow;

    if (frameNow > stageClearHoldUntil) {
      _elapsed += dt;
    }

    _updateCorePos();

    // VICTORY: survived 120s
    if (_elapsed >= FIGHT_END_AT) {
      endRun('victory');
      return;
    }

    // Phase progression
    let newPhaseIdx = 0;
    for (let i = PHASES.length - 1; i >= 0; i--) {
      if (_elapsed >= PHASES[i].threshold) { newPhaseIdx = i; break; }
    }
    if (newPhaseIdx > _phaseIdx) {
      _phaseIdx = newPhaseIdx;
      _doPhaseTransition(newPhaseIdx);
    }

    // ── Wrath system with pre-warning ─────────────────────────────
    if (_phaseIdx >= 1) {
      if (!_wrathActive && frameNow >= _wrathNextAt) {
        // Fire wrath
        _wrathActive  = true;
        _wrathWarned  = false;
        _wrathEndsAt  = frameNow + 1800;
        _wrathNextAt  = frameNow + WRATH_INTERVAL[_phaseIdx] + 1800;
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) {
            targets[wi].moveSpeed *= -1;
          }
        }
        createPopup(centerObj.x, centerObj.y - 52, 'WRATH PULSE', '#ff3300');
        _pulseCore(1.6, '#ff3300');
        if (typeof canvas !== 'undefined') canvas.style.boxShadow = '0 0 30px rgba(255,80,0,0.45)';
        pulseBrightness(1.6, 120);

      } else if (_wrathActive && frameNow >= _wrathEndsAt) {
        _wrathActive = false;
        _wrathWarned = false;
        _applyPhaseAmbientVisuals();
        for (let wi = 0; wi < targets.length; wi++) {
          if (targets[wi].phoenixTarget && targets[wi].active && targets[wi].moveSpeed !== 0) {
            targets[wi].moveSpeed *= -1;
          }
        }

      } else if (!_wrathActive && !_wrathWarned && (_wrathNextAt - frameNow) <= WRATH_WARN_LEAD && (_wrathNextAt - frameNow) > 0) {
        // Pre-warning strobe 2.2s before wrath fires
        _fireWrathWarning();
      }
    }

    _applyPhaseAmbientVisuals();
    _updateGhosts(frameNow);

    // V2 MILESTONES
    score = _phoenixScore;
    if (score >= 300  && !_milestones[300])  { _milestones[300]  = true; _showMilestoneUI('RARE CHEST',      '#00e5ff'); }
    if (score >= 800  && !_milestones[800])  { _milestones[800]  = true; _showMilestoneUI('EPIC CHEST',      '#b157ff'); }
    if (score >= 1500 && !_milestones[1500]) { _milestones[1500] = true; _showMilestoneUI('LEGENDARY CHEST', '#ffd84d'); }

    if (!_bonusLifeGiven && _elapsed >= BONUS_LIFE_AT) {
      _bonusLifeGiven = true;
      _rebirthsLeft   = Math.min(_rebirthsLeft + 1, 4);
      createPopup(centerObj.x, centerObj.y - 60, '◆ REBIRTH EARNED', '#ff9a46');
    }

    if (_waveSpawned) {
      let anyActive = false;
      for (let i = 0; i < targets.length; i++) {
        if (targets[i].phoenixTarget && targets[i].active) { anyActive = true; break; }
      }
      if (!anyActive) {
        _waveSpawned = false;
        const pauseMs = _phaseIdx >= 4 ? 200 : (_phaseIdx >= 2 ? 260 : (_phaseIdx === 1 ? 380 : 480));
        stageClearHoldUntil = performance.now() + pauseMs;
        setTimeout(() => { if (_active) spawnWave(); }, pauseMs);
      }
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
        createPopup(hitX, hitY - 20, `${t.meteorHp} HITS LEFT`, '#ffffff');
        return true;
      }
      const dmg = 500 * _perfectMult;
      _phoenixScore += dmg;
      _recordDamage(dmg);
      if (isPerfect) _perfectMult = Math.min(5, _perfectMult + 1);
      t.active = false;
      createShockwave('#ffaa00', 50);
      createPopup(hitX, hitY - 30, 'SHATTERED!', '#ffffff');
      _updateUI();
      return true;
    }

    // Ghost — must be at least partially visible to score
    if (type === 'ghost' && !t.ghostVisible) {
      createPopup(hitX, hitY - 20, 'TOO DARK', '#ffb85a');
      onMiss();
      return false;
    }

    // Ash decoy — instant rebirth (brutal but telegraphed with prior warning)
    if (type === 'ash') {
      _perfectMult = 1;
      t.active     = false;
      createPopup(hitX, hitY - 28, '💀 ASH DECOY', '#ff3333');
      createPopup(hitX, hitY - 52, 'REBIRTH CONSUMED', 'rgba(200,80,80,0.8)');
      _pulseCore(1.1, '#ff3333');
      if (typeof soundFail === 'function') soundFail();
      _triggerRebirth();
      _updateUI();
      return true;
    }

    // Standard hit scoring
    const baseDmg  = (type === 'inferno' ? 120 : (type === 'ghost' ? 80 : 50));
    const perfMult = isPerfect ? 2.5 : 1.0;
    const dmg      = Math.round(baseDmg * perfMult * _perfectMult);

    if (isPerfect) {
      _perfectHits++;
      if (_perfectMult < 5) _perfectMult = Math.min(5, _perfectMult + 0.5);
    }
    _totalHits++;

    _phoenixScore += dmg;
    _recordDamage(dmg);
    t.active = false;

    createParticles(hitX, hitY, t.color, 14);
    createShockwave(t.color, 22);
    createPopup(hitX, hitY - 20, `+${dmg}`, t.color);
    if (isPerfect) createPopup(hitX, hitY - 44, 'PERFECT', '#ffffff');
    if (typeof markScoreCoinDirty === 'function') markScoreCoinDirty();
    _updateUI();
    return true;
  }

  function onMiss() {
    _missCount++;
    _perfectMult = 1;
    if (typeof canvas !== 'undefined') {
      canvas.style.boxShadow = '0 0 24px rgba(255,70,0,0.45)';
      setTimeout(() => { canvas.style.boxShadow = 'none'; }, 130);
    }
    _triggerRebirth();
    _updateUI();
  }

  // ─── END RUN ─────────────────────────────────────────────────────────────
  function endRun(reason) {
    if (!_active) return;
    _active      = false;
    _waveSpawned = false;
    _wrathActive = false;
    _hideCore();

    const gameUI = _el('phoenixGameUI');           if (gameUI)  gameUI.style.display  = 'none';
    const timer  = _el('phoenixTimer');            if (timer)   timer.style.display   = 'none';
    const phase  = _el('phoenixPhaseName');        if (phase)   phase.style.display   = 'none';
    const mult   = _el('phoenixMult');             if (mult)    mult.style.display    = 'none';
    const livesEl= _el('phoenixLives');            if (livesEl) livesEl.style.display = 'none';
    const barEl  = _el('phoenixPhaseBar');         if (barEl)   barEl.style.display   = 'none';

    let finalScore = score;
    if (reason === 'victory') {
      finalScore += 5000;                 // base completion
      finalScore += _rebirthsLeft * 1000; // lives bonus
      finalScore += _perfectHits * 10;    // precision bonus
      finalScore -= _missCount * 50;      // miss penalty
    }
    finalScore = Math.max(0, finalScore);

    const mins = Math.floor(_elapsed / 60);
    const secs = Math.floor(_elapsed % 60);

    let lootTier, lootCoins, lootColor;
    if (reason === 'victory') {
      lootTier = 'MYTHIC';    lootCoins = 150; lootColor = '#ff00ff';
    } else if (finalScore >= 1500) {
      lootTier = 'LEGENDARY'; lootCoins = 80;  lootColor = '#ffd84d';
    } else if (finalScore >= 800) {
      lootTier = 'EPIC';      lootCoins = 40;  lootColor = '#b157ff';
    } else {
      lootTier = 'RARE';      lootCoins = 20;  lootColor = '#00e5ff';
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
        const isVictory = reason === 'victory';
        ui.title.innerText = isVictory ? 'PHOENIX VANQUISHED' : 'INCINERATED';
        ui.title.classList.add('run-title');
        ui.title.style.color = isVictory ? '#ff00ff' : '#ff4422';

        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard) summaryCard.style.display = 'block';

        if (ui.runScoreDisplay) ui.runScoreDisplay.innerText = Math.floor(finalScore);

        const comboLabel = document.querySelector('#summaryCard .summary-row:nth-child(3) .summary-label');
        if (comboLabel) comboLabel.innerText = 'PERFECTS';
        if (ui.runComboDisplay) ui.runComboDisplay.innerText = _perfectHits;

        const runCoinsBox = document.getElementById('runCoinsBox');
        if (runCoinsBox) runCoinsBox.style.display = 'flex';
        if (ui.runCoins) {
          ui.runCoins.style.color = lootColor;
          ui.runCoins.innerText   = `+${lootCoins}`;
        }
        const coinsLabel = runCoinsBox && runCoinsBox.querySelector('.summary-label');
        if (coinsLabel) { coinsLabel.innerText = `${lootTier} LOOT`; coinsLabel.style.color = lootColor; }

        const hint = document.getElementById('runCoinsHint');
        if (hint) {
          hint.style.display = 'block';
          hint.innerText = isVictory
            ? `THE PHOENIX FALLS — ${_rebirthsLeft} LIVES REMAINING`
            : `SURVIVED ${mins}:${String(secs).padStart(2, '0')} · PHASE ${_phaseIdx + 1}: ${_phase().name}`;
        }

        if (ui.btn) {
          // Thematic labels — no more "TEST V2 AGAIN"
          ui.btn.innerText = isVictory ? 'CHALLENGE AGAIN' : 'RISE AGAIN';
          ui.btn.onclick = function() {
            ui.overlay.style.display = 'none';
            ui.title.classList.remove('run-title');
            if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
            startPhoenixRunV2();
          };
        }

        const menuBtn = document.getElementById('menuBtn');
        if (menuBtn) {
          menuBtn.style.display = 'inline-block';
          menuBtn.onclick = function() {
            if (audioCtx && typeof soundUIClick === 'function') soundUIClick();
            if (typeof returnToMenu === 'function') returnToMenu();
          };
        }
      }
    }, 1000);
  }

  // ─── INIT ────────────────────────────────────────────────────────────────
  function start() {
    if (_active) return;

    if (typeof levelData === 'undefined' || !levelData || levelData.boss !== 'phoenix') {
      levelData = {
        id: 'phoenix-trial', title: 'Phoenix Trial',
        hitsNeeded: 999999, speed: 0.0135, lives: 2, boss: 'phoenix',
        moveSpeed: 0, reverse: false, shrink: null, blackout: null, text: ''
      };
    }

    _active           = true;
    _startAt          = performance.now();
    _lastFrameAt      = performance.now();
    _elapsed          = 0;
    _phaseIdx         = 0;
    _rebirthsLeft     = 3;
    _bonusLifeGiven   = false;
    _perfectMult      = 1;
    _phoenixScore     = 0;
    _waveSpawned      = false;
    _waveCount        = 0;
    _perfectHits      = 0;
    _totalHits        = 0;
    _missCount        = 0;
    _wrathActive      = false;
    _wrathWarned      = false;
    _wrathNextAt      = performance.now() + 10000;
    _milestones       = { 300: false, 800: false, 1500: false };
    _dpsLog           = [];
    _collapseNextWave = 0;
    _collapseInProgress = false;
    if (typeof score !== 'undefined') score = 0;

    const gameUI = _el('phoenixGameUI'); if (gameUI)  { gameUI.style.display  = 'flex'; }
    const timer  = _el('phoenixTimer');  if (timer)   { timer.style.display   = ''; }
    const phase  = _el('phoenixPhaseName'); if (phase){ phase.style.display   = ''; }
    const mult   = _el('phoenixMult');   if (mult)    { mult.style.display    = ''; }
    const livesEl= _el('phoenixLives');  if (livesEl) { livesEl.style.display = ''; }
    const barEl  = _el('phoenixPhaseBar'); if (barEl) { barEl.style.display   = ''; }

    _createCore();
    _updateUI();

    stageClearHoldUntil = performance.now() + 1500;
    setTimeout(() => { if (_active) spawnWave(); }, 1500);

    if (typeof updateMusicState === 'function') updateMusicState(1, true);
    if (typeof startBossDrone === 'function') startBossDrone();
  }

  function stop() {
    _active      = false;
    _waveSpawned = false;
    _wrathActive = false;
    _wrathWarned = false;
    _wrathEndsAt = 0;
    _wrathNextAt = 0;
    _phaseIdx    = 0;
    _hideCore();

    ['phoenixGameUI','phoenixTimer','phoenixPhaseName','phoenixMult','phoenixLives','phoenixPhaseBar'].forEach(id => {
      const el = _el(id);
      if (el) el.style.display = 'none';
    });

    if (typeof canvas !== 'undefined' && canvas && canvas.style) {
      canvas.style.boxShadow = 'none';
      canvas.style.filter    = '';
      canvas.classList.remove('wrath-warning');
    }
    _collapseInProgress = false;
    // Clean up any extra audio layers added during phases 2-4
    if (typeof cleanupPhoenixAudio === 'function') cleanupPhoenixAudio();
  }

  function isActive()    { return _active; }
  function getPhaseIdx() { return _phaseIdx; }

  // ─── EXPORT ──────────────────────────────────────────────────────────────
  OG.systems.phoenixBossV2 = { start, stop, tick, spawnWave, onTargetHit, onMiss, endRun, isActive, getPhaseIdx };

})(window, window.OG);