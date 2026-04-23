const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('OG.utils', () => {
  let context;
  let mockRandom;

  beforeEach(() => {
    const code = fs.readFileSync(path.resolve(__dirname, '../js/core/utils.js'), 'utf8');
    mockRandom = jest.fn();
    const mockWindow = {
      OrbitGame: {
        utils: {}
      }
    };
    mockWindow.OG = mockWindow.OrbitGame;

    // Provide a custom Math object to mock random while keeping other Math functions
    const customMath = Object.create(Math);
    customMath.random = mockRandom;

    context = vm.createContext({
      window: mockWindow,
      Math: customMath
    });
    vm.runInContext(code, context);
  });

  describe('lerp', () => {
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

  describe('clamp', () => {
    test('returns value when within bounds', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(5, 0, 10)).toBe(5);
    });

    test('returns min when value is below bounds', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    test('returns max when value is above bounds', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(15, 0, 10)).toBe(10);
    });

    test('returns min when value equals min', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(0, 0, 10)).toBe(0);
    });

    test('returns max when value equals max', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(10, 0, 10)).toBe(10);
    });

    test('handles negative bounds', () => {
      const { clamp } = context.window.OG.utils;
      expect(clamp(-15, -10, -5)).toBe(-10);
      expect(clamp(-7, -10, -5)).toBe(-7);
      expect(clamp(0, -10, -5)).toBe(-5);
    });
  });

  describe('rand', () => {
    test('returns min when Math.random is 0', () => {
      const { rand } = context.window.OG.utils;
      mockRandom.mockReturnValue(0);
      expect(rand(5, 10)).toBe(5);
    });

    test('returns max when Math.random is almost 1', () => {
      const { rand } = context.window.OG.utils;
      mockRandom.mockReturnValue(0.999999);
      expect(rand(5, 10)).toBeCloseTo(10, 5);
    });

    test('returns mid point when Math.random is 0.5', () => {
      const { rand } = context.window.OG.utils;
      mockRandom.mockReturnValue(0.5);
      expect(rand(5, 10)).toBe(7.5);
    });

    test('handles negative ranges', () => {
      const { rand } = context.window.OG.utils;
      mockRandom.mockReturnValue(0.5);
      expect(rand(-10, -5)).toBe(-7.5);
    });

    test('handles ranges crossing zero', () => {
      const { rand } = context.window.OG.utils;
      mockRandom.mockReturnValue(0.5);
      expect(rand(-5, 5)).toBe(0);
    });

    test('handles min > max (descending range)', () => {
      const { rand } = context.window.OG.utils;
      // Math.random() * (max - min) + min
      // 0.5 * (5 - 10) + 10 = 0.5 * (-5) + 10 = -2.5 + 10 = 7.5
      mockRandom.mockReturnValue(0.5);
      expect(rand(10, 5)).toBe(7.5);

      mockRandom.mockReturnValue(0);
      expect(rand(10, 5)).toBe(10);

      mockRandom.mockReturnValue(1);
      expect(rand(10, 5)).toBe(5);
    });
  });
});
