(function initConfig(window) {
  const OG = window.OrbitGame;

  OG.config = Object.assign(OG.config || {}, {
    storageKeys: {
      settings: 'orbitSync.settings',
      profile: 'orbitSync.profile',
      shop: 'orbitSync.shop'
    },
    defaults: {
      musicEnabled: true,
      sfxEnabled: true,
      hapticsEnabled: true,
      currentWorld: 1
    }
  });
})(window);
