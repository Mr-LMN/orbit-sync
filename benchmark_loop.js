const ITERATIONS = 100000;

const targets = [];
for (let i = 0; i < 50; i++) {
  targets.push({
    isHeart: Math.random() < 0.1,
    isPhantom: Math.random() < 0.1,
    isCornerBonus: Math.random() < 0.1,
    active: Math.random() < 0.5
  });
}
const stageHits = 5;
const levelData = { hitsNeeded: 10 };

console.time('Baseline');
for (let i = 0; i < ITERATIONS; i++) {
    const shouldForceHudFlush = targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active)
      || stageHits >= levelData.hitsNeeded;
    // if (shouldForceHudFlush) flushScoreCoinUI();

    if (targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active) || stageHits >= levelData.hitsNeeded) {
      // do something
      const a = 1;
    }
}
console.timeEnd('Baseline');

console.time('Optimized');
for (let i = 0; i < ITERATIONS; i++) {
    const shouldForceHudFlush = targets.filter(tgt => !tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus).every(tgt => !tgt.active)
      || stageHits >= levelData.hitsNeeded;
    // if (shouldForceHudFlush) flushScoreCoinUI();

    if (shouldForceHudFlush) {
      // do something
      const a = 1;
    }
}
console.timeEnd('Optimized');

// Even more optimized: Avoid array creation by using a regular loop or `some`/`every` without `filter`.
console.time('More Optimized');
for (let i = 0; i < ITERATIONS; i++) {
    let allInactive = true;
    for (let j = 0; j < targets.length; j++) {
        const tgt = targets[j];
        if (!tgt.isHeart && !tgt.isPhantom && !tgt.isCornerBonus) {
            if (tgt.active) {
                allInactive = false;
                break;
            }
        }
    }
    const shouldForceHudFlush = allInactive || stageHits >= levelData.hitsNeeded;
    // if (shouldForceHudFlush) flushScoreCoinUI();

    if (shouldForceHudFlush) {
      // do something
      const a = 1;
    }
}
console.timeEnd('More Optimized');
