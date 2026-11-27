(function () {
  // ---------- complex numbers as [re, im] ----------
  const C = (re, im) => [re, im || 0];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const scl = (a, k) => [a[0] * k, a[1] * k];
  const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const conj = (a) => [a[0], -a[1]];
  const abs = (a) => Math.hypot(a[0], a[1]);
  const arg = (a) => Math.atan2(a[1], a[0]);
  const cis = (t) => [Math.cos(t), Math.sin(t)];
  const I = [0, 1], ONE = [1, 0];

  // The Cayley transform used in the thesis (Chapter 2.3): disc -> upper half-plane
  const S = (z) => div(mul(I, sub(ONE, z)), add(ONE, z));          // w = i(1 - z)/(1 + z)
  const Sinv = (w) => div(add(scl(w, -1), I), add(w, I));          // z = (-w + i)/(w + i)

  // distances: thesis formula in the disc, standard formula in the half-plane
  function deltaDisc(z1, z2) {
    const a = abs(sub(ONE, mul(conj(z1), z2))), b = abs(sub(z2, z1));
    return Math.log((a + b) / (a - b));
  }
  function deltaHalf(w1, w2) {
    const d = sub(w1, w2);
    return Math.acosh(1 + (d[0] * d[0] + d[1] * d[1]) / (2 * w1[1] * w2[1]));
  }

  // hyperbolic line through p, q in the disc (Lesson 3), returned as an end-to-end sampler
  function circumcentre(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = a[0] * a[0] + a[1] * a[1], b2 = b[0] * b[0] + b[1] * b[1], c2 = c[0] * c[0] + c[1] * c[1];
    return [(a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
            (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d];
  }
  function geodesic(p, q) {
    const cr = p[0] * q[1] - p[1] * q[0];
    const other = abs(p) > 1e-6 ? scl(p, 1 / (abs(p) ** 2)) : scl(q, 1 / (abs(q) ** 2));
    const c = Math.abs(cr) < 1e-9 ? null : circumcentre(p, q, other);
    if (!c || abs(c) > 1e6) { const t = arg(sub(q, p)); return { type: "diam", ends: [cis(t + Math.PI), cis(t)] }; }
    const r = Math.sqrt(Math.max(abs(c) ** 2 - 1, 0)), phi = arg(c), al = Math.acos(Math.min(1, 1 / abs(c)));
    return { type: "arc", c, r, ends: [cis(phi - al), cis(phi + al)] };
  }
  function samples(g, a, b, n) {
    const out = [];
    if (g.type === "diam") { for (let i = 0; i <= n; i++) out.push(add(a, scl(sub(b, a), i / n))); return out; }
    const t1 = arg(sub(a, g.c));
    let dt = arg(sub(b, g.c)) - t1;
    while (dt > Math.PI) dt -= 2 * Math.PI;
    while (dt < -Math.PI) dt += 2 * Math.PI;
    for (let i = 0; i <= n; i++) out.push(add(g.c, scl(cis(t1 + (dt * i) / n), g.r)));
    return out;
  }

  // ---------- drawing ----------
  const NS = "http://www.w3.org/2000/svg";
  const discSvg = document.getElementById("discSvg"), hpSvg = document.getElementById("hpSvg");
  const discL = document.getElementById("discLayer"), hpL = document.getElementById("hpLayer");
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  // maths coordinates have y up; SVG has y down
  const sv = (z) => [z[0], -z[1]];
  const HP_X = 3.3, HP_TOP = 4.3, BIG = 60;
  // polyline that breaks wherever the points shoot off towards infinity
  function pathD(pts) {
    let d = "", pen = false;
    for (const p of pts) {
      if (!isFinite(p[0]) || !isFinite(p[1]) || abs(p) > BIG) { pen = false; continue; }
      const s = sv(p);
      d += (pen ? "L" : "M") + s[0].toFixed(4) + " " + s[1].toFixed(4);
      pen = true;
    }
    return d || "M0 0";
  }
  const both = (pts, cls) => {
    discL.appendChild(el("path", { d: pathD(pts), class: cls }));
    hpL.appendChild(el("path", { d: pathD(pts.map(S)), class: cls }));
  };
  function handle(layer, key, z, label) {
    const s = sv(z), g = el("g", { "data-key": key });
    const big = layer === hpL ? 2.9 : 1;
    g.appendChild(el("circle", { cx: s[0], cy: s[1], r: 0.09 * big, class: "handle-hit" }));
    g.appendChild(el("circle", { cx: s[0], cy: s[1], r: 0.035 * big, class: "handle pt-a" }));
    g.appendChild(el("text", { x: s[0] + 0.05 * big, y: s[1] - 0.05 * big, class: "lbl" }, label));
    layer.appendChild(g);
  }

  const EDGE_N = 8;
  const edgeColour = (k) => `hsl(${(k * 360) / EDGE_N + 15}, 62%, 52%)`;

  const START = { point: { P: [0.35, 0.3] }, line: { P: [-0.3, 0.45], Q: [0.55, -0.25] } };
  let mode = "point", st = JSON.parse(JSON.stringify(START));
  let showGrid = true, showEdge = true;

  function draw() {
    discL.innerHTML = ""; hpL.innerHTML = "";
    discL.appendChild(el("circle", { cx: 0, cy: 0, r: 1, class: "disc-fill" }));
    hpL.appendChild(el("rect", { x: -HP_X, y: -HP_TOP, width: 2 * HP_X, height: HP_TOP, class: "hp-fill" }));
    for (let x = -3; x <= 3; x++) {
      hpL.appendChild(el("line", { x1: x, y1: 0, x2: x, y2: 0.08, class: "hp-tick" }));
      hpL.appendChild(el("text", { x: x, y: 0.3, class: "hp-tick-label" }, String(x)));
    }

    if (showGrid) {
      // circles of hyperbolic radius 1, 2, 3 round the centre, and 8 lines out from it
      [1, 2, 3].forEach((d) => {
        const r = Math.tanh(d / 2), pts = [];
        for (let i = 0; i <= 720; i++) pts.push(scl(cis((i / 720) * 2 * Math.PI), r));
        both(pts, "grid-circle");
      });
      for (let k = 0; k < 8; k++) {
        const pts = [];
        for (let i = 0; i <= 400; i++) pts.push(scl(cis((k * Math.PI) / 4 + Math.PI / 8), 0.99999 * (i / 400)));
        both(pts, "grid-ray");
      }
      discL.appendChild(el("circle", { cx: 0, cy: 0, r: 0.02, class: "centre-mark" }));
      hpL.appendChild(el("circle", { cx: 0, cy: -1, r: 0.06, class: "centre-mark" }));
    }

    // the edge of the disc, in coloured pieces, and where each piece lands on the real line
    for (let k = 0; k < EDGE_N; k++) {
      const pts = [];
      const a0 = (k * 2 * Math.PI) / EDGE_N, a1 = ((k + 1) * 2 * Math.PI) / EDGE_N;
      for (let i = 0; i <= 200; i++) pts.push(cis(a0 + ((a1 - a0) * i) / 200));
      const col = showEdge ? edgeColour(k) : "var(--color-text)";
      discL.appendChild(el("path", { d: pathD(pts), class: "edge-seg", style: `stroke:${col}` }));
      hpL.appendChild(el("path", { d: pathD(pts.map(S).map((w) => [w[0], 0])), class: "edge-seg", style: `stroke:${col}` }));
    }

    const f2 = (x) => (Math.abs(x) < 0.005 ? "0.00" : x.toFixed(2));
    const cstr = (z) => f2(z[0]) + (z[1] < 0 ? " − " : " + ") + f2(Math.abs(z[1])) + "i";
    const where = (w) => (abs(w) > HP_X + HP_TOP ? " (off the picture)" : "");

    if (mode === "point") {
      const P = st.point.P, W = S(P);
      handle(discL, "P", P, "z");
      handle(hpL, "W", W, "w");
      setRows([
        ["In the disc", "z = " + cstr(P)],
        ["In the half-plane", "w = " + cstr(W) + where(W)],
        ["Distance from the centre / from i", f2(deltaDisc([0, 0], P)) + " = " + f2(deltaHalf(I, W))]
      ]);
    }

    if (mode === "line") {
      const { P, Q } = st.line, g = geodesic(P, Q);
      both(samples(g, g.ends[0], g.ends[1], 600), "geo-main-full");
      both(samples(g, P, Q, 400), "geo-main");
      handle(discL, "P", P, "z₁"); handle(discL, "Q", Q, "z₂");
      const W1 = S(P), W2 = S(Q);
      handle(hpL, "W1", W1, "w₁"); handle(hpL, "W2", W2, "w₂");
      const e = g.ends.map(S);
      const vertical = e.some((w) => !isFinite(w[0]) || Math.abs(w[0]) > 1e4);
      setRows([
        ["The line in the half-plane", vertical ? "A vertical half-line" : "A semicircle on the real line"],
        ["Its ends on the real line", e.map((w) => (!isFinite(w[0]) || Math.abs(w[0]) > 1e4 ? "∞" : f2(w[0]))).join(" and ")],
        ["Distance: disc / half-plane", f2(deltaDisc(P, Q)) + " = " + f2(deltaHalf(W1, W2))]
      ]);
    }
  }

  const $ = (id) => document.getElementById(id);
  function setRows(rows) {
    ["1", "2", "3"].forEach((n, i) => {
      $("r" + n + "l").textContent = rows[i][0];
      $("r" + n + "v").textContent = rows[i][1];
    });
  }

  // ---------- dragging in either picture ----------
  let drag = null;
  function toMath(svg, layer, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(layer.getScreenCTM().inverse());
    return [p.x, -p.y];
  }
  function attach(svg, layer, isHalf) {
    svg.addEventListener("pointerdown", (e) => {
      const g = e.target.closest("[data-key]");
      if (!g) return;
      drag = { key: g.getAttribute("data-key"), isHalf };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener("pointermove", (e) => {
      if (!drag || drag.isHalf !== isHalf) return;
      let p = toMath(svg, layer, e);
      if (isHalf) {
        p = [Math.max(-HP_X, Math.min(HP_X, p[0])), Math.max(0.03, Math.min(HP_TOP - 0.05, p[1]))];
        p = Sinv(p);
      }
      if (abs(p) > 0.97) p = scl(p, 0.97 / abs(p));
      const key = { W: "P", W1: "P", W2: "Q" }[drag.key] || drag.key;
      const set = st[mode];
      const other = key === "P" ? set.Q : set.P;
      if (other && abs(sub(other, p)) < 0.04) return;
      set[key] = p;
      draw();
    });
    const stop = () => (drag = null);
    svg.addEventListener("pointerup", stop);
    svg.addEventListener("pointercancel", stop);
  }
  attach(discSvg, discL, false);
  attach(hpSvg, hpL, true);

  // ---------- controls ----------
  const HELP = {
    point: "Drag <strong>z</strong> in the disc, or <strong>w</strong> in the half-plane; the other one follows. The centre of the disc goes to the point <strong>i</strong>, and the edge of the disc is unrolled onto the real line, colour by colour. The point −1 on the edge goes off to infinity, so the two pieces beside it stretch away to the far left and far right.",
    line: "Drag <strong>z₁</strong> and <strong>z₂</strong> (or their partners on the right). A line of the disc becomes a semicircle standing on the real line, or a vertical half-line when one end of it is the point that goes to infinity. The distance between the points is exactly the same on both sides."
  };
  document.querySelectorAll(".mode-tabs .btn").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll(".mode-tabs .btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("modeHelp").innerHTML = HELP[mode];
      draw();
    })
  );
  $("gridToggle").addEventListener("change", (e) => { showGrid = e.target.checked; draw(); });
  $("edgeToggle").addEventListener("change", (e) => { showEdge = e.target.checked; draw(); });
  $("resetBtn").addEventListener("click", () => { st = JSON.parse(JSON.stringify(START)); draw(); });
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  $("modeHelp").innerHTML = HELP.point;
  draw();
})();
