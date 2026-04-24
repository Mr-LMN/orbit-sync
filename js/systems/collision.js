(function initCollisionSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.collision = OG.systems.collision || {};

  function normalizeAngle(a) {
    return ((a % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
  }

  function signedAngularDistance(from, to) {
    let diff = normalizeAngle(to) - normalizeAngle(from);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function getTargetApproachIntensity(target, playerAngle, playerDirection) {
    const targetCenter = target.start + (target.size / 2);
    const signedDiff = signedAngularDistance(playerAngle, targetCenter);
    const forwardDiff = signedDiff * playerDirection;
    if (forwardDiff <= 0) return 0;

    const threshold = Math.max(target.size * 1.8, 0.34);
    if (forwardDiff >= threshold) return 0;
    return 1 - (forwardDiff / threshold);
  }

  OG.systems.collision.normalizeAngle = normalizeAngle;
  OG.systems.collision.signedAngularDistance = signedAngularDistance;
  OG.systems.collision.getTargetApproachIntensity = getTargetApproachIntensity;
})(window);
