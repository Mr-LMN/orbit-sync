(function initHaptics(window, OG) {
  const audio = OG.audio;

  function vibrate(pattern) {
    if (!audio.hapticsEnabled) return;
    if (navigator.vibrate) navigator.vibrate(pattern);
  }

  audio.vibrate = vibrate;
  window.vibrate = vibrate;
})(window, window.OG);