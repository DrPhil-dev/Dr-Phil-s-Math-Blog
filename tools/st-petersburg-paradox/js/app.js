(function () {
  const potValueEl = document.getElementById("potValue");
  const potStatusEl = document.getElementById("potStatus");
  const coinEl = document.getElementById("coin");
  const flipBtn = document.getElementById("flipBtn");
  const newGameBtn = document.getElementById("newGameBtn");
  const flipHistoryEl = document.getElementById("flipHistory");
  const chartLayer = document.getElementById("chartLayer");
  const chartCountEl = document.getElementById("chartCount");

  const batchSizeInput = document.getElementById("batchSize");
  const batchLiveVal = document.getElementById("batchLiveVal");
  const runBatchBtn = document.getElementById("runBatchBtn");
  const resetBtn = document.getElementById("resetBtn");

  const outGames = document.getElementById("outGames");
  const outTotal = document.getElementById("outTotal");
  const outAvg = document.getElementById("outAvg");
  const outMax = document.getElementById("outMax");
  const outLongest = document.getElementById("outLongest");
  const themeToggle = document.getElementById("themeToggle");

  const MAX_HISTORY_CHIPS = 60;
  const MAX_CHART_POINTS = 300;

  // --- state ---
  let pot = 1;
  let currentFlips = [];
  let inProgress = false;
  let flipping = false;

  let gamesPlayed = 0;
  let totalWinnings = 0;
  let maxPayout = 0;
  let longestTailsRun = 0;
  let runningAverages = []; // sampled points for the chart, [{game, avg}]

  function formatMoney(n) {
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1000) return "$" + n.toLocaleString("en-US");
    return "$" + n;
  }

  function startGame() {
    pot = 1;
    currentFlips = [];
    inProgress = true;
    potValueEl.textContent = formatMoney(pot);
    potStatusEl.textContent = "In progress, flip again";
    flipHistoryEl.innerHTML = "";
    coinEl.classList.remove("show-tails", "flipping");
  }

  function addHistoryChip(isHeads) {
    const chip = document.createElement("span");
    chip.className = "flip-chip " + (isHeads ? "heads" : "tails");
    chip.textContent = isHeads ? "H" : "T";
    flipHistoryEl.appendChild(chip);
    while (flipHistoryEl.children.length > MAX_HISTORY_CHIPS) {
      flipHistoryEl.removeChild(flipHistoryEl.firstChild);
    }
  }

  function recordGame(payout, tailsRun) {
    gamesPlayed += 1;
    totalWinnings += payout;
    if (payout > maxPayout) maxPayout = payout;
    if (tailsRun > longestTailsRun) longestTailsRun = tailsRun;

    runningAverages.push({ game: gamesPlayed, avg: totalWinnings / gamesPlayed });
    if (runningAverages.length > MAX_CHART_POINTS) {
      // downsample by dropping every other older point, keep recent ones dense
      const half = [];
      for (let i = 0; i < runningAverages.length; i += 2) half.push(runningAverages[i]);
      runningAverages = half;
    }

    updateStats();
    drawChart();
  }

  function updateStats() {
    outGames.textContent = gamesPlayed.toLocaleString("en-US");
    outTotal.textContent = formatMoney(Math.round(totalWinnings));
    outAvg.textContent = gamesPlayed > 0 ? formatMoney(Math.round(totalWinnings / gamesPlayed)) : "\u2014";
    outMax.textContent = gamesPlayed > 0 ? formatMoney(maxPayout) : "\u2014";
    outLongest.textContent = gamesPlayed > 0 ? longestTailsRun + " tails in a row" : "\u2014";
    chartCountEl.textContent = gamesPlayed.toLocaleString("en-US") + (gamesPlayed === 1 ? " game played" : " games played");
  }

  function drawChart() {
    const W = 640, H = 220, PAD_L = 46, PAD_R = 14, PAD_T = 14, PAD_B = 26;

    if (runningAverages.length < 2) {
      chartLayer.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="chart-empty-label" fill="var(--color-text-faint)" font-size="13">Play a game or run a batch to see the average</text>`;
      return;
    }

    const maxAvg = Math.max(...runningAverages.map((p) => p.avg), 1);
    const minGame = runningAverages[0].game;
    const maxGame = runningAverages[runningAverages.length - 1].game;
    const gameSpan = Math.max(maxGame - minGame, 1);

    const xFor = (g) => PAD_L + ((g - minGame) / gameSpan) * (W - PAD_L - PAD_R);
    const yFor = (v) => H - PAD_B - (v / maxAvg) * (H - PAD_T - PAD_B);

    const pathD = runningAverages
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.game).toFixed(1)} ${yFor(p.avg).toFixed(1)}`)
      .join(" ");

    const gridLines = [];
    const ticks = 4;
    const seenLabels = new Set();
    for (let i = 0; i <= ticks; i++) {
      const v = (maxAvg / ticks) * i;
      const y = yFor(v);
      gridLines.push(
        `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" class="chart-grid" />`
      );
      const label = formatMoney(Math.round(v));
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        gridLines.push(
          `<text x="${PAD_L - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" class="chart-tick">${label}</text>`
        );
      }
    }

    chartLayer.innerHTML = `
      ${gridLines.join("\n")}
      <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" class="chart-axis" />
      <path d="${pathD}" fill="none" class="chart-line" />
      <circle cx="${xFor(runningAverages[runningAverages.length - 1].game).toFixed(1)}" cy="${yFor(runningAverages[runningAverages.length - 1].avg).toFixed(1)}" r="4" class="chart-dot" />
    `;
  }

  function flipOnce() {
    if (flipping) return;
    if (!inProgress) startGame();

    flipping = true;
    flipBtn.disabled = true;

    const isHeads = Math.random() < 0.5;
    coinEl.classList.add("flipping");
    if (!isHeads) {
      // will end up tails-side showing after the spin
    }

    setTimeout(() => {
      coinEl.classList.remove("flipping");
      coinEl.classList.toggle("show-tails", !isHeads);

      addHistoryChip(isHeads);

      if (isHeads) {
        potStatusEl.textContent = `Heads! You win ${formatMoney(pot)}.`;
        const tailsRun = currentFlips.length;
        recordGame(pot, tailsRun);
        inProgress = false;
      } else {
        currentFlips.push("T");
        pot *= 2;
        potValueEl.textContent = formatMoney(pot);
        potStatusEl.textContent = "Tails, the pot doubles. Flip again.";
      }

      flipping = false;
      flipBtn.disabled = false;
    }, 650);
  }

  function simulateOneGame() {
    let p = 1;
    let flips = 0;
    // cap to avoid pathological loops; 60 flips already means a pot beyond 10^17
    while (Math.random() < 0.5 && flips < 60) {
      p *= 2;
      flips += 1;
    }
    return { payout: p, tailsRun: flips };
  }

  function runBatch(n) {
    for (let i = 0; i < n; i++) {
      const { payout, tailsRun } = simulateOneGame();
      recordGame(payout, tailsRun);
    }
  }

  flipBtn.addEventListener("click", flipOnce);

  newGameBtn.addEventListener("click", () => {
    startGame();
  });

  batchSizeInput.addEventListener("input", () => {
    batchLiveVal.textContent = batchSizeInput.value;
  });

  runBatchBtn.addEventListener("click", () => {
    const n = Number(batchSizeInput.value);
    runBatchBtn.disabled = true;
    // run in chunks so the UI can update the chart progressively without freezing on large batches
    let remaining = n;
    const chunk = 50;
    function step() {
      const thisChunk = Math.min(chunk, remaining);
      runBatch(thisChunk);
      remaining -= thisChunk;
      if (remaining > 0) {
        requestAnimationFrame(step);
      } else {
        runBatchBtn.disabled = false;
      }
    }
    step();
  });

  resetBtn.addEventListener("click", () => {
    pot = 1;
    currentFlips = [];
    inProgress = false;
    flipping = false;
    gamesPlayed = 0;
    totalWinnings = 0;
    maxPayout = 0;
    longestTailsRun = 0;
    runningAverages = [];

    potValueEl.textContent = "$1";
    potStatusEl.textContent = "Flip the coin to begin";
    flipHistoryEl.innerHTML = "";
    coinEl.classList.remove("show-tails", "flipping");

    updateStats();
    drawChart();
  });

  // theme toggle, mirrors the other tools on the site (in-memory only, no persistence)
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  updateStats();
  drawChart();
})();
