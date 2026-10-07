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
 try{
  const errors=[],page=await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true,deviceScaleFactor:2});page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('orbitSync_coins','123'));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#brStart').waitFor();
  assert.equal(await page.locator('#mainMenu').count(),0);assert.equal(await page.locator('#expeditionRoot').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('orbitSync_coins')),'123');
  assert.equal(await page.evaluate(()=>typeof window.initAudio),'undefined','no legacy audio alias');
  assert.equal(await page.getByRole('button',{name:'LEARN TO HUNT',exact:true}).count(),1);
  const shots=process.env.FOCUSED_SCREENSHOTS;if(shots)fs.mkdirSync(shots,{recursive:true});
  if(shots)await page.screenshot({path:path.join(shots,'home.png')});
  await page.locator('#huntSettings').click();await page.locator('#huntSound').uncheck();await page.locator('#huntMusic').uncheck();await page.locator('#huntBattery').check();await page.locator('#brExit').click();
  await page.locator('#brStart').click();assert.ok(await page.getByText('Cyan arc · tap for energy',{exact:true}).isVisible());if(shots)await page.screenshot({path:path.join(shots,'colour-guide.png')});await page.locator('#colourPlay').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().training),true);
  await page.touchscreen.tap(195,350);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().lesson),'aim');
  await page.mouse.move(195,350);await page.mouse.down();await page.waitForTimeout(760);await page.mouse.up();
  await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().lesson),'dodge');await page.mouse.down();await page.waitForTimeout(1800);await page.mouse.up();
  await page.locator('#brRetry').waitFor();assert.ok(await page.getByText('Ready to hunt.').isVisible());
  assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{}).tutorial),true);
  await page.locator('#brRetry').click();await page.locator('#coachContinue').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().training),false);
  if(shots)await page.screenshot({path:path.join(shots,'fight.png')});
  await page.locator('#huntColours').click();const colourTime=await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time),colourTime);await page.locator('#colourPlay').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().paused),false);
  await page.locator('#brPause').click();const paused=await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time),paused);await page.locator('#brExit').click();
  await page.locator('#huntRoute').click();assert.equal(await page.locator('[data-hunt="1"]').isDisabled(),true);assert.equal(await page.locator('[data-skin="gold"]').isDisabled(),true);await page.locator('#brExit').click();
  await page.locator('#brStart').click();
  // Fixture to inspect result persistence/UI; the model suite wins all encounters without state edits.
  await page.evaluate(()=>{const e=OrbitGame.systems.breaker.getEngine();e.shots=4;e.hits=3;e.strike(e.enemyAngle,e.maxEnemyHP,true);});
  await page.locator('#huntNext').waitFor();if(shots)await page.screenshot({path:path.join(shots,'results.png')});
  assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{}).medals[0]),3);
  await page.locator('#huntNext').click();assert.ok(await page.getByText('Crossfire',{exact:true}).isVisible());
  await page.locator('#huntWorkshop').click();await page.locator('[data-pick="skin:rose"]').click();assert.equal(await page.locator('#huntEquip').isDisabled(),true);
  await page.locator('[data-pick="skin:mint"]').click();await page.locator('[data-pick="frame:diamond"]').click();await page.locator('#huntEquip').click();assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{}).frame),'diamond');if(shots)await page.screenshot({path:path.join(shots,'workshop.png')});await page.locator('#brExit').click();
  await page.reload();await page.locator('#huntSettings').click();assert.equal(await page.locator('#huntSound').isChecked(),false);assert.equal(await page.locator('#huntMusic').isChecked(),false);assert.equal(await page.locator('#huntBattery').isChecked(),true);await page.locator('#brExit').click();
  await page.locator('#huntRoute').click();assert.equal(await page.locator('[data-hunt="1"]').isDisabled(),false);if(shots)await page.screenshot({path:path.join(shots,'campaign.png')});await page.locator('[data-hunt="1"]').click();
  await page.setViewportSize({width:360,height:640});if(shots)await page.screenshot({path:path.join(shots,'small-home.png')});
  await page.locator('#brStart').click();await page.locator('#coachContinue').click();await page.keyboard.down('Space');await page.waitForTimeout(750);await page.keyboard.up('Space');await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().shots),1);await page.keyboard.press('Escape');assert.ok(await page.locator('#brResume').isVisible());
  await page.setViewportSize({width:740,height:360});await page.locator('#brResume').click();await page.waitForTimeout(150);if(shots)await page.screenshot({path:path.join(shots,'landscape.png')});
  await page.evaluate(()=>{const p=OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{});p.medals=[3,3,3,0,0,0,0,0,0];p.coaching=true;p.seen=[];OrbitGame.storage.setJSON('orbitSync_hunt_campaign_v2',p);});
  await page.reload();await page.locator('#brStart').click();assert.equal(await page.locator('#coachTitle').textContent(),'The shell');const frozen=await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time),frozen);if(shots)await page.screenshot({path:path.join(shots,'field-guide-landscape.png')});await page.locator('#coachContinue').click();
  await page.evaluate(()=>{OrbitGame.systems.breaker.getEngine().time=2.6;});await page.locator('#coachContinue').waitFor();assert.ok(await page.getByText('The shield is open',{exact:true}).isVisible());await page.locator('#coachContinue').click();
  await page.locator('#brPause').click();await page.locator('#huntFieldGuide').click();assert.ok(await page.locator('#coachContinue').isVisible());await page.locator('#coachContinue').click();
  await page.evaluate(()=>{const p=OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{});p.medals=[3,3,3,3,3,3,0,0,0];p.seen=[];OrbitGame.storage.setJSON('orbitSync_hunt_campaign_v2',p);});
  await page.reload();await page.setViewportSize({width:360,height:640});await page.locator('#brStart').click();if(shots)await page.screenshot({path:path.join(shots,'field-guide.png')});await page.locator('#coachContinue').click();await page.evaluate(()=>{OrbitGame.systems.breaker.getEngine().time=4.1;});await page.locator('#coachContinue').waitFor();assert.ok(await page.getByText('Watch the reversal',{exact:true}).isVisible());await page.locator('#coachDisable').click();assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{}).coaching),false);
  await page.evaluate(()=>{const p=OrbitGame.storage.getJSON('orbitSync_hunt_campaign_v2',{});p.medals=Array(9).fill(0);p.coaching=true;p.seen=[];OrbitGame.storage.setJSON('orbitSync_hunt_campaign_v2',p);});await page.reload();await page.locator('#brStart').click();await page.locator('#coachContinue').click();
  for(const [fixture,title] of [['reversal','The Hunter turns'],['repair','Purple repairs your hull'],['warning','Get out of the red arc']]){
    await page.evaluate(f=>{const e=OrbitGame.systems.breaker.getEngine();if(f==='reversal')e.enemyHP=9;if(f==='repair')e.hp=3;if(f==='warning')e.threat={ring:e.ring,angle:e.angle+2,time:1.8};},fixture);
    await page.locator('#coachContinue').waitFor();assert.equal(await page.locator('#coachTitle').textContent(),title);await page.locator('#coachContinue').click();
  }
  assert.deepEqual(errors,[]);console.log('PASS three-step real-input tutorial; all mechanic coaches; frozen timers; replay/disable guidance; cosmetic preview, locks and equip persistence; campaign, settings, keyboard and mobile layouts');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
