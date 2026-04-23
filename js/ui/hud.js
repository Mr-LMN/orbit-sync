(function initHud(window, OG) {

  let lastStreakMilestone = 0;

  function showStreakBadge(label, type) {
    const container = document.getElementById('gameContainer') || document.body;
    const badge = document.createElement('div');
    badge.className = `streak-badge active ${type === 'max' ? 'badge-max-sync' : 'badge-on-fire'}`;
    badge.innerText = label;

    container.appendChild(badge);

    // Auto cleanup after animation ends
    setTimeout(() => {
      if (badge.parentNode) badge.parentNode.removeChild(badge);
    }, 1600);
  }

  function checkStreakMilestones(currentStreak) {
    if (currentStreak < 5) {
      lastStreakMilestone = 0;
      return;
    }

    if (currentStreak >= 8 && lastStreakMilestone < 8) {
      lastStreakMilestone = 8;
      showStreakBadge('MAX SYNC', 'max');
      if (typeof window.vibrate === 'function') window.vibrate([40, 30, 40]);
    } else if (currentStreak >= 5 && lastStreakMilestone < 5) {
      lastStreakMilestone = 5;
      showStreakBadge('ON FIRE', 'fire');
      if (typeof window.vibrate === 'function') window.vibrate(30);
    }
  }

  OG.ui.hud.showStreakBadge = showStreakBadge;
  OG.ui.hud.checkStreakMilestones = checkStreakMilestones;
})(window, window.OG);