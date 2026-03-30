(function initInputCore(window, document) {
  const OG = window.OrbitGame;
  OG.core = OG.core || {};
  OG.core.input = OG.core.input || {};

  let listenersBound = false;

  function onTouchStart(e) {
    if (e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      tap();
    }
  }

  function onMouseDown(e) {
    if (e.target.tagName !== 'BUTTON') {
      tap();
    }
  }

  function bind() {
    if (listenersBound) return;
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('mousedown', onMouseDown);
    listenersBound = true;
  }

  OG.core.input.bind = bind;
})(window, document);
