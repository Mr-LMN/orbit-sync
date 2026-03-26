const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ui = {
  topBar: document.getElementById('topBar'),
  hud: document.getElementById('ui'),
  menu: document.getElementById('mainMenu'),
  score: document.getElementById('scoreDisplay'),
  stage: document.getElementById('stageDisplay'),
  text: document.getElementById('tutorialText'),
  lives: document.getElementById('livesCount'),
  multiplier: document.getElementById('multiplierCount'),
  coins: document.getElementById('coinCount'),
  multiplierBox: document.getElementById('multiplierBox'),
  overlay: document.getElementById('screenOverlay'),
  title: document.getElementById('screenTitle'),
  subtitle: document.getElementById('screenSubtitle'),
  btn: document.getElementById('actionBtn'),
  runCoins: document.getElementById('runCoinsDisplay'),
  shop: document.getElementById('shopModal'),
  shopCoins: document.getElementById('shopCoinCount')
};

const SKIN_META = {
  classic: { color: '#ffffff', glyph: null, glow: '#ffffff' },
  skull: { color: '#00e5ff', glyph: '💀', glow: '#00e5ff' },
  fire: { color: '#ffaa00', glyph: '🔥', glow: '#ffaa00' }
};

const SAVE_KEY = 'orbit-sync-save-v2';
const defaultSave = { bankedCoins: 0, ownedSkins: ['classic'], equippedSkin: 'classic', highestLevel: 0 };
let save = loadSave();

let currentLevelIdx = 0;
let levelData;
let score = 0;
let stageHits = 0;
let runCoins = 0;
let angle = 0;
let direction = 1;
let isPlaying = false;
let lives = 3;
let multiplier = 1;
let distanceTraveled = 0;
let isBossPhaseTwo = false;

let targets = [];
let particles = [];
let popups = [];
let trail = [];

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function getCenter() {
  return { x: canvas.width / 2, y: canvas.height / 2, orbitRadius: Math.min(canvas.width, canvas.height) * 0.33 };
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  draw();
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...defaultSave };
    const parsed = JSON.parse(raw);
    return {
      bankedCoins: Number.isFinite(parsed.bankedCoins) ? Math.max(0, Math.floor(parsed.bankedCoins)) : 0,
      ownedSkins: Array.isArray(parsed.ownedSkins) && parsed.ownedSkins.length ? parsed.ownedSkins : ['classic'],
      equippedSkin: parsed.equippedSkin || 'classic',
      highestLevel: Number.isFinite(parsed.highestLevel) ? Math.max(0, parsed.highestLevel) : 0
    };
  } catch {
    return { ...defaultSave };
  }
}

function saveProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function refreshCoins() {
  ui.coins.innerText = String(save.bankedCoins);
  ui.shopCoins.innerText = String(save.bankedCoins);
}

function refreshShopUI() {
  ['classic', 'skull', 'fire'].forEach((skin) => {
    const isOwned = save.ownedSkins.includes(skin);
    const isEquipped = save.equippedSkin === skin;
    const item = document.getElementById(`item-${skin}`);
    const btn = document.getElementById(`btn-${skin}`);

    item.classList.toggle('equipped', isEquipped);
    btn.classList.remove('btn-equipped', 'btn-owned', 'buy-coins');

    if (isEquipped) {
      btn.innerText = 'Equipped';
      btn.classList.add('btn-equipped');
      btn.onclick = () => equipSkin(skin);
    } else if (isOwned) {
      btn.innerText = 'Equip';
      btn.classList.add('btn-owned');
      btn.onclick = () => equipSkin(skin);
    }
  });

  const skullOwned = save.ownedSkins.includes('skull');
  const fireOwned = save.ownedSkins.includes('fire');

  if (!skullOwned) {
    const b = document.getElementById('btn-skull');
    b.innerText = '🪙 50';
    b.classList.add('buy-coins');
    b.onclick = () => buyItem('skull', 50);
  }

  if (!fireOwned) {
    const b = document.getElementById('btn-fire');
    b.innerText = '🪙 150';
    b.classList.add('buy-coins');
    b.onclick = () => buyItem('fire', 150);
  }
}

function startCampaign() {
  ui.menu.style.display = 'none';
  ui.shop.style.bottom = '-100%';
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'flex';
  ui.hud.style.display = 'block';

  score = 0;
  stageHits = 0;
  runCoins = 0;
  currentLevelIdx = Math.min(save.highestLevel || 0, campaign.length - 1);

  loadLevel(currentLevelIdx);
  if (!isPlaying) {
    isPlaying = true;
    update();
  }
}

function returnToMenu() {
  isPlaying = false;
  ui.overlay.style.display = 'none';
  ui.topBar.style.display = 'none';
  ui.hud.style.display = 'none';
  ui.menu.style.display = 'flex';
  draw();
}

function restartFromCheckpoint() {
  ui.overlay.style.display = 'none';
  currentLevelIdx = getCheckpointIndex();
  runCoins = 0;
  loadLevel(currentLevelIdx);
  if (!isPlaying) {
    isPlaying = true;
    update();
  }
}

function toggleShop(show) {
  ui.shop.style.bottom = show ? '0' : '-100%';
  refreshCoins();
  refreshShopUI();
}

function buyItem(itemKey, price) {
  if (save.ownedSkins.includes(itemKey)) {
    equipSkin(itemKey);
    return;
  }

  if (save.bankedCoins < price) {
    ui.text.innerText = 'Not enough coins.';
    return;
  }

  save.bankedCoins -= price;
  save.ownedSkins.push(itemKey);
  saveProgress();
  refreshCoins();
  refreshShopUI();
  equipSkin(itemKey);
}

function equipSkin(itemKey) {
  if (!save.ownedSkins.includes(itemKey)) return;
  save.equippedSkin = itemKey;
  saveProgress();
  refreshShopUI();
}

function getCheckpointIndex() {
  const world = levelData?.id?.split('-')[0] || '1';
  for (let i = 0; i < campaign.length; i += 1) {
    if (campaign[i].id.startsWith(`${world}-`)) return i;
  }
  return 0;
}

function loadLevel(idx) {
  levelData = campaign[idx] || campaign[campaign.length - 1];
  stageHits = 0;
  lives = levelData.lives;
  multiplier = 1;
  distanceTraveled = 0;
  trail = [];
  isBossPhaseTwo = false;

  ui.stage.innerText = `Stage ${levelData.id}`;
  ui.text.innerText = levelData.text;
  ui.lives.innerText = String(lives);
  ui.multiplier.innerText = String(multiplier);
  ui.score.innerText = String(score);
  refreshCoins();

  spawnTargets();
}

function spawnTargets() {
  targets = [];

  if (levelData.boss === 'aegis') {
    if (!isBossPhaseTwo) {
      ui.text.innerText = 'BOSS: Break the shields!';
      const offset = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i += 1) {
        targets.push({ start: offset + (i * (Math.PI * 2 / 3)), size: Math.PI / 4, color: '#00e5ff', active: true, hp: 3 });
      }
    } else {
      ui.text.innerText = 'CORE EXPOSED! Need PERFECT hit!';
      targets.push({ start: Math.random() * Math.PI * 2, size: Math.PI / 10, color: '#ffffff', active: true, hp: 1 });
    }
    return;
  }

  const tCount = levelData.targets === 'random' ? Math.floor(Math.random() * 3) + 1 : levelData.targets;
  const sizeModifier = tCount > 1 ? 0.6 : 1;
  const baseSize = Math.max(Math.PI / 8, (Math.PI / 3) - (currentLevelIdx * 0.02)) * sizeModifier;
  const offset = Math.random() * Math.PI * 2;

  for (let i = 0; i < tCount; i += 1) {
    targets.push({ start: offset + (i * (Math.PI * 2 / tCount)), size: baseSize, color: tCount > 1 ? '#ff3366' : '#00ff88', active: true, hp: 1 });
  }
}

function createParticles(x, y, color, count = 20) {
  for (let i = 0; i < count; i += 1) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 1, color });
  }
}

function createPopup(x, y, text, color) {
  popups.push({ x, y, text, color, life: 1 });
}

function drawOrb(x, y, radius) {
  const skin = SKIN_META[save.equippedSkin] || SKIN_META.classic;

  if (skin.glyph) {
    ctx.font = `${Math.round(radius * 2.2)}px Segoe UI Emoji`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 15;
    ctx.shadowColor = skin.glow;
    ctx.fillText(skin.glyph, x, y + 1);
    ctx.shadowBlur = 0;
    return;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = skin.color;
  ctx.shadowBlur = 15;
  ctx.shadowColor = skin.glow;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function draw() {
  const { x: cx, y: cy, orbitRadius } = getCenter();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(cx, cy, orbitRadius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = (levelData?.boss && isBossPhaseTwo) ? '#ffffff' : '#222';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a24';
  ctx.lineWidth = 15;
  ctx.stroke();

  targets.forEach((t) => {
    if (!t.active) return;
    const tCenter = t.start + (t.size / 2);

    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, t.start, t.start + t.size);
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = levelData?.boss && !isBossPhaseTwo ? 0.9 : 0.3;
    ctx.lineWidth = levelData?.boss && !isBossPhaseTwo ? 20 : 15;
    ctx.lineCap = levelData?.boss && !isBossPhaseTwo ? 'butt' : 'round';
    ctx.stroke();

    if (!(levelData?.boss && !isBossPhaseTwo)) {
      ctx.beginPath();
      ctx.arc(cx, cy, orbitRadius, tCenter - t.size / 4, tCenter + t.size / 4);
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  });

  trail.forEach((p, i) => {
    const opacity = (i / Math.max(1, trail.length)) * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8 * (i / Math.max(1, trail.length)), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = opacity;
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const orbX = cx + Math.cos(angle) * orbitRadius;
  const orbY = cy + Math.sin(angle) * orbitRadius;
  drawOrb(orbX, orbY, 10);

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
    else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  for (let i = popups.length - 1; i >= 0; i -= 1) {
    const p = popups[i];
    p.y -= 1;
    p.life -= 0.02;
    if (p.life <= 0) popups.splice(i, 1);
    else {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.font = 'bold 1.2rem sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    }
  }
}

function update() {
  if (!isPlaying) return;

  let moveStep = levelData.speed * direction;
  if (levelData.boss && isBossPhaseTwo) moveStep *= 1.3;

  angle += moveStep;
  distanceTraveled += Math.abs(moveStep);

  const { x: cx, y: cy, orbitRadius } = getCenter();
  trail.push({ x: cx + Math.cos(angle) * orbitRadius, y: cy + Math.sin(angle) * orbitRadius });
  if (trail.length > multiplier * 4) trail.shift();

  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;

  targets.forEach((t) => {
    if (t.active && levelData.moveSpeed > 0) {
      t.start += levelData.moveSpeed;
      if (t.start > Math.PI * 2) t.start -= Math.PI * 2;
    }
  });

  if (currentLevelIdx >= 3) {
    if (distanceTraveled >= Math.PI * 2 && multiplier > 1) {
      multiplier = 1;
      ui.multiplier.innerText = '1';
      ui.text.innerText = 'Too slow! Multiplier lost.';
    }
    if (distanceTraveled >= Math.PI * 6) {
      handleFail('IDLE TIMEOUT');
    }
  }

  draw();
  requestAnimationFrame(update);
}

function handleFail(reason) {
  lives -= 1;
  ui.lives.innerText = String(lives);
  createPopup(canvas.width / 2, canvas.height / 2 - 20, reason || 'MISSED', '#ff3366');

  if (lives <= 0) {
    isPlaying = false;
    ui.overlay.style.display = 'flex';
    ui.title.innerText = reason || 'OUT OF SYNC';
    ui.title.style.color = '#ff3366';
    ui.subtitle.innerText = `Failed on ${levelData.title}`;
    ui.btn.innerText = `Restart World ${levelData.id.split('-')[0]}`;
    ui.runCoins.innerText = String(runCoins);
  }
}

function clearStage() {
  isPlaying = false;
  save.bankedCoins += runCoins;
  save.highestLevel = Math.max(save.highestLevel, currentLevelIdx + 1);
  saveProgress();
  refreshCoins();

  ui.overlay.style.display = 'flex';
  ui.title.innerText = 'STAGE CLEARED';
  ui.title.style.color = '#00ff88';
  ui.subtitle.innerText = `Total Coins: ${save.bankedCoins}`;
  ui.btn.innerText = 'Next Stage';
  ui.runCoins.innerText = String(runCoins);

  currentLevelIdx = Math.min(currentLevelIdx + 1, campaign.length - 1);
  runCoins = 0;
}

function tap() {
  if (ui.menu.style.display !== 'none') return;
  if (ui.overlay.style.display === 'flex') {
    ui.overlay.style.display = 'none';
    loadLevel(currentLevelIdx);
    isPlaying = true;
    update();
    return;
  }

  if (!isPlaying) {
    isPlaying = true;
    ui.text.innerText = 'Syncing...';
    update();
    return;
  }

  let hitIndex = -1;
  let hitQuality = 'miss';

  for (let i = 0; i < targets.length; i += 1) {
    if (!targets[i].active) continue;
    const endAngle = targets[i].start + targets[i].size;
    const tCenter = targets[i].start + (targets[i].size / 2);
    const isHit = endAngle > Math.PI * 2
      ? (angle >= targets[i].start || angle <= (endAngle - Math.PI * 2))
      : (angle >= targets[i].start && angle <= endAngle);

    if (isHit) {
      hitIndex = i;
      const dist = Math.abs(angle - tCenter);
      if (dist < targets[i].size / 6) hitQuality = 'perfect';
      else if (dist < targets[i].size / 3) hitQuality = 'good';
      else hitQuality = 'ok';
      break;
    }
  }

  const { x: cx, y: cy, orbitRadius } = getCenter();
  const hitX = cx + Math.cos(angle) * orbitRadius;
  const hitY = cy + Math.sin(angle) * orbitRadius;

  if (hitIndex === -1) {
    handleFail('MISSED');
    return;
  }

  const t = targets[hitIndex];
  direction *= -1;
  distanceTraveled = 0;

  if (levelData.boss && !isBossPhaseTwo) {
    t.hp -= 1;
    if (t.hp === 2) t.color = '#ffaa00';
    if (t.hp === 1) t.color = '#ff3366';
    if (t.hp <= 0) t.active = false;
    createParticles(hitX, hitY, t.color, 10);

    if (targets.every((target) => !target.active)) {
      isBossPhaseTwo = true;
      createPopup(cx, cy - 50, 'CORE EXPOSED!', '#ffffff');
      setTimeout(spawnTargets, 500);
    }
    return;
  }

  t.active = false;

  if (levelData.boss && isBossPhaseTwo) {
    if (hitQuality === 'perfect') {
      createParticles(cx, cy, '#ffffff', 50);
      stageHits = levelData.hitsNeeded;
    } else {
      multiplier = 1;
      ui.multiplier.innerText = '1';
      isBossPhaseTwo = false;
      setTimeout(spawnTargets, 500);
      return;
    }
  }

  if (hitQuality === 'perfect' && currentLevelIdx >= 2) {
    multiplier = Math.min(multiplier + 1, 8);
    score += (3 * multiplier);
    runCoins += 3;
    createPopup(hitX, hitY - 20, 'PERFECT!', '#00ff88');
  } else if (hitQuality === 'good') {
    score += (2 * multiplier);
    runCoins += 2;
    createPopup(hitX, hitY - 20, 'GOOD', '#ffffff');
  } else {
    multiplier = 1;
    score += 1;
    runCoins += 1;
    createPopup(hitX, hitY - 20, 'OK', '#aaaaaa');
  }

  ui.score.innerText = String(score);
  ui.multiplier.innerText = String(multiplier);
  ui.multiplierBox.style.color = multiplier > 1 ? '#ffaa00' : '#ffffff';
  createParticles(hitX, hitY, t.color);

  if (targets.every((target) => !target.active) || stageHits >= levelData.hitsNeeded) {
    stageHits += 1;
    if (stageHits >= levelData.hitsNeeded) {
      clearStage();
    } else {
      spawnTargets();
    }
  }
}

document.addEventListener('touchstart', (e) => {
  if (e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    tap();
  }
}, { passive: false });

document.addEventListener('mousedown', (e) => {
  if (e.target.tagName !== 'BUTTON') tap();
});

window.startCampaign = startCampaign;
window.returnToMenu = returnToMenu;
window.restartFromCheckpoint = restartFromCheckpoint;
window.toggleShop = toggleShop;
window.buyItem = buyItem;
window.equipSkin = equipSkin;

refreshCoins();
refreshShopUI();
loadLevel(0);
draw();
