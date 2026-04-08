(function initOverlay(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.overlay = OG.ui.overlay || {};

  window.showSimulatedAd = function(onComplete) {
    const adOverlay = document.getElementById('adSimulationOverlay');
    if (!adOverlay) return;

    // Pause any game sounds
    if (typeof audioCtx !== 'undefined' && audioCtx.state === 'running') {
        audioCtx.suspend();
    }

    adOverlay.style.display = 'flex';

    setTimeout(() => {
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

      canvas.style.boxShadow = 'inset 0 0 100px #ffaa00';
      setTimeout(() => canvas.style.boxShadow = 'none', 300);
      if (audioCtx) playPop(8, true);

      revive();
    } else {
      let btn = document.getElementById('coinReviveBtn');
      if (btn) {
        btn.style.transform = 'translateX(-10px)';
        setTimeout(() => btn.style.transform = 'translateX(10px)', 50);
        setTimeout(() => btn.style.transform = 'translateX(0)', 100);
      }
      if (audioCtx) soundFail();
    }
  }
  OG.ui.overlay.attemptCoinRevive = attemptCoinRevive;
})(window);
