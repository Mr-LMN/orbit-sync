(function initWorldMeta(window) {
  const OG = window.OrbitGame;

  const WORLD_ORDER = ['world1', 'world2', 'world3'];
  const DEFAULT_WORLDS = {
    world1: {
      id: 'world1',
      title: 'ORBIT INIT',
      unlocked: true,
      stages: [],
      bossStageId: null,
      hardUnlocked: false
    },
    world2: {
      id: 'world2',
      title: 'PRISM BREAK',
      unlocked: false,
      stages: [],
      bossStageId: null,
      hardUnlocked: false
    },
    world3: {
      id: 'world3',
      title: 'SINGULARITY',
      unlocked: false,
      stages: [],
      bossStageId: null,
      hardUnlocked: false
    },
    bonus: {
      id: 'bonus',
      title: 'EVENT CIRCUIT',
      unlocked: false,
      stages: []
    }
  };

  function cloneWorldsTemplate() {
    return JSON.parse(JSON.stringify(DEFAULT_WORLDS));
  }

  function worldIdFromStageId(stageId) {
    const worldNum = parseInt(String(stageId || '').split('-')[0], 10);
    if (!Number.isFinite(worldNum)) return 'world1';
    return `world${worldNum}`;
  }

  function ensureWorlds() {
    OG.data = OG.data || {};
    if (!OG.data.WORLDS) OG.data.WORLDS = cloneWorldsTemplate();
    return OG.data.WORLDS;
  }

  function registerCampaignStages(stages) {
    const worlds = ensureWorlds();
    Object.keys(worlds).forEach((key) => {
      if (Array.isArray(worlds[key].stages)) worlds[key].stages = [];
      if (Object.prototype.hasOwnProperty.call(worlds[key], 'bossStageId')) worlds[key].bossStageId = null;
    });

    if (!Array.isArray(stages)) return worlds;

    stages.forEach((stage, idx) => {
      if (!stage || !stage.id) return;
      const worldId = stage.worldId || worldIdFromStageId(stage.id);
      stage.worldId = worldId;
      stage.stageIndex = typeof stage.stageIndex === 'number' ? stage.stageIndex : idx;

      if (!worlds[worldId]) {
        worlds[worldId] = { id: worldId, title: worldId.toUpperCase(), unlocked: false, stages: [] };
      }
      worlds[worldId].stages.push(stage.id);
      if (stage.boss) worlds[worldId].bossStageId = stage.id;
    });

    return worlds;
  }

  function unlockNextWorldByBoss(currentWorldId) {
    const worlds = ensureWorlds();
    const currentIdx = WORLD_ORDER.indexOf(currentWorldId);
    if (currentIdx < 0) return null;
    const nextWorldId = WORLD_ORDER[currentIdx + 1] || null;
    if (!nextWorldId || !worlds[nextWorldId]) return null;
    worlds[nextWorldId].unlocked = true;
    return nextWorldId;
  }

  function getWorldConfig(worldId) {
    const worlds = ensureWorlds();
    return worlds[worldId] || null;
  }

  OG.data = OG.data || {};
  OG.data.WORLDS = OG.data.WORLDS || cloneWorldsTemplate();
  OG.data.worldMeta = [
    { id: 1, label: 'WORLD 1' },
    { id: 2, label: 'WORLD 2' }
  ];
  OG.data.worldOrder = WORLD_ORDER.slice();
  OG.data.worldIdFromStageId = worldIdFromStageId;
  OG.data.registerCampaignStages = registerCampaignStages;
  OG.data.unlockNextWorldByBoss = unlockNextWorldByBoss;
  OG.data.getWorldConfig = getWorldConfig;
  window.WORLDS = OG.data.WORLDS;
})(window);
