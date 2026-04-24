(function initCompat(window) {
  const OG = window.OrbitGame;

  window.startCampaign = function startCampaignCompat() { return OG.ui.menus.startCampaign(); };
  window.changeWorld = function changeWorldCompat(dir) { return OG.ui.menus.changeWorld(dir); };
  window.attemptCoinRevive = function attemptCoinReviveCompat() { return OG.ui.overlay.attemptCoinRevive(); };
  window.generateShareCard = function generateShareCardCompat() { return OG.ui.share.generateShareCard(); };
})(window);
