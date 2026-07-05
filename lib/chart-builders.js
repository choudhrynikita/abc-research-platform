/**
 * Client-safe chart data builders (no DOM). Used by chart components and tests.
 */

function toCandlePoint(candle) {
  return {
    x: candle.date,
    o: candle.open,
    h: candle.high,
    l: candle.low,
    c: candle.close,
  };
}

/**
 * Align indicator series to candle dates as {x, y} points for mixed financial charts.
 * Skips null/invalid values — never interpolates.
 */
function alignSeriesToLabels(labels, series) {
  if (!Array.isArray(series) || !labels?.length) return [];
  const offset = Math.max(0, labels.length - series.length);
  const points = [];
  labels.forEach((date, i) => {
    const v = series[i - offset];
    if (v != null && Number.isFinite(v)) {
      points.push({ x: date, y: v });
    }
  });
  return points;
}

function normalizeOverlayData(candles, overlayData) {
  if (!overlayData?.length || !candles?.length) return [];
  if (typeof overlayData[0] === "object" && overlayData[0] !== null && "x" in overlayData[0]) {
    return overlayData.filter((p) => p?.x != null && p.y != null && Number.isFinite(p.y));
  }
  return candles
    .map((c, i) => {
      const y = overlayData[i];
      return y != null && Number.isFinite(y) ? { x: c.date, y } : null;
    })
    .filter(Boolean);
}

function buildCandlestickChartData(candles, { label = "Price", overlays = [] } = {}) {
  if (!candles?.length) return null;

  const datasets = [
    {
      type: "candlestick",
      label,
      data: candles.map(toCandlePoint),
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    },
  ];

  overlays.forEach((overlay) => {
    const lineData = normalizeOverlayData(candles, overlay?.data);
    if (!lineData.length) return;
    datasets.push({
      type: "line",
      label: overlay.label,
      data: lineData,
      borderColor: overlay.color,
      borderWidth: overlay.borderWidth ?? 1.5,
      borderDash: overlay.borderDash,
      pointRadius: 0,
      spanGaps: false,
    });
  });

  return { datasets };
}

function buildLineChartData(labels, datasets) {
  return { labels, datasets };
}

function buildBarChartData(labels, values, { label = "Volume", color = "rgba(59,130,246,0.35)" } = {}) {
  const data = labels.map((date, i) => {
    const y = values[i];
    return y != null && Number.isFinite(y) ? { x: date, y } : null;
  }).filter(Boolean);

  return {
    datasets: [{
      label,
      data: data.length ? data : labels.map((date, i) => ({ x: date, y: values[i] ?? 0 })),
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
  toCandlePoint,
  alignSeriesToLabels,
  buildCandlestickChartData,
  buildLineChartData,
  buildBarChartData,
  parseChartApiPayload,
};