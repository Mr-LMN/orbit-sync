(function(window){
  'use strict';
  const OG=window.OrbitGame,a=OG.audio;
  let ctx=null,bus=null,beat=0,next=0,active=false,intensity=0;
  a.sfxEnabled=OG.storage.getItem('orbitSync_hunt_sound','1')!=='0';
  a.musicEnabled=OG.storage.getItem('orbitSync_hunt_music','1')!=='0';
  a.hapticsEnabled=OG.storage.getItem('orbitSync_hunt_haptic','1')!=='0';
  a.initAudio=()=>{try{if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();bus=ctx.createGain();bus.gain.value=.5;bus.connect(ctx.destination);}return ctx.resume().catch(()=>{});}catch{}};
  function note(freq,type,duration,volume,at=ctx?.currentTime||0){
    if(!ctx||ctx.state!=='running')return;
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(bus);o.start(at);o.stop(at+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  a.effect=type=>{
    if(!a.sfxEnabled)return;
    const sounds={collect:[660,'sine',.16,.18],repair:[880,'sine',.3,.18],launch:[180,'sawtooth',.15,.1],hit:[110,'triangle',.22,.35],damage:[65,'sawtooth',.24,.18],blocked:[140,'square',.08,.08],warning:[440,'sine',.15,.15],miss:[180,'sine',.1,.1]};
    if(type==='finish'){[262,330,392,523].forEach((f,i)=>note(f,'sine',.4,.14,(ctx?.currentTime||0)+i*.09));return;}
    if(sounds[type])note(...sounds[type]);
  };
  a.victory=()=>{if(ctx&&bus){bus.gain.setValueAtTime(.5,ctx.currentTime);a.effect('finish');}};
  a.test=async()=>{await a.initAudio();if(!ctx||ctx.state!=='running')return false;bus.gain.setValueAtTime(.5,ctx.currentTime);note(523,'sine',.25,.2);note(784,'sine',.3,.15,ctx.currentTime+.15);return true;};
  a.play=()=>{a.initAudio();active=true;next=ctx?.currentTime||0;};
  a.stop=()=>{active=false;if(ctx&&bus){bus.gain.cancelScheduledValues(ctx.currentTime);bus.gain.setValueAtTime(0,ctx.currentTime);}};
  a.update=(e)=>{
    if(!ctx||!active)return;bus.gain.setTargetAtTime(.5,ctx.currentTime,.02);
    if(!a.musicEnabled)return;
    intensity=1-e.enemyHP/e.maxEnemyHP;
    if(next<ctx.currentTime)next=ctx.currentTime;
    if(next>ctx.currentTime+.06)return;
    const notes=[130.81,196,164.81,196,110,164.81,146.83,196];
    note(notes[beat%8]/2,'sine',.24,.13,next);
    if(beat%2===0||intensity>.5)note(notes[beat%8]*2,'triangle',.18,.035,next);
    if(intensity>.65)note(65,'triangle',.08,.08,next);
    beat++;next+=.3; // Original, sparse 100 BPM arpeggio. Scheduled only during active play.
  };
})(window);
