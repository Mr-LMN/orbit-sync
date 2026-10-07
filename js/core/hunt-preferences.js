(function(window){
  'use strict';
  const OG=window.OrbitGame,media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let quality=OG.storage.getItem('orbitSync_graphics','auto'),motion=OG.storage.getItem('orbitSync_reducedMotion',null);
  const reducedMotion=()=>motion===null?media.matches:motion==='1',lowEffects=()=>quality==='low';
  const sync=()=>document.documentElement.classList.toggle('reduced-motion',reducedMotion());
  OG.core.preferences={reducedMotion,lowEffects,setQuality(v){quality=v==='low'?'low':'auto';OG.storage.setItem('orbitSync_graphics',quality);},setReducedMotion(v){motion=v?'1':'0';OG.storage.setItem('orbitSync_reducedMotion',motion);sync();}};
  media.addEventListener('change',sync);sync();
})(window);
