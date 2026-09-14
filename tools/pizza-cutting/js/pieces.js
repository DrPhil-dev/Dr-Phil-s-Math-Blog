/* Lazy caterer's problem: geometry + counting helpers. */

/** Maximum pieces from n straight cuts: p(n) = n(n+1)/2 + 1 */
function maxPieces(n) {
  return (n * (n + 1)) / 2 + 1;
}

/**
 * Generate n chord endpoints for a circle of radius R centered at (0,0),
 * chosen so that (for reasonable n) no two chords are parallel and no
 * three are concurrent, matching the "optimal" cutting arrangement.
 *
 * Each cut is a full chord through the circle at a distinct angle,
 * offset slightly from a plain diameter so successive cuts don't all
 * cross at the exact center (which would violate "no three concurrent").
 *
 * Returns an array of { x1, y1, x2, y2 } in the circle's own coordinates.
 */
function generateCuts(n, R) {
  const cuts = [];
  for (let i = 0; i < n; i++) {
    // Spread angles evenly around a half-turn so no two lines are parallel.
    const angle = (Math.PI * i) / n + 0.09 * (i + 1);
    // Perpendicular offset from center, scaled down and varied per cut,
    // small enough that every chord still spans the full circle interior
    // and no three chords pass through a common point.
    const offsetFrac = 0.14 * Math.sin(1.7 * (i + 1) + 0.4);
    const offset = offsetFrac * R;

    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    // Direction of the chord itself is perpendicular to (nx, ny).
    const dx = -ny;
    const dy = nx;

    const cx = nx * offset;
    const cy = ny * offset;

    const half = Math.sqrt(Math.max(R * R - offset * offset, 0)) * 1.08;

    cuts.push({
      x1: cx - dx * half,
      y1: cy - dy * half,
      x2: cx + dx * half,
      y2: cy + dy * half,
    });
  }
  return cuts;
}

/**
 * Approximate label positions for each of the p(n) regions by sampling
 * points inside the circle, classifying each by which side of every cut
 * line it falls on, grouping identical signatures, and returning the
 * centroid of each group's sample points (capped at the expected piece
 * count, largest groups first).
 */
function estimateRegionLabelPoints(cuts, R, expectedCount, gridN = 420) {
  const buckets = new Map();
  for (let ix = 0; ix < gridN; ix++) {
    for (let iy = 0; iy < gridN; iy++) {
      const x = -R + (2 * R * (ix + 0.5)) / gridN;
      const y = -R + (2 * R * (iy + 0.5)) / gridN;
      if (x * x + y * y > (R * 0.97) * (R * 0.97)) continue;

      let sig = "";
      for (const c of cuts) {
        const side =
          (c.x2 - c.x1) * (y - c.y1) - (c.y2 - c.y1) * (x - c.x1) >= 0 ? "1" : "0";
        sig += side;
      }
      let bucket = buckets.get(sig);
      if (!bucket) {
        bucket = { sumX: 0, sumY: 0, count: 0 };
        buckets.set(sig, bucket);
      }
      bucket.sumX += x;
      bucket.sumY += y;
      bucket.count += 1;
    }
  }

  const groups = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  const points = groups
    .slice(0, expectedCount)
    .map((g) => ({ x: g.sumX / g.count, y: g.sumY / g.count }));
  return points;
}

/**
 * Filter label points down to those spaced at least `minDist` apart (same
 * units as the points), keeping earlier (larger) regions preferentially.
 * Used to avoid printing overlapping numbers on tiny central slivers when n
 * is large; the true piece count is always shown in the numeric readout
 * regardless of how many labels actually fit on the diagram.
 */
function declutterLabelPoints(points, minDist) {
  const kept = [];
  for (const p of points) {
    const tooClose = kept.some((k) => {
      const dx = k.x - p.x;
      const dy = k.y - p.y;
      return Math.sqrt(dx * dx + dy * dy) < minDist;
    });
    if (!tooClose) kept.push(p);
  }
  return kept;
}
