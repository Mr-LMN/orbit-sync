const campaign = [
  { id: "1-1", title: "The Basics", hitsNeeded: 4, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, text: "Tap when the orb enters the zone to score. Misses cost lives." },
  { id: "1-2", title: "Reversal", hitsNeeded: 5, speed: 0.035, lives: 3, targets: 1, moveSpeed: 0, reverse: true, text: "Each successful hit flips your direction. Time your next pass." },
  { id: "1-3", title: "Drift", hitsNeeded: 6, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0.009, reverse: false, text: "The zone now drifts around the ring. Track it before tapping." },
  { id: "1-4", title: "Precision", hitsNeeded: 7, speed: 0.038, lives: 3, targets: 2, moveSpeed: 0.002, reverse: false, shrink: { startScale: 1, endScale: 0.8, distance: Math.PI * 3.1 }, text: "Two zones slowly shrink. Stay calm and strike precisely." },
  { id: "1-5", title: "Split Focus", hitsNeeded: 8, speed: 0.04, lives: 3, targets: 3, fixedTargetCount: true, moveSpeed: 0.01, reverse: false, text: "Three zones are active at once. Keep your attention split and steady." },
  { id: "1-6", title: "The Aegis Core", hitsNeeded: 99, speed: 0.045, lives: 3, boss: 'aegis', moveSpeed: 0.03, reverse: true, text: "BOSS: Break the shields. Expose the core." },
  { id: "2-1", title: "Corner Precision", hitsNeeded: 5, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, mechanics: ["corner"], text: "Hit exact diamond corners. Perfect is the corner point. Slight overshoot is OK." },
  { id: "2-2", title: "Dual Hit Circuit", hitsNeeded: 6, speed: 0.033, lives: 3, targets: 1, moveSpeed: 0.006, reverse: false, mechanics: ["dual"], text: "Each target has 2 segments. Land both before leaving the window." },
  { id: "2-3", title: "Split Reaction", hitsNeeded: 7, speed: 0.036, lives: 3, targets: 1, moveSpeed: 0.008, reverse: false, mechanics: ["split"], text: "First hit splits the target into 2 smaller shards. Finish both quickly." },
  { id: "2-4", title: "Mixed Mechanics", hitsNeeded: 8, speed: 0.039, lives: 3, targets: 2, moveSpeed: 0.01, reverse: false, mechanics: ["corner", "dual", "split"], text: "Corners return with layered targets. Read, commit, and chain cleanly." },
  { id: "2-5", title: "Pressure Wave", hitsNeeded: 10, speed: 0.043, lives: 3, targets: 2, moveSpeed: 0.014, reverse: false, mechanics: ["corner", "dual", "split"], pressure: true, text: "Fast lanes, tight windows, mixed mechanics. Survive the spike." },
  { id: "2-6", title: "The Prism", hitsNeeded: 99, speed: 0.048, lives: 3, boss: 'prism', moveSpeed: 0.025, reverse: true, text: "BOSS: The Prism defends each corner. Break them all." }
];
