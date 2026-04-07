const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('OrbitGame Utils', () => {
  let sandbox;
  let OG;

  beforeEach(() => {
    sandbox = {
      window: {},
      Math: Math,
      console: console
    };
    sandbox.window.OrbitGame = {};
    vm.createContext(sandbox);

    const utilsCode = fs.readFileSync(path.join(__dirname, '../js/core/utils.js'), 'utf8');
    vm.runInContext(utilsCode, sandbox);
    OG = sandbox.window.OrbitGame;
  });

  test('clamp', () => {
    expect(OG.utils.clamp(5, 0, 10)).toBe(5);
    expect(OG.utils.clamp(-5, 0, 10)).toBe(0);
    expect(OG.utils.clamp(15, 0, 10)).toBe(10);
    expect(OG.utils.clamp(0, 0, 10)).toBe(0);
    expect(OG.utils.clamp(10, 0, 10)).toBe(10);
  });

  test('lerp', () => {
    expect(OG.utils.lerp(0, 10, 0.5)).toBe(5);
    expect(OG.utils.lerp(0, 10, 0)).toBe(0);
    expect(OG.utils.lerp(0, 10, 1)).toBe(10);
    expect(OG.utils.lerp(10, 20, 0.5)).toBe(15);
    expect(OG.utils.lerp(0, 10, 1.5)).toBe(15);
  });

  test('rand', () => {
    for (let i = 0; i < 100; i++) {
      const min = 5;
      const max = 15;
      const result = OG.utils.rand(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThan(max);
    }
  });
});
