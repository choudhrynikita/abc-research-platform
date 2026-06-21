const NIFTY_REFRESH_MS = 5 * 60 * 1000;

let niftyChart = null;
let niftyRefreshTimer = null;
let niftyHistory = null;
let niftyPrediction = null;

const niftyEls = {
  panel: document.getElementById("niftyPanel"),
  error: document.getElementById("niftyError"),
  signal: document.getElementById("niftySignal"),
  confidence: document.getElementById("niftyConfidence"),
  weeklyCard: document.getElementById("weeklyPredictionCard"),
  monthlyCard: document.getElementById("monthlyPredictionCard"),
  breakdown: document.getElementById("predictionBreakdown"),
  indicators: document.getElementById("indicatorPanel"),
  disclaimer: document.getElementById("niftyDisclaimer"),
  updatedAt: document.getElementById("niftyUpdatedAt"),
};

function formatNumber(value, decimals = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function signalClass(signal) {
  if (signal === "BULLISH") return "positive";
  if (signal === "BEARISH") return "negative";
  return "neutral";
}

function renderPredictionCard(container, prediction, title) {
  if (!container || !prediction) return;
  const delta = prediction.target - niftyPrediction.currentPrice;
  const deltaPct = (delta / niftyPrediction.currentPrice) * 100;

  container.innerHTML = `
    <div class="prediction-card-header">
      <h3>${title}</h3>
      <span class="prediction-expiry">${prediction.date} · ${prediction.daysAway} trading days</span>
    </div>
    <div class="prediction-target ${signalClass(prediction.signal)}">${formatNumber(prediction.target)}</div>
    <div class="prediction-range">Range: ${formatNumber(prediction.range.low)} – ${formatNumber(prediction.range.high)}</div>
    <div class="prediction-meta">
      <span class="signal-badge ${signalClass(prediction.signal)}">${prediction.signal}</span>
      <span>${delta > 0 ? "+" : ""}${formatNumber(delta)} (${deltaPct > 0 ? "+" : ""}${formatNumber(deltaPct)}%)</span>
      <span>${prediction.confidence}% confidence</span>
    </div>
  `;
}

function renderBreakdown(prediction) {
  if (!niftyEls.breakdown || !prediction) return;
  const rows = ["weekly", "monthly"]
    .map((key) => {
      const item = prediction.predictions[key];
      const b = item.breakdown;
      return `
        <tr>
          <td>${item.label}</td>
          <td class="num">${formatNumber(b.technical.target)}</td>
          <td class="num">${formatNumber(b.statistical.target)}</td>
          <td class="num">${formatNumber(b.ml.target)}</td>
          <td class="num strong">${formatNumber(item.target)}</td>
          <td><span class="signal-badge ${signalClass(item.signal)}">${item.signal}</span></td>
        </tr>
      `;
    })
    .join("");

  niftyEls.breakdown.innerHTML = `
    <table class="breakdown-table">
      <thead>
        <tr>
          <th>Expiry</th>
          <th class="num">Technical</th>
          <th class="num">Statistical</th>
          <th class="num">ML</th>
          <th class="num">Ensemble</th>
          <th>Signal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderIndicatorPanel(prediction) {
  if (!niftyEls.indicators || !prediction) return;
  const i = prediction.indicators;

  niftyEls.indicators.innerHTML = `
    <div class="indicator-card">
      <div class="label">RSI (14)</div>
      <div class="value ${i.rsi > 70 ? "negative" : i.rsi < 30 ? "positive" : ""}">${formatNumber(i.rsi, 1)}</div>
      <div class="hint">${i.rsi > 70 ? "Overbought" : i.rsi < 30 ? "Oversold" : "Neutral zone"}</div>
    </div>
    <div class="indicator-card">
      <div class="label">MACD Histogram</div>
      <div class="value ${i.macdHistogram >= 0 ? "positive" : "negative"}">${formatNumber(i.macdHistogram, 2)}</div>
      <div class="hint">${i.macdHistogram >= 0 ? "Bullish momentum" : "Bearish momentum"}</div>
    </div>
    <div class="indicator-card">
      <div class="label">SMA 20 / 50</div>
      <div class="value">${formatNumber(i.sma20)} / ${formatNumber(i.sma50)}</div>
      <div class="hint">${i.sma20 > i.sma50 ? "Short-term strength" : "Short-term weakness"}</div>
    </div>
    <div class="indicator-card">
      <div class="label">Support / Resistance</div>
      <div class="value">${formatNumber(i.support)} / ${formatNumber(i.resistance)}</div>
      <div class="hint">20-day swing levels</div>
    </div>
  `;
}

function buildChartDatasets(history, prediction) {
  const candles = history.candles.slice(-90);
  const labels = candles.map((c) => c.date);
  const candlePoints = candles.map((c) => ({
    x: c.date,
    o: c.open,
    h: c.high,
    l: c.low,
    c: c.close,
  }));

  const sma20 = prediction.indicatorSeries.sma20.slice(-90);
  const sma50 = prediction.indicatorSeries.sma50.slice(-90);
  const sma20Offset = labels.length - sma20.length;

  const datasets = [
    {
      label: "Nifty Candlesticks",
      data: candlePoints,
      type: "candlestick",
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
      borderColor: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
      parsing: false,
      order: 1,
    },
    {
      label: "SMA 20",
      data: sma20.map((value, index) => ({ x: labels[sma20Offset + index], y: value })),
      borderColor: "#60a5fa",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      pointRadius: 0,
      type: "line",
      order: 2,
    },
    {
      label: "SMA 50",
      data: sma50.map((value, index) => ({ x: labels[sma20Offset + index], y: value })),
      borderColor: "#f59e0b",
      backgroundColor: "transparent",
      borderWidth: 1.5,
      pointRadius: 0,
      type: "line",
      order: 2,
    },
  ];

  const lastDate = labels[labels.length - 1];
  const weeklyTarget = prediction.predictions.weekly.target;
  const monthlyTarget = prediction.predictions.monthly.target;

  datasets.push(
    {
      label: "Weekly Target",
      data: [
        { x: lastDate, y: weeklyTarget },
        { x: prediction.expiries.weekly.date, y: weeklyTarget },
      ],
      borderColor: "#38bdf8",
      borderDash: [6, 4],
      pointRadius: 0,
      type: "line",
      order: 0,
    },
    {
      label: "Monthly Target",
      data: [
        { x: lastDate, y: monthlyTarget },
        { x: prediction.expiries.monthly.date, y: monthlyTarget },
      ],
      borderColor: "#a78bfa",
      borderDash: [10, 5],
      pointRadius: 0,
      type: "line",
      order: 0,
    }
  );

  return { labels, datasets };
}

function registerChartPlugins() {
  if (!window.Chart) return;
  if (window.chartjsPluginAnnotation) {
    Chart.register(window.chartjsPluginAnnotation);
  }
}

function buildStrategyAnnotations() {
  const strategies = window.alignmentData?.strategies || [];
  const annotations = {};
  const colors = { entry: "#94a3b8", target: "#22c55e", stopLoss: "#ef4444" };

  strategies.forEach((strategy, index) => {
    ["entry", "target", "stopLoss"].forEach((key) => {
      const value = strategy[key];
      if (value == null) return;
      const id = `strategy-${index}-${key}`;
      annotations[id] = {
        type: "line",
        yMin: value,
        yMax: value,
        borderColor: colors[key],
        borderWidth: 1,
        borderDash: key === "entry" ? [2, 2] : [6, 3],
        label: {
          display: true,
          content: `${strategy.name.slice(0, 12)} ${key}`,
          color: "#e2e8f0",
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          font: { size: 10 },
        },
      };
    });
  });

  return annotations;
}

function renderNiftyChart(history, prediction) {
  const canvas = document.getElementById("niftyChart");
  if (!canvas || !window.Chart) return;

  registerChartPlugins();
  const { labels, datasets } = buildChartDatasets(history, prediction);
  const strategyAnnotations = buildStrategyAnnotations();

  if (niftyChart) {
    niftyChart.destroy();
  }

  niftyChart = new Chart(canvas, {
    data: {
      labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#c7d2e3" },
        },
        tooltip: {
          callbacks: {
            label(context) {
              if (context.raw?.o != null) {
                const d = context.raw;
                return `O:${formatNumber(d.o)} H:${formatNumber(d.h)} L:${formatNumber(d.l)} C:${formatNumber(d.c)}`;
              }
              return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
            },
          },
        },
        annotation: {
          annotations: {
            weeklyLine: {
              type: "line",
              xMin: prediction.expiries.weekly.date,
              xMax: prediction.expiries.weekly.date,
              borderColor: "#38bdf8",
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: "Weekly Expiry",
                color: "#e2e8f0",
                backgroundColor: "rgba(15, 23, 42, 0.8)",
              },
            },
            monthlyLine: {
              type: "line",
              xMin: prediction.expiries.monthly.date,
              xMax: prediction.expiries.monthly.date,
              borderColor: "#a78bfa",
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: "Monthly Expiry",
                color: "#e2e8f0",
                backgroundColor: "rgba(15, 23, 42, 0.8)",
              },
            },
            ...strategyAnnotations,
          },
        },
      },
      scales: {
        x: {
          type: "category",
          ticks: { color: "#8b9bb4", maxTicksLimit: 8 },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
        y: {
          ticks: { color: "#8b9bb4" },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
      },
    },
  });
}

function showNiftyError(message) {
  if (niftyEls.error) {
    niftyEls.error.hidden = false;
    niftyEls.error.textContent = message;
  }
}

function hideNiftyError() {
  if (niftyEls.error) niftyEls.error.hidden = true;
}

function renderNiftyPanel() {
  if (!niftyPrediction || !niftyHistory) return;

  hideNiftyError();
  niftyEls.signal.textContent = niftyPrediction.ensembleSignal;
  niftyEls.signal.className = `ensemble-signal ${signalClass(niftyPrediction.ensembleSignal)}`;
  niftyEls.confidence.textContent = `${niftyPrediction.predictions.monthly.confidence}% model confidence`;
  niftyEls.updatedAt.textContent = `Prediction updated ${new Date(niftyPrediction.fetchedAt).toLocaleString()}`;
  niftyEls.disclaimer.textContent = niftyPrediction.disclaimer;

  renderPredictionCard(niftyEls.weeklyCard, niftyPrediction.predictions.weekly, "Weekly Expiry Target");
  renderPredictionCard(niftyEls.monthlyCard, niftyPrediction.predictions.monthly, "Monthly Expiry Target");
  renderBreakdown(niftyPrediction);
  renderIndicatorPanel(niftyPrediction);
  renderNiftyChart(niftyHistory, niftyPrediction);
}

async function fetchNiftyData() {
  try {
    const [historyRes, predictionRes] = await Promise.all([
      fetch("/api/nifty/history"),
      fetch("/api/nifty/prediction"),
    ]);

    const historyData = await historyRes.json();
    const predictionData = await predictionRes.json();

    if (!historyRes.ok) throw new Error(historyData.message || "Failed to load Nifty history");
    if (!predictionRes.ok) throw new Error(predictionData.message || "Failed to load Nifty prediction");

    niftyHistory = historyData;
    niftyPrediction = predictionData;
    renderNiftyPanel();
  } catch (error) {
    showNiftyError(error.message);
  }
}

function setupNiftyRefresh() {
  if (niftyRefreshTimer) clearInterval(niftyRefreshTimer);
  niftyRefreshTimer = setInterval(fetchNiftyData, NIFTY_REFRESH_MS);
}

window.initNiftyPanel = function initNiftyPanel() {
  fetchNiftyData();
  setupNiftyRefresh();
};

window.refreshNiftyChart = function refreshNiftyChart() {
  if (niftyHistory && niftyPrediction) {
    renderNiftyChart(niftyHistory, niftyPrediction);
  }
};