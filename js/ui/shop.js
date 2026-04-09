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
