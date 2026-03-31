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
      ui.bossPhase2.className = 'boss-segment active-segment';
      spawnTargets();
      startBossDrone();
      if (audioCtx) updateMusicState(multiplier, true);
      bossIntroTimeout = null;
    }, isAegisIntro ? 2850 : 1700);
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
      : 'Hold the corners. Break each prism shield.';

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
