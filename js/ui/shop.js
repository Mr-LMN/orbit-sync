(function initShop(window) {
  const OG = window.OrbitGame;
  OG.ui = OG.ui || {};
  OG.ui.shop = OG.ui.shop || {};

  function toggleShop(show) {
    ui.shopModal.style.bottom = show ? '0' : '-100%';
    updateShopUI();
  }

  function updateShopUI() {
    updatePersistentCoinUI();
    const items = ['classic', 'skull', 'prism', 'echo', 'crimson'];
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
        { id: 'crimson', cost: 150 }, { id: 'echo', cost: 200 }
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
