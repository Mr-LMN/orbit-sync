(function initScoringSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.scoring = OG.systems.scoring || {};

  function updateMultiplierUI() {
    const prevMultiplier = lastMultiplierDisplay;
    const didChange = multiplier !== prevMultiplier;
    ui.multiplierCount.innerText = multiplier;

    if (multiplier <= 1) {
      ui.bigMultiplier.style.display = 'none';
      if (typeof clearIntensity === 'function') clearIntensity();
      lastMultiplierDisplay = multiplier;
      return;
    } else {
      ui.bigMultiplier.style.display = 'block';
    }

    let mColor = multiColors[Math.min(multiplier - 1, 7)];
    ui.bigMultiplier.style.color = mColor;
    ui.bigMultiplier.style.textShadow = `0 0 20px ${mColor}`;
    ui.bigMultiplier.style.transform = 'translateY(-50%) scale(1.6)';
    setTimeout(() => ui.bigMultiplier.style.transform = 'translateY(-50%) scale(1)', 120);

    if (didChange && (multiplier === 5 || multiplier === 7 || multiplier === 8)) {
      showComboPopup(multiplier);
    }
    if (multiplier >= 3 && multiplier < 5) triggerIntensity(1);
    if (multiplier >= 5 && multiplier < 7) triggerIntensity(2);
    if (multiplier >= 7) triggerIntensity(3);

    lastMultiplierDisplay = multiplier;
  }

  OG.systems.scoring.updateMultiplierUI = updateMultiplierUI;
})(window);
