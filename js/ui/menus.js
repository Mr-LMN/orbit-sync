(function initMenus(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.menus = OG.ui.menus || {};

  function toggleShop(show) {
    return OG.ui.shop.toggleShop(show);
  }

  function toggleSettings(show) {
    return OG.ui.settings.toggleSettings(show);
  }

  function startCampaign() {
    let startLevelIdx = getStartingIndexForWorld(menuSelectedWorld);
    const stageOverrideId = OG.debug && OG.debug.stageOverrideId;
    if (stageOverrideId && Array.isArray(campaign)) {
      const overrideIdx = campaign.findIndex((stage) => stage && stage.id === stageOverrideId);
      if (overrideIdx >= 0) startLevelIdx = overrideIdx;
    }

    initAudio();
    toggleSettings(false);
    ui.mainMenu.style.display = 'none';
    ui.topBar.style.display = 'flex';
    ui.gameUI.style.display = 'block';
    ui.bigMultiplier.style.display = 'block';
    ui.text.style.display = 'none';
    inMenu = false;
    isPlaying = true;
    currentLevelIdx = startLevelIdx;
    resetRunState();
    ui.score.innerText = '0';
    ui.streak.innerText = '0';
    markScoreCoinDirty(true);
    setOverlayState('cinematic');
    loadLevel(currentLevelIdx);
    OrbitGame.core.loop.startMainLoop();
  }

  function changeWorld(dir) {
    menuSelectedWorld += dir;
    const maxSelectableWorld = Math.max(1, Number(maxWorldUnlocked) || 1);
    if (menuSelectedWorld < 1) menuSelectedWorld = 1;
    if (menuSelectedWorld > maxSelectableWorld) menuSelectedWorld = maxSelectableWorld;
    updateWorldSelectorUI();
    refreshMenuWorldPreview();
  }

  function updateWorldSelectorUI() {
    let label = document.getElementById('menuWorldLabel');
    if (label) {
      label.innerText = 'WORLD ' + menuSelectedWorld;
      label.style.color = (menuSelectedWorld === 2) ? '#2ff6ff' : (menuSelectedWorld === 3) ? '#ffaa00' : '#00ff88';
    }
  }

  OG.ui.menus.toggleShop = toggleShop;
  OG.ui.menus.toggleSettings = toggleSettings;
  OG.ui.menus.startCampaign = startCampaign;
  OG.ui.menus.changeWorld = changeWorld;
  OG.ui.menus.updateWorldSelectorUI = updateWorldSelectorUI;
})(window);
