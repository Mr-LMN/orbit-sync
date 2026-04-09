(function initShop(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.shop = OG.ui.shop || {};

  window.purchasePremium = function() {
      if (typeof isPremium !== 'undefined' && isPremium) return;

      // Simulate real-money purchase success
      if (typeof audioCtx !== 'undefined') playPop(10, true);
      isPremium = true;
      if (typeof saveData === 'function') saveData();
      updateShopUI();

      if (typeof createPopup === 'function' && typeof centerObj !== 'undefined') {
          createPopup(centerObj.x, centerObj.y - 40, 'PREMIUM UNLOCKED', '#ffd700');
          createPopup(centerObj.x, centerObj.y, 'NO ADS & 2X COINS', '#ffd700');
      }

      // Refresh UI that might be affected
      if (typeof updatePersistentCoinUI === 'function') updatePersistentCoinUI();
  };

  function toggleShop(show) {
    // If shopModal no longer exists, we don't need this bottom animation.
    // toggleShop is mostly used by the '+' icon to buy premium currencies now.
    // For now, we'll route it to open the Workshop tab to look at items.
    if (show && typeof switchMenuTab === 'function') {
      switchMenuTab('workshop');
    }
  }

  function updateShopUI() {
    updatePersistentCoinUI();

    // Update Premium Button State
    const premiumBtn = document.getElementById('btn-premium');
    if (premiumBtn) {
        if (typeof isPremium !== 'undefined' && isPremium) {
            premiumBtn.innerText = 'OWNED';
            premiumBtn.classList.add('equipped');
            premiumBtn.disabled = true;
        } else {
            premiumBtn.innerText = 'BUY £2.99';
            premiumBtn.classList.remove('equipped');
            premiumBtn.disabled = false;
        }
    }
    const items = ['classic', 'skull', 'prism', 'echo', 'crimson', 'pulse', 'ghost', 'storm'];
    items.forEach(id => {
      let btn = document.getElementById('btn-' + id); let card = document.getElementById('item-' + id);
      let preview = card ? card.querySelector('.item-preview') : null;
      if (preview) {
        if (!preview.dataset.skin) preview.dataset.skin = id;
        renderShopOrbPreview(preview, preview.dataset.skin);
      }
      if (activeSkin === id) { btn.className = 'buy-btn btn-equipped'; btn.innerText = 'Equipped'; card.classList.add('equipped'); }
      else if (unlockedSkins.includes(id)) { btn.className = 'buy-btn btn-owned'; btn.innerText = 'Equip'; card.classList.remove('equipped'); btn.onclick = () => equipSkin(id); }
      else { card.classList.remove('equipped'); }
    });
    const goalEl = document.getElementById('shopNextGoal');
    if (goalEl) {
      const goals = [
        { id: 'skull', cost: 50 }, { id: 'prism', cost: 150 },
        { id: 'crimson', cost: 150 }, { id: 'echo', cost: 200 },
        { id: 'pulse', cost: 300 }, { id: 'storm', cost: 350 },
        { id: 'ghost', cost: 400 }
      ];
      const nextGoal = goals.find(g => !unlockedSkins.includes(g.id));
      if (nextGoal) {
        const needed = Math.max(0, nextGoal.cost - Math.floor(globalCoins));
        goalEl.innerText = needed > 0 ? `NEXT UNLOCK: ${needed} COINS AWAY` : 'READY TO UNLOCK';
      } else {
        goalEl.innerText = 'ALL CURRENT ITEMS UNLOCKED';
      }
    }
  }

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
    updateShopUI();
  }

  OG.ui.shop.toggleShop = toggleShop;
  OG.ui.shop.updateShopUI = updateShopUI;
  OG.ui.shop.buyItem = buyItem;
  OG.ui.shop.equipSkin = equipSkin;
})(window);
