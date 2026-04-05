(function initCampaign(window) {
  const OG = window.OrbitGame;

  const campaign = [
    { id: '1-1', title: 'The Basics', hitsNeeded: 4, speed: 0.028, lives: 3, targets: 1, moveSpeed: 0, reverse: false, text: 'Tap when the orb enters the zone to score. Misses cost lives.' },
    { id: '1-2', title: 'Reversal', hitsNeeded: 5, speed: 0.034, lives: 3, targets: 1, moveSpeed: 0, reverse: true, text: 'Each successful hit flips your direction. Time your next pass.' },
    { id: '1-3', title: 'Drift', hitsNeeded: 6, speed: 0.038, lives: 3, targets: 1, moveSpeed: 0.009, reverse: false, text: 'The zone now drifts around the ring. Track it before tapping.' },
    { id: '1-4', title: 'Precision', hitsNeeded: 7, speed: 0.042, lives: 3, targets: 2, moveSpeed: 0.002, reverse: false, shrink: { startScale: 1, endScale: 0.8, distance: Math.PI * 3.1 }, text: 'Two zones slowly shrink. Stay calm and strike precisely.' },
    { id: '1-5', title: 'Split Focus', hitsNeeded: 8, speed: 0.048, lives: 3, targets: 3, fixedTargetCount: true, moveSpeed: 0.01, reverse: false, text: 'Three zones are active at once. Keep your attention split and steady.' },
    { id: '1-6', title: 'The Aegis Core', hitsNeeded: 99, speed: 0.045, lives: 3, boss: 'aegis', moveSpeed: 0.03, reverse: true, text: 'BOSS: Break the shields. Expose the core.' },
    { id: '2-1', title: 'Refract', hitsNeeded: 5, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['corner'], text: 'Hit the corner point for PERFECT.' },
    { id: '2-2', title: 'Split Signal', hitsNeeded: 5, speed: 0.038, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['dual'], text: 'Two halves. One seam. Dead-centre clears both.' },
    { id: '2-3', title: 'Fracture', hitsNeeded: 3, speed: 0.040, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['split'], text: 'Hit once to crack. Finish the fragments.' },
    { id: '2-4', title: 'Cascade', hitsNeeded: 3, speed: 0.042, lives: 3, targets: 1, moveSpeed: 0.0062, reverse: false, mechanics: ['split'], text: 'Track the cascade. Finish every shard.' },
      { id: '2-5', title: 'Critical Angle', hitsNeeded: 6, speed: 0.044, lives: 3, targets: 1, moveSpeed: 0.008, reverse: true, mechanics: ['dual'], shrink: { startScale: 1.0, endScale: 0.72, distance: Math.PI * 5.5 }, text: 'Shrinking. Reversing. One target. No mistakes.' },
    {
      id: '2-6',
      title: 'The Prism',
      hitsNeeded: 99,
      speed: 0.048,
      lives: 3,
      boss: 'prism',
      moveSpeed: 0.025,
      reverse: true,
      bossConfig: { phases: ['rotation', 'sequence'], sequenceLength: 5, shakeDisabled: true },
      text: 'BOSS: Break the facets. Complete the sequence.'
    },
    {
      id: '3-1',
      title: 'Echo Arrival',
      hitsNeeded: 2,
      speed: 0.033,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo'],
      text: 'The cyan ghost trails behind you. Let the echo hit first.'
    },
    {
      id: '3-2',
      title: 'Echo Field',
      hitsNeeded: 4,
      speed: 0.032,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo'],
      text: 'Only the delayed echo can score. Watch the cyan ghost, then tap.'
    },
    {
      id: '3-3',
      title: 'Split Field',
      hitsNeeded: 6,
      speed: 0.034,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo', 'mixed'],
      text: 'Orange targets are for the real orb. Cyan targets are for the delayed echo.'
    },
    {
      id: '3-4',
      title: 'Echo Drift',
      hitsNeeded: 5,
      speed: 0.035,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo', 'drift'],
      text: 'Echo targets now drift. Track the cyan arc and tap on rhythm.'
    },
    {
      id: '3-5',
      title: 'Cross Signal',
      hitsNeeded: 8,
      speed: 0.036,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo', 'mixed', 'drift'],
      text: 'Mixed orange and cyan reads, now with echo drift pressure.'
    },
    {
      id: '3-6',
      title: 'Resonance Core',
      hitsNeeded: 10,
      speed: 0.037,
      lives: 3,
      boss: 'spectre',
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo', 'mixed', 'drift', 'boss'],
      text: 'BOSS: Resonance Core phases through echo patterns. Stay composed.'
    }
  ];

  OG.data = OG.data || {};
  if (typeof OG.data.registerCampaignStages === 'function') {
    OG.data.registerCampaignStages(campaign);
  } else {
    campaign.forEach((stage, idx) => {
      if (!stage || !stage.id) return;
      const worldNum = parseInt(String(stage.id).split('-')[0], 10);
      stage.worldId = Number.isFinite(worldNum) ? `world${worldNum}` : 'world1';
      stage.stageIndex = idx;
    });
  }
  OG.data.campaign = campaign;

  // Legacy alias for existing logic during migration.
  window.campaign = campaign;
})(window);
