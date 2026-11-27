(function () {
  // ---------- helpers (points are [x, y]; the disc is the unit circle) ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const len = (a) => Math.hypot(a[0], a[1]);
  const ang = (a) => Math.atan2(a[1], a[0]);
  const unit = (t) => [Math.cos(t), Math.sin(t)];
  const inv = (p) => mul(p, 1 / dot(p, p));
  // complex arithmetic on [re, im]
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => { const d = dot(b, b); return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
  const conj = (a) => [a[0], -a[1]];

  function circumcentre(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = dot(a, a), b2 = dot(b, b), c2 = dot(c, c);
    return [
      (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
      (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d
    ];
  }
  // hyperbolic line through p and q, with its ideal end points
  function geodesic(p, q) {
    const collinear = Math.abs(cross(p, q)) < 1e-9;
    const other = len(p) > 1e-6 ? inv(p) : inv(q);
    const c = collinear ? null : circumcentre(p, q, other);
    if (!c || len(c) > 1e6) {
      const t = ang(sub(q, p));
      return { type: "diam", ends: [unit(t + Math.PI), unit(t)] };
    }
    const r = Math.sqrt(Math.max(dot(c, c) - 1, 0));
    const phi = ang(c), alpha = Math.acos(Math.min(1, 1 / len(c)));
    return { type: "arc", c, r, ends: [unit(phi - alpha), unit(phi + alpha)] };
  }
  function samples(g, a, b, n) {
    const out = [];
    if (g.type === "diam") { for (let i = 0; i <= n; i++) out.push(add(a, mul(sub(b, a), i / n))); return out; }
    const t1 = ang(sub(a, g.c));
    let dt = ang(sub(b, g.c)) - t1;
    while (dt > Math.PI) dt -= 2 * Math.PI;
    while (dt < -Math.PI) dt += 2 * Math.PI;
    for (let i = 0; i <= n; i++) out.push(add(g.c, mul(unit(t1 + (dt * i) / n), g.r)));
    return out;
  }
  const pathD = (pts) => "M" + pts.map((p) => p[0].toFixed(4) + " " + p[1].toFixed(4)).join("L");

  // the thesis's distance formula (Chapter 2): log((|1 - conj(z1) z2| + |z2 - z1|) / (|1 - conj(z1) z2| - |z2 - z1|))
  function delta(z1, z2) {
    const a = len(sub([1, 0], cmul(conj(z1), z2))), b = len(sub(z2, z1));
    return Math.log((a + b) / (a - b));
  }
  // the same distance as log of the cross ratio D(z1, z2, z3, z4), z3, z4 the ends, in cyclic order
  function deltaCross(z1, z2, g) {
    let [e1, e2] = g.ends;
    // cyclic order z1, z2, z3, z4 along the line: z3 is the end beyond z2
    if (len(sub(e1, z2)) > len(sub(e1, z1))) [e1, e2] = [e2, e1];
    const D = cdiv(cdiv(sub(z1, e1), sub(z1, e2)), cdiv(sub(z2, e1), sub(z2, e2)));
    return { D, d: Math.log(len(D)) };
  }
  // hyperbolic length of any polyline: sum of 2|dz| / (1 - |z|^2)
  function hypLength(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const m = mul(add(pts[i], pts[i - 1]), 0.5);
      s += (2 * len(sub(pts[i], pts[i - 1]))) / (1 - dot(m, m));
    }
    return s;
  }
  // hyperbolic circle: centre z0, radius rho, as a Euclidean circle
  function hypCircle(z0, rho) {
    const s = len(z0), d0 = 2 * Math.atanh(Math.min(s, 0.999999));
    const r1 = Math.tanh((d0 - rho) / 2), r2 = Math.tanh((d0 + rho) / 2);
    const u = s > 1e-9 ? mul(z0, 1 / s) : [1, 0];
    return { c: mul(u, (r1 + r2) / 2), r: (r2 - r1) / 2 };
  }

  // ---------- state ----------
  const START = { walk: { d: 3, dir: -Math.PI / 2 }, measure: { P: [-0.7, 0.5], Q: [0.7, 0.5] }, same: { Z: [0.75, 0.05] } };
  let mode = "walk";
  let st = JSON.parse(JSON.stringify(START));
  let timer = null;

  const svg = document.getElementById("stage");
  const layer = document.getElementById("discLayer");
  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function handle(key, p, cls, label) {
    const g = el("g", { "data-key": key });
    g.appendChild(el("circle", { cx: p[0], cy: p[1], r: 0.09, class: "handle-hit" }));
    g.appendChild(el("circle", { cx: p[0], cy: p[1], r: 0.035, class: "handle " + cls }));
    const off = len(p) > 0.05 ? mul(p, 0.08 / len(p)) : [0.06, -0.06];
    g.appendChild(el("text", { x: p[0] + off[0] + 0.02, y: p[1] + off[1] + 0.025, class: "lbl" }, label));
    return g;
  }
  function ideal(p, label) {
    layer.appendChild(el("circle", { cx: p[0], cy: p[1], r: 0.022, class: "ideal" }));
    const q = mul(p, 1.09);
    layer.appendChild(el("text", { x: q[0] - 0.025, y: q[1] + 0.025, class: "lbl lbl-faint" }, label));
  }
  function setRows(rows) {
    ["1", "2", "3"].forEach((n, i) => {
      $("r" + n + "l").textContent = rows[i] ? rows[i][0] : "";
      $("r" + n + "v").textContent = rows[i] ? rows[i][1] : "";
      $("r" + n + "l").parentElement.style.display = rows[i] ? "" : "none";
    });
  }
  const f2 = (x) => x.toFixed(2);

  function draw() {
    layer.innerHTML = "";
    layer.appendChild(el("circle", { cx: 0, cy: 0, r: 1, class: "disc-fill" }));

    if (mode === "walk") {
      const { d, dir } = st.walk;
      const u = unit(dir);
      layer.appendChild(el("line", { x1: 0, y1: 0, x2: u[0], y2: u[1], class: "radius-line" }));
      // a footprint after every whole unit of hyperbolic distance
      for (let k = 1; k <= Math.floor(d + 1e-9); k++) {
        const r = Math.tanh(k / 2);
        layer.appendChild(el("circle", { cx: 0, cy: 0, r, class: "step-ring" }));
        const p = mul(u, r);
        layer.appendChild(el("circle", { cx: p[0], cy: p[1], r: 0.018, class: "step-dot" }));
      }
      const r = Math.tanh(d / 2), p = mul(u, r);
      layer.appendChild(el("circle", { cx: 0, cy: 0, r: 0.016, class: "step-dot" }));
      layer.appendChild(el("text", { x: 0.03, y: -0.03, class: "lbl lbl-faint" }, "O"));
      layer.appendChild(el("circle", { cx: p[0], cy: p[1], r: 0.04, class: "walker" }));
      setRows([
        ["Distance walked (hyperbolic)", f2(d)],
        ["How far across the disc it looks", (r * 100).toFixed(r > 0.999 ? 4 : 1) + "% of the radius"],
        ["Distance still to the edge", "Infinite"]
      ]);
    }

    if (mode === "measure") {
      const { P, Q } = st.measure;
      const g = geodesic(P, Q);
      const arcPts = samples(g, P, Q, 400);
      layer.appendChild(el("path", { d: pathD(samples(g, g.ends[0], g.ends[1], 160)), class: "geo-main-full" }));
      layer.appendChild(el("path", { d: pathD([P, Q]), class: "chord" }));
      layer.appendChild(el("path", { d: pathD(arcPts), class: "geo-main" }));
      const cr = deltaCross(P, Q, g);
      // label the ends in the thesis's cyclic order z1, z2, z3, z4
      let [e1, e2] = g.ends;
      if (len(sub(e1, Q)) > len(sub(e1, P))) [e1, e2] = [e2, e1];
      ideal(e1, "z₃"); ideal(e2, "z₄");
      layer.appendChild(handle("P", P, "pt-a", "z₁"));
      layer.appendChild(handle("Q", Q, "pt-a", "z₂"));
      const chordPts = []; for (let i = 0; i <= 400; i++) chordPts.push(add(P, mul(sub(Q, P), i / 400)));
      setRows([
        ["Cross ratio D(z₁, z₂, z₃, z₄)", f2(len(cr.D))],
        ["Distance along the arc: log D", f2(cr.d)],
        ["Along the straight chord instead", f2(hypLength(chordPts))]
      ]);
      $("check").textContent = "Check with the thesis's formula: " + f2(delta(P, Q));
    }

    if (mode === "same") {
      const rho = 0.8;
      // a ring of equal circles round the centre, and a row towards the edge
      const fixed = [[0, 0]];
      for (let k = 0; k < 6; k++) fixed.push(mul(unit((k * Math.PI) / 3 + Math.PI / 6), Math.tanh(rho / 2)));
      for (let k = 1; k <= 6; k++) fixed.push(mul(unit(Math.PI), Math.tanh(((k + 1) * rho) / 2)));
      fixed.forEach((z) => {
        const h = hypCircle(z, rho / 2);
        layer.appendChild(el("circle", { cx: h.c[0], cy: h.c[1], r: h.r, class: "hcircle" }));
      });
      const Z = st.same.Z, h = hypCircle(Z, rho / 2);
      layer.appendChild(el("circle", { cx: h.c[0], cy: h.c[1], r: h.r, class: "hcircle live" }));
      layer.appendChild(handle("Z", Z, "pt-a", ""));
      setRows([
        ["Radius of every circle (hyperbolic)", f2(rho / 2)],
        ["Your circle's width on the page", ((2 * h.r) / (2 * hypCircle([0, 0], rho / 2).r) * 100).toFixed(0) + "% of the centre one"],
        ["Distance of its centre from O", f2(2 * Math.atanh(Math.min(len(Z), 0.999999)))]
      ]);
    }
  }

  // ---------- dragging ----------
  let dragKey = null;
  function toLocal(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(layer.getScreenCTM().inverse());
    let v = [p.x, p.y];
    const lim = mode === "same" ? 0.985 : 0.975;
    if (len(v) > lim) v = mul(v, lim / len(v));
    return v;
  }
  svg.addEventListener("pointerdown", (e) => {
    if (mode === "walk") {
      // tap or drag anywhere to point the walk in that direction
      const v = toLocal(e);
      if (len(v) > 0.05) { st.walk.dir = ang(v); draw(); }
      dragKey = "dir";
      svg.setPointerCapture(e.pointerId);
      return;
    }
    const g = e.target.closest("[data-key]");
    if (!g) return;
    dragKey = g.getAttribute("data-key");
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragKey) return;
    const p = toLocal(e);
    if (dragKey === "dir") { if (len(p) > 0.05) { st.walk.dir = ang(p); draw(); } return; }
    if (mode === "measure") {
      const other = dragKey === "P" ? st.measure.Q : st.measure.P;
      if (len(sub(other, p)) > 0.04) { st.measure[dragKey] = p; draw(); }
    } else { st.same.Z = p; draw(); }
  });
  const stop = () => (dragKey = null);
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  // ---------- controls ----------
  const HELP = {
    walk: "Each orange footprint is <strong>one unit</strong> of hyperbolic distance further from the centre O. Slide the distance up, or press Walk, and watch the steps crowd together. You can walk as far as you like and never reach the edge. Tap the disc to change direction.",
    measure: "Drag <strong>z₁</strong> and <strong>z₂</strong>. Their distance is the log of the cross ratio of the two points and the line's two ends, z₃ and z₄, exactly as defined in the thesis. The dashed straight chord is <em>longer</em> than the curved arc: in this geometry the arc is the shortest path.",
    same: "Every purple circle has the <strong>same hyperbolic radius</strong>. Drag the teal one towards the edge: on paper it shrinks, but in the geometry of the disc it stays exactly the same size. This is why Escher's fish shrink near the rim."
  };
  function setMode(m) {
    mode = m;
    stopWalk();
    document.querySelectorAll(".mode-tabs .btn").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === m)));
    $("modeHelp").innerHTML = HELP[m];
    $("walkControls").style.display = m === "walk" ? "" : "none";
    $("check").style.display = m === "measure" ? "" : "none";
    draw();
  }
  document.querySelectorAll(".mode-tabs .btn").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

  const slider = $("distSlider"), distOut = $("distOut");
  function setDist(d) { st.walk.d = d; slider.value = d; distOut.textContent = f2(d); draw(); }
  slider.addEventListener("input", () => { stopWalk(); setDist(parseFloat(slider.value)); });
  function stopWalk() { if (timer) { clearInterval(timer); timer = null; $("walkBtn").textContent = "Walk"; } }
  $("walkBtn").addEventListener("click", () => {
    if (timer) { stopWalk(); return; }
    if (st.walk.d >= 12) setDist(0);
    $("walkBtn").textContent = "Pause";
    timer = setInterval(() => {
      const d = Math.min(12, st.walk.d + 0.04);
      setDist(d);
      if (d >= 12) stopWalk();
    }, 40);
  });
  $("homeBtn").addEventListener("click", () => { stopWalk(); setDist(0); });

  $("resetBtn").addEventListener("click", () => { st = JSON.parse(JSON.stringify(START)); setDist(st.walk.d); setMode(mode); });
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  setDist(st.walk.d);
  setMode("walk");
})();
