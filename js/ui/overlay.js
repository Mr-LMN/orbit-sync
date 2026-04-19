(function initOverlay(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.overlay = OG.ui.overlay || {};

  let _adSimTimeout = null;
  window.showSimulatedAd = function(onComplete) {
    const adOverlay = ui.adSimulationOverlay;
    if (!adOverlay) return;

    // Clear any previous ad timeout to prevent overlapping callbacks
    if (_adSimTimeout) { clearTimeout(_adSimTimeout); _adSimTimeout = null; }

    // Pause any game sounds
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
        audioCtx.suspend();
    }

    adOverlay.style.display = 'flex';

    _adSimTimeout = setTimeout(() => {
        _adSimTimeout = null;
        adOverlay.style.display = 'none';
        if (typeof audioCtx !== 'undefined' && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (onComplete) onComplete();
    }, 2500); // Simulate a short 2.5s ad for dopamine retention
  };

  function attemptCoinRevive() {
    const reviveCost = currentReviveCost || 50;

    if (globalCoins >= reviveCost) {
      globalCoins -= reviveCost;
      currentReviveCost = reviveCost * 2;
      saveData();
      ui.coins.innerText = Math.floor(globalCoins);
      if (window.reviveCount !== undefined) window.reviveCount++;

      canvas.style.boxShadow = 'inset 0 0 100px #ffaa00';
      setTimeout(() => canvas.style.boxShadow = 'none', 300);
      if (audioCtx) playPop(8, true);

      revive();
    } else {
      let btn = ui.coinReviveBtn;
      if (btn) {
        btn.style.transform = 'translateX(-10px)';
        setTimeout(() => btn.style.transform = 'translateX(10px)', 50);
        setTimeout(() => btn.style.transform = 'translateX(0)', 100);
      }
      if (audioCtx) soundFail();
    }
  }
  function animateScore(el, targetScore, duration = 800) {
    if (!el) return;
    const start = parseInt(el.innerText) || 0;
    const range = targetScore - start;
    if (range === 0) return;

    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Quad ease out
      const value = Math.floor(start + range * (1 - (1 - progress) * (1 - progress)));
      
      el.innerText = value;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.innerText = targetScore;
        el.style.transform = 'scale(1.2)';
        setTimeout(() => el.style.transform = 'scale(1)', 150);
        if (typeof playPop === 'function') playPop(8, true);
      }
    }
    requestAnimationFrame(update);
  }

  function showXPEarned(xpAmount) {
    const bar = ui.resultsXpBarFill;
    const text = ui.resultsXpText;
    if (!bar || !text) return;

    text.innerText = `+${xpAmount} XP`;
    bar.style.width = '0%';
    
    setTimeout(() => {
      // Calculate % of level (assuming ~100xp per rank for visual effect)
      const pct = Math.min(100, Math.floor((xpAmount / 100) * 100));
      bar.style.width = `${pct}%`;
    }, 400);
  }

  function showRunGrade(perfects, total) {
    const badge = ui.resultsGradeBadge;
    if (!badge) return;

    const rate = total > 0 ? perfects / total : 0;
    let grade = 'C';
    let colorClass = 'grade-c';

    if (rate >= 0.85) { grade = 'S'; colorClass = 'grade-s'; }
    else if (rate >= 0.65) { grade = 'A'; colorClass = 'grade-a'; }
    else if (rate >= 0.40) { grade = 'B'; colorClass = 'grade-b'; }

    badge.innerText = grade;
    badge.className = `results-grade-badge ${colorClass} show`;
  }

  OG.ui.overlay.attemptCoinRevive = attemptCoinRevive;
  OG.ui.overlay.animateScore = animateScore;
  OG.ui.overlay.showXPEarned = showXPEarned;
  OG.ui.overlay.showRunGrade = showRunGrade;
})(window);
