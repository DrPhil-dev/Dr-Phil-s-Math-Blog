(function () {
  const layer = document.getElementById("diagramLayer");
  const slider = document.getElementById("cutsSlider");
  const liveVal = document.getElementById("cutsLiveVal");
  const pieceReadout = document.getElementById("pieceReadout");
  const formulaReadout = document.getElementById("formulaReadout");
  const diffReadout = document.getElementById("diffReadout");
  const resetBtn = document.getElementById("resetBtn");
  const themeToggle = document.getElementById("themeToggle");

  const DEFAULT_N = 4;
  const MAX_N = 6;

  const VB_W = 640;
  const VB_H = 640;
  const CX = VB_W / 2;
  const CY = VB_H / 2;
  const R = 260;

  function render(n) {
    const p = maxPieces(n);
    const prev = n > 0 ? maxPieces(n - 1) : null;

    liveVal.textContent = n;
    pieceReadout.textContent = p;
    formulaReadout.textContent = `p(${n}) = ${n}(${n}+1)/2 + 1 = ${p}`;
    diffReadout.textContent =
      prev === null ? "—" : `p(${n}) − p(${n - 1}) = ${p - prev}`;

    const cuts = n > 0 ? generateCuts(n, R) : [];
    const rawLabelPoints = n === 0 ? [{ x: 0, y: 0 }] : estimateRegionLabelPoints(cuts, R, p);
    const labelPoints = declutterLabelPoints(rawLabelPoints, 24);

    const svgParts = [];
    svgParts.push(`<circle class="pizza-outline" cx="${CX}" cy="${CY}" r="${R}" />`);

    cuts.forEach((c) => {
      svgParts.push(
        `<line class="pizza-cut" x1="${CX + c.x1}" y1="${CY + c.y1}" x2="${CX + c.x2}" y2="${CY + c.y2}" />`
      );
    });

    labelPoints.forEach((pt, i) => {
      svgParts.push(`<text class="piece-label" x="${CX + pt.x}" y="${CY + pt.y}">${i + 1}</text>`);
    });

    layer.innerHTML = svgParts.join("\n");
  }

  slider.addEventListener("input", () => render(Number(slider.value)));

  resetBtn.addEventListener("click", () => {
    slider.value = DEFAULT_N;
    render(DEFAULT_N);
  });

  // theme toggle, mirrors the Monge's theorem / Downhill Aiming tools (in-memory only, no persistence)
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  slider.max = String(MAX_N);
  slider.value = String(DEFAULT_N);
  render(DEFAULT_N);
})();
