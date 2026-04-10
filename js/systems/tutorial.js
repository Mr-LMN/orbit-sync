(function initTutorial(window) {
  const OG = window.OrbitGame || {};
  OG.systems = OG.systems || {};

  let currentPhase = parseInt(OG.storage.getItem('orbitSync_masterTutorial')) || 0;
  // 0 = intro needed
  // 1 = W1 done, W2 needed
  // 2 = W2 done, W3 needed
  // 3 = W3 done, ready for Hard mode intro
  // 4 = Hard mode W1 done, shop purchase needed
  // 5 = Shop purchase done, workshop perk needed
  // 6 = Tutorial entirely complete

  let onCompleteCallback = null;

  function showFreezeFrame(title, description, buttonText, onComplete) {
    const overlay = document.getElementById('tutorialOverlay');
    const titleEl = document.getElementById('tutorialTitle');
    const descEl = document.getElementById('tutorialDesc');
    const btnEl = document.getElementById('tutorialBtn');
    if (!overlay) return;

    if (typeof isPlaying !== 'undefined' && isPlaying) {
       if (typeof targetTimeScale !== 'undefined') targetTimeScale = 0;
       if (typeof timeScale !== 'undefined') timeScale = 0;
    }

    titleEl.innerHTML = title;
    descEl.innerHTML = description;
    btnEl.innerText = buttonText || 'CONFIRM';
    overlay.style.display = 'flex';
    onCompleteCallback = onComplete;

    btnEl.onclick = function() {
       if (typeof audioCtx !== 'undefined') soundUIClick();
       overlay.style.display = 'none';
       
       if (typeof isPlaying !== 'undefined' && isPlaying) {
          if (typeof targetTimeScale !== 'undefined') targetTimeScale = 1;
          if (typeof timeScale !== 'undefined') timeScale = 1;
       }

       if (onCompleteCallback) onCompleteCallback();
       onCompleteCallback = null;
    };
  }

  function completePhase(phaseNum) {
    if (currentPhase < phaseNum) {
      currentPhase = phaseNum;
      OG.storage.setItem('orbitSync_masterTutorial', currentPhase);
    }
  }

  function handleLevelStart(levelId) {
    if (currentPhase >= 6) return;

    if (levelId === '1-1' && currentPhase === 0) {
       showFreezeFrame(
         'WELCOME PROTOCOL', 
         'Your objective is simple: Tap when the Core aligns with the highlighted target zones.<br><br>Miss a zone, and you lose a life. Clear all zones to advance.', 
         'START CALIBRATION',
         () => completePhase(1)
       );
    } 
    else if (levelId === '2-1' && currentPhase === 1) {
       showFreezeFrame(
         'CORNER GEOMETRY',
         'The core now travels along angled paths.<br><br><span style="color:#00e5ff;">PRO TIP:</span> Striking exactly on the sharp corners triggers a PERFECT hit, scoring double points.',
         'INITIATE',
         () => completePhase(2)
       );
    }
    else if (levelId === '3-1' && currentPhase === 2) {
       showFreezeFrame(
         'ECHO GHOSTS',
         'Cyan zones are <span style="color:#00eaff;">ECHO ZONES</span>.<br><br>Your physical core will pass right through them. You must wait for your cyan <span style="font-style:italic;">ghost trail</span> to enter the zone before you tap!',
         'UNDERSTOOD',
         () => completePhase(3)
       );
    }
    else if (levelId === '1-1' && typeof hardModeActive !== 'undefined' && hardModeActive && currentPhase === 3) {
       showFreezeFrame(
         'HARD MODE UNLOCKED',
         'Welcome to Hard Mode. Speeds are increased, patterns are tighter, and mistakes cost you dearly.<br><br>Survive to earn maximum Coins.',
         'BRING IT ON',
         () => {} 
       );
    }
  }

  function handleHardModeClear() {
     if (currentPhase === 3) {
        completePhase(4);
     }
  }

  function checkMenuRouting() {
     if (currentPhase === 4) {
        showFreezeFrame(
          'SPHERE REQUISITION',
          'Excellent work! You have earned enough coins to unlock a new Core.<br><br>Visit the Shop now to requisition a new Sphere.',
          'TO THE SHOP',
          () => {
             if (typeof switchMenuTab === 'function') switchMenuTab('shop');
          }
        );
     }
     else if (currentPhase === 5) {
        showFreezeFrame(
          'WORKSHOP CALIBRATION',
          'Your new Core is ready. Now, visit the Workshop to inspect its loadout and equip powerful Perks.',
          'TO THE WORKSHOP',
          () => {
             if (typeof switchMenuTab === 'function') switchMenuTab('workshop');
             completePhase(6); 
          }
        );
     }
  }

  OG.systems.tutorial = {
    showFreezeFrame,
    completePhase,
    handleLevelStart,
    handleHardModeClear,
    checkMenuRouting,
    getPhase: () => currentPhase
  };
})(window);
