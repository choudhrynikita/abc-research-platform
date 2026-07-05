const { validateNumericMetric, validateTimestamp } = require("./data-validation");
const { logValidationFailure, logCalculationFailure } = require("./data-logger");

const VALID_CHART_RANGES = new Set(["5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]);
const DEFAULT_CHART_RANGE = "1y";
const MIN_CANDLES = 2;

function normalizeChartRange(range) {
  const r = String(range || DEFAULT_CHART_RANGE).trim().toLowerCase();
  return VALID_CHART_RANGES.has(r) ? r : DEFAULT_CHART_RANGE;
}

function validateOhlcCandle(candle, index = 0) {
  if (!candle || typeof candle !== "object") {
    return { valid: false, reason: `row ${index}: not an object` };
  }

  const dateCheck = validateTimestamp(candle.date ? `${candle.date}T00:00:00Z` : null);
  if (!dateCheck.valid) {
    return { valid: false, reason: `row ${index}: invalid date` };
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
    logValidationFailure("ohlc", `high < low on ${candle.date}`, { index });
    return { valid: false, reason: `row ${index}: high < low` };
  }
  if (values.high < Math.max(values.open, values.close) || values.low > Math.min(values.open, values.close)) {
    logValidationFailure("ohlc", `OHLC inconsistent on ${candle.date}`, { index });
    return { valid: false, reason: `row ${index}: OHLC inconsistent` };
  }

  let volume = null;
  if (candle.volume != null) {
    const volCheck = validateNumericMetric(candle.volume, { name: "volume", min: 0, allowZero: true });
    volume = volCheck.valid ? volCheck.value : null;
  }

  return {
    valid: true,
    candle: {
      date: candle.date.slice(0, 10),
      open: values.open,
      high: values.high,
      low: values.low,
      close: values.close,
      volume,
    },
  };
}

/**
 * Sanitize verified OHLCV series: validate, sort chronologically, dedupe by date.
 * Never interpolates or fabricates missing OHLC fields.
 */
function sanitizeCandles(rawCandles = []) {
  const accepted = [];
  let rejected = 0;

  for (let i = 0; i < rawCandles.length; i += 1) {
    const result = validateOhlcCandle(rawCandles[i], i);
    if (result.valid) accepted.push(result.candle);
    else rejected += 1;
  }

  accepted.sort((a, b) => a.date.localeCompare(b.date));

  const deduped = [];
  const seen = new Set();
  for (const row of accepted) {
    if (seen.has(row.date)) continue;
    seen.add(row.date);
    deduped.push(row);
  }

  if (deduped.length < MIN_CANDLES) {
    logCalculationFailure("chart-series", `insufficient verified candles (${deduped.length})`, { rejected });
    return { candles: [], rejected, available: false, reason: "Insufficient verified OHLCV history" };
  }

  return { candles: deduped, rejected, available: true, reason: null };
}

function buildChartMeta({ symbol, source, fetchedAt, range, candleCount, rejected }) {
  return {
    symbol,
    source: source || "Yahoo Finance Chart API",
    provider: "Yahoo Finance",
    range,
    timezone: "UTC (market dates in exchange local calendar)",
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
  validateOhlcCandle,
  sanitizeCandles,
  buildChartMeta,
};