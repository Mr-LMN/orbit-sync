(function initSettings(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;
  OG.ui = OG.ui || {};
  OG.ui.settings = OG.ui.settings || {};
  OG.debug = OG.debug || {};

  function toggleSettings(show) {
    ui.settingsModal.style.bottom = show ? '0' : '-100%';
    if (!inMenu) {
      if (show) {
        isPlaying = false;
      } else {
        // Delay resume so modal animation completes before tap() can fire
        setTimeout(() => { if (!inMenu) isPlaying = true; }, 340);
      }
    }
    if (!show) {
      const hardModeRow = document.getElementById('hardModeRow');
      if (hardModeRow) hardModeRow.style.display = '';
    }
    if (show) {
      applySettingsUI();
      // Force mobile slider touch support
      ['musicVolumeSlider', 'sfxVolumeSlider'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || el._touchBound) return;
        el._touchBound = true;
        const fn = id === 'musicVolumeSlider' ? setMusicVolume : setSfxVolume;
        // Use pointermove for reliable cross-device drag
        el.addEventListener('pointermove', (e) => {
          e.stopPropagation();
          fn(el.value);
        }, { passive: true });
        el.addEventListener('pointerup', (e) => {
          e.stopPropagation();
          fn(el.value);
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
          e.stopPropagation();
          fn(el.value);
        }, { passive: true });
        el.addEventListener('touchend', (e) => {
          e.stopPropagation();
          fn(el.value);
        }, { passive: true });
      });
      const _savedMusicVol = OG.storage.getItem('orbitSync_musicVol') || '60';
      const _savedSfxVol = OG.storage.getItem('orbitSync_sfxVol') || '80';
      const _ms = document.getElementById('musicVolumeSlider');
      const _ss = document.getElementById('sfxVolumeSlider');
      if (_ms) _ms.value = _savedMusicVol;
      if (_ss) _ss.value = _savedSfxVol;
      const hardModeRow = document.getElementById('hardModeRow');
      const hardModeStatus = document.getElementById('hardModeStatus');
      if (hardModeRow && hardModeStatus) {
        hardModeRow.style.display = '';
        const _getWorldStars = (worldNum) => {
          if (typeof playerProgress === 'undefined' || !playerProgress.stageStars) return 0;
          const _stageIds = ['1','2','3','4','5'].map(n => `${worldNum}-${n}`);
          return _stageIds.reduce((acc, id) => acc + (playerProgress.stageStars[id] || 0), 0);
        };
        // Show status for whichever world is currently selected
        const _viewWorld = typeof menuSelectedWorld !== 'undefined' ? menuSelectedWorld : 1;
        const _maxUnlocked = typeof maxWorldUnlocked !== 'undefined' ? maxWorldUnlocked : 1;
        const _viewWorldUnlocked = _viewWorld <= _maxUnlocked;
        const _viewStars = _getWorldStars(_viewWorld);
        const _viewHardUnlocked = _viewStars >= 10;
        const _hasAnyWorld = _maxUnlocked >= 1;

        hardModeRow.style.opacity = (_hasAnyWorld && _viewWorldUnlocked) ? '1' : '0.45';

        const _hmMenuBtn = document.getElementById('menuHardModeBtn');
        if (_hmMenuBtn) {
          _hmMenuBtn.style.display = _viewHardUnlocked ? 'block' : 'none';
        }

        if (!_viewWorldUnlocked) {
          hardModeStatus.innerText = `CLEAR WORLD ${_viewWorld - 1} FIRST`;
          hardModeStatus.style.color = 'rgba(255,80,100,0.7)';
        } else if (_viewHardUnlocked) {
          hardModeStatus.innerText = 'UNLOCKED ✓';
          hardModeStatus.style.color = 'rgba(0,255,136,0.8)';
        } else {
          hardModeStatus.innerText = `W${_viewWorld}: ${_viewStars} / 10 ★`;
          hardModeStatus.style.color = 'rgba(255,150,80,0.6)';
        }
      }
    }
  }

  function applySettingsUI() {
    const musicMute = document.getElementById('musicMuteBtn');
    const sfxMute = document.getElementById('sfxMuteBtn');
    const hapticsBtn = document.getElementById('hapticsIconBtn');
    if (musicMute) musicMute.classList.toggle('muted', !audio.musicEnabled);
    if (sfxMute) sfxMute.classList.toggle('muted', !audio.sfxEnabled);
    if (hapticsBtn) {
      hapticsBtn.classList.toggle('muted', !audio.hapticsEnabled);
    }
  }

  let _prevMusicVol = 60;
  let _prevSfxVol = 80;

  function setMusicVolume(val) {
    const v = parseInt(val, 10) / 100;
    if (typeof OrbitGame !== 'undefined' && OrbitGame.audio) {
      OrbitGame.audio.musicEnabled = v > 0;
      if (OrbitGame.audio.baseGain && OrbitGame.audio.audioCtx) {
        const now2 = OrbitGame.audio.audioCtx.currentTime;
        const target2 = Math.min(0.48, v * 0.48);
        OrbitGame.audio.baseGain.gain.cancelScheduledValues(now2);
        OrbitGame.audio.baseGain.gain.linearRampToValueAtTime(target2, now2 + 0.3);
      }
    }
    const btn = document.getElementById('musicMuteBtn');
    const slider = document.getElementById('musicVolumeSlider');
    if (v > 0) _prevMusicVol = parseInt(val, 10);
    if (btn) btn.classList.toggle('muted', v === 0);
    if (slider) slider.value = val;
    OG.storage.setItem('orbitSync_musicVol', val);
  }

  function setSfxVolume(val) {
    const v = parseInt(val, 10) / 100;
    if (typeof OrbitGame !== 'undefined' && OrbitGame.audio) {
      OrbitGame.audio.sfxEnabled = v > 0;
    }
    const btn = document.getElementById('sfxMuteBtn');
    const slider = document.getElementById('sfxVolumeSlider');
    if (v > 0) _prevSfxVol = parseInt(val, 10);
    if (btn) btn.classList.toggle('muted', v === 0);
    if (slider) slider.value = val;
    OG.storage.setItem('orbitSync_sfxVol', val);
  }

  function toggleMusicSetting() {
    const slider = document.getElementById('musicVolumeSlider');
    const currentVal = slider ? parseInt(slider.value, 10) : 60;
    if (currentVal > 0) {
      // Mute: animate slider to 0
      setMusicVolume(0);
    } else {
      // Unmute: restore to previous volume
      setMusicVolume(_prevMusicVol || 60);
    }
  }

  function toggleSfxSetting() {
    const slider = document.getElementById('sfxVolumeSlider');
    const currentVal = slider ? parseInt(slider.value, 10) : 80;
    if (currentVal > 0) {
      setSfxVolume(0);
    } else {
      setSfxVolume(_prevSfxVol || 80);
    }
  }

  function toggleHapticsSetting() {
    audio.hapticsEnabled = !audio.hapticsEnabled;
    applySettingsUI();
  }

  OG.ui.settings.toggleSettings = toggleSettings;
  OG.ui.settings.applySettingsUI = applySettingsUI;
  OG.ui.settings.toggleMusicSetting = toggleMusicSetting;
  OG.ui.settings.toggleSfxSetting = toggleSfxSetting;
  OG.ui.settings.toggleHapticsSetting = toggleHapticsSetting;
  window.setMusicVolume = setMusicVolume;
  window.setSfxVolume = setSfxVolume;
})(window);
