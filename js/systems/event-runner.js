(function initEventRunner(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.systems = OG.systems || {};

  function cleanupEventBossState() {
    const lockedOverlay = document.getElementById('lockedWorldOverlay');
    if (lockedOverlay) lockedOverlay.style.display = 'none';

    const phoenixGameUI = document.getElementById('phoenixGameUI');
    if (phoenixGameUI) phoenixGameUI.style.display = 'none';

    const phoenixTimer = document.getElementById('phoenixTimer');
    if (phoenixTimer) phoenixTimer.style.display = 'none';

    const phoenixPhaseName = document.getElementById('phoenixPhaseName');
    if (phoenixPhaseName) phoenixPhaseName.style.display = 'none';

    const phoenixMult = document.getElementById('phoenixMult');
    if (phoenixMult) phoenixMult.style.display = 'none';

    const phoenixLives = document.getElementById('phoenixLives');
    if (phoenixLives) phoenixLives.style.display = 'none';

    const phoenixCoreObjV2 = document.getElementById('phoenixCoreObjV2');
    if (phoenixCoreObjV2) phoenixCoreObjV2.style.display = 'none';

    if (OG.systems && OG.systems.phoenixBoss && typeof OG.systems.phoenixBoss.stop === 'function') {
      OG.systems.phoenixBoss.stop();
    }
    if (OG.systems && OG.systems.phoenixBossV2 && typeof OG.systems.phoenixBossV2.stop === 'function') {
      OG.systems.phoenixBossV2.stop();
    }
  }

  function launchBossChallenge(levelOverride) {
    console.debug('[event-runner] launchBossChallenge', levelOverride && levelOverride.title);
    cleanupEventBossState();

    if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.suspendTutorialUI === 'function') {
      OG.systems.tutorial.suspendTutorialUI();
    }
    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    document.body.classList.add('state-gameplay');
    document.body.classList.remove('state-hub');

    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;

    levelData = levelOverride;
    // Apply visual theme so ring uses phoenix colours/shape, not last campaign level
    currentWorldPalette = computeWorldPalette(levelData);
    currentWorldShape = computeWorldShape(levelData);
    currentWorldVisualTheme = getWorldVisualTheme(levelData);
    if (typeof bossPhase !== 'undefined') bossPhase = 1;
    if (typeof isBossPhaseTwo !== 'undefined') isBossPhaseTwo = false;
    if (typeof stageHits !== 'undefined') stageHits = 0;
    if (typeof canvas !== 'undefined' && canvas && canvas.style) {
      canvas.style.boxShadow = 'none';
      canvas.style.filter = '';
      // Clear stale targets and canvas buffer so previous-run content
      // doesn't bleed through the cinematic intro overlay (backdrop-filter blur).
      if (typeof targets !== 'undefined') targets = [];
      const _introCtx = canvas.getContext && canvas.getContext('2d');
      if (_introCtx) { _introCtx.fillStyle = '#07070a'; _introCtx.fillRect(0, 0, canvas.width, canvas.height); }
    }

    currentLevelIdx = -1;
    resetRunState();
    ui.score.innerText = '0';
    updateStreakUI();
    markScoreCoinDirty(true);
    // Phoenix has its own timer/phase UI — hide campaign arena info
    if (ui.arenaInfo) ui.arenaInfo.style.display = 'none';

    setOverlayState('cinematic');
    stageHits = 0;
    bossPhase = 1;
    isBossPhaseTwo = false;

    if (OrbitGame.entities && OrbitGame.entities.boss) {
      OrbitGame.entities.boss.triggerBossIntro();
    }
    OrbitGame.core.loop.startMainLoop();
  }

  function startPhoenixRun() {
    console.debug('[event-runner] startPhoenixRun');
    // Stop any previous phoenix run
    if (OrbitGame.systems && OrbitGame.systems.phoenixBoss) {
      OrbitGame.systems.phoenixBoss.stop();
    }
    if (OrbitGame.systems && OrbitGame.systems.phoenixBossV2) {
      OrbitGame.systems.phoenixBossV2.stop();
    }
    launchBossChallenge({
      id: 'phoenix',
      title: 'Phoenix Trial',
      hitsNeeded: 999999, // Phoenix manages its own termination
      speed: 0.040,       // Orb base speed (phoenix zones manage their own moveSpeed)
      lives: 2,           // Displayed lives; actual phoenix rebirths managed by phoenix-boss.js
      boss: 'phoenix',
      moveSpeed: 0,       // Phoenix zones set their own per-zone speed in spawnWave()
      reverse: false,     // Phoenix manages direction per-zone
      shrink: null,
      blackout: null,
      text: ''
    });
    // Start the phoenix boss system (runs the timer, phases, scoring)
    if (OrbitGame.systems && OrbitGame.systems.phoenixBoss) {
      OrbitGame.systems.phoenixBoss.start();
    }
  }

  function startPhoenixRunV2() {
    console.debug('[event-runner] startPhoenixRunV2');
    if (OrbitGame.systems && OrbitGame.systems.phoenixBoss) {
      OrbitGame.systems.phoenixBoss.stop();
    }
    if (OrbitGame.systems && OrbitGame.systems.phoenixBossV2) {
      OrbitGame.systems.phoenixBossV2.stop();
    }
    launchBossChallenge({
      id: 'phoenix',
      title: 'Phoenix V2 Trial',
      hitsNeeded: 999999,
      speed: 0.0135,
      lives: 2,
      boss: 'phoenix',
      moveSpeed: 0,
      reverse: false,
      shrink: null,
      blackout: null,
      text: ''
    });
    if (OrbitGame.systems && OrbitGame.systems.phoenixBossV2) {
      OrbitGame.systems.phoenixBossV2.start();
    }
  }

  // Legacy alias kept for safety
  function startAbyssRun() {
    return startPhoenixRun();
  }

  OG.systems.eventRunner = {
    launchBossChallenge,
    startPhoenixRun,
    startPhoenixRunV2,
    startAbyssRun
  };

  window.startAbyssRun = startAbyssRun;
  window.startPhoenixRun = startPhoenixRun;
  window.startPhoenixRunV2 = startPhoenixRunV2;
})(window);
