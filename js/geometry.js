/**
 * Geometry helpers for Monge's theorem: centers of similitude.
 *
 * For two circles with centers C1, C2 and radii r1, r2 (r1 !== r2):
 *   External center of similitude (exsimilicenter):
 *     E = (r2*C1 - r1*C2) / (r2 - r1)
 *   Internal center of similitude (insimilicenter):
 *     I = (r2*C1 + r1*C2) / (r2 + r1)
 *
 * These are the points that divide the line C1C2 externally / internally
 * in the ratio r1:r2. Monge's theorem: the three external centers of
 * similitude for three circles (taken pairwise) are collinear.
 */

const Geometry = (() => {
  /**
   * Compute the external center of similitude for two circles.
   * Returns null if the circles have (numerically) equal radii —
   * the external center is at infinity (the pair's tangents are parallel).
   */
  function externalCenter(c1, r1, c2, r2, eps = 0.05) {
    const denom = r2 - r1;
    if (Math.abs(denom) < eps) return null;
    return {
      x: (r2 * c1.x - r1 * c2.x) / denom,
      y: (r2 * c1.y - r1 * c2.y) / denom,
    };
  }

  /**
   * Compute the internal center of similitude for two circles.
   * Returns null if r1 + r2 is ~0 (degenerate, radii must be positive so
   * this only guards against pathological input).
   */
  function internalCenter(c1, r1, c2, r2, eps = 1e-6) {
    const denom = r2 + r1;
    if (Math.abs(denom) < eps) return null;
    return {
      x: (r2 * c1.x + r1 * c2.x) / denom,
      y: (r2 * c1.y + r1 * c2.y) / denom,
    };
  }

  /**
   * Given an array of {x,y} points (some may be null), fit a best-fit line
   * via least squares and return { point, direction, maxDeviation }.
   * Deviation is the perpendicular distance from each point to the fitted line.
   * If fewer than 2 valid points exist, returns null.
   */
  function fitLine(points) {
    const pts = points.filter(Boolean);
    if (pts.length < 2) return null;

    const n = pts.length;
    const meanX = pts.reduce((s, p) => s + p.x, 0) / n;
    const meanY = pts.reduce((s, p) => s + p.y, 0) / n;

    let sxx = 0,
      syy = 0,
      sxy = 0;
    for (const p of pts) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }

    // Principal direction via 2x2 symmetric eigen-decomposition (closed form).
    let angle;
    if (Math.abs(sxy) < 1e-9 && Math.abs(sxx - syy) < 1e-9) {
      angle = 0; // all points coincide; direction is arbitrary
    } else {
      angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    }
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const origin = { x: meanX, y: meanY };

    let maxDeviation = 0;
    for (const p of pts) {
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      // perpendicular distance = |cross product| between (p-origin) and dir
      const dist = Math.abs(dx * dir.y - dy * dir.x);
      if (dist > maxDeviation) maxDeviation = dist;
    }

    return { point: origin, direction: dir, maxDeviation };
  }

  /**
   * Distance from a point to a circle center (helper for hit-testing).
   */
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  return { externalCenter, internalCenter, fitLine, dist };
})();
