(function initSfxModule(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;

  function playTone(freq, type, vol, attack, decay, startTime) {
    if (!audio.sfxEnabled) return;
    if (audio.shouldThrottleAudio(true)) return;
    const osc = audio.audioCtx.createOscillator();
    const gain = audio.makeGain(0.001);
    osc.connect(gain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
    osc.start(startTime);
    osc.stop(startTime + attack + decay + 0.05);
  }

  function playNoiseBurst(vol, decay, startTime, filterType = 'bandpass', filterFreq = 1100, q = 0.8) {
    if (!audio.sfxEnabled) return;
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio(true)) return;
    const bufferSize = Math.max(1, Math.floor(audio.audioCtx.sampleRate * decay));
    const buffer = audio.audioCtx.createBuffer(1, bufferSize, audio.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - (i / bufferSize));

    const noise = audio.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audio.audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startTime);
    filter.Q.setValueAtTime(q, startTime);

    const noiseGain = audio.makeGain(0.001);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
    noise.start(startTime);
    noise.stop(startTime + decay + 0.04);
  }

  function startBossDrone() {
    if (!audio.sfxEnabled) return;
    if (!audio.audioCtx) return;
    if (audio.bossDrone && audio.bossDroneOsc2 && audio.bossDroneGain) return;
    if (audio.bossDroneStopTimeout) {
      clearTimeout(audio.bossDroneStopTimeout);
      audio.bossDroneStopTimeout = null;
    }
    audio.bossDroneStopToken += 1;
    disposeBossDroneNodes();

    audio.bossDrone = audio.audioCtx.createOscillator();
    const osc2 = audio.audioCtx.createOscillator();
    audio.bossDroneOsc2 = osc2;
    audio.bossDroneGain = audio.makeGain(0);

    audio.bossDrone.connect(audio.bossDroneGain);
    osc2.connect(audio.bossDroneGain);

    audio.bossDrone.type = 'sine';
    audio.bossDrone.frequency.setValueAtTime(55, audio.audioCtx.currentTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(57.5, audio.audioCtx.currentTime);

    audio.bossDroneGain.gain.linearRampToValueAtTime(0.12, audio.audioCtx.currentTime + 1.5);

    audio.bossDrone.start();
    osc2.start();
  }

  function disposeBossDroneNodes() {
    if (audio.bossDroneStopTimeout) {
      clearTimeout(audio.bossDroneStopTimeout);
      audio.bossDroneStopTimeout = null;
    }
    try {
      if (audio.bossDrone) {
        try { audio.bossDrone.stop(); } catch (e) {}
        try { audio.bossDrone.disconnect(); } catch (e) {}
      }
    } catch (e) {}
    try {
      if (audio.bossDroneOsc2) {
        try { audio.bossDroneOsc2.stop(); } catch (e) {}
        try { audio.bossDroneOsc2.disconnect(); } catch (e) {}
      }
    } catch (e) {}
    try {
      if (audio.bossDroneGain) {
        try { audio.bossDroneGain.disconnect(); } catch (e) {}
      }
    } catch (e) {}
    audio.bossDrone = null;
    audio.bossDroneOsc2 = null;
    audio.bossDroneGain = null;
  }

  function stopBossDrone() {
    if (!audio.bossDrone && !audio.bossDroneOsc2 && !audio.bossDroneGain) return;
    if (!audio.audioCtx || !audio.bossDroneGain) {
      disposeBossDroneNodes();
      return;
    }
    const stopToken = ++audio.bossDroneStopToken;
    audio.bossDroneGain.gain.cancelScheduledValues(audio.audioCtx.currentTime);
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.001, audio.audioCtx.currentTime + 0.8);
    audio.bossDroneStopTimeout = setTimeout(() => {
      if (stopToken !== audio.bossDroneStopToken) return;
      disposeBossDroneNodes();
      audio.bossDroneStopTimeout = null;
    }, 900);
  }

  function escalateBossDrone() {
    if (!audio.bossDrone || !audio.bossDroneOsc2 || !audio.bossDroneGain || !audio.audioCtx) return;
    audio.bossDrone.frequency.linearRampToValueAtTime(80, audio.audioCtx.currentTime + 0.5);
    audio.bossDroneOsc2.frequency.linearRampToValueAtTime(83, audio.audioCtx.currentTime + 0.5);
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.18, audio.audioCtx.currentTime + 0.5);
  }

  function soundOk() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Flat buzz: feels like a warning klaxon, not a reward
    playTone(160, 'square', 0.14, 0.002, 0.07, t);
    playTone(110, 'sawtooth', 0.12, 0.003, 0.10, t + 0.01);
    playNoiseBurst(0.04, 0.06, t, 'bandpass', 380, 0.7);
  }

  function soundGood(multiplier) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const worldNum = typeof levelData !== 'undefined' && levelData && levelData.id
      ? parseInt(levelData.id.split('-')[0], 10) : 1;
    const baseFreq = 300 + (multiplier * 30);
    if (worldNum === 2) {
      // Crystal — bright, glassy, short
      playTone(baseFreq * 1.5, 'sine', 0.18, 0.002, 0.07, t);
      playTone(baseFreq * 2.25, 'sine', 0.08, 0.002, 0.09, t);
      playNoiseBurst(0.02, 0.04, t, 'highpass', 2800, 2.5);
    } else if (worldNum === 3) {
      // Echo/resonance — warm, slightly padded
      playTone(baseFreq * 0.75, 'sine', 0.2, 0.006, 0.18, t);
      playTone(baseFreq, 'triangle', 0.12, 0.004, 0.14, t);
    } else {
      playTone(baseFreq, 'triangle', 0.22, 0.004, 0.1, t);
      playTone(baseFreq * 1.5, 'sine', 0.1, 0.004, 0.14, t);
    }
  }

  function soundPerfect(multiplier) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const worldNum = typeof levelData !== 'undefined' && levelData && levelData.id
      ? parseInt(levelData.id.split('-')[0], 10) : 1;
    const baseFreq = 520 + (multiplier * 40);
    if (worldNum === 2) {
      // Crystal — high shimmer, crisp transient
      playNoiseBurst(0.08, 0.06, t, 'bandpass', 3200, 3.0);
      playTone(baseFreq * 1.5, 'sine', 0.22, 0.001, 0.07, t);
      playTone(baseFreq * 3, 'sine', 0.1, 0.001, 0.14, t);
      playTone(baseFreq * 4.5, 'sine', 0.05, 0.002, 0.22, t + 0.02);
    } else if (worldNum === 3) {
      // Echo — warm tone with slight reverb tail
      playTone(baseFreq * 0.5, 'sine', 0.18, 0.005, 0.28, t);
      playTone(baseFreq, 'sine', 0.22, 0.002, 0.12, t);
      playTone(baseFreq * 2, 'sine', 0.1, 0.002, 0.22, t + 0.04);
      playTone(baseFreq * 2, 'sine', 0.04, 0.002, 0.32, t + 0.18); // echo tail
    } else {
      playTone(baseFreq, 'sine', 0.25, 0.002, 0.08, t);
      playTone(baseFreq * 2, 'sine', 0.12, 0.002, 0.18, t);
      playTone(baseFreq * 3, 'sine', 0.06, 0.005, 0.35, t);
    }
  }

  function soundCornerBonus(worldNum = 1) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const pitchBoost = worldNum === 2 ? 1.12 : 1;
    playNoiseBurst(worldNum === 2 ? 0.16 : 0.12, 0.08, t, 'bandpass', 1450 * pitchBoost, 1.8);
    playTone(740 * pitchBoost, 'triangle', 0.2, 0.003, 0.09, t);
    playTone(980 * pitchBoost, 'sine', 0.12, 0.002, 0.13, t + 0.03);
  }

  const multiNotes = [0, 0, 262, 294, 330, 370, 415, 466, 523];
  function soundMultiplierUp(multiplier) {
    if (!audio.audioCtx || multiplier < 2) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const freq = multiNotes[Math.min(multiplier, 8)];
    const vol = 0.16 + (Math.min(multiplier, 8) * 0.012); // louder at high mult
    playTone(freq, 'sine', vol, 0.003, 0.18, t);
    playTone(freq * 1.5, 'sine', vol * 0.45, 0.003, 0.22, t);
    if (multiplier >= 6) {
      // Extra shimmer layer at x6+
      playTone(freq * 2, 'sine', vol * 0.25, 0.002, 0.28, t + 0.02);
    }
    if (multiplier === 8) {
      // God mode — brief harmonic burst
      playNoiseBurst(0.04, 0.08, t, 'bandpass', freq * 3, 1.5);
    }
  }

  function soundFail() {
    if (!audio.sfxEnabled) return;
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const osc = audio.audioCtx.createOscillator();
    const gain = audio.makeGain(0.001);
    osc.connect(gain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  function soundLifeLost() {
    if (!audio.audioCtx || !audio.sfxEnabled) return;
    const t = audio.audioCtx.currentTime;
    // Descending alarm — three falling tones, distinct from soundFail
    playTone(280, 'sawtooth', 0.22, 0.004, 0.09, t);
    playTone(200, 'sawtooth', 0.18, 0.004, 0.13, t + 0.11);
    playTone(130, 'sawtooth', 0.16, 0.006, 0.22, t + 0.24);
    playNoiseBurst(0.07, 0.14, t, 'lowpass', 380, 0.55);
  }

  // ── LAST-LIFE HEARTBEAT ──────────────────────────────
  let _heartbeatInterval = null;

  function _playHeartThump(freq, vol, delay) {
    if (!audio.audioCtx || !audio.sfxEnabled) return;
    const t = audio.audioCtx.currentTime + delay;
    const osc = audio.audioCtx.createOscillator();
    const gain = audio.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.12);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(audio.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function startLastLifeDrone() {
    if (!audio.audioCtx) return;
    stopLastLifeDrone();

    function beatCycle() {
      _playHeartThump(50, 0.22, 0);       // lub — low, heavier
      _playHeartThump(60, 0.14, 0.26);    // dub — slightly higher, softer
    }
    beatCycle();
    _heartbeatInterval = setInterval(beatCycle, 1400); // matches CSS 1.4s cycle
  }

  function stopLastLifeDrone() {
    if (_heartbeatInterval) {
      clearInterval(_heartbeatInterval);
      _heartbeatInterval = null;
    }
  }
  // ── END LAST-LIFE HEARTBEAT ──────────────────────────

  function soundWaveClear() {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    const worldNum = typeof levelData !== 'undefined' && levelData && levelData.id
      ? parseInt(levelData.id.split('-')[0], 10) : 1;
    const baseNotes = worldNum === 2 ? [370, 466, 587] : worldNum === 3 ? [294, 370, 466] : [330, 415, 523];
    baseNotes.forEach((freq, i) => {
      playTone(freq, 'sine', 0.18, 0.003, 0.18, t + i * 0.09);
      playTone(freq * 2, 'sine', 0.07, 0.003, 0.22, t + i * 0.09);
      playTone(freq * 0.5, 'sine', 0.06, 0.008, 0.28, t + i * 0.09);
    });
    // Final resonance
    playTone(baseNotes[2] * 2, 'sine', 0.1, 0.002, 0.4, t + 0.28);
  }

  function soundWorldClear() {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    // Rising arpeggio with a punch at the end
    const melody = [262, 330, 392, 494, 523, 659];
    melody.forEach((freq, i) => {
      const delay = i * 0.11;
      playTone(freq, 'sine', 0.22, 0.004, 0.22, t + delay);
      playTone(freq * 2, 'sine', 0.06, 0.004, 0.3, t + delay);
    });
    // Sub bass hit
    playTone(55, 'sine', 0.28, 0.005, 0.45, t);
    playTone(82, 'sine', 0.18, 0.005, 0.35, t + 0.06);
    // Final chord swell
    [523, 659, 784].forEach((freq, i) => {
      playTone(freq, 'sine', 0.14, 0.02, 0.6, t + 0.66 + i * 0.04);
    });
    playNoiseBurst(0.06, 0.3, t + 0.66, 'lowpass', 800, 0.6);
  }

  function soundShieldBreak() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playNoiseBurst(0.26, 0.24, t, 'bandpass', 950, 1.4);
    playTone(150, 'square', 0.18, 0.004, 0.18, t);
    playTone(112, 'sawtooth', 0.2, 0.005, 0.22, t + 0.01);
    playTone(74, 'sine', 0.22, 0.004, 0.32, t);
  }

  function soundBossShieldHit(hp) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const danger = Math.max(0, 3 - Math.max(0, hp));
    const base = 260 + (danger * 24);
    playNoiseBurst(0.12 + (danger * 0.02), 0.085, t, 'bandpass', 1300 + (danger * 120), 2.2);
    playTone(base, 'square', 0.13, 0.002, 0.065, t);
    playTone(base * 0.72, 'triangle', 0.09, 0.002, 0.09, t + 0.004);
  }

  function soundCoreExposed() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playNoiseBurst(0.16, 0.12, t, 'highpass', 700, 0.7);
    playTone(220, 'sawtooth', 0.14, 0.006, 0.09, t);
    playTone(330, 'triangle', 0.18, 0.006, 0.12, t + 0.045);
    playTone(495, 'sine', 0.2, 0.004, 0.16, t + 0.095);
  }

  function soundCoreDamage() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playNoiseBurst(0.2, 0.11, t, 'bandpass', 980, 1.8);
    playTone(180, 'square', 0.2, 0.003, 0.08, t);
    playTone(240, 'sawtooth', 0.18, 0.003, 0.1, t + 0.018);
    playTone(360, 'triangle', 0.16, 0.003, 0.14, t + 0.05);
  }

  function soundBossDefeated() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    [523, 466, 392, 330, 262].forEach((freq, i) => {
      playTone(freq, 'sine', 0.2, 0.01, 0.18, t + i * 0.1);
    });
    setTimeout(() => {
      const t2 = audio.audioCtx.currentTime;
      [262, 330, 392, 523].forEach((freq, j) => {
        playTone(freq, 'sine', 0.18, 0.02, 0.5, t2 + j * 0.04);
      });
    }, 650);
  }

  function soundLifeZone() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      playTone(freq, 'sine', 0.12, 0.005, 0.2, t + i * 0.08);
    });
  }

  function soundLifeGained() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playTone(523, 'sine', 0.2, 0.005, 0.1, t);
    playTone(659, 'sine', 0.2, 0.005, 0.1, t + 0.1);
    playTone(784, 'sine', 0.22, 0.005, 0.25, t + 0.2);
  }

  function soundUIClick() {
    if (!audio.sfxEnabled) return;
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    playTone(800, 'sine', 0.08, 0.002, 0.04, audio.audioCtx.currentTime);
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

  Object.assign(audio, {
    playTone,
    playNoiseBurst,
    startBossDrone,
    stopBossDrone,
    escalateBossDrone,
    soundOk,
    soundGood,
    soundPerfect,
    soundCornerBonus,
    soundMultiplierUp,
    soundFail,
    soundLifeLost,
    startLastLifeDrone,
    stopLastLifeDrone,
    soundWaveClear,
    soundWorldClear,
    soundShieldBreak,
    soundBossShieldHit,
    soundCoreExposed,
    soundCoreDamage,
    soundBossDefeated,
    soundLifeZone,
    soundLifeGained,
    soundUIClick,
    playPop
  });

  Object.assign(window, {
    playTone,
    playNoiseBurst,
    startBossDrone,
    stopBossDrone,
    escalateBossDrone,
    soundOk,
    soundGood,
    soundPerfect,
    soundCornerBonus,
    soundMultiplierUp,
    soundFail,
    soundLifeLost,
    startLastLifeDrone,
    stopLastLifeDrone,
    soundWaveClear,
    soundWorldClear,
    soundShieldBreak,
    soundBossShieldHit,
    soundCoreExposed,
    soundCoreDamage,
    soundBossDefeated,
    soundLifeZone,
    soundLifeGained,
    soundUIClick,
    playPop
  });
})(window);
