// Ballistics geometry and solver for the downhill-aiming model.
// Units: D, R, H in yards; v in feet per second internally converted; g in ft/s^2.
// Angles in degrees for UI, radians internally.

const FT_PER_YARD = 3;
const G_FTS2 = 32.174; // standard gravity, ft/s^2

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Given line-of-sight distance D (yards), depression angle alpha (deg),
 * muzzle velocity v (ft/s), solve for the required aim depression theta (deg)
 * and hold correction beta (deg) using the vacuum trajectory model.
 *
 * H = R tan(theta) + g R^2 / (2 v^2 cos^2 theta)
 * tan(theta) = ( sqrt(v^4 - g^2 R^2 + 2 g v^2 H) - v^2 ) / (g R)
 *
 * R, H are converted to feet for consistency with v (ft/s) and g (ft/s^2).
 */
function solveDownhillAiming(D_yd, alphaDeg, v_fts, g_fts2 = G_FTS2) {
  const alpha = toRad(alphaDeg);
  const D_ft = D_yd * FT_PER_YARD;
  const R_ft = D_ft * Math.cos(alpha);
  const H_ft = D_ft * Math.sin(alpha);

  const disc = v_fts ** 4 - g_fts2 ** 2 * R_ft ** 2 + 2 * g_fts2 * v_fts ** 2 * H_ft;

  if (R_ft <= 1e-9) {
    // Degenerate: shot is straight down, tan(theta) undefined in this model.
    return {
      R_ft, H_ft, R_yd: R_ft / FT_PER_YARD, H_yd: H_ft / FT_PER_YARD,
      disc, valid: false, thetaDeg: null, betaDeg: null,
    };
  }

  if (disc < 0) {
    return {
      R_ft, H_ft, R_yd: R_ft / FT_PER_YARD, H_yd: H_ft / FT_PER_YARD,
      disc, valid: false, thetaDeg: null, betaDeg: null,
    };
  }

  const tanTheta = (Math.sqrt(disc) - v_fts ** 2) / (g_fts2 * R_ft);
  const theta = Math.atan(tanTheta);
  const thetaDeg = toDeg(theta);
  const betaDeg = alphaDeg - thetaDeg;

  return {
    R_ft, H_ft,
    R_yd: R_ft / FT_PER_YARD,
    H_yd: H_ft / FT_PER_YARD,
    disc,
    valid: true,
    thetaDeg,
    betaDeg,
    tanTheta,
  };
}

/**
 * Sample the ideal trajectory y(x) for 0 <= x <= R, given launch angle theta (rad),
 * muzzle velocity v (ft/s) and gravity g (ft/s^2). Returns feet, y measured
 * downward-positive (matches the paper's convention).
 */
function trajectoryPoints(R_ft, thetaRad, v_fts, g_fts2, samples = 60) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const x = (R_ft * i) / samples;
    const t = x / (v_fts * Math.cos(thetaRad));
    const y = v_fts * Math.sin(thetaRad) * t + 0.5 * g_fts2 * t * t;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Horizontal-distance rule equivalent range: R = D cos(alpha), in yards.
 */
function horizontalRuleRange(D_yd, alphaDeg) {
  return D_yd * Math.cos(toRad(alphaDeg));
}
