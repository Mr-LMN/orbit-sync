const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('mobile timing feedback is deterministic, replaces stale timing, and preserves rewards', () => {
  const context = { window: { OrbitGame: {}, innerWidth: 390 }, popups: [], popupPool: [], MAX_POPUPS: 12 };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/entities/effects.js'), 'utf8'), context);
  const create = context.window.OrbitGame.entities.effects.createPopup;
  create(0, 0, '+10 COINS', '#fff');
  for (let i = 0; i < 30; i++) assert.ok(create(0, 0, 'EARLY', '#fff', 'ok'));
  assert.equal(context.popups.length, 2);
  assert.equal(context.popups[0].text, '+10 COINS');
  create(0, 0, 'PERFECT', '#fff', 'perfect');
  assert.equal(context.popups.length, 2);
  assert.equal(context.popups[1].hitQuality, 'perfect');
});
