(function () {
  // ---------- small vector helpers (points are [x, y], the disc is the unit circle) ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const len = (a) => Math.hypot(a[0], a[1]);
  const ang = (a) => Math.atan2(a[1], a[0]);
  const unit = (t) => [Math.cos(t), Math.sin(t)];
  const DEG = 180 / Math.PI;

  // inversion in the unit circle
  const inv = (p) => mul(p, 1 / dot(p, p));

  function circumcentre(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-12) return null;
    const a2 = dot(a, a), b2 = dot(b, b), c2 = dot(c, c);
    return [
      (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d,
      (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d
    ];
  }

  // The hyperbolic line through p and q (q may be an ideal point on the boundary).
  // Returns {type:'diam', dir} or {type:'arc', c, r}, plus its two ideal end points.
  function geodesic(p, q) {
    const collinear = Math.abs(cross(p, q)) < 1e-9 * Math.max(1, len(p) * len(q));
    let other = len(p) > 1e-6 ? inv(p) : (len(q) < 0.999999 ? inv(q) : null);
    if (collinear || !other) {
      const d = len(sub(q, p)) > 1e-9 ? sub(q, p) : p;
      const t = ang(d);
      return { type: "diam", ends: [unit(t + Math.PI), unit(t)] };
    }
    const c = circumcentre(p, q, other);
    if (!c || len(c) > 1e6) {
      const t = ang(sub(q, p));
      return { type: "diam", ends: [unit(t + Math.PI), unit(t)] };
    }
    const r = Math.sqrt(Math.max(dot(c, c) - 1, 0));
    const phi = ang(c), alpha = Math.acos(Math.min(1, 1 / len(c)));
    return { type: "arc", c, r, ends: [unit(phi - alpha), unit(phi + alpha)] };
  }

  // Points along the geodesic g from a to b (both on g).
  function samples(g, a, b, n) {
    const out = [];
    if (g.type === "diam") {
      for (let i = 0; i <= n; i++) out.push(add(a, mul(sub(b, a), i / n)));
      return out;
    }
    const t1 = ang(sub(a, g.c));
    let dt = ang(sub(b, g.c)) - t1;
    while (dt > Math.PI) dt -= 2 * Math.PI;
    while (dt < -Math.PI) dt += 2 * Math.PI;
    for (let i = 0; i <= n; i++) out.push(add(g.c, mul(unit(t1 + (dt * i) / n), g.r)));
    return out;
  }
  const pathD = (pts) => "M" + pts.map((p) => p[0].toFixed(4) + " " + p[1].toFixed(4)).join("L");

  // hyperbolic line through point p in direction t (used for the fan of parallels)
  function geodesicDir(p, t) {
    const d = unit(t), n = [-d[1], d[0]];
    const pn = dot(p, n);
    if (Math.abs(pn) < 1e-9) return { type: "diam", ends: [unit(ang(d) + Math.PI), unit(ang(d))] };
    const s = (1 - dot(p, p)) / (2 * pn);
    const c = add(p, mul(n, -s));
    // centre must satisfy |c|^2 = 1 + r^2 with r = |s|; flip sign if needed
    const c2 = add(p, mul(n, s));
    const cc = Math.abs(dot(c, c) - 1 - s * s) < Math.abs(dot(c2, c2) - 1 - s * s) ? c : c2;
    const r = Math.abs(s);
    const phi = ang(cc), alpha = Math.acos(Math.min(1, 1 / len(cc)));
    return { type: "arc", c: cc, r, ends: [unit(phi - alpha), unit(phi + alpha)] };
  }

  // direction in which you leave p when travelling along g towards b
  function heading(g, p, b) {
    if (g.type === "diam") return sub(b, p);
    const rad = sub(p, g.c), t = [-rad[1], rad[0]]; // exact tangent at p
    const step = sub(samples(g, p, b, 400)[1], p);
    return dot(t, step) >= 0 ? t : mul(t, -1);
  }
  function angleBetween(u, v) {
    return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v)))));
  }

  // ---------- state ----------
  const START = {
    line: { P: [-0.55, 0.15], Q: [0.2, 0.55] },
    par: { P: [-0.55, 0.3], Q: [0.55, 0.3], R: [0.05, -0.35] },
    tri: { A: [-0.6, -0.35], B: [0.62, -0.3], C: [0.05, 0.6] }
  };
  let mode = "line";
  let pts = JSON.parse(JSON.stringify(START));
  let showFull = true;

  const svg = document.getElementById("stage");
  const layer = document.getElementById("discLayer");
  const NS = "http://www.w3.org/2000/svg";
  function el(name, attrs, text) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function geoPath(g, cls) {
    return el("path", { d: pathD(samples(g, g.ends[0], g.ends[1], 160)), class: cls });
  }
  function segPath(a, b, cls) {
    return el("path", { d: pathD(samples(geodesic(a, b), a, b, 120)), class: cls });
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
    if (label) {
      const q = mul(p, 1.09);
      layer.appendChild(el("text", { x: q[0] - 0.025, y: q[1] + 0.025, class: "lbl lbl-faint" }, label));
    }
  }

  const $ = (id) => document.getElementById(id);
  const out = { a: $("r1v"), b: $("r2v"), c: $("r3v"), al: $("r1l"), bl: $("r2l"), cl: $("r3l") };
  function setRows(rows) {
    [["al", "a"], ["bl", "b"], ["cl", "c"]].forEach(([l, v], i) => {
      out[l].textContent = rows[i] ? rows[i][0] : "";
      out[v].textContent = rows[i] ? rows[i][1] : "";
      out[l].parentElement.style.display = rows[i] ? "" : "none";
    });
  }

  function draw() {
    layer.innerHTML = "";
    layer.appendChild(el("circle", { cx: 0, cy: 0, r: 1, class: "disc-fill" }));

    if (mode === "line") {
      const { P, Q } = pts.line;
      const g = geodesic(P, Q);
      if (showFull && g.type === "arc") layer.appendChild(el("circle", { cx: g.c[0], cy: g.c[1], r: g.r, class: "geo-guide" }));
      layer.appendChild(geoPath(g, "geo-main"));
      ideal(g.ends[0], "S"); ideal(g.ends[1], "T");
      layer.appendChild(handle("P", P, "pt-a", "P"));
      layer.appendChild(handle("Q", Q, "pt-a", "Q"));
      let meet = "90°";
      if (g.type === "arc") {
        // angle with the boundary at S: between radius OS and radius CS
        const S = g.ends[0];
        meet = Math.round(angleBetween(S, sub(S, g.c)) * DEG) + "°";
      }
      setRows([
        ["Kind of line", g.type === "diam" ? "A diameter (straight)" : "An arc of a circle"],
        ["Where it meets the edge", "At right angles (" + meet + ")"],
        ["Lines through P and Q", "Exactly one"]
      ]);
    }

    if (mode === "par") {
      const { P, Q, R } = pts.par;
      const L = geodesic(P, Q);
      const [S, T] = L.ends;
      const onLine = L.type === "arc" ? Math.abs(len(sub(R, L.c)) - L.r) < 0.02 : Math.abs(cross(sub(L.ends[1], L.ends[0]), sub(R, L.ends[0]))) / 2 < 0.02;
      // the fan of lines through R that never meet L
      if (!onLine) {
        const gS = geodesic(R, S), gT = geodesic(R, T);
        const a = ang(heading(gS, R, S)), b = ang(heading(gT, R, T));
        let w = b - a;
        while (w > Math.PI) w -= 2 * Math.PI;
        while (w < -Math.PI) w += 2 * Math.PI;
        const span = Math.sign(w) * Math.PI - w; // the directions from b round to a + pi
        const k = 7;
        for (let i = 1; i < k; i++) layer.appendChild(geoPath(geodesicDir(R, b + (span * i) / k), "geo-par"));
        layer.appendChild(geoPath(gS, "geo-lim"));
        layer.appendChild(geoPath(gT, "geo-lim"));
      }
      layer.appendChild(geoPath(L, "geo-main"));
      ideal(S, "S"); ideal(T, "T");
      layer.appendChild(handle("P", P, "pt-a", "P"));
      layer.appendChild(handle("Q", Q, "pt-a", "Q"));
      layer.appendChild(handle("R", R, "pt-b", "R"));
      setRows(onLine
        ? [["Point R", "Sits on the line: move it off"], null, null]
        : [["Lines through R that never meet the line", "Infinitely many"],
           ["Boundary cases (meet it only at S or T)", "Two, shown bold"],
           ["In Euclid's geometry", "Exactly one"]]);
    }

    if (mode === "tri") {
      const { A, B, C } = pts.tri;
      const gAB = geodesic(A, B), gBC = geodesic(B, C), gCA = geodesic(C, A);
      const poly = samples(gAB, A, B, 60).concat(samples(gBC, B, C, 60).slice(1), samples(gCA, C, A, 60).slice(1));
      layer.appendChild(el("path", { d: pathD(poly) + "Z", class: "tri-fill" }));
      if (showFull) layer.appendChild(el("path", { d: pathD([A, B, C]) + "Z", class: "euc-side" }));
      layer.appendChild(el("path", { d: pathD(poly) + "Z", class: "geo-side" }));
      const angAt = (X, Y, Z, gXY, gXZ) => angleBetween(heading(gXY, X, Y), heading(gXZ, X, Z));
      const a = angAt(A, B, C, gAB, gCA), b = angAt(B, C, A, gBC, gAB), c = angAt(C, A, B, gCA, gBC);
      layer.appendChild(handle("A", A, "pt-c", "A"));
      layer.appendChild(handle("B", B, "pt-c", "B"));
      layer.appendChild(handle("C", C, "pt-c", "C"));
      const sum = (a + b + c) * DEG;
      const r = (x) => (x * DEG).toFixed(1) + "°";
      setRows([
        ["Angles at A, B, C", r(a) + " + " + r(b) + " + " + r(c)],
        ["Angle sum", sum.toFixed(1) + "°"],
        ["Short of 180° by", (180 - sum).toFixed(1) + "°"]
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
    const m = len(v);
    if (m > 0.96) v = mul(v, 0.96 / m);
    return v;
  }
  svg.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("[data-key]");
    if (!g) return;
    dragKey = g.getAttribute("data-key");
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragKey) return;
    const p = toLocal(e);
    const set = pts[mode];
    // keep two points from landing on top of each other
    const others = Object.keys(set).filter((k) => k !== dragKey).map((k) => set[k]);
    if (others.every((o) => len(sub(o, p)) > 0.05)) { set[dragKey] = p; draw(); }
  });
  const stop = () => (dragKey = null);
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  // ---------- controls ----------
  const HELP = {
    line: "Drag <strong>P</strong> and <strong>Q</strong>. Through any two points there is exactly one line, and it meets the edge of the disc at right angles at its two ends, <strong>S</strong> and <strong>T</strong>. Put P and Q in line with the centre and the line becomes a straight diameter.",
    par: "Drag <strong>R</strong> off the teal line. Every orange line passes through R and never meets the teal line. The two bold ones only touch it at the edge, at S or T, which is not part of the plane.",
    tri: "Drag <strong>A</strong>, <strong>B</strong> and <strong>C</strong>. The sides are lines of this geometry, so they bow inwards. The angles always add up to less than 180&deg;, and the bigger the triangle, the bigger the shortfall."
  };
  const fullLbl = { line: "Show the whole circle the line lies on", par: null, tri: "Show the Euclidean triangle for comparison" };
  document.querySelectorAll(".mode-tabs .btn").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      document.querySelectorAll(".mode-tabs .btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $("modeHelp").innerHTML = HELP[mode];
      $("fullWrap").style.display = fullLbl[mode] ? "" : "none";
      if (fullLbl[mode]) $("fullText").textContent = fullLbl[mode];
      draw();
    })
  );
  $("fullToggle").addEventListener("change", (e) => { showFull = e.target.checked; draw(); });
  $("resetBtn").addEventListener("click", () => { pts = JSON.parse(JSON.stringify(START)); draw(); });
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  $("modeHelp").innerHTML = HELP.line;
  draw();
})();
