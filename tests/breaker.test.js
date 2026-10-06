const test=require('node:test'),assert=require('node:assert/strict');
const {BreakerEngine,distance}=require('../js/systems/breaker-engine');
const advance=(e,seconds,hz=120)=>{for(let i=0;i<Math.ceil(seconds*hz);i++)e.tick(1/hz);};
function tap(e,kind){const t=e.targets.find(t=>t.ring===e.ring&&t.kind===kind);e.angle=t.angle;e.press();e.release();return t;}
function shot(e){e.energy=100;e.press();advance(e,.75);e.angle=e.enemyAngle+.12;e.release();advance(e,.3);}
test('pickups are optional; safe and precision charge, repair sacrifices combo',()=>{
 const e=new BreakerEngine();advance(e,4);assert.equal(e.hp,5);assert.equal(e.energy,45);
 tap(e,'safe');assert.equal(e.energy,63);tap(e,'precision');assert.equal(e.energy,95);assert.equal(e.combo,2);
 const t=e.targets.find(t=>t.ring===1&&t.kind==='repair');tap(e,'repair');assert.equal(t.cooldown,0);e.hp=3;tap(e,'repair');assert.equal(e.hp,4);assert.equal(e.combo,0);
});
test('empty taps cost energy, never hull; cooldown prevents repeated farming',()=>{
 const e=new BreakerEngine();e.angle=-1;e.press();e.release();assert.equal(e.energy,39);assert.equal(e.hp,5);
 const t=tap(e,'safe');e.angle=t.angle;e.press();e.release();assert.equal(e.energy,51);
});
test('hold launches once, spends energy, changes ring and damages aligned enemy',()=>{
 const e=new BreakerEngine();shot(e);assert.equal(e.ring,0);assert.equal(e.enemyHP,19);assert.equal(e.hits,1);assert.equal(e.shots,1);assert.equal(e.energy,60);e.release();assert.equal(e.shots,1);
});
test('missed and undercharged launches cannot damage the Hunter',()=>{
 const e=new BreakerEngine();e.energy=0;e.press();advance(e,.8);e.release();assert.equal(e.flight,null);
 e.energy=40;e.press();advance(e,.8);e.angle=e.enemyAngle+Math.PI;e.release();advance(e,.3);assert.equal(e.hits,0);assert.equal(e.ring,0);
});
test('pause and cancellation discard a hold without spending energy or advancing the clock',()=>{
 const e=new BreakerEngine();e.press();advance(e,.5);e.pause();const time=e.time;advance(e,5);e.release();assert.equal(e.energy,45);assert.equal(e.time,time);e.resume();e.press();e.cancel();e.release();assert.equal(e.shots,0);
});
test('enemy telegraph punishes its arc; braking or changing lanes avoids it',()=>{
 const e=new BreakerEngine();e.threat={angle:e.angle,ring:1,time:.01};advance(e,.02);assert.equal(e.hp,4);
 e.threat={angle:e.angle,ring:0,time:.01};advance(e,.02);assert.equal(e.hp,4);assert.equal(e.dodges,1);
});
test('mid-run choice freezes time and only accepts one valid upgrade',()=>{
 const e=new BreakerEngine();e.time=44.99;e.tick(.02);assert.equal(e.status,'upgrade');const time=e.time;advance(e,5);assert.equal(e.time,time);assert.equal(e.choose('invalid'),false);assert.equal(e.choose('echo'),true);assert.equal(e.choose('slingshot'),false);
});
test('echo repeats its shot; slingshot dodge charges and powers the next launch',()=>{
 const e=new BreakerEngine();e.upgrade='echo';shot(e);advance(e,.6);assert.equal(e.enemyHP,17);
 const s=new BreakerEngine();s.upgrade='slingshot';s.threat={angle:0,ring:0,time:.01};advance(s,.02);assert.equal(s.energy,65);assert.equal(s.slingshot,true);shot(s);assert.equal(s.enemyHP,17);assert.equal(s.slingshot,false);
});
test('time limit and death finish once; ended runs reject input',()=>{
 const e=new BreakerEngine();e.time=89.99;e.offered=true;e.tick(.02);assert.equal(e.status,'ended');assert.equal(e.won,false);e.press();e.release();e.tick(.2);assert.equal(e.time,90);assert.equal(e.shots,0);
 const s=new BreakerEngine();s.hp=1;s.threat={angle:s.angle,ring:1,time:.01};s.tick(.02);assert.equal(s.status,'ended');assert.equal(s.hp,0);
});
// Plays through normal movement and input, with no position/energy/health edits.
function play(hz,upgrade){
 const e=new BreakerEngine(42);let brake=false;
 for(let i=0;i<100*hz && e.status!=='ended';i++){
  if(e.status==='upgrade')e.choose(upgrade);
  if(!e.flight){
   if(e.holding){if(brake){if(!e.threat){e.cancel();brake=false;}}else if(e.held>=.72)e.release();}
   else {
    const velocity=e.enemyHP<=12?-.48:.38;
    const aim=e.enemyAngle+velocity*(.72+.28)-(.18*1.4+.54*1.4*.28);
    if(e.energy>=40&&distance(e.angle,aim)<.07)e.press();
    else {
     const target=e.targets.find(t=>t.ring===e.ring&&t.cooldown<=0&&distance(e.angle,t.angle)<t.width*.65&&(t.kind!=='repair'||e.hp<4));
     if(target){e.press();e.release();}
     else if(e.threat&&e.threat.ring===e.ring&&e.threat.time<1.3){e.press();brake=true;}
    }
   }
  }
  e.tick(1/hz);e.drainEvents();
 }
 return e;
}
test('both builds can win complete moving encounters at 30, 60 and 144 Hz',()=>{
 for(const hz of [30,60,144])for(const upgrade of ['echo','slingshot']){
  const e=play(hz,upgrade);assert.equal(e.won,true,`${hz}Hz ${upgrade}: time=${e.time} hp=${e.hp} enemy=${e.enemyHP} shots=${e.shots} hits=${e.hits}`);assert.ok(e.time<90);assert.equal(e.damage,24);
 }
});
