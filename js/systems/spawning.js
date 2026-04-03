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
      const isPhaseOne = bossPhase === 1;
      const isPhaseTwoSequence = bossPhase === 2;
      const isPhaseTwoCorners = bossPhase === 3;
      const isPhaseTwoCore = bossPhase === 4;
      isBossPhaseTwo = false;
      if (isPhaseOne) {
        world2BossSequenceProgress = 0;
        world2BossSequenceLength = 0;
        world2BossArenaRotationSpeed = 0.0034;
        world2BossNextForcedReverseAt = 0;
        ui.text.innerText = 'THE PRISM // ALIGNMENT';
        ui.text.style.color = '#2ff6ff';
        for (let i = 0; i < 4; i++) {
          const anchor = (i * Math.PI / 2) + 0.06;
          const facetTarget = buildTarget(
            anchor,
            Math.PI / 5.3,
            {
              color: i % 2 === 0 ? '#2ff6ff' : '#ff4fd8',
              active: true,
              hp: 3,
              isBossShield: true,
              moveSpeed: 0
            }
          );
          facetTarget.prismFacet = true;
          targets.push(facetTarget);
        }
      } else if (isPhaseTwoSequence) {
        world2BossSequenceProgress = 0;
        world2BossSequenceLength = 7;
        world2BossArenaRotationSpeed = 0.0068;
        world2BossNextForcedReverseAt = performance.now() + 2200;
        ui.text.innerText = 'SEQUENCE // CALIBRATION';
        ui.text.style.color = '#00e8ff';
        const seqColors = ['#00e8ff', '#ff4fd8', '#ffd54a', '#00e8ff', '#ff4fd8', '#ffd54a', '#00e8ff'];
        for (let i = 0; i < world2BossSequenceLength; i++) {
          const seqTarget = buildTarget(
            normalizeAngle((-Math.PI / 2) + (i * ((Math.PI * 2) / world2BossSequenceLength))),
            Math.PI / 6.4,
            {
              color: '#1a2238',
              active: true,
              hp: 1,
              isBossShield: true,
              moveSpeed: 0.0026 * (i % 2 === 0 ? 1 : -1)
            }
          );
          seqTarget.sequenceIndex = i;
          seqTarget.seqBaseColor = seqColors[i];
          seqTarget.seqIdleColorA = '#2b4169';
          seqTarget.seqIdleColorB = '#3a567f';
          seqTarget.seqPulseOffset = i * 160;
          targets.push(seqTarget);
        }
      } else if (isPhaseTwoCorners) {
        world2BossSequenceProgress = 0;
        world2BossSequenceLength = 4;
        world2BossArenaRotationSpeed = 0.006;
        ui.text.innerText = 'FINAL LOCK // CORNERS';
        ui.text.style.color = '#ffd54a';
        const cornerAnchors = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
        cornerAnchors.forEach((anchor, idx) => {
          const cornerTarget = buildTarget(normalizeAngle(anchor + 0.04), Math.PI / 8.6, {
            color: idx % 2 === 0 ? '#ffd54a' : '#00e8ff',
            active: true,
            hp: 1,
            isBossShield: true,
            moveSpeed: 0
          });
          cornerTarget.isPrismCornerLock = true;
          targets.push(cornerTarget);
        });
      } else if (isPhaseTwoCore) {
        world2BossArenaRotationSpeed = 0.0052;
        ui.text.innerText = 'CORE // FINAL STRIKE';
        ui.text.style.color = '#ffffff';
        const coreTarget = buildTarget(normalizeAngle(-Math.PI / 2), Math.PI / 9.5, {
          color: '#ffffff',
          active: true,
          hp: 1,
          moveSpeed: 0
        });
        coreTarget.isPrismFinalCore = true;
        targets.push(coreTarget);
      }
      return;
    }

    if (worldNum === 2 && !levelData.boss && Array.isArray(levelData.mechanics) && levelData.mechanics.length > 0) {
      spawnWorld2MechanicTargets();
      return;
    }
    if (worldNum === 3 && levelData.id === '3-1') {
      targets.push(buildTarget(Math.random() * Math.PI * 2, Math.PI / 7.5, {
        isEchoTarget: true,
        color: '#66f0ff',
        active: true,
        hp: 1
      }));
      return;
    }
    if (worldNum === 3 && levelData.id === '3-2') {
      ui.text.innerText = 'Tap when the cyan echo reaches the target.';
      ui.text.style.color = '#66f0ff';
      const baseAngles = [Math.PI * 0.85, Math.PI * 1.45, Math.PI * 0.2];
      const angleToUse = baseAngles[(stageHits || 0) % baseAngles.length];
      targets.push(buildTarget(angleToUse, Math.PI / 8, {
        active: true,
        hp: 1,
        color: '#66f0ff',
        isEchoTarget: true
      }));
      return;
    }
    if (worldNum === 3 && levelData.id === '3-3') {
      ui.text.innerText = 'Orange = real orb. Cyan = delayed echo.';
      ui.text.style.color = '#ffffff';

      const baseAngles = [Math.PI * 0.92, Math.PI * 1.52, Math.PI * 0.34, Math.PI * 1.18];
      const angleToUse = baseAngles[(stageHits || 0) % baseAngles.length];
      const useEchoTarget = ((stageHits || 0) % 2) === 1;

      targets.push(buildTarget(angleToUse, Math.PI / 7.4, {
        active: true,
        hp: 1,
        color: useEchoTarget ? '#66f0ff' : '#ff9f1a',
        isEchoTarget: useEchoTarget
      }));
      return;
    }
    if (worldNum === 3 && levelData.id === '3-4') {
      ui.text.innerText = 'Echo Drift: slow movement, mixed final wave.';
      ui.text.style.color = '#66f0ff';

      const wave = Math.max(1, (stageHits || 0) + 1);
      const isFinalWave = wave >= 5;
      const count = isFinalWave ? 6 : (3 + wave);
      const spacing = (Math.PI * 2) / count;
      const offset = ((stageHits || 0) % count) * (spacing * 0.5);

      for (let i = 0; i < count; i++) {
        const a = normalizeAngle(offset + (i * spacing));
        const isEcho = isFinalWave ? (i % 2 === 0) : true;
        targets.push(buildTarget(a, Math.PI / 9, {
          active: true,
          hp: 1,
          color: isEcho ? '#66f0ff' : '#ff9f1a',
          isEchoTarget: isEcho,
          drift: isEcho ? (0.002 + (wave * 0.0004)) : 0
        }));
      }
      return;
    }
    if (worldNum === 3 && levelData.id === '3-5') {
      ui.text.innerText = 'Cross Signal: orange + cyan, echo arcs drift.';
      ui.text.style.color = '#ffffff';

      const wave = Math.max(1, (stageHits || 0) + 1);
      const count = 4 + Math.min(4, wave);
      const spacing = (Math.PI * 2) / count;
      const offset = ((stageHits || 0) % count) * (spacing * 0.35);

      for (let i = 0; i < count; i++) {
        const a = normalizeAngle(offset + (i * spacing));
        const isEcho = i % 2 === 0;
        targets.push(buildTarget(a, Math.PI / 9.4, {
          active: true,
          hp: 1,
          color: isEcho ? '#66f0ff' : '#ff9f1a',
          isEchoTarget: isEcho,
          drift: isEcho ? 0.002 : 0
        }));
      }
      return;
    }
    if (worldNum === 3 && levelData.id === '3-6') {
      const waveIdx = Math.max(0, stageHits || 0);
      const phase = waveIdx < 3 ? 1 : (waveIdx < 6 ? 2 : 3);
      const phaseLabel = phase === 1
        ? 'Resonance Core: track the afterimage.'
        : (phase === 2 ? 'Resonance Core: signal crossover.' : 'Resonance Core: core unstable.');
      ui.text.innerText = phaseLabel;
      ui.text.style.color = '#ffffff';

      if (!world3BossIntroDone && waveIdx === 0) {
        world3BossIntroDone = true;
        showTempText('RESONANCE CORE', '#ffffff', 700);
        createPopup(centerObj.x, centerObj.y - 78, 'RESONANCE CORE', '#ffffff');
        setTimeout(() => showTempText('TRACK THE AFTERIMAGE', '#66f0ff', 760), 820);
        setTimeout(() => showTempText('REAL / ECHO / SURVIVE', '#ffb468', 840), 1720);
      }

      if (phase !== world3BossLastAnnouncedPhase) {
        world3BossLastAnnouncedPhase = phase;
        if (phase === 2) {
          createPopup(centerObj.x, centerObj.y - 54, 'PHASE 2', '#ffffff');
          createPopup(centerObj.x, centerObj.y - 20, 'SIGNAL CROSSOVER', '#66f0ff');
          showTempText('PHASE 2 — SIGNAL CROSSOVER', '#66f0ff', 920);
          createShockwave('#66f0ff', 36);
        } else if (phase === 3) {
          createPopup(centerObj.x, centerObj.y - 54, 'PHASE 3', '#ffffff');
          createPopup(centerObj.x, centerObj.y - 20, 'CORE UNSTABLE', '#ffb468');
          showTempText('PHASE 3 — CORE UNSTABLE', '#ffb468', 980);
          createShockwave('#ffffff', 34);
          createShockwave('#ff9f1a', 45);
        }
      }

      const phase1Patterns = [
        { offset: 0.02, size: Math.PI / 11.4, nodes: [{ slot: 0, echo: true }, { slot: 3, echo: true }, { slot: 6, echo: true }] },
        { offset: 0.18, size: Math.PI / 11.6, nodes: [{ slot: 1, echo: true }, { slot: 4, echo: true }, { slot: 7, echo: true }] },
        { offset: 0.34, size: Math.PI / 11.8, nodes: [{ slot: 0, echo: true }, { slot: 2, echo: true }, { slot: 5, echo: true }, { slot: 7, echo: true }] }
      ];
      const phase2Patterns = [
        { offset: 0.09, size: Math.PI / 12, nodes: [{ slot: 0, echo: true }, { slot: 2, echo: false }, { slot: 4, echo: true }, { slot: 6, echo: false }] },
        { offset: 0.24, size: Math.PI / 12.1, nodes: [{ slot: 1, echo: false }, { slot: 3, echo: true }, { slot: 5, echo: false }, { slot: 7, echo: true }] },
        { offset: 0.32, size: Math.PI / 12.3, nodes: [{ slot: 0, echo: true }, { slot: 2, echo: false }, { slot: 3, echo: true }, { slot: 6, echo: false }] }
      ];
      const phase3Patterns = [
        { offset: 0.11, size: Math.PI / 12.8, nodes: [{ slot: 0, echo: true }, { slot: 2, echo: false }, { slot: 3, echo: true, accent: true }, { slot: 5, echo: false }, { slot: 7, echo: true }] },
        { offset: 0.21, size: Math.PI / 12.9, nodes: [{ slot: 1, echo: false }, { slot: 2, echo: true }, { slot: 4, echo: false, accent: true }, { slot: 6, echo: true }, { slot: 7, echo: false }] },
        { offset: 0.35, size: Math.PI / 13.1, nodes: [{ slot: 0, echo: true }, { slot: 1, echo: false }, { slot: 3, echo: true }, { slot: 5, echo: false, accent: true }, { slot: 6, echo: true }] },
        { offset: 0.46, size: Math.PI / 13.2, nodes: [{ slot: 1, echo: true }, { slot: 2, echo: false }, { slot: 4, echo: true, accent: true }, { slot: 6, echo: false }, { slot: 7, echo: true }] }
      ];

      const patterns = phase === 1 ? phase1Patterns : (phase === 2 ? phase2Patterns : phase3Patterns);
      const patternIdx = phase === 1 ? waveIdx : (phase === 2 ? (waveIdx - 3) : (waveIdx - 6));
      const pattern = patterns[patternIdx % patterns.length];
      const slots = 8;
      const spacing = (Math.PI * 2) / slots;
      const patternOffset = pattern.offset + ((waveIdx % 2) * 0.02);

      pattern.nodes.forEach((node) => {
        const centerAngle = normalizeAngle(patternOffset + (node.slot * spacing));
        const startAngle = normalizeAngle(centerAngle - (pattern.size / 2));
        const isEcho = !!node.echo;
        const pressureAccent = !!node.accent;
        const target = buildTarget(startAngle, pattern.size, {
          active: true,
          hp: 1,
          color: isEcho ? '#66f0ff' : '#ff9f1a',
          isEchoTarget: isEcho,
          drift: isEcho ? (phase === 1 ? 0.0016 : 0.0022) : 0
        });
        target.isResonanceBossTarget = true;
        target.isResonancePressureAccent = pressureAccent;
        targets.push(target);
      });
      return;
    }
    if (worldNum === 4 && levelData.id === '4-1') {
      const step = stageHits || 0;
      world4TutorialStep = step;
      const baseAngles = [Math.PI * 1.05, Math.PI * 0.28, Math.PI * 1.52, Math.PI * 0.82];
      const angleToUse = baseAngles[step % baseAngles.length];

      if (step === 0) {
        world4FocusMode = 'main';
        ui.text.innerText = 'MAIN ORB: hit the orange target.';
        ui.text.style.color = '#ff9f1a';
        targets.push(buildTarget(angleToUse, Math.PI / 7.5, {
          active: true,
          hp: 1,
          color: '#ff9f1a'
        }));
        return;
      }

      if (step === 1) {
        world4FocusMode = 'echo';
        ui.text.innerText = 'ECHO ORB: now hit the cyan target.';
        ui.text.style.color = '#66f0ff';
        targets.push(buildTarget(angleToUse, Math.PI / 7.5, {
          active: true,
          hp: 1,
          color: '#66f0ff',
          isEchoTarget: true
        }));
        return;
      }

      if (step === 2) {
        world4FocusMode = 'main';
        ui.text.innerText = 'Orange first.';
        ui.text.style.color = '#ff9f1a';
        targets.push(buildTarget(angleToUse, Math.PI / 7.5, {
          active: true,
          hp: 1,
          color: '#ff9f1a'
        }));
        return;
      }

      if (step === 3) {
        world4FocusMode = 'echo';
        ui.text.innerText = 'Then cyan.';
        ui.text.style.color = '#66f0ff';
        targets.push(buildTarget(angleToUse, Math.PI / 7.5, {
          active: true,
          hp: 1,
          color: '#66f0ff',
          isEchoTarget: true
        }));
        return;
      }

      world4FocusMode = 'none';
    }
    if (worldNum === 4 && levelData.id === '4-5') {
      const step = stageHits || 0;
      const waveSequence = [
        { type: 'main', angle: Math.PI * 1.02 }, // Wave 1
        { type: 'echo', angle: Math.PI * 0.28 },
        { type: 'main', angle: Math.PI * 1.42 },
        { type: 'echo', angle: Math.PI * 0.74 },
        { type: 'main', angle: Math.PI * 1.26 }, // Wave 2
        { type: 'echo', angle: Math.PI * 0.34 },
        { type: 'echo', angle: Math.PI * 1.62 },
        { type: 'main', angle: Math.PI * 0.92 },
        { type: 'fracture', angle: Math.PI * 1.14 }, // Wave 3
        { type: 'main', angle: Math.PI * 0.46 }, // Wave 4
        { type: 'echo', angle: Math.PI * 1.54 },
        { type: 'fracture', angle: Math.PI * 0.82 },
        { type: 'main', angle: Math.PI * 1.24 },
        { type: 'main', angle: Math.PI * 0.62 }, // Wave 5
        { type: 'echo', angle: Math.PI * 1.32 },
        { type: 'fracture', angle: Math.PI * 0.22 },
        { type: 'main', angle: Math.PI * 1.66 },
        { type: 'echo', angle: Math.PI * 0.98 }
      ];
      const entry = waveSequence[step % waveSequence.length];
      const targetWidth = entry.type === 'fracture' ? (Math.PI / 8.2) : (Math.PI / 7.9);

      if (entry.type === 'main') {
        world4FocusMode = 'main';
        ui.text.innerText = 'Convergence: orange handoff.';
        ui.text.style.color = '#ff9f1a';
        targets.push(buildTarget(entry.angle, targetWidth, {
          active: true,
          hp: 1,
          color: '#ff9f1a'
        }));
        return;
      }

      if (entry.type === 'echo') {
        world4FocusMode = 'echo';
        ui.text.innerText = 'Convergence: cyan echo read.';
        ui.text.style.color = '#66f0ff';
        targets.push(buildTarget(entry.angle, targetWidth, {
          active: true,
          hp: 1,
          color: '#66f0ff',
          isEchoTarget: true
        }));
        return;
      }

      world4FocusMode = 'none';
      ui.text.innerText = 'Convergence: fracture split (orange + cyan).';
      ui.text.style.color = '#ffffff';
      targets.push(buildTarget(entry.angle, Math.PI / 8, {
        active: true,
        hp: 1,
        color: '#ffffff',
        mechanic: 'split',
        type: 'fracture',
        splitOnHit: true,
        splitDepth: 0,
        splitGeneration: 0,
        deterministicWorld4: true
      }));
      return;
    }

    const progressionFactor = Math.min(1, Math.max(0, stageHits / Math.max(1, levelData.hitsNeeded || 5)));
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
    baseSize *= (1 - (0.12 * progressionFactor));
    let offset = Math.random() * Math.PI * 2;
    const isDual = levelData.mechanics && levelData.mechanics.includes('dual');

    for (let i = 0; i < tCount; i++) {
      const angle = normalizeAngle(offset + (i * (Math.PI * 2 / tCount)) + (baseSize / 2));
      const target = buildTarget(offset + (i * (Math.PI * 2 / tCount)), baseSize, {
        color: worldNum === 2 ? currentWorldVisualTheme.targetColor : (tCount > 1 ? '#ff3366' : palette.primary),
        active: true,
        hp: 1
      });
      const shouldUseFracture = !inMenu
        && !levelData.boss
        && worldNum >= 2
        && progressionFactor > 0.35
        && Math.random() < (0.14 * progressionFactor);
      if (shouldUseFracture) {
        target.type = 'fracture';
        target.state = 'intact';
        target.mechanic = 'split';
        target.splitOnHit = true;
        target.splitGeneration = 0;
        target.splitDepth = 0;
      }
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
