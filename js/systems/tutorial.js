(function initTutorial(window, document) {
  const OG = window.OrbitGame || {};
  OG.systems = OG.systems || {};

  const STORAGE_KEY = 'orbitSync_masterTutorial_v2';
  const LEGACY_KEY = 'orbitSync_masterTutorial';

  const PHASES = {
    DISMISSED: 'dismissed',
    WELCOME: 'welcome',
    CAMPAIGN_GATE: 'campaign_gate',
    WORLD_PREVIEW: 'world_preview',
    WORLD_LADDER: 'world_ladder',
    FIRST_PLAY: 'first_play',
    HARD_MODE_INTRO: 'hard_mode_intro',
    HARD_MODE_CLEAR: 'hard_mode_clear',
    ECONOMY_ROUTE: 'economy_route',
    OWNERSHIP_ACTION: 'ownership_action',
    COMPLETE: 'complete'
  };

  const COPY = {
    welcome: {
      label: 'SYSTEM NOTICE',
      title: 'ORBIT SYNC ONLINE',
      body: 'Orbit Sync is built on timing, control, and survival. Each world adds a new layer. Learn the orbit. Then break it.'
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
      body: 'Cores change how you survive. Buy them. Equip them. Upgrade when ready.'
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
    }
  };

  const DEFAULT_STATE = {
    phase: PHASES.WELCOME,
    completed: false,
    pending: {
      firstCampaignMilestone: false,
      hardModeUnlocked: false,
      hardModeCleared: false,
      economyRoute: null,
      ownershipDone: false
    },
    tutorialCards: {
      starRatingShown: false,
      recoveryWindowShown: false
    }
  };

  let state = loadState();
  let cardResolver = null;
  let interactionGuard = null;
  let activeTarget = null;
  let started = false;

  const els = {
    mask: null,
    ring: null,
    card: null,
    label: null,
    title: null,
    body: null,
    btn: null,
    hint: null
  };

  function hydrateEls() {
    els.mask = document.getElementById('tutorialMask');
    els.ring = document.getElementById('tutorialHighlightRing');
    els.card = document.getElementById('tutorialCard');
    els.label = document.getElementById('tutorialCardLabel');
    els.title = document.getElementById('tutorialCardTitle');
    els.body = document.getElementById('tutorialCardBody');
    els.btn = document.getElementById('tutorialCardBtn');
    els.hint = document.getElementById('tutorialTapHint');
  }

  function getStorage() {
    return OG.storage || window.localStorage;
  }

  function loadState() {
    const storage = getStorage();
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          pending: {
            ...DEFAULT_STATE.pending,
            ...(parsed && parsed.pending ? parsed.pending : {})
          },
          tutorialCards: {
            ...DEFAULT_STATE.tutorialCards,
            ...(parsed && parsed.tutorialCards ? parsed.tutorialCards : {})
          }
        };
      } catch (e) {
        // fallback below
      }
    }

    const legacyPhase = parseInt(storage.getItem(LEGACY_KEY), 10);
    if (Number.isFinite(legacyPhase) && legacyPhase >= 6) {
      return Object.assign({}, DEFAULT_STATE, { phase: PHASES.COMPLETE, completed: true });
    }

    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function persistState() {
    const storage = getStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setMasterTutorialPhase(phase) {
    state.phase = phase;
    persistState();
  }

  function getMasterTutorialPhase() {
    return state.phase;
  }

  function completeMasterTutorial() {
    state.completed = true;
    state.phase = PHASES.COMPLETE;
    persistState();
    getStorage().setItem('orbitSync_tutorialDone', '1');
    clearGuidedHighlight();
    hideCard();
  }

  function showCard(config, onDone) {
    hydrateEls();
    if (!els.mask || !els.card) return;

    els.mask.classList.add('is-visible');
    els.mask.classList.remove('is-guided');
    els.ring.style.display = 'none';

    els.label.textContent = config.label || 'SYSTEM NOTICE';
    els.title.textContent = config.title || '';
    els.body.textContent = config.body || '';
    const buttonText = config.buttonText || 'CONTINUE';
    els.btn.style.display = config.hideButton ? 'none' : 'block';
    els.btn.textContent = buttonText;
    els.hint.style.display = config.hideTapHint ? 'none' : 'block';

    cardResolver = onDone || null;

    const close = function() {
      if (cardResolver) {
        const fn = cardResolver;
        cardResolver = null;
        fn();
      }
    };

    els.btn.onclick = close;
    els.card.onclick = config.tapAnywhere ? close : null;
  }

  function hideCard() {
    hydrateEls();
    if (!els.mask) return;
    els.mask.classList.remove('is-visible');
    els.mask.classList.remove('is-guided');
    if (els.ring) els.ring.style.display = 'none';
    if (els.card) {
      els.card.onclick = null;
      els.btn.onclick = null;
    }
    cardResolver = null;
  }

  function showFreezeFrame(title, description, buttonText, onComplete, label) {
    showCard({
      title,
      body: description,
      buttonText: buttonText || 'CONTINUE',
      label: label || 'SYSTEM NOTICE',
      tapAnywhere: true
    }, function() {
      hideCard();
      if (typeof onComplete === 'function') onComplete();
    });
  }

  function clearInteractionGuard() {
    if (interactionGuard) {
      document.removeEventListener('pointerdown', interactionGuard, true);
      interactionGuard = null;
    }
  }

  function blockAllExcept(selectorOrElement) {
    const target = typeof selectorOrElement === 'string'
      ? document.querySelector(selectorOrElement)
      : selectorOrElement;
    if (!target) return false;
    clearInteractionGuard();
    interactionGuard = function(event) {
      if (!target.contains(event.target) && event.target !== target) {
        event.preventDefault();
        event.stopPropagation();
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
    els.ring.style.left = `${Math.max(6, r.left - 6)}px`;
    els.ring.style.top = `${Math.max(6, r.top - 6)}px`;
    els.ring.style.width = `${Math.max(36, r.width + 12)}px`;
    els.ring.style.height = `${Math.max(36, r.height + 12)}px`;
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

    const maxRetry = Number.isFinite(options.retry) ? options.retry : 8;
    const retryMs = Number.isFinite(options.retryMs) ? options.retryMs : 220;
    let tries = 0;

    const attempt = function() {
      const target = typeof options.target === 'string'
        ? document.querySelector(options.target)
        : options.target;
      if (!target) {
        tries += 1;
        if (tries <= maxRetry) {
          setTimeout(attempt, retryMs);
          return;
        }
        safeGuidedFallback(options.fallbackCopy || COPY.campaign, options.onFallback);
        return;
      }

      clearGuidedHighlight();
      activeTarget = target;
      activeTarget.classList.add('tutorial-focus-target');

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

  function maybeOpenCampaignGate() {
    if (state.phase !== PHASES.CAMPAIGN_GATE) return;
    showFreezeFrame(COPY.campaign.title, COPY.campaign.body, 'OPEN CAMPAIGN', function() {
      showGuidedHighlight({
        target: '#nav-campaign',
        onSuccess: function() {
          setMasterTutorialPhase(PHASES.WORLD_PREVIEW);
          advanceMasterTutorial();
        },
        onFallback: function() {
          setMasterTutorialPhase(PHASES.WORLD_PREVIEW);
          advanceMasterTutorial();
        },
        fallbackCopy: COPY.campaign
      });
    }, COPY.campaign.label);
  }

  function ownMoreThanDefault() {
    const unlocked = Array.isArray(window.unlockedSkins) ? window.unlockedSkins : [];
    return unlocked.some(function(id) { return id && id !== 'classic'; });
  }

  function isNewPlayerProfile() {
    const worldUnlocked = Math.max(1, Number(window.maxWorldUnlocked) || 1);
    const hasExtraCore = ownMoreThanDefault();
    const hasCompleted = state.completed || state.phase === PHASES.COMPLETE;
    return worldUnlocked <= 1 && !hasExtraCore && !hasCompleted;
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

    const anyBtn = Array.from(document.querySelectorAll('.shop-coin-buy-btn'))
      .find(function(btn) { return isVisibleElement(btn) && !btn.disabled; });
    return anyBtn || null;
  }

  function findFirstWorkshopEquipTarget() {
    const preferred = Array.from(document.querySelectorAll('.workshop-equip-btn[id^=\"wbtn-\"]')).find(function(btn) {
      if (!isVisibleElement(btn) || btn.disabled) return false;
      if (btn.id === 'wbtn-classic') return false;
      return btn.textContent && btn.textContent.trim().toUpperCase() === 'EQUIP';
    });
    if (preferred) return preferred;

    return Array.from(document.querySelectorAll('.workshop-equip-btn[id^=\"wbtn-\"]')).find(function(btn) {
      return isVisibleElement(btn) && btn.id !== 'wbtn-classic';
    }) || null;
  }

  function routeEconomyPhase() {
    if (state.phase !== PHASES.ECONOMY_ROUTE) return;
    const route = ownMoreThanDefault() ? 'workshop' : 'shop';
    state.pending.economyRoute = route;
    persistState();

    const targetNav = route === 'workshop' ? '#nav-workshop' : '#nav-shop';
    showFreezeFrame(COPY.economy.title, COPY.economy.body, 'ROUTE', function() {
      showGuidedHighlight({
        target: targetNav,
        onSuccess: function() {
          setMasterTutorialPhase(PHASES.OWNERSHIP_ACTION);
          advanceMasterTutorial();
        },
        onFallback: function() {
          setMasterTutorialPhase(PHASES.OWNERSHIP_ACTION);
          advanceMasterTutorial();
        },
        fallbackCopy: COPY.economy
      });
    }, COPY.economy.label);
  }

  function startMasterTutorialIfNeeded() {
    if (started) return;
    const midProgress = !state.completed && state.phase !== PHASES.WELCOME && state.phase !== PHASES.COMPLETE;
    if (state.completed || state.phase === PHASES.COMPLETE || getStorage().getItem('orbitSync_tutorialDone') === '1') {
      return;
    }
    if (!midProgress && !isNewPlayerProfile()) {
      return;
    }
    started = true;
    setTimeout(advanceMasterTutorial, 180);
  }

  function advanceMasterTutorial() {
    if (state.completed) return;

    if (state.phase === PHASES.WELCOME) {
      showFreezeFrame(COPY.welcome.title, COPY.welcome.body, 'CONTINUE', function() {
        setMasterTutorialPhase(PHASES.CAMPAIGN_GATE);
        advanceMasterTutorial();
      }, COPY.welcome.label);
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
        if (!text) {
          setMasterTutorialPhase(PHASES.FIRST_PLAY);
          advanceMasterTutorial();
          return;
        }
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
          onSuccess: function() {
            setMasterTutorialPhase(PHASES.HARD_MODE_INTRO);
            persistState();
          }
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

    if (state.phase === PHASES.ECONOMY_ROUTE) {
      routeEconomyPhase();
      return;
    }

    if (state.phase === PHASES.OWNERSHIP_ACTION) {
      if (state.pending.ownershipDone) {
        setMasterTutorialPhase(PHASES.COMPLETE);
        advanceMasterTutorial();
      }
      return;
    }

    if (state.phase === PHASES.COMPLETE) {
      showFreezeFrame(COPY.done.title, COPY.done.body, 'DISMISS', function() {
        completeMasterTutorial();
      }, COPY.done.label);
    }
  }

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
        isShop ? 'Purchase one core to unlock the ownership layer.' : 'Equip a non-default owned core to confirm your first loadout action.',
        'READY',
        function() {
          if (!target) {
            showFreezeFrame(
              isShop ? 'OPEN SHOP' : 'OPEN WORKSHOP',
              isShop ? 'Could not lock a specific purchase button. Buy any available core to continue.' : 'Could not lock a specific equip button. Equip any non-default core to continue.',
              'CONTINUE',
              function() { suspendTutorialUI(); },
              'SYSTEM NOTICE'
            );
            return;
          }
          showGuidedHighlight({
            target: target,
            fallbackCopy: COPY.economy,
            onFallback: suspendTutorialUI
          });
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
        showFreezeFrame(
          COPY.starRating.title,
          COPY.starRating.body,
          'UNDERSTOOD',
          function() {},
          COPY.starRating.label
        );
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
    if (stageId !== '1-4') return;
    if (state.tutorialCards.recoveryWindowShown) return;

    state.tutorialCards.recoveryWindowShown = true;
    persistState();

    setTimeout(function() {
      showFreezeFrame(
        COPY.recoveryWindow.title,
        COPY.recoveryWindow.body,
        'LOCKED IN',
        function() {},
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
    if (state.phase === PHASES.HARD_MODE_INTRO) {
      setMasterTutorialPhase(PHASES.HARD_MODE_CLEAR);
    }
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

  function resetMasterTutorial() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    persistState();
    getStorage().removeItem('orbitSync_tutorialDone');
    clearGuidedHighlight();
    hideCard();
    started = false;
  }

  OG.systems.tutorial = {
    PHASES,
    COPY,
    startMasterTutorialIfNeeded,
    advanceMasterTutorial,
    setMasterTutorialPhase,
    getMasterTutorialPhase,
    completeMasterTutorial,
    showFreezeFrame,
    showGuidedHighlight,
    clearGuidedHighlight,
    blockAllExcept,
    onMenuTabOpened,
    onCampaignMilestone,
    onHardModeUnlocked,
    onHardModeCleared,
    onCorePurchased,
    onCoreEquipped,
    onUpgradePerformed,
    resetMasterTutorial,
    suspendTutorialUI,
    findFirstShopPurchaseTarget,
    findFirstWorkshopEquipTarget,
    isNewPlayerProfile,

    // Legacy bridge methods
    handleLevelStart,
    handleHardModeClear: onHardModeCleared,
    checkMenuRouting: startMasterTutorialIfNeeded,
    completePhase: function() {}
  };
})(window, document);
