(function initParticles(window) {
  const OG = window.OrbitGame;
  OG.entities = OG.entities || {};
  OG.entities.particles = OG.entities.particles || {};

  function getParticle() {
    return particlePool.pop() || {};
  }

  function releaseParticle(particle) {
    if (particlePool.length < MAX_PARTICLES * 4) particlePool.push(particle);
  }

  function createParticles(x, y, color, count = 20) {
    const targetCount = Math.min(count, MAX_PARTICLES);
    for (let i = 0; i < targetCount; i++) {
      if (particles.length >= MAX_PARTICLES) {
        releaseParticle(particles.shift());
      }
      const speed = Math.random() * 5 + 2;
      const ang = Math.random() * Math.PI * 2;
      const p = getParticle();
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * speed;
      p.vy = Math.sin(ang) * speed;
      p.angle = ang;
      p.length = Math.random() * 10 + 5;
      p.life = 1;
      p.color = color;
      particles.push(p);
    }
  }

  function createUpwardBurstParticles(x, y, color, count = 36) {
    const burstCount = Math.min(count, MAX_PARTICLES);
    for (let i = 0; i < burstCount; i++) {
      if (particles.length >= MAX_PARTICLES) {
        releaseParticle(particles.shift());
      }
      const p = getParticle();
      const spread = (Math.random() - 0.5) * 1.4;
      const speed = Math.random() * 6 + 3;
      p.x = x;
      p.y = y;
      p.vx = Math.sin(spread) * speed * 0.45;
      p.vy = -Math.abs(Math.cos(spread) * speed);
      p.angle = Math.atan2(p.vy, p.vx);
      p.length = Math.random() * 11 + 6;
      p.life = 1;
      p.color = color;
      particles.push(p);
    }
  }

  OG.entities.particles.getParticle = getParticle;
  OG.entities.particles.releaseParticle = releaseParticle;
  OG.entities.particles.createParticles = createParticles;
  OG.entities.particles.createUpwardBurstParticles = createUpwardBurstParticles;
})(window);
