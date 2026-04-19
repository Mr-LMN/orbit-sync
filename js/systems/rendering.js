(function initRenderingSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.rendering = OG.systems.rendering || {};

  function wrapPolygonIndex(index, sides) {
    return ((index % sides) + sides) % sides;
  }

  function getPointOnShape(t, shape, cx, cy, radius) {
    function getTrianglePoint(angle, tx, ty, tradius) {
      const tau = Math.PI * 2;
      let norm = ((angle % tau) + tau) % tau;
      if (Math.abs(norm - tau) < 1e-10) norm = 0;
      const sideSize = tau / 3;
      const rawIndex = Math.floor(norm / sideSize);
      const sideIndex = wrapPolygonIndex(rawIndex, 3);
      const localT = (norm - rawIndex * sideSize) / sideSize;

      // Wider-base isosceles triangle for cleaner gameplay/readability
      const corners = [
        { x: tx, y: ty - tradius * 1.08 },
        { x: tx + tradius * 0.92, y: ty + tradius * 0.62 },
        { x: tx - tradius * 0.92, y: ty + tradius * 0.62 }
      ];

      const a = corners[sideIndex];
      const b = corners[(sideIndex + 1) % 3];

      return {
        x: a.x + (b.x - a.x) * localT,
        y: a.y + (b.y - a.y) * localT
      };
    }

    if (shape === 'circle') return { x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius };
    if (shape === 'square') {
      let a = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (Math.abs(a - Math.PI * 2) < 1e-10) a = 0;
      const sector = Math.floor((a / (Math.PI * 2)) * 4);
      const local = (a % (Math.PI / 2)) / (Math.PI / 2);
      if (sector === 0) return { x: cx + radius, y: cy - radius + (local * radius * 2) };
      if (sector === 1) return { x: cx + radius - (local * radius * 2), y: cy + radius };
      if (sector === 2) return { x: cx - radius, y: cy + radius - (local * radius * 2) };
      return { x: cx - radius + (local * radius * 2), y: cy - radius };
    }
    if (shape === 'diamond') {
      const corners = [
        { x: cx, y: cy - radius },
        { x: cx + radius, y: cy },
        { x: cx, y: cy + radius },
        { x: cx - radius, y: cy }
      ];
      let normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (Math.abs(normalized - Math.PI * 2) < 1e-10) normalized = 0;
      const sectorSize = Math.PI * 2 / 4;
      const rawIdx = Math.floor(normalized / sectorSize);
      const sectorIdx = wrapPolygonIndex(rawIdx, 4);
      const nextSectorIdx = wrapPolygonIndex(sectorIdx + 1, 4);
      const progress = (normalized - rawIdx * sectorSize) / sectorSize;
      const p1 = corners[sectorIdx];
      const p2 = corners[nextSectorIdx];
      return { x: p1.x + (p2.x - p1.x) * progress, y: p1.y + (p2.y - p1.y) * progress };
    }
    if (shape === 'triangle') {
      return getTrianglePoint(t, cx, cy, radius);
    }

    if (shape === 'phoenix') {
      const sides = 10;
      const rotation = -Math.PI / 2;
      const corners = [];
      let phase = 0;
      if (typeof window.OrbitGame !== 'undefined' && window.OrbitGame.systems) {
         if (window.OrbitGame.systems.phoenixBossV2 && window.OrbitGame.systems.phoenixBossV2.isActive()) {
            phase = window.OrbitGame.systems.phoenixBossV2.getPhaseIdx() || 0;
         } else if (window.OrbitGame.systems.phoenixBoss && window.OrbitGame.systems.phoenixBoss.isActive()) {
            phase = window.OrbitGame.systems.phoenixBoss.getPhaseIdx() || 0;
         }
      }
      for (let i = 0; i < sides; i++) {
        const a = rotation + (i * Math.PI * 2 / sides);
        // Odd points dip inwards creating a spiky 'wings/flame' shape
        // Higher phase = sharper spikes / deeper dips
        const dip = Math.max(0.2, 0.7 - (phase * 0.1)); 
        const rAdjust = (i % 2 === 0) ? radius * 1.05 : radius * dip;
        corners.push({ x: cx + Math.cos(a) * rAdjust, y: cy + Math.sin(a) * rAdjust });
      }
      
      let normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (Math.abs(normalized - Math.PI * 2) < 1e-10) normalized = 0;
      const sectorSize = Math.PI * 2 / sides;
      const rawIdx = Math.floor(normalized / sectorSize);
      const sectorIdx = wrapPolygonIndex(rawIdx, sides);
      const nextSectorIdx = wrapPolygonIndex(sectorIdx + 1, sides);
      const progress = (normalized - rawIdx * sectorSize) / sectorSize;
      const p1 = corners[sectorIdx];
      const p2 = corners[nextSectorIdx];
      let ptX = p1?.x + (p2?.x - p1?.x) * progress;
      let ptY = p1?.y + (p2?.y - p1?.y) * progress;
      return { x: ptX || cx, y: ptY || cy };
    }

    if (shape === 'pentagon' || shape === 'hexagon' || shape === 'abyss') {
      const sides = (shape === 'pentagon') ? 5 : (shape === 'hexagon') ? 6 : (3 + Math.floor((window.abyssDepth || 0) / 10));
      const rotation = -Math.PI / 2 + ((window.abyssDepth || 0) * 0.1);
      const corners = [];
      for (let i = 0; i < sides; i++) {
        const a = rotation + (i * Math.PI * 2 / sides);
        // Adjust radius so the path matches the orbit radius
        const cosApothem = Math.cos(Math.PI / sides);
        let rAdjust = isFinite(cosApothem) && cosApothem !== 0 ? radius / cosApothem : radius;

        // Add fractal/abstract displacement for abyss shapes
        if (shape === 'abyss') {
            const phase = (window.abyssDepth || 0) + i;
            rAdjust *= 0.85 + (Math.sin(phase * 1.5) * 0.3) + (Math.cos(phase * 2.1) * 0.2);
        }

        corners.push({ x: cx + Math.cos(a) * rAdjust, y: cy + Math.sin(a) * rAdjust });
      }
      // Use `let` so we can apply the near-2π guard (same as diamond/phoenix)
      let normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (Math.abs(normalized - Math.PI * 2) < 1e-10) normalized = 0;
      const sectorSize = Math.PI * 2 / sides;
      const rawIdx = Math.floor(normalized / sectorSize);
      const sectorIdx = wrapPolygonIndex(rawIdx, sides);
      const nextSectorIdx = wrapPolygonIndex(sectorIdx + 1, sides);
      const progress = Math.max(0, Math.min(1, (normalized - rawIdx * sectorSize) / sectorSize));
      const p1 = corners[sectorIdx];
      const p2 = corners[nextSectorIdx];
      let ptX = (p1 != null ? p1.x : cx) + ((p2 != null ? p2.x : cx) - (p1 != null ? p1.x : cx)) * progress;
      let ptY = (p1 != null ? p1.y : cy) + ((p2 != null ? p2.y : cy) - (p1 != null ? p1.y : cy)) * progress;

      // Add secondary abstraction layer for abyss (curved/jagged edges)
      if (shape === 'abyss') {
          const edgeOffset = Math.sin(progress * Math.PI) * (radius * 0.15) * Math.sin((window.abyssDepth || 0) * 0.5 + sectorIdx);
          const tangentA = Math.atan2(p2?.y - p1?.y, p2?.x - p1?.x) + Math.PI/2;
          ptX += Math.cos(tangentA) * edgeOffset;
          ptY += Math.sin(tangentA) * edgeOffset;
      }

      if (!isFinite(ptX) || !isFinite(ptY)) {
        ptX = p1 != null ? p1.x : cx;
        ptY = p1 != null ? p1.y : cy;
      }
      return { x: ptX, y: ptY };
    }

    return { x: cx, y: cy };
  }

  function buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps = 40) {
    if (shape === 'diamond') {
      const rawSpan = endAngle - startAngle;
      let span = ((rawSpan) + Math.PI * 2) % (Math.PI * 2);
      if (span === 0 && rawSpan !== 0) span = Math.PI * 2;
      const sectorSize = Math.PI / 2;
      const normalize = (value) => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      let startNorm = normalize(startAngle);
      if (Math.abs(startNorm - Math.PI * 2) < 1e-10) startNorm = 0;
      const endUnwrapped = startNorm + span;
      const pointAngles = [startNorm];

      const firstBoundaryIndex = Math.floor(startNorm / sectorSize) + 1;
      const boundaryCount = Math.floor((endUnwrapped - (firstBoundaryIndex * sectorSize)) / sectorSize) + 1;
      for (let i = 0; i < boundaryCount; i++) {
        const boundary = (firstBoundaryIndex + i) * sectorSize;
        if (boundary > startNorm && boundary < endUnwrapped) pointAngles.push(boundary);
      }
      pointAngles.push(endUnwrapped);

      const fallbackSteps = Math.max(2, Math.ceil(steps * span / (Math.PI * 2)));
      const needsFallbackSampling = pointAngles.length <= 2 && fallbackSteps > 2;

      ctx.beginPath();
      if (needsFallbackSampling) {
        for (let i = 0; i <= fallbackSteps; i++) {
          const t = startNorm + (span * i / fallbackSteps);
          const pt = getPointOnShape(t, 'diamond', cx, cy, radius);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        return;
      }

      pointAngles.forEach((unwrappedAngle, idx) => {
        const pt = getPointOnShape(unwrappedAngle, 'diamond', cx, cy, radius);
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      return;
    }
    const rawSpan = endAngle - startAngle;
    let span = ((rawSpan) + Math.PI * 2) % (Math.PI * 2);
    if (span === 0 && rawSpan !== 0) span = Math.PI * 2;
    const actualSteps = Math.max(2, Math.ceil(steps * span / (Math.PI * 2)));
    ctx.beginPath();
    for (let i = 0; i <= actualSteps; i++) {
      const t = startAngle + (span * i / actualSteps);
      const pt = getPointOnShape(t, shape, cx, cy, radius);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
  }

  OG.systems.rendering.getPointOnShape = getPointOnShape;
  OG.systems.rendering.buildShapePath = buildShapePath;
})(window);
