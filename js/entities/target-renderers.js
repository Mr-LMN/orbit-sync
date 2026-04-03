(function initTargetRenderers(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};

  function renderCornerTarget(ctx, t, rc) {
    ctx.save();
    const isDiamondWorld = rc.worldShape === 'diamond' && rc.worldNum === 2 && !rc.isBoss;
    const markerPt = rc.getPointOnShape(t.cornerAnchor, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius);

    // Arc body — slightly thicker, brighter
    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#00e8ff';
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = isDiamondWorld ? 4.2 : 4.5;
    ctx.shadowBlur = isDiamondWorld ? 11 : 18;
    ctx.shadowColor = '#00e8ff';
    ctx.stroke();

    // Outer aura pass
    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#00e8ff';
    ctx.globalAlpha = isDiamondWorld ? (0.1 + rc.approach * 0.08) : (0.18 + rc.approach * 0.12);
    ctx.lineWidth = isDiamondWorld ? 8.2 : 12;
    ctx.shadowBlur = isDiamondWorld ? 13 : 28;
    ctx.stroke();

    // Chevron marker at corner point
    const cx = markerPt.x;
    const cy = markerPt.y;
    const radialX = cx - rc.centerObj.x;
    const radialY = cy - rc.centerObj.y;
    const radialLen = Math.hypot(radialX, radialY) || 1;
    const nx = radialX / radialLen; // outward normal
    const ny = radialY / radialLen;
    const tx = -ny; // tangent
    const ty = nx;

    const chevSize = 10 + rc.approach * 4;
    const chevDepth = 6 + rc.approach * 2;
    const chevAlpha = 0.85 + rc.approach * 0.15;
    const pulseScale = 1 + Math.sin(Date.now() / 240) * 0.06 * rc.approach;

    ctx.save();
    ctx.translate(cx, cy);

    // Outer glow chevron
    ctx.beginPath();
    ctx.moveTo((-tx * chevSize - nx * chevDepth) * pulseScale, (-ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.lineTo(0, (nx * chevDepth) * pulseScale);
    ctx.lineTo((tx * chevSize - nx * chevDepth) * pulseScale, (ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.strokeStyle = '#00e8ff';
    ctx.globalAlpha = isDiamondWorld ? (chevAlpha * 0.26) : (chevAlpha * 0.45);
    ctx.lineWidth = isDiamondWorld ? 4.4 : 7;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = isDiamondWorld ? 9 : 22;
    ctx.shadowColor = '#00e8ff';
    ctx.stroke();

    // Core chevron — bright white
    ctx.beginPath();
    ctx.moveTo((-tx * chevSize - nx * chevDepth) * pulseScale, (-ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.lineTo(0, (nx * chevDepth) * pulseScale);
    ctx.lineTo((tx * chevSize - nx * chevDepth) * pulseScale, (ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = chevAlpha;
    ctx.lineWidth = isDiamondWorld ? 1.9 : 2.2;
    ctx.shadowBlur = isDiamondWorld ? 5 : 10;
    ctx.shadowColor = '#9af8ff';
    ctx.stroke();

    // Centre dot
    ctx.beginPath();
    ctx.arc(0, 0, (isDiamondWorld ? 3.1 : 3.5) + rc.approach * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = isDiamondWorld ? 7 : 14;
    ctx.shadowColor = '#00e8ff';
    ctx.fill();

    ctx.restore();

    if (rc.shouldDrawWorld2MechanicBrackets) {
      rc.drawWorld2AngularBracket(t.start, { dir: -1, alpha: 0.52, width: 1.55, wing: 4.5, legIn: 5.6 });
      rc.drawWorld2AngularBracket(t.start + t.size, { dir: 1, alpha: 0.52, width: 1.55, wing: 4.5, legIn: 5.6 });
    }
    ctx.restore();
  }

  function renderDualTarget(ctx, t, rc) {
    ctx.save();
    const halfSize = t.targetHalfWidth || (t.size / 2);
    const leftStart = t.start;
    const leftEnd = t.start + halfSize;
    const rightStart = t.start + halfSize;
    const rightEnd = t.start + t.size;
    const isDiamondWorld = rc.worldShape === 'diamond' && rc.worldNum === 2 && !rc.isBoss;
    const leftColor = t.leftColor || (isDiamondWorld ? '#9cf5ff' : '#2ff6ff');
    const rightColor = t.rightColor || (isDiamondWorld ? '#d5b8ff' : '#ff4fd8');
    const coreColor = t.coreColor || '#ffffff';
    const shellColor = t.shellColor || (isDiamondWorld ? '#d7f3ff' : '#ffd54a');
    const shellWidth = isDiamondWorld ? 7.6 : 12.5;
    const bodyWidth = isDiamondWorld ? 4.8 : 5.2;
    const coreWidth = isDiamondWorld ? 2.2 : 2.1;
    const shellAlpha = isDiamondWorld ? 0.07 : 0.2;
    const bodyAlpha = isDiamondWorld ? 0.93 : 0.74;
    const halfPad = isDiamondWorld ? 0.0018 : 0;

    if (t.dualState === 'full' || t.dualState === 'left') {
      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
      ctx.strokeStyle = shellColor; ctx.globalAlpha = shellAlpha; ctx.lineWidth = shellWidth; ctx.lineCap = 'butt';
      rc.setShadowBlur(isDiamondWorld ? 10 : 22); ctx.shadowColor = shellColor; ctx.stroke();

      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
      ctx.strokeStyle = leftColor; ctx.globalAlpha = bodyAlpha; ctx.lineWidth = bodyWidth;
      rc.setShadowBlur(isDiamondWorld ? 6 : 12); ctx.shadowColor = leftColor; ctx.stroke();

      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
      ctx.strokeStyle = coreColor; ctx.globalAlpha = 0.98; ctx.lineWidth = coreWidth;
      rc.setShadowBlur(isDiamondWorld ? 5 : 8); ctx.shadowColor = leftColor; ctx.stroke();
    }

    if (t.dualState === 'full' || t.dualState === 'right') {
      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
      ctx.strokeStyle = shellColor; ctx.globalAlpha = shellAlpha; ctx.lineWidth = shellWidth; ctx.lineCap = 'butt';
      rc.setShadowBlur(isDiamondWorld ? 10 : 22); ctx.shadowColor = shellColor; ctx.stroke();

      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
      ctx.strokeStyle = rightColor; ctx.globalAlpha = bodyAlpha; ctx.lineWidth = bodyWidth;
      rc.setShadowBlur(isDiamondWorld ? 6 : 12); ctx.shadowColor = rightColor; ctx.stroke();

      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
      ctx.strokeStyle = coreColor; ctx.globalAlpha = 0.98; ctx.lineWidth = coreWidth;
      rc.setShadowBlur(isDiamondWorld ? 5 : 8); ctx.shadowColor = rightColor; ctx.stroke();
    }

    if (t.dualState === 'full') {
      const splitAngle = t.start + halfSize;
      const splitPt = rc.getPointOnShape(splitAngle, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius);
      const seamLen = isDiamondWorld ? 7.2 : 5.8;
      const radialX = splitPt.x - rc.centerObj.x;
      const radialY = splitPt.y - rc.centerObj.y;
      const radialLen = Math.hypot(radialX, radialY) || 1;
      const tx = -radialY / radialLen;
      const ty = radialX / radialLen;

      ctx.beginPath();
      ctx.moveTo(splitPt.x - tx * seamLen, splitPt.y - ty * seamLen);
      ctx.lineTo(splitPt.x + tx * seamLen, splitPt.y + ty * seamLen);
      ctx.strokeStyle = isDiamondWorld ? '#f4feff' : '#ffffff';
      ctx.globalAlpha = isDiamondWorld ? 0.98 : 0.9;
      ctx.lineWidth = isDiamondWorld ? 1.65 : 2;
      ctx.shadowBlur = isDiamondWorld ? 3 : 8;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
    }

    if (rc.shouldDrawWorld2MechanicBrackets) {
      const dualEdges = t.dualState === 'left' ? [leftStart, leftEnd] : t.dualState === 'right' ? [rightStart, rightEnd] : [leftStart, rightEnd];
      if (dualEdges.length > 1) {
        rc.drawWorld2AngularBracket(dualEdges[0], { dir: -1, alpha: 0.46, width: 1.38, wing: 3.9, legIn: 4.9, legOut: 1.3 });
        rc.drawWorld2AngularBracket(dualEdges[dualEdges.length - 1], { dir: 1, alpha: 0.46, width: 1.38, wing: 3.9, legIn: 4.9, legOut: 1.3 });
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function renderSplitTarget(ctx, t, rc) {
    ctx.save();
    const isWorld2Split = rc.worldNum === 2 && rc.worldShape === 'diamond' && !rc.isBoss;
    const depth = Number.isFinite(t.splitGeneration) ? t.splitGeneration : (t.splitDepth || 0);
    const isRootSplit = depth === 0;
    const isSmallSplit = depth >= 2;
    const isMediumSplit = depth === 1;
    const isTutorialSplit = rc.levelData && rc.levelData.id === '2-3';
    const splitHeavy = rc.useHeavyEffects && !isSmallSplit;
    const palette = isWorld2Split
      ? (depth === 0
        ? { glow: '#95eeff', body: '#baf7ff', core: '#ffffff', accent: '#daf4ff' }
        : depth === 1
          ? { glow: '#8fd7ff', body: '#b7ddff', core: '#f6fbff', accent: '#d9ecff' }
          : { glow: '#a6c9ff', body: '#c9dcff', core: '#f3f8ff', accent: '#e6f0ff' })
      : (depth === 0
        ? { glow: '#2ff6ff', body: '#5deeff', core: '#ffffff', accent: '#ff4fd8' }
        : depth === 1
          ? { glow: '#ff4fd8', body: '#ff9b54', core: '#ffffff', accent: '#ffc08a' }
          : { glow: '#ffd54a', body: '#ffe68b', core: '#ffffff', accent: '#7cf7ff' });

    const pulse = 1 + Math.sin(rc.splitPulseTime + (t.start * 6.5)) * (isSmallSplit ? 0.03 : 0.045);
    const launchMix = typeof t.splitLaunchT === 'number' ? (1 - Math.min(1, t.splitLaunchT)) : 0;
    const seamFlash = typeof t.hitFlash === 'number' ? Math.min(1, t.hitFlash) : 0;
    const sideSign = Number.isFinite(t.splitSideSign) ? t.splitSideSign : 0;
    const generationScale = Math.pow(0.8, depth);
    const tutorialWidthBoost = isTutorialSplit && isRootSplit ? 1.14 : 1;
    const outerWidth = (isWorld2Split
      ? (depth === 0 ? 13.8 : depth === 1 ? 8.9 : 6.2)
      : (depth === 0 ? 14.2 : depth === 1 ? 10.8 : 7.4)) * generationScale * pulse * tutorialWidthBoost;
    const midWidth = (isWorld2Split
      ? (depth === 0 ? 6.4 : depth === 1 ? 4.4 : 3.3)
      : (depth === 0 ? 6.6 : depth === 1 ? 5.5 : 4.2)) * generationScale * pulse * tutorialWidthBoost;
    const coreWidth = (isWorld2Split
      ? (depth === 0 ? 2.8 : depth === 1 ? 2.0 : 1.7)
      : (depth === 0 ? 2.9 : depth === 1 ? 2.5 : 2.1)) * generationScale * pulse * tutorialWidthBoost;

    if (!isSmallSplit) {
      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = palette.glow;
      ctx.globalAlpha = (isWorld2Split ? (depth === 0 ? 0.14 : 0.09) : (depth === 0 ? 0.16 : 0.12))
        + (launchMix * (isWorld2Split ? (depth === 0 ? 0.12 : 0.09) : 0.08))
        + (isWorld2Split ? seamFlash * (isRootSplit ? 0.16 : 0.08) : 0);
      ctx.lineWidth = outerWidth;
      ctx.lineCap = 'butt';
      ctx.shadowBlur = splitHeavy ? (isWorld2Split ? (depth === 0 ? 11 : 7) : (depth === 0 ? 18 : 12)) : (isWorld2Split ? 4 : 6);
      ctx.shadowColor = palette.glow;
      ctx.stroke();
    }

    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = palette.body; ctx.globalAlpha = isWorld2Split ? (isSmallSplit ? 0.86 : (isRootSplit ? 0.95 : 0.9)) + (seamFlash * (isSmallSplit ? 0.04 : 0.08)) : (isSmallSplit ? 0.9 : 0.92); ctx.lineWidth = midWidth; ctx.lineCap = isWorld2Split ? 'butt' : 'round';
    ctx.shadowBlur = splitHeavy ? (isWorld2Split ? (depth === 0 ? 7 : 5) : (depth === 0 ? 11 : 8)) : (isSmallSplit ? (isWorld2Split ? 1 : 2) : (isWorld2Split ? 3 : 5)); ctx.shadowColor = palette.glow; ctx.stroke();

    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = palette.core; ctx.globalAlpha = isWorld2Split ? (isSmallSplit ? 0.86 : (isRootSplit ? 0.98 : 0.92)) + (seamFlash * (isSmallSplit ? 0.06 : 0.12)) : (isSmallSplit ? 0.9 : 0.96); ctx.lineWidth = coreWidth; ctx.lineCap = isWorld2Split ? 'butt' : 'round';
    ctx.shadowBlur = splitHeavy ? (isWorld2Split ? (depth === 0 ? 5 : 4) : (depth === 0 ? 9 : 6)) : (isSmallSplit ? 0 : (isWorld2Split ? 1 : 3)); ctx.shadowColor = palette.core; ctx.stroke();

    const crackAngle = t.start + (t.size / 2);
    const crackPt = rc.getPointOnShape(crackAngle, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius);
    const radialX = crackPt.x - rc.centerObj.x;
    const radialY = crackPt.y - rc.centerObj.y;
    const radialLen = Math.hypot(radialX, radialY) || 1;
    const tangentX = -radialY / radialLen;
    const tangentY = radialX / radialLen;
    const radialNx = radialX / radialLen;
    const radialNy = radialY / radialLen;

    if (!isSmallSplit) {
      ctx.beginPath();
      ctx.arc(crackPt.x, crackPt.y, isWorld2Split ? (depth === 0 ? 7.2 : 4.5) : (depth === 0 ? 7 : 5.1), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = isWorld2Split ? (isRootSplit ? 0.14 : 0.07) + (seamFlash * (isRootSplit ? 0.16 : 0.08)) : (isRootSplit ? 0.16 : 0.11); ctx.shadowBlur = splitHeavy ? (isWorld2Split ? 8 : 14) : (isWorld2Split ? 3 : 4); ctx.shadowColor = '#ffffff'; ctx.fill();
    }

    ctx.beginPath();
    const crackSize = depth === 0 ? 6 : depth === 1 ? 4.8 : 3.8;
    if (isWorld2Split) {
      const seamLen = crackSize + (depth === 0 ? 2.2 : depth === 1 ? 1.4 : 0.7);
      const seamTilt = sideSign * (depth === 0 ? 0.8 : 0.6);
      ctx.moveTo(crackPt.x - (tangentX * seamLen) + (radialNx * seamTilt), crackPt.y - (tangentY * seamLen) + (radialNy * seamTilt));
      ctx.lineTo(crackPt.x + (tangentX * seamLen) + (radialNx * seamTilt), crackPt.y + (tangentY * seamLen) + (radialNy * seamTilt));
      const notchInset = depth === 0 ? 2.6 : 1.9;
      ctx.moveTo(crackPt.x + (radialNx * notchInset), crackPt.y + (radialNy * notchInset));
      ctx.lineTo(crackPt.x + (radialNx * (notchInset + 1.7)) + (tangentX * sideSign * 2.2), crackPt.y + (radialNy * (notchInset + 1.7)) + (tangentY * sideSign * 2.2));
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = (depth === 0 ? 0.98 : 0.92) + (seamFlash * (depth === 0 ? 0.22 : 0.14)); ctx.lineWidth = depth === 0 ? 2.15 : depth === 1 ? 1.55 : 1.18;
    } else {
      ctx.moveTo(crackPt.x - crackSize, crackPt.y - crackSize);
      ctx.lineTo(crackPt.x + crackSize, crackPt.y + crackSize);
      ctx.moveTo(crackPt.x - crackSize, crackPt.y + crackSize);
      ctx.lineTo(crackPt.x + crackSize, crackPt.y - crackSize);
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.95; ctx.lineWidth = depth === 0 ? 2 : depth === 1 ? 1.5 : 1.2;
    }
    ctx.shadowBlur = isSmallSplit ? 0 : (splitHeavy ? 7 : 2); ctx.shadowColor = '#ffffff'; ctx.stroke();

    if (rc.shouldDrawWorld2MechanicBrackets) {
      const splitBracketAlpha = (isSmallSplit ? 0.26 : isMediumSplit ? 0.34 : 0.4) + (isWorld2Split ? (launchMix * 0.2) : 0);
      const bracketWidth = isSmallSplit ? 1.05 : 1.2;
      const wing = (isSmallSplit ? 3.1 : 3.5) + (isWorld2Split ? launchMix * 0.55 : 0);
      rc.drawWorld2AngularBracket(t.start, { dir: -1, alpha: splitBracketAlpha, width: bracketWidth, wing, legIn: isSmallSplit ? 3.8 : 4.3, legOut: 1.2, shadowBlur: isSmallSplit ? 2 : 4 });
      rc.drawWorld2AngularBracket(t.start + t.size, { dir: 1, alpha: splitBracketAlpha, width: bracketWidth, wing, legIn: isSmallSplit ? 3.8 : 4.3, legOut: 1.2, shadowBlur: isSmallSplit ? 2 : 4 });
    }

    ctx.restore();
  }

  function renderTarget(ctx, t, renderContext) {
    if (t.mechanic === 'corner') {
      renderCornerTarget(ctx, t, renderContext);
      return true;
    }
    if (t.isDual && t.dualState !== 'cleared') {
      renderDualTarget(ctx, t, renderContext);
      return true;
    }
    if (t.mechanic === 'split' || t.mechanic === 'splitChild') {
      renderSplitTarget(ctx, t, renderContext);
      return true;
    }
    return false;
  }

  function renderResonanceAccent(ctx, t, rc) {
    if (!t || !t.isResonancePressureAccent) return;
    const tCenter = t.start + (t.size / 2);
    const markerSpan = Math.min(t.size * 0.2, 0.045);

    ctx.save();
    rc.buildShapePath(
      ctx,
      rc.worldShape,
      rc.centerObj.x,
      rc.centerObj.y,
      rc.dynamicRadius,
      tCenter - markerSpan,
      tCenter + markerSpan
    );
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }

  OG.entities.targetRenderers = {
    renderTarget,
    renderResonanceAccent
  };
})(window);
