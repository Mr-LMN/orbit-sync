// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');
const mainMenu = document.getElementById('mainMenu');
const gameUi = document.getElementById('ui');
const coinCountDisplay = document.getElementById('coinCount');

// --- Game State Variables ---
let score = 0;
let coins = 450;
let angle = 0;
let speed = 0.035;
let isPlaying = false;
let gameActive = false; // Is the user actually in the game screen?
let animationId;
let direction = 1;

// --- Mechanics State ---
let targetMode = 'single'; 
let targets = [];
let particles = [];
let targetRotationSpeed = 0;

// --- Responsive Canvas Setup ---
function resizeCanvas() {
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  canvas.width = size;
  canvas.height = size;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const center = canvas.width / 2;
const orbitRadius = canvas.width * 0.35;

// --- UI & Shop Functions ---
function toggleShop(show) {
  document.getElementById('shopModal').style.bottom = show ? '0' : '-100%';
}

function buyItem(btn, cost) {
  if (coins >= cost) {
    coins -= cost;
    coinCountDisplay.innerText = coins;
    btn.className = 'buy-btn btn-equipped';
    btn.innerText = 'Equipped';
    btn.onclick = null;
    alert('Purchased successfully!');
  } else {
    alert('Not enough coins! Go play some levels.');
  }
}

// --- Game Flow Functions ---
function startGame() {
  mainMenu.style.display = 'none';
  canvas.style.display = 'block';
  gameUi.style.display = 'block';
  gameActive = true;
  resetAndPlay();
}

function returnToMenu() {
  gameOverScreen.style.display = 'none';
  canvas.style.display = 'none';
  gameUi.style.display = 'none';
  mainMenu.style.display = 'block';
  gameActive = false;
  cancelAnimationFrame(animationId);
}

// --- Visual Effects ---
function createParticles(x, y, color) {
  for (let i = 0; i < 25; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1.0, color: color
    });
  }
}

// --- Target Generation ---
function spawnSingleTarget() {
  targetMode = 'single';
  targetRotationSpeed = score >= 5 ? 0.015 + (score * 0.001) : 0; // Moving targets start at score 5
  
  let tColor = score >= 5 ? '#00e5ff' : '#00ff88';

  targets = [{
    start: Math.random() * Math.PI * 2,
    size: Math.max(Math.PI / 6, (Math.PI / 3) - (score * 0.02)),
    color: tColor,
    active: true
  }];
  
  speed = 0.035 + (score * 0.001);
  levelDisplay.innerText = targetRotationSpeed > 0 ? "Target moving!" : "Sync the core";
  scoreDisplay.style.color = tColor;
}

function spawnFractals() {
  targetMode = 'fractal';
  targetRotationSpeed = 0; // Fractals don't move
  targets = [];
  let baseOffset = Math.random() * Math.PI * 2;
  
  for(let i = 0; i < 3; i++) {
    targets.push({
      start: baseOffset + (i * (Math.PI * 2 / 3)),
      size: Math.PI / 8, 
      color: '#ff3366',
      active: true
    });
  }
  levelDisplay.innerText = "Clear the fractals!";
  scoreDisplay.style.color = '#ff3366';
}

// --- Main Game Loop ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Central node
  ctx.beginPath(); ctx.arc(center, center, orbitRadius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#222'; ctx.fill();

  // Orbit path
  ctx.beginPath(); ctx.arc(center, center, orbitRadius, 0, Math.PI * 2);
  ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 15; ctx.stroke();

  // Draw active targets
  targets.forEach(t => {
    if(t.active) {
      ctx.beginPath(); ctx.arc(center, center, orbitRadius, t.start, t.start + t.size);
      ctx.strokeStyle = t.color; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.stroke();
    }
  });

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
    else {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1.0;
    }
  }

  // Player orb
  const x = center + Math.cos(angle) * orbitRadius;
  const y = center + Math.sin(angle) * orbitRadius;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fill(); ctx.shadowBlur = 0; 
}

function update() {
  if (!isPlaying) return;
  
  angle += speed * direction;
  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;

  // Move targets if they have rotation speed
  if (targetMode === 'single' && targets[0].active && targetRotationSpeed > 0) {
      targets[0].start += targetRotationSpeed;
      if (targets[0].start > Math.PI * 2) targets[0].start -= Math.PI * 2;
  }

  draw();
  animationId = requestAnimationFrame(update);
}

// --- Interaction ---
function tap() {
  if(!gameActive || gameOverScreen.style.display === 'flex') return;
  if (!isPlaying) { isPlaying = true; update(); return; }

  let hitIndex = -1;

  for(let i = 0; i < targets.length; i++) {
    if(!targets[i].active) continue;
    let endAngle = targets[i].start + targets[i].size;
    let isHit = false;

    if (endAngle > Math.PI * 2) {
      if (angle >= targets[i].start || angle <= (endAngle - Math.PI * 2)) isHit = true;
    } else {
      if (angle >= targets[i].start && angle <= endAngle) isHit = true;
    }

    if (isHit) { hitIndex = i; break; }
  }

  if (hitIndex !== -1) {
    let t = targets[hitIndex];
    t.active = false;
    direction *= -1;
    score++;
    scoreDisplay.innerText = score;

    // Coins system (every 5 points = 1 coin)
    if (score % 5 === 0) { coins++; coinCountDisplay.innerText = coins; }

    const hitX = center + Math.cos(angle) * orbitRadius;
    const hitY = center + Math.sin(angle) * orbitRadius;
    createParticles(hitX, hitY, t.color);

    canvas.style.boxShadow = `0 0 50px ${t.color}`;
    setTimeout(() => canvas.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.1)', 150);

    if (targetMode === 'single') {
      // 30% chance to spawn fractals instead of single target after score 3
      if (score > 3 && Math.random() < 0.3) spawnFractals();
      else spawnSingleTarget();
    } else if (targetMode === 'fractal') {
      if (targets.every(tgt => !tgt.active)) spawnSingleTarget();
    }
  } else {
    isPlaying = false; cancelAnimationFrame(animationId);
    gameOverScreen.style.display = 'flex';
    finalScoreDisplay.innerText = score;
  }
}

function resetAndPlay() {
  score = 0; angle = 0; speed = 0.035; direction = 1; particles = [];
  scoreDisplay.innerText = score; 
  gameOverScreen.style.display = 'none';
  isPlaying = false;
  spawnSingleTarget(); 
  levelDisplay.innerText = "Tap to sync";
  draw();
}

// Event Listeners
document.addEventListener('touchstart', (e) => { 
  if(e.target.tagName !== 'BUTTON') { e.preventDefault(); tap(); }
}, {passive: false});
document.addEventListener('mousedown', (e) => {
  if(e.target.tagName !== 'BUTTON') tap();
});
