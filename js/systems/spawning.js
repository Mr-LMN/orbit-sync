(function initSpawningSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.spawning = OG.systems.spawning || {};

  function spawnTargets() {
    targets = [];
    if (OrbitGame.systems && OrbitGame.systems.splitControl) {
      OrbitGame.systems.splitControl.resetSplitFamilyState();
    }
    const palette = getWorldPalette();
    const worldNum = parseInt(levelData.id.split('-')[0], 10);
    if (levelData.boss === 'aegis') {
      if (!isBossPhaseTwo) {
        ui.text.innerText = bossPhase === 1 ? 'BOSS: Break the shields!' : 'BOSS ENRAGED: Faster & Sharper!';
        ui.text.style.color = bossPhase === 1 ? '#00e5ff' : '#ff3366';
        let offset = Math.random() * Math.PI * 2;
        const shieldCount = bossPhase === 1 ? 3 : 2;
        for (let i = 0; i < shieldCount; i++) {
          targets.push(buildTarget(
            offset + (i * (Math.PI * 2 / shieldCount)),
            bossPhase === 1 ? Math.PI / 4 : Math.PI / 6,
            {
              color: bossPhase === 1 ? '#00e5ff' : '#ff3366', active: true, hp: 3, isBossShield: true,
              moveSpeed: bossPhase === 1 ? undefined : 0.038 * (i % 2 === 0 ? 1 : -1),
              nextDirectionSwapAt: bossPhase === 1 ? 0 : (performance.now() + 1100 + Math.random() * 900)
            }
          ));
        }
      } else {
        ui.text.innerText = 'CORE EXPOSED! Need PERFECT hit!'; ui.text.style.color = '#ffffff';
        targets.push(buildTarget(Math.random() * Math.PI * 2, Math.PI / 10, { color: '#ffffff', active: true, hp: 1 }));
      }
      return;
    }

    if (levelData.boss === 'prism') {
      const isPhaseTwoSequence = bossPhase === 2;
      isBossPhaseTwo = false;
      if (!isPhaseTwoSequence) {
        world2BossSequenceProgress = 0;
        world2BossSequenceLength = 0;
        world2BossArenaRotationSpeed = 0.0034;
        ui.text.innerText = 'PHASE 1: Stabilize the rotating prism rail.';
        ui.text.style.color = '#2ff6ff';
        for (let i = 0; i < 4; i++) {
          const anchor = (i * Math.PI / 2) + 0.06;
          targets.push(buildTarget(
            anchor,
            Math.PI / 5.7,
            {
              color: i % 2 === 0 ? '#2ff6ff' : '#ff4fd8',
              active: true,
              hp: 2,
              isBossShield: true,
              moveSpeed: 0
            }
          ));
        }
      } else {
        world2BossSequenceProgress = 0;
        world2BossSequenceLength = 5;
        world2BossArenaRotationSpeed = 0.0052;
        ui.text.innerText = 'PHASE 2: Hit the highlighted sequence in order.';
        ui.text.style.color = '#ffd54a';
        for (let i = 0; i < world2BossSequenceLength; i++) {
          const seqTarget = buildTarget(
            normalizeAngle((-Math.PI / 2) + (i * ((Math.PI * 2) / world2BossSequenceLength))),
            Math.PI / 7.1,
            {
              color: '#4e5970',
              active: true,
              hp: 1,
              isBossShield: true,
              moveSpeed: 0
            }
          );
          seqTarget.sequenceIndex = i;
          targets.push(seqTarget);
        }
      }
      return;
    }

    if (worldNum === 2 && !levelData.boss && Array.isArray(levelData.mechanics) && levelData.mechanics.length > 0) {
      spawnWorld2MechanicTargets();
      return;
    }

    let tCount = levelData.targets === 'boss' || levelData.targets === 'random' ? Math.floor(Math.random() * 3) + 1 : levelData.targets;
    const isFixedThreeTargetTutorialStage = levelData.id === '1-5' || levelData.fixedTargetCount === true;
    if (tCount === 3 && !isFixedThreeTargetTutorialStage) {
      const patterns = [3, 2, 4];
      tCount = patterns[stageHits % patterns.length];
    }

    let sizeModifier = 1.0;
    if (tCount === 2) sizeModifier = 0.6;
    if (tCount === 3) sizeModifier = 0.5;
    if (tCount === 4) sizeModifier = 0.35;

    let baseSize = Math.max(Math.PI / 10, (Math.PI / 3) - (currentLevelIdx * 0.02)) * sizeModifier;
    let offset = Math.random() * Math.PI * 2;
    const isDual = levelData.mechanics && levelData.mechanics.includes('dual');

    for (let i = 0; i < tCount; i++) {
      const angle = normalizeAngle(offset + (i * (Math.PI * 2 / tCount)) + (baseSize / 2));
      const target = buildTarget(offset + (i * (Math.PI * 2 / tCount)), baseSize, {
        color: worldNum === 2 ? currentWorldVisualTheme.targetColor : (tCount > 1 ? '#ff3366' : palette.primary),
        active: true,
        hp: 1
      });
      target.angle = angle;
      target.baseAngle = angle;
      target.isDual = isDual;
      target.targetHalfWidth = baseSize / 2;
      target.dualState = isDual ? 'full' : 'normal';
      targets.push(target);
    }
    if (levelData.hasPhantom && !inMenu && !levelData.boss) {
      const realTargetAngle = targets.length > 0
        ? targets[0].start + targets[0].size + (Math.PI * 0.4)
        : Math.random() * Math.PI * 2;
      targets.push(buildTarget(((realTargetAngle) % (Math.PI * 2)), worldNum === 2 ? (Math.PI / 8.6) : (Math.PI / 9), {
        color: '#ff3366',
        active: true,
        isPhantom: true,
        hp: 1
      }));
    }

    if (levelData.hasHeart && !inMenu && !levelData.boss) {
      const baseProbability = lives === 1 ? 0.85 : lives === 2 ? 0.4 : 0.15;
      const diminishingFactor = Math.pow(0.5, lifeZonesSpawnedThisRun);
      const finalChance = baseProbability * diminishingFactor;

      if (lifeZonesSpawnedThisRun < 4 && Math.random() < finalChance) {
        lifeZonesSpawnedThisRun++;
        targets.push(buildTarget(
          Math.random() * Math.PI * 2,
          Math.PI / 10,
          {
            color: '#ffaa00',
            active: true,
            isHeart: true,
            isLifeZone: true,
            expireDistance: Math.PI * 5
          }
        ));
        setTimeout(() => soundLifeZone(), 100);
      }
    }
  }

  OG.systems.spawning.spawnTargets = spawnTargets;
})(window);
