(function initChallenge(root){
  'use strict';
  const DEFAULT='0000cafe';
  const code=value=>typeof value==='string'&&/^[0-9a-f]{8}$/i.test(value)?value.toLowerCase():DEFAULT;
  const name=value=>(typeof value==='string'?value:'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,16)||'Pilot';
  function score(e){
    const accuracy=e.hits/Math.max(1,e.shots);
    return Math.max(0,Math.floor(e.score+(e.won?10000+Math.max(0,90-e.time)*100+e.hp*250+accuracy*1000:0)));
  }
  function result(e,pilot,id){
    if(e.status!=='ended'||e.training)return null;
    return {id:String(id).slice(0,80),name:name(pilot),score:score(e),won:e.won===true,time:Math.round(e.time*10)/10,accuracy:Math.round(e.hits/Math.max(1,e.shots)*100)};
  }
  function read(raw){
    if(!Array.isArray(raw))return [];
    const seen=new Set();
    return raw.filter(r=>r&&typeof r.id==='string'&&!seen.has(r.id)&&(seen.add(r.id),true)&&Number.isFinite(r.score)&&r.score>=0&&r.score<=1000000&&Number.isFinite(r.time)&&r.time>=0&&r.time<=90)
      .map(r=>({...r,id:r.id.slice(0,80),name:name(r.name),won:r.won===true,score:Math.floor(r.score),accuracy:Number.isFinite(r.accuracy)?Math.max(0,Math.min(100,Math.round(r.accuracy))):0}))
      .sort((a,b)=>Number(b.won)-Number(a.won)||b.score-a.score||a.time-b.time).slice(0,10);
  }
  const add=(raw,item)=>read(item?[...read(raw).filter(r=>r.id!==item.id),item]:raw);
  const api={DEFAULT,code,name,score,result,read,add};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root.OrbitGame)root.OrbitGame.systems.challenge=api;
})(typeof window!=='undefined'?window:globalThis);
