(function () {
  const svg = document.getElementById("stage");
  const layer = document.getElementById("diagramLayer");
  const crossSlider = document.getElementById("crossSlider");
  const tiltSlider = document.getElementById("tiltSlider");
  const crossLiveVal = document.getElementById("crossLiveVal");
  const tiltLiveVal = document.getElementById("tiltLiveVal");
  const angleTop = document.getElementById("angleTop");
  const angleBottom = document.getElementById("angleBottom");
  const angleSum = document.getElementById("angleSum");
  const angleSumLeft = document.getElementById("angleSumLeft");
  const gapReadout = document.getElementById("gapReadout");
  const meetReadout = document.getElementById("meetReadout");
  const resetBtn = document.getElementById("resetBtn");
  const themeToggle = document.getElementById("themeToggle");

  // viewBox geometry (screen y points down)
  const W = 640, H = 480;
  const CX = 320;          // pivot x of the lower line, and centre of the cross-line range
  const Y_TOP = 160;       // the upper line is horizontal at this height
  const Y_LOW = 320;       // the lower line passes through (CX, Y_LOW)
  const BASE_GAP = Y_LOW - Y_TOP;
  const ARC_R = 28;

  const fmt = (x, d = 1) => {
    const s = x.toFixed(d);
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  };

  // lower line: y = Y_LOW - (x - CX) * tan(theta); positive theta rises to the right
  function lowerY(x, tanT) { return Y_LOW - (x - CX) * tanT; }

  function arcPath(cx, cy, r, a0, a1) {
    // angles in degrees, screen convention (0 = right, 90 = down); sweep from a0 to a1
    const rad = (a) => (a * Math.PI) / 180;
    const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0));
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
    const sweep = a1 > a0 ? 1 : 0;
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
  }

  function render() {
    const t = Number(crossSlider.value);
    const thetaDeg = Number(tiltSlider.value);
    const tanT = Math.tan((thetaDeg * Math.PI) / 180);
    const xc = CX + t;
    const yb = lowerY(xc, tanT);

    // readouts
    const top = 90;
    const bottom = 90 - thetaDeg; // inside angle on the right at the lower line
    const sum = top + bottom;
    crossLiveVal.textContent = fmt(t, 0);
    tiltLiveVal.innerHTML = fmt(thetaDeg) + "&deg;";
    angleTop.innerHTML = fmt(top) + "&deg;";
    angleBottom.innerHTML = fmt(bottom) + "&deg;";
    angleSum.innerHTML = fmt(sum) + "&deg;" + (sum < 180 ? " &lt; 180&deg;" : sum > 180 ? " &gt; 180&deg;" : "");
    const left = 360 - sum;
    angleSumLeft.innerHTML = fmt(left) + "&deg;" + (left < 180 ? " &lt; 180&deg;" : left > 180 ? " &gt; 180&deg;" : "");
    gapReadout.textContent = fmt(yb - Y_TOP, 0);

    let meetX = null;
    if (Math.abs(thetaDeg) < 1e-9) {
      meetReadout.textContent = "Never";
    } else {
      meetX = CX + BASE_GAP / tanT;
      const dist = Math.abs(meetX - xc);
      meetReadout.textContent = (thetaDeg > 0 ? "Yes, on the right, " : "Yes, on the left, ") + fmt(dist, 0) + " units away";
    }

    const parts = [];
    // the two lines, drawn edge to edge
    parts.push(`<line class="pp-line" x1="0" y1="${Y_TOP}" x2="${W}" y2="${Y_TOP}" />`);
    parts.push(`<line class="pp-line-b" x1="0" y1="${lowerY(0, tanT)}" x2="${W}" y2="${lowerY(W, tanT)}" />`);

    // cross-line
    parts.push(`<line class="pp-cross" x1="${xc}" y1="${Y_TOP - 70}" x2="${xc}" y2="${yb + 70}" />`);

    // inside angles on the right-hand side
    // top: from pointing right (0) to pointing down (90)
    parts.push(`<path class="pp-angle" d="${arcPath(xc, Y_TOP, ARC_R, 0, 90)}" />`);
    if (Math.abs(top - 90) < 1e-9) {
      parts.push(`<path class="pp-angle" d="M ${xc + 12} ${Y_TOP} L ${xc + 12} ${Y_TOP + 12} L ${xc} ${Y_TOP + 12}" />`);
    }
    parts.push(`<text class="pp-angle-label" x="${xc + ARC_R + 8}" y="${Y_TOP + ARC_R + 10}">${fmt(top)}°</text>`);
    // bottom: from pointing up (-90) to pointing along the lower line to the right (-theta)
    parts.push(`<path class="pp-angle" d="${arcPath(xc, yb, ARC_R, -90, -thetaDeg)}" />`);
    parts.push(`<text class="pp-angle-label" x="${xc + ARC_R + 8}" y="${yb - ARC_R + 2}">${fmt(bottom)}°</text>`);

    // gap label
    parts.push(`<text class="pp-gap-label" x="${xc - 10}" y="${(Y_TOP + yb) / 2}" text-anchor="end">gap ${fmt(yb - Y_TOP, 0)}</text>`);

    // where they meet
    if (meetX !== null) {
      if (meetX >= 10 && meetX <= W - 10) {
        parts.push(`<circle class="pp-meet" cx="${meetX}" cy="${Y_TOP}" r="6" />`);
        parts.push(`<text class="pp-meet-label" x="${meetX}" y="${Y_TOP - 14}" text-anchor="middle">they meet here</text>`);
      } else {
        const right = meetX > W;
        const ax = right ? W - 12 : 12;
        parts.push(`<text class="pp-meet-label" x="${ax}" y="${Y_TOP + 22}" text-anchor="${right ? "end" : "start"}">${right ? "they meet off to the right →" : "← they meet off to the left"}</text>`);
      }
    }

    // drag handle and hint
    parts.push(`<circle class="pp-cross-handle" id="handle" cx="${xc}" cy="${Y_TOP - 70}" r="12" />`);
    parts.push(`<text class="pp-hint" x="${W / 2}" y="${H - 18}" text-anchor="middle">Drag the orange dot, or use the sliders</text>`);

    layer.innerHTML = parts.join("\n");
  }

  // dragging the cross-line handle
  let dragging = false;
  function toViewBoxX(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return p.x;
  }
  svg.addEventListener("pointerdown", (e) => {
    if (e.target && e.target.id === "handle") {
      dragging = true;
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const x = toViewBoxX(e);
    const t = Math.max(-250, Math.min(250, Math.round(x - CX)));
    crossSlider.value = String(t);
    render();
  });
  const stop = () => { dragging = false; };
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  crossSlider.addEventListener("input", render);
  tiltSlider.addEventListener("input", render);

  resetBtn.addEventListener("click", () => {
    crossSlider.value = "0";
    tiltSlider.value = "0";
    render();
  });

  // theme toggle, same behaviour as the other tools (in-memory only)
  themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", current === "dark" ? "light" : "dark");
  });

  render();
})();
