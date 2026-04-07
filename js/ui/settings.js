(function initSettings(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;
  OG.ui = OG.ui || {};
  OG.ui.settings = OG.ui.settings || {};
  OG.debug = OG.debug || {};

  const ADMIN_HASH_TARGET = 3138968151; // hash of '040404'
  let adminPanelVisible = false;
  let adminUnlocked = false;

  function hashAdminCode(value) {
    const source = `${String(value || '').trim()}|orbit-sync-admin`;
    let hash = 5381;
    for (let i = 0; i < source.length; i++) {
      hash = ((hash * 33) ^ source.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  function getStageIndexById(stageId) {
    if (!Array.isArray(campaign) || !stageId) return -1;
    for (let i = 0; i < campaign.length; i++) {
      if (campaign[i] && campaign[i].id === stageId) return i;
    }
    return -1;
  }

  function setAdminStatus(message) {
    const status = document.getElementById('adminStageStatus');
    if (status) status.innerText = message;
  }

  function updateSelectedStageStatus() {
    const stageId = OG.debug.stageOverrideId || '';
    if (!stageId) {
      setAdminStatus('No stage selected — LAUNCH will start from World 1.');
      return;
    }
    const stageIndex = getStageIndexById(stageId);
    if (stageIndex < 0 || !campaign[stageIndex]) {
      setAdminStatus('No stage selected.');
      return;
    }
    const selected = campaign[stageIndex];
    setAdminStatus(`Ready: ${selected.id} — ${selected.title}`);
  }

  function populateAdminStageOptions() {
    const select = document.getElementById('adminStageSelect');
    const worldSelect = document.getElementById('adminWorldSelect');
    if (!select || !Array.isArray(campaign)) return;
    const previousValue = OG.debug.stageOverrideId || '';
    const selectedWorld = String(_adminSelectedWorld || '');
    select.innerHTML = '';
    for (let i = 0; i < campaign.length; i++) {
      const stage = campaign[i];
      if (!stage || !stage.id) continue;
      const worldNum = parseInt(String(stage.id).split('-')[0], 10);
      if (selectedWorld && Number.isFinite(worldNum) && String(worldNum) !== selectedWorld) continue;
      const option = document.createElement('option');
      option.value = stage.id;
      option.innerText = `${stage.id} — ${stage.title || 'Stage'}`;
      select.appendChild(option);
    }
    if (previousValue && getStageIndexById(previousValue) >= 0) {
      select.value = previousValue;
    } else if (select.options.length > 0) {
      select.selectedIndex = 0;
    }
  }

  let _adminSelectedWorld = 1;

  function populateAdminWorldOptions() {
    const btnContainer = document.getElementById('adminWorldBtns');
    const hiddenSelect = document.getElementById('adminWorldSelect');
    if (!btnContainer || !Array.isArray(campaign)) return;

    const worldValues = [];
    for (let i = 0; i < campaign.length; i++) {
      const stage = campaign[i];
      if (!stage || !stage.id) continue;
      const worldNum = parseInt(String(stage.id).split('-')[0], 10);
      if (!Number.isFinite(worldNum) || worldValues.includes(worldNum)) continue;
      worldValues.push(worldNum);
    }
    worldValues.sort((a, b) => a - b);

    // Set default selected world
    const overrideWorld = parseInt(String(OG.debug.stageOverrideId || '').split('-')[0], 10);
    const fallback = Number.isFinite(menuSelectedWorld) ? menuSelectedWorld : 1;
    _adminSelectedWorld = Number.isFinite(overrideWorld) && worldValues.includes(overrideWorld)
      ? overrideWorld : fallback;

    // Build button grid
    btnContainer.innerHTML = '';
    worldValues.forEach(worldNum => {
      const btn = document.createElement('button');
      btn.className = 'admin-world-btn' + (worldNum === _adminSelectedWorld ? ' active' : '');
      btn.innerText = `W${worldNum}`;
      btn.setAttribute('data-world', worldNum);
      btn.addEventListener('click', () => {
        _adminSelectedWorld = worldNum;
        // Update active state
        btnContainer.querySelectorAll('.admin-world-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.getAttribute('data-world'), 10) === worldNum);
        });
        // Sync hidden select
        if (hiddenSelect) hiddenSelect.value = String(worldNum);
        // Repopulate stages
        populateAdminStageOptions();
      });
      btnContainer.appendChild(btn);
    });

    // Sync hidden select for backward compat
    if (hiddenSelect) {
      hiddenSelect.innerHTML = '';
      worldValues.forEach(w => {
        const opt = document.createElement('option');
        opt.value = String(w);
        hiddenSelect.appendChild(opt);
      });
      hiddenSelect.value = String(_adminSelectedWorld);
    }

    populateAdminStageOptions();
  }

  function applyStageOverrideSelection() {
    const select = document.getElementById('adminStageSelect');
    if (!select || !adminUnlocked) return;
    const selectedId = String(select.value || '').trim();
    const stageIndex = getStageIndexById(selectedId);
    if (stageIndex < 0) {
      setAdminStatus('Invalid stage selected.');
      return;
    }

    // Set the override
    OG.debug.stageOverrideId = selectedId;
    const worldNum = parseInt(selectedId.split('-')[0], 10);
    if (Number.isFinite(worldNum) && worldNum > 0) {
      menuSelectedWorld = worldNum;
    }

    // Close settings modal immediately
    ui.settingsModal.style.bottom = '-100%';

    // Brief delay then launch — gives modal time to slide away
    setTimeout(() => {
      // Ensure menu is showing as the base
      if (inMenu) {
        // Already on menu — just call startCampaign which reads the override
        if (typeof startCampaign === 'function') startCampaign();
      } else {
        // In a run — return to menu first then launch
        if (typeof returnToMenu === 'function') returnToMenu();
        setTimeout(() => {
          if (typeof startCampaign === 'function') startCampaign();
        }, 200);
      }
    }, 280);
  }

  function toggleAdminInfiniteLives() {
    OG.debug.infiniteLives = !OG.debug.infiniteLives;
    const btn = document.getElementById('adminInfiniteToggle');
    if (btn) {
      btn.innerText = OG.debug.infiniteLives ? 'On' : 'Off';
      btn.className = OG.debug.infiniteLives ? 'settings-toggle' : 'settings-toggle off';
    }
  }

  function clearStageOverrideSelection() {
    OG.debug.stageOverrideId = null;
    updateSelectedStageStatus();
  }

  function onAdminWorldSelectionChanged() {
    populateAdminStageOptions();
  }

  function validateAdminCodeEntry() {
    const input = document.getElementById('adminCodeInput');
    const controls = document.getElementById('adminStageControls');
    if (!input || !controls) return;

    const isValid = hashAdminCode(input.value) === ADMIN_HASH_TARGET;
    if (!isValid) {
      adminUnlocked = false;
      controls.style.display = 'none';
      OG.debug.infiniteLives = false;
      const infBtn = document.getElementById('adminInfiniteToggle');
      if (infBtn) { infBtn.innerText = 'Off'; infBtn.className = 'settings-toggle off'; }
      setAdminStatus('Code invalid.');
      input.value = '';
      return;
    }

    adminUnlocked = true;
    controls.style.display = 'grid';
    input.value = '';
    populateAdminStageOptions();
    updateSelectedStageStatus();
  }

  function toggleAdminPanel() {
    const panel = document.getElementById('adminToolsPanel');
    if (!panel) return;
    adminPanelVisible = !adminPanelVisible;
    panel.style.display = adminPanelVisible ? 'block' : 'none';
    if (adminPanelVisible) {
      populateAdminWorldOptions();
      populateAdminStageOptions();
      updateSelectedStageStatus();
    }
  }

  function bindAdminControls() {
    const submitBtn = document.getElementById('adminCodeSubmit');
    const applyBtn = document.getElementById('adminStageApply');
    const clearBtn = document.getElementById('adminStageClear');
    const worldSelect = document.getElementById('adminWorldSelect');
    const input = document.getElementById('adminCodeInput');
    if (submitBtn) submitBtn.addEventListener('click', validateAdminCodeEntry);
    if (applyBtn) applyBtn.addEventListener('click', applyStageOverrideSelection);
    if (clearBtn) clearBtn.addEventListener('click', clearStageOverrideSelection);
    if (worldSelect) worldSelect.addEventListener('change', onAdminWorldSelectionChanged);
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') validateAdminCodeEntry();
      });
    }
    _bindOrbitTitles();
  }

  let _orbitTapCount = 0;
  let _orbitTapTimer = null;

  function _bindOrbitTitles() {
    ['orbitTitle', 'syncTitle'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      // Use touchend for mobile reliability, click as fallback
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        _handleOrbitTap();
      }, { passive: false });
      el.addEventListener('click', _handleOrbitTap);
    });
  }

  function _handleOrbitTap() {
    _orbitTapCount++;
    if (_orbitTapTimer) clearTimeout(_orbitTapTimer);
    _orbitTapTimer = setTimeout(() => { _orbitTapCount = 0; }, 1400);
    if (_orbitTapCount >= 5) {
      _orbitTapCount = 0;
      clearTimeout(_orbitTapTimer);
      _openAdminPanel();
    }
  }

  function _openAdminPanel() {
    // Open settings modal first
    ui.settingsModal.style.bottom = '0';
    applySettingsUI();
    updateSelectedStageStatus();
    // Then force admin panel open after animation settles
    setTimeout(() => {
      const panel = document.getElementById('adminToolsPanel');
      if (panel) {
        panel.style.display = 'block';
        adminPanelVisible = true;
        populateAdminWorldOptions();
        populateAdminStageOptions();
        updateSelectedStageStatus();
      }
      const hardRow = document.getElementById('hardModeRow');
      if (hardRow) hardRow.style.display = 'none'; // clean up space for admin
      const input = document.getElementById('adminCodeInput');
      if (input) setTimeout(() => input.focus(), 100);
    }, 350);
  }

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
      const panel = document.getElementById('adminToolsPanel');
      if (panel) panel.style.display = 'none';
      const hardModeRow = document.getElementById('hardModeRow');
      if (hardModeRow) hardModeRow.style.display = '';
      adminPanelVisible = false;
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
      const _savedMusicVol = localStorage.getItem('orbitSync_musicVol') || '60';
      const _savedSfxVol = localStorage.getItem('orbitSync_sfxVol') || '80';
      const _ms = document.getElementById('musicVolumeSlider');
      const _ss = document.getElementById('sfxVolumeSlider');
      if (_ms) _ms.value = _savedMusicVol;
      if (_ss) _ss.value = _savedSfxVol;
      updateSelectedStageStatus();
      const hardModeRow = document.getElementById('hardModeRow');
      const hardModeStatus = document.getElementById('hardModeStatus');
      if (hardModeRow && hardModeStatus) {
        if (!adminPanelVisible) hardModeRow.style.display = '';
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
    localStorage.setItem('orbitSync_musicVol', val);
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
    localStorage.setItem('orbitSync_sfxVol', val);
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
  OG.ui.settings.bindAdminControls = bindAdminControls;
  OG.ui.settings.toggleAdminInfiniteLives = toggleAdminInfiniteLives;
  OG.ui.settings._openAdminPanel = _openAdminPanel;
  window.toggleAdminInfiniteLives = toggleAdminInfiniteLives;

  bindAdminControls();
})(window);
