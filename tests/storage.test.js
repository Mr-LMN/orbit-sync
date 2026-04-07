const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('OrbitGame Storage', () => {
  let sandbox;
  let OG;

  beforeEach(() => {
    sandbox = {
      window: {
        localStorage: {
          store: {},
          getItem: jest.fn(function(key) {
            return this.store[key] || null;
          }),
          setItem: jest.fn(function(key, value) {
            this.store[key] = String(value);
          }),
          removeItem: jest.fn(function(key) {
            delete this.store[key];
          })
        },
        btoa: jest.fn(str => Buffer.from(str, 'binary').toString('base64')),
        atob: jest.fn(str => Buffer.from(str, 'base64').toString('binary')),
        console: {
          warn: jest.fn()
        }
      },
      console: {
        warn: jest.fn()
      },
      String: String,
      Object: Object,
      JSON: JSON
    };

    // Forward the global console to window.console inside the vm sandbox
    sandbox.window.console = sandbox.console;

    sandbox.window.OrbitGame = {};
    vm.createContext(sandbox);

    const storageCode = fs.readFileSync(path.join(__dirname, '../js/core/storage.js'), 'utf8');
    vm.runInContext(storageCode, sandbox);
    OG = sandbox.window.OrbitGame;
  });

  describe('setItem and getItem', () => {
    test('setItem correctly stores a value and getItem retrieves it', () => {
      expect(OG.storage.setItem('test_key', 'test_val')).toBe(true);
      expect(OG.storage.getItem('test_key', 'default')).toBe('test_val');

      // Verify internal storage structure (encoded.signature)
      const raw = sandbox.window.localStorage.store['test_key'];
      expect(raw).toBeDefined();
      expect(raw).toMatch(/^[a-zA-Z0-9+/=]+\.[0-9a-f]+$/);
    });

    test('getItem returns fallback when item is missing', () => {
      expect(OG.storage.getItem('missing_key', 'fallback')).toBe('fallback');
    });

    test('setItem handles exceptions and returns false', () => {
      // Simulate quota exceeded or other error
      sandbox.window.localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });
      expect(OG.storage.setItem('error_key', 'value')).toBe(false);
    });

    test('getItem handles exceptions and returns fallback', () => {
      sandbox.window.localStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Some error');
      });
      expect(OG.storage.getItem('error_key', 'fallback')).toBe('fallback');
    });

    test('getItem returns fallback when signature verification fails', () => {
      OG.storage.setItem('test_key', 'test_val');
      const raw = sandbox.window.localStorage.store['test_key'];
      const parts = raw.split('.');
      // Tamper with the signature
      sandbox.window.localStorage.store['test_key'] = parts[0] + '.00000000';

      expect(OG.storage.getItem('test_key', 'fallback')).toBe('fallback');
      expect(sandbox.console.warn).toHaveBeenCalledWith('Storage integrity check failed for key: test_key');
    });

    test('getItem returns raw value if it is legacy (no signature)', () => {
      sandbox.window.localStorage.store['legacy_key'] = 'legacy_value';
      expect(OG.storage.getItem('legacy_key', 'fallback')).toBe('legacy_value');
    });

    test('getItem handles atob failure gracefully', () => {
        // Needs a valid signature for an invalid base64 string
        // We know that window.btoa will encode correctly, but we can mock atob
        OG.storage.setItem('test_key', 'test_val');
        sandbox.window.atob.mockImplementationOnce(() => {
            throw new Error('InvalidCharacterError');
        });

        expect(OG.storage.getItem('test_key', 'fallback')).toBe('fallback');
    });
  });

  describe('setJSON and getJSON', () => {
    test('setJSON correctly serializes and stores object', () => {
      const obj = { foo: 'bar', num: 42 };
      expect(OG.storage.setJSON('json_key', obj)).toBe(true);

      const retrieved = OG.storage.getJSON('json_key', null);
      expect(retrieved).toEqual(obj);
    });

    test('getJSON returns fallback for missing key', () => {
      expect(OG.storage.getJSON('missing_json', { default: true })).toEqual({ default: true });
    });

    test('getJSON handles parsing errors and returns fallback', () => {
      // Store invalid JSON manually
      OG.storage.setItem('bad_json', '{bad: "json"}');
      expect(OG.storage.getJSON('bad_json', 'fallback')).toBe('fallback');
    });
  });

  describe('removeItem', () => {
    test('removeItem delegates to localStorage.removeItem', () => {
      sandbox.window.localStorage.store['del_key'] = 'value';
      OG.storage.removeItem('del_key');
      expect(sandbox.window.localStorage.removeItem).toHaveBeenCalledWith('del_key');
      expect(sandbox.window.localStorage.store['del_key']).toBeUndefined();
    });
  });
});
