(function initTargetEntity(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.target = OG.entities.target || {};

  function buildTarget(start, size, config = {}) {
    const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
    return {
      start,
      size,
      active: true,
      color: config.color || (worldNum === 2 ? '#ff4fd8' : '#ff3366'),
      move: config.move || 0,
      shrink: config.shrink || null,
      initialSize: size,
      distanceMoved: 0,
      isHeart: !!config.isHeart,
      isPhantom: !!config.isPhantom,
      isCornerBonus: !!config.isCornerBonus,
      mechanic: config.mechanic || null,
      isDual: !!config.isDual,
      dualState: config.dualState || 'full',
      targetHalfWidth: config.targetHalfWidth || null,
      splitOnHit: !!config.splitOnHit,
      splitDepth: config.splitDepth || 0,
      splitFamilyId: config.splitFamilyId ?? null,
      splitGeneration: config.splitGeneration || 0,
      isBossShield: !!config.isBossShield,
      nextDirectionSwapAt: config.nextDirectionSwapAt || 0,
      hp: Number.isFinite(config.hp) ? config.hp : 1
    };
  }

  function buildCornerPrecisionTarget(anchorAngle, options = {}) {
    const backWindow = options.backWindow ?? 0.135;
    const overshootWindow = options.overshootWindow ?? 0.135;
    const totalSize = backWindow + overshootWindow;
    const start = normalizeAngle(anchorAngle - backWindow);
    const t = buildTarget(start, totalSize, {
      color: options.color || '#78f8ff',
      move: options.move || 0,
      mechanic: 'corner',
      hp: options.hp || 1
    });
    t.cornerAnchor = normalizeAngle(anchorAngle);
    t.cornerBackWindow = backWindow;
    t.cornerOvershootWindow = overshootWindow;
    t.cornerPerfectWindow = options.perfectWindow ?? 0.015;
    t.cornerHitboxExpand = options.hitboxExpand ?? 0.028;
    t.cornerVisualThickness = options.visualThickness ?? 1.0;
    return t;
  }

  function buildDualTarget(startAngle, options = {}) {
    const size = options.size || (Math.PI / 3.1);
    const t = buildTarget(normalizeAngle(startAngle), size, {
      color: options.color || '#2ff6ff',
      move: options.move || 0,
      mechanic: 'dual',
      isDual: true,
      dualState: 'full',
      hp: options.hp || 1
    });
    t.targetHalfWidth = size / 2;
    t.leftColor = options.leftColor || '#2ff6ff';
    t.rightColor = options.rightColor || '#ff4fd8';
    t.coreColor = options.coreColor || '#ffffff';
    t.shellColor = options.shellColor || '#ffd54a';
    return t;
  }

  function buildSplitTarget(startAngle, size, options = {}) {
    return buildTarget(normalizeAngle(startAngle), size, {
      color: options.color || '#2ff6ff',
      move: options.move || 0,
      mechanic: options.mechanic || 'split',
      splitOnHit: true,
      splitDepth: options.splitDepth || 0,
      splitFamilyId: options.splitFamilyId ?? null,
      splitGeneration: options.splitGeneration || 0,
      hp: options.hp || 1
    });
  }

  function spawnWorld2CornerBonusTargets() {
    const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
    if (worldNum !== 2) return;
    const stageId = levelData ? levelData.id : '';
    if (!stageId.startsWith('2-')) return;

    const regularTargets = targets.filter(t => t.active && !t.isHeart && !t.isPhantom && !t.isCornerBonus);
    if (regularTargets.length === 0 || regularTargets.length > 2) return;
    if (targets.some(t => t.isCornerBonus && t.active)) return;

    const corners = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    const chosen = corners[Math.floor(Math.random() * corners.length)];
    const bonus = buildTarget(normalizeAngle(chosen - 0.06), 0.12, {
      color: '#ffd54a',
      isCornerBonus: true,
      mechanic: 'cornerBonus',
      move: 0
    });
    bonus.cornerAnchor = normalizeAngle(chosen);
    bonus.cornerBackWindow = 0.06;
    bonus.cornerOvershootWindow = 0.06;
    bonus.cornerPerfectWindow = 0.02;
    bonus.cornerHitboxExpand = 0.02;
    bonus.cornerVisualThickness = 0.72;
    targets.push(bonus);
  }

  function spawnWorld2MechanicTargets() {
    const splitControl = OG.systems && OG.systems.splitControl;
    const mechanics = levelData.mechanics || [];
    const count = levelData.targets || 1;
    const spacing = (Math.PI * 2) / count;
    const id = levelData?.id || '';

    // Restore the original bespoke intro logic for 2-1.
    // This stage works best as a deterministic corner tutorial:
    // true corners only, predictable cycling, no random anchor drift.
    if (id === '2-1') {
      const corners = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
      const cornerIdx = stageHits % 4;

      targets.push(buildCornerPrecisionTarget(corners[cornerIdx], {
        backWindow: 0.135,
        overshootWindow: 0.135,
        perfectWindow: 0.015,
        hitboxExpand: 0.028,
        color: '#78f8ff',
        move: levelData.moveSpeed || 0
      }));
      return;
    }

    if (id === '2-4' && splitControl && splitControl.isSplitStageMode(levelData)) {
      splitControl.spawnControlledSplitRoot({
        size: Math.PI / 4.2,
        move: levelData.moveSpeed || 0
      });
      return;
    }

    let splitSpawned = false;

    for (let i = 0; i < count; i++) {
      const base = normalizeAngle((Math.random() * Math.PI * 2) + (i * spacing * 0.35));

      if (mechanics.includes('corner') && (mechanics.length === 1 || Math.random() < 0.45)) {
        targets.push(buildCornerPrecisionTarget(base + (Math.random() * 0.3 - 0.15), {
          color: '#78f8ff',
          move: levelData.moveSpeed || 0
        }));
      } else if (mechanics.includes('dual') && (mechanics.length === 1 || Math.random() < 0.6)) {
        targets.push(buildDualTarget(base, {
          size: Math.PI / 3.1,
          move: levelData.moveSpeed || 0
        }));
      } else if (mechanics.includes('split') && splitControl && !splitSpawned && !splitControl.hasActiveSplitFamily()) {
        const splitTarget = splitControl.spawnControlledSplitRoot({
          startAngle: base - (Math.PI / 8.4),
          size: Math.PI / 4.2,
          move: levelData.moveSpeed || 0,
          color: '#2ff6ff'
        });
        splitSpawned = !!splitTarget;
      } else {
        targets.push(buildTarget(base, Math.PI / 4.5, {
          move: levelData.moveSpeed || 0
        }));
      }
    }
  }

  function isInsideTarget(playerAngle, t) {
    const end = t.start + t.size;
    if (end > Math.PI * 2) return playerAngle >= t.start || playerAngle <= (end - Math.PI * 2);
    return playerAngle >= t.start && playerAngle <= end;
  }

  OG.entities.target.buildTarget = buildTarget;
  OG.entities.target.buildCornerPrecisionTarget = buildCornerPrecisionTarget;
  OG.entities.target.buildDualTarget = buildDualTarget;
  OG.entities.target.buildSplitTarget = buildSplitTarget;
  OG.entities.target.spawnWorld2CornerBonusTargets = spawnWorld2CornerBonusTargets;
  OG.entities.target.spawnWorld2MechanicTargets = spawnWorld2MechanicTargets;
  OG.entities.target.isInsideTarget = isInsideTarget;
})(window);
