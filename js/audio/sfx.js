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
    if (!audio.audioCtx || audio.bossDrone) return;

    audio.bossDrone = audio.audioCtx.createOscillator();
    const osc2 = audio.audioCtx.createOscillator();
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
    audio.bossDrone._osc2 = osc2;
  }

  function stopBossDrone() {
    if (!audio.bossDrone) return;
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.001, audio.audioCtx.currentTime + 0.8);
    setTimeout(() => {
      try {
        audio.bossDrone.stop();
        audio.bossDrone._osc2.stop();
      } catch (e) {}
      audio.bossDrone = null;
      audio.bossDroneGain = null;
    }, 900);
  }

  function escalateBossDrone() {
    if (!audio.bossDrone || !audio.audioCtx) return;
    audio.bossDrone.frequency.linearRampToValueAtTime(80, audio.audioCtx.currentTime + 0.5);
    audio.bossDrone._osc2.frequency.linearRampToValueAtTime(83, audio.audioCtx.currentTime + 0.5);
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.18, audio.audioCtx.currentTime + 0.5);
  }

  function soundOk() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playTone(180, 'triangle', 0.18, 0.005, 0.12, t);
    playTone(90, 'sine', 0.1, 0.005, 0.15, t);
  }

  function soundGood(multiplier) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const baseFreq = 300 + (multiplier * 30);
    playTone(baseFreq, 'triangle', 0.22, 0.004, 0.1, t);
    playTone(baseFreq * 1.5, 'sine', 0.1, 0.004, 0.14, t);
  }

  function soundPerfect(multiplier) {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const baseFreq = 520 + (multiplier * 40);
    playTone(baseFreq, 'sine', 0.25, 0.002, 0.08, t);
    playTone(baseFreq * 2, 'sine', 0.12, 0.002, 0.18, t);
    playTone(baseFreq * 3, 'sine', 0.06, 0.005, 0.35, t);
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
    playTone(freq, 'sine', 0.2, 0.005, 0.2, t);
    playTone(freq * 1.5, 'sine', 0.08, 0.005, 0.25, t);
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
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playTone(160, 'sawtooth', 0.2, 0.005, 0.15, t);
    playTone(120, 'sawtooth', 0.15, 0.01, 0.2, t + 0.1);
  }

  function soundWaveClear() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    [330, 415, 523].forEach((freq, i) => {
      playTone(freq, 'sine', 0.2, 0.005, 0.15, t + i * 0.1);
      playTone(freq * 2, 'sine', 0.06, 0.005, 0.2, t + i * 0.1);
    });
  }

  function soundWorldClear() {
    if (!audio.audioCtx) return;
    if (audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const melody = [262, 330, 392, 330, 523];
    melody.forEach((freq, i) => {
      playTone(freq, 'sine', 0.25, 0.01, 0.2, t + i * 0.13);
      playTone(freq * 1.5, 'sine', 0.08, 0.01, 0.25, t + i * 0.13);
    });
    playTone(65, 'sine', 0.3, 0.01, 0.5, t);
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
