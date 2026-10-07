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
    ['Slipstream','wraith',30,70,'More hull to break. Follow the aim line through each turn.'],
    ['Event horizon','wraith',36,65,'The final hunt. Stay calm, charge gold, launch clean.']
  ].map(([name,kind,hull,par,hint],id)=>({id,name,kind,hull,par,hint,region:['AFTERGLOW','IRON VEIL','DEEP SIGNAL'][Math.floor(id/3)]}));
  const skins=[{id:'mint',name:'Ion',stars:0,color:'#a8ffe7'},{id:'gold',name:'Solar',stars:6,color:'#ffdc85'},{id:'violet',name:'Nebula',stars:15,color:'#d3adff'},{id:'rose',name:'Nova',stars:24,color:'#ff9eb7'}];
  const frames=[{id:'orb',name:'Orb',stars:0},{id:'diamond',name:'Prism',stars:1},{id:'comet',name:'Comet',stars:12}];
  const trails=[{id:'stream',name:'Stream',stars:0},{id:'sparks',name:'Stardust',stars:9},{id:'ribbon',name:'Ribbon',stars:18}];
  const guides={
    stage: {title:'Know your target',focus:'enemy'},
    warning:{title:'Get out of the red arc',focus:'threat',text:'The red arc is where the strike will land. Hold anywhere to slow your orb, or launch to switch orbits. You have until its countdown reaches zero.',action:'TRY THE DODGE'},
    reversal:{title:'The Hunter turns',focus:'enemy',text:'At half hull the Hunter reverses direction. Keep following the enemy, then release when the aim line says RELEASE TO HIT.',action:'FOLLOW THE TURN'},
    shield:{title:'The shield is open',focus:'enemy',text:'The solid shield has become a broken ring. This is your damage window. Line up and release before the OPEN countdown ends.',action:'TAKE THE OPENING'},
    turn:{title:'Watch the reversal',focus:'enemy',text:'The Wraith changes direction every four seconds. Its trail shows its movement. Keep aiming after the turn; an old aim line can miss.',action:'TRACK THE WRAITH'},
    repair:{title:'Purple repairs your hull',focus:'repair',text:'Tap as your white orb reaches a purple + arc to restore one hull. Repairs reset your scoring chain. You can always let a pickup pass.',action:'KEEP HUNTING'}
  };
  const guideKeys=[...encounters.map(e=>'stage'+e.id),'warning','reversal','shield','turn','repair'];
  const integer=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isFinite(v)?Math.min(max,Math.max(0,Math.floor(v))):0;
  function profile(raw={},old={}){
    raw=raw&&typeof raw==='object'?raw:{};old=old&&typeof old==='object'?old:{};
    const medals=encounters.map((_,i)=>integer(raw.medals?.[i],3));
    const times=encounters.map((_,i)=>Number.isFinite(raw.times?.[i])&&raw.times[i]>0?raw.times[i]:null);
    const p={version:2,tutorial:raw.tutorial===true,introV3:raw.introV3===true,medals,times,best:integer(raw.best??old.best),runs:integer(raw.runs??old.runs),wins:integer(raw.wins??old.wins),skin:raw.skin||'mint',frame:raw.frame||'orb',trail:raw.trail||'stream',coaching:raw.coaching!==false,seen:guideKeys.filter(k=>Array.isArray(raw.seen)&&raw.seen.includes(k))};
    if(!skins.some(s=>s.id===p.skin&&s.stars<=total(p)))p.skin='mint';
    for(const [key,items] of [['frame',frames],['trail',trails]])if(!items.some(i=>i.id===p[key]&&i.stars<=total(p)))p[key]=items[0].id;return p;
  }
  const total=p=>p.medals.reduce((a,b)=>a+b,0);
  const unlocked=p=>{const first=p.medals.findIndex(n=>n===0);return first<0?8:first;};
  function award(p,e){
    p.runs++;p.best=Math.max(p.best,e.score);
    const before=total(p),old=p.medals[e.encounter.id];
    const objectives=[!!e.won,!!e.won&&e.time<=e.encounter.par,!!e.won&&e.hp>=3&&e.hits/Math.max(1,e.shots)>=.7];
    const stars=objectives.filter(Boolean).length;
    if(e.won){p.wins++;p.medals[e.encounter.id]=Math.max(old,stars);p.times[e.encounter.id]=Math.min(p.times[e.encounter.id]||Infinity,e.time);}
    return {stars,objectives,gained:p.medals[e.encounter.id]-old,unlocks:[...skins,...frames,...trails].filter(s=>s.stars>before&&s.stars<=total(p))};
  }
  class HuntEngine extends BreakerEngine {
    constructor(id=0,seed=1,training=false,guidedRun=false){
      super(seed,true);this.encounter=encounters[integer(id,8)];this.maxEnemyHP=this.encounter.hull;this.enemyHP=this.maxEnemyHP;
      this.guidedRun=guidedRun&&this.encounter.id===0;training=training||this.guidedRun;this.training=training;this.lesson=training?'collect':null;this.offered=true; // One stable moveset; no mid-fight mutations.
      this.nextAttack=training?Infinity:7;this.targets.forEach(t=>{if(t.kind==='safe')t.width=.39;});
      if(training){this.lessonTargets=this.targets;this.energy=0;this.maxEnemyHP=3;this.enemyHP=3;this.angle=-Math.PI/2;this.enemyAngle=this.angle;this.setLesson('collect');}
    }
    get enemyVisible(){return !this.training||this.lesson==='aim';}
    setLesson(lesson){
      this.lesson=lesson;this.cancel();this.flight=null;
      const kind={collect:'safe',gold:'precision',repair:'repair'}[lesson];
      this.targets=kind?[{ring:this.ring,kind,angle:this.angle,width:kind==='precision'?.14:.39,cooldown:0}]:[];
      if(lesson==='repair')this.hp=4;
      if(lesson==='aim'){this.energy=Math.max(40,this.energy);this.enemyAngle=this.angle;}
      if(lesson==='dodge')this.threat={ring:this.ring,angle:wrap(this.angle+1.4*1.8),time:1.8};
      this.emit('lesson',lesson);
    }
    completeIntro(){
      this.cancel();this.threat=null;
      if(!this.guidedRun){super.finish(true);return;}
      // Teaching is part of stage one, but practice damage/time never earns medals.
      this.training=false;this.lesson=null;this.targets=this.lessonTargets;this.enemyHP=this.encounter.hull;this.maxEnemyHP=this.enemyHP;
      this.hp=5;this.energy=45;this.angle=-Math.PI/2;this.ring=1;this.enemyAngle=.6;
      this.score=0;this.hits=0;this.shots=0;this.damage=0;this.dodges=0;this.repairs=0;this.combo=0;this.time=0;this.nextAttack=7;
      this.emit('introduced','Now defeat the moving enemy.');
    }
    finish(won){
      if(this.training&&won){if(this.lesson==='aim')this.setLesson('dodge');return;}
      super.finish(won);
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
      const valid=this.training&&this.targets.some(t=>t.ring===this.ring&&t.cooldown<=0&&distance(this.angle,t.angle)<=t.width);
      super.collect();
      if(valid){const next={collect:'gold',gold:'repair',repair:'aim'}[this.lesson];if(next)this.setLesson(next);}
    }
    release(){
      if(this.training&&['collect','gold','repair'].includes(this.lesson)&&this.held>=.18){this.cancel();this.emit('miss','A quick tap collects this pickup.');return;}
      super.release();
      if(this.training&&this.lesson==='aim'&&this.energy<40)this.energy=40;
    }
    strike(a,damage,perfect,echo=false){
      if(this.shielded&&distance(a,this.enemyAngle)<=.3){this.emit('blocked','SHIELDED · WAIT FOR OPEN');return;}
      super.strike(a,damage,perfect,echo);
    }
    step(dt){
      if(!this.training){super.step(dt);return;}
      const a=this.angle;super.step(dt);this.time=0;
      // Safe, hands-on rehearsal: the target waits, then the launch is aligned.
      if(this.lesson!=='dodge'&&!this.flight){this.angle=a;this.enemyAngle=a;}
      if(this.lesson==='dodge'){this.hp=5;if(this.dodges>0){this.completeIntro();return;}if(!this.threat){this.threat={ring:this.ring,angle:wrap(this.angle+1.4*1.8),time:1.8};this.emit('lesson','TRY AGAIN · HOLD TO SLOW DOWN BEFORE THE STRIKE');}}
    }
  }
  const api={HuntEngine,encounters,skins,frames,trails,guides,profile,total,unlocked,award};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.OrbitGame)root.OrbitGame.systems.hunt=api;
})(typeof window!=='undefined'?window:globalThis);
