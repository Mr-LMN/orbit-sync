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

  function getCampaignWorldCount() {
    const campaignData = (window.campaign && Array.isArray(window.campaign) ? window.campaign : null)
      || (OG.data && Array.isArray(OG.data.campaign) ? OG.data.campaign : null)
      || [];
    let maxWorld = 0;
    for (let i = 0; i < campaignData.length; i++) {
      const stage = campaignData[i];
      if (!stage || typeof stage.id !== 'string') continue;
      const parts = stage.id.split('-');
      const worldNum = parseInt(parts[0], 10);
      if (Number.isFinite(worldNum) && worldNum > maxWorld) maxWorld = worldNum;
    }
    return Math.max(1, maxWorld || 1);
  }

  function changeWorld(dir) {
    menuSelectedWorld += dir;
    const totalWorlds = getCampaignWorldCount();
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

    // Refresh Canvas whenever UI updates
    if (isUnlocked) {
      refreshMenuWorldPreview();
    } else {
      showLockedWorldPreview(menuSelectedWorld);
    }

    const worldData = {
      1: { name: 'WORLD 1', sub: 'ORBIT INIT', color: '#00ff88' },
      2: { name: 'WORLD 2', sub: 'PRISM BREAK', color: '#2ff6ff' },
      3: { name: 'WORLD 3', sub: isUnlocked ? 'RESONANCE' : '???', color: '#ffaa00' },
      4: { name: isUnlocked ? 'WORLD 4' : '? ? ? ?', sub: isUnlocked ? 'GLITCH PROTOCOL' : 'COMPLETE WORLD 3 TO UNLOCK', color: isUnlocked ? '#b157ff' : 'rgba(255,255,255,0.2)' },
      5: { name: isUnlocked ? 'WORLD 5' : '? ? ? ?', sub: isUnlocked ? 'THE VOID' : 'CLEAR WORLD 4', color: isUnlocked ? '#a8d8ff' : 'rgba(255,255,255,0.15)' },
      6: { name: isUnlocked ? 'WORLD 6' : '? ? ? ?', sub: isUnlocked ? 'SOLAR CORE' : 'CLEAR WORLD 5', color: isUnlocked ? '#ff3300' : 'rgba(255,255,255,0.15)' }
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
    const totalWorlds = getCampaignWorldCount();
    const completionPct = Math.min(100, Math.max(0, Math.floor((maxUnlocked / totalWorlds) * 100)));
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
    if (rightArrow) rightArrow.disabled = menuSelectedWorld >= totalWorlds;
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

    if (tabId === 'campaign') {
      const isUnlocked = menuSelectedWorld <= (Number(maxWorldUnlocked) || 1);
      if (isUnlocked) {
        refreshMenuWorldPreview();
      } else {
        showLockedWorldPreview(menuSelectedWorld);
      }
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
      const world = Math.max(1, Number(typeof maxWorldUnlocked !== 'undefined' ? maxWorldUnlocked : 1) || 1);

      // ── Rank Pill ──────────────────────────────────────────────────────────
      const RANK_TITLES = { 1: 'ORBIT RUNNER', 2: 'SYNC PILOT', 3: 'RESONANCE KNIGHT', 4: 'GLITCH HUNTER', 5: 'VOID SEEKER' };
      const RANK_NUMS   = { 1: 'RANK 01',      2: 'RANK 04',    3: 'RANK 08',          4: 'RANK 15',      5: 'RANK 28' };
      const rankLabel = document.getElementById('hubRankLabel');
      const rankNum   = document.getElementById('hubRankNum');
      if (rankLabel) rankLabel.innerText = RANK_TITLES[world] || 'ORBIT RUNNER';
      if (rankNum)   rankNum.innerText   = RANK_NUMS[world]   || 'RANK 01';

      // ── Orb Skin ───────────────────────────────────────────────────────────
      const skin = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';
      const SKIN_COLORS = {
          classic: '#00e5ff', skull: '#ff3366', prism: '#b157ff', echo: '#00ffcc',
          crimson: '#ff2244', pulse: '#ff8c00', ghost: '#c8d6e5', storm: '#4fc3f7'
      };
      const SKIN_LABELS = {
          classic: 'CLASSIC CORE', skull: 'NEON SKULL',   prism: 'PRISM CORE',  echo: 'ECHO TRAIL',
          crimson: 'CRIMSON RAIL', pulse: 'PULSE CORE',   ghost: 'GHOST ORB',   storm: 'STORM CORE'
      };
      const orbColor = SKIN_COLORS[skin] || '#00e5ff';
      const orbStage = document.getElementById('hubOrbStage');
      const orbCore  = document.getElementById('hubOrbCore');
      const coreName = document.getElementById('hubCoreName');
      if (orbStage) orbStage.style.setProperty('--orb-color', orbColor);
      if (orbCore)  orbCore.setAttribute('data-skin', skin);
      if (coreName) coreName.innerText = SKIN_LABELS[skin] || 'CLASSIC CORE';

      // ── Campaign Progress ──────────────────────────────────────────────────
      const campaignEl = document.getElementById('hubStatCampaign');
      if (campaignEl) {
          let lastStage = 1;
          if (typeof playerProgress !== 'undefined' && playerProgress.completedStages) {
              for (let s = 6; s >= 1; s--) {
                  if (playerProgress.completedStages[`${world}-${s}`]) {
                      lastStage = Math.min(s + 1, 6);
                      break;
                  }
              }
          }
          campaignEl.innerText = `W${world} \u00b7 S${lastStage}`;
      }

      // ── Best Score ─────────────────────────────────────────────────────────
      const bestEl = document.getElementById('hubStatBest');
      if (bestEl) {
          const best = (typeof personalBest !== 'undefined' && personalBest.score > 0)
              ? personalBest.score
              : (typeof highScore !== 'undefined' ? highScore : 0);
          bestEl.innerText = best > 0 ? String(best) : '\u2014';
      }

      // ── Event Status ───────────────────────────────────────────────────────
      const hasSeenHm   = OG.storage.getItem('orbitSync_hm_tutorial') === '1';
      const eventActive = hasSeenHm || world >= 4;
      const eventPanel  = document.getElementById('hubStatEventPanel');
      const eventValEl  = document.getElementById('hubStatEvent');
      const eventBtn    = document.getElementById('hubEventBtn');
      if (eventValEl) {
          eventValEl.innerText = eventActive ? '3D 14H' : 'LOCKED';
          eventValEl.style.color = eventActive ? '' : 'rgba(255,255,255,0.25)';
      }
      if (eventPanel) eventPanel.style.opacity = eventActive ? '1' : '0.45';
      if (eventBtn) {
          eventBtn.style.opacity = eventActive ? '1' : '0.4';
          eventBtn.style.pointerEvents = eventActive ? 'auto' : 'none';
      }

      // ── Primary CTA label ──────────────────────────────────────────────────
      const ctaBtn = document.getElementById('hubContinueBtn');
      if (ctaBtn) {
          const hasProgress = typeof playerProgress !== 'undefined'
              && playerProgress.completedStages
              && Object.keys(playerProgress.completedStages).length > 0;
          ctaBtn.innerHTML = hasProgress ? '&#9654; CONTINUE' : '&#9654; PLAY';
      }
  }

  function startContinueRun() {
      menuSelectedWorld = Math.max(1, Number(typeof maxWorldUnlocked !== 'undefined' ? maxWorldUnlocked : 1) || 1);
      startCampaign();
  }

  function handleHeroPanelClick() {
    const heroEventContent = document.getElementById('heroEventContent');
    const isEventActive = heroEventContent && heroEventContent.style.display !== 'none';
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

    levelData = levelOverride;
    // Apply visual theme so ring uses phoenix colours/shape, not last campaign level
    currentWorldPalette = computeWorldPalette(levelData);
    currentWorldShape = computeWorldShape(levelData);
    currentWorldVisualTheme = getWorldVisualTheme(levelData);

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

  function startPhoenixRunV2() {
    if (OrbitGame.systems && OrbitGame.systems.phoenixBossV2) {
      OrbitGame.systems.phoenixBossV2.stop();
    }
    _launchBossChallenge({
      id: 'phoenix',
      title: 'Phoenix V2 Trial',
      hitsNeeded: 999999,
      speed: 0.009,
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
  function startAbyssRun() { startPhoenixRun(); }



  function refreshMenuWorldPreview() {
    const campaignData = (window.campaign && Array.isArray(window.campaign) ? window.campaign : null)
      || (OG.data && Array.isArray(OG.data.campaign) ? OG.data.campaign : null)
      || [];
    if (!campaignData.length) return;
    if (typeof getStartingIndexForWorld !== 'function') return;
    if (typeof computeWorldPalette !== 'function' || typeof computeWorldShape !== 'function' || typeof getWorldVisualTheme !== 'function') return;
    const startIdx = getStartingIndexForWorld(menuSelectedWorld);
    levelData = campaignData[startIdx] || campaignData[0];
    currentWorldPalette = computeWorldPalette(levelData);
    currentWorldShape = computeWorldShape(levelData);
    currentWorldVisualTheme = getWorldVisualTheme(levelData);

    drawWorldPreviewCanvas(false);
  }

  function showLockedWorldPreview(worldNum) {
    const campaignData = (window.campaign && Array.isArray(window.campaign) ? window.campaign : null)
      || (OG.data && Array.isArray(OG.data.campaign) ? OG.data.campaign : null)
      || [];
    if (!campaignData.length) return;
    levelData = campaignData[0];
    currentWorldPalette = { color1: '#444', color2: '#222' };
    currentWorldShape = 'circle';
    currentWorldVisualTheme = { type: 'grid' };

    drawWorldPreviewCanvas(true);
  }

  function drawWorldPreviewCanvas(isLocked) {
    if (typeof currentWorldShape === 'undefined' || typeof currentWorldPalette === 'undefined') return;
    const canvas = document.getElementById('worldPreviewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // Per-shape radii so each shape feels consistently sized in the preview zone
    const shapeRadii = { circle: 66, diamond: 62, triangle: 66, square: 58, pentagon: 64, hexagon: 64, octagon: 63 };
    const radius = shapeRadii[currentWorldShape] || 66;
    // Per-shape vertical nudge: triangle is top-heavy (visual CoM sits above geometric center),
    // so shift it down so it reads as centered in the clipped preview zone.
    const shapeYNudge = { circle: 0, diamond: 0, triangle: 14, square: 0, pentagon: 0, hexagon: 0, octagon: 0 };
    const drawCy = cy + (shapeYNudge[currentWorldShape] || 0);

    ctx.save();
    if (isLocked) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, 66, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#666';
      ctx.font = '40px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy);
    } else {
      const shapeColor = currentWorldPalette.primary || currentWorldPalette.color1 || '#00ff88';
      ctx.setLineDash([]);

      // Build the shape path
      ctx.beginPath();
      if (currentWorldShape === 'square') {
        ctx.rect(cx - radius, drawCy - radius, radius*2, radius*2);
      } else if (currentWorldShape === 'diamond') {
        ctx.moveTo(cx,          drawCy - radius); // top
        ctx.lineTo(cx + radius, drawCy);          // right
        ctx.lineTo(cx,          drawCy + radius); // bottom
        ctx.lineTo(cx - radius, drawCy);          // left
        ctx.closePath();
      } else if (currentWorldShape === 'triangle') {
        ctx.moveTo(cx, drawCy - radius);
        ctx.lineTo(cx + radius*0.866, drawCy + radius*0.5);
        ctx.lineTo(cx - radius*0.866, drawCy + radius*0.5);
        ctx.closePath();
      } else if (currentWorldShape === 'pentagon' || currentWorldShape === 'hexagon' || currentWorldShape === 'octagon') {
        const sides = currentWorldShape === 'pentagon' ? 5 : (currentWorldShape === 'hexagon' ? 6 : 8);
        for(let i=0; i<sides; i++){
          const angle = i * (Math.PI*2)/sides - Math.PI/2;
          const x = cx + Math.cos(angle)*radius;
          const y = drawCy + Math.sin(angle)*radius;
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
      } else {
        ctx.arc(cx, drawCy, radius, 0, Math.PI * 2);
      }

      // Subtle fill for shape interior presence
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = shapeColor;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Glowing stroke
      ctx.strokeStyle = shapeColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = shapeColor;
      ctx.shadowBlur = 24;
      ctx.stroke();
    }
    ctx.restore();
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
  OG.ui.menus.refreshMenuWorldPreview = refreshMenuWorldPreview;
  window.startBestScoreRun = startBestScoreRun;
  window.startHardModeRun = startHardModeRun;
  window.showAugmentPicker = showAugmentPicker;
  window.selectAugment = selectAugment;
  OG.ui.menus.showChallengePreview = showChallengePreview;
  window.showChallengePreview = showChallengePreview;
  window.startAbyssRun    = startAbyssRun;
  window.startPhoenixRun  = startPhoenixRun;
  window.startPhoenixRunV2 = startPhoenixRunV2;
  window.switchMenuTab    = switchMenuTab;
  window.handleHeroPanelClick = handleHeroPanelClick;
  window.startContinueRun = startContinueRun;

  // Initial body class
  document.body.classList.add('state-hub');

  // Initial UI refresh
  setTimeout(refreshHubUI, 100);

  // Re-run hub refresh after state is fully loaded to pick up saved progress
  setTimeout(() => {
     refreshHubUI();
  }, 150);

})(window);
