(function initHunt(root) {
  'use strict';
  const base=typeof module!=='undefined'&&module.exports?require('./breaker-engine.js'):root.OrbitGame.systems.breakerModel;
  const {BreakerEngine,wrap,distance}=base;
  const encounters=[
    ['First contact','hunter',18,75,'Follow the Hunter. Release on a green aim line.'],
    ['Crossfire','hunter',24,70,'The Hunter strikes more often. Brake or change orbit.'],
    ['Last light','hunter',30,65,'A tougher Hunter. Gold charges deal more damage.'],
    ['The shell','sentinel',22,75,'Shield opens every 5 seconds. Hold your shot for OPEN.'],
    ['Siege engine','sentinel',28,70,'Use shield time to collect energy and line up.'],
    ['Iron heart','sentinel',34,65,'Break the shielded core. Every opening counts.'],
    ['Ghost signal','wraith',24,75,'The Wraith reverses at each pulse. Watch its trail.'],
    ['Slipstream','wraith',30,70,'Faster pulses. Follow the aim line through each turn.'],
    ['Event horizon','wraith',36,65,'The final hunt. Stay calm, charge gold, launch clean.']
  ].map(([name,kind,hull,par,hint],id)=>({id,name,kind,hull,par,hint,region:['AFTERGLOW','IRON VEIL','DEEP SIGNAL'][Math.floor(id/3)]}));
  const skins=[{id:'mint',name:'Ion',stars:0,color:'#a8ffe7'},{id:'gold',name:'Solar',stars:6,color:'#ffdc85'},{id:'violet',name:'Nebula',stars:15,color:'#d3adff'},{id:'rose',name:'Nova',stars:24,color:'#ff9eb7'}];
  const integer=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(v)?Math.min(max,Math.max(0,Math.floor(v))):0;
  function profile(raw={},old={}){
    raw=raw&&typeof raw==='object'?raw:{};old=old&&typeof old==='object'?old:{};
    const medals=encounters.map((_,i)=>integer(raw.medals?.[i],3));
    const times=encounters.map((_,i)=>Number.isFinite(raw.times?.[i])&&raw.times[i]>0?raw.times[i]:null);
    const p={version:2,tutorial:raw.tutorial===true,medals,times,best:integer(raw.best??old.best),runs:integer(raw.runs??old.runs),wins:integer(raw.wins??old.wins),skin:raw.skin||'mint'};
    if(!skins.some(s=>s.id===p.skin&&s.stars<=total(p)))p.skin='mint';return p;
  }
  const total=p=>p.medals.reduce((a,b)=>a+b,0);
  const unlocked=p=>{const first=p.medals.findIndex(n=>n===0);return first<0?8:first;};
  function award(p,e){
    p.runs++;p.best=Math.max(p.best,e.score);
    const before=total(p),old=p.medals[e.encounter.id];
    const objectives=[!!e.won,!!e.won&&e.time<=e.encounter.par,!!e.won&&e.hp>=3&&e.hits/Math.max(1,e.shots)>=.7];
    const stars=objectives.filter(Boolean).length;
    if(e.won){p.wins++;p.medals[e.encounter.id]=Math.max(old,stars);p.times[e.encounter.id]=Math.min(p.times[e.encounter.id]||Infinity,e.time);}
    return {stars,objectives,gained:p.medals[e.encounter.id]-old,unlocks:skins.filter(s=>s.stars>before&&s.stars<=total(p))};
  }
  class HuntEngine extends BreakerEngine {
    constructor(id=0,seed=1,training=false){
      super(seed,true);this.encounter=encounters[integer(id,8)];this.maxEnemyHP=this.encounter.hull;this.enemyHP=this.maxEnemyHP;
      this.training=training;this.lesson=training?'collect':null;this.offered=true; // One stable moveset; no mid-fight mutations.
      this.nextAttack=training?Infinity:7;this.targets.forEach(t=>{if(t.kind==='safe')t.width=.39;});
      if(training){this.energy=22;this.maxEnemyHP=5;this.enemyHP=5;this.angle=this.targets.find(t=>t.ring===1&&t.kind==='safe').angle;this.enemyAngle=this.angle;}
    }
    get shielded(){return !this.training&&this.encounter.kind==='sentinel'&&this.time%5<2.5;}
    enemyVelocity(){
      if(this.training)return 0;
      if(this.encounter.kind==='sentinel')return .23;
      if(this.encounter.kind==='wraith')return Math.floor(this.time/4)%2===0?.6:-.6;
      return this.enemyHP<=this.maxEnemyHP/2?-.48:.38;
    }
    attackDelay(){return this.encounter.kind==='wraith'?4.8:6-this.encounter.id%3*.6;}
    collect(){
      super.collect();
      if(this.training&&this.lesson==='collect'&&this.energy>=40){this.lesson='aim';this.emit('lesson','NOW HOLD · RELEASE WHEN THE CHARGE TURNS GOLD');}
    }
    release(){
      if(this.training&&this.lesson==='collect'&&this.held>=.18){this.cancel();this.emit('lesson','QUICK TAP FIRST · COLLECT THE CYAN ARC');return;}
      super.release();
      if(this.training&&this.energy<40)this.energy=40;
    }
    strike(a,damage,perfect,echo=false){
      if(this.shielded&&distance(a,this.enemyAngle)<=.3){this.emit('blocked','SHIELDED · WAIT FOR OPEN');return;}
      super.strike(a,damage,perfect,echo);
    }
    step(dt){
      if(!this.training){super.step(dt);return;}
      const a=this.angle;super.step(dt);this.time=0;
      // Safe, hands-on rehearsal: the target waits, then the launch is aligned.
      if(!this.flight){this.angle=a;this.enemyAngle=a;}
    }
  }
  const api={HuntEngine,encounters,skins,profile,total,unlocked,award};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.OrbitGame)root.OrbitGame.systems.hunt=api;
})(typeof window!=='undefined'?window:globalThis);
