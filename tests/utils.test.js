const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('OG.utils.lerp', () => {
  let context;

  beforeEach(() => {
    const code = fs.readFileSync(path.resolve(__dirname, '../js/core/utils.js'), 'utf8');
    const mockWindow = {
      OrbitGame: {
        utils: {}
      }
    };
    mockWindow.OG = mockWindow.OrbitGame;
    context = vm.createContext({ window: mockWindow });
    vm.runInContext(code, context);
  });

  test('interpolates between two numbers at t=0.5', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  test('returns the start value at t=0', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(10, 20, 0)).toBe(10);
  });

  test('returns the end value at t=1', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  test('handles extrapolation for t < 0', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(0, 10, -0.5)).toBe(-5);
  });

  test('handles extrapolation for t > 1', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(0, 10, 1.5)).toBe(15);
  });

  test('handles negative numbers', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(-10, 10, 0.5)).toBe(0);
    expect(lerp(-20, -10, 0.5)).toBe(-15);
  });

  test('handles identical start and end values', () => {
    const { lerp } = context.window.OG.utils;
    expect(lerp(10, 10, 0.5)).toBe(10);
    expect(lerp(10, 10, 0)).toBe(10);
    expect(lerp(10, 10, 1)).toBe(10);
  });
});
