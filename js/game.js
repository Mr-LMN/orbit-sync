const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.getElementById('scoreDisplay'), stage: document.getElementById('stageDisplay'),
  text: document.getElementById('tutorialText'), lives: document.getElementById('livesCount'),
  bigMultiplier: document.getElementById('bigMultiplier'), multiplierCount: document.getElementById('multiplierCount'),
  coins: document.getElementById('coinCount'), overlay: document.getElementById('screenOverlay'),
  title: document.getElementById('screenTitle'), subtitle: document.getElementById('screenSubtitle'),
  btn: document.getElementById('actionBtn'), runCoins: document.getElementById('runCoinsDisplay'),
  topBar: document.getElementById('topBar'), gameUI: document.getElementById('ui'),
  mainMenu: document.getElementById('mainMenu'), shopModal: document.getElementById('shopModal'),
  settingsModal: document.getElementById('settingsModal'),
  shopCoinCount: document.getElementById('shopCoinCount'), streak: document.getElementById('streakCount'),
  wave: document.getElementById('waveDisplay'), bossUI: document.getElementById('bossUI'),
  bossPhase1: document.getElementById('bossPhase1'), bossPhase2: document.getElementById('bossPhase2')
};

// --- SENSORY FEEDBACK (Audio & Haptics) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
// Dynamic Music Engine
let bossAudioBuffer;
let currentBaseTrack = null;
let baseAudioBuffers = {};
let baseSource, bossSource;
let baseGain, bossGain;
let isMusicPlaying = false;
let musicLoadToken = 0;
let musicEnabled = true;
let sfxEnabled = true;
let hapticsEnabled = true;
let bossDrone = null;
let bossDroneGain = null;
let lastSoundTime = 0;
let audioThrottleBypassUntil = 0;

function initAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); }
  if (audioCtx.state === 'suspended') { audioCtx.resume(); }
}

// Master utility — creates a gain node connected to destination
function makeGain(vol) {
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.connect(audioCtx.destination);
  return g;
}

function getMinSoundIntervalMs() {
  return isMobile ? 40 : 16;
}

function shouldThrottleAudio(allowBypassWindow = false) {
  if (!audioCtx || !isMobile) return false;
  const nowMs = audioCtx.currentTime * 1000;
  if (allowBypassWindow && nowMs <= audioThrottleBypassUntil) return false;
  if ((nowMs - lastSoundTime) < getMinSoundIntervalMs()) return true;
  lastSoundTime = nowMs;
  audioThrottleBypassUntil = nowMs + Math.max(40, getMinSoundIntervalMs());
  return false;
}

// Utility — plays a single oscillator burst
function playTone(freq, type, vol, attack, decay, startTime) {
  if (!sfxEnabled) return;
  if (shouldThrottleAudio(true)) return;
  const osc = audioCtx.createOscillator();
  const gain = makeGain(0.001);
  osc.connect(gain);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
  osc.start(startTime);
  osc.stop(startTime + attack + decay + 0.05);
}

// Utility — short filtered noise burst for impact textures
function playNoiseBurst(vol, decay, startTime, filterType = 'bandpass', filterFreq = 1100, q = 0.8) {
  if (!sfxEnabled) return;
  if (!audioCtx) return;
  if (shouldThrottleAudio(true)) return;
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * decay));
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - (i / bufferSize));

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, startTime);
  filter.Q.setValueAtTime(q, startTime);

  const noiseGain = makeGain(0.001);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
  noise.start(startTime);
  noise.stop(startTime + decay + 0.04);
}

function startBossDrone() {
  if (!sfxEnabled) return;
  if (!audioCtx || bossDrone) return;

  // Low pulsing drone — two detuned oscillators for thickness
  bossDrone = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  bossDroneGain = makeGain(0);

  bossDrone.connect(bossDroneGain);
  osc2.connect(bossDroneGain);

  bossDrone.type = 'sine';
  bossDrone.frequency.setValueAtTime(55, audioCtx.currentTime);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(57.5, audioCtx.currentTime); // slight detune

  // Fade in
  bossDroneGain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 1.5);

  bossDrone.start();
  osc2.start();

  // Store osc2 reference for stopping
  bossDrone._osc2 = osc2;
}

function stopBossDrone() {
  if (!bossDrone) return;
  bossDroneGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  setTimeout(() => {
    try {
      bossDrone.stop();
      bossDrone._osc2.stop();
    } catch (e) {}
    bossDrone = null;
    bossDroneGain = null;
  }, 900);
}

// Drone pitch rises when entering phase 2 — increases tension
function escalateBossDrone() {
  if (!bossDrone || !audioCtx) return;
  bossDrone.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.5);
  bossDrone._osc2.frequency.linearRampToValueAtTime(83, audioCtx.currentTime + 0.5);
  bossDroneGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.5);
}

// OK hit — dull thud, low confidence
function soundOk() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playTone(180, 'triangle', 0.18, 0.005, 0.12, t);
  playTone(90, 'sine', 0.1, 0.005, 0.15, t);
}

// GOOD hit — clean mid punch
function soundGood(multiplier) {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const baseFreq = 300 + (multiplier * 30);
  playTone(baseFreq, 'triangle', 0.22, 0.004, 0.1, t);
  playTone(baseFreq * 1.5, 'sine', 0.1, 0.004, 0.14, t);
}

// PERFECT hit — bright ting with reverb tail
function soundPerfect(multiplier) {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const baseFreq = 520 + (multiplier * 40);

  // Main ting
  playTone(baseFreq, 'sine', 0.25, 0.002, 0.08, t);
  // Harmonic overtone
  playTone(baseFreq * 2, 'sine', 0.12, 0.002, 0.18, t);
  // Shimmer tail
  playTone(baseFreq * 3, 'sine', 0.06, 0.005, 0.35, t);
}

// Corner bonus sting — brighter/pitched up for world 2 diamond moments
function soundCornerBonus(worldNum = 1) {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const pitchBoost = worldNum === 2 ? 1.12 : 1;
  playNoiseBurst(worldNum === 2 ? 0.16 : 0.12, 0.08, t, 'bandpass', 1450 * pitchBoost, 1.8);
  playTone(740 * pitchBoost, 'triangle', 0.2, 0.003, 0.09, t);
  playTone(980 * pitchBoost, 'sine', 0.12, 0.002, 0.13, t + 0.03);
}

// Multiplier milestone sounds (x2 through x8)
// Each level plays a rising musical note
const multiNotes = [0, 0, 262, 294, 330, 370, 415, 466, 523];
function soundMultiplierUp(multiplier) {
  if (!audioCtx || multiplier < 2) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const freq = multiNotes[Math.min(multiplier, 8)];
  playTone(freq, 'sine', 0.2, 0.005, 0.2, t);
  playTone(freq * 1.5, 'sine', 0.08, 0.005, 0.25, t);
}

// Miss/fail — descending crunch
function soundFail() {
  if (!sfxEnabled) return;
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = makeGain(0.001);
  osc.connect(gain);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.start(t);
  osc.stop(t + 0.35);
}

// Life lost (not game over) — shorter warning sting
function soundLifeLost() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playTone(160, 'sawtooth', 0.2, 0.005, 0.15, t);
  playTone(120, 'sawtooth', 0.15, 0.01, 0.2, t + 0.1);
}

// Stage/wave clear — 3 note ascending arpeggio
function soundWaveClear() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  [330, 415, 523].forEach((freq, i) => {
    playTone(freq, 'sine', 0.2, 0.005, 0.15, t + i * 0.1);
    playTone(freq * 2, 'sine', 0.06, 0.005, 0.2, t + i * 0.1);
  });
}

// World clear — full 5 note fanfare
function soundWorldClear() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const melody = [262, 330, 392, 330, 523];
  melody.forEach((freq, i) => {
    playTone(freq, 'sine', 0.25, 0.01, 0.2, t + i * 0.13);
    playTone(freq * 1.5, 'sine', 0.08, 0.01, 0.25, t + i * 0.13);
  });
  // Bass hit underneath
  playTone(65, 'sine', 0.3, 0.01, 0.5, t);
}

// Boss shield break — heavy metallic crash
function soundShieldBreak() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playNoiseBurst(0.26, 0.24, t, 'bandpass', 950, 1.4);
  // Metallic tone underneath
  playTone(150, 'square', 0.18, 0.004, 0.18, t);
  playTone(112, 'sawtooth', 0.2, 0.005, 0.22, t + 0.01);
  playTone(74, 'sine', 0.22, 0.004, 0.32, t);
}

// Boss shield hit — short synthetic impact cue
function soundBossShieldHit(hp) {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  const danger = Math.max(0, 3 - Math.max(0, hp));
  const base = 260 + (danger * 24);
  playNoiseBurst(0.12 + (danger * 0.02), 0.085, t, 'bandpass', 1300 + (danger * 120), 2.2);
  playTone(base, 'square', 0.13, 0.002, 0.065, t);
  playTone(base * 0.72, 'triangle', 0.09, 0.002, 0.09, t + 0.004);
}

// Boss core exposed — dramatic payoff cue
function soundCoreExposed() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playNoiseBurst(0.16, 0.12, t, 'highpass', 700, 0.7);
  playTone(220, 'sawtooth', 0.14, 0.006, 0.09, t);
  playTone(330, 'triangle', 0.18, 0.006, 0.12, t + 0.045);
  playTone(495, 'sine', 0.2, 0.004, 0.16, t + 0.095);
}

// Boss core damage — strongest hit cue before final defeat
function soundCoreDamage() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playNoiseBurst(0.2, 0.11, t, 'bandpass', 980, 1.8);
  playTone(180, 'square', 0.2, 0.003, 0.08, t);
  playTone(240, 'sawtooth', 0.18, 0.003, 0.1, t + 0.018);
  playTone(360, 'triangle', 0.16, 0.003, 0.14, t + 0.05);
}

// Boss defeated — dramatic descending + resolution
function soundBossDefeated() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  // Descend
  [523, 466, 392, 330, 262].forEach((freq, i) => {
    playTone(freq, 'sine', 0.2, 0.01, 0.18, t + i * 0.1);
  });
  // Resolution chord at end
  setTimeout(() => {
    const t2 = audioCtx.currentTime;
    [262, 330, 392, 523].forEach((freq, j) => {
      playTone(freq, 'sine', 0.18, 0.02, 0.5, t2 + j * 0.04);
    });
  }, 650);
}

// Life zone appear — gentle ascending chime
function soundLifeZone() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    playTone(freq, 'sine', 0.12, 0.005, 0.2, t + i * 0.08);
  });
}

// Life gained — warm positive sting
function soundLifeGained() {
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  const t = audioCtx.currentTime;
  playTone(523, 'sine', 0.2, 0.005, 0.1, t);
  playTone(659, 'sine', 0.2, 0.005, 0.1, t + 0.1);
  playTone(784, 'sine', 0.22, 0.005, 0.25, t + 0.2);
}

// UI button click — subtle tick
function soundUIClick() {
  if (!sfxEnabled) return;
  if (!audioCtx) return;
  if (shouldThrottleAudio()) return;
  playTone(800, 'sine', 0.08, 0.002, 0.04, audioCtx.currentTime);
}

function playPop(multiplier, isPerfect, isFail = false) {
  if (isFail) {
    soundFail();
    return;
  }
  if (isPerfect) {
    soundPerfect(multiplier);
    return;
  }
  soundGood(multiplier);
}

// Load an audio file into a buffer
async function loadAudioFile(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await audioCtx.decodeAudioData(arrayBuffer);
}

function getBaseTrackForLevel(levelIdx) {
  const level = campaign[levelIdx];
  if (!level) return 'assets/Base.mp3';
  const worldNum = parseInt(level.id.split('-')[0], 10);
  return worldNum === 2 ? 'assets/Base-2.mp3' : 'assets/Base.mp3';
}

// Initialize and start the dynamic music loops
async function startDynamicMusic(baseTrackPath) {
  if (!audioCtx || !musicEnabled) return;
  if (isMusicPlaying && currentBaseTrack === baseTrackPath) return;

  disposeMusicNodes();

  try {
    if (!baseAudioBuffers[baseTrackPath]) {
      baseAudioBuffers[baseTrackPath] = await loadAudioFile(baseTrackPath);
    }
    if (!bossAudioBuffer) bossAudioBuffer = await loadAudioFile('assets/boss.mp3');

    baseSource = audioCtx.createBufferSource();
    bossSource = audioCtx.createBufferSource();
    baseSource.buffer = baseAudioBuffers[baseTrackPath];
    bossSource.buffer = bossAudioBuffer;
    baseSource.loop = true;
    bossSource.loop = true;

    baseGain = audioCtx.createGain();
    bossGain = audioCtx.createGain();

    bossGain.gain.value = 0;
    baseGain.gain.setValueAtTime(0, audioCtx.currentTime);
    baseGain.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 2.5);

    baseSource.connect(baseGain);
    baseGain.connect(audioCtx.destination);
    bossSource.connect(bossGain);
    bossGain.connect(audioCtx.destination);

    const startTime = audioCtx.currentTime + 0.1;
    baseSource.start(startTime);
    bossSource.start(startTime);
    currentBaseTrack = baseTrackPath;
    isMusicPlaying = true;
    currentMusicState = { mult: -1, boss: null };
  } catch (e) {
    console.warn('Dynamic music failed', e);
  }
}

let currentMusicState = { mult: 1, boss: false };

function disposeMusicNodes() {
  try {
    if (baseSource) {
      try { baseSource.stop(); } catch (e) {}
      baseSource.disconnect();
    }
  } catch (e) {}
  try {
    if (bossSource) {
      try { bossSource.stop(); } catch (e) {}
      bossSource.disconnect();
    }
  } catch (e) {}
  try { if (baseGain) baseGain.disconnect(); } catch (e) {}
  try { if (bossGain) bossGain.disconnect(); } catch (e) {}
  baseSource = null;
  bossSource = null;
  baseGain = null;
  bossGain = null;
  isMusicPlaying = false;
}

function stopDynamicMusic() {
  if (!audioCtx) return;
  try {
    if (baseGain) {
      baseGain.gain.cancelScheduledValues(audioCtx.currentTime);
      baseGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    if (bossGain) {
      bossGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bossGain.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    disposeMusicNodes();
    currentBaseTrack = null;
    currentMusicState = { mult: 1, boss: false };
  } catch (e) {
    console.warn('stopDynamicMusic failed', e);
  }
}

function baseVolumeForMultiplier(currentMultiplier) {
  return Math.min(0.8, 0.56 + (Math.max(1, currentMultiplier) - 1) * 0.02);
}

async function ensureCorrectMusicForLevel() {
  if (!audioCtx || !musicEnabled) return;
  const token = ++musicLoadToken;
  const wantedTrack = getBaseTrackForLevel(currentLevelIdx);
  await startDynamicMusic(wantedTrack);
  if (token !== musicLoadToken) return;
  updateMusicState(multiplier, !!(levelData && levelData.boss));
}

// Dynamically adjust the music based on gameplay state
function updateMusicState(currentMultiplier, isBossActive) {
  if (!isMusicPlaying || !audioCtx || !baseGain || !bossGain || !baseSource || !bossSource) return;

  // STOP THE SPAM: Only update Web Audio API if the state actually changes!
  if (currentMusicState.mult === currentMultiplier && currentMusicState.boss === isBossActive) return;

  currentMusicState.mult = currentMultiplier;
  currentMusicState.boss = isBossActive;

  const now = audioCtx.currentTime;

  if (isBossActive) {
    baseGain.gain.cancelScheduledValues(now);
    bossGain.gain.cancelScheduledValues(now);
    baseGain.gain.linearRampToValueAtTime(0.03, now + 0.5);
    bossGain.gain.linearRampToValueAtTime(0.85, now + 0.5);
  } else {
    baseGain.gain.cancelScheduledValues(now);
    bossGain.gain.cancelScheduledValues(now);
    bossGain.gain.linearRampToValueAtTime(0, now + 0.5);
    baseGain.gain.linearRampToValueAtTime(baseVolumeForMultiplier(currentMultiplier), now + 0.5);
  }

  const targetSpeed = 1.0 + (currentMultiplier * 0.015);
  // Cancel previous scheduled values to prevent memory leaks
  baseSource.playbackRate.cancelScheduledValues(now);
  bossSource.playbackRate.cancelScheduledValues(now);
  baseSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
  bossSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
}

function vibrate(pattern) {
  if (!hapticsEnabled) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

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
let stageClearHoldUntil = 0;
let nearMissReplayUntil = 0;
let nearMissReplayActive = false;

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
    case 2: return { primary: '#ff00cc', secondary: '#cc00ff', bg: '#07070a' };
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
      railColor: '#ff00cc',
      targetColor: '#2ff6ff',
      targetGlowColor: '#0fdcff',
      targetCoreColor: '#f8ffff',
      railGlowScale: 0.82
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

function getPointOnShape(t, shape, cx, cy, radius) {
  if (shape === 'circle') {
    return { x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius };
  }
  if (shape === 'diamond') {
    // Clean sharp diamond with true linear segments between the 4 corners.
    const a = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const side = Math.min(3, Math.floor(a / (Math.PI / 2)));
    const progress = (a % (Math.PI / 2)) / (Math.PI / 2);

    const corners = [
      { x: 0, y: -1 },  // top
      { x: 1, y: 0 },   // right
      { x: 0, y: 1 },   // bottom
      { x: -1, y: 0 }   // left
    ];

    const p1 = corners[side];
    const p2 = corners[(side + 1) % 4];

    const x = p1.x + (p2.x - p1.x) * progress;
    const y = p1.y + (p2.y - p1.y) * progress;

    return {
      x: cx + x * radius,
      y: cy + y * radius
    };
  }
  const sides = shape === 'triangle' ? 3 : 5;
  const rotation = -Math.PI / 2;
  const corners = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2 / sides);
    corners.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
  }
  const normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const sectorSize = Math.PI * 2 / sides;
  const sectorIdx = Math.floor(normalized / sectorSize) % sides;
  const progress = (normalized - sectorIdx * sectorSize) / sectorSize;
  const p1 = corners[sectorIdx];
  const p2 = corners[(sectorIdx + 1) % sides];
  return {
    x: p1.x + (p2.x - p1.x) * progress,
    y: p1.y + (p2.y - p1.y) * progress
  };
}

// Helper to draw a path segment along any shape
// Used by ring drawing and target drawing
function buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps = 40) {
  if (shape === 'diamond') {
    const rawSpan = endAngle - startAngle;
    let span = ((rawSpan) + Math.PI * 2) % (Math.PI * 2);
    if (span === 0 && rawSpan !== 0) span = Math.PI * 2;
    const actualSteps = Math.max(2, Math.ceil(steps * span / (Math.PI * 2)));
    ctx.beginPath();
    for (let i = 0; i <= actualSteps; i++) {
      const t = startAngle + (span * i / actualSteps);
      const pt = getPointOnShape(t, 'diamond', cx, cy, radius);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    return;
  }
  const rawSpan = endAngle - startAngle;
  let span = ((rawSpan) + Math.PI * 2) % (Math.PI * 2);
  if (span === 0 && rawSpan !== 0) span = Math.PI * 2;
  const actualSteps = Math.max(2, Math.ceil(steps * span / (Math.PI * 2)));
  ctx.beginPath();
  for (let i = 0; i <= actualSteps; i++) {
    const t = startAngle + (span * i / actualSteps);
    const pt = getPointOnShape(t, shape, cx, cy, radius);
    if (i === 0) ctx.moveTo(pt.x, pt.y);
    else ctx.lineTo(pt.x, pt.y);
  }
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

function toggleShop(show) { ui.shopModal.style.bottom = show ? '0' : '-100%'; updateShopUI(); }
function toggleSettings(show) {
  ui.settingsModal.style.bottom = show ? '0' : '-100%';
  if (show) applySettingsUI();
}

function applySettingsUI() {
  const musicBtn = document.getElementById('musicToggleBtn');
  const sfxBtn = document.getElementById('sfxToggleBtn');
  const hapticsBtn = document.getElementById('hapticsToggleBtn');
  musicBtn.innerText = musicEnabled ? 'On' : 'Off';
  sfxBtn.innerText = sfxEnabled ? 'On' : 'Off';
  hapticsBtn.innerText = hapticsEnabled ? 'On' : 'Off';
  musicBtn.classList.toggle('off', !musicEnabled);
  sfxBtn.classList.toggle('off', !sfxEnabled);
  hapticsBtn.classList.toggle('off', !hapticsEnabled);
}

function toggleMusicSetting() {
  musicEnabled = !musicEnabled;
  if (!musicEnabled) {
    stopDynamicMusic();
  } else if (isPlaying) {
    initAudio();
    ensureCorrectMusicForLevel();
  }
  applySettingsUI();
}

function toggleSfxSetting() {
  sfxEnabled = !sfxEnabled;
  if (!sfxEnabled) stopBossDrone();
  applySettingsUI();
}

function toggleHapticsSetting() {
  hapticsEnabled = !hapticsEnabled;
  applySettingsUI();
}

function updateShopUI() {
  updatePersistentCoinUI();
  const items = ['classic', 'skull', 'fire'];
  items.forEach(id => {
    let btn = document.getElementById('btn-' + id); let card = document.getElementById('item-' + id);
    let preview = card ? card.querySelector('.item-preview') : null;
    if (preview) {
      if (!preview.dataset.skin) preview.dataset.skin = id;
      renderShopOrbPreview(preview, preview.dataset.skin);
    }
    if (activeSkin === id) { btn.className = 'buy-btn btn-equipped'; btn.innerText = 'Equipped'; card.classList.add('equipped'); }
    else if (unlockedSkins.includes(id)) { btn.className = 'buy-btn btn-owned'; btn.innerText = 'Equip'; card.classList.remove('equipped'); btn.onclick = () => equipSkin(id); }
    else { card.classList.remove('equipped'); }
  });
}
function buyItem(id, cost) {
  if (globalCoins >= cost) {
    globalCoins -= cost;
    unlockedSkins.push(id);
    saveData();
    updatePersistentCoinUI();
    equipSkin(id);
  } else {
    alert("Not enough coins! Play the campaign to earn more.");
  }
}
function equipSkin(id) { activeSkin = id; saveData(); updateShopUI(); }

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

function getParticle() {
  return particlePool.length ? particlePool.pop() : { x: 0, y: 0, vx: 0, vy: 0, angle: 0, length: 0, life: 0, color: '#fff' };
}

function releaseParticle(particle) {
  particle.life = 0;
  particlePool.push(particle);
}

function getPopup() {
  return popupPool.length
    ? popupPool.pop()
    : { x: 0, y: 0, text: '', color: '#fff', life: 0, hitQuality: null, animType: 'default', riseSpeed: 1, fadeSpeed: 0.02, shadow: 0 };
}

function releasePopup(popup) {
  popup.animType = 'default';
  popup.riseSpeed = 1;
  popup.fadeSpeed = 0.02;
  popup.shadow = 0;
  popup.fontSize = null;
  popup.life = 0;
  popupPool.push(popup);
}

function markScoreCoinDirty(force = false) {
  hudScoreCoinDirty = true;
  pendingHudUpdates++;
  const batchSize = isMobile ? 3 : 1;
  if (force || pendingHudUpdates >= batchSize) flushScoreCoinUI();
}

function flushScoreCoinUI() {
  if (!hudScoreCoinDirty) return;
  ui.score.innerText = score;
  ui.coins.innerText = Math.floor(globalCoins);
  ui.runCoins.innerText = Math.floor(runCents / 10);
  hudLastFlushAt = performance.now();
  hudScoreCoinDirty = false;
  pendingHudUpdates = 0;
}

function setOverlayState(type) {
  const reviveBtn = document.getElementById('reviveBtn');
  const coinReviveBtn = document.getElementById('coinReviveBtn');
  const shareBtn = document.getElementById('shareBtn');
  const menuBtn = document.getElementById('menuBtn');
  const pbBlock = document.getElementById('pbStatsBlock');
  const clearSummary = document.getElementById('clearSummary');
  const overlayActionStack = document.getElementById('overlayActionStack');
  const runCoinsBox = document.getElementById('runCoinsBox');
  const overlayMetaStack = document.getElementById('overlayMetaStack');

  const hideAll = () => {
    ui.btn.style.display = 'none';
    if (reviveBtn) reviveBtn.style.display = 'none';
    if (coinReviveBtn) coinReviveBtn.style.display = 'none';
    if (shareBtn) shareBtn.style.display = 'none';
    if (menuBtn) menuBtn.style.display = 'none';
    if (pbBlock) pbBlock.style.display = 'none';
    if (clearSummary) clearSummary.style.display = 'none';
    if (overlayActionStack) overlayActionStack.style.display = 'none';
    if (runCoinsBox) runCoinsBox.style.display = 'none';
  };

  hideAll();

  if (type === 'gameOver') {
    if (overlayMetaStack) overlayMetaStack.style.display = '';
    ui.btn.style.display = 'block';
    if (reviveBtn) reviveBtn.style.display = 'block';
    if (shareBtn) shareBtn.style.display = 'block';
    if (menuBtn) menuBtn.style.display = 'block';
    if (pbBlock) pbBlock.style.display = 'grid';
    if (overlayActionStack) overlayActionStack.style.display = 'flex';
    if (runCoinsBox) runCoinsBox.style.display = 'inline-flex';
  } else if (type === 'worldClearReady') {
    if (overlayMetaStack) overlayMetaStack.style.display = '';
    ui.btn.style.display = 'block';
    if (shareBtn) shareBtn.style.display = 'block';
    if (clearSummary) clearSummary.style.display = 'grid';
    if (overlayActionStack) overlayActionStack.style.display = 'flex';
    if (runCoinsBox) runCoinsBox.style.display = 'inline-flex';
  } else if (type === 'worldClearTally') {
    if (overlayMetaStack) overlayMetaStack.style.display = '';
    if (runCoinsBox) runCoinsBox.style.display = 'inline-flex';
  } else if (type === 'cinematic') {
    setCinematicOverlayMode();
    forceHideOverlayExtras();
  }
}

function forceHideOverlayExtras() {
  const overlayActionStack = document.getElementById('overlayActionStack');
  const runCoinsBox = document.getElementById('runCoinsBox');
  const pbBlock = document.getElementById('pbStatsBlock');
  const clearSummary = document.getElementById('clearSummary');
  const newRecordBanner = document.getElementById('newRecordBanner');
  const coinReviveBtn = document.getElementById('coinReviveBtn');

  if (overlayActionStack) overlayActionStack.style.display = 'none';
  if (runCoinsBox) runCoinsBox.style.display = 'none';
  if (pbBlock) pbBlock.style.display = 'none';
  if (clearSummary) clearSummary.style.display = 'none';
  if (newRecordBanner) newRecordBanner.style.display = 'none';
  if (coinReviveBtn) coinReviveBtn.style.display = 'none';
  if (ui.btn) ui.btn.style.display = 'none';
}

function setCinematicOverlayMode() {
  const meta = document.getElementById('overlayMetaStack');
  if (meta) meta.style.display = 'none';
  forceHideOverlayExtras();
}

function clearCinematicOverlayMode() {
  const meta = document.getElementById('overlayMetaStack');
  if (meta) meta.style.display = '';
}

function resetRunState() {
  // Lives are run-persistent across waves/stages.
  // Only explicit fresh runs/restarts should fully reset lives.
  score = 0;
  streak = 0;
  perfectLifeStreak = 0;
  runBestStreak = 0;
  multiplier = 1;
  lives = maxLives;
  runCents = 0;
  distanceTraveled = 0;
  direction = 1;
  angle = 0;
  trail = [];
  stageHits = 0;
  isBossPhaseTwo = false;
  bossPhase = 1;
  bossIntroPlaying = false;
  bossTransitionLock = false;
  bossPauseUntil = 0;
  currentReviveCost = 50;
  reviveCount = 0;
  usedLastChance = false;
  scoreAtCheckpoint = 0;
  scoreAtLevelStart = 0;
  stageClearHoldUntil = 0;
  nearMissReplayUntil = 0;
  nearMissReplayActive = false;
  isCinematicIntro = false;
  targets = [];
  particles = [];
  popups = [];
  shockwaves = [];
  targetHitRipples = [];
}

function loseLife(reason) {
  // Every real miss must spend exactly one life through this function.
  if (lives <= 0) return 0;
  lives = Math.max(0, lives - 1);
  ui.lives.innerText = lives;
  perfectLifeStreak = 0;
  return lives;
}

function gainLifeFromPerfectStreak() {
  // The only active life recovery rule:
  // +1 life after 6 perfect hits in a row, capped at max lives.
  if (lives >= maxLives) {
    perfectLifeStreak = 0;
    return false;
  }
  lives = Math.min(maxLives, lives + 1);
  ui.lives.innerText = lives;
  perfectLifeStreak = 0;
  createPopup(centerObj.x, centerObj.y - orbitRadius - 18, "+1 LIFE", "#ffcc66");
  soundLifeGained();
  return true;
}

function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    const length = Math.random() * 10 + 5;
    const particle = getParticle();
    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed;
    particle.vy = Math.sin(angle) * speed;
    particle.angle = angle;
    particle.length = length;
    particle.life = 1.0;
    particle.color = color;
    particles.push(particle);
  }
  if (particles.length > MAX_PARTICLES) {
    const overflow = particles.length - MAX_PARTICLES;
    for (let i = 0; i < overflow; i++) releaseParticle(particles[i]);
    particles.splice(0, overflow);
  }
}

function createUpwardBurstParticles(x, y, color, count = 36) {
  const burstCount = Math.min(count, 40);
  for (let i = 0; i < burstCount; i++) {
    const angle = (-Math.PI / 2) + ((Math.random() - 0.5) * 1.25); // mostly upward fan
    const speed = Math.random() * 5 + 3.5;
    const particle = getParticle();
    particle.x = x;
    particle.y = y;
    particle.vx = Math.cos(angle) * speed * 0.85;
    particle.vy = Math.sin(angle) * speed;
    particle.angle = angle;
    particle.length = Math.random() * 11 + 6;
    particle.life = 1.0;
    particle.color = color;
    particles.push(particle);
  }
  if (particles.length > MAX_PARTICLES) {
    const overflow = particles.length - MAX_PARTICLES;
    for (let i = 0; i < overflow; i++) releaseParticle(particles[i]);
    particles.splice(0, overflow);
  }
}
function createPopup(x, y, text, color, hitQuality = null) {
  const popup = getPopup();
  popup.x = x;
  popup.y = y;
  popup.text = text;
  popup.color = color;
  popup.life = 1.0;
  popup.hitQuality = hitQuality;
  popup.animType = 'default';
  popup.riseSpeed = 1;
  popup.fadeSpeed = 0.02;
  popup.shadow = 0;
  popups.push(popup);
  if (popups.length > MAX_POPUPS) {
    const oldest = popups.shift();
    if (oldest) releasePopup(oldest);
  }
  return popup;
}

function showComboPopup(multiplierLevel) {
  const comboMilestones = {
    4: { label: 'x4 COMBO!', color: '#00f7ff' },
    6: { label: 'x6 RAMPAGE!', color: '#ff67f3' },
    8: { label: 'x8 GOD MODE!', color: '#ffd84d' }
  };
  const milestone = comboMilestones[multiplierLevel];
  if (!milestone) return;

  const comboPopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 26, milestone.label, milestone.color);
  comboPopup.animType = 'combo';
  comboPopup.life = 1.65;
  comboPopup.riseSpeed = 0.75;
  comboPopup.fadeSpeed = 0.027;
  comboPopup.shadow = 32;

  createShockwave(milestone.color, 42);
  createShockwave('#ffffff', 50);
  createUpwardBurstParticles(centerObj.x, centerObj.y - 14, milestone.color, 28);
}

function showNearMissReplay(reason, nearestEdgeDistance) {
  nearMissReplayActive = true;
  nearMissReplayUntil = performance.now() + 680;
  const replayText = nearestEdgeDistance <= (NEAR_MISS_THRESHOLD * 0.5) ? "SO CLOSE!" : "ALMOST!";
  const replayColor = replayText === "SO CLOSE!" ? '#ffe14f' : '#ffad33';
  const replayPopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 30, replayText, replayColor);
  replayPopup.animType = 'nearMiss';
  replayPopup.life = 1.18;
  replayPopup.riseSpeed = 0.42;
  replayPopup.fadeSpeed = 0.017;
  replayPopup.shadow = 38;
  replayPopup.fontSize = isMobile ? '3.35rem' : '3.95rem';
  createShockwave('#ffaa00', 54);
  createShockwave('#ffffff', 44);
  createUpwardBurstParticles(centerObj.x, centerObj.y + 8, replayColor, 34);
  triggerScreenShake(12);
  setTimeout(() => {
    nearMissReplayActive = false;
    nearMissReplayUntil = 0;
    handleFail(reason);
  }, 680);
}

function createShockwave(color, speed = 40) {
  shockwaves.push({ radius: orbitRadius * 0.15, opacity: 1.0, color: color, width: 5, speed: speed });
  if (shockwaves.length > MAX_SHOCKWAVES) shockwaves.splice(0, shockwaves.length - MAX_SHOCKWAVES);
}
function createTargetHitRipple(x, y, color = '#ffffff') {
  targetHitRipples.push({
    x,
    y,
    radius: 3,
    speed: 2.6,
    life: 1.0,
    color: color === '#ffffff' ? 'rgba(255,255,255,0.95)' : rgbaFromHex(color, 0.95)
  });
  if (targetHitRipples.length > MAX_HIT_RIPPLES) {
    targetHitRipples.splice(0, targetHitRipples.length - MAX_HIT_RIPPLES);
  }
}

function triggerTargetHitFeedback(target, x, y) {
  target.hitFlash = 1.0;
  target.hitScalePulse = 1.0;
  createTargetHitRipple(x, y, target.color || '#ffffff');
}

function triggerScreenShake(intensity = 5) {
  canvas.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`;
  setTimeout(() => canvas.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`, 50);
  setTimeout(() => canvas.style.transform = `translate(0px, 0px)`, 100);
}

function pulseBrightness(amount = 1.6, duration = 120) {
  if (brightnessPulseTimeout) clearTimeout(brightnessPulseTimeout);
  canvas.style.filter = `brightness(${amount})`;
  brightnessPulseTimeout = setTimeout(() => {
    canvas.style.filter = 'brightness(1)';
    brightnessPulseTimeout = null;
  }, duration);
}

function scheduleBossSpawn(delay = 700) {
  if (bossSpawnTimeout) clearTimeout(bossSpawnTimeout);
  bossSpawnTimeout = setTimeout(() => {
    spawnTargets();
    bossSpawnTimeout = null;
  }, delay);
}

function pauseGameplayBriefly(duration = 750) {
  const now = performance.now();
  bossPauseUntil = Math.max(bossPauseUntil, now + duration);
  bossTransitionLock = true;
  isPlaying = false;
  setTimeout(() => {
    if (performance.now() >= bossPauseUntil) {
      bossTransitionLock = false;
      isPlaying = true;
    }
  }, duration + 20);
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

function generateShareCard() {
  // Create an offscreen canvas for the share card
  const card = document.createElement('canvas');
  card.width = 800;
  card.height = 450;
  const c = card.getContext('2d');
  const palette = getWorldPalette();

  // Background
  c.fillStyle = '#07070a';
  c.fillRect(0, 0, 800, 450);

  // Accent border
  c.strokeStyle = palette.primary;
  c.lineWidth = 3;
  c.shadowBlur = 20;
  c.shadowColor = palette.primary;
  c.strokeRect(12, 12, 776, 426);
  c.shadowBlur = 0;

  // Game title
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.font = '600 14px Orbitron, sans-serif';
  c.letterSpacing = '6px';
  c.textAlign = 'left';
  c.fillText('ORBIT SYNC', 40, 50);

  // Player title
  const title = generateTitle(score, personalBest.world, personalBest.streak, reviveCount);
  c.fillStyle = palette.primary;
  c.font = '900 52px Orbitron, sans-serif';
  c.letterSpacing = '2px';
  c.textAlign = 'left';
  c.shadowBlur = 25;
  c.shadowColor = palette.primary;
  c.fillText(title, 40, 130);
  c.shadowBlur = 0;

  // Divider line
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(40, 155);
  c.lineTo(760, 155);
  c.stroke();

  // Stats
  const stats = [
    { label: 'SCORE', value: score },
    { label: 'BEST STREAK', value: personalBest.streak },
    { label: 'WORLD', value: personalBest.world },
    { label: 'REVIVES USED', value: reviveCount }
  ];

  stats.forEach((stat, i) => {
    const x = 40 + (i * 180);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.font = '400 11px Orbitron, sans-serif';
    c.letterSpacing = '3px';
    c.textAlign = 'left';
    c.fillText(stat.label, x, 195);

    c.fillStyle = '#ffffff';
    c.font = '400 72px Bebas Neue, sans-serif';
    c.letterSpacing = '2px';
    c.fillText(stat.value, x, 280);
  });

  if (reviveCount === 0) {
    c.fillStyle = 'rgba(0, 229, 255, 0.12)';
    c.beginPath();
    c.roundRect(40, 300, 160, 32, 6);
    c.fill();
    c.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = '#00e5ff';
    c.font = '400 11px Orbitron, sans-serif';
    c.letterSpacing = '3px';
    c.textAlign = 'left';
    c.fillText('✦ CLEAN RUN', 55, 321);
  }

  // World colour strip at bottom
  c.fillStyle = palette.primary;
  c.globalAlpha = 0.15;
  c.fillRect(0, 370, 800, 80);
  c.globalAlpha = 1.0;

  // CTA
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.font = '400 12px Orbitron, sans-serif';
  c.letterSpacing = '4px';
  c.textAlign = 'right';
  c.fillText('CAN YOU BEAT THIS?', 760, 415);

  // Try to share natively, fall back to download
  card.toBlob(blob => {
    const file = new File([blob], 'orbitsync.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare({ files: [file] })) {
      const reviveText = reviveCount === 0
        ? 'No revives used — clean run!'
        : `Used ${reviveCount} revive${reviveCount > 1 ? 's' : ''}.`;
      navigator.share({
        title: 'Orbit Sync',
        text: `I got "${title}" with a score of ${score}. ${reviveText} Can you beat it?`,
        files: [file]
      }).catch(() => downloadCard(card));
    } else {
      downloadCard(card);
    }
  });
}

function downloadCard(card) {
  const link = document.createElement('a');
  link.download = 'orbitsync-score.png';
  link.href = card.toDataURL();
  link.click();
}

function updateMultiplierUI() {
  const prevMultiplier = lastMultiplierDisplay;
  const didChange = multiplier !== prevMultiplier;
  ui.multiplierCount.innerText = multiplier;

  if (multiplier <= 1) {
    ui.bigMultiplier.style.display = 'none';
    lastMultiplierDisplay = multiplier;
    return;
  } else {
    ui.bigMultiplier.style.display = 'block';
  }

  let mColor = multiColors[Math.min(multiplier - 1, 7)];
  ui.bigMultiplier.style.color = mColor;
  ui.bigMultiplier.style.textShadow = `0 0 20px ${mColor}`;
  // Heavier right-side pop, still snappy.
  ui.bigMultiplier.style.transform = "translateY(-50%) scale(1.6)";
  setTimeout(() => ui.bigMultiplier.style.transform = "translateY(-50%) scale(1)", 120);

  if (didChange && (multiplier === 4 || multiplier === 6 || multiplier === 8)) {
    showComboPopup(multiplier);
  }

  lastMultiplierDisplay = multiplier;
}

function getCheckpointIndex() {
  let currentWorld = levelData.id.split('-')[0];
  for (let i = 0; i < campaign.length; i++) { if (campaign[i].id.startsWith(currentWorld + "-")) return i; }
  return 0;
}

function updateWaveUI() {
  if (levelData.boss) {
    ui.wave.style.display = 'none';
    if (ui.bossUI) ui.bossUI.style.display = 'none'; // Hide the old HTML bar
  } else {
    if (ui.bossUI) ui.bossUI.style.display = 'none';
    ui.wave.style.display = 'block';
    ui.wave.innerText = `WAVE ${Math.min(stageHits + 1, levelData.hitsNeeded)} / ${levelData.hitsNeeded}`;
  }
}


function triggerBossIntro() {
  bossIntroPlaying = true;
  isPlaying = false;

  initAudio();
  startBossDrone();
  setOverlayState('cinematic');
  setCinematicOverlayMode();
  forceHideOverlayExtras();
  const overlayActionStack = document.getElementById('overlayActionStack');
  if (overlayActionStack) overlayActionStack.style.display = 'none';

  const introByBoss = {
    aegis: { text: "AEGIS CORE ONLINE", color: '#ff3366' },
    prism: { text: "PRISM PROTOCOL ACTIVE", color: '#ff00cc' }
  };
  const introConfig = introByBoss[levelData.boss] || { text: "BOSS PROTOCOL ACTIVE", color: '#ff3366' };
  const introText = introConfig.text;
  const introColor = introConfig.color;
  let displayed = "";
  let i = 0;

  canvas.style.boxShadow = `inset 0 0 80px ${introColor}`;
  setTimeout(() => canvas.style.boxShadow = "none", 200);

  const typeInterval = setInterval(() => {
    setCinematicOverlayMode();
    forceHideOverlayExtras();
    displayed += introText[i];
    ui.text.innerText = displayed;
    ui.text.style.color = introColor;
    ui.text.style.letterSpacing = isMobile ? "2px" : "6px";
    i++;
    if (i >= introText.length) {
      clearInterval(typeInterval);
      setTimeout(() => {
        bossIntroPlaying = false;
        isPlaying = true;
        ui.text.style.letterSpacing = "";
      }, 600);
    }
  }, 60);
}

let currentCinematicInterval = null;

function playBossCinematic() {
  let step = 0;

  // Clear any existing intervals to prevent lag/memory leaks
  if (currentCinematicInterval) clearInterval(currentCinematicInterval);

  // 1. Hide ALL distracting game UI (Score, Multiplier, Boss HP)
  ui.topBar.style.display = 'none';
  ui.gameUI.style.display = 'none';
  ui.bigMultiplier.style.display = 'none';
  if (ui.bossUI) ui.bossUI.style.display = 'none'; // Fixes the floating health bar!

  setOverlayState('cinematic');
  setCinematicOverlayMode();
  forceHideOverlayExtras();
  const overlayActionStack = document.getElementById('overlayActionStack');
  if (overlayActionStack) overlayActionStack.style.display = 'none';
  const runCoinsBox = document.getElementById('runCoinsBox');
  if (runCoinsBox) runCoinsBox.style.display = 'none';

  // 2. Clean overlay for text
  ui.overlay.style.display = 'flex';
  ui.overlay.style.background = 'rgba(10, 10, 15, 0.6)';
  ui.title.style.display = 'block';
  ui.title.style.maxWidth = '90vw';
  ui.title.style.textAlign = 'center';
  ui.title.innerText = "";
  ui.subtitle.style.display = 'none';
  ui.subtitle.style.maxWidth = '90vw';
  ui.subtitle.style.textAlign = 'center';

  // 3. Pre-generate shields, but hold them
  spawnTargets();
  let pendingShields = [...targets];
  targets = [];

  currentCinematicInterval = setInterval(() => {
    step++;

    if (step === 1) {
      ui.title.innerText = "WARNING: ANOMALY DETECTED";
      ui.title.style.color = '#ff3366';
    } else if (step === 2) {
      ui.title.innerText = "TEST YOUR RHYTHM";
      ui.title.style.color = '#ffffff';
    }

    // Pop in shields one by one
    if (step <= pendingShields.length) {
      targets.push(pendingShields[step - 1]);
      triggerScreenShake(8);
      if (typeof audioCtx !== 'undefined' && audioCtx) { playPop(1, false, true); vibrate(20); }
    }

    // End Cinematic
    if (step > pendingShields.length && step >= 3) {
      clearInterval(currentCinematicInterval);
      currentCinematicInterval = null;
      isCinematicIntro = false;

      // Clear Overlay
      ui.overlay.style.display = 'none';
      ui.subtitle.style.display = 'block';
      clearCinematicOverlayMode();

      // RESTORE ALL HUD ELEMENTS
      ui.topBar.style.display = 'flex';
      ui.gameUI.style.display = 'block';
      ui.bigMultiplier.style.display = multiplier > 1 ? 'block' : 'none';
      if (ui.bossUI) ui.bossUI.style.display = 'none'; // Boss HP bar sidelined for now.

      // Flash effect to signal fight start
      canvas.style.boxShadow = `inset 0 0 100px #ffffff`;
      setTimeout(() => canvas.style.boxShadow = 'none', 200);
    }
  }, 800);
}



function loadLevel(idx) {
  if (idx < 0 || idx >= campaign.length) {
    console.warn('loadLevel ignored invalid index:', idx);
    return false;
  }
  scoreAtLevelStart = score;
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

  ui.stage.innerText = `Stage ${levelData.id}`; ui.text.innerText = levelData.text;
  ui.lives.innerText = lives; ui.streak.innerText = streak;
  updateMultiplierUI();
  updateWaveUI();

  if (levelData.boss) {
    isCinematicIntro = true;
    if (ui.gameUI) ui.gameUI.style.display = 'none';
    playBossCinematic();
  } else {
    stopBossDrone();
    spawnTargets();
  }
  return true;
}

function buildTarget(start, size, config = {}) {
  const worldNum = parseInt((levelData && levelData.id ? levelData.id.split('-')[0] : '1'), 10);
  const target = {
    start,
    size,
    baseSize: size,
    spawnDistance: totalStageDistance,
    ...config
  };
  if (!target.shrinkConfig && levelData && levelData.shrink && !target.isHeart && !target.isBossShield) {
    target.shrinkConfig = levelData.shrink;
  }
  if (!target.pulseConfig && levelData && levelData.pulse && worldNum !== 2 && !target.isHeart && !target.isBossShield && !target.isPhantom && !target.isCornerBonus) {
    target.pulseConfig = levelData.pulse;
    target.pulsePhaseOffset = (target.start % (Math.PI * 2)) * 420;
    target.pulseAtMinimum = false;
  }
  return target;
}

function spawnWorld2CornerBonusTargets() {
  const worldNum = parseInt(levelData.id.split('-')[0], 10);
  if (worldNum !== 2 || levelData.boss || inMenu) return;

  const spawnChance = levelData.cornerBonusChance ?? 0.38;
  if (Math.random() > spawnChance) return;

  const maxCorners = levelData.cornerBonusMax ?? 1;
  const bonusCount = (maxCorners > 1 && Math.random() < 0.22) ? 2 : 1;
  const cornerAngles = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
  const jitterRange = levelData.cornerBonusJitter ?? 0.045;
  const cornerSize = levelData.cornerBonusSize ?? (Math.PI / 20);
  const bonusColor = '#ffd54a';
  const chosen = [];

  while (chosen.length < bonusCount && chosen.length < cornerAngles.length) {
    const idx = Math.floor(Math.random() * cornerAngles.length);
    if (!chosen.includes(idx)) chosen.push(idx);
  }

  chosen.forEach(idx => {
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    targets.push(buildTarget(cornerAngles[idx] + jitter, cornerSize, {
      color: bonusColor,
      active: true,
      hp: 1,
      moveSpeed: 0,
      isCornerBonus: true
    }));
  });
}

function buildCornerPrecisionTarget(anchorAngle, options = {}) {
  const backWindow = options.backWindow ?? 0.135;
  const overshootWindow = options.overshootWindow ?? 0.135;
  const perfectWindow = options.perfectWindow ?? 0.015;

  return buildTarget(normalizeAngle(anchorAngle - backWindow), backWindow + overshootWindow, {
    color: options.color || '#90fcff',
    active: true,
    hp: 1,
    mechanic: 'corner',
    cornerAnchor: anchorAngle,
    cornerBackWindow: backWindow,
    cornerOvershootWindow: overshootWindow,
    cornerPerfectWindow: perfectWindow,
    cornerHitboxExpand: options.hitboxExpand ?? 0.028
  });
}

function buildDualTarget(startAngle, options = {}) {
  const halfSize = options.halfSize ?? 0.068;
  const perfectWindow = options.perfectWindow ?? 0.018;
  const totalSize = halfSize * 2;
  const centerAngle = normalizeAngle(startAngle + halfSize);

  return buildTarget(startAngle, totalSize, {
    color: '#ffffff',
    active: true,
    hp: 1,
    mechanic: 'dual',
    isDual: true,
    angle: centerAngle,
    baseAngle: centerAngle,
    targetHalfWidth: halfSize,
    dualState: 'full',
    dualHits: [false, false],
    dualPerfectWindow: perfectWindow,
    dualSegments: [
      { offset: 0, size: halfSize, color: '#5cf6ff' },
      { offset: halfSize, size: halfSize, color: '#ff5ec8' }
    ]
  });
}

function buildSplitTarget(startAngle, size, options = {}) {
  return buildTarget(startAngle, size, {
    color: options.color || '#b06bff',
    active: true,
    hp: 1,
    mechanic: 'split',
    splitOnHit: true,
    splitDepth: options.splitDepth ?? 0
  });
}

function spawnWorld2MechanicTargets() {
  const corners = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
  const id = levelData.id;

  if (id === '2-1') {
    const cornerIdx = stageHits % 4;
    targets.push(buildCornerPrecisionTarget(corners[cornerIdx], {
      backWindow: 0.135,
      overshootWindow: 0.135,
      perfectWindow: 0.015,
      hitboxExpand: 0.028,
      color: '#90fcff'
    }));
    return;
  }

  if (id === '2-2') {
    const base = (Math.random() * Math.PI * 2);
    targets.push(buildDualTarget(base, {
      halfSize: 0.068,
      perfectWindow: 0.018
    }));
    return;
  }

  if (id === '2-3') {
    const base = (Math.random() * Math.PI * 2);
    targets.push(buildSplitTarget(base, Math.PI / 9, { color: '#b08bff' }));
    return;
  }

  if (id === '2-4') {
    const cornerIdx = stageHits % 4;
    targets.push(buildCornerPrecisionTarget(corners[cornerIdx], { overshootWindow: 0.075, perfectWindow: 0.016, color: '#74f9ff' }));
    if (stageHits % 2 === 0) {
      targets.push(buildDualTarget((corners[(cornerIdx + 1) % 4] + 0.2) % (Math.PI * 2), {
        halfSize: 0.056,
        perfectWindow: 0.016
      }));
    } else {
      targets.push(buildSplitTarget((corners[(cornerIdx + 2) % 4] + 0.15) % (Math.PI * 2), Math.PI / 10, { color: '#c389ff' }));
    }
    return;
  }

  if (id === '2-5') {
    const cornerIdx = (stageHits + 1) % 4;
    targets.push(buildCornerPrecisionTarget(corners[cornerIdx], { backWindow: 0.03, overshootWindow: 0.06, perfectWindow: 0.012, color: '#90fcff' }));
    targets.push(buildDualTarget((corners[(cornerIdx + 1) % 4] + 0.12) % (Math.PI * 2), {
      halfSize: 0.05,
      perfectWindow: 0.014
    }));
    targets.push(buildSplitTarget((corners[(cornerIdx + 3) % 4] - 0.1 + Math.PI * 2) % (Math.PI * 2), Math.PI / 13, { color: '#d97cff' }));
  }
}

function spawnTargets() {
  targets = [];
  const palette = getWorldPalette();
  const worldNum = parseInt(levelData.id.split('-')[0], 10);
  if (levelData.boss === 'aegis') {
    if (!isBossPhaseTwo) {
      ui.text.innerText = bossPhase === 1 ? "BOSS: Break the shields!" : "BOSS ENRAGED: Faster & Sharper!";
      ui.text.style.color = bossPhase === 1 ? "#00e5ff" : "#ff3366";
      let offset = Math.random() * Math.PI * 2;
      const shieldCount = bossPhase === 1 ? 3 : 2;
      for (let i = 0; i < shieldCount; i++) {
        targets.push(buildTarget(
          offset + (i * (Math.PI * 2 / shieldCount)),
          bossPhase === 1 ? Math.PI / 4 : Math.PI / 6,
          {
            color: bossPhase === 1 ? '#00e5ff' : '#ff3366', active: true, hp: 3, isBossShield: true,
            moveSpeed: bossPhase === 1 ? undefined : 0.038 * (i % 2 === 0 ? 1 : -1),
            nextDirectionSwapAt: bossPhase === 1 ? 0 : (performance.now() + 1100 + Math.random() * 900)
          }
        ));
      }
    } else {
      ui.text.innerText = "CORE EXPOSED! Need PERFECT hit!"; ui.text.style.color = "#ffffff";
      targets.push(buildTarget(Math.random() * Math.PI * 2, Math.PI / 10, { color: '#ffffff', active: true, hp: 1 }));
    }
    return;
  }

  if (levelData.boss === 'prism') {
    if (!isBossPhaseTwo) {
      ui.text.innerText = bossPhase === 1
        ? "BOSS: Destroy all 4 corner shields!"
        : "PRISM ENRAGED: Faster corners!";
      ui.text.style.color = bossPhase === 1 ? '#ff00cc' : '#ff3366';
      // 4 shields, one per corner of diamond
      for (let i = 0; i < 4; i++) {
        targets.push(buildTarget(
          (i * Math.PI / 2) + 0.1,
          Math.PI / 6,
          {
            color: bossPhase === 1 ? '#ff00cc' : '#ff3366',
            active: true,
            hp: bossPhase === 1 ? 2 : 1,
            isBossShield: true,
            moveSpeed: bossPhase === 1 ? 0 : 0.035 * (i % 2 === 0 ? 1 : -1)
          }
        ));
      }
    } else {
      ui.text.innerText = "PRISM CORE OPEN — HIT IT!";
      ui.text.style.color = '#ffffff';
      targets.push(buildTarget(
        Math.random() * Math.PI * 2,
        Math.PI / 10,
        {
          color: '#ff00cc',
          active: true,
          hp: 1
        }
      ));
    }
    return;
  }

  if (worldNum === 2 && !levelData.boss && Array.isArray(levelData.mechanics) && levelData.mechanics.length > 0) {
    spawnWorld2MechanicTargets();
    return;
  }

  let tCount = levelData.targets === 'boss' || levelData.targets === 'random' ? Math.floor(Math.random() * 3) + 1 : levelData.targets;
  const isFixedThreeTargetTutorialStage = levelData.id === '1-5' || levelData.fixedTargetCount === true;
  if (tCount === 3 && !isFixedThreeTargetTutorialStage) {
    const patterns = [3, 2, 4];
    tCount = patterns[stageHits % patterns.length];
  }

  let sizeModifier = 1.0;
  if (tCount === 2) sizeModifier = 0.6;
  if (tCount === 3) sizeModifier = 0.5;
  if (tCount === 4) sizeModifier = 0.35;

  let baseSize = Math.max(Math.PI / 10, (Math.PI / 3) - (currentLevelIdx * 0.02)) * sizeModifier;
  let offset = Math.random() * Math.PI * 2;
  const isDual = levelData.mechanics && levelData.mechanics.includes('dual');

  for (let i = 0; i < tCount; i++) {
    const angle = normalizeAngle(offset + (i * (Math.PI * 2 / tCount)) + (baseSize / 2));
    const target = buildTarget(offset + (i * (Math.PI * 2 / tCount)), baseSize, {
      color: worldNum === 2 ? currentWorldVisualTheme.targetColor : (tCount > 1 ? '#ff3366' : palette.primary),
      active: true,
      hp: 1
    });
    target.angle = angle;
    target.baseAngle = angle;
    target.isDual = isDual;
    target.targetHalfWidth = baseSize / 2;
    target.dualState = isDual ? 'full' : 'normal'; // 'full', 'left', 'right', 'normal'
    targets.push(target);
  }
  if (levelData.hasPhantom && !inMenu && !levelData.boss) {
    // Spawn 1 phantom zone offset from real targets
    const realTargetAngle = targets.length > 0
      ? targets[0].start + targets[0].size + (Math.PI * 0.4)
      : Math.random() * Math.PI * 2;
    targets.push(buildTarget(((realTargetAngle) % (Math.PI * 2)), worldNum === 2 ? (Math.PI / 8.6) : (Math.PI / 9), {
      color: '#ff3366',
      active: true,
      isPhantom: true,
      hp: 1
    }));
  }

}

function draw() {
  const palette = currentWorldPalette;
  const theme = currentWorldVisualTheme;
  const worldShape = currentWorldShape;
  const worldNum = parseInt(levelData ? levelData.id.split('-')[0] : '1', 10);
  const railGlowScale = theme.railGlowScale || 1;
  const now = performance.now();
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
    ctx.lineWidth = 16;
    ctx.globalAlpha = (0.055 + Math.abs(Math.sin(now / 1800)) * 0.03) * railGlowScale;
    ctx.shadowBlur = 26 * railGlowScale;
    ctx.shadowColor = theme.railColor || palette.primary;
    ctx.stroke();

    // Mid glow — tighter, slightly brighter
    buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
      orbitRadius, 0, Math.PI * 2, 8);
    ctx.strokeStyle = theme.railColor || palette.primary;
    ctx.lineWidth = 5;
    ctx.globalAlpha = (0.12 + Math.abs(Math.sin(now / 1600)) * 0.025) * railGlowScale;
    ctx.shadowBlur = 14 * railGlowScale;
    ctx.shadowColor = theme.railColor || palette.primary;
    ctx.stroke();

    // Corner hot spots — tiny bright dots at each diamond point,
    // no circles, just a slightly brighter section of the line
    const cornerPoints = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];
    cornerPoints.forEach((cornerAngle, idx) => {
      const span = Math.PI / 14;
      buildShapePath(ctx, 'diamond', centerObj.x, centerObj.y,
        orbitRadius, cornerAngle - span, cornerAngle + span, 6);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.24 + Math.abs(Math.sin(now / 1100 + idx)) * 0.08;
      ctx.shadowBlur = 12;
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
      const centerAngle = (typeof t.angle === 'number') ? t.angle : normalizeAngle(t.start + (t.size / 2));
      const pt = getPointOnShape(centerAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(centerAngle + Math.PI / 2);
      ctx.globalAlpha = 0.98;

      // Left Half (Cyan)
      if (t.dualState === 'full' || t.dualState === 'left') {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 15;
        ctx.fillRect(-16, -8, 16, 16);
      }

      // Right Half (Pink)
      if (t.dualState === 'full' || t.dualState === 'right') {
        ctx.fillStyle = '#ff00cc';
        ctx.shadowColor = '#ff00cc';
        ctx.shadowBlur = 15;
        ctx.fillRect(0, -8, 16, 16);
      }

      // Pure White Perfect Center Stripe
      if (t.dualState === 'full') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.fillRect(-2, -12, 4, 24);
      }

      ctx.restore();
      return;
    }

    if (t.mechanic === 'split' || t.mechanic === 'splitChild') {
      ctx.save();
      buildShapePath(ctx, worldShape, centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = t.color || '#d594ff';
      ctx.globalAlpha = t.mechanic === 'split' ? 0.92 : 0.98;
      ctx.lineWidth = t.mechanic === 'split' ? 3.8 : 2.8;
      ctx.shadowBlur = 10;
      ctx.shadowColor = t.color || '#d594ff';
      ctx.stroke();

      if (t.mechanic === 'split') {
        const crackAngle = t.start + (t.size / 2);
        const crackPt = getPointOnShape(crackAngle, worldShape, centerObj.x, centerObj.y, dynamicRadius);
        ctx.beginPath();
        ctx.moveTo(crackPt.x - 4, crackPt.y - 4);
        ctx.lineTo(crackPt.x + 4, crackPt.y + 4);
        ctx.moveTo(crackPt.x - 4, crackPt.y + 4);
        ctx.lineTo(crackPt.x + 4, crackPt.y - 4);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1.4;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
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

function isInsideTarget(playerAngle, t) {
  const end = t.start + t.size;
  if (end > Math.PI * 2) {
    return playerAngle >= t.start || playerAngle <= (end - Math.PI * 2);
  }
  return playerAngle >= t.start && playerAngle <= end;
}

function showTempText(text, color, duration) {
  ui.text.style.display = 'block';
  ui.text.innerText = text;
  ui.text.style.color = color;
  if (tempTextTimeout) clearTimeout(tempTextTimeout);
  tempTextTimeout = setTimeout(() => {
    ui.text.style.display = 'none';
    ui.text.style.color = '';
  }, duration);
}

function update() {
  if (isCinematicIntro) { requestAnimationFrame(update); return; }
  if (bossIntroPlaying) { draw(); requestAnimationFrame(update); return; }
  if (!isPlaying && !inMenu) { draw(); requestAnimationFrame(update); return; }
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

    if (!inMenu && t.mechanic === 'dual' && t.active && Array.isArray(t.dualHits)) {
      const allSegmentsCleared = t.dualHits.every(Boolean);
      const insideNow = isInsideTarget(angle, t);
      const hasStartedDualChain = t.dualHits.some(Boolean);

      if (!allSegmentsCleared && hasStartedDualChain) {
        if (insideNow) {
          t.dualInsideWindow = true;
        } else if (t.dualInsideWindow && !deferredFailReason) {
          t.dualInsideWindow = false;
          deferredFailReason = 'DUAL TARGET DROPPED';
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
  });

  if (deferredFailReason) {
    handleFail(deferredFailReason);
    draw();
    requestAnimationFrame(update);
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
  draw(); requestAnimationFrame(update);
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
  if (globalCoins >= 50) {
    globalCoins -= 50;
    saveData(); // Save the new balance
    ui.coins.innerText = Math.floor(globalCoins);

    // Flash the screen gold for a premium purchase feel
    canvas.style.boxShadow = 'inset 0 0 100px #ffaa00';
    setTimeout(() => canvas.style.boxShadow = 'none', 300);
    if (audioCtx) playPop(8, true); // Success ding

    // Trigger standard revive logic
    revive();
  } else {
    // Not enough coins! Shake the button and play error sound
    let btn = document.getElementById('coinReviveBtn');
    btn.style.transform = 'translateX(-10px)';
    setTimeout(() => btn.style.transform = 'translateX(10px)', 50);
    setTimeout(() => btn.style.transform = 'translateX(0)', 100);
    if (audioCtx) soundFail();
  }
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
      if (t.dualState === 'left') isHit = diffFromCenter >= -targetHalfWidth && diffFromCenter <= 0;
      else if (t.dualState === 'right') isHit = diffFromCenter >= 0 && diffFromCenter <= targetHalfWidth;
      else isHit = Math.abs(diffFromCenter) <= targetHalfWidth;
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
        const diff = diffFromCenter;
        const perfectThreshold = targetHalfWidth * 0.5;
        if (Math.abs(diff) <= perfectThreshold) hitQuality = "perfect";
        else if (Math.abs(diff) <= targetHalfWidth * 0.68) hitQuality = "good";
        else hitQuality = "ok";
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
      if (t.hp > 0) createPopup(hitX, hitY - 18, `${t.hp} HIT${t.hp > 1 ? 'S' : ''}`, t.color);
      const shieldsLeft = targets.filter(tgt => tgt.isBossShield && tgt.active).length;
      createPopup(centerObj.x, centerObj.y - 80, `SHIELDS ${shieldsLeft}`, "#ffffff");
      if (targets.every(tgt => !tgt.active)) {
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
              createParticles(hitX, hitY, '#00e5ff', 16);
            } else {
              t.dualState = 'left'; // Right side destroyed
              createParticles(hitX, hitY, '#ff00cc', 16);
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
          const pColor = remainingState === 'left' ? '#00e5ff' : '#ff00cc';
          createParticles(hitX, hitY, pColor, 18);
          if (audioCtx) playPop(1, false, true);
          createPopup(hitX, hitY - 22, "LINKED", "#00ff88");
        } else {
          // STANDARD TARGET
          t.dualState = 'cleared';
          t.active = false;
          createParticles(hitX, hitY, '#00ff88', 20);
          if (audioCtx) playPop(1, false, true);
        }
      }
    } else if ((t.mechanic === 'split' || t.mechanic === 'splitChild') && t.splitOnHit) {
      t.active = false;
      const nextDepth = (t.splitDepth || 0) + 1;
      if (nextDepth <= 2) {
        const splitGap = nextDepth === 1 ? 0.05 : 0.03;
        const childSize = Math.max(Math.PI / 34, t.size * 0.48);
        targets.push(buildTarget(normalizeAngle(t.start - splitGap), childSize, {
          color: '#d594ff',
          active: true,
          hp: 1,
          mechanic: 'splitChild',
          splitOnHit: nextDepth < 2,
          splitDepth: nextDepth
        }));
        targets.push(buildTarget(normalizeAngle(t.start + t.size - childSize + splitGap), childSize, {
          color: '#8df8ff',
          active: true,
          hp: 1,
          mechanic: 'splitChild',
          splitOnHit: nextDepth < 2,
          splitDepth: nextDepth
        }));
        createPopup(hitX, hitY - 32, nextDepth === 1 ? "SPLIT!" : "SHATTER!", "#d594ff");
        createShockwave('#d594ff', 26);
        createShockwave('#8df8ff', 20);
      }
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

function triggerStageClear() {
  stageHits++;
  updateWaveUI(); 
  
  if (stageHits >= levelData.hitsNeeded) {
    const wasBoss = !!levelData.boss;
    const nextLevelIdx = currentLevelIdx + 1;
    const nextLevelObj = campaign[nextLevelIdx] || null;
    const currentWorld = parseInt(levelData.id.split('-')[0], 10);
    const nextWorld = nextLevelObj ? parseInt(nextLevelObj.id.split('-')[0], 10) : null;
    const worldAdvanced = !!nextLevelObj && nextWorld > currentWorld;
    const campaignComplete = !nextLevelObj;

    if (nextWorld && nextWorld > maxWorldUnlocked) { maxWorldUnlocked = nextWorld; saveData(); }

    if (wasBoss || worldAdvanced || campaignComplete) {
      showWorldClearSequence({
        nextLevelIdx: nextLevelObj ? nextLevelIdx : null,
        nextWorld: nextWorld || currentWorld,
        coinsEarned: Math.floor(runCents / 10),
        isCampaignClear: campaignComplete
      });
    } else {
      // SEAMLESS TRANSITION! (Keep playing, flash the screen, load next wave)
      soundWaveClear();
      const worldNum = parseInt(levelData.id.split('-')[0], 10);
      const waveClearColor = worldNum === 2 ? '#ff4fd8' : '#00ff88';
      const waveClearAftershockColor = worldNum === 2 ? '#c68cff' : '#ffffff';
      const wavePopup = createPopup(centerObj.x, centerObj.y - orbitRadius - 28, "WAVE CLEARED!", waveClearColor);
      wavePopup.animType = 'combo';
      wavePopup.life = 1.85;
      wavePopup.riseSpeed = 0.8;
      wavePopup.fadeSpeed = 0.018;
      wavePopup.shadow = 28;
      createParticles(centerObj.x, centerObj.y, waveClearColor, Math.min(54, MAX_PARTICLES));
      createUpwardBurstParticles(centerObj.x, centerObj.y + 10, waveClearAftershockColor, 32);
      createUpwardBurstParticles(centerObj.x, centerObj.y + 4, waveClearColor, 34);
      triggerScreenShake(8);
      
      // Triple pulse with a lightweight cap-safe finish.
      createShockwave(waveClearColor, 35); // Main heavy neon wave
      setTimeout(() => createShockwave(waveClearAftershockColor, 45), 100); // Faster aftershock
      setTimeout(() => createShockwave(waveClearColor, 52), 180); // Extra celebration pop
      if (typeof vibrate === 'function') vibrate([28, 28, 42, 20, 70]); // Stronger double-thump

      // Briefly flash the screen to match world identity
      canvas.style.boxShadow = `inset 0 0 50px ${waveClearColor}`; 
      setTimeout(() => canvas.style.boxShadow = 'none', 150);

      stageClearHoldUntil = performance.now() + 850;

      currentLevelIdx = nextLevelIdx;
      loadLevel(currentLevelIdx);
    }
  } else { 
    spawnTargets(); 
  }
}

function startCampaign() {
  initAudio(); // Initialize sound engine on first interaction
  toggleSettings(false);
  ui.mainMenu.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
  ui.text.style.display = 'none';
  inMenu = false; isPlaying = true; currentLevelIdx = getStartingIndexForWorld(menuSelectedWorld);
  resetRunState();
  ui.score.innerText = '0';
  ui.streak.innerText = '0';
  markScoreCoinDirty(true);
  setOverlayState('cinematic');
  loadLevel(currentLevelIdx);
}

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
}

function returnToMenu() {
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

function changeWorld(dir) {
  menuSelectedWorld += dir;
  if (menuSelectedWorld < 1) menuSelectedWorld = 1;
  if (menuSelectedWorld > maxWorldUnlocked) menuSelectedWorld = maxWorldUnlocked;
  updateWorldSelectorUI();
  refreshMenuWorldPreview();
}

function updateWorldSelectorUI() {
  let label = document.getElementById('menuWorldLabel');
  if (label) {
    label.innerText = "WORLD " + menuSelectedWorld;
    label.style.color = (menuSelectedWorld === 2) ? '#ff00cc' : '#00ff88'; // Matches world themes!
  }
}

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
  setTimeout(() => {
    let tallyInterval = setInterval(() => {
      // Increment by a dynamic amount so it finishes in ~20 ticks
      let increment = Math.max(1, Math.ceil(coinsEarned / 20));
      currentDisplayCoins += increment;

      if (currentDisplayCoins >= coinsEarned) {
        currentDisplayCoins = coinsEarned;
        clearInterval(tallyInterval);

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

document.addEventListener('touchstart', (e) => { if (e.target.tagName !== 'BUTTON') { e.preventDefault(); tap(); } }, { passive: false });
document.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'BUTTON') tap(); });

levelData = campaign[0]; spawnTargets(); updateShopUI(); menuSelectedWorld = maxWorldUnlocked; updateWorldSelectorUI(); refreshMenuWorldPreview(); requestAnimationFrame(update);
