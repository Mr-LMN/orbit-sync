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
    _launchCampaign();
  }

  function changeWorld(dir) {
    menuSelectedWorld += dir;
    const totalWorlds = 5;
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
      4: { name: isUnlocked ? 'WORLD 4' : '? ? ? ?', sub: isUnlocked ? 'GLITCH PROTOCOL' : 'COMPLETE WORLD 3 TO UNLOCK', color: isUnlocked ? '#b157ff' : 'rgba(255,255,255,0.2)' },
      5: { name: isUnlocked ? 'WORLD 5' : '? ? ? ?', sub: isUnlocked ? 'THE VOID' : 'CLEAR WORLD 4', color: isUnlocked ? '#a8d8ff' : 'rgba(255,255,255,0.15)' }
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
    if (rightArrow) rightArrow.disabled = menuSelectedWorld >= 5;
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
    _launchBestScore();
  }

  function _launchHardMode() {
    const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
    if (menuSelectedWorld > maxUnlocked) return;
    if (typeof OrbitGame !== 'undefined') OrbitGame.state.legacy.hardMode = true;

    // Hard Mode Augment Tutorial Check
    const hasSeenHardModeTutorial = OG.storage.getItem('orbitSync_hm_tutorial') === '1';

    if (!hasSeenHardModeTutorial) {
      OG.storage.setItem('orbitSync_hm_tutorial', '1');
      showAugmentPicker(true);
    } else {
      _startHardModeGameplay();
    }
  }

  function _startHardModeGameplay() {
    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) augOverlay.style.display = 'none';

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
    _launchHardMode();
  }


  function selectAugment(augmentId, cost = 0, isTutorial = false) {
    // Check if player can afford it
    if (augmentId && cost > 0 && !isTutorial) {
      const currentCoins = typeof globalCoins !== 'undefined' ? Math.floor(globalCoins) : 0;
      if (currentCoins < cost) return; // Can't afford — button should be disabled anyway
      // Deduct coins
      if (typeof globalCoins !== 'undefined') {
        globalCoins -= cost;
        if (typeof saveData === 'function') saveData();
        if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
      }
    }
    const augOverlay = document.getElementById('augmentSelect');
    if (augOverlay) augOverlay.style.display = 'none';
    if (typeof window.setActiveAugment === 'function') window.setActiveAugment(augmentId || null);

    if (isTutorial) {
        _startHardModeGameplay();
    }
  }

  function showAugmentPicker(isTutorial = false) {
    const augOverlay = document.getElementById('augmentSelect');
    if (!augOverlay) return;

    const augTitle = document.getElementById('augTitle');
    const augSub = document.getElementById('augSub');
    const augSkipBtn = document.getElementById('augSkipBtn');

    if (isTutorial) {
        if (augTitle) augTitle.innerText = "HARD MODE UNLOCKED";
        if (augSub) augSub.innerText = "YOUR FIRST AUGMENT IS ON US";
        if (augSkipBtn) augSkipBtn.style.display = 'none';

        // Disable everything except coin surge
        const costs = { 'wide_sync': 25, 'coin_surge': 35, 'iron_shield': 50 };
        Object.entries(costs).forEach(([id, cost]) => {
          const btn = document.getElementById('aug-' + id);
          if (btn) {
              if (id === 'coin_surge') {
                  btn.disabled = false;
                  btn.style.opacity = '1';
                  btn.onclick = () => selectAugment('coin_surge', 0, true);
                  btn.querySelector('.aug-cost').innerText = 'FREE';
                  btn.style.boxShadow = '0 0 20px #ffaa00';
              } else {
                  btn.disabled = true;
                  btn.style.opacity = '0.3';
                  btn.onclick = null;
              }
          }
        });

    } else {
        if (augTitle) augTitle.innerText = "CHOOSE YOUR BOOST";
        if (augSub) augSub.innerText = "ONE PER RUN · SPEND COINS TO ACTIVATE";
        if (augSkipBtn) augSkipBtn.style.display = 'block';

        // Update coin display
        const coinDisplay = document.getElementById('augmentCoinDisplay');
        const currentCoins = typeof globalCoins !== 'undefined' ? Math.floor(globalCoins) : 0;
        if (coinDisplay) coinDisplay.innerText = currentCoins;

        // Restore buttons and costs
        const costs = { 'wide_sync': 25, 'coin_surge': 35, 'iron_shield': 50 };
        Object.entries(costs).forEach(([id, cost]) => {
          const btn = document.getElementById('aug-' + id);
          if (btn) {
              btn.style.opacity = '1';
              btn.disabled = currentCoins < cost;
              btn.onclick = () => selectAugment(id, cost);
              btn.querySelector('.aug-cost').innerText = '🪙 ' + cost;
              btn.style.boxShadow = 'none';
          }
        });
    }

    augOverlay.style.display = 'flex';
  }

  function showChallengePreview() {
    const el = document.getElementById('challengePreview');
    if (!el) return;
    el.style.display = 'flex';
    const countdown = document.getElementById('challengeCountdown');
    if (countdown) countdown.innerText = 'SEASON 1 ACTIVE';
  }

  function startAbyssRun() {
    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    const el = document.getElementById('challengePreview');
    if (el) el.style.display = 'none';

    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;

    // Setup Abyss level data
    window.levelData = {
        id: 'abyss',
        title: 'The Abyss',
        hitsNeeded: 999999, // Endless
        speed: 0.040,
        lives: 3,
        boss: 'abyss',
        moveSpeed: 0.02,
        reverse: true,
        text: 'Survive the endless Abyss.'
    };

    currentLevelIdx = -1; // -1 denotes Abyss
    resetRunState();
    ui.score.innerText = '0';
    updateStreakUI();
    markScoreCoinDirty(true);
    if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';

    setOverlayState('cinematic');

    // Instead of loadLevel, we set things manually for Abyss
    stageHits = 0;
    bossPhase = 1;
    isBossPhaseTwo = false;
    window.abyssDepth = 0; // custom depth tracker

    // Start Boss intro sequence
    if (OrbitGame.entities && OrbitGame.entities.boss) {
        OrbitGame.entities.boss.triggerBossIntro();
    }

    OrbitGame.core.loop.startMainLoop();
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
  OG.ui.menus.showAugmentPicker = showAugmentPicker;
  OG.ui.menus.selectAugment = selectAugment;
  OG.ui.menus.showLockedWorldPreview = showLockedWorldPreview;
  window.startBestScoreRun = startBestScoreRun;
  window.startHardModeRun = startHardModeRun;
  window.showAugmentPicker = showAugmentPicker;
  window.selectAugment = selectAugment;
  OG.ui.menus.showChallengePreview = showChallengePreview;
  window.showChallengePreview = showChallengePreview;
  window.startAbyssRun = startAbyssRun;

  OG.ui.menus.showCampaignView = showCampaignView;
  OG.ui.menus.hideCampaignView = hideCampaignView;
  window.showCampaignView = showCampaignView;
  window.hideCampaignView = hideCampaignView;
})(window);
