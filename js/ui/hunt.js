(function initBreaker(window,document){
  'use strict';
  const OG=window.OrbitGame,{TAU,distance}=OG.systems.breakerModel;
  const campaign=OG.systems.hunt,{HuntEngine,encounters,skins,frames,trails,guides}=campaign;
  const KEY2='orbitSync_hunt_campaign_v2';
  let progress=campaign.profile(OG.storage.getJSON(KEY2,{}),OG.storage.getJSON('orbitSync_hunt_v1',{})),selected=progress.introV3?campaign.unlocked(progress):0,report=null;
  function save(){return OG.storage.setJSON(KEY2,progress);}
  const skin=()=>skins.find(s=>s.id===progress.skin)||skins[0];
  let coaching=null,actionText='',actionUntil=0;
  const root=document.createElement('section');root.id='breakerRoot';root.hidden=true;root.setAttribute('aria-label','Orbit Sync');
  root.innerHTML=`<canvas id="breakerCanvas" aria-label="Tap to collect targets. Hold to brake and aim, release to launch."></canvas>
    <div class="br-hud" hidden><div class="br-row"><div><div class="br-label">ORBIT BREAKER</div><strong id="brTime">90s</strong></div><span id="brHealth" class="br-health"></span><button id="brPause" aria-label="Pause game">Ⅱ</button></div><div class="br-row br-label"><span>HUNTER HULL</span><span id="brEnemy"></span></div><div class="br-meter"><i id="brEnemyBar"></i></div><div class="br-row br-label"><span id="brScore"></span><span id="brMutation"></span></div></div>
    <div class="br-bottom" hidden><div id="brFeedback" aria-live="polite"></div><div id="brCharge"></div><div class="br-meter br-energy"><i id="brEnergy"></i></div><button id="huntColours">COLOUR GUIDE</button></div>
    <aside id="huntCoach" hidden role="dialog" aria-modal="true" aria-labelledby="coachTitle"></aside>
    <div id="brPanel" class="br-panel" role="dialog" aria-modal="true" aria-labelledby="brTitle"></div>`;
  document.body.appendChild(root);
  const $=id=>root.querySelector('#'+id),canvas=$('breakerCanvas'),ctx=canvas.getContext('2d',{alpha:false}),panel=$('brPanel'),hud=root.querySelector('.br-hud'),bottom=root.querySelector('.br-bottom');
  
  let open=false,engine=null,raf=null,last=0,lastHUD=0,pointer=null,space=false,observer=null;
  let width=390,height=700,cx=195,cy=350,radius=140,recorded=false,feedbackUntil=0,particles=[],beams=[];
  const colours={safe:'#7cead8',precision:'#ffdc85',repair:'#d3adff'};
  function show(html){panel.classList.remove('colour-screen');panel.inert=false;canvas.inert=true;panel.innerHTML='<div>'+html+'</div>';panel.hidden=false;const h=$('brTitle');h.tabIndex=-1;h.focus({preventScroll:true});}
  function buttons(primary,label='PLAY AGAIN'){return `<div class="br-buttons"><button class="primary" id="${primary}">${label}</button><button id="brExit">MAIN MENU</button></div>`;}
  function exitButton(){$('brExit').onclick=close;}
  function home(){
    coaching=null;$('huntCoach').hidden=true;
    OG.audio.stop();engine=null;hud.hidden=true;bottom.hidden=true;particles=[];beams=[];
    const next=encounters[selected],stars=campaign.total(progress),unlock=[...skins,...frames,...trails].filter(s=>s.stars>stars).sort((a,b)=>a.stars-b.stars)[0];
    show(`<div class="br-kicker">ORBIT SYNC / THE HUNT</div><div class="hunt-mark" aria-hidden="true"><i></i><b>↗</b></div><h1 id="brTitle">Make every<br>launch count.</h1><p class="hunt-tagline">Charge. Aim. Break.</p><div class="hunt-contract"><span>${next.region} · HUNT ${selected+1} / 9</span><h2>${next.name}</h2><p>${next.hint}</p><div class="hunt-stars">${'★'.repeat(progress.medals[selected])}${'☆'.repeat(3-progress.medals[selected])}<small> Clear · Under ${next.par}s · 70% accuracy + 3 hull</small>${progress.times[selected]?`<small>YOUR FASTEST · ${progress.times[selected].toFixed(1)}s</small>`:''}</div></div><div class="br-buttons"><button class="primary" id="brStart">${selected===0&&!progress.introV3?'START CAMPAIGN':progress.medals[selected]?'HUNT AGAIN':'HUNT '+(selected+1)}</button><button id="huntWorkshop">CUSTOMIZE YOUR ORB</button><div class="hunt-secondary"><button id="huntRoute">CAMPAIGN · ${stars}/27 ★</button><button id="huntSettings">SETTINGS</button></div></div><div class="hunt-unlock">${unlock?`${unlock.name} · ${Math.max(0,unlock.stars-stars)} more medals to unlock`:'All cosmetics earned. Master every hunt.'}</div><div class="hunt-secondary"><button class="hunt-text" id="huntHelp">How to play</button><button class="hunt-text" id="huntSoundQuick">SOUND ${OG.audio.musicEnabled||OG.audio.sfxEnabled?'ON':'OFF'}</button></div>`);
    $('brStart').onclick=()=>start(false);$('huntHelp').onclick=help;$('huntSettings').onclick=settings;$('huntRoute').onclick=route;$('huntWorkshop').onclick=()=>workshop();$('huntSoundQuick').onclick=()=>{const on=!(OG.audio.musicEnabled||OG.audio.sfxEnabled);OG.audio.musicEnabled=on;OG.audio.sfxEnabled=on;OG.storage.setItem('orbitSync_hunt_music',on?'1':'0');OG.storage.setItem('orbitSync_hunt_sound',on?'1':'0');if(on)OG.audio.test();$('huntSoundQuick').textContent='SOUND '+(on?'ON':'OFF');};
  }
  function route(){
    const available=campaign.unlocked(progress);
    show(`<div class="br-kicker">ONE MOVESET. NINE HUNTS.</div><h1 id="brTitle">The campaign.</h1><p>Clear a hunt to open the next. Replay for speed, clean aim and medals. Rewards are cosmetic.</p><div class="hunt-route">${encounters.map(e=>`<button data-hunt="${e.id}" ${e.id>available?'disabled':''}><b>${String(e.id+1).padStart(2,'0')}</b><span>${e.name}<small>${e.region} · ${e.id>available?'LOCKED':e.kind.toUpperCase()}</small></span><em>${e.id>available?'—':'★'.repeat(progress.medals[e.id])+'☆'.repeat(3-progress.medals[e.id])}</em></button>`).join('')}</div><h2>Your trail</h2><div class="hunt-skins">${skins.map(s=>`<button data-skin="${s.id}" ${s.stars>campaign.total(progress)?'disabled':''} aria-pressed="${progress.skin===s.id}"><b style="color:${s.color}">●</b> ${s.name}<small>${s.stars>campaign.total(progress)?s.stars+' medals':progress.skin===s.id?'EQUIPPED':'EQUIP'}</small></button>`).join('')}</div><div class="br-buttons"><button id="brExit">BACK</button></div>`);
    panel.querySelectorAll('[data-hunt]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.hunt);home();});
    panel.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{workshop({skin:b.dataset.skin});});exitButton();
  }
  function previewSVG(loadout){
    const color=skins.find(s=>s.id===loadout.skin).color;
    const shape=loadout.frame==='diamond'?'<path d="M0 -11L9 0L0 11L-9 0Z"/>':loadout.frame==='comet'?'<path d="M0 -12L9 9L0 5L-9 9Z"/>':'<circle r="9"/>';
    return `<svg viewBox="0 0 320 150" role="img" aria-label="${loadout.frame} frame with ${loadout.skin} colour and ${loadout.trail} trail"><ellipse cx="160" cy="78" rx="122" ry="54" fill="none" stroke="#435970"/><ellipse cx="160" cy="78" rx="80" ry="35" fill="none" stroke="#293f58"/><path d="M49 100 Q45 57 100 31" fill="none" stroke="${color}" stroke-width="${loadout.trail==='ribbon'?6:3}" stroke-dasharray="${loadout.trail==='sparks'?'2 9':loadout.trail==='stream'?'5 3':'0'}" opacity=".65"/><g transform="translate(100 31) rotate(60)" fill="#f3ffff" stroke="${color}" stroke-width="3">${shape}</g><path d="M200 73l10 18-10-4-10 4z" fill="#ff987e"/></svg>`;
  }
  function workshop(draft={skin:progress.skin,frame:progress.frame,trail:progress.trail}){
    draft={skin:progress.skin,frame:progress.frame,trail:progress.trail,...draft};
    const groups=[['skin','Colour',skins],['frame','Frame',frames],['trail','Trail',trails]],stars=campaign.total(progress);
    const required=Math.max(...groups.map(([key,,items])=>items.find(i=>i.id===draft[key]).stars));
    show(`<div class="br-kicker">FLIGHT DECK · ${stars} MEDALS</div><h1 id="brTitle">Make it yours.</h1><div class="hunt-preview">${previewSVG(draft)}<span>${required>stars?'PREVIEW · '+(required-stars)+' MORE MEDALS TO EQUIP':'READY TO FLY · COSMETIC ONLY'}</span></div>${groups.map(([key,label,items])=>`<fieldset class="hunt-picker"><legend>${label}</legend><div>${items.map(item=>`<button data-pick="${key}:${item.id}" aria-pressed="${draft[key]===item.id}">${key==='skin'?`<b style="color:${item.color}">●</b> `:''}${item.name}<small>${item.stars>stars?'LOCKED · '+item.stars+' ★':'OWNED'}</small></button>`).join('')}</div></fieldset>`).join('')}<p class="hunt-preview-note">Locked items can be previewed. Earn medals to equip them. Reduced motion and battery saver simplify moving trails.</p><div class="br-buttons"><button class="primary" id="huntEquip" ${required>stars?'disabled':''}>EQUIP LOOK</button><button id="brExit">BACK</button></div>`);
    panel.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const [key,value]=b.dataset.pick.split(':');workshop({...draft,[key]:value});panel.querySelector(`[data-pick="${key}:${value}"]`).focus({preventScroll:true});});
    $('huntEquip').onclick=()=>{Object.assign(progress,draft);const saved=save();workshop();$('huntEquip').textContent=saved?'EQUIPPED ✓':'EQUIPPED · SESSION ONLY';};exitButton();
  }
  function coach(key){
    if(!engine||engine.training||engine.status!=='playing'||coaching)return;
    const stage=key.startsWith('stage'),entry=stage?{...guides.stage,title:engine.encounter.name,text:engine.encounter.hint+' You need '+engine.maxEnemyHP+' damage to clear this hunt. '+(engine.encounter.kind==='sentinel'?'A solid white ring blocks damage; a broken ring means OPEN.':engine.encounter.kind==='wraith'?'Watch the four-second reversal countdown above the arena.':'The Hunter turns at half hull. Cyan charges energy; gold charges more.'),action:'BEGIN HUNT'}:guides[key];
    coaching={key,...entry};engine.pause();resetInput();OG.audio.stop();panel.hidden=true;panel.inert=true;canvas.inert=true;hud.inert=true;bottom.hidden=true;
    const card=$('huntCoach');card.innerHTML=`<span class="br-kicker">FIELD GUIDE · TIME FROZEN</span><h2 id="coachTitle">${entry.title}</h2><p>${entry.text}</p><div><button class="primary" id="coachContinue">${entry.action}</button><button id="coachDisable" aria-label="Turn off automatic coaching">I KNOW THE CONTROLS</button></div>`;card.hidden=false;resize();$('coachContinue').focus({preventScroll:true});
    $('coachContinue').onclick=resumeCoach;
    $('coachDisable').onclick=()=>{progress.coaching=false;resumeCoach();};
  }
  function resumeCoach(){
    if(!coaching)return;
    if(!progress.seen.includes(coaching.key))progress.seen.push(coaching.key);save();coaching=null;$('huntCoach').hidden=true;hud.inert=false;bottom.hidden=false;canvas.inert=false;engine.resume();OG.audio.play();last=performance.now();resize();canvas.focus({preventScroll:true});
  }
  function checkCoach(){
    if(!engine||engine.training||engine.paused||engine.status!=='playing'||engine.holding||engine.flight||!progress.coaching)return;
    const e=engine;
    const key=e.threat&&e.threat.time>1&&!progress.seen.includes('warning')?'warning':e.hp<=3&&!progress.seen.includes('repair')?'repair':e.encounter.kind==='hunter'&&e.enemyHP<=e.maxEnemyHP/2&&!progress.seen.includes('reversal')?'reversal':e.encounter.kind==='sentinel'&&!e.shielded&&!progress.seen.includes('shield')?'shield':e.encounter.kind==='wraith'&&e.time>=4&&!progress.seen.includes('turn')?'turn':null;
    if(key)coach(key);
  }
  function help(inFight=false){
    const resume=inFight===true&&engine&&engine.status==='playing';
    if(resume){engine.pause();resetInput();OG.audio.stop();}
    const row=(symbol,color,title,copy)=>`<div class="colour-rule"><b style="color:${color}">${symbol}</b><span><strong>${title}</strong>${copy}</span></div>`;
    show(`<div class="br-kicker">TAP ANYWHERE — TIMING MATTERS</div><h1 id="brTitle">What to do.</h1><p class="colour-intro"><b>You are the white orb.</b> Tap anywhere when it reaches a coloured arc.</p><div class="colour-rules">${row('●','#7cead8','Cyan arc · tap for energy','Tap as your orb enters it: +18 energy.')}${row('◇','#ffdc85','Gold arc · tap for more energy','Tap as your orb enters it: +32 energy. A smaller target.')}${row('+','#d3adff','Purple + arc · tap to heal','Tap to restore 1 hull (max 5). Resets your scoring chain.')}${row('!','#ff6c89','Red arc · stay out','Hold to slow down, or launch away before the countdown ends.')}${row('▲','#ff987e','Triangle · attack this enemy','Orange, gold or purple: hold to aim, release to attack. Costs 40 energy.')}${row('↗','#a8ffe7','Green aim line · release to hit','Orange: line up or wait for the shield. Grey: need 40 energy.')}</div><p class="colour-note"><b>Gold charging circle:</b> 5 damage instead of 3. Aim must still be green.<br><b>White shield around an enemy:</b> blocks hits. Wait for a broken ring and OPEN.<br><b>Faded arcs:</b> other orbit or recharging. Collect bright arcs on your orbit.</p><div class="br-buttons"><button class="primary" id="colourPlay">${resume?'BACK TO MY FIGHT':'SHOW ME · PRACTISE'}</button>${resume?'':'<button id="brExit">BACK</button>'}</div>`);
    panel.classList.add('colour-screen');
    $('colourPlay').onclick=()=>{if(resume){panel.hidden=true;panel.inert=true;canvas.inert=false;engine.resume();OG.audio.play();last=performance.now();canvas.focus({preventScroll:true});}else start(true);};if(!resume)exitButton();
  }
  function settings(){
    show(`<div class="br-kicker">MAKE IT COMFORTABLE</div><h1 id="brTitle">Settings.</h1><div class="hunt-options"><label>Guided introductions<input id="huntGuidance" type="checkbox" ${progress.coaching?'checked':''}></label><label>Sound effects<input id="huntSound" type="checkbox" ${OG.audio.sfxEnabled?'checked':''}></label><label>Music<input id="huntMusic" type="checkbox" ${OG.audio.musicEnabled?'checked':''}></label><label>Vibration<input id="huntHaptic" type="checkbox" ${OG.audio.hapticsEnabled?'checked':''}></label><label>Reduced motion<input id="huntMotion" type="checkbox" ${OG.core.preferences.reducedMotion()?'checked':''}></label><label>Battery saver<input id="huntBattery" type="checkbox" ${OG.core.preferences.lowEffects()?'checked':''}></label></div><div class="br-buttons"><button id="huntTestAudio">TEST SOUND</button><button class="primary" id="brExit">DONE</button></div>`);
    $('huntTestAudio').onclick=async()=>{$('huntTestAudio').textContent=await OG.audio.test()?'SOUND READY · CHECK DEVICE VOLUME':'AUDIO UNAVAILABLE';};
    $('huntGuidance').onchange=e=>{progress.coaching=e.target.checked;save();};
    $('huntMusic').onchange=e=>{OG.audio.musicEnabled=e.target.checked;OG.storage.setItem('orbitSync_hunt_music',e.target.checked?'1':'0');};
    $('huntSound').onchange=e=>{OG.audio.sfxEnabled=e.target.checked;OG.storage.setItem('orbitSync_hunt_sound',e.target.checked?'1':'0');};
    $('huntHaptic').onchange=e=>{OG.audio.hapticsEnabled=e.target.checked;OG.storage.setItem('orbitSync_hunt_haptic',e.target.checked?'1':'0');};
    $('huntMotion').onchange=e=>OG.core.preferences.setReducedMotion(e.target.checked);
    $('huntBattery').onchange=e=>{OG.core.preferences.setQuality(e.target.checked?'low':'auto');resize();};exitButton();
  }
  function start(training=false){
    coaching=null;actionText='';actionUntil=0;$('huntCoach').hidden=true;hud.inert=false;OG.audio.play();engine=new HuntEngine(training===true?0:selected,Date.now(),training===true,training!==true&&selected===0&&!progress.introV3);recorded=false;report=null;particles=[];beams=[];pointer=null;space=false;panel.hidden=true;panel.inert=true;canvas.inert=false;hud.hidden=false;bottom.hidden=false;last=performance.now();
    $('brFeedback').textContent=engine.training?'QUICK TAP ANYWHERE · COLLECT THE CYAN ARC':engine.encounter.hint;feedbackUntil=performance.now()+5000;updateHUD();draw(0,performance.now());canvas.focus({preventScroll:true});
    if(!engine.training&&progress.coaching&&!progress.seen.includes('stage'+selected))coach('stage'+selected);
  }
  function resetInput(){engine?.cancel();space=false;if(pointer!==null&&canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);pointer=null;}
  function pause(){if(!engine||engine.status!=='playing'||engine.paused)return;engine.pause();OG.audio.stop();resetInput();show(`<div class="br-kicker">HUNT SUSPENDED</div><h1 id="brTitle">Take a breath.</h1><p>Your timer is frozen. Resume when you’re ready.</p>${!engine.training?'<div class="br-buttons"><button id="huntFieldGuide">ENEMY FIELD GUIDE</button></div>':''}${buttons('brResume','RESUME HUNT')}`);if($('huntFieldGuide'))$('huntFieldGuide').onclick=()=>coach('stage'+selected);$('brResume').onclick=()=>{panel.hidden=true;panel.inert=true;canvas.inert=false;engine.resume();OG.audio.play();last=performance.now();canvas.focus({preventScroll:true});};exitButton();}
  function result(){
    resetInput();OG.audio.stop();const e=engine;if(e.won)OG.audio.victory();
    if(e.training){
      progress.tutorial=true;progress.introV3=true;save();show(`<div class="br-kicker">CONTROLS LEARNED</div><h1 id="brTitle">Ready to hunt.</h1><p>You collected energy, landed a launch and dodged a strike. In a real hunt the enemy moves: hold to slow down, then release when your aim line turns green.</p><p>Red arcs show where a strike will land. Brake to let it pass, or launch to the other orbit.</p>${buttons('brRetry','START HUNT '+(selected+1))}`);$('brRetry').onclick=()=>start(false);exitButton();return;
    }
    if(!recorded){recorded=true;report=campaign.award(progress,e);report.saved=save();}
    const labels=['Core destroyed',`Finished under ${e.encounter.par}s`,'70% accuracy and at least 3 hull'];
    show(`<div class="br-kicker">${e.encounter.region} · HUNT ${selected+1}</div><h1 id="brTitle">${e.won?'Target down.':e.hp<=0?'Hull lost.':'Time escaped.'}</h1><div class="hunt-medals" aria-label="${report.stars} of 3 medals">${'★'.repeat(report.stars)}${'☆'.repeat(3-report.stars)}</div><p>${e.won?(selected===8?'Campaign cleared. Chase the remaining medals to master every hunt.':'Next target unlocked. Same controls, a new test.'):(e.encounter.kind==='sentinel'?'Collect energy while SHIELDED. Save your launch for OPEN.':e.hits===0?'Hold to slow down; release when the aim line turns green.':'Collect gold for energy. Release during the gold charge for more damage.')}</p><div class="hunt-objectives">${labels.map((l,i)=>`<div>${report.objectives[i]?'★':'☆'} ${l}</div>`).join('')}</div><div class="br-summary"><div><strong>${e.score.toLocaleString()}</strong>SCORE</div><div><strong>${Math.ceil(e.time)}s</strong>HUNT TIME</div><div><strong>${Math.round(e.hits/Math.max(1,e.shots)*100)}%</strong>LAUNCH ACCURACY</div><div><strong>${e.hp} / 5</strong>HULL LEFT</div></div>${report.unlocks.map(s=>`<p class="hunt-reward">Unlocked: ${s.name}. Equip it in Customize.</p>`).join('')}${!report.saved?'<p>Storage is unavailable. Progress lasts only for this session.</p>':''}<div class="br-buttons">${e.won&&selected<8?'<button class="primary" id="huntNext">NEXT HUNT →</button>':''}<button ${!e.won||selected===8?'class="primary"':''} id="brRetry">${e.won?'CHASE 3 MEDALS':'TRY AGAIN'}</button><button id="brExit">CAMPAIGN HOME</button></div>`);
    $('brRetry').onclick=()=>start(false);if($('huntNext'))$('huntNext').onclick=()=>{selected++;home();};exitButton();
  }
  function resize(){const r=root.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(OG.core.preferences.lowEffects()?1:2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cx=width/2;cy=height<500?height*.52:height*.48;radius=Math.min(width*.39,height<500?height*.36:height*.235);if(coaching&&height>=500){cy=height*.37;radius=Math.min(width*.33,height*.17);}else if(coaching){cx=(176+width-246)/2;radius=Math.min(height*.31,Math.max(50,(width-446)/2));}if(engine)draw(0,performance.now());}
  function enter(){if(open)return;open=true;root.hidden=false;document.body.classList.add('breaker-active');resize();home();observer=new ResizeObserver(()=>{pause();resize();});observer.observe(root);last=performance.now();raf=requestAnimationFrame(frame);}
  function close(){resetInput();home();}
  function point(a,ring){const r=radius*(.57+.43*ring);return {x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r};}
  function burst(a,ring,color){if(OG.core.preferences.reducedMotion()||OG.core.preferences.lowEffects())return;const p=point(a,ring);for(let i=0;i<14;i++){const t=i*TAU/14;particles.push({x:p.x,y:p.y,vx:Math.cos(t)*65,vy:Math.sin(t)*65,life:.5,color});}if(particles.length>100)particles.splice(0,particles.length-100);}
  function processEvents(){
    if(!engine)return;const events=engine.drainEvents();for(const ev of events){

      if(['collect','repair','hit','miss','damage','blocked'].includes(ev.type)){actionText=ev.label;actionUntil=performance.now()+1000;}
      if(ev.type!=='finish')OG.audio.effect(ev.type);
      if(['hit','collect','repair','launch','damage'].includes(ev.type)){
        if(ev.type==='hit'){burst(ev.angle,engine.enemyRing,'#ffbc91');beams.push({angle:ev.angle,life:.3});if(OG.audio.hapticsEnabled&&!OG.core.preferences.reducedMotion()&&navigator.vibrate)navigator.vibrate(20);}
        if(ev.type==='collect')burst(ev.angle,ev.ring,'#7cead8');
      }
      if(ev.type==='introduced'){resetInput();progress.tutorial=true;progress.introV3=true;for(const key of ['stage0','warning','repair'])if(!progress.seen.includes(key))progress.seen.push(key);save();actionText='Now the enemy moves. Charge, aim and defeat it to clear Stage 1.';actionUntil=performance.now()+4500;}
      if(ev.type==='lesson'||ev.type==='introduced'){particles=[];beams=[];}
      if(ev.type==='finish')result();
    }if(events.length||performance.now()-lastHUD>100){updateHUD();lastHUD=performance.now();}if(events.some(e=>e.type==='lesson'||e.type==='introduced'))draw(0,performance.now());
  }
  function updateHUD(){if(!engine)return;const e=engine;
    root.querySelector('.br-hud .br-label').textContent=e.training?(e.guidedRun?'STAGE 1 · FIRST CONTACT':'REPLAY THE BASICS'):`${selected+1} / 9 · ${e.encounter.name.toUpperCase()}`;
    $('brTime').textContent=e.training?`${['collect','gold','repair','aim','dodge'].indexOf(e.lesson)+1} / 5`:`${Math.ceil(90-e.time)}s`;
    $('brHealth').textContent=`HULL ${e.hp}/5`;$('brHealth').setAttribute('aria-label',`${e.hp} of 5 hull`);
    $('brHealth').hidden=e.training&&['collect','gold'].includes(e.lesson);
    $('brEnemy').parentElement.hidden=!e.enemyVisible;$('brEnemyBar').parentElement.hidden=!e.enemyVisible;
    $('brMutation').parentElement.hidden=e.training;
    $('brCharge').hidden=e.training&&['repair','dodge'].includes(e.lesson);$('brEnergy').parentElement.hidden=$('brCharge').hidden;
    $('brEnemy').textContent=`${e.enemyHP} / ${e.maxEnemyHP}`;$('brEnemyBar').style.width=e.enemyHP/e.maxEnemyHP*100+'%';
    $('brScore').textContent=e.training?'NO TIMER · NO DAMAGE':`${e.score} POINTS`;
    $('brMutation').textContent=e.training?'LEARN BY DOING':e.encounter.kind==='sentinel'?(e.shielded?`SHIELD ${Math.ceil(2.5-e.time%5)}s`:`OPEN ${Math.ceil(5-e.time%5)}s`):e.encounter.kind==='wraith'?`REVERSAL IN ${Math.ceil(4-e.time%4)}s`:'BREAK THE HUNTER';
    $('brEnergy').style.width=e.energy+'%';$('brCharge').textContent=e.training&&['collect','gold'].includes(e.lesson)?`ENERGY ${e.energy} / 100`:`${e.energy} / 100 ENERGY · LAUNCH COSTS 40`;
  }
  function arc(r,a,b,color,line=2){ctx.beginPath();ctx.arc(cx,cy,r,a,b);ctx.strokeStyle=color;ctx.lineWidth=line;ctx.stroke();}
  function draw(dt,now){
    ctx.fillStyle='#091020';ctx.fillRect(0,0,width,height);
    const low=OG.core.preferences.lowEffects(),reduced=OG.core.preferences.reducedMotion();
    if(!low){const g=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*1.5);g.addColorStop(0,'#142f45');g.addColorStop(1,'#091020');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);}
    for(let i=0;i<32;i++){ctx.fillStyle='#45607c';ctx.fillRect((i*137%997)/997*width,(i*233%991)/991*height,1,1);}
    const e=engine;if(!e)return;
    for(const ring of (e.training&&['collect','gold','repair'].includes(e.lesson)?[1]:[0,1])){arc(radius*(.57+.43*ring),0,TAU,ring===e.ring?'#6c8eab':'#31465f',ring===e.ring?2:1);}
    // A moving enemy between the lanes is the target of radial launches.
    const enemy=point(e.enemyAngle,e.enemyRing);
    for(const t of e.targets){
      const r=radius*(.57+.43*t.ring),color=colours[t.kind];ctx.globalAlpha=t.cooldown>0?.18:t.ring===e.ring?1:.55;
      arc(r,t.angle-t.width,t.angle+t.width,'#030815',14);arc(r,t.angle-t.width,t.angle+t.width,color,8);
      const mark=point(t.angle,t.ring);ctx.fillStyle='#06131f';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.kind==='precision'?'◇':t.kind==='repair'?'+':'•',mark.x,mark.y);ctx.globalAlpha=1;
    }
    if(e.threat){const t=e.threat,r=radius*(.57+.43*t.ring);arc(r,t.angle-.5,t.angle+.5,'#060910',19);arc(r,t.angle-.5,t.angle+.5,'#ff6c89',11);const p=point(t.angle,t.ring);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.fillText('!',p.x,p.y);ctx.fillStyle='#ff97ae';ctx.font='bold 10px system-ui';if(!e.training&&!coaching)ctx.fillText('STRIKE '+t.time.toFixed(1)+'s',cx,cy+23);}
    if(e.enemyVisible){ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(e.enemyAngle+Math.PI/2);ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(12,8);ctx.lineTo(0,4);ctx.lineTo(-12,8);ctx.closePath();ctx.fillStyle=e.encounter.kind==='wraith'?'#d3adff':e.encounter.kind==='sentinel'?'#ffdc85':'#ff987e';ctx.shadowColor='#ff886d';ctx.shadowBlur=low||reduced?0:16;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#ffe4bd';ctx.lineWidth=2;ctx.stroke();ctx.restore();
    if(e.encounter.kind==='sentinel'){ctx.beginPath();ctx.arc(enemy.x,enemy.y,20,0,TAU);ctx.strokeStyle=e.shielded?'#e8f3ff':'#698283';ctx.lineWidth=e.shielded?4:1;ctx.setLineDash(e.shielded?[]:[3,4]);ctx.stroke();ctx.setLineDash([]);}
    if(e.encounter.kind==='wraith'){for(let i=1;i<=3;i++){const p=point(e.enemyAngle-e.enemyVelocity()*.13*i,e.enemyRing);ctx.globalAlpha=.35/i;ctx.fillStyle='#d3adff';ctx.beginPath();ctx.arc(p.x,p.y,9-i,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
    }
    if(coaching)ctx.globalAlpha=0;
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(e.holding&&e.held>=.18&&(!e.training||e.lesson==='aim')){
      const predicted=e.enemyAngle+e.enemyVelocity()*.28,aligned=distance(e.angle,predicted)<=.3&&!e.shielded;
      const a=point(e.angle,0),b=point(e.angle,1),perfect=e.held>=.65&&e.held<=1.05;
      ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=3;ctx.strokeStyle=e.energy<40?'#62758c':aligned?'#a8ffe7':'#ffb38a';ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle=perfect?'#ffdc85':'#c7daed';ctx.font='bold 13px system-ui';if(!e.training)ctx.fillText(perfect?'5 DAMAGE':'3 DAMAGE',cx,cy-8);
      if(!e.training)arc(radius*.33,-Math.PI/2,-Math.PI/2+Math.min(1,e.held/1.05)*TAU,perfect?'#ffdc85':'#728caa',3);
    }
    ctx.globalAlpha=1;
    let ring=e.ring;if(e.flight)ring=e.flight.from+(e.flight.to-e.flight.from)*Math.min(1,e.flight.time/e.flight.duration);
    if(!low&&!reduced){for(let i=1;i<=8;i++){const q=point(e.flight?e.flight.angle:e.angle-i*.045,e.flight?Math.max(0,Math.min(1,ring-(e.flight.to-e.flight.from)*i*.026)):ring);ctx.globalAlpha=(1-i/9)*.5;ctx.fillStyle=skin().color;ctx.beginPath();if(progress.trail==='sparks')ctx.rect(q.x-1.5,q.y-1.5,3,3);else ctx.arc(q.x,q.y,progress.trail==='ribbon'?4:Math.max(1,5-i*.45),0,TAU);ctx.fill();}ctx.globalAlpha=1;}
    const p=point(e.flight?e.flight.angle:e.angle,ring);ctx.fillStyle='#f3ffff';ctx.shadowColor=skin().color;ctx.shadowBlur=low||reduced?0:15;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(e.angle+Math.PI/2);ctx.beginPath();if(progress.frame==='diamond'){ctx.moveTo(0,-10);ctx.lineTo(8,0);ctx.lineTo(0,10);ctx.lineTo(-8,0);ctx.closePath();}else if(progress.frame==='comet'){ctx.moveTo(0,-11);ctx.lineTo(8,8);ctx.lineTo(0,4);ctx.lineTo(-8,8);ctx.closePath();}else ctx.arc(0,0,e.flight?8:7,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=skin().color;ctx.lineWidth=2;ctx.stroke();ctx.restore();ctx.shadowBlur=0;
    if(e.echo){const a=point(e.echo.angle,0),b=point(e.echo.angle,1);ctx.globalAlpha=.6;ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#c0a2ff';ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
    for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.life-=dt;if(b.life<=0){beams.splice(i,1);continue;}ctx.globalAlpha=b.life*3;const a=point(b.angle,0),z=point(b.angle,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.strokeStyle='#ffdb9b';ctx.lineWidth=reduced?2:6;ctx.stroke();ctx.globalAlpha=1;}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=p.life*2;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
    let instruction;
    if(e.training&&e.lesson==='collect')instruction='Your white orb is on cyan. Tap anywhere for energy.';
    else if(e.training&&e.lesson==='gold')instruction='Gold gives more energy. Tap anywhere to collect it.';
    else if(e.training&&e.lesson==='repair')instruction='Purple + repairs your missing hull. Tap anywhere now.';
    else if(e.training&&e.lesson==='dodge')instruction='Hold to slow your orb. Stay out of the red arc.';
    else if(e.holding&&e.held>=.18){
      const aligned=distance(e.angle,e.enemyAngle+e.enemyVelocity()*.28)<=.3;
      instruction=e.energy<40?'Keep holding to slow down. Tap cyan or gold for energy.':e.shielded?'White shield blocks damage. Wait for OPEN.':aligned?(!e.training&&e.held>=.65&&e.held<=1.05?'Release now: green aim + gold charge = strong hit.':'Green aim line: release now to hit the triangle.'):'Keep holding. Release when the aim line turns green.';
    }else if(e.training&&e.lesson==='aim')instruction='That triangle is the enemy. Hold anywhere, then release on green to attack.';
    else if(e.threat)instruction='Red arc incoming: hold to slow down, or launch away.';
    else if(e.energy<40)instruction='Tap when your white orb reaches a cyan or gold arc.';
    else instruction='Hold to aim at the triangle. Release when the line turns green.';
    if(!e.training&&!e.holding&&!e.threat&&now<actionUntil)instruction=actionText;
    if($('brFeedback').textContent!==instruction)$('brFeedback').textContent=instruction;
    if(e.training&&['collect','gold','repair'].includes(e.lesson)){ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('YOU',p.x,p.y-24);}
    const focus=coaching?.focus||(e.training?(['collect','gold','repair'].includes(e.lesson)?'pickup':e.lesson==='dodge'?'threat':'enemy'):null);
    if(focus){
      const t=focus==='pickup'?e.targets.find(t=>t.ring===e.ring):focus==='repair'?e.targets.find(t=>t.kind==='repair'&&t.ring===e.ring):focus==='threat'?e.threat:null;
      const q=t?point(t.angle,t.ring):enemy;
      ctx.beginPath();ctx.arc(q.x,q.y,25,0,TAU);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
      const label=focus==='pickup'?'':focus==='repair'?'REPAIR +':focus==='threat'?'AVOID THIS ARC':'ENEMY · ATTACK';
      const labelX=Math.max(64,Math.min(width-64,q.x)),labelY=q.y>cy?q.y-38:q.y+38;
      ctx.fillStyle='#07111f';if(label)ctx.fillRect(labelX-64,labelY-12,128,24);ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText(label,labelX,labelY);
    }

  }
  function frame(now){if(!open)return;const dt=Math.min(.1,Math.max(0,(now-last)/1000));if(OG.core.preferences.lowEffects()&&dt<1/30){raf=requestAnimationFrame(frame);return;}last=now;if(engine){engine.tick(dt);processEvents();checkCoach();if(engine.status==='playing'&&!engine.paused)OG.audio.update(engine);}if(engine&&engine.status==='playing'&&!engine.paused)draw(dt,now);raf=requestAnimationFrame(frame);}
  canvas.tabIndex=0;
  canvas.addEventListener('pointerdown',ev=>{if(!panel.hidden||!engine||engine.paused||ev.isPrimary===false||ev.button!==0||pointer!==null||space)return;ev.preventDefault();pointer=ev.pointerId;canvas.setPointerCapture(pointer);engine.press();});
  function release(ev,cancel=false){if(ev.pointerId!==pointer)return;pointer=null;if(cancel)engine?.cancel();else engine?.release();if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);processEvents();}
  canvas.addEventListener('pointerup',ev=>release(ev));canvas.addEventListener('pointercancel',ev=>release(ev,true));canvas.addEventListener('lostpointercapture',ev=>release(ev,true));
  document.addEventListener('keydown',ev=>{if(!open)return;if(ev.code==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();if(!ev.repeat){if(coaching)resumeCoach();else pause();}return;}if(ev.code!=='Space'||ev.repeat||ev.altKey||ev.ctrlKey||ev.metaKey||!panel.hidden||!engine||engine.paused)return;ev.preventDefault();ev.stopImmediatePropagation();if(pointer!==null||space)return;space=true;engine.press();},true);
  document.addEventListener('keyup',ev=>{if(!open||ev.code!=='Space'||!space)return;ev.preventDefault();ev.stopImmediatePropagation();space=false;engine?.release();processEvents();},true);
  window.addEventListener('blur',()=>{if(open)pause();});document.addEventListener('visibilitychange',()=>{if(open&&document.hidden)pause();});$('brPause').onclick=pause;$('huntColours').onclick=()=>help(true);
  // Trap dialog focus; arena controls stay inert until play resumes.
  root.addEventListener('keydown',ev=>{if(ev.key!=='Tab'||panel.hidden&&!coaching)return;const dialog=coaching?$('huntCoach'):panel;const controls=[...dialog.querySelectorAll('button:not(:disabled),input')];if(!controls.length)return;const first=controls[0],last=controls.at(-1);if(ev.shiftKey&&(document.activeElement===first||document.activeElement===$('brTitle'))){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}});
  OG.systems.breaker={open:enter,close,isOpen:()=>open,getEngine:()=>engine};
  enter();
})(window,document);
