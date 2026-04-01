(function initTargetBehaviours(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};

  function applyDualHit(t, hitCtx) {
    const centerAngle = (typeof t.angle === 'number') ? t.angle : hitCtx.normalizeAngle(t.start + (t.size / 2));
    const targetHalfWidth = t.targetHalfWidth || (t.size / 2);
    const diff = hitCtx.signedAngularDistance(hitCtx.angle, centerAngle);
    const perfectThreshold = targetHalfWidth * 0.46;

    if (Math.abs(diff) > targetHalfWidth) return;

    if (t.dualState === 'full') {
      if (Math.abs(diff) <= perfectThreshold) {
        t.dualState = 'cleared';
        t.active = false;
        hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, '#ffffff', 24);
        hitCtx.createShockwave('#ffffff', 22);
        if (hitCtx.audioCtx) hitCtx.playPop(1, false, true);
        hitCtx.createPopup(hitCtx.hitX, hitCtx.hitY - 36, 'PERFECT LINK', '#ffffff');
      } else {
        if (diff < 0) {
          t.dualState = 'right';
          hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, '#2ff6ff', 16);
        } else {
          t.dualState = 'left';
          hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, '#ff4fd8', 16);
        }
        if (hitCtx.audioCtx) hitCtx.playPop(4, false);
        hitCtx.triggerScreenShake(3);
        hitCtx.createPopup(hitCtx.hitX, hitCtx.hitY - 30, 'HALF CLEARED', '#ffffff');
        return { keepTarget: true };
      }
    } else if (t.dualState !== 'cleared') {
      const remainingState = t.dualState;
      t.dualState = 'cleared';
      t.active = false;
      const pColor = remainingState === 'left' ? '#2ff6ff' : '#ff4fd8';
      hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, pColor, 18);
      if (hitCtx.audioCtx) hitCtx.playPop(1, false, true);
      hitCtx.createPopup(hitCtx.hitX, hitCtx.hitY - 22, 'LINKED', '#ffffff');
    }

    return { keepTarget: false };
  }

  function applySplitHit(t, hitCtx) {
    const splitFamilyId = t.splitFamilyId;
    const splitGeneration = Number.isFinite(t.splitGeneration) ? t.splitGeneration : (t.splitDepth || 0);
    t.active = false;

    const nextDepth = (t.splitDepth || 0) + 1;
    if (t.splitOnHit && splitGeneration < 2 && nextDepth <= 2) {
      const isSplitTutorialStage = hitCtx.levelData && hitCtx.levelData.id === '2-3';
      const parentCenter = hitCtx.normalizeAngle(t.start + (t.size / 2));
      const childSize = Math.max(Math.PI / 40, t.size * (isSplitTutorialStage ? (nextDepth === 1 ? 0.62 : 0.56) : 0.8));
      const launchBase = nextDepth === 1 ? 0.95 : 1.2;
      const leftOffset = isSplitTutorialStage ? (nextDepth === 1 ? 1.22 : 0.82) : (launchBase + (Math.random() * 0.42));
      const rightOffset = isSplitTutorialStage ? (nextDepth === 1 ? 1.22 : 0.82) : (launchBase + (Math.random() * 0.42));
      const leftTargetStart = hitCtx.normalizeAngle(parentCenter - leftOffset - (childSize / 2));
      const rightTargetStart = hitCtx.normalizeAngle(parentCenter + rightOffset - (childSize / 2));
      const spawnStart = hitCtx.normalizeAngle(parentCenter - (childSize / 2));

      const leftColor = nextDepth === 1 ? '#ff9b54' : '#ffd54a';
      const rightColor = nextDepth === 1 ? '#ff4fd8' : '#7cf7ff';

      const leftChild = hitCtx.buildTarget(spawnStart, childSize, {
        color: leftColor, active: true, hp: 1, mechanic: 'splitChild', type: 'splitChild', splitOnHit: nextDepth < 2,
        splitDepth: nextDepth, splitFamilyId, splitGeneration: nextDepth
      });
      leftChild.moveSpeed = 0;
      leftChild.splitCruiseSpeed = hitCtx.getSplitCruiseSpeed(hitCtx.levelData, nextDepth, -1);
      leftChild.splitSideSign = -1;
      leftChild.splitLaunchT = 0;
      leftChild.splitLaunchFrom = spawnStart;
      leftChild.splitLaunchTarget = leftTargetStart;
      leftChild.splitFamilyId = splitFamilyId;
      leftChild.splitGeneration = nextDepth;
      leftChild.hitScalePulse = 1.1;
      leftChild.hitFlash = 1;

      const rightChild = hitCtx.buildTarget(spawnStart, childSize, {
        color: rightColor, active: true, hp: 1, mechanic: 'splitChild', type: 'splitChild', splitOnHit: nextDepth < 2,
        splitDepth: nextDepth, splitFamilyId, splitGeneration: nextDepth
      });
      rightChild.moveSpeed = 0;
      rightChild.splitCruiseSpeed = hitCtx.getSplitCruiseSpeed(hitCtx.levelData, nextDepth, 1);
      rightChild.splitSideSign = 1;
      rightChild.splitLaunchT = 0;
      rightChild.splitLaunchFrom = spawnStart;
      rightChild.splitLaunchTarget = rightTargetStart;
      rightChild.splitFamilyId = splitFamilyId;
      rightChild.splitGeneration = nextDepth;
      rightChild.hitScalePulse = 1.1;
      rightChild.hitFlash = 1;

      hitCtx.targets.push(leftChild, rightChild);

      const splitFx = nextDepth === 1
        ? (isSplitTutorialStage
          ? { pA: 30, pB: 22, swA: 34, swB: 28, pulse: 1.82, pulseDur: 130, shake: 8 }
          : { pA: 22, pB: 14, swA: 30, swB: 24, pulse: 1.68, pulseDur: 110, shake: 6 })
        : (isSplitTutorialStage
          ? { pA: 14, pB: 10, swA: 24, swB: 18, pulse: 1.38, pulseDur: 84, shake: 4 }
          : { pA: 12, pB: 8, swA: 20, swB: 16, pulse: 1.32, pulseDur: 72, shake: 3 });
      hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, nextDepth === 1 ? '#7cf7ff' : '#ffd54a', splitFx.pA);
      hitCtx.createParticles(hitCtx.hitX, hitCtx.hitY, nextDepth === 1 ? '#ff4fd8' : '#ffffff', splitFx.pB);
      hitCtx.createShockwave('#ffffff', splitFx.swA);
      hitCtx.createShockwave(nextDepth === 1 ? '#7cf7ff' : '#ffd54a', splitFx.swB);
      hitCtx.pulseBrightness(splitFx.pulse, splitFx.pulseDur);
      hitCtx.triggerScreenShake(splitFx.shake);
      if (hitCtx.audioCtx) hitCtx.playPop(nextDepth === 1 ? 3 : 4, false, nextDepth === 2);
      hitCtx.createPopup(hitCtx.hitX, hitCtx.hitY - 32, nextDepth === 1 ? 'SPLIT BURST!' : 'SHATTER BURST!', nextDepth === 1 ? '#7cf7ff' : '#ffd54a');
    }

    if (splitGeneration >= 1) hitCtx.pruneInactiveSplitTargets();
    hitCtx.maybeRespawnSplitRootForStage(splitFamilyId);
    return { keepTarget: false };
  }

  function applyHit(t, hitCtx) {
    if (t.isDual && t.dualState !== 'cleared') return applyDualHit(t, hitCtx);
    if (t.mechanic === 'split' || t.mechanic === 'splitChild') return applySplitHit(t, hitCtx);
    if (!t.isPhantom) t.active = false;
    return { keepTarget: false };
  }

  OG.entities.targetBehaviours = { applyHit };
})(window);
