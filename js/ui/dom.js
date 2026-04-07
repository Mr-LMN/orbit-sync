(function initDom(window, document) {
  const OG = window.OrbitGame;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const ui = {
    score: document.getElementById('scoreDisplay'),
    combo: document.getElementById('comboDisplay'),
    stage: document.getElementById('stageDisplay'),
    text: document.getElementById('tutorialText'),
    lives: document.getElementById('livesCount'),
    bigMultiplier: document.getElementById('bigMultiplier'),
    multiplierCount: document.getElementById('multiplierCount'),
    coins: document.getElementById('coinCount'),
    overlay: document.getElementById('screenOverlay'),
    title: document.getElementById('screenTitle'),
    subtitle: document.getElementById('screenSubtitle'),
    btn: document.getElementById('actionBtn'),
    runCoins: document.getElementById('runCoinsDisplay'),
    topBar: document.getElementById('topBar'),
    gameUI: document.getElementById('ui'),
    mainMenu: document.getElementById('mainMenu'),
    shopModal: document.getElementById('shopModal'),
    settingsModal: document.getElementById('settingsModal'),
    shopCoinCount: document.getElementById('shopCoinCount'),
    streak: document.getElementById('streakCount'),
    wave: document.getElementById('waveDisplay'),
    bossUI: document.getElementById('bossUI'),
    bossPhase1: document.getElementById('bossPhase1'),
    bossPhase2: document.getElementById('bossPhase2'),
    pauseBtn: document.getElementById('pauseBtn')
  };

  OG.dom = Object.assign(OG.dom || {}, { canvas, ctx, ui });

  // Legacy aliases preserved while the monolith is decomposed.
  window.canvas = canvas;
  window.ctx = ctx;
  window.ui = ui;
})(window, document);
