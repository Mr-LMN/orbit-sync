(function initShop(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.shop = OG.ui.shop || {};

  // Rarity color palette — single source used by both workshop and shop.
  const RARITY_COLOR = {
    COMMON:    '#aaaaaa',
    UNCOMMON:  '#0aff64',
    RARE:      '#00eaff',
    EPIC:      '#bd00ff',
    LEGENDARY: '#ffaa00'
  };

  const SHOP_COSTS = {
    skull: 50, prism: 150, echo: 200,
    crimson: 150, pulse: 300, ghost: 400, storm: 350
  };

  // Convenience: sphere registry shortcut.
  function _reg() {
    return OG.entities && OG.entities.spheres && OG.entities.spheres.registry
      ? OG.entities.spheres.registry : {};
  }

  // Convenience: perk registry shortcut.
  function _perkReg() {
    return OG.entities && OG.entities.perks && OG.entities.perks.registry
      ? OG.entities.perks.registry : {};
  }

  // Convenience: runtime shortcut.
  function _sr() {
    return OG.entities && OG.entities.spheres && OG.entities.spheres.runtime
      ? OG.entities.spheres.runtime : null;
  }

  // ── PURCHASE / EQUIP ─────────────────────────────────────────

  window.purchasePremium = function() {
    if (typeof isPremium !== 'undefined' && isPremium) return;
    if (typeof audioCtx !== 'undefined') playPop(10, true);
    isPremium = true;
    if (typeof saveData === 'function') saveData();
    updateShopUI();
    if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
      createPopup(centerObj.x, centerObj.y - 40, 'PREMIUM UNLOCKED', '#ffd700');
      createPopup(centerObj.x, centerObj.y, 'NO ADS & 2X COINS', '#ffd700');
    }
    if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
  };

  function buyItem(id, cost) {
    if (globalCoins >= cost) {
      globalCoins -= cost;
      unlockedSkins.push(id);
      saveData();
      updatePersistentCoinUI();
      equipSkin(id);
      if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onCorePurchased === 'function') {
        OG.systems.tutorial.onCorePurchased(id);
      }
    } else {
      alert('Not enough coins! Play the campaign to earn more.');
    }
  }

  function equipSkin(id) {
    activeSkin = id;
    saveData();
    updateWorkshopUI();
    updateShopUI();
    if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onCoreEquipped === 'function') {
      OG.systems.tutorial.onCoreEquipped(id);
    }
  }

  window.ascendEquippedSphere = function() {
    const sr = _sr();
    if (!sr) return;
    const skinId = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';
    const cost = 150; // Flat evolution cost
    if (globalCoins < cost) {
      alert('Not enough coins to Evolve! Need 🪙 ' + cost);
      return;
    }
    const success = sr.ascendSphere(skinId);
    if (success) {
      globalCoins -= cost;
      if (typeof audioCtx !== 'undefined') playPop(10, true);
      saveData();
      updateWorkshopUI();
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
      if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
         createPopup(centerObj.x, centerObj.y - 40, 'CORE EVOLVED!', '#ffaa00');
      }
      if (OG.systems && OG.systems.tutorial && typeof OG.systems.tutorial.onUpgradePerformed === 'function') {
        OG.systems.tutorial.onUpgradePerformed({ type: 'ascend', skinId });
      }
    }
  };

  // ── PERK SELECTION MODAL ──────────────────────────────────────

  function openPerkSelectionModal(slotIndex) {
    const modal = document.getElementById('perkSelectionModal');
    const list  = document.getElementById('perkSelectionList');
    if (!modal || !list) return;

    list.innerHTML = '';

    const sr         = _sr();
    const perkReg    = _perkReg();
    const skinId     = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';
    const unlocked   = sr ? sr.getUnlockedPerks() : [];
    const equipped   = sr ? sr.getEquippedPerksForSphere(skinId) : [];

    if (unlocked.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#aaa; text-align:center; padding:20px; font-size:0.8rem;';
      empty.textContent = 'No perks unlocked yet.';
      list.appendChild(empty);
    } else {
      unlocked.forEach(function(perkId) {
        const perk = perkReg[perkId];
        if (!perk) return;

        const isEquipped = equipped.includes(perkId);
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline' + (isEquipped ? ' equipped' : '');
        btn.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; text-align:left; width:100%;';
        btn.disabled = isEquipped;

        const infoWrap = document.createElement('div');
        const nameDiv = document.createElement('div');
        nameDiv.style.fontFamily = "'Orbitron',sans-serif";
        nameDiv.style.fontSize = '0.9rem';
        nameDiv.textContent = perk.icon + ' ' + perk.name;

        const descDiv = document.createElement('div');
        descDiv.style.fontSize = '0.7rem';
        descDiv.style.color = '#aaa';
        descDiv.style.marginTop = '4px';
        descDiv.textContent = perk.description;

        infoWrap.appendChild(nameDiv);
        infoWrap.appendChild(descDiv);

        const statusDiv = document.createElement('div');
        statusDiv.style.marginLeft = '12px';
        statusDiv.style.whiteSpace = 'nowrap';
        statusDiv.textContent = (isEquipped ? 'EQUIPPED' : 'SELECT');

        btn.appendChild(infoWrap);
        btn.appendChild(statusDiv);

        if (!isEquipped) {
          btn.onclick = (function(pid) {
            return function() {
              if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
              if (_sr()) _sr().equipPerk(skinId, slotIndex, pid);
              modal.style.display = 'none';
              updateWorkshopUI();
            };
          })(perkId);
        }
        list.appendChild(btn);
      });
    }

    // Unequip option if this slot has something in it
    if (equipped[slotIndex]) {
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'btn btn-outline';
      unequipBtn.style.cssText = 'margin-top:10px; border-color:#ff4444; color:#ff4444; width:100%;';
      unequipBtn.textContent = 'UNEQUIP';
      unequipBtn.onclick = function() {
        if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
        if (_sr()) _sr().equipPerk(skinId, slotIndex, null);
        modal.style.display = 'none';
        updateWorkshopUI();
      };
      list.appendChild(unequipBtn);
    }

    modal.style.display = 'flex';
  }

  // ── WORKSHOP HERO DETAIL (level, XP bar, perk slots) ─────────

  function _updateWorkshopEquippedDetails(sphereId) {
    const sr       = _sr();
    const meta     = _reg()[sphereId];
    if (!meta) return;

    const rarityEl         = document.getElementById('workshopEquippedRarity');
    const levelEl          = document.getElementById('workshopEquippedLevel');
    const xpBarEl          = document.getElementById('workshopEquippedXPBar');
    const passiveEl        = document.getElementById('workshopEquippedPassive');
    const perkSlotsEl      = document.getElementById('workshopEquippedPerkSlots');
    const starsEl          = document.getElementById('workshopEquippedStars');
    const ascendBtn        = document.getElementById('workshopAscendBtn');

    // Rarity badge
    if (rarityEl) {
      rarityEl.textContent = meta.rarity;
      rarityEl.style.color = RARITY_COLOR[meta.rarity] || '#aaa';
    }

    const prog         = sr ? sr.getSphereProgress(sphereId) : { level: 1, xp: 0, stars: 1 };
    const currentLevel = prog.level || 1;
    const currentXP    = prog.xp   || 0;
    const currentStars = prog.stars || 1;
    const maxStars     = meta.maxStars || 1;

    // Level label
    if (levelEl) levelEl.textContent = 'LV ' + currentLevel + ' / ' + meta.maxLevel;

    // Stars & Ascend Button
    if (starsEl) {
      if (maxStars > 1) {
        starsEl.style.display = 'block';
        starsEl.textContent = '★'.repeat(currentStars) + '☆'.repeat(maxStars - currentStars);
      } else {
        starsEl.style.display = 'none';
      }
    }

    if (ascendBtn) {
      if (currentLevel >= meta.maxLevel && currentStars < maxStars) {
        ascendBtn.style.display = 'block';
      } else {
        ascendBtn.style.display = 'none';
      }
    }

    // XP bar
    if (xpBarEl) {
      if (currentLevel >= meta.maxLevel) {
        xpBarEl.style.width     = '100%';
        xpBarEl.style.background = '#0aff64';
      } else {
        const lo  = meta.xpCurve[currentLevel - 1] || 0;
        const hi  = meta.xpCurve[currentLevel]     || 1;
        const pct = Math.max(0, Math.min(100, ((currentXP - lo) / (hi - lo)) * 100));
        xpBarEl.style.width     = pct + '%';
        xpBarEl.style.background = '#00e5ff';
      }
    }

    // Passive label
    if (passiveEl) {
      passiveEl.textContent = meta.passive ? meta.passive.label : '';
    }

    // Perk slots
    if (!perkSlotsEl) return;
    perkSlotsEl.innerHTML = '';

    const unlockedSlots = sr ? sr.getUnlockedPerkSlotsForSphere(sphereId) : 0;
    const maxSlots      = sr ? sr.getMaxPerkSlotsForSphere(sphereId)      : 0;

    // Show or hide the perks section based on whether this core has slots
    const perkSection = document.querySelector('.workshop-perks-section');
    if (perkSection) perkSection.style.display = maxSlots === 0 ? 'none' : '';
    if (maxSlots === 0) return; // Common — no slots

    const equippedPerks = sr ? sr.getEquippedPerksForSphere(sphereId) : [];
    const perkReg       = _perkReg();

    for (let i = 0; i < maxSlots; i++) {
      const slotDiv = document.createElement('div');
      slotDiv.className = 'workshop-perk-slot';

      if (i < unlockedSlots) {
        // Unlocked slot
        const pid  = equippedPerks[i];
        const perk = pid ? perkReg[pid] : null;
        if (perk) {
          slotDiv.className += ' slot-filled';
          const iconSpan = document.createElement('span');
          iconSpan.style.fontSize = '1.3rem';
          iconSpan.title = perk.name;
          iconSpan.textContent = perk.icon;
          slotDiv.appendChild(iconSpan);
        } else {
          slotDiv.className += ' slot-empty';
          const plusSpan = document.createElement('span');
          plusSpan.style.color = '#555';
          plusSpan.style.fontSize = '1.4rem';
          plusSpan.style.lineHeight = '1';
          plusSpan.textContent = '+';
          slotDiv.appendChild(plusSpan);
        }
        slotDiv.addEventListener('click', (function(idx) {
          return function() { openPerkSelectionModal(idx); };
        })(i));
      } else {
        // Locked slot — shows at what level it unlocks
        let unlockAt = meta.maxLevel;
        const slotMap = meta.perkSlotsAtLevel || {};
        for (const lvl of Object.keys(slotMap).map(Number).sort((a, b) => a - b)) {
          if (slotMap[lvl] > i) { unlockAt = lvl; break; }
        }
        slotDiv.className += ' slot-locked';
        const lockSpan = document.createElement('span');
        lockSpan.style.fontSize = '0.5rem';
        lockSpan.style.color = '#333';
        lockSpan.style.textAlign = 'center';
        lockSpan.style.lineHeight = '1.3';
        lockSpan.style.fontFamily = "'Orbitron',sans-serif";
        lockSpan.style.display = 'block';
        lockSpan.textContent = '🔒';
        const lvBreak = document.createElement('br');
        lockSpan.appendChild(lvBreak);
        lockSpan.appendChild(document.createTextNode('LV' + unlockAt));

        slotDiv.appendChild(lockSpan);
        slotDiv.title = 'Reach Level ' + unlockAt + ' to unlock';
      }

      perkSlotsEl.appendChild(slotDiv);
    }
  }

  // ── WORKSHOP GRID + HERO UPDATE ───────────────────────────────

  function updateWorkshopUI() {
    const equipped = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';
    const reg      = _reg();
    const sr       = _sr();

    // Hero section
    const heroPreview = document.getElementById('workshopEquippedPreview');
    const heroName    = document.getElementById('workshopEquippedName');
    if (heroPreview) {
      heroPreview.dataset.skin = equipped;
      if (typeof renderShopOrbPreview === 'function') renderShopOrbPreview(heroPreview, equipped);
    }
    if (heroName) {
      const meta = reg[equipped];
      heroName.textContent = meta ? meta.name : equipped.toUpperCase();
    }

    _updateWorkshopEquippedDetails(equipped);

    // Profile sphere preview (if on profile view)
    const profilePreview = document.getElementById('profileSpherePreview');
    if (profilePreview) {
      profilePreview.dataset.skin = equipped;
      if (typeof renderShopOrbPreview === 'function') renderShopOrbPreview(profilePreview, equipped);
    }

    // Workshop grid cards
    const allSkins = ['classic', 'skull', 'prism', 'echo', 'crimson', 'pulse', 'ghost', 'storm'];
    allSkins.forEach(function(id) {
      const card    = document.getElementById('witem-' + id);
      const btn     = document.getElementById('wbtn-' + id);
      if (!card || !btn) return;

      const preview = card.querySelector('.item-preview');
      if (preview && typeof renderShopOrbPreview === 'function') renderShopOrbPreview(preview, id);

      // Update passive label from registry
      const perkEl = card.querySelector('.workshop-item-perk');
      if (perkEl) {
        const meta = reg[id];
        if (meta && meta.passive) {
          perkEl.textContent    = meta.passive.label;
          perkEl.style.color    = RARITY_COLOR[meta.rarity] || '#aaa';
        }
      }

      const isEquipped = (equipped === id);
      const isOwned    = isEquipped ||
        (typeof unlockedSkins !== 'undefined' && unlockedSkins.includes(id)) ||
        id === 'classic';

      card.classList.remove('is-equipped', 'is-locked');
      btn.classList.remove('equipped-state', 'owned-state', 'locked-state');
      btn.disabled = false;
      btn.onclick  = null;

      if (isEquipped) {
        card.classList.add('is-equipped');
        btn.classList.add('equipped-state');
        btn.textContent = 'EQUIPPED';
        btn.disabled    = true;
      } else if (isOwned) {
        btn.classList.add('owned-state');
        btn.textContent = 'EQUIP';
        btn.onclick = (function(_id) {
          return function() {
            if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
            equipSkin(_id);
          };
        })(id);
      } else {
        card.classList.add('is-locked');
        btn.classList.add('locked-state');
        btn.textContent = '🔒 LOCKED';
        btn.disabled    = true;
      }
    });
  }

  // ── SHOP VIEW (commerce) ──────────────────────────────────────

  function updateShopUI() {
    updatePersistentCoinUI();

    const reg = _reg();

    // Premium card — hide entirely when owned
    const premiumBtn  = document.getElementById('btn-premium');
    const premiumCard = premiumBtn ? premiumBtn.closest('.shop-premium-card') : null;
    if (premiumBtn) {
      const owned = typeof isPremium !== 'undefined' && isPremium;
      premiumBtn.textContent   = owned ? 'OWNED ✓' : 'BUY £2.99';
      premiumBtn.disabled      = owned;
      if (premiumCard) premiumCard.classList.toggle('is-owned', owned);
    }

    // Shop buy grid
    const shopSkins = ['skull', 'prism', 'echo', 'crimson', 'pulse', 'ghost', 'storm'];
    shopSkins.forEach(function(id) {
      const card   = document.getElementById('sitem-' + id);
      const btn    = document.getElementById('sbtn-' + id);
      if (!btn) return;

      const preview = card ? card.querySelector('.item-preview') : null;
      if (preview && typeof renderShopOrbPreview === 'function') renderShopOrbPreview(preview, id);

      // Passive label from registry
      const perkEl = card ? card.querySelector('.shop-buy-card-perk') : null;
      if (perkEl) {
        const meta = reg[id];
        if (meta && meta.passive) {
          perkEl.textContent = meta.passive.label;
          perkEl.style.color = RARITY_COLOR[meta.rarity] || '#aaa';
        }
      }

      const isOwned = (typeof unlockedSkins !== 'undefined' && unlockedSkins.includes(id)) ||
                      (typeof activeSkin !== 'undefined' && activeSkin === id);

      if (isOwned) {
        btn.textContent = 'OWNED ✓';
        btn.disabled    = true;
        btn.classList.add('already-owned');
      } else {
        btn.textContent = '🪙 ' + SHOP_COSTS[id];
        btn.disabled    = false;
        btn.classList.remove('already-owned');
      }
    });
  }

  // ── NAVIGATION ────────────────────────────────────────────────

  function toggleShop(show) {
    if (show && typeof switchMenuTab === 'function') switchMenuTab('shop');
  }

  // ── EXPORTS ───────────────────────────────────────────────────

  OG.ui.shop.toggleShop       = toggleShop;
  OG.ui.shop.updateShopUI     = updateShopUI;
  OG.ui.shop.updateWorkshopUI = updateWorkshopUI;
  OG.ui.shop.buyItem          = buyItem;
  OG.ui.shop.equipSkin        = equipSkin;
})(window);
