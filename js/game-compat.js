(function initCompat(window) {
  function missingLegacy(name) {
    return function compatMissingWrapper() {
      console.warn('[OrbitGame compat] Missing legacy function: ' + name);
      return false;
    };
  }

  const legacyNames = [
    'startCampaign',
    'toggleShop',
    'toggleSettings',
    'buyItem',
    'equipSkin',
    'attemptCoinRevive',
    'generateShareCard',
    'changeWorld',
    'toggleMusicSetting',
    'toggleSfxSetting',
    'toggleHapticsSetting',
    'soundUIClick'
  ];

  legacyNames.forEach(function attachCompat(name) {
    if (typeof window[name] !== 'function') {
      window[name] = missingLegacy(name);
    }
  });
})(window);
