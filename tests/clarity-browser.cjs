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
  const shots=process.env.CLARITY_SCREENSHOTS;
  if(shots) fs.mkdirSync(shots,{recursive:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:700},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForTimeout(800);
    const collect=page.getByRole('button',{name:'COLLECT',exact:true});
    if(await collect.isVisible()) await collect.click();
    await page.waitForTimeout(400);
    async function shot(name){if(shots)await page.screenshot({path:path.join(shots,name+'.png')});}
    for(const size of [{width:360,height:640},{width:390,height:700},{width:430,height:820},{width:844,height:390}]){
      await page.setViewportSize(size);await page.waitForTimeout(200);
      const rects=await page.evaluate(()=>['hubContinueBtn','expeditionEntry','orbitRankStrip','nextGoalPanel'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,top:r.top,bottom:r.bottom,left:r.left,right:r.right};}));
      for(let i=1;i<rects.length;i++)assert.ok(rects[i].top>=rects[i-1].bottom,`no overlapping home cards at ${size.width}: ${JSON.stringify(rects)}`);
      assert.ok(rects.every(r=>r.left>=0 && r.right<=size.width),'home cards inside viewport');
      await page.locator('#expeditionEntry').scrollIntoViewIfNeeded();
      await shot('home-'+size.width);
    }
    await page.setViewportSize({width:390,height:700});await page.waitForTimeout(600);
    await page.evaluate(()=>{startCampaign();});await page.waitForTimeout(900);
    await page.evaluate(()=>toggleSettings(false));await page.waitForTimeout(400);
    // Inspect each world at one life in normal and low-effects rendering.
    for(const id of ['1-2','2-3','3-2','4-2','5-2','1-6']){
      await page.evaluate(id=>{
        stopMainLoop();inMenu=false;isPlaying=true;
        currentLevelIdx=campaign.findIndex(s=>s.id===id);loadLevel(currentLevelIdx);
        document.body.classList.add('state-gameplay','arena-charge-3','intensity-3');
        ui.lives.innerText='1';draw();
      },id);
      await page.waitForFunction(()=>!isCinematicIntro,{},{timeout:10000});
      await page.evaluate(()=>{stopMainLoop();lives=1;updateLastLifeState();ui.lives.innerText='1';ui.overlay.style.display='none';ui.gameUI.style.display='block';ui.arenaInfo.style.display='block';popups=[];draw();});
      assert.equal(await page.locator('#gameCanvas').evaluate(e=>getComputedStyle(e).filter),'none','health never dims targets');
      assert.equal(await page.locator('#gameCanvas').evaluate(e=>getComputedStyle(e).animationName),'none','health never flashes arena');
      await shot('last-life-'+id);
      await page.evaluate(()=>{document.body.classList.add('low-effects');draw();});
      await shot('low-effects-'+id);
    }
    await page.evaluate(()=>{globalCoins=100;showAugmentPicker();});
    assert.equal(await page.locator('#arenaInfo').isVisible(),false,'stage HUD hidden behind boost picker');
    const hit=await page.locator('#aug-wide_sync').evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
    assert.ok(hit,'boost cards own hit testing');
    await shot('boost');
    await page.locator('#augSkipBtn').click();
    assert.equal(await page.locator('#augmentSelect').isVisible(),false);
    await page.setViewportSize({width:844,height:390});
    await page.evaluate(()=>{showAugmentPicker();});
    await page.locator('#augSkipBtn').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#augSkipBtn').isVisible());
    await shot('boost-landscape');
    assert.deepEqual(errors,[],'no browser errors');
    console.log('PASS home card separation at four sizes, six low-life stage renders, mobile target contrast and boost stacking/scrolling');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
