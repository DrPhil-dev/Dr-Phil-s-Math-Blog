(() => {
  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;

  const circleControlsEl = document.getElementById('circleControls');
  const externalReadoutEl = document.getElementById('externalReadout');
  const internalReadoutEl = document.getElementById('internalReadout');
  const deviationValueEl = document.getElementById('deviationValue');
  const collinearityStatusEl = document.getElementById('collinearityStatus');
  const toggleInternal = document.getElementById('toggleInternal');
  const toggleTangents = document.getElementById('toggleTangents');
  const resetBtn = document.getElementById('resetBtn');
  const themeToggle = document.getElementById('themeToggle');
  const stageHint = document.getElementById('stageHint');

  const CIRCLE_COLORS = ['--c-a', '--c-b', '--c-c'];
  const CIRCLE_NAMES = ['A', 'B', 'C'];
  const PAIRS = [
    [0, 1],
    [1, 2],
    [0, 2],
  ];

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let W = 0,
    H = 0;

  // World-space circle state (in canvas CSS pixels, y-down).
  let circles = [];

  function defaultCircles() {
    const cx = W / 2,
      cy = H / 2;
    return [
      { c: { x: cx - 180, y: cy + 90 }, r: 60, color: getColor(0) },
      { c: { x: cx + 60, y: cy + 130 }, r: 34, color: getColor(1) },
      { c: { x: cx + 40, y: cy - 130 }, r: 88, color: getColor(2) },
    ];
  }

  function getColor(i) {
    return getComputedStyle(document.documentElement).getPropertyValue(CIRCLE_COLORS[i]).trim();
  }

  function refreshColors() {
    circles.forEach((circ, i) => (circ.color = getColor(i)));
  }

  // ---------------- sizing ----------------

  function resize() {
    const rect = wrap.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------- controls (panel) ----------------

  function buildControls() {
    circleControlsEl.innerHTML = '';
    circles.forEach((circ, i) => {
      const div = document.createElement('div');
      div.className = 'circle-control';
      div.innerHTML = `
        <div class="circle-control-head">
          <span class="circle-swatch" style="background:${circ.color}"></span>
          Circle ${CIRCLE_NAMES[i]}
        </div>
        <div class="field-row">
          <div class="field">
            <label for="cx-${i}">Center X</label>
            <input type="number" id="cx-${i}" data-idx="${i}" data-axis="x" step="1" />
          </div>
          <div class="field">
            <label for="cy-${i}">Center Y</label>
            <input type="number" id="cy-${i}" data-idx="${i}" data-axis="y" step="1" />
          </div>
        </div>
        <div class="field">
          <label for="r-${i}">Radius</label>
          <div class="radius-row">
            <input type="range" id="r-${i}" data-idx="${i}" min="10" max="220" step="1" />
            <span class="radius-val" id="rval-${i}"></span>
          </div>
        </div>
      `;
      circleControlsEl.appendChild(div);
    });

    circleControlsEl.querySelectorAll('input[type="number"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = +inp.dataset.idx;
        const axis = inp.dataset.axis;
        const val = parseFloat(inp.value);
        if (Number.isFinite(val)) {
          circles[idx].c[axis] = val;
          syncControlsFromState();
          render();
        }
      });
    });

    circleControlsEl.querySelectorAll('input[type="range"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = +inp.dataset.idx;
        circles[idx].r = parseFloat(inp.value);
        syncControlsFromState();
        render();
      });
    });
  }

  function syncControlsFromState() {
    circles.forEach((circ, i) => {
      const cxInp = document.getElementById(`cx-${i}`);
      const cyInp = document.getElementById(`cy-${i}`);
      const rInp = document.getElementById(`r-${i}`);
      const rVal = document.getElementById(`rval-${i}`);
      if (document.activeElement !== cxInp) cxInp.value = Math.round(circ.c.x);
      if (document.activeElement !== cyInp) cyInp.value = Math.round(circ.c.y);
      if (document.activeElement !== rInp) rInp.value = Math.round(circ.r);
      rVal.textContent = Math.round(circ.r) + ' px';
    });
  }

  // ---------------- drag interaction ----------------

  let drag = null; // { idx, mode: 'move'|'resize', startPointer, startCircle }

  function pointerPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  }

  function hitTest(pos) {
    // Check resize handles first (edge of circle along its "handle angle"),
    // then body (move), topmost (last-drawn / highest index) first.
    const HANDLE_ANGLE = -Math.PI / 4; // top-right handle
    for (let i = circles.length - 1; i >= 0; i--) {
      const circ = circles[i];
      const handlePos = {
        x: circ.c.x + circ.r * Math.cos(HANDLE_ANGLE),
        y: circ.c.y + circ.r * Math.sin(HANDLE_ANGLE),
      };
      if (Geometry.dist(pos, handlePos) <= 11) {
        return { idx: i, mode: 'resize' };
      }
    }
    for (let i = circles.length - 1; i >= 0; i--) {
      const circ = circles[i];
      const d = Geometry.dist(pos, circ.c);
      if (d <= circ.r + 4) {
        return { idx: i, mode: 'move' };
      }
    }
    return null;
  }

  function onPointerDown(evt) {
    const pos = pointerPos(evt);
    const hit = hitTest(pos);
    if (!hit) return;
    canvas.setPointerCapture(evt.pointerId);
    drag = {
      idx: hit.idx,
      mode: hit.mode,
      startPointer: pos,
      startCircle: { c: { ...circles[hit.idx].c }, r: circles[hit.idx].r },
    };
    canvas.style.cursor = hit.mode === 'resize' ? 'nwse-resize' : 'grabbing';
    stageHint.style.opacity = '0';
  }

  function onPointerMove(evt) {
    const pos = pointerPos(evt);
    if (!drag) {
      const hit = hitTest(pos);
      canvas.style.cursor = hit ? (hit.mode === 'resize' ? 'nwse-resize' : 'grab') : 'default';
      return;
    }
    const circ = circles[drag.idx];
    if (drag.mode === 'move') {
      const dx = pos.x - drag.startPointer.x;
      const dy = pos.y - drag.startPointer.y;
      circ.c.x = drag.startCircle.c.x + dx;
      circ.c.y = drag.startCircle.c.y + dy;
    } else {
      const d = Geometry.dist(pos, circ.c);
      circ.r = Math.min(220, Math.max(10, d));
    }
    syncControlsFromState();
    render();
  }

  function onPointerUp(evt) {
    if (drag) {
      canvas.releasePointerCapture(evt.pointerId);
      drag = null;
      canvas.style.cursor = 'default';
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // ---------------- rendering ----------------

  function withAlpha(hexOrColor, alpha) {
    return `color-mix(in oklab, ${hexOrColor} ${Math.round(alpha * 100)}%, transparent)`;
  }

  function drawArrowLineThroughStage(point, dir, color, width, dash) {
    // Extend a line through `point` with direction `dir` to the canvas bounds.
    const candidates = [];
    if (Math.abs(dir.x) > 1e-9) {
      candidates.push((0 - point.x) / dir.x);
      candidates.push((W - point.x) / dir.x);
    }
    if (Math.abs(dir.y) > 1e-9) {
      candidates.push((0 - point.y) / dir.y);
      candidates.push((H - point.y) / dir.y);
    }
    if (candidates.length === 0) return;
    const tMin = Math.min(...candidates);
    const tMax = Math.max(...candidates);
    const p1 = { x: point.x + dir.x * tMin, y: point.y + dir.y * tMin };
    const p2 = { x: point.x + dir.x * tMax, y: point.y + dir.y * tMax };

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawCircleShape(circ, isHover) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(circ.c.x, circ.c.y, circ.r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(circ.color, 0.08);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = circ.color;
    ctx.stroke();
    ctx.restore();

    // center marker
    ctx.save();
    ctx.beginPath();
    ctx.arc(circ.c.x, circ.c.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = circ.color;
    ctx.fill();
    ctx.restore();

    // resize handle
    const HANDLE_ANGLE = -Math.PI / 4;
    const hp = { x: circ.c.x + circ.r * Math.cos(HANDLE_ANGLE), y: circ.c.y + circ.r * Math.sin(HANDLE_ANGLE) };
    ctx.save();
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = getCSSVar('--color-surface');
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = circ.color;
    ctx.stroke();
    ctx.restore();
  }

  function drawLabel(circ, idx) {
    ctx.save();
    ctx.font = '600 13px var(--font-display), sans-serif';
    ctx.font = `600 13px ${getCSSVar('--font-display').split(',')[0].trim() || 'sans-serif'}`;
    ctx.fillStyle = circ.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(CIRCLE_NAMES[idx], circ.c.x, circ.c.y - circ.r - 14);
    ctx.restore();
  }

  function drawCenterPoint(pt, color, radius, label) {
    if (!pt) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = getCSSVar('--color-surface');
    ctx.stroke();
    ctx.restore();

    if (label) {
      ctx.save();
      const fam = getCSSVar('--font-mono').split(',')[0].trim() || 'monospace';
      ctx.font = `700 11px ${fam}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, pt.x + radius + 5, pt.y - radius - 2);
      ctx.restore();
    }
  }

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function extendPointToStage(from, through) {
    // Ray starting at `from`, passing through `through`, extended to the
    // canvas bounds — used to continue a tangent line past the near tangent
    // point out to where it strikes the Monge line and beyond.
    const dir = { x: through.x - from.x, y: through.y - from.y };
    const len = Math.hypot(dir.x, dir.y);
    if (len < 1e-9) return through;
    const ux = dir.x / len,
      uy = dir.y / len;
    const candidates = [];
    if (Math.abs(ux) > 1e-9) {
      candidates.push((0 - from.x) / ux);
      candidates.push((W - from.x) / ux);
    }
    if (Math.abs(uy) > 1e-9) {
      candidates.push((0 - from.y) / uy);
      candidates.push((H - from.y) / uy);
    }
    const forward = candidates.filter((t) => t > len);
    if (forward.length === 0) return through;
    const tEdge = Math.min(...forward);
    return { x: from.x + ux * tEdge, y: from.y + uy * tEdge };
  }

  function drawTangentPair(c1, r1, c2, r2, extCenter, color) {
    // Draw the two actual external common tangent lines for this pair:
    // each touches circle 1 at one point and circle 2 at another, passing
    // exactly through their exsimilicenter (extCenter). The solid segment
    // spans the two tangency points; a faint dashed continuation extends
    // past the near tangent point through the exsimilicenter to the stage
    // edge, so you can see where the line actually strikes the Monge axis.
    if (!extCenter) return;
    const d1 = Geometry.dist(extCenter, c1);
    const d2 = Geometry.dist(extCenter, c2);
    if (d1 < r1 - 1e-6 || d2 < r2 - 1e-6) return; // degenerate

    const t1 = Geometry.tangentPointsFromExternalPoint(extCenter, c1, r1);
    const t2 = Geometry.tangentPointsFromExternalPoint(extCenter, c2, r2);
    if (t1.length < 2 || t2.length < 2) return;

    // Pair up tangent points: for each of the two tangent lines, the point
    // on circle 1 and the point on circle 2 lie on the same ray from
    // extCenter (same angular sign relative to the center-to-center line).
    [0, 1].forEach((idx) => {
      const pA = t1[idx];
      const pB = t2[idx];
      // whichever tangent point sits closer to extCenter is the "near" end;
      // extend the ray from there, through extCenter, to the stage edge.
      const dA = Geometry.dist(extCenter, pA);
      const dB = Geometry.dist(extCenter, pB);
      const nearPt = dA < dB ? pA : pB;
      const edgePt = extendPointToStage(nearPt, extCenter);

      // faint dashed continuation from the near tangent point, through the
      // exsimilicenter, out to the stage edge
      ctx.save();
      ctx.strokeStyle = withAlpha(color, 0.4);
      ctx.lineWidth = 1.25;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(nearPt.x, nearPt.y);
      ctx.lineTo(edgePt.x, edgePt.y);
      ctx.stroke();
      ctx.restore();

      // solid tangent segment between the two actual tangency points
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
      ctx.restore();

      // small tangent-point markers where the line touches each circle
      [pA, pB].forEach((pt) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      });
    });
  }

  let fittedLine = null;
  let hoverPairIdx = -1;

  function render() {
    ctx.clearRect(0, 0, W, H);

    const [c0, c1, c2] = circles;

    const ext = [
      Geometry.externalCenter(c0.c, c0.r, c1.c, c1.r), // A-B
      Geometry.externalCenter(c1.c, c1.r, c2.c, c2.r), // B-C
      Geometry.externalCenter(c0.c, c0.r, c2.c, c2.r), // A-C
    ];
    const intr = [
      Geometry.internalCenter(c0.c, c0.r, c1.c, c1.r),
      Geometry.internalCenter(c1.c, c1.r, c2.c, c2.r),
      Geometry.internalCenter(c0.c, c0.r, c2.c, c2.r),
    ];

    fittedLine = Geometry.fitLine(ext);

    // external common tangent lines — the self-descriptive construction
    // behind Monge's theorem: each pair's two tangent lines cross exactly
    // at that pair's exsimilicenter, and the three crossing points are
    // the collinear points the axis passes through.
    if (toggleTangents.checked) {
      const pairColors = [getCSSVar('--pair-ab'), getCSSVar('--pair-bc'), getCSSVar('--pair-ac')];
      PAIRS.forEach(([i, j], k) => {
        drawTangentPair(circles[i].c, circles[i].r, circles[j].c, circles[j].r, ext[k], pairColors[k]);
      });
    }

    // axis of similitude (Monge line)
    if (fittedLine) {
      drawArrowLineThroughStage(fittedLine.point, fittedLine.direction, getCSSVar('--line-color'), 2, null);
    }

    // internal-center collinear helper lines (each internal center is
    // collinear with one external center and the two other circle-pair data);
    // classic result: the line through I_AB and I_AC... we simply draw
    // internal centers, and the connecting lines from external centers on
    // the axis when toggled, handled visually via legend only.

    // draw circles
    circles.forEach((circ, i) => {
      drawCircleShape(circ);
      drawLabel(circ, i);
    });

    // internal centers
    if (toggleInternal.checked) {
      intr.forEach((pt, k) => {
        drawCenterPoint(pt, getCSSVar('--int-color'), 5, null);
      });
    }

    // external centers (drawn last, on top, larger)
    const pairLabels = ['AB', 'BC', 'AC'];
    ext.forEach((pt, k) => {
      drawCenterPoint(pt, getCSSVar('--ext-color'), 6.5, pairLabels[k]);
    });

    updateReadouts(ext, intr, fittedLine);
  }

  function fmt(n) {
    return n.toFixed(1);
  }

  function updateReadouts(ext, intr, line) {
    const pairLabels = [
      ['A', 'B'],
      ['B', 'C'],
      ['A', 'C'],
    ];

    externalReadoutEl.innerHTML = ext
      .map((pt, k) => {
        const [n1, n2] = pairLabels[k];
        const c1 = circles[CIRCLE_NAMES.indexOf(n1)].color;
        const c2 = circles[CIRCLE_NAMES.indexOf(n2)].color;
        if (!pt) {
          return `<div class="readout-row unavailable">
            <span class="pair-label"><span class="pair-swatches"><span style="background:${c1}"></span><span style="background:${c2}"></span></span>${n1}${n2}</span>
            <span class="coord">equal radii — at infinity</span>
          </div>`;
        }
        return `<div class="readout-row">
          <span class="pair-label"><span class="pair-swatches"><span style="background:${c1}"></span><span style="background:${c2}"></span></span>${n1}${n2}</span>
          <span class="coord">(${fmt(pt.x)}, ${fmt(pt.y)})</span>
        </div>`;
      })
      .join('');

    internalReadoutEl.innerHTML = intr
      .map((pt, k) => {
        const [n1, n2] = pairLabels[k];
        const c1 = circles[CIRCLE_NAMES.indexOf(n1)].color;
        const c2 = circles[CIRCLE_NAMES.indexOf(n2)].color;
        if (!pt) {
          return `<div class="readout-row unavailable">
            <span class="pair-label"><span class="pair-swatches"><span style="background:${c1}"></span><span style="background:${c2}"></span></span>${n1}${n2}</span>
            <span class="coord">undefined</span>
          </div>`;
        }
        return `<div class="readout-row">
          <span class="pair-label"><span class="pair-swatches"><span style="background:${c1}"></span><span style="background:${c2}"></span></span>${n1}${n2}</span>
          <span class="coord">(${fmt(pt.x)}, ${fmt(pt.y)})</span>
        </div>`;
      })
      .join('');

    if (!line) {
      deviationValueEl.textContent = 'n/a';
      collinearityStatusEl.querySelector('.status-text').textContent = 'One or more circles share a radius — external center at infinity';
      collinearityStatusEl.querySelector('.status-dot').style.background = getCSSVar('--color-text-faint');
      collinearityStatusEl.querySelector('.status-dot').style.boxShadow = 'none';
      return;
    }

    deviationValueEl.textContent = `${line.maxDeviation.toFixed(4)} px`;
    collinearityStatusEl.querySelector('.status-text').textContent = "Collinear — Monge's theorem holds";
    const dot = collinearityStatusEl.querySelector('.status-dot');
    dot.style.background = getCSSVar('--color-primary');
    dot.style.boxShadow = `0 0 0 3px color-mix(in oklab, ${getCSSVar('--color-primary')} 25%, transparent)`;
  }

  // ---------------- theme ----------------

  function initTheme() {
    const root = document.documentElement;
    let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', d);
    updateThemeIcon(d);

    themeToggle.addEventListener('click', () => {
      d = d === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', d);
      updateThemeIcon(d);
      refreshColors();
      buildControls();
      syncControlsFromState();
      render();
    });
  }

  function updateThemeIcon(d) {
    themeToggle.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
    themeToggle.innerHTML =
      d === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ---------------- init / events ----------------

  function init() {
    resize();
    circles = defaultCircles();
    buildControls();
    syncControlsFromState();
    render();

    window.addEventListener('resize', () => {
      resize();
      render();
    });

    toggleInternal.addEventListener('change', render);
    toggleTangents.addEventListener('change', render);

    resetBtn.addEventListener('click', () => {
      circles = defaultCircles();
      buildControls();
      syncControlsFromState();
      render();
    });

    setTimeout(() => {
      stageHint.style.transition = 'opacity 400ms ease';
      stageHint.style.opacity = '1';
    }, 50);
  }

  initTheme();
  init();
})();
