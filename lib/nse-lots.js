/**
 * Official NSE F&O market lots.
 * option-chain-v3 no longer prints marketLot on CE/PE, so rupee P/L
 * must come from fo_mktlots.csv (expiry-month columns).
 */

const { fetchWithTimeout } = require("./fetch-utils");

const LOTS_URL = "https://nsearchives.nseindia.com/content/fo/fo_mktlots.csv";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/csv,text/plain,*/*",
  Referer: "https://www.nseindia.com/",
};

let cache = { at: 0, bySymbol: null, error: null };

function parseLot(value) {
  const n = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function expiryMonthKey(expiry) {
  if (!expiry) return null;
  const s = String(expiry).trim();
  const mon = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{2,4})$/);
  if (mon) {
    const yy = mon[3].length === 4 ? mon[3].slice(-2) : mon[3];
    return `${mon[2].slice(0, 3).toUpperCase()}-${yy}`;
  }
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const month = MONTHS[Number(dmy[2]) - 1];
    return month ? `${month}-${dmy[3].slice(-2)}` : null;
  }
  return null;
}

function splitCsvLine(line) {
  return String(line || "")
    .split(",")
    .map((part) => part.trim());
}

function parseFoMarketLots(csv) {
  const lines = String(csv || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return {};

  const header = splitCsvLine(lines[0]);
  const symbolIdx = header.findIndex((h) => /^symbol$/i.test(h));
  if (symbolIdx < 0) return {};

  const monthCols = [];
  header.forEach((name, index) => {
    const key = name.replace(/\s+/g, "").toUpperCase();
    if (/^[A-Z]{3}-\d{2}$/.test(key)) monthCols.push({ index, key });
  });

  const bySymbol = {};
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const symbol = (cols[symbolIdx] || "").toUpperCase();
    if (!symbol) continue;
    const months = {};
    const lots = [];
    for (const col of monthCols) {
      const lot = parseLot(cols[col.index]);
      if (lot != null) {
        months[col.key] = lot;
        lots.push(lot);
      }
    }
    if (!lots.length) continue;
    bySymbol[symbol] = { months, lot: lots[0] };
  }
  return bySymbol;
}

function lotFromRow(row, monthKey) {
  if (!row) return null;
  if (monthKey && row.months?.[monthKey] != null) return row.months[monthKey];
  return row.lot ?? null;
}

async function loadMarketLots({ force = false } = {}) {
  if (!force && cache.bySymbol && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.bySymbol;
  }
  const res = await fetchWithTimeout(LOTS_URL, { headers: NSE_HEADERS }, 15_000);
  if (!res.ok) throw new Error(`NSE fo_mktlots.csv returned ${res.status}`);
  const text = await res.text();
  if (!/SYMBOL/i.test(text) || text.startsWith("%PDF")) {
    throw new Error("NSE fo_mktlots.csv was not a lot-size table");
  }
  const bySymbol = parseFoMarketLots(text);
  if (!bySymbol.NIFTY) throw new Error("NSE fo_mktlots.csv missing NIFTY row");
  cache = { at: Date.now(), bySymbol, error: null };
  return bySymbol;
}

async function resolveMarketLot(symbol, expiry = null) {
  const key = String(symbol || "").replace(/\.NS$/i, "").trim().toUpperCase();
  if (!key) return null;
  try {
    const bySymbol = await loadMarketLots();
    return lotFromRow(bySymbol[key], expiryMonthKey(expiry));
  } catch (err) {
    cache = { ...cache, error: err.message };
    return null;
  }
}

function resetLotCache() {
  cache = { at: 0, bySymbol: null, error: null };
}

module.exports = {
  LOTS_URL,
  parseFoMarketLots,
  expiryMonthKey,
  lotFromRow,
  resolveMarketLot,
  loadMarketLots,
  resetLotCache,
};
