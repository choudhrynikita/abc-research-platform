const { UNAVAILABLE_FIELD } = require("./format");
const { validateIv } = require("./data-validation");
const { logCalculationFailure, logMissingHistory } = require("./data-logger");
const { recordIvSnapshot, getIvHistory, normalizeSymbol } = require("./iv-history");
const { extractAtmIv } = require("./nse-options");

const DEFAULT_LOOKBACK = 252;
/** Minimum verified daily IV observations required within lookback (institutional floor). */
const MIN_HISTORY_POINTS = 20;

/**
 * IV Rank = (Current IV − Low) / (High − Low) × 100
 * Uses only verified historical ATM IV from NSE snapshots — never estimated.
 */
function computeIvRank(currentIv, history, lookback = DEFAULT_LOOKBACK) {
  const current = validateIv(currentIv);
  if (!current.valid) {
    return { available: false, value: null, display: UNAVAILABLE_FIELD, reason: "Current IV unavailable" };
  }

  const window = sliceLookback(history, lookback);
  if (window.length < MIN_HISTORY_POINTS) {
    logMissingHistory("IV Rank", `Need ${MIN_HISTORY_POINTS}+ verified days, have ${window.length}`);
    return {
      available: false,
      value: null,
      display: UNAVAILABLE_FIELD,
      reason: `Insufficient verified IV history (${window.length}/${MIN_HISTORY_POINTS} days)`,
    };
  }

  const ivs = window.map((r) => r.iv);
  const low = Math.min(...ivs);
  const high = Math.max(...ivs);
  const range = high - low;

  if (range <= 0) {
    logCalculationFailure("IV Rank", "zero range in lookback window", { low, high, points: window.length });
    return {
      available: false,
      value: null,
      display: UNAVAILABLE_FIELD,
      reason: "Insufficient IV range in lookback period",
    };
  }

  const rank = Number((((current.value - low) / range) * 100).toFixed(2));
  return {
    available: true,
    value: rank,
    display: `${rank}%`,
    low,
    high,
    lookbackDays: lookback,
    sampleSize: window.length,
    reason: null,
  };
}

/**
 * IV Percentile = % of lookback days where historical IV < current IV.
 */
function computeIvPercentile(currentIv, history, lookback = DEFAULT_LOOKBACK) {
  const current = validateIv(currentIv);
  if (!current.valid) {
    return { available: false, value: null, display: UNAVAILABLE_FIELD, reason: "Current IV unavailable" };
  }

  const window = sliceLookback(history, lookback);
  if (window.length < MIN_HISTORY_POINTS) {
    logMissingHistory("IV Percentile", `Need ${MIN_HISTORY_POINTS}+ verified days, have ${window.length}`);
    return {
      available: false,
      value: null,
      display: UNAVAILABLE_FIELD,
      reason: `Insufficient verified IV history (${window.length}/${MIN_HISTORY_POINTS} days)`,
    };
  }

  const below = window.filter((r) => r.iv < current.value).length;
  const percentile = Number(((below / window.length) * 100).toFixed(2));

  return {
    available: true,
    value: percentile,
    display: `${percentile}%`,
    lookbackDays: lookback,
    sampleSize: window.length,
    daysBelow: below,
    reason: null,
  };
}

function sliceLookback(history, lookbackDays) {
  if (!history?.length) return [];
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(-lookbackDays);
}

/**
 * Record snapshot, load history, compute IV rank & percentile for a symbol.
 */
async function resolveIvMetrics(symbol, chain, options = {}) {
  const key = normalizeSymbol(symbol);
  const lookback = options.lookback ?? DEFAULT_LOOKBACK;
  const sessionDate = options.sessionDate ?? null;

  const currentIv = chain?.available
    ? validateIv(extractAtmIv(chain) ?? chain.impliedVolatility)
    : { valid: false, value: null };

  if (chain?.available && currentIv.valid) {
    await recordIvSnapshot(key, chain, sessionDate);
  }

  const history = await getIvHistory(key, lookback);
  const rank = computeIvRank(currentIv.valid ? currentIv.value : null, history, lookback);
  const percentile = computeIvPercentile(currentIv.valid ? currentIv.value : null, history, lookback);

  const source = chain?.source || "NSE India option chain";
  const collectedAt = chain?.fetchedAt || new Date().toISOString();

  return {
    symbol: key,
    currentIv: currentIv.valid
      ? {
          available: true,
          value: currentIv.value,
          display: `${currentIv.value}%`,
          source,
          collectedAt,
          verified: true,
        }
      : {
          available: false,
          value: null,
          display: UNAVAILABLE_FIELD,
          source,
          collectedAt,
          verified: false,
          reason: currentIv.reason || "Current ATM IV unavailable from NSE",
        },
    ivRank: {
      ...rank,
      source: "Verified NSE ATM IV history",
      collectedAt,
      verified: rank.available,
    },
    ivPercentile: {
      ...percentile,
      source: "Verified NSE ATM IV history",
      collectedAt,
      verified: percentile.available,
    },
    historyPoints: history.length,
    lookbackDays: lookback,
    minRequiredPoints: MIN_HISTORY_POINTS,
  };
}

module.exports = {
  DEFAULT_LOOKBACK,
  MIN_HISTORY_POINTS,
  computeIvRank,
  computeIvPercentile,
  resolveIvMetrics,
  sliceLookback,
};