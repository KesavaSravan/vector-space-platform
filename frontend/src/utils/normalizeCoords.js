/**
 * Computes scaling and centering parameters once on the complete dataset.
 * This prevents coordinate jumping when filters are applied dynamically.
 * Maps coordinates to a target range (e.g. -6 to +6).
 */
export function computeSceneTransform(points, targetRange = 12) {
  if (!points || points.length === 0) {
    return {
      center: [0, 0, 0],
      scale: 1
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  points.forEach((p) => {
    const [x, y, z] = p.coords;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;

    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    if (z !== undefined) {
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  });

  const center = [
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    minZ !== Infinity ? (minZ + maxZ) / 2 : 0
  ];

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const rangeZ = minZ !== Infinity ? maxZ - minZ : 0;

  const maxRange = Math.max(rangeX, rangeY, rangeZ, 1e-6);
  // Scale factor to map the largest span to targetRange
  const scale = targetRange / maxRange;

  return { center, scale };
}

/**
 * Transforms raw coordinates into normalized viewport coordinates
 * using precalculated center and scale.
 */
export function normalizeCoords(coords, transform) {
  const { center, scale } = transform;
  const [x, y, z = 0] = coords;

  return [
    (x - center[0]) * scale,
    (y - center[1]) * scale,
    (z - center[2]) * scale
  ];
}
