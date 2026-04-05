(function initMenus(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.menus = OG.ui.menus || {};

  function toggleShop(show) {
    return OG.ui.shop.toggleShop(show);
  }

  function toggleSettings(show) {
    return OG.ui.settings.toggleSettings(show);
  }

  function startCampaign() {
    let startLevelIdx = getStartingIndexForWorld(menuSelectedWorld);
    const stageOverrideId = OG.debug && OG.debug.stageOverrideId;
    if (stageOverrideId && Array.isArray(campaign)) {
      const overrideIdx = campaign.findIndex((stage) => stage && stage.id === stageOverrideId);
      if (overrideIdx >= 0) startLevelIdx = overrideIdx;
    }

    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;
    currentLevelIdx = startLevelIdx;
    resetRunState();
    ui.score.innerText = '0';
    ui.streak.innerText = '0';
    markScoreCoinDirty(true);
    setOverlayState('cinematic');
    loadLevel(currentLevelIdx);
    OrbitGame.core.loop.startMainLoop();
  }

  function changeWorld(dir) {
    menuSelectedWorld += dir;
    const totalWorlds = 3;
    if (menuSelectedWorld < 1) menuSelectedWorld = 1;
    if (menuSelectedWorld > totalWorlds) menuSelectedWorld = totalWorlds;
    updateWorldSelectorUI();
    const isUnlocked = menuSelectedWorld <= (Number(maxWorldUnlocked) || 1);
    if (isUnlocked) refreshMenuWorldPreview();
  }

  function updateWorldSelectorUI() {
    const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
    const isUnlocked = menuSelectedWorld <= maxUnlocked;
    const label = document.getElementById('menuWorldLabel');
    const sub = document.getElementById('menuWorldSub');
    const lock = document.getElementById('menuWorldLock');
    const playBtn = document.getElementById('menuPlayBtn');

    const worldData = {
      1: { name: 'WORLD 1', sub: 'ORBIT INIT', color: '#00ff88' },
      2: { name: 'WORLD 2', sub: 'PRISM BREAK', color: '#2ff6ff' },
      3: { name: 'WORLD 3', sub: isUnlocked ? 'RESONANCE' : '???', color: '#ffaa00' }
    };
    const wd = worldData[menuSelectedWorld] || worldData[1];

    if (label) { label.innerText = wd.name; label.style.color = isUnlocked ? wd.color : 'rgba(255,255,255,0.25)'; }
    if (sub) { sub.innerText = wd.sub; sub.style.display = 'block'; }
    if (lock) { lock.style.display = isUnlocked ? 'none' : 'block'; }
    if (playBtn) {
      playBtn.disabled = !isUnlocked;
      playBtn.style.opacity = isUnlocked ? '1' : '0.35';
      playBtn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
      playBtn.innerText = isUnlocked ? 'Play' : 'LOCKED';
    }
  }

  function startBestScoreRun() {
    const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
    if (menuSelectedWorld > maxUnlocked) return;
    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;
    // Always start from stage X-1, ignoring checkpoint
    const worldPrefix = menuSelectedWorld + '-';
    const freshIdx = campaign.findIndex(s => s && s.id && s.id.startsWith(worldPrefix));
    currentLevelIdx = freshIdx >= 0 ? freshIdx : 0;
    resetRunState();
    ui.score.innerText = '0';
    updateStreakUI();
    setOverlayState('cinematic');
    loadLevel(currentLevelIdx);
    OrbitGame.core.loop.startMainLoop();
  }

  function showChallengePreview() {
    const el = document.getElementById('challengePreview');
    if (!el) return;
    el.style.display = 'flex';
    // Calculate days until next Monday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
    const countdown = document.getElementById('challengeCountdown');
    if (countdown) {
      countdown.innerText = daysUntilMonday === 1
        ? 'UNLOCKS TOMORROW'
        : daysUntilMonday === 0 ? 'LAUNCHING TODAY'
        : `LAUNCHES IN ${daysUntilMonday} DAYS`;
    }
  }

  OG.ui.menus.toggleShop = toggleShop;
  OG.ui.menus.toggleSettings = toggleSettings;
  OG.ui.menus.startCampaign = startCampaign;
  OG.ui.menus.changeWorld = changeWorld;
  OG.ui.menus.updateWorldSelectorUI = updateWorldSelectorUI;
  OG.ui.menus.startBestScoreRun = startBestScoreRun;
  window.startBestScoreRun = startBestScoreRun;
  OG.ui.menus.showChallengePreview = showChallengePreview;
  window.showChallengePreview = showChallengePreview;
})(window);
