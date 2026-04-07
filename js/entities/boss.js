(function initBossEntity(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.boss = OG.entities.boss || {};
  let introSequenceTimeouts = [];
  function getBossDisplayMeta() {
    if (!levelData || !levelData.boss) {
      return { name: 'BOSS', tagline: 'Stay synced.' };
    }
    if (levelData.boss === 'aegis') {
      return { name: 'THE AEGIS CORE', tagline: 'Break the shields. Expose the core.' };
    }
    if (levelData.boss === 'prism') {
      return { name: 'THE PRISM', tagline: 'ALIGNMENT // SEQUENCE' };
    }
    if (levelData.boss === 'corruptor') {
      return { name: 'THE CORRUPTOR', tagline: 'IDENTIFY // DESTROY // SURVIVE' };
    }
    if (levelData.boss === 'spectre') {
      return { name: 'THE SPECTRE', tagline: 'Track real + echo. Stay composed.' };
    }
    return { name: `THE ${String(levelData.boss).toUpperCase()}`, tagline: 'Stay synced.' };
  }

  function clearIntroSequenceTimeouts() {
    if (!introSequenceTimeouts.length) return;
    introSequenceTimeouts.forEach((id) => clearTimeout(id));
    introSequenceTimeouts = [];
  }

  function queueIntroStep(delay, fn) {
    const timeoutId = setTimeout(() => {
      introSequenceTimeouts = introSequenceTimeouts.filter((id) => id !== timeoutId);
      fn();
    }, delay);
    introSequenceTimeouts.push(timeoutId);
    return timeoutId;
  }

  function scheduleBossSpawn(delay = 700) {
    if (bossSpawnTimeout) clearTimeout(bossSpawnTimeout);
    bossSpawnTimeout = setTimeout(() => {
      spawnTargets();
      bossSpawnTimeout = null;
    }, delay);
  }

  function pauseGameplayBriefly(duration = 750) {
    isPlaying = false;
    bossTransitionLock = true;
    bossPauseUntil = performance.now() + duration;
    if (bossPauseTimeout) clearTimeout(bossPauseTimeout);
    bossPauseTimeout = setTimeout(() => {
      if (performance.now() >= bossPauseUntil) {
        bossTransitionLock = false;
        isPlaying = true;
      }
      bossPauseTimeout = null;
    }, duration + 20);
  }

  function triggerBossIntro() {
    if (!levelData.boss || bossIntroPlaying) return;
    const _pbCinema = document.getElementById('pauseBtn');
    if (_pbCinema) _pbCinema.style.display = 'none';
    const isAegisIntro = levelData.id === '1-6' || levelData.boss === 'aegis';
    const isWorld2BossIntro = levelData.id === '2-6' && levelData.boss === 'prism';
    const isCorruptorIntro = levelData.boss === 'corruptor';
    bossIntroPlaying = true;
    isCinematicIntro = true;
    isPlaying = false;
    clearIntroSequenceTimeouts();

    setOverlayState('cinematic');
    setCinematicOverlayMode();
    if (ui.gameUI) ui.gameUI.style.display = 'none';

    if (isAegisIntro) {
      ui.title.style.color = '#ff3366';
      ui.title.innerText = '';
      ui.subtitle.innerText = '';
      forceHideOverlayExtras();

      const revealStart = normalizeAngle(-Math.PI / 2 - Math.PI / 8);
      const revealSize = Math.PI / 4;
      targets = [];
      for (let i = 0; i < 3; i++) {
        const revealShield = buildTarget(
          revealStart + (i * ((Math.PI * 2) / 3)),
          revealSize,
          { color: '#00e5ff', active: true, isBossShield: true, hp: 1 }
        );
        revealShield.moveSpeed = 0;
        revealShield.hitFlash = 0;
        targets.push(revealShield);
      }

      queueIntroStep(120, () => {
        ui.title.innerText = 'WORLD 1: CORE BREACH';
        ui.subtitle.innerText = 'Signal lock acquired...';
        createPopup(centerObj.x, centerObj.y - 88, 'WARNING', '#ff3366');
      });
      queueIntroStep(520, () => {
        ui.title.innerText = 'THE AEGIS CORE';
        ui.subtitle.innerText = 'Outer shields online.';
        createPopup(centerObj.x, centerObj.y - 50, 'AEGIS', '#ffffff');
        createShockwave('#00e5ff', 26);
      });
      queueIntroStep(1020, () => {
        ui.subtitle.innerText = 'Break the shields. Expose the core.';
        createPopup(centerObj.x, centerObj.y - 14, 'BREAK', '#ffffff');
        createPopup(centerObj.x, centerObj.y + 14, 'THE SHIELDS', '#00e5ff');
        createShockwave('#ffffff', 34);
        soundShieldBreak();
      });
      queueIntroStep(1450, () => {
        targets.forEach((t) => {
          if (t && t.isBossShield) {
            t.hitFlash = 1;
            t.color = '#ff3366';
          }
        });
      });
      queueIntroStep(1720, () => {
        targets = [];
      });
      vibrate([80, 40, 90, 30, 70]);
    } else if (isWorld2BossIntro) {
      ui.title.style.color = '#00e8ff';
      ui.title.innerText = '';
      ui.subtitle.innerText = '';
      forceHideOverlayExtras();

      queueIntroStep(80, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'ALIGNMENT';
        createShockwave('#00e8ff', 18);
      });
      queueIntroStep(700, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'SEQUENCE';
        createPopup(centerObj.x, centerObj.y - 72, 'SEQUENCE', '#00e8ff');
        createShockwave('#00cfff', 26);
        pulseBrightness(1.22, 140);
      });
      queueIntroStep(1700, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'BEGIN';
        createPopup(centerObj.x, centerObj.y - 36, 'ALIGNMENT', '#ff4fd8');
        createPopup(centerObj.x, centerObj.y + 4, 'SEQUENCE', '#ffffff');
        createShockwave('#ff4fd8', 32);
        createShockwave('#00e8ff', 24);
        pulseBrightness(1.35, 180);
        vibrate([60, 30, 80, 30, 60]);
      });
      queueIntroStep(2780, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'FOCUS';
        createPopup(centerObj.x, centerObj.y - 28, 'HOLD STEADY', '#dff6ff');
      });
      queueIntroStep(3780, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'ENGAGE';
        createPopup(centerObj.x, centerObj.y - 18, 'ALIGN NOW', '#ffffff');
        createShockwave('#ffffff', 20);
      });
    } else if (isCorruptorIntro) {
      ui.title.style.color = '#b157ff';
      ui.title.innerText = '';
      ui.subtitle.innerText = '';
      forceHideOverlayExtras();

      queueIntroStep(80, () => {
        ui.title.innerText = 'WORLD 4: GLITCH PROTOCOL';
        ui.subtitle.innerText = 'Signal compromised.';
        createShockwave('#b157ff', 20);
      });
      queueIntroStep(600, () => {
        ui.title.innerText = 'THE CORRUPTOR';
        ui.subtitle.innerText = 'IDENTIFY';
        createPopup(centerObj.x, centerObj.y - 72, 'IDENTIFY', '#b157ff');
        createShockwave('#b157ff', 28);
        pulseBrightness(1.3, 150);
      });
      queueIntroStep(1200, () => {
        ui.title.innerText = 'THE CORRUPTOR';
        ui.subtitle.innerText = 'DESTROY';
        createPopup(centerObj.x, centerObj.y - 38, 'DESTROY', '#cc88ff');
        createShockwave('#00ff41', 22);
        pulseBrightness(1.2, 120);
      });
      queueIntroStep(1900, () => {
        ui.title.innerText = 'THE CORRUPTOR';
        ui.subtitle.innerText = 'SURVIVE';
        createPopup(centerObj.x, centerObj.y - 18, 'SURVIVE', '#00ff41');
        createPopup(centerObj.x, centerObj.y + 18, 'IF YOU CAN', '#ffffff');
        createShockwave('#ffffff', 32);
        createShockwave('#b157ff', 44);
        pulseBrightness(1.5, 200);
        vibrate([60, 30, 80, 30, 60]);
      });
      queueIntroStep(2800, () => {
        ui.title.innerText = 'THE CORRUPTOR';
        ui.subtitle.innerText = 'ENGAGE';
      });
    } else {
      const bossMeta = getBossDisplayMeta();
      ui.title.innerText = bossMeta.name;
      ui.title.style.color = '#ff3366';
      ui.subtitle.innerText = bossMeta.tagline;
      soundShieldBreak();
      vibrate([80, 40, 80]);
    }

    if (bossIntroTimeout) clearTimeout(bossIntroTimeout);
    bossIntroTimeout = setTimeout(() => {
      clearIntroSequenceTimeouts();
      ui.overlay.style.display = 'none';
      ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
      clearCinematicOverlayMode();
      isCinematicIntro = false;
      isPlaying = true;
      bossIntroPlaying = false;
      if (ui.gameUI) ui.gameUI.style.display = 'block';
      const _pbRestore = document.getElementById('pauseBtn');
      if (_pbRestore && !inMenu) _pbRestore.style.display = 'flex';
      if (ui.bossUI) ui.bossUI.style.display = 'flex';
      ui.bossPhase1.className = 'boss-segment active-segment';
      ui.bossPhase2.className = (isWorld2BossIntro || isCorruptorIntro) ? 'boss-segment' : 'boss-segment active-segment';
      if (isWorld2BossIntro) {
        world2BossArenaRotationSpeed = world2BossTransitionFrom25 ? 0.0038 : 0.0032;
        world2BossTransitionFrom25 = false;
      }
      spawnTargets();
      startBossDrone();
      if (audioCtx) updateMusicState(multiplier, true);
      bossIntroTimeout = null;
    }, isAegisIntro ? 2850 : (isWorld2BossIntro ? 5050 : (isCorruptorIntro ? 3600 : 1700)));
  }

  function playBossCinematic() {
    if (!levelData.boss) return;
    const _pbCinema2 = document.getElementById('pauseBtn');
    if (_pbCinema2) _pbCinema2.style.display = 'none';
    setOverlayState('cinematic');
    isCinematicIntro = true;
    isPlaying = false;
    setCinematicOverlayMode();

    const bossMeta = getBossDisplayMeta();
    const bossName = bossMeta.name;
    const bossTagline = bossMeta.tagline;

    ui.title.innerText = bossName;
    ui.title.style.color = '#ff3366';
    ui.subtitle.innerText = bossTagline;

    triggerScreenShake(16);
    pulseBrightness(1.8, 180);
    soundShieldBreak();
    createShockwave('#ff3366', 42);
    createParticles(centerObj.x, centerObj.y, '#ff3366', 42);

    const _isRealBoss = levelData.boss === 'aegis' || levelData.boss === 'prism' || levelData.boss === 'corruptor';
    if (bossCinematicTimeout) clearTimeout(bossCinematicTimeout);
    bossCinematicTimeout = setTimeout(() => {
      ui.overlay.style.display = 'none';
      ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
      clearCinematicOverlayMode();
      isCinematicIntro = false;
      isPlaying = true;
      if (ui.gameUI) ui.gameUI.style.display = 'block';
      const _pbRestore = document.getElementById('pauseBtn');
      if (_pbRestore && !inMenu) _pbRestore.style.display = 'flex';
      if (_isRealBoss) {
        if (ui.bossUI) ui.bossUI.style.display = 'flex';
        ui.bossPhase1.className = 'boss-segment active-segment';
        ui.bossPhase2.className = 'boss-segment active-segment';
        startBossDrone();
        if (audioCtx) updateMusicState(multiplier, true);
      } else {
        // Non-standard boss stage (e.g. spectre/echo climax) — no boss UI, no drone, base track only
        if (ui.bossUI) ui.bossUI.style.display = 'none';
        stopBossDrone();
        if (audioCtx) updateMusicState(multiplier, false);
      }
      spawnTargets();
      bossCinematicTimeout = null;
    }, 1800);
  }

  OG.entities.boss.scheduleBossSpawn = scheduleBossSpawn;
  OG.entities.boss.pauseGameplayBriefly = pauseGameplayBriefly;
  OG.entities.boss.triggerBossIntro = triggerBossIntro;
  OG.entities.boss.playBossCinematic = playBossCinematic;
})(window);
