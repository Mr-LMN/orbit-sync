(function initTargetDefinitions(window, OG) {

  const targetDefinitions = {
    standard: {
      type: 'standard',
      renderer: 'standard',
      hitProfile: 'standard',
      behaviour: 'standard',
      mechanic: null,
      variant: null,
      renderStyle: null,
      canMove: true,
      defaults: {
        color: '#ff3366',
        hp: 1,
        move: 0,
        moveSpeed: 0
      }
    },
    corner: {
      type: 'corner',
      renderer: 'corner',
      hitProfile: 'corner',
      behaviour: 'corner',
      mechanic: 'corner',
      canMove: true,
      defaults: {
        color: '#78f8ff',
        hp: 1,
        move: 0,
        moveSpeed: 0,
        cornerBackWindow: 0.135,
        cornerOvershootWindow: 0.135,
        cornerPerfectWindow: 0.015,
        cornerHitboxExpand: 0.028,
        cornerVisualThickness: 1.0
      }
    },
    dual: {
      type: 'dual',
      renderer: 'dual',
      hitProfile: 'dual',
      behaviour: 'dual',
      mechanic: 'dual',
      canMove: true,
      defaults: {
        color: '#2ff6ff',
        hp: 1,
        move: 0,
        moveSpeed: 0,
        dualState: 'full',
        leftColor: '#2ff6ff',
        rightColor: '#ff4fd8',
        coreColor: '#ffffff',
        shellColor: '#ffd54a'
      }
    },
    splitRoot: {
      type: 'fracture',
      renderer: 'split',
      hitProfile: 'split',
      behaviour: 'split',
      mechanic: 'split',
      canMove: true,
      defaults: {
        color: '#2ff6ff',
        hp: 1,
        move: 0,
        moveSpeed: 0,
        splitOnHit: true,
        splitDepth: 0,
        splitGeneration: 0,
        splitFamilyId: null
      }
    },
    splitChild: {
      type: 'shard',
      renderer: 'split',
      hitProfile: 'split',
      behaviour: 'split',
      mechanic: 'splitChild',
      canMove: true,
      defaults: {
        color: '#2ff6ff',
        hp: 1,
        move: 0,
        moveSpeed: 0,
        splitOnHit: true,
        splitDepth: 1,
        splitGeneration: 1,
        splitFamilyId: null
      }
    }
  };

  function getTargetDefinition(type) {
    return targetDefinitions[type] || targetDefinitions.standard;
  }

  OG.entities.targetDefinitions = {
    all: targetDefinitions,
    get: getTargetDefinition
  };
})(window, window.OG);