(function initOverlay(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.overlay = OG.ui.overlay || {};

  function attemptCoinRevive() {
    if (globalCoins >= 50) {
      globalCoins -= 50;
      saveData();
      ui.coins.innerText = Math.floor(globalCoins);

      canvas.style.boxShadow = 'inset 0 0 100px #ffaa00';
      setTimeout(() => canvas.style.boxShadow = 'none', 300);
      if (audioCtx) playPop(8, true);

      revive();
    } else {
      let btn = document.getElementById('coinReviveBtn');
      btn.style.transform = 'translateX(-10px)';
      setTimeout(() => btn.style.transform = 'translateX(10px)', 50);
      setTimeout(() => btn.style.transform = 'translateX(0)', 100);
      if (audioCtx) soundFail();
    }
  }

  OG.ui.overlay.attemptCoinRevive = attemptCoinRevive;
})(window);
