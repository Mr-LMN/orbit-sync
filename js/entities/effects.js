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
    const milestones = {
      5: { label: 'x5 OVERDRIVE', color: '#00f7ff' },
      7: { label: 'x7 VOLTAGE', color: '#ff67f3' },
      8: { label: 'x8 GOD MODE!', color: '#ffd84d' }
    };
    const m = milestones[multiplierLevel];
    if (!m) return;
    const p = createPopup(
      centerObj.x,
      centerObj.y - orbitRadius - 26,
      m.label,
      m.color
    );
    p.animType = 'combo';
    p.life = 1.65;
    p.riseSpeed = 0.75;
    p.fadeSpeed = 0.027;
    p.shadow = 32;
    createShockwave(m.color, 42);
    createShockwave('#ffffff', 50);
    createUpwardBurstParticles(centerObj.x, centerObj.y - 14, m.color, 28);
  }

  let survivalNearMissClassTimeout = null;

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
      handleFail(reason, nearestEdgeDistance);
      nearMissFailTimeout = null;
    }, 420);
  }

  function showSurvivalNearMissShock(nearestEdgeDistance) {
    nearMissReplayUntil = Math.max(nearMissReplayUntil, performance.now() + 180);
    ringHitFlash = Math.max(ringHitFlash, 0.1);
    createShockwave('#ffb24a', 22);
    createPopup(centerObj.x, centerObj.y - orbitRadius - 20, 'ALMOST', '#ffbe55');
    document.body.classList.remove('near-miss-shock');
    void document.body.offsetWidth;
    document.body.classList.add('near-miss-shock');
    if (survivalNearMissClassTimeout) clearTimeout(survivalNearMissClassTimeout);
    survivalNearMissClassTimeout = setTimeout(() => {
      document.body.classList.remove('near-miss-shock');
      survivalNearMissClassTimeout = null;
    }, 220);

    if (navigator.vibrate) vibrate([8, 16, 8]);
    if (typeof playNoiseBurst === 'function' && typeof shouldThrottleAudio === 'function' && !shouldThrottleAudio(true)) {
      const now = (window.audioCtx && audioCtx.currentTime) ? audioCtx.currentTime : 0;
      playNoiseBurst(0.034, 0.065, now, 'bandpass', 820, 0.95);
    }
  }

  function createShockwave(color, speed = 40) {
    shockwaves.push({
      radius: orbitRadius * 0.15,
      opacity: 1.0,
      color,
      speed,
      width: 5
    });
  }

  function createTargetHitRipple(x, y, color = '#ffffff') {
    if (targetHitRipples.length >= MAX_HIT_RIPPLES) targetHitRipples.shift();
    targetHitRipples.push({
      x,
      y,
      radius: 3,
      speed: 2.6,
      life: 1.0,
      color
    });
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

  function triggerIntensity(level) {
    const root = document.documentElement;
    root.style.setProperty('--pulse', level === 1 ? '0.5' : level === 2 ? '1' : '1.5');
    root.style.setProperty('--arena-charge', level === 1 ? '0.35' : level === 2 ? '0.6' : '0.85');
    document.body.classList.remove('intensity-1', 'intensity-2', 'intensity-3');
    document.body.classList.remove('arena-charge-1', 'arena-charge-2', 'arena-charge-3');
    document.body.classList.add(`intensity-${Math.max(1, Math.min(3, level))}`);
    document.body.classList.add(`arena-charge-${Math.max(1, Math.min(3, level))}`);
  }

  function clearIntensity() {
    const root = document.documentElement;
    root.style.setProperty('--pulse', '0');
    root.style.setProperty('--arena-charge', '0');
    document.body.classList.remove('intensity-1', 'intensity-2', 'intensity-3');
    document.body.classList.remove('arena-charge-1', 'arena-charge-2', 'arena-charge-3');
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
  OG.entities.effects.showSurvivalNearMissShock = showSurvivalNearMissShock;
  OG.entities.effects.createShockwave = createShockwave;
  OG.entities.effects.createTargetHitRipple = createTargetHitRipple;
  OG.entities.effects.triggerTargetHitFeedback = triggerTargetHitFeedback;
  OG.entities.effects.triggerScreenShake = triggerScreenShake;
  OG.entities.effects.pulseBrightness = pulseBrightness;
  OG.entities.effects.triggerIntensity = triggerIntensity;
  OG.entities.effects.clearIntensity = clearIntensity;
  OG.entities.effects.showTempText = showTempText;
})(window);
