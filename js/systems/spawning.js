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
    // ─── THE CORRUPTOR (World 4 Boss) ──────
    if (levelData.boss === 'corruptor') {
      const _hmActive = typeof isHardModeActive === 'function' && isHardModeActive();

      if (!isBossPhaseTwo) {

        // PHASE 1: Corner shield nodes — 4 purple shields drifting along sides
        if (bossPhase === 1) {
          ui.text.innerText = 'CORRUPTOR: Destroy the shield nodes.';
          ui.text.style.color = '#b157ff';
          // 4 nodes spaced evenly, drifting in alternating directions
          const nodeCount = _hmActive ? 4 : 4; // always 4, HM makes them faster
          const nodeSpeed = _hmActive ? 0.032 : 0.022;
          const nodeSize = _hmActive ? Math.PI / 7 : Math.PI / 6;
          for (let i = 0; i < nodeCount; i++) {
            const nodeAngle = (i * Math.PI * 2 / nodeCount) + 0.1;
            targets.push(buildTarget(nodeAngle, nodeSize, {
              color: '#b157ff',
              active: true,
              hp: _hmActive ? 2 : 3,
              isBossShield: true,
              moveSpeed: nodeSpeed * (i % 2 === 0 ? 1 : -1),
              nextDirectionSwapAt: performance.now() + 1400 + (i * 300)
            }));
          }
        }

        // PHASE 2: ENRAGED — 2 fast shields + phantom decoy
        else if (bossPhase === 2) {
          ui.text.innerText = 'CORRUPTOR ENRAGED: Find the real signal.';
          ui.text.style.color = '#ff3366';
          const phantomCount = _hmActive ? 2 : 1;
          const realAngle = Math.random() * Math.PI * 2;
          // Real shield
          targets.push(buildTarget(realAngle, Math.PI / 9, {
            color: '#b157ff',
            active: true,
            hp: 1,
            isBossShield: true,
            moveSpeed: _hmActive ? 0.048 : 0.038,
            nextDirectionSwapAt: performance.now() + 900
          }));
          // Second real shield (opposite)
          targets.push(buildTarget(
            normalizeAngle(realAngle + Math.PI * 1.15), Math.PI / 9, {
              color: '#b157ff',
              active: true,
              hp: 1,
              isBossShield: true,
              moveSpeed: _hmActive ? -0.042 : -0.034,
              nextDirectionSwapAt: performance.now() + 1100
            }
          ));
          // Phantom decoys — look identical to real shields
          for (let p = 0; p < phantomCount; p++) {
            targets.push(buildTarget(
              normalizeAngle(realAngle + Math.PI * (0.5 + p * 0.7)), Math.PI / 9.2, {
                color: '#b157ff',
                active: true,
                isPhantom: true,
                hp: 1,
                moveSpeed: 0.028 * (p % 2 === 0 ? 1 : -1)
              }
            ));
          }
        }

      } else {
        // CORE EXPOSED — tiny bright green node, corner-aligned, PERFECT required
        ui.text.innerText = 'CORRUPT CORE EXPOSED — PERFECT STRIKE ONLY';
        ui.text.style.color = '#00ff41';
        const _coreSize = _hmActive ? Math.PI / 15 : Math.PI / 12;
        // Snap core position to a corner angle of the square
        const cornerAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
        const coreAngle = cornerAngles[Math.floor(Math.random() * 4)];
        const coreTarget = buildTarget(coreAngle, _coreSize, {
          color: '#00ff41',
          active: true,
          hp: 1
        });
        coreTarget.isCorruptorCore = true;
        targets.push(coreTarget);
        // Visual flash to indicate core position
        setTimeout(() => {
          createShockwave('#00ff41', 24);
          createParticles(centerObj.x, centerObj.y, '#00ff41', 18);
        }, 120);
      }
      return;
    }
    // ─── END CORRUPTOR ──────────────────────

    if (levelData.boss === 'aegis') {
      if (!isBossPhaseTwo) {
        ui.text.innerText = bossPhase === 1 ? 'BOSS: Break the shields!' : 'BOSS ENRAGED: Faster & Sharper!';
        ui.text.style.color = bossPhase === 1 ? '#00e5ff' : '#ff3366';
        let offset = Math.random() * Math.PI * 2;
        const _hmActive = typeof isHardModeActive === 'function' && isHardModeActive();
        const shieldCount = bossPhase === 1 ? (_hmActive ? 4 : 3) : (_hmActive ? 3 : 2);
        for (let i = 0; i < shieldCount; i++) {
          targets.push(buildTarget(
            offset + (i * (Math.PI * 2 / shieldCount)),
            bossPhase === 1 ? Math.PI / 4 : Math.PI / 6,
            {
              color: bossPhase === 1 ? '#00e5ff' : '#ff3366', active: true, hp: 3, isBossShield: true,
              moveSpeed: bossPhase === 1
                ? (typeof isHardModeActive === 'function' && isHardModeActive() ? 0.022 * (i % 2 === 0 ? 1 : -1) : undefined)
                : (typeof isHardModeActive === 'function' && isHardModeActive() ? 0.058 * (i % 2 === 0 ? 1 : -1) : 0.038 * (i % 2 === 0 ? 1 : -1)),
              nextDirectionSwapAt: bossPhase === 1 ? 0 : (performance.now() + 1100 + Math.random() * 900)
            }
          ));
        }
      } else {
        ui.text.innerText = 'CORE EXPOSED! Need PERFECT hit!'; ui.text.style.color = '#ffffff';
        const _hmCore = typeof isHardModeActive === 'function' && isHardModeActive();
        targets.push(buildTarget(Math.random() * Math.PI * 2, _hmCore ? Math.PI / 14 : Math.PI / 10, { color: '#ffffff', active: true, hp: 1 }));
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
    // ═══════════════════════════════════════
    // WORLD 4 — GLITCH PROTOCOL STAGE SPAWNER
    // ═══════════════════════════════════════
    if (worldNum === 4 && !levelData.boss) {
      const w4Color = '#b157ff';       // Electric purple — real targets
      const w4PhantomColor = '#b157ff'; // Same colour — deliberate deception
      const w4GlowColor = '#cc88ff';

      // ─── 4-1: Corrupt Signal ───────────────
      // One real target, one phantom. Intro to deception.
      if (levelData.id === '4-1') {
        ui.text.innerText = 'One zone is real. One is corrupted. Read the signal.';
        ui.text.style.color = w4Color;
        const realAngle = Math.random() * Math.PI * 2;
        targets.push(buildTarget(realAngle, Math.PI / 8.5, {
          color: w4Color, active: true, hp: 1
        }));
        const phantomAngle = normalizeAngle(realAngle + Math.PI * 0.55 + (Math.random() * 0.4 - 0.2));
        targets.push(buildTarget(phantomAngle, Math.PI / 8.8, {
          color: w4PhantomColor, active: true, isPhantom: true, hp: 1
        }));
        return;
      }

      // ─── 4-2: Static Burst ─────────────────
      // Two real targets moving in opposite directions + one phantom.
      // Phantom offset from the real targets by ~third of the rail.
      if (levelData.id === '4-2') {
        ui.text.innerText = 'Two live zones. One ghost. All moving.';
        ui.text.style.color = w4Color;
        const baseAngle = Math.random() * Math.PI * 2;
        // Real targets: opposite sides, drifting toward each other
        targets.push(buildTarget(baseAngle, Math.PI / 9, {
          color: w4Color, active: true, hp: 1, moveSpeed: 0.007
        }));
        targets.push(buildTarget(normalizeAngle(baseAngle + Math.PI), Math.PI / 9, {
          color: w4Color, active: true, hp: 1, moveSpeed: -0.007
        }));
        // Phantom: offset at 90° from real ones
        targets.push(buildTarget(normalizeAngle(baseAngle + Math.PI * 0.5), Math.PI / 9.2, {
          color: w4PhantomColor, active: true, isPhantom: true, hp: 1, moveSpeed: 0.004
        }));
        return;
      }

      // ─── 4-3: Fragment Storm ───────────────
      // Single target that splits on hit + phantom appears after split.
      // Uses the existing split system but W4-coloured.
      if (levelData.id === '4-3') {
        ui.text.innerText = 'Hit the zone. Fragments scatter. One is a ghost.';
        ui.text.style.color = w4Color;
        // Use spawnControlledSplitRoot so the split family system
        // tracks this target properly — prevents ghost-clear bug
        const splitRoot = typeof spawnControlledSplitRoot === 'function'
          ? spawnControlledSplitRoot({
              color: w4Color,
              size: Math.PI / 8
            })
          : null;
        if (!splitRoot) {
          // Fallback if split system unavailable
          const splitAngle = Math.random() * Math.PI * 2;
          const fallback = buildTarget(splitAngle, Math.PI / 8, {
            color: w4Color, active: true, hp: 1
          });
          fallback.splitOnHit = true;
          fallback.splitGeneration = 0;
          fallback.splitDepth = 0;
          targets.push(fallback);
        }
        // Phantom decoy — offset ~quarter ring from the real target
        const splitAngle = splitRoot ? splitRoot.start : Math.random() * Math.PI * 2;
        const phantomOffset = normalizeAngle(splitAngle + Math.PI * 0.45 + (Math.random() * 0.3));
        targets.push(buildTarget(phantomOffset, Math.PI / 9, {
          color: w4PhantomColor, active: true, isPhantom: true, hp: 1
        }));
        return;
      }

      // ─── 4-4: Phase Shift ──────────────────
      // Two shrinking targets that reverse + one phantom.
      // Hardest regular stage — tests everything learned.
      if (levelData.id === '4-4') {
        ui.text.innerText = 'Shrinking. Reversing. One is a ghost. Precision is survival.';
        ui.text.style.color = w4Color;
        const progressionFactor = Math.min(1, (stageHits || 0) / Math.max(1, levelData.hitsNeeded || 8));
        const shrinkScale = 1.0 - (0.28 * progressionFactor);
        const baseSize = (Math.PI / 8.5) * shrinkScale;
        const realAngle = Math.random() * Math.PI * 2;
        // Real target A
        const tA = buildTarget(realAngle, baseSize, {
          color: w4Color, active: true, hp: 1, moveSpeed: 0.006
        });
        targets.push(tA);
        // Real target B — opposite direction
        const tB = buildTarget(normalizeAngle(realAngle + Math.PI * 1.1), baseSize, {
          color: w4Color, active: true, hp: 1, moveSpeed: -0.006
        });
        targets.push(tB);
        // Phantom — slightly different position
        const tP = buildTarget(normalizeAngle(realAngle + Math.PI * 0.55), baseSize * 0.96, {
          color: w4PhantomColor, active: true, isPhantom: true, hp: 1, moveSpeed: 0.003
        });
        targets.push(tP);
        return;
      }

      // ─── 4-5: System Overload ──────────────
      // Four real targets, no phantom — pure speed and multi-target overload.
      // Reward: players who mastered phantom detection now face honest chaos.
      if (levelData.id === '4-5') {
        ui.text.innerText = 'Maximum signal load. No tricks — just survive.';
        ui.text.style.color = w4Color;
        // Wave escalation: 3 targets early, builds to 4 on final waves
        const wave = Math.max(1, (stageHits || 0) + 1);
        const count = wave >= 8 ? 4 : 3;
        const spacing = (Math.PI * 2) / count;
        const offset = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const a = normalizeAngle(offset + (i * spacing));
          const speed = 0.007 + (wave * 0.0003); // grows slightly each wave
          targets.push(buildTarget(a, Math.PI / 9.5, {
            color: w4Color, active: true, hp: 1,
            moveSpeed: speed * (i % 2 === 0 ? 1 : -1)
          }));
        }
        return;
      }

      // Fallback for any other W4 non-boss stages
      const realAngle = Math.random() * Math.PI * 2;
      targets.push(buildTarget(realAngle, Math.PI / 9, {
        color: w4Color, active: true, hp: 1
      }));
      return;
    }
    // ═══════════════════════════════════════
    // END WORLD 4 STAGE SPAWNER
    // ═══════════════════════════════════════
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
    // Hard Mode: tighter windows
    if (typeof isHardModeActive === 'function' && isHardModeActive()) {
      baseSize *= 0.78;
    }
    let offset = Math.random() * Math.PI * 2;
    if (levelData.mechanics && levelData.mechanics.includes('twin')) {
      const twinSize = Math.PI / 9;
      const baseAnchor = Math.random() * Math.PI;
      const anchorA = normalizeAngle(baseAnchor);
      const anchorB = normalizeAngle(baseAnchor + Math.PI);
      const twinA = buildTarget(anchorA, twinSize, {
        color: '#2ff6ff', active: true, hp: 1, moveSpeed: 0
      });
      const twinB = buildTarget(anchorB, twinSize, {
        color: '#2ff6ff', active: true, hp: 1, moveSpeed: 0
      });
      twinA.isTwin = true;
      twinB.isTwin = true;
      targets.push(twinA);
      targets.push(twinB);
      if (ui && ui.text) {
        ui.text.innerText = 'Two mirrored zones. Hit both to clear.';
        ui.text.style.color = '#2ff6ff';
      }
      return;
    }

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
      target.isDual = false;
      target.dualState = 'normal';
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
