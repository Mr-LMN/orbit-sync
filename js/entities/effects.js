(function initEffects(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.effects = OG.entities.effects || {};

  function getPopup() {
    return popupPool.pop() || {};
  }

  function releasePopup(popup) {
    if (popupPool.length < MAX_POPUPS * 3) popupPool.push(popup);
  }

  function createPopup(x, y, text, color, hitQuality = null) {
    if (popups.length >= MAX_POPUPS) {
      releasePopup(popups.shift());
    }
    const p = getPopup();
    p.x = x;
    p.y = y;
    p.text = text;
    p.color = color;
    p.life = 1;
    p.hitQuality = hitQuality;
    p.animType = hitQuality === 'perfect' ? 'perfect' : 'normal';
    p.riseSpeed = 0.55;
    p.fadeSpeed = 0.02;
    p.shadow = 18;
    p.scale = 1;
    popups.push(p);
    return p;
  }

  function showComboPopup(multiplierLevel) {
    createPopup(centerObj.x, centerObj.y - orbitRadius - 24, `x${multiplierLevel}!`, '#ffd54a', 'perfect');
  }

  function showNearMissReplay(reason, nearestEdgeDistance) {
    nearMissReplayActive = true;
    nearMissReplayUntil = performance.now() + 420;
    const edgeQuality = nearestEdgeDistance <= (NEAR_MISS_THRESHOLD * 0.5) ? 'SO CLOSE' : 'CLOSE!';
    createPopup(centerObj.x, centerObj.y - orbitRadius - 22, edgeQuality, '#ffaa00');
    ringHitFlash = Math.max(ringHitFlash, 0.16);
    createShockwave('#ffaa00', 28);
    canvas.style.boxShadow = 'inset 0 0 32px #ffaa00';
    setTimeout(() => canvas.style.boxShadow = 'none', 100);
    if (navigator.vibrate) vibrate(12);

    if (nearMissFailTimeout) clearTimeout(nearMissFailTimeout);
    nearMissFailTimeout = setTimeout(() => {
      nearMissReplayActive = false;
      handleFail(reason);
      nearMissFailTimeout = null;
    }, 420);
  }

  function createShockwave(color, speed = 40) {
    shockwaves.push({ radius: 10, alpha: 1, color, speed });
  }

  function createTargetHitRipple(x, y, color = '#ffffff') {
    if (targetHitRipples.length >= MAX_HIT_RIPPLES) targetHitRipples.shift();
    targetHitRipples.push({ x, y, radius: 8, alpha: 1, color, width: 2.5 });
  }

  function triggerTargetHitFeedback(target, x, y) {
    createShockwave(target.color || '#00ff88', 28);
    createTargetHitRipple(x, y, target.color || '#ffffff');
    triggerScreenShake(4);
  }

  function triggerScreenShake(intensity = 5) {
    canvas.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
    setTimeout(() => canvas.style.transform = 'translate(0,0)', 60);
  }

  function pulseBrightness(amount = 1.6, duration = 120) {
    canvas.style.filter = `brightness(${amount})`;
    if (brightnessPulseTimeout) clearTimeout(brightnessPulseTimeout);
    brightnessPulseTimeout = setTimeout(() => {
      canvas.style.filter = 'brightness(1)';
      brightnessPulseTimeout = null;
    }, duration);
  }

  function showTempText(text, color, duration) {
    if (tempTextTimeout) clearTimeout(tempTextTimeout);
    ui.text.innerText = text;
    ui.text.style.color = color;
    ui.text.style.display = 'block';
    tempTextTimeout = setTimeout(() => {
      ui.text.style.display = 'none';
      tempTextTimeout = null;
    }, duration);
  }

  OG.entities.effects.getPopup = getPopup;
  OG.entities.effects.releasePopup = releasePopup;
  OG.entities.effects.createPopup = createPopup;
  OG.entities.effects.showComboPopup = showComboPopup;
  OG.entities.effects.showNearMissReplay = showNearMissReplay;
  OG.entities.effects.createShockwave = createShockwave;
  OG.entities.effects.createTargetHitRipple = createTargetHitRipple;
  OG.entities.effects.triggerTargetHitFeedback = triggerTargetHitFeedback;
  OG.entities.effects.triggerScreenShake = triggerScreenShake;
  OG.entities.effects.pulseBrightness = pulseBrightness;
  OG.entities.effects.showTempText = showTempText;
})(window);
