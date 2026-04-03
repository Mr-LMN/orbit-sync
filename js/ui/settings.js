(function initSettings(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;
  OG.ui = OG.ui || {};
  OG.ui.settings = OG.ui.settings || {};
  OG.debug = OG.debug || {};

  const ADMIN_HASH_TARGET = 3855723219;
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
      setAdminStatus('No test stage selected.');
      return;
    }
    const stageIndex = getStageIndexById(stageId);
    if (stageIndex < 0 || !campaign[stageIndex]) {
      setAdminStatus('No test stage selected.');
      return;
    }
    const selected = campaign[stageIndex];
    setAdminStatus(`Test stage active: ${selected.id} — ${selected.title}`);
  }

  function populateAdminStageOptions() {
    const select = document.getElementById('adminStageSelect');
    if (!select || !Array.isArray(campaign)) return;
    const previousValue = OG.debug.stageOverrideId || '';
    select.innerHTML = '';
    for (let i = 0; i < campaign.length; i++) {
      const stage = campaign[i];
      if (!stage || !stage.id) continue;
      const option = document.createElement('option');
      option.value = stage.id;
      option.innerText = `${stage.id} — ${stage.title || 'Stage'}`;
      select.appendChild(option);
    }
    if (previousValue && getStageIndexById(previousValue) >= 0) {
      select.value = previousValue;
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

    OG.debug.stageOverrideId = selectedId;
    const worldNum = parseInt(selectedId.split('-')[0], 10);
    if (Number.isFinite(worldNum) && worldNum > 0) {
      menuSelectedWorld = worldNum;
      if (typeof updateWorldSelectorUI === 'function') updateWorldSelectorUI();
      if (typeof refreshMenuWorldPreview === 'function') refreshMenuWorldPreview();
    }
    updateSelectedStageStatus();
  }

  function clearStageOverrideSelection() {
    OG.debug.stageOverrideId = null;
    updateSelectedStageStatus();
  }

  function validateAdminCodeEntry() {
    const input = document.getElementById('adminCodeInput');
    const controls = document.getElementById('adminStageControls');
    if (!input || !controls) return;

    const isValid = hashAdminCode(input.value) === ADMIN_HASH_TARGET;
    if (!isValid) {
      adminUnlocked = false;
      controls.style.display = 'none';
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
  }

  function bindAdminControls() {
    const openBtn = document.getElementById('adminToolsBtn');
    const submitBtn = document.getElementById('adminCodeSubmit');
    const applyBtn = document.getElementById('adminStageApply');
    const clearBtn = document.getElementById('adminStageClear');
    const input = document.getElementById('adminCodeInput');
    if (openBtn) openBtn.addEventListener('click', toggleAdminPanel);
    if (submitBtn) submitBtn.addEventListener('click', validateAdminCodeEntry);
    if (applyBtn) applyBtn.addEventListener('click', applyStageOverrideSelection);
    if (clearBtn) clearBtn.addEventListener('click', clearStageOverrideSelection);
    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') validateAdminCodeEntry();
      });
    }
  }

  function toggleSettings(show) {
    ui.settingsModal.style.bottom = show ? '0' : '-100%';
    if (show) {
      applySettingsUI();
      updateSelectedStageStatus();
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

  bindAdminControls();
})(window);
