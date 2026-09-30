(function initTiming(window) {
  const OG = window.OrbitGame;
  OG.core = OG.core || {};
  const FRAME_MS = 1000 / 60;
  // No minimum delta: fast displays must not speed up gameplay.
  function frameDelta(now, previous) {
    if (!Number.isFinite(now) || !Number.isFinite(previous)) return 0;
    return Math.min(2.2, Math.max(0, (now - previous) / FRAME_MS));
  }
  OG.core.timing = { frameDelta };
})(window);
