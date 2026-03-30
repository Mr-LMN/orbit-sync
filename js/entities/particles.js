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
      p.dx = Math.cos(ang) * speed;
      p.dy = Math.sin(ang) * speed;
      p.life = 1;
      p.color = color;
      p.type = 'normal';
      p.size = Math.random() * 4 + 2;
      p.gravity = 0;
      p.drag = 0.985;
      p.spin = (Math.random() - 0.5) * 0.2;
      p.rotation = Math.random() * Math.PI * 2;
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
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 4;
      p.dx = Math.sin(spread) * speed * 0.45;
      p.dy = -Math.abs(Math.cos(spread) * speed);
      p.life = 1;
      p.color = color;
      p.type = 'burst';
      p.size = Math.random() * 3.2 + 1.8;
      p.gravity = 0.18 + Math.random() * 0.06;
      p.drag = 0.975;
      p.spin = (Math.random() - 0.5) * 0.25;
      p.rotation = Math.random() * Math.PI * 2;
      particles.push(p);
    }
  }

  OG.entities.particles.getParticle = getParticle;
  OG.entities.particles.releaseParticle = releaseParticle;
  OG.entities.particles.createParticles = createParticles;
  OG.entities.particles.createUpwardBurstParticles = createUpwardBurstParticles;
})(window);
