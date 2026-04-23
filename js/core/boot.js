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

  // Page Visibility: auto-pause gameplay and suspend the AudioContext
  // when the tab is hidden. On return, resume audio but leave the pause
  // overlay up so the player clicks Resume before the game un-pauses.
  document.addEventListener('visibilitychange', function onVisibilityChange() {
    const audioCtx = OG.audio && OG.audio.audioCtx;

    if (document.hidden) {
      const ui = (OG.dom && OG.dom.ui) || window.ui;
      const pauseBtn = ui && ui.pauseBtn;
      const isActivelyPlaying = !!(pauseBtn && pauseBtn.style.display === 'flex');
      const settingsModal = ui && ui.settingsModal;
      const modalBottom = settingsModal && settingsModal.style.bottom;
      const alreadyPaused = modalBottom === '0' || modalBottom === '0px';

      if (isActivelyPlaying && !alreadyPaused) {
        if (OG.ui && OG.ui.settings && typeof OG.ui.settings.toggleSettings === 'function') {
          OG.ui.settings.toggleSettings(true);
        }
      }

      if (audioCtx && audioCtx.state === 'running' && typeof audioCtx.suspend === 'function') {
        audioCtx.suspend();
      }
    } else {
      if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
        audioCtx.resume();
      }
    }
  });
})(window, window.OG);