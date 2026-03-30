(function initBoot(window) {
  const OG = window.OrbitGame;

  OG.boot = OG.boot || {};
  OG.boot.init = function init() {
    OG.state.initialized = true;
    return OG.state.initialized;
  };

  OG.boot.init();
})(window);
