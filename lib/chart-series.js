const { validateNumericMetric, validateTimestamp } = require("./data-validation");
const { logValidationFailure, logCalculationFailure } = require("./data-logger");

/**
 * Yahoo chart ranges. Aliases (1d, 1w, 1m, 3y) normalize to Yahoo-compatible values.
 * Interval is selected separately for intraday vs daily history.
 */
const VALID_CHART_RANGES = new Set([
  "1d",
  "5d",
  "1wk",
  "1mo",
  "3mo",
  "6mo",
  "1y",
  "2y",
  "3y",
  "5y",
  "10y",
  "ytd",
  "max",
]);
const DEFAULT_CHART_RANGE = "1y";
const MIN_CANDLES = 2;

const RANGE_ALIASES = {
  "1w": "5d",
  "1wk": "5d",
  "1m": "1mo",
  "3m": "3mo",
  "6m": "6mo",
  "3y": "5y", // Yahoo does not expose a dedicated 3y range; use 5y and client may clip
  "max": "max",
};

/**
 * Map UI range → Yahoo { range, interval }.
 * Intraday uses sub-daily intervals; multi-day uses 1d bars.
 */
function resolveChartRequest(rangeInput) {
  const raw = String(rangeInput || DEFAULT_CHART_RANGE).trim().toLowerCase();
  const aliased = RANGE_ALIASES[raw] || raw;
  const range = VALID_CHART_RANGES.has(aliased)
    ? aliased
    : VALID_CHART_RANGES.has(raw)
      ? raw
      : DEFAULT_CHART_RANGE;

  // Yahoo-compatible range for the request (3y → 5y already handled in aliases)
  let yahooRange = range === "1wk" ? "5d" : range;
  if (yahooRange === "3y") yahooRange = "5y";

  let interval = "1d";
  if (range === "1d") interval = "5m";
  else if (range === "5d" || range === "1wk") interval = "15m";
  else if (range === "1mo") interval = "1d";
  else interval = "1d";

  return { range: yahooRange, interval, uiRange: range };
}

function normalizeChartRange(range) {
  const { range: r } = resolveChartRequest(range);
  return r;
}

function isIntradayInterval(interval) {
  return ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"].includes(String(interval || ""));
}

/**
 * Accept YYYY-MM-DD or full ISO datetime. Never invents timestamps.
 */
function parseCandleTimestamp(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const iso =
    dateStr.length === 10
      ? `${dateStr}T12:00:00.000Z`
      : dateStr.includes("T")
        ? dateStr
        : null;
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function validateOhlcCandle(candle, index = 0, { intraday = false } = {}) {
  if (!candle || typeof candle !== "object") {
    return { valid: false, reason: `row ${index}: not an object` };
  }

  const dateField = candle.date || candle.datetime;
  if (!dateField) {
    return { valid: false, reason: `row ${index}: missing date` };
  }

  // Daily bars: date-only validation; intraday: full timestamp
  if (!intraday) {
    const dateCheck = validateTimestamp(
      String(dateField).length >= 10 ? `${String(dateField).slice(0, 10)}T00:00:00Z` : null
    );
    if (!dateCheck.valid) {
      return { valid: false, reason: `row ${index}: invalid date` };
    }
  } else {
    const ts = parseCandleTimestamp(String(dateField));
    if (ts == null) {
      return { valid: false, reason: `row ${index}: invalid datetime` };
    }
  }

  const fields = ["open", "high", "low", "close"];
  const values = {};
  for (const field of fields) {
    const check = validateNumericMetric(candle[field], {
      name: field,
      min: 0,
      allowZero: false,
    });
    if (!check.valid) {
      return { valid: false, reason: `row ${index}: invalid ${field}` };
    }
    values[field] = check.value;
  }

  if (values.high < values.low) {
    logValidationFailure("ohlc", `high < low on ${dateField}`, { index });
    return { valid: false, reason: `row ${index}: high < low` };
  }
  if (values.high < Math.max(values.open, values.close) || values.low > Math.min(values.open, values.close)) {
    logValidationFailure("ohlc", `OHLC inconsistent on ${dateField}`, { index });
    return { valid: false, reason: `row ${index}: OHLC inconsistent` };
  }

  let volume = null;
  if (candle.volume != null) {
    const volCheck = validateNumericMetric(candle.volume, { name: "volume", min: 0, allowZero: true });
    volume = volCheck.valid ? volCheck.value : null;
  }

  const dateOut = intraday
    ? (String(dateField).includes("T")
        ? new Date(Date.parse(dateField)).toISOString()
        : String(dateField))
    : String(dateField).slice(0, 10);

  return {
    valid: true,
    candle: {
      date: dateOut,
      open: values.open,
      high: values.high,
      low: values.low,
      close: values.close,
      volume,
    },
  };
}

/**
 * Sanitize verified OHLCV series: validate, sort chronologically, dedupe.
 * Never interpolates or fabricates missing OHLC fields.
 */
function sanitizeCandles(rawCandles = [], { interval = "1d" } = {}) {
  const intraday = isIntradayInterval(interval);
  const accepted = [];
  let rejected = 0;

  for (let i = 0; i < rawCandles.length; i += 1) {
    const result = validateOhlcCandle(rawCandles[i], i, { intraday });
    if (result.valid) accepted.push(result.candle);
    else rejected += 1;
  }

  accepted.sort((a, b) => {
    const ta = parseCandleTimestamp(a.date) ?? 0;
    const tb = parseCandleTimestamp(b.date) ?? 0;
    return ta - tb;
  });

  const deduped = [];
  const seen = new Set();
  for (const row of accepted) {
    const key = row.date;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  if (deduped.length < MIN_CANDLES) {
    logCalculationFailure("chart-series", `insufficient verified candles (${deduped.length})`, { rejected });
    return { candles: [], rejected, available: false, reason: "Insufficient verified OHLCV history" };
  }

  return { candles: deduped, rejected, available: true, reason: null, interval, intraday };
}

function buildChartMeta({ symbol, source, fetchedAt, range, interval, candleCount, rejected }) {
  return {
    symbol,
    source: source || "Yahoo Finance Chart API",
    provider: "Yahoo Finance",
    range,
    interval: interval || "1d",
    timezone: "UTC (market timestamps; daily bars use exchange calendar date)",
    fetchedAt: fetchedAt || new Date().toISOString(),
    lastUpdated: fetchedAt || new Date().toISOString(),
    candleCount,
    rejectedPoints: rejected,
    verified: candleCount >= MIN_CANDLES,
  };
}

module.exports = {
  VALID_CHART_RANGES,
  DEFAULT_CHART_RANGE,
  MIN_CANDLES,
  normalizeChartRange,
  resolveChartRequest,
  validateOhlcCandle,
  sanitizeCandles,
  buildChartMeta,
  parseCandleTimestamp,
  isIntradayInterval,
};
