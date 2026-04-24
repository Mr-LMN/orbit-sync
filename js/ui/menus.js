(function initMenus(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.menus = OG.ui.menus || {};

  let _pendingRunType = null;
  let tutorialHardModeSeen = false;
  let _previewAnimFrame = 0;
  let _previewAnimInterval = null;
  let _hubOrbAnimId = null;

  // ── HUB ORB LIVE RENDERER ─────────────────────────────────────────────────
  // Renders the equipped sphere skin on a canvas for brilliant detail in the hub.
  function _stopHubSphereAnimation() {
    if (_hubOrbAnimId !== null) {
      cancelAnimationFrame(_hubOrbAnimId);
      _hubOrbAnimId = null;
    }
  }

  const _HUB_SKIN_COLORS = {
    classic: '#00e5ff', skull: '#00ff50', prism: '#b157ff', echo: '#00eaff',
    crimson: '#ff2244', pulse: '#ff8800', ghost: '#c8d6e5', storm: '#4fc3f7'
  };

  function _startHubSphereAnimation(skin) {
    _stopHubSphereAnimation();
    const canvas = document.getElementById('hubSphereCanvas');
    if (!canvas || typeof drawOrbSkin !== 'function') return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const orbRadius = 32;
    const skinColor = _HUB_SKIN_COLORS[skin] || '#00e5ff';

    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      // Clip to circle so skin stays within the sphere shape
      ctx.beginPath();
      ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2);
      ctx.clip();
      drawOrbSkin(ctx, cx, cy, skin, orbRadius, 0, skinColor);
      ctx.restore();
      _hubOrbAnimId = requestAnimationFrame(frame);
    }
    frame();
  }

  function toggleShop(show) {
    return OG.ui.shop.toggleShop(show);
  }

  function toggleSettings(show) {
    return OG.ui.settings.toggleSettings(show);
  }

  function _launchCampaign() {
    if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.suspendTutorialUI === 'function') {
      OG.systems.tutorial.suspendTutorialUI();
    }
    let startLevelIdx = getStartingIndexForWorld(menuSelectedWorld);

    initAudio();
    toggleSettings(false);
    _stopPreviewAnimation(); // Stop preview animation before leaving menu
    _stopHubSphereAnimation();
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
      if (_hardUnlocked && !tutorialHardModeSeen && OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onHardModeUnlocked === 'function') {
        tutorialHardModeSeen = true;
        OG.systems.tutorial.onHardModeUnlocked();
      }
    }

    // Dim arrows at boundaries
    const leftArrow = document.querySelector('#worldSelector .arrow-btn:first-child');
    const rightArrow = document.querySelector('#worldSelector .arrow-btn:last-child');
    if (leftArrow) leftArrow.disabled = menuSelectedWorld <= 1;
    if (rightArrow) rightArrow.disabled = menuSelectedWorld >= totalWorlds;
  }

  function switchMenuTab(tabId) {
    // Block tab navigation while a tutorial card is being shown
    const tutMask = document.getElementById('tutorialMask');
    if (tutMask && tutMask.classList.contains('is-visible')) {
      // Only allow navigation if the tutorial itself is commanding it
      // (tutorial system calls switchMenuTab internally via guided highlight)
      const isTutorialControlled = tutMask.dataset.allowNav === 'true';
      if (!isTutorialControlled) return;
    }

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
      console.debug('[campaign-tab-open]', { world: menuSelectedWorld, unlocked: isUnlocked });
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

    if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onMenuTabOpened === 'function') {
      OG.systems.tutorial.onMenuTabOpened(tabId);
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
      _startHubSphereAnimation(skin);

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
          const labelEl = document.getElementById('hubCtaLabel');
          const subEl = document.getElementById('hubCtaSubtitle');
          let ctaStage = 1;
          if (typeof playerProgress !== 'undefined' && playerProgress.completedStages) {
              for (let s = 6; s >= 1; s--) {
                  if (playerProgress.completedStages[`${world}-${s}`]) {
                      ctaStage = Math.min(s + 1, 6);
                      break;
                  }
              }
          }
          if (labelEl) labelEl.innerText = hasProgress ? 'CONTINUE' : 'START';
          if (subEl) subEl.innerText = `W${world} · S${ctaStage}`;
      }

      // ── Challenges & Streak ────────────────────────────────────────────────
      if (OG.systems && OG.systems.challenges) {
        OG.systems.challenges.refreshChallengesUI();
        OG.systems.challenges.refreshStreakUI();
      }

      // ── Next Goal Panel ────────────────────────────────────────────────────
      refreshNextGoalPanel();
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
    _stopHubSphereAnimation();
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
    _stopHubSphereAnimation();
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

  function startPhoenixRun() {
    if (!OrbitGame.systems || !OrbitGame.systems.eventRunner || typeof OrbitGame.systems.eventRunner.startPhoenixRun !== 'function') {
      console.warn('[menus] eventRunner.startPhoenixRun is unavailable');
      return;
    }
    return OrbitGame.systems.eventRunner.startPhoenixRun();
  }

  function startPhoenixRunV2() {
    if (!OrbitGame.systems || !OrbitGame.systems.eventRunner || typeof OrbitGame.systems.eventRunner.startPhoenixRunV2 !== 'function') {
      console.warn('[menus] eventRunner.startPhoenixRunV2 is unavailable');
      return;
    }
    return OrbitGame.systems.eventRunner.startPhoenixRunV2();
  }

  // Legacy alias kept for safety
  function startAbyssRun() {
    if (!OrbitGame.systems || !OrbitGame.systems.eventRunner || typeof OrbitGame.systems.eventRunner.startAbyssRun !== 'function') {
      console.warn('[menus] eventRunner.startAbyssRun is unavailable');
      return;
    }
    return OrbitGame.systems.eventRunner.startAbyssRun();
  }



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
    console.debug('[campaign-preview]', {
      world: menuSelectedWorld,
      stageId: levelData && levelData.id,
      shape: currentWorldShape,
      palette: currentWorldPalette
    });
    currentWorldVisualTheme = getWorldVisualTheme(levelData);

    // Keep menu preview state authoritative while in menu mode.
    if (typeof inMenu !== 'undefined' && inMenu) {
      window.levelData = levelData;
      window.currentWorldPalette = currentWorldPalette;
      window.currentWorldShape = currentWorldShape;
      window.currentWorldVisualTheme = currentWorldVisualTheme;
    }

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

  // Draws a glowing mini-sphere at (x,y) with given radius, world color, and alpha.
  // Used by the campaign preview orbit rings for that "orbiting balls" effect.
  function _drawPreviewOrb(ctx, x, y, r, color, alpha) {
    // Outer glow halo
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
    glow.addColorStop(0, color + 'cc');
    glow.addColorStop(0.4, color + '55');
    glow.addColorStop(1, color + '00');
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Core orb body
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular highlight — gives the orb a 3-D sphere feel
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.globalAlpha = alpha * 0.65;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.38, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  function drawWorldPreviewCanvas(isLocked) {
    if (typeof currentWorldShape === 'undefined' || typeof currentWorldPalette === 'undefined') return;
    const canvas = document.getElementById('worldPreviewCanvas');
    if (!canvas) return;
    const computedStyle = window.getComputedStyle(canvas);
    console.debug('[campaign-preview-canvas]', {
      width: canvas.width,
      height: canvas.height,
      display: computedStyle.display,
      opacity: computedStyle.opacity,
      visibility: computedStyle.visibility,
      currentWorldShape,
      menuSelectedWorld
    });
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // Per-shape radii so each shape feels consistently sized in the preview zone
    const shapeRadii = { circle: 72, diamond: 68, triangle: 72, square: 64, pentagon: 69, hexagon: 69, octagon: 68 };
    const radius = shapeRadii[currentWorldShape] || 66;
    // Per-shape vertical nudge: triangle is top-heavy (visual CoM sits above geometric center),
    // so shift it down so it reads as centered in the clipped preview zone.
    const shapeYNudge = { circle: 0, diamond: 0, triangle: 14, square: 0, pentagon: 0, hexagon: 0, octagon: 0 };
    const drawCy = cy + (shapeYNudge[currentWorldShape] || 0) - 8;

    // Increment animation frame for pulsing/rotating effects
    _previewAnimFrame = (_previewAnimFrame + 1) % 360;

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
      const ambientAlpha = 0.14;

      // subtle world-specific ambient motifs (behind shape)
      ctx.save();
      ctx.strokeStyle = shapeColor;
      ctx.fillStyle = shapeColor;
      if (currentWorldShape === 'circle') {
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = ambientAlpha * 0.6;
        ctx.beginPath();
        ctx.arc(cx, drawCy, radius + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = ambientAlpha * 0.4;
        ctx.beginPath();
        ctx.arc(cx, drawCy, radius + 24, 0, Math.PI * 2);
        ctx.stroke();
      } else if (currentWorldShape === 'diamond') {
        ctx.lineWidth = 1.1;
        ctx.globalAlpha = ambientAlpha * 0.55;
        ctx.beginPath();
        ctx.moveTo(cx - radius - 18, drawCy + radius + 6);
        ctx.lineTo(cx + radius + 18, drawCy - radius - 6);
        ctx.stroke();
        ctx.globalAlpha = ambientAlpha * 0.4;
        ctx.beginPath();
        ctx.moveTo(cx - radius - 6, drawCy + radius + 18);
        ctx.lineTo(cx + radius + 28, drawCy - radius - 16);
        ctx.stroke();
      } else if (currentWorldShape === 'triangle') {
        const echoScale = [1.18, 1.33];
        ctx.lineWidth = 1.1;
        for (let i = 0; i < echoScale.length; i++) {
          const s = echoScale[i];
          ctx.globalAlpha = ambientAlpha * (0.5 - i * 0.12);
          ctx.beginPath();
          ctx.moveTo(cx, drawCy - radius * s);
          ctx.lineTo(cx + radius * 0.866 * s, drawCy + radius * 0.5 * s);
          ctx.lineTo(cx - radius * 0.866 * s, drawCy + radius * 0.5 * s);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (currentWorldShape === 'square') {
        ctx.globalAlpha = ambientAlpha * 0.45;
        ctx.fillRect(cx - radius - 18, drawCy - 40, radius * 2 + 36, 3);
        ctx.globalAlpha = ambientAlpha * 0.35;
        ctx.fillRect(cx - radius - 12, drawCy - 6, radius * 2 + 24, 2);
        ctx.globalAlpha = ambientAlpha * 0.25;
        ctx.fillRect(cx - radius - 16, drawCy + 30, radius * 2 + 32, 2);
      } else if (currentWorldShape === 'pentagon') {
        const bloom = ctx.createRadialGradient(cx, drawCy, radius * 0.15, cx, drawCy, radius * 1.35);
        bloom.addColorStop(0, 'rgba(210,235,255,0.16)');
        bloom.addColorStop(1, 'rgba(210,235,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(cx, drawCy, radius * 1.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentWorldShape === 'hexagon') {
        ctx.lineWidth = 1.4;
        ctx.globalAlpha = ambientAlpha * 0.55;
        ctx.beginPath();
        ctx.arc(cx + 6, drawCy + 2, radius + 14, -0.55, 0.9);
        ctx.stroke();
        ctx.globalAlpha = ambientAlpha * 0.35;
        ctx.beginPath();
        ctx.arc(cx - 5, drawCy + 3, radius + 22, -0.45, 0.7);
        ctx.stroke();
      }
      ctx.restore();

      // faint inner haze to help shape feel embedded
      const haze = ctx.createRadialGradient(cx, drawCy, radius * 0.15, cx, drawCy, radius * 1.45);
      haze.addColorStop(0, `${shapeColor}33`);
      haze.addColorStop(0.6, `${shapeColor}12`);
      haze.addColorStop(1, `${shapeColor}00`);
      ctx.fillStyle = haze;
      ctx.beginPath();
      ctx.arc(cx, drawCy, radius * 1.45, 0, Math.PI * 2);
      ctx.fill();

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

      // ── BOSS ORB (if this world has a boss) ──────────────────────────────
      const isBossWorld = menuSelectedWorld === 1 || menuSelectedWorld === 2 || menuSelectedWorld === 3 || menuSelectedWorld === 4;
      if (isBossWorld) {
        const bossOrbRadius = radius * 0.42;
        const pulse = Math.sin(_previewAnimFrame * Math.PI / 180) * 0.15 + 0.85;
        const bossOrbSize = bossOrbRadius * pulse;

        // Boss orb core glow
        const bossGradient = ctx.createRadialGradient(cx, drawCy, bossOrbSize * 0.3, cx, drawCy, bossOrbSize * 1.2);
        bossGradient.addColorStop(0, 'rgba(255, 100, 100, 0.6)');
        bossGradient.addColorStop(0.5, 'rgba(255, 50, 50, 0.3)');
        bossGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = bossGradient;
        ctx.beginPath();
        ctx.arc(cx, drawCy, bossOrbSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing shield rings around boss
        const shieldCount = 3;
        for (let i = 0; i < shieldCount; i++) {
          const shieldRadius = bossOrbSize + (i + 1) * 10;
          const shieldAlpha = Math.max(0.1, 0.4 - i * 0.15) * (1.2 - pulse * 0.4);
          ctx.strokeStyle = `rgba(255, 150, 0, ${shieldAlpha})`;
          ctx.lineWidth = 1.5 - i * 0.3;
          ctx.globalAlpha = shieldAlpha;
          ctx.beginPath();
          ctx.arc(cx, drawCy, shieldRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Boss orb solid core with inner detail
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, drawCy, bossOrbSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Boss orb highlight for 3D effect
        ctx.fillStyle = 'rgba(255, 150, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(cx - bossOrbSize * 0.25, drawCy - bossOrbSize * 0.25, bossOrbSize * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Inner dangerous glow
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(cx, drawCy, bossOrbSize * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Rebuild shape path (boss orb drawing calls ctx.beginPath() and clears it)
      ctx.beginPath();
      if (currentWorldShape === 'square') {
        ctx.rect(cx - radius, drawCy - radius, radius*2, radius*2);
      } else if (currentWorldShape === 'diamond') {
        ctx.moveTo(cx,          drawCy - radius);
        ctx.lineTo(cx + radius, drawCy);
        ctx.lineTo(cx,          drawCy + radius);
        ctx.lineTo(cx - radius, drawCy);
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
      ctx.shadowBlur = 0;

      // ── MULTI-RING ORBITING SPHERES ───────────────────────────────────────
      // Inner ring: 3 bright orbs, fast clockwise spin
      // Outer ring: 5 orbs, slower counter-clockwise spin (sci-fi gyroscope feel)
      const innerRingR = radius * 1.14;
      const outerRingR = radius * 1.44;
      const innerRot   = (_previewAnimFrame * 3.5) * Math.PI / 180;
      const outerRot   = -(_previewAnimFrame * 1.6) * Math.PI / 180;

      // Outer orbit trail — faint dashed ring
      ctx.save();
      ctx.setLineDash([4, 9]);
      ctx.strokeStyle = shapeColor;
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(cx, cy, outerRingR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Inner orbit trail — slightly more visible with crisp white ghost
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = shapeColor;
      ctx.lineWidth = 0.9;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRingR, 0, Math.PI * 2);
      ctx.stroke();
      // Hologram polish: faint white ring on inner trail
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Inner orbs — 3 bright spheres, tight fast orbit
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + innerRot;
        _drawPreviewOrb(ctx,
          cx + Math.cos(angle) * innerRingR,
          cy + Math.sin(angle) * innerRingR,
          5.5, shapeColor, 1.0);
      }

      // Outer orbs — 5 spheres, wide slow counter-orbit, pulse in brightness
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + outerRot;
        const dim = 0.5 + 0.45 * ((Math.sin(angle + _previewAnimFrame * 0.04) + 1) / 2);
        _drawPreviewOrb(ctx,
          cx + Math.cos(angle) * outerRingR,
          cy + Math.sin(angle) * outerRingR,
          3.8, shapeColor, dim);
      }
    }
    ctx.restore();
  }

  // ── PHASE 3: ORBIT RANK STRIP ────────────────────────────────────────────
  function refreshOrbitRankStrip() {
    const prestige = OG.systems && OG.systems.prestige;
    if (!prestige) return;

    const rank    = prestige.getOrbitRank();
    const xp      = prestige.getOrbitXP();
    const toNext  = prestige.getXPToNextRank();
    const pct     = prestige.getXPProgress(); // 0.0 – 1.0
    const label   = prestige.getRankLabel(rank);

    const badgeEl = document.getElementById('orbitRankBadge');
    const nameEl  = document.getElementById('orbitRankName');
    const xpEl    = document.getElementById('orbitRankXP');
    const barEl   = document.getElementById('orbitRankBar');
    const hubRankLabel = document.getElementById('hubRankLabel');
    const hubRankNum   = document.getElementById('hubRankNum');

    if (badgeEl) badgeEl.textContent = 'RANK ' + rank;
    if (nameEl)  nameEl.textContent  = label;
    if (xpEl)    xpEl.textContent    = rank >= prestige.MAX_RANK ? 'MAX' : xp + ' / ' + toNext + ' XP';
    if (barEl)   barEl.style.width   = (rank >= prestige.MAX_RANK ? 1 : pct) * 100 + '%';

    // Also update the hub rank pill at the top of the home view
    if (hubRankLabel) hubRankLabel.textContent = label;
    if (hubRankNum)   hubRankNum.textContent   = 'RANK ' + (rank < 10 ? '0' + rank : rank);

    // Keep next-goal panel in sync with latest XP state
    refreshNextGoalPanel();
  }

  // ── NEXT GOAL PANEL ───────────────────────────────────────────────────────
  // Shows the player's most relevant upcoming goal in the hub.
  // Priority: 1) claimable daily chest  2) daily challenges in progress
  //           3) next rank perk unlock  4) weekly challenge  5) beat best score

  let _nextGoalActionFn = null;

  function refreshNextGoalPanel() {
    const panel   = document.getElementById('nextGoalPanel');
    const iconEl  = document.getElementById('nextGoalIcon');
    const labelEl = document.getElementById('nextGoalLabel');
    const valueEl = document.getElementById('nextGoalValue');
    const ctaEl   = document.getElementById('nextGoalCta');
    if (!panel) return;

    let icon = '⬡', label = 'NEXT GOAL', value = '—', cta = '▶';
    let goalType = 'rank';
    _nextGoalActionFn = null;

    const challenges = OG.systems && OG.systems.challenges;
    const prestige   = OG.systems && OG.systems.prestige;

    if (challenges) {
      const st = challenges.getState();

      // 1. Daily chest ready to claim
      if (st && !st.dailyChestClaimed && st.dailyChallenges && st.dailyChallenges.length > 0
          && st.dailyChallenges.every(c => c.done)) {
        icon = '🎁'; label = 'DAILY CHEST READY'; value = 'CLAIM YOUR REWARD'; cta = 'CLAIM';
        goalType = 'daily-ready';
        _nextGoalActionFn = function() {
          const modal = document.getElementById('dailyChallengesModal');
          if (modal) modal.style.display = 'flex';
        };

      // 2. Daily challenges in progress
      } else if (st && st.dailyChallenges && st.dailyChallenges.length > 0) {
        const done  = st.dailyChallenges.filter(c => c.done).length;
        const total = st.dailyChallenges.length;
        if (done < total) {
          const dots = st.dailyChallenges.map(c => c.done ? '◆' : '◇').join('  ');
          icon = '📋'; label = 'DAILY CHALLENGES'; value = dots + '  ·  ' + done + ' / ' + total;
          cta = 'GO'; goalType = 'daily';
          _nextGoalActionFn = function() {
            const modal = document.getElementById('dailyChallengesModal');
            if (modal) modal.style.display = 'flex';
          };
        }
      }

      // 3. Weekly chest ready (lower priority than daily)
      if (!_nextGoalActionFn && st && !st.weeklyChestClaimed && st.weeklyChallenges
          && st.weeklyChallenges.length > 0 && st.weeklyChallenges.every(c => c.done)) {
        icon = '🏆'; label = 'WEEKLY CHEST READY'; value = 'CLAIM YOUR REWARD'; cta = 'CLAIM';
        goalType = 'weekly-ready';
        _nextGoalActionFn = function() {
          const modal = document.getElementById('dailyChallengesModal');
          if (modal) modal.style.display = 'flex';
        };
      }
    }

    // 4. Next rank perk milestone
    if (!_nextGoalActionFn && prestige) {
      const perk = prestige.getNextPerkMilestone();
      if (perk) {
        const xpLeft = prestige.getXPToRank(perk.rank);
        icon  = '⬡';
        label = 'RANK ' + perk.rank + ' UNLOCK';
        value = perk.label + '  ·  ' + (xpLeft > 0 ? xpLeft + ' XP away' : 'READY');
        cta   = '▶'; goalType = 'rank';
      }
    }

    // 5. Beat best score fallback
    if (!_nextGoalActionFn && label === 'NEXT GOAL') {
      const best = (typeof personalBest !== 'undefined' && personalBest && personalBest.score > 0)
        ? personalBest.score
        : (typeof highScore !== 'undefined' ? highScore : 0);
      icon = '🏅'; label = 'PERSONAL BEST';
      value = best > 0 ? 'BEAT ' + best + ' PTS' : 'SET YOUR FIRST RECORD';
      cta = '▶'; goalType = 'score';
    }

    if (iconEl)  iconEl.textContent  = icon;
    if (labelEl) labelEl.textContent = label;
    if (valueEl) valueEl.textContent = value;
    if (ctaEl)   ctaEl.textContent   = cta;
    panel.setAttribute('data-goal-type', goalType);
  }

  function triggerNextGoal() {
    if (typeof _nextGoalActionFn === 'function') {
      _nextGoalActionFn();
    }
  }

  // ── PHASE 3: LIVE EVENT PANEL COUNTDOWN ──────────────────────────────────
  let _eventCountdownInterval = null;

  function _formatCountdown(msLeft) {
    if (msLeft <= 0) return 'LIVE NOW';
    const totalSec = Math.floor(msLeft / 1000);
    const d  = Math.floor(totalSec / 86400);
    const h  = Math.floor((totalSec % 86400) / 3600);
    const m  = Math.floor((totalSec % 3600) / 60);
    const s  = totalSec % 60;
    if (d > 0) return `ENDS IN: ${d}D ${h}H ${m}M`;
    if (h > 0) return `ENDS IN: ${h}H ${m}M ${s}S`;
    return `ENDS IN: ${m}M ${s}S`;
  }

  function refreshLiveEventPanel() {
    const el = document.getElementById('eventPanelCountdown');
    if (!el) return;

    // Weekly reset — next Monday 00:00 UTC
    const now     = new Date();
    const dayOfWk = now.getUTCDay(); // 0=Sun, 1=Mon…
    const daysToMon = ((8 - dayOfWk) % 7) || 7;
    const nextMon = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToMon
    ));
    const msLeft = nextMon.getTime() - now.getTime();
    el.textContent = _formatCountdown(msLeft);
  }

  function startEventCountdownTicker() {
    if (_eventCountdownInterval) return;
    refreshLiveEventPanel();
    _eventCountdownInterval = setInterval(refreshLiveEventPanel, 1000);
  }

  function stopEventCountdownTicker() {
    if (_eventCountdownInterval) {
      clearInterval(_eventCountdownInterval);
      _eventCountdownInterval = null;
    }
  }

  // ── PHASE 3: SESSION ARC NAV SHAKE ───────────────────────────────────────
  function _shakeNavBar() {
    const nav = document.getElementById('bottomNavBar') || document.querySelector('.bottom-nav');
    if (!nav) return;
    nav.classList.remove('nav-shake');
    void nav.offsetWidth; // reflow
    nav.classList.add('nav-shake');
    nav.addEventListener('animationend', function onEnd() {
      nav.classList.remove('nav-shake');
      nav.removeEventListener('animationend', onEnd);
    }, { once: true });
  }

  // Patch switchMenuTab to add session arc lock + shake
  const _origSwitchMenuTab = switchMenuTab;
  switchMenuTab = function(tabId) {
    // First session arc lock — block navigation for fresh installs during World 1
    const sessionDone = OG.storage && OG.storage.getItem('orbitSync_sessionArcDone');
    const tutSys = OG.systems && OG.systems.tutorial;
    if (!sessionDone && tutSys && typeof tutSys.isNewPlayerProfile === 'function' && tutSys.isNewPlayerProfile()) {
      _shakeNavBar();
      return; // Hard block until World 1 cleared
    }
    _origSwitchMenuTab(tabId);
    // Refresh rank strip whenever we come back to home
    if (tabId === 'home') {
      refreshOrbitRankStrip();
      startEventCountdownTicker();
    } else {
      stopEventCountdownTicker();
      _stopHubSphereAnimation();
    }
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
  OG.ui.menus.refreshOrbitRankStrip = refreshOrbitRankStrip;
  OG.ui.menus.refreshNextGoalPanel  = refreshNextGoalPanel;
  OG.ui.menus.triggerNextGoal       = triggerNextGoal;
  OG.ui.menus.refreshLiveEventPanel = refreshLiveEventPanel;
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

  // ── PREVIEW ANIMATION LOOP ────────────────────────────────────────────────
  function _startPreviewAnimation() {
    if (_previewAnimInterval) return; // Already running
    _previewAnimInterval = setInterval(() => {
      _previewAnimFrame = (_previewAnimFrame + 2) % 360;
      drawWorldPreviewCanvas(false);
    }, 1000 / 30); // ~30fps for smooth animation
  }

  function _stopPreviewAnimation() {
    if (_previewAnimInterval) {
      clearInterval(_previewAnimInterval);
      _previewAnimInterval = null;
    }
  }

  // Hook into menu visibility to control animation
  const _origRefreshMenuWorldPreview = refreshMenuWorldPreview;
  refreshMenuWorldPreview = function() {
    _origRefreshMenuWorldPreview();
    _startPreviewAnimation();
  };

  // Initial body class
  document.body.classList.add('state-hub');

  // Initial UI refresh (existing)
  setTimeout(refreshHubUI, 100);
  // Phase 3: rank + event panel on first load
  setTimeout(function() {
    refreshHubUI();
    refreshOrbitRankStrip();
    startEventCountdownTicker();
  }, 160);

})(window);
