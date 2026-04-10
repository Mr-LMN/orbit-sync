(function initShop(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.shop = OG.ui.shop || {};

  const SKIN_NAMES = {
    classic: 'CLASSIC CORE', skull: 'NEON SKULL', prism: 'PRISM CORE', echo: 'ECHO TRAIL',
    crimson: 'CRIMSON RAIL', pulse: 'PULSE CORE', ghost: 'GHOST ORB', storm: 'STORM CORE'
  };
  const SKIN_PERKS = {
    classic: 'Standard Operations',
    skull: 'Perk: +1 Max Lives',
    prism: 'Perk: +10% Coins',
    echo: 'Perk: +10% Perfect Radius',
    crimson: 'Perk: Combo +1 on Perfect',
    pulse: 'Perk: Near Miss → 1 Coin',
    ghost: 'Perk: Survive 1 Fatal Hit',
    storm: 'Perk: +5 Coins on Flawless'
  };
  const SHOP_COSTS = { skull: 50, prism: 150, echo: 200, crimson: 150, pulse: 300, ghost: 400, storm: 350 };

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
    } else {
      alert('Not enough coins! Play the campaign to earn more.');
    }
  }

  function equipSkin(id) {
    activeSkin = id;
    saveData();
    updateWorkshopUI();
    updateShopUI();
  }

  // ── SHOP VIEW (commerce) ──────────────────────────────────────

  function updateShopUI() {
    updatePersistentCoinUI();

    // Premium button
    const premiumBtn = document.getElementById('btn-premium');
    if (premiumBtn) {
      if (typeof isPremium !== 'undefined' && isPremium) {
        premiumBtn.innerText = 'OWNED ✓';
        premiumBtn.disabled = true;
        premiumBtn.style.opacity = '0.55';
      } else {
        premiumBtn.innerText = 'BUY £2.99';
        premiumBtn.disabled = false;
        premiumBtn.style.opacity = '1';
      }
    }

    // Shop buy grid items
    const shopSkins = ['skull', 'prism', 'echo', 'crimson', 'pulse', 'ghost', 'storm'];
    shopSkins.forEach(id => {
      const btn = document.getElementById('sbtn-' + id);
      const card = document.getElementById('sitem-' + id);
      const preview = card ? card.querySelector('.item-preview') : null;
      if (!btn) return;

      if (preview && typeof renderShopOrbPreview === 'function') renderShopOrbPreview(preview, id);

      const isOwned = (typeof unlockedSkins !== 'undefined' && unlockedSkins.includes(id)) ||
                      (typeof activeSkin !== 'undefined' && activeSkin === id);

      if (isOwned) {
        btn.innerText = 'OWNED ✓';
        btn.disabled = true;
        btn.classList.add('already-owned');
      } else {
        btn.innerText = '🪙 ' + SHOP_COSTS[id];
        btn.disabled = false;
        btn.classList.remove('already-owned');
      }
    });
  }

  // ── WORKSHOP VIEW (ownership / equip) ─────────────────────────

  function openPerkSelectionModal(slotIndex) {
    const modal = document.getElementById('perkSelectionModal');
    const list = document.getElementById('perkSelectionList');
    if (!modal || !list) return;

    list.innerHTML = '';

    // Get unlocked perks from storage
    const storageData = typeof OrbitGame !== 'undefined' && OrbitGame.storage ? OrbitGame.storage.getJSON() : {};
    const unlockedPerks = storageData.unlockedPerks || [];

    // Equipped perks
    const equippedPerks = (storageData.sphereProgression && storageData.sphereProgression[activeSkin] && storageData.sphereProgression[activeSkin].perks) || [];

    const allPerks = (typeof OrbitGame !== 'undefined' && OrbitGame.entities.perks.registry) ? OrbitGame.entities.perks.registry : {};

    if (unlockedPerks.length === 0) {
      list.innerHTML = '<div style="color: #aaa; text-align: center; padding: 20px;">No perks unlocked yet.</div>';
    } else {
      unlockedPerks.forEach(perkId => {
        const perk = allPerks[perkId];
        if (!perk) return;

        const isEquipped = equippedPerks.includes(perkId);

        const btn = document.createElement('button');
        btn.className = `btn btn-outline ${isEquipped ? 'equipped' : ''}`;
        btn.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; text-align: left;';
        btn.disabled = isEquipped;

        btn.innerHTML = `
          <div>
            <div style="font-family: 'Orbitron', sans-serif; font-size: 0.9rem;">${perk.icon} ${perk.name}</div>
            <div style="font-size: 0.7rem; color: #aaa; margin-top: 4px;">${perk.description}</div>
          </div>
          <div>${isEquipped ? 'EQUIPPED' : 'SELECT'}</div>
        `;

        if (!isEquipped) {
          btn.onclick = () => {
            if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
            equipPerkToSlot(activeSkin, slotIndex, perkId);
            modal.style.display = 'none';
          };
        }

        list.appendChild(btn);
      });
    }

    // Add unequip option if slot is not empty
    if (equippedPerks[slotIndex]) {
      const unequipBtn = document.createElement('button');
      unequipBtn.className = 'btn btn-outline';
      unequipBtn.style.cssText = 'margin-top: 10px; border-color: #ff4444; color: #ff4444;';
      unequipBtn.innerText = 'UNEQUIP PERK';
      unequipBtn.onclick = () => {
        if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
        equipPerkToSlot(activeSkin, slotIndex, null);
        modal.style.display = 'none';
      };
      list.appendChild(unequipBtn);
    }

    modal.style.display = 'flex';
  }

  function equipPerkToSlot(skinId, slotIndex, perkId) {
    if (typeof OrbitGame === 'undefined' || !OrbitGame.storage) return;

    let data = OrbitGame.storage.getJSON() || {};
    data.sphereProgression = data.sphereProgression || {};
    data.sphereProgression[skinId] = data.sphereProgression[skinId] || { level: 1, xp: 0, perks: [] };

    let perks = data.sphereProgression[skinId].perks || [];

    if (perkId === null) {
      perks.splice(slotIndex, 1);
    } else {
      perks[slotIndex] = perkId;
    }

    data.sphereProgression[skinId].perks = perks;
    OrbitGame.storage.setJSON(data);

    updateWorkshopUI();
  }

  function updateWorkshopEquippedDetails(equipped) {
    const registry = (typeof OrbitGame !== 'undefined' && OrbitGame.entities.spheres.registry) ? OrbitGame.entities.spheres.registry : {};
    const sphereMeta = registry[equipped];

    if (!sphereMeta) return;

    const rarityEl = document.getElementById('workshopEquippedRarity');
    const levelEl = document.getElementById('workshopEquippedLevel');
    const xpBarEl = document.getElementById('workshopEquippedXPBar');
    const perkSlotsContainer = document.getElementById('workshopEquippedPerkSlots');

    if (rarityEl) {
      rarityEl.innerText = sphereMeta.rarity;
      let color = '#aaa';
      switch(sphereMeta.rarity) {
        case 'UNCOMMON': color = '#0aff64'; break;
        case 'RARE': color = '#00eaff'; break;
        case 'EPIC': color = '#bd00ff'; break;
        case 'LEGENDARY': color = '#ffaa00'; break;
      }
      rarityEl.style.color = color;
    }

    // Get current progression
    let currentLevel = 1;
    let currentXP = 0;
    let equippedPerks = [];

    if (typeof OrbitGame !== 'undefined' && OrbitGame.storage) {
      const data = OrbitGame.storage.getJSON() || {};
      if (data.sphereProgression && data.sphereProgression[equipped]) {
         currentLevel = data.sphereProgression[equipped].level || 1;
         currentXP = data.sphereProgression[equipped].xp || 0;
         equippedPerks = data.sphereProgression[equipped].perks || [];
      }
    }

    if (levelEl) {
      levelEl.innerText = `LEVEL ${currentLevel}/${sphereMeta.maxLevel}`;
    }

    if (xpBarEl) {
      if (currentLevel >= sphereMeta.maxLevel) {
        xpBarEl.style.width = '100%';
        xpBarEl.style.background = '#0aff64';
      } else {
        const xpNeeded = sphereMeta.xpCurve[currentLevel] || 1;
        const prevXpNeeded = sphereMeta.xpCurve[currentLevel - 1] || 0;
        const progress = Math.max(0, Math.min(100, ((currentXP - prevXpNeeded) / (xpNeeded - prevXpNeeded)) * 100));
        xpBarEl.style.width = `${progress}%`;
        xpBarEl.style.background = '#00e5ff';
      }
    }

    // Render Perk Slots
    if (perkSlotsContainer) {
      perkSlotsContainer.innerHTML = '';

      // Determine max slots available for this level
      let maxSlots = 0;
      for (const [lvlStr, slots] of Object.entries(sphereMeta.perkSlotsAtLevel)) {
        if (parseInt(lvlStr) <= currentLevel) {
           maxSlots = Math.max(maxSlots, slots);
        }
      }

      // Also get absolute max slots for UI visual hints
      let absoluteMaxSlots = 0;
      for (const slots of Object.values(sphereMeta.perkSlotsAtLevel)) {
         absoluteMaxSlots = Math.max(absoluteMaxSlots, slots);
      }

      const allPerks = (typeof OrbitGame !== 'undefined' && OrbitGame.entities.perks.registry) ? OrbitGame.entities.perks.registry : {};

      for (let i = 0; i < absoluteMaxSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'perk-slot';

        if (i < maxSlots) {
           // Slot is unlocked
           if (equippedPerks[i] && allPerks[equippedPerks[i]]) {
             const p = allPerks[equippedPerks[i]];
             slotDiv.innerHTML = `<span style="font-size: 1.2rem;" title="${p.name}">${p.icon}</span>`;
             slotDiv.style.border = '1px solid #00e5ff';
             slotDiv.style.background = 'rgba(0, 229, 255, 0.1)';
             slotDiv.onclick = () => openPerkSelectionModal(i);
             slotDiv.style.cursor = 'pointer';
           } else {
             slotDiv.innerHTML = '<span style="color: #666; font-size: 1.2rem;">+</span>';
             slotDiv.className += ' empty';
             slotDiv.style.border = '1px dashed #666';
             slotDiv.onclick = () => openPerkSelectionModal(i);
             slotDiv.style.cursor = 'pointer';
           }
        } else {
           // Slot is locked
           slotDiv.innerHTML = '<span style="color: #333; font-size: 1rem;">🔒</span>';
           slotDiv.style.border = '1px solid #333';
           slotDiv.style.background = 'rgba(0,0,0,0.5)';
           slotDiv.title = 'Reach higher level to unlock';
        }

        slotDiv.style.width = '40px';
        slotDiv.style.height = '40px';
        slotDiv.style.display = 'flex';
        slotDiv.style.alignItems = 'center';
        slotDiv.style.justifyContent = 'center';
        slotDiv.style.borderRadius = '8px';

        perkSlotsContainer.appendChild(slotDiv);
      }
    }
  }

  function updateWorkshopUI() {
    const equipped = typeof activeSkin !== 'undefined' ? activeSkin : 'classic';

    // Equipped hero section
    const heroPreview = document.getElementById('workshopEquippedPreview');
    const heroName    = document.getElementById('workshopEquippedName');
    const heroPerk    = document.getElementById('workshopEquippedPerk');
    if (heroPreview) {
      heroPreview.dataset.skin = equipped;
      if (typeof renderShopOrbPreview === 'function') renderShopOrbPreview(heroPreview, equipped);
    }
    if (heroName) heroName.innerText = SKIN_NAMES[equipped] || equipped.toUpperCase();
    if (heroPerk) heroPerk.innerText = SKIN_PERKS[equipped] || '';

    updateWorkshopEquippedDetails(equipped);

    // Profile sphere preview (if on profile view)
    const profilePreview = document.getElementById('profileSpherePreview');
    if (profilePreview) {
      profilePreview.dataset.skin = equipped;
      if (typeof renderShopOrbPreview === 'function') renderShopOrbPreview(profilePreview, equipped);
    }

    // Workshop grid items
    const allSkins = ['classic', 'skull', 'prism', 'echo', 'crimson', 'pulse', 'ghost', 'storm'];
    allSkins.forEach(id => {
      const card    = document.getElementById('witem-' + id);
      const btn     = document.getElementById('wbtn-' + id);
      const preview = card ? card.querySelector('.item-preview') : null;
      if (!card || !btn) return;

      if (preview && typeof renderShopOrbPreview === 'function') renderShopOrbPreview(preview, id);

      const isEquipped = equipped === id;
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
        btn.innerText = 'EQUIPPED';
        btn.disabled  = true;
      } else if (isOwned) {
        btn.classList.add('owned-state');
        btn.innerText = 'EQUIP';
        const _id = id;
        btn.onclick = () => {
          if (typeof audioCtx !== 'undefined' && audioCtx) soundUIClick();
          equipSkin(_id);
        };
      } else {
        card.classList.add('is-locked');
        btn.classList.add('locked-state');
        btn.innerText = '🔒 LOCKED';
        btn.disabled  = true;
      }
    });
  }

  // ── NAVIGATION ────────────────────────────────────────────────

  function toggleShop(show) {
    if (show && typeof switchMenuTab === 'function') {
      switchMenuTab('shop');
    }
  }

  // ── EXPORTS ───────────────────────────────────────────────────

  OG.ui.shop.toggleShop       = toggleShop;
  OG.ui.shop.updateShopUI     = updateShopUI;
  OG.ui.shop.updateWorkshopUI = updateWorkshopUI;
  OG.ui.shop.buyItem          = buyItem;
  OG.ui.shop.equipSkin        = equipSkin;
})(window);
