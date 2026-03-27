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

function initAudio() {
  if (!audioCtx) { audioCtx = new AudioContext(); }
  if (audioCtx.state === 'suspended') { audioCtx.resume(); }
}

function playPop(multiplier, isPerfect, isFail = false) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode); gainNode.connect(audioCtx.destination);

  if (isFail) {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
  } else {
    osc.type = isPerfect ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime((isPerfect ? 400 : 250) + (multiplier * 40), audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// --- SAVE SYSTEM ---
let globalCoins = parseInt(localStorage.getItem('orbitSync_coins')) || 0;
let unlockedSkins = JSON.parse(localStorage.getItem('orbitSync_unlocks')) || ['classic'];
let activeSkin = localStorage.getItem('orbitSync_equipped') || 'classic';
let maxWorldUnlocked = parseInt(localStorage.getItem('orbitSync_maxWorld')) || 1;

function saveData() {
  localStorage.setItem('orbitSync_coins', Math.floor(globalCoins));
  localStorage.setItem('orbitSync_unlocks', JSON.stringify(unlockedSkins));
  localStorage.setItem('orbitSync_equipped', activeSkin);
  localStorage.setItem('orbitSync_maxWorld', maxWorldUnlocked);
}

ui.coins.innerText = Math.floor(globalCoins); ui.shopCoinCount.innerText = Math.floor(globalCoins);

// --- GAME VARIABLES ---
let currentLevelIdx = 0; let levelData;
let score = 0; let stageHits = 0; let runCents = 0;
let angle = 0; let direction = 1; let isPlaying = false; let inMenu = true;
let lives = 3; let multiplier = 1; let streak = 0; let distanceTraveled = 0; let totalStageDistance = 0;
let isBossPhaseTwo = false; let bossPhase = 1;
let currentReviveCost = 50;
let ringHitFlash = 0;
let perfectFlash = 0;
let hitFlashColor = '#00ff88';

let targets = []; let particles = []; let popups = []; let trail = []; let shockwaves = []; let bgDust = [];

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

function createParticles(x, y, color, count = 20) { for (let i = 0; i < count; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1.0, color: color }); } }
function createPopup(x, y, text, color) { popups.push({ x: x, y: y, text: text, color: color, life: 1.0 }); }
function createShockwave(color, speed = 25) {
  shockwaves.push({ radius: orbitRadius * 0.15, opacity: 1.0, color: color, width: 5, speed: speed });
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

function updateMultiplierUI() {
  ui.multiplierCount.innerText = multiplier;
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

function loadLevel(idx) {
  levelData = campaign[idx] || campaign[campaign.length - 1];
  stageHits = 0; distanceTraveled = 0; totalStageDistance = 0; trail = [];
  isBossPhaseTwo = false; bossPhase = 1;

  ui.stage.innerText = `Stage ${levelData.id}`; ui.text.innerText = levelData.text;
  ui.lives.innerText = lives; ui.streak.innerText = streak;
  updateMultiplierUI();
  updateWaveUI();
  spawnTargets();
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

  for (let i = 0; i < tCount; i++) { targets.push({ start: offset + (i * (Math.PI * 2 / tCount)), size: baseSize, color: tCount > 1 ? '#ff3366' : palette.secondary, active: true, hp: 1 }); }
  if (levelData.hasHeart && !inMenu) { targets.push({ start: Math.random() * Math.PI * 2, size: Math.PI / 12, color: '#ff3366', active: true, isHeart: true, expireDistance: Math.PI * 4 }); }
}

function draw() {
  const palette = getWorldPalette();
  // BACKGROUND
  let isBoss = levelData && levelData.boss;
  const time = Date.now();
  let baseHue = isBoss ? 0 : (currentLevelIdx * 40) % 360;
  let pulse = isBoss ? Math.abs(Math.sin(time / 300)) * 0.3 : 0;

  let bgGradient = ctx.createRadialGradient(centerObj.x, centerObj.y, orbitRadius * 0.5, centerObj.x, centerObj.y, canvas.height * 0.8);
  bgGradient.addColorStop(0, `hsla(${baseHue}, ${isBoss ? '80%' : '60%'}, ${isBoss ? 15 + (pulse * 15) : 12}%, 1)`);
  bgGradient.addColorStop(1, isBoss ? `rgba(${20 + pulse * 30}, 0, 0, 1)` : palette.bg);

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ambient background dust (turns into fast-rising embers during boss)
  bgDust.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fillStyle = isBoss ? `rgba(255, 80, 50, ${d.opacity + pulse})` : `rgba(255, 255, 255, ${d.opacity})`;
    ctx.fill();

    let speedMult = isBoss ? 3.5 : 1;
    d.y -= (inMenu ? d.speed * 2 : d.speed) * speedMult;
    if (d.y < 0) { d.y = canvas.height; d.x = Math.random() * canvas.width; }
  });

  // ENERGY LANE
  // LAYERED ENERGY LANE
  const laneSweep = (Math.sin(time / 550) + 1) * 0.5;
  const laneHitBoost = Math.max(0, ringHitFlash);

  // 1) Ambient Outer Glow (behind everything)
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.lineWidth = 24;
  ctx.strokeStyle = rgbaFromHex(palette.primary, 0.16 + laneSweep * 0.1 + laneHitBoost * 0.3);
  ctx.shadowBlur = 26 + laneHitBoost * 20;
  ctx.shadowColor = isBoss ? 'rgba(255, 95, 145, 0.85)' : rgbaFromHex(palette.primary, 0.95);
  ctx.stroke();
  ctx.restore();

  // 2) Physical Groove (base track)
  const laneGradient = ctx.createLinearGradient(
    centerObj.x - orbitRadius, centerObj.y - orbitRadius,
    centerObj.x + orbitRadius, centerObj.y + orbitRadius
  );
  laneGradient.addColorStop(0, 'rgba(10, 14, 24, 0.985)');
  laneGradient.addColorStop(0.45, 'rgba(4, 7, 14, 0.995)');
  laneGradient.addColorStop(1, 'rgba(12, 17, 28, 0.985)');
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = laneGradient;
  ctx.lineWidth = 20;
  ctx.stroke();

  // 3) Glass casing lips (inner + outer)
  const lipAlpha = 0.68 + laneSweep * 0.14 + laneHitBoost * 0.34;
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius + 10, 0, Math.PI * 2);
  ctx.strokeStyle = isBoss
    ? `rgba(255, 125, 165, ${lipAlpha})`
    : rgbaFromHex(palette.primary, lipAlpha);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius - 10, 0, Math.PI * 2);
  ctx.strokeStyle = isBoss
    ? `rgba(255, 105, 150, ${0.62 + laneSweep * 0.14 + laneHitBoost * 0.32})`
    : rgbaFromHex(palette.primary, 0.62 + laneSweep * 0.14 + laneHitBoost * 0.32);
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4) Sci-fi ticks on the outer lip
  ctx.save();
  ctx.setLineDash([3, 9]);
  ctx.lineDashOffset = -(time / 95);
  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius + 10, 0, Math.PI * 2);
  ctx.strokeStyle = isBoss
    ? `rgba(255, 190, 220, ${0.55 + laneSweep * 0.2})`
    : rgbaFromHex(palette.primary, 0.58 + laneSweep * 0.22);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // CENTER CORE
  const orbColor = multiColors[Math.min(multiplier - 1, 7)];
  const corePulse = 0.72 + Math.abs(Math.sin(time / 320)) * 0.36;
  const coreGlowColor = (levelData && levelData.boss)
    ? (isBossPhaseTwo ? '#ffffff' : '#ff3366')
    : orbColor;

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 12, 20, 0.28)';
  ctx.shadowBlur = 18 + (corePulse * 12);
  ctx.shadowColor = coreGlowColor;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.19, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(5, 8, 12, 0.65)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.155, 0, Math.PI * 2);
  ctx.fillStyle = (levelData && levelData.boss && isBossPhaseTwo) ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 24, 32, 0.85)';
  ctx.shadowBlur = 12 + (corePulse * 13);
  ctx.shadowColor = coreGlowColor;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = (levelData && levelData.boss && isBossPhaseTwo) ? '#f5f9ff' : 'rgba(205, 240, 255, 0.9)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.075, 0, Math.PI * 2);
  ctx.fillStyle = '#090d14';
  ctx.fill();

  // Diegetic boss HP ring
  if (levelData && levelData.boss) {
    let hpSegments = bossPhase === 1 ? 2 : 1;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      let startAngle = (i * Math.PI) - (Math.PI / 2) + 0.15;
      let endAngle = startAngle + Math.PI - 0.3;
      ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.22, startAngle, endAngle);

      let isBlinking = (bossPhase === 1 && isBossPhaseTwo && i === 1);
      let blinkAlpha = isBlinking ? Math.abs(Math.sin(time / 80)) : 1;

      if (i < hpSegments) {
        ctx.strokeStyle = `rgba(255, 51, 102, ${blinkAlpha})`;
        ctx.shadowBlur = isBlinking ? 0 : 15;
        ctx.shadowColor = '#ff3366';
      } else {
        ctx.strokeStyle = 'rgba(34, 34, 34, 1)';
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // TARGETS
  targets.forEach(t => {
    if (!t.active) return;
    let tCenter = t.start + (t.size / 2);

    if (t.isHeart) {
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤️', centerObj.x + Math.cos(tCenter) * orbitRadius, centerObj.y + Math.sin(tCenter) * orbitRadius);
      return;
    }

    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, orbitRadius, t.start, t.start + t.size);
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 30;
    ctx.shadowColor = t.color;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerObj.x, centerObj.y, orbitRadius, t.start, t.start + t.size);
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 12;
    ctx.shadowColor = t.color;
    ctx.stroke();

    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
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
    sw.opacity -= 0.035;
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
    ctx.beginPath();
    ctx.arc(x, y, 17.5, 0, Math.PI * 2);
    ctx.fillStyle = orbColor;
    ctx.globalAlpha = 0.18;
    ctx.shadowBlur = 18;
    ctx.shadowColor = orbColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 11.5, 0, Math.PI * 2);
    ctx.fillStyle = orbColor;
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 15;
    ctx.shadowColor = orbColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 0;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - 4, y - 4, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 0;
    ctx.fill();
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
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
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
      ctx.font = 'bold 1.2rem sans-serif';
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
function update() {
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
    }
  });

  if (!inMenu && currentLevelIdx >= 3) {
    if (distanceTraveled >= Math.PI * 2 && multiplier > 1) {
      multiplier = 1; streak = 0; ui.streak.innerText = streak; updateMultiplierUI();
      ui.text.innerText = "Too slow! Streak lost.";
    }
    if (distanceTraveled >= Math.PI * 6) handleFail("IDLE TIMEOUT");
  }

  draw(); requestAnimationFrame(update);
}

function handleFail(reason) {
  lives--; ui.lives.innerText = lives; distanceTraveled = 0; multiplier = 1; updateMultiplierUI();
  streak = 0; ui.streak.innerText = streak;
  triggerScreenShake(10);
  playPop(1, false, true); // Play failure sound
  vibrate([50, 50, 50]);   // Heavy stutter vibration
  canvas.style.boxShadow = `inset 0 0 50px #ff3366`; setTimeout(() => canvas.style.boxShadow = 'none', 150);

  if (lives <= 0) {
    isPlaying = false; ui.overlay.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
    let coinsToBank = Math.floor(runCents / 10); globalCoins += coinsToBank; saveData(); ui.coins.innerText = Math.floor(globalCoins);
    ui.title.innerText = reason || "OUT OF SYNC"; ui.title.style.color = '#ff3366'; ui.subtitle.innerText = `Failed on ${levelData.title}`;
    ui.btn.innerText = `Restart World ${levelData.id.split('-')[0]}`; ui.btn.onclick = restartFromCheckpoint; ui.runCoins.innerText = coinsToBank;

    // --- NEW REVIVE LOGIC ---
    let reviveBtn = document.getElementById('reviveBtn');
    reviveBtn.style.display = 'block';
    reviveBtn.innerText = `Revive (🪙 ${currentReviveCost})`;
    reviveBtn.onclick = function() {
      if (globalCoins >= currentReviveCost) {
        globalCoins -= currentReviveCost; saveData(); ui.coins.innerText = Math.floor(globalCoins);
        currentReviveCost *= 2; // Double the cost for the next time!
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
  if (!isPlaying) { isPlaying = true; ui.text.innerText = "Syncing..."; return; }

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
    if (levelData.reverse !== false) direction *= -1;
    distanceTraveled = 0;
    hitFlashColor = t.color || '#00ff88';
    ringHitFlash = Math.max(ringHitFlash, 0.26);

    if (t.isHeart) {
      t.active = false; lives = Math.min(lives + 1, 3); ui.lives.innerText = lives;
      perfectFlash = Math.max(perfectFlash, 0.12);
      createPopup(hitX, hitY - 40, "+1 LIFE!", "#ff3366"); createParticles(hitX, hitY, '#ff3366', 30);
      if (targets.filter(tgt => !tgt.isHeart).every(tgt => !tgt.active)) { triggerStageClear(); }
      return;
    }

    if (levelData.boss && !isBossPhaseTwo) {
      t.hp--; triggerScreenShake(4);
      if (t.hp === 2) t.color = '#ffaa00'; if (t.hp === 1) t.color = '#ff3366'; if (t.hp <= 0) t.active = false;
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
          triggerScreenShake(20); setTimeout(spawnTargets, 500); return;
        } else {
          ui.bossPhase2.className = "boss-segment";
          createParticles(centerObj.x, centerObj.y, '#ffffff', 50); createPopup(centerObj.x, centerObj.y - 50, "BOSS DEFEATED!", "#00ff88");
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
      multiplier = Math.min(multiplier + 1, 8); score += (3 * multiplier);
      createPopup(hitX, hitY - 20, "PERFECT!", multiColors[multiplier - 1]);
      playPop(multiplier, true); vibrate(20); // Sound + Sharp Vibrate
    }
    else if (hitQuality === "good") {
      ringHitFlash = Math.max(ringHitFlash, 0.26);
      score += (2 * multiplier); createPopup(hitX, hitY - 20, "GOOD", "#fff");
      playPop(multiplier, false); vibrate(10); // Sound + Light Vibrate
    }
    else {
      ringHitFlash = Math.max(ringHitFlash, 0.2);
      multiplier = 1; score += 1; createPopup(hitX, hitY - 20, "OK", "#aaa");
      playPop(multiplier, false); vibrate(10); // Sound + Light Vibrate
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
      // WORLD CLEARED! (Pause the game and show the Win Screen)
      isPlaying = false;
      let coinsToBank = Math.floor(runCents / 10); globalCoins += coinsToBank; saveData(); ui.coins.innerText = Math.floor(globalCoins);

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
  inMenu = false; isPlaying = true; currentLevelIdx = 0; score = 0; streak = 0; runCents = 0; ui.score.innerText = 0;
  lives = 3; currentReviveCost = 50;
  loadLevel(currentLevelIdx);
}

function restartFromCheckpoint() {
  ui.overlay.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
  currentReviveCost = 50;
  if (lives <= 0) { currentLevelIdx = getCheckpointIndex(); runCents = 0; lives = 3; streak = 0; }
  loadLevel(currentLevelIdx); isPlaying = true;
}

function returnToMenu() {
  ui.overlay.style.display = 'none'; ui.mainMenu.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
  inMenu = true; isPlaying = false; levelData = campaign[0]; spawnTargets();
}

document.addEventListener('touchstart', (e) => { if (e.target.tagName !== 'BUTTON') { e.preventDefault(); tap(); } }, { passive: false });
document.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'BUTTON') tap(); });

levelData = campaign[0]; spawnTargets(); updateShopUI(); requestAnimationFrame(update);
