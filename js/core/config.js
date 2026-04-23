(function initConfig(window, OG) {

  OG.config = Object.assign(OG.config, {
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
})(window, window.OG);