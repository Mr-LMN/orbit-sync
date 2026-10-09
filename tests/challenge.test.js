const test=require('node:test'),assert=require('node:assert/strict');
const {HuntEngine}=require('../js/systems/hunt-campaign');
const c=require('../js/systems/hunt-challenge');
test('challenge codes and names sanitize malformed input',()=>{
 assert.equal(c.code('DEADBEEF'),'deadbeef');assert.equal(c.code('../../oops'),c.DEFAULT);assert.equal(c.name('\u0000  '),'Pilot');assert.equal(c.name('12345678901234567890').length,16);
});
test('only finished combat runs create a score; faster and cleaner wins earn more',()=>{
 const e=new HuntEngine();assert.equal(c.result(e,'A','1'),null);e.finish(true);e.score=2000;e.hits=4;e.shots=5;e.time=40;
 const good=c.result(e,'A','1');e.time=70;e.hp=2;e.shots=8;assert.ok(good.score>c.result(e,'B','2').score);e.training=true;assert.equal(c.result(e,'C','3'),null);
});
test('local board is bounded, deduplicates one submission and ranks wins ahead of losses',()=>{
 const rows=Array.from({length:20},(_,i)=>({id:String(i),name:'Pilot',score:i*100,won:false,time:80,accuracy:50}));
 const clear={id:'win',name:'Winner',score:1,won:true,time:89,accuracy:10};
 const board=c.add(rows,clear);assert.equal(board.length,10);assert.equal(board[0].name,'Winner');assert.equal(c.add(board,clear).length,10);assert.equal(c.read([{id:'bad',score:Infinity,time:0}]).length,0);
});
test('first-time and returning challengers start the actual fight with identical random state and pickups',()=>{
 const seeded=new HuntEngine(0,0xcafe,false,true),direct=new HuntEngine(0,0xcafe);
 for(let i=0;i<3;i++){seeded.press();seeded.release();}seeded.press();for(let i=0;i<90;i++)seeded.tick(1/120);seeded.release();for(let i=0;i<40;i++)seeded.tick(1/120);seeded.press();
 while(seeded.training)seeded.tick(1/120);
 assert.equal(seeded.seed,direct.seed);assert.deepEqual(seeded.targets,direct.targets);assert.equal(seeded.energy,direct.energy);
});
