(function initMenus(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.menus = OG.ui.menus || {};

  let _pendingRunType = null;

  function toggleShop(show) {
    return OG.ui.shop.toggleShop(show);
  }

  function toggleSettings(show) {
    return OG.ui.settings.toggleSettings(show);
  }

  function _launchCampaign() {
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
    const lockedOverlay = document.getElementById('lockedWorldOverlay');
    if (lockedOverlay) lockedOverlay.style.display = 'none';
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

  function startCampaign() {
    // Show augment select overlay — actual game start happens in selectAugment()
    _pendingRunType = 'campaign';
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) {
      augOverlay.style.display = 'flex';
      return; // actual launch happens in selectAugment
    }
    _launchCampaign();
  }

  function changeWorld(dir) {
    menuSelectedWorld += dir;
    const totalWorlds = 4;
    if (menuSelectedWorld < 1) menuSelectedWorld = 1;
    if (menuSelectedWorld > totalWorlds) menuSelectedWorld = totalWorlds;
    updateWorldSelectorUI();
    const isUnlocked = menuSelectedWorld <= (Number(maxWorldUnlocked) || 1);
    if (isUnlocked) {
      refreshMenuWorldPreview();
    } else {
      showLockedWorldPreview(menuSelectedWorld);
    }
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
      3: { name: 'WORLD 3', sub: isUnlocked ? 'RESONANCE' : '???', color: '#ffaa00' },
      4: { name: isUnlocked ? 'WORLD 4' : '? ? ? ?', sub: isUnlocked ? 'GLITCH PROTOCOL' : 'COMPLETE WORLD 3 TO UNLOCK', color: isUnlocked ? '#b157ff' : 'rgba(255,255,255,0.2)' }
    };
    const wd = worldData[menuSelectedWorld] || worldData[1];

    if (label) { label.innerText = wd.name; label.style.color = isUnlocked ? wd.color : 'rgba(255,255,255,0.25)'; }
    let _subText = wd.sub;
    if (isUnlocked && typeof playerProgress !== 'undefined' && playerProgress.stageStars) {
      const _wStarIds = ['1','2','3','4','5'].map(n => `${menuSelectedWorld}-${n}`);
      const _wStars = _wStarIds.reduce((acc, id) => acc + (playerProgress.stageStars[id] || 0), 0);
      const _wMax = 15;
      if (_wStars > 0) _subText = `${wd.sub}  ${_wStars}/${_wMax}★`;
    }
    if (sub) { sub.innerText = _subText; sub.style.display = 'block'; }
    if (lock) { lock.style.display = isUnlocked ? 'none' : 'block'; }
    if (playBtn) {
      playBtn.disabled = !isUnlocked;
      playBtn.style.opacity = isUnlocked ? '1' : '0.35';
      playBtn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
      playBtn.innerText = isUnlocked ? 'Play' : 'LOCKED';
    }
    const lockedOverlay = document.getElementById('lockedWorldOverlay');
    if (lockedOverlay) {
      lockedOverlay.style.display = isUnlocked ? 'none' : 'flex';
    }
    const _hardBtn = document.getElementById('menuHardModeBtn');
    if (_hardBtn) {
      const _wStarIds = ['1','2','3','4','5'].map(n => `${menuSelectedWorld}-${n}`);
      const _wStarsTotal = typeof playerProgress !== 'undefined' && playerProgress.stageStars
        ? _wStarIds.reduce((acc, id) => acc + (playerProgress.stageStars[id] || 0), 0)
        : 0;
      const _hardUnlocked = isUnlocked && _wStarsTotal >= 10;
      _hardBtn.style.display = _hardUnlocked ? 'inline-block' : 'none';
    }

    // Dim arrows at boundaries
    const leftArrow = document.querySelector('#worldSelector .arrow-btn:first-child');
    const rightArrow = document.querySelector('#worldSelector .arrow-btn:last-child');
    if (leftArrow) leftArrow.disabled = menuSelectedWorld <= 1;
    if (rightArrow) rightArrow.disabled = menuSelectedWorld >= 4;
  }

  function _launchBestScore() {
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
    markScoreCoinDirty(true);
    if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
    setOverlayState('cinematic');
    loadLevel(currentLevelIdx);
    OrbitGame.core.loop.startMainLoop();
  }

  function startBestScoreRun() {
    _pendingRunType = 'best';
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) {
      augOverlay.style.display = 'flex';
      return;
    }
    _launchBestScore();
  }

  function _launchHardMode() {
    const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
    if (menuSelectedWorld > maxUnlocked) return;
    if (typeof OrbitGame !== 'undefined') OrbitGame.state.legacy.hardMode = true;
    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;
    const worldPrefix = menuSelectedWorld + '-';
    const freshIdx = campaign.findIndex(s => s && s.id && s.id.startsWith(worldPrefix));
    currentLevelIdx = freshIdx >= 0 ? freshIdx : 0;
    resetRunState();
    ui.score.innerText = '0';
    updateStreakUI();
    markScoreCoinDirty(true);
    if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
    document.body.classList.add('hard-mode');
    setOverlayState('cinematic');
    loadLevel(currentLevelIdx);
    OrbitGame.core.loop.startMainLoop();
  }

  function startHardModeRun() {
    _pendingRunType = 'hard';
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) {
      augOverlay.style.display = 'flex';
      return;
    }
    _launchHardMode();
  }


  function selectAugment(augmentId) {
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) augOverlay.style.display = 'none';
    if (typeof window.setActiveAugment === 'function') window.setActiveAugment(augmentId);
    if (_pendingRunType === 'campaign') _launchCampaign();
    else if (_pendingRunType === 'best') _launchBestScore();
    else if (_pendingRunType === 'hard') _launchHardMode();
    _pendingRunType = null;
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


  function showLockedWorldPreview(worldNum) {
    // Load world 1 data as base so canvas isn't blank
    const w1Idx = getStartingIndexForWorld(1);
    levelData = campaign[w1Idx] || campaign[0];
    currentWorldPalette = computeWorldPalette(levelData);
    currentWorldShape = computeWorldShape(levelData);
    currentWorldVisualTheme = getWorldVisualTheme(levelData);
    // Clear targets — locked world shows empty ring
    if (typeof targets !== 'undefined') targets = [];
  }

  OG.ui.menus.toggleShop = toggleShop;
  OG.ui.menus.toggleSettings = toggleSettings;
  OG.ui.menus.startCampaign = startCampaign;
  OG.ui.menus.changeWorld = changeWorld;
  OG.ui.menus.updateWorldSelectorUI = updateWorldSelectorUI;
  OG.ui.menus.startBestScoreRun = startBestScoreRun;
  OG.ui.menus.startHardModeRun = startHardModeRun;
  OG.ui.menus.selectAugment = selectAugment;
  OG.ui.menus.showLockedWorldPreview = showLockedWorldPreview;
  window.startBestScoreRun = startBestScoreRun;
  window.startHardModeRun = startHardModeRun;
  window.selectAugment = selectAugment;
  OG.ui.menus.showChallengePreview = showChallengePreview;
  window.showChallengePreview = showChallengePreview;
})(window);
