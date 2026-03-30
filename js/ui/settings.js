(function initSettings(window) {
  const OG = window.OrbitGame;
  const audio = OG.audio;
  OG.ui = OG.ui || {};
  OG.ui.settings = OG.ui.settings || {};

  function toggleSettings(show) {
    ui.settingsModal.style.bottom = show ? '0' : '-100%';
    if (show) applySettingsUI();
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
})(window);
