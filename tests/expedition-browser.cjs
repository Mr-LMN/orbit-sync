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
  const filename=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0] === '/' ? '/legacy.html' : req.url.split('?')[0]));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
  try{res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');res.end(fs.readFileSync(filename));}
  catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  const errors=[];
  const shots=process.env.EXPEDITION_SCREENSHOTS;
  if(shots)fs.mkdirSync(shots,{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    page.setDefaultTimeout(6000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
    const screenshot=async name=>{if(shots)await page.screenshot({path:path.join(shots,name+'.png')});};
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForTimeout(700);
    const collect=page.getByRole('button',{name:'COLLECT',exact:true});if(await collect.isVisible())await collect.click();await page.waitForTimeout(400);
    await page.locator('#expeditionEntry').click();await screenshot('setup');
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.isOpen()),true);
    await page.locator('#expPractice').click();assert.equal(await page.locator('[data-practice="hold"]').isDisabled(),true);
    await page.locator('#expBack').click();await page.locator('#expLaunch').click();await screenshot('briefing');
    await page.locator('#expBegin').click();await page.waitForTimeout(800);await screenshot('arena');
    await page.evaluate(()=>{const e=OrbitGame.systems.expedition.getEngine();e.travel=e.ideal();});
    await page.touchscreen.tap(195,420);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().hits),1);
    const cdp=await page.context().newCDPSession(page);
    await page.evaluate(()=>{const e=OrbitGame.systems.expedition.getEngine();e.target=null;e.spawn('hold');e.travel=e.ideal();});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:420,id:1}]});
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().holding),true);await screenshot('hold');
    await page.evaluate(()=>{const e=OrbitGame.systems.expedition.getEngine();e.travel=e.target.end;});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().hits),2);
    // Pausing must freeze the gameplay clock and not leak into campaign settings.
    await page.locator('#expPause').click();const paused=await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().elapsed);
    await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().elapsed),paused);
    await screenshot('paused');await page.locator('#expResume').click();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().paused),true);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.locator('#expResume').click();
    // Finish each sector through the model, then use the actual upgrade/briefing controls.
    for(let sector=0;sector<3;sector++) {
      await page.evaluate(()=>{const e=OrbitGame.systems.expedition.getEngine();for(let i=0;i<30&&e.status==='playing';i++){e.target=null;e.spawn('tap');e.travel=e.ideal();e.press();}});
      await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().status),'choice');
      await screenshot('upgrades-'+sector);await page.locator('[data-route="volatile"]').click();await page.locator('[data-upgrade]').first().click();
      await page.locator('#expBegin').click();
    }
    await screenshot('boss-warning');
    await page.waitForTimeout(2200);await screenshot('boss-shield');
    // Simulate the remaining boss at fixed timesteps; this includes all three phase patterns.
    await page.evaluate(()=>{const e=OrbitGame.systems.expedition.getEngine();let guard=20000;while(e.status==='playing'&&guard-->0){if(e.target&&e.travel>=e.ideal()){if(e.holding)e.release();else e.press();}e.tick(1/120);}if(e.status!=='won')throw Error('Boss run did not win');});
    await page.waitForTimeout(100);await screenshot('results');assert.match(await page.locator('#expPanelTitle').textContent(),/Orbit secured/);
    const record=await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_expedition_v1'));
    assert.equal(record.wins,1);assert.equal(record.runs,1);assert.ok(record.best>0);
    // Retry and practice never double-award a result or alter campaign progress.
    await page.locator('#expLoadout').click();await page.locator('#expPractice').click();await page.locator('[data-practice="hold"]').click();await page.locator('#expBegin').click();
    await page.keyboard.press('Escape');await page.locator('#expEnd').click();await page.waitForTimeout(60);
    assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_expedition_v1').runs),1);
    await page.locator('#expBack').click();assert.equal(await page.evaluate(()=>inMenu),true);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.isOpen()),false);
    await page.reload();await page.waitForTimeout(700);await page.locator('#expeditionEntry').click();assert.match(await page.locator('.exp-setup-stats').innerText(),/CLEARS\s+1/);
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(100);await screenshot('landscape-setup');
    await page.locator('#expLaunch').click();await page.locator('#expBegin').click();await page.waitForTimeout(700);await screenshot('landscape-game');
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>OrbitGame.systems.expedition.getEngine().paused),true);
    assert.deepEqual(errors,[]);console.log('PASS expedition touch/hold, upgrades, complete boss run, pause, visibility, rotation, practice and persistent records');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
