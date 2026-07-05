/**
 * Client-safe chart data builders (no DOM). Used by chart components and tests.
 */

function alignSeriesToLabels(labels, series) {
  if (!Array.isArray(series) || !labels?.length) return labels.map(() => null);
  const offset = Math.max(0, labels.length - series.length);
  return labels.map((_, i) => {
    const v = series[i - offset];
    return v != null && Number.isFinite(v) ? v : null;
  });
}

function buildCandlestickChartData(candles, { label = "Price", overlays = [] } = {}) {
  if (!candles?.length) return null;

  const labels = candles.map((c) => c.date);
  const datasets = [
    {
      type: "candlestick",
      label,
      data: candles.map((c) => ({
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
      })),
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    },
  ];

  overlays.forEach((overlay) => {
    if (!overlay?.data) return;
    datasets.push({
      type: "line",
      label: overlay.label,
      data: overlay.data,
      borderColor: overlay.color,
      borderWidth: overlay.borderWidth ?? 1.5,
      borderDash: overlay.borderDash,
      pointRadius: 0,
      spanGaps: false,
    });
  });

  return { labels, datasets };
}

function buildLineChartData(labels, datasets) {
  return { labels, datasets };
}

function buildBarChartData(labels, values, { label = "Volume", color = "rgba(59,130,246,0.35)" } = {}) {
  return {
    labels,
    datasets: [{
      label,
      data: values,
      backgroundColor: color,
      borderWidth: 0,
    }],
  };
}

function parseChartApiPayload(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, error: "Invalid chart response", candles: [], meta: null, indicators: null };
  }
  if (json.error && !json.candles?.length) {
    return {
      ok: false,
      error: json.message || json.error,
      candles: [],
      meta: json.chartMeta || null,
      indicators: null,
    };
  }
  const candles = json.candles || [];
  if (!candles.length) {
    return {
      ok: false,
      error: json.message || "Verified market data unavailable.",
      candles: [],
      meta: json.chartMeta || null,
      indicators: json.indicators || null,
    };
  }
  return {
    ok: true,
    error: null,
    candles,
    meta: json.chartMeta || null,
    indicators: json.indicators || null,
  };
}

module.exports = {
  alignSeriesToLabels,
  buildCandlestickChartData,
  buildLineChartData,
  buildBarChartData,
  parseChartApiPayload,
};