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
    const selectedWorld = worldSelect ? String(worldSelect.value || '').trim() : '';
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

  function populateAdminWorldOptions() {
    const worldSelect = document.getElementById('adminWorldSelect');
    if (!worldSelect || !Array.isArray(campaign)) return;
    const worldValues = [];
    for (let i = 0; i < campaign.length; i++) {
      const stage = campaign[i];
      if (!stage || !stage.id) continue;
      const worldNum = parseInt(String(stage.id).split('-')[0], 10);
      if (!Number.isFinite(worldNum) || worldValues.includes(worldNum)) continue;
      worldValues.push(worldNum);
    }
    worldValues.sort((a, b) => a - b);
    worldSelect.innerHTML = '';
    for (let i = 0; i < worldValues.length; i++) {
      const worldNum = worldValues[i];
      const option = document.createElement('option');
      option.value = String(worldNum);
      option.innerText = `WORLD ${worldNum}`;
      worldSelect.appendChild(option);
    }
    const overrideWorld = parseInt(String(OG.debug.stageOverrideId || '').split('-')[0], 10);
    const fallbackWorld = Number.isFinite(menuSelectedWorld) ? menuSelectedWorld : 1;
    const preferred = Number.isFinite(overrideWorld) ? overrideWorld : fallbackWorld;
    if (worldValues.includes(preferred)) {
      worldSelect.value = String(preferred);
    }
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
    if (!show) {
      const panel = document.getElementById('adminToolsPanel');
      if (panel) panel.style.display = 'none';
      const hardModeRow = document.getElementById('hardModeRow');
      if (hardModeRow) hardModeRow.style.display = '';
      adminPanelVisible = false;
    }
    if (show) {
      applySettingsUI();
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
        const _w1Stars = _getWorldStars(1);
        const _w1Unlocked = _w1Stars >= 10;
        const _hasAnyWorld = typeof maxWorldUnlocked !== 'undefined' && maxWorldUnlocked >= 1;
        hardModeRow.style.opacity = _hasAnyWorld ? '1' : '0.45';
        if (!_hasAnyWorld) {
          hardModeStatus.innerText = 'CLEAR WORLD 1';
          hardModeStatus.style.color = 'rgba(255,80,100,0.7)';
        } else if (_w1Unlocked) {
          hardModeStatus.innerText = 'COMING SOON';
          hardModeStatus.style.color = 'rgba(255,200,80,0.7)';
        } else {
          hardModeStatus.innerText = `${_w1Stars} / 10 ★ NEEDED`;
          hardModeStatus.style.color = 'rgba(255,150,80,0.6)';
        }
      }
    }
  }

  function applySettingsUI() {
    const musicBtn = document.getElementById('musicToggleBtn');
    const sfxBtn = document.getElementById('sfxToggleBtn');
    const hapticsBtn = document.getElementById('hapticsToggleBtn');
    musicBtn.innerText = audio.musicEnabled ? 'On' : 'Off';
    sfxBtn.innerText = audio.sfxEnabled ? 'On' : 'Off';
    hapticsBtn.innerText = audio.hapticsEnabled ? 'On' : 'Off';
    musicBtn.classList.toggle('off', !audio.musicEnabled);
    sfxBtn.classList.toggle('off', !audio.sfxEnabled);
    hapticsBtn.classList.toggle('off', !audio.hapticsEnabled);
  }

  function toggleMusicSetting() {
    audio.musicEnabled = !audio.musicEnabled;
    if (!audio.musicEnabled) {
      stopDynamicMusic();
    } else if (isPlaying) {
      initAudio();
      ensureCorrectMusicForLevel();
    }
    applySettingsUI();
  }

  function toggleSfxSetting() {
    audio.sfxEnabled = !audio.sfxEnabled;
    if (!audio.sfxEnabled) stopBossDrone();
    applySettingsUI();
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
  OG.ui.settings.bindAdminControls = bindAdminControls;
  OG.ui.settings.toggleAdminInfiniteLives = toggleAdminInfiniteLives;
  OG.ui.settings._openAdminPanel = _openAdminPanel;
  window.toggleAdminInfiniteLives = toggleAdminInfiniteLives;

  bindAdminControls();
})(window);
