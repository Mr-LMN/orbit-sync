(function initProgressionSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.progression = OG.systems.progression || {};

  const STAR_THRESHOLDS = {
    default: {
      twoStarPerfectRate: 0.60,
      threeStarPerfectRate: 0.85
    },
    earlyWorldFairness: {
      '1-1': { twoStarPerfectRate: 0.55, threeStarPerfectRate: 0.80 },
      '1-2': { twoStarPerfectRate: 0.55, threeStarPerfectRate: 0.80 }
    }
  };

  let stageRunStatStart = { perfect: 0, good: 0, ok: 0 };

  function markStageStartRunStats() {
    const stats = OG.state && OG.state.legacy && OG.state.legacy.runStats;
    stageRunStatStart = {
      perfect: Number((stats && stats.runPerfectCount) || 0),
      good: Number((stats && stats.runGoodCount) || 0),
      ok: Number((stats && stats.runOkCount) || 0)
    };
  }

  function getStarThresholdsForStage(stageId) {
    return STAR_THRESHOLDS.earlyWorldFairness[stageId] || STAR_THRESHOLDS.default;
  }

  function getCheckpointIndex() {
    // Try saved stage first
    const savedIdx = parseInt(OG.storage.getItem('orbitSync_checkpointIdx') || '-1', 10);
    if (savedIdx >= 0 && Array.isArray(campaign) && campaign[savedIdx]) {
      const savedStage = campaign[savedIdx];
      const savedWorld = parseInt(String(savedStage.id).split('-')[0], 10);
      const currentWorld = (OG.state && OG.state.legacy && OG.state.legacy.menuSelectedWorld) || 1;
      // Only restore if it's the same world the player is attempting
      if (savedWorld === currentWorld) return savedIdx;
    }
    // Fallback: start of world
    const worldNum = String((OG.state && OG.state.legacy && OG.state.legacy.menuSelectedWorld) || 1);
    for (let i = 0; i < campaign.length; i++) { if (campaign[i].id.startsWith(worldNum + '-')) return i; }
    return 0;
  }

  function updateWaveUI() {
    if (levelData.id === 'abyss') {
      ui.wave.style.display = 'block';
      ui.wave.innerText = `DEPTH ${window.abyssDepth || 0}`;
      if (ui.bossUI) ui.bossUI.style.display = 'none';
      return;
    }

    if (levelData.boss) {
      ui.wave.style.display = 'none';
      if (ui.bossUI) ui.bossUI.style.display = 'none';
    } else {
      if (ui.bossUI) ui.bossUI.style.display = 'none';
      ui.wave.style.display = 'block';
      ui.wave.innerText = `WAVE ${Math.min(stageHits + 1, levelData.hitsNeeded)} / ${levelData.hitsNeeded}`;
    }
  }

  function triggerStageClear() {
    if (levelData.id === 'abyss') {
      window.abyssDepth = (window.abyssDepth || 0) + 1;

      soundWaveClear();
      const wavePopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 28, 'ABYSS DEEPENS', '#ff3366');
      wavePopup.animType = 'combo';
      wavePopup.life = 1.85;
      wavePopup.riseSpeed = 0.8;
      wavePopup.fadeSpeed = 0.018;
      wavePopup.shadow = 28;

      createParticles(centerObj.x, centerObj.y, '#ff3366', Math.min(54, MAX_PARTICLES));
      createUpwardBurstParticles(centerObj.x, centerObj.y + 10, '#ffaa00', 32);
      createShockwave('#ff3366', 35);

      spawnTargets(); // Immediate respawn, never advance stage
      return;
    }

    stageHits++;
    updateWaveUI();

    if (stageHits >= levelData.hitsNeeded) {
      const wasBoss = !!levelData.boss;
      const nextLevelIdx = currentLevelIdx + 1;
      const nextLevelObj = campaign[nextLevelIdx] || null;
      const currentWorld = parseInt(levelData.id.split('-')[0], 10);
      const currentWorldId = levelData.worldId || (OG.data && typeof OG.data.worldIdFromStageId === 'function'
        ? OG.data.worldIdFromStageId(levelData.id)
        : `world${currentWorld}`);
      const nextWorld = nextLevelObj ? parseInt(nextLevelObj.id.split('-')[0], 10) : null;
      const worldAdvanced = !!nextLevelObj && nextWorld > currentWorld;
      const campaignComplete = !nextLevelObj;

      if (typeof playerProgress === 'object' && playerProgress) {
        playerProgress.completedStages[levelData.id] = true;
        // Save per-stage best score
        const _stageScore = (typeof score !== 'undefined' ? score : 0) - (typeof scoreAtLevelStart !== 'undefined' ? scoreAtLevelStart : 0);
        if (_stageScore > 0) {
          if (!playerProgress.bestScores) playerProgress.bestScores = {};
          const _prevBest = playerProgress.bestScores[levelData.id] || 0;
          if (_stageScore > _prevBest) {
            playerProgress.bestScores[levelData.id] = _stageScore;
            if (typeof saveData === 'function') saveData();
          }
        }
        // Star rating
        if (!levelData.boss && typeof reviveCount !== 'undefined') {
          const _currentRunStats = OG.state && OG.state.legacy && OG.state.legacy.runStats;
          const _stagePerfectHits = Math.max(0, Number((_currentRunStats && _currentRunStats.runPerfectCount) || 0) - stageRunStatStart.perfect);
          const _stageGoodHits = Math.max(0, Number((_currentRunStats && _currentRunStats.runGoodCount) || 0) - stageRunStatStart.good);
          const _stageOkHits = Math.max(0, Number((_currentRunStats && _currentRunStats.runOkCount) || 0) - stageRunStatStart.ok);
          const _validScorableHits = _stagePerfectHits + _stageGoodHits + _stageOkHits;
          const _perfectRate = _validScorableHits > 0 ? (_stagePerfectHits / _validScorableHits) : 0;
          const _thresholds = getStarThresholdsForStage(levelData.id);

          let _stars = 1;
          if (_perfectRate >= _thresholds.twoStarPerfectRate) _stars = 2;
          if (_perfectRate >= _thresholds.threeStarPerfectRate) _stars = 3;

          if (!playerProgress.stageStars) playerProgress.stageStars = {};
          const _prevStars = playerProgress.stageStars[levelData.id] || 0;
          if (_stars > _prevStars) {
            playerProgress.stageStars[levelData.id] = _stars;
            if (typeof saveData === 'function') saveData();
          }
        }
      }

      let unlockedNextWorldId = null;
      if (wasBoss && OG.data && typeof OG.data.unlockNextWorldByBoss === 'function') {
        unlockedNextWorldId = OG.data.unlockNextWorldByBoss(currentWorldId);
      }

      if (unlockedNextWorldId && typeof playerProgress === 'object' && playerProgress) {
        if (!Array.isArray(playerProgress.unlockedWorlds)) playerProgress.unlockedWorlds = ['world1'];
        if (!playerProgress.unlockedWorlds.includes(unlockedNextWorldId)) {
          playerProgress.unlockedWorlds.push(unlockedNextWorldId);
        }
      }

      if (nextWorld && nextWorld > maxWorldUnlocked) {
        maxWorldUnlocked = nextWorld;
      }
      const knownWorldCount = Array.isArray(OG.data && OG.data.worldMeta) ? OG.data.worldMeta.length : 3;
      if (unlockedNextWorldId && maxWorldUnlocked < knownWorldCount) {
        const unlockedNum = parseInt(unlockedNextWorldId.replace('world', ''), 10);
        if (Number.isFinite(unlockedNum) && unlockedNum > maxWorldUnlocked) {
          maxWorldUnlocked = unlockedNum;
        }
      }

      if (typeof activeSkin !== 'undefined' && activeSkin && OG.entities && OG.entities.spheres && OG.entities.spheres.runtime) {
         let xpAmount = wasBoss ? 150 : 50;
         if (levelData.id === 'abyss') xpAmount = 10;
         const xpResult = OG.entities.spheres.runtime.grantXP(activeSkin, xpAmount);
         if (xpResult && xpResult.leveled && typeof createPopup !== 'undefined') {
             const _pop = createPopup(centerObj.x, centerObj.y - orbitRadius - 60, `CORE LVL ${xpResult.newLevel}!`, '#ffaa00');
             _pop.life = 2.5;
         }
      }

      if (typeof hardModeActive !== 'undefined' && hardModeActive && levelData.id === '1-1') {
         if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onHardModeCleared === 'function') {
           OG.systems.tutorial.onHardModeCleared();
         }
      } else if ((!hardModeActive || typeof hardModeActive === 'undefined') && levelData && levelData.id === '1-1') {
         if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onCampaignMilestone === 'function') {
           OG.systems.tutorial.onCampaignMilestone();
         }
      }

      saveData();

      if (wasBoss || worldAdvanced || campaignComplete) {
        showWorldClearSequence({
          nextLevelIdx: nextLevelObj ? nextLevelIdx : null,
          nextWorld: nextWorld || currentWorld,
          coinsEarned: Math.floor(runCents / 3),
          isCampaignClear: campaignComplete
        });
      } else {
        soundWaveClear();
        const worldNum = parseInt(levelData.id.split('-')[0], 10);
        const waveClearColor = worldNum === 2 ? '#ff4fd8' : '#00ff88';
        const waveClearAftershockColor = worldNum === 2 ? '#c68cff' : '#ffffff';
        const wavePopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 28, 'WAVE CLEARED!', waveClearColor);
        // Star earned popup
        const _earnedStars = (typeof playerProgress !== 'undefined' &&
          playerProgress.stageStars && playerProgress.stageStars[levelData.id]) || 0;
        if (_earnedStars > 0) {
          const _starDisplay = '★'.repeat(_earnedStars) + '☆'.repeat(3 - _earnedStars);
          const _starPopup = createPopup(
            centerObj.x,
            centerObj.y + orbitRadius + 32,
            _starDisplay,
            _earnedStars === 3 ? '#ffd84d' : (_earnedStars === 2 ? '#00e5ff' : 'rgba(255,255,255,0.5)')
          );
          _starPopup.life = 2.2;
          _starPopup.riseSpeed = 0.25;
          _starPopup.fadeSpeed = 0.012;
          _starPopup.shadow = _earnedStars === 3 ? 28 : 14;
          if (_earnedStars === 3) {
            createShockwave('#ffd84d', 24);
            pulseBrightness(1.4, 100);
          }
        }
        wavePopup.animType = 'combo';
        wavePopup.life = 1.85;
        wavePopup.riseSpeed = 0.8;
        wavePopup.fadeSpeed = 0.018;
        wavePopup.shadow = 28;
        createParticles(centerObj.x, centerObj.y, waveClearColor, Math.min(54, MAX_PARTICLES));
        createUpwardBurstParticles(centerObj.x, centerObj.y + 10, waveClearAftershockColor, 32);
        createUpwardBurstParticles(centerObj.x, centerObj.y + 4, waveClearColor, 34);
        triggerScreenShake(8);

        createShockwave(waveClearColor, 35);
        setTimeout(() => createShockwave(waveClearAftershockColor, 45), 100);
        setTimeout(() => createShockwave(waveClearColor, 52), 180);
        if (typeof vibrate === 'function') vibrate([28, 28, 42, 20, 70]);

        canvas.style.boxShadow = `inset 0 0 50px ${waveClearColor}`;
        setTimeout(() => canvas.style.boxShadow = 'none', 150);

        stageClearHoldUntil = performance.now() + 850;

        world2BossTransitionFrom25 = !!(levelData && levelData.id === '2-5' && nextLevelObj && nextLevelObj.id === '2-6');
        currentLevelIdx = nextLevelIdx;
        loadLevel(currentLevelIdx);
      }
    } else {
      spawnTargets();
    }
  }

  OG.systems.progression.getCheckpointIndex = getCheckpointIndex;
  OG.systems.progression.markStageStartRunStats = markStageStartRunStats;
  OG.systems.progression.updateWaveUI = updateWaveUI;
  OG.systems.progression.triggerStageClear = triggerStageClear;
})(window);
