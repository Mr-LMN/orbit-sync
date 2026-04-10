// js/entities/perks/registry.js

(function(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  OG.entities = OG.entities || {};
  OG.entities.perks = OG.entities.perks || {};

  const perks = {
    // --- LIVES ---
    'lives_1': {
      id: 'lives_1',
      name: 'Life Core I',
      description: '+1 Max Lives',
      icon: '❤️'
    },
    'lives_2': {
      id: 'lives_2',
      name: 'Life Core II',
      description: '+2 Max Lives',
      icon: '❤️❤️'
    },

    // --- COIN BOOSTS ---
    'coin_bonus_1': {
      id: 'coin_bonus_1',
      name: 'Coin Magnet I',
      description: '+10% Coins Earned',
      icon: '🪙'
    },
    'coin_bonus_2': {
      id: 'coin_bonus_2',
      name: 'Coin Magnet II',
      description: '+25% Coins Earned',
      icon: '🪙'
    },

    // --- RADIUS ---
    'radius_1': {
      id: 'radius_1',
      name: 'Echo Trail I',
      description: '+10% Hit Radius',
      icon: '🔵'
    },
    'radius_2': {
      id: 'radius_2',
      name: 'Echo Trail II',
      description: '+20% Hit Radius',
      icon: '🔵'
    },

    // --- GAMEPLAY TWEAKS ---
    'combo_perfect': {
      id: 'combo_perfect',
      name: 'Crimson Rail',
      description: 'Combo +1 on Perfect Hit',
      icon: '🔥'
    },
    'near_miss_coin': {
      id: 'near_miss_coin',
      name: 'Pulse Core',
      description: 'Near Miss gives 1 Coin',
      icon: '⚡'
    },
    'ghost_save': {
      id: 'ghost_save',
      name: 'Ghost Orb',
      description: 'Survive 1 Fatal Hit per Run',
      icon: '👻'
    },
    'flawless_bonus': {
      id: 'flawless_bonus',
      name: 'Storm Core',
      description: '+5 Coins on Flawless Stage',
      icon: '🌩️'
    }
  };

  OG.entities.perks.registry = perks;
})(window);
