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


  // ══════════════════════════════════════════════════════════
  // PHASE 2 AUDIO UPGRADES
  // ══════════════════════════════════════════════════════════

  // ── 1. PERFECT HIT — rising-pitch "crack" per consecutive perfect ─────────
  // Pitch rises from 880 Hz (hit 1) up to ~1760 Hz (hit 8+)
  // A sharp transient crack + a crystal sine that decays fast
  function soundPerfectCrack(consecutivePerfects) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t   = audio.audioCtx.currentTime;
    const n   = Math.min(consecutivePerfects || 1, 10);
    // Semitone ladder — 0, +2, +4, +7, +9, +12, +14, +16, +19, +21
    const semitones = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    const rootHz    = 880;
    const freq      = rootHz * Math.pow(2, semitones[n - 1] / 12);

    // Sharp transient — very fast click noise (the "crack")
    playNoiseBurst(0.22, 0.038, t, 'highpass', freq * 1.6, 3.5);

    // Crystal sine body — the satisfying ring-out
    playSynth(freq,       'sine',     0.30, 0.001, 0.14, t, 0, false);
    playSynth(freq * 2,   'triangle', 0.15, 0.001, 0.09, t, 0, false);

    // On FILTHY perfect (3+), add a second harmonic shimmer
    if (n >= 3) {
      playSynth(freq * 1.5, 'sine', 0.10, 0.002, 0.07, t + 0.01, 0, false);
    }
  }

  // ── 2. ZONE TYPE AUDIO ────────────────────────────────────────────────────

  // EMBER — deep, warm thud (like a heavy muted drum)
  function soundZoneEmber() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Sub-bass body
    const osc = audio.audioCtx.createOscillator();
    const g   = audio.makeGain(0);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    osc.connect(g);
    g.gain.linearRampToValueAtTime(0.28, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.start(t); osc.stop(t + 0.15);
    // Short paper-thud noise click
    playNoiseBurst(0.08, 0.06, t, 'lowpass', 200, 1.2);
  }

  // INFERNO — high, sharp metallic ping (like a hammer on a steel rod)
  function soundZoneInferno() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    playSynth(2200, 'sine',     0.18, 0.001, 0.10, t, 0, false);
    playSynth(3300, 'triangle', 0.08, 0.001, 0.06, t, 0, false);
    playNoiseBurst(0.05, 0.025, t, 'highpass', 4000, 2.0);
  }

  // GHOST — atmospheric whoosh as it phases in (short filtered sweep)
  // Called when a ghost zone becomes visible (ghostVisible = true)
  function soundZoneGhostAppear() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Rising filtered noise sweep — airy "whoosh"
    const bufSize = Math.floor(audio.audioCtx.sampleRate * 0.32);
    const buf     = audio.audioCtx.createBuffer(1, bufSize, audio.audioCtx.sampleRate);
    const data    = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize * 0.5);

    const src = audio.audioCtx.createBufferSource();
    src.buffer = buf;

    const filt = audio.audioCtx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(300,  t);
    filt.frequency.exponentialRampToValueAtTime(1800, t + 0.28);
    filt.Q.setValueAtTime(0.6, t);

    const g = audio.makeGain(0);
    src.connect(filt); filt.connect(g);
    g.gain.linearRampToValueAtTime(0.12, t + 0.06);
    g.gain.linearRampToValueAtTime(0.0,  t + 0.30);
    src.start(t); src.stop(t + 0.34);
  }

  // ASH — glitchy static burst (danger signal)
  function soundZoneAsh() {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t = audio.audioCtx.currentTime;
    // Three rapid static pops with descending pitch glitch
    playNoiseBurst(0.25, 0.035, t,        'bandpass', 800,  0.4);
    playNoiseBurst(0.18, 0.025, t + 0.04, 'bandpass', 400,  0.6);
    playNoiseBurst(0.12, 0.020, t + 0.07, 'bandpass', 200,  0.8);
    // Low glitch tone underneath
    playSynth(55, 'sawtooth', 0.12, 0.002, 0.08, t, 1200, false);
  }

  // ── 3. COMBO CHAIN TONES — C E G B D ascending ──────────────────────────
  // Plays one note of the chord per streak step (streak 1-5+)
  // Notes: C4=261.63, E4=329.63, G4=392, B4=493.88, D5=587.33
  const COMBO_TONE_FREQS = [261.63, 329.63, 392.00, 493.88, 587.33];

  function soundComboTone(streakIndex) {
    if (!audio.audioCtx || audio.shouldThrottleAudio()) return;
    const t    = audio.audioCtx.currentTime;
    const step = Math.min(streakIndex, COMBO_TONE_FREQS.length - 1);
    const freq = COMBO_TONE_FREQS[step];
    const vol  = 0.14 + step * 0.02; // slightly louder as chain builds

    // Clean plucked bell tone
    playSynth(freq,     'sine',     vol,       0.001, 0.18, t, 0, false);
    playSynth(freq * 2, 'triangle', vol * 0.4, 0.001, 0.10, t, 0, false);

    // On the 5th note (D5, full chord complete) — add a satisfying shimmer
    if (step >= 4) {
      playSynth(freq * 1.5, 'sine', 0.08, 0.002, 0.12, t + 0.01, 0, true);
      playNoiseBurst(0.04, 0.05, t, 'highpass', 2400, 1.5);
    }
  }

  // ── 4. PHOENIX PHASE MUSIC LAYERS ────────────────────────────────────────
  // Called by phoenix-boss-v2.js _doPhaseTransition to add sonic intensity per phase.
  // Phase 0 → ambient drone only (existing startBossDrone)
  // Phase 1 → speed up LFO + mild filter open
  // Phase 2 → second osc layer (slightly detuned)
  // Phase 3 → heavy distortion gain bump + faster LFO
  // Phase 4 (SUPERNOVA) → special full hit (see below)

  function phoenixPhaseAudio(phaseIdx) {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;

    switch (phaseIdx) {
      case 1: { // BURN — speed up LFO, open filter slightly
        if (droneFilterLfo) droneFilterLfo.frequency.linearRampToValueAtTime(1.2, t + 1.5);
        if (droneFilter)    droneFilter.frequency.linearRampToValueAtTime(160, t + 1.5);
        if (audio.bossDroneGain) audio.bossDroneGain.gain.linearRampToValueAtTime(0.26, t + 1.5);
        break;
      }
      case 2: { // INFERNO — add a detuned third oscillator layer for thickness
        try {
          const osc3 = audio.audioCtx.createOscillator();
          osc3.type = 'sawtooth';
          osc3.frequency.setValueAtTime(55.8, t); // ~A1, slightly sharp for beating
          const osc3Gain = audio.makeGain(0);
          osc3.connect(osc3Gain);
          if (droneFilter) osc3Gain.connect(droneFilter);
          else if (audio.bossDroneGain) osc3Gain.connect(audio.bossDroneGain);
          osc3Gain.gain.linearRampToValueAtTime(0.10, t + 2.0);
          osc3.start(t);
          audio._phoenixOsc3 = osc3;
          audio._phoenixOsc3Gain = osc3Gain;
        } catch (e) {}
        if (droneFilterLfo) droneFilterLfo.frequency.linearRampToValueAtTime(2.2, t + 1.0);
        if (droneFilter) droneFilter.frequency.linearRampToValueAtTime(200, t + 1.0);
        if (audio.bossDroneGain) audio.bossDroneGain.gain.linearRampToValueAtTime(0.30, t + 1.0);
        break;
      }
      case 3: { // ASH — rhythmic distortion pulser added
        if (droneFilterLfo) {
          droneFilterLfo.frequency.linearRampToValueAtTime(4.0, t + 0.8);
        }
        if (droneFilter) {
          droneFilter.frequency.linearRampToValueAtTime(260, t + 0.5);
          droneFilter.Q.linearRampToValueAtTime(5, t + 0.5);
        }
        if (audio.bossDroneGain) audio.bossDroneGain.gain.linearRampToValueAtTime(0.35, t + 0.5);
        // Rapid metallic pulse accent
        for (let p = 0; p < 4; p++) {
          playSynth(80 + p * 15, 'sawtooth', 0.12, 0.01, 0.08, t + p * 0.12, 800, false);
        }
        break;
      }
      case 4: { // SUPERNOVA — see soundSupernovaHit below
        break;
      }
    }
  }

  // ── 5. SUPERNOVA — full orchestral/electronic drop ──────────────────────
  // This is the emotional climax. Three layers:
  //  A) Sub-bass explosion (deep 30Hz → 20Hz rumble)
  //  B) Orchestral-style ascending stab (brass-like sawtooth chord)
  //  C) Digital "world destruction" noise burst + metallic aftershock
  function soundSupernovaHit() {
    if (!audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;

    // A — Deep sub-bass rumble (the floor drops out)
    const subOsc = audio.audioCtx.createOscillator();
    const subG   = audio.makeGain(0);
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, t);
    subOsc.frequency.exponentialRampToValueAtTime(22, t + 1.8);
    subOsc.connect(subG);
    subG.gain.linearRampToValueAtTime(0.55, t + 0.08);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    subOsc.start(t); subOsc.stop(t + 1.9);

    // B — Orchestral brass stab chord (C2 power chord with octaves)
    const stab = [65.41, 98.00, 130.81, 196.00, 261.63]; // C2 E2 C3 G3 C4
    stab.forEach(function(freq, i) {
      playSynth(freq, 'sawtooth', 0.28 - i * 0.03, 0.04, 0.55, t + i * 0.025, 2000, true);
    });

    // Rising sweep synth (the "lift before the drop")
    const sweepOsc = audio.audioCtx.createOscillator();
    const sweepG   = audio.makeGain(0);
    sweepOsc.type = 'sawtooth';
    sweepOsc.frequency.setValueAtTime(80, t);
    sweepOsc.frequency.exponentialRampToValueAtTime(800, t + 0.35);
    sweepOsc.connect(sweepG);
    sweepG.gain.linearRampToValueAtTime(0.22, t + 0.1);
    sweepG.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    sweepOsc.start(t); sweepOsc.stop(t + 0.42);

    // C — Massive noise burst (digital explosion)
    playNoiseBurst(0.45, 0.25, t,        'lowpass',  1200, 1.5);
    playNoiseBurst(0.30, 0.40, t + 0.05, 'bandpass', 600,  2.5);
    playNoiseBurst(0.20, 0.60, t + 0.12, 'lowpass',  400,  1.0);

    // Metallic aftershock ring (the echo that lingers)
    setTimeout(function() {
      if (!audio.audioCtx) return;
      const t2 = audio.audioCtx.currentTime;
      playSynth(220, 'triangle', 0.16, 0.01, 0.9, t2, 0, true);
      playSynth(110, 'sawtooth', 0.12, 0.02, 1.2, t2, 500, true);
      playNoiseBurst(0.12, 0.8, t2, 'highpass', 1800, 1.2);
    }, 380);

    // Kill phoenix drone — SUPERNOVA owns the audio space
    if (audio.bossDroneGain && audio.audioCtx) {
      audio.bossDroneGain.gain.cancelScheduledValues(audio.audioCtx.currentTime);
      audio.bossDroneGain.gain.linearRampToValueAtTime(0.001, audio.audioCtx.currentTime + 0.3);
    }
  }

  // Cleanup phoenix extra oscillators when boss ends
  function cleanupPhoenixAudio() {
    try {
      if (audio._phoenixOsc3) { audio._phoenixOsc3.stop(); audio._phoenixOsc3.disconnect(); audio._phoenixOsc3 = null; }
      if (audio._phoenixOsc3Gain) { audio._phoenixOsc3Gain.disconnect(); audio._phoenixOsc3Gain = null; }
    } catch (e) {}
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
    playPop,
    // Phase 2 new
    soundPerfectCrack,
    soundZoneEmber,
    soundZoneInferno,
    soundZoneGhostAppear,
    soundZoneAsh,
    soundComboTone,
    phoenixPhaseAudio,
    soundSupernovaHit,
    cleanupPhoenixAudio
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
    playPop,
    // Phase 2 new
    soundPerfectCrack,
    soundZoneEmber,
    soundZoneInferno,
    soundZoneGhostAppear,
    soundZoneAsh,
    soundComboTone,
    phoenixPhaseAudio,
    soundSupernovaHit,
    cleanupPhoenixAudio
  });
})(window);
