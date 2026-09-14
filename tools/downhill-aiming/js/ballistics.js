// Ballistics geometry and solver for the downhill-aiming model.
// Units: D, R, H in metres; v in metres per second; g in m/s^2. All metric,
// matching the interactive controls and the write-up.

const G_MS2 = 9.81; // standard gravity, m/s^2

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Given line-of-sight distance D (m), depression angle alpha (deg),
 * muzzle velocity v (m/s), solve for the required aim depression theta (deg)
 * and hold correction beta (deg) using the vacuum trajectory model.
 *
 * H = R tan(theta) + g R^2 / (2 v^2 cos^2 theta)
 * tan(theta) = ( sqrt(v^4 - g^2 R^2 + 2 g v^2 H) - v^2 ) / (g R)
 */
function solveDownhillAiming(D_m, alphaDeg, v_ms, g_ms2 = G_MS2) {
  const alpha = toRad(alphaDeg);
  const R_m = D_m * Math.cos(alpha);
  const H_m = D_m * Math.sin(alpha);

  const disc = v_ms ** 4 - g_ms2 ** 2 * R_m ** 2 + 2 * g_ms2 * v_ms ** 2 * H_m;

  if (R_m <= 1e-9) {
    // Degenerate: shot is straight down, tan(theta) undefined in this model.
    return {
      R_m, H_m,
      disc, valid: false, thetaDeg: null, betaDeg: null,
    };
  }

  if (disc < 0) {
    return {
      R_m, H_m,
      disc, valid: false, thetaDeg: null, betaDeg: null,
    };
  }

  const tanTheta = (Math.sqrt(disc) - v_ms ** 2) / (g_ms2 * R_m);
  const theta = Math.atan(tanTheta);
  const thetaDeg = toDeg(theta);
  const betaDeg = alphaDeg - thetaDeg;

  return {
    R_m, H_m,
    disc,
    valid: true,
    thetaDeg,
    betaDeg,
    tanTheta,
  };
}

/**
 * Sample the ideal trajectory y(x) for 0 <= x <= R, given launch angle theta (rad),
 * muzzle velocity v (m/s) and gravity g (m/s^2). Returns metres, y measured
 * downward-positive (matches the paper's convention).
 */
function trajectoryPoints(R_m, thetaRad, v_ms, g_ms2, samples = 60) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const x = (R_m * i) / samples;
    const t = x / (v_ms * Math.cos(thetaRad));
    const y = v_ms * Math.sin(thetaRad) * t + 0.5 * g_ms2 * t * t;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Horizontal-distance rule equivalent range: R = D cos(alpha), in metres.
 */
function horizontalRuleRange(D_m, alphaDeg) {
  return D_m * Math.cos(toRad(alphaDeg));
}
