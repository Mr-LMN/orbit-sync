(function initInputCore(window, document) {
  const OG = window.OrbitGame;
  OG.core = OG.core || {};
  OG.core.input = OG.core.input || {};

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


  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      // Ignore if typing in an input or textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      e.preventDefault(); // Prevent scrolling on Space

      // If an interactive element has focus, simulate a click
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        (document.activeElement.tagName === 'BUTTON' ||
         document.activeElement.tagName === 'A' ||
         document.activeElement.hasAttribute('tabindex'))
      ) {
        document.activeElement.click();
      } else {
        // Fallback to tap if no specific UI element is focused
        if (!isBlockedTarget(e.target)) {
          tap();
        }
      }
    }
  }

  function bind() {

    if (listenersBound) return;
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    listenersBound = true;
  }

  let listenersBound = false;
  OG.core.input.bind = bind;
})(window, document);
