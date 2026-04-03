(function initTargetRenderers(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};

  function renderCornerTarget(ctx, t, rc) {
    ctx.save();
    const markerPt = rc.getPointOnShape(t.cornerAnchor, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius);

    // Arc body — slightly thicker, brighter
    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#00e8ff';
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = 4.5;
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00e8ff';
    ctx.stroke();

    // Outer aura pass
    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#00e8ff';
    ctx.globalAlpha = 0.18 + rc.approach * 0.12;
    ctx.lineWidth = 12;
    ctx.shadowBlur = 28;
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
    ctx.globalAlpha = chevAlpha * 0.45;
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowBlur = 22;
    ctx.shadowColor = '#00e8ff';
    ctx.stroke();

    // Core chevron — bright white
    ctx.beginPath();
    ctx.moveTo((-tx * chevSize - nx * chevDepth) * pulseScale, (-ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.lineTo(0, (nx * chevDepth) * pulseScale);
    ctx.lineTo((tx * chevSize - nx * chevDepth) * pulseScale, (ty * chevSize - ny * chevDepth) * pulseScale);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = chevAlpha;
    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#9af8ff';
    ctx.stroke();

    // Centre dot
    ctx.beginPath();
    ctx.arc(0, 0, 3.5 + rc.approach * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 14;
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
    const leftColor = t.leftColor || '#2ff6ff';
    const rightColor = t.rightColor || '#ff4fd8';
    const coreColor = t.coreColor || '#ffffff';
    const shellColor = t.shellColor || '#ffd54a';
    const shellWidth = isDiamondWorld ? 9.2 : 12.5;
    const bodyWidth = isDiamondWorld ? 4.4 : 5.2;
    const coreWidth = isDiamondWorld ? 2.4 : 2.1;
    const shellAlpha = isDiamondWorld ? 0.11 : 0.2;
    const bodyAlpha = isDiamondWorld ? 0.86 : 0.74;
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
      const ringRadius = isDiamondWorld ? 8.2 : 7;
      const dotRadius = isDiamondWorld ? 4.7 : 4;
      const tickLen = isDiamondWorld ? 7.4 : 5.8;
      const radialX = splitPt.x - rc.centerObj.x;
      const radialY = splitPt.y - rc.centerObj.y;
      const radialLen = Math.hypot(radialX, radialY) || 1;
      const tx = -radialY / radialLen;
      const ty = radialX / radialLen;

      ctx.beginPath();
      ctx.arc(splitPt.x, splitPt.y, ringRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreColor; ctx.globalAlpha = isDiamondWorld ? 0.2 : 0.15; ctx.shadowBlur = isDiamondWorld ? 16 : 20; ctx.shadowColor = '#ffffff'; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(splitPt.x - tx * tickLen, splitPt.y - ty * tickLen);
      ctx.lineTo(splitPt.x + tx * tickLen, splitPt.y + ty * tickLen);
      ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.lineWidth = isDiamondWorld ? 2.4 : 2; ctx.shadowBlur = isDiamondWorld ? 10 : 8; ctx.shadowColor = '#ffffff'; ctx.stroke();
      ctx.beginPath();
      ctx.arc(splitPt.x, splitPt.y, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreColor; ctx.globalAlpha = 1.0; ctx.shadowBlur = isDiamondWorld ? 12 : 14; ctx.shadowColor = '#ffffff'; ctx.fill();

      if (rc.shouldDrawWorld2MechanicBrackets) {
        rc.drawWorld2AngularBracket(splitAngle, { dir: -1, alpha: 0.5, width: 1.4, wing: 3.7, legIn: 4.7, legOut: 1.3, shadowBlur: 4 });
        rc.drawWorld2AngularBracket(splitAngle, { dir: 1, alpha: 0.5, width: 1.4, wing: 3.7, legIn: 4.7, legOut: 1.3, shadowBlur: 4 });
      }
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
    const depth = Number.isFinite(t.splitGeneration) ? t.splitGeneration : (t.splitDepth || 0);
    const isRootSplit = depth === 0;
    const isSmallSplit = depth >= 2;
    const isMediumSplit = depth === 1;
    const isTutorialSplit = rc.levelData && rc.levelData.id === '2-3';
    const splitHeavy = rc.useHeavyEffects && !isSmallSplit;
    const palette = depth === 0
      ? { glow: '#2ff6ff', body: '#5deeff', core: '#ffffff', accent: '#ff4fd8' }
      : depth === 1
        ? { glow: '#ff4fd8', body: '#ff9b54', core: '#ffffff', accent: '#ffc08a' }
        : { glow: '#ffd54a', body: '#ffe68b', core: '#ffffff', accent: '#7cf7ff' };

    const pulse = 1 + Math.sin(rc.splitPulseTime + (t.start * 6.5)) * (isSmallSplit ? 0.03 : 0.045);
    const launchMix = typeof t.splitLaunchT === 'number' ? (1 - Math.min(1, t.splitLaunchT)) : 0;
    const generationScale = Math.pow(0.8, depth);
    const tutorialWidthBoost = isTutorialSplit && isRootSplit ? 1.14 : 1;
    const outerWidth = (depth === 0 ? 14.2 : depth === 1 ? 10.8 : 7.4) * generationScale * pulse * tutorialWidthBoost;
    const midWidth = (depth === 0 ? 6.6 : depth === 1 ? 5.5 : 4.2) * generationScale * pulse * tutorialWidthBoost;
    const coreWidth = (depth === 0 ? 2.9 : depth === 1 ? 2.5 : 2.1) * generationScale * pulse * tutorialWidthBoost;

    if (!isSmallSplit) {
      rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = palette.glow;
      ctx.globalAlpha = (depth === 0 ? 0.16 : 0.12) + (launchMix * 0.08);
      ctx.lineWidth = outerWidth;
      ctx.lineCap = 'butt';
      ctx.shadowBlur = splitHeavy ? (depth === 0 ? 18 : 12) : 6;
      ctx.shadowColor = palette.glow;
      ctx.stroke();
    }

    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = palette.body; ctx.globalAlpha = isSmallSplit ? 0.9 : 0.92; ctx.lineWidth = midWidth; ctx.lineCap = 'round';
    ctx.shadowBlur = splitHeavy ? (depth === 0 ? 11 : 8) : (isSmallSplit ? 2 : 5); ctx.shadowColor = palette.glow; ctx.stroke();

    rc.buildShapePath(ctx, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = palette.core; ctx.globalAlpha = isSmallSplit ? 0.9 : 0.96; ctx.lineWidth = coreWidth; ctx.lineCap = 'round';
    ctx.shadowBlur = splitHeavy ? (depth === 0 ? 9 : 6) : (isSmallSplit ? 0 : 3); ctx.shadowColor = palette.core; ctx.stroke();

    const crackAngle = t.start + (t.size / 2);
    const crackPt = rc.getPointOnShape(crackAngle, rc.worldShape, rc.centerObj.x, rc.centerObj.y, rc.dynamicRadius);

    if (!isSmallSplit) {
      ctx.beginPath();
      ctx.arc(crackPt.x, crackPt.y, depth === 0 ? 7 : 5.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = isRootSplit ? 0.16 : 0.11; ctx.shadowBlur = splitHeavy ? 14 : 4; ctx.shadowColor = '#ffffff'; ctx.fill();
    }

    ctx.beginPath();
    const crackSize = depth === 0 ? 6 : depth === 1 ? 4.8 : 3.8;
    ctx.moveTo(crackPt.x - crackSize, crackPt.y - crackSize);
    ctx.lineTo(crackPt.x + crackSize, crackPt.y + crackSize);
    ctx.moveTo(crackPt.x - crackSize, crackPt.y + crackSize);
    ctx.lineTo(crackPt.x + crackSize, crackPt.y - crackSize);
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.95; ctx.lineWidth = depth === 0 ? 2 : depth === 1 ? 1.5 : 1.2;
    ctx.shadowBlur = isSmallSplit ? 0 : (splitHeavy ? 7 : 2); ctx.shadowColor = '#ffffff'; ctx.stroke();

    if (rc.shouldDrawWorld2MechanicBrackets) {
      const splitBracketAlpha = isSmallSplit ? 0.26 : isMediumSplit ? 0.34 : 0.4;
      rc.drawWorld2AngularBracket(t.start, { dir: -1, alpha: splitBracketAlpha, width: isSmallSplit ? 1.05 : 1.2, wing: isSmallSplit ? 3.1 : 3.5, legIn: isSmallSplit ? 3.8 : 4.3, legOut: 1.2, shadowBlur: isSmallSplit ? 2 : 4 });
      rc.drawWorld2AngularBracket(t.start + t.size, { dir: 1, alpha: splitBracketAlpha, width: isSmallSplit ? 1.05 : 1.2, wing: isSmallSplit ? 3.1 : 3.5, legIn: isSmallSplit ? 3.8 : 4.3, legOut: 1.2, shadowBlur: isSmallSplit ? 2 : 4 });
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
