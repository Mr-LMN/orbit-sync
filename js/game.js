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
  shopCoinCount: document.getElementById('shopCoinCount'), streak: document.getElementById('streakCount'),
  wave: document.getElementById('waveDisplay'), bossUI: document.getElementById('bossUI'),
  bossPhase1: document.getElementById('bossPhase1'), bossPhase2: document.getElementById('bossPhase2')
};

// --- SENSORY FEEDBACK (Audio & Haptics) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let bossDrone = null;
let bossDroneGain = null;

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

// Utility — plays a single oscillator burst
function playTone(freq, type, vol, attack, decay, startTime) {
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

function startBossDrone() {
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
  const t = audioCtx.currentTime;
  playTone(180, 'triangle', 0.18, 0.005, 0.12, t);
  playTone(90, 'sine', 0.1, 0.005, 0.15, t);
}

// GOOD hit — clean mid punch
function soundGood(multiplier) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const baseFreq = 300 + (multiplier * 30);
  playTone(baseFreq, 'triangle', 0.22, 0.004, 0.1, t);
  playTone(baseFreq * 1.5, 'sine', 0.1, 0.004, 0.14, t);
}

// PERFECT hit — bright ting with reverb tail
function soundPerfect(multiplier) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const baseFreq = 520 + (multiplier * 40);

  // Main ting
  playTone(baseFreq, 'sine', 0.25, 0.002, 0.08, t);
  // Harmonic overtone
  playTone(baseFreq * 2, 'sine', 0.12, 0.002, 0.18, t);
  // Shimmer tail
  playTone(baseFreq * 3, 'sine', 0.06, 0.005, 0.35, t);
}

// Multiplier milestone sounds (x2 through x8)
// Each level plays a rising musical note
const multiNotes = [0, 0, 262, 294, 330, 370, 415, 466, 523];
function soundMultiplierUp(multiplier) {
  if (!audioCtx || multiplier < 2) return;
  const t = audioCtx.currentTime;
  const freq = multiNotes[Math.min(multiplier, 8)];
  playTone(freq, 'sine', 0.2, 0.005, 0.2, t);
  playTone(freq * 1.5, 'sine', 0.08, 0.005, 0.25, t);
}

// Miss/fail — descending crunch
function soundFail() {
  if (!audioCtx) return;
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
  const t = audioCtx.currentTime;
  playTone(160, 'sawtooth', 0.2, 0.005, 0.15, t);
  playTone(120, 'sawtooth', 0.15, 0.01, 0.2, t + 0.1);
}

// Stage/wave clear — 3 note ascending arpeggio
function soundWaveClear() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [330, 415, 523].forEach((freq, i) => {
    playTone(freq, 'sine', 0.2, 0.005, 0.15, t + i * 0.1);
    playTone(freq * 2, 'sine', 0.06, 0.005, 0.2, t + i * 0.1);
  });
}

// World clear — full 5 note fanfare
function soundWorldClear() {
  if (!audioCtx) return;
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
  const t = audioCtx.currentTime;
  // Noise burst (white noise approximation)
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = makeGain(0.001);
  noise.connect(noiseGain);
  noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.start(t);
  // Metallic tone underneath
  playTone(120, 'sawtooth', 0.2, 0.005, 0.25, t);
  playTone(80, 'sine', 0.25, 0.005, 0.4, t);
}

// Boss defeated — dramatic descending + resolution
function soundBossDefeated() {
  if (!audioCtx) return;
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
  const t = audioCtx.currentTime;
  [523, 659, 784].forEach((freq, i) => {
    playTone(freq, 'sine', 0.12, 0.005, 0.2, t + i * 0.08);
  });
}

// Life gained — warm positive sting
function soundLifeGained() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playTone(523, 'sine', 0.2, 0.005, 0.1, t);
  playTone(659, 'sine', 0.2, 0.005, 0.1, t + 0.1);
  playTone(784, 'sine', 0.22, 0.005, 0.25, t + 0.2);
}

// UI button click — subtle tick
function soundUIClick() {
  if (!audioCtx) return;
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

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// --- SAVE SYSTEM ---
let globalCoins = parseInt(localStorage.getItem('orbitSync_coins')) || 0;
let unlockedSkins = JSON.parse(localStorage.getItem('orbitSync_unlocks')) || ['classic'];
let activeSkin = localStorage.getItem('orbitSync_equipped') || 'classic';
let maxWorldUnlocked = parseInt(localStorage.getItem('orbitSync_maxWorld')) || 1;
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

ui.coins.innerText = Math.floor(globalCoins); ui.shopCoinCount.innerText = Math.floor(globalCoins);

// --- GAME VARIABLES ---
let currentLevelIdx = 0; let levelData;
let score = 0; let stageHits = 0; let runCents = 0;
let angle = 0; let direction = 1; let isPlaying = false; let inMenu = true;
let bossIntroPlaying = false;
let lives = 3; let multiplier = 1; let streak = 0; let distanceTraveled = 0; let totalStageDistance = 0;
let isBossPhaseTwo = false; let bossPhase = 1;
let currentReviveCost = 50;
let reviveCount = 0;
let scoreAtCheckpoint = 0;
let scoreAtLevelStart = 0;
let lifeZonesSpawnedThisRun = 0;
let ringHitFlash = 0;
let perfectFlash = 0;
let hitFlashColor = '#00ff88';
let tempTextTimeout = null;

let targets = []; let particles = []; let popups = []; let trail = []; let shockwaves = []; let bgDust = [];
let targetHitRipples = [];

const size = Math.min(window.innerWidth, window.innerHeight);
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const centerObj = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const orbitRadius = Math.min(window.innerWidth, window.innerHeight) * 0.28;
const multiColors = ['#ffffff', '#00e5ff', '#00ff88', '#ffea00', '#ffaa00', '#ff3366', '#b300ff', '#ff00ff'];

function getWorldPalette() {
  const worldNum = parseInt(levelData ? levelData.id.split('-')[0] : '1');
  if (levelData && levelData.boss) return { primary: '#ffffff', secondary: '#ff3366', bg: '#1a0000' };
  switch (worldNum) {
    case 1: return { primary: '#00e5ff', secondary: '#00ff88', bg: '#050508' };
    case 2: return { primary: '#ff00cc', secondary: '#cc00ff', bg: '#0a0008' };
    case 3: return { primary: '#ffaa00', secondary: '#ff6600', bg: '#080500' };
    default: return { primary: '#00ff88', secondary: '#00e5ff', bg: '#050508' };
  }
}

// Generate subtle background dust for depth
for (let i = 0; i < 75; i++) {
  bgDust.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    size: Math.random() * 1.5 + 0.5,
    speed: Math.random() * 0.2 + 0.05,
    opacity: Math.random() * 0.4 + 0.1
  });
}

document.getElementById('menuBtn').onclick = returnToMenu;

function toggleShop(show) { ui.shopModal.style.bottom = show ? '0' : '-100%'; updateShopUI(); }
function updateShopUI() {
  ui.shopCoinCount.innerText = Math.floor(globalCoins);
  const items = ['classic', 'skull', 'fire'];
  items.forEach(id => {
    let btn = document.getElementById('btn-' + id); let card = document.getElementById('item-' + id);
    if (activeSkin === id) { btn.className = 'buy-btn btn-equipped'; btn.innerText = 'Equipped'; card.classList.add('equipped'); }
    else if (unlockedSkins.includes(id)) { btn.className = 'buy-btn btn-owned'; btn.innerText = 'Equip'; card.classList.remove('equipped'); btn.onclick = () => equipSkin(id); }
    else { card.classList.remove('equipped'); }
  });
}
function buyItem(id, cost) { if (globalCoins >= cost) { globalCoins -= cost; unlockedSkins.push(id); saveData(); equipSkin(id); } else { alert("Not enough coins! Play the campaign to earn more."); } }
function equipSkin(id) { activeSkin = id; saveData(); updateShopUI(); }

function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    const length = Math.random() * 10 + 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      length,
      life: 1.0,
      color
    });
  }
}
function createPopup(x, y, text, color, hitQuality = null) { popups.push({ x: x, y: y, text: text, color: color, life: 1.0, hitQuality }); }
function createShockwave(color, speed = 40) {
  shockwaves.push({ radius: orbitRadius * 0.15, opacity: 1.0, color: color, width: 5, speed: speed });
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
  ui.multiplierCount.innerText = multiplier;

  if (multiplier <= 1) {
    ui.bigMultiplier.style.display = 'none';
    return;
  } else {
    ui.bigMultiplier.style.display = 'block';
  }

  let mColor = multiColors[Math.min(multiplier - 1, 7)];
  ui.bigMultiplier.style.color = mColor;
  ui.bigMultiplier.style.textShadow = `0 0 20px ${mColor}`;
  // Add a quick pop animation
  ui.bigMultiplier.style.transform = "translateY(-50%) scale(1.3)";
  setTimeout(() => ui.bigMultiplier.style.transform = "translateY(-50%) scale(1)", 150);
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

  const introText = "AEGIS CORE ONLINE";
  let displayed = "";
  let i = 0;

  canvas.style.boxShadow = "inset 0 0 80px #ff3366";
  setTimeout(() => canvas.style.boxShadow = "none", 200);

  const typeInterval = setInterval(() => {
    displayed += introText[i];
    ui.text.innerText = displayed;
    ui.text.style.color = "#ff3366";
    ui.text.style.letterSpacing = "6px";
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

function loadLevel(idx) {
  scoreAtLevelStart = score;
  levelData = campaign[idx] || campaign[campaign.length - 1];
  stageHits = 0; distanceTraveled = 0; totalStageDistance = 0; trail = [];
  isBossPhaseTwo = false; bossPhase = 1;

  ui.stage.innerText = `Stage ${levelData.id}`; ui.text.innerText = levelData.text;
  ui.lives.innerText = lives; ui.streak.innerText = streak;
  updateMultiplierUI();
  updateWaveUI();
  spawnTargets();

  if (levelData.boss) {
    setTimeout(() => {
      triggerBossIntro();
      startBossDrone();
    }, 200);
  } else {
    stopBossDrone();
  }
}

function spawnTargets() {
  targets = [];
  const palette = getWorldPalette();
  if (levelData.boss === 'aegis') {
    if (!isBossPhaseTwo) {
      ui.text.innerText = bossPhase === 1 ? "BOSS: Break the shields!" : "BOSS ENRAGED: Faster & Unpredictable!";
      ui.text.style.color = bossPhase === 1 ? "#00e5ff" : "#ff3366";
      let offset = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        targets.push({
          start: offset + (i * (Math.PI * 2 / 3)), size: bossPhase === 1 ? Math.PI / 4 : Math.PI / 6,
          color: bossPhase === 1 ? '#00e5ff' : '#ff3366', active: true, hp: 3, isBossShield: true,
          moveSpeed: bossPhase === 1 ? undefined : 0.045 * (Math.random() > 0.5 ? 1 : -1)
        });
      }
    } else {
      ui.text.innerText = "CORE EXPOSED! Need PERFECT hit!"; ui.text.style.color = "#ffffff";
      targets.push({ start: Math.random() * Math.PI * 2, size: Math.PI / 10, color: '#ffffff', active: true, hp: 1 });
    }
    return;
  }

  let tCount = levelData.targets === 'boss' || levelData.targets === 'random' ? Math.floor(Math.random() * 3) + 1 : levelData.targets;
  if (tCount === 3) { const patterns = [3, 2, 4]; tCount = patterns[stageHits % patterns.length]; }

  let sizeModifier = 1.0;
  if (tCount === 2) sizeModifier = 0.6;
  if (tCount === 3) sizeModifier = 0.5;
  if (tCount === 4) sizeModifier = 0.35;

  let baseSize = Math.max(Math.PI / 10, (Math.PI / 3) - (currentLevelIdx * 0.02)) * sizeModifier;
  let offset = Math.random() * Math.PI * 2;

  for (let i = 0; i < tCount; i++) { targets.push({ start: offset + (i * (Math.PI * 2 / tCount)), size: baseSize, color: tCount > 1 ? '#ff3366' : palette.primary, active: true, hp: 1 }); }
  if (levelData.hasHeart && !inMenu && !levelData.boss) {
    // No life zones during boss fights at all
    // Diminishing returns: each spawn reduces future probability
    const baseProbability = lives === 1 ? 0.85 : lives === 2 ? 0.4 : 0.15;
    const diminishingFactor = Math.pow(0.5, lifeZonesSpawnedThisRun);
    const finalChance = baseProbability * diminishingFactor;

    // Hard cap at 4 life zones per run
    if (lifeZonesSpawnedThisRun < 4 && Math.random() < finalChance) {
      lifeZonesSpawnedThisRun++;
      targets.push({
        start: Math.random() * Math.PI * 2,
        size: Math.PI / 10,
        color: '#ffaa00',
        active: true,
        isHeart: true,
        expireDistance: Math.PI * 5,
        isLifeZone: true
      });
      setTimeout(() => soundLifeZone(), 100);
    }
  }
}

function draw() {
  const palette = getWorldPalette();
  const now = performance.now();
  // BACKGROUND
  let isBoss = levelData && levelData.boss;

  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ambient background dust
  bgDust.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255, ${d.opacity})`;
    ctx.fill();

    let speedMult = isBoss ? 3.5 : 1;
    d.y -= (inMenu ? d.speed * 2 : d.speed) * speedMult;
    if (d.y < 0) { d.y = canvas.height; d.x = Math.random() * canvas.width; }
  });

  // ENERGY LANE
  // 1) Dark groove
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.stroke();

  // 2) Crisp glowing line
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = palette.primary;
  ctx.shadowBlur = 15;
  ctx.shadowColor = palette.primary;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  const orbColor = multiColors[Math.min(multiplier - 1, 7)];

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
    const bodyWidth = Math.max(4, Math.min(8, orbitRadius * 0.018));
    const glowWidth = bodyWidth + 4;
    const housingWidth = glowWidth + 4;

    if (t.isLifeZone) {
      ctx.save();
      // Pulsing gold arc — same style as targets but amber/gold
      const lifePulse = 0.7 + Math.abs(Math.sin(Date.now() / 400)) * 0.3;

      // Glow layer
      ctx.beginPath();
      ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffaa00';
      ctx.globalAlpha = (0.28 + approach * 0.18) * lifePulse;
      ctx.lineWidth = 10;
      ctx.lineCap = 'butt';
      ctx.shadowBlur = 40 + (approach * 10);
      ctx.shadowColor = '#ffaa00';
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.86 + (approach * 0.12);
      ctx.lineWidth = 4 + (approach * 0.8);
      ctx.shadowBlur = 20 + (approach * 8);
      ctx.shadowColor = '#ffaa00';
      ctx.stroke();

      // Small + symbol at centre of arc
      const midAngle = t.start + t.size / 2;
      const lx = centerObj.x + Math.cos(midAngle) * dynamicRadius;
      const ly = centerObj.y + Math.sin(midAngle) * dynamicRadius;
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

    ctx.save();

    // --- ACTIVE TARGET HOUSING (subtle dark cradle behind gate) ---
    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = 'rgba(5, 10, 18, 0.9)';
    ctx.globalAlpha = 0.74 + (approach * 0.08);
    ctx.lineWidth = housingWidth;
    ctx.lineCap = 'butt';
    ctx.shadowBlur = 0;
    ctx.stroke();

    // --- ACTIVE TARGET BODY (glow + crisp core for timing window readability) ---
    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = (0.22 + approach * 0.32 + hitFlash * 0.22) * pulse;
    ctx.lineWidth = glowWidth + (approach * 1.5) + (hitFlash * 1.2);
    ctx.shadowBlur = 16 + (approach * 18) + (hitFlash * 14);
    ctx.shadowColor = t.color;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, 0.84 + (approach * 0.14) + (hitFlash * 0.3));
    ctx.lineWidth = bodyWidth + (approach * 0.8) + (hitFlash * 0.9);
    ctx.shadowBlur = 10 + (approach * 12) + (hitFlash * 16);
    ctx.shadowColor = t.color;
    ctx.stroke();

    if (hitFlash > 0.02) {
      ctx.beginPath();
      ctx.arc(centerObj.x, centerObj.y, dynamicRadius, t.start, t.start + t.size);
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.min(0.95, hitFlash * 0.85);
      ctx.lineWidth = bodyWidth + 2.8;
      ctx.shadowBlur = 22;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();
    }

    // --- MIDPOINT MARKER (ideal precision hit cue) ---
    const markerSpan = Math.min(t.size * 0.25, 0.055);
    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, dynamicRadius, tCenter - markerSpan, tCenter + markerSpan);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, 0.82 + (approach * 0.15) + (hitFlash * 0.2));
    ctx.lineWidth = bodyWidth + 1 + (approach * 0.5);
    ctx.lineCap = 'round';
    ctx.shadowBlur = 14;
    ctx.shadowColor = t.color;
    ctx.stroke();

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
      ctx.shadowColor = t.color;
      ctx.stroke();
    };

    drawBracketTick(t.start);
    drawBracketTick(t.start + t.size);
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
      ctx.shadowBlur = 10 * life;
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
      ctx.shadowBlur = 30;
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
    ctx.shadowBlur = 12;
    ctx.shadowColor = ripple.color;
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // PLAYER ORB
  const x = centerObj.x + Math.cos(angle) * orbitRadius;
  const y = centerObj.y + Math.sin(angle) * orbitRadius;

  if (activeSkin === 'skull') {
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', x, y);
  } else if (activeSkin === 'fire') {
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', x, y);
  } else {
    const tangent = angle + (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    const size = 12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tangent);

    // Outer glow
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, size * 0.7);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.6, size * 0.7);
    ctx.closePath();
    ctx.fillStyle = orbColor;
    ctx.globalAlpha = 0.3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = orbColor;
    ctx.fill();

    // Core shape
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, size * 0.7);
    ctx.lineTo(0, size * 0.3);
    ctx.lineTo(-size * 0.6, size * 0.7);
    ctx.closePath();
    ctx.fillStyle = orbColor;
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 15;
    ctx.shadowColor = orbColor;
    ctx.fill();

    ctx.restore();
  }
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;

  // Hit polish pulse (visual only)
  if (ringHitFlash > 0.01) {
    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hitFlashColor;
    ctx.globalAlpha = Math.min(0.4, ringHitFlash);
    ctx.lineWidth = 7 + (ringHitFlash * 6);
    ctx.shadowBlur = 16;
    ctx.shadowColor = hitFlashColor;
    ctx.stroke();
  }
  if (perfectFlash > 0.01) {
    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, orbitRadius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = Math.min(0.32, perfectFlash);
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
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
      particles.splice(i, 1);
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(p.angle) * p.length * p.life, p.y - Math.sin(p.angle) * p.length * p.life);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    }
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    let pop = popups[i];
    pop.y -= 1;
    pop.life -= 0.02;
    if (pop.life <= 0) {
      popups.splice(i, 1);
    } else {
      ctx.fillStyle = pop.color;
      ctx.globalAlpha = pop.life;
      ctx.font = pop.hitQuality === 'perfect' ? 'bold 1.6rem Orbitron' : 'bold 1rem Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(pop.text, pop.x, pop.y);
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
  if (bossIntroPlaying) { draw(); requestAnimationFrame(update); return; }

  let moveStep = (inMenu ? 0.02 : levelData.speed) * direction;
  if (levelData.boss && isBossPhaseTwo && !inMenu) moveStep *= 1.3;

  angle += moveStep;
  if (!inMenu) { distanceTraveled += Math.abs(moveStep); totalStageDistance += Math.abs(moveStep); }

  const x = centerObj.x + Math.cos(angle) * orbitRadius; const y = centerObj.y + Math.sin(angle) * orbitRadius;
  trail.push({ x: x, y: y }); if (trail.length > multiplier * 4) trail.shift();

  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;

  if (!inMenu && levelData.boss && !isBossPhaseTwo && Math.random() < 0.02) { triggerScreenShake(3); }

  targets.forEach(t => {
    if (t.active) {
      if (t.hitFlash) t.hitFlash *= 0.76;
      if (t.hitFlash && t.hitFlash < 0.02) t.hitFlash = 0;
      if (t.hitScalePulse) t.hitScalePulse *= 0.42;
      if (t.hitScalePulse && t.hitScalePulse < 0.02) t.hitScalePulse = 0;

      if (t.isHeart && totalStageDistance > t.expireDistance) {
        t.active = false; createParticles(centerObj.x + Math.cos(t.start) * orbitRadius, centerObj.y + Math.sin(t.start) * orbitRadius, '#555', 10);
      }
      let currentMoveSpeed = t.moveSpeed !== undefined ? t.moveSpeed : (inMenu ? 0.01 : levelData.moveSpeed);
      if (!inMenu && t.isBossShield && bossPhase === 2 && Math.random() < 0.015) { t.moveSpeed *= -1; }

      if (currentMoveSpeed !== 0) {
        t.start += currentMoveSpeed;
        if (t.start > Math.PI * 2) t.start -= Math.PI * 2;
        if (t.start < 0) t.start += Math.PI * 2;
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
    }
  });

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
  lives--; ui.lives.innerText = lives; distanceTraveled = 0; multiplier = 1; updateMultiplierUI();
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
    const newRecords = checkAndSavePB(score, streak);
    isPlaying = false; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
    let coinsToBank = Math.floor(runCents / 10); globalCoins += coinsToBank; saveData(); ui.coins.innerText = Math.floor(globalCoins);
    updatePBDisplay(newRecords);
    glitchCanvas(400, () => {
      ui.overlay.style.display = 'flex';
      ui.title.style.color = '#ff3366';
      ui.subtitle.innerText = `Failed on ${levelData.title}`;
      scrambleText(ui.title, reason || "OUT OF SYNC", 600);
    });
    ui.btn.innerText = `Restart World ${levelData.id.split('-')[0]}`; ui.btn.onclick = restartFromCheckpoint; ui.runCoins.innerText = coinsToBank;

    // --- NEW REVIVE LOGIC ---
    let reviveBtn = document.getElementById('reviveBtn');
    reviveBtn.style.display = 'block';
    reviveBtn.innerText = `Revive (🪙 ${currentReviveCost})`;
    reviveBtn.onclick = function() {
      if (globalCoins >= currentReviveCost) {
        globalCoins -= currentReviveCost; saveData(); ui.coins.innerText = Math.floor(globalCoins);
        currentReviveCost *= 2; // Double the cost for the next time!
        reviveCount++;
        score = scoreAtLevelStart; // reset score to what it was when this level started
        ui.score.innerText = score;
        lives = 3; ui.overlay.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
        if (levelData.boss) ui.bossUI.style.display = 'flex';
        runCents = 0; loadLevel(currentLevelIdx); isPlaying = true;
      } else {
        alert("Not enough coins for a Revive! Restart the World.");
      }
    };
  }
}

function tap() {
  initAudio(); // Ensures audio wakes up on iOS/Safari
  if (inMenu || ui.overlay.style.display === 'flex') return;
  if (!isPlaying) { isPlaying = true; showTempText("Syncing...", "#00e5ff", 1000); return; }

  let hitIndex = -1; let hitQuality = "miss";

  for (let i = 0; i < targets.length; i++) {
    if (!targets[i].active) continue;
    let endAngle = targets[i].start + targets[i].size; let tCenter = targets[i].start + (targets[i].size / 2);
    let isHit = (endAngle > Math.PI * 2) ? (angle >= targets[i].start || angle <= (endAngle - Math.PI * 2)) : (angle >= targets[i].start && angle <= endAngle);

    if (isHit) {
      hitIndex = i; let dist = Math.abs(angle - tCenter);
      if (dist < targets[i].size / 6) hitQuality = "perfect";
      else if (dist < targets[i].size / 3) hitQuality = "good";
      else hitQuality = "ok"; break;
    }
  }

  const hitX = centerObj.x + Math.cos(angle) * orbitRadius; const hitY = centerObj.y + Math.sin(angle) * orbitRadius;

  if (hitIndex !== -1) {
    let t = targets[hitIndex];
    triggerTargetHitFeedback(t, hitX, hitY);
    if (levelData.reverse !== false) direction *= -1;
    distanceTraveled = 0;
    hitFlashColor = t.color || '#00ff88';
    ringHitFlash = Math.max(ringHitFlash, 0.26);

    if (t.isHeart) {
      t.active = false; lives = Math.min(lives + 1, 3); ui.lives.innerText = lives;
      perfectFlash = Math.max(perfectFlash, 0.12);
      createPopup(hitX, hitY - 40, "+1 LIFE!", "#ff3366"); createParticles(hitX, hitY, '#ff3366', 30);
      soundLifeGained();
      vibrate([20, 10, 40]);
      if (targets.filter(tgt => !tgt.isHeart).every(tgt => !tgt.active)) { triggerStageClear(); }
      return;
    }

    if (levelData.boss && !isBossPhaseTwo) {
      t.hp--; triggerScreenShake(4);
      if (t.hp === 2) t.color = '#ffaa00'; if (t.hp === 1) t.color = '#ff3366'; if (t.hp <= 0) { t.active = false; soundShieldBreak(); }
      createParticles(hitX, hitY, t.color, 10);
      if (targets.every(tgt => !tgt.active)) {
        isBossPhaseTwo = true;
        if (bossPhase === 1) ui.bossPhase1.className = "boss-segment";
        else ui.bossPhase2.className = "boss-segment";
        createPopup(centerObj.x, centerObj.y - 50, "CORE EXPOSED!", "#ffffff"); triggerScreenShake(15); setTimeout(spawnTargets, 500);
      } return;
    }

    t.active = false;

    if (levelData.boss && isBossPhaseTwo) {
      // Allow ANY hit inside the core window (perfect, good, or ok) to count!
      if (hitQuality === "perfect" || hitQuality === "good" || hitQuality === "ok") {
        if (bossPhase === 1) {
          bossPhase = 2; isBossPhaseTwo = false; multiplier = 1; streak = 0; ui.streak.innerText = streak; updateMultiplierUI();
          createParticles(centerObj.x, centerObj.y, '#ff3366', 50); createPopup(centerObj.x, centerObj.y - 50, "ENRAGED!", "#ff3366");
          escalateBossDrone();
          triggerScreenShake(20); setTimeout(spawnTargets, 500); return;
        } else {
          ui.bossPhase2.className = "boss-segment";
          createParticles(centerObj.x, centerObj.y, '#ffffff', 50); createPopup(centerObj.x, centerObj.y - 50, "BOSS DEFEATED!", "#00ff88");
          soundBossDefeated();
          triggerScreenShake(20); stageHits = 999;
        }
      } else {
        multiplier = 1; streak = 0; ui.streak.innerText = streak; updateMultiplierUI();
        createPopup(centerObj.x, centerObj.y - 50, "REGENERATING...", "#ffaa00");
        if (bossPhase === 1) ui.bossPhase1.className = "boss-segment active-segment";
        else ui.bossPhase2.className = "boss-segment active-segment";
        triggerScreenShake(10); isBossPhaseTwo = false; setTimeout(spawnTargets, 500); return;
      }
    }

    if (hitQuality === "perfect" && currentLevelIdx >= 2) {
      perfectFlash = Math.max(perfectFlash, 0.34);
      ringHitFlash = Math.max(ringHitFlash, 0.34);
      multiplier = Math.min(multiplier + 1, 8);
      soundMultiplierUp(multiplier);
      score += (3 * multiplier);
      createPopup(hitX, hitY - 20, "PERFECT!", multiColors[multiplier - 1], 'perfect');
      canvas.style.filter = 'brightness(1.8)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 80);
      soundPerfect(multiplier);
      vibrate([10, 20, 10]);
    }
    else if (hitQuality === "good") {
      ringHitFlash = Math.max(ringHitFlash, 0.26);
      score += (2 * multiplier); createPopup(hitX, hitY - 20, "GOOD", "#fff");
      canvas.style.filter = 'brightness(1.4)';
      setTimeout(() => canvas.style.filter = 'brightness(1)', 60);
      soundGood(multiplier);
      vibrate(20);
    }
    else {
      ringHitFlash = Math.max(ringHitFlash, 0.2);
      multiplier = 1; score += 1; createPopup(hitX, hitY - 20, "OK", "#aaa");
      soundOk();
      vibrate(15);
    }

    streak++; ui.streak.innerText = streak;

    let centsEarned = (hitQuality === "perfect" ? 3 : hitQuality === "good" ? 2 : 1) * multiplier;
    runCents += centsEarned; ui.score.innerText = score; ui.coins.innerText = Math.floor(globalCoins + (runCents / 10));
    updateMultiplierUI();
    createParticles(hitX, hitY, t.color);

    if (targets.filter(tgt => !tgt.isHeart).every(tgt => !tgt.active) || stageHits >= levelData.hitsNeeded) {
      triggerStageClear();
    }
  } else { handleFail("MISSED"); }
}

function triggerStageClear() {
  stageHits++;
  updateWaveUI(); 
  
  if (stageHits >= levelData.hitsNeeded) {
    // Check if the level we JUST beat was a Boss
    let wasBoss = levelData.boss ? true : false;
    
    currentLevelIdx++;
    let currentLevelObj = campaign[currentLevelIdx];
    let newWorld = currentLevelObj ? parseInt(currentLevelObj.id.split('-')[0]) : maxWorldUnlocked;
    if (newWorld > maxWorldUnlocked) { maxWorldUnlocked = newWorld; saveData(); }

    if (wasBoss || !currentLevelObj) {
      if (wasBoss) stopBossDrone();
      const newRecords = wasBoss ? checkAndSavePB(score, streak) : { score: false, streak: false, world: false };
      soundWorldClear();
      // WORLD CLEARED! (Pause the game and show the Win Screen)
      isPlaying = false;
      let coinsToBank = Math.floor(runCents / 10); globalCoins += coinsToBank; saveData(); ui.coins.innerText = Math.floor(globalCoins);
      updatePBDisplay(newRecords);

      ui.overlay.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
      ui.title.innerText = "WORLD CLEARED!"; ui.title.style.color = '#00ff88'; ui.subtitle.innerText = `Coins Earned: ${coinsToBank}`;
      
      // Hide revive button if it's there
      let reviveBtn = document.getElementById('reviveBtn');
      if (reviveBtn) reviveBtn.style.display = 'none';
      
      ui.btn.innerText = "Next World";
      ui.btn.onclick = function () {
        ui.overlay.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
        runCents = 0; loadLevel(currentLevelIdx); isPlaying = true;
      };
      ui.runCoins.innerText = ""; runCents = 0;
      
    } else {
      // SEAMLESS TRANSITION! (Keep playing, flash the screen, load next wave)
      soundWaveClear();
      createPopup(centerObj.x, centerObj.y - 50, "WAVE CLEARED!", "#00ff88");
      createParticles(centerObj.x, centerObj.y, '#00ff88', 50);
      triggerScreenShake(8);
      
      // NEW: The Double-Pulse Shockwave & Haptics
      createShockwave('#00ff88', 35); // Main heavy neon wave
      setTimeout(() => createShockwave('#ffffff', 45), 100); // Faster white aftershock
      if (typeof vibrate === 'function') vibrate([40, 40, 80]); // Double-thump haptic rumble
      
      // Briefly flash the screen neon green
      canvas.style.boxShadow = `inset 0 0 50px #00ff88`; 
      setTimeout(() => canvas.style.boxShadow = 'none', 150);

      // Load next level without stopping the 'isPlaying' loop!
      loadLevel(currentLevelIdx);
    }
  } else { 
    spawnTargets(); 
  }
}

function startCampaign() {
  initAudio(); // Initialize sound engine on first interaction
  ui.mainMenu.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
  ui.text.style.display = 'none';
  inMenu = false; isPlaying = true; currentLevelIdx = 0; score = 0; streak = 0; runCents = 0; ui.score.innerText = '0';
  lives = 3; currentReviveCost = 50;
  reviveCount = 0;
  scoreAtCheckpoint = 0;
  lifeZonesSpawnedThisRun = 0;
  loadLevel(currentLevelIdx);
}

function restartFromCheckpoint() {
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'flex';
  ui.gameUI.style.display = 'block';
  ui.bigMultiplier.style.display = 'block';
  
  currentReviveCost = 50;
  reviveCount = 0;
  score = 0;
  scoreAtCheckpoint = 0;
  runCents = 0;
  lives = 3;
  streak = 0;
  multiplier = 1;
  
  ui.score.innerText = 0;
  ui.streak.innerText = 0;
  updateMultiplierUI();
  
  currentLevelIdx = getCheckpointIndex();
  loadLevel(currentLevelIdx);
  isPlaying = true;
}

function returnToMenu() {
  stopBossDrone();
  ui.overlay.style.display = 'none'; ui.mainMenu.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
  ui.text.style.display = 'block';
  inMenu = true; isPlaying = false; levelData = campaign[0]; spawnTargets();
}

document.addEventListener('touchstart', (e) => { if (e.target.tagName !== 'BUTTON') { e.preventDefault(); tap(); } }, { passive: false });
document.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'BUTTON') tap(); });

levelData = campaign[0]; spawnTargets(); updateShopUI(); requestAnimationFrame(update);
