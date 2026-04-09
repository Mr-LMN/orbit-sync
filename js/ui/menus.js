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
    document.body.classList.add('state-gameplay');
    document.body.classList.remove('state-hub');
    ui.topBar.style.display = 'flex'; // Ensure top bar remains visible for gameplay
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

    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroTitle = document.getElementById('heroTitle');
    const heroPlayBtn = document.getElementById('heroPlayBtn');

    const worldData = {
      1: { name: 'WORLD 1', sub: 'ORBIT INIT', color: '#00ff88' },
      2: { name: 'WORLD 2', sub: 'PRISM BREAK', color: '#2ff6ff' },
      3: { name: 'WORLD 3', sub: isUnlocked ? 'RESONANCE' : '???', color: '#ffaa00' },
      4: { name: isUnlocked ? 'WORLD 4' : '? ? ? ?', sub: isUnlocked ? 'GLITCH PROTOCOL' : 'COMPLETE WORLD 3 TO UNLOCK', color: isUnlocked ? '#b157ff' : 'rgba(255,255,255,0.2)' },
      5: { name: isUnlocked ? 'WORLD 5' : '? ? ? ?', sub: isUnlocked ? 'THE VOID' : 'CLEAR WORLD 4', color: isUnlocked ? '#a8d8ff' : 'rgba(255,255,255,0.15)' }
    };
    const wd = worldData[menuSelectedWorld] || worldData[1];

    if (label) { label.innerText = wd.name; label.style.color = isUnlocked ? wd.color : 'rgba(255,255,255,0.25)'; }
    if (sub) { sub.innerText = wd.sub; sub.style.display = 'block'; }
    if (lock) { lock.style.display = isUnlocked ? 'none' : 'block'; }

    // World stars + best score display
    const starsEl     = document.getElementById('worldStarsDisplay');
    const highScoreEl = document.getElementById('worldHighScore');
    const statsRow    = document.getElementById('worldStatsRow');
    if (statsRow) statsRow.style.display = isUnlocked ? 'flex' : 'none';
    if (isUnlocked && typeof playerProgress !== 'undefined') {
      const _stageIds = ['1','2','3','4','5','6'].map(n => `${menuSelectedWorld}-${n}`);
      // World mastery stars (strict 0-3 across stages 1-5, non-boss only)
      const _starIds = _stageIds.slice(0, 5);
      const _stageStars = _starIds.map((id) => ((playerProgress.stageStars && playerProgress.stageStars[id]) || 0));
      const _completedCount = _stageStars.filter((v) => v > 0).length;
      const _allThree = _stageStars.length > 0 && _stageStars.every((v) => v >= 3);
      const _allTwo = _stageStars.length > 0 && _stageStars.every((v) => v >= 2);
      let _worldMasteryStars = 0;
      if (_allThree) _worldMasteryStars = 3;
      else if (_allTwo) _worldMasteryStars = 2;
      else if (_completedCount > 0) _worldMasteryStars = 1;
      if (starsEl) {
        starsEl.innerText = '★'.repeat(_worldMasteryStars) + '☆'.repeat(3 - _worldMasteryStars);
        starsEl.style.color = _worldMasteryStars > 0 ? wd.color : 'rgba(255,255,255,0.2)';
      }
      // Best score: max across all stages in this world
      const _best = _stageIds.reduce((max, id) => {
        const s = (playerProgress.bestScores && playerProgress.bestScores[id]) || 0;
        return Math.max(max, s);
      }, 0);
      if (highScoreEl) {
        highScoreEl.innerText = _best > 0 ? `HIGH ${_best}` : 'HIGH —';
        highScoreEl.style.color = _best > 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
      }
    } else if (starsEl) {
      starsEl.innerText = '';
    }

    // Update Campaign Progress Bar
    const progressFill = document.getElementById('campaignProgressFill');
    const progressText = document.getElementById('campaignProgressText');
    const completionPct = Math.min(100, Math.max(0, Math.floor((maxUnlocked / 5) * 100)));
    if (progressFill) {
        progressFill.style.width = `${completionPct}%`;
        progressFill.style.background = isUnlocked ? wd.color : 'rgba(255,255,255,0.2)';
        progressFill.style.boxShadow = isUnlocked ? `0 0 10px ${wd.color}` : 'none';
    }
    if (progressText) {
        progressText.innerText = `${completionPct}% COMPLETION`;
    }

    if (playBtn) {
      playBtn.disabled = !isUnlocked;
      playBtn.style.opacity = isUnlocked ? '1' : '0.35';
      playBtn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
      playBtn.innerText = isUnlocked ? 'PLAY' : 'LOCKED';
    }

    if (heroSubtitle) { heroSubtitle.innerText = `${wd.name} • ${wd.sub}`; }
    if (heroTitle) { heroTitle.innerText = wd.sub; }
    if (heroPlayBtn) {
      heroPlayBtn.disabled = !isUnlocked;
      heroPlayBtn.style.opacity = isUnlocked ? '1' : '0.35';
      heroPlayBtn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
      heroPlayBtn.innerText = isUnlocked ? 'PLAY' : 'LOCKED';
    }

    const lockedOverlay = document.getElementById('lockedWorldOverlay');
    if (lockedOverlay) {
      lockedOverlay.style.display = isUnlocked ? 'none' : 'flex';
    }
    // World accent bar + background glow theming
    const accentBar = document.getElementById('worldAccentBar');
    if (accentBar) {
      accentBar.style.background = isUnlocked ? wd.color : 'rgba(255,255,255,0.15)';
      accentBar.style.boxShadow  = isUnlocked ? `0 0 12px ${wd.color}` : 'none';
    }
    const bgGlow = document.getElementById('worldBgGlow');
    if (bgGlow) {
      bgGlow.style.background = isUnlocked
        ? `radial-gradient(circle, ${wd.color}22 0%, transparent 65%)`
        : 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)';
    }
    const worldBox = document.getElementById('worldSelector');
    if (worldBox) {
      worldBox.style.borderColor = isUnlocked ? `${wd.color}55` : 'rgba(255,255,255,0.12)';
      worldBox.style.boxShadow   = isUnlocked
        ? `0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px ${wd.color}0d, 0 0 20px ${wd.color}22`
        : '0 10px 30px rgba(0,0,0,0.6)';
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

  function switchMenuTab(tabId) {
    // Hide all views
    document.querySelectorAll('.menu-view').forEach(view => {
      view.style.display = 'none';
      view.classList.remove('active-view');
    });

    // Reset all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // Show selected view and activate nav item
    const targetView = document.getElementById(`${tabId}View`);
    const targetNav = document.getElementById(`nav-${tabId}`);

    if (targetView) {
      targetView.style.display = 'flex';
      // tiny delay to allow display:flex to apply before adding class for transition
      setTimeout(() => targetView.classList.add('active-view'), 10);
    }
    if (targetNav) {
      targetNav.classList.add('active');
    }

    // Refresh specific view data if needed
    if (tabId === 'home') {
        refreshHubUI();
    } else if (tabId === 'profile') {
        updateProfileView();
        // Render equipped sphere on profile
        if (typeof updateWorkshopUI === 'function') updateWorkshopUI();
    } else if (tabId === 'workshop') {
        if (typeof updateWorkshopUI === 'function') updateWorkshopUI();
    } else if (tabId === 'shop') {
        if (typeof updateShopUI === 'function') updateShopUI();
    }
  }

  function updateProfileView() {
      const bestScoreEl = document.getElementById('profileBestScore');
      const worldsClearedEl = document.getElementById('profileWorldsCleared');
      const totalCoinsEl = document.getElementById('profileTotalCoins');
      const equippedCoreEl = document.getElementById('profileEquippedCore');
      const premiumStatusEl = document.getElementById('profilePremiumStatus');

      if (bestScoreEl && typeof highScore !== 'undefined') bestScoreEl.innerText = highScore;
      if (worldsClearedEl && typeof maxWorldUnlocked !== 'undefined') worldsClearedEl.innerText = Math.max(0, maxWorldUnlocked - 1);
      if (totalCoinsEl && typeof globalCoins !== 'undefined') totalCoinsEl.innerText = globalCoins; // Fallback to current coins since total isn't cleanly tracked
      if (equippedCoreEl && typeof activeSkin !== 'undefined') equippedCoreEl.innerText = activeSkin;

      if (premiumStatusEl) {
          if (typeof isPremium !== 'undefined' && isPremium) {
              premiumStatusEl.innerText = 'PREMIUM MEMBER';
              premiumStatusEl.style.color = '#ff33ff';
          } else {
              premiumStatusEl.innerText = 'ORBIT RUNNER';
              premiumStatusEl.style.color = '#ffaa00';
          }
      }
  }

  function refreshHubUI() {
      // Workshop action card: show equipped skin name
      const workshopStatus = document.getElementById('actionStatusWorkshop');
      if (workshopStatus) {
          const skinLabels = {
              classic: 'CLASSIC', skull: 'SKULL', prism: 'PRISM', echo: 'ECHO',
              crimson: 'CRIMSON', pulse: 'PULSE', ghost: 'GHOST', storm: 'STORM'
          };
          const skin = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';
          workshopStatus.innerText = skinLabels[skin] || skin.toUpperCase();
          workshopStatus.style.color = '#00e5ff';
          workshopStatus.style.borderColor = 'rgba(0,229,255,0.25)';
          workshopStatus.style.background = 'rgba(0,229,255,0.08)';
      }
  }

  function handleHeroPanelClick() {
    const isEventActive = document.getElementById('heroEventContent').style.display !== 'none';
    if (isEventActive) {
      showChallengePreview();
    } else {
      startCampaign();
    }
  }

  function _launchBestScore() {
    const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
    if (menuSelectedWorld > maxUnlocked) return;
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
    document.body.classList.add('state-gameplay');
    document.body.classList.remove('state-hub');
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
    switchMenuTab('event');
    const countdown = document.getElementById('challengeCountdown');
    if (countdown) countdown.innerText = 'SEASON 1 ACTIVE';
  }

  function _launchBossChallenge(levelOverride) {
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

    window.levelData = levelOverride;

    currentLevelIdx = -1;
    resetRunState();
    ui.score.innerText = '0';
    updateStreakUI();
    markScoreCoinDirty(true);
    if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';

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
    // Stop any previous phoenix run
    if (OrbitGame.systems && OrbitGame.systems.phoenixBoss) {
      OrbitGame.systems.phoenixBoss.stop();
    }
    _launchBossChallenge({
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

  // Legacy alias kept for safety
  function startAbyssRun() { startPhoenixRun(); }


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
  window.startAbyssRun   = startAbyssRun;
  window.startPhoenixRun = startPhoenixRun;
  window.switchMenuTab   = switchMenuTab;
  window.handleHeroPanelClick = handleHeroPanelClick;

  // Initial body class
  document.body.classList.add('state-hub');

  // Initial UI refresh
  setTimeout(refreshHubUI, 100);

  // Check for weekly event priority (e.g. if Abyss is unlocked)
  // For now, let's enable it if Hard Mode is unlocked (simulating a weekly event condition)
  setTimeout(() => {
     const maxUnlocked = Math.max(1, Number(maxWorldUnlocked) || 1);
     const hasSeenHm = OG.storage.getItem('orbitSync_hm_tutorial') === '1';
     if (hasSeenHm || maxUnlocked >= 4) { // Mock condition for event
        const hc = document.getElementById('heroCampaignContent');
        const he = document.getElementById('heroEventContent');
        if(hc && he) {
            hc.style.display = 'none';
            he.style.display = 'block';

            // Also swap out the events card icon/action to avoid redundancy
            const actionCards = document.querySelectorAll('.action-card');
            if(actionCards.length > 3) {
                 actionCards[3].innerHTML = '<div class="action-icon">🎮</div><div class="action-label">Mini Games</div>';
                 actionCards[3].onclick = () => alert('Mini Games coming soon!');
            }
        }
     }
  }, 100);

})(window);
