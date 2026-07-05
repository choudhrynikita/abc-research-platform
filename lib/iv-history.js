const { readJson, writeJson } = require("./json-store");
const { formatDateKey, getIstNow } = require("./market-hours");
const { validateIv, validateMarketDate } = require("./data-validation");
const { logMissingHistory, logEvent } = require("./data-logger");
const { extractAtmIv } = require("./nse-options");

const IV_HISTORY_FILE = "iv-history.json";
const MAX_SERIES_LENGTH = 400;

function normalizeSymbol(symbol) {
  if (!symbol) return null;
  return String(symbol).replace(/\.NS$/i, "").toUpperCase();
}

async function readIvStore() {
  return readJson(IV_HISTORY_FILE, { symbols: {}, updatedAt: null });
}

/**
 * Record one verified ATM IV observation per symbol per trading day.
 * Never interpolates or estimates — only stores values from verified NSE chains.
 */
async function recordIvSnapshot(symbol, chain, sessionDate = null) {
  const key = normalizeSymbol(symbol);
  if (!key || !chain?.available) return null;

  const ivCheck = validateIv(extractAtmIv(chain) ?? chain.impliedVolatility);
  if (!ivCheck.valid) {
    logMissingHistory(key, "ATM IV invalid — snapshot not recorded", { reason: ivCheck.reason });
    return null;
  }

  const dateKey = sessionDate || formatDateKey(getIstNow());
  const dateValidated = validateMarketDate(dateKey);
  if (!dateValidated.valid) return null;

  const store = await readIvStore();
  if (!store.symbols[key]) {
    store.symbols[key] = { source: chain.source || "NSE India option chain", series: [] };
  }

  const entry = {
    date: dateKey,
    iv: ivCheck.value,
    atmStrike: chain.atmStrike ?? null,
    expiry: chain.expiry ?? null,
    recordedAt: new Date().toISOString(),
    source: chain.source || "NSE India option chain",
  };

  const series = store.symbols[key].series;
  const existingIdx = series.findIndex((r) => r.date === dateKey);
  if (existingIdx >= 0) {
    series[existingIdx] = entry;
  } else {
    series.push(entry);
  }

  series.sort((a, b) => a.date.localeCompare(b.date));
  if (series.length > MAX_SERIES_LENGTH) {
    store.symbols[key].series = series.slice(-MAX_SERIES_LENGTH);
  } else {
    store.symbols[key].series = series;
  }

  store.symbols[key].source = entry.source;
  store.symbols[key].updatedAt = entry.recordedAt;
  store.updatedAt = entry.recordedAt;

  await writeJson(IV_HISTORY_FILE, store);
  logEvent("info", "iv_snapshot", `Recorded ATM IV for ${key}`, {
    symbol: key,
    date: dateKey,
    iv: ivCheck.value,
  });
  return entry;
}

/**
 * Return verified historical IV series within lookback window (trading days by date).
 */
async function getIvHistory(symbol, lookbackDays = 252) {
  const key = normalizeSymbol(symbol);
  if (!key) return [];

  const store = await readIvStore();
  const series = store.symbols[key]?.series || [];
  if (!series.length) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays - 30);

  return series
    .filter((r) => {
      const d = validateMarketDate(r.date);
      if (!d.valid) return false;
      const iv = validateIv(r.iv);
      return iv.valid && new Date(r.date) >= cutoff;
    })
    .map((r) => ({ date: r.date, iv: validateIv(r.iv).value, source: r.source }));
}

module.exports = {
  IV_HISTORY_FILE,
  normalizeSymbol,
  recordIvSnapshot,
  getIvHistory,
  readIvStore,
};