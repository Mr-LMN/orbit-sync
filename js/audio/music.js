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

  async function startDynamicMusic(baseTrackPath) {
    if (!audio.audioCtx || !audio.musicEnabled) return;
    if (audio.isMusicPlaying && audio.currentBaseTrack === baseTrackPath) return;

    disposeMusicNodes();

    try {
      if (!audio.baseAudioBuffers[baseTrackPath]) {
        audio.baseAudioBuffers[baseTrackPath] = await loadAudioFile(baseTrackPath);
      }
      if (!audio.bossAudioBuffer) audio.bossAudioBuffer = await loadAudioFile('assets/boss.mp3');

      audio.baseSource = audio.audioCtx.createBufferSource();
      audio.bossSource = audio.audioCtx.createBufferSource();
      audio.baseSource.buffer = audio.baseAudioBuffers[baseTrackPath];
      audio.bossSource.buffer = audio.bossAudioBuffer;
      audio.baseSource.loop = true;
      audio.bossSource.loop = true;

      audio.baseGain = audio.audioCtx.createGain();
      audio.bossGain = audio.audioCtx.createGain();

      audio.bossGain.gain.value = 0;
      audio.baseGain.gain.setValueAtTime(0, audio.audioCtx.currentTime);
      audio.baseGain.gain.linearRampToValueAtTime(0.6, audio.audioCtx.currentTime + 2.5);

      audio.baseSource.connect(audio.baseGain);
      audio.baseGain.connect(audio.audioCtx.destination);
      audio.bossSource.connect(audio.bossGain);
      audio.bossGain.connect(audio.audioCtx.destination);

      const startTime = audio.audioCtx.currentTime + 0.1;
      audio.baseSource.start(startTime);
      audio.bossSource.start(startTime);
      audio.currentBaseTrack = baseTrackPath;
      audio.isMusicPlaying = true;
      audio.currentMusicState = { mult: -1, boss: null };
    } catch (e) {
      console.warn('Dynamic music failed', e);
    }
  }

  function disposeMusicNodes() {
    try {
      if (audio.baseSource) {
        try { audio.baseSource.stop(); } catch (e) {}
        audio.baseSource.disconnect();
      }
    } catch (e) {}
    try {
      if (audio.bossSource) {
        try { audio.bossSource.stop(); } catch (e) {}
        audio.bossSource.disconnect();
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
      audio.currentMusicState = { mult: 1, boss: false };
    } catch (e) {
      console.warn('stopDynamicMusic failed', e);
    }
  }

  function baseVolumeForMultiplier(currentMultiplier) {
    return Math.min(0.8, 0.56 + (Math.max(1, currentMultiplier) - 1) * 0.02);
  }

  async function ensureCorrectMusicForLevel() {
    if (!audio.audioCtx || !audio.musicEnabled) return;
    const token = ++audio.musicLoadToken;
    const wantedTrack = getBaseTrackForLevel(currentLevelIdx);
    await startDynamicMusic(wantedTrack);
    if (token !== audio.musicLoadToken) return;
    updateMusicState(multiplier, !!(levelData && levelData.boss));
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
      audio.baseGain.gain.linearRampToValueAtTime(0.03, now + 0.5);
      audio.bossGain.gain.linearRampToValueAtTime(0.85, now + 0.5);
    } else {
      audio.baseGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.cancelScheduledValues(now);
      audio.bossGain.gain.linearRampToValueAtTime(0, now + 0.5);
      audio.baseGain.gain.linearRampToValueAtTime(baseVolumeForMultiplier(currentMultiplier), now + 0.5);
    }

    const targetSpeed = 1.0 + (currentMultiplier * 0.015);
    audio.baseSource.playbackRate.cancelScheduledValues(now);
    audio.bossSource.playbackRate.cancelScheduledValues(now);
    audio.baseSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
    audio.bossSource.playbackRate.linearRampToValueAtTime(targetSpeed, now + 1.0);
  }

  audio.loadAudioFile = loadAudioFile;
  audio.getBaseTrackForLevel = getBaseTrackForLevel;
  audio.startDynamicMusic = startDynamicMusic;
  audio.disposeMusicNodes = disposeMusicNodes;
  audio.stopDynamicMusic = stopDynamicMusic;
  audio.baseVolumeForMultiplier = baseVolumeForMultiplier;
  audio.ensureCorrectMusicForLevel = ensureCorrectMusicForLevel;
  audio.updateMusicState = updateMusicState;

  window.loadAudioFile = loadAudioFile;
  window.getBaseTrackForLevel = getBaseTrackForLevel;
  window.startDynamicMusic = startDynamicMusic;
  window.disposeMusicNodes = disposeMusicNodes;
  window.stopDynamicMusic = stopDynamicMusic;
  window.baseVolumeForMultiplier = baseVolumeForMultiplier;
  window.ensureCorrectMusicForLevel = ensureCorrectMusicForLevel;
  window.updateMusicState = updateMusicState;
})(window);
