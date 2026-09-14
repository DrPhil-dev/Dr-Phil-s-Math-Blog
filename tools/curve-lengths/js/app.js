(function () {
  'use strict';

  const svg = document.getElementById('stage');
  const layer = document.getElementById('diagramLayer');

  const els = {
    n: document.getElementById('inputN'),
    valN: document.getElementById('valN'),
    outLn: document.getElementById('outLn'),
    outLimit: document.getElementById('outLimit'),
    outGap: document.getElementById('outGap'),
    playBtn: document.getElementById('playBtn'),
    resetBtn: document.getElementById('resetBtn'),
    themeToggle: document.getElementById('themeToggle'),
  };

  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function clearLayer() {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }

  function fmt(x, d) {
    return Number(x).toFixed(d === undefined ? 4 : d);
  }

  // n is controlled on a nonlinear slider (0..100) mapped to 1..2000,
  // so most of the travel is spent where the visual change is fastest.
  function sliderToN(s) {
    const t = s / 100;
    // exponential-ish mapping from 1 to 2000
    const n = Math.round(Math.pow(10, t * Math.log10(2000)));
    return Math.max(1, n);
  }
  function nToSlider(n) {
    const t = Math.log10(Math.max(1, n)) / Math.log10(2000);
    return Math.round(t * 100);
  }

  let playing = false;
  let playTimer = null;

  function drawDiagram(n) {
    clearLayer();

    const vb = svg.viewBox.baseVal;
    const W = vb.width, H = vb.height;
    const pad = 56;
    const plotSize = Math.min(W - pad * 2, H - pad * 1.7);
    const ox = pad;
    const oy = H - pad * 0.9;

    // axes (x to the right, y upward)
    layer.appendChild(svgEl('line', { x1: ox, y1: oy, x2: ox + plotSize + 20, y2: oy, class: 'axis-line' }));
    layer.appendChild(svgEl('line', { x1: ox, y1: oy, x2: ox, y2: oy - plotSize - 20, class: 'axis-line' }));

    const axisXLabel = svgEl('text', { x: ox + plotSize + 26, y: oy + 5, class: 'axis-label' });
    axisXLabel.textContent = 'x';
    layer.appendChild(axisXLabel);
    const axisYLabel = svgEl('text', { x: ox - 6, y: oy - plotSize - 26, class: 'axis-label' });
    axisYLabel.textContent = 'y';
    layer.appendChild(axisYLabel);

    // grid ticks at 0, 0.5, 1 on both axes
    [0, 0.5, 1].forEach((v) => {
      const px = ox + v * plotSize;
      const py = oy - v * plotSize;
      layer.appendChild(svgEl('line', { x1: px, y1: oy, x2: px, y2: oy + 6, class: 'grid-tick' }));
      const lx = svgEl('text', { x: px, y: oy + 20, class: 'tick-label', 'text-anchor': 'middle' });
      lx.textContent = v;
      layer.appendChild(lx);
      layer.appendChild(svgEl('line', { x1: ox - 6, y1: py, x2: ox, y2: py, class: 'grid-tick' }));
      const ly = svgEl('text', { x: ox - 12, y: py + 4, class: 'tick-label', 'text-anchor': 'end' });
      ly.textContent = v;
      layer.appendChild(ly);
    });

    const toPx = (x, y) => [ox + x * plotSize, oy - y * plotSize];

    // faded target L-shape (the limit curve) always visible as a guide
    const [lx0, ly0] = toPx(0, 0);
    const [lx1, ly1] = toPx(1, 0);
    const [lx2, ly2] = toPx(1, 1);
    const limitPath = `M ${lx0},${ly0} L ${lx1},${ly1} L ${lx2},${ly2}`;
    layer.appendChild(svgEl('path', { d: limitPath, class: 'path-limit' }));
    layer.appendChild(svgEl('circle', { cx: lx2, cy: ly2, r: 4, class: 'pt-limit' }));
    const limLabel = svgEl('text', { x: lx2 + 8, y: ly2 - 6, class: 'limit-label' });
    limLabel.textContent = 'limit shape (L = 2)';
    layer.appendChild(limLabel);

    // the actual curve f_n(x) = x^n
    const pts = CurveMath.sampleCurve(n, 240);
    let d = '';
    pts.forEach((p, i) => {
      const [px, py] = toPx(p[0], p[1]);
      d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ',' + py.toFixed(2) + ' ';
    });
    layer.appendChild(svgEl('path', { d, class: 'path-curve' }));

    const [ex, ey] = toPx(1, 1);
    layer.appendChild(svgEl('circle', { cx: ex, cy: ey, r: 4, class: 'pt-curve-end' }));

    const curveLabel = svgEl('text', { x: ox + plotSize * 0.28, y: oy - plotSize * 0.62, class: 'curve-label' });
    curveLabel.textContent = 'f_n(x) = x^n';
    layer.appendChild(curveLabel);

    // n badge, top-right of plot area
    const nBadge = svgEl('text', { x: ox + plotSize - 4, y: oy - plotSize - 6, class: 'n-badge', 'text-anchor': 'end' });
    nBadge.textContent = 'n = ' + n;
    layer.appendChild(nBadge);
  }

  function update() {
    const s = Number(els.n.value);
    const n = sliderToN(s);
    els.valN.textContent = n;

    const Ln = CurveMath.arcLength(n);
    els.outLn.textContent = fmt(Ln, 5);
    els.outLimit.textContent = '2';
    els.outGap.textContent = fmt(2 - Ln, 5);

    drawDiagram(n);
  }

  function stopPlay() {
    playing = false;
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    els.playBtn.setAttribute('aria-pressed', 'false');
    els.playBtn.querySelector('.play-label').textContent = 'Animate n';
  }

  function startPlay() {
    playing = true;
    els.playBtn.setAttribute('aria-pressed', 'true');
    els.playBtn.querySelector('.play-label').textContent = 'Pause';
    playTimer = setInterval(() => {
      let s = Number(els.n.value) + 1;
      if (s > 100) s = 0;
      els.n.value = s;
      update();
      if (s === 100) {
        // pause briefly at the far end, then loop
        clearInterval(playTimer);
        setTimeout(() => {
          if (playing) {
            playTimer = setInterval(() => {
              let s2 = Number(els.n.value) + 1;
              if (s2 > 100) s2 = 0;
              els.n.value = s2;
              update();
            }, 45);
          }
        }, 700);
      }
    }, 45);
  }

  els.n.addEventListener('input', () => { stopPlay(); update(); });

  els.playBtn.addEventListener('click', () => {
    if (playing) stopPlay(); else startPlay();
  });

  els.resetBtn.addEventListener('click', () => {
    stopPlay();
    els.n.value = nToSlider(1);
    update();
  });

  // theme toggle, matching the rest of the site: in-memory only, seeded
  // from the OS preference, no persistence across page loads.
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });
  (function initTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  })();

  els.n.value = nToSlider(3);
  update();
})();
