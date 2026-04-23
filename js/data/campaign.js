(function initCampaign(window, OG) {

  const campaign = [
    { id: '1-1', title: 'The Basics', hitsNeeded: 4, speed: 0.028, lives: 3, targets: 1, moveSpeed: 0, reverse: false, text: 'Tap when the orb enters the zone to score. Misses cost lives.' },
    { id: '1-2', title: 'Reversal', hitsNeeded: 5, speed: 0.034, lives: 3, targets: 1, moveSpeed: 0, reverse: true, text: 'Each successful hit flips your direction. Time your next pass.' },
    { id: '1-3', title: 'Drift', hitsNeeded: 6, speed: 0.038, lives: 3, targets: 1, moveSpeed: 0.009, reverse: false, text: 'The zone now drifts around the ring. Track it before tapping.' },
    { id: '1-4', title: 'Precision', hitsNeeded: 7, speed: 0.042, lives: 3, targets: 2, moveSpeed: 0.002, reverse: false, shrink: { startScale: 1, endScale: 0.8, distance: Math.PI * 3.1 }, text: 'Two zones slowly shrink. Stay calm and strike precisely.' },
    { id: '1-5', title: 'Frenzy', hitsNeeded: 6, speed: 0.052, lives: 3, targets: 4, fixedTargetCount: true, isFrenzy: true, moveSpeed: 0.012, reverse: false, text: 'FRENZY! Rapid fire targets. Go wild for massive points!' },
    { id: '1-6', title: 'The Aegis Core', hitsNeeded: 99, speed: 0.045, lives: 3, boss: 'aegis', moveSpeed: 0.03, reverse: true, text: 'BOSS: Break the shields. Expose the core.' },
    { id: '2-1', title: 'Refract', hitsNeeded: 5, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['corner'], text: 'Hit the corner point for PERFECT.' },
    { id: '2-2', title: 'Twin Signal', hitsNeeded: 5, speed: 0.038, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['twin'], text: 'Two mirrored zones. Hit both to clear.' },
    { id: '2-3', title: 'Fracture', hitsNeeded: 3, speed: 0.040, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ['split'], text: 'Hit once to crack. Finish the fragments.' },
    { id: '2-4', title: 'Cascade', hitsNeeded: 3, speed: 0.042, lives: 3, targets: 1, moveSpeed: 0.0062, reverse: false, mechanics: ['split'], text: 'Track the cascade. Finish every shard.' },
      { id: '2-5', title: 'Critical Angle', hitsNeeded: 6, speed: 0.044, lives: 3, targets: 1, moveSpeed: 0.008, reverse: true, shrink: { startScale: 1.0, endScale: 0.72, distance: Math.PI * 5.5 }, text: 'Shrinking. Reversing. No mercy.' },
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
      hitsNeeded: 3,
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
      hitsNeeded: 4,
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
      hitsNeeded: 4,
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
      hitsNeeded: 5,
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
      hitsNeeded: 8,
      speed: 0.037,
      lives: 3,
      boss: 'spectre',
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      mechanics: ['echo', 'mixed', 'drift', 'boss'],
      text: 'BOSS: Resonance Core phases through echo patterns. Stay composed.'
    },
    {
      id: '4-1',
      title: 'Corrupt Signal',
      hitsNeeded: 6,
      speed: 0.040,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      hasPhantom: true,
      text: 'One zone is real. One is corrupted. Read the signal.'
    },
    {
      id: '4-2',
      title: 'Static Burst',
      hitsNeeded: 7,
      speed: 0.043,
      lives: 3,
      targets: 2,
      moveSpeed: 0.007,
      reverse: true,
      hasPhantom: true,
      text: 'Two zones in static. They reverse. One will corrupt you.'
    },
    {
      id: '4-3',
      title: 'Fragment Storm',
      hitsNeeded: 5,
      speed: 0.046,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      hasPhantom: true,
      text: 'Hit the zone. Fragments scatter. One is a ghost.'
    },
    {
      id: '4-4',
      title: 'Phase Shift',
      hitsNeeded: 8,
      speed: 0.049,
      lives: 3,
      targets: 2,
      moveSpeed: 0.006,
      reverse: true,
      hasPhantom: true,
      shrink: { startScale: 1.0, endScale: 0.72, distance: Math.PI * 5.0 },
      text: 'Shrinking. Reversing. One is real. Precision is survival.'
    },
    {
      id: '4-5',
      title: 'System Overload',
      hitsNeeded: 10,
      speed: 0.053,
      lives: 3,
      targets: 3,
      moveSpeed: 0.007,
      reverse: false,
      hasPhantom: false,
      text: 'Maximum signal load. No tricks — just survive.'
    },
    {
      id: '4-6',
      title: 'The Corruptor',
      hitsNeeded: 99,
      speed: 0.050,
      lives: 3,
      boss: 'corruptor',
      moveSpeed: 0.028,
      reverse: true,
      text: 'BOSS: Destroy the nodes. Expose the corrupt core.'
    },
    {
      id: '5-1',
      title: 'First Contact',
      hitsNeeded: 6,
      speed: 0.048,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      text: 'Five sides. No forgiveness. Learn the shape.'
    },
    {
      id: '5-2',
      title: 'Signal Lost',
      hitsNeeded: 6,
      speed: 0.050,
      lives: 3,
      targets: 1,
      moveSpeed: 0,
      reverse: false,
      blackout: { duration: 900, interval: 3200, firstAt: 2200 },
      text: 'The orb vanishes. Trust your timing.'
    },
    {
      id: '5-3',
      title: 'Blind Drift',
      hitsNeeded: 7,
      speed: 0.052,
      lives: 3,
      targets: 1,
      moveSpeed: 0.008,
      reverse: false,
      blackout: { duration: 1100, interval: 2800, firstAt: 1500 },
      text: 'The zone drifts while you are blind. Predict. Strike.'
    },
    {
      id: '5-4',
      title: 'Void Echo',
      hitsNeeded: 8,
      speed: 0.054,
      lives: 3,
      targets: 2,
      moveSpeed: 0.005,
      reverse: true,
      blackout: { duration: 1000, interval: 2400, firstAt: 1200 },
      text: 'Two zones. One darkness. Track both.'
    },
    {
      id: '5-5',
      title: 'Null Storm',
      hitsNeeded: 10,
      speed: 0.056,
      lives: 3,
      targets: 3,
      moveSpeed: 0.007,
      reverse: false,
      blackout: { duration: 1200, interval: 2000, firstAt: 1000 },
      shrink: { startScale: 1.0, endScale: 0.78, distance: Math.PI * 6 },
      text: 'Maximum pressure. The void is consuming everything.'
    },
    {
      id: '5-6',
      title: 'The Null Gate',
      hitsNeeded: 99,
      speed: 0.052,
      lives: 3,
      boss: 'null_gate',
      moveSpeed: 0.025,
      reverse: true,
      text: 'BOSS: Sight is a lie. Trust the void.'
    },
    {
      id: '6-1',
      title: 'Ignition',
      hitsNeeded: 6,
      speed: 0.050,
      lives: 3,
      targets: 1,
      moveSpeed: 0.005,
      reverse: false,
      text: 'The core runs hot. Acceleration zones active.'
    },
    {
      id: '6-2',
      title: 'Thermal Draft',
      hitsNeeded: 7,
      speed: 0.052,
      lives: 3,
      targets: 1,
      moveSpeed: 0.008,
      reverse: true,
      text: 'Drifting targets in the heat stream. Stay focused.'
    },
    {
      id: '6-3',
      title: 'Flare Out',
      hitsNeeded: 8,
      speed: 0.054,
      lives: 3,
      targets: 2,
      moveSpeed: 0.006,
      reverse: false,
      text: 'Twin flares. Accelerate into the strike.'
    },
    {
      id: '6-4',
      title: 'Meltdown',
      hitsNeeded: 10,
      speed: 0.056,
      lives: 3,
      targets: 2,
      moveSpeed: 0.009,
      reverse: true,
      shrink: { startScale: 1.0, endScale: 0.70, distance: Math.PI * 4 },
      text: 'Reversing, shrinking, accelerating. Pure chaos.'
    },
    {
      id: '6-5',
      title: 'Supernova',
      hitsNeeded: 12,
      speed: 0.058,
      lives: 3,
      targets: 3,
      moveSpeed: 0.012,
      reverse: false,
      text: 'Three zones. Maximum heat.'
    },
    {
      id: '6-6',
      title: 'Solar Core',
      hitsNeeded: 99,
      speed: 0.055,
      lives: 3,
      boss: 'solar_core',
      moveSpeed: 0.030,
      reverse: true,
      text: 'BOSS: Extinguish the inferno.'
    }
  ];
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
})(window, window.OG);