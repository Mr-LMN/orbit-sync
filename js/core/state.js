(function initState(window, OG) {

  OG.state = Object.assign(OG.state, {
    initialized: false,
    run: {
      running: false,
      animationFrameId: null
    },
    player: {
      score: 0,
      streak: 0,
      multiplier: 1,
      lives: 3,
      coins: 0
    },
    progression: {
      currentWorld: 1,
      currentStageIndex: 0
    },
    input: {
      pointerDown: false,
      lastTapTime: 0
    },
    arrays: {
      targets: [],
      particles: [],
      effects: [],
      bosses: []
    }
  });

  // Legacy globals used by inline handlers and existing game code.
  window.audioCtx = window.audioCtx || null;
})(window, window.OG);