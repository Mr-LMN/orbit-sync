const test=require('node:test'),assert=require('node:assert/strict');
const {HuntEngine,profile,award,total,unlocked}=require('../js/systems/hunt-campaign');
const {distance}=require('../js/systems/breaker-engine');
const advance=(e,t)=>{for(let i=0;i<t*120;i++)e.tick(1/120);};
test('hands-on lesson requires pickup, launch and safe dodge; failures remain retryable',()=>{
 const e=new HuntEngine(0,1,true);advance(e,100);assert.equal(e.time,0);assert.equal(e.hp,5);assert.equal(e.lesson,'collect');
 e.press();advance(e,.8);e.release();assert.equal(e.shots,0);
 e.press();e.release();assert.equal(e.lesson,'aim');assert.equal(e.energy,40);
 e.press();advance(e,.75);e.release();advance(e,.4);assert.equal(e.lesson,'dodge');assert.equal(e.hits,1);advance(e,2);assert.equal(e.status,'playing');assert.equal(e.hp,5);e.press();advance(e,2);assert.equal(e.won,true);assert.ok(e.dodges>0);
});
test('Sentinel shield rejects damage and visibly timed opening accepts it',()=>{
 const e=new HuntEngine(3);e.strike(e.enemyAngle,5,true);assert.equal(e.enemyHP,e.maxEnemyHP);assert.equal(e.drainEvents().at(-1).type,'blocked');
 advance(e,2.6);assert.equal(e.shielded,false);e.strike(e.enemyAngle,5,true);assert.equal(e.enemyHP,e.maxEnemyHP-5);
});
test('Wraith reverses predictably; campaign never interrupts with a mutation',()=>{
 const e=new HuntEngine(6);assert.ok(e.enemyVelocity()>0);advance(e,4.1);assert.ok(e.enemyVelocity()<0);advance(e,41);assert.equal(e.upgrade,null);assert.notEqual(e.status,'upgrade');assert.equal(e.drainEvents().some(e=>e.type==='choice'),false);
});
test('profile migration sanitizes values and cannot equip locked rewards',()=>{
 const p=profile({medals:[Infinity,-1,9],skin:'rose'},{best:1200,wins:4,runs:8});assert.deepEqual(p.medals.slice(0,3),[0,0,3]);assert.equal(p.skin,'mint');assert.equal(p.best,1200);assert.equal(unlocked(p),0);assert.equal(profile(p,{best:99}).best,1200);
});
test('medals retain the best result; replay cannot farm unlocks; losses do not unlock hunts',()=>{
 const p=profile(),e=new HuntEngine();e.won=true;e.time=40;e.hits=5;e.shots=5;e.score=2000;
 assert.equal(award(p,e).gained,3);assert.equal(unlocked(p),1);assert.equal(award(p,e).gained,0);assert.equal(total(p),3);
 e.won=false;e.encounter=new HuntEngine(1).encounter;award(p,e);assert.equal(unlocked(p),1);assert.equal(p.times[1],null);
});
// Full encounters use normal movement and input only: no HP, energy, position or timer edits.
function play(id,hz){
 const e=new HuntEngine(id,42);let brake=false;
 for(let i=0;i<91*hz&&e.status!=='ended';i++){
  if(!e.flight){
   if(e.holding){if(brake){if(!e.threat){e.cancel();brake=false;}}else if(e.held>=.72)e.release();}
   else {
    const aim=e.enemyAngle+e.enemyVelocity()- (.18*1.4+.54*1.4*.28);
    const opening=e.encounter.kind!=='sentinel'||(e.time+1)%5>=2.6&&(e.time+1)%5<4.9;
    const turn=e.encounter.kind!=='wraith'||e.time%4<2.9;
    if(e.energy>=40&&opening&&turn&&distance(e.angle,aim)<.09)e.press();
    else{
     const t=e.targets.find(t=>t.ring===e.ring&&t.cooldown<=0&&distance(e.angle,t.angle)<t.width*.65&&(t.kind!=='repair'||e.hp<4));
     if(t){e.press();e.release();}
     else if(e.threat&&e.threat.ring===e.ring&&e.threat.time<1.3){e.press();brake=true;}
    }
   }
  }
  e.tick(1/hz);e.drainEvents();
 }
 return e;
}
test('all nine hunts can be won through real model input at 30, 60 and 144 Hz',()=>{
 for(const hz of [30,60,144])for(let id=0;id<9;id++){
  const e=play(id,hz);assert.equal(e.won,true,`hunt ${id+1} ${hz}Hz time ${e.time} hull ${e.hp} enemy ${e.enemyHP} shots ${e.shots} hits ${e.hits}`);
 }
});

test('new profile fields migrate safely and only earned cosmetics survive reload',()=>{
 const p=profile({medals:[3],frame:'diamond',trail:'ribbon',seen:['stage0','turn','bad'],coaching:false});
 assert.equal(p.frame,'diamond');assert.equal(p.trail,'stream');assert.deepEqual(p.seen,['stage0','turn']);assert.equal(p.coaching,false);assert.equal(profile({}).coaching,true);
});
test('first frame unlock is awarded once and keeps cosmetic stats out of combat',()=>{
 const p=profile(),e=new HuntEngine();e.won=true;e.time=30;e.hp=5;e.hits=4;e.shots=4;
 assert.ok(award(p,e).unlocks.some(x=>x.id==='diamond'));assert.equal(award(p,e).unlocks.length,0);
});
