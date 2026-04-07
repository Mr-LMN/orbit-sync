function runBenchmark() {
  const iterations = 1000000;
  const dummyDocument = {
    getElementById: (id) => ({ id, style: {} })
  };

  // Baseline: document.getElementById
  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const el = dummyDocument.getElementById('pauseBtn');
  }
  const end1 = performance.now();
  console.log(`dummyDocument.getElementById: ${(end1 - start1).toFixed(4)}ms`);

  // Optimized: cached property
  const ui = {
    pauseBtn: dummyDocument.getElementById('pauseBtn')
  };

  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const el = ui.pauseBtn;
  }
  const end2 = performance.now();
  console.log(`cached access: ${(end2 - start2).toFixed(4)}ms`);
}

runBenchmark();
