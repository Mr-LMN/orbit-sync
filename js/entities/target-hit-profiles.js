(function initTargetHitProfiles(window, OG) {

  function inArc(normalizeAngle, a, start, end) {
    const s = normalizeAngle(start);
    const e = normalizeAngle(end);
    return e >= s ? (a >= s && a <= e) : (a >= s || a <= e);
  }

  function isHit(t, angle, utils) {
    const hitboxScale = t.hitboxScale || 1.25;
    const expand = (t.size * (hitboxScale - 1)) * 0.5;
    const startAngle = t.start - expand;
    const endAngle = t.start + t.size + expand;
    let result = endAngle > Math.PI * 2
      ? (angle >= startAngle || angle <= (endAngle - Math.PI * 2))
      : (angle >= startAngle && angle <= endAngle);

    if (t.isDual && t.dualState !== 'cleared') {
      const visualHalf = t.targetHalfWidth || t.size / 2;
      const dualExpand = visualHalf * 0.24;
      const splitAngle = utils.normalizeAngle(t.start + visualHalf);
      const fullEnd = utils.normalizeAngle(t.start + t.size + dualExpand);
      const normPlayer = utils.normalizeAngle(angle);
      const normStart = utils.normalizeAngle(t.start - dualExpand);
      const leftEnd = utils.normalizeAngle(splitAngle + dualExpand);
      const rightStart = utils.normalizeAngle(splitAngle - dualExpand);
      if (t.dualState === 'left') result = inArc(utils.normalizeAngle, normPlayer, normStart, leftEnd);
      else if (t.dualState === 'right') result = inArc(utils.normalizeAngle, normPlayer, rightStart, fullEnd);
      else result = inArc(utils.normalizeAngle, normPlayer, normStart, fullEnd);
    }

    return result;
  }

  function getHitQuality(t, angle, utils) {
    const tCenter = t.start + (t.size / 2);
    const dist = Math.abs(utils.signedAngularDistance(angle, tCenter));

    if (t.mechanic === 'corner') {
      const localAngle = utils.normalizeAngle(angle - t.start);
      const visiblePerfectWindow = t.cornerPerfectWindow || 0.015;
      const visibleBackWindow = t.cornerBackWindow || 0.135;
      const visibleOvershootWindow = t.cornerOvershootWindow || 0.135;
      const hitboxExpand = t.cornerHitboxExpand || 0.028;
      const backWindow = visibleBackWindow + hitboxExpand;
      const overshootWindow = visibleOvershootWindow + hitboxExpand;
      const perfectStart = visibleBackWindow - visiblePerfectWindow;
      const perfectEnd = visibleBackWindow + visiblePerfectWindow;
      if (localAngle < 0 || localAngle > (backWindow + overshootWindow)) return null;
      if (localAngle >= (perfectStart - hitboxExpand * 0.25) && localAngle <= (perfectEnd + hitboxExpand * 0.25)) return 'perfect';
      if (Math.abs(localAngle - visibleBackWindow) < (backWindow * 0.72)) return 'good';
      return 'ok';
    }

    if (t.isDual && t.dualState !== 'cleared') {
      const splitAngle = utils.normalizeAngle(t.start + (t.targetHalfWidth || t.size / 2));
      const distToSplit = Math.abs(utils.signedAngularDistance(angle, splitAngle));
      const halfSize = t.targetHalfWidth || t.size / 2;
      if (t.dualState === 'full') {
        if (distToSplit <= halfSize * 0.2) return 'perfect';
        if (distToSplit <= halfSize * 0.55) return 'good';
        return 'ok';
      }
      const remainCenter = t.dualState === 'left'
        ? utils.normalizeAngle(t.start + halfSize / 2)
        : utils.normalizeAngle(t.start + halfSize + halfSize / 2);
      const distToCenter = Math.abs(utils.signedAngularDistance(angle, remainCenter));
      if (distToCenter <= halfSize * 0.27) return 'perfect';
      if (distToCenter <= halfSize * 0.6) return 'good';
      return 'ok';
    }

    if (dist < t.size / 6.5) return 'perfect';
    if (dist < t.size / 3) return 'good';
    return 'ok';
  }

  OG.entities.targetHitProfiles = {
    isHit,
    getHitQuality
  };
})(window, window.OG);