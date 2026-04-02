(function initProgressionSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.progression = OG.systems.progression || {};

  function getCheckpointIndex() {
    let currentWorld = levelData.id.split('-')[0];
    for (let i = 0; i < campaign.length; i++) { if (campaign[i].id.startsWith(currentWorld + '-')) return i; }
    return 0;
  }

  function updateWaveUI() {
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
      saveData();

      if (wasBoss || worldAdvanced || campaignComplete) {
        showWorldClearSequence({
          nextLevelIdx: nextLevelObj ? nextLevelIdx : null,
          nextWorld: nextWorld || currentWorld,
          coinsEarned: Math.floor(runCents / 10),
          isCampaignClear: campaignComplete
        });
      } else {
        soundWaveClear();
        const worldNum = parseInt(levelData.id.split('-')[0], 10);
        const waveClearColor = worldNum === 2 ? '#ff4fd8' : '#00ff88';
        const waveClearAftershockColor = worldNum === 2 ? '#c68cff' : '#ffffff';
        const wavePopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 28, 'WAVE CLEARED!', waveClearColor);
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
  OG.systems.progression.updateWaveUI = updateWaveUI;
  OG.systems.progression.triggerStageClear = triggerStageClear;
})(window);
