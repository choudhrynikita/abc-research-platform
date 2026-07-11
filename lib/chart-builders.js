/**
 * Client-safe chart data builders (no DOM). Used by chart components and tests.
 * Never fabricates prices, volumes, or indicator points.
 */

const DATA_UNAVAILABLE = "Data Unavailable";

function isFiniteNumber(n) {
  return n != null && typeof n === "number" && Number.isFinite(n);
}

/**
 * Parse candle date (YYYY-MM-DD or ISO datetime) to timestamp for time-scale rendering.
 * Daily bars use UTC noon for stable day placement; intraday uses exact ISO time.
 * Returns null if invalid — never invents a date.
 */
function dateToTimestamp(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const iso = dateStr.length === 10 ? `${dateStr}T12:00:00.000Z` : dateStr;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * Validate a single OHLC candle for charting. Does not invent missing fields.
 */
function validateChartCandle(candle) {
  if (!candle || typeof candle !== "object") return null;
  const x = dateToTimestamp(candle.date);
  const o = Number(candle.open);
  const h = Number(candle.high);
  const l = Number(candle.low);
  const c = Number(candle.close);
  if (x == null) return null;
  if (![o, h, l, c].every(isFiniteNumber)) return null;
  if (o <= 0 || h <= 0 || l <= 0 || c <= 0) return null;
  if (h < l) return null;
  if (h < Math.max(o, c) || l > Math.min(o, c)) return null;
  let volume = null;
  if (candle.volume != null && isFiniteNumber(Number(candle.volume))) {
    volume = Number(candle.volume);
  }
  // Preserve full ISO datetime for intraday bars; daily stays YYYY-MM-DD
  const dateOut =
    typeof candle.date === "string" && candle.date.length > 10
      ? candle.date
      : String(candle.date).slice(0, 10);
  return { date: dateOut, x, o, h, l, c, volume };
}

/**
 * Sanitize candle list for charts: validate, sort, dedupe. Never interpolates.
 */
function prepareChartCandles(rawCandles = []) {
  const accepted = [];
  let rejected = 0;
  for (const row of rawCandles) {
    const v = validateChartCandle(row);
    if (v) accepted.push(v);
    else rejected += 1;
  }
  accepted.sort((a, b) => a.x - b.x);
  const deduped = [];
  const seen = new Set();
  for (const row of accepted) {
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    deduped.push(row);
  }
  return {
    candles: deduped,
    rejected,
    available: deduped.length >= 2,
    reason: deduped.length >= 2 ? null : "Insufficient verified OHLCV history",
  };
}

function toCandlePoint(candle) {
  const v = validateChartCandle(candle) || candle;
  if (!v || v.x == null) return null;
  return { x: v.x, o: v.o ?? v.open, h: v.h ?? v.high, l: v.l ?? v.low, c: v.c ?? v.close };
}

/**
 * Align indicator series to candle dates as {x, y} points for mixed financial charts.
 * Skips null/invalid values — never interpolates.
 * Supports series aligned to full candle length or shorter (trailing) series.
 */
function alignSeriesToLabels(labels, series) {
  if (!Array.isArray(series) || !labels?.length) return [];
  const offset = Math.max(0, labels.length - series.length);
  const points = [];
  labels.forEach((date, i) => {
    const v = series[i - offset];
    if (v != null && Number.isFinite(Number(v))) {
      const x = typeof date === "number" ? date : dateToTimestamp(date);
      if (x != null) points.push({ x, y: Number(v) });
    }
  });
  return points;
}

/**
 * Align indicator array (same length as candles) using candle timestamps.
 */
function alignSeriesToCandles(candles, series) {
  if (!Array.isArray(series) || !candles?.length) return [];
  const prepared = candles.map((c) => validateChartCandle(c) || (c.x != null ? c : null)).filter(Boolean);
  const offset = Math.max(0, prepared.length - series.length);
  const points = [];
  prepared.forEach((c, i) => {
    const v = series[i - offset];
    if (v != null && Number.isFinite(Number(v))) {
      points.push({ x: c.x, y: Number(v) });
    }
  });
  return points;
}

function normalizeOverlayData(candles, overlayData) {
  if (!overlayData?.length || !candles?.length) return [];
  if (typeof overlayData[0] === "object" && overlayData[0] !== null && "x" in overlayData[0]) {
    return overlayData
      .map((p) => {
        if (p?.y == null || !Number.isFinite(Number(p.y))) return null;
        const x = typeof p.x === "number" ? p.x : dateToTimestamp(String(p.x));
        if (x == null) return null;
        return { x, y: Number(p.y) };
      })
      .filter(Boolean);
  }
  return candles
    .map((c, i) => {
      const y = overlayData[i];
      const validated = validateChartCandle(c);
      if (!validated || y == null || !Number.isFinite(Number(y))) return null;
      return { x: validated.x, y: Number(y) };
    })
    .filter(Boolean);
}

function buildCandlestickChartData(candles, { label = "Price", overlays = [] } = {}) {
  const prepared = prepareChartCandles(candles);
  if (!prepared.available) return null;

  const datasets = [
    {
      type: "candlestick",
      label,
      data: prepared.candles.map((c) => ({ x: c.x, o: c.o, h: c.h, l: c.l, c: c.c })),
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
      borderColor: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    },
  ];

  overlays.forEach((overlay) => {
    const lineData = normalizeOverlayData(prepared.candles, overlay?.data);
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
      tension: 0.05,
    });
  });

  return { datasets, meta: { rejected: prepared.rejected, count: prepared.candles.length } };
}

function buildLineChartData(labels, datasets) {
  return { labels, datasets };
}

/**
 * Volume bars aligned to timestamps. Missing volume is omitted — never shown as 0
 * unless the source reported zero.
 */
function buildBarChartData(labels, values, { label = "Volume", color = "rgba(59,130,246,0.35)", useTime = true } = {}) {
  const data = [];
  for (let i = 0; i < (labels?.length || 0); i++) {
    const y = values[i];
    if (y == null || !Number.isFinite(Number(y))) continue;
    const x = useTime
      ? typeof labels[i] === "number"
        ? labels[i]
        : dateToTimestamp(String(labels[i]))
      : labels[i];
    if (x == null && useTime) continue;
    data.push({ x: useTime ? x : labels[i], y: Number(y) });
  }

  if (!data.length) return null;

  return {
    datasets: [
      {
        label,
        data,
        backgroundColor: color,
        borderWidth: 0,
      },
    ],
  };
}

/**
 * Build volume dataset from prepared candles (preferred).
 */
function buildVolumeChartData(candles, { label = "Volume" } = {}) {
  const prepared = prepareChartCandles(candles);
  if (!prepared.available) return null;
  const data = prepared.candles
    .filter((c) => c.volume != null && Number.isFinite(c.volume))
    .map((c) => ({ x: c.x, y: c.volume }));
  if (!data.length) return null;
  return {
    datasets: [
      {
        label,
        data,
        backgroundColor: data.map((p, i, arr) => {
          // Color by candle direction when possible
          const candle = prepared.candles.find((c) => c.x === p.x);
          if (!candle) return "rgba(59,130,246,0.4)";
          return candle.c >= candle.o ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)";
        }),
        borderWidth: 0,
      },
    ],
  };
}

function parseChartApiPayload(json) {
  if (!json || typeof json !== "object") {
    return {
      ok: false,
      error: "Invalid chart response",
      candles: [],
      meta: null,
      indicators: null,
    };
  }
  if (json.error && !json.candles?.length) {
    return {
      ok: false,
      error: json.message || json.error || DATA_UNAVAILABLE,
      candles: [],
      meta: json.chartMeta || null,
      indicators: null,
    };
  }
  const raw = json.candles || [];
  if (!raw.length) {
    return {
      ok: false,
      error: json.message || "Verified market data unavailable.",
      candles: [],
      meta: json.chartMeta || null,
      indicators: json.indicators || null,
    };
  }

  const prepared = prepareChartCandles(raw);
  if (!prepared.available) {
    return {
      ok: false,
      error: prepared.reason || "Insufficient verified OHLCV history",
      candles: [],
      meta: json.chartMeta || null,
      indicators: null,
    };
  }

  // Return original-shaped candles (date string) for indicator alignment + chart builders
  const candles = prepared.candles.map((c) => ({
    date: c.date,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.volume,
  }));

  return {
    ok: true,
    error: null,
    candles,
    meta: json.chartMeta || null,
    indicators: json.indicators || null,
    rejected: prepared.rejected,
  };
}

module.exports = {
  toCandlePoint,
  alignSeriesToLabels,
  alignSeriesToCandles,
  buildCandlestickChartData,
  buildLineChartData,
  buildBarChartData,
  buildVolumeChartData,
  parseChartApiPayload,
  prepareChartCandles,
  validateChartCandle,
  dateToTimestamp,
  DATA_UNAVAILABLE,
};
