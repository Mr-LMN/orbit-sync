const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  score: document.getElementById('scoreDisplay'), stage: document.getElementById('stageDisplay'),
  text: document.getElementById('tutorialText'), lives: document.getElementById('livesCount'),
  multiplier: document.getElementById('multiplierCount'), coins: document.getElementById('coinCount'),
  overlay: document.getElementById('screenOverlay'), title: document.getElementById('screenTitle'),
  subtitle: document.getElementById('screenSubtitle'), btn: document.getElementById('actionBtn')
};

let currentLevelIdx = 0; let levelData;
let score = 0; let stageHits = 0; let coins = 0;
let angle = 0; let direction = 1; let isPlaying = false;
let lives = 3; let multiplier = 1; let distanceTraveled = 0;

let targets = []; let particles = [];
const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
canvas.width = size; canvas.height = size;
const center = size / 2; const orbitRadius = size * 0.35;

function createParticles(x, y, color) {
  for (let i=0; i<20; i++) particles.push({ x:x, y:y, vx:(Math.random()-0.5)*12, vy:(Math.random()-0.5)*12, life:1.0, color:color });
}

function loadLevel(idx) {
  levelData = campaign[idx] || campaign[campaign.length-1];
  stageHits = 0; lives = levelData.lives; multiplier = 1; distanceTraveled = 0;
  
  ui.stage.innerText = `Stage ${levelData.id}`;
  ui.text.innerText = levelData.text;
  ui.lives.innerText = lives;
  ui.multiplier.innerText = multiplier;
  
  spawnTargets();
}

function spawnTargets() {
  targets = [];
  let tCount = levelData.targets === 'boss' || levelData.targets === 'random' ? Math.floor(Math.random()*3)+1 : levelData.targets;
  let baseSize = Math.max(Math.PI / 8, (Math.PI / 3) - (currentLevelIdx * 0.02));
  let offset = Math.random() * Math.PI * 2;

  for(let i=0; i<tCount; i++) {
    targets.push({ 
      start: offset + (i * (Math.PI * 2 / tCount)), 
      size: baseSize, color: tCount > 1 ? '#ff3366' : '#00ff88', active: true 
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath(); ctx.arc(center, center, orbitRadius * 0.15, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill();
  ctx.beginPath(); ctx.arc(center, center, orbitRadius, 0, Math.PI * 2); ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = 15; ctx.stroke();

  targets.forEach(t => {
    if(t.active) {
      ctx.beginPath(); ctx.arc(center, center, orbitRadius, t.start, t.start + t.size);
      ctx.strokeStyle = t.color; ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.stroke();
      // Draw precision center indicator for Stage 4+
      if(currentLevelIdx >= 3) {
         let tCenter = t.start + (t.size/2);
         ctx.beginPath(); ctx.arc(center + Math.cos(tCenter)*orbitRadius, center + Math.sin(tCenter)*orbitRadius, 4, 0, Math.PI*2);
         ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
    else { ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fill(); ctx.globalAlpha = 1.0; }
  }

  const x = center + Math.cos(angle) * orbitRadius; const y = center + Math.sin(angle) * orbitRadius;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fill(); ctx.shadowBlur = 0; 
}

function update() {
  if (!isPlaying) return;
  let moveStep = levelData.speed * direction;
  angle += moveStep;
  distanceTraveled += Math.abs(moveStep); // Anti-Stall Tracker

  if (angle > Math.PI * 2) angle -= Math.PI * 2;
  if (angle < 0) angle += Math.PI * 2;

  targets.forEach(t => {
    if(t.active && levelData.moveSpeed > 0) {
      t.start += levelData.moveSpeed;
      if (t.start > Math.PI * 2) t.start -= Math.PI * 2;
    }
  });

  // Anti-Stall Mechanics (Introduced after Stage 3)
  if (currentLevelIdx >= 3) {
    if (distanceTraveled >= Math.PI * 2 && multiplier > 1) {
      multiplier = 1; ui.multiplier.innerText = multiplier; // Punish 360 rotation
      ui.text.innerText = "Too slow! Multiplier lost.";
    }
    if (distanceTraveled >= Math.PI * 6) {
      handleFail("IDLE TIMEOUT"); // Punish 3 rotations
    }
  }

  draw(); requestAnimationFrame(update);
}

function handleFail(reason) {
  lives--; ui.lives.innerText = lives;
  canvas.style.boxShadow = `0 0 50px #ff3366`;
  setTimeout(() => canvas.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.1)', 150);

  if (lives <= 0) {
    isPlaying = false; ui.overlay.style.display = 'flex';
    ui.title.innerText = reason || "OUT OF SYNC"; ui.title.style.color = '#ff3366';
    ui.subtitle.innerText = `Failed on ${levelData.title}`;
    ui.btn.innerText = "Try Again";
  }
}

function tap() {
  if(ui.overlay.style.display === 'flex') return;
  if (!isPlaying) { isPlaying = true; ui.text.innerText = "Syncing..."; update(); return; }

  let hitIndex = -1; let isPerfect = false;

  for(let i = 0; i < targets.length; i++) {
    if(!targets[i].active) continue;
    let endAngle = targets[i].start + targets[i].size;
    let tCenter = targets[i].start + (targets[i].size / 2);
    
    // Standard Hit Box
    let isHit = (endAngle > Math.PI * 2) ? (angle >= targets[i].start || angle <= (endAngle - Math.PI * 2)) : (angle >= targets[i].start && angle <= endAngle);
    
    if (isHit) {
      hitIndex = i;
      // Precision hit check (closest 25% to center)
      let dist = Math.abs(angle - tCenter);
      if (dist < targets[i].size / 4) isPerfect = true;
      break;
    }
  }

  if (hitIndex !== -1) {
    let t = targets[hitIndex]; t.active = false; direction *= -1; distanceTraveled = 0; // Reset anti-stall
    
    // Precision & Multiplier Scoring
    if (isPerfect && currentLevelIdx >= 3) {
      multiplier++; score += (2 * multiplier);
      ui.text.innerText = "PERFECT! Multiplier up!"; ui.text.style.color = "#ffaa00";
    } else {
      multiplier = 1; score += 1;
      ui.text.innerText = "Good hit."; ui.text.style.color = "#fff";
    }
    
    coins += (1 * multiplier); ui.score.innerText = score; ui.coins.innerText = coins; ui.multiplier.innerText = multiplier;
    createParticles(center + Math.cos(angle)*orbitRadius, center + Math.sin(angle)*orbitRadius, t.color);

    if (targets.every(tgt => !tgt.active)) {
      stageHits++;
      if (stageHits >= levelData.hitsNeeded) {
        isPlaying = false; currentLevelIdx++;
        ui.overlay.style.display = 'flex'; ui.title.innerText = "STAGE CLEARED"; ui.title.style.color = '#00ff88';
        ui.subtitle.innerText = `Coins Earned: ${coins}`; ui.btn.innerText = "Next Stage";
      } else { spawnTargets(); }
    }
  } else { handleFail("MISSED"); }
}

function startGame() {
  ui.overlay.style.display = 'none';
  if (lives <= 0) { currentLevelIdx = 0; score = 0; coins = 0; ui.score.innerText = 0; ui.coins.innerText = 0; }
  loadLevel(currentLevelIdx);
  if(!isPlaying) { isPlaying = true; update(); }
}

document.addEventListener('touchstart', (e) => { if(e.target.tagName !== 'BUTTON') { e.preventDefault(); tap(); }}, {passive: false});
document.addEventListener('mousedown', (e) => { if(e.target.tagName !== 'BUTTON') tap(); });

loadLevel(0); draw();
