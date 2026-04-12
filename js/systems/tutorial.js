(function initTutorial(window, document) {
  const OG = window.OrbitGame || {};
  OG.systems = OG.systems || {};

  const STORAGE_KEY = 'orbitSync_masterTutorial_v2';
  const LEGACY_KEY  = 'orbitSync_masterTutorial';

  const PHASES = {
    DISMISSED:       'dismissed',
    WELCOME:         'welcome',
    ORBIT_LOOP:      'orbit_loop',     // NEW: core mechanic explainer
    CAMPAIGN_GATE:   'campaign_gate',
    WORLD_PREVIEW:   'world_preview',
    WORLD_LADDER:    'world_ladder',
    FIRST_PLAY:      'first_play',
    HARD_MODE_INTRO: 'hard_mode_intro',
    HARD_MODE_CLEAR: 'hard_mode_clear',
    ECONOMY_ROUTE:   'economy_route',
    OWNERSHIP_ACTION:'ownership_action',
    COMPLETE:        'complete'
  };

  const COPY = {
    welcome: {
      label: 'SYSTEM NOTICE',
      title: 'ORBIT SYNC ONLINE',
      body: 'Your orb rides the ring. Score by landing inside a glowing zone at the right moment.\n\nMaster the timing. The ring never forgives twice.'
    },
    orbitLoop: {
      label: 'CORE MECHANICS',
      title: 'THE ORBIT LOOP',
      body: 'Zones drift around the ring. Tap to launch your orb.\n\nHit DEAD CENTER = PERFECT — maximum damage, multiplier climbs.\nHit the EDGE = GOOD — scores, but no streak.\nMiss entirely = lose a LIFE.\n\nThe faster the ring, the smaller your window.'
    },
    campaign: {
      label: 'COMMAND',
      title: 'CAMPAIGN IS YOUR ASCENT',
      body: 'Worlds are your progression path. Clear worlds, earn stars, and unlock higher threat patterns.'
    },
    worldPreview: {
      label: 'WORLD FILE',
      title: 'READ THE WORLD CARD',
      body: 'Preview, completion, stars, and Hard Mode access all live here. Learn the panel. Then push forward.'
    },
    ladder: [
      'World 1 — Learn the rhythm. Pure timing. No excuses.',
      'World 2 — Precision starts here. Split reads and cleaner hits.',
      'World 3 — Echoes, resonance, delayed reads. Stay calm.',
      'World 4+ — Systems destabilize. Expect mutation, speed, and pressure.'
    ],
    firstPlay: {
      label: 'COMMAND',
      title: 'BEGIN WORLD 1',
      body: 'Launch your first campaign run. Survive the pattern. Return stronger.'
    },
    hardMode: {
      label: 'SYSTEM NOTICE',
      title: 'HARD MODE',
      body: 'Hard Mode is not a remix. It is a verdict. Better rewards. Less mercy.'
    },
    hardClear: {
      label: 'WORLD FILE',
      title: 'YOU SURVIVED THE FRACTURE',
      body: 'Mastery confirmed. Next layer: ownership. Cores define how you survive.'
    },
    economy: {
      label: 'COMMAND',
      title: 'BUILD YOUR LOADOUT',
      body: 'Cores aren\'t cosmetic. Each one changes how you fight.\n\nTime to build your loadout.'
    },
    done: {
      label: 'SYSTEM NOTICE',
      title: 'LOOP UNDERSTOOD',
      body: 'You understand the loop now. Master the worlds. Hunt the bosses. Evolve the core.'
    },
    starRating: {
      label: 'WORLD FILE',
      title: 'STAR RATING',
      body: 'Clear the stage to earn 1 star.\nHold strong accuracy to earn 2.\nMaster the pattern to earn 3.\n\nStars are your proof of control. You will need them to unlock tougher paths.'
    },
    recoveryWindow: {
      label: 'SYSTEM NOTICE',
      title: 'RECOVERY WINDOW',
      body: 'Chain 6 PERFECT hits in a row and you restore 1 LIFE. Precision is not just score. It keeps you alive.'
    },
    zoneTypes: {
      label: 'WORLD FILE',
      title: 'KNOW YOUR ZONES',
      body: '🟠 EMBER — Safe. Hit for points. Your bread and butter.\n\n🟡 GHOST — Appears and disappears. Only hits when visible.\n\n⚡ INFERNO — Tiny, moves fast. Massive reward for precision.\n\n⬛ ASH — A TRAP. Hitting ash costs you a LIFE. Avoid it.'
    }
  };

  const DEFAULT_STATE = {
    phase: PHASES.WELCOME,
    completed: false,
    pending: {
      firstCampaignMilestone: false,
      hardModeUnlocked:       false,
      hardModeCleared:        false,
      economyRoute:           null,
      ownershipDone:          false
    },
    tutorialCards: {
      starRatingShown:       false,
      recoveryWindowShown:   false,
      zoneTypesShown:        false
    }
  };

  let state = loadState();
  let cardResolver = null;
  let interactionGuard = null;
  let activeTarget = null;
  let started = false;
  let tutorialPausedGameplay = false;

  // In-game tip timer handle
  let _tipTimer = null;

  const els = {
    mask: null, ring: null, card: null,
    label: null, title: null, body: null,
    btn: null, hint: null
  };

  function hydrateEls() {
    els.mask  = document.getElementById('tutorialMask');
    els.ring  = document.getElementById('tutorialHighlightRing');
    els.card  = document.getElementById('tutorialCard');
    els.label = document.getElementById('tutorialCardLabel');
    els.title = document.getElementById('tutorialCardTitle');
    els.body  = document.getElementById('tutorialCardBody');
    els.btn   = document.getElementById('tutorialCardBtn');
    els.hint  = document.getElementById('tutorialTapHint');
  }

  function pauseGameplayForTutorial() {
    const mask = document.getElementById('tutorialMask');
    if (mask) mask.dataset.allowNav = 'false';
    // Stop the game loop entirely — not just slow it down
    if (typeof isPlaying !== 'undefined' && isPlaying) {
      tutorialPausedGameplay = true;
      isPlaying = false;
    } else if (typeof isPlaying !== 'undefined' && !isPlaying) {
      // Not actively playing (e.g. on hub) but still track state
      tutorialPausedGameplay = false;
    }
    // Belt-and-suspenders: zero timescale too
    if (typeof targetTimeScale !== 'undefined') targetTimeScale = 0;
    if (typeof timeScale !== 'undefined') timeScale = 0;
  }

  function resumeGameplayFromTutorial() {
    if (!tutorialPausedGameplay) {
      // Still reset timescale if it was zeroed
      if (typeof targetTimeScale !== 'undefined' && targetTimeScale === 0) targetTimeScale = 1;
      if (typeof timeScale !== 'undefined' && timeScale === 0) timeScale = 1;
      return;
    }
    isPlaying = true;
    if (typeof targetTimeScale !== 'undefined') targetTimeScale = 1;
    if (typeof timeScale !== 'undefined') timeScale = 1;
    tutorialPausedGameplay = false;
  }

  function getStorage() { return OG.storage || window.localStorage; }

  function loadState() {
    const storage = getStorage();
    const raw     = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          pending: { ...DEFAULT_STATE.pending, ...(parsed && parsed.pending ? parsed.pending : {}) },
          tutorialCards: { ...DEFAULT_STATE.tutorialCards, ...(parsed && parsed.tutorialCards ? parsed.tutorialCards : {}) }
        };
      } catch (e) { /* fallback below */ }
    }
    const legacyPhase = parseInt(storage.getItem(LEGACY_KEY), 10);
    if (Number.isFinite(legacyPhase) && legacyPhase >= 6) {
      return Object.assign({}, DEFAULT_STATE, { phase: PHASES.COMPLETE, completed: true });
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function persistState() { getStorage().setItem(STORAGE_KEY, JSON.stringify(state)); }

  function setMasterTutorialPhase(phase) { state.phase = phase; persistState(); }
  function getMasterTutorialPhase()       { return state.phase; }

  function completeMasterTutorial() {
    state.completed = true;
    state.phase     = PHASES.COMPLETE;
    persistState();
    getStorage().setItem('orbitSync_tutorialDone', '1');
    clearGuidedHighlight();
    hideCard();
  }

  // ─── IN-GAME TIP (non-blocking, overlay) ─────────────────────────────────
  function showInGameTip(text, duration) {
    duration = duration || 3200;
    const overlay = document.getElementById('tutorialOverlay');
    const msg     = document.getElementById('tutorialMsg');
    if (!overlay || !msg) return;
    if (_tipTimer) clearTimeout(_tipTimer);
    msg.textContent        = text;
    overlay.style.display  = 'block';
    overlay.style.opacity  = '1';
    _tipTimer = setTimeout(function() {
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.style.display = 'none';
        overlay.style.opacity = '1';
      }, 400);
      _tipTimer = null;
    }, duration);
  }

  // ─── FREEZE-FRAME CARDS ──────────────────────────────────────────────────
  function showCard(config, onDone) {
    hydrateEls();
    if (!els.mask || !els.card) return;

    if (config.pauseGameplay) pauseGameplayForTutorial();

    els.mask.classList.add('is-visible');
    els.mask.classList.remove('is-guided');
    els.ring.style.display = 'none';

    els.label.textContent = config.label || 'SYSTEM NOTICE';
    els.title.textContent = config.title || '';
    els.body.textContent  = config.body  || '';
    const buttonText      = config.buttonText || 'CONTINUE';
    els.btn.style.display  = config.hideButton  ? 'none'  : 'block';
    els.btn.textContent    = buttonText;
    els.hint.style.display = config.hideTapHint ? 'none'  : 'block';

    cardResolver = onDone || null;

    const close = function() {
      resumeGameplayFromTutorial();
      if (cardResolver) { const fn = cardResolver; cardResolver = null; fn(); }
    };

    els.mask.onclick = function(event) {
      if (event.target === els.mask) { event.preventDefault(); event.stopPropagation(); }
    };
    els.btn.onclick  = close;
    els.card.onclick = config.tapAnywhere ? close : null;
  }

  function hideCard() {
    hydrateEls();
    if (!els.mask) return;
    resumeGameplayFromTutorial();
    els.mask.classList.remove('is-visible');
    els.mask.classList.remove('is-guided');
    els.mask.dataset.allowNav = 'false';
    if (els.ring) els.ring.style.display = 'none';
    if (els.card) { els.card.onclick = null; els.btn.onclick = null; }
    els.mask.onclick = null;
    cardResolver = null;
  }

  function showFreezeFrame(title, description, buttonText, onComplete, label) {
    showCard({
      title, body: description,
      buttonText: buttonText || 'CONTINUE',
      label: label || 'SYSTEM NOTICE',
      tapAnywhere: true, pauseGameplay: true
    }, function() { hideCard(); if (typeof onComplete === 'function') onComplete(); });
  }

  // ─── GUIDED HIGHLIGHT ────────────────────────────────────────────────────
  function clearInteractionGuard() {
    if (interactionGuard) {
      document.removeEventListener('pointerdown', interactionGuard, true);
      interactionGuard = null;
    }
  }

  function blockAllExcept(selectorOrElement) {
    const target = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (!target) return false;
    clearInteractionGuard();
    interactionGuard = function(event) {
      if (!target.contains(event.target) && event.target !== target) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    document.addEventListener('pointerdown', interactionGuard, true);
    return true;
  }

  function placeRing(target) {
    hydrateEls();
    if (!els.ring || !target) return;
    const r = target.getBoundingClientRect();
    els.ring.style.display = 'block';
    els.ring.style.left    = `${Math.max(6, r.left - 8)}px`;
    els.ring.style.top     = `${Math.max(6, r.top  - 8)}px`;
    els.ring.style.width   = `${Math.max(36, r.width  + 16)}px`;
    els.ring.style.height  = `${Math.max(36, r.height + 16)}px`;
  }

  function clearGuidedHighlight() {
    clearInteractionGuard();
    if (activeTarget) activeTarget.classList.remove('tutorial-focus-target');
    activeTarget = null;
    hydrateEls();
    if (els.ring) els.ring.style.display = 'none';
    if (els.mask) els.mask.classList.remove('is-guided');
  }

  function suspendTutorialUI() {
    resumeGameplayFromTutorial();
    cardResolver = null;
    clearGuidedHighlight();
    hideCard();
    hydrateEls();
    if (els.mask) {
      els.mask.classList.remove('is-visible');
      els.mask.classList.remove('is-guided');
      els.mask.style.display = '';
    }
  }

  function safeGuidedFallback(copy, advanceFn) {
    clearGuidedHighlight();
    showFreezeFrame(copy.title, copy.body, 'CONTINUE', advanceFn, copy.label);
  }

  function showGuidedHighlight(options) {
    hydrateEls();
    if (!els.mask || !els.ring) return;

    const maxRetry = Number.isFinite(options.retry)   ? options.retry   : 8;
    const retryMs  = Number.isFinite(options.retryMs) ? options.retryMs : 220;
    let tries = 0;

    const attempt = function() {
      const target = typeof options.target === 'string'
        ? document.querySelector(options.target) : options.target;
      if (!target) {
        tries += 1;
        if (tries <= maxRetry) { setTimeout(attempt, retryMs); return; }
        safeGuidedFallback(options.fallbackCopy || COPY.campaign, options.onFallback);
        return;
      }

      clearGuidedHighlight();
      activeTarget = target;
      activeTarget.classList.add('tutorial-focus-target');

      // Allow tutorial-controlled tab switches through the switchMenuTab guard
      const mask = document.getElementById('tutorialMask');
      if (mask) mask.dataset.allowNav = 'true';

      els.mask.classList.add('is-visible');
      els.mask.classList.add('is-guided');
      placeRing(target);
      blockAllExcept(target);

      const onResize = function() {
        if (!activeTarget || !document.body.contains(activeTarget)) {
          window.removeEventListener('resize', onResize);
          safeGuidedFallback(options.fallbackCopy || COPY.campaign, options.onFallback);
          return;
        }
        placeRing(activeTarget);
      };
      window.addEventListener('resize', onResize, { once: true });

      target.addEventListener('click', function clickHandler() {
        target.removeEventListener('click', clickHandler);
        clearGuidedHighlight();
        if (typeof options.onSuccess === 'function') options.onSuccess();
      }, { once: true });
    };

    attempt();
  }

  // ─── TUTORIAL FLOW ───────────────────────────────────────────────────────
  function maybeOpenCampaignGate() {
    if (state.phase !== PHASES.CAMPAIGN_GATE) return;
    showFreezeFrame(COPY.campaign.title, COPY.campaign.body, 'OPEN CAMPAIGN', function() {
      showGuidedHighlight({
        target: '#nav-campaign',
        onSuccess:  function() { setMasterTutorialPhase(PHASES.WORLD_PREVIEW); advanceMasterTutorial(); },
        onFallback: function() { setMasterTutorialPhase(PHASES.WORLD_PREVIEW); advanceMasterTutorial(); },
        fallbackCopy: COPY.campaign
      });
    }, COPY.campaign.label);
  }

  function ownMoreThanDefault() {
    // window.unlockedSkins is declared with `let` in loop.js and is NOT a window property.
    // Read directly from storage as the canonical source of truth.
    const storage = getStorage();
    const raw = storage.getJSON ? storage.getJSON('orbitSync_unlocks', null) : null;
    const unlocked = Array.isArray(raw) ? raw
      : (Array.isArray(window.unlockedSkins) ? window.unlockedSkins : []);
    return unlocked.some(function(id) { return id && id !== 'classic'; });
  }

  function isNewPlayerProfile() {
    const storage = getStorage();

    // Tutorial state explicitly marks this as complete — not a new player.
    if (state.completed || state.phase === PHASES.COMPLETE) return false;
    if (storage.getItem('orbitSync_tutorialDone') === '1') return false;

    // Session arc flag is written when the World 1 boss is defeated for the first time.
    // Its presence means this is definitely a returning player.
    if (storage.getItem('orbitSync_sessionArcDone') === '1') return false;

    // World unlock counter — window.maxWorldUnlocked is a `let` var in loop.js and is
    // NOT exposed on the window object; read from storage as the authoritative source.
    const maxWorld = parseInt(storage.getItem('orbitSync_maxWorld'), 10) || 1;
    if (maxWorld > 1) return false;

    // Any non-default core/skin owned indicates past play.
    if (ownMoreThanDefault()) return false;

    // Stage completion or star records mean the player has actually played levels.
    const pp = storage.getJSON ? storage.getJSON('orbitSync_playerProgress', null) : null;
    if (pp) {
      if (Object.keys(pp.completedStages || {}).length > 0) return false;
      if (Object.keys(pp.stageStars    || {}).length > 0) return false;
    }

    // A non-zero personal best score is definitive proof of past runs.
    const pbScore = parseInt(storage.getItem('orbitSync_pbScore'), 10) || 0;
    if (pbScore > 0) return false;

    // All markers are at their factory defaults — this is a genuinely fresh save.
    return true;
  }

  function isVisibleElement(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findFirstShopPurchaseTarget() {
    const cards = Array.from(document.querySelectorAll('.shop-buy-card'));
    for (let i = 0; i < cards.length; i++) {
      const btn = cards[i].querySelector('.shop-coin-buy-btn');
      if (!btn || !isVisibleElement(btn) || btn.disabled) continue;
      if (btn.classList.contains('already-owned')) continue;
      return btn;
    }
    return Array.from(document.querySelectorAll('.shop-coin-buy-btn'))
      .find(function(btn) { return isVisibleElement(btn) && !btn.disabled; }) || null;
  }

  function findFirstWorkshopEquipTarget() {
    const preferred = Array.from(document.querySelectorAll('.workshop-equip-btn[id^="wbtn-"]')).find(function(btn) {
      if (!isVisibleElement(btn) || btn.disabled) return false;
      if (btn.id === 'wbtn-classic') return false;
      return btn.textContent && btn.textContent.trim().toUpperCase() === 'EQUIP';
    });
    if (preferred) return preferred;
    return Array.from(document.querySelectorAll('.workshop-equip-btn[id^="wbtn-"]')).find(function(btn) {
      return isVisibleElement(btn) && btn.id !== 'wbtn-classic';
    }) || null;
  }

  function routeEconomyPhase() {
    if (state.phase !== PHASES.ECONOMY_ROUTE) return;
    const route    = ownMoreThanDefault() ? 'workshop' : 'shop';
    state.pending.economyRoute = route;
    persistState();

    const targetNav = route === 'workshop' ? '#nav-workshop' : '#nav-shop';
    showFreezeFrame(COPY.economy.title, COPY.economy.body, 'LET\'S GO', function() {
      showGuidedHighlight({
        target:     targetNav,
        onSuccess:  function() { setMasterTutorialPhase(PHASES.OWNERSHIP_ACTION); advanceMasterTutorial(); },
        onFallback: function() { setMasterTutorialPhase(PHASES.OWNERSHIP_ACTION); advanceMasterTutorial(); },
        fallbackCopy: COPY.economy
      });
    }, COPY.economy.label);
  }

  // Auto-migration: called when a save has real progression but is missing the tutorial
  // completion flags (e.g. saves that predate the orbitSync_masterTutorial_v2 key).
  // Writes all necessary flags so the player is never re-onboarded on future loads.
  function _markTutorialCompleteForMigratedSave() {
    const storage = getStorage();
    state.completed = true;
    state.phase     = PHASES.COMPLETE;
    persistState();
    storage.setItem('orbitSync_tutorialDone', '1');
    // Ensure the session-arc gate in menus.js also passes for this player.
    // Any save with actual progression has already "completed" the first session arc.
    if (!storage.getItem('orbitSync_sessionArcDone')) {
      storage.setItem('orbitSync_sessionArcDone', '1');
    }
  }

  function startMasterTutorialIfNeeded() {
    if (started) return;
    const midProgress = !state.completed && state.phase !== PHASES.WELCOME && state.phase !== PHASES.COMPLETE;
    if (state.completed || state.phase === PHASES.COMPLETE || getStorage().getItem('orbitSync_tutorialDone') === '1') return;
    // Returning player whose tutorial completion flags are absent (e.g. pre-v2 save).
    // Auto-write the missing flags instead of re-running onboarding.
    if (!midProgress && !isNewPlayerProfile()) {
      _markTutorialCompleteForMigratedSave();
      return;
    }
    started = true;
    setTimeout(advanceMasterTutorial, 180);
  }

  function advanceMasterTutorial() {
    if (state.completed) return;

    if (state.phase === PHASES.WELCOME) {
      showFreezeFrame(COPY.welcome.title, COPY.welcome.body, 'UNDERSTOOD', function() {
        setMasterTutorialPhase(PHASES.ORBIT_LOOP);
        advanceMasterTutorial();
      }, COPY.welcome.label);
      return;
    }

    if (state.phase === PHASES.ORBIT_LOOP) {
      showFreezeFrame(COPY.orbitLoop.title, COPY.orbitLoop.body, 'GOT IT', function() {
        setMasterTutorialPhase(PHASES.CAMPAIGN_GATE);
        advanceMasterTutorial();
      }, COPY.orbitLoop.label);
      return;
    }

    if (state.phase === PHASES.CAMPAIGN_GATE) {
      maybeOpenCampaignGate();
      return;
    }

    if (state.phase === PHASES.WORLD_PREVIEW) {
      if (!document.getElementById('campaignView') || document.getElementById('campaignView').style.display === 'none') return;
      showFreezeFrame(COPY.worldPreview.title, COPY.worldPreview.body, 'CONTINUE', function() {
        setMasterTutorialPhase(PHASES.WORLD_LADDER);
        advanceMasterTutorial();
      }, COPY.worldPreview.label);
      return;
    }

    if (state.phase === PHASES.WORLD_LADDER) {
      const cards = COPY.ladder.slice();
      const nextCard = function() {
        const text = cards.shift();
        if (!text) { setMasterTutorialPhase(PHASES.FIRST_PLAY); advanceMasterTutorial(); return; }
        showFreezeFrame('WORLD LADDER', text, 'NEXT', nextCard, 'WORLD FILE');
      };
      nextCard();
      return;
    }

    if (state.phase === PHASES.FIRST_PLAY) {
      showFreezeFrame(COPY.firstPlay.title, COPY.firstPlay.body, 'PLAY', function() {
        showGuidedHighlight({
          target: '#menuPlayBtn',
          fallbackCopy: COPY.firstPlay,
          onSuccess: function() { setMasterTutorialPhase(PHASES.HARD_MODE_INTRO); persistState(); }
        });
      }, COPY.firstPlay.label);
      return;
    }

    if (state.phase === PHASES.HARD_MODE_INTRO && state.pending.hardModeUnlocked) {
      showFreezeFrame(COPY.hardMode.title, COPY.hardMode.body, 'UNDERSTOOD', function() {
        const hmBtn = document.getElementById('menuHardModeBtn');
        if (hmBtn && hmBtn.style.display !== 'none') {
          showGuidedHighlight({ target: hmBtn, fallbackCopy: COPY.hardMode });
        }
      }, COPY.hardMode.label);
      return;
    }

    if (state.phase === PHASES.HARD_MODE_CLEAR && state.pending.hardModeCleared) {
      showFreezeFrame(COPY.hardClear.title, COPY.hardClear.body, 'CONTINUE', function() {
        setMasterTutorialPhase(PHASES.ECONOMY_ROUTE);
        routeEconomyPhase();
      }, COPY.hardClear.label);
      return;
    }

    if (state.phase === PHASES.ECONOMY_ROUTE) { routeEconomyPhase(); return; }

    if (state.phase === PHASES.OWNERSHIP_ACTION) {
      if (state.pending.ownershipDone) { setMasterTutorialPhase(PHASES.COMPLETE); advanceMasterTutorial(); }
      return;
    }

    if (state.phase === PHASES.COMPLETE) {
      showFreezeFrame(COPY.done.title, COPY.done.body, 'DISMISS', function() {
        completeMasterTutorial();
      }, COPY.done.label);
    }
  }

  // ─── EVENT HOOKS ─────────────────────────────────────────────────────────
  function onMenuTabOpened(tabId) {
    if (state.completed) return;

    if (state.phase === PHASES.WORLD_PREVIEW && tabId === 'campaign') {
      setTimeout(advanceMasterTutorial, 150);
      return;
    }

    if (state.phase === PHASES.HARD_MODE_INTRO && tabId === 'campaign') {
      const hardModeBtn = document.getElementById('menuHardModeBtn');
      if (hardModeBtn && hardModeBtn.style.display !== 'none') {
        state.pending.hardModeUnlocked = true;
        persistState();
        setTimeout(advanceMasterTutorial, 120);
      }
      return;
    }

    if (state.phase === PHASES.OWNERSHIP_ACTION && tabId === state.pending.economyRoute) {
      const isShop = tabId === 'shop';
      const target = isShop ? findFirstShopPurchaseTarget() : findFirstWorkshopEquipTarget();
      showFreezeFrame(
        isShop ? 'ACQUIRE YOUR FIRST CORE' : 'EQUIP YOUR NEXT CORE',
        isShop
          ? 'Purchase one core to unlock the ownership layer.'
          : 'Equip a non-default owned core to confirm your first loadout action.',
        'READY',
        function() {
          if (!target) {
            showFreezeFrame(
              isShop ? 'OPEN SHOP' : 'OPEN WORKSHOP',
              isShop
                ? 'Could not lock a specific purchase button. Buy any available core to continue.'
                : 'Could not lock a specific equip button. Equip any non-default core to continue.',
              'CONTINUE',
              function() { suspendTutorialUI(); },
              'SYSTEM NOTICE'
            );
            return;
          }
          showGuidedHighlight({ target, fallbackCopy: COPY.economy, onFallback: suspendTutorialUI });
        },
        'COMMAND'
      );
    }
  }

  function onCampaignMilestone() {
    if (!state.tutorialCards.starRatingShown) {
      state.tutorialCards.starRatingShown = true;
      persistState();
      setTimeout(function() {
        showFreezeFrame(COPY.starRating.title, COPY.starRating.body, 'UNDERSTOOD', function() {}, COPY.starRating.label);
      }, 180);
    }
    if (state.phase === PHASES.HARD_MODE_INTRO) {
      state.pending.firstCampaignMilestone = true;
      persistState();
    }
  }

  function handleLevelStart(stageId) {
    const isHardMode = !!(OG.state && OG.state.legacy && OG.state.legacy.hardMode);
    if (isHardMode) return;

    // In-game contextual tips — only show when no freeze-frame card is active
    function _showTipIfNoCard(text, delay, duration) {
      setTimeout(function() {
        const mask = document.getElementById('tutorialMask');
        const cardActive = mask && mask.classList.contains('is-visible');
        if (!cardActive) showInGameTip(text, duration || 3500);
      }, delay || 1200);
    }

    if (stageId === '1-1') {
      _showTipIfNoCard('TAP WHEN YOUR ORB IS INSIDE A GLOWING ZONE', 1400, 3500);
    }

    if (stageId === '1-2') {
      _showTipIfNoCard('SMALLER ZONES = HIGHER REWARD — AIM FOR THE CENTER', 1100, 3500);
    }

    // Recovery window card at 1-4
    if (stageId !== '1-4') return;
    if (state.tutorialCards.recoveryWindowShown) return;

    state.tutorialCards.recoveryWindowShown = true;
    persistState();

    setTimeout(function() {
      showFreezeFrame(
        COPY.recoveryWindow.title, COPY.recoveryWindow.body, 'LOCKED IN',
        function() {
          // Chain: zone types card immediately follows
          if (!state.tutorialCards.zoneTypesShown) {
            state.tutorialCards.zoneTypesShown = true;
            persistState();
            setTimeout(function() {
              showFreezeFrame(COPY.zoneTypes.title, COPY.zoneTypes.body, 'GOT IT', function() {}, COPY.zoneTypes.label);
            }, 120);
          }
        },
        COPY.recoveryWindow.label
      );
    }, 350);
  }

  function onHardModeUnlocked() {
    state.pending.hardModeUnlocked = true;
    persistState();
    if (state.phase === PHASES.HARD_MODE_INTRO) setTimeout(advanceMasterTutorial, 120);
  }

  function onHardModeCleared() {
    state.pending.hardModeCleared = true;
    if (state.phase === PHASES.HARD_MODE_INTRO) setMasterTutorialPhase(PHASES.HARD_MODE_CLEAR);
    persistState();
    setTimeout(advanceMasterTutorial, 120);
  }

  function onCorePurchased(coreId) {
    if (!coreId) return;
    if (state.phase === PHASES.OWNERSHIP_ACTION) {
      state.pending.ownershipDone = true;
      persistState();
      setMasterTutorialPhase(PHASES.COMPLETE);
      advanceMasterTutorial();
    }
  }

  function onCoreEquipped(coreId) {
    if (!coreId || coreId === 'classic') return;
    if (state.phase === PHASES.OWNERSHIP_ACTION) {
      state.pending.ownershipDone = true;
      persistState();
      setMasterTutorialPhase(PHASES.COMPLETE);
      advanceMasterTutorial();
    }
  }

  function onUpgradePerformed() {
    if (state.phase === PHASES.OWNERSHIP_ACTION) {
      state.pending.ownershipDone = true;
      persistState();
      setMasterTutorialPhase(PHASES.COMPLETE);
      advanceMasterTutorial();
    }
  }

  // ── PHASE 3: FIRST SESSION ARC — WORLD 1 COMPLETE ───────────────────────
  // Called by progression.js when the World 1 boss is defeated for the first time.
  // Marks the session arc as done (unlocks hub nav) and shows a cinematic card.
  function onWorld1Complete() {
    const storage = getStorage();
    if (storage.getItem('orbitSync_sessionArcDone')) return; // already triggered
    storage.setItem('orbitSync_sessionArcDone', '1');

    // Delay to let boss defeat animation play first
    setTimeout(function() {
      showFreezeFrame(
        'SYNCHRONISED',
        'World 1 complete. Your base is now online.\n\nThe hub is your command centre — upgrade your Core, tackle Daily Missions, and challenge the weekly Phoenix Trial.',
        'ENTER THE HUB',
        function() {
          // Navigate to hub home on dismiss
          if (OG.ui && OG.ui.menus && typeof OG.ui.menus.refreshOrbitRankStrip === 'function') {
            OG.ui.menus.refreshOrbitRankStrip();
          }
        },
        'FIRST SESSION COMPLETE'
      );
    }, 1800);
  }

  function resetMasterTutorial() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    persistState();
    getStorage().removeItem('orbitSync_tutorialDone');
    getStorage().removeItem('orbitSync_sessionArcDone');
    clearGuidedHighlight();
    hideCard();
    started = false;
  }

  OG.systems.tutorial = {
    PHASES, COPY,
    startMasterTutorialIfNeeded,
    advanceMasterTutorial,
    setMasterTutorialPhase,
    getMasterTutorialPhase,
    completeMasterTutorial,
    showFreezeFrame,
    showGuidedHighlight,
    clearGuidedHighlight,
    blockAllExcept,
    showInGameTip,
    onMenuTabOpened,
    onCampaignMilestone,
    onHardModeUnlocked,
    onHardModeCleared,
    onCorePurchased,
    onCoreEquipped,
    onUpgradePerformed,
    onWorld1Complete,
    resetMasterTutorial,
    suspendTutorialUI,
    findFirstShopPurchaseTarget,
    findFirstWorkshopEquipTarget,
    isNewPlayerProfile,
    // Legacy bridge methods
    handleLevelStart,
    handleHardModeClear: onHardModeCleared,
    checkMenuRouting:    startMasterTutorialIfNeeded,
    completePhase:       function() {}
  };
})(window, document);
