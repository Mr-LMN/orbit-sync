(function initBossEntity(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.boss = OG.entities.boss || {};

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

    setOverlayState('cinematic');
    setCinematicOverlayMode();
    if (ui.gameUI) ui.gameUI.style.display = 'none';

    if (isAegisIntro) {
      ui.title.innerText = 'THE AEGIS CORE';
      ui.title.style.color = '#ff3366';
      ui.subtitle.innerText = 'Break the shields. Expose the core.';

      createPopup(centerObj.x, centerObj.y - 92, 'BOSS', '#ff3366');
      setTimeout(() => createPopup(centerObj.x, centerObj.y - 56, 'BREAK', '#ffffff'), 340);
      setTimeout(() => createPopup(centerObj.x, centerObj.y - 26, 'THE', '#00e5ff'), 620);
      setTimeout(() => createPopup(centerObj.x, centerObj.y + 4, 'SHIELDS', '#00ff88'), 900);
      setTimeout(() => {
        createShockwave('#ffffff', 34);
        soundShieldBreak();
      }, 1100);
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
    }, isAegisIntro ? 2450 : 1700);
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
