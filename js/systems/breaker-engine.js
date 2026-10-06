(function initBreakerModel(root) {
  'use strict';
  const TAU = Math.PI * 2;
  const wrap = a => ((a % TAU) + TAU) % TAU;
  const distance = (a,b) => Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  class BreakerEngine {
    constructor(seed = 1) {
      this.seed=seed>>>0; this.time=0; this.status='playing'; this.paused=false;
      this.angle=-Math.PI/2; this.ring=1; this.energy=45; this.hp=5; this.enemyHP=24;
      this.enemyAngle=.6; this.enemyRing=.5; this.combo=0; this.score=0;
      this.holding=false; this.held=0; this.flight=null; this.echo=null;
      this.shots=0; this.hits=0; this.damage=0; this.repairs=0; this.dodges=0;
      this.nextAttack=6; this.threat=null; this.upgrade=null; this.offered=false; this.slingshot=false;
      this.events=[];
      this.targets=[0,1].flatMap(ring=>['safe','precision','repair'].map((kind,i)=>({ring,kind,angle:wrap(i*TAU/3+ring*.7),width:kind==='safe'?.34:kind==='precision'?.14:.24,cooldown:0})));
    }
    random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
    emit(type,label,extra={}){this.events.push({type,label,...extra});}
    drainEvents(){return this.events.splice(0);}
    cancel(){this.holding=false;this.held=0;}
    pause(){if(this.status==='playing'){this.paused=true;this.cancel();}}
    resume(){this.paused=false;}
    press(){if(this.status!=='playing'||this.paused||this.flight||this.holding)return;this.holding=true;this.held=0;}
    release(){
      if(!this.holding)return;
      const held=this.held;this.cancel();
      if(this.status!=='playing'||this.paused||this.flight)return;
      if(held<.18){this.collect();return;}
      if(this.energy<40){this.emit('miss','NEED 40 ENERGY · TAP CYAN / GOLD');return;}
      const perfect=held>=.65&&held<=1.05;
      this.energy-=40;this.shots++;
      this.flight={angle:this.angle,from:this.ring,to:1-this.ring,time:0,duration:.28,perfect,damage:(perfect?5:3)+(this.slingshot?2:0)};
      this.slingshot=false;this.emit('launch',perfect?'PERFECT LAUNCH':'LAUNCH',{angle:this.angle});
    }
    collect(){
      const t=this.targets.find(t=>t.ring===this.ring&&t.cooldown<=0&&distance(this.angle,t.angle)<=t.width);
      if(!t){this.combo=0;this.energy=Math.max(0,this.energy-6);this.emit('miss','EMPTY TAP · −6 ENERGY');return;}
      if(t.kind==='repair'&&this.hp===5){this.emit('feedback','HULL FULL · SAVE THE REPAIR');return;}
      if(t.kind==='repair'){this.hp=Math.min(5,this.hp+1);this.combo=0;this.repairs++;this.emit('repair','HULL REPAIRED · CHAIN RESET');}
      else {this.combo++;const gain=t.kind==='precision'?32:18;this.energy=Math.min(100,this.energy+gain);this.score+=(t.kind==='precision'?80:30)+Math.min(10,this.combo)*5;this.emit('collect',`+${gain} ENERGY${t.kind==='precision'?' · PRECISION':''}`,{angle:this.angle,ring:this.ring});}
      t.cooldown=t.kind==='repair'?12:1.5;
      for(let attempt=0;attempt<32;attempt++){
        const candidate=wrap(t.angle+1.1+this.random()*4);
        if(this.targets.every(other=>other===t||other.ring!==t.ring||distance(candidate,other.angle)>t.width+other.width+.12)){t.angle=candidate;break;}
      }
    }
    strike(angle,damage,perfect,echo=false){
      if(distance(angle,this.enemyAngle)<=.3){
        const dealt=Math.min(this.enemyHP,damage);this.enemyHP-=dealt;this.damage+=dealt;if(!echo)this.hits++;
        this.score+=dealt*100;this.emit('hit',`${echo?'ECHO':perfect?'CRITICAL':'HIT'} · −${dealt} HULL`,{angle:this.enemyAngle});
        if(this.enemyHP<=0){this.finish(true);return;}
      }else this.emit('miss',echo?'ECHO MISSED':'MISSED · ALIGN THE AIM LINE');
    }
    choose(id){if(this.status!=='upgrade'||!['echo','slingshot'].includes(id))return false;this.upgrade=id;this.status='playing';this.emit('upgrade',id==='echo'?'ECHO ARMED':'SLINGSHOT ARMED');return true;}
    finish(won){if(this.status==='ended')return;this.status='ended';this.won=won;this.cancel();this.emit('finish',won?'CORE BROKEN':this.hp<=0?'HULL LOST':'TIME UP');}
    tick(dt){
      if(this.status!=='playing'||this.paused)return;
      let remaining=Math.min(.25,Math.max(0,dt));
      while(remaining>0&&this.status==='playing') {const step=Math.min(remaining,1/120);this.step(step);remaining-=step;}
    }
    step(dt){
      this.time+=dt;
      if(this.time>=90){this.time=90;this.finish(false);return;}
      if(this.holding)this.held+=dt;
      if(!this.flight)this.angle=wrap(this.angle+dt*1.4*(this.holding&&this.held>=.18?.28:1));
      this.enemyAngle=wrap(this.enemyAngle+dt*(this.enemyHP<=12?-.48:.38));
      this.enemyRing=.5+Math.sin(this.time*.8)*.13;
      for(const t of this.targets)t.cooldown=Math.max(0,t.cooldown-dt);
      if(this.flight){
        const f=this.flight;f.time+=dt;
        if(f.time>=f.duration){this.ring=f.to;this.angle=f.angle;this.flight=null;this.strike(f.angle,f.damage,f.perfect);if(this.upgrade==='echo'&&this.status==='playing')this.echo={time:.55,angle:f.angle,damage:2};}
      }
      if(this.status!=='playing')return;
      if(this.echo){this.echo.time-=dt;if(this.echo.time<=0){const e=this.echo;this.echo=null;this.strike(e.angle,e.damage,false,true);}}
      if(this.status!=='playing')return;
      if(this.threat){
        this.threat.time-=dt;
        if(this.threat.time<=0){
          const t=this.threat;this.threat=null;
          if(!this.flight&&this.ring===t.ring&&distance(this.angle,t.angle)<.5){this.hp--;this.combo=0;this.emit('damage','HULL HIT · HOLD TO BRAKE OR LAUNCH AWAY');if(this.hp<=0){this.finish(false);return;}}
          else {this.dodges++;if(this.upgrade==='slingshot'){this.energy=Math.min(100,this.energy+20);this.slingshot=true;}this.emit('dodge',this.upgrade==='slingshot'?'DODGE · +20 ENERGY · NEXT SHOT +2':'DODGED');}
        }
      }else if(this.time>=this.nextAttack){
        this.threat={ring:this.ring,angle:wrap(this.angle+1.4*1.8),time:1.8};this.nextAttack=this.time+(this.enemyHP<=12?4.4:6);
        this.emit('warning','RED ARC INCOMING · BRAKE OR SWITCH ORBITS');
      }
      if(!this.offered&&!this.flight&&!this.echo&&(this.time>=45||this.enemyHP<=12)){
        this.offered=true;this.status='upgrade';this.cancel();this.emit('choice','CHOOSE YOUR MUTATION');
      }
    }
  }
  const api={BreakerEngine,TAU,wrap,distance};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.OrbitGame){root.OrbitGame.systems=root.OrbitGame.systems||{};root.OrbitGame.systems.breakerModel=api;}
})(typeof window!=='undefined'?window:globalThis);
