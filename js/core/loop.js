const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.getElementById('scoreDisplay'), stage: document.getElementById('stageDisplay'),
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
  bossPhase1: document.getElementById('bossPhase1'), bossPhase2: document.getElementById('bossPhase2')
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
function vibrate(pattern) { return OrbitGame.audio.vibrate(pattern); }

// --- SAVE SYSTEM ---
let globalCoins = parseInt(localStorage.getItem('orbitSync_coins')) || 0;
let unlockedSkins = JSON.parse(localStorage.getItem('orbitSync_unlocks')) || ['classic'];
let activeSkin = localStorage.getItem('orbitSync_equipped') || 'classic';
let maxWorldUnlocked = parseInt(localStorage.getItem('orbitSync_maxWorld')) || 1;
let menuSelectedWorld = maxWorldUnlocked;
let personalBest = {
  score: parseInt(localStorage.getItem('orbitSync_pbScore')) || 0,
  streak: parseInt(localStorage.getItem('orbitSync_pbStreak')) || 0,
  world: parseInt(localStorage.getItem('orbitSync_pbWorld')) || 1
};

function saveData() {
  localStorage.setItem('orbitSync_coins', Math.floor(globalCoins));
  localStorage.setItem('orbitSync_unlocks', JSON.stringify(unlockedSkins));
  localStorage.setItem('orbitSync_equipped', activeSkin);
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
  return Math.floor(runCents / 10);
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
const NEAR_MISS_THRESHOLD = 0.12; // radians (~6.9deg)
const NEAR_MISS_COOLDOWN_MS = 700;
let lastNearMissAt = -Infinity;
let bossIntroPlaying = false;
let isCinematicIntro = false;
let lives = 3; let multiplier = 1; let streak = 0; let distanceTraveled = 0; let totalStageDistance = 0;
let perfectLifeStreak = 0;
let runBestStreak = 0;
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
let nearMissReplayUntil = 0;
let nearMissReplayActive = false;
let activeSplitFamilyId = null;
let nextSplitFamilyId = 1;
let mainLoopRafId = null;
let isMainLoopRunning = false;

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
  currentWorld: { get: () => parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : menuSelectedWorld || 1), 10) },
  currentStage: { get: () => (levelData && levelData.id) ? levelData.id : null },
  waveCounter: { get: () => stageHits, set: (v) => { stageHits = v; } },
  bossFight: { get: () => ({ isBossPhaseTwo, bossPhase, bossIntroPlaying, bossTransitionLock }) },
  revive: { get: () => ({ currentReviveCost, reviveCount, usedLastChance }) },
  world2: { get: () => ({ nearMissReplayUntil, nearMissReplayActive }) }
});


function getWorldPalette() {
  return currentWorldPalette;
}

function getWorldShape() {
  return currentWorldShape;
}

function computeWorldPalette(level) {
  const worldNum = parseInt(level ? level.id.split('-')[0] : '1', 10);
  if (level && level.boss) return { primary: '#ffffff', secondary: '#ff3366', bg: '#1a0000' };
  switch (worldNum) {
    case 1: return { primary: '#00e5ff', secondary: '#00ff88', bg: '#050508' };
    case 2: return { primary: '#2ff6ff', secondary: '#ff4fd8', bg: '#07070a' };
    case 3: return { primary: '#ffaa00', secondary: '#ff6600', bg: '#080500' };
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
      railGlowScale: 0.76
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
window.addEventListener('resize', updateCanvasSize);

function getPointOnShape(t, shape, cx, cy, radius) { return OrbitGame.systems.rendering.getPointOnShape(t, shape, cx, cy, radius); }

function buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps = 40) {
  return OrbitGame.systems.rendering.buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps);
}

// Generate subtle background dust for depth
for (let i = 0; i < 50; i++) {
  bgDust.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.2 + 0.05,
    opacity: Math.random() * 0.4 + 0.1,
    driftPhase: Math.random() * Math.PI * 2,
    driftAmp: Math.random() * 0.25 + 0.08
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

function drawOrbSkin(ctx, x, y, skin, radius = 8.5, pulse = 0, colorOverride = null) {
  const orbColor = colorOverride || multiColors[Math.min(multiplier - 1, 7)];
  if (skin === 'skull') {
    ctx.font = `${Math.round(radius * 3.75)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', x, y);
    return;
  }
  if (skin === 'fire') {
    ctx.font = `${Math.round(radius * 3.75)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', x, y);
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
  if (skin === 'skull' || skin === 'fire') {
    ctx.font = `${Math.round(radius * 2.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skin === 'skull' ? '💀' : '🔥', x, y + 0.5);
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
  const newRecordBanner = document.getElementById('newRecordBanner');
  if (reviveBtn) reviveBtn.style.display = 'none';
  if (coinReviveBtn) coinReviveBtn.style.display = 'none';
  if (runCoinsBox) runCoinsBox.style.display = 'none';
  if (menuBtn) menuBtn.style.display = 'none';
  if (clearSummary) clearSummary.style.display = 'none';
  if (shareBtn) shareBtn.style.display = 'none';
  if (pbStatsBlock) pbStatsBlock.style.display = 'none';
  if (newRecordBanner) newRecordBanner.style.display = 'none';
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
}
function resetRunState() {
  clearRunTransientTimers();
  score = 0; stageHits = 0; lives = maxLives; multiplier = 1; streak = 0;
  distanceTraveled = 0; runCents = 0;
  angle = 0; direction = 1;
  perfectLifeStreak = 0; runBestStreak = 0;
  currentReviveCost = 50; reviveCount = 0; usedLastChance = false;
  scoreAtCheckpoint = 0; scoreAtLevelStart = 0;
  isBossPhaseTwo = false; bossPhase = 1;
  bossPauseUntil = 0; bossTransitionLock = false; stageClearHoldUntil = 0;
  isCinematicIntro = false; bossIntroPlaying = false;
  lastNearMissAt = -Infinity; nearMissReplayUntil = 0; nearMissReplayActive = false;
  particles = []; popups = []; shockwaves = []; targetHitRipples = []; trail = [];
  resetSplitFamilyState();
}
function loseLife(reason) {
  lives--;
  ui.lives.innerText = lives;
  perfectLifeStreak = 0;
}
function gainLifeFromPerfectStreak() {
  if (lives < maxLives) {
    lives++;
    ui.lives.innerText = lives;
    perfectLifeStreak = 0;
    showTempText('+1 LIFE!', '#7dfffb', 1100);
    soundLifeGained();
    vibrate([18, 24, 18]);
    createShockwave('#7dfffb', 30);
  }
}
function createParticles(x, y, color, count = 20) { return OrbitGame.entities.particles.createParticles(x, y, color, count); }
function createUpwardBurstParticles(x, y, color, count = 36) { return OrbitGame.entities.particles.createUpwardBurstParticles(x, y, color, count); }
function createPopup(x, y, text, color, hitQuality = null) { return OrbitGame.entities.effects.createPopup(x, y, text, color, hitQuality); }
function showComboPopup(multiplierLevel) { return OrbitGame.entities.effects.showComboPopup(multiplierLevel); }
function showNearMissReplay(reason, nearestEdgeDistance) { return OrbitGame.entities.effects.showNearMissReplay(reason, nearestEdgeDistance); }
function createShockwave(color, speed = 40) { return OrbitGame.entities.effects.createShockwave(color, speed); }
function createTargetHitRipple(x, y, color = '#ffffff') { return OrbitGame.entities.effects.createTargetHitRipple(x, y, color); }
function triggerTargetHitFeedback(target, x, y) { return OrbitGame.entities.effects.triggerTargetHitFeedback(target, x, y); }
function triggerScreenShake(intensity = 5) { return OrbitGame.entities.effects.triggerScreenShake(intensity); }
function pulseBrightness(amount = 1.6, duration = 120) { return OrbitGame.entities.effects.pulseBrightness(amount, duration); }
function scheduleBossSpawn(delay = 700) { return OrbitGame.entities.boss.scheduleBossSpawn(delay); }
function pauseGameplayBriefly(duration = 750) { return OrbitGame.entities.boss.pauseGameplayBriefly(duration); }

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

function normalizeAngle(a) { return OrbitGame.systems.collision.normalizeAngle(a); }

function signedAngularDistance(from, to) { return OrbitGame.systems.collision.signedAngularDistance(from, to); }

function getTargetApproachIntensity(target, playerAngle, playerDirection) {
  return OrbitGame.systems.collision.getTargetApproachIntensity(target, playerAngle, playerDirection);
}

function generateTitle(score, world, streak, revives) {
  if (revives === 0 && world >= 3 && score > 200) return "SYNC GOD";
  if (revives === 0 && streak >= 20) return "GHOST RUN";
  if (revives === 0 && world >= 2) return "CLEAN SWEEP";
  if (world >= 3 && score > 200) return "WORLD BREAKER";
  if (streak >= 20) return "CHAIN MASTER";
  if (streak >= 10) return "COMBO KING";
  if (score >= 150) return "ORBIT ELITE";
  if (score >= 75) return "SYNC RUNNER";
  if (world >= 2) return "WORLD JUMPER";
  if (revives >= 3) return "NEVER GIVE UP";
  return "SYNC ROOKIE";
}

function generateShareCard() { return OrbitGame.ui.share.generateShareCard(); }
function downloadCard(card) { return OrbitGame.ui.share.downloadCard(card); }

function updateMultiplierUI() { return OrbitGame.systems.scoring.updateMultiplierUI(); }

function getCheckpointIndex() { return OrbitGame.systems.progression.getCheckpointIndex(); }

function updateWaveUI() { return OrbitGame.systems.progression.updateWaveUI(); }

function triggerBossIntro() { return OrbitGame.entities.boss.triggerBossIntro(); }

function playBossCinematic() { return OrbitGame.entities.boss.playBossCinematic(); }

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
  resetSplitFamilyState();

  ui.stage.innerText = `Stage ${levelData.id}`; ui.text.innerText = levelData.text;
  ui.lives.innerText = lives; ui.streak.innerText = streak;
  updateMultiplierUI();
  updateWaveUI();

  if (levelData.boss) {
    isCinematicIntro = true;
    if (levelData.id === '1-6' || levelData.boss === 'aegis') {
      triggerBossIntro();
    } else {
      if (ui.gameUI) ui.gameUI.style.display = 'block';
      playBossCinematic();
    }
  } else {
    stopBossDrone();
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
    move: options.move ?? (levelData.moveSpeed || 0),
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
  spawnControlledSplitRoot();
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
  ctx.strokeStyle = theme.railColor || palette.primary;
  ctx.globalAlpha = 0.9 * railGlowScale;
  setShadowBlur((worldNum === 2 && !isBoss) ? (12 * railGlowScale) : (15 * railGlowScale));
  ctx.shadowColor = theme.railColor || palette.primary;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  if (worldShape === 'diamond' && !isBoss) {
    ctx.save();

    // Outer soft aura — wide, very faint, gives the shape presence
    buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
      orbitRadius, 0, Math.PI * 2, 8);
    ctx.strokeStyle = theme.railColor || palette.primary;
    ctx.lineWidth = 12;
    ctx.globalAlpha = (0.045 + Math.abs(Math.sin(now / 1800)) * 0.02) * railGlowScale;
    ctx.shadowBlur = 20 * railGlowScale;
    ctx.shadowColor = theme.railColor || palette.primary;
    ctx.stroke();

    // Mid glow — tighter, slightly brighter
    buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
      orbitRadius, 0, Math.PI * 2, 8);
    ctx.strokeStyle = theme.railColor || palette.primary;
    ctx.lineWidth = 4;
    ctx.globalAlpha = (0.11 + Math.abs(Math.sin(now / 1600)) * 0.02) * railGlowScale;
    ctx.shadowBlur = 11 * railGlowScale;
    ctx.shadowColor = theme.railColor || palette.primary;
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
      ctx.shadowColor = theme.railColor || palette.primary;
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
    const bodyWidth = baseBodyWidth;
    const shieldBodyWidth = bodyWidth + 1.4;
    const glowWidth = worldShape === 'diamond' ? bodyWidth + 1.5 : bodyWidth + 4;
    const housingWidth = worldShape === 'diamond' ? glowWidth + 2 : glowWidth + 4;
    const isLiteTargetRender = !useHeavyEffects && !isBossShield;
    // Stronger target contrast on diamond (especially during streaks)
    let targetAlpha = isBossShield ? (0.27 + approach * 0.27 + hitFlash * 0.2) : (0.45 + approach * 0.25 + hitFlash * 0.3);
    let targetCoreAlpha = isBossShield ? 0.94 : 0.92;
    const isWorld2PrimaryTarget = worldNum === 2 && !isBoss && !t.isPhantom && !t.isCornerBonus && !t.isLifeZone && !isBossShield;
    const targetGlowColor = isWorld2PrimaryTarget ? theme.targetGlowColor : t.color;
    const targetCoreColor = isWorld2PrimaryTarget ? theme.targetCoreColor : (isBossShield ? t.color : '#ffffff');
    if (isWorld2PrimaryTarget) {
      targetAlpha += 0.08;
      targetCoreAlpha = Math.min(1, targetCoreAlpha + 0.05);
    }

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

    if (t.mechanic === 'corner') {
      ctx.save();
      const markerPt = getPointOnShape(t.cornerAnchor, worldShape, centerObj.x, centerObj.y, dynamicRadius);
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#78f8ff';
      ctx.globalAlpha = 0.92;
      ctx.lineWidth = 3.4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#78f8ff';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(markerPt.x, markerPt.y, 3.2 + (approach * 1.2), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#9afcff';
      ctx.fill();
      ctx.restore();
      return;
    }

    if (t.isDual && t.dualState !== 'cleared') {
      ctx.save();
      const halfSize = t.targetHalfWidth || (t.size / 2);
      const leftStart = t.start;
      const leftEnd = t.start + halfSize;
      const rightStart = t.start + halfSize;
      const rightEnd = t.start + t.size;
      const isDiamondWorld = worldShape === 'diamond' && worldNum === 2 && !isBoss;
      const leftColor = t.leftColor || '#2ff6ff';
      const rightColor = t.rightColor || '#ff4fd8';
      const coreColor = t.coreColor || '#ffffff';
      const shellColor = t.shellColor || '#ffd54a';
      const shellWidth = isDiamondWorld ? 9.2 : 12.5;
      const bodyWidth = isDiamondWorld ? 4.4 : 5.2;
      const coreWidth = isDiamondWorld ? 2.4 : 2.1;
      const shellAlpha = isDiamondWorld ? 0.11 : 0.2;
      const bodyAlpha = isDiamondWorld ? 0.86 : 0.74;
      const halfPad = isDiamondWorld ? 0.0018 : 0;

      // LEFT HALF (cyan)
      if (t.dualState === 'full' || t.dualState === 'left') {
        // Gold support shell to help separation from the rail.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
        ctx.strokeStyle = shellColor;
        ctx.globalAlpha = shellAlpha;
        ctx.lineWidth = shellWidth;
        ctx.lineCap = 'butt';
        setShadowBlur(isDiamondWorld ? 10 : 22);
        ctx.shadowColor = shellColor;
        ctx.stroke();

        // Main illuminated body.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
        ctx.strokeStyle = leftColor;
        ctx.globalAlpha = bodyAlpha;
        ctx.lineWidth = bodyWidth;
        setShadowBlur(isDiamondWorld ? 6 : 12);
        ctx.shadowColor = leftColor;
        ctx.stroke();

        // Crisp white core.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, leftStart + halfPad, leftEnd - halfPad);
        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = 0.98;
        ctx.lineWidth = coreWidth;
        setShadowBlur(isDiamondWorld ? 5 : 8);
        ctx.shadowColor = leftColor;
        ctx.stroke();
      }

      // RIGHT HALF (magenta)
      if (t.dualState === 'full' || t.dualState === 'right') {
        // Gold support shell to help separation from the rail.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
        ctx.strokeStyle = shellColor;
        ctx.globalAlpha = shellAlpha;
        ctx.lineWidth = shellWidth;
        ctx.lineCap = 'butt';
        setShadowBlur(isDiamondWorld ? 10 : 22);
        ctx.shadowColor = shellColor;
        ctx.stroke();

        // Main illuminated body.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
        ctx.strokeStyle = rightColor;
        ctx.globalAlpha = bodyAlpha;
        ctx.lineWidth = bodyWidth;
        setShadowBlur(isDiamondWorld ? 6 : 12);
        ctx.shadowColor = rightColor;
        ctx.stroke();

        // Crisp white core.
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y,
          dynamicRadius, rightStart + halfPad, rightEnd - halfPad);
        ctx.strokeStyle = coreColor;
        ctx.globalAlpha = 0.98;
        ctx.lineWidth = coreWidth;
        setShadowBlur(isDiamondWorld ? 5 : 8);
        ctx.shadowColor = rightColor;
        ctx.stroke();
      }

      // PERFECT CENTRE DIVIDER — stronger center lock indicator.
      if (t.dualState === 'full') {
        const splitAngle = t.start + halfSize;
        const splitPt = getPointOnShape(splitAngle, worldShape,
          centerObj.x, centerObj.y, dynamicRadius);
        const ringRadius = isDiamondWorld ? 8.2 : 7;
        const dotRadius = isDiamondWorld ? 4.7 : 4;
        const tickLen = isDiamondWorld ? 7.4 : 5.8;
        const radialX = splitPt.x - centerObj.x;
        const radialY = splitPt.y - centerObj.y;
        const radialLen = Math.hypot(radialX, radialY) || 1;
        const tx = -radialY / radialLen;
        const ty = radialX / radialLen;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(splitPt.x, splitPt.y, ringRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = isDiamondWorld ? 0.2 : 0.15;
        ctx.shadowBlur = isDiamondWorld ? 16 : 20;
        ctx.shadowColor = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(splitPt.x - tx * tickLen, splitPt.y - ty * tickLen);
        ctx.lineTo(splitPt.x + tx * tickLen, splitPt.y + ty * tickLen);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = isDiamondWorld ? 2.4 : 2;
        ctx.shadowBlur = isDiamondWorld ? 10 : 8;
        ctx.shadowColor = '#ffffff';
        ctx.stroke();

        // Solid dot
        ctx.beginPath();
        ctx.arc(splitPt.x, splitPt.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = isDiamondWorld ? 12 : 14;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }

    if (t.mechanic === 'split' || t.mechanic === 'splitChild') {
      ctx.save();

      const depth = Number.isFinite(t.splitGeneration) ? t.splitGeneration : (t.splitDepth || 0);
      const isRootSplit = depth === 0;
      const isSmallSplit = depth >= 2;
      const isMediumSplit = depth === 1;
      const splitHeavy = useHeavyEffects && !isSmallSplit;

      const palette = depth === 0
        ? { glow: '#2ff6ff', body: '#5deeff', core: '#ffffff', accent: '#ff4fd8' }
        : depth === 1
          ? { glow: '#ff4fd8', body: '#ff9b54', core: '#ffffff', accent: '#ffc08a' }
          : { glow: '#ffd54a', body: '#ffe68b', core: '#ffffff', accent: '#7cf7ff' };

      const pulse = 1 + Math.sin(splitPulseTime + (t.start * 6.5)) * (isSmallSplit ? 0.03 : 0.045);
      const launchMix = typeof t.splitLaunchT === 'number' ? (1 - Math.min(1, t.splitLaunchT)) : 0;
      const generationScale = Math.pow(0.8, depth);
      const outerWidth = (depth === 0 ? 14.2 : depth === 1 ? 10.8 : 7.4) * generationScale * pulse;
      const midWidth = (depth === 0 ? 6.6 : depth === 1 ? 5.5 : 4.2) * generationScale * pulse;
      const coreWidth = (depth === 0 ? 2.9 : depth === 1 ? 2.5 : 2.1) * generationScale * pulse;
      const capRadius = Math.max(2.1, (depth === 0 ? 4.9 : depth === 1 ? 3.8 : 2.7) * generationScale);

      if (!isSmallSplit) {
        // Big readable outer glow
        buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
        ctx.strokeStyle = palette.glow;
        ctx.globalAlpha = (depth === 0 ? 0.16 : 0.12) + (launchMix * 0.08);
        ctx.lineWidth = outerWidth;
        ctx.lineCap = 'butt';
        ctx.shadowBlur = splitHeavy ? (depth === 0 ? 18 : 12) : 6;
        ctx.shadowColor = palette.glow;
        ctx.stroke();
      }

      // Main body
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = palette.body;
      ctx.globalAlpha = isSmallSplit ? 0.9 : 0.92;
      ctx.lineWidth = midWidth;
      ctx.shadowBlur = splitHeavy ? (depth === 0 ? 11 : 8) : (isSmallSplit ? 2 : 5);
      ctx.shadowColor = palette.glow;
      ctx.stroke();

      // Bright core
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = palette.core;
      ctx.globalAlpha = isSmallSplit ? 0.9 : 0.96;
      ctx.lineWidth = coreWidth;
      ctx.shadowBlur = splitHeavy ? (depth === 0 ? 9 : 6) : (isSmallSplit ? 0 : 3);
      ctx.shadowColor = palette.core;
      ctx.stroke();

      // End caps so the arc reads properly at speed
      if (!isSmallSplit) {
        const startPt = getPointOnShape(t.start, worldShape, centerObj.x, centerObj.y, dynamicRadius);
        const endPt = getPointOnShape(t.start + t.size, worldShape, centerObj.x, centerObj.y, dynamicRadius);

        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, capRadius, 0, Math.PI * 2);
        ctx.arc(endPt.x, endPt.y, capRadius, 0, Math.PI * 2);
        ctx.fillStyle = palette.accent;
        ctx.globalAlpha = isMediumSplit ? 0.66 : 0.75;
        ctx.shadowBlur = splitHeavy ? (isMediumSplit ? 8 : 12) : 3;
        ctx.shadowColor = palette.glow;
        ctx.fill();
      }

      // Visible crack / split marker in the middle
      const crackAngle = t.start + (t.size / 2);
      const crackPt = getPointOnShape(crackAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);

      if (!isSmallSplit) {
        ctx.beginPath();
        ctx.arc(crackPt.x, crackPt.y, depth === 0 ? 7 : 5.1, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = isRootSplit ? 0.16 : 0.11;
        ctx.shadowBlur = splitHeavy ? 14 : 4;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
      }

      ctx.beginPath();
      const crackSize = depth === 0 ? 6 : depth === 1 ? 4.8 : 3.8;
      ctx.moveTo(crackPt.x - crackSize, crackPt.y - crackSize);
      ctx.lineTo(crackPt.x + crackSize, crackPt.y + crackSize);
      ctx.moveTo(crackPt.x - crackSize, crackPt.y + crackSize);
      ctx.lineTo(crackPt.x + crackSize, crackPt.y - crackSize);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      ctx.lineWidth = depth === 0 ? 2 : depth === 1 ? 1.5 : 1.2;
      ctx.shadowBlur = isSmallSplit ? 0 : (splitHeavy ? 7 : 2);
      ctx.shadowColor = '#ffffff';
      ctx.stroke();

      ctx.restore();
      return;
    }

    ctx.save();

    if (!isLiteTargetRender) {
      // --- ACTIVE TARGET HOUSING (subtle dark cradle behind gate) ---
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = isBossShield ? 'rgba(2, 6, 12, 0.96)' : 'rgba(5, 10, 18, 0.9)';
      ctx.globalAlpha = isBossShield ? (0.9 + (approach * 0.06)) : (0.74 + (approach * 0.08));
      ctx.lineWidth = isBossShield
        ? (housingWidth + 2.6)
        : (worldShape === 'diamond' ? housingWidth - 2 : housingWidth);
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
      : (glowWidth + (approach * 1.5 * glowMult) + (hitFlash * 1.2 * glowMult));
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
        : (bodyWidth + (approach * 0.8) + (hitFlash * 0.9));
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
      ctx.lineWidth = bodyWidth + 1 + (approach * 0.8) + (hitFlash * 0.9);
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

    // --- MIDPOINT MARKER (ideal precision hit cue) ---
    if (shouldDrawTargetMarkers) {
      const markerSpan = Math.min(t.size * 0.25, 0.055);
      ctx.beginPath();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, tCenter - markerSpan, tCenter + markerSpan);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.min(1, 0.82 + (approach * 0.15) + (hitFlash * 0.2));
      ctx.lineWidth = bodyWidth + 1 + (approach * 0.5);
      ctx.lineCap = 'round';
      setShadowBlur(14);
      ctx.shadowColor = targetGlowColor;
      ctx.stroke();
    }

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
    ctx.restore();
  });

  // TRAIL
  if (!inMenu && trail.length > 0) {
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      const life = i / trail.length;
      const radius = Math.max(1.8, 9.5 * life);
      const opacity = life * 0.42;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = orbColor;
      ctx.globalAlpha = opacity;
      setShadowBlur(10 * life);
      ctx.shadowColor = orbColor;
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

  // PLAYER ORB
  const orbPt = getPointOnShape(angle, worldShape, centerObj.x, centerObj.y, orbitRadius);
  const x = orbPt.x;
  const y = orbPt.y;

  const orbPulse = Math.abs(Math.sin(Date.now() / 200)) * 2.5;
  drawOrbSkin(ctx, x, y, activeSkin, 8.5, orbPulse, orbColor);
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // Hit polish pulse (visual only)
  if (ringHitFlash > 0.01) {
    buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hitFlashColor;
    ctx.globalAlpha = Math.min(0.4, ringHitFlash);
    ctx.lineWidth = 7 + (ringHitFlash * 6);
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
  const nearMissSpeedScale = frameNow < nearMissReplayUntil ? 0.3 : 1;
  const worldShape = currentWorldShape;
  const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);

  let moveStep = (inMenu ? 0.02 : levelData.speed) * direction;
  if (levelData.boss && isBossPhaseTwo && !inMenu) moveStep *= 1.3;
  if (isBossTransitionPaused || isStageClearHoldPaused) moveStep = 0;
  else moveStep *= nearMissSpeedScale;

  moveStep *= delta;

  angle += moveStep;
  if (!inMenu) { distanceTraveled += Math.abs(moveStep); totalStageDistance += Math.abs(moveStep); }

  const tPt = getPointOnShape(angle, worldShape, centerObj.x, centerObj.y, orbitRadius);
  trail.push({ x: tPt.x, y: tPt.y });
  const maxTrailMultiplier = isMobile ? 3 : 4;
  if (trail.length > multiplier * maxTrailMultiplier) trail.shift();

  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;

  if (!inMenu && levelData.boss && !isBossPhaseTwo && Math.random() < 0.02) { triggerScreenShake(3); }

  let deferredFailReason = null;
  targets.forEach(t => {
    if (!t.active) return;

    if (t.hitFlash) t.hitFlash *= Math.pow(0.76, delta);
    if (t.hitFlash && t.hitFlash < 0.02) t.hitFlash = 0;
    if (t.hitScalePulse) t.hitScalePulse *= Math.pow(0.42, delta);
    if (t.hitScalePulse && t.hitScalePulse < 0.02) t.hitScalePulse = 0;

    if (t.isHeart && totalStageDistance > t.expireDistance) {
      t.active = false; const expPt = getPointOnShape(t.start, worldShape, centerObj.x, centerObj.y, orbitRadius);
      createParticles(expPt.x, expPt.y, '#555', 10);
      return;
    }
    let currentMoveSpeed = t.moveSpeed !== undefined ? t.moveSpeed : (inMenu ? 0.01 : levelData.moveSpeed);
    if (!inMenu && t.isBossShield && bossPhase === 2 && frameNow >= (t.nextDirectionSwapAt || 0)) {
      if (Math.random() < 0.42) t.moveSpeed *= -1;
      t.nextDirectionSwapAt = frameNow + 1200 + Math.random() * 1000;
    }
    if (isBossTransitionPaused || isStageClearHoldPaused) currentMoveSpeed = 0;

    if (currentMoveSpeed !== 0) {
      t.start += currentMoveSpeed * delta;
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

    if (t.baseSize) {
      t.size = t.baseSize * sizeScale;
    }

    if (!inMenu && t.mechanic === 'dual' && t.active
        && t.dualState !== 'full' && t.dualState !== 'cleared') {
      // Player partially cleared a dual — track if remaining
      // half has been passed through without being hit
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const insideNow = isInsideTarget(normAngle, t);
      if (!t._dualPassStarted && insideNow) {
        t._dualPassStarted = true;
      }
      if (t._dualPassStarted && !insideNow && t.dualState !== 'cleared') {
        // Orb passed through remaining half without hitting —
        // reset to full, player gets another chance but loses streak
        t._dualPassStarted = false;
        if (multiplier > 1) {
          multiplier = 1;
          streak = 0;
          ui.streak.innerText = streak;
          updateMultiplierUI();
          showTempText('DROPPED!', '#ff9900', 900);
        }
      }
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
          t.moveSpeed = levelData.moveSpeed || 0;
        }
      }

      const traveled = totalStageDistance - t.spawnDistance;
      if (traveled > Math.PI * 6) {
        // Child has circled 3 times without being hit — despawn silently
        t.active = false;
      }
    }
  });

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

  updateMusicState(multiplier, (levelData && levelData.boss));
  draw(); queueNextMainLoopFrame();
}


function glitchCanvas(duration, callback) {
  const startTime = Date.now();
  const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  function glitchFrame() {
    if (Date.now() - startTime > duration) {
      callback();
      return;
    }
    ctx.putImageData(originalImageData, 0, 0);
    const slices = 6;
    for (let s = 0; s < slices; s++) {
      const sliceY = Math.random() * canvas.height;
      const sliceH = Math.random() * 30 + 5;
      const shift = (Math.random() - 0.5) * 30;
      const slice = ctx.getImageData(0, sliceY, canvas.width, sliceH);
      ctx.putImageData(slice, shift, sliceY);
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
  document.getElementById('newRecordBanner').style.display =
    anyNew ? 'block' : 'none';
}

function handleFail(reason) {
  const streakBeforeFail = streak;
  loseLife(reason);
  distanceTraveled = 0; multiplier = 1; updateMultiplierUI();
  streak = 0; ui.streak.innerText = streak;
  triggerScreenShake(10);
  if (lives > 0) {
    soundLifeLost();
    vibrate([30, 20, 30]);
  } else {
    soundFail();
    vibrate([50, 30, 50, 30, 80]);
  }
  canvas.style.boxShadow = `inset 0 0 50px #ff3366`; setTimeout(() => canvas.style.boxShadow = 'none', 150);

  if (lives <= 0) {
    const newRecords = checkAndSavePB(score, streakBeforeFail);
    isPlaying = false; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
    const pendingCoins = getPendingRunCoins();
    updatePBDisplay(newRecords);
    glitchCanvas(400, () => {
      ui.overlay.style.display = 'flex';
      ui.title.style.color = '#ff3366';
      ui.title.innerText = "OUT OF SYNC";
      ui.subtitle.innerText = pendingCoins > 0
        ? `Bank ${pendingCoins} coins or take one more try`
        : 'Take one more try or restart the world';
      scrambleText(ui.title, reason || "OUT OF SYNC", 600);
    });
    ui.btn.innerText = pendingCoins > 0 ? "BANK COINS & RESTART WORLD" : `RESTART WORLD ${levelData.id.split('-')[0]}`;
    ui.btn.onclick = function () {
      bankRunCoins();
      restartFromCheckpoint();
    };
    ui.runCoins.innerText = pendingCoins > 0 ? `+${pendingCoins} READY TO BANK` : '0 COINS';
    setOverlayState('gameOver');
    let reviveBtn = document.getElementById('reviveBtn');
    let coinReviveBtn = document.getElementById('coinReviveBtn');
    reviveBtn.style.display = 'block';
    if (coinReviveBtn) coinReviveBtn.style.display = 'none';

    if (!usedLastChance) {
      reviveBtn.innerText = "ONE MORE TRY";
      reviveBtn.onclick = function () {
        usedLastChance = true;
        restartCurrentStageAfterRevive();
      };
    } else {
      reviveBtn.style.display = 'none';
    }

    if (coinReviveBtn && globalCoins >= 50) {
      coinReviveBtn.style.display = 'block';
      coinReviveBtn.innerText = 'REVIVE (🪙 50)';
      coinReviveBtn.onclick = function () {
        if (audioCtx) soundUIClick();
        attemptCoinRevive();
      };
    }
  }
}

function restartCurrentStageAfterRevive() {
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
  isPlaying = true;
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'flex';
  ui.gameUI.style.display = 'block';
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

  for (let i = 0; i < targets.length; i++) {
    if (!targets[i].active) continue;
    let endAngle = targets[i].start + targets[i].size; let tCenter = targets[i].start + (targets[i].size / 2);
    const t = targets[i];
    const centerAngle = (typeof t.angle === 'number') ? t.angle : normalizeAngle(tCenter);
    const targetHalfWidth = t.targetHalfWidth || (t.size / 2);
    const diffFromCenter = signedAngularDistance(angle, centerAngle);
    let isHit = (endAngle > Math.PI * 2) ? (angle >= targets[i].start || angle <= (endAngle - Math.PI * 2)) : (angle >= targets[i].start && angle <= endAngle);
    if (t.isDual && t.dualState !== 'cleared') {
      const splitAngle = normalizeAngle(t.start + (t.targetHalfWidth || t.size / 2));
      const fullEnd = normalizeAngle(t.start + t.size);
      const normPlayer = normalizeAngle(angle);
      const normStart = normalizeAngle(t.start);

      // Arc-based check — no signed distance confusion
      function inArc(a, start, end) {
        const s = normalizeAngle(start);
        const e = normalizeAngle(end);
        return e >= s
          ? (a >= s && a <= e)
          : (a >= s || a <= e);
      }

      if (t.dualState === 'left') {
        isHit = inArc(normPlayer, normStart, splitAngle);
      } else if (t.dualState === 'right') {
        isHit = inArc(normPlayer, splitAngle, fullEnd);
      } else {
        isHit = inArc(normPlayer, normStart, fullEnd);
      }
    }

    if (isHit) {
      hitIndex = i;
      let dist = Math.abs(signedAngularDistance(angle, tCenter));
      if (t.mechanic === 'corner') {
        const localAngle = normalizeAngle(angle - t.start);

        const visiblePerfectWindow = t.cornerPerfectWindow || 0.015;
        const visibleBackWindow = t.cornerBackWindow || 0.135;
        const visibleOvershootWindow = t.cornerOvershootWindow || 0.135;

        // hidden forgiveness margins so the target feels fair
        const hitboxExpand = t.cornerHitboxExpand || 0.028;

        const backWindow = visibleBackWindow + hitboxExpand;
        const overshootWindow = visibleOvershootWindow + hitboxExpand;

        const perfectStart = visibleBackWindow - visiblePerfectWindow;
        const perfectEnd = visibleBackWindow + visiblePerfectWindow;

        if (localAngle >= 0 && localAngle <= (backWindow + overshootWindow)) {
          if (localAngle >= (perfectStart - hitboxExpand * 0.25) && localAngle <= (perfectEnd + hitboxExpand * 0.25)) {
            hitQuality = "perfect";
          } else if (Math.abs(localAngle - visibleBackWindow) < (backWindow * 0.72)) {
            hitQuality = "good";
          } else {
            hitQuality = "ok";
          }
        } else {
          continue;
        }
      } else if (t.isDual && t.dualState !== 'cleared') {
        const splitAngle = normalizeAngle(t.start + (t.targetHalfWidth || t.size / 2));
        const distToSplit = Math.abs(signedAngularDistance(angle, splitAngle));
        const halfSize = t.targetHalfWidth || t.size / 2;
        if (t.dualState === 'full') {
          // Perfect = near the split point, good = within inner half, ok = outer edge
          if (distToSplit <= halfSize * 0.22) hitQuality = "perfect";
          else if (distToSplit <= halfSize * 0.55) hitQuality = "good";
          else hitQuality = "ok";
        } else {
          // Remaining half — any hit counts, quality based on distance to its center
          const remainCenter = t.dualState === 'left'
            ? normalizeAngle(t.start + halfSize / 2)
            : normalizeAngle(t.start + halfSize + halfSize / 2);
          const distToCenter = Math.abs(signedAngularDistance(angle, remainCenter));
          if (distToCenter <= halfSize * 0.3) hitQuality = "perfect";
          else if (distToCenter <= halfSize * 0.6) hitQuality = "good";
          else hitQuality = "ok";
        }
      } else {
        if (dist < targets[i].size / 6) hitQuality = "perfect";
        else if (dist < targets[i].size / 3) hitQuality = "good";
        else hitQuality = "ok";
      }
      break;
    }
  }

  const hitPt = getPointOnShape(angle, getWorldShape(), centerObj.x, centerObj.y, orbitRadius);
  const hitX = hitPt.x;
  const hitY = hitPt.y;

  if (hitIndex !== -1) {
    let t = targets[hitIndex];
    triggerTargetHitFeedback(t, hitX, hitY);
    if (levelData.reverse !== false) {
      direction *= -1;
      trail = []; // Clear trail on direction flip — prevents corner artifacts
    }
    distanceTraveled = 0;
    hitFlashColor = t.color || '#00ff88';
    ringHitFlash = Math.max(ringHitFlash, 0.26);

    if (levelData.boss && !isBossPhaseTwo && t.isBossShield) {
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
      } return;
    }

    if (t.isDual && t.dualState !== 'cleared') {
      const centerAngle = (typeof t.angle === 'number') ? t.angle : normalizeAngle(t.start + (t.size / 2));
      const targetHalfWidth = t.targetHalfWidth || (t.size / 2);
      const diff = signedAngularDistance(angle, centerAngle);
      const perfectThreshold = targetHalfWidth * 0.5;

      if (Math.abs(diff) <= targetHalfWidth) {
        if (t.isDual && t.dualState === 'full') {
          if (Math.abs(diff) <= perfectThreshold) {
            // PERFECT CENTER HIT
            t.dualState = 'cleared';
            t.active = false;
            createParticles(hitX, hitY, '#ffffff', 24);
            createShockwave('#ffffff', 22);
            if (audioCtx) playPop(1, false, true);
            createPopup(hitX, hitY - 36, "PERFECT LINK", "#ffffff");
          } else {
            // PARTIAL HIT (Hit the edge)
            if (diff < 0) {
              t.dualState = 'right'; // Left side destroyed
              createParticles(hitX, hitY, '#2ff6ff', 16);
            } else {
              t.dualState = 'left'; // Right side destroyed
              createParticles(hitX, hitY, '#ff4fd8', 16);
            }
            if (audioCtx) playPop(4, false);
            triggerScreenShake(3);
            createPopup(hitX, hitY - 30, "HALF CLEARED", "#ffffff");
            return; // Do not clear the target! Let it loop around.
          }
        } else if (t.isDual && t.dualState !== 'cleared') {
          // FINISHING OFF THE REMAINING HALF
          const remainingState = t.dualState;
          t.dualState = 'cleared';
          t.active = false;
          const pColor = remainingState === 'left' ? '#2ff6ff' : '#ff4fd8';
          createParticles(hitX, hitY, pColor, 18);
          if (audioCtx) playPop(1, false, true);
          createPopup(hitX, hitY - 22, "LINKED", "#ffffff");
        } else {
          // STANDARD TARGET
          t.dualState = 'cleared';
          t.active = false;
          createParticles(hitX, hitY, '#00ff88', 20);
          if (audioCtx) playPop(1, false, true);
        }
      }
    } else if (t.mechanic === 'split' || t.mechanic === 'splitChild') {
      const splitFamilyId = t.splitFamilyId;
      const splitGeneration = Number.isFinite(t.splitGeneration) ? t.splitGeneration : (t.splitDepth || 0);
      t.active = false;

      const nextDepth = (t.splitDepth || 0) + 1;
      if (t.splitOnHit && splitGeneration < 2 && nextDepth <= 2) {
        const parentCenter = normalizeAngle(t.start + (t.size / 2));
        const childSize = Math.max(Math.PI / 40, t.size * 0.8);

        // Fire the new pieces outward into fresh random positions around the ring.
        const launchBase = nextDepth === 1 ? 0.95 : 1.2;
        const leftOffset = launchBase + (Math.random() * 0.42);
        const rightOffset = launchBase + (Math.random() * 0.42);

        const leftTargetStart = normalizeAngle(parentCenter - leftOffset - (childSize / 2));
        const rightTargetStart = normalizeAngle(parentCenter + rightOffset - (childSize / 2));
        const spawnStart = normalizeAngle(parentCenter - (childSize / 2));

        const leftColor = nextDepth === 1 ? '#ff9b54' : '#ffd54a';
        const rightColor = nextDepth === 1 ? '#ff4fd8' : '#7cf7ff';

        const leftChild = buildTarget(spawnStart, childSize, {
          color: leftColor,
          active: true,
          hp: 1,
          mechanic: 'splitChild',
          splitOnHit: nextDepth < 2,
          splitDepth: nextDepth,
          splitFamilyId,
          splitGeneration: nextDepth
        });
        leftChild.moveSpeed = 0;
        leftChild.splitLaunchT = 0;
        leftChild.splitLaunchFrom = spawnStart;
        leftChild.splitLaunchTarget = leftTargetStart;
        leftChild.splitFamilyId = splitFamilyId;
        leftChild.splitGeneration = nextDepth;
        leftChild.hitScalePulse = 1.1;
        leftChild.hitFlash = 1;

        const rightChild = buildTarget(spawnStart, childSize, {
          color: rightColor,
          active: true,
          hp: 1,
          mechanic: 'splitChild',
          splitOnHit: nextDepth < 2,
          splitDepth: nextDepth,
          splitFamilyId,
          splitGeneration: nextDepth
        });
        rightChild.moveSpeed = 0;
        rightChild.splitLaunchT = 0;
        rightChild.splitLaunchFrom = spawnStart;
        rightChild.splitLaunchTarget = rightTargetStart;
        rightChild.splitFamilyId = splitFamilyId;
        rightChild.splitGeneration = nextDepth;
        rightChild.hitScalePulse = 1.1;
        rightChild.hitFlash = 1;

        targets.push(leftChild, rightChild);

        const splitFx = nextDepth === 1
          ? { pA: 22, pB: 14, swA: 30, swB: 24, pulse: 1.68, pulseDur: 110, shake: 6 }
          : { pA: 12, pB: 8, swA: 20, swB: 16, pulse: 1.32, pulseDur: 72, shake: 3 };
        createParticles(hitX, hitY, nextDepth === 1 ? '#7cf7ff' : '#ffd54a', splitFx.pA);
        createParticles(hitX, hitY, nextDepth === 1 ? '#ff4fd8' : '#ffffff', splitFx.pB);
        createShockwave('#ffffff', splitFx.swA);
        createShockwave(nextDepth === 1 ? '#7cf7ff' : '#ffd54a', splitFx.swB);
        pulseBrightness(splitFx.pulse, splitFx.pulseDur);
        triggerScreenShake(splitFx.shake);

        if (audioCtx) {
          playPop(nextDepth === 1 ? 3 : 4, false, nextDepth === 2);
        }

        createPopup(
          hitX,
          hitY - 32,
          nextDepth === 1 ? "SPLIT BURST!" : "SHATTER BURST!",
          nextDepth === 1 ? '#7cf7ff' : '#ffd54a'
        );
      }
      if (splitGeneration >= 1) {
        pruneInactiveSplitTargets();
      }
      maybeRespawnSplitRootForStage(splitFamilyId);
    } else {
      t.active = false;
    }

    if (t.isPhantom) {
      // Player hit a phantom — punish without the usual hit flow
      const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
      const isDiamondWorld = worldNum === 2;
      t.active = false;
      triggerScreenShake(isDiamondWorld ? 11 : 8);
      canvas.style.filter = 'brightness(2)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 100);
      createShockwave('#ff3366', isDiamondWorld ? 36 : 30);
      createPopup(hitX, hitY - 20, "TRAP!", "#ff3366");
      createParticles(hitX, hitY, '#ff3366', isDiamondWorld ? 28 : 20);
      if (isDiamondWorld) {
        createUpwardBurstParticles(hitX, hitY - 8, '#ff96f0', 22);
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
          bossPhase = 2; isBossPhaseTwo = false; multiplier = 1; streak = 0; ui.streak.innerText = streak; updateMultiplierUI();
          createParticles(centerObj.x, centerObj.y, '#ff3366', 72);
          createShockwave('#ff3366', 44);
          pulseBrightness(1.7, 120);
          createPopup(centerObj.x, centerObj.y - 50, "ENRAGED", "#ff3366");
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
        multiplier = 1; streak = 0; ui.streak.innerText = streak; updateMultiplierUI();
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

    if (hitQuality === "perfect") {
      perfectLifeStreak++;
      if (currentLevelIdx >= 2) {
        perfectFlash = Math.max(perfectFlash, 0.34);
      }
      ringHitFlash = Math.max(ringHitFlash, 0.34);
      multiplier = Math.min(multiplier + 1, 8);
      soundMultiplierUp(multiplier);
      score += (3 * multiplier);
      const normalX = hitX - centerObj.x;
      const normalY = hitY - centerObj.y;
      const normalLen = Math.hypot(normalX, normalY) || 1;
      const outwardX = normalX / normalLen;
      const outwardY = normalY / normalLen;
      const perfectPopup = createPopup(hitX + (outwardX * 24), hitY + (outwardY * 24), "PERFECT!", '#fff36a', 'perfect');
      perfectPopup.animType = 'perfect';
      perfectPopup.life = 1.45;
      perfectPopup.riseSpeed = 0.85;
      perfectPopup.fadeSpeed = 0.024;
      perfectPopup.shadow = 28;
      // Punchier but ultra-short flash to keep input feeling instant.
      canvas.style.filter = 'brightness(2.3)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 70);
      soundPerfect(multiplier);
      vibrate([12, 28, 12]);
      createUpwardBurstParticles(hitX, hitY - 10, '#fff36a', 42);
      if (perfectLifeStreak >= 6) {
        gainLifeFromPerfectStreak();
      }
    }
    else if (hitQuality === "good") {
      perfectLifeStreak = 0;
      ringHitFlash = Math.max(ringHitFlash, 0.26);
      score += (2 * multiplier); createPopup(hitX, hitY - 20, "GOOD", "#fff");
      canvas.style.filter = 'brightness(1.4)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 60);
      soundGood(multiplier);
      vibrate(20);
    }
    else {
      perfectLifeStreak = 0;
      ringHitFlash = Math.max(ringHitFlash, 0.2);
      multiplier = 1; score += 1; createPopup(hitX, hitY - 20, "OK", "#aaa");
      soundOk();
      vibrate(15);
    }

    streak++;
    runBestStreak = Math.max(runBestStreak, streak);
    ui.streak.innerText = streak;

    let centsEarned = (hitQuality === "perfect" ? 3 : hitQuality === "good" ? 2 : 1) * multiplier;
    runCents += centsEarned;
    markScoreCoinDirty();
    updateMultiplierUI();
    createParticles(hitX, hitY, t.color);
    const shouldForceHudFlush = targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active)
      || stageHits >= levelData.hitsNeeded;
    if (shouldForceHudFlush) flushScoreCoinUI();

    if (targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active) || stageHits >= levelData.hitsNeeded) {
      triggerStageClear();
    }
  } else {
    let nearestEdgeDistance = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.active) continue;

      const startEdge = normalizeAngle(t.start);
      const endEdge = normalizeAngle(t.start + t.size);
      const distToStart = Math.abs(signedAngularDistance(angle, startEdge));
      const distToEnd = Math.abs(signedAngularDistance(angle, endEdge));
      const edgeDistance = Math.min(distToStart, distToEnd);
      if (edgeDistance < nearestEdgeDistance) nearestEdgeDistance = edgeDistance;
    }

    const now = Date.now();
    const nearMissAvailable = (now - lastNearMissAt) >= NEAR_MISS_COOLDOWN_MS;
    const isNearMiss = streak > 0 && nearMissAvailable && nearestEdgeDistance <= NEAR_MISS_THRESHOLD;

    if (isNearMiss) {
      lastNearMissAt = now;
      perfectLifeStreak = 0;
      multiplier = 1;
      streak = 0;
      ui.streak.innerText = streak;
      updateMultiplierUI();

      ringHitFlash = Math.max(ringHitFlash, 0.16);
      createShockwave('#ffaa00', 28);
      createPopup(hitX, hitY - 24, nearestEdgeDistance <= (NEAR_MISS_THRESHOLD * 0.5) ? "SO CLOSE" : "CLOSE!", "#ffaa00");
      canvas.style.boxShadow = `inset 0 0 32px #ffaa00`;
      setTimeout(() => canvas.style.boxShadow = 'none', 100);
      if (navigator.vibrate) vibrate(12);
      handleFail("MISSED");
    } else {
      perfectLifeStreak = 0;
      if (lives <= 1 && nearestEdgeDistance <= NEAR_MISS_THRESHOLD) {
        showNearMissReplay("MISSED", nearestEdgeDistance);
      } else {
        handleFail("MISSED");
      }
    }
  }
}

function triggerStageClear() { return OrbitGame.systems.progression.triggerStageClear(); }

function startCampaign() { return OrbitGame.ui.menus.startCampaign(); }

function restartFromCheckpoint() {
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'flex';
  ui.gameUI.style.display = 'block';
  ui.bigMultiplier.style.display = 'none';

  resetRunState();
  ui.score.innerText = 0;
  ui.streak.innerText = 0;
  updateMultiplierUI();
  markScoreCoinDirty(true);
  currentLevelIdx = getCheckpointIndex();
  loadLevel(currentLevelIdx);
  isPlaying = true;
  startMainLoop();
}

function returnToMenu() {
  clearRunTransientTimers();
  stopBossDrone();
  stopDynamicMusic();
  toggleSettings(false);
  setOverlayState('cinematic');
  ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)';
  ui.overlay.style.display = 'none'; ui.mainMenu.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
  ui.text.style.display = 'block';
  inMenu = true; isPlaying = false;
  refreshMenuWorldPreview();
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
  ui.gameUI.style.display = 'none';
  ui.bossUI.style.display = 'none';
  ui.bigMultiplier.style.display = 'none';

  ui.title.innerText = "WORLD CLEARED";
  if (isCampaignClear) ui.title.innerText = "CAMPAIGN CLEARED";
  ui.title.style.color = '#00ff88';
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

        // Wire up the button
        ui.btn.onclick = function () {
          ui.overlay.style.display = 'none';
          ui.overlay.style.background = 'rgba(10, 10, 15, 0.85)'; // Reset bg
          if (isCampaignClear || nextLevelIdx === null) {
            returnToMenu();
            return;
          }
          ui.topBar.style.display = 'flex';
          ui.gameUI.style.display = 'block';
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
