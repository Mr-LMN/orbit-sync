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
    return worldNum === 2 ? 'assets/Base-2.mp3' : 'assets/Base.mp3';
  }

  function getBossTrackForLevel(levelIdx) {
    const level = campaign[levelIdx];
    if (!level || !level.boss) return 'assets/boss.mp3';
    if (level.id === '2-6' && level.boss === 'prism') return 'assets/calculated_threat.mp3';
    return 'assets/boss.mp3';
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

        audio.bossGain.gain.value = 0;
        audio.baseGain.gain.setValueAtTime(0, audio.audioCtx.currentTime);
        audio.baseGain.gain.linearRampToValueAtTime(0.32, audio.audioCtx.currentTime + 2.5);

        audio.baseSource.connect(audio.baseGain);
        audio.baseGain.connect(audio.audioCtx.destination);
        audio.bossSource.connect(audio.bossGain);
        audio.bossGain.connect(audio.audioCtx.destination);

        const startTime = audio.audioCtx.currentTime + 0.1;
        audio.baseSource.start(startTime);
        audio.bossSource.start(startTime);
        audio.currentBaseTrack = baseTrackPath;
        audio.currentBossTrack = bossTrackPath;
        audio.isMusicPlaying = true;
        audio.currentMusicState = { mult: -1, boss: null };
      } catch (e) {
        console.warn('Dynamic music failed', e);
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
        audio.bossGain.gain.cancelScheduledValues(audio.audioCtx.currentTime);
        audio.bossGain.gain.setValueAtTime(0, audio.audioCtx.currentTime);
      }
      disposeMusicNodes();
      audio.currentBaseTrack = null;
      audio.currentBossTrack = null;
      audio.currentMusicState = { mult: 1, boss: false };
    } catch (e) {
      console.warn('stopDynamicMusic failed', e);
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
    const isMusicBoss = levelData && (levelData.boss === 'aegis' || levelData.boss === 'prism');
    updateMusicState(multiplier, !!isMusicBoss);
  }

  function updateMusicState(currentMultiplier, isBossActive) {
    if (!audio.isMusicPlaying || !audio.audioCtx || !audio.baseGain || !audio.bossGain || !audio.baseSource || !audio.bossSource) return;

    if (audio.currentMusicState.mult === currentMultiplier && audio.currentMusicState.boss === isBossActive) return;

    audio.currentMusicState.mult = currentMultiplier;
    audio.currentMusicState.boss = isBossActive;

    const now = audio.audioCtx.currentTime;

    if (isBossActive) {
      audio.baseGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.cancelScheduledValues(now);
      audio.baseGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
      audio.bossGain.gain.linearRampToValueAtTime(0.48, now + 0.5);
    } else {
      audio.baseGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.linearRampToValueAtTime(0, now + 0.5);
      let layer = 1;
      if (currentMultiplier >= 8) layer = 3;
      else if (currentMultiplier >= 7) layer = 2;
      audio.baseGain.gain.linearRampToValueAtTime(
        Math.max(baseVolumeForMultiplier(currentMultiplier), layer === 3 ? 0.46 : (layer === 2 ? 0.36 : 0.28)),
        now + 0.5
      );
    }

    const targetSpeed = 1.0 + (currentMultiplier * 0.015);
    audio.baseSource.playbackRate.cancelScheduledValues(now);
    audio.bossSource.playbackRate.cancelScheduledValues(now);
    audio.baseSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
    audio.bossSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
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
  function duckMusicForLastLife() {
    if (!audio.audioCtx || !audio.baseGain) return;
    const now = audio.audioCtx.currentTime;
    audio.baseGain.gain.cancelScheduledValues(now);
    audio.baseGain.gain.linearRampToValueAtTime(0.28, now + 0.9);
    if (audio.bossGain) {
      audio.bossGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.linearRampToValueAtTime(0.05, now + 0.9);
    }
  }

  function unduckMusic() {
    if (!audio.audioCtx) return;
    const isMusicBoss = levelData && (levelData.boss === 'aegis' || levelData.boss === 'prism');
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
