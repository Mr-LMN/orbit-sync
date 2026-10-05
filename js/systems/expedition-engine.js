/* Deterministic gameplay model. No DOM, audio, storage or wall-clock timers. */
(function(root) {
  'use strict';
  const TAU = Math.PI * 2;
  const CORES = {
    anchor: { name: 'Anchor', color: '#68ead7', lives: 5, speed: 1.35, width: 1.3, score: 0.9, text: 'Wider windows. Five lives. Lower score rewards.' },
    prism: { name: 'Prism', color: '#b8a1ff', lives: 3, speed: 1.5, width: 0.9, score: 1.4, text: 'Tighter windows. Perfect hits earn 40% more.' },
    pulse: { name: 'Pulse', color: '#ffbe70', lives: 4, speed: 1.5, width: 1, score: 1, text: 'Your streak builds speed and a score bonus.' }
  };
  const UPGRADES = {
    repair: { name: 'Field repair', text: 'Restore two lives, up to your starting maximum.' },
    capacitor: { name: 'Capacitor', text: 'Perfect hits charge Overdrive 35% faster.' },
    stabilizer: { name: 'Stabilizer', text: 'Make every target window 18% wider.' },
    amplifier: { name: 'Amplifier', text: 'Add 25% to hit scores.' },
    sustain: { name: 'Sustain', text: 'Overdrive lasts three seconds longer.' },
    shield: { name: 'Backup shield', text: 'Absorb your next mistake without losing a life.' }
  };
  const SECTORS = [
    {name:'Signal garden',goal:12,types:['tap','tap','risk'],color:'#68ead7',tip:'Tap inside a glowing zone. The bright centre earns a perfect hit. Gold targets give extra charge for precision.'},
    {name:'Tether field',goal:14,types:['hold','tap','risk','hold'],color:'#a994ff',tip:'On purple targets, press at the first cap, hold through the arc, then release at the second cap.'},
    {name:'Relay storm',goal:16,types:['link','risk','hold','link'],color:'#ffbd72',tip:'Hit numbered targets in order: 1, 2, 3. Each successful input counts toward clearing the sector.'},
    {name:'The Gatekeeper',goal:18,types:['risk'],color:'#ff728c',tip:'Read the warning. Complete its shield pattern, then hit the exposed core. Perfect hits deal double damage.'}
  ];
  const PRACTICE = {
    tap: 'Tap timing', hold: 'Hold & release', link: 'Linked targets', risk: 'Precision targets', boss: 'Guardian patterns'
  };
  class ExpeditionEngine {
    constructor({core='anchor',practice=null,random=Math.random}={}) {
      this.core = CORES[core] ? core : 'anchor';
      this.practice = Object.hasOwn(PRACTICE,practice) ? practice : null;
      this.random = random;
      this.status = 'briefing'; this.paused = false;
      this.sector = practice === 'boss' ? 3 : 0;
      this.travel = -Math.PI / 2; this.elapsed = 0; this.encounterTime = 0;
      this.lives = CORES[this.core].lives; this.maxLives = this.lives;
      this.score = 0; this.streak = 0; this.bestStreak = 0;
      this.hits = 0; this.perfects = 0; this.misses = 0; this.cleared = 0;
      this.charge = 0; this.overdrive = 0; this.overdriveCount = 0;
      this.target = null; this.holding = false; this.cooldown = 0;
      this.upgrades = {}; this.routes = []; this.route = 'steady';
      this.offers = []; this.bossHP = 18; this.bossPhase = 0;
      this.bossState = 'warning'; this.bossClock = 0; this.openingHits = 0;
      this.events = []; this.lastFeedback = null; this.timingErrors = [];
      this.targetSerial = 0;
    }
    get definition() { return SECTORS[this.sector]; }
    get angle() { return ((this.travel % TAU) + TAU) % TAU; }
    get speed() {
      const momentum = this.core === 'pulse' ? 1 + Math.min(0.3,this.streak*0.025) : 1;
      return CORES[this.core].speed * (1+this.sector*0.065) * momentum * (this.route==='volatile'?1.15:1);
    }
    get windowScale() { return CORES[this.core].width * (1 + 0.18*(this.upgrades.stabilizer||0)); }
    emit(type,data={}) { this.events.push({type,...data}); }
    drainEvents() { return this.events.splice(0); }
    begin() {
      if(this.status!=='briefing') return false;
      this.status='playing'; this.encounterTime=0; this.cooldown=0.6;
      if(this.sector===3) this.warnBoss();
      return true;
    }
    pause(value=true) {
      if(this.status!=='playing') return;
      this.paused=value;
      // A held touch cannot survive an app switch; repeat that pattern without penalty.
      if(value && this.holding) {this.holding=false;this.target=null;this.cooldown=0.6;}
    }
    spawn(type) {
      if(this.status!=='playing' || this.target) return;
      const kinds = this.definition.types;
      type = type || (this.practice && this.practice!=='boss' ? this.practice : kinds[this.targetSerial % kinds.length]);
      const centre = this.travel + 2.5 + this.random()*1.3;
      const width = (type==='risk'?0.32:0.23)*this.windowScale;
      this.target = {id:++this.targetSerial,type,centre,width,end:centre+(type==='hold'?1.05:0),index:0,centres:type==='link'?[centre,centre+0.85,centre+1.7]:[centre]};
      this.emit('spawn',{kind:type});
    }
    ideal() {
      const t=this.target;
      return !t?null : t.type==='hold' && this.holding?t.end:t.centres[t.index];
    }
    feedback(label,error=0,quality='miss') {
      this.lastFeedback={label,error,quality,at:this.elapsed};
      this.emit('feedback',this.lastFeedback);
    }
    press() {
      if(this.status!=='playing'||this.paused||this.holding||!this.target) return false;
      const t=this.target, ideal=this.ideal(), distance=this.travel-ideal;
      const error=distance/this.speed*1000;
      if(Math.abs(distance)>t.width) {this.miss(error<0?'TOO EARLY':'TOO LATE',error);return false;}
      if(t.type==='hold') {
        this.holding=true; t.entryError=error;
        this.feedback('HOLD → RELEASE AT THE CAP',error,'hold');return true;
      }
      const perfect=Math.abs(distance)<=Math.min(t.width*0.32, t.type==='risk'?0.065:0.085);
      this.hit(perfect,error,t.type==='risk');
      if(this.status!=='playing') return true;
      if(t.type==='link' && t.index<2) {t.index++;return true;}
      this.completePattern();return true;
    }
    release(cancelled=false) {
      if(!this.holding||!this.target||this.status!=='playing'||this.paused) return false;
      this.holding=false;
      if(cancelled) {this.target=null;this.cooldown=0.6;return false;}
      const t=this.target, error=(this.travel-t.end)/this.speed*1000;
      if(Math.abs(this.travel-t.end)>t.width) {this.miss(error<0?'RELEASED EARLY':'HELD TOO LONG',error);return false;}
      this.hit(Math.abs(this.travel-t.end)<0.09 && Math.abs(t.entryError)<90,error,false);
      if(this.status==='playing') this.completePattern();
      return true;
    }
    hit(perfect,error,risk) {
      this.hits++;this.cleared++;this.streak++;this.bestStreak=Math.max(this.streak,this.bestStreak);
      if(perfect)this.perfects++;
      this.timingErrors.push(Math.round(error));if(this.timingErrors.length>100)this.timingErrors.shift();
      const momentum=this.core==='pulse'?1+Math.min(0.5,this.streak*0.025):1;
      const coreBonus=this.core==='prism'&&perfect?CORES.prism.score:this.core==='anchor'?0.9:1;
      const bonus=(1+0.25*(this.upgrades.amplifier||0))*(this.route==='volatile'?1.3:1)*momentum*coreBonus;
      this.score+=Math.round((perfect?150:80)*bonus*(this.overdrive>0?2:1));
      this.feedback(perfect?'PERFECT':'SYNC',error,perfect?'perfect':'good');
      if(!this.overdrive) {
        this.charge=Math.min(100,this.charge+(perfect?(risk?28:20):5)*(1+0.35*(this.upgrades.capacitor||0)));
        if(this.charge>=100) {this.charge=0;this.overdrive=7+3*(this.upgrades.sustain||0);this.overdriveCount++;this.emit('overdrive');}
      }
      if(this.sector===3 && this.bossState==='opening') {
        this.bossHP=Math.max(0,this.bossHP-(perfect?2:1));this.openingHits++;
        if(!this.bossHP) {this.finish(true);return;}
      }
      if(this.practice && this.practice!=='boss') return;
      if(this.sector<3 && this.cleared>=this.definition.goal) {
        this.status='choice';this.target=null;this.holding=false;
        const pool=Object.keys(UPGRADES);
        // Fisher-Yates: seeded tests and fair offers; no random comparator sort.
        for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
        this.offers=pool.slice(0,3);this.emit('sectorClear');
      }
    }
    miss(label,error=0) {
      if(this.status!=='playing')return;
      this.misses++;this.streak=0;this.charge=Math.max(0,this.charge-18);
      if(!this.practice) {
        if(this.upgrades.shield){this.upgrades.shield--;label='SHIELD ABSORBED';}
        else this.lives--;
      }
      this.feedback(label,error,'miss');this.target=null;this.holding=false;this.cooldown=0.8;
      if(this.lives<=0){this.finish(false);return;}
      if(this.sector===3 && this.bossState==='attack')this.openBoss();
    }
    completePattern() {
      this.target=null;this.holding=false;this.cooldown=0.45;
      if(this.sector===3 && this.bossState==='attack')this.openBoss();
      else if(this.sector===3 && this.bossState==='opening' && this.openingHits>=3)this.warnBoss();
    }
    choose(upgrade,route='steady') {
      if(this.status!=='choice'||!this.offers.includes(upgrade)||!['steady','volatile'].includes(route))return false;
      if(upgrade==='repair')this.lives=Math.min(this.maxLives,this.lives+2);
      else this.upgrades[upgrade]=(this.upgrades[upgrade]||0)+1;
      this.route=route;this.routes.push(route);this.sector++;this.cleared=0;
      this.status='briefing';this.target=null;this.holding=false;this.offers=[];
      this.emit('upgrade',{upgrade});return true;
    }
    warnBoss() {
      this.bossPhase=this.bossHP>12?0:this.bossHP>6?1:2;
      this.bossState='warning';this.bossClock=2;this.target=null;this.holding=false;
      this.emit('bossWarning',{phase:this.bossPhase});
    }
    openBoss() {
      this.bossState='opening';this.bossClock=11;this.openingHits=0;
      this.target=null;this.holding=false;this.cooldown=0.35;this.emit('bossOpen');
    }
    tick(dt) {
      if(this.status!=='playing'||this.paused||!Number.isFinite(dt)||dt<=0)return;
      // Substeps preserve narrow windows even on a slow frame. The caller bounds long stalls.
      let remaining=Math.min(dt,0.25);
      while(remaining>1e-8 && this.status==='playing') {
        const step=Math.min(remaining,1/120);this.step(step);remaining-=step;
      }
    }
    step(dt) {
      this.elapsed+=dt;this.encounterTime+=dt;this.travel+=this.speed*dt;
      this.overdrive=Math.max(0,this.overdrive-dt);this.cooldown=Math.max(0,this.cooldown-dt);
      if(!this.practice && this.elapsed>=300){this.feedback('SIGNAL EXPIRED',0,'miss');this.finish(false);return;}
      if(this.sector===3) {
        this.bossClock-=dt;
        if(this.bossState==='warning') {
          if(this.bossClock<=0){this.bossState='attack';this.bossClock=9;this.spawn(['hold','link','risk'][this.bossPhase]);}
          return;
        }
        if(this.bossClock<=0) {
          if(this.bossState==='attack')this.miss('SHIELD MISSED');
          else this.warnBoss();
          return;
        }
      }
      if(!this.target && this.cooldown===0)this.spawn(this.sector===3?(this.bossState==='attack'?['hold','link','risk'][this.bossPhase]:'risk'):undefined);
      if(this.target) {
        const t=this.target, end=this.holding?t.end:t.centres[t.index];
        if(this.travel>end+t.width)this.miss(this.holding?'HELD TOO LONG':'MISSED WINDOW',(this.travel-end)/this.speed*1000);
      }
    }
    finish(won) {this.status=won?'won':'lost';this.target=null;this.holding=false;this.emit('finish',{won});}
    summary() {
      const errors=this.timingErrors;
      return {score:this.score,hits:this.hits,perfects:this.perfects,misses:this.misses,bestStreak:this.bestStreak,
        accuracy:this.hits+this.misses?Math.round(this.hits/(this.hits+this.misses)*100):0,
        bias:errors.length?Math.round(errors.reduce((a,b)=>a+b,0)/errors.length):0,
        elapsed:Math.round(this.elapsed),overdrives:this.overdriveCount,won:this.status==='won',core:this.core};
    }
  }
  const api={ExpeditionEngine,CORES,UPGRADES,SECTORS,PRACTICE,TAU};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){const OG=root.OrbitGame=root.OrbitGame||{};OG.systems=OG.systems||{};OG.systems.expeditionModel=api;}
})(typeof window!=='undefined'?window:null);
