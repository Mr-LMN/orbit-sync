const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ExpeditionEngine:E,CORES}=require('../js/systems/expedition-engine.js');
function active(options={}){const e=new E({random:()=>.4,...options});e.begin();e.cooldown=0;return e;}
function target(e,kind){e.target=null;e.spawn(kind);return e.target;}
function hit(e){e.travel=e.ideal();e.press();}
function bot(e,hz=60){
  let guard=hz*400;
  while(!['won','lost'].includes(e.status)&&guard-->0){
    if(e.status==='choice'){e.choose(e.offers[0],'steady');e.begin();}
    if(e.target && e.travel>=e.ideal()){if(e.holding)e.release();else e.press();}
    e.tick(1/hz);
  }
  assert.ok(guard>0,'run must terminate');return e.summary();
}
test('tap targets score perfect at centre and expire if missed',()=>{
  const e=active();target(e,'tap');hit(e);assert.equal(e.perfects,1);assert.equal(e.streak,1);
  const t=target(e,'tap');e.travel=t.centre+t.width;e.tick(.02);assert.equal(e.misses,1);assert.equal(e.streak,0);assert.equal(e.lives,4);
});
test('hold requires both a press and release at the correct caps',()=>{
  const e=active();const t=target(e,'hold');hit(e);assert.equal(e.holding,true);assert.equal(e.score,0);
  e.travel=t.end;e.release();assert.equal(e.holding,false);assert.equal(e.perfects,1);
  target(e,'hold');hit(e);e.release();assert.equal(e.misses,1);assert.equal(e.lastFeedback.label,'RELEASED EARLY');
});
test('numbered links advance only after each valid tap',()=>{
  const e=active();target(e,'link');hit(e);assert.equal(e.target.index,1);hit(e);assert.equal(e.target.index,2);hit(e);assert.equal(e.target,null);assert.equal(e.hits,3);
});
test('precision targets reward centre hits with extra charge',()=>{
  const e=active();target(e,'risk');hit(e);assert.equal(e.charge,28);
  const t=target(e,'risk');e.travel=t.centre+t.width*.8;e.press();assert.equal(e.charge,33);assert.equal(e.perfects,1);
});
test('five perfect taps trigger time-limited Overdrive without changing hit geometry',()=>{
  const e=active();for(let i=0;i<5;i++){target(e,'tap');hit(e);}
  assert.equal(e.overdrive,7);assert.equal(e.overdriveCount,1);const before=e.score;target(e,'tap');hit(e);assert.equal(e.score-before,270);
  e.target=null;e.cooldown=100;for(let i=0;i<8*60;i++)e.tick(1/60);assert.equal(e.overdrive,0);
});
test('pausing freezes timers and safely cancels an interrupted hold',()=>{
  const e=active();target(e,'hold');hit(e);e.pause();const travel=e.travel,elapsed=e.elapsed;for(let i=0;i<100;i++)e.tick(.1);
  assert.equal(e.travel,travel);assert.equal(e.elapsed,elapsed);assert.equal(e.holding,false);assert.equal(e.misses,0);e.pause(false);e.tick(.1);assert.ok(e.elapsed>elapsed);
});
test('cancelled touch never loses a life or awards a hold',()=>{const e=active();target(e,'hold');hit(e);e.release(true);assert.equal(e.lives,e.maxLives);assert.equal(e.hits,0);});
test('offers are distinct and upgrades/routes are validated once',()=>{
  const e=active();for(let i=0;i<12;i++){target(e,'tap');hit(e);}
  assert.equal(e.status,'choice');assert.equal(new Set(e.offers).size,3);assert.equal(e.choose('fake'),false);assert.equal(e.choose(e.offers[0],'fake'),false);
  assert.equal(e.choose(e.offers[0],'volatile'),true);assert.equal(e.sector,1);assert.equal(e.choose('repair'),false);assert.equal(e.route,'volatile');
});
test('core tradeoffs affect windows, life count, scoring and momentum',()=>{
  const anchor=active({core:'anchor'}),prism=active({core:'prism'}),pulse=active({core:'pulse'});
  assert.equal(anchor.lives,5);assert.equal(prism.lives,3);assert.ok(anchor.windowScale>prism.windowScale);
  for(const e of [anchor,prism,pulse]){target(e,'tap');hit(e);}
  assert.ok(prism.score>anchor.score);assert.ok(pulse.speed>CORES.pulse.speed);
});
test('practice is endless, has no life loss, and cannot create upgrade screens',()=>{
  const e=active({practice:'hold'});for(let i=0;i<25;i++){target(e,'hold');hit(e);e.travel=e.target.end;e.release();e.miss('test');}
  assert.equal(e.status,'playing');assert.equal(e.lives,e.maxLives);assert.equal(e.hits,25);
});
test('Guardian announces shields and exposes damage windows',()=>{
  const e=active({practice:'boss'});assert.equal(e.bossState,'warning');assert.equal(e.target,null);
  for(let i=0;i<121;i++)e.tick(1/60);assert.equal(e.bossState,'attack');assert.equal(e.target.type,'hold');
  hit(e);e.travel=e.target.end;e.release();assert.equal(e.bossState,'opening');target(e,'risk');hit(e);assert.equal(e.bossHP,16);
  e.bossHP=12;e.warnBoss();assert.equal(e.bossPhase,1);e.bossHP=6;e.warnBoss();assert.equal(e.bossPhase,2);
});
test('a full perfect run is winnable at 30, 60 and 144 Hz',()=>{
  const summaries=[30,60,144].map(hz=>{const e=active();return bot(e,hz);});
  for(const s of summaries){assert.equal(s.won,true);assert.equal(s.misses,0);assert.ok(s.elapsed>90&&s.elapsed<300);}
  assert.ok(Math.max(...summaries.map(s=>s.elapsed))-Math.min(...summaries.map(s=>s.elapsed))<5);
});
test('death and time limit end the run once; results cannot score more points',()=>{
  const e=active({core:'prism'});for(let i=0;i<3;i++)e.miss('MISSED');assert.equal(e.status,'lost');const before=e.score;e.press();e.tick(1);assert.equal(e.score,before);
  const timed=active();timed.elapsed=299.99;timed.tick(.02);assert.equal(timed.status,'lost');
});
