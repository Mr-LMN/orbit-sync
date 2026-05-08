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
      const active = document.activeElement;

      // If we are focused on an interactive element other than body, try to activate it
      if (active && active !== document.body) {
        if (typeof active.click === 'function') {
          e.preventDefault(); // Prevent default scroll on Space
          active.click();
        } else if (active.tagName === 'A' || active.tagName === 'BUTTON' || active.hasAttribute('tabindex')) {
          e.preventDefault();
          // Fallback if .click() doesn't exist, though it usually does for buttons/links
          const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          active.dispatchEvent(event);
        }
      } else {
        // If nothing is focused (or just body), default to tapping (gameplay)
        if (!isBlockedTarget(e.target)) {
          e.preventDefault();
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
