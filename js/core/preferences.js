(function initPreferences(window, document) {
  const OG = window.OrbitGame;
  OG.core = OG.core || {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let quality = OG.storage.getItem('orbitSync_graphics', 'auto');
  let motion = OG.storage.getItem('orbitSync_reducedMotion', null);
  const reducedMotion = () => motion === null ? media.matches : motion === '1';
  const lowEffects = () => quality === 'low';
  function syncUI() {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion());
    document.documentElement.classList.toggle('low-effects', lowEffects());
    document.getElementById('graphicsQuality').value = lowEffects() ? 'low' : 'auto';
    document.getElementById('reduceMotion').checked = reducedMotion();
  }
  OG.core.preferences = {
    reducedMotion, lowEffects, syncUI,
    setQuality(value) {
      quality = value === 'low' ? 'low' : 'auto';
      OG.storage.setItem('orbitSync_graphics', quality);
      syncUI();
      if (typeof updateCanvasSize === 'function') updateCanvasSize();
    },
    setReducedMotion(value) {
      motion = value ? '1' : '0';
      OG.storage.setItem('orbitSync_reducedMotion', motion);
      syncUI();
    }
  };
  media.addEventListener('change', syncUI);
  syncUI();
})(window, document);
