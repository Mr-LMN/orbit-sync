(function initUtils(window) {
  const OG = window.OrbitGame;

  OG.utils = Object.assign(OG.utils || {}, {
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },
    lerp(a, b, t) {
      return a + (b - a) * t;
    },
    rand(min, max) {
      return Math.random() * (max - min) + min;
    }
  });
})(window);
