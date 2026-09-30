const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(file, window) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {window, console});
  return window.OrbitGame;
}
function storage(seed = {}, failWrites = false) {
  const data = new Map(Object.entries(seed));
  const window = { OrbitGame: {}, btoa, atob, localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem(key, value) { if (failWrites) throw {name:'QuotaExceededError'}; data.set(key,value); },
    removeItem: key => data.delete(key)
  }};
  return { api:load('js/core/storage.js',window).storage, data, window };
}
test('movement covers the same distance at 30/60/90/120/144/240 Hz', () => {
  const timing = load('js/core/timing.js',{OrbitGame:{}}).core.timing;
  for (const hz of [30,60,90,120,144,240]) {
    let frames = 0;
    for(let i=1;i<=hz*10;i++) frames += timing.frameDelta(i*1000/hz,(i-1)*1000/hz);
    assert.ok(Math.abs(frames-600)<1e-8, `${hz} Hz: ${frames}`);
  }
  assert.equal(timing.frameDelta(10000,0),2.2);
  assert.equal(timing.frameDelta(0,10),0);
});
test('Unicode saves survive reload and old signed and decimal saves remain readable', () => {
  const {api,data,window} = storage({'decimal':'0.75','legacy':'NDI=.e8313a35'});
  assert.equal(api.getItem('decimal'), '0.75');
  // Build an original-format signed save using the existing checksum algorithm.
  const value = btoa('42'); let hash=5381;
  for(const c of value+'orbit-sync-s3cr3t') hash=((hash<<5)+hash)+c.charCodeAt(0);
  data.set('legacy',`${value}.${(hash>>>0).toString(16)}`);
  assert.equal(api.getItem('legacy'),'42');
  assert.equal(api.setJSON('profile',{name:'Lloyd 🚀',coins:42}),true);
  const reloaded=load('js/core/storage.js',window).storage;
  assert.equal(reloaded.getJSON('profile').name,'Lloyd 🚀');
  data.set('bad','v2:NDI=.00000000');
  assert.equal(reloaded.getItem('bad','safe'),'safe');
});
test('quota failures read the latest session save rather than stale disk values', () => {
  const {api} = storage({coins:'10'},true);
  assert.equal(api.setItem('coins','25'),false);
  assert.equal(api.getItem('coins'),'25');
  api.removeItem('coins');
  assert.equal(api.getItem('coins',null),null);
});
test('blocked storage remains usable in memory', () => {
  const window={OrbitGame:{},btoa,atob,localStorage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}}};
  const api=load('js/core/storage.js',window).storage;
  api.setItem('coins',33);assert.equal(api.getItem('coins'),'33');
  api.removeItem('coins');assert.equal(api.getItem('coins',null),null);
});
test('sphere progression is cached between writes and invalidated by a save', () => {
  const {api,window}=storage();
  api.setJSON('orbitSync_progression',{sphereProgression:{classic:{level:2}}});
  let reads=0;const getJSON=api.getJSON;
  api.getJSON=(...args)=>{reads++;return getJSON(...args);};
  const runtime=load('js/entities/spheres/runtime.js',window).entities.spheres.runtime;
  for(let i=0;i<100;i++) assert.equal(runtime.getSphereProgress('classic').level,2);
  assert.equal(reads,1);
  api.setJSON('orbitSync_progression',{sphereProgression:{classic:{level:3}}});
  assert.equal(runtime.getSphereProgress('classic').level,3);
  assert.equal(reads,2);
});
