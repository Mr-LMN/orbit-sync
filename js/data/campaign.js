(function initCampaign(window) {
  const OG = window.OrbitGame;

  const campaign = [
    { id: '1-1', title: 'The Basics', hitsNeeded: 4, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, text: 'Tap when the orb enters the zone to score. Misses cost lives.' },
    { id: '1-2', title: 'Reversal', hitsNeeded: 5, speed: 0.035, lives: 3, targets: 1, moveSpeed: 0, reverse: true, text: 'Each successful hit flips your direction. Time your next pass.' },
    { id: '1-3', title: 'Drift', hitsNeeded: 6, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0.009, reverse: false, text: 'The zone now drifts around the ring. Track it before tapping.' },
    { id: '1-4', title: 'Precision', hitsNeeded: 7, speed: 0.038, lives: 3, targets: 2, moveSpeed: 0.002, reverse: false, shrink: { startScale: 1, endScale: 0.8, distance: Math.PI * 3.1 }, text: 'Two zones slowly shrink. Stay calm and strike precisely.' },
    { id: '1-5', title: 'Split Focus', hitsNeeded: 8, speed: 0.04, lives: 3, targets: 3, fixedTargetCount: true, moveSpeed: 0.01, reverse: false, text: 'Three zones are active at once. Keep your attention split and steady.' },
    { id: '1-6', title: 'The Aegis Core', hitsNeeded: 99, speed: 0.045, lives: 3, boss: 'aegis', moveSpeed: 0.03, reverse: true, text: 'BOSS: Break the shields. Expose the core.' },
    { id: '2-1', title: 'Corner Precision', hitsNeeded: 5, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['corner'], text: 'Corner point is PERFECT. The target extends further into the rail for an OK hit.' },
    { id: '2-2', title: 'Dual Hit Circuit', hitsNeeded: 5, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['dual'], text: 'Each target has 2 coloured halves. Hit one side or land dead-centre to clear both.' },
    { id: '2-3', title: 'Split Reaction', hitsNeeded: 2, speed: 0.032, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['split'], text: 'Hit once to split. Hit again to shatter the fragments.' },
    { id: '2-4', title: 'Split Loop Drill', hitsNeeded: 2, speed: 0.035, lives: 3, targets: 1, moveSpeed: 0.0062, reverse: false, mechanics: ['split'], text: 'Read the split tree: 1 big → 2 medium → 4 small, then reset and repeat.' },
      { id: '2-5', title: 'Fracture Point', hitsNeeded: 6, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0.008, reverse: true, mechanics: ['dual'], shrink: { startScale: 1.0, endScale: 0.72, distance: Math.PI * 5.5 }, text: 'The prism is destabilising. One target. Shrinking window. Split it clean.' },
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
      text: 'BOSS: Adapt to rotation, then complete the sequence.'
    },
    {
      id: '3-1',
      title: 'Echo Arrival',
      hitsNeeded: 5,
      speed: 0.034,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo'],
      text: 'Your delayed echo can hit cyan targets. Tap when the echo orb passes through the zone.'
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
