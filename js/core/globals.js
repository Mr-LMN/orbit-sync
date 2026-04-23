(function initGlobals(window) {
  const OG = window.OrbitGame = window.OrbitGame || {};
  window.OG = OG;

  // Level 1 Namespaces
  OG.core = OG.core || {};
  OG.config = OG.config || {};
  OG.state = OG.state || {};
  OG.utils = OG.utils || {};
  OG.storage = OG.storage || {};
  OG.dom = OG.dom || {};
  OG.audio = OG.audio || {};
  OG.ui = OG.ui || {};
  OG.entities = OG.entities || {};
  OG.systems = OG.systems || {};
  OG.data = OG.data || {};
  OG.boot = OG.boot || {};
  OG.debug = OG.debug || {};

  // Level 2 Namespaces - UI
  OG.ui.shop = OG.ui.shop || {};
  OG.ui.overlay = OG.ui.overlay || {};
  OG.ui.menus = OG.ui.menus || {};
  OG.ui.hud = OG.ui.hud || {};
  OG.ui.settings = OG.ui.settings || {};
  OG.ui.share = OG.ui.share || {};

  // Level 2 Namespaces - Entities
  OG.entities.particles = OG.entities.particles || {};
  OG.entities.effects = OG.entities.effects || {};
  OG.entities.target = OG.entities.target || {};
  OG.entities.boss = OG.entities.boss || {};
  OG.entities.spheres = OG.entities.spheres || {};
  OG.entities.perks = OG.entities.perks || {};

  // Level 2 Namespaces - Systems
  OG.systems.rendering = OG.systems.rendering || {};
  OG.systems.spawning = OG.systems.spawning || {};
  OG.systems.bossCores = OG.systems.bossCores || {};
  OG.systems.scoring = OG.systems.scoring || {};
  OG.systems.progression = OG.systems.progression || {};
  OG.systems.collision = OG.systems.collision || {};
  OG.systems.prestige = OG.systems.prestige || {};
  OG.systems.ceremony = OG.systems.ceremony || {};
  OG.systems.challenges = OG.systems.challenges || {};
  OG.systems.phoenixBoss = OG.systems.phoenixBoss || {};
  OG.systems.eventRunner = OG.systems.eventRunner || {};
  OG.systems.tutorial = OG.systems.tutorial || {};

})(window);
