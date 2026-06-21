let proChart = null;
let proCandles = [];
let proIndicators = null;

function heikinAshi(candles) {
  const out = [];
  let prevHa = null;
  candles.forEach((c) => {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = prevHa ? (prevHa.open + prevHa.close) / 2 : (c.open + c.close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    const row = { x: c.date, o: haOpen, h: haHigh, l: haLow, c: haClose };
    out.push(row);
    prevHa = row;
  });
  return out;
}

function toLineData(candles) {
  return candles.map((c) => ({ x: c.date, y: c.close }));
}

async function loadProChart(symbol, range = "1y") {
  const wrap = document.getElementById("proChartWrap");
  if (!wrap) return;
  wrap.innerHTML = `<p class="loading">Loading verified OHLCV for ${symbol}...</p>`;
  try {
    const res = await fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${range}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || json.error || "Chart data unavailable");
    proCandles = json.candles || [];
    proIndicators = json.indicators || null;
    renderProChart();
  } catch (e) {
    wrap.innerHTML = `<div class="error-panel"><p>${e.message}</p></div>`;
  }
}

function renderProChart() {
  const canvas = document.getElementById("proChart");
  const wrap = document.getElementById("proChartWrap");
  if (!canvas || !proCandles.length) {
    if (wrap) wrap.innerHTML = `<p class="hint-block">Verified data unavailable. Chart cannot be generated.</p>`;
    return;
  }
  if (wrap && !wrap.querySelector("canvas")) {
    wrap.innerHTML = `<canvas id="proChart"></canvas>`;
  }
  const el = document.getElementById("proChart");
  const ctx = el.getContext("2d");
  if (proChart) proChart.destroy();

  const type = document.getElementById("chartTypeSelect")?.value || "candlestick";
  const showRsi = document.getElementById("indRsi")?.checked;
  const showSma = document.getElementById("indSma")?.checked;

  let dataset;
  if (type === "line" || type === "area") {
    dataset = {
      type: "line",
      label: "Close",
      data: toLineData(proCandles),
      borderColor: "#3b82f6",
      backgroundColor: type === "area" ? "rgba(59,130,246,0.15)" : "transparent",
      fill: type === "area",
    };
  } else {
    const data = type === "heikin" ? heikinAshi(proCandles) : proCandles.map((c) => ({ x: c.date, o: c.open, h: c.high, l: c.low, c: c.close }));
    dataset = {
      type: "candlestick",
      label: symbolLabel(),
      data,
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    };
  }

  const datasets = [dataset];
  if (showSma && proIndicators?.sma20) {
    datasets.push({
      type: "line",
      label: "SMA20",
      data: proCandles.map((c, i) => ({ x: c.date, y: proIndicators.series?.sma20?.[i] })).filter((d) => d.y != null),
      borderColor: "#f59e0b",
      pointRadius: 0,
    });
  }

  proChart = new Chart(ctx, {
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#8b9bb4" } },

      },
      scales: {
        x: { type: "category", ticks: { color: "#8b9bb4", maxTicksLimit: 10 } },
        y: { ticks: { color: "#8b9bb4" } },
      },
    },
  });

  if (showRsi && proIndicators?.rsi) {
    const rsiEl = document.getElementById("rsiChart");
    if (rsiEl) {
      new Chart(rsiEl.getContext("2d"), {
        type: "line",
        data: {
          labels: proCandles.map((c) => c.date),
          datasets: [{ label: "RSI", data: proIndicators.series?.rsi?.slice(-proCandles.length), borderColor: "#a855f7", pointRadius: 0 }],
        },
        options: { responsive: true, scales: { y: { min: 0, max: 100 } } },
      });
    }
  }
}

function symbolLabel() {
  return document.getElementById("researchSymbol")?.value || "Symbol";
}

function initChartPro() {
  document.getElementById("chartRangeSelect")?.addEventListener("change", (e) => {
    const sym = document.getElementById("researchSymbol")?.value || "RELIANCE";
    loadProChart(sym, e.target.value);
  });
  document.getElementById("chartTypeSelect")?.addEventListener("change", renderProChart);
  document.getElementById("indRsi")?.addEventListener("change", renderProChart);
  document.getElementById("indSma")?.addEventListener("change", renderProChart);
  document.getElementById("chartFullscreenBtn")?.addEventListener("click", () => {
    document.getElementById("proChartPanel")?.requestFullscreen?.();
  });
}

window.loadProChart = loadProChart;
window.initChartPro = initChartPro;