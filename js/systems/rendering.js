(function initRenderingSystem(window) {
  const OG = window.OrbitGame;
  OG.systems = OG.systems || {};
  OG.systems.rendering = OG.systems.rendering || {};

  function getPointOnShape(t, shape, cx, cy, radius) {
    function getTrianglePoint(angle, tx, ty, tradius) {
      const tau = Math.PI * 2;
      const norm = ((angle % tau) + tau) % tau;
      const sideSize = tau / 3;
      const rawIndex = Math.floor(norm / sideSize);
      const sideIndex = rawIndex % 3;
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
      const a = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
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
      const normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sectorSize = Math.PI * 2 / 4;
      const rawIdx = Math.floor(normalized / sectorSize);
      const sectorIdx = rawIdx % 4;
      const progress = (normalized - rawIdx * sectorSize) / sectorSize;
      const p1 = corners[sectorIdx];
      const p2 = corners[(sectorIdx + 1) % 4];
      return { x: p1.x + (p2.x - p1.x) * progress, y: p1.y + (p2.y - p1.y) * progress };
    }
    if (shape === 'triangle') {
      return getTrianglePoint(t, cx, cy, radius);
    }
    const sides = (shape === 'pentagon') ? 5 : 6;
    const rotation = -Math.PI / 2;
    const corners = [];
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * Math.PI * 2 / sides);
      corners.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
    }
    const normalized = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sectorSize = Math.PI * 2 / sides;
    const rawIdx = Math.floor(normalized / sectorSize);
    const sectorIdx = rawIdx % sides;
    const progress = (normalized - rawIdx * sectorSize) / sectorSize;
    const p1 = corners[sectorIdx];
    const p2 = corners[(sectorIdx + 1) % sides];
    return { x: p1.x + (p2.x - p1.x) * progress, y: p1.y + (p2.y - p1.y) * progress };
  }

  function buildShapePath(ctx, shape, cx, cy, radius, startAngle, endAngle, steps = 40) {
    if (shape === 'diamond') {
      const rawSpan = endAngle - startAngle;
      let span = ((rawSpan) + Math.PI * 2) % (Math.PI * 2);
      if (span === 0 && rawSpan !== 0) span = Math.PI * 2;
      const sectorSize = Math.PI / 2;
      const normalize = (value) => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const startNorm = normalize(startAngle);
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
