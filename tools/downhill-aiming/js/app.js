(function () {
  const svg = document.getElementById('stage');
  const els = {
    D: document.getElementById('inputD'),
    alpha: document.getElementById('inputAlpha'),
    v: document.getElementById('inputV'),
    g: document.getElementById('inputG'),
    Dval: document.getElementById('valD'),
    alphaVal: document.getElementById('valAlpha'),
    vVal: document.getElementById('valV'),
    gVal: document.getElementById('valG'),
    theta: document.getElementById('outTheta'),
    beta: document.getElementById('outBeta'),
    R: document.getElementById('outR'),
    H: document.getElementById('outH'),
    validity: document.getElementById('validityNote'),
    resetBtn: document.getElementById('resetBtn'),
    themeToggle: document.getElementById('themeToggle'),
  };

  const DEFAULTS = { D: 365, alpha: 30, v: 930, g: 9.81 };

  // The true hold correction beta is often a small fraction of a degree, so
  // the line of sight, bore direction and trajectory would sit visually on
  // top of one another. For legibility only, the diagram exaggerates the
  // angular gap between alpha and theta by this factor; all numeric readouts
  // stay exact. A clear note is drawn on the diagram saying so.
  const VISUAL_GAP_GAIN = 45;

  function getState() {
    return {
      D: parseFloat(els.D.value),
      alpha: parseFloat(els.alpha.value),
      v: parseFloat(els.v.value),
      g: parseFloat(els.g.value),
    };
  }

  function setState(s) {
    els.D.value = s.D;
    els.alpha.value = s.alpha;
    els.v.value = s.v;
    els.g.value = s.g;
  }

  function fmt(n, d = 2) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return n.toFixed(d);
  }

  // ---------- SVG diagram ----------
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  const layer = document.getElementById('diagramLayer');

  function clearLayer() {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }

  function render() {
    const { D, alpha, v, g } = getState();
    els.Dval.textContent = D;
    els.alphaVal.textContent = alpha;
    els.vVal.textContent = v;
    els.gVal.textContent = fmt(g, 3);

    const result = solveDownhillAiming(D, alpha, v, g);

    if (!result.valid) {
      els.theta.textContent = '—';
      els.beta.textContent = '—';
      els.R.textContent = fmt(result.R_m, 1);
      els.H.textContent = fmt(result.H_m, 1);
      els.validity.textContent = 'No real solution for these inputs. The target is beyond the muzzle velocity\u2019s reach on this line of sight.';
      els.validity.style.display = 'block';
    } else {
      els.theta.textContent = fmt(result.thetaDeg, 3) + '\u00B0';
      els.beta.textContent = fmt(result.betaDeg, 3) + '\u00B0';
      els.R.textContent = fmt(result.R_m, 1);
      els.H.textContent = fmt(result.H_m, 1);
      els.validity.style.display = 'none';
    }

    drawDiagram(D, alpha, result);
  }

  function drawDiagram(D, alphaDeg, result) {
    clearLayer();

    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const pad = 56;
    const wallMargin = 96; // reserve room for the vertical target wall + its labels
    const ox = pad, oy = pad * 0.9;

    // scale so the full line-of-sight triangle fits comfortably
    const alpha = toRad(alphaDeg);
    const maxRun = W - pad - wallMargin;
    const maxDrop = H - pad * 2.0;
    // use unit line-of-sight length 1 and scale by D visually (not physically, D is just for angle/label context)
    const drawLen = Math.min(maxRun / Math.cos(alpha), maxDrop / Math.max(Math.sin(alpha), 0.05));
    const Rpx = drawLen * Math.cos(alpha);
    const Hpx = drawLen * Math.sin(alpha);

    const shooter = [ox, oy];
    const target = [ox + Rpx, oy + Hpx];
    const rightAngle = [ox + Rpx, oy];
    const wallX = ox + Rpx; // the wall stands at the target's horizontal distance

    // grid handled by CSS background on .stage-wrap

    // axes
    const axisX = svgEl('line', { x1: ox, y1: oy, x2: wallX + 46, y2: oy, class: 'axis-line' });
    const axisY = svgEl('line', { x1: ox, y1: oy, x2: ox, y2: oy + maxDrop + 20, class: 'axis-line' });
    layer.appendChild(axisX);
    layer.appendChild(axisY);
    const axisYLabel = svgEl('text', { x: ox - 4, y: oy + maxDrop + 30, class: 'axis-label' });
    axisYLabel.textContent = 'y';
    layer.appendChild(axisYLabel);

    // the target wall: a vertical line standing at the target's horizontal
    // distance, tall enough to comfortably show where each method lands.
    const wallTop = Math.min(oy - 30, target[1] - 70);
    const wallBottom = Math.max(oy + maxDrop, target[1] + 70);
    layer.appendChild(svgEl('line', { x1: wallX, y1: wallTop, x2: wallX, y2: wallBottom, class: 'target-wall' }));
    const wallLabel = svgEl('text', { x: wallX, y: wallTop - 10, class: 'dim-label', 'text-anchor': 'middle' });
    wallLabel.textContent = 'target wall';
    layer.appendChild(wallLabel);

    // dashed vertical/horizontal component guides
    layer.appendChild(svgEl('line', {
      x1: target[0], y1: target[1], x2: rightAngle[0], y2: rightAngle[1], class: 'guide-dashed',
    }));

    // line of sight (shooter -> target), one of the three lines converging
    // on the wall alongside the two fired trajectories below.
    const los = svgEl('line', {
      x1: shooter[0], y1: shooter[1], x2: target[0], y2: target[1], class: 'line-los',
    });
    layer.appendChild(los);

    // aimed bore direction + both trajectories, only if a solution exists.
    // The true angular gaps here (beta for the exact model, and the rule's
    // own tiny zero-elevation) are often well under a degree, which would
    // draw every line right on top of the line of sight. So the diagram
    // exaggerates each angular gap by VISUAL_GAP_GAIN for legibility only.
    // Every number in the panel is still the exact, un-exaggerated result.
    if (result.valid) {
      const state = getState();
      const theta = toRad(result.thetaDeg);
      const displayThetaDeg = alphaDeg - (alphaDeg - result.thetaDeg) * VISUAL_GAP_GAIN;
      const displayTheta = toRad(displayThetaDeg);
      const boreLen = drawLen;
      const boreEnd = [shooter[0] + boreLen * Math.cos(displayTheta), shooter[1] + boreLen * Math.sin(displayTheta)];
      layer.appendChild(svgEl('line', {
        x1: shooter[0], y1: shooter[1], x2: boreEnd[0], y2: boreEnd[1], class: 'line-bore',
      }));

      // Both trajectories are drawn on their true physical shape, scaled to
      // fit, so they land exactly on the target point on the wall. Separation
      // near the shooter comes from a perpendicular offset that peaks at the
      // muzzle (for legibility, matching the exaggerated bore/theta angle)
      // and eases to exactly zero by the wall, so both curves visibly diverge
      // from the line of sight at launch, then converge back to land next to
      // the true target, exactly like the three lines never actually meeting
      // an inch apart on a real target. Every panel number stays exact.
      const R_m = result.R_m;
      const sx = R_m > 0 ? Rpx / R_m : 1;
      const peakOffsetPx = 26; // fixed visual amplitude, independent of the true (tiny) angle

      const exactPath = tracePathToWall(shooter, wallX, theta, state.v, state.g, sx, +peakOffsetPx);
      layer.appendChild(svgEl('path', { d: exactPath.d, class: 'path-trajectory' }));
      layer.appendChild(svgEl('circle', { cx: exactPath.end[0], cy: exactPath.end[1], r: 4.5, class: 'pt-exact' }));

      // rule-of-thumb trajectory: dial the flat-ground zero elevation for
      // R_rule = D cos(alpha), then fire that elevation along the line-of-
      // sight direction alpha instead of correcting further. This slightly
      // overshoots the true target in reality; the diagram exaggerates that
      // real but tiny miss with the same tapered offset, on the other side.
      const rule = ruleOfThumbLaunch(D, alphaDeg, state.v, state.g);
      if (rule.valid) {
        const ruleTheta = toRad(rule.actualThetaDeg);
        const rulePath = tracePathToWall(shooter, wallX, ruleTheta, state.v, state.g, sx, -peakOffsetPx);
        layer.appendChild(svgEl('path', { d: rulePath.d, class: 'path-rule' }));
        layer.appendChild(svgEl('circle', { cx: rulePath.end[0], cy: rulePath.end[1], r: 4.5, class: 'pt-rule' }));
      }

      // theta arc: small radius, hugging the bore line closely so it
      // reads as its own ring distinct from alpha's.
      const thetaRadius = 32;
      layer.appendChild(arcPath(shooter, thetaRadius, 0, displayThetaDeg, 'arc-theta'));
      const thetaLabelAngle = toRad(displayThetaDeg * 0.5);
      layer.appendChild(labelAt(shooter, thetaRadius + 16, thetaLabelAngle, '\u03B8', 'arc-label arc-label-theta'));
    }

    // alpha arc: much larger radius than theta's, so the two arcs sit as
    // clearly separated concentric rings instead of overlapping, with
    // labels pulled to opposite ends of their own arc so they don't
    // collide near the vertex.
    const alphaRadius = 84;
    layer.appendChild(arcPath(shooter, alphaRadius, 0, alphaDeg, 'arc-alpha'));
    const alphaLabelAngle = toRad(alphaDeg * 0.95);
    layer.appendChild(labelAt(shooter, alphaRadius + 18, alphaLabelAngle, '\u03B1', 'arc-label arc-label-alpha'));

    // points
    layer.appendChild(svgEl('circle', { cx: shooter[0], cy: shooter[1], r: 4.5, class: 'pt-shooter' }));
    layer.appendChild(svgEl('circle', { cx: target[0], cy: target[1], r: 5.5, class: 'pt-target' }));

    const shooterLabel = svgEl('text', { x: shooter[0] - 8, y: shooter[1] - 12, class: 'pt-label', 'text-anchor': 'end' });
    shooterLabel.textContent = 'shooter';
    layer.appendChild(shooterLabel);

    const targetLabel = svgEl('text', { x: target[0] - 10, y: target[1] - 10, class: 'pt-label', 'text-anchor': 'end' });
    targetLabel.textContent = 'target (R, H)';
    layer.appendChild(targetLabel);

    // legend, placed clear of the wall in the lower right
    const legendItems = [
      { cls: 'legend-los', text: 'line of sight' },
      { cls: 'legend-exact', text: 'exact trajectory' },
      { cls: 'legend-rule', text: 'rule-of-thumb trajectory' },
    ];
    const legendX = wallX + 14;
    const legendYStart = wallBottom - 54;
    legendItems.forEach((item, i) => {
      const ly = legendYStart + i * 18;
      layer.appendChild(svgEl('line', { x1: legendX, y1: ly, x2: legendX + 20, y2: ly, class: item.cls }));
      const t = svgEl('text', { x: legendX + 26, y: ly + 4, class: 'legend-label' });
      t.textContent = item.text;
      layer.appendChild(t);
    });

    // R and H dimension labels
    const rLabel = svgEl('text', { x: (shooter[0] + rightAngle[0]) / 2, y: oy + maxDrop + 46, class: 'dim-label', 'text-anchor': 'middle' });
    rLabel.textContent = 'R = D cos \u03B1 \u2248 ' + fmt(result.R_m, 1) + ' m';
    layer.appendChild(rLabel);

    const hLabelY = (rightAngle[1] + target[1]) / 2;
    const hLabelLine1 = svgEl('text', { x: ox - 4, y: hLabelY - 7, class: 'dim-label', 'text-anchor': 'end' });
    hLabelLine1.textContent = 'H = D sin \u03B1';
    layer.appendChild(hLabelLine1);
    const hLabelLine2 = svgEl('text', { x: ox - 4, y: hLabelY + 9, class: 'dim-label', 'text-anchor': 'end' });
    hLabelLine2.textContent = '\u2248 ' + fmt(result.H_m, 1) + ' m';
    layer.appendChild(hLabelLine2);

    // beta callout, only if valid
    if (result.valid) {
      const betaLabel = svgEl('text', { x: ox + 90, y: oy - 26, class: 'beta-label' });
      betaLabel.textContent = '\u03B2 = \u03B1 \u2212 \u03B8 \u2248 ' + fmt(result.betaDeg, 2) + '\u00B0 hold above line of sight';
      layer.appendChild(betaLabel);

      const gapNote = svgEl('text', { x: ox + 90, y: oy - 10, class: 'gap-note' });
      gapNote.textContent = '(angular gaps between the three lines shown ' + VISUAL_GAP_GAIN + '\u00D7 wider than actual, for visibility)';
      layer.appendChild(gapNote);
    }
  }

  // Trace a fired trajectory (launch angle thetaRad, speed v, gravity g)
  // from the shooter out to the vertical wall at wallX, in *display*
  // coordinates. The real physical shape is computed in metres, uniformly
  // scaled by sx (px per metre along the line-of-sight direction), then
  // rotated about the shooter by gapRad, the same exaggerated angular
  // offset used to draw that trajectory's own firing line. Returns the
  // path string and the pixel point where it crosses the wall.
  function tracePathToWall(shooter, wallX, thetaRad, v_ms, g_ms2, sx, peakOffsetPx) {
    // True physical trajectory in display coordinates: same origin as the
    // shooter, uniformly scaled (no rotation), so an unmodified curve lands
    // exactly at the true target on the wall.
    const toDisplay = (xm, ym) => [shooter[0] + xm * sx, shooter[1] + ym * sx];

    // Perpendicular unit vector to the x-axis in this local frame is simply
    // vertical (0,1) here since toDisplay has no rotation, so the offset is
    // applied straight in the y-direction, eased from peakOffsetPx at the
    // shooter down to 0 at the wall with a quadratic ease so it reads as a
    // gentle bow rather than a kink.
    const runPx = Math.max(wallX - shooter[0], 1e-6);

    const samples = 72;
    const stepM = sx > 0 ? runPx / sx / samples : 1;
    let d = '';
    let prev = null;
    let end = null;
    for (let i = 0; i <= samples * 3 && end === null; i++) {
      const xm = i * stepM;
      const t = xm / (v_ms * Math.cos(thetaRad));
      const ym = v_ms * Math.sin(thetaRad) * t + 0.5 * g_ms2 * t * t;
      let [px, py] = toDisplay(xm, ym);
      const s = Math.min(Math.max((px - shooter[0]) / runPx, 0), 1);
      const ease = (1 - s) * (1 - s);
      py -= peakOffsetPx * ease;
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      if (px >= wallX) {
        end = interpToWall(prev, [px, py], wallX);
      }
      prev = [px, py];
    }
    if (end === null) end = prev || shooter;
    return { d, end };
  }

  function interpToWall(p0, p1, wallX) {
    if (!p0) return p1;
    const t = (wallX - p0[0]) / (p1[0] - p0[0] || 1);
    return [wallX, p0[1] + t * (p1[1] - p0[1])];
  }

  function arcPath(center, radius, fromDeg, toDeg, cls) {
    const from = toRad(fromDeg);
    const to = toRad(toDeg);
    const x1 = center[0] + radius * Math.cos(from);
    const y1 = center[1] + radius * Math.sin(from);
    const x2 = center[0] + radius * Math.cos(to);
    const y2 = center[1] + radius * Math.sin(to);
    const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const d = `M ${x1.toFixed(2)},${y1.toFixed(2)} A ${radius},${radius} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
    return svgEl('path', { d, class: cls, fill: 'none' });
  }

  function labelAt(center, radius, angleRad, text, cls) {
    const x = center[0] + radius * Math.cos(angleRad);
    const y = center[1] + radius * Math.sin(angleRad);
    const el = svgEl('text', { x, y, class: cls, 'text-anchor': 'middle' });
    el.textContent = text;
    return el;
  }

  function toRad(deg) { return (deg * Math.PI) / 180; }

  // ---------- wiring ----------
  [els.D, els.alpha, els.v, els.g].forEach((input) => {
    input.addEventListener('input', render);
  });

  els.resetBtn.addEventListener('click', () => {
    setState(DEFAULTS);
    render();
  });

  // theme toggle, mirrors the Monge's theorem tool (in-memory only, no persistence)
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  render();
  window.addEventListener('resize', render);
})();
