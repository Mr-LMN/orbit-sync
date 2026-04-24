(function initMusicModule(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;

  async function loadAudioFile(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audio.audioCtx.decodeAudioData(arrayBuffer);
  }

  function getBaseTrackForLevel(levelIdx) {
    const level = campaign[levelIdx];
    if (!level) return 'assets/Base.mp3';
    const worldNum = parseInt(level.id.split('-')[0], 10);
    if (worldNum === 6) return 'assets/Base-3.mp3'; // World 6 fiery intense track
    return (worldNum === 2 || worldNum === 4) ? 'assets/Base-2.mp3' : 'assets/Base.mp3';
  }

  function getBossTrackForLevel(levelIdx) {
    const level = campaign[levelIdx];
    if (!level || !level.boss) return 'assets/boss.mp3';
    if (level.id === '2-6' && level.boss === 'prism') return 'assets/calculated_threat.mp3';
    if (level.id === '6-6' && level.boss === 'solar_core') return 'assets/boss_solar.mp3'; // Solar Core theme
    return 'assets/boss.mp3';
  }

  function _isMusicBossStage(level) {
    return !!(level && (level.boss === 'aegis' || level.boss === 'prism' || level.boss === 'corruptor' || level.boss === 'null_gate' || level.boss === 'solar_core'));
  }

  function hasActiveMusicGraph() {
    return !!(
      audio.baseSource &&
      audio.bossSource &&
      audio.baseGain &&
      audio.bossGain
    );
  }

  async function startDynamicMusic(baseTrackPath) {
    if (!audio.audioCtx || !audio.musicEnabled) return;
    const bossTrackPath = getBossTrackForLevel(currentLevelIdx);
    if (
      audio.isMusicPlaying &&
      audio.currentBaseTrack === baseTrackPath &&
      audio.currentBossTrack === bossTrackPath &&
      hasActiveMusicGraph()
    ) {
      return;
    }
    if (audio.musicStartPromise && audio.pendingBaseTrack === baseTrackPath) {
      return audio.musicStartPromise;
    }

    // Ownership guard prevents duplicate music stacks after revive/restart/level transitions.
    const startToken = ++audio.musicStartToken;
    audio.pendingBaseTrack = baseTrackPath;
    audio.musicStartPromise = (async function startMusicWithOwnership() {
      try {
        if (!audio.baseAudioBuffers[baseTrackPath]) {
          audio.baseAudioBuffers[baseTrackPath] = await loadAudioFile(baseTrackPath);
        }
        if (!audio.bossAudioBuffers[bossTrackPath]) {
          audio.bossAudioBuffers[bossTrackPath] = await loadAudioFile(bossTrackPath);
        }
        if (startToken !== audio.musicStartToken) return;

        disposeMusicNodes();
        if (startToken !== audio.musicStartToken) return;

        audio.baseSource = audio.audioCtx.createBufferSource();
        audio.bossSource = audio.audioCtx.createBufferSource();
        audio.baseSource.buffer = audio.baseAudioBuffers[baseTrackPath];
        audio.bossSource.buffer = audio.bossAudioBuffers[bossTrackPath];
        audio.baseSource.loop = true;
        audio.bossSource.loop = true;


        audio.baseGain = audio.audioCtx.createGain();
        audio.bossGain = audio.audioCtx.createGain();

        // Synthwave music master filter
        if (!audio.musicFilter) {
          audio.musicFilter = audio.audioCtx.createBiquadFilter();
          audio.musicFilter.type = 'lowpass';
          audio.musicFilter.frequency.value = 6000; // Roll off harsh highs
          audio.musicFilter.connect(audio.audioCtx.destination);
        }

        audio.bossGain.gain.value = 0;
        audio.baseGain.gain.setValueAtTime(0, audio.audioCtx.currentTime);
        audio.baseGain.gain.linearRampToValueAtTime(0.32, audio.audioCtx.currentTime + 2.5);

        audio.baseSource.connect(audio.baseGain);
        audio.baseGain.connect(audio.musicFilter);
        audio.bossSource.connect(audio.bossGain);
        audio.bossGain.connect(audio.musicFilter);


        const startTime = audio.audioCtx.currentTime + 0.1;
        audio.baseSource.start(startTime);
        audio.bossSource.start(startTime);
        audio.currentBaseTrack = baseTrackPath;
        audio.currentBossTrack = bossTrackPath;
        audio.isMusicPlaying = true;
        audio.currentMusicState = { mult: -1, boss: null };
      } catch (e) {
        // Silently fail dynamic music
      } finally {
        if (audio.musicStartToken === startToken) {
          audio.musicStartPromise = null;
          audio.pendingBaseTrack = null;
        }
      }
    })();
    return audio.musicStartPromise;
  }

  function disposeMusicNodes() {
    try {
      if (audio.baseSource) {
        try { audio.baseSource.stop(); } catch (e) {}
        try { audio.baseSource.disconnect(); } catch (e) {}
      }
    } catch (e) {}
    try {
      if (audio.bossSource) {
        try { audio.bossSource.stop(); } catch (e) {}
        try { audio.bossSource.disconnect(); } catch (e) {}
      }
    } catch (e) {}
    try { if (audio.baseGain) audio.baseGain.disconnect(); } catch (e) {}
    try { if (audio.bossGain) audio.bossGain.disconnect(); } catch (e) {}
    audio.baseSource = null;
    audio.bossSource = null;
    audio.baseGain = null;
    audio.bossGain = null;
    audio.isMusicPlaying = false;
  }

  function stopDynamicMusic() {
    if (!audio.audioCtx) return;
    try {
      audio.musicStartToken += 1;
      audio.musicStartPromise = null;
      audio.pendingBaseTrack = null;
      if (audio.baseGain) {
        audio.baseGain.gain.cancelScheduledValues(audio.audioCtx.currentTime);
        audio.baseGain.gain.setValueAtTime(0, audio.audioCtx.currentTime);
      }
      if (audio.bossGain) {
        const _stopNow = audio.audioCtx.currentTime;
        audio.bossGain.gain.cancelScheduledValues(_stopNow);
        audio.bossGain.gain.setValueAtTime(audio.bossGain.gain.value, _stopNow);
        audio.bossGain.gain.linearRampToValueAtTime(0, _stopNow + 0.3);
      }
      disposeMusicNodes();
      audio.currentBaseTrack = null;
      audio.currentBossTrack = null;
      audio.currentMusicState = { mult: 1, boss: false };
    } catch (e) {
      // Silently fail stopDynamicMusic
    }
  }

  function baseVolumeForMultiplier(currentMultiplier) {
    return Math.min(0.46, 0.28 + (Math.max(1, currentMultiplier) - 1) * 0.015);
  }

  function setMusicLayer(layer) {
    if (!audio.audioCtx || !audio.baseGain || !audio.bossGain) return;
    const now = audio.audioCtx.currentTime;
    const clamped = Math.max(1, Math.min(3, layer));
    const baseTargets = { 1: 0.28, 2: 0.36, 3: 0.46 };
    const bossTargets = { 1: 0.0, 2: 0.08, 3: 0.14 };
    audio.baseGain.gain.cancelScheduledValues(now);
    audio.bossGain.gain.cancelScheduledValues(now);
    audio.baseGain.gain.linearRampToValueAtTime(baseTargets[clamped], now + 0.3);
    audio.bossGain.gain.linearRampToValueAtTime(bossTargets[clamped], now + 0.3);
  }

  async function ensureCorrectMusicForLevel() {
    if (!audio.audioCtx || !audio.musicEnabled) return;
    const token = ++audio.musicLoadToken;
    const wantedTrack = getBaseTrackForLevel(currentLevelIdx);
    await startDynamicMusic(wantedTrack);
    if (token !== audio.musicLoadToken) return;
    const isMusicBoss = levelData && _isMusicBossStage(levelData);
    updateMusicState(multiplier, !!isMusicBoss);
  }


  // ── ADAPTIVE MUSIC LAYERS — 8 explicit levels tied to combo multiplier ────
  // Each multiplier step is a full audio state: base volume, boss mix level,
  // playback rate, and music filter cutoff frequency.
  // Higher levels have progressively brighter, faster, louder, more intense sound.
  const ADAPTIVE_LAYERS = [
    null, // index 0 unused (multiplier is 1-indexed)
    { base: 0.28, boss: 0.00, rate: 1.000, filterHz: 8000  }, // ×1 — calm, ambient
    { base: 0.30, boss: 0.00, rate: 1.005, filterHz: 10000 }, // ×2 — slightly warmer
    { base: 0.32, boss: 0.03, rate: 1.012, filterHz: 13000 }, // ×3 — building
    { base: 0.35, boss: 0.06, rate: 1.020, filterHz: 16000 }, // ×4 — engaging
    { base: 0.38, boss: 0.09, rate: 1.030, filterHz: 18000 }, // ×5 — heating up
    { base: 0.41, boss: 0.12, rate: 1.042, filterHz: 20000 }, // ×6 — intense
    { base: 0.44, boss: 0.14, rate: 1.055, filterHz: 23000 }, // ×7 — climactic
    { base: 0.46, boss: 0.16, rate: 1.070, filterHz: 26000 }, // ×8 — maximum overdrive
  ];

  // Boss override layer — base is ducked, boss mix is prominent
  const BOSS_LAYER = { base: 0.12, boss: 0.26, rate: null }; // rate: null = keep from multiplier

  function setAdaptiveMusicLayer(currentMultiplier, isBossActive) {
    if (!audio.isMusicPlaying || !audio.audioCtx || !audio.baseGain || !audio.bossGain || !audio.baseSource || !audio.bossSource) return;

    const clamped = Math.max(1, Math.min(8, currentMultiplier || 1));
    const layer   = ADAPTIVE_LAYERS[clamped];

    // Deduplicate — skip if nothing changed
    if (
      audio.currentMusicState.mult === clamped &&
      audio.currentMusicState.boss === isBossActive
    ) return;
    audio.currentMusicState.mult = clamped;
    audio.currentMusicState.boss = isBossActive;

    const now = audio.audioCtx.currentTime;

    // Volume targets
    const targetBase = isBossActive ? BOSS_LAYER.base : layer.base;
    const targetBoss = isBossActive ? BOSS_LAYER.boss : 0;

    audio.baseGain.gain.cancelScheduledValues(now);
    audio.bossGain.gain.cancelScheduledValues(now);
    audio.baseGain.gain.linearRampToValueAtTime(targetBase, now + 0.4);
    audio.bossGain.gain.linearRampToValueAtTime(targetBoss, now + 0.4);

    // Playback rate — world-aware base + per-layer delta
    const worldNum = typeof levelData !== 'undefined' && levelData && levelData.id
      ? parseInt(levelData.id.split('-')[0], 10) : 1;
    const worldBaseRate = worldNum === 2 ? 1.06 : worldNum === 3 ? 1.03 : worldNum === 4 ? 1.09 : worldNum === 5 ? 0.94 : 1.0;
    const layerRate = layer.rate; // already an absolute rate, apply world offset delta
    const rateOffset = layerRate - 1.0; // delta above 1.0
    const targetRate  = worldBaseRate + rateOffset;

    audio.baseSource.playbackRate.cancelScheduledValues(now);
    audio.bossSource.playbackRate.cancelScheduledValues(now);
    audio.baseSource.playbackRate.linearRampToValueAtTime(targetRate, now + 1.0);
    audio.bossSource.playbackRate.linearRampToValueAtTime(targetRate, now + 1.0);

    // Music filter brightness — ramps per layer, giving a subtle "opening up" feel
    if (audio.musicFilter) {
      audio.musicFilter.frequency.cancelScheduledValues(now);
      audio.musicFilter.frequency.linearRampToValueAtTime(layer.filterHz, now + 0.8);
    }
  }

  // Legacy compatibility shim — any code calling updateMusicState still works
  function updateMusicState(currentMultiplier, isBossActive) {
    setAdaptiveMusicLayer(currentMultiplier, isBossActive);
  }

  // Called by phoenix phase transitions to set a specific boss intensity
  function setBossPhaseAudio(phaseIdx) {
    if (!audio.isMusicPlaying || !audio.audioCtx || !audio.baseGain || !audio.bossGain) return;
    const now = audio.audioCtx.currentTime;
    // Phase-indexed boss mix — gets louder each phase
    const bossVols = [0.10, 0.15, 0.20, 0.25, 0.30];
    const baseVols = [0.18, 0.15, 0.13, 0.11, 0.09];
    const idx = Math.max(0, Math.min(phaseIdx, bossVols.length - 1));
    audio.baseGain.gain.cancelScheduledValues(now);
    audio.bossGain.gain.cancelScheduledValues(now);
    audio.baseGain.gain.linearRampToValueAtTime(baseVols[idx], now + 0.6);
    audio.bossGain.gain.linearRampToValueAtTime(bossVols[idx], now + 0.6);
  }


  audio.loadAudioFile = loadAudioFile;
  audio.getBaseTrackForLevel = getBaseTrackForLevel;
  audio.getBossTrackForLevel = getBossTrackForLevel;
  audio.startDynamicMusic = startDynamicMusic;
  audio.disposeMusicNodes = disposeMusicNodes;
  audio.stopDynamicMusic = stopDynamicMusic;
  audio.baseVolumeForMultiplier = baseVolumeForMultiplier;
  audio.setMusicLayer = setMusicLayer;
  audio.ensureCorrectMusicForLevel = ensureCorrectMusicForLevel;
  audio.setAdaptiveMusicLayer = setAdaptiveMusicLayer;
  audio.setBossPhaseAudio = setBossPhaseAudio;

  function duckMusicForLastLife() {
    if (!audio.audioCtx || !audio.baseGain) return;
    const now = audio.audioCtx.currentTime;
    audio.baseGain.gain.cancelScheduledValues(now);
    audio.baseGain.gain.linearRampToValueAtTime(0.09, now + 0.9);
    if (audio.bossGain) {
      audio.bossGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.linearRampToValueAtTime(0.02, now + 0.9);
    }
  }

  function unduckMusic() {
    if (!audio.audioCtx) return;
    const isMusicBoss = levelData && _isMusicBossStage(levelData);
    updateMusicState(multiplier, !!isMusicBoss);
  }

  audio.updateMusicState = updateMusicState;
  audio.hasActiveMusicGraph = hasActiveMusicGraph;
  audio.duckMusicForLastLife = duckMusicForLastLife;
  audio.unduckMusic = unduckMusic;

  window.loadAudioFile = loadAudioFile;
  window.getBaseTrackForLevel = getBaseTrackForLevel;
  window.getBossTrackForLevel = getBossTrackForLevel;
  window.startDynamicMusic = startDynamicMusic;
  window.disposeMusicNodes = disposeMusicNodes;
  window.stopDynamicMusic = stopDynamicMusic;
  window.baseVolumeForMultiplier = baseVolumeForMultiplier;
  window.setMusicLayer = setMusicLayer;
  window.ensureCorrectMusicForLevel = ensureCorrectMusicForLevel;
  window.updateMusicState = updateMusicState;
  window.hasActiveMusicGraph = hasActiveMusicGraph;
  window.duckMusicForLastLife = duckMusicForLastLife;
  window.unduckMusic = unduckMusic;
})(window);
