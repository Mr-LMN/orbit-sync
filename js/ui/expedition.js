(function initExpedition(window, document) {
  'use strict';
  const OG=window.OrbitGame;
  const {ExpeditionEngine,CORES,UPGRADES,SECTORS,PRACTICE,TAU}=OG.systems.expeditionModel;
  const KEY='orbitSync_expedition_v1';
  const root=document.createElement('section');
  root.id='expeditionRoot';root.hidden=true;root.setAttribute('aria-label','Orbital Expedition');
  root.innerHTML=`
    <canvas id="expCanvas" aria-label="Expedition arena. Tap or hold using Space when the orb reaches a target."></canvas>
    <div class="exp-hud" hidden>
      <div class="exp-top"><div><span id="expSector" class="exp-eyebrow"></span><strong id="expScore">0</strong></div><button id="expPause" class="exp-icon-button" aria-label="Pause expedition">Ⅱ</button></div>
      <div class="exp-stats"><span id="expLives"></span><span id="expStreak"></span><span id="expTime"></span></div>
      <div class="exp-meter-label"><span id="expChargeLabel">OVERDRIVE</span><span id="expChargeValue">0%</span></div>
      <div class="exp-meter" role="progressbar" aria-label="Overdrive charge" aria-valuemin="0" aria-valuemax="100"><i id="expCharge"></i></div>
      <div id="expBossBar" hidden><span>GATEKEEPER</span><div class="exp-boss-meter"><i></i></div></div>
    </div>
    <div class="exp-arena-copy" hidden><div id="expFeedback" aria-live="polite"></div><div id="expTiming"></div></div>
    <div class="exp-bottom" hidden><strong id="expInstruction"></strong><span id="expProgress"></span><div class="exp-progress-dots"></div></div>
    <div id="expPanel" class="exp-panel" role="dialog" aria-modal="true" aria-labelledby="expPanelTitle"></div>
  `;
  document.body.appendChild(root);
  const $=id=>root.querySelector('#'+id);
  const canvas=$('expCanvas'),ctx=canvas.getContext('2d',{alpha:false});
  const panel=$('expPanel'),hud=root.querySelector('.exp-hud'),copy=root.querySelector('.exp-arena-copy'),bottom=root.querySelector('.exp-bottom');
  let open=false,engine=null,selectedCore='anchor',selectedRoute='steady',raf=null,lastFrame=0,lastHUD=0;
  let width=390,height=844,dpr=1,cx=195,cy=422,radius=110;
  let particles=[],rings=[],flash=0,previousStatus='',activePointer=null,spaceHeld=false,recorded=false;
  let setupMode='run',practiceKind='tap',setupFocus=null,resizeObserver=null;
  let record=readRecord();
  const stars=Array.from({length:38},(_,i)=>({x:((i*73)%101)/101,y:((i*47)%97)/97,size:i%4===0?1.5:.7}));
  function readRecord() {
    const raw=OG.storage.getJSON(KEY,{})||{};
    const number=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;
    return {best:number(raw.best),runs:number(raw.runs),wins:number(raw.wins),bestStreak:number(raw.bestStreak),seen:Array.isArray(raw.seen)?raw.seen.filter(x=>Object.hasOwn(PRACTICE,x)):['tap','risk']};
  }
  function saveRecord(){OG.storage.setJSON(KEY,record);}
  function button(id,label,primary=false){return `<button id="${id}" class="exp-button ${primary?'exp-primary':''}">${label}</button>`;}
  function setPanel(html){
    panel.innerHTML=html;panel.hidden=false;
    const heading=$('expPanelTitle');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
  }
  function showSetup(){
    engine=null;hud.hidden=true;copy.hidden=true;bottom.hidden=true;particles=[];rings=[];
    const options=Object.entries(CORES).map(([id,c])=>`<button class="exp-core ${selectedCore===id?'selected':''}" data-core="${id}" aria-pressed="${selectedCore===id}" style="--core-color:${c.color}"><span class="exp-core-mark">${id==='anchor'?'◎':id==='prism'?'◇':'ϟ'}</span><strong>${c.name}</strong><small>${c.text}</small></button>`).join('');
    setPanel(`<div class="exp-eyebrow">ORBIT SYNC / EXPEDITION</div><h1 id="expPanelTitle">Find your<br><em>next orbit.</em></h1><p class="exp-lead">Three sectors. One Guardian. Build a different run every time.</p>
      <div class="exp-setup-stats"><span>BEST <b>${record.best.toLocaleString()}</b></span><span>CLEARS <b>${record.wins}</b></span><span>3–5 MIN</span></div>
      <div class="exp-section-label">CHOOSE YOUR CORE <span>All three are free in Expedition</span></div><div class="exp-cores">${options}</div>
      <div class="exp-how"><b>Tap. Hold. Link.</b><span>Hit the bright centre to charge Overdrive. Five precise hits can trigger seven seconds of double scoring.</span></div>
      ${button('expLaunch','LAUNCH EXPEDITION →',true)}${button('expPractice','PRACTICE LAB')}${button('expBack','BACK TO HUB')}`);
    panel.querySelectorAll('[data-core]').forEach(b=>b.onclick=()=>{selectedCore=b.dataset.core;showSetup();panel.querySelector(`[data-core="${selectedCore}"]`).focus();});
    $('expLaunch').onclick=()=>launch(null);
    $('expPractice').onclick=showPractice;
    $('expBack').onclick=close;
  }
  function showPractice(){
    const choices=Object.entries(PRACTICE).map(([id,name])=>{const unlocked=record.seen.includes(id);return `<button class="exp-practice-item" data-practice="${id}" ${unlocked?'':'disabled'}><strong>${name}</strong><span>${unlocked?'Unlimited lives · no score records':id==='hold'?'Reach sector 2':id==='link'?'Reach sector 3':'Reach the Guardian'}</span></button>`;}).join('');
    setPanel(`<div class="exp-eyebrow">PRACTICE LAB</div><h1 id="expPanelTitle">Learn the rhythm.</h1><p class="exp-lead">Isolate a mechanic. Make mistakes. Retry immediately.</p><div class="exp-practice-list">${choices}</div>${button('expBack','BACK')}`);
    panel.querySelectorAll('[data-practice]').forEach(b=>b.onclick=()=>launch(b.dataset.practice));$('expBack').onclick=showSetup;
  }
  function launch(practice){
    try{OG.audio.initAudio();}catch{}
    engine=new ExpeditionEngine({core:selectedCore,practice});practiceKind=practice;setupMode=practice?'practice':'run';
    recorded=false;previousStatus='';particles=[];rings=[];flash=0;activePointer=null;spaceHeld=false;
    hud.hidden=false;copy.hidden=false;bottom.hidden=false;renderState();
  }
  function showBriefing(){
    const s=engine.definition,practice=engine.practice;
    const key=practice||['tap','hold','link','boss'][engine.sector];
    if(!record.seen.includes(key)){record.seen.push(key);saveRecord();}
    const descriptions={tap:'Tap when the orb reaches the bright centre of a glowing target.',risk:'Gold targets have a safe outer window and a tiny perfect centre. Perfect hits earn extra Overdrive charge.',hold:'Press at the first purple cap. Keep holding through the arc. Release at the second cap.',link:'Hit the numbered targets in order: 1, 2, 3. Release your finger between taps.',boss:s.tip};
    setPanel(`<div class="exp-eyebrow">${practice?'PRACTICE / '+PRACTICE[practice]:`SECTOR ${engine.sector+1} / 4`}</div><div class="exp-sector-glyph">${engine.sector===3?'⌘':key==='hold'?'⌁':key==='link'?'1 → 2 → 3':'◎'}</div><h1 id="expPanelTitle">${practice?PRACTICE[practice]:s.name}</h1><p class="exp-lead">${practice?descriptions[practice]:s.tip}</p><div class="exp-how"><b>${engine.sector===3?'WARNING → SHIELD → OPENING':key==='hold'?'PRESS → HOLD → RELEASE':key==='link'?'TAP → TAP → TAP':'AIM FOR THE BRIGHT CENTRE'}</b><span>${practice?'No life loss or leaderboard rewards. Escape pauses.':engine.sector===3?'Break the shield pattern, then strike the gold targets. The Guardian changes patterns as its health falls.':`${s.goal} successful inputs to clear. ${engine.route==='volatile'?'Volatile route: 15% faster, 30% more score.':'Steady route: normal speed and scoring.'}`}</span></div>${button('expBegin',practice?'START PRACTICE':'ENTER SECTOR →',true)}${button('expEnd','END RUN')}`);
    $('expBegin').onclick=()=>{engine.begin();panel.hidden=true;previousStatus='playing';lastFrame=performance.now();canvas.focus({preventScroll:true});};
    $('expEnd').onclick=()=>{engine.finish(false);renderState();};
  }
  function showChoices(){
    selectedRoute='steady';
    setPanel(`<div class="exp-eyebrow">SECTOR ${engine.sector+1} CLEAR</div><h1 id="expPanelTitle">Shape your run.</h1><p class="exp-lead">Choose a route, then take one free upgrade.</p><div class="exp-routes"><button data-route="steady" class="selected" aria-pressed="true"><b>STEADY</b><span>Normal speed</span></button><button data-route="volatile" aria-pressed="false"><b>VOLATILE</b><span>+15% speed · +30% score</span></button></div><div class="exp-upgrades">${engine.offers.map(id=>`<button data-upgrade="${id}"><span class="exp-eyebrow">${id==='repair'?'RECOVERY':id==='shield'?'DEFENCE':'UPGRADE'}</span><b>${UPGRADES[id].name}</b><span>${UPGRADES[id].text}</span></button>`).join('')}</div><p class="exp-footnote">Upgrades last for this run. Your current build: ${buildText()}.</p>`);
    panel.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{selectedRoute=b.dataset.route;panel.querySelectorAll('[data-route]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
    panel.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{if(engine.choose(b.dataset.upgrade,selectedRoute))renderState();});
  }
  function buildText(){const items=Object.entries(engine.upgrades).filter(([,n])=>n>0);return items.length?items.map(([id,n])=>UPGRADES[id].name+(n>1?' ×'+n:'')).join(' · '):'Core only';}
  function showResults(){
    const s=engine.summary(),practice=!!engine.practice;
    const previousBest=record.best;
    if(!recorded&&!practice){record.runs++;record.wins+=s.won?1:0;record.best=Math.max(record.best,s.score);record.bestStreak=Math.max(record.bestStreak,s.bestStreak);saveRecord();}recorded=true;
    const timing=s.hits?Math.abs(s.bias)<20?'Your timing is centred.':`You tend to hit ${Math.abs(s.bias)} ms ${s.bias<0?'early':'late'}.`:'Try aiming for the middle of the next target.';
    setPanel(`<div class="exp-eyebrow">${practice?'PRACTICE COMPLETE':s.won?'GUARDIAN DEFEATED':'SIGNAL LOST'}</div><h1 id="expPanelTitle">${practice?'Every hit teaches.':s.won?'Orbit secured.':'One more orbit?'}</h1><div class="exp-result-score">${s.score.toLocaleString()}<span>${!practice&&s.score>previousBest?'NEW PERSONAL BEST':'RUN SCORE'}</span></div><div class="exp-result-grid"><div><b>${s.accuracy}%</b><span>Hit rate</span></div><div><b>${s.perfects}</b><span>Perfects</span></div><div><b>${s.bestStreak}</b><span>Best streak</span></div><div><b>${s.overdrives}</b><span>Overdrives</span></div></div><p class="exp-lead">${timing}</p><p class="exp-footnote">${Math.floor(s.elapsed/60)}:${String(s.elapsed%60).padStart(2,'0')} active play · ${CORES[s.core].name}<br>${buildText()}</p>${button('expRetry',practice?'RETRY PRACTICE':'RUN AGAIN →',true)}${button('expLoadout','CHANGE CORE / PRACTICE')}${button('expBack','BACK TO HUB')}`);
    $('expRetry').onclick=()=>launch(practiceKind);$('expLoadout').onclick=showSetup;$('expBack').onclick=close;
  }
  function togglePause(force){
    if(!engine||engine.status!=='playing')return;
    const value=force===undefined?!engine.paused:force;engine.pause(value);activePointer=null;spaceHeld=false;
    if(value){setPanel(`<div class="exp-eyebrow">SIGNAL HELD</div><h1 id="expPanelTitle">Take a breath.</h1><p class="exp-lead">Your run is paused. A hold interrupted by pausing restarts safely.</p>${button('expResume','RESUME →',true)}${button('expEnd',engine.practice?'FINISH PRACTICE':'END RUN')}`);$('expResume').onclick=()=>togglePause(false);$('expEnd').onclick=()=>{engine.paused=false;engine.finish(false);renderState();};}
    else{panel.hidden=true;lastFrame=performance.now();try{OG.audio.initAudio();}catch{}canvas.focus({preventScroll:true});}
  }
  function renderState(){
    if(!engine)return;
    if(engine.status===previousStatus)return;previousStatus=engine.status;
    if(engine.status==='briefing')showBriefing();else if(engine.status==='choice')showChoices();else if(engine.status==='won'||engine.status==='lost')showResults();
  }
  function resize(){
    const rect=root.getBoundingClientRect();width=rect.width;height=rect.height;
    dpr=Math.min(OG.core.preferences.lowEffects()?1:2,window.devicePixelRatio||1);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    cx=width/2;cy=height<500?height*.58:height*.51;
    radius=Math.max(45,Math.min(width*.34,height<500?height*.22:height*.21));
  }
  function openMenu(){
    if(open||!inMenu)return;
    setupFocus=document.activeElement;record=readRecord();open=true;root.hidden=false;
    OG.core.loop.stopMainLoop();inMenu=false;isPlaying=false;
    if(OG.systems.tutorial?.suspendTutorialUI)OG.systems.tutorial.suspendTutorialUI();
    if(typeof stopDynamicMusic==='function')stopDynamicMusic();
    document.body.classList.add('expedition-active');resize();showSetup();
    resizeObserver=new ResizeObserver(()=>{if(engine?.status==='playing'&&!engine.paused)togglePause(true);resize();});resizeObserver.observe(root);
    lastFrame=performance.now();raf=requestAnimationFrame(frame);
  }
  function close(){
    open=false;root.hidden=true;engine=null;activePointer=null;spaceHeld=false;
    if(raf!==null)cancelAnimationFrame(raf);raf=null;resizeObserver?.disconnect();resizeObserver=null;
    document.body.classList.remove('expedition-active');inMenu=true;isPlaying=false;
    OG.core.loop.startMainLoop();setupFocus?.focus({preventScroll:true});
  }
  function audioFeedback(type,quality){
    if(!OG.audio.audioCtx||!OG.audio.sfxEnabled)return;
    const frequency=type==='overdrive'?880:quality==='perfect'?660:quality==='miss'?120:440;
    try{OG.audio.playTone(frequency,'sine',0.08,0.008,type==='overdrive'?0.35:0.12);}catch{}
    if(type==='overdrive'&&OG.audio.hapticsEnabled&&navigator.vibrate)navigator.vibrate([15,30,25]);
  }
  function events(){
    for(const event of engine.drainEvents()){
      if(event.type==='feedback'){
        $('expFeedback').textContent=event.label;$('expFeedback').dataset.quality=event.quality;
        $('expTiming').textContent=event.quality==='hold'?'':`${Math.abs(Math.round(event.error))} ms ${event.error<0?'early':'late'}`;
        if(event.quality!=='hold')audioFeedback('hit',event.quality);
        if(event.quality==='perfect'||event.quality==='good')burst(engine.angle,event.quality==='perfect'?'#fff1b8':CORES[engine.core].color);
      }else if(event.type==='overdrive'){
        audioFeedback('overdrive');rings.push({r:radius,life:1});flash=.5;
      }else if(event.type==='finish'&&event.won){burst(0,'#68ead7',40);rings.push({r:20,life:1});}
    }
  }
  function burst(angle,color,count=14){
    if(OG.core.preferences.reducedMotion())return;
    const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius;
    for(let i=0;i<count&&particles.length<90;i++){const a=i*2.399;particles.push({x,y,vx:Math.cos(a)*(40+i*3),vy:Math.sin(a)*(40+i*3),life:.6,color});}
  }
  function updateHUD(){
    const e=engine,t=e.target;
    $('expSector').textContent=e.practice?'PRACTICE / '+PRACTICE[e.practice]:`${e.sector+1} / 4 · ${e.definition.name}`;
    $('expScore').textContent=e.score.toLocaleString();$('expLives').textContent=e.practice?'∞ LIVES':`${'♥ '.repeat(Math.max(0,e.lives))}`;
    $('expStreak').textContent=`${e.streak} STREAK`;$('expTime').textContent=`${Math.floor(e.elapsed/60)}:${String(Math.floor(e.elapsed%60)).padStart(2,'0')}`;
    const amount=e.overdrive>0?e.overdrive/(7+3*(e.upgrades.sustain||0))*100:e.charge;
    $('expCharge').style.width=amount+'%';$('expChargeLabel').textContent=e.overdrive>0?'OVERDRIVE · DOUBLE SCORE':'OVERDRIVE';$('expChargeValue').textContent=e.overdrive>0?Math.ceil(e.overdrive)+'s':Math.floor(e.charge)+'%';
    root.querySelector('.exp-meter').setAttribute('aria-valuenow',String(Math.round(amount)));
    $('expBossBar').hidden=e.sector!==3;$('expBossBar').querySelector('i').style.width=(e.bossHP/18*100)+'%';
    let instruction=t?.type==='hold'?(e.holding?'RELEASE AT THE SECOND CAP':'PRESS AT THE FIRST CAP'):t?.type==='link'?`TAP TARGET ${t.index+1} OF 3`:t?.type==='risk'?'GOLD CENTRE = EXTRA CHARGE':'TAP INSIDE THE ZONE';
    if(e.sector===3){if(e.bossState==='warning')instruction=['INCOMING: HOLD SHIELD','INCOMING: THREE-LINK SHIELD','INCOMING: PRECISION SHIELD'][e.bossPhase];else if(e.bossState==='opening')instruction='CORE EXPOSED · STRIKE NOW';}
    $('expInstruction').textContent=instruction;
    $('expProgress').textContent=e.practice?'Tap / hold the arena or Space · Escape pauses':e.sector===3?`PHASE ${e.bossPhase+1} · ${e.bossState.toUpperCase()}`:`${e.cleared} / ${e.definition.goal} INPUTS · ${e.route.toUpperCase()} ROUTE`;
    if(e.lastFeedback&&e.elapsed-e.lastFeedback.at>1.2){$('expFeedback').textContent='';$('expTiming').textContent='';}
  }
  function arc(start,end,color,line=12,alpha=1){ctx.beginPath();ctx.arc(cx,cy,radius,start,end);ctx.strokeStyle=color;ctx.lineWidth=line;ctx.globalAlpha=alpha;ctx.lineCap='round';ctx.stroke();ctx.globalAlpha=1;}
  function point(a,r=radius){return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};}
  function draw(dt,now){
    const e=engine,color=e?e.definition.color:'#68ead7',reduced=OG.core.preferences.reducedMotion(),low=OG.core.preferences.lowEffects();
    ctx.fillStyle='#070e1b';ctx.fillRect(0,0,width,height);
    if(!low){const g=ctx.createRadialGradient(cx,cy,10,cx,cy,width*.75);g.addColorStop(0,e?.overdrive>0?'#253352':'#15233a');g.addColorStop(1,'#070e1b');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);}
    for(const star of stars){ctx.fillStyle='#b6c9e4';ctx.globalAlpha=.15+star.size*.08;ctx.beginPath();ctx.arc(star.x*width,star.y*height,star.size,0,TAU);ctx.fill();}ctx.globalAlpha=1;
    if(!e)return;
    arc(0,TAU,'#1d3048',2);
    arc(0,TAU,color,1,.35);
    if(e.overdrive>0){ctx.save();ctx.translate(cx,cy);ctx.rotate(reduced?0:now*.0002);ctx.setLineDash([5,14]);ctx.strokeStyle='#ffe5a1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,radius+12,0,TAU);ctx.stroke();ctx.restore();}
    // Centre status is close to the orb, readable without hunting around the screen.
    ctx.textAlign='center';ctx.fillStyle='#8da7c4';ctx.font='11px system-ui';
    if(e.sector===3){
      const pulse=reduced?1:1+Math.sin(now*.004)*.045;
      ctx.save();ctx.translate(cx,cy);ctx.scale(pulse,pulse);ctx.rotate(Math.PI/4);ctx.fillStyle=e.bossState==='opening'?'#e9bb70':'#d76281';ctx.globalAlpha=.2;ctx.fillRect(-28,-28,56,56);ctx.globalAlpha=1;ctx.strokeStyle=e.bossState==='opening'?'#ffe3ac':'#ff7995';ctx.lineWidth=2;ctx.strokeRect(-24,-24,48,48);ctx.restore();
      ctx.fillStyle='#eff5ff';ctx.font='bold 20px system-ui';ctx.fillText(e.bossState==='warning'?Math.ceil(e.bossClock):e.bossHP,cx,cy+7);ctx.font='10px system-ui';ctx.fillStyle='#c3d2e5';ctx.fillText(e.bossState.toUpperCase(),cx,cy+55);
    }else{ctx.fillText(e.practice?'PRACTICE':`SECTOR ${e.sector+1}`,cx,cy-8);ctx.font='600 28px system-ui';ctx.fillStyle='#eaf5ff';ctx.fillText(e.practice?e.hits:`${e.cleared} / ${e.definition.goal}`,cx,cy+24);}
    const t=e.target;
    if(t){
      const col=t.type==='hold'?'#ba9cff':t.type==='risk'?'#ffcf82':'#68ead7';
      if(t.type==='hold'){
        arc(t.centre,t.end,col,15,.25);arc(t.centre-t.width,t.centre+t.width,col,17);arc(t.end-.035,t.end+.035,'#fff',22);
        if(e.holding)arc(t.centre,Math.min(e.travel,t.end),col,8);
      }else for(let i=0;i<t.centres.length;i++){
        const a=t.centres[i],active=i===t.index;
        arc(a-t.width,a+t.width,i<t.index?'#40536a':col,active?17:10,active?1:.4);
        if(active)arc(a-.045,a+.045,'#fff3d9',20);
        if(t.type==='link'){const p=point(a,radius+26);ctx.font='bold 13px system-ui';ctx.fillStyle=active?'#fff':'#8da7c4';ctx.fillText(String(i+1),p.x,p.y+4);}
      }
    }
    const p=point(e.angle);ctx.shadowColor=CORES[e.core].color;ctx.shadowBlur=low||reduced?0:18;ctx.fillStyle='#f3ffff';ctx.beginPath();ctx.arc(p.x,p.y,e.holding?9:7,0,TAU);ctx.fill();ctx.shadowBlur=0;
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.life<=0){particles.splice(i,1);continue;}ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,2,2);}ctx.globalAlpha=1;
    for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.life-=dt*1.8;r.r+=dt*120;if(r.life<=0){rings.splice(i,1);continue;}ctx.globalAlpha=r.life*.5;ctx.strokeStyle='#ffe3a1';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r.r,0,TAU);ctx.stroke();}ctx.globalAlpha=1;
    flash=Math.max(0,flash-dt); // No full-screen flashing; the halo and meter carry Overdrive feedback.
  }
  function frame(now){
    if(!open)return;
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
    if(!document.hidden){if(engine){engine.tick(dt);events();renderState();if(now-lastHUD>80){updateHUD();lastHUD=now;}}draw(dt,now);}
    raf=requestAnimationFrame(frame);
  }
  canvas.tabIndex=0;canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||event.isPrimary===false||activePointer!==null||spaceHeld||!engine||!panel.hidden||engine.paused)return;
    event.preventDefault();activePointer=event.pointerId;canvas.setPointerCapture(event.pointerId);engine.press();events();renderState();
  });
  function release(event,cancelled){if(event.pointerId!==activePointer)return;activePointer=null;engine?.release(cancelled);if(engine){events();renderState();}}
  canvas.addEventListener('pointerup',e=>release(e,false));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>release(e,true));
  document.addEventListener('keydown',event=>{
    if(!open)return;
    if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)togglePause();return;}
    if(event.code!=='Space'||event.repeat||event.altKey||event.ctrlKey||event.metaKey||!panel.hidden||!engine||engine.paused)return;
    event.preventDefault();event.stopImmediatePropagation();if(activePointer!==null||spaceHeld)return;spaceHeld=true;engine.press();events();renderState();
  },true);
  document.addEventListener('keyup',event=>{if(!open||event.code!=='Space'||!spaceHeld)return;event.preventDefault();event.stopImmediatePropagation();spaceHeld=false;engine?.release();if(engine){events();renderState();}},true);
  document.addEventListener('visibilitychange',()=>{if(open&&document.hidden)togglePause(true);});
  window.addEventListener('blur',()=>{if(open)togglePause(true);});
  $('expPause').onclick=()=>togglePause(true);
  OG.systems.expedition={open:openMenu,close,isOpen:()=>open,getEngine:()=>engine};
})(window,document);
