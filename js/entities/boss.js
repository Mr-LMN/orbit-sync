(function initBossEntity(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.boss = OG.entities.boss || {};
  let introSequenceTimeouts = [];

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
    const isAegisIntro = levelData.id === '1-6' || levelData.boss === 'aegis';
    const isWorld2BossIntro = levelData.id === '2-6' && levelData.boss === 'prism';
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
        ui.subtitle.innerText = 'FACET TEST';
        createPopup(centerObj.x, centerObj.y - 72, 'ALIGNMENT', '#00e8ff');
        createShockwave('#00cfff', 26);
        pulseBrightness(1.22, 140);
      });
      queueIntroStep(1700, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'SEQUENCE';
        createPopup(centerObj.x, centerObj.y - 36, 'ALIGNMENT', '#ff4fd8');
        createPopup(centerObj.x, centerObj.y + 4, 'CALIBRATION', '#ffffff');
        createShockwave('#ff4fd8', 32);
        createShockwave('#00e8ff', 24);
        pulseBrightness(1.35, 180);
        vibrate([60, 30, 80, 30, 60]);
      });
      queueIntroStep(2800, () => {
        ui.title.innerText = 'THE PRISM';
        ui.subtitle.innerText = 'BEGIN';
        createShockwave('#ffffff', 20);
        createShockwave('#00cfff', 38);
        createShockwave('#ff4fd8', 52);
        pulseBrightness(1.6, 200);
      });
    } else {
      ui.title.innerText = 'THE PRISM';
      ui.title.style.color = '#ff3366';
      ui.subtitle.innerText = 'Hold the corners. Break each prism shield.';
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
      if (ui.bossUI) ui.bossUI.style.display = 'flex';
      ui.bossPhase1.className = 'boss-segment active-segment';
      ui.bossPhase2.className = isWorld2BossIntro ? 'boss-segment' : 'boss-segment active-segment';
      if (isWorld2BossIntro) {
        world2BossArenaRotationSpeed = world2BossTransitionFrom25 ? 0.0038 : 0.0032;
        world2BossTransitionFrom25 = false;
      }
      spawnTargets();
      startBossDrone();
      if (audioCtx) updateMusicState(multiplier, true);
      bossIntroTimeout = null;
    }, isAegisIntro ? 2850 : (isWorld2BossIntro ? 3950 : 1700));
  }

  function playBossCinematic() {
    if (!levelData.boss) return;
    setOverlayState('cinematic');
    isCinematicIntro = true;
    isPlaying = false;
    setCinematicOverlayMode();

    const bossName = levelData.boss === 'aegis' ? 'THE AEGIS CORE' : 'THE PRISM';
    const bossTagline = levelData.boss === 'aegis'
      ? 'Break the shields. Expose the core.'
      : 'ALIGNMENT // SEQUENCE';

    ui.title.innerText = bossName;
    ui.title.style.color = '#ff3366';
    ui.subtitle.innerText = bossTagline;

    triggerScreenShake(16);
    pulseBrightness(1.8, 180);
    soundShieldBreak();
    createShockwave('#ff3366', 42);
    createParticles(centerObj.x, centerObj.y, '#ff3366', 42);

    if (bossCinematicTimeout) clearTimeout(bossCinematicTimeout);
    bossCinematicTimeout = setTimeout(() => {
      ui.overlay.style.display = 'none';
      ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
      clearCinematicOverlayMode();
      isCinematicIntro = false;
      isPlaying = true;
      if (ui.gameUI) ui.gameUI.style.display = 'block';
      if (ui.bossUI) ui.bossUI.style.display = 'flex';
      ui.bossPhase1.className = 'boss-segment active-segment';
      ui.bossPhase2.className = 'boss-segment active-segment';
      spawnTargets();
      startBossDrone();
      if (audioCtx) updateMusicState(multiplier, true);
      bossCinematicTimeout = null;
    }, 1800);
  }

  OG.entities.boss.scheduleBossSpawn = scheduleBossSpawn;
  OG.entities.boss.pauseGameplayBriefly = pauseGameplayBriefly;
  OG.entities.boss.triggerBossIntro = triggerBossIntro;
  OG.entities.boss.playBossCinematic = playBossCinematic;
})(window);
