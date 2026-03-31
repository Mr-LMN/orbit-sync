(function initBoot(window) {
  const OG = window.OrbitGame;
  OG.boot = OG.boot || {};

  function init() {
    if (OG.state.initialized) return true;

    if (OG.core && OG.core.input && OG.core.input.bind) {
      OG.core.input.bind();
    }

    levelData = campaign[0];
    spawnTargets();
    updateShopUI();
    menuSelectedWorld = maxWorldUnlocked;
    updateWorldSelectorUI();
    refreshMenuWorldPreview();

    OrbitGame.core.loop.startMainLoop();
    OG.state.initialized = true;
    return true;
  }

  OG.boot.init = init;
  OG.boot.init();
})(window);
