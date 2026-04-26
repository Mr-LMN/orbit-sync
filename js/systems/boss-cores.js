(function initBossCores(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.bossCores = OG.systems.bossCores || {};

  // Boss core definitions by boss type
  const CORE_CONFIGS = {
    aegis: {
      size: 70,
      colors: { base: '#0099ff', accent: '#00ff88', pulse: '#ff3366' },
      render: renderAegisCore,
      phaseCallback: updateAegisPhase
    },
    prism: {
      size: 75,
      colors: { base: '#00e8ff', accent: '#ff4fd8', pulse: '#ffffff' },
      render: renderPrismCore,
      phaseCallback: updatePrismPhase
    },
    spectre: {
      size: 68,
      colors: { base: '#7dfffb', accent: '#ff9f5d', pulse: '#ff3366' },
      render: renderSpectreCore,
      phaseCallback: updateSpectrePhase
    },
    corruptor: {
      size: 72,
      colors: { base: '#ff6677', accent: '#ffaa00', pulse: '#ff0066' },
      render: renderCorruptorCore,
      phaseCallback: updateCorruptorPhase
    },
    null_gate: {
      size: 70,
      colors: { base: '#a8d8ff', accent: '#6688ff', pulse: '#ffffff' },
      render: renderNullGateCore,
      phaseCallback: updateNullGatePhase
    },
    solar_core: {
      size: 78,
      colors: { base: '#ff7a1a', accent: '#ffe570', pulse: '#fff6c2' },
      render: renderSolarCore,
      phaseCallback: updateSolarPhase
    }
  };

  let _activeCoreType = null;
  let _corePhase = 0;
  let _coreHealth = 100;
  let _coreMaxHealth = 100;
  let _coreAnimTime = 0;
  let _corePulseIntensity = 0;

  // ─── GENERIC HELPERS ──────────────────────────────────────────────────────
  function drawGlow(ctx, x, y, radius, color, intensity) {
    const opacity = intensity * 0.6;
    ctx.shadowColor = color;
    ctx.shadowBlur = radius * 1.5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawGlowStop(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // ─── AEGIS CORE (Shield orb that breaks away) ─────────────────────────────
  function renderAegisCore(ctx, x, y, phase, health, animTime) {
    const size = 70;
    
    // Calculate shield count based on targets array to pulse/break sequentially
    let activeShields = 0;
    let maxShields = 4; // Assume max 4 for Aegis
    if (window.targets) {
        for (let i = 0; i < window.targets.length; i++) {
            if (window.targets[i].isBossShield && window.targets[i].active) {
                activeShields++;
            }
        }
    }
    const healthPercent = phase === 1 ? (activeShields / maxShields) : (health / 100);

    const isExposed = phase === 2;
    const pulseFactor = Math.sin(animTime * 0.008);
    
    if (!isExposed) {
      // Shield integrity rings
      ctx.strokeStyle = '#0099ff';
      ctx.lineWidth = 3;

      // Outer ring
      if (activeShields >= 3) {
          ctx.globalAlpha = 0.8 + (pulseFactor * 0.2);
          ctx.beginPath();
          ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
          ctx.stroke();
      }

      // Middle ring
      if (activeShields >= 2) {
          ctx.globalAlpha = 0.8 + (pulseFactor * 0.2);
          ctx.beginPath();
          ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
          ctx.stroke();
      }

      // Inner ring
      if (activeShields >= 1) {
          ctx.globalAlpha = 0.8 + (pulseFactor * 0.2);
          ctx.beginPath();
          ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
          ctx.stroke();
      }
    }

    // Core nucleus
    ctx.globalAlpha = 1;
    const corePulse = isExposed ? (1 + Math.sin(animTime * 0.015) * 0.2) : 1;
    const gradient = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, 0, x, y, size * 0.35 * corePulse);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#00ff88');
    gradient.addColorStop(1, '#0099ff');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.35 * corePulse, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing outer glow
    drawGlow(ctx, x, y, size * 0.4, isExposed ? '#00ff88' : '#0099ff', isExposed ? 1.0 : healthPercent);
    ctx.fillStyle = isExposed ? 'rgba(0, 255, 136, 0.3)' : 'rgba(0, 255, 136, 0.1)';
    ctx.beginPath();
    ctx.arc(x, y, size * (1 + pulseFactor * 0.15), 0, Math.PI * 2);
    ctx.fill();
    drawGlowStop(ctx);
  }

  function updateAegisPhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── PRISM CORE (Rotating faceted crystal) ─────────────────────────────────
  function renderPrismCore(ctx, x, y, phase, health, animTime) {
    const size = 75;
    const rotation = animTime * 0.002; // Slow rotation
    const healthPercent = health / 100;
    
    // Draw 6 facets
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + rotation;
      const nextAngle = (Math.PI / 3) * (i + 1) + rotation;
      
      // Facet brightness based on phase
      const phaseBrightness = phase === i || phase === (i + 3) % 6 ? 1 : 0.4;
      
      ctx.fillStyle = phase % 2 === 0 
        ? `rgba(0, 232, 255, ${0.5 * phaseBrightness})`
        : `rgba(255, 79, 216, ${0.5 * phaseBrightness})`;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, size * 0.6, angle, nextAngle);
      ctx.closePath();
      ctx.fill();
      
      // Facet outline
      ctx.strokeStyle = phase % 2 === 0 ? '#00e8ff' : '#ff4fd8';
      ctx.lineWidth = 2 * phaseBrightness;
      ctx.stroke();
    }
    
    // Core nucleus
    const gradient = ctx.createRadialGradient(x - 10, y - 10, 0, x, y, size * 0.25);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.6, '#00e8ff');
    gradient.addColorStop(1, '#ff4fd8');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Outer glow
    drawGlow(ctx, x, y, size * 0.3, phase % 2 === 0 ? '#00e8ff' : '#ff4fd8', healthPercent);
    ctx.strokeStyle = phase % 2 === 0 ? 'rgba(0, 232, 255, 0.3)' : 'rgba(255, 79, 216, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * (1 + Math.sin(animTime * 0.006) * 0.1), 0, Math.PI * 2);
    ctx.stroke();
    drawGlowStop(ctx);
  }

  function updatePrismPhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── SPECTRE CORE (Ghost that flickers & splits) ───────────────────────────
  function renderSpectreCore(ctx, x, y, phase, health, animTime) {
    const size = 68;
    const healthPercent = health / 100;
    const flicker = Math.sin(animTime * 0.012) > 0.3 ? 1 : 0.4;
    
    // Outer ghostly aura
    ctx.globalAlpha = 0.3 * flicker;
    ctx.fillStyle = '#7dfffb';
    ctx.beginPath();
    ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Main ghost body
    ctx.globalAlpha = healthPercent * flicker;
    const gradient = ctx.createRadialGradient(x - 15, y - 15, 0, x, y, size * 0.6);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#7dfffb');
    gradient.addColorStop(1, 'rgba(125, 255, 251, 0.1)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing core
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255, 159, 93, ${0.7 * flicker})`;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3 * Math.sin(animTime * 0.008), 0, Math.PI * 2);
    ctx.fill();
    
    // Outline
    ctx.strokeStyle = `rgba(125, 255, 251, ${0.6 * flicker})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function updateSpectrePhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── CORRUPTOR CORE (Pulsing corruption sphere) ────────────────────────────
  function renderCorruptorCore(ctx, x, y, phase, health, animTime) {
    const size = 72;
    const healthPercent = health / 100;
    const corruptionSpread = Math.sin(animTime * 0.006) * 0.3 + 0.7;
    
    // Corruption waves
    for (let wave = 0; wave < 3; wave++) {
      const waveRadius = size * (0.5 + wave * 0.25) * corruptionSpread;
      const waveAlpha = Math.max(0, 1 - wave * 0.3);
      ctx.strokeStyle = `rgba(255, 102, 119, ${0.4 * waveAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Core nucleus with glitch effect
    const glitch = Math.random() > 0.7 ? Math.random() * 4 - 2 : 0;
    const gradient = ctx.createRadialGradient(x - 20 + glitch, y - 20 + glitch, 0, x, y, size * 0.5);
    gradient.addColorStop(0, '#ffaa00');
    gradient.addColorStop(0.5, '#ff6677');
    gradient.addColorStop(1, 'rgba(255, 0, 102, 0.5)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing outer ring
    drawGlow(ctx, x, y, size * 0.5, '#ff6677', healthPercent * corruptionSpread);
    ctx.strokeStyle = `rgba(255, 0, 102, ${0.5 * healthPercent})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * (1 + Math.sin(animTime * 0.007) * 0.15), 0, Math.PI * 2);
    ctx.stroke();
    drawGlowStop(ctx);
  }

  function updateCorruptorPhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── NULL GATE CORE (Void shadow, flickers invisible) ──────────────────────
  function renderNullGateCore(ctx, x, y, phase, health, animTime) {
    const size = 70;
    const healthPercent = health / 100;
    const voidPhase = Math.sin(animTime * 0.005); // Slow flicker
    const visibility = Math.max(0.2, Math.cos(animTime * 0.009));
    
    // Void distortion outer ring
    ctx.globalAlpha = visibility * 0.3;
    ctx.strokeStyle = '#a8d8ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, size * 1.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Shadow core
    ctx.globalAlpha = visibility * 0.7;
    const shadowGrad = ctx.createRadialGradient(x - 25, y - 25, 0, x, y, size * 0.6);
    shadowGrad.addColorStop(0, 'rgba(200, 232, 255, 0.2)');
    shadowGrad.addColorStop(0.5, 'rgba(100, 100, 150, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing void center
    ctx.globalAlpha = visibility * healthPercent;
    ctx.fillStyle = 'rgba(168, 216, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3 * visibility, 0, Math.PI * 2);
    ctx.fill();
    
    // Distortion effect
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(168, 216, 255, ${0.2 * visibility})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + animTime * 0.003;
      const radius = size * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius
      );
      ctx.stroke();
    }
  }

  function updateNullGatePhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── SOLAR CORE (Inferno globe with heat shimmer) ──────────────────────────
  function renderSolarCore(ctx, x, y, phase, health, animTime) {
    const size = 78;
    const healthPercent = health / 100;
    const shimmer = Math.sin(animTime * 0.01) * 0.15 + 0.85;
    
    // Heat shimmer distortion layers
    for (let layer = 0; layer < 3; layer++) {
      const layerAlpha = (1 - layer * 0.3) * 0.2;
      ctx.globalAlpha = layerAlpha;
      ctx.fillStyle = layer === 0 ? '#ffe570' : layer === 1 ? '#ff7a1a' : '#ff3333';
      ctx.beginPath();
      ctx.arc(x, y, size * (0.8 + layer * 0.3) * shimmer, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Main inferno core
    ctx.globalAlpha = 1;
    const gradient = ctx.createRadialGradient(x - 25, y - 25, 0, x, y, size * 0.65);
    gradient.addColorStop(0, '#fff6c2');
    gradient.addColorStop(0.2, '#ffe570');
    gradient.addColorStop(0.5, '#ff7a1a');
    gradient.addColorStop(1, 'rgba(100, 16, 16, 0.8)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.65, 0, Math.PI * 2);
    ctx.fill();
    
    // Pulsing fire ring
    drawGlow(ctx, x, y, size * 0.7, '#ff7a1a', healthPercent * shimmer);
    ctx.strokeStyle = `rgba(255, 122, 26, ${0.6 * healthPercent * shimmer})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size * shimmer, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner glow
    ctx.strokeStyle = `rgba(255, 230, 112, ${0.4 * healthPercent})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    drawGlowStop(ctx);
  }

  function updateSolarPhase(phase, health) {
    _corePhase = phase;
    _coreHealth = health;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────
  OG.systems.bossCores.activate = function(bossType, health = 100) {
    if (CORE_CONFIGS[bossType]) {
      _activeCoreType = bossType;
      _coreHealth = health;
      _coreMaxHealth = health;
      _coreAnimTime = 0;
      _corePhase = 0;
      return true;
    }
    return false;
  };

  OG.systems.bossCores.deactivate = function() {
    _activeCoreType = null;
  };

  OG.systems.bossCores.updateHealth = function(newHealth) {
    _coreHealth = Math.max(0, Math.min(_coreMaxHealth, newHealth));
  };

  OG.systems.bossCores.updatePhase = function(newPhase) {
    _corePhase = newPhase;
  };

  OG.systems.bossCores.render = function(ctx, x, y) {
    if (!_activeCoreType || !CORE_CONFIGS[_activeCoreType]) {
      return;
    }
    
    _coreAnimTime += 1;
    const config = CORE_CONFIGS[_activeCoreType];
    
    // Save context state
    const savedAlpha = ctx.globalAlpha;
    const savedShadow = ctx.shadowColor;
    
    config.render(ctx, x, y, _corePhase, _coreHealth, _coreAnimTime);
    
    // Restore context state
    ctx.globalAlpha = savedAlpha;
    ctx.shadowColor = savedShadow;
    ctx.shadowBlur = 0;
  };

  OG.systems.bossCores.isActive = function() {
    return _activeCoreType !== null;
  };

  OG.systems.bossCores.getActiveType = function() {
    return _activeCoreType;
  };

})(window);
