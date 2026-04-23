(function initBoot(window, OG) {

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

    const tut = OG.systems && OG.systems.tutorial;
    const storage = OG.storage || window.localStorage;
    const shouldAutoLaunchFirstRun = !!(
      tut &&
      typeof tut.isNewPlayerProfile === 'function' &&
      tut.isNewPlayerProfile() &&
      storage.getItem('orbitSync_sessionArcDone') !== '1'
    );

    OG.core.loop.startMainLoop();
    OG.state.initialized = true;

    if (shouldAutoLaunchFirstRun) {
      setTimeout(function() {
        menuSelectedWorld = 1;
        updateWorldSelectorUI();
        refreshMenuWorldPreview();

        if (typeof switchMenuTab === 'function') {
          switchMenuTab('campaign');
        }

        if (
          OG.ui &&
          OG.ui.menus &&
          typeof OG.ui.menus.startCampaign === 'function'
        ) {
          OG.ui.menus.startCampaign();
        }
      }, 450);
    }

    return true;
  }

  OG.boot.init = init;
  OG.boot.init();
})(window, window.OG);