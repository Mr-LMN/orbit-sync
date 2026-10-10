(function initHuntAudio(window){
  'use strict';
  const OG=window.OrbitGame,a=OG.audio;
  let ctx=null,bus=null,noise=null,beat=0,next=0,active=false;
  const voices=new Set();
  const stored=Number(OG.storage.getItem('orbitSync_hunt_volume','65'));
  a.volume=Number.isFinite(stored)?Math.max(0,Math.min(100,stored)):65;
  a.sfxEnabled=OG.storage.getItem('orbitSync_hunt_sound','1')!=='0';
  a.musicEnabled=OG.storage.getItem('orbitSync_hunt_music','1')!=='0';
  a.hapticsEnabled=OG.storage.getItem('orbitSync_hunt_haptic','1')!=='0';
  a.initAudio=()=>{
    try{
      if(!ctx){
        const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
        ctx=new AC();bus=ctx.createGain();bus.gain.value=a.volume/100;
        const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-16;limiter.ratio.value=5;bus.connect(limiter);limiter.connect(ctx.destination);
        noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.12),ctx.sampleRate);
        const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      }
      return ctx.resume().catch(()=>{});
    }catch{}
  };
  function track(source,gain){
    voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};
  }
  function note(freq,type,duration,volume,at=ctx?.currentTime||0,end){
    if(!ctx||ctx.state!=='running'||voices.size>=32)return;
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);
    if(end)o.frequency.exponentialRampToValueAtTime(end,at+duration);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.connect(g);g.connect(bus);track(o,g);o.start(at);o.stop(at+duration+.02);
  }
  function hiss(at,volume){
    if(!ctx||ctx.state!=='running'||voices.size>=32)return;
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();source.buffer=noise;filter.type='highpass';filter.frequency.value=5000;
    g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+.1);
    source.connect(filter);filter.connect(g);g.connect(bus);track(source,g);source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();g.disconnect();};source.start(at);source.stop(at+.12);
  }
  function clear(){for(const source of voices){try{source.stop();}catch{}}voices.clear();}
  a.setVolume=value=>{a.volume=Math.max(0,Math.min(100,Number(value)||0));OG.storage.setItem('orbitSync_hunt_volume',String(a.volume));if(ctx&&bus)bus.gain.setTargetAtTime(a.volume/100,ctx.currentTime,.015);};
  a.effect=type=>{
    if(!a.sfxEnabled)return;
    if(type==='collect'){note(659,'sine',.14,.16);note(988,'sine',.15,.08,(ctx?.currentTime||0)+.04);}
    else if(type==='launch')note(400,'sawtooth',.17,.08,undefined,85);
    else if(type==='hit'){note(150,'triangle',.22,.35,undefined,48);note(740,'sine',.09,.08);}
    else if(type==='repair') [440,554,659].forEach((f,i)=>note(f,'sine',.24,.12,(ctx?.currentTime||0)+i*.055));
    else if(type==='damage')note(100,'sawtooth',.22,.11,undefined,38);
    else if(type==='blocked')note(180,'square',.08,.07);
    else if(type==='warning')note(440,'sine',.18,.14,undefined,330);
    else if(type==='miss')note(196,'sine',.11,.09,undefined,147);
    else if(type==='finish') [262,330,392,523].forEach((f,i)=>note(f,'sine',.45,.14,(ctx?.currentTime||0)+i*.095));
  };
  a.victory=()=>{if(ctx&&bus){bus.gain.setValueAtTime(a.volume/100,ctx.currentTime);a.effect('finish');}};
  a.test=async()=>{await a.initAudio();if(!ctx||ctx.state!=='running')return false;bus.gain.setValueAtTime(a.volume/100,ctx.currentTime);note(523,'sine',.25,.2);note(784,'sine',.3,.15,ctx.currentTime+.15);return true;};
  a.play=()=>{clear();a.initAudio();active=true;beat=0;next=ctx?.currentTime||0;if(ctx&&bus)bus.gain.setValueAtTime(a.volume/100,ctx.currentTime);};
  a.stop=()=>{active=false;clear();if(ctx&&bus){bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.setValueAtTime(0,ctx.currentTime);}};
  a.update=e=>{
    if(!ctx||ctx.state!=='running'||!active||!a.musicEnabled)return;
    const intensity=e.training?0:1-e.enemyHP/e.maxEnemyHP;
    if(next<ctx.currentTime)next=ctx.currentTime;if(next>ctx.currentTime+.06)return;
    // Original 100 BPM score: bass, percussion and a changing pentatonic arpeggio.
    const theme=e.encounter.kind==='sentinel'?.89:e.encounter.kind==='wraith'?1.12:1;
    const harmony=[130.81,110,146.83,98][Math.floor(beat/8)%4]*theme;
    const steps=[1,1.5,2,1.25,1.5,2,1.25,1.5];
    if(beat%2===0)note(harmony/2,'sine',.28,.14,next);
    note(harmony*steps[beat%8]*2,'triangle',.16,intensity>.5?.035:.022,next);
    if(!e.training){if(beat%4===0)note(120,'sine',.12,.16,next,35);if(beat%4===2)hiss(next,.032);if(intensity>.5)hiss(next+.15,.012);}
    beat++;next+=.3;
  };
  a.status=()=>({state:ctx?.state||'uninitialized',active,voices:voices.size,volume:a.volume});
})(window);
