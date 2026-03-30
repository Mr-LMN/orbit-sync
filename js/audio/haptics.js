(function initHaptics(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;

  function vibrate(pattern) {
    if (!audio.hapticsEnabled) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  audio.vibrate = vibrate;
  window.vibrate = vibrate;
})(window);
