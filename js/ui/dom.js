(function initDom(window, document) {
  const OG = window.OrbitGame;

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const ui = {
  score: document.getElementById('scoreDisplay'),
    combo: document.getElementById('comboDisplay'),
    stage: document.getElementById('stageDisplay'),
    text: document.getElementById('tutorialText'),
    tutorialTextContainer: document.getElementById('tutorialTextContainer'),
    tutorialTextGlow: document.getElementById('tutorialTextGlow'),
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
    pauseBtn: document.getElementById('pauseBtn'),
    arenaInfo: document.getElementById('arenaInfo'),
    clearCoinsDisplay: document.getElementById('clearCoinsDisplay'),
    clearScoreDisplay: document.getElementById('clearScoreDisplay'),
    clearStreakDisplay: document.getElementById('clearStreakDisplay'),
    clearSummary: document.getElementById('clearSummary'),
    closeMissBanner: document.getElementById('closeMissBanner'),
    coinReviveBtn: document.getElementById('coinReviveBtn'),
    dailyStreakBadge: document.getElementById('dailyStreakBadge'),
    menuBtn: document.getElementById('menuBtn'),
    nearMissMsg: document.getElementById('nearMissMsg'),
    newRecordBanner: document.getElementById('newRecordBanner'),
    overlayActionStack: document.getElementById('overlayActionStack'),
    overlayButtonGroup: document.getElementById('overlayButtonGroup'),
    overlaySecondaryActions: document.getElementById('overlaySecondaryActions'),
    pbScoreDisplay: document.getElementById('pbScoreDisplay'),
    pbStatsBlock: document.getElementById('pbStatsBlock'),
    pbStreakDisplay: document.getElementById('pbStreakDisplay'),
    pbWorldDisplay: document.getElementById('pbWorldDisplay'),
    reviveBtn: document.getElementById('reviveBtn'),
    runCoinsBox: document.getElementById('runCoinsBox'),
    runCoinsHint: document.getElementById('runCoinsHint'),
    runComboDisplay: document.getElementById('runComboDisplay'),
    runScoreDisplay: document.getElementById('runScoreDisplay'),
    runStatsBlock: document.getElementById('runStatsBlock'),
    shareBtn: document.getElementById('shareBtn'),
    stagePBDisplay: document.getElementById('stagePBDisplay'),
    stageReplayBtns: document.getElementById('stageReplayBtns'),
    stageReplayRow: document.getElementById('stageReplayRow'),
    tutorialMsg: document.getElementById('tutorialMsg'),
    tutorialOverlay: document.getElementById('tutorialOverlay')
};

  OG.dom = Object.assign(OG.dom || {}, { canvas, ctx, ui });

  // Legacy aliases preserved while the monolith is decomposed.
  window.canvas = canvas;
  window.ctx = ctx;
  window.ui = ui;
})(window, document);
