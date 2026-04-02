(function initBoot(window) {
  const OG = window.OrbitGame;
  OG.boot = OG.boot || {};

  function init() {
    if (OG.state.initialized) return true;
    if (!Array.isArray(campaign) || campaign.length === 0) {
      console.error('Campaign data is missing; boot aborted.');
      return false;
    }

    if (OG.core && OG.core.input && OG.core.input.bind) {
      OG.core.input.bind();
    }

    levelData = campaign[0];
    spawnTargets();
    updateShopUI();
    menuSelectedWorld = maxWorldUnlocked;
    updateWorldSelectorUI();
    refreshMenuWorldPreview();

    OG.core.loop.startMainLoop();
    OG.state.initialized = true;
    return true;
  }

  OG.boot.init = init;
  OG.boot.init();
})(window);
