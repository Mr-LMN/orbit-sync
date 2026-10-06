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
  const shots=process.env.BREAKER_SCREENSHOTS;if(shots)fs.mkdirSync(shots,{recursive:true});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true,deviceScaleFactor:2});page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForTimeout(700);
    const collect=page.getByRole('button',{name:'COLLECT',exact:true});if(await collect.isVisible())await collect.click();
    await page.locator('#breakerEntry').click();await page.waitForTimeout(200);
    async function shot(name){if(shots)await page.screenshot({path:path.join(shots,name+'.png')});}
    await shot('briefing');await page.locator('#brStart').click();
    await page.evaluate(()=>{window.campaignTaps=0;window.oldTap=tap;tap=()=>window.campaignTaps++;const e=OrbitGame.systems.breaker.getEngine();e.angle=e.targets.find(t=>t.ring===1&&t.kind==='safe').angle-.03;});
    await page.touchscreen.tap(195,350);await page.waitForTimeout(60);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().energy),63,'touch collects energy');
    assert.equal(await page.evaluate(()=>window.campaignTaps),0,'prototype does not trigger campaign taps');
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:350,id:1}]});await page.waitForTimeout(750);
    await shot('aiming');
    await page.evaluate(()=>{const e=OrbitGame.systems.breaker.getEngine();e.angle=e.enemyAngle+.1;});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().shots),1,'hold release launches exactly once');
    assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().ring),0,'launch crosses orbits');
    assert.ok(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().hits)>0);
    await shot('arena');
    await page.locator('#brPause').click();const paused=await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time),paused);await page.locator('#brResume').click();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:350,id:2}]});await page.waitForTimeout(250);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().holding),false);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().shots),1);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(await page.locator('#brResume').isVisible());await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});});await page.locator('#brResume').click();
    await page.evaluate(()=>{OrbitGame.systems.breaker.getEngine().time=45;});await page.locator('#brEcho').waitFor();await shot('upgrade');await page.locator('#brEcho').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().upgrade),'echo');
    await page.setViewportSize({width:844,height:390});await page.locator('#brResume').waitFor();await page.locator('#brResume').click();assert.ok((await page.locator('#brPause').boundingBox()).width>=44,'landscape pause target stays usable');await shot('landscape');
    await page.evaluate(()=>{const e=OrbitGame.systems.breaker.getEngine();e.strike(e.enemyAngle,24,true);});await page.locator('#brRetry').waitFor();await shot('results');
    const record=await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_breaker_v1',{}));assert.equal(record.runs,1);assert.equal(record.wins,1);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_breaker_v1',{}).runs),1);
    await page.locator('#brRetry').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time<1),true);await page.locator('#brPause').click();await page.locator('#brExit').click();assert.equal(await page.evaluate(()=>inMenu),true);assert.equal(await page.locator('#breakerRoot').isVisible(),false);
    await page.reload();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_breaker_v1',{}).wins),1);
    // Desktop Space uses the same press/release stream and cannot double-fire.
    await page.locator('#breakerEntry').click();await page.locator('#brStart').click();await page.keyboard.down('Space');await page.waitForTimeout(750);await page.keyboard.up('Space');await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().shots),1);await page.keyboard.press('Escape');assert.ok(await page.locator('#brResume').isVisible());
    assert.deepEqual(errors,[]);console.log('PASS Breaker touch/hold, launch damage, input isolation, cancel, pause, visibility, rotation, upgrade, results, retry, records and Space controls');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
