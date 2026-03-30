(function initCompat(window) {
  const OG = window.OrbitGame;

  window.startCampaign = function startCampaignCompat() { return OG.ui.menus.startCampaign(); };
  window.toggleShop = function toggleShopCompat(show) { return OG.ui.shop.toggleShop(show); };
  window.toggleSettings = function toggleSettingsCompat(show) { return OG.ui.settings.toggleSettings(show); };
  window.buyItem = function buyItemCompat(id, cost) { return OG.ui.shop.buyItem(id, cost); };
  window.equipSkin = function equipSkinCompat(id) { return OG.ui.shop.equipSkin(id); };
  window.attemptCoinRevive = function attemptCoinReviveCompat() { return OG.ui.overlay.attemptCoinRevive(); };
  window.generateShareCard = function generateShareCardCompat() { return OG.ui.share.generateShareCard(); };
  window.changeWorld = function changeWorldCompat(dir) { return OG.ui.menus.changeWorld(dir); };

  window.toggleMusicSetting = function toggleMusicSettingCompat() { return OG.ui.settings.toggleMusicSetting(); };
  window.toggleSfxSetting = function toggleSfxSettingCompat() { return OG.ui.settings.toggleSfxSetting(); };
  window.toggleHapticsSetting = function toggleHapticsSettingCompat() { return OG.ui.settings.toggleHapticsSetting(); };
  window.soundUIClick = function soundUIClickCompat() { return OG.audio.soundUIClick(); };
})(window);
