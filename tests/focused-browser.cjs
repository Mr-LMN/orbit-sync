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
  assert.equal(await page.locator('#mainMenu').isVisible(),false);assert.equal(await page.locator('#expeditionRoot').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.getElementById('mainMenu').inert),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('orbitSync_coins')),'123','old currency untouched');
  assert.equal(await page.getByRole('button',{name:'PLAY',exact:true}).count(),1);
  const shots=process.env.FOCUSED_SCREENSHOTS;if(shots)fs.mkdirSync(shots,{recursive:true});
  if(shots)await page.screenshot({path:path.join(shots,'home.png')});
  await page.locator('#huntSettings').click();await page.locator('#huntSound').uncheck();await page.locator('#huntBattery').check();await page.locator('#brExit').click();
  await page.locator('#huntHelp').click();assert.ok(await page.getByText('Learn the hunt.').isVisible());await page.locator('#brExit').click();
  await page.locator('#brStart').click();assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().focused),true);
  await page.evaluate(()=>{const e=OrbitGame.systems.breaker.getEngine();e.angle=e.targets.find(t=>t.ring===1&&t.kind==='safe').angle-.025;});await page.touchscreen.tap(195,350);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().energy),63);
  await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().time=45);await page.waitForTimeout(150);assert.equal(await page.locator('#brPanel').isVisible(),false);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().upgrade),'echo');
  if(shots)await page.screenshot({path:path.join(shots,'fight.png')});
  await page.locator('#brPause').click();await page.locator('#brExit').click();assert.ok(await page.locator('#brStart').isVisible());assert.equal(await page.evaluate(()=>inMenu),false,'legacy loop stays suspended on return');
  await page.locator('#brStart').click();await page.evaluate(()=>{const e=OrbitGame.systems.breaker.getEngine();e.strike(e.enemyAngle,24,true);});await page.locator('#brRetry').waitFor();await page.locator('#brExit').click();assert.equal(await page.evaluate(()=>OrbitGame.storage.getJSON('orbitSync_hunt_v1',{}).wins),1);
  await page.reload();await page.locator('#brStart').waitFor();await page.locator('#huntSettings').click();assert.equal(await page.locator('#huntSound').isChecked(),false);assert.equal(await page.locator('#huntBattery').isChecked(),true);await page.locator('#brExit').click();
  await page.setViewportSize({width:360,height:640});if(shots)await page.screenshot({path:path.join(shots,'small-home.png')});await page.locator('#brStart').click();await page.keyboard.down('Space');await page.waitForTimeout(750);await page.keyboard.up('Space');await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>OrbitGame.systems.breaker.getEngine().shots),1);await page.keyboard.press('Escape');assert.ok(await page.locator('#brResume').isVisible());
  assert.deepEqual(errors,[]);console.log('PASS focused boot, single Play, hidden/inert legacy UI, old save preservation, help/settings persistence, touch scoring, uninterrupted Echo, menu return, results/reload and keyboard');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
