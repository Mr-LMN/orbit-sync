// npm install --no-save playwright; npx playwright install chromium
// Optional: PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
let chromium;
try { ({chromium}=require('playwright')); }
catch { ({chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'))); }
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const filename=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
  try{res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');res.end(fs.readFileSync(filename));}
  catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
    page.setDefaultTimeout(5000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.tutorial.isNewPlayerProfile()),true,'daily gift must not bypass onboarding');
    assert.equal(await page.evaluate(()=>inMenu),true,'no automatic run behind daily rewards');
    await page.getByRole('button',{name:'COLLECT',exact:true}).click();
    await page.waitForTimeout(400);
    await page.evaluate(()=>{window.inputCalls=0;window.originalTap=tap;tap=()=>{window.inputCalls++;};});
    await page.locator('#menuSettingsBtn img').tap();
    assert.equal(await page.evaluate(()=>window.inputCalls),0,'nested icon must not hit arena');
    await page.waitForTimeout(400);
    await page.getByLabel(/^Graphics/).selectOption('low');
    assert.equal(await page.evaluate(()=>canvas.width),390,'battery saver uses 1x backing canvas');
    await page.getByLabel(/^Reduced motion/).check();
    await page.getByLabel('Close settings').tap();
    await page.waitForTimeout(400);
    await page.evaluate(()=>startCampaign());await page.waitForTimeout(800);
    await page.locator('#gameCanvas').dispatchEvent('pointerdown',{button:0,isPrimary:false,pointerType:'touch'});
    assert.equal(await page.evaluate(()=>window.inputCalls),0,'ignore secondary touch');
    await page.touchscreen.tap(195,720);
    assert.equal(await page.evaluate(()=>window.inputCalls),1,'one physical touch produces one game action');
    await page.evaluate(()=>{tap=window.originalTap;});
    await page.waitForTimeout(1000);
    assert.equal(await page.evaluate(()=>inMenu),false);
    const geometry=await page.evaluate(()=>({w:viewportWidth,h:viewportHeight,x:centerObj.x,y:centerObj.y,r:orbitRadius}));
    assert.equal(geometry.w,390);assert.equal(geometry.h,844);
    assert.ok(geometry.x-geometry.r>0 && geometry.x+geometry.r<390);
    // Score a real target through touch input at its centre.
    await page.evaluate(()=>{stopMainLoop();const t=targets.find(t=>t.active);angle=normalizeAngle(t.start+t.size/2);});
    const oldScore=await page.evaluate(()=>score);
    await page.touchscreen.tap(195,700);
    assert.ok(await page.evaluate(()=>score)>oldScore,'touch scores a centred target');
    await page.evaluate(()=>{startMainLoop();toggleSettings(true);});
    const pausedAngle=await page.evaluate(()=>angle);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>angle),pausedAngle);
    await page.evaluate(()=>{toggleSettings(false);toggleSettings(true);});
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>isPlaying),false,'stale close timer must not resume reopened panel');
    await page.getByRole('button',{name:'RESUME GAME',exact:true}).tap();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>isPlaying),true);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.evaluate(()=>isPlaying),false,'app switch auto-pauses');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.evaluate(()=>isPlaying),false,'foreground requires explicit resume');
    await page.getByRole('button',{name:'RESUME GAME',exact:true}).tap();await page.waitForTimeout(400);
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(450);
    assert.equal(await page.evaluate(()=>isPlaying),false,'rotation pauses safely');
    assert.equal(await page.evaluate(()=>viewportHeight),390);
    await page.evaluate(()=>{returnToMenu();});await page.waitForTimeout(400);
    await page.reload();await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>OrbitGame.core.preferences.lowEffects()),true,'preferences persist');
    assert.equal(await page.evaluate(()=>OrbitGame.core.preferences.reducedMotion()),true);
    // Load and render every regular campaign stage, including each distinct world mechanic.
    const stages=await page.evaluate(()=>campaign.map((s,i)=>({id:s.id,boss:!!s.boss,i})).filter(s=>!s.boss));
    for(const stage of stages){
      await page.evaluate(i=>{inMenu=false;isPlaying=true;currentLevelIdx=i;loadLevel(i);draw();},stage.i);
    }
    await page.evaluate(()=>{returnToMenu();startPhoenixRunV2();});
    await page.waitForTimeout(3500);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.phoenixBossV2.isActive()),true);
    await page.evaluate(()=>toggleSettings(true));
    const phoenixTimer=await page.locator('#phoenixTimer').textContent();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('#phoenixTimer').textContent(),phoenixTimer,'Phoenix timer freezes in settings');
    await page.getByRole('button',{name:'RESUME GAME',exact:true}).tap();await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>isPlaying),true);
    await page.evaluate(()=>returnToMenu());
    assert.equal(await page.evaluate(()=>OrbitGame.systems.phoenixBossV2.isActive()),false);
    assert.equal(await page.locator('#phoenixGameUI').isVisible(),false);
    assert.deepEqual(errors,[],'no browser exceptions');
    console.log(`PASS mobile input, scoring, pause races, visibility, rotation, save reload and ${stages.length} campaign stages`);
    const desktop=await browser.newPage({viewport:{width:1440,height:900}});
    desktop.on('pageerror',e=>errors.push(e.message));
    await desktop.goto(`http://127.0.0.1:${server.address().port}`);await desktop.waitForTimeout(700);
    await desktop.evaluate(()=>{document.getElementById('loginSplashOverlay').classList.remove('active');startCampaign();});await desktop.waitForTimeout(600);
    await desktop.keyboard.press('Escape');await desktop.waitForTimeout(100);
    assert.equal(await desktop.evaluate(()=>isPlaying),false);
    await desktop.keyboard.press('Escape');await desktop.waitForTimeout(400);
    assert.equal(await desktop.evaluate(()=>isPlaying),true);
    await desktop.evaluate(()=>{stopMainLoop();const t=targets.find(t=>t.active);angle=normalizeAngle(t.start+t.size/2);});
    const desktopScore=await desktop.evaluate(()=>score);
    await desktop.keyboard.press('Space');assert.ok(await desktop.evaluate(()=>score)>desktopScore);
    assert.deepEqual(errors,[]);console.log('PASS desktop keyboard scoring and Escape pause/resume');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
