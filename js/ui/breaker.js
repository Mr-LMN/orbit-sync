(function initBreaker(window,document){
  'use strict';
  const focused=document.documentElement.dataset.experience==='focused';
  const OG=window.OrbitGame,{BreakerEngine,TAU,distance}=OG.systems.breakerModel;
  const root=document.createElement('section');root.id='breakerRoot';root.hidden=true;root.setAttribute('aria-label',focused?'Orbit Sync':'Orbit Breaker prototype');
  root.innerHTML=`<canvas id="breakerCanvas" aria-label="Tap to collect targets. Hold to brake and aim, release to launch."></canvas>
    <div class="br-hud" hidden><div class="br-row"><div><div class="br-label">ORBIT BREAKER</div><strong id="brTime">90s</strong></div><span id="brHealth" class="br-health"></span><button id="brPause" aria-label="Pause Orbit Breaker">Ⅱ</button></div><div class="br-row br-label"><span>HUNTER HULL</span><span id="brEnemy"></span></div><div class="br-meter"><i id="brEnemyBar"></i></div><div class="br-row br-label"><span id="brScore"></span><span id="brMutation"></span></div></div>
    <div class="br-bottom" hidden><div id="brFeedback" aria-live="polite"></div><div id="brCharge"></div><div class="br-meter br-energy"><i id="brEnergy"></i></div><div class="br-legend"><span><b style="color:#7cead8">●</b>SAFE +18</span><span><b style="color:#ffdc85">◇</b>PRECISE +32</span><span><b style="color:#d3adff">+</b>REPAIR</span></div><div class="br-help">Tap to collect · Hold to aim · Release to launch</div></div>
    <div id="brPanel" class="br-panel" role="dialog" aria-modal="true" aria-labelledby="brTitle"></div>`;
  document.body.appendChild(root);
  const $=id=>root.querySelector('#'+id),canvas=$('breakerCanvas'),ctx=canvas.getContext('2d',{alpha:false}),panel=$('brPanel'),hud=root.querySelector('.br-hud'),bottom=root.querySelector('.br-bottom');
  const KEY=focused?'orbitSync_hunt_v1':'orbitSync_breaker_v1';
  let open=false,engine=null,raf=null,last=0,lastHUD=0,pointer=null,space=false,observer=null,focus=null;
  let width=390,height=700,cx=195,cy=350,radius=140,recorded=false,feedbackUntil=0,particles=[],beams=[];
  const colours={safe:'#7cead8',precision:'#ffdc85',repair:'#d3adff'};
  function read(){const r=OG.storage.getJSON(KEY,{})||{};const n=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;return {best:n(r.best),runs:n(r.runs),wins:n(r.wins)};}
  let record=read();
  function show(html){panel.innerHTML='<div>'+html+'</div>';panel.hidden=false;const h=$('brTitle');h.tabIndex=-1;h.focus({preventScroll:true});}
  function buttons(primary,label='PLAY AGAIN'){return `<div class="br-buttons"><button class="primary" id="${primary}">${label}</button><button id="brExit">${focused?'MAIN MENU':'BACK TO HUB'}</button></div>`;}
  function exitButton(){$('brExit').onclick=close;}
  function home(){
    engine=null;hud.hidden=true;bottom.hidden=true;particles=[];beams=[];
    show(`<div class="br-kicker">ORBIT SYNC</div><div class="hunt-mark" aria-hidden="true"><i></i><b>↗</b></div><h1 id="brTitle">Charge.<br>Aim. Break.</h1><p>Two orbits. One Hunter. 90 seconds.<br>Collect energy, line up your shot, and launch.</p><div class="hunt-record"><span>PERSONAL BEST<strong>${record.best.toLocaleString()}</strong></span><span>HUNTERS DEFEATED<strong>${record.wins}</strong></span></div><div class="br-buttons"><button class="primary" id="brStart">PLAY</button><div class="hunt-secondary"><button id="huntHelp">HOW TO PLAY</button><button id="huntSettings">SETTINGS</button></div></div>`);
    $('brStart').onclick=start;$('huntHelp').onclick=help;$('huntSettings').onclick=settings;
  }
  function help(){
    show(`<div class="br-kicker">ONE FIGHT. THREE MOVES.</div><h1 id="brTitle">Learn the hunt.</h1><div class="br-rule"><b>1</b><span><strong>Tap to charge</strong>Your white orb moves by itself. Tap anywhere when it enters a cyan or gold arc. Let unwanted targets pass. Purple restores health but resets your scoring chain.</span></div><div class="br-rule"><b>2</b><span><strong>Hold to aim. Release to attack.</strong>Holding slows your orb. With 40 energy, release when the aim line turns green to strike the orange Hunter and switch orbits. A gold charge adds damage.</span></div><div class="br-rule"><b>3</b><span><strong>Stay out of the red arc</strong>Hold to brake or launch to the other orbit before the warning ends. Echo unlocks during the fight: your launches repeat automatically.</span></div><p>Destroy the Hunter before 90 seconds or five lost lives. Space also controls the orb; Escape pauses. Unfinished runs end if you reload.</p>${buttons('brStart','PLAY')}`);$('brStart').onclick=start;exitButton();
  }
  function settings(){
    show(`<div class="br-kicker">MAKE IT COMFORTABLE</div><h1 id="brTitle">Settings.</h1><div class="hunt-options"><label>Sound effects<input id="huntSound" type="checkbox" ${OG.audio.sfxEnabled?'checked':''}></label><label>Vibration<input id="huntHaptic" type="checkbox" ${OG.audio.hapticsEnabled?'checked':''}></label><label>Reduced motion<input id="huntMotion" type="checkbox" ${OG.core.preferences.reducedMotion()?'checked':''}></label><label>Battery saver<input id="huntBattery" type="checkbox" ${OG.core.preferences.lowEffects()?'checked':''}></label></div><div class="br-buttons"><button class="primary" id="brExit">DONE</button></div>`);
    $('huntSound').onchange=e=>{OG.audio.sfxEnabled=e.target.checked;OG.storage.setItem('orbitSync_hunt_sound',e.target.checked?'1':'0');};
    $('huntHaptic').onchange=e=>{OG.audio.hapticsEnabled=e.target.checked;OG.storage.setItem('orbitSync_hunt_haptic',e.target.checked?'1':'0');};
    $('huntMotion').onchange=e=>OG.core.preferences.setReducedMotion(e.target.checked);
    $('huntBattery').onchange=e=>{OG.core.preferences.setQuality(e.target.checked?'low':'auto');resize();};exitButton();
  }
  if(focused){OG.audio.sfxEnabled=OG.storage.getItem('orbitSync_hunt_sound','1')!=='0';OG.audio.hapticsEnabled=OG.storage.getItem('orbitSync_hunt_haptic','1')!=='0';}
  function setup(){
    if(focused){home();return;}
    engine=null;hud.hidden=true;bottom.hidden=true;
    show(`<div class="br-kicker">NEW EXPERIMENT / 90 SECONDS</div><h1 id="brTitle">Stop circling.<br>Start hunting.</h1><p>Break the moving Hunter before time runs out. Choose your pickups. Cross its path. Make the shot count.</p>
      <div class="br-rule"><b>01</b><span><strong>Tap for energy</strong>Collect cyan or gold arcs as your orb reaches them. Purple repairs cost your chain. Let unwanted targets pass.</span></div>
      <div class="br-rule"><b>02</b><span><strong>Hold, aim, release</strong>Holding slows your orb. With 40 energy, release through the Hunter to switch orbits and deal damage. Gold charge gives a critical hit.</span></div>
      <div class="br-rule"><b>03</b><span><strong>Watch the red arc</strong>Brake or launch to dodge the incoming strike. Pick Echo or Slingshot halfway through.</span></div>
      <p>Best ${record.best.toLocaleString()} · ${record.wins} victories<br><small>Tap anywhere in the arena, or use Space. Esc pauses.</small></p>${buttons('brStart','ENTER THE HUNT')}`);
    $('brStart').onclick=start;exitButton();
  }
  function start(){
    try{OG.audio.initAudio();}catch{}
    engine=new BreakerEngine(Date.now(),focused);recorded=false;particles=[];beams=[];pointer=null;space=false;panel.hidden=true;hud.hidden=false;bottom.hidden=false;last=performance.now();
    $('brFeedback').textContent='HOLD TO AIM · RELEASE WHEN THE LINE TURNS GREEN';feedbackUntil=performance.now()+5000;updateHUD();canvas.focus({preventScroll:true});
  }
  function resetInput(){engine?.cancel();space=false;if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}
  function pause(){if(!engine||engine.status!=='playing'||engine.paused)return;engine.pause();resetInput();show(`<div class="br-kicker">HUNT SUSPENDED</div><h1 id="brTitle">Take a breath.</h1><p>Your timer is frozen. Resume when you’re ready.</p>${buttons('brResume','RESUME HUNT')}`);$('brResume').onclick=()=>{panel.hidden=true;engine.resume();last=performance.now();canvas.focus({preventScroll:true});};exitButton();}
  function choose(){resetInput();show(`<div class="br-kicker">MID-RUN MUTATION</div><h1 id="brTitle">Change the hunt.</h1><p>The timer is stopped. Pick one for the rest of this run.</p><div class="br-buttons"><button class="br-upgrade" id="brEcho"><strong>ECHO STRIKE</strong><small>Your launch repeats along the same line after a short delay, dealing 2 extra damage if it connects.</small></button><button class="br-upgrade" id="brSling"><strong>SLINGSHOT</strong><small>Dodging a red strike earns 20 energy and adds 2 damage to your next launch.</small></button></div>`);for(const [id,key]of [['brEcho','echo'],['brSling','slingshot']])$(id).onclick=()=>{engine.choose(key);panel.hidden=true;last=performance.now();processEvents();canvas.focus({preventScroll:true});};}
  function result(){
    resetInput();const e=engine,previous=record.best;
    if(!recorded){recorded=true;record.runs++;if(e.won)record.wins++;record.best=Math.max(record.best,e.score);OG.storage.setJSON(KEY,record);}
    show(`<div class="br-kicker">${e.score>previous?'NEW PERSONAL BEST':'HUNT COMPLETE'}</div><h1 id="brTitle">${e.won?'Core broken.':e.hp<=0?'Outmanoeuvred.':'Time escaped.'}</h1><p>${e.won?(focused?'Hunter defeated. Can you do it with fewer missed shots?':'That is how you end an orbit. Try the other mutation next.'):e.hits===0?'Hold to slow down. Align the aim line with the Hunter, then release.':'Choose your next opening: gold for energy, purple to survive, then launch.'}</p><div class="br-summary"><div><strong>${e.score.toLocaleString()}</strong>SCORE</div><div><strong>${e.damage} / 24</strong>DAMAGE</div><div><strong>${e.hits} / ${e.shots}</strong>LAUNCHES HIT</div><div><strong>${e.dodges}</strong>STRIKES DODGED</div></div><p>${Math.ceil(e.time)}s played · Best ${record.best.toLocaleString()} · ${e.upgrade||(focused?'Hunter encounter':'No mutation')}</p>${buttons('brRetry')}`);$('brRetry').onclick=start;exitButton();
  }
  function resize(){const r=root.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(OG.core.preferences.lowEffects()?1:2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cx=width/2;cy=height<500?height*.52:height*.48;radius=Math.min(width*.39,height<500?height*.36:height*.235);}
  function enter(){if(open||!inMenu)return;focus=document.activeElement;open=true;root.hidden=false;if(focused){for(const el of document.body.children)if(el!==root&&!['SCRIPT','STYLE'].includes(el.tagName))el.inert=true;root.querySelector('.br-hud .br-label').textContent='ORBIT SYNC';$('brPause').setAttribute('aria-label','Pause game');}record=read();OG.core.loop.stopMainLoop();inMenu=false;isPlaying=false;OG.systems.tutorial?.suspendTutorialUI?.();if(typeof stopDynamicMusic==='function')stopDynamicMusic();document.body.classList.add('breaker-active');resize();setup();observer=new ResizeObserver(()=>{pause();resize();});observer.observe(root);last=performance.now();raf=requestAnimationFrame(frame);}
  function close(){if(focused){resetInput();home();return;}resetInput();open=false;root.hidden=true;engine=null;cancelAnimationFrame(raf);observer?.disconnect();document.body.classList.remove('breaker-active');inMenu=true;isPlaying=false;OG.core.loop.startMainLoop();focus?.focus({preventScroll:true});}
  function point(a,ring){const r=radius*(.57+.43*ring);return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};}
  function burst(a,ring,color){if(OG.core.preferences.reducedMotion()||OG.core.preferences.lowEffects())return;const p=point(a,ring);for(let i=0;i<14;i++){const t=i*TAU/14;particles.push({x:p.x,y:p.y,vx:Math.cos(t)*65,vy:Math.sin(t)*65,life:.5,color});}if(particles.length>100)particles.splice(0,particles.length-100);}
  function processEvents(){
    if(!engine)return;const events=engine.drainEvents();for(const ev of events){
      $('brFeedback').textContent=ev.label;feedbackUntil=performance.now()+2400;
      if(['hit','collect','repair','launch','damage'].includes(ev.type)){
        if(OG.audio.audioCtx&&OG.audio.sfxEnabled){try{OG.audio.playTone(ev.type==='hit'?220:ev.type==='damage'?90:ev.type==='launch'?440:660,'sine',.1,.008,.13);}catch{}}
        if(ev.type==='hit'){burst(ev.angle,engine.enemyRing,'#ffbc91');beams.push({angle:ev.angle,life:.3});if(OG.audio.hapticsEnabled&&!OG.core.preferences.reducedMotion()&&navigator.vibrate)navigator.vibrate(20);}
        if(ev.type==='collect')burst(ev.angle,ev.ring,'#7cead8');
      }
      if(ev.type==='choice')choose();if(ev.type==='finish')result();
    }if(events.length||performance.now()-lastHUD>100){updateHUD();lastHUD=performance.now();}
  }
  function updateHUD(){if(!engine)return;const e=engine;$('brTime').textContent=`${Math.ceil(90-e.time)}s`;$('brHealth').textContent='●'.repeat(e.hp)+'○'.repeat(5-e.hp);$('brHealth').setAttribute('aria-label',`${e.hp} of 5 hull`);$('brEnemy').textContent=`${e.enemyHP} / 24`;$('brEnemyBar').style.width=e.enemyHP/24*100+'%';$('brScore').textContent=focused?`${e.score} POINTS`:`${e.score} PTS · CHAIN ${e.combo}`;$('brMutation').textContent=focused?(e.upgrade?'ECHO ONLINE':'BREAK THE HUNTER'):(e.upgrade?e.upgrade.toUpperCase():'NO MUTATION');$('brEnergy').style.width=e.energy+'%';$('brCharge').textContent=`${e.energy} ENERGY · ${e.energy>=40?'LAUNCH READY':'40 NEEDED TO LAUNCH'}`;}
  function arc(r,a,b,color,line=2){ctx.beginPath();ctx.arc(cx,cy,r,a,b);ctx.strokeStyle=color;ctx.lineWidth=line;ctx.stroke();}
  function draw(dt,now){
    ctx.fillStyle='#091020';ctx.fillRect(0,0,width,height);
    const low=OG.core.preferences.lowEffects(),reduced=OG.core.preferences.reducedMotion();
    if(!low){const g=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.5);g.addColorStop(0,'#142f45');g.addColorStop(1,'#091020');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);}
    for(let i=0;i<32;i++){ctx.fillStyle='#45607c';ctx.fillRect((i*137%997)/997*width,(i*233%991)/991*height,1,1);}
    const e=engine;if(!e)return;
    for(const ring of [0,1]){arc(radius*(.57+.43*ring),0,TAU,ring===e.ring?'#6c8eab':'#31465f',ring===e.ring?2:1);}
    // A moving enemy between the lanes is the target of radial launches.
    const enemy=point(e.enemyAngle,e.enemyRing);
    for(const t of e.targets){
      const r=radius*(.57+.43*t.ring),color=colours[t.kind];ctx.globalAlpha=t.cooldown>0?.18:t.ring===e.ring?1:.55;
      arc(r,t.angle-t.width,t.angle+t.width,'#030815',14);arc(r,t.angle-t.width,t.angle+t.width,color,8);
      const mark=point(t.angle,t.ring);ctx.fillStyle='#06131f';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.kind==='precision'?'◇':t.kind==='repair'?'+':'•',mark.x,mark.y);ctx.globalAlpha=1;
    }
    if(e.threat){const t=e.threat,r=radius*(.57+.43*t.ring);arc(r,t.angle-.5,t.angle+.5,'#060910',19);arc(r,t.angle-.5,t.angle+.5,'#ff6c89',11);const p=point(t.angle,t.ring);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.fillText('!',p.x,p.y);ctx.fillStyle='#ff97ae';ctx.font='bold 10px system-ui';ctx.fillText('STRIKE '+t.time.toFixed(1)+'s',cx,cy+23);}
    ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(e.enemyAngle+Math.PI/2);ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(12,8);ctx.lineTo(0,4);ctx.lineTo(-12,8);ctx.closePath();ctx.fillStyle='#ff987e';ctx.shadowColor='#ff886d';ctx.shadowBlur=low||reduced?0:16;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffe4bd';ctx.lineWidth=2;ctx.stroke();ctx.restore();
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#b2c8dd';ctx.font='bold 10px system-ui';ctx.fillText(e.ring?'OUTER ORBIT':'INNER ORBIT',cx,cy-15);
    if(e.holding&&e.held>=.18){
      const predicted=e.enemyAngle+(e.enemyHP<=12?-.48:.38)*.28,aligned=distance(e.angle,predicted)<=.3;
      const a=point(e.angle,0),b=point(e.angle,1),perfect=e.held>=.65&&e.held<=1.05;
      ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=3;ctx.strokeStyle=e.energy<40?'#62758c':aligned?'#a8ffe7':'#ffb38a';ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=perfect?'#ffdc85':'#c7daed';ctx.font='bold 13px system-ui';ctx.fillText(e.energy<40?'BRAKING':perfect?(aligned?'RELEASE · CRITICAL':'CRITICAL · ALIGN'):aligned?'RELEASE TO HIT':'LINE UP SHOT',cx,cy+3);
      arc(radius*.33,-Math.PI/2,-Math.PI/2+Math.min(1,e.held/1.05)*TAU,perfect?'#ffdc85':'#728caa',3);
    }else {ctx.fillStyle='#e5f5ff';ctx.font=`bold ${Math.max(11,Math.min(16,radius*.095))}px system-ui`;ctx.fillText(e.energy>=40?'HOLD TO AIM':'TAP TO CHARGE',cx,cy+3);}
    let ring=e.ring;if(e.flight)ring=e.flight.from+(e.flight.to-e.flight.from)*Math.min(1,e.flight.time/e.flight.duration);
    const p=point(e.flight?e.flight.angle:e.angle,ring);ctx.fillStyle='#f3ffff';ctx.shadowColor='#9cffea';ctx.shadowBlur=low||reduced?0:15;ctx.beginPath();ctx.arc(p.x,p.y,e.flight?8:7,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#102839';ctx.lineWidth=2;ctx.stroke();
    if(e.echo){const a=point(e.echo.angle,0),b=point(e.echo.angle,1);ctx.globalAlpha=.6;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#c0a2ff';ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
    for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.life-=dt;if(b.life<=0){beams.splice(i,1);continue;}ctx.globalAlpha=b.life*3;const a=point(b.angle,0),z=point(b.angle,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.strokeStyle='#ffdb9b';ctx.lineWidth=reduced?2:6;ctx.stroke();ctx.globalAlpha=1;}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=p.life*2;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
    if(now>feedbackUntil)$('brFeedback').textContent=e.threat?'RED ARC INCOMING · BRAKE OR SWITCH ORBITS':e.slingshot?'SLINGSHOT CHARGED · NEXT LAUNCH +2 DAMAGE':'PASS TARGETS YOU DON’T NEED';
  }
  function frame(now){if(!open)return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(engine){engine.tick(dt);processEvents();}draw(dt,now);raf=requestAnimationFrame(frame);}
  canvas.tabIndex=0;
  canvas.addEventListener('pointerdown',ev=>{if(!panel.hidden||!engine||engine.paused||ev.isPrimary===false||ev.button!==0||pointer!==null||space)return;ev.preventDefault();pointer=ev.pointerId;canvas.setPointerCapture(pointer);engine.press();});
  function release(ev,cancel=false){if(ev.pointerId!==pointer)return;pointer=null;if(cancel)engine?.cancel();else engine?.release();if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);processEvents();}
  canvas.addEventListener('pointerup',ev=>release(ev));canvas.addEventListener('pointercancel',ev=>release(ev,true));canvas.addEventListener('lostpointercapture',ev=>release(ev,true));
  document.addEventListener('keydown',ev=>{if(!open)return;if(ev.code==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();if(!ev.repeat)pause();return;}if(ev.code!=='Space'||ev.repeat||ev.altKey||ev.ctrlKey||ev.metaKey||!panel.hidden||!engine||engine.paused)return;ev.preventDefault();ev.stopImmediatePropagation();if(pointer!==null||space)return;space=true;engine.press();},true);
  document.addEventListener('keyup',ev=>{if(!open||ev.code!=='Space'||!space)return;ev.preventDefault();ev.stopImmediatePropagation();space=false;engine?.release();processEvents();},true);
  window.addEventListener('blur',()=>{if(open)pause();});document.addEventListener('visibilitychange',()=>{if(open&&document.hidden)pause();});$('brPause').onclick=pause;
  OG.systems.breaker={open:enter,close,isOpen:()=>open,getEngine:()=>engine};
})(window,document);
