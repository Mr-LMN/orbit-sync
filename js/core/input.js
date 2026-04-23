(function initInputCore(window, OG, document) {

  // Elements that should never pass through to tap()
  const BLOCKED_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'A']);

  // IDs of containers — touches inside these never reach tap()
  const BLOCKED_CONTAINERS = [
    'settingsModal', 'shopModal', 'augmentSelect',
    'challengePreview', 'adminToolsPanel', 'screenOverlay',
    'lockedWorldOverlay', 'mainMenu', 'tutorialOverlay'
  ];

  function isBlockedTarget(target) {
    if (!target) return false;
    // Block interactive element types
    if (BLOCKED_TAGS.has(target.tagName)) return true;
    // Block if inside any modal container
    for (const id of BLOCKED_CONTAINERS) {
      const el = document.getElementById(id);
      if (el && el.contains(target)) return true;
    }
    // Block if settings modal is visible (bottom = 0)
    const settings = document.getElementById('settingsModal');
    if (settings && settings.style.bottom === '0' ||
        settings && settings.style.bottom === '0px') return true;
    return false;
  }

  function onTouchStart(e) {
    if (isBlockedTarget(e.target)) return;
    e.preventDefault();
    tap();
  }

  function onMouseDown(e) {
    if (isBlockedTarget(e.target)) return;
    tap();
  }

  function bind() {
    if (listenersBound) return;
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousedown', onMouseDown);
    listenersBound = true;
  }

  let listenersBound = false;
  OG.core.input.bind = bind;
})(window, window.OG, document);