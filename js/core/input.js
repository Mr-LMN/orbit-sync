(function initInputCore(window, document) {
  const OG = window.OrbitGame;
  OG.core = OG.core || {};
  const blocked = 'button, input, select, textarea, label, a, [role="button"], [contenteditable], [onclick], ' +
    '#settingsModal, #shopModal, #augmentSelect, #challengePreview, #adminToolsPanel, ' +
    '#screenOverlay, #lockedWorldOverlay, #mainMenu, #tutorialOverlay, #tutorialMask, ' +
    '#perkSelectionModal, #adSimulationOverlay, #loginSplashOverlay';
  let listenersBound = false;

  function isBlockedTarget(target) {
    if (target && target.closest && target.closest(blocked)) return true;
    const settings = document.getElementById('settingsModal');
    return !!(settings && settings.dataset.open === 'true');
  }

  function onPointerDown(event) {
    if (event.isPrimary === false || event.button !== 0 || isBlockedTarget(event.target)) return;
    // One pointer stream avoids synthetic mouse events following a touch.
    if (event.pointerType !== 'mouse') event.preventDefault();
    tap();
  }

  function onKeyDown(event) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Escape') {
      if (inMenu) return;
      event.preventDefault();
      const modal = document.getElementById('settingsModal');
      if (modal.dataset.open === 'true') toggleSettings(false);
      else if (isPlaying) toggleSettings(true);
      return;
    }
    if (event.code !== 'Space' || isBlockedTarget(event.target)) return;
    if (inMenu || !isPlaying) return;
    event.preventDefault();
    tap();
  }

  function bind() {
    if (listenersBound) return;
    document.addEventListener('pointerdown', onPointerDown, { passive: false });
    document.addEventListener('keydown', onKeyDown);
    listenersBound = true;
  }
  OG.core.input = { bind, isBlockedTarget };
})(window, document);
