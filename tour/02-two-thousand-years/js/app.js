(function () {
  const MAC = "https://mathshistory.st-andrews.ac.uk/HistTopics/Non-Euclidean_geometry/";
  const MAC_NAME = "MacTutor, Non-Euclidean geometry";
  const SURVEY = "https://arxiv.org/pdf/1409.1140";
  const SURVEY_NAME = "A Survey of the Development of Geometry up to 1870 (arXiv)";

  // cat: try = tried to prove it, go = let it go, safe = showed the new geometry is consistent, ctx = context
  const EVENTS = [
    { y: -300, year: "c. 300 BC", who: "Euclid", cat: "ctx",
      text: "Writes the Elements and states five postulates. The fifth, about two lines crossed by a third, is the odd one out, and he avoids using it for his first 28 propositions.",
      src: [[MAC, MAC_NAME]] },
    { y: 150, year: "2nd century", who: "Ptolemy", cat: "try",
      text: "One of the first known attempts to prove the fifth postulate from the other four. Without noticing, his proof assumes something equivalent to the very statement he was trying to prove.",
      src: [["https://www.cut-the-knot.org/triangle/pythpar/Attempts.shtml", "Cut the Knot, Attempts to prove"]] },
    { y: 450, year: "5th century", who: "Proclus (c. 410–485)", cat: "try",
      text: "Writes a commentary on the Elements, points out Ptolemy's mistake, and gives his own attempt. His commentary is our earliest source on the whole story.",
      src: [[MAC, MAC_NAME]] },
    { y: 1010, year: "c. 1000", who: "Ibn al-Haytham (965–1039)", cat: "try",
      text: "Attempts a proof by contradiction and brings the idea of motion into geometry. The four-sided figure he used is the one later named after Lambert.",
      src: [["https://en.wikipedia.org/wiki/Parallel_postulate", "Wikipedia, Parallel postulate"]] },
    { y: 1100, year: "c. 1100", who: "Omar Khayyam (1048–1131)", cat: "try",
      text: "Better known for his poetry. He studies a quadrilateral with two equal sides standing at right angles on a base, and considers three possibilities for its top angles: right, less than right, or more than right.",
      src: [["https://arxiv.org/pdf/2610.19253", "Natural Geometry Based on the Rectilinear Plane (arXiv), historical section"]] },
    { y: 1250, year: "by 1251", who: "Nasir al-Din al-Tusi (1201–1274)", cat: "try",
      text: "Writes a treatise to “relieve the doubt” about parallel lines, continuing Khayyam's approach. These ideas later reached Europe.",
      src: [["https://arxiv.org/pdf/2610.19253", "Natural Geometry Based on the Rectilinear Plane (arXiv)"], [SURVEY, SURVEY_NAME]] },
    { y: 1663, year: "1663", who: "John Wallis", cat: "try",
      text: "Thinks he has proved the postulate. In fact he has shown it is equivalent to the claim that a triangle can be scaled up or down without changing its shape.",
      src: [[MAC, MAC_NAME]] },
    { y: 1733, year: "1733", who: "Giovanni Saccheri", cat: "try",
      text: "Publishes Euclid Freed of Every Flaw. He assumes the postulate is false and hunts for a contradiction, proving many theorems of the new geometry along the way without realising it, before wrongly declaring victory.",
      src: [["https://mathshistory.st-andrews.ac.uk/SH/saccheri_sh.pdf", "MacTutor, Saccheri"], [MAC, MAC_NAME]] },
    { y: 1766, year: "1766", who: "Johann Lambert", cat: "try",
      text: "Follows a similar path but finds no contradiction. He notices that in the new geometry the angles of a triangle add up to less the larger the triangle is.",
      src: [[MAC, MAC_NAME]] },
    { y: 1767, year: "1767", who: "Jean d'Alembert", cat: "ctx",
      text: "Calls the problem of the parallel postulate “the scandal of elementary geometry”.",
      src: [[MAC, MAC_NAME]] },
    { y: 1794, year: "1794 onwards", who: "Adrien-Marie Legendre", cat: "try",
      text: "Spends about 40 years on the problem. His attempts appear in successive editions of his very popular Éléments de Géométrie, the last in 1833.",
      src: [[MAC, MAC_NAME], ["https://www.cut-the-knot.org/triangle/pythpar/Attempts.shtml", "Cut the Knot, Attempts to prove"]] },
    { y: 1817, year: "1817", who: "Carl Friedrich Gauss", cat: "go",
      text: "Becomes convinced the fifth postulate cannot be proved from the other four. He keeps this to himself and never publishes anything on the subject, though he discusses it in private letters.",
      src: [[MAC, MAC_NAME], ["https://arxiv.org/pdf/2303.17011", "Bolyai, Gauss, Lobachevsky and the New Geometry: Foreword (arXiv)"]] },
    { y: 1823, year: "1823", who: "János Bolyai", cat: "go",
      text: "A young Hungarian army engineer, he writes to his father that he has discovered things so wonderful that he was astounded: a whole geometry in which the fifth postulate fails.",
      src: [[MAC, MAC_NAME]] },
    { y: 1829, year: "1829", who: "Nikolai Lobachevsky", cat: "go",
      text: "Publishes his geometry, in Russian, in the Kazan Messenger: the first account of non-Euclidean geometry in print. He had first made the ideas known through lectures in Kazan in 1826.",
      src: [["https://mathshistory.st-andrews.ac.uk/Biographies/Lobachevsky/", "MacTutor, Lobachevsky"], ["https://www.math.brown.edu/tbanchof/STG/ma8/papers/anogelo/lobachevsky.html", "Brown University, Lobachevsky"]] },
    { y: 1832, year: "1832", who: "János Bolyai", cat: "go",
      text: "His work finally appears as a short appendix to a two-volume geometry textbook by his father. Bolyai and Lobachevsky worked independently of each other.",
      src: [[SURVEY, SURVEY_NAME]] },
    { y: 1854, year: "1854", who: "Bernhard Riemann", cat: "ctx",
      text: "Gives his famous lecture on the foundations of geometry, opening the way to geometries of curved space. It was published in 1868, after his death.",
      src: [[MAC, MAC_NAME]] },
    { y: 1868, year: "1868", who: "Eugenio Beltrami", cat: "safe",
      text: "Builds a model of the new geometry entirely inside ordinary geometry: on a surface called the pseudosphere, and inside a disc. So if Euclid's geometry has no contradictions, neither does the new one. The fifth postulate can never be proved.",
      src: [["https://mathshistory.st-andrews.ac.uk/SH/beltrami_sh.pdf", "MacTutor, Beltrami"], [MAC, MAC_NAME]] },
    { y: 1871, year: "1871", who: "Felix Klein", cat: "safe",
      text: "Recasts Beltrami's disc model using projective geometry and Cayley's 1859 idea of distance, and gives models of other non-Euclidean geometries too. The disc model is now often called the Beltrami–Klein model.",
      src: [[MAC, MAC_NAME], ["https://arxiv.org/pdf/0712.4294", "Hyperbolic Geometry and Distance Functions on Discrete Groups (arXiv)"]] }
  ];

  const CATS = {
    try: "Trying to prove it",
    go: "Letting it go",
    safe: "Showing the new geometry is sound",
    ctx: "Along the way"
  };

  // piecewise scale: 400 BC to 1600 squeezed into the left quarter; 1600 to 1790 and the busy 1790 to 1880 stretched
  const X0 = 40, X1 = 960;
  const KNOTS = [[-400, X0], [1600, X0 + 0.25 * (X1 - X0)], [1790, X0 + 0.52 * (X1 - X0)], [1880, X1]];
  const XB = KNOTS[1][1];
  function xOf(y) {
    for (let k = 1; k < KNOTS.length; k++) {
      const [ya, xa] = KNOTS[k - 1], [yb, xb] = KNOTS[k];
      if (y <= yb || k === KNOTS.length - 1) return xa + ((y - ya) / (yb - ya)) * (xb - xa);
    }
  }

  const svgNS = "http://www.w3.org/2000/svg";
  const layer = document.getElementById("timelineLayer");
  const card = document.getElementById("eventCard");
  const stepCount = document.getElementById("stepCount");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const resetBtn = document.getElementById("resetBtn");
  const chips = document.querySelectorAll(".chip");
  const visible = { try: true, go: true, safe: true, ctx: true };
  let selected = 0;

  function el(name, attrs, text) {
    const e = document.createElementNS(svgNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  const AXIS_Y = 210;
  // label rows, chosen so neighbouring events don't collide
  const ROWS = [-150, -105, -60, 60, 105, 150];

  function draw() {
    layer.innerHTML = "";
    layer.appendChild(el("line", { x1: X0, y1: AXIS_Y, x2: X1, y2: AXIS_Y, class: "tl-axis" }));
    // scale break
    layer.appendChild(el("line", { x1: XB - 4, y1: AXIS_Y - 9, x2: XB - 10, y2: AXIS_Y + 9, class: "tl-break" }));
    layer.appendChild(el("line", { x1: XB + 4, y1: AXIS_Y - 9, x2: XB - 2, y2: AXIS_Y + 9, class: "tl-break" }));
    layer.appendChild(el("text", { x: (X0 + XB) / 2, y: 392, class: "tl-era" }, "2,000 years, squeezed"));
    layer.appendChild(el("text", { x: (XB + X1) / 2, y: 392, class: "tl-era" }, "The last 280 years, stretched"));

    let lastXByRow = ROWS.map(() => -1e9);
    EVENTS.forEach((ev, i) => {
      const x = xOf(ev.y);
      // pick the first row (alternating above and below) with room for the label
      const order = i % 2 === 0 ? [2, 3, 1, 4, 0, 5] : [3, 2, 4, 1, 5, 0];
      let r = order.find((k) => x - lastXByRow[k] > 105);
      if (r === undefined) r = order[0];
      lastXByRow[r] = x;
      const ly = AXIS_Y + ROWS[r];
      const g = el("g", { class: "tl-event" + (visible[ev.cat] ? "" : " is-hidden"), "data-i": i, tabindex: 0, role: "button", "aria-label": ev.year + ", " + ev.who });
      g.appendChild(el("line", { x1: x, y1: AXIS_Y, x2: x, y2: ly + (ROWS[r] < 0 ? 6 : -16), class: "tl-stem" }));
      g.appendChild(el("circle", { cx: x, cy: AXIS_Y, r: i === selected ? 9 : 7, class: "tl-dot cat-" + ev.cat + (i === selected ? " is-selected" : "") }));
      const short = ev.who.replace(/\s*\(.*\)/, "").split(" ").slice(-1)[0];
      g.appendChild(el("text", { x: x, y: ly, class: "tl-label" + (i === selected ? " is-selected" : "") }, short));
      g.addEventListener("click", () => select(i));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); } });
      layer.appendChild(g);
    });
    [[-300, "300 BC"], [600, "600"], [1300, "1300"], [1650, "1650"], [1700, "1700"], [1750, "1750"], [1800, "1800"], [1825, "1825"], [1850, "1850"], [1875, "1875"]].forEach(([y, t]) => {
      const x = xOf(y);
      layer.appendChild(el("line", { x1: x, y1: AXIS_Y - 5, x2: x, y2: AXIS_Y + 5, class: "tl-tick" }));
      layer.appendChild(el("text", { x: x, y: AXIS_Y + 24, class: "tl-tick-label" }, t));
    });
  }

  function shown() { return EVENTS.map((e, i) => i).filter((i) => visible[EVENTS[i].cat]); }

  function renderCard() {
    const ev = EVENTS[selected];
    const srcs = ev.src.map(([u, n]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join("; ");
    card.innerHTML =
      `<div class="event-year">${ev.year}</div>` +
      `<div class="event-who">${ev.who}</div>` +
      `<div class="event-cat"><span class="sw cat-${ev.cat}"></span>${CATS[ev.cat]}</div>` +
      `<p class="event-text">${ev.text}</p>` +
      `<p class="event-src">Source: ${srcs}</p>`;
    const list = shown();
    const pos = list.indexOf(selected);
    stepCount.textContent = (pos + 1) + " of " + list.length;
    prevBtn.disabled = pos <= 0;
    nextBtn.disabled = pos >= list.length - 1;
  }

  const wrap = document.querySelector(".stage-wrap");
  function select(i, scroll) {
    selected = i; draw(); renderCard();
    if (scroll && wrap.scrollWidth > wrap.clientWidth + 2) {
      const svg = document.getElementById("stage");
      const px = (xOf(EVENTS[i].y) / 1000) * svg.getBoundingClientRect().width;
      wrap.scrollTo({ left: Math.max(0, px - wrap.clientWidth / 2), behavior: "smooth" });
    }
  }

  function step(d) {
    const list = shown();
    const pos = list.indexOf(selected);
    const n = pos + d;
    if (n >= 0 && n < list.length) select(list[n], true);
  }

  prevBtn.addEventListener("click", () => step(-1));
  nextBtn.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  chips.forEach((c) => c.addEventListener("click", () => {
    const k = c.dataset.cat;
    visible[k] = !visible[k];
    c.setAttribute("aria-pressed", String(visible[k]));
    if (!shown().length) { visible[k] = true; c.setAttribute("aria-pressed", "true"); }
    if (!visible[EVENTS[selected].cat]) selected = shown()[0];
    draw(); renderCard();
  }));

  resetBtn.addEventListener("click", () => {
    Object.keys(visible).forEach((k) => (visible[k] = true));
    chips.forEach((c) => c.setAttribute("aria-pressed", "true"));
    select(0);
  });

  document.getElementById("themeToggle").addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", current === "dark" ? "light" : "dark");
  });

  select(0);
})();
