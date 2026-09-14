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

  const DEFAULTS = { D: 400, alpha: 30, v: 3050, g: 32.174 };

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
      els.R.textContent = fmt(result.R_yd, 1);
      els.H.textContent = fmt(result.H_yd, 1);
      els.validity.textContent = 'No real solution for these inputs — the target is beyond the muzzle velocity\u2019s reach on this line of sight.';
      els.validity.style.display = 'block';
    } else {
      els.theta.textContent = fmt(result.thetaDeg, 3) + '\u00B0';
      els.beta.textContent = fmt(result.betaDeg, 3) + '\u00B0';
      els.R.textContent = fmt(result.R_yd, 1);
      els.H.textContent = fmt(result.H_yd, 1);
      els.validity.style.display = 'none';
    }

    drawDiagram(D, alpha, result);
  }

  function drawDiagram(D, alphaDeg, result) {
    clearLayer();

    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const pad = 56;
    const rightMargin = 130; // reserve room for the target/H labels
    const ox = pad, oy = pad * 0.9;

    // scale so the full line-of-sight triangle fits comfortably
    const alpha = toRad(alphaDeg);
    const maxRun = W - pad - rightMargin;
    const maxDrop = H - pad * 2.0;
    // use unit line-of-sight length 1 and scale by D visually (not physically, D is just for angle/label context)
    const drawLen = Math.min(maxRun / Math.cos(alpha), maxDrop / Math.max(Math.sin(alpha), 0.05));
    const Rpx = drawLen * Math.cos(alpha);
    const Hpx = drawLen * Math.sin(alpha);

    const shooter = [ox, oy];
    const target = [ox + Rpx, oy + Hpx];
    const rightAngle = [ox + Rpx, oy];

    // grid handled by CSS background on .stage-wrap

    // axes
    const axisX = svgEl('line', { x1: ox, y1: oy, x2: ox + maxRun + 20, y2: oy, class: 'axis-line' });
    const axisY = svgEl('line', { x1: ox, y1: oy, x2: ox, y2: oy + maxDrop + 20, class: 'axis-line' });
    layer.appendChild(axisX);
    layer.appendChild(axisY);
    const axisXLabel = svgEl('text', { x: ox + maxRun + 24, y: oy + 4, class: 'axis-label' });
    axisXLabel.textContent = 'x';
    layer.appendChild(axisXLabel);
    const axisYLabel = svgEl('text', { x: ox - 4, y: oy + maxDrop + 30, class: 'axis-label' });
    axisYLabel.textContent = 'y';
    layer.appendChild(axisYLabel);

    // line of sight (shooter -> target)
    const los = svgEl('line', {
      x1: shooter[0], y1: shooter[1], x2: target[0], y2: target[1], class: 'line-los',
    });
    layer.appendChild(los);

    // dashed vertical/horizontal component guides
    layer.appendChild(svgEl('line', {
      x1: target[0], y1: target[1], x2: rightAngle[0], y2: rightAngle[1], class: 'guide-dashed',
    }));

    // aimed bore direction + ideal trajectory, only if a solution exists
    if (result.valid) {
      const theta = toRad(result.thetaDeg);
      const boreLen = drawLen;
      const boreEnd = [shooter[0] + boreLen * Math.cos(theta), shooter[1] + boreLen * Math.sin(theta)];
      layer.appendChild(svgEl('line', {
        x1: shooter[0], y1: shooter[1], x2: boreEnd[0], y2: boreEnd[1], class: 'line-bore',
      }));

      // ideal trajectory curve, scaled into the same pixel box via parametric t
      const state = getState();
      const R_ft = result.R_ft;
      const pts = trajectoryPoints(R_ft, theta, state.v, state.g, 48);
      const sx = R_ft > 0 ? Rpx / R_ft : 1;
      let d = '';
      pts.forEach(([x, y], i) => {
        const px = shooter[0] + x * sx;
        const py = shooter[1] + y * sx; // uniform scale on both axes using sx to preserve shape
        d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
      });
      layer.appendChild(svgEl('path', { d, class: 'path-trajectory' }));

      // theta arc
      layer.appendChild(arcPath(shooter, 26, 0, result.thetaDeg, 'arc-theta'));
      const thetaLabelAngle = toRad(result.thetaDeg / 2);
      layer.appendChild(labelAt(shooter, 34, thetaLabelAngle, '\u03B8', 'arc-label arc-label-theta'));
    }

    // alpha arc (line of sight angle)
    layer.appendChild(arcPath(shooter, 40, 0, alphaDeg, 'arc-alpha'));
    const alphaLabelAngle = toRad(alphaDeg / 2);
    layer.appendChild(labelAt(shooter, 48, alphaLabelAngle, '\u03B1', 'arc-label arc-label-alpha'));

    // points
    layer.appendChild(svgEl('circle', { cx: shooter[0], cy: shooter[1], r: 4.5, class: 'pt-shooter' }));
    layer.appendChild(svgEl('circle', { cx: target[0], cy: target[1], r: 4.5, class: 'pt-target' }));

    const shooterLabel = svgEl('text', { x: shooter[0] - 8, y: shooter[1] - 12, class: 'pt-label', 'text-anchor': 'end' });
    shooterLabel.textContent = 'shooter';
    layer.appendChild(shooterLabel);

    const targetLabelX = Math.min(target[0] + 8, W - 8);
    const targetLabelAnchor = target[0] + 90 > W ? 'end' : 'start';
    const targetLabel = svgEl('text', {
      x: targetLabelAnchor === 'end' ? target[0] - 8 : targetLabelX,
      y: target[1] + 4,
      class: 'pt-label',
      'text-anchor': targetLabelAnchor,
    });
    targetLabel.textContent = 'target (R, H)';
    layer.appendChild(targetLabel);

    // R and H dimension labels
    const rLabel = svgEl('text', { x: (shooter[0] + rightAngle[0]) / 2, y: oy + maxDrop + 46, class: 'dim-label', 'text-anchor': 'middle' });
    rLabel.textContent = 'R = D cos \u03B1 \u2248 ' + fmt(result.R_yd, 1) + ' yd';
    layer.appendChild(rLabel);

    const hLabelY = (rightAngle[1] + target[1]) / 2;
    const hLabelLine1 = svgEl('text', { x: ox + maxRun + 14, y: hLabelY - 7, class: 'dim-label', 'text-anchor': 'start' });
    hLabelLine1.textContent = 'H = D sin \u03B1';
    layer.appendChild(hLabelLine1);
    const hLabelLine2 = svgEl('text', { x: ox + maxRun + 14, y: hLabelY + 9, class: 'dim-label', 'text-anchor': 'start' });
    hLabelLine2.textContent = '\u2248 ' + fmt(result.H_yd, 1) + ' yd';
    layer.appendChild(hLabelLine2);

    // beta callout, only if valid
    if (result.valid) {
      const betaLabel = svgEl('text', { x: ox + 90, y: oy - 26, class: 'beta-label' });
      betaLabel.textContent = '\u03B2 = \u03B1 \u2212 \u03B8 \u2248 ' + fmt(result.betaDeg, 2) + '\u00B0 hold above line of sight';
      layer.appendChild(betaLabel);
    }
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
