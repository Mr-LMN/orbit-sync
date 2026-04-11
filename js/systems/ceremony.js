(function initCeremonySystem(window) {
  'use strict';
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};

  let _showing = false;

  // ── RANK-UP SOUND ────────────────────────────────────────────────────────
  function _soundRankUp(rank) {
    const audio = OG.audio;
    if (!audio || !audio.audioCtx) return;
    const t = audio.audioCtx.currentTime;
    const playSynth = audio.playSynth || window.playSynth;
    const playNoise = audio.playNoiseBurst || window.playNoiseBurst;
    if (!playSynth) return;

    // Ascending chord sweep — triumphant C major with added 7th
    const freqs = [261.63, 329.63, 392.00, 493.88, 523.25];
    freqs.forEach(function(f, i) {
      playSynth(f,     'sine',     0.18, 0.01, 0.5,  t + i * 0.08, 0, true);
      playSynth(f * 2, 'triangle', 0.08, 0.01, 0.4,  t + i * 0.08, 0, false);
    });

    // Sub bass punch on beat 0
    playSynth(65.41, 'sawtooth', 0.22, 0.02, 0.55, t, 600, false);

    // Sparkle high-frequency hit
    if (playNoise) playNoise(0.06, 0.08, t + 0.35, 'highpass', 5000, 2.0);

    // Milestone rank gets extra drama
    if (rank % 5 === 0) {
      setTimeout(function() {
        if (!audio.audioCtx) return;
        const t2 = audio.audioCtx.currentTime;
        playSynth(523.25, 'sine',     0.22, 0.02, 0.9, t2, 0, true);
        playSynth(659.25, 'triangle', 0.15, 0.02, 0.8, t2 + 0.12, 0, true);
        playSynth(783.99, 'sine',     0.18, 0.02, 0.7, t2 + 0.24, 0, true);
        if (playNoise) playNoise(0.08, 0.12, t2 + 0.4, 'highpass', 4000, 1.5);
      }, 420);
    }
  }

  // ── BUILD OVERLAY DOM ────────────────────────────────────────────────────
  function _ensureOverlay() {
    let el = document.getElementById('rankUpCeremony');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'rankUpCeremony';
    el.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:9500',
      'align-items:center',
      'justify-content:center',
      'flex-direction:column',
      'background:rgba(4,5,16,0.92)',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)',
      'cursor:pointer',
    ].join(';');

    el.innerHTML = [
      '<div class="ceremony-burst" id="ceremonyBurst"></div>',
      '<div class="ceremony-label" id="ceremonyLabel">ORBIT RANK UP</div>',
      '<div class="ceremony-rank" id="ceremonyRank">★ 1</div>',
      '<div class="ceremony-rank-name" id="ceremonyRankName">ORBIT RUNNER</div>',
      '<div class="ceremony-perk-card" id="ceremonyPerkCard" style="display:none;">',
      '  <div class="ceremony-perk-header">PERK UNLOCKED</div>',
      '  <div class="ceremony-perk-name" id="ceremonyPerkName"></div>',
      '  <div class="ceremony-perk-desc" id="ceremonyPerkDesc"></div>',
      '</div>',
      '<div class="ceremony-dismiss">TAP TO CONTINUE</div>',
    ].join('');

    document.body.appendChild(el);
    return el;
  }

  // ── SHOW CEREMONY ────────────────────────────────────────────────────────
  function showCeremony(data) {
    if (!data || _showing) return;
    _showing = true;

    const el  = _ensureOverlay();
    const rank = data.rank || 1;
    const perk = data.perk || null;
    const prestige = OG.systems.prestige;

    // Populate
    document.getElementById('ceremonyRank').textContent = '★ ' + rank;
    document.getElementById('ceremonyRankName').textContent =
      prestige ? prestige.getRankLabel(rank) : 'ORBIT RUNNER';

    const perkCard = document.getElementById('ceremonyPerkCard');
    if (perk) {
      document.getElementById('ceremonyPerkName').textContent = perk.label;
      document.getElementById('ceremonyPerkDesc').textContent = perk.description;
      perkCard.style.display = 'flex';
    } else {
      perkCard.style.display = 'none';
    }

    // Show
    el.style.display = 'flex';
    // Trigger entrance animation class
    el.classList.remove('ceremony-exit');
    void el.offsetWidth; // force reflow
    el.classList.add('ceremony-enter');

    // Play sound
    _soundRankUp(rank);

    // Dismiss on tap
    function dismiss() {
      el.removeEventListener('click', dismiss);
      el.classList.remove('ceremony-enter');
      el.classList.add('ceremony-exit');
      setTimeout(function() {
        el.style.display = 'none';
        el.classList.remove('ceremony-exit');
        _showing = false;
        // Refresh hub rank strip
        if (OG.ui && OG.ui.menus && typeof OG.ui.menus.refreshOrbitRankStrip === 'function') {
          OG.ui.menus.refreshOrbitRankStrip();
        }
        // Check for cascaded ceremonies (multiple rank-ups in one session)
        setTimeout(showPendingCeremony, 200);
      }, 380);
    }
    el.addEventListener('click', dismiss);

    // Auto-dismiss after 6 seconds
    setTimeout(function() {
      if (_showing) el.click();
    }, 6000);
  }

  // ── SHOW PENDING (called on hub open / returnToMenu) ─────────────────────
  function showPendingCeremony() {
    // Only show if player is on the hub, not mid-gameplay
    if (typeof inMenu !== 'undefined' && !inMenu) return;
    if (_showing) return;

    const prestige = OG.systems.prestige;
    if (!prestige || typeof prestige.consumePendingCeremony !== 'function') return;
    const pending = prestige.consumePendingCeremony();
    if (pending) showCeremony(pending);
  }

  OG.systems.ceremony = {
    showCeremony,
    showPendingCeremony,
  };

})(window);
