const campaign = [
  { id: "1-1", title: "The Basics", hitsNeeded: 4, speed: 0.03, lives: 3, targets: 1, moveSpeed: 0, reverse: false, text: "Tap when the orb enters the zone." },
  { id: "1-2", title: "Reversal", hitsNeeded: 5, speed: 0.035, lives: 3, targets: 1, moveSpeed: 0, reverse: true, text: "Now it reverses direction on every hit." },
  { id: "1-3", title: "Split Focus", hitsNeeded: 8, speed: 0.035, lives: 3, targets: 2, moveSpeed: 0.011, reverse: true, hasHeart: true, text: "The zone is drifting. Track it." },
  { id: "1-4", title: "Precision", hitsNeeded: 8, speed: 0.038, lives: 3, targets: 2, moveSpeed: 0.006, reverse: true, hasHeart: true, shrink: { startScale: 1, endScale: 0.78, distance: Math.PI * 2.8 }, text: "Two zones tighten over time. Prioritize precise timing." },
  { id: "1-5", title: "Fractals", hitsNeeded: 8, speed: 0.04, lives: 3, targets: 3, moveSpeed: 0.018, reverse: true, hasHeart: true, text: "Three moving zones. Track all of them." },
  { id: "1-6", title: "The Aegis Core", hitsNeeded: 99, speed: 0.045, lives: 3, boss: 'aegis', moveSpeed: 0.03, reverse: true, text: "BOSS: Break the shields. Expose the core." },
  { id: "2-1", title: "Sudden Death", hitsNeeded: 999, speed: 0.05, lives: 1, targets: 2, moveSpeed: 0.02, reverse: true, text: "World 2. Survive." }
];
