(function initTargetEntity(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.target = OG.entities.target || {};

  function resolveMovement(config, definition) {
    const canMove = config.canMove !== undefined
      ? !!config.canMove
      : (definition && definition.canMove !== undefined ? !!definition.canMove : true);
    const baseMove = config.move !== undefined
      ? config.move
      : (definition && definition.defaults && definition.defaults.move !== undefined ? definition.defaults.move : 0);
    const baseMoveSpeed = config.moveSpeed !== undefined
      ? config.moveSpeed
      : (definition && definition.defaults && definition.defaults.moveSpeed !== undefined ? definition.defaults.moveSpeed : baseMove);
    return {
      move: canMove ? baseMove : 0,
      moveSpeed: canMove ? baseMoveSpeed : 0,
      canMove
    };
  }

  function createTarget(type = 'standard', overrides = {}) {
    const defs = OG.entities.targetDefinitions;
    const definition = defs && defs.get ? defs.get(type) : null;
    const defaults = definition && definition.defaults ? definition.defaults : {};
    const config = Object.assign({}, defaults, overrides);
    const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
    const movement = resolveMovement(config, definition);
    const size = Number.isFinite(config.size) ? config.size : 1;
    const normalizedType = config.type === 'dual' || type === 'dual'
      ? 'dual'
      : (config.type === 'fracture' || config.type === 'shard' || type === 'fracture' || type === 'shard' || type === 'splitRoot' || type === 'splitChild'
        ? (config.type === 'shard' || type === 'shard' || type === 'splitChild' ? 'shard' : 'fracture')
        : 'standard');

    const target = {
      start: config.start,
      size,
      active: config.active !== undefined ? !!config.active : true,
      color: config.color || (worldNum === 2 ? '#ff4fd8' : '#ff3366'),
      move: movement.move,
      moveSpeed: movement.moveSpeed,
      canMove: movement.canMove,
      shrink: config.shrink || null,
      initialSize: size,
      baseSize: size,
      spawnDistance: (typeof totalStageDistance !== 'undefined') ? totalStageDistance : 0,
      shrinkConfig: (!config.isHeart && !config.isBossShield && levelData && levelData.shrink) ? levelData.shrink : null,
      pulseConfig: (!config.isHeart && !config.isBossShield && !config.isPhantom && !config.isCornerBonus && levelData && levelData.pulse)
        ? levelData.pulse
        : null,
      pulsePhaseOffset: (size % (Math.PI * 2)) * 420,
      pulseAtMinimum: false,
      distanceMoved: 0,
      isHeart: !!config.isHeart,
      isLifeZone: !!config.isLifeZone,
      expireDistance: config.expireDistance || (Math.PI * 5),
      isPhantom: !!config.isPhantom,
      isEchoTarget: !!config.isEchoTarget,
      isSyncTarget: !!config.isSyncTarget,
      isCornerBonus: !!config.isCornerBonus,
      type: normalizedType,
      state: config.state || (normalizedType === 'dual' ? 'split' : 'intact'),
      mechanic: config.mechanic !== undefined ? config.mechanic : (definition ? definition.mechanic : null),
      variant: config.variant || null,
      renderStyle: config.renderStyle || null,
      hitProfile: config.hitProfile || (definition ? definition.hitProfile : null),
      behaviour: config.behaviour || (definition ? definition.behaviour : null),
      config: config.config || null,
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
      ,
      spawnScale: Number.isFinite(config.spawnScale) ? config.spawnScale : 0.86
    };

    if (Number.isFinite(config.cornerAnchor)) target.cornerAnchor = normalizeAngle(config.cornerAnchor);
    if (config.cornerBackWindow !== undefined) target.cornerBackWindow = config.cornerBackWindow;
    if (config.cornerOvershootWindow !== undefined) target.cornerOvershootWindow = config.cornerOvershootWindow;
    if (config.cornerPerfectWindow !== undefined) target.cornerPerfectWindow = config.cornerPerfectWindow;
    if (config.cornerHitboxExpand !== undefined) target.cornerHitboxExpand = config.cornerHitboxExpand;
    if (config.cornerVisualThickness !== undefined) target.cornerVisualThickness = config.cornerVisualThickness;

    if (config.leftColor) target.leftColor = config.leftColor;
    if (config.rightColor) target.rightColor = config.rightColor;
    if (config.coreColor) target.coreColor = config.coreColor;
    if (config.shellColor) target.shellColor = config.shellColor;

    return target;
  }

  function buildTarget(start, size, config = {}) {
    return createTarget(config.type || 'standard', Object.assign({}, config, { start, size }));
  }

  function buildCornerPrecisionTarget(anchorAngle, options = {}) {
    const backWindow = options.backWindow ?? 0.135;
    const overshootWindow = options.overshootWindow ?? 0.135;
    const totalSize = backWindow + overshootWindow;
    const start = normalizeAngle(anchorAngle - backWindow);
    return createTarget('corner', {
      start,
      size: totalSize,
      color: options.color || '#78f8ff',
      move: options.move || 0,
      hp: options.hp || 1,
      cornerAnchor: anchorAngle,
      cornerBackWindow: backWindow,
      cornerOvershootWindow: overshootWindow,
      cornerPerfectWindow: options.perfectWindow ?? 0.015,
      cornerHitboxExpand: options.hitboxExpand ?? 0.028,
      cornerVisualThickness: options.visualThickness ?? 1.0
    });
  }

  function buildDualTarget(startAngle, options = {}) {
    const size = options.size || (Math.PI / 3.1);
    const t = createTarget('dual', {
      start: normalizeAngle(startAngle),
      size,
      color: options.color || '#2ff6ff',
      move: options.move || 0,
      hp: options.hp || 1,
      isDual: true,
      dualState: 'full',
      targetHalfWidth: size / 2,
      leftColor: options.leftColor || '#2ff6ff',
      rightColor: options.rightColor || '#ff4fd8',
      coreColor: options.coreColor || '#ffffff',
      shellColor: options.shellColor || '#ffd54a'
    });
    return t;
  }

  function buildSplitTarget(startAngle, size, options = {}) {
    const splitType = options.mechanic === 'splitChild' ? 'shard' : 'fracture';
    return createTarget(splitType, {
      start: normalizeAngle(startAngle),
      size,
      color: options.color || '#2ff6ff',
      move: options.move || 0,
      mechanic: options.mechanic || (splitType === 'shard' ? 'splitChild' : 'split'),
      splitOnHit: true,
      splitDepth: options.splitDepth || 0,
      splitFamilyId: options.splitFamilyId ?? null,
      splitGeneration: options.splitGeneration || 0,
      state: options.state || (splitType === 'shard' ? 'split' : 'intact'),
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

    if (id === '2-3' && splitControl && splitControl.isSplitStageMode(levelData)) {
      const tutorialSize = Math.PI / 3.35;
      splitControl.spawnControlledSplitRoot({
        startAngle: normalizeAngle(-Math.PI / 2 - (tutorialSize / 2)),
        size: tutorialSize,
        move: levelData.moveSpeed || 0,
        color: '#2ff6ff',
        tutorialSplit: true
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

  OG.entities.target.createTarget = createTarget;
  OG.entities.target.buildTarget = buildTarget;
  OG.entities.target.buildCornerPrecisionTarget = buildCornerPrecisionTarget;
  OG.entities.target.buildDualTarget = buildDualTarget;
  OG.entities.target.buildSplitTarget = buildSplitTarget;
  OG.entities.target.spawnWorld2CornerBonusTargets = spawnWorld2CornerBonusTargets;
  OG.entities.target.spawnWorld2MechanicTargets = spawnWorld2MechanicTargets;
  OG.entities.target.isInsideTarget = isInsideTarget;
})(window);
