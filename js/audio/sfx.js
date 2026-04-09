(function initSfxModule(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;

  // Global Delay/Reverb Bus setup for Tron-like spaciousness
  let delayNode = null;
  let delayFeedback = null;
  let delayFilter = null;

  function initSynthBus() {
    if (!audio.audioCtx || delayNode) return;
    try {
      delayNode = audio.audioCtx.createDelay();
      delayNode.delayTime.value = 0.25; // 250ms echo

      delayFeedback = audio.audioCtx.createGain();
      delayFeedback.gain.value = 0.25; // How much echo feedback

      delayFilter = audio.audioCtx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 1500;

      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);

      const outGain = audio.audioCtx.createGain();
      outGain.gain.value = 0.4;
      delayNode.connect(outGain);
      outGain.connect(audio.audioCtx.destination);
    } catch (e) {
      console.warn("Failed to init synth bus", e);
    }
  }

  // Powerful retro synth player
  // Combines oscillators, lowpass filter envelope (pluck), and optional delay
  function playSynth(freq, type, vol, attack, decay, startTime, filterMod = 0, useDelay = false) {
    if (!audio.sfxEnabled || !audio.audioCtx) return;
    if (audio.shouldThrottleAudio(true)) return;

    initSynthBus();

    const osc = audio.audioCtx.createOscillator();
    osc.type = type; // 'square', 'sawtooth', 'triangle', 'sine'
    osc.frequency.setValueAtTime(freq, startTime);

    const filter = audio.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';

    // Filter envelope (analog pluck effect)
    if (filterMod > 0) {
      filter.frequency.setValueAtTime(freq + filterMod, startTime);
      filter.frequency.exponentialRampToValueAtTime(freq, startTime + decay);
    } else {
      filter.frequency.setValueAtTime(20000, startTime);
    }

    const gain = audio.makeGain(0.001);

    osc.connect(filter);
    filter.connect(gain);

    if (useDelay && delayNode) {
      gain.connect(delayNode);
    }

    gain.gain.linearRampToValueAtTime(vol, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);

    osc.start(startTime);
    osc.stop(startTime + attack + decay + 0.1);
  }

  // Legacy fallback + simpler tones
  function playTone(freq, type, vol, attack, decay, startTime) {
    if (!audio.sfxEnabled || !audio.audioCtx) return;
    if (audio.shouldThrottleAudio(true)) return;
    playSynth(freq, type, vol, attack, decay, startTime, 0, false);
  }

  // Noise burst for impacts, claps, snares
  function playNoiseBurst(vol, decay, startTime, filterType = 'bandpass', filterFreq = 1100, q = 0.8) {
    if (!audio.sfxEnabled || !audio.audioCtx) return;
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

  // ── BOSS DRONE (Tron Style: Deep Filtered Sawtooth with LFO) ─────────────────────────
  let droneFilterLfo = null;
  let droneFilter = null;

  function startBossDrone() {
    if (!audio.sfxEnabled || !audio.audioCtx) return;
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

    // Synth drone filter
    droneFilter = audio.audioCtx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;
    droneFilter.Q.value = 2;

    // LFO for the filter (pulsing menace)
    droneFilterLfo = audio.audioCtx.createOscillator();
    droneFilterLfo.type = 'sine';
    droneFilterLfo.frequency.value = 0.5; // 0.5Hz pulse
    const lfoGain = audio.audioCtx.createGain();
    lfoGain.gain.value = 80;
    droneFilterLfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);

    audio.bossDroneGain = audio.makeGain(0);

    audio.bossDrone.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(audio.bossDroneGain);

    // Deep sawtooth synth
    audio.bossDrone.type = 'sawtooth';
    audio.bossDrone.frequency.setValueAtTime(41.2, audio.audioCtx.currentTime); // Deep E1

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(41.4, audio.audioCtx.currentTime);

    audio.bossDroneGain.gain.linearRampToValueAtTime(0.2, audio.audioCtx.currentTime + 2.0);

    audio.bossDrone.start();
    osc2.start();
    droneFilterLfo.start();
  }

  function disposeBossDroneNodes() {
    if (audio.bossDroneStopTimeout) {
      clearTimeout(audio.bossDroneStopTimeout);
      audio.bossDroneStopTimeout = null;
    }
    try {
      if (audio.bossDrone) { audio.bossDrone.stop(); audio.bossDrone.disconnect(); }
      if (audio.bossDroneOsc2) { audio.bossDroneOsc2.stop(); audio.bossDroneOsc2.disconnect(); }
      if (droneFilterLfo) { droneFilterLfo.stop(); droneFilterLfo.disconnect(); }
      if (droneFilter) { droneFilter.disconnect(); }
      if (audio.bossDroneGain) { audio.bossDroneGain.disconnect(); }
    } catch (e) {}
    audio.bossDrone = null;
    audio.bossDroneOsc2 = null;
    audio.bossDroneGain = null;
    droneFilterLfo = null;
    droneFilter = null;
  }

  function stopBossDrone() {
    if (!audio.bossDroneGain || !audio.audioCtx) {
      disposeBossDroneNodes();
      return;
    }
    const stopToken = ++audio.bossDroneStopToken;
    audio.bossDroneGain.gain.cancelScheduledValues(audio.audioCtx.currentTime);
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.001, audio.audioCtx.currentTime + 1.2);
    audio.bossDroneStopTimeout = setTimeout(() => {
      if (stopToken !== audio.bossDroneStopToken) return;
      disposeBossDroneNodes();
      audio.bossDroneStopTimeout = null;
    }, 1300);
  }

  function escalateBossDrone() {
    if (!audio.bossDrone || !audio.bossDroneOsc2 || !audio.bossDroneGain || !audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    audio.bossDrone.frequency.linearRampToValueAtTime(55, t + 0.5); // G1
    audio.bossDroneOsc2.frequency.linearRampToValueAtTime(55.2, t + 0.5);
    if (droneFilterLfo) {
        droneFilterLfo.frequency.linearRampToValueAtTime(2.0, t + 0.5); // Faster pulse
    }
    audio.bossDroneGain.gain.linearRampToValueAtTime(0.25, t + 0.5);
  }

  // ── GAMEPLAY SFX ────────────────────────────────────────────────────────
  function soundOk() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Tight retro click/blip
    playSynth(300, 'square', 0.1, 0.002, 0.05, t, 400, false);
  }

  function soundGood(multiplier) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const baseFreq = 220 + (multiplier * 40);
    // Warm retro chord pluck
    playSynth(baseFreq, 'sawtooth', 0.12, 0.005, 0.15, t, 1000, true);
    playSynth(baseFreq * 1.5, 'square', 0.08, 0.005, 0.12, t, 800, false);
  }

  function soundPerfect(multiplier) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const baseFreq = 440 + (multiplier * 20); // Higher, cleaner base pitch
    // Tight, satisfying crystal ding - much shorter decay
    playSynth(baseFreq, 'sine', 0.25, 0.001, 0.12, t, 0, false);
    playSynth(baseFreq * 1.5, 'triangle', 0.15, 0.001, 0.08, t, 0, false);
    playNoiseBurst(0.03, 0.04, t, 'highpass', 3000, 1.0); // Very short, subtle transient click
  }

  function soundCornerBonus(worldNum = 1) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Sci-fi power up sweep
    playSynth(600, 'sawtooth', 0.15, 0.01, 0.2, t, 1500, true);
    playSynth(900, 'square', 0.1, 0.05, 0.3, t + 0.05, 2000, true);
  }

  const multiNotes = [0, 0, 262, 294, 330, 370, 415, 466, 523];
  function soundMultiplierUp(multiplier) {
    if (!audio.audioCtx || multiplier < 2 || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const freq = multiNotes[Math.min(multiplier, 8)];
    const vol = 0.15 + (Math.min(multiplier, 8) * 0.01);

    // Epic synthwave chord swell
    playSynth(freq, 'sawtooth', vol, 0.02, 0.3, t, 1500, true);
    playSynth(freq * 1.5, 'square', vol * 0.6, 0.02, 0.3, t, 1000, true);
    playSynth(freq * 2, 'sine', vol * 0.4, 0.02, 0.4, t, 0, true);

    if (multiplier === 8) {
      // Max combo explosion
      playNoiseBurst(0.08, 0.2, t, 'bandpass', freq * 2, 0.5);
    }
  }

  function soundFail() {
    if (!audio.sfxEnabled || !audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Deep, gritty descending bass drop
    const osc = audio.audioCtx.createOscillator();
    const gain = audio.makeGain(0.001);
    const filter = audio.audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(100, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);

    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.5);

    playNoiseBurst(0.1, 0.3, t, 'lowpass', 600, 1.0);
  }

  function soundLifeLost() {
    if (!audio.audioCtx || !audio.sfxEnabled) return;
    const t = audio.audioCtx.currentTime;
    // Stuttering glitch failure sound
    playSynth(200, 'square', 0.2, 0.01, 0.1, t, 800, false);
    playSynth(180, 'square', 0.2, 0.01, 0.1, t + 0.1, 600, false);
    playSynth(150, 'sawtooth', 0.2, 0.01, 0.3, t + 0.2, 400, false);
    playNoiseBurst(0.15, 0.4, t + 0.2, 'lowpass', 500, 0.5);
  }

  // ── LAST-LIFE ALARM (Replaces faint heartbeat) ──────────────────────────────
  let _lastLifeInterval = null;

  function _playAlarmPulse(freq, vol, delay) {
    if (!audio.audioCtx || !audio.sfxEnabled) return;
    const t = audio.audioCtx.currentTime + delay;
    playSynth(freq, 'sawtooth', vol, 0.05, 0.3, t, 600, true);
  }

  function startLastLifeDrone() {
    if (!audio.audioCtx) return;
    stopLastLifeDrone();
    function pulse() {
      // Tense, electronic klaxon pulsing
      _playAlarmPulse(110, 0.15, 0);       // Low warning
      _playAlarmPulse(110, 0.15, 0.2);     // Double pulse
    }
    pulse();
    _lastLifeInterval = setInterval(pulse, 1000); // 1-second urgent repeating pulse
  }

  function stopLastLifeDrone() {
    if (_lastLifeInterval) {
      clearInterval(_lastLifeInterval);
      _lastLifeInterval = null;
    }
  }

  function soundWaveClear() {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    const baseNotes = [261.63, 329.63, 392.00, 523.25]; // C Maj arpeggio
    baseNotes.forEach((freq, i) => {
      playSynth(freq, 'square', 0.12, 0.02, 0.2, t + i * 0.1, 1200, true);
      playSynth(freq * 2, 'sine', 0.08, 0.02, 0.3, t + i * 0.1, 0, true);
    });
  }

  function soundWorldClear() {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    // Epic Synthwave Victory Chord
    const chord = [261.63, 329.63, 392.00, 523.25, 659.25];
    chord.forEach((freq, i) => {
      const delay = i * 0.1;
      playSynth(freq, 'sawtooth', 0.15, 0.05, 0.6, t + delay, 2000, true);
    });
    // Huge sub-bass drop
    playSynth(65.41, 'sawtooth', 0.3, 0.1, 1.5, t + 0.4, 400, false);
    playNoiseBurst(0.1, 1.5, t + 0.4, 'lowpass', 1000, 0.5);
  }

  function soundShieldBreak() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Glassy digital shatter
    playNoiseBurst(0.3, 0.3, t, 'highpass', 2000, 1.5);
    playSynth(800, 'square', 0.15, 0.01, 0.1, t, 3000, true);
    playSynth(600, 'sawtooth', 0.2, 0.01, 0.2, t + 0.02, 2000, false);
  }

  function soundBossShieldHit(hp) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    const danger = Math.max(0, 3 - Math.max(0, hp));
    const base = 150 + (danger * 40);
    // Heavy metallic chunk
    playSynth(base, 'square', 0.2, 0.01, 0.15, t, 1500, false);
    playNoiseBurst(0.15, 0.15, t, 'bandpass', 800 + danger*200, 1.0);
  }

  function soundCoreExposed() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // High-tech power down reveal
    playSynth(800, 'sawtooth', 0.15, 0.02, 0.4, t, 2500, true);
    playSynth(400, 'square', 0.15, 0.02, 0.5, t, 1500, true);

    const osc = audio.audioCtx.createOscillator();
    const gain = audio.makeGain(0.001);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.4);
    osc.connect(gain);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  function soundCoreDamage() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Crunchy synth impact
    playSynth(120, 'sawtooth', 0.25, 0.01, 0.15, t, 1500, false);
    playNoiseBurst(0.2, 0.15, t, 'bandpass', 600, 1.2);
  }

  function soundFlameBurst() {
    if (!audio.audioCtx || !audio.sfxGain) return;
    const t = audio.audioCtx.currentTime;

    // Create noise buffer for fire roar
    const bufferSize = audio.audioCtx.sampleRate * 2; // 2 seconds of noise
    const buffer = audio.audioCtx.createBuffer(1, bufferSize, audio.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = audio.audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // Lowpass filter to muffle the white noise into a "roar"
    const filter = audio.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, t);
    filter.frequency.exponentialRampToValueAtTime(1200, t + 0.2); // swell up
    filter.frequency.exponentialRampToValueAtTime(50, t + 1.5);   // die down

    // Gain envelope for the burst
    const gainNode = audio.makeGain(0);
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(1.0, t + 0.1); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 1.5); // Slow fiery decay

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audio.sfxGain);

    noiseSource.start(t);
    noiseSource.stop(t + 2);
  }

  function soundBossDefeated() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Massive digital explosion sequence
    playNoiseBurst(0.3, 1.0, t, 'lowpass', 1500, 1.0);
    playNoiseBurst(0.2, 1.5, t+0.2, 'bandpass', 800, 2.0);

    // Descending failure alarm
    [400, 300, 200, 100].forEach((freq, i) => {
      playSynth(freq, 'sawtooth', 0.2, 0.05, 0.3, t + i * 0.15, 1000, true);
    });

    setTimeout(() => {
      const t2 = audio.audioCtx.currentTime;
      playSynth(50, 'sawtooth', 0.4, 0.1, 2.0, t2, 500, false);
      playNoiseBurst(0.4, 2.0, t2, 'lowpass', 600, 0.5);
    }, 800);
  }

  function soundLifeZone() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Ethereal hum
    playSynth(440, 'sine', 0.1, 0.1, 0.3, t, 0, true);
    playSynth(554.37, 'sine', 0.1, 0.1, 0.3, t + 0.1, 0, true);
  }

  function soundLifeGained() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Joyful synth sequence
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      playSynth(freq, 'square', 0.15, 0.02, 0.2, t + i * 0.08, 2000, true);
    });
  }

  function soundUIClick() {
    if (!audio.sfxEnabled || !audio.audioCtx || audio.shouldThrottleAudio()) return;
    playSynth(800, 'square', 0.05, 0.005, 0.05, audio.audioCtx.currentTime, 1200, false);
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
    soundFlameBurst,
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
    soundFlameBurst,
    soundLifeZone,
    soundLifeGained,
    soundUIClick,
    playPop
  });
})(window);
