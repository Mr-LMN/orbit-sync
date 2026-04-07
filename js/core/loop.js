const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.getElementById('scoreDisplay'), stage: document.getElementById('stageDisplay'),
  combo: document.getElementById('comboDisplay'),
  text: document.getElementById('tutorialText'), lives: document.getElementById('livesCount'),
  bigMultiplier: document.getElementById('bigMultiplier'), multiplierCount: document.getElementById('multiplierCount'),
  coins: document.getElementById('coinCount'), overlay: document.getElementById('screenOverlay'),
  title: document.getElementById('screenTitle'), subtitle: document.getElementById('screenSubtitle'),
  btn: document.getElementById('actionBtn'), menuBtn: document.getElementById('menuBtn'), runCoins: document.getElementById('runCoinsDisplay'),
  topBar: document.getElementById('topBar'), gameUI: document.getElementById('ui'),
  mainMenu: document.getElementById('mainMenu'), shopModal: document.getElementById('shopModal'),
  settingsModal: document.getElementById('settingsModal'),
  shopCoinCount: document.getElementById('shopCoinCount'), streak: document.getElementById('streakCount'),
  wave: document.getElementById('waveDisplay'), bossUI: document.getElementById('bossUI'),
  arenaInfo: document.getElementById('arenaInfo'),
  bossPhase1: document.getElementById('bossPhase1'), bossPhase2: document.getElementById('bossPhase2'),
  scorePunchAnim: null
};

// --- SENSORY FEEDBACK (Audio & Haptics) ---
// Step 2 extraction: canonical implementations now live in js/audio/* modules.
function initAudio() { return OrbitGame.audio.initAudio(); }
function makeGain(vol) { return OrbitGame.audio.makeGain(vol); }
function getMinSoundIntervalMs() { return OrbitGame.audio.getMinSoundIntervalMs(); }
function shouldThrottleAudio(allowBypassWindow = false) { return OrbitGame.audio.shouldThrottleAudio(allowBypassWindow); }

function playTone(freq, type, vol, attack, decay, startTime) { return OrbitGame.audio.playTone(freq, type, vol, attack, decay, startTime); }
function playNoiseBurst(vol, decay, startTime, filterType = 'bandpass', filterFreq = 1100, q = 0.8) { return OrbitGame.audio.playNoiseBurst(vol, decay, startTime, filterType, filterFreq, q); }
function startBossDrone() { return OrbitGame.audio.startBossDrone(); }
function stopBossDrone() { return OrbitGame.audio.stopBossDrone(); }
function escalateBossDrone() { return OrbitGame.audio.escalateBossDrone(); }
function startLastLifeDrone() { return OrbitGame.audio.startLastLifeDrone(); }
function stopLastLifeDrone() { return OrbitGame.audio.stopLastLifeDrone(); }
function soundOk() { return OrbitGame.audio.soundOk(); }
function soundGood(multiplier) { return OrbitGame.audio.soundGood(multiplier); }
function soundPerfect(multiplier) { return OrbitGame.audio.soundPerfect(multiplier); }
function soundCornerBonus(worldNum = 1) { return OrbitGame.audio.soundCornerBonus(worldNum); }
function soundMultiplierUp(multiplier) { return OrbitGame.audio.soundMultiplierUp(multiplier); }
function soundFail() { return OrbitGame.audio.soundFail(); }
function soundLifeLost() { return OrbitGame.audio.soundLifeLost(); }
function soundWaveClear() { return OrbitGame.audio.soundWaveClear(); }
function soundWorldClear() { return OrbitGame.audio.soundWorldClear(); }
function soundShieldBreak() { return OrbitGame.audio.soundShieldBreak(); }
function soundBossShieldHit(hp) { return OrbitGame.audio.soundBossShieldHit(hp); }
function soundCoreExposed() { return OrbitGame.audio.soundCoreExposed(); }
function soundCoreDamage() { return OrbitGame.audio.soundCoreDamage(); }
function soundBossDefeated() { return OrbitGame.audio.soundBossDefeated(); }
function soundLifeZone() { return OrbitGame.audio.soundLifeZone(); }
function soundLifeGained() { return OrbitGame.audio.soundLifeGained(); }
function soundUIClick() { return OrbitGame.audio.soundUIClick(); }
function playPop(multiplier, isPerfect, isFail = false) { return OrbitGame.audio.playPop(multiplier, isPerfect, isFail); }

function loadAudioFile(url) { return OrbitGame.audio.loadAudioFile(url); }
function getBaseTrackForLevel(levelIdx) { return OrbitGame.audio.getBaseTrackForLevel(levelIdx); }
function startDynamicMusic(baseTrackPath) { return OrbitGame.audio.startDynamicMusic(baseTrackPath); }
function disposeMusicNodes() { return OrbitGame.audio.disposeMusicNodes(); }
function stopDynamicMusic() { return OrbitGame.audio.stopDynamicMusic(); }
function baseVolumeForMultiplier(currentMultiplier) { return OrbitGame.audio.baseVolumeForMultiplier(currentMultiplier); }
function ensureCorrectMusicForLevel() { return OrbitGame.audio.ensureCorrectMusicForLevel(); }
function updateMusicState(currentMultiplier, isBossActive) { return OrbitGame.audio.updateMusicState(currentMultiplier, isBossActive); }
function isHardModeActive() { return hardModeActive; }
window.isHardModeActive = isHardModeActive;
window.setActiveAugment = function(id) { activeAugment = id; };
window.getActiveAugment = function() { return activeAugment; };
// Only aegis and prism are real boss music stages. 3-6/spectre uses echo mechanics — base track only.
function _isMusicBossStage(ld) {
  if (!ld || !ld.boss) return false;
  return ld.boss === 'aegis' || ld.boss === 'prism' || ld.boss === 'corruptor';
}
function vibrate(pattern) { return OrbitGame.audio.vibrate(pattern); }

// --- SAVE SYSTEM ---
let globalCoins = parseInt(localStorage.getItem('orbitSync_coins')) || 0;
let unlockedSkins = JSON.parse(localStorage.getItem('orbitSync_unlocks')) || ['classic'];
let activeSkin = localStorage.getItem('orbitSync_equipped') || 'classic';
if (!Array.isArray(unlockedSkins)) unlockedSkins = ['classic'];
unlockedSkins = unlockedSkins.map((skinId) => skinId === 'fire' ? 'prism' : skinId);
if (!unlockedSkins.includes('classic')) unlockedSkins.unshift('classic');
unlockedSkins = [...new Set(unlockedSkins)];
if (activeSkin === 'fire') activeSkin = 'prism';

// ── DAILY LOGIN STREAK ───────────────────────
const _todayStr = new Date().toDateString();
const _lastLoginStr = localStorage.getItem('orbitSync_lastLogin') || '';
const _lastStreakDay = localStorage.getItem('orbitSync_streakDay') || '0';
let dailyLoginStreak = parseInt(_lastStreakDay, 10) || 0;
let _dailyBonusToShow = 0;

if (_lastLoginStr !== _todayStr) {
  const _yesterday = new Date();
  _yesterday.setDate(_yesterday.getDate() - 1);
  const _wasYesterday = _lastLoginStr === _yesterday.toDateString();

  if (_wasYesterday) {
    dailyLoginStreak = Math.min(dailyLoginStreak + 1, 99);
  } else if (_lastLoginStr === '') {
    dailyLoginStreak = 1; // First ever login
  } else {
    dailyLoginStreak = 1; // Streak broken — reset
  }

  const _bonusTable = [0, 10, 15, 20, 25, 25, 25, 35];
  _dailyBonusToShow = _bonusTable[Math.min(dailyLoginStreak, 7)];
  globalCoins += _dailyBonusToShow;
  localStorage.setItem('orbitSync_lastLogin', _todayStr);
  localStorage.setItem('orbitSync_streakDay', String(dailyLoginStreak));
  localStorage.setItem('orbitSync_coins', Math.floor(globalCoins));
}
// ── END DAILY LOGIN STREAK ───────────────────

// Queue bonus display for when menu renders
if (_dailyBonusToShow > 0) {
  setTimeout(() => {
    const badge = document.getElementById('dailyStreakBadge');
    if (badge) {
      const em = dailyLoginStreak >= 7 ? '🔥🔥' : dailyLoginStreak >= 3 ? '🔥' : '✦';
      badge.innerText = `${em} DAY ${dailyLoginStreak} STREAK`;
      badge.style.display = 'block';
    }
    // Show bonus notification
    const notif = document.createElement('div');
    notif.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      font-family:'Orbitron',sans-serif; font-size:0.72rem; letter-spacing:2px;
      color:#ffaa00; text-align:center; pointer-events:none; z-index:99;
      text-shadow:0 0 20px rgba(255,170,0,0.8);
      animation:streakFadeOut 2.8s ease forwards;
    `;
    notif.innerHTML = `+${_dailyBonusToShow} COINS<br><span style="font-size:0.5rem;opacity:0.6">DAY ${dailyLoginStreak} LOGIN BONUS</span>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }, 600);
}

let maxWorldUnlocked = parseInt(localStorage.getItem('orbitSync_maxWorld')) || 1;
let menuSelectedWorld = 1;
let tutorialComplete = localStorage.getItem('orbitSync_tutorialDone') === '1';
let hardModeActive = false;
let activeAugment = null; // 'wide_sync' | 'coin_surge' | 'iron_shield' | null
let tutorialHitCount = 0;
let tutorialPhase = 0; // 0=idle, 1=first tap prompt, 2=perfect prompt, 3=done
function defaultPlayerProgress() {
  return {
    unlockedWorlds: ['world1'],
    completedStages: {},
    stageStars: {},
    unlockedBonus: false,
    hardModeUnlocked: {},
    bestScores: {}
  };
}

let playerProgress = (() => {
  const base = defaultPlayerProgress();
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem('orbitSync_playerProgress') || 'null');
  } catch (err) {
    stored = null;
  }
  if (stored && typeof stored === 'object') {
    const merged = Object.assign({}, base, stored);
    if (!Array.isArray(merged.unlockedWorlds)) merged.unlockedWorlds = ['world1'];
    merged.unlockedWorlds = [...new Set(merged.unlockedWorlds)];
    if (!merged.unlockedWorlds.includes('world1')) merged.unlockedWorlds.unshift('world1');
    if (maxWorldUnlocked >= 2 && !merged.unlockedWorlds.includes('world2')) merged.unlockedWorlds.push('world2');
    if (maxWorldUnlocked >= 3 && !merged.unlockedWorlds.includes('world3')) merged.unlockedWorlds.push('world3');
    return merged;
  }
  if (maxWorldUnlocked >= 2) base.unlockedWorlds.push('world2');
  if (maxWorldUnlocked >= 3) base.unlockedWorlds.push('world3');
  return base;
})();
if (playerProgress.unlockedWorlds.includes('world3')) maxWorldUnlocked = Math.max(maxWorldUnlocked, 3);
else if (playerProgress.unlockedWorlds.includes('world2')) maxWorldUnlocked = Math.max(maxWorldUnlocked, 2);
let personalBest = {
  score: parseInt(localStorage.getItem('orbitSync_pbScore')) || 0,
  streak: parseInt(localStorage.getItem('orbitSync_pbStreak')) || 0,
  world: parseInt(localStorage.getItem('orbitSync_pbWorld')) || 1
};

function saveData() {
  localStorage.setItem('orbitSync_coins', Math.floor(globalCoins));
  localStorage.setItem('orbitSync_unlocks', JSON.stringify(unlockedSkins));
  localStorage.setItem('orbitSync_equipped', activeSkin);
  if (!playerProgress.unlockedWorlds.includes('world1')) playerProgress.unlockedWorlds.unshift('world1');
  if (maxWorldUnlocked >= 2 && !playerProgress.unlockedWorlds.includes('world2')) playerProgress.unlockedWorlds.push('world2');
  if (maxWorldUnlocked >= 3 && !playerProgress.unlockedWorlds.includes('world3')) playerProgress.unlockedWorlds.push('world3');
  localStorage.setItem('orbitSync_playerProgress', JSON.stringify(playerProgress));
  localStorage.setItem('orbitSync_maxWorld', maxWorldUnlocked);
}

function checkAndSavePB(currentScore, currentStreak) {
  let newRecords = { score: false, streak: false, world: false };
  const currentWorld = parseInt(levelData ? levelData.id.split('-')[0] : '1');

  if (currentScore > personalBest.score) {
    personalBest.score = currentScore;
    localStorage.setItem('orbitSync_pbScore', currentScore);
    newRecords.score = true;
  }
  if (currentStreak > personalBest.streak) {
    personalBest.streak = currentStreak;
    localStorage.setItem('orbitSync_pbStreak', currentStreak);
    newRecords.streak = true;
  }
  if (currentWorld > personalBest.world) {
    personalBest.world = currentWorld;
    localStorage.setItem('orbitSync_pbWorld', currentWorld);
    newRecords.world = true;
  }
  return newRecords;
}

function updatePersistentCoinUI() {
  ui.coins.innerText = Math.floor(globalCoins);
  ui.shopCoinCount.innerText = Math.floor(globalCoins);
}

function getPendingRunCoins() {
  return Math.floor(runCents / 3);
}

function bankRunCoins() {
  const coinsToBank = getPendingRunCoins();
  if (coinsToBank > 0) {
    globalCoins += coinsToBank;
    saveData();
  }
  runCents = 0;
  updatePersistentCoinUI();
  markScoreCoinDirty(true);
  return coinsToBank;
}

updatePersistentCoinUI();

// --- GAME VARIABLES ---
let currentLevelIdx = 0; let levelData;
let score = 0; let stageHits = 0; let runCents = 0;
const maxLives = 3;
let angle = 0; let direction = 1; let isPlaying = false; let inMenu = true;
let echoAngle = 0;
let echoHistory = [];
const ECHO_DELAY_MS = 450;
const ECHO_HISTORY_MAX_MS = 1200;

const NEAR_MISS_THRESHOLD = 0.12; // radians (~6.9deg)
const NEAR_MISS_SURVIVAL_THRESHOLD = NEAR_MISS_THRESHOLD * 0.72;
const NEAR_MISS_COOLDOWN_MS = 700;
let lastNearMissAt = -Infinity;
let bossIntroPlaying = false;
let isCinematicIntro = false;
let lives = 3; let multiplier = 1; let streak = 0; let distanceTraveled = 0; let totalStageDistance = 0;
let perfectLifeStreak = 0;
let runBestStreak = 0;
let runPerfectHitsOnly = true; // set false on any good/ok/miss this run
let runLastLifeHits = 0;   // hits landed while on last life
let runOkCount = 0;        // total ok/sloppy hits this run
let runGoodCount = 0;      // total good hits this run
let runPerfectCount = 0;   // total perfect/filthy-perfect hits this run
let isBossPhaseTwo = false; let bossPhase = 1;
let currentReviveCost = 50;
let reviveCount = 0;
let usedLastChance = false;
let scoreAtCheckpoint = 0;
let scoreAtLevelStart = 0;
let ringHitFlash = 0;
let perfectFlash = 0;
let hitFlashColor = '#00ff88';
let lastMultiplierDisplay = multiplier;
let tempTextTimeout = null;
let bossSpawnTimeout = null;
let bossPauseUntil = 0;
let bossTransitionLock = false;
let brightnessPulseTimeout = null;
let nearMissFailTimeout = null;
let bossIntroTimeout = null;
let bossCinematicTimeout = null;
let bossPauseTimeout = null;
let worldClearDelayTimeout = null;
let worldClearTallyInterval = null;
let stageClearHoldUntil = 0;
let comboPulseTimeout = null;
let world2BossTransitionFrom25 = false;
let world2BossArenaRotation = 0;
let world2BossArenaRotationSpeed = 0;
let world2BossSequenceProgress = 0;
let world2BossSequenceLength = 0;
let world2BossNextForcedReverseAt = 0;
let world3BossLastAnnouncedPhase = 0;
let world3BossIntroDone = false;
let world3BossCollapseTriggered = false;
let nearMissReplayUntil = 0;
let nearMissReplayActive = false;
let comboCount = 0;
let comboTimer = 0;
let comboGlow = 0;
let hitStopUntil = 0;
let activeSplitFamilyId = null;
let nextSplitFamilyId = 1;
let mainLoopRafId = null;
let isMainLoopRunning = false;
let glitchActive = false;

let targets = []; let particles = []; let popups = []; let trail = []; let shockwaves = []; let bgDust = [];
let targetHitRipples = [];

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let dpr = Math.min(2, window.devicePixelRatio || 1);
const centerObj = { x: viewportWidth / 2, y: viewportHeight / 2 };
let orbitRadius = Math.min(viewportWidth, viewportHeight) * 0.28;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || viewportWidth < 768;
let currentWorldPalette = { primary: '#00e5ff', secondary: '#00ff88', bg: '#050508' };
let currentWorldShape = 'circle';
let currentWorldVisualTheme = {
  railColor: '#00e5ff',
  targetColor: '#ff3366',
  targetGlowColor: '#ff7aa8',
  targetCoreColor: '#ffffff',
  railGlowScale: 1
};
let drawTick = 0;
let lastFrameTime = performance.now();
let hudScoreCoinDirty = false;
let pendingHudUpdates = 0;
let hudLastFlushAt = 0;
const MAX_PARTICLES = 55;
const MAX_POPUPS = 24;
const MAX_SHOCKWAVES = 10;
const MAX_HIT_RIPPLES = 20;
const multiColors = ['#ffffff', '#00e5ff', '#00ff88', '#ffea00', '#ffaa00', '#ff3366', '#b300ff', '#ff00ff'];

const stateBridge = OrbitGame.state.legacy = OrbitGame.state.legacy || {};
Object.defineProperties(stateBridge, {
  targets: { get: () => targets, set: (v) => { targets = v; } },
  particles: { get: () => particles, set: (v) => { particles = v; } },
  effects: { get: () => ({ popups, shockwaves, targetHitRipples }) },
  bosses: { get: () => targets.filter(t => t.isBossShield || (levelData && levelData.boss)) },
  score: { get: () => score, set: (v) => { score = v; } },
  streak: { get: () => streak, set: (v) => { streak = v; } },
  multiplier: { get: () => multiplier, set: (v) => { multiplier = v; } },
  lives: { get: () => lives, set: (v) => { lives = v; } },
  globalCoins: { get: () => globalCoins, set: (v) => { globalCoins = v; } },
  menuSelectedWorld: { get: () => menuSelectedWorld, set: (v) => { menuSelectedWorld = v; } },
  currentWorld: { get: () => parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : menuSelectedWorld || 1), 10) },
  currentStage: { get: () => (levelData && levelData.id) ? levelData.id : null },
  waveCounter: { get: () => stageHits, set: (v) => { stageHits = v; } },
  bossFight: { get: () => ({ isBossPhaseTwo, bossPhase, bossIntroPlaying, bossTransitionLock }) },
  revive: { get: () => ({ currentReviveCost, reviveCount, usedLastChance }) },
  world2: { get: () => ({ nearMissReplayUntil, nearMissReplayActive }) },
  combo: { get: () => ({ comboCount, comboTimer }) },
  runPerfectHitsOnly: { get: () => runPerfectHitsOnly },
  runStats: { get: () => ({ runLastLifeHits, runOkCount, runGoodCount, runPerfectCount }) },
  hardMode: { get: () => hardModeActive, set: (v) => { hardModeActive = !!v; } }
});


function getWorldPalette() {
  return currentWorldPalette;
}

function getWorldShape() {
  return currentWorldShape;
}

function getWorldNum() {
  const source = (levelData && levelData.id) ? levelData.id : `${menuSelectedWorld || 1}-1`;
  const parsed = parseInt(String(source).split('-')[0], 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function computeWorldPalette(level) {
  const worldNum = parseInt(level ? level.id.split('-')[0] : '1', 10);
  if (level && level.boss) return { primary: '#ffffff', secondary: '#ff3366', bg: '#1a0000' };
  switch (worldNum) {
    case 1: return { primary: '#00e5ff', secondary: '#00ff88', bg: '#050508' };
    case 2: return { primary: '#2ff6ff', secondary: '#ff4fd8', bg: '#07070a' };
    case 3: return { primary: '#ffaa00', secondary: '#ff6600', bg: '#080500' };
    case 4: return { primary: '#b157ff', secondary: '#00ff41', bg: '#06040a' };
    default: return { primary: '#00ff88', secondary: '#00e5ff', bg: '#050508' };
  }
}

function computeWorldShape(level) {
  if (!level) return 'circle';
  const worldNum = parseInt(level.id.split('-')[0], 10);
  switch(worldNum) {
    case 1: return 'circle';
    case 2: return 'diamond';
    case 3: return 'triangle';
    case 4: return 'square';
    default: return 'circle';
  }
}

function getWorldVisualTheme(level) {
  const worldNum = parseInt(level ? level.id.split('-')[0] : '1', 10);
  if (level && level.boss) {
    return {
      railColor: '#ffffff',
      targetColor: '#ff3366',
      targetGlowColor: '#ff6699',
      targetCoreColor: '#ffffff',
      railGlowScale: 1
    };
  }
  if (worldNum === 2) {
    return {
      railColor: '#2ff6ff',
      targetColor: '#2ff6ff',
      targetGlowColor: '#27dfff',
      targetCoreColor: '#f8ffff',
      railGlowScale: 0.95
    };
  }
  if (worldNum === 3) {
    return {
      railColor: '#ffaa00',
      targetColor: '#ff5e42',
      targetGlowColor: '#ff9a6b',
      targetCoreColor: '#fff3de',
      railGlowScale: 0.95
    };
  }
  if (worldNum === 4) {
    return {
      railColor: '#b157ff',
      targetColor: '#b157ff',
      targetGlowColor: '#cc88ff',
      targetCoreColor: '#f0e8ff',
      railGlowScale: 1.0
    };
  }
  return {
    railColor: '#00e5ff',
    targetColor: '#ff3366',
    targetGlowColor: '#ff7aa8',
    targetCoreColor: '#ffffff',
    railGlowScale: 1
  };
}

function updateCanvasSize() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;
  canvas.width = Math.floor(viewportWidth * dpr);
  canvas.height = Math.floor(viewportHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  centerObj.x = viewportWidth / 2;
  centerObj.y = viewportHeight / 2;
  orbitRadius = Math.min(viewportWidth, viewportHeight) * 0.28;
  isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || viewportWidth < 768;
}

updateCanvasSize();

// Debounced resize — Android fires resize on scroll/address bar
// collapse mid-frame. Never resize during active gameplay.
let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (_resizeTimer) clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    _resizeTimer = null;
    // Only resize if not actively playing — prevents mid-frame corruption
    if (!isPlaying || inMenu) {
      updateCanvasSize();
    } else {
      // Queue resize for next time player returns to menu
      _pendingResize = true;
    }
  }, 180);
});
let _pendingResize = false;

function getArenaAngleOffset() {
  return (levelData && levelData.id === '2-6' && levelData.boss === 'prism') ? world2BossArenaRotation : 0;
}

function getPointOnShape(t, shape, cx, cy, radius) {
  const adjustedAngle = normalizeAngle(t + getArenaAngleOffset());
  return OrbitGame.systems.rendering.getPointOnShape(adjustedAngle, shape, cx, cy, radius);
}

function buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps = 40) {
  const offset = getArenaAngleOffset();
  return OrbitGame.systems.rendering.buildShapePath(
    ctx,
    shape,
    cx,
    cy,
    radius,
    startAngle + offset,
    endAngle + offset,
    steps
  );
}

function recordEchoHistory(nowMs, angleValue) {
  echoHistory.push({ t: nowMs, angle: angleValue });
  const cutoff = nowMs - ECHO_HISTORY_MAX_MS;
  while (echoHistory.length && echoHistory[0].t < cutoff) {
    echoHistory.shift();
  }
}

function getDelayedEchoAngle(nowMs, fallbackAngle) {
  const targetTime = nowMs - ECHO_DELAY_MS;
  for (let i = echoHistory.length - 1; i >= 0; i--) {
    if (echoHistory[i].t <= targetTime) return echoHistory[i].angle;
  }
  return fallbackAngle;
}

// Generate 3-layer parallax dust for depth
// Far layer: 30 tiny slow particles
for (let i = 0; i < 30; i++) {
  bgDust.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 0.8 + 0.2,
    speed: Math.random() * 0.06 + 0.02,
    opacity: Math.random() * 0.18 + 0.04,
    driftPhase: Math.random() * Math.PI * 2,
    driftAmp: Math.random() * 0.06 + 0.02,
    layer: 0
  });
}
// Mid layer: 25 standard particles (similar to original)
for (let i = 0; i < 25; i++) {
  bgDust.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 1.2 + 0.5,
    speed: Math.random() * 0.18 + 0.06,
    opacity: Math.random() * 0.28 + 0.08,
    driftPhase: Math.random() * Math.PI * 2,
    driftAmp: Math.random() * 0.18 + 0.06,
    layer: 1
  });
}
// Near layer: 8 larger, faster, brighter particles
for (let i = 0; i < 8; i++) {
  bgDust.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 2.2 + 1.2,
    speed: Math.random() * 0.38 + 0.18,
    opacity: Math.random() * 0.22 + 0.1,
    driftPhase: Math.random() * Math.PI * 2,
    driftAmp: Math.random() * 0.35 + 0.12,
    layer: 2
  });
}

document.getElementById('menuBtn').onclick = returnToMenu;

function toggleShop(show) { return OrbitGame.ui.shop.toggleShop(show); }
function toggleSettings(show) { return OrbitGame.ui.settings.toggleSettings(show); }
function applySettingsUI() { return OrbitGame.ui.settings.applySettingsUI(); }
function toggleMusicSetting() { return OrbitGame.ui.settings.toggleMusicSetting(); }
function toggleSfxSetting() { return OrbitGame.ui.settings.toggleSfxSetting(); }
function toggleHapticsSetting() { return OrbitGame.ui.settings.toggleHapticsSetting(); }
function updateShopUI() { return OrbitGame.ui.shop.updateShopUI(); }
function buyItem(id, cost) { return OrbitGame.ui.shop.buyItem(id, cost); }
function equipSkin(id) { return OrbitGame.ui.shop.equipSkin(id); }

const prismOrbImage = new Image();
let prismOrbImageReady = false;
prismOrbImage.onload = () => { prismOrbImageReady = true; };
prismOrbImage.src = 'assets/1775068154785.png';

function drawPrismOrbSkin(ctx, x, y, radius = 8.5, pulse = 0) {
  ctx.save();
  const pulseScale = 1 + (pulse * 0.45);

  ctx.beginPath();
  ctx.arc(x, y, (radius * 1.9) * pulseScale, 0, Math.PI * 2);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.1);
  glow.addColorStop(0, 'rgba(180, 255, 255, 0.38)');
  glow.addColorStop(0.7, 'rgba(90, 225, 255, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.9;
  ctx.fill();

  if (!prismOrbImageReady) {
    const fallbackGrad = ctx.createRadialGradient(x - (radius * 0.3), y - (radius * 0.3), 0, x, y, radius * 1.2);
    fallbackGrad.addColorStop(0, '#f5ffff');
    fallbackGrad.addColorStop(0.4, '#8af6ff');
    fallbackGrad.addColorStop(1, '#3abfe0');
    ctx.beginPath();
    ctx.arc(x, y, radius * (1.05 + pulse * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = fallbackGrad;
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.restore();
    return;
  }

  const spriteSize = radius * 2.75 * pulseScale;
  ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = 1;
  ctx.drawImage(prismOrbImage, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
  ctx.restore();
}

function drawOrbSkin(ctx, x, y, skin, radius = 8.5, pulse = 0, colorOverride = null) {
  ctx.save();
  const orbColor = colorOverride || multiColors[Math.min(multiplier - 1, 7)];
  if (skin === 'skull') {
    ctx.font = `${Math.round(radius * 3.75)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', x, y);
    ctx.restore();
    return;
  }
  if (skin === 'prism') {
    drawPrismOrbSkin(ctx, x, y, radius, pulse);
    ctx.restore();
    return;
  }
  if (skin === 'echo') {
    // Cyan ghost echo trail orb - same shape as classic, cyan-tinted glow
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00eaff';
    ctx.shadowColor = '#00eaff';
    ctx.shadowBlur = 18 + pulse * 8;
    ctx.fill();
    // Inner bright core
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
    return;
  }
  if (skin === 'crimson') {
    // Deep red orb - same shape as classic, crimson glow
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2244';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 18 + pulse * 8;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (skin === 'pulse') {
    // Orb pulses in size with multiplier — bigger at x8
    const _pulseScale = 1 + (Math.sin(Date.now() / 160) * 0.5 + 0.5) * 0.18
      + (Math.min(multiplier, 8) * 0.04);
    const _pulseR = radius * _pulseScale;
    const orbColor2 = colorOverride || multiColors[Math.min(multiplier - 1, 7)];
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, _pulseR * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = orbColor2;
    ctx.globalAlpha = 0.12;
    ctx.shadowBlur = 20;
    ctx.shadowColor = orbColor2;
    ctx.fill();
    // Core
    ctx.beginPath();
    ctx.arc(x, y, _pulseR, 0, Math.PI * 2);
    ctx.fillStyle = orbColor2;
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 16 + Math.sin(Date.now() / 120) * 8;
    ctx.shadowColor = orbColor2;
    ctx.fill();
    // White hot centre
    ctx.beginPath();
    ctx.arc(x, y, _pulseR * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (skin === 'ghost') {
    // Nearly invisible — just a faint outline + inner glow
    const orbColor3 = colorOverride || multiColors[Math.min(multiplier - 1, 7)];
    const _ghostAlpha = 0.08 + (Math.sin(Date.now() / 800) + 1) * 0.06;
    // Very faint fill
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = orbColor3;
    ctx.globalAlpha = _ghostAlpha;
    ctx.shadowBlur = 12;
    ctx.shadowColor = orbColor3;
    ctx.fill();
    // Crisp outline — the only clear indicator
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = orbColor3;
    ctx.globalAlpha = 0.55 + _ghostAlpha;
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 8;
    ctx.stroke();
    // Tiny bright core dot so it's not completely invisible
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
    return;
  }

  if (skin === 'storm') {
    // Electric yellow — bright with crackle shadow
    const _stormPulse = (Math.sin(Date.now() / 90) + 1) * 0.5;
    // Outer electric field
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffee00';
    ctx.globalAlpha = 0.06 + _stormPulse * 0.08;
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ffee00';
    ctx.fill();
    // Main orb
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe400';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 18 + _stormPulse * 12;
    ctx.shadowColor = '#ffee00';
    ctx.fill();
    // White-yellow inner core
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, (radius * 2) + pulse, 0, Math.PI * 2);
  ctx.fillStyle = orbColor;
  ctx.globalAlpha = 0.15;
  ctx.shadowBlur = 25;
  ctx.shadowColor = orbColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius * 1.47, 0, Math.PI * 2);
  ctx.fillStyle = orbColor;
  ctx.globalAlpha = 0.7;
  ctx.shadowBlur = 12;
  ctx.shadowColor = orbColor;
  ctx.fill();

  let coreGrad = ctx.createRadialGradient(x - (radius * 0.24), y - (radius * 0.24), 0, x, y, radius * 0.94);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  coreGrad.addColorStop(1, orbColor);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x - (radius * 0.41), y - (radius * 0.53), radius * 0.53, radius * 0.29, Math.PI / 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + (radius * 0.47), y + (radius * 0.47), Math.max(0.9, radius * 0.14), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  ctx.restore();
}

// CRITICAL RENDERING GUARDRAIL:
// drawOrb() is the core player-orb renderer used by all worlds.
// Do not reference outer-scope color variables here (e.g. orbColor from draw()).
// Always derive fallback color locally inside this function.
// World-specific orb styling must be passed through options or handled by separate wrappers.
// Breaking this function makes the player orb disappear globally.
function drawOrb(ctx, orbAngle, worldShape, options = {}) {
  const pt = getPointOnShape(orbAngle, worldShape, centerObj.x, centerObj.y, orbitRadius);
  const orbPulse = options.isEcho ? 0 : Math.abs(Math.sin(Date.now() / 200)) * 2.5;
  const opacity = (typeof options.opacity === 'number') ? options.opacity : 1;
  const glowScale = (typeof options.glowScale === 'number') ? options.glowScale : 1;
  const radius = 8.5 * glowScale;
  const fallbackColor = multiColors[Math.min(Math.max(multiplier - 1, 0), 7)] || '#ffffff';
  const color = options.colorOverride || fallbackColor;

  ctx.save();
  ctx.globalAlpha *= opacity;

  if (options.isEcho) {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(230,255,255,0.85)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fill();
  } else {
    drawOrbSkin(ctx, pt.x, pt.y, activeSkin, radius, orbPulse, color);
  }

  ctx.restore();
}

function drawMiniOrbPreview(ctx, x, y, skin, radius = 12) {
  const savedAlpha = ctx.globalAlpha;
  ctx.save();

  // Base plasma body so previews look like real orb skins, not emoji-only badges.
  const shellGrad = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.35, 0, x, y, radius * 1.2);
  shellGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
  shellGrad.addColorStop(0.35, '#9cf7ff');
  shellGrad.addColorStop(1, '#00bcd4');
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.05, 0, Math.PI * 2);
  ctx.fillStyle = shellGrad;
  ctx.globalAlpha = 0.92;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.globalAlpha = 1;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, radius + 12, 0, Math.PI * 2);
  const halo = ctx.createRadialGradient(x, y, 1, x, y, radius + 12);
  halo.addColorStop(0, 'rgba(255,255,255,0.10)');
  halo.addColorStop(0.6, 'rgba(120,200,255,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fill();

  const orbitCount = 3;
  for (let i = 0; i < orbitCount; i++) {
    const a = (Math.PI * 2 * i / orbitCount) - (Math.PI / 2);
    const ox = x + Math.cos(a) * (radius + 4);
    const oy = y + Math.sin(a) * (radius + 4);
    ctx.beginPath();
    ctx.arc(ox, oy, Math.max(1.6, radius * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.globalAlpha = 0.7;
    ctx.fill();
  }
  ctx.globalAlpha = savedAlpha;

  // Overlay skin glyphs while keeping orb material visible underneath.
  if (skin === 'skull') {
    ctx.font = `${Math.round(radius * 2.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', x, y + 0.5);
  } else if (skin === 'prism') {
    if (prismOrbImageReady) {
      const previewPulse = 1 + (Math.sin(performance.now() * 0.004) * 0.03);
      const glowRadius = radius * 1.55 * previewPulse;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      glow.addColorStop(0, 'rgba(170,255,255,0.24)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      const spriteSize = radius * 2.45 * previewPulse;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(prismOrbImage, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    } else {
      const fallbackGrad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, 0, x, y, radius);
      fallbackGrad.addColorStop(0, '#f5ffff');
      fallbackGrad.addColorStop(1, '#3abfe0');
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = fallbackGrad;
      ctx.fill();
    }
  } else if (skin === 'echo') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00eaff';
    ctx.shadowColor = '#00eaff';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.fill();
    return;
  } else if (skin === 'crimson') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2244';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.shadowBlur = 8;
    ctx.fill();
    return;
  }

  else if (skin === 'pulse') {
    drawOrbSkin(ctx, x, y, 'pulse', radius, 0, '#00e5ff');
    return;
  } else if (skin === 'ghost') {
    drawOrbSkin(ctx, x, y, 'ghost', radius, 0, '#a8f0ff');
    return;
  } else if (skin === 'storm') {
    drawOrbSkin(ctx, x, y, 'storm', radius, 0, '#ffee00');
    return;
  }

  ctx.restore();
}

function renderShopOrbPreview(previewEl, skinId) {
  if (!previewEl) return;
  let canvasEl = previewEl.querySelector('canvas');
  if (!canvasEl) {
    previewEl.innerHTML = '';
    canvasEl = document.createElement('canvas');
    canvasEl.width = 60;
    canvasEl.height = 60;
    canvasEl.style.width = '60px';
    canvasEl.style.height = '60px';
    previewEl.appendChild(canvasEl);
  }
  const pctx = canvasEl.getContext('2d');
  pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  drawMiniOrbPreview(pctx, canvasEl.width / 2, canvasEl.height / 2, skinId, 9.5);
}

const particlePool = [];
const popupPool = [];

function getParticle() { return OrbitGame.entities.particles.getParticle(); }
function releaseParticle(particle) { return OrbitGame.entities.particles.releaseParticle(particle); }
function getPopup() { return OrbitGame.entities.effects.getPopup(); }
function releasePopup(popup) { return OrbitGame.entities.effects.releasePopup(popup); }
function markScoreCoinDirty(force = false) {
  if (force) hudScoreCoinDirty = true;
  else if (!hudScoreCoinDirty) hudScoreCoinDirty = true;
}
function flushScoreCoinUI() {
  if (!hudScoreCoinDirty) return;
  ui.score.innerText = score;
  ui.coins.innerText = Math.floor(globalCoins);
  hudScoreCoinDirty = false;
  pendingHudUpdates = 0;
  hudLastFlushAt = performance.now();
  // Update stage PB display live
  const _livePBEl = document.getElementById('stagePBDisplay');
  if (_livePBEl && _livePBEl.style.display !== 'none' && levelData && levelData.id) {
    const _currentStageScore = score - (scoreAtLevelStart || 0);
    const _storedBest = (playerProgress.bestScores && playerProgress.bestScores[levelData.id]) || 0;
    if (_currentStageScore > _storedBest && _storedBest > 0) {
      _livePBEl.innerText = `NEW BEST!`;
      _livePBEl.style.color = 'rgba(255,210,60,0.8)';
    }
  }
}
function setOverlayState(type) {
  overlayState = type;
  if (type === 'fail') {
    ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
    forceHideOverlayExtras();
  }
}
function forceHideOverlayExtras() {
  const reviveBtn = document.getElementById('reviveBtn');
  const coinReviveBtn = document.getElementById('coinReviveBtn');
  const runCoinsBox = document.getElementById('runCoinsBox');
  const menuBtn = ui.menuBtn || document.getElementById('menuBtn');
  const clearSummary = document.getElementById('clearSummary');
  const shareBtn = document.getElementById('shareBtn');
  const pbStatsBlock = document.getElementById('pbStatsBlock');
  const runStatsBlock = document.getElementById('runStatsBlock');
  const newRecordBanner = document.getElementById('newRecordBanner');
  const closeMissBanner = document.getElementById('closeMissBanner');
  const overlayActionStack = document.getElementById('overlayActionStack');
  if (reviveBtn) reviveBtn.style.display = 'none';
  if (coinReviveBtn) coinReviveBtn.style.display = 'none';
  if (runCoinsBox) runCoinsBox.style.display = 'none';
  if (menuBtn) menuBtn.style.display = 'none';
  if (clearSummary) clearSummary.style.display = 'none';
  if (shareBtn) {
    shareBtn.style.display = 'none';
    shareBtn.classList.remove('pb-share');
    // Always restore to secondary actions on reset
    const sec = document.getElementById('overlaySecondaryActions');
    if (sec && !sec.contains(shareBtn)) sec.prepend(shareBtn);
    shareBtn.style.width = '';
    shareBtn.style.minHeight = '';
    shareBtn.style.marginBottom = '';
  }
  if (pbStatsBlock) pbStatsBlock.style.display = 'none';
  if (runStatsBlock) runStatsBlock.style.display = 'none';
  if (newRecordBanner) newRecordBanner.style.display = 'none';
  if (closeMissBanner) closeMissBanner.style.display = 'none';
  if (overlayActionStack) {
    overlayActionStack.classList.remove('revive-available', 'no-revive');
  }
}
function updateFailActionHierarchy(reviveAvailable) {
  const overlayActionStack = document.getElementById('overlayActionStack');
  if (!overlayActionStack || !ui.btn) return;
  if (reviveAvailable) {
    overlayActionStack.classList.add('revive-available');
    overlayActionStack.classList.remove('no-revive');
    ui.btn.classList.remove('primary');
  } else {
    overlayActionStack.classList.add('no-revive');
    overlayActionStack.classList.remove('revive-available');
    ui.btn.classList.add('primary');
  }
}
function setCinematicOverlayMode() {
  ui.overlay.style.display = 'flex';
  ui.btn.style.display = 'none';
  if (ui.menuBtn) {
    ui.menuBtn.blur();
    ui.menuBtn.style.outline = 'none';
  }
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  forceHideOverlayExtras();
}
function clearCinematicOverlayMode() {
  ui.btn.style.display = 'inline-block';
  if (ui.menuBtn) {
    ui.menuBtn.style.display = 'inline-block';
    ui.menuBtn.style.outline = '';
  }
}
function clearRunTransientTimers() {
  if (tempTextTimeout) { clearTimeout(tempTextTimeout); tempTextTimeout = null; }
  if (brightnessPulseTimeout) { clearTimeout(brightnessPulseTimeout); brightnessPulseTimeout = null; }
  if (bossSpawnTimeout) { clearTimeout(bossSpawnTimeout); bossSpawnTimeout = null; }
  if (nearMissFailTimeout) { clearTimeout(nearMissFailTimeout); nearMissFailTimeout = null; }
  if (bossIntroTimeout) { clearTimeout(bossIntroTimeout); bossIntroTimeout = null; }
  if (bossCinematicTimeout) { clearTimeout(bossCinematicTimeout); bossCinematicTimeout = null; }
  if (bossPauseTimeout) { clearTimeout(bossPauseTimeout); bossPauseTimeout = null; }
  if (worldClearDelayTimeout) { clearTimeout(worldClearDelayTimeout); worldClearDelayTimeout = null; }
  if (worldClearTallyInterval) { clearInterval(worldClearTallyInterval); worldClearTallyInterval = null; }
  if (comboPulseTimeout) { clearTimeout(comboPulseTimeout); comboPulseTimeout = null; }
  if (ui.comboPulseAnim) { ui.comboPulseAnim.cancel(); ui.comboPulseAnim = null; }
  if (ui.combo) ui.combo.classList.remove('combo-milestone');
  world2BossArenaRotationSpeed = 0;
}
function resetRunState() {
  clearRunTransientTimers();
  score = 0; stageHits = 0; lives = (hardModeActive ? 2 : maxLives); multiplier = 1; streak = 0;
  if (ui.combo) { ui.combo.innerText = ''; ui.combo.style.opacity = '0'; }
  distanceTraveled = 0; runCents = 0;
  angle = 0; direction = 1;
  perfectLifeStreak = 0; runBestStreak = 0;
  runPerfectHitsOnly = true;
  runLastLifeHits = 0;
  runOkCount = 0;
  runGoodCount = 0;
  runPerfectCount = 0;
  currentReviveCost = 50; reviveCount = 0; usedLastChance = false;
  // Iron Shield augment: reset extra revive eligibility
  if (activeAugment === 'iron_shield') usedLastChance = false;
  // (usedLastChance is already false, but this makes the intent explicit)
  scoreAtCheckpoint = 0; scoreAtLevelStart = 0;
  isBossPhaseTwo = false; bossPhase = 1;
  bossPauseUntil = 0; bossTransitionLock = false; stageClearHoldUntil = 0;
  isCinematicIntro = false; bossIntroPlaying = false;
  world2BossTransitionFrom25 = false;
  world2BossArenaRotation = 0;
  world2BossArenaRotationSpeed = 0;
  world2BossSequenceProgress = 0;
  world2BossSequenceLength = 0;
  world2BossNextForcedReverseAt = 0;
  world3BossLastAnnouncedPhase = 0;
  world3BossIntroDone = false;
  world3BossCollapseTriggered = false;
  lastNearMissAt = -Infinity; nearMissReplayUntil = 0; nearMissReplayActive = false;
  comboCount = 0; comboTimer = 0; comboGlow = 0; hitStopUntil = 0;
  lastMultiplierDisplay = 1;
  clearIntensity();
  if (typeof stopLastLifeDrone === 'function') stopLastLifeDrone();
  if (typeof unduckMusic === 'function') unduckMusic();
  document.body.classList.remove('last-life');
  updateLastLifeState();
  particles = []; popups = []; shockwaves = []; targetHitRipples = []; trail = [];
  resetSplitFamilyState();
}
function updateLastLifeState() {
  if (!document || !document.body) return;
  const isLastLife = lives === 1;
  const wasLastLife = document.body.classList.contains('last-life');
  document.body.classList.toggle('last-life', isLastLife);
  if (ui.lives) ui.lives.classList.toggle('last-life-count', isLastLife);

  if (isLastLife && !wasLastLife) {
    // Entering last-life state
    if (typeof startLastLifeDrone === 'function' && audioCtx) startLastLifeDrone();
    if (typeof duckMusicForLastLife === 'function') duckMusicForLastLife();
  } else if (!isLastLife && wasLastLife) {
    // Leaving last-life state (gained life or died)
    if (typeof stopLastLifeDrone === 'function') stopLastLifeDrone();
    if (typeof unduckMusic === 'function') unduckMusic();
  }
}
function loseLife(reason) {
  if (typeof OrbitGame !== 'undefined' && OrbitGame.debug && OrbitGame.debug.infiniteLives) {
    // Infinite lives mode — still show visual feedback but don't decrement
    triggerScreenShake(6);
    canvas.style.boxShadow = 'inset 0 0 40px rgba(0,255,150,0.3)';
    setTimeout(() => canvas.style.boxShadow = 'none', 200);
    return;
  }
  lives--;
  ui.lives.innerText = lives;
  updateLastLifeState();
  perfectLifeStreak = 0;
}
function gainLifeFromPerfectStreak() {
  perfectLifeStreak = 0; // always reset — prevents infinite re-trigger at max lives
  if (lives < maxLives) {
    lives++;
    ui.lives.innerText = lives;
    updateLastLifeState();
    showTempText('+1 LIFE!', '#7dfffb', 1100);
    soundLifeGained();
    vibrate([18, 24, 18]);
    createShockwave('#7dfffb', 30);
  }
}
function createParticles(x, y, color, count = 20) { return OrbitGame.entities.particles.createParticles(x, y, color, count); }
function createUpwardBurstParticles(x, y, color, count = 36) { return OrbitGame.entities.particles.createUpwardBurstParticles(x, y, color, count); }
function createDirectionalShardBurst(x, y, axisAngle, config = {}) {
  const depth = Number.isFinite(config.depth) ? config.depth : 1;
  const tangentAngle = axisAngle + (Math.PI * 0.5);
  const spread = depth >= 2 ? 5 : depth === 1 ? 7 : 9;
  const stride = depth >= 2 ? 3.6 : depth === 1 ? 4.8 : 6;
  const leftColor = config.leftColor || '#e3f3ff';
  const rightColor = config.rightColor || '#f4fbff';
  for (let i = 0; i < spread; i++) {
    const amount = (i + 1) * stride;
    const tx = Math.cos(tangentAngle) * amount;
    const ty = Math.sin(tangentAngle) * amount;
    createParticles(x - tx, y - ty, leftColor, 1);
    createParticles(x + tx, y + ty, rightColor, 1);
  }
}
function createPopup(x, y, text, color, hitQuality = null) { return OrbitGame.entities.effects.createPopup(x, y, text, color, hitQuality); }
function showComboPopup(multiplierLevel) { return OrbitGame.entities.effects.showComboPopup(multiplierLevel); }
function showNearMissReplay(reason, nearestEdgeDistance) { return OrbitGame.entities.effects.showNearMissReplay(reason, nearestEdgeDistance); }
function showSurvivalNearMissShock(nearestEdgeDistance) { return OrbitGame.entities.effects.showSurvivalNearMissShock(nearestEdgeDistance); }
function triggerIntensity(level) { return OrbitGame.entities.effects.triggerIntensity(level); }
function clearIntensity() { return OrbitGame.entities.effects.clearIntensity(); }
function createShockwave(color, speed = 40) { return OrbitGame.entities.effects.createShockwave(color, speed); }
function createTargetHitRipple(x, y, color = '#ffffff') { return OrbitGame.entities.effects.createTargetHitRipple(x, y, color); }
function triggerTargetHitFeedback(target, x, y) { return OrbitGame.entities.effects.triggerTargetHitFeedback(target, x, y); }
function triggerScreenShake(intensity = 5) {
  if (levelData && levelData.id === '2-6' && levelData.boss === 'prism') return;
  return OrbitGame.entities.effects.triggerScreenShake(intensity);
}
function pulseBrightness(amount = 1.6, duration = 120) { return OrbitGame.entities.effects.pulseBrightness(amount, duration); }
function scheduleBossSpawn(delay = 700) { return OrbitGame.entities.boss.scheduleBossSpawn(delay); }
function pauseGameplayBriefly(duration = 750) { return OrbitGame.entities.boss.pauseGameplayBriefly(duration); }

function getCurrentRunWorld() {
  if (levelData && levelData.id) {
    const parsed = parseInt(String(levelData.id).split('-')[0], 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return parseInt(menuSelectedWorld || 1, 10) || 1;
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const parsed = parseInt(cleanHex.length === 3
    ? cleanHex.split('').map(ch => ch + ch).join('')
    : cleanHex, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function rgbaFromHex(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function blendHexColors(fromHex, toHex, amount) {
  const t = Math.max(0, Math.min(1, amount));
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const r = Math.round(from.r + ((to.r - from.r) * t));
  const g = Math.round(from.g + ((to.g - from.g) * t));
  const b = Math.round(from.b + ((to.b - from.b) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeAngle(a) { return OrbitGame.systems.collision.normalizeAngle(a); }

function signedAngularDistance(from, to) { return OrbitGame.systems.collision.signedAngularDistance(from, to); }

function getTargetApproachIntensity(target, playerAngle, playerDirection) {
  return OrbitGame.systems.collision.getTargetApproachIntensity(target, playerAngle, playerDirection);
}

function generateTitle(score, world, streak, revives) {
  const totalHits = runPerfectCount + runGoodCount + runOkCount;
  const perfectRate = totalHits > 0 ? runPerfectCount / totalHits : 0;
  const isHM = hardModeActive;

  // Hard Mode specific titles
  if (isHM && revives === 0 && world >= 3) return "IRON SYNC";
  if (isHM && revives === 0 && world >= 2) return "HARD CLEARED";
  if (isHM && runLastLifeHits >= 6) return "LAST LIFE CLUTCH";
  if (isHM) return "HARD RUNNER";

  // Perfect accuracy titles
  if (revives === 0 && perfectRate >= 0.95 && totalHits >= 8 && world >= 3) return "SYNC GOD";
  if (revives === 0 && perfectRate >= 0.9 && totalHits >= 6) return "GHOST RUN";
  if (revives === 0 && perfectRate >= 0.85 && totalHits >= 5) return "FILTHY ACCURACY";

  // World clear titles
  if (revives === 0 && world >= 3) return "WORLD BREAKER";
  if (revives === 0 && world >= 2) return "CLEAN SWEEP";

  // Comeback / survival titles
  if (runLastLifeHits >= 8) return "LAST LIFE CLUTCH";
  if (runLastLifeHits >= 4) return "CLUTCH SURVIVOR";
  if (revives >= 3 && world >= 2) return "NEVER SAY DIE";

  // Combo titles
  if (streak >= 20) return "CHAIN MASTER";
  if (streak >= 12) return "COMBO KING";
  if (streak >= 8) return "ON A ROLL";

  // Score titles
  if (world >= 3 && score > 150) return "RESONANCE LOCKED";
  if (world >= 3) return "ECHO RUNNER";
  if (world >= 2 && score > 100) return "PRISM SHREDDER";
  if (score >= 150) return "ORBIT ELITE";
  if (score >= 75) return "SYNC RUNNER";

  // Progress titles
  if (world >= 2) return "WORLD JUMPER";
  if (revives >= 3) return "NEVER GIVE UP";
  if (perfectRate >= 0.7 && totalHits >= 3) return "SHARP";
  return "SYNC ROOKIE";
}

function generateShareCard() { return OrbitGame.ui.share.generateShareCard(); }
function downloadCard(card) { return OrbitGame.ui.share.downloadCard(card); }

function updateMultiplierUI() { return OrbitGame.systems.scoring.updateMultiplierUI(); }

function getCheckpointIndex() { return OrbitGame.systems.progression.getCheckpointIndex(); }

function updateWaveUI() { return OrbitGame.systems.progression.updateWaveUI(); }

function triggerBossIntro() { return OrbitGame.entities.boss.triggerBossIntro(); }

function playBossCinematic() { return OrbitGame.entities.boss.playBossCinematic(); }

function updateStreakUI(applyPulse = false, milestone = false) {
  if (ui.streak) ui.streak.innerText = streak;
  if (!ui.combo) return;
  const _prevText = ui.combo.innerText;
  const _wasHighCombo = _prevText && parseInt(_prevText.replace('COMBO ', ''), 10) >= 5;
  if (streak === 0) {
    ui.combo.innerText = '';
    ui.combo.style.opacity = '0';
  } else {
    ui.combo.innerText = `COMBO ${streak}`;
    ui.combo.style.opacity = '1';
  }
  if (streak === 0 && _wasHighCombo) {
    const _hmCrash = hardModeActive;
    ui.combo.animate(
      [
        { transform: `scale(${_hmCrash ? 1.4 : 1.2})`, color: _hmCrash ? '#ff0000' : '#ff3366', opacity: 0.6 },
        { transform: `scale(${_hmCrash ? 0.75 : 0.85})`, opacity: _hmCrash ? 0.3 : 1 },
        { transform: 'scale(1)', opacity: 1 }
      ],
      { duration: _hmCrash ? 380 : 260, easing: 'ease-out' }
    );
    if (_hmCrash) {
      triggerScreenShake(10);
      canvas.style.filter = 'brightness(1.8) hue-rotate(320deg)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 80);
    }
  }

  // Run-state ladder: body class drives global CSS responses
  document.body.classList.remove('run-state-heat', 'run-state-locked', 'run-state-overdrive');
  if (streak >= 20) {
    document.body.classList.add('run-state-overdrive');
    ui.combo.style.color = '#ffd84d';
    ui.combo.style.textShadow = '0 0 28px rgba(255, 216, 77, 1), 0 0 56px rgba(255, 190, 40, 0.5)';
    ui.combo.style.fontSize = 'clamp(2.6rem, 9.5vw, 3.8rem)';
  } else if (streak >= 10) {
    document.body.classList.add('run-state-locked');
    ui.combo.style.color = '#fff3cf';
    ui.combo.style.textShadow = '0 0 22px rgba(255, 227, 150, 0.95), 0 0 42px rgba(255, 209, 110, 0.5)';
    ui.combo.style.fontSize = 'clamp(2.3rem, 8.5vw, 3.4rem)';
  } else if (streak >= 5) {
    document.body.classList.add('run-state-heat');
    ui.combo.style.color = '#ecfdff';
    ui.combo.style.textShadow = '0 0 18px rgba(0, 237, 255, 0.7), 0 0 34px rgba(0, 229, 255, 0.3)';
    ui.combo.style.fontSize = 'clamp(2.1rem, 7.5vw, 3rem)';
  } else if (streak === 0) {
    ui.combo.style.color = '#c5f6ff';
    ui.combo.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.28), 0 0 18px rgba(0, 229, 255, 0.12)';
    ui.combo.style.fontSize = 'clamp(2.1rem, 7.5vw, 3rem)';
  } else {
    ui.combo.style.color = '#d9fbff';
    ui.combo.style.textShadow = '0 0 16px rgba(0, 229, 255, 0.5), 0 0 28px rgba(0, 229, 255, 0.18)';
    ui.combo.style.fontSize = 'clamp(2.1rem, 7.5vw, 3rem)';
  }

  if (applyPulse) {
    if (comboPulseTimeout) {
      clearTimeout(comboPulseTimeout);
      comboPulseTimeout = null;
    }
    ui.combo.classList.toggle('combo-milestone', milestone);
    if (ui.comboPulseAnim) ui.comboPulseAnim.cancel();
    ui.comboPulseAnim = ui.combo.animate(
      [
        { transform: `scale(${milestone ? 0.88 : 0.92})` },
        { transform: `scale(${milestone ? 1.16 : 1.1})`, offset: milestone ? 0.62 : 0.7 },
        { transform: 'scale(1)' }
      ],
      { duration: milestone ? 290 : 170, easing: 'ease-out' }
    );
    comboPulseTimeout = setTimeout(() => {
      ui.combo.classList.remove('combo-milestone');
      comboPulseTimeout = null;
    }, milestone ? 320 : 190);
  }
}

function loadLevel(idx) {
  if (idx < 0 || idx >= campaign.length) {
    console.warn('loadLevel ignored invalid index:', idx);
    return false;
  }
  scoreAtLevelStart = score;
  clearRunTransientTimers();
  levelData = campaign[idx];
  ensureCorrectMusicForLevel();
  currentWorldPalette = computeWorldPalette(levelData);
  currentWorldShape = computeWorldShape(levelData);
  currentWorldVisualTheme = getWorldVisualTheme(levelData);
  stageHits = 0; distanceTraveled = 0; totalStageDistance = 0; trail = [];
  popups = [];
  shockwaves = [];
  targetHitRipples = [];
  isBossPhaseTwo = false; bossPhase = 1;
  world2BossArenaRotation = 0;
  world2BossArenaRotationSpeed = 0;
  world2BossSequenceProgress = 0;
  world2BossSequenceLength = 0;
  world2BossNextForcedReverseAt = 0;
  world3BossLastAnnouncedPhase = 0;
  world3BossIntroDone = false;
  world3BossCollapseTriggered = false;
  if (levelData.id !== '2-6') world2BossTransitionFrom25 = false;
  resetSplitFamilyState();

  // Save checkpoint — so retries resume from this stage, not world start
  if (!levelData.boss) {
    localStorage.setItem('orbitSync_checkpointIdx', String(idx));
  }

  ui.stage.innerText = `Stage ${levelData.id}`; ui.text.innerText = levelData.text;
  // Per-stage personal best display
  const _stagePBEl = document.getElementById('stagePBDisplay');
  if (_stagePBEl && levelData && levelData.id) {
    const _stagePBVal = (playerProgress.bestScores && playerProgress.bestScores[levelData.id]) || 0;
    if (_stagePBVal > 0) {
      _stagePBEl.innerText = `BEST  ${_stagePBVal}`;
      _stagePBEl.style.display = 'block';
    } else {
      _stagePBEl.style.display = 'none';
    }
  }
  // Tutorial: only on first ever play of 1-1
  const tutOverlay = document.getElementById('tutorialOverlay');
  const tutMsg = document.getElementById('tutorialMsg');
  if (levelData.id === '1-1' && !tutorialComplete && !hardModeActive && tutOverlay && tutMsg) {
    tutorialPhase = 1;
    tutorialHitCount = 0;
    tutMsg.innerText = 'TAP WHEN THE ORB ENTERS THE ZONE';
    tutOverlay.style.display = 'block';
  } else if (tutOverlay) {
    tutOverlay.style.display = 'none';
    tutorialPhase = 0;
  }
  // Restore lives to full on boss entry — you earned it getting here
  if (levelData.boss && (levelData.boss === 'aegis' || levelData.boss === 'prism')) {
    lives = hardModeActive ? 2 : maxLives;
    ui.lives.innerText = lives;
  }

  ui.lives.innerText = lives;
  updateLastLifeState();
  updateStreakUI();
  updateMultiplierUI();
  updateWaveUI();

  if (levelData.boss) {
    isCinematicIntro = true;
    if (levelData.id === '1-6' || levelData.boss === 'aegis' || (levelData.id === '2-6' && levelData.boss === 'prism')) {
      triggerBossIntro();
    } else {
      if (ui.gameUI) ui.gameUI.style.display = 'block';
      if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
      playBossCinematic();
    }
  } else {
    stopBossDrone();
    // Also ensure music is in correct non-boss state on every non-boss load
    if (audioCtx) {
      const _mb = levelData && (levelData.boss === 'aegis' || levelData.boss === 'prism');
      if (!_mb) {
        // Force clear the cached boss state so updateMusicState actually fires
        if (typeof OrbitGame !== 'undefined' && OrbitGame.audio) {
          OrbitGame.audio.currentMusicState = { mult: -1, boss: null };
        }
        updateMusicState(multiplier, false);
      }
    }
    spawnTargets();
  }
  return true;
}

function buildTarget(start, size, config = {}) { return OrbitGame.entities.target.buildTarget(start, size, config); }

function spawnWorld2CornerBonusTargets() { return OrbitGame.entities.target.spawnWorld2CornerBonusTargets(); }

function buildCornerPrecisionTarget(anchorAngle, options = {}) { return OrbitGame.entities.target.buildCornerPrecisionTarget(anchorAngle, options); }

function buildDualTarget(startAngle, options = {}) { return OrbitGame.entities.target.buildDualTarget(startAngle, options); }

function buildSplitTarget(startAngle, size, options = {}) { return OrbitGame.entities.target.buildSplitTarget(startAngle, size, options); }

function spawnWorld2MechanicTargets() { return OrbitGame.entities.target.spawnWorld2MechanicTargets(); }

function spawnTargets() { return OrbitGame.systems.spawning.spawnTargets(); }

function resetSplitFamilyState() {
  activeSplitFamilyId = null;
  nextSplitFamilyId = 1;
}

function isSplitStageMode(stage = levelData) {
  return !!(
    stage &&
    !stage.boss &&
    Array.isArray(stage.mechanics) &&
    stage.mechanics.includes('split')
  );
}

function getNextSplitFamilyId() {
  const id = nextSplitFamilyId;
  nextSplitFamilyId += 1;
  return id;
}

function isSplitEntity(t) {
  return !!(t && (t.mechanic === 'split' || t.mechanic === 'splitChild'));
}

function getActiveSplitFamilyMembers(familyId) {
  return targets.filter((t) => t.active && isSplitEntity(t) && (familyId == null || t.splitFamilyId === familyId));
}

function pruneInactiveSplitTargets() {
  if (!Array.isArray(targets) || targets.length === 0) return 0;
  const before = targets.length;
  targets = targets.filter((t) => t.active || !isSplitEntity(t));
  return before - targets.length;
}

function hasActiveSplitFamily() {
  return getActiveSplitFamilyMembers().length > 0;
}

function getSplitCruiseSpeed(stage = levelData, generation = 0, sideSign = 0) {
  const baseSpeed = stage?.moveSpeed || 0;
  if (!stage || stage.id === '2-3') return baseSpeed;

  if (stage.id === '2-4') {
    const generationMultiplier = generation === 0 ? 1.15 : generation === 1 ? 1.07 : 0.98;
    const lateralBias = sideSign === 0 ? 0 : 0.00032 * sideSign;
    return Math.max(0.0048, (baseSpeed * generationMultiplier) + lateralBias);
  }

  if (stage.id === '2-5') {
    const generationMultiplier = generation === 0 ? 1.0 : generation === 1 ? 1.06 : 1.02;
    const lateralBias = sideSign === 0 ? 0 : 0.0002 * sideSign;
    return Math.max(0.0045, (baseSpeed * generationMultiplier) + lateralBias);
  }

  return baseSpeed;
}

function spawnControlledSplitRoot(options = {}) {
  if (!isSplitStageMode()) return null;
  pruneInactiveSplitTargets();
  targets.forEach((t) => {
    if (t.active && isSplitEntity(t)) t.active = false;
  });
  const familyId = getNextSplitFamilyId();
  const size = options.size || Math.PI / 4.2;
  const baseStart = typeof options.startAngle === 'number'
    ? normalizeAngle(options.startAngle)
    : normalizeAngle((Math.random() * Math.PI * 2) - (size / 2));
  const splitRoot = buildSplitTarget(baseStart, size, {
    move: getSplitCruiseSpeed(levelData, 0, 0),
    color: options.color || '#2ff6ff',
    splitFamilyId: familyId,
    splitGeneration: 0,
    splitDepth: 0,
    splitOnHit: true
  });
  splitRoot.splitFamilyId = familyId;
  splitRoot.splitGeneration = 0;
  splitRoot.splitDepth = 0;
  splitRoot.splitOnHit = true;
  splitRoot.splitTutorial = !!options.tutorialSplit;
  splitRoot.hp = 1;
  splitRoot.active = true;
  activeSplitFamilyId = familyId;
  targets.push(splitRoot);
  return splitRoot;
}

function maybeRespawnSplitRootForStage(clearedFamilyId) {
  if (!isSplitStageMode() || !clearedFamilyId) return false;
  pruneInactiveSplitTargets();
  if (stageHits >= levelData.hitsNeeded || !isPlaying) return false;
  if (getActiveSplitFamilyMembers(clearedFamilyId).length > 0) return false;
  if (hasActiveSplitFamily()) return false;
  const mechanics = Array.isArray(levelData?.mechanics) ? levelData.mechanics : [];
  const isPureSplitStage = mechanics.length === 1 && mechanics[0] === 'split';
  // Mixed-mechanic stages (e.g. 2-5) should not auto-respawn a split root.
  // Respawning here can keep at least one target alive forever, preventing
  // wave clear progression beyond wave 1.
  if (!isPureSplitStage) return false;
  triggerStageClear();
  return true;
}

OrbitGame.systems = OrbitGame.systems || {};
OrbitGame.systems.splitControl = {
  resetSplitFamilyState,
  isSplitStageMode,
  getActiveSplitFamilyMembers,
  hasActiveSplitFamily,
  spawnControlledSplitRoot,
  maybeRespawnSplitRootForStage,
  get activeSplitFamilyId() { return activeSplitFamilyId; }
};

function draw() {
  const palette = currentWorldPalette;
  const theme = currentWorldVisualTheme;
  const worldShape = currentWorldShape;
  const worldNum = parseInt(levelData ? levelData.id.split('-')[0] : '1', 10);
  const railGlowScale = theme.railGlowScale || 1;
  const now = performance.now();
  const splitPulseTime = now * 0.015;
  const useHeavyEffects = !isMobile || multiplier > 2;
  const shadowBlurCap = useHeavyEffects ? 999 : 8;
  const setShadowBlur = (value) => { ctx.shadowBlur = Math.min(shadowBlurCap, value); };
  drawTick++;
  // BACKGROUND
  let isBoss = levelData && levelData.boss;

  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  // Last-life background bleed — very subtle warm red tint over the whole arena
  if (lives === 1 && !inMenu && isPlaying) {
    const _llTint = (Math.sin(now * 0.0072) + 1) * 0.5;
    ctx.fillStyle = `rgba(180, 10, 40, ${0.04 + _llTint * 0.06})`;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  // World atmosphere glow — faint radial wash behind everything
  if (!inMenu) {
    const _atmTime = now * 0.0004;
    const _atmPulse = (Math.sin(_atmTime) + 1) * 0.5;
    let _atmColor = null;
    let _atmR = viewportWidth * 0.7;

    if (hardModeActive && !isBoss) {
      // Hard Mode override — red threat atmosphere regardless of world
      _atmColor = `rgba(160, 10, 30, ${0.07 + _atmPulse * 0.04})`;
    } else if (worldNum === 1 && !isBoss) {
      // Deep space — cold blue-teal nebula, very faint
      _atmColor = `rgba(0, 80, 180, ${0.04 + _atmPulse * 0.02})`;
    } else if (worldNum === 2 && !isBoss) {
      // Crystal — cyan-to-magenta shifting shimmer, more visible
      const _w2shift = (Math.sin(now * 0.0004) + 1) * 0.5;
      _atmColor = `rgba(${Math.round(20 + _w2shift * 180)}, ${Math.round(100 + _w2shift * 60)}, 220, ${0.07 + _atmPulse * 0.04})`;
    } else if (worldNum === 3 && !isBoss) {
      // Echo/resonance — amber-orange warmth
      _atmColor = `rgba(180, 80, 10, ${0.04 + _atmPulse * 0.02})`;
    } else if (worldNum === 4 && !isBoss) {
      // Glitch Protocol — deep purple with green pulse
      const _w4glitch = (Math.sin(now * 0.0008) + 1) * 0.5;
      _atmColor = `rgba(${Math.round(80 + _w4glitch * 40)}, ${Math.round(20 + _w4glitch * 10)}, ${Math.round(140 + _w4glitch * 60)}, ${0.08 + _atmPulse * 0.04})`;
    } else if (isBoss) {
      // Boss — deep red threat, steady
      _atmColor = `rgba(120, 0, 20, ${0.06 + _atmPulse * 0.03})`;
    }

    if (_atmColor) {
      const _atmGrad = ctx.createRadialGradient(
        centerObj.x, centerObj.y, 0,
        centerObj.x, centerObj.y, _atmR
      );
      _atmGrad.addColorStop(0, _atmColor);
      _atmGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = _atmGrad;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // W2 only: add a corner-offset magenta counter-glow for crystal feel
      if (worldNum === 2 && !isBoss) {
        const _w2MagPulse = (Math.sin(now * 0.0006 + 1.8) + 1) * 0.5;
        const _magGrad = ctx.createRadialGradient(
          viewportWidth * 0.8, viewportHeight * 0.2, 0,
          viewportWidth * 0.8, viewportHeight * 0.2, viewportWidth * 0.55
        );
        _magGrad.addColorStop(0, `rgba(200, 40, 180, ${0.04 + _w2MagPulse * 0.03})`);
        _magGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = _magGrad;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      }
      if (worldNum === 4 && !isBoss) {
        // Glitch Protocol: opposing corner green signal flare
        const _w4GreenPulse = (Math.sin(now * 0.0009 + 2.4) + 1) * 0.5;
        const _gGrad = ctx.createRadialGradient(
          viewportWidth * 0.15, viewportHeight * 0.82, 0,
          viewportWidth * 0.15, viewportHeight * 0.82, viewportWidth * 0.48
        );
        _gGrad.addColorStop(0, `rgba(0, 200, 50, ${0.04 + _w4GreenPulse * 0.035})`);
        _gGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = _gGrad;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      }
    }
  }

  // Ambient background dust
  bgDust.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255, ${d.opacity})`;
    ctx.fill();

    let speedMult = isBoss ? 3.5 : 1;
    if (worldNum === 2 && !isBoss) {
      d.x += Math.sin((now * 0.0012) + d.driftPhase + (d.y * 0.005)) * d.driftAmp;
      if (d.x < -2) d.x = viewportWidth + 2;
      if (d.x > viewportWidth + 2) d.x = -2;
    }
    if (drawTick % (isMobile ? 3 : 1) === 0) {
      d.y -= (inMenu ? d.speed * 2 : d.speed) * speedMult;
    }
    if (d.y < 0) { d.y = viewportHeight; d.x = Math.random() * viewportWidth; }
  });

  // ENERGY LANE
  const effectiveRailColor = hardModeActive
    ? '#cc1133'
    : (activeSkin === 'crimson')
      ? '#cc1133'
      : (theme.railColor || palette.primary);

  // Dark groove
  buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  // Glowing line
  buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = effectiveRailColor;
  ctx.globalAlpha = 0.9 * railGlowScale;
  setShadowBlur((worldNum === 2 && !isBoss) ? (12 * railGlowScale) : (15 * railGlowScale));
  ctx.shadowColor = effectiveRailColor;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // LAST-LIFE RING PULSE — drawn directly on the rail, pulses in canvas space
  if (lives === 1 && !inMenu && isPlaying && !levelData.boss) {
    const _llPhase = (Math.sin(now * 0.0072) + 1) * 0.5; // ~0.92Hz
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3 + _llPhase * 8;
    ctx.strokeStyle = '#ff2255';
    ctx.globalAlpha = 0.22 + _llPhase * 0.42;
    setShadowBlur(18 + _llPhase * 38);
    ctx.shadowColor = '#ff2255';
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Ambient breath ring — syncs intensity to multiplier state
  if (!inMenu && isPlaying) {
    const _brSpeed = 0.0006 + (Math.min(multiplier, 8) * 0.00018);
    const _brPhase = (Math.sin(now * _brSpeed) + 1) * 0.5;
    const _brRadius = orbitRadius + 18 + _brPhase * 28;
    const _brAlpha = (0.03 + (Math.min(multiplier, 8) * 0.006)) * _brPhase;
    const _brColor = currentWorldPalette.primary || '#00e5ff';

    ctx.beginPath();
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, _brRadius, 0, Math.PI * 2);
    ctx.strokeStyle = _brColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = _brAlpha;
    setShadowBlur(8 + multiplier * 2);
    ctx.shadowColor = _brColor;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  if (worldShape === 'diamond' && !isBoss) {
    ctx.save();

    // Outer soft aura — wide, very faint, gives the shape presence
    buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
      orbitRadius, 0, Math.PI * 2, 8);
    ctx.strokeStyle = effectiveRailColor;
    ctx.lineWidth = 12;
    ctx.globalAlpha = (0.045 + Math.abs(Math.sin(now / 1800)) * 0.02) * railGlowScale;
    ctx.shadowBlur = 20 * railGlowScale;
    ctx.shadowColor = effectiveRailColor;
    ctx.stroke();

    // Mid glow — tighter, slightly brighter
    buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
      orbitRadius, 0, Math.PI * 2, 8);
    ctx.strokeStyle = effectiveRailColor;
    ctx.lineWidth = 4;
    ctx.globalAlpha = (0.11 + Math.abs(Math.sin(now / 1600)) * 0.02) * railGlowScale;
    ctx.shadowBlur = 11 * railGlowScale;
    ctx.shadowColor = effectiveRailColor;
    ctx.stroke();

    // Corner hot spots — tiny bright dots at each diamond point,
    // no circles, just a slightly brighter section of the line
    const cornerPoints = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    cornerPoints.forEach((cornerAngle, idx) => {
      const span = Math.PI / 18;
      buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
        orbitRadius, cornerAngle - span, cornerAngle + span, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.1;
      ctx.globalAlpha = 0.2 + Math.abs(Math.sin(now / 1100 + idx)) * 0.06;
      ctx.shadowBlur = 9;
      ctx.shadowColor = effectiveRailColor;
      ctx.stroke();
    });

    ctx.restore();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Boss shield contrast pass: gently recess the base ring directly behind active shields
  // so shield segments remain readable against the bright lane, especially on small screens.
  if (isBoss) {
    const activeBossShields = targets.filter(t => t.active && t.isBossShield);
    if (activeBossShields.length > 0) {
      ctx.save();
      ctx.lineCap = 'butt';
      activeBossShields.forEach(t => {
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, t.start, t.start + t.size);
        ctx.strokeStyle = 'rgba(4, 8, 16, 0.42)';
        ctx.lineWidth = 3.2;
        ctx.shadowBlur = 0;
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  const orbColor = multiColors[Math.min(multiplier - 1, 7)];
  const baseBodyWidth = Math.max(4, Math.min(8, orbitRadius * 0.018));
  const shouldDrawTargetMarkers = useHeavyEffects || worldShape === 'circle';
  const shouldDrawWorld2MechanicBrackets = shouldDrawTargetMarkers && worldNum === 2 && worldShape === 'diamond' && !isBoss;

  // TARGETS
  targets.forEach(t => {
    if (!t.active) return;
    const tCenter = t.start + (t.size / 2);
    const approach = getTargetApproachIntensity(t, angle, direction);
    const idlePulse = 0.94 + (Math.sin(now / 620 + tCenter * 2.4) * 0.06);
    const pulseSpeed = 620 - (approach * 250);
    const anticipationPulse = 0.96 + (Math.sin(now / pulseSpeed + tCenter * 2.8) * (0.035 + approach * 0.07));
    const pulse = idlePulse * anticipationPulse;
    const hitFlash = t.hitFlash || 0;
    const hitScalePulse = t.hitScalePulse || 0;
    const dynamicRadius = orbitRadius + (hitScalePulse * 1.4);
    const isBossShield = !!t.isBossShield;
    const isWorld2PrismFacet = !!(
      isBossShield &&
      t.prismFacet &&
      levelData &&
      levelData.id === '2-6' &&
      levelData.boss === 'prism' &&
      bossPhase === 1
    );
    const bodyWidth = baseBodyWidth;
    const shieldBodyWidth = bodyWidth + 1.4;
    const glowWidth = worldShape === 'diamond' ? bodyWidth + 1.5 : bodyWidth + 4;
    const housingWidth = worldShape === 'diamond' ? glowWidth + 2 : glowWidth + 4;
    const isLiteTargetRender = !useHeavyEffects && !isBossShield;
    const isResonanceCoreTarget = levelData && levelData.id === '3-6' && !!t.isResonanceBossTarget;
    // Stronger target contrast on diamond (especially during streaks)
    let targetAlpha = isBossShield ? (0.27 + approach * 0.27 + hitFlash * 0.2) : (0.45 + approach * 0.25 + hitFlash * 0.3);
    let targetCoreAlpha = isBossShield ? 0.94 : 0.92;
    const isWorld2PrimaryTarget = worldNum === 2 && !isBoss && !t.isPhantom && !t.isCornerBonus && !t.isLifeZone && !isBossShield;
    let targetGlowColor = isWorld2PrimaryTarget ? theme.targetGlowColor : t.color;
    let targetCoreColor = isWorld2PrimaryTarget ? theme.targetCoreColor : (isBossShield ? t.color : '#ffffff');
    let resonanceGlowBoost = 1;
    let resonanceCoreBoost = 0;
    let resonanceHousingBoost = 0;
    if (isWorld2PrimaryTarget) {
      targetAlpha += 0.08;
      targetCoreAlpha = Math.min(1, targetCoreAlpha + 0.05);
    }
    if (isResonanceCoreTarget) {
      targetAlpha += 0.08;
      targetCoreAlpha = Math.min(1, targetCoreAlpha + 0.06);
      resonanceGlowBoost = t.isResonancePressureAccent ? 1.26 : 1.14;
      resonanceCoreBoost = t.isResonancePressureAccent ? 0.95 : 0.5;
      resonanceHousingBoost = 0.8;
      if (t.isResonancePressureAccent) {
        targetGlowColor = t.isEchoTarget ? '#9af8ff' : '#ffd7a3';
        targetCoreColor = '#ffffff';
      }
    }
    if (isWorld2PrismFacet) {
      targetAlpha += 0.18;
      targetCoreAlpha = Math.min(1, targetCoreAlpha + 0.08);
      targetGlowColor = t.color || '#bde9ff';
      targetCoreColor = '#f4fcff';
    }
    if (comboGlow > 0.01 && !t.isPhantom && !t.isLifeZone) {
      targetAlpha += comboGlow * 0.16;
      targetCoreAlpha = Math.min(1, targetCoreAlpha + (comboGlow * 0.08));
    }
    const drawWorld2AngularBracket = (angle, config = {}) => {
      if (!shouldDrawWorld2MechanicBrackets) return;
      const radial = getPointOnShape(angle, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      const radialX = radial.x - centerObj.x;
      const radialY = radial.y - centerObj.y;
      const radialLen = Math.hypot(radialX, radialY) || 1;
      const nx = radialX / radialLen;
      const ny = radialY / radialLen;
      const tx = -ny;
      const ty = nx;
      const dir = config.dir || 1;
      const legOut = config.legOut || 1.6;
      const legIn = config.legIn || 5.1;
      const wing = config.wing || 4.1;

      const elbowX = radial.x + nx * legOut;
      const elbowY = radial.y + ny * legOut;
      const innerX = radial.x - nx * legIn;
      const innerY = radial.y - ny * legIn;
      const wingX = elbowX + tx * wing * dir;
      const wingY = elbowY + ty * wing * dir;

      // Glow pass — restrained for crisp World 2 geometry
      ctx.beginPath();
      ctx.moveTo(wingX, wingY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(innerX, innerY);
      ctx.strokeStyle = targetGlowColor;
      ctx.globalAlpha = (config.alpha || (0.42 + approach * 0.16 + hitFlash * 0.1)) * 0.34;
      ctx.lineWidth = (config.width || 1.45) * 3.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = (config.shadowBlur || 5) * 1.4;
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();

      // Core pass — sharp, bright
      ctx.beginPath();
      ctx.moveTo(wingX, wingY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(innerX, innerY);
      ctx.strokeStyle = '#f3fdff';
      ctx.globalAlpha = config.alpha || (0.88 + approach * 0.14 + hitFlash * 0.12);
      ctx.lineWidth = (config.width || 1.45) * 1.6;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.shadowBlur = (config.shadowBlur || 5) * 0.8;
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    };

    if (t.isPhantom) {
      ctx.save();
      const phantomPulse = 0.68 + Math.abs(Math.sin(now / 290 + (tCenter * 1.1))) * 0.4;
      const isDiamondWorld = worldNum === 2 && !isBoss;
      ctx.setLineDash(isDiamondWorld ? [7, 8] : [4, 12]);
      
      // Very faint glow — barely there
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
        orbitRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ff3366';
      ctx.globalAlpha = isDiamondWorld ? (0.2 * phantomPulse) : 0.12;
      ctx.lineWidth = isDiamondWorld ? 10 : 8;
      ctx.lineCap = 'butt';
      setShadowBlur(isDiamondWorld ? 16 : 0);
      ctx.shadowColor = '#ff3366';
      ctx.stroke();
      
      // Thin dashed line only, no fill, no X label
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
        orbitRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ff3366';
      ctx.globalAlpha = isDiamondWorld ? (0.75 * phantomPulse) : 0.45;
      ctx.lineWidth = isDiamondWorld ? 2.6 : 1.5;
      setShadowBlur(isDiamondWorld ? 10 : 0);
      ctx.stroke();

      // Diamond-only prism interference streak to make phantom traps pop.
      if (isDiamondWorld) {
        const phantomMid = getPointOnShape(tCenter, worldShape, centerObj.x, centerObj.y, orbitRadius);
        const streak = 7 + Math.sin(now / 180 + tCenter * 3) * 2;
        ctx.strokeStyle = '#ffa0ff';
        ctx.globalAlpha = 0.32 * phantomPulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(phantomMid.x - streak, phantomMid.y + streak);
        ctx.lineTo(phantomMid.x + streak, phantomMid.y - streak);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1.0;
      return;
    }

    if (t.isLifeZone) {
      ctx.save();
      // Pulsing gold arc — same style as targets but amber/gold
      const lifePulse = 0.7 + Math.abs(Math.sin(Date.now() / 400)) * 0.3;

      // Glow layer
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffaa00';
      ctx.globalAlpha = (0.28 + approach * 0.18) * lifePulse;
      ctx.lineWidth = useHeavyEffects ? 10 : 7.5;
      ctx.lineCap = 'butt';
      setShadowBlur(useHeavyEffects ? (40 + (approach * 10)) : (8 + (approach * 4)));
      ctx.shadowColor = '#ffaa00';
      ctx.stroke();

      // Core line
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.86 + (approach * 0.12);
      ctx.lineWidth = 4 + (approach * 0.8);
      setShadowBlur(useHeavyEffects ? (20 + (approach * 8)) : (4 + (approach * 3)));
      ctx.shadowColor = '#ffaa00';
      ctx.stroke();

      // Small + symbol at centre of arc
      const midAngle = t.start + t.size / 2;
      const lifeMidPt = getPointOnShape(midAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      const lx = lifeMidPt.x;
      const ly = lifeMidPt.y;
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffaa00';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+1', lx, ly);

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }

    if (t.isCornerBonus) {
      ctx.save();
      const isDiamondWorld = worldNum === 2 && !isBoss;
      const bonusPulse = 0.92 + (Math.sin(now / 360 + tCenter * 3.1) * 0.1);
      const glowWidth = Math.max(3, bodyWidth * 0.85);
      const coreWidth = Math.max(1.8, bodyWidth * 0.45);

      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffd54a';
      ctx.globalAlpha = (isDiamondWorld ? 0.48 : 0.36) + (approach * 0.28) + (hitFlash * (isDiamondWorld ? 0.28 : 0.2));
      ctx.globalAlpha *= bonusPulse;
      ctx.lineWidth = glowWidth + (approach * (isDiamondWorld ? 1.0 : 0.6));
      ctx.lineCap = 'round';
      setShadowBlur(useHeavyEffects ? ((isDiamondWorld ? 20 : 14) + (approach * 8)) : (6 + (approach * 3)));
      ctx.shadowColor = '#ffd54a';
      ctx.stroke();

      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.min(1, 0.86 + approach * 0.12 + hitFlash * 0.25);
      ctx.lineWidth = coreWidth;
      setShadowBlur(useHeavyEffects ? (6 + (approach * 6)) : 0);
      ctx.shadowColor = '#ffd54a';
      ctx.stroke();

      const cornerPt = getPointOnShape(tCenter, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      const diamondSize = Math.max(5, orbitRadius * 0.022);
      ctx.save();
      ctx.translate(cornerPt.x, cornerPt.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd54a';
      ctx.globalAlpha = 0.88 + approach * 0.12;
      setShadowBlur(useHeavyEffects ? (isDiamondWorld ? 18 : 12) : 0);
      ctx.shadowColor = '#ffd54a';
      ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.95;
      ctx.strokeRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
      ctx.restore();

      ctx.restore();
      return;
    }
    if (t.isEchoTarget) {
      const pulse = 0.96 + Math.sin(Date.now() / 300) * 0.04;
      const ghostOffset = Math.sin(Date.now() / 600 + tCenter * 0.8) * 0.008;
      const midAngle = normalizeAngle(t.start + (t.size / 2));
      const markerPt = getPointOnShape(midAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);

      ctx.save();
      ctx.strokeStyle = `rgba(110,246,255,${0.92 * pulse})`;
      ctx.lineWidth = 3.2;
      if (ctx.setLineDash) ctx.setLineDash([6, 4]);
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.shadowBlur = 11;
      ctx.shadowColor = '#66f0ff';
      ctx.stroke();

      if (ctx.setLineDash) ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(170,255,255,${0.18 * pulse})`;
      ctx.lineWidth = 1.4;
      buildShapePath(
        ctx,
        worldShape,
        centerObj.x,
        centerObj.y,
        dynamicRadius - 2,
        normalizeAngle(t.start - ghostOffset),
        normalizeAngle(t.start + t.size - ghostOffset)
      );
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#66f0ff';
      ctx.stroke();

      // Core dot
      ctx.beginPath();
      ctx.arc(markerPt.x, markerPt.y, Math.max(3.2, orbitRadius * 0.01), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180,255,255,0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#66f0ff';
      ctx.fill();

      // Ghost ripple ring — unique to echo targets
      const _echoRingR = Math.max(6, orbitRadius * 0.022);
      const _echoRingPulse = (Math.sin(Date.now() / 400) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(markerPt.x, markerPt.y, _echoRingR + _echoRingPulse * 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,240,255,${0.28 + _echoRingPulse * 0.22})`;
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#66f0ff';
      ctx.stroke();

      ctx.restore();
      return;
    }
    if (t.isSyncTarget) {
      const syncPulse = 0.82 + Math.sin(Date.now() / 120) * 0.1;
      ctx.save();
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = `rgba(255,170,0,${0.95 * syncPulse})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius + 5, t.start, t.start + t.size);
      ctx.strokeStyle = `rgba(120,238,255,${0.55 * syncPulse})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
      return;
    }

    const targetRenderer = OrbitGame.entities && OrbitGame.entities.targetRenderers;
    if (targetRenderer && targetRenderer.renderTarget && targetRenderer.renderTarget(ctx, t, {
      worldShape,
      worldNum,
      isBoss,
      levelData,
      centerObj,
      dynamicRadius,
      approach,
      useHeavyEffects,
      splitPulseTime,
      shouldDrawWorld2MechanicBrackets,
      buildShapePath,
      getPointOnShape,
      drawWorld2AngularBracket,
      setShadowBlur
    })) {
      return;
    }

    ctx.save();

    if (!isLiteTargetRender) {
      // ── TARGET FILL: gives physical depth/weight ──────────
      if (!t.isLifeZone && !t.isCornerBonus && !isLiteTargetRender) {
        // Inner filled region within the target arc
        // Use a canvas clip to contain fill to the arc segment
        ctx.save();
        ctx.beginPath();
        // Build a filled "wedge" from center through the arc
        const _fillStart = t.start;
        const _fillEnd = t.start + t.size;
        const _fillMid = getPointOnShape(tCenter, worldShape, centerObj.x, centerObj.y, dynamicRadius);
        // Radial gradient centered at the arc midpoint
        const _fillGrad = ctx.createRadialGradient(
          _fillMid.x, _fillMid.y, 0,
          _fillMid.x, _fillMid.y, Math.max(8, orbitRadius * 0.08)
        );
        const _fillColor = t.color || '#ffffff';
        _fillGrad.addColorStop(0, _fillColor.replace(')', ', 0.22)').replace('rgb(', 'rgba(').replace('#', 'rgba(').length > 20
          ? _fillColor
          : _fillColor + '38');
        // Simpler approach: just use rgba manually per world color
        const _wn4fill = worldNum === 4 ? 'rgba(177,87,255,0.14)'
          : worldNum === 3 ? 'rgba(255,170,0,0.12)'
          : worldNum === 2 ? 'rgba(47,246,255,0.12)'
          : 'rgba(0,229,255,0.12)';
        const _fillInner = isBossShield ? 'rgba(255,80,100,0.18)' : _wn4fill;
        const _fillOuter = 'rgba(0,0,0,0)';
        const _fg = ctx.createRadialGradient(
          _fillMid.x, _fillMid.y, 0,
          _fillMid.x, _fillMid.y, Math.max(10, orbitRadius * 0.1)
        );
        _fg.addColorStop(0, _fillInner);
        _fg.addColorStop(1, _fillOuter);

        // Draw steps along the arc to create a filled band
        const _steps = 8;
        const _innerR = dynamicRadius - (bodyWidth * 2.5);
        const _outerR = dynamicRadius + (bodyWidth * 2.5);
        ctx.beginPath();
        for (let _si = 0; _si <= _steps; _si++) {
          const _sa = _fillStart + (_si / _steps) * (t.size);
          const _op = getPointOnShape(_sa, worldShape, centerObj.x, centerObj.y, _outerR);
          if (_si === 0) ctx.moveTo(_op.x, _op.y);
          else ctx.lineTo(_op.x, _op.y);
        }
        for (let _si = _steps; _si >= 0; _si--) {
          const _sa = _fillStart + (_si / _steps) * (t.size);
          const _ip = getPointOnShape(_sa, worldShape, centerObj.x, centerObj.y, _innerR);
          ctx.lineTo(_ip.x, _ip.y);
        }
        ctx.closePath();
        ctx.fillStyle = _fg;
        ctx.globalAlpha = 0.85 + (approach * 0.15);
        ctx.fill();
        ctx.restore();
      }
      // ── END TARGET FILL ───────────────────────────

      // --- ACTIVE TARGET HOUSING (subtle dark cradle behind gate) ---
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = isBossShield ? 'rgba(2, 6, 12, 0.96)' : 'rgba(5, 10, 18, 0.9)';
      ctx.globalAlpha = isBossShield ? (0.9 + (approach * 0.06)) : (0.74 + (approach * 0.08));
      ctx.lineWidth = isBossShield
        ? (housingWidth + 2.6)
        : ((worldShape === 'diamond' ? housingWidth - 2 : housingWidth) + resonanceHousingBoost);
      ctx.lineCap = 'butt';
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    if (isBossShield) {
      // Inner recess lip to make mounted shield weak-point feel more mechanical.
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.52)';
      ctx.globalAlpha = 0.78 + (approach * 0.1);
      ctx.lineWidth = shieldBodyWidth + 2.8;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Dark separator layer between bright lane and colored shield segment.
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = 'rgba(3, 7, 14, 0.92)';
      ctx.globalAlpha = 0.86 + (approach * 0.08);
      ctx.lineWidth = shieldBodyWidth + 1.6;
      ctx.shadowBlur = 0;
      ctx.stroke();

      if (isWorld2PrismFacet) {
        const facetCenter = getPointOnShape(tCenter, worldShape, centerObj.x, centerObj.y, dynamicRadius);
        const radialX = facetCenter.x - centerObj.x;
        const radialY = facetCenter.y - centerObj.y;
        const radialLen = Math.hypot(radialX, radialY) || 1;
        const tx = -radialY / radialLen;
        const ty = radialX / radialLen;
        const markerLen = 6.8;
        ctx.beginPath();
        ctx.moveTo(facetCenter.x - (tx * markerLen), facetCenter.y - (ty * markerLen));
        ctx.lineTo(facetCenter.x + (tx * markerLen), facetCenter.y + (ty * markerLen));
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.82 + (approach * 0.18);
        ctx.lineWidth = 1.7;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#d8efff';
        ctx.stroke();
      }
    }

    // --- ACTIVE TARGET BODY (glow + crisp core for timing window readability) ---
    ctx.beginPath();
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
    // World 2 diamond targets get brighter outer edge + stronger presence for readability.
    ctx.strokeStyle = targetGlowColor;
    ctx.globalAlpha = Math.min(1, targetAlpha * pulse);
    const glowMult = worldShape === 'diamond' ? 0.6 : 1.0;
    ctx.lineWidth = isBossShield
      ? (shieldBodyWidth + 3.6 + (approach * 1.15) + (hitFlash * 1.05))
      : ((glowWidth * resonanceGlowBoost) + (approach * 1.5 * glowMult) + (hitFlash * 1.2 * glowMult));
    setShadowBlur(isBossShield
      ? (12 + (approach * 12) + (hitFlash * 10))
      : (16 + (approach * 18) + (hitFlash * 14)));
    ctx.shadowColor = targetGlowColor;
    ctx.stroke();

    if (!isLiteTargetRender) {
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      // High-contrast core (darker in World 2 diamond) to stand out during streaks.
      ctx.strokeStyle = targetCoreColor;
      ctx.globalAlpha = targetCoreAlpha;
      ctx.lineWidth = isBossShield
        ? (Math.max(1.8, shieldBodyWidth * 0.36) + (approach * 0.22) + (hitFlash * 0.38))
        : (bodyWidth + resonanceCoreBoost + (approach * 0.8) + (hitFlash * 0.9));
      setShadowBlur(isBossShield
        ? (7 + (approach * 6) + (hitFlash * 9))
        : (10 + (approach * 12) + (hitFlash * 16)));
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    } else {
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = targetCoreColor;
      ctx.globalAlpha = targetCoreAlpha;
      ctx.lineWidth = bodyWidth + 1 + resonanceCoreBoost + (approach * 0.8) + (hitFlash * 0.9);
      setShadowBlur(6 + (approach * 6) + (hitFlash * 8));
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    }

    if (isWorld2PrimaryTarget && !isLiteTargetRender) {
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#dffcff';
      ctx.globalAlpha = 0.52 + (approach * 0.22);
      ctx.lineWidth = Math.max(1.2, bodyWidth * 0.42);
      setShadowBlur(8 + (approach * 6));
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    }

    if (hitFlash > 0.02) {
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.min(0.95, hitFlash * 0.85);
      ctx.lineWidth = bodyWidth + 2.8;
      setShadowBlur(22);
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
    }

    if (isResonanceCoreTarget) {
      const targetRenderer = OrbitGame.entities && OrbitGame.entities.targetRenderers;
      if (targetRenderer && targetRenderer.renderResonanceAccent) {
        targetRenderer.renderResonanceAccent(ctx, t, {
          centerObj,
          dynamicRadius,
          worldShape,
          buildShapePath
        });
      }
    }

    // ── CORRUPTOR CORE special render ─────────────
    if (t.isCorruptorCore) {
      const _ccMidAngle = normalizeAngle(t.start + t.size / 2);
      const _ccPt = getPointOnShape(_ccMidAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      const _ccPulse = (Math.sin(now * 0.008) + 1) * 0.5;
      const _ccR = Math.max(7, orbitRadius * 0.055) * (1 + _ccPulse * 0.22);
      const _ccApproach = approach;

      ctx.save();

      // Outer halo — pulsing green ring
      ctx.beginPath();
      ctx.arc(_ccPt.x, _ccPt.y, _ccR * 1.9, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff41';
      ctx.globalAlpha = 0.15 + _ccPulse * 0.2;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#00ff41';
      ctx.stroke();

      // Spinning outer ring
      const _ccSpin = (now * 0.003) % (Math.PI * 2);
      for (let i = 0; i < 4; i++) {
        const _spinA = _ccSpin + (i * Math.PI / 2);
        const _sx = _ccPt.x + Math.cos(_spinA) * _ccR * 1.5;
        const _sy = _ccPt.y + Math.sin(_spinA) * _ccR * 1.5;
        ctx.beginPath();
        ctx.arc(_sx, _sy, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff41';
        ctx.globalAlpha = 0.55 + _ccPulse * 0.4;
        ctx.shadowBlur = 10;
        ctx.fill();
      }

      // Core fill — solid bright green circle
      ctx.beginPath();
      ctx.arc(_ccPt.x, _ccPt.y, _ccR, 0, Math.PI * 2);
      const _ccGrad = ctx.createRadialGradient(
        _ccPt.x - _ccR * 0.3, _ccPt.y - _ccR * 0.3, 0,
        _ccPt.x, _ccPt.y, _ccR
      );
      _ccGrad.addColorStop(0, '#ffffff');
      _ccGrad.addColorStop(0.4, '#80ff90');
      _ccGrad.addColorStop(1, '#00cc30');
      ctx.fillStyle = _ccGrad;
      ctx.globalAlpha = 0.92 + _ccPulse * 0.08;
      ctx.shadowBlur = 28 + _ccPulse * 14;
      ctx.shadowColor = '#00ff41';
      ctx.fill();

      // PERFECT STRIKE label above core
      if (_ccApproach > 0.4) {
        ctx.font = `bold ${Math.max(8, orbitRadius * 0.055)}px Orbitron, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = _ccApproach * 0.9;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00ff41';
        ctx.fillText('PERFECT', _ccPt.x, _ccPt.y - _ccR - 6);
      }

      ctx.restore();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }
    // ── END CORRUPTOR CORE ────────────────────────


    // --- EDGE BRACKETS (small inward ticks framing the timing zone) ---
    const drawBracketTick = (angle) => {
      const px = centerObj.x + Math.cos(angle) * dynamicRadius;
      const py = centerObj.y + Math.sin(angle) * dynamicRadius;
      const inwardX = centerObj.x - px;
      const inwardY = centerObj.y - py;
      const inwardLen = Math.hypot(inwardX, inwardY) || 1;
      const nx = inwardX / inwardLen;
      const ny = inwardY / inwardLen;
      const tickOuter = Math.max(3, bodyWidth * 0.6);
      const tickInner = Math.max(8, bodyWidth * 1.9);

      ctx.beginPath();
      ctx.moveTo(px - nx * tickOuter, py - ny * tickOuter);
      ctx.lineTo(px + nx * tickInner, py + ny * tickInner);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.65 + (approach * 0.22) + (hitFlash * 0.15);
      ctx.lineWidth = Math.max(1.5, bodyWidth * 0.42);
      ctx.lineCap = 'round';
      ctx.shadowBlur = 8 + (approach * 6);
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    };

    if (shouldDrawTargetMarkers && worldShape === 'circle') {
      drawBracketTick(t.start);
      drawBracketTick(t.start + t.size);
    }

    // World 3 real target: diamond marker at midpoint for instant ID
    if (worldNum === 3 && !t.isEchoTarget && !t.isBossShield && !t.isPhantom && !isBoss) {
      const _midAngle = normalizeAngle(t.start + t.size / 2);
      const _midPt = getPointOnShape(_midAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      const _radX = _midPt.x - centerObj.x;
      const _radY = _midPt.y - centerObj.y;
      const _radLen = Math.hypot(_radX, _radY) || 1;
      const _nx = _radX / _radLen;
      const _ny = _radY / _radLen;
      const _ds = 5 + approach * 2.5;  // diamond size
      const _dpulse = 1 + Math.sin(Date.now() / 280) * 0.08;

      ctx.save();
      ctx.translate(_midPt.x, _midPt.y);
      // Rotate so diamond points outward from ring
      ctx.rotate(Math.atan2(_ny, _nx));
      ctx.beginPath();
      ctx.moveTo(_ds * _dpulse, 0);
      ctx.lineTo(0, _ds * 0.6 * _dpulse);
      ctx.lineTo(-_ds * _dpulse, 0);
      ctx.lineTo(0, -_ds * 0.6 * _dpulse);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,160,80,0.88)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff9a6b';
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  });

  // ── SYNC GATE SECOND PASS (drawn above all targets) ──────────
  targets.forEach(t => {
    if (!t.active) return;
    const tCenter = t.start + (t.size / 2);
    const approach = getTargetApproachIntensity(t, angle, direction);
    const hitFlash = t.hitFlash || 0;
    const dynamicRadius = orbitRadius + ((t.hitScalePulse || 0) * 1.4);

    const _showSyncGate = shouldDrawTargetMarkers
      && !t.isEchoTarget
      && !t.isBossShield
      && !t.isPhantom
      && !t.isLifeZone
      && !t.isCornerBonus;

    if (!_showSyncGate) return;

    const _gMidAngle = normalizeAngle(tCenter);
    // Start gate arms OUTSIDE the housing — clear the target stroke
    const _gRadius = dynamicRadius + 6;
    const _gMidPt = getPointOnShape(_gMidAngle, worldShape, centerObj.x, centerObj.y, _gRadius);

    const _gRadX = _gMidPt.x - centerObj.x;
    const _gRadY = _gMidPt.y - centerObj.y;
    const _gRadLen = Math.hypot(_gRadX, _gRadY) || 1;
    const _gNx = _gRadX / _gRadLen;
    const _gNy = _gRadY / _gRadLen;
    const _gTx = -_gNy;
    const _gTy = _gNx;

    const _orbToGate = Math.abs(
      ((angle - _gMidAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    );
    const _gWn = parseInt((levelData && levelData.id || '1-1').split('-')[0], 10);
    const _gSn = parseInt((levelData && levelData.id || '1-1').split('-')[1], 10);
    const _gStage = ((_gWn - 1) * 6) + _gSn;
    const _gGrace = _gStage <= 3 ? 1.25 : _gStage <= 6 ? 1.12 : _gStage <= 12 ? 1.0 : _gStage <= 18 ? 0.92 : 0.88;
    const _gHM = hardModeActive ? 0.82 : 1.0;
    const _gMult = _gGrace * _gHM;
    const _inGoodWindow = _orbToGate < (0.14 * _gMult);
    const _inPerfectWindow = _orbToGate < (0.08 * _gMult);
    const _inFilthyWindow = _orbToGate < (0.03 * _gMult);

    const _gatePulse = _inGoodWindow
      ? (0.65 + Math.sin(now * 0.028) * 0.35)
      : (0.35 + approach * 0.45);
    const _gateAlpha = Math.min(0.95,
      (_inFilthyWindow ? 1.0 : _inPerfectWindow ? 0.88 : _inGoodWindow ? 0.68 : 0.45 + approach * 0.3)
      * _gatePulse + hitFlash * 0.4
    );

    const _armLen = Math.max(6, orbitRadius * 0.058);
    const _armGap = Math.max(4, orbitRadius * 0.038);
    const _gateColor = _inFilthyWindow ? '#ffffff'
      : _inPerfectWindow ? (t.color || '#ffffff')
      : _inGoodWindow ? (t.color || '#ffffff')
      : 'rgba(255,255,255,0.7)';

    ctx.save();
    ctx.globalAlpha = _gateAlpha;
    ctx.strokeStyle = _gateColor;
    ctx.lineCap = 'round';
    const _shadowAmt = _inFilthyWindow ? 20 : _inPerfectWindow ? 14 : 8;
    ctx.shadowBlur = _shadowAmt;
    ctx.shadowColor = _gateColor;

    if (worldShape === 'circle' || worldShape === 'triangle') {
      ctx.lineWidth = Math.max(1.8, 2.2 + (_inPerfectWindow ? 0.8 : 0) + (hitFlash * 0.6));
      ctx.beginPath();
      ctx.moveTo(_gMidPt.x + _gTx * _armGap, _gMidPt.y + _gTy * _armGap);
      ctx.lineTo(_gMidPt.x + _gTx * _armGap + _gNx * _armLen, _gMidPt.y + _gTy * _armGap + _gNy * _armLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(_gMidPt.x - _gTx * _armGap, _gMidPt.y - _gTy * _armGap);
      ctx.lineTo(_gMidPt.x - _gTx * _armGap + _gNx * _armLen, _gMidPt.y - _gTy * _armGap + _gNy * _armLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(_gMidPt.x + _gNx * (_armLen * 0.55), _gMidPt.y + _gNy * (_armLen * 0.55),
        _inFilthyWindow ? 3.5 : 2.0, 0, Math.PI * 2);
      ctx.fillStyle = _gateColor;
      ctx.fill();

    } else if (worldShape === 'diamond') {
      ctx.lineWidth = Math.max(1.6, 2.0 + (hitFlash * 0.5));
      const _chevSize = Math.max(5.5, orbitRadius * 0.055);
      const _chevDepth = _chevSize * 0.55;
      ctx.beginPath();
      ctx.moveTo(_gMidPt.x + _gTx * _chevSize + _gNx * _chevDepth, _gMidPt.y + _gTy * _chevSize + _gNy * _chevDepth);
      ctx.lineTo(_gMidPt.x + _gNx * (_chevDepth * 1.8), _gMidPt.y + _gNy * (_chevDepth * 1.8));
      ctx.lineTo(_gMidPt.x - _gTx * _chevSize + _gNx * _chevDepth, _gMidPt.y - _gTy * _chevSize + _gNy * _chevDepth);
      ctx.stroke();
      if (_inGoodWindow || _inPerfectWindow) {
        ctx.beginPath();
        ctx.arc(_gMidPt.x + _gNx * (_chevDepth * 1.8), _gMidPt.y + _gNy * (_chevDepth * 1.8),
          _inFilthyWindow ? 3.2 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = _gateColor;
        ctx.fill();
      }

    } else if (worldShape === 'square') {
      ctx.lineWidth = Math.max(1.8, 2.2 + (hitFlash * 0.5));
      ctx.strokeStyle = _inFilthyWindow ? '#00ff41' : _gateColor;
      ctx.shadowColor = _inFilthyWindow ? '#00ff41' : _gateColor;
      const _barLen = Math.max(5.5, orbitRadius * 0.06);
      const _barSep = Math.max(3, orbitRadius * 0.024);
      ctx.beginPath();
      ctx.moveTo(_gMidPt.x + _gTx * _barLen * 0.5 + _gNx * _barSep, _gMidPt.y + _gTy * _barLen * 0.5 + _gNy * _barSep);
      ctx.lineTo(_gMidPt.x - _gTx * _barLen * 0.5 + _gNx * _barSep, _gMidPt.y - _gTy * _barLen * 0.5 + _gNy * _barSep);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(_gMidPt.x + _gTx * _barLen * 0.4 + _gNx * (_barSep + _armLen * 0.58), _gMidPt.y + _gTy * _barLen * 0.4 + _gNy * (_barSep + _armLen * 0.58));
      ctx.lineTo(_gMidPt.x - _gTx * _barLen * 0.4 + _gNx * (_barSep + _armLen * 0.58), _gMidPt.y - _gTy * _barLen * 0.4 + _gNy * (_barSep + _armLen * 0.58));
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  });
  // ── END SYNC GATE SECOND PASS ─────────────────────────────

  // TRAIL
  if (!inMenu && trail.length > 0) {
    const currentWorldNum = getWorldNum();
    const isEchoWorld = currentWorldNum === 3;
    const _trailMult = Math.min(multiplier, 8);
    const _trailRadiusMult = 1 + (_trailMult * 0.12); // x8 = 1.96x wider trail
    const _trailOpacityMult = 1 + (_trailMult * 0.08); // x8 = 1.64x brighter

    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const life = i / trail.length;

      const radius = isEchoWorld
        ? Math.max(1.2, 6.2 * life * _trailRadiusMult)
        : Math.max(1.8, 9.5 * life * _trailRadiusMult);

      const opacity = isEchoWorld
        ? Math.min(0.35, life * 0.18 * _trailOpacityMult)
        : Math.min(0.72, life * 0.42 * _trailOpacityMult);

      const trailColor = isEchoWorld ? '#dffcff' : orbColor;
      const glowAmount = isEchoWorld ? (4 * life) : (10 * life * _trailRadiusMult);

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = trailColor;
      ctx.globalAlpha = opacity;
      setShadowBlur(glowAmount);
      ctx.shadowColor = trailColor;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Shockwaves (preserved behaviour + integration)
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    let sw = shockwaves[i];
    sw.radius += sw.speed;
    sw.opacity -= 0.03;
    sw.width += 1.5;

    if (sw.opacity <= 0) {
      shockwaves.splice(i, 1);
    } else {
      ctx.beginPath();
      ctx.arc(centerObj.x, centerObj.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.opacity;
      ctx.lineWidth = sw.width;
      setShadowBlur(30);
      ctx.shadowColor = sw.color;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // Target-local hit ripples
  for (let i = targetHitRipples.length - 1; i >= 0; i--) {
    const ripple = targetHitRipples[i];
    ripple.radius += ripple.speed;
    ripple.life -= 0.085;
    if (ripple.life <= 0) {
      targetHitRipples.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.strokeStyle = ripple.color;
    ctx.globalAlpha = ripple.life * 0.7;
    ctx.lineWidth = 1.5 + ((1 - ripple.life) * 1.8);
    setShadowBlur(12);
    ctx.shadowColor = ripple.color;
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // WORLD 3 RENDER GUARDRAIL:
  // World 3 uses echo mechanics — the echo orb MUST be rendered here alongside the main orb.
  // Never add world-specific dimming for main/echo without updating both draw paths together.
  // Breaking this causes the player orb to appear "missing" even when logic is correct.
  // PLAYER ORB
  const currentWorldNum = getWorldNum();
  const isWorld3 = currentWorldNum === 3;

  drawOrb(ctx, angle, worldShape);

  if (isWorld3) {
    if (echoHistory.length > 0) {
      ctx.save();
      const step = Math.max(1, Math.floor(echoHistory.length / 8));
      for (let i = echoHistory.length - 1, sample = 0; i >= 0 && sample < 8; i -= step, sample++) {
        const histAngle = echoHistory[i].angle;
        const p = getPointOnShape(histAngle, worldShape, centerObj.x, centerObj.y, orbitRadius);
        const alpha = 0.28 * (1 - sample / 8);
        const r = 5 - sample * 0.45;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120,238,255,${alpha})`;
        ctx.fill();
      }
      ctx.restore();
    }

    const _echoIntroStage = levelData && (levelData.id === '3-1' || levelData.id === '3-2');
    drawOrb(ctx, echoAngle, worldShape, {
      colorOverride: '#66f0ff',
      opacity: _echoIntroStage ? 0.82 : 0.58,
      glowScale: _echoIntroStage ? 0.95 : 0.78,
      isEcho: true
    });
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // Hit polish pulse (visual only)
  if (ringHitFlash > 0.01) {
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hitFlashColor;
    ctx.globalAlpha = Math.min(0.45, ringHitFlash);
    ctx.lineWidth = Math.min(7, 2.5 + (ringHitFlash * 4) + (Math.min(multiplier - 1, 7) * 0.18));
    setShadowBlur(16);
    ctx.shadowColor = hitFlashColor;
    ctx.stroke();
  }
  if (perfectFlash > 0.01) {
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(0.32, perfectFlash);
    ctx.lineWidth = 3;
    setShadowBlur(8);
    ctx.shadowColor = '#ffffff';
    ctx.stroke();
  }
  ringHitFlash *= 0.82;
  perfectFlash *= 0.8;
  if (ringHitFlash < 0.01) ringHitFlash = 0;
  if (perfectFlash < 0.01) perfectFlash = 0;
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // PARTICLES / POPUPS (preserved)
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) {
      const deadParticle = particles.splice(i, 1)[0];
      if (deadParticle) releaseParticle(deadParticle);
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(p.angle) * p.length * p.life, p.y - Math.sin(p.angle) * p.length * p.life);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.lineWidth = 2;
      setShadowBlur(6);
      ctx.shadowColor = p.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    let pop = popups[i];
    const riseSpeed = pop.riseSpeed || 1;
    const fadeSpeed = pop.fadeSpeed || 0.02;
    pop.y -= riseSpeed;
    pop.life -= fadeSpeed;
    if (pop.life <= 0) {
      const deadPopup = popups.splice(i, 1)[0];
      if (deadPopup) releasePopup(deadPopup);
    } else {
      const age = 1 - pop.life;
      let scale = 1;
      if (pop.animType === 'perfect') {
        // Stronger "YES!" bloom then settle.
        scale = age < 0.2 ? (1.62 - (age * 1.4)) : (1.34 - ((age - 0.2) * 0.4));
      } else if (pop.animType === 'combo') {
        scale = age < 0.22 ? (1.76 - (age * 1.45)) : (1.4 - ((age - 0.22) * 0.46));
      } else if (pop.animType === 'nearMiss') {
        scale = age < 0.24 ? (2.05 - (age * 1.8)) : (1.58 - ((age - 0.24) * 0.52));
      }
      let renderX = pop.x;
      let renderY = pop.y;
      const dx = renderX - centerObj.x;
      const dy = renderY - centerObj.y;
      const dist = Math.hypot(dx, dy);
      const safeTextRadius = orbitRadius + 18;
      if (dist < safeTextRadius) {
        const inv = dist > 0.0001 ? (1 / dist) : 0;
        const nx = inv > 0 ? dx * inv : 0;
        const ny = inv > 0 ? dy * inv : -1;
        renderX = centerObj.x + (nx * safeTextRadius);
        renderY = centerObj.y + (ny * safeTextRadius);
      }
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = pop.life;
      const perfectFontSize = isMobile ? '2.2rem' : '1.95rem';
      const comboFontSize = isMobile ? '2.05rem' : '1.9rem';
      const popupFont = pop.fontSize
        ? `900 ${pop.fontSize} Orbitron`
        : (pop.hitQuality === 'perfect'
          ? `900 ${perfectFontSize} Orbitron`
          : (pop.animType === 'combo' ? `900 ${comboFontSize} Orbitron` : 'bold 1rem Orbitron'));
      ctx.font = pop.hitQuality === 'perfect'
        ? `900 ${perfectFontSize} Orbitron`
        : popupFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.save();
      ctx.translate(renderX, renderY);
      ctx.scale(scale, scale);
      if (pop.shadow > 0) {
        ctx.shadowBlur = pop.shadow;
        ctx.shadowColor = pop.color;
      }
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }
  }

  // Vignette — dark edges deepen with multiplier for tunnel-vision focus
  if (!inMenu) {
    const _vigMult = Math.min(multiplier, 8);
    const _vigAlpha = hardModeActive
      ? 0.42 + (_vigMult * 0.032)
      : 0.28 + (_vigMult * 0.025);
    const _vigGrad = ctx.createRadialGradient(
      centerObj.x, centerObj.y, orbitRadius * 0.8,
      centerObj.x, centerObj.y, Math.max(viewportWidth, viewportHeight) * 0.75
    );
    _vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    _vigGrad.addColorStop(1, `rgba(0,0,0,${_vigAlpha})`);
    ctx.fillStyle = _vigGrad;
    ctx.globalAlpha = 1.0;
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  // Ensure drawing state is clean for the next frame
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function isInsideTarget(playerAngle, t) { return OrbitGame.entities.target.isInsideTarget(playerAngle, t); }

function showTempText(text, color, duration) { return OrbitGame.entities.effects.showTempText(text, color, duration); }

function queueNextMainLoopFrame() {
  if (mainLoopRafId !== null) return;
  mainLoopRafId = requestAnimationFrame(update);
  isMainLoopRunning = true;
}

function startMainLoop() {
  // Guard against duplicate RAF chains after revive/restart/start flows.
  if (isMainLoopRunning || mainLoopRafId !== null) return false;
  queueNextMainLoopFrame();
  return true;
}

function stopMainLoop() {
  if (mainLoopRafId !== null) {
    cancelAnimationFrame(mainLoopRafId);
    mainLoopRafId = null;
  }
  isMainLoopRunning = false;
}

function update() {
  mainLoopRafId = null;
  isMainLoopRunning = true;
  if (isCinematicIntro) { queueNextMainLoopFrame(); return; }
  if (bossIntroPlaying) { draw(); queueNextMainLoopFrame(); return; }
  if (!isPlaying && !inMenu) { draw(); queueNextMainLoopFrame(); return; }
  const frameNow = performance.now();
  const delta = Math.min(2.2, Math.max(0.6, (frameNow - lastFrameTime) / 16.6667));
  lastFrameTime = frameNow;
  const isBossTransitionPaused = frameNow < bossPauseUntil;
  const isStageClearHoldPaused = frameNow < stageClearHoldUntil;
  const isHitStopPaused = frameNow < hitStopUntil;
  const nearMissSpeedScale = frameNow < nearMissReplayUntil ? 0.3 : 1;
  const worldShape = currentWorldShape;
  const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);

  const _hmSpeedMult = hardModeActive ? 1.35 : 1.0;
  let moveStep = (inMenu ? 0.02 : levelData.speed * _hmSpeedMult) * direction;
  if (!inMenu) {
    moveStep *= (1 + Math.min(0.2, totalStageDistance / (Math.PI * 48)));
  }
  if (levelData.boss && isBossPhaseTwo && !inMenu) moveStep *= 1.3;
  if (!inMenu && levelData && levelData.id === '2-6' && levelData.boss === 'prism' && bossPhase >= 2 && bossPhase <= 4) {
    moveStep *= 1.18;
    if (bossPhase === 2 && performance.now() >= world2BossNextForcedReverseAt) {
      direction *= -1;
      trail = [];
      world2BossNextForcedReverseAt = performance.now() + 2200;
      createPopup(centerObj.x, centerObj.y - 66, 'POLARITY SHIFT', '#dff6ff');
      vibrate([24, 30, 24]);
    }
  }
  if (isBossTransitionPaused || isStageClearHoldPaused || isHitStopPaused) moveStep = 0;
  else moveStep *= nearMissSpeedScale;

  moveStep *= delta;
  if (!inMenu && levelData && levelData.id === '2-6' && levelData.boss === 'prism' && !isBossTransitionPaused) {
    world2BossArenaRotation = normalizeAngle(world2BossArenaRotation + (world2BossArenaRotationSpeed * delta));
  }

  angle += moveStep;
  if (!inMenu) { distanceTraveled += Math.abs(moveStep); totalStageDistance += Math.abs(moveStep); }

  const tPt = getPointOnShape(angle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius);
  trail.push({ x: Math.round(tPt.x), y: Math.round(tPt.y) });
  const maxTrailMultiplier = isMobile ? 3 : 4;
  if (trail.length > multiplier * maxTrailMultiplier) trail.shift();

  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;
  if (worldNum === 3) {
    const nowMs = performance.now();
    recordEchoHistory(nowMs, angle);
    echoAngle = getDelayedEchoAngle(nowMs, angle);
  } else {
    echoHistory.length = 0;
    echoAngle = angle;
  }

  const _isRealBossStage = levelData && (levelData.boss === 'aegis' || levelData.boss === 'prism' || levelData.boss === 'corruptor');
  if (!inMenu && _isRealBossStage && !isBossPhaseTwo && Math.random() < 0.02) { triggerScreenShake(3); }
  if (!inMenu && comboCount > 0) {
    comboTimer = Math.max(0, comboTimer - (delta * 16.6667));
    if (comboTimer === 0) comboCount = 0;
  }
  if (comboGlow > 0) {
    comboGlow *= Math.pow(0.82, delta);
    if (comboGlow < 0.01) comboGlow = 0;
  }

  let deferredFailReason = null;
  let pendingSplitFamilyRespawnId = null;
  targets.forEach(t => {
    if (!t.active) return;

    if (t.hitFlash) t.hitFlash *= Math.pow(0.76, delta);
    if (t.hitFlash && t.hitFlash < 0.02) t.hitFlash = 0;
    if (t.hitScalePulse) t.hitScalePulse *= Math.pow(0.42, delta);
    if (t.hitScalePulse && t.hitScalePulse < 0.02) t.hitScalePulse = 0;
    if (levelData && levelData.id === '2-6' && levelData.boss === 'prism' && bossPhase === 2 && Number.isFinite(t.sequenceIndex)) {
      const baseCol = t.seqBaseColor || '#00e8ff';
      const idleA = t.seqIdleColorA || '#2b4169';
      const idleB = t.seqIdleColorB || '#3a567f';
      const idlePulse = (Math.sin((frameNow + (t.seqPulseOffset || 0)) / 260) + 1) * 0.5;
      if (t.sequenceIndex < world2BossSequenceProgress) {
        t.color = '#dff6ff';
      } else if (t.sequenceIndex === world2BossSequenceProgress) {
        t.color = blendHexColors(baseCol, '#ffffff', 0.28 + (idlePulse * 0.54));
      } else {
        t.color = blendHexColors(idleA, idleB, idlePulse);
      }
    }

    if (t.isHeart && totalStageDistance > t.expireDistance) {
      t.active = false; const expPt = getPointOnShape(t.start, worldShape, centerObj.x, centerObj.y, orbitRadius);
      createParticles(expPt.x, expPt.y, '#555', 10);
      return;
    }
    const _hmMoveMult = hardModeActive ? 1.5 : 1.0;
    let currentMoveSpeed = (t.moveSpeed !== undefined ? t.moveSpeed : (inMenu ? 0.01 : levelData.moveSpeed)) * _hmMoveMult;
    const isWorld2PrismSequenceNode = levelData && levelData.id === '2-6' && levelData.boss === 'prism' && bossPhase === 2 && Number.isFinite(t.sequenceIndex);
    if (!inMenu && t.isBossShield && bossPhase === 2 && !isWorld2PrismSequenceNode && frameNow >= (t.nextDirectionSwapAt || 0)) {
      if (Math.random() < 0.42) t.moveSpeed *= -1;
      t.nextDirectionSwapAt = frameNow + 1200 + Math.random() * 1000;
    }
    if (isBossTransitionPaused || isStageClearHoldPaused || isHitStopPaused) currentMoveSpeed = 0;
    if (!inMenu && currentMoveSpeed) {
      currentMoveSpeed *= (1 + Math.min(0.15, totalStageDistance / (Math.PI * 52)));
    }

    if (currentMoveSpeed !== 0) {
      t.start += currentMoveSpeed * delta;
      if (t.start > Math.PI * 2) t.start -= Math.PI * 2;
      if (t.start < 0) t.start += Math.PI * 2;
    }
    if (t.drift) {
      t.start += t.drift * delta;
      if (t.start > Math.PI * 2) t.start -= Math.PI * 2;
      if (t.start < 0) t.start += Math.PI * 2;
    }
    // Keep dual target center angle in sync with movement
    if (t.isDual && typeof t.targetHalfWidth === 'number') {
      t.angle = normalizeAngle(t.start + t.targetHalfWidth);
    }

    let sizeScale = 1;
    if (!inMenu && t.shrinkConfig && t.baseSize && t.shrinkConfig.distance > 0) {
      const waveDistance = Math.max(0, totalStageDistance - (t.spawnDistance || 0));
      const progress = Math.min(1, waveDistance / t.shrinkConfig.distance);
      const startScale = t.shrinkConfig.startScale ?? 1;
      const endScale = t.shrinkConfig.endScale ?? 1;
      const shrinkScale = startScale + ((endScale - startScale) * progress);
      sizeScale *= shrinkScale;
    }

    if (!inMenu && t.pulseConfig && t.baseSize) {
      const pulseAmplitude = Math.max(0, Math.min(0.18, t.pulseConfig.amplitude ?? 0.06));
      const pulsePeriod = Math.max(1400, t.pulseConfig.period ?? 2600);
      const phase = ((frameNow + (t.pulsePhaseOffset || 0)) / pulsePeriod) * (Math.PI * 2);
      const pulseNormalized = (Math.sin(phase) + 1) * 0.5;
      const pulseScale = 1 + ((pulseNormalized - 0.5) * 2 * pulseAmplitude);
      const minWindow = Math.max(0.02, Math.min(0.25, t.pulseConfig.minBonusWindow ?? 0.06));
      t.pulseAtMinimum = pulseNormalized <= minWindow;
      sizeScale *= pulseScale;
    } else {
      t.pulseAtMinimum = false;
    }

    if (t.spawnScale && t.spawnScale < 1) {
      t.spawnScale = Math.min(1, t.spawnScale + (0.08 * delta));
    }

    if (t.baseSize) {
      t.size = t.baseSize * sizeScale * (t.spawnScale || 1);
    }

    if (t.isLifeZone && t.active) {
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (!t._wasMissable && isInsideTarget(normAngle, t)) {
        t._wasMissable = true;
      }
      if (t._wasMissable && !isInsideTarget(normAngle, t)) {
        t.active = false; // life zone missed — just disappears silently
      }
    }

    // Hard Mode pass-through penalty
    if (hardModeActive && t.active && !t.isLifeZone && !t.isPhantom && !t.isBossShield && !t.isCornerBonus) {
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const insideNow = isInsideTarget(normAngle, t);
      if (!t._hmWasInside && insideNow) {
        t._hmWasInside = true;
        t._hmPassCount = (t._hmPassCount || 0);
      }
      if (t._hmWasInside && !insideNow) {
        t._hmWasInside = false;
        t._hmPassCount = (t._hmPassCount || 0) + 1;
        if (t._hmPassCount >= 2) {
          // Second pass without tap — penalty
          t.active = false;
          createPopup(centerObj.x, (centerObj.y - orbitRadius) - 30, 'MISSED WINDOW', '#ff3366');
          createShockwave('#ff3366', 28);
          triggerScreenShake(8);
          handleFail('MISSED WINDOW');
        }
      }
    }

    if (t.mechanic === 'splitChild' && t.active) {
      if (!t.spawnDistance) {
        t.spawnDistance = totalStageDistance;
      }

      // Launch children outward around the ring before they settle into play.
      if (typeof t.splitLaunchT === 'number' && t.splitLaunchT < 1) {
        t.splitLaunchT = Math.min(1, t.splitLaunchT + (0.09 * delta));

        const eased = 1 - Math.pow(1 - t.splitLaunchT, 3);
        const travel = signedAngularDistance(t.splitLaunchTarget, t.splitLaunchFrom);
        t.start = normalizeAngle(t.splitLaunchFrom + (travel * eased));

        // Freeze movement during the burst so it feels intentional, not sloppy.
        t.moveSpeed = 0;

        if (t.splitLaunchT >= 1) {
          t.start = normalizeAngle(t.splitLaunchTarget);
          t.moveSpeed = Number.isFinite(t.splitCruiseSpeed)
            ? t.splitCruiseSpeed
            : getSplitCruiseSpeed(levelData, t.splitGeneration || t.splitDepth || 0, t.splitSideSign || 0);
        }
      }

      const traveled = totalStageDistance - t.spawnDistance;
      if (traveled > Math.PI * 6) {
        // Child has circled 3 times without being hit — despawn silently
        t.active = false;
        if (t.splitFamilyId != null) {
          pendingSplitFamilyRespawnId = t.splitFamilyId;
        }
      }
    }
  });

  if (pendingSplitFamilyRespawnId != null) {
    maybeRespawnSplitRootForStage(pendingSplitFamilyRespawnId);
  }

  if (deferredFailReason) {
    handleFail(deferredFailReason);
    draw();
    queueNextMainLoopFrame();
    return;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) {
      const deadParticle = particles.splice(i, 1)[0];
      if (deadParticle) releaseParticle(deadParticle);
    }
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    if (popups[i].life <= 0) {
      const deadPopup = popups.splice(i, 1)[0];
      if (deadPopup) releasePopup(deadPopup);
    }
  }
  if (hudScoreCoinDirty && (frameNow - hudLastFlushAt) > (isMobile ? 120 : 16)) {
    flushScoreCoinUI();
  }

  updateMusicState(multiplier, _isMusicBossStage(levelData));
  draw(); queueNextMainLoopFrame();
}


function glitchCanvas(duration, callback) {
  // On mobile, skip pixel manipulation entirely —
  // getImageData/putImageData force GPU-CPU sync which
  // causes severe frame drops on mobile hardware.
  if (isMobile) {
    callback();
    return;
  }

  glitchActive = true;
  const startTime = Date.now();
  let originalImageData;
  try {
    originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (e) {
    // getImageData can fail on some browsers — fall back gracefully
    glitchActive = false;
    callback();
    return;
  }

  function glitchFrame() {
    // Cancel if revive/restart happened mid-glitch
    if (!glitchActive) return;

    if (Date.now() - startTime > duration) {
      glitchActive = false;
      callback();
      return;
    }
    ctx.putImageData(originalImageData, 0, 0);
    // Reduce from 6 slices to 3 — half the GPU readbacks
    const slices = 3;
    for (let s = 0; s < slices; s++) {
      const sliceY = Math.random() * canvas.height;
      // Use a fixed-size slice buffer instead of getImageData each time
      const sliceH = Math.floor(Math.random() * 20 + 5);
      const shift = Math.floor((Math.random() - 0.5) * 24);
      try {
        const slice = ctx.getImageData(0, sliceY, canvas.width, sliceH);
        ctx.putImageData(slice, shift, sliceY);
      } catch (e) {}
    }
    requestAnimationFrame(glitchFrame);
  }
  glitchFrame();
}

function scrambleText(element, finalText, duration) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const startTime = Date.now();

  function frame() {
    const progress = Math.min((Date.now() - startTime) / duration, 1);
    const resolvedCount = Math.floor(progress * finalText.length);
    let result = finalText.slice(0, resolvedCount);
    for (let i = resolvedCount; i < finalText.length; i++) {
      result += finalText[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
    }
    element.innerText = result;
    if (progress < 1) requestAnimationFrame(frame);
  }
  frame();
}

function updatePBDisplay(newRecords) {
  document.getElementById('pbScoreDisplay').innerText = personalBest.score;
  document.getElementById('pbStreakDisplay').innerText = personalBest.streak;
  document.getElementById('pbWorldDisplay').innerText = personalBest.world;

  // Highlight new records in gold
  document.getElementById('pbScoreDisplay').className =
    newRecords.score ? 'pb-value new-record' : 'pb-value';
  document.getElementById('pbStreakDisplay').className =
    newRecords.streak ? 'pb-value new-record' : 'pb-value';
  document.getElementById('pbWorldDisplay').className =
    newRecords.world ? 'pb-value new-record' : 'pb-value';

  // Show banner if any record was broken
  const anyNew = newRecords.score || newRecords.streak || newRecords.world;
  const newRecordBanner = document.getElementById('newRecordBanner');
  if (newRecordBanner) {
    newRecordBanner.style.display = anyNew ? 'block' : 'none';
    newRecordBanner.innerText = anyNew ? '★ NEW RECORD ★' : '';
  }
}

function handleFail(reason, failEdgeDistance = Infinity) {
  const streakBeforeFail = streak;
  loseLife(reason);
  distanceTraveled = 0; multiplier = 1; updateMultiplierUI();
  streak = 0;
  updateStreakUI();
  triggerScreenShake(10);
  if (lives > 0) {
    runPerfectHitsOnly = false;
    soundLifeLost();
    vibrate([30, 20, 30]);
  } else {
    soundFail();
    vibrate([50, 30, 50, 30, 80]);
  }
  canvas.style.boxShadow = `inset 0 0 50px #ff3366`; setTimeout(() => canvas.style.boxShadow = 'none', 150);

  if (lives <= 0) {
    if (audioCtx) updateMusicState(multiplier, false);
    clearIntensity();
    if (typeof stopLastLifeDrone === 'function') stopLastLifeDrone();
    if (typeof unduckMusic === 'function') unduckMusic();
    const previousPB = {
      score: personalBest.score || 0,
      streak: personalBest.streak || 0,
      world: personalBest.world || 1
    };
    const currentRunWorld = getCurrentRunWorld();
    const newRecords = checkAndSavePB(score, streakBeforeFail);
    isPlaying = false; ui.topBar.style.display = 'none'; const _pb2 = document.getElementById('pauseBtn'); if (_pb2) _pb2.style.display = 'none'; ui.gameUI.style.display = 'none'; if (ui.arenaInfo) ui.arenaInfo.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
    const pendingCoins = getPendingRunCoins();
    const pbStatsBlock = document.getElementById('pbStatsBlock');
    const runStatsBlock = document.getElementById('runStatsBlock');
    const runScoreDisplay = document.getElementById('runScoreDisplay');
    const runComboDisplay = document.getElementById('runComboDisplay');
    const nearMissEl = document.getElementById('nearMissMsg');
    const runCoinsBox = document.getElementById('runCoinsBox');
    const runCoinsHint = document.getElementById('runCoinsHint');
    const menuBtn = ui.menuBtn || document.getElementById('menuBtn');
    const clearSummary = document.getElementById('clearSummary');
    updatePBDisplay(newRecords);
    glitchCanvas(120, () => {
      ui.overlay.style.display = 'flex';
      ui.title.style.color = '#ff3366';
      ui.title.classList.add('run-title');
      let title = generateTitle(score, currentRunWorld, streakBeforeFail, reviveCount);
      ui.title.innerText = title;
    });
    const newRecordBanner = document.getElementById('newRecordBanner');
    if (newRecordBanner) {
      let pbMessage = '';
      const scoreDiff = Math.max(0, previousPB.score - score);
      const closeMargin = Math.max(3, Math.floor(previousPB.score * 0.1));
      if (newRecords.score || newRecords.streak || newRecords.world) pbMessage = '★ NEW RECORD ★';
      else if (previousPB.score > 0 && scoreDiff > 0 && scoreDiff <= closeMargin) pbMessage = `⚡ ${scoreDiff} off best`;
      newRecordBanner.style.display = pbMessage ? 'block' : 'none';
      newRecordBanner.innerText = pbMessage;
    }
    const closeMissBanner = document.getElementById('closeMissBanner');
    const isCloseMiss = Number.isFinite(failEdgeDistance) && failEdgeDistance > 0 && failEdgeDistance < 0.08;
    let nearBestBannerActive = false;
    if (closeMissBanner) {
      closeMissBanner.innerText = '⚠ ONE TAP OFF';
      closeMissBanner.style.display = isCloseMiss ? 'block' : 'none';
    }
    if (newRecordBanner) nearBestBannerActive = !isCloseMiss && newRecordBanner.style.display === 'block' && !newRecords.score && !newRecords.streak && !newRecords.world;
    if (clearSummary) clearSummary.style.display = 'none';
    if (pbStatsBlock) pbStatsBlock.style.display = 'none';
    const showComboHero = streakBeforeFail >= 3;
    const bestCombo = Math.max(runBestStreak || 0, streakBeforeFail || 0);
    if (runComboDisplay) runComboDisplay.innerText = showComboHero ? `COMBO ${streakBeforeFail}` : `SCORE ${score}`;
    if (runScoreDisplay) {
      if (showComboHero) runScoreDisplay.innerText = `Score ${score}`;
      else if (bestCombo > 0) runScoreDisplay.innerText = `Best combo ${bestCombo}`;
      else runScoreDisplay.innerText = '';
    }
    if (nearMissEl) {
      nearMissEl.innerText = '';
      nearMissEl.style.display = 'none';
    }
    let subtitleText = '';
    if (isCloseMiss) subtitleText = 'ONE TAP OFF';
    else if (nearBestBannerActive) subtitleText = '';
    else if (streakBeforeFail >= 6) subtitleText = 'RUN BROKEN';
    ui.subtitle.classList.add('subtle-failure');
    ui.subtitle.innerText = subtitleText;
    ui.subtitle.style.display = subtitleText ? 'block' : 'none';
    if (runStatsBlock) runStatsBlock.style.display = 'flex';
    ui.btn.innerText = pendingCoins > 0 ? `BANK ${pendingCoins} + PLAY AGAIN` : 'PLAY AGAIN';
    ui.btn.onclick = function () {
      bankRunCoins();
      ui.overlay.style.display = 'none';
      restartFromCheckpoint();
    };
    if (pendingCoins > 0) {
      ui.runCoins.innerText = `+${pendingCoins} COINS`;
      if (runCoinsHint) runCoinsHint.style.display = 'none';
      if (runCoinsBox) runCoinsBox.style.display = 'inline-flex';
    } else {
      ui.runCoins.innerText = '';
      if (runCoinsHint) runCoinsHint.style.display = 'none';
      if (runCoinsBox) runCoinsBox.style.display = 'none';
    }
    if (menuBtn) {
      menuBtn.style.display = 'inline-block';
      menuBtn.onclick = function () {
        if (pendingCoins > 0) bankRunCoins();
        returnToMenu();
      };
    }
    const shareBtn = document.getElementById('shareBtn');
    const overlayButtonGroup = document.getElementById('overlayButtonGroup');
    const overlaySecondaryActions = document.getElementById('overlaySecondaryActions');
    const isNewPB = !!(newRecords.score || newRecords.streak || newRecords.world);
    if (shareBtn) {
      shareBtn.style.display = 'inline-block';
      shareBtn.classList.toggle('pb-share', isNewPB);
      if (isNewPB && overlayButtonGroup && !overlayButtonGroup.contains(shareBtn)) {
        // On PB: insert share as first button above the play button
        overlayButtonGroup.insertBefore(shareBtn, overlayButtonGroup.firstChild);
        shareBtn.style.width = '100%';
        shareBtn.style.minHeight = '44px';
        shareBtn.style.marginBottom = '4px';
        shareBtn.style.fontSize = '0.72rem';
        shareBtn.style.letterSpacing = '3px';
      } else if (!isNewPB && overlaySecondaryActions && !overlaySecondaryActions.contains(shareBtn)) {
        // Non-PB: return to secondary row
        overlaySecondaryActions.prepend(shareBtn);
        shareBtn.style.width = '';
        shareBtn.style.minHeight = '';
        shareBtn.style.marginBottom = '';
        shareBtn.style.fontSize = '';
        shareBtn.style.letterSpacing = '';
      }
    }
    setOverlayState('gameOver');
    let reviveBtn = document.getElementById('reviveBtn');
    let coinReviveBtn = document.getElementById('coinReviveBtn');
    reviveBtn.style.display = 'block';
    if (coinReviveBtn) coinReviveBtn.style.display = 'none';
    let reviveAvailable = false;

    const _ironShieldBonus = (activeAugment === 'iron_shield') && reviveCount === 0 && usedLastChance;
    if (!usedLastChance || _ironShieldBonus) {
      if (_ironShieldBonus) usedLastChance = false; // reset for the iron shield bonus
      reviveBtn.innerText = activeAugment === 'iron_shield' && reviveCount === 0
        ? "SHIELD REVIVE" : "ONE MORE TRY";
      reviveBtn.onclick = function () {
        usedLastChance = true;
        restartCurrentStageAfterRevive();
      };
      reviveAvailable = true;
    } else {
      reviveBtn.style.display = 'none';
    }

    const reviveCost = currentReviveCost || 50;
    if (coinReviveBtn && globalCoins >= reviveCost) {
      coinReviveBtn.style.display = 'block';
      coinReviveBtn.innerText = `REVIVE (🪙 ${reviveCost})`;
      coinReviveBtn.onclick = function () {
        if (audioCtx) soundUIClick();
        attemptCoinRevive();
      };
      reviveAvailable = true;
    }
    updateFailActionHierarchy(reviveAvailable);
  }
}

function restartCurrentStageAfterRevive() {
  glitchActive = false;
  const pending = runCents;
  const banked = globalCoins;
  const usedChance = usedLastChance;
  const reviveCost = currentReviveCost;
  const reviveTotal = reviveCount;

  clearRunTransientTimers();
  loadLevel(currentLevelIdx);

  runCents = pending;
  globalCoins = banked;
  usedLastChance = usedChance;
  currentReviveCost = reviveCost;
  reviveCount = reviveTotal;
  lives = 1;
  ui.lives.innerText = lives;
  updateLastLifeState();
  isPlaying = true;
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'flex';
  const _pb = document.getElementById('pauseBtn');
  if (_pb) _pb.style.display = 'flex';
  ui.gameUI.style.display = 'block';
  if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
  ui.bigMultiplier.style.display = 'none';
  if (ui.bossUI) ui.bossUI.style.display = 'none';
  clearCinematicOverlayMode();
  updatePersistentCoinUI();
  markScoreCoinDirty(true);
}

function revive() {
  reviveCount++;
  restartCurrentStageAfterRevive();
}

function attemptCoinRevive() {
  return OrbitGame.ui.overlay.attemptCoinRevive();
}

function tap() {
  initAudio(); // Ensures audio wakes up on iOS/Safari
  if (inMenu || !isPlaying || (typeof isCinematicIntro !== 'undefined' && isCinematicIntro)) return;
  if (ui.overlay.style.display === 'flex') return;
  if (bossTransitionLock) return;
  if (nearMissReplayActive) return;
  let hitIndex = -1; let hitQuality = "miss"; let hitSegmentIndex = -1;
  let hitAngleForEffects = angle;
  const hitProfiles = OrbitGame.entities && OrbitGame.entities.targetHitProfiles;

  for (let i = 0; i < targets.length; i++) {
    if (!targets[i].active) continue;
    const t = targets[i];
    if (t.isEchoTarget) {
      const echoHit = isInsideTarget(echoAngle, t);
      if (echoHit) {
        hitIndex = i;
        hitAngleForEffects = echoAngle;
        if (hitProfiles && hitProfiles.getHitQuality) {
          const quality = hitProfiles.getHitQuality(t, echoAngle, { normalizeAngle, signedAngularDistance });
          if (!quality) continue;
          hitQuality = quality;
        }
        break;
      } else {
        continue;
      }
    }
    if (t.isSyncTarget) {
      const realHit = hitProfiles && hitProfiles.isHit
        ? hitProfiles.isHit(t, angle, { normalizeAngle, signedAngularDistance })
        : false;
      if (!realHit) {
        continue;
      }
      const echoHit = hitProfiles && hitProfiles.isHit
        ? hitProfiles.isHit(t, echoAngle, { normalizeAngle, signedAngularDistance })
        : false;
      if (!echoHit) {
        if (typeof createPopup === 'function') {
          createPopup(centerObj.x, centerObj.y - 40, 'ECHO NOT IN RANGE', '#78eeff');
          createPopup(centerObj.x, centerObj.y - orbitRadius - 20, 'TAP ECHO ◌', '#66f0ff');
        }
        return;
      }
      hitIndex = i;
      hitQuality = 'good';
      hitAngleForEffects = angle;
      break;
    }

    let isHit = false;
    if (hitProfiles && hitProfiles.isHit) {
      isHit = hitProfiles.isHit(t, angle, { normalizeAngle, signedAngularDistance });
    }

    if (isHit) {
      hitIndex = i;
      if (hitProfiles && hitProfiles.getHitQuality) {
        const quality = hitProfiles.getHitQuality(t, angle, { normalizeAngle, signedAngularDistance });
        if (!quality) {
          continue;
        }
        hitQuality = quality;
      }
      break;
    }
  }

  const hitPt = getPointOnShape(hitAngleForEffects, getWorldShape(), centerObj.x, centerObj.y, orbitRadius);
  const hitX = hitPt.x;
  const hitY = hitPt.y;

  if (hitIndex !== -1) {
    let t = targets[hitIndex];
    const targetCenterAngle = normalizeAngle(t.start + (t.size / 2));
    const hitTimingOffset = signedAngularDistance(hitAngleForEffects, targetCenterAngle);
    const hitTimingAccuracy = Math.abs(hitTimingOffset);
    const _augWideMult = (activeAugment === 'wide_sync') ? 1.2 : 1.0;
    const _hmTightMult = (hardModeActive) ? 0.82 : 1.0;

    // Grace scale: 1-1 starts at 1.25x (25% more forgiving),
    // tapers to 1.0x by stage 12 (end of W2), then 0.92x for W3+,
    // W4+ gets 0.88x — tightest before Hard Mode kicks in.
    const _stageGrace = (() => {
      const wn = parseInt((levelData && levelData.id || '1-1').split('-')[0], 10);
      const sn = parseInt((levelData && levelData.id || '1-1').split('-')[1], 10);
      const globalStage = ((wn - 1) * 6) + sn; // 1–24 across 4 worlds
      if (globalStage <= 3) return 1.25;       // 1-1 to 1-3: very forgiving
      if (globalStage <= 6) return 1.12;       // 1-4 to 1-6: slightly forgiving
      if (globalStage <= 12) return 1.0;       // 2-1 to 2-6: standard
      if (globalStage <= 18) return 0.92;      // 3-1 to 3-6: tighter
      return 0.88;                             // 4-1+: tight
    })();

    const _windowMult = _augWideMult * _hmTightMult * _stageGrace;
    const filthyWindow = 0.03 * _windowMult;
    const perfectWindow = 0.08 * _windowMult;
    const goodWindow = 0.14 * _windowMult;
    const hitTimingTier = hitTimingAccuracy < filthyWindow
      ? 'filthy-perfect'
      : (hitTimingAccuracy < perfectWindow ? 'perfect' : (hitTimingAccuracy < goodWindow ? 'good' : 'weak'));

    triggerTargetHitFeedback(t, hitX, hitY);
    if (t.isEchoTarget) {
      // Echo-specific feedback
      setTimeout(() => {
        if (audioCtx) playPop(6, true);
      }, 60);

      createParticles(hitX, hitY, '#00eaff', 12);
    }
    if (levelData.reverse !== false) {
      direction *= -1;
      trail = []; // Clear trail on direction flip — prevents corner artifacts
    }
    distanceTraveled = 0;
    hitFlashColor = t.color || '#00ff88';
    ringHitFlash = Math.max(ringHitFlash, 0.26);
    hitStopUntil = Math.max(hitStopUntil, performance.now() + 28);
    comboCount++;
    comboTimer = 1600;
    comboGlow = Math.min(1.4, comboGlow + 0.2);

    if (levelData.boss && !isBossPhaseTwo && t.isBossShield) {
      const isWorld2PrismBoss = levelData.id === '2-6' && levelData.boss === 'prism';
      if (isWorld2PrismBoss && bossPhase === 2 && Number.isFinite(t.sequenceIndex)) {
        const expectedIdx = world2BossSequenceProgress;
        if (t.sequenceIndex !== expectedIdx) {
          world2BossSequenceProgress = 0;
          multiplier = 1;
          streak = 0;
          updateStreakUI();
          updateMultiplierUI();
          triggerScreenShake(16);
          pulseBrightness(1.8, 180);
          createShockwave('#ff3366', 32);
          createParticles(hitX, hitY, '#ff3366', 22);
          createPopup(hitX, hitY - 24, 'WRONG NODE', '#ff3366');
          createPopup(centerObj.x, centerObj.y - 56, 'SEQUENCE BROKEN', '#ff3366');
          createPopup(centerObj.x, centerObj.y - 22, 'RESETTING...', '#ffffff');
          soundFail();
          vibrate([50, 30, 80]);
          return;
        }

        t.active = false;
        world2BossSequenceProgress++;
        createParticles(hitX, hitY, '#ffd54a', 16);
        createPopup(hitX, hitY - 18, `${world2BossSequenceProgress}/${world2BossSequenceLength}`, '#ffffff');
        soundBossShieldHit(Math.max(1, world2BossSequenceLength - world2BossSequenceProgress));

        if (world2BossSequenceProgress >= world2BossSequenceLength) {
          bossPhase = 3;
          world2BossSequenceProgress = 0;
          pauseGameplayBriefly(980);
          triggerScreenShake(18);
          pulseBrightness(2.0, 180);
          createShockwave('#ffd54a', 44);
          createPopup(centerObj.x, centerObj.y - 62, "FINAL LOCK", "#ffd54a");
          createPopup(centerObj.x, centerObj.y - 30, "CORNERS", "#ffffff");
          scheduleBossSpawn(980);
        }
        return;
      }

      if (isWorld2PrismBoss && bossPhase === 3 && t.isPrismCornerLock) {
        t.active = false;
        world2BossSequenceProgress++;
        createParticles(hitX, hitY, '#ffe68b', 16);
        createPopup(hitX, hitY - 18, `${world2BossSequenceProgress}/4`, '#ffffff');
        soundBossShieldHit(Math.max(1, 4 - world2BossSequenceProgress));
        if (world2BossSequenceProgress >= 4) {
          bossPhase = 4;
          pauseGameplayBriefly(980);
          triggerScreenShake(20);
          pulseBrightness(2.2, 220);
          createShockwave('#ffffff', 52);
          createPopup(centerObj.x, centerObj.y - 58, "CORE EXPOSED", "#ffffff");
          createPopup(centerObj.x, centerObj.y - 24, "FINAL STRIKE", "#dff6ff");
          scheduleBossSpawn(980);
        }
        return;
      }

      t.hp--;
      triggerScreenShake(4);
      vibrate(15);
      if (t.hp > 0) soundBossShieldHit(t.hp);
      if (t.hp > 1) t.color = '#ffaa00'; // warning
      if (t.hp === 1) t.color = '#ff3366'; // critical
      if (t.hp <= 0) { t.active = false; soundShieldBreak(); }
      createParticles(hitX, hitY, t.color, 14);
      const shieldsLeft = targets.filter(tgt => tgt.isBossShield && tgt.active).length;
      const shouldShowShieldReadout = levelData.boss !== 'aegis';
      if (shouldShowShieldReadout) {
        if (t.hp > 0) createPopup(hitX, hitY - 18, `${t.hp} HIT${t.hp > 1 ? 'S' : ''}`, t.color);
        createPopup(centerObj.x, centerObj.y - 80, `SHIELDS ${shieldsLeft}`, '#ffffff');
      }
      if (shieldsLeft === 0 && !isBossPhaseTwo) {
        // ─── CORRUPTOR ──────────────────────────
        if (levelData.boss === 'corruptor' && bossPhase === 1) {
          bossPhase = 2;
          ui.bossPhase1.className = 'boss-segment';
          ui.bossPhase2.className = 'boss-segment active-segment';
          pauseGameplayBriefly(1200);
          triggerScreenShake(32);
          pulseBrightness(2.4, 220);
          createShockwave('#b157ff', 38);
          createShockwave('#ff3366', 56);
          createShockwave('#00ff41', 72);
          createParticles(centerObj.x, centerObj.y, '#b157ff', 40);
          createParticles(centerObj.x, centerObj.y, '#ff3366', 24);
          createPopup(centerObj.x, centerObj.y - 62, 'CORRUPTOR', '#b157ff');
          createPopup(centerObj.x, centerObj.y - 28, 'ENRAGED', '#ff3366');
          createPopup(centerObj.x, centerObj.y + 8, 'FIND THE SIGNAL', '#ffffff');
          escalateBossDrone();
          vibrate([60, 30, 80, 30, 100]);
          scheduleBossSpawn(1200);
          return;
        }
        if (levelData.boss === 'corruptor' && bossPhase === 2) {
          isBossPhaseTwo = true;
          ui.bossPhase2.className = 'boss-segment';
          pauseGameplayBriefly(820);
          triggerScreenShake(28);
          pulseBrightness(2.2, 180);
          createShockwave('#00ff41', 44);
          createShockwave('#ffffff', 62);
          createParticles(centerObj.x, centerObj.y, '#00ff41', 48);
          createPopup(centerObj.x, centerObj.y - 56, 'CORRUPT CORE', '#00ff41');
          createPopup(centerObj.x, centerObj.y - 22, 'EXPOSED', '#ffffff');
          soundCoreExposed();
          vibrate([80, 40, 80]);
          scheduleBossSpawn(820);
          return;
        }
        // ─── END CORRUPTOR ──────────────────────
        if (isWorld2PrismBoss && bossPhase === 1) {
          bossPhase = 2;
          ui.bossPhase1.className = "boss-segment";
          ui.bossPhase2.className = "boss-segment active-segment";
          pauseGameplayBriefly(1100);
          triggerScreenShake(28);
          pulseBrightness(2.2, 200);
          createShockwave('#00e8ff', 28);
          createShockwave('#ff4fd8', 44);
          createShockwave('#ffd54a', 62);
          createParticles(centerObj.x, centerObj.y, '#00e8ff', 50);
          createParticles(centerObj.x, centerObj.y, '#ff4fd8', 30);
          createPopup(centerObj.x, centerObj.y - 62, "ALIGNMENT", "#00e8ff");
          createPopup(centerObj.x, centerObj.y - 30, "SEQUENCE", "#ffd54a");
          createPopup(centerObj.x, centerObj.y + 8, "BEGIN", "#ffffff");
          escalateBossDrone();
          scheduleBossSpawn(1100);
        } else {
          isBossPhaseTwo = true;
          if (bossPhase === 1) ui.bossPhase1.className = "boss-segment";
          else ui.bossPhase2.className = "boss-segment";
          pauseGameplayBriefly(760);
          createPopup(centerObj.x, centerObj.y - 50, "CORE EXPOSED", "#ffffff");
          triggerScreenShake(26);
          createShockwave('#ffffff', 48);
          createShockwave('#00e5ff', 34);
          pulseBrightness(2.0, 140);
          soundCoreExposed();
          scheduleBossSpawn(760);
        }
      } return;
    }

    if (
      levelData &&
      levelData.boss === 'corruptor' &&
      isBossPhaseTwo &&
      t.isCorruptorCore
    ) {
      t.active = false;
      ui.bossPhase2.className = 'boss-segment';
      triggerScreenShake(38);
      pulseBrightness(2.6, 280);
      createShockwave('#00ff41', 36);
      createShockwave('#b157ff', 52);
      createShockwave('#ffffff', 70);
      createShockwave('#00ff41', 88);
      createParticles(centerObj.x, centerObj.y, '#00ff41', 60);
      createParticles(centerObj.x, centerObj.y, '#b157ff', 40);
      createUpwardBurstParticles(centerObj.x, centerObj.y - 8, '#ffffff', 56);
      createUpwardBurstParticles(centerObj.x, centerObj.y + 4, '#00ff41', 44);
      createPopup(centerObj.x, centerObj.y - 70, 'CORRUPTION', '#b157ff');
      createPopup(centerObj.x, centerObj.y - 36, 'TERMINATED', '#00ff41');
      createPopup(centerObj.x, centerObj.y, 'SIGNAL RESTORED', '#ffffff');
      soundBossDefeated();
      stopBossDrone();
      vibrate([80, 40, 100, 40, 120, 40, 80]);
      stageHits = 999;
      isPlaying = false;
      canvas.style.filter = 'brightness(2.8) saturate(2) hue-rotate(260deg)';
      setTimeout(() => { canvas.style.filter = 'brightness(1)'; }, 120);
      setTimeout(() => { canvas.style.filter = 'brightness(2.2) hue-rotate(120deg)'; }, 240);
      setTimeout(() => { canvas.style.filter = 'brightness(1)'; }, 380);
      setTimeout(() => { triggerStageClear(); }, 1800);
      return;
    }

    if (
      levelData &&
      levelData.id === '2-6' &&
      levelData.boss === 'prism' &&
      bossPhase === 4 &&
      t.isPrismFinalCore
    ) {
      t.active = false;
      ui.bossPhase2.className = "boss-segment";
      createParticles(centerObj.x, centerObj.y, '#ffffff', 50);
      createShockwave('#00ff88', 55);
      createShockwave('#ffffff', 70);
      createShockwave('#9be7ff', 86);
      createShockwave('#cfefff', 100);
      createParticles(centerObj.x, centerObj.y, '#dff5ff', 84);
      createUpwardBurstParticles(centerObj.x, centerObj.y - 6, '#d7ecff', 64);
      pulseBrightness(2.45, 260);
      createPopup(centerObj.x, centerObj.y - 64, "THE PRISM", "#dff5ff");
      createPopup(centerObj.x, centerObj.y - 30, "SHATTERED", "#ffffff");
      soundBossDefeated();
      stopBossDrone();
      world2BossArenaRotationSpeed = 0;
      stageHits = 999;
      isPlaying = false;
      setTimeout(() => {
        triggerStageClear();
      }, 1600);
      return;
    }

    const targetBehaviours = OrbitGame.entities && OrbitGame.entities.targetBehaviours;
    if (targetBehaviours && targetBehaviours.applyHit) {
      targetBehaviours.applyHit(t, {
        angle,
        hitX,
        hitY,
        levelData,
        targets,
        audioCtx,
        normalizeAngle,
        signedAngularDistance,
        buildTarget,
        getSplitCruiseSpeed,
        pruneInactiveSplitTargets,
        maybeRespawnSplitRootForStage,
        createParticles,
        createShockwave,
        createDirectionalShardBurst,
        createPopup,
        pulseBrightness,
        triggerScreenShake,
        playPop
      });
    } else {
      t.active = false;
    }

    if (t.isPhantom) {
      // Player hit a phantom — punish without the usual hit flow
      const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
      const isDiamondWorld = worldNum === 2;
      const isGlitchWorld = worldNum === 4;
      comboCount = 0;
      comboTimer = 0;
      comboGlow = 0;
      t.active = false;

      if (isGlitchWorld) {
        // W4: corrupted signal feedback — purple + green
        triggerScreenShake(14);
        canvas.style.filter = 'brightness(2.2) hue-rotate(260deg) saturate(1.8)';
        setTimeout(() => canvas.style.filter = 'brightness(1)', 110);
        createShockwave('#b157ff', 34);
        createShockwave('#00ff41', 20);
        createPopup(hitX, hitY - 20, 'CORRUPTED', '#b157ff');
        createParticles(hitX, hitY, '#b157ff', 24);
        createParticles(hitX, hitY, '#00ff41', 12);
        createUpwardBurstParticles(hitX, hitY - 6, '#cc88ff', 18);
      } else {
        triggerScreenShake(isDiamondWorld ? 11 : 8);
        canvas.style.filter = 'brightness(2)';
        setTimeout(() => canvas.style.filter = 'brightness(1)', 100);
        createShockwave('#ff3366', isDiamondWorld ? 36 : 30);
        createPopup(hitX, hitY - 20, 'TRAP!', '#ff3366');
        createParticles(hitX, hitY, '#ff3366', isDiamondWorld ? 28 : 20);
        if (isDiamondWorld) {
          createUpwardBurstParticles(hitX, hitY - 8, '#ff96f0', 22);
        }
      }
      soundFail();
      vibrate([40, 20, 40]);
      handleFail("HIT A PHANTOM");
      return;
    }

    if (t.isCornerBonus) {
      const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
      const cornerBonusScore = 5;
      score += cornerBonusScore;
      runCents += cornerBonusScore;
      markScoreCoinDirty();
      createPopup(hitX, hitY - 24, `CORNER +${cornerBonusScore}`, '#ffd54a');
      createParticles(hitX, hitY, '#ffd54a', worldNum === 2 ? 34 : 28);
      if (worldNum === 2) {
        createUpwardBurstParticles(hitX, hitY, '#ffd54a', 32);
        soundPerfect(multiplier);
      }
      createShockwave('#ffd54a', 24);
      soundCornerBonus(worldNum);
      if (worldNum === 2) {
        pulseBrightness(1.28, 90);
      }
      vibrate([8, 20, 8]);
      flushScoreCoinUI();
      return;
    }

    if (levelData.boss && isBossPhaseTwo) {
      // Allow ANY hit inside the core window (perfect, good, or ok) to count!
      if (hitQuality === "perfect" || hitQuality === "good" || hitQuality === "ok") {
        soundCoreDamage();
        if (bossPhase === 1) {
          bossPhase = 2; isBossPhaseTwo = false; multiplier = 1; streak = 0; updateStreakUI(); updateMultiplierUI();
          createParticles(centerObj.x, centerObj.y, '#ff3366', 72);
          createShockwave('#ff3366', 44);
          pulseBrightness(1.7, 120);
          const _hmEnraged = typeof isHardModeActive === 'function' && isHardModeActive();
          createPopup(centerObj.x, centerObj.y - 50, _hmEnraged ? "MAXIMUM THREAT" : "ENRAGED", "#ff3366");
          if (_hmEnraged) {
            createShockwave('#ff3366', 48);
            createShockwave('#ff0000', 64);
          }
          escalateBossDrone();
          triggerScreenShake(24); scheduleBossSpawn(700); return;
        } else {
          ui.bossPhase2.className = "boss-segment";
          createParticles(centerObj.x, centerObj.y, '#ffffff', 50);
          createShockwave('#00ff88', 55);
          createShockwave('#ffffff', 70);
          createPopup(centerObj.x, centerObj.y - 50, "BOSS DEFEATED!", "#00ff88");
          soundBossDefeated();
          stopBossDrone();
          triggerScreenShake(20);
          stageHits = 999;
          isPlaying = false;
          setTimeout(() => {
            triggerStageClear();
          }, 2200);
          return;
        }
      } else {
        multiplier = 1; streak = 0; updateStreakUI(); updateMultiplierUI();
        createPopup(centerObj.x, centerObj.y - 50, "REGENERATING...", "#ffaa00");
        if (bossPhase === 1) ui.bossPhase1.className = "boss-segment active-segment";
        else ui.bossPhase2.className = "boss-segment active-segment";
        triggerScreenShake(10); isBossPhaseTwo = false; scheduleBossSpawn(700); return;
      }
    }

    if (t.pulseConfig && t.pulseAtMinimum) {
      const pulseBonus = Math.max(1, Math.min(3, t.pulseConfig.minHitBonus ?? 1));
      score += pulseBonus;
      runCents += pulseBonus;
      ringHitFlash = Math.max(ringHitFlash, 0.32);
      createPopup(hitX, hitY - 44, `PULSE +${pulseBonus}`, '#7dfffb');
      createParticles(hitX, hitY, '#7dfffb', 10);
      createTargetHitRipple(hitX, hitY, '#7dfffb');
      vibrate(12);
    }

    if (hitTimingTier === 'filthy-perfect') {
      perfectLifeStreak++;
      runPerfectCount++;
      if (lives === 1) runLastLifeHits++;
      if (currentLevelIdx >= 2) {
        perfectFlash = Math.max(perfectFlash, 0.34);
      }
      ringHitFlash = Math.max(ringHitFlash, 0.55 + Math.min(multiplier, 8) * 0.055);
      multiplier = Math.min(multiplier + 1, 8);
      soundMultiplierUp(multiplier);
      score += (4 * multiplier);
      const normalX = hitX - centerObj.x;
      const normalY = hitY - centerObj.y;
      const normalLen = Math.hypot(normalX, normalY) || 1;
      const outwardX = normalX / normalLen;
      const outwardY = normalY / normalLen;
      canvas.style.filter = 'brightness(2.1)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 60);
      soundPerfect(multiplier);
      if (audioCtx) playPop(10, true);
      // Score punch — scale + colour flash
      if (ui.score) {
        const _sPunchColor = multiColors[Math.min(multiplier - 1, 7)];
        ui.score.style.color = _sPunchColor;
        ui.score.style.textShadow = `0 0 22px ${_sPunchColor}`;
        if (ui.scorePunchAnim) ui.scorePunchAnim.cancel();
        ui.scorePunchAnim = ui.score.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }],
          { duration: 200, easing: 'ease-out' }
        );
        ui.scorePunchAnim.onfinish = () => {
          ui.score.style.color = '';
          ui.score.style.textShadow = '';
          ui.scorePunchAnim = null;
        };
      }
      vibrate([12, 28, 12]);
      createUpwardBurstParticles(hitX, hitY - 10, '#ffffff', 52);
      createParticles(hitX, hitY, '#ffffff', 20);
      if (perfectLifeStreak >= 6) {
        gainLifeFromPerfectStreak();
      } else if (perfectLifeStreak >= 2) {
        // Show streak build-up — small, rises above the ring
        const _psAngle = angle;
        const _psPt = getPointOnShape(_psAngle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius - 28);
        const _psPopup = createPopup(_psPt.x, _psPt.y - 20, `✦ ${perfectLifeStreak} / 6`, '#7dfffb');
        _psPopup.life = 0.7;
        _psPopup.riseSpeed = 0.4;
        _psPopup.fadeSpeed = 0.04;
        _psPopup.shadow = 10;
        _psPopup.scale = 0.72;
      }
    }
    else if (hitTimingTier === 'perfect' || hitQuality === "perfect") {
      perfectLifeStreak++;
      runPerfectCount++;
      if (lives === 1) runLastLifeHits++;
      if (currentLevelIdx >= 2) {
        perfectFlash = Math.max(perfectFlash, 0.34);
      }
      ringHitFlash = Math.max(ringHitFlash, 0.45 + Math.min(multiplier, 8) * 0.04);
      multiplier = Math.min(multiplier + 1, 8);
      soundMultiplierUp(multiplier);
      score += (3 * multiplier);
      const normalX = hitX - centerObj.x;
      const normalY = hitY - centerObj.y;
      const normalLen = Math.hypot(normalX, normalY) || 1;
      const outwardX = normalX / normalLen;
      const outwardY = normalY / normalLen;
      // Punchier but ultra-short flash to keep input feeling instant.
      canvas.style.filter = 'brightness(2.3)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 70);
      soundPerfect(multiplier);
      if (ui.score) {
        const _sPunchColor = multiColors[Math.min(multiplier - 1, 7)];
        ui.score.style.color = _sPunchColor;
        ui.score.style.textShadow = `0 0 16px ${_sPunchColor}`;
        if (ui.scorePunchAnim) ui.scorePunchAnim.cancel();
        ui.scorePunchAnim = ui.score.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.14)', offset: 0.4 }, { transform: 'scale(1)' }],
          { duration: 160, easing: 'ease-out' }
        );
        ui.scorePunchAnim.onfinish = () => {
          ui.score.style.color = '';
          ui.score.style.textShadow = '';
          ui.scorePunchAnim = null;
        };
      }
      vibrate([12, 28, 12]);
      createUpwardBurstParticles(hitX, hitY - 10, '#fff36a', 42);
      if (perfectLifeStreak >= 6) {
        gainLifeFromPerfectStreak();
      } else if (perfectLifeStreak >= 2) {
        // Show streak build-up — small, rises above the ring
        const _psAngle = angle;
        const _psPt = getPointOnShape(_psAngle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius - 28);
        const _psPopup = createPopup(_psPt.x, _psPt.y - 20, `✦ ${perfectLifeStreak} / 6`, '#7dfffb');
        _psPopup.life = 0.7;
        _psPopup.riseSpeed = 0.4;
        _psPopup.fadeSpeed = 0.04;
        _psPopup.shadow = 10;
        _psPopup.scale = 0.72;
      }
    }
    else if (hitTimingTier === 'good' || hitQuality === "good") {
      perfectLifeStreak = 0;
      runGoodCount++;
      if (lives === 1) runLastLifeHits++;
      runPerfectHitsOnly = false;
      ringHitFlash = Math.max(ringHitFlash, 0.28 + Math.min(multiplier, 8) * 0.025);
      score += (2 * multiplier);
      canvas.style.filter = 'brightness(1.4)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 60);
      soundGood(multiplier);
      vibrate(20);
    }
    else {
      perfectLifeStreak = 0;
      runOkCount++;
      runPerfectHitsOnly = false;
      ringHitFlash = Math.max(ringHitFlash, 0.08);
      multiplier = 1; score += 1;
      const okTimingLabel = hitTimingOffset < -0.012 ? 'LATE' : (hitTimingOffset > 0.012 ? 'EARLY' : null);
      createPopup(hitX, hitY - 24, okTimingLabel ? `${okTimingLabel}` : 'SLOPPY', '#ff6677', 'ok');
      canvas.style.filter = 'brightness(1.5) hue-rotate(320deg) saturate(1.4)';
      setTimeout(() => { canvas.style.filter = 'brightness(1)'; }, 55);
      createShockwave('#ff6677', 20);
      createParticles(hitX, hitY, '#ff7788', 12);
      triggerScreenShake(5);
      soundOk();
      vibrate([20, 10, 20]);
    }

    // Tutorial phase progression
    if (tutorialPhase > 0 && levelData && levelData.id === '1-1') {
      tutorialHitCount++;
      const tutMsg = document.getElementById('tutorialMsg');
      const tutOverlay = document.getElementById('tutorialOverlay');
      if (tutorialPhase === 1 && (hitTimingTier === 'filthy-perfect' || hitTimingTier === 'perfect' || hitTimingTier === 'good') && tutMsg) {
        tutorialPhase = 2;
        tutMsg.innerText = 'NOW TAP DEAD CENTRE FOR PERFECT';
      } else if (tutorialPhase === 2 && (hitTimingTier === 'filthy-perfect' || hitTimingTier === 'perfect') && tutMsg) {
        tutorialPhase = 3;
        tutMsg.innerText = '✦ PERFECT ✦';
        setTimeout(() => {
          if (tutOverlay) tutOverlay.style.display = 'none';
          tutorialPhase = 0;
          tutorialComplete = true;
          localStorage.setItem('orbitSync_tutorialDone', '1');
        }, 1400);
      } else if (tutorialHitCount >= 4 && tutOverlay) {
        tutOverlay.style.display = 'none';
        tutorialPhase = 0;
        tutorialComplete = true;
        localStorage.setItem('orbitSync_tutorialDone', '1');
      }
    }

    streak++;
    runBestStreak = Math.max(runBestStreak, streak);
    const isStreakMilestone = streak === 10 || streak === 20 || streak === 30;
    updateStreakUI(true, isStreakMilestone);
    const streakMilestoneBonus = streak === 10 ? 5 : (streak === 20 ? 15 : (streak === 30 ? 30 : 0));
    if (streakMilestoneBonus > 0) {
      runCents += streakMilestoneBonus;
      createPopup(hitX, hitY - 54, `STREAK +${streakMilestoneBonus}`, '#ffd27a');
      markScoreCoinDirty();
    }
    if (streak % 5 === 0) {
      triggerScreenShake(4);
      if (audioCtx) playPop(10, true);
      const streakPt = getPointOnShape(angle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius);
      createParticles(streakPt.x, streakPt.y, '#ffaa00', 25);
    }

    let centsEarned = (hitTimingTier === 'filthy-perfect' || hitTimingTier === 'perfect' || hitQuality === "perfect"
      ? 3
      : (hitTimingTier === 'good' || hitQuality === "good" ? 2 : 1)) * multiplier;
    if (activeAugment === 'coin_surge') centsEarned = Math.ceil(centsEarned * 1.5);
    runCents += centsEarned;
    markScoreCoinDirty();
    updateMultiplierUI();
    const _hmParticleColor = hardModeActive ? '#ff3344' : t.color;
    createParticles(hitX, hitY, _hmParticleColor, 18 + Math.min(18, comboCount));
    if (comboCount > 2 && comboCount % 6 === 0) {
      createPopup(hitX, hitY - 36, `COMBO x${comboCount}`, '#ffd54a');
    }
    const shouldForceHudFlush = targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active)
      || stageHits >= levelData.hitsNeeded;
    if (shouldForceHudFlush) flushScoreCoinUI();

    if (targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active) || stageHits >= levelData.hitsNeeded) {
      const isResonanceFinalHit = levelData
        && levelData.id === '3-6'
        && stageHits === (levelData.hitsNeeded - 1)
        && !world3BossCollapseTriggered;
      if (isResonanceFinalHit) {
        world3BossCollapseTriggered = true;
        createPopup(centerObj.x, centerObj.y - 68, 'CORE COLLAPSE', '#ffffff');
        createPopup(centerObj.x, centerObj.y - 36, 'RESONANCE BROKEN', '#66f0ff');
        createPopup(centerObj.x, centerObj.y - 6, 'SIGNAL SILENCED', '#ffb468');
        createShockwave('#ffffff', 44);
        createShockwave('#66f0ff', 58);
        createShockwave('#ff9f1a', 72);
        createParticles(centerObj.x, centerObj.y, '#ffffff', 54);
        createUpwardBurstParticles(centerObj.x, centerObj.y + 6, '#66f0ff', 48);
        pulseBrightness(2.1, 170);
        triggerScreenShake(22);
        if (typeof vibrate === 'function') vibrate([35, 20, 55, 25, 80]);
      }
      triggerStageClear();
    }
  } else {
    const touchingEchoOnlyTarget = targets.some((t) => t.active && t.isEchoTarget && isInsideTarget(angle, t));
    if (touchingEchoOnlyTarget) {
      // Player tapped inside an echo target — wrong type
      const _mixedStage = targets.some(t => t.active && !t.isEchoTarget) &&
                        targets.some(t => t.active && t.isEchoTarget);
      if (_mixedStage) {
        const _echoPt = getPointOnShape(angle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius);
        createPopup(_echoPt.x, _echoPt.y - 22, 'TAP REAL ◆', '#ff9a6b');
      }
      return;
    }
    comboCount = 0;
    comboTimer = 0;
    comboGlow = 0;
    let nearestEdgeDistance = Infinity;
    let nearestTarget = null;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.active) continue;

      const startEdge = normalizeAngle(t.start);
      const endEdge = normalizeAngle(t.start + t.size);
      const distToStart = Math.abs(signedAngularDistance(angle, startEdge));
      const distToEnd = Math.abs(signedAngularDistance(angle, endEdge));
      const edgeDistance = Math.min(distToStart, distToEnd);
      if (edgeDistance < nearestEdgeDistance) {
        nearestEdgeDistance = edgeDistance;
        nearestTarget = t;
      }
    }

    const now = Date.now();
    const nearMissAvailable = (now - lastNearMissAt) >= NEAR_MISS_COOLDOWN_MS;
    const isNearMiss = streak > 0 && nearMissAvailable && nearestEdgeDistance <= NEAR_MISS_THRESHOLD;
    const isSurvivalNearMissShock = lives > 1
      && nearMissAvailable
      && nearestEdgeDistance <= NEAR_MISS_SURVIVAL_THRESHOLD;

    if (isNearMiss) {
      lastNearMissAt = now;
      perfectLifeStreak = 0;
      const _wasComboing = streak >= 5;
      multiplier = 1;
      streak = 0;
      updateStreakUI();
      updateMultiplierUI();
      if (_wasComboing && ui.combo) {
        ui.combo.animate(
          [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 0.2, color: '#ff3366' }, { transform: 'scale(0.9)', opacity: 1 }],
          { duration: 220, easing: 'ease-out' }
        );
      }

      if (isSurvivalNearMissShock) {
        showSurvivalNearMissShock(nearestEdgeDistance);
      } else {
        ringHitFlash = Math.max(ringHitFlash, 0.16);
        createShockwave('#ffaa00', 28);
        createPopup(hitX, hitY - 24, nearestEdgeDistance <= (NEAR_MISS_THRESHOLD * 0.5) ? "SO CLOSE" : "CLOSE!", "#ffaa00");
        canvas.style.boxShadow = `inset 0 0 32px #ffaa00`;
        setTimeout(() => canvas.style.boxShadow = 'none', 100);
        if (navigator.vibrate) vibrate(12);
      }
      handleFail("MISSED", nearestEdgeDistance);
    } else {
      perfectLifeStreak = 0;
      if (nearestTarget) {
        const nearestCenter = normalizeAngle(nearestTarget.start + (nearestTarget.size / 2));
        const missDirection = signedAngularDistance(angle, nearestCenter);
        createPopup(hitX, hitY - 42, missDirection > 0 ? 'TOO LATE' : 'TOO EARLY', '#78eeff');
      }
      if (lives <= 1 && nearestEdgeDistance <= NEAR_MISS_THRESHOLD) {
        showNearMissReplay("MISSED", nearestEdgeDistance);
      } else {
        if (isSurvivalNearMissShock) {
          lastNearMissAt = now;
          showSurvivalNearMissShock(nearestEdgeDistance);
        }
        handleFail("MISSED", nearestEdgeDistance);
      }
    }
  }
}

function triggerStageClear() { return OrbitGame.systems.progression.triggerStageClear(); }

function startCampaign() { return OrbitGame.ui.menus.startCampaign(); }

function restartFromCheckpoint() {
  glitchActive = false;
  ui.overlay.style.display = 'none';
  ui.title.classList.remove('run-title');
  ui.subtitle.classList.remove('subtle-failure');
  const runStatsBlock = document.getElementById('runStatsBlock');
  const runScoreDisplay = document.getElementById('runScoreDisplay');
  const runComboDisplay = document.getElementById('runComboDisplay');
  const nearMissEl = document.getElementById('nearMissMsg');
  if (runStatsBlock) runStatsBlock.style.display = 'none';
  if (runScoreDisplay) runScoreDisplay.innerText = 'Score 0';
  if (runComboDisplay) runComboDisplay.innerText = 'COMBO 0';
  if (nearMissEl) nearMissEl.innerText = '';
  const closeMissBanner = document.getElementById('closeMissBanner');
  if (closeMissBanner) closeMissBanner.style.display = 'none';
  ui.topBar.style.display = 'flex';
  const _pb = document.getElementById('pauseBtn');
  if (_pb) _pb.style.display = 'flex';
  ui.gameUI.style.display = 'block';
  if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
  ui.bigMultiplier.style.display = 'none';

  resetRunState();
  ui.score.innerText = 0;
  updateStreakUI();
  updateMultiplierUI();
  markScoreCoinDirty(true);
  currentLevelIdx = getCheckpointIndex();
  loadLevel(currentLevelIdx);
  isPlaying = true;
}

function returnToMenu() {
  localStorage.removeItem('orbitSync_checkpointIdx');
  if (_pendingResize) {
    _pendingResize = false;
    updateCanvasSize();
  }
  hardModeActive = false;
  activeAugment = null;
  document.body.classList.remove('hard-mode');
  clearRunTransientTimers();
  clearIntensity();
  stopBossDrone();
  stopDynamicMusic();
  toggleSettings(false);
  setOverlayState('cinematic');
  ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
  ui.overlay.style.display = 'none'; ui.mainMenu.style.display = 'flex'; ui.topBar.style.display = 'none'; const _pb2 = document.getElementById('pauseBtn'); if (_pb2) _pb2.style.display = 'none'; ui.gameUI.style.display = 'none'; if (ui.arenaInfo) ui.arenaInfo.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
  const runStatsBlock = document.getElementById('runStatsBlock');
  if (runStatsBlock) runStatsBlock.style.display = 'none';
  ui.text.style.display = 'block';
  inMenu = true; isPlaying = false;
  refreshMenuWorldPreview();

  // Daily streak badge
  const _streakBadge = document.getElementById('dailyStreakBadge');
  if (_streakBadge && dailyLoginStreak > 0) {
    const _streakEmoji = dailyLoginStreak >= 7 ? '🔥🔥' : dailyLoginStreak >= 3 ? '🔥' : '✦';
    _streakBadge.innerText = `${_streakEmoji} DAY ${dailyLoginStreak} STREAK`;
    _streakBadge.style.display = 'block';
  }
}

function changeWorld(dir) { return OrbitGame.ui.menus.changeWorld(dir); }

function updateWorldSelectorUI() { return OrbitGame.ui.menus.updateWorldSelectorUI(); }

function getStartingIndexForWorld(worldNum) {
  for (let i = 0; i < campaign.length; i++) {
    if (campaign[i].id.startsWith(worldNum + "-")) return i;
  }
  return 0; // Fallback
}

function refreshMenuWorldPreview() {
  if (!inMenu) return;
  const worldStartIdx = getStartingIndexForWorld(menuSelectedWorld);
  levelData = campaign[worldStartIdx] || campaign[0];
  currentWorldPalette = computeWorldPalette(levelData);
  currentWorldShape = computeWorldShape(levelData);
  currentWorldVisualTheme = getWorldVisualTheme(levelData);
  spawnTargets();
}

function showWorldClearSequence({ nextLevelIdx, nextWorld, coinsEarned, isCampaignClear }) {
  clearRunTransientTimers();
  isPlaying = false;

  // 1. Duck the music to a quiet hum
  if (bossGain && audioCtx) {
    bossGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 1.5);
  }

  // 2. Setup the darkened UI
  ui.overlay.style.display = 'flex';
  ui.overlay.style.background = 'rgba(5, 5, 10, 0.95)'; // Darker, cleaner focus
  ui.topBar.style.display = 'none';
  const _pb2 = document.getElementById('pauseBtn');
  if (_pb2) _pb2.style.display = 'none';
  ui.gameUI.style.display = 'none';
  if (ui.arenaInfo) ui.arenaInfo.style.display = 'none';
  ui.bossUI.style.display = 'none';
  ui.bigMultiplier.style.display = 'none';

  const _clearTitle = isCampaignClear
    ? "CAMPAIGN CLEARED"
    : generateTitle(score, nextWorld - 1, runBestStreak, reviveCount);
  ui.title.innerText = _clearTitle;
  ui.title.style.color = isCampaignClear ? '#ffd84d' : '#00ff88';
  ui.subtitle.innerText = "Decrypting rewards...";

  // Hide buttons during tally
  setOverlayState('worldClearTally');

  const clearSummary = document.getElementById('clearSummary');
  const clearScoreDisplay = document.getElementById('clearScoreDisplay');
  const clearCoinsDisplay = document.getElementById('clearCoinsDisplay');
  const clearStreakDisplay = document.getElementById('clearStreakDisplay');
  if (clearSummary) clearSummary.style.display = 'grid';
  if (clearScoreDisplay) clearScoreDisplay.innerText = score;
  if (clearStreakDisplay) clearStreakDisplay.innerText = runBestStreak;
  if (clearCoinsDisplay) clearCoinsDisplay.innerText = '0';

  // 3. The Dopamine Tally Animation
  let currentDisplayCoins = 0;
  ui.runCoins.innerText = `0 COINS`;

  // Start tally after 1 second delay for dramatic effect
  worldClearDelayTimeout = setTimeout(() => {
    worldClearDelayTimeout = null;
    worldClearTallyInterval = setInterval(() => {
      // Increment by a dynamic amount so it finishes in ~20 ticks
      let increment = Math.max(1, Math.ceil(coinsEarned / 20));
      currentDisplayCoins += increment;

      if (currentDisplayCoins >= coinsEarned) {
        currentDisplayCoins = coinsEarned;
        clearInterval(worldClearTallyInterval);
        worldClearTallyInterval = null;

        // Final Ding & Bank update
        if (audioCtx) playPop(8, true); // High pitch success ding
        const coinsBanked = bankRunCoins();

        // Flash text & Show Next World button
        ui.runCoins.innerText = `+${coinsBanked} BANKED`;
        ui.runCoins.style.textShadow = '0 0 20px #ffaa00';
        if (clearCoinsDisplay) clearCoinsDisplay.innerText = `+${coinsBanked}`;
        ui.subtitle.innerText = isCampaignClear
          ? "All worlds synced. Returning to menu."
          : (nextWorld === 2 ? "The Diamond Protocol Awaits" : "Ready for the next sector.");
        ui.btn.innerText = isCampaignClear ? "RETURN TO MENU" : `ENTER WORLD ${nextWorld}`;
        setOverlayState('worldClearReady');
        // Show augment picker after brief delay (let player see their score first)
        if (!isCampaignClear && typeof showAugmentPicker === 'function') {
          setTimeout(() => showAugmentPicker(), 1200);
        }
        // Populate stage replay buttons
        const _replayRow = document.getElementById('stageReplayRow');
        const _replayBtns = document.getElementById('stageReplayBtns');
        if (_replayRow && _replayBtns && !isCampaignClear) {
          const _worldPrefix = String(currentLevelIdx >= 0 && campaign[currentLevelIdx]
            ? campaign[currentLevelIdx].id.split('-')[0]
            : '1') + '-';
          // Find the world that was just cleared (one before nextWorld)
          const _clearedWorldPrefix = nextWorld > 1 ? String(nextWorld - 1) + '-' : '1-';
          const _worldStages = campaign.filter(s => s && s.id && s.id.startsWith(_clearedWorldPrefix) && !s.boss);
          _replayBtns.innerHTML = '';
          const _totalStars = _worldStages.reduce((acc, s) => {
            return acc + ((playerProgress.stageStars && playerProgress.stageStars[s.id]) || 0);
          }, 0);
          const _maxStars = _worldStages.length * 3;
          const _summaryEl = document.createElement('div');
          _summaryEl.style.cssText = 'width:100%; text-align:center; font-family:Orbitron,sans-serif; font-size:0.62rem; letter-spacing:2px; color:rgba(255,210,80,0.65); margin-bottom:10px;';
          _summaryEl.innerText = `${_totalStars} / ${_maxStars} ★`;
          _replayBtns.appendChild(_summaryEl);
          _worldStages.forEach(s => {
            const _pb = (playerProgress.bestScores && playerProgress.bestScores[s.id]) || 0;
            const _btn = document.createElement('button');
            _btn.style.cssText = 'font-family:Orbitron,sans-serif; font-size:0.58rem; letter-spacing:1.5px; padding:7px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); color:rgba(255,255,255,0.55); border-radius:6px; cursor:pointer;';
            const _stars = (playerProgress.stageStars && playerProgress.stageStars[s.id]) || 0;
            const _starStr = '★'.repeat(_stars) + '☆'.repeat(3 - _stars);
            const _pbStr = _pb > 0 ? `  ${_pb}` : '';
            _btn.innerText = `${s.id}  ${_starStr}${_pbStr}`;
            // Highlight 3-star stages
            if (_stars === 3) {
              _btn.style.borderColor = 'rgba(255,210,60,0.4)';
              _btn.style.color = 'rgba(255,210,100,0.8)';
            }
            _btn.onclick = function() {
              ui.overlay.style.display = 'none';
              const _idx = campaign.findIndex(c => c && c.id === s.id);
              if (_idx >= 0) {
                currentLevelIdx = _idx;
                inMenu = false;
                isPlaying = false;
                resetRunState();
                ui.score.innerText = '0';
                ui.topBar.style.display = 'flex';
  const _pb = document.getElementById('pauseBtn');
  if (_pb) _pb.style.display = 'flex';
                ui.gameUI.style.display = 'block';
                ui.bigMultiplier.style.display = 'block';
                ui.text.style.display = 'none';
                if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
                if (ui.bossUI) ui.bossUI.style.display = 'none';
                markScoreCoinDirty(true);
                loadLevel(currentLevelIdx);
                isPlaying = true;
                OrbitGame.core.loop.startMainLoop();
              }
            };
            _replayBtns.appendChild(_btn);
          });
          _replayRow.style.display = _worldStages.length > 0 ? 'block' : 'none';
        }

        // Wire up the button
        localStorage.removeItem('orbitSync_checkpointIdx');
        ui.btn.onclick = function () {
          ui.overlay.style.display = 'none';
          ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)'; // Reset bg
          if (isCampaignClear || nextLevelIdx === null) {
            returnToMenu();
            return;
          }
          ui.topBar.style.display = 'flex';
  const _pb = document.getElementById('pauseBtn');
  if (_pb) _pb.style.display = 'flex';
          ui.gameUI.style.display = 'block';
          if (ui.arenaInfo) ui.arenaInfo.style.display = 'block';
          ui.bigMultiplier.style.display = 'none';
          currentLevelIdx = nextLevelIdx;
          loadLevel(currentLevelIdx);
          isPlaying = true;
        };
      } else {
        // Tick sound for each increment
        if (audioCtx) playPop(4, false);
        ui.runCoins.innerText = `+${currentDisplayCoins}`;
        if (clearCoinsDisplay) clearCoinsDisplay.innerText = `+${currentDisplayCoins}`;
      }
    }, 40); // Fast 40ms updates
  }, 1000);
}



OrbitGame.core = OrbitGame.core || {};
OrbitGame.core.loop = OrbitGame.core.loop || {};
OrbitGame.core.loop.update = update;
OrbitGame.core.loop.draw = draw;
OrbitGame.core.loop.startMainLoop = startMainLoop;
OrbitGame.core.loop.stopMainLoop = stopMainLoop;
