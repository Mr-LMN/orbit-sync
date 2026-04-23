(function initAudioCore(window, OG) {
  const audio = OG.audio;

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  audio.AudioContextCtor = AudioContextCtor;

  const defaultState = {
    audioCtx: null,
    bossAudioBuffer: null,
    bossAudioBuffers: {},
    currentBaseTrack: null,
    currentBossTrack: null,
    baseAudioBuffers: {},
    baseSource: null,
    bossSource: null,
    baseGain: null,
    bossGain: null,
    isMusicPlaying: false,
    musicStartPromise: null,
    musicStartToken: 0,
    pendingBaseTrack: null,
    musicLoadToken: 0,
    musicEnabled: true,
    sfxEnabled: true,
    hapticsEnabled: true,
    bossDrone: null,
    bossDroneOsc2: null,
    bossDroneGain: null,
    bossDroneStopTimeout: null,
    bossDroneStopToken: 0,
    lastSoundTime: 0,
    audioThrottleBypassUntil: 0,
    currentMusicState: { mult: 1, boss: false }
  };

  Object.keys(defaultState).forEach(function seedState(key) {
    if (typeof audio[key] === 'undefined') {
      audio[key] = defaultState[key];
    }
  });

  const legacyAliases = [
    'audioCtx',
    'bossAudioBuffer',
    'bossAudioBuffers',
    'currentBaseTrack',
    'currentBossTrack',
    'baseAudioBuffers',
    'baseSource',
    'bossSource',
    'baseGain',
    'bossGain',
    'isMusicPlaying',
    'musicStartPromise',
    'musicStartToken',
    'pendingBaseTrack',
    'musicLoadToken',
    'musicEnabled',
    'sfxEnabled',
    'hapticsEnabled',
    'bossDrone',
    'bossDroneOsc2',
    'bossDroneGain',
    'bossDroneStopTimeout',
    'bossDroneStopToken',
    'lastSoundTime',
    'audioThrottleBypassUntil',
    'currentMusicState'
  ];

  legacyAliases.forEach(function defineLegacyAlias(name) {
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: false,
      get: function () { return audio[name]; },
      set: function (value) { audio[name] = value; }
    });
  });

  function initAudio() {
    if (!audio.audioCtx) { audio.audioCtx = new AudioContextCtor(); }
    if (audio.audioCtx.state === 'suspended') { audio.audioCtx.resume(); }
  }

  function makeGain(vol) {
    const g = audio.audioCtx.createGain();
    g.gain.setValueAtTime(vol, audio.audioCtx.currentTime);
    g.connect(audio.audioCtx.destination);
    return g;
  }

  function getMinSoundIntervalMs() {
    return isMobile ? 40 : 16;
  }

  function shouldThrottleAudio(allowBypassWindow = false) {
    if (!audio.audioCtx || !isMobile) return false;
    const nowMs = audio.audioCtx.currentTime * 1000;
    if (allowBypassWindow && nowMs <= audio.audioThrottleBypassUntil) return false;
    if ((nowMs - audio.lastSoundTime) < getMinSoundIntervalMs()) return true;
    audio.lastSoundTime = nowMs;
    audio.audioThrottleBypassUntil = nowMs + Math.max(40, getMinSoundIntervalMs());
    return false;
  }

  audio.initAudio = initAudio;
  audio.makeGain = makeGain;
  audio.getMinSoundIntervalMs = getMinSoundIntervalMs;
  audio.shouldThrottleAudio = shouldThrottleAudio;

  window.initAudio = initAudio;
  window.makeGain = makeGain;
  window.getMinSoundIntervalMs = getMinSoundIntervalMs;
  window.shouldThrottleAudio = shouldThrottleAudio;
})(window, window.OG);