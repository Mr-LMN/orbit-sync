(function initScoringSystem(window, OG) {

  // Juice pass — body combo classes for canvas glow escalation
  const COMBO_CLASSES = ['combo-3', 'combo-5', 'combo-7', 'combo-8'];
  function _setComboClass(mult) {
    COMBO_CLASSES.forEach(c => document.body.classList.remove(c));
    if (mult >= 8) document.body.classList.add('combo-8');
    else if (mult >= 7) document.body.classList.add('combo-7');
    else if (mult >= 5) document.body.classList.add('combo-5');
    else if (mult >= 3) document.body.classList.add('combo-3');
  }

  let _perfectFlashTimer = null;
  function triggerPerfectFlash() {
    if (_perfectFlashTimer) { clearTimeout(_perfectFlashTimer); document.body.classList.remove('perfect-flash'); }
    // Force reflow to restart animation
    void document.body.offsetWidth;
    document.body.classList.add('perfect-flash');
    _perfectFlashTimer = setTimeout(function() {
      document.body.classList.remove('perfect-flash');
      _perfectFlashTimer = null;
    }, 90);
  }

  function updateMultiplierUI() {
    const prevMultiplier = lastMultiplierDisplay;
    const didChange = multiplier !== prevMultiplier;
    ui.multiplierCount.innerText = multiplier;

    if (multiplier <= 1) {
      ui.bigMultiplier.style.display = 'none';
      ui.bigMultiplier.style.fontSize = '1.8rem';
      if (typeof clearIntensity === 'function') clearIntensity();
      _setComboClass(1);
      lastMultiplierDisplay = multiplier;
      return;
    } else {
      ui.bigMultiplier.style.display = 'block';
    }

    let mColor = multiColors[Math.min(multiplier - 1, 7)];

    const mSize = multiplier >= 8 ? '3.8rem'
      : multiplier >= 7 ? '3.1rem'
      : multiplier >= 5 ? '2.5rem'
      : multiplier >= 3 ? '2.1rem'
      : '1.8rem';
    const mShadowSpread = multiplier >= 7 ? `0 0 36px ${mColor}, 0 0 64px ${mColor}` : `0 0 20px ${mColor}`;
    const mScale = multiplier >= 8 ? 1.9 : multiplier >= 5 ? 1.7 : 1.6;

    ui.bigMultiplier.style.fontSize = mSize;
    ui.bigMultiplier.style.color = mColor;
    ui.bigMultiplier.style.textShadow = mShadowSpread;
    ui.bigMultiplier.style.transform = `translateY(-50%) scale(${mScale})`;
    setTimeout(() => ui.bigMultiplier.style.transform = 'translateY(-50%) scale(1)', 120);

    if (didChange && (multiplier === 5 || multiplier === 7 || multiplier === 8)) {
      showComboPopup(multiplier);
    }
    if (multiplier >= 7) triggerIntensity(3);
    else if (multiplier >= 5) triggerIntensity(2);
    else if (multiplier >= 3) triggerIntensity(1);
    else if (typeof clearIntensity === 'function') clearIntensity();

    // Juice: update canvas edge glow class
    _setComboClass(multiplier);

    lastMultiplierDisplay = multiplier;
  }

  OG.systems.scoring.updateMultiplierUI = updateMultiplierUI;
  OG.systems.scoring.triggerPerfectFlash = triggerPerfectFlash;
})(window, window.OG);