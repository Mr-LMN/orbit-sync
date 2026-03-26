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

let targets = []; let particles = []; let popups = []; let trail = [];

const size = Math.min(window.innerWidth, window.innerHeight);
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const centerObj = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
const orbitRadius = Math.min(window.innerWidth, window.innerHeight) * 0.28;
const multiColors = ['#ffffff', '#00e5ff', '#00ff88', '#ffea00', '#ffaa00', '#ff3366', '#b300ff', '#ff00ff'];

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
function triggerScreenShake(intensity = 5) {
  canvas.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`;
  setTimeout(() => canvas.style.transform = `translate(${Math.random() * intensity - intensity / 2}px, ${Math.random() * intensity - intensity / 2}px)`, 50);
  setTimeout(() => canvas.style.transform = `translate(0px, 0px)`, 100);
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
    ui.wave.style.display = 'none'; ui.bossUI.style.display = 'flex';
    if (bossPhase === 1 && !isBossPhaseTwo) { ui.bossPhase1.className = "boss-segment active-segment"; ui.bossPhase2.className = "boss-segment active-segment"; }
  } else {
    ui.bossUI.style.display = 'none'; ui.wave.style.display = 'block';
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

  for (let i = 0; i < tCount; i++) { targets.push({ start: offset + (i * (Math.PI * 2 / tCount)), size: baseSize, color: tCount > 1 ? '#ff3366' : '#00ff88', active: true, hp: 1 }); }
  if (levelData.hasHeart && !inMenu) { targets.push({ start: Math.random() * Math.PI * 2, size: Math.PI / 12, color: '#ff3366', active: true, isHeart: true, expireDistance: Math.PI * 4 }); }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = (levelData.boss && isBossPhaseTwo) ? '#ffffff' : '#222'; ctx.fill();
  ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 15; ctx.stroke();

  targets.forEach(t => {
    if (t.active) {
      let tCenter = t.start + (t.size / 2);
      if (t.isHeart) {
        ctx.font = "24px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("❤️", centerObj.x + Math.cos(tCenter) * orbitRadius, centerObj.y + Math.sin(tCenter) * orbitRadius);
      } else if (levelData.boss && !isBossPhaseTwo) {
        ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius, t.start, t.start + t.size);
        ctx.strokeStyle = t.color; ctx.globalAlpha = 0.9; ctx.lineWidth = 20; ctx.lineCap = 'butt'; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius, t.start, t.start + t.size);
        ctx.strokeStyle = t.color; ctx.globalAlpha = 0.3; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.stroke();
        ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius, tCenter - t.size / 4, tCenter + t.size / 4);
        ctx.strokeStyle = t.color; ctx.globalAlpha = 0.8; ctx.stroke();
        if (currentLevelIdx >= 2 || levelData.boss) {
          ctx.beginPath(); ctx.arc(centerObj.x, centerObj.y, orbitRadius, tCenter - t.size / 12, tCenter + t.size / 12);
          ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 1.0; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1.0;
    }
  });

  let orbColor = multiColors[Math.min(multiplier - 1, 7)];

  if (!inMenu) {
    trail.forEach((p, index) => {
      let opacity = (index / trail.length) * 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 8 * (index / trail.length), 0, Math.PI * 2);
      ctx.fillStyle = orbColor; ctx.globalAlpha = opacity; ctx.fill();
    });
  }

  const x = centerObj.x + Math.cos(angle) * orbitRadius; const y = centerObj.y + Math.sin(angle) * orbitRadius;
  if (activeSkin === 'skull') { ctx.font = "32px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("💀", x, y); }
  else if (activeSkin === 'fire') { ctx.font = "32px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🔥", x, y); }
  else { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = orbColor; ctx.shadowBlur = 15; ctx.shadowColor = orbColor; ctx.fill(); ctx.shadowBlur = 0; }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
    else { ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1.0; }
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    let pop = popups[i]; pop.y -= 1; pop.life -= 0.02;
    if (pop.life <= 0) popups.splice(i, 1);
    else { ctx.fillStyle = pop.color; ctx.globalAlpha = pop.life; ctx.font = "bold 1.2rem sans-serif"; ctx.textAlign = "center"; ctx.fillText(pop.text, pop.x, pop.y); ctx.globalAlpha = 1.0; }
  }
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
  triggerScreenShake(10); canvas.style.boxShadow = `inset 0 0 50px #ff3366`; setTimeout(() => canvas.style.boxShadow = 'none', 150);

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

    if (t.isHeart) {
      t.active = false; lives = Math.min(lives + 1, 3); ui.lives.innerText = lives;
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
      if (hitQuality === "perfect") {
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

    if (hitQuality === "perfect" && currentLevelIdx >= 2) { multiplier = Math.min(multiplier + 1, 8); score += (3 * multiplier); createPopup(hitX, hitY - 20, "PERFECT!", multiColors[multiplier - 1]); }
    else if (hitQuality === "good") { score += (2 * multiplier); createPopup(hitX, hitY - 20, "GOOD", "#fff"); }
    else { multiplier = 1; score += 1; createPopup(hitX, hitY - 20, "OK", "#aaa"); }

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
    isPlaying = false; currentLevelIdx++;

    let currentLevelObj = campaign[currentLevelIdx];
    let newWorld = currentLevelObj ? parseInt(currentLevelObj.id.split('-')[0]) : maxWorldUnlocked;
    if (newWorld > maxWorldUnlocked) { maxWorldUnlocked = newWorld; saveData(); }

    let coinsToBank = Math.floor(runCents / 10); globalCoins += coinsToBank; saveData(); ui.coins.innerText = Math.floor(globalCoins);

    ui.overlay.style.display = 'flex'; ui.topBar.style.display = 'none'; ui.gameUI.style.display = 'none'; ui.bossUI.style.display = 'none'; ui.bigMultiplier.style.display = 'none';
    ui.title.innerText = "STAGE CLEARED"; ui.title.style.color = '#00ff88'; ui.subtitle.innerText = `Coins Earned: ${coinsToBank}`;

    ui.btn.innerText = "Next Stage";
    ui.btn.onclick = function () {
      ui.overlay.style.display = 'none'; ui.topBar.style.display = 'flex'; ui.gameUI.style.display = 'block'; ui.bigMultiplier.style.display = 'block';
      runCents = 0; loadLevel(currentLevelIdx); isPlaying = true;
    };
    ui.runCoins.innerText = ""; runCents = 0;
  } else { spawnTargets(); }
}

function startCampaign() {
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
