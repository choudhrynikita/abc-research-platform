const { fetchWithTimeout } = require("./fetch-utils");

const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const NIFTY_SYMBOL = "^NSEI";

/**
 * Normalize Yahoo chart result into candle rows.
 * Daily intervals use YYYY-MM-DD; sub-daily use full ISO timestamps (never invent bars).
 */
function normalizeCandles(result, interval = "1d") {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const intraday = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h"].includes(String(interval));

  return timestamps
    .map((ts, index) => {
      if (ts == null) return null;
      const ms = ts * 1000;
      if (!Number.isFinite(ms)) return null;
      const iso = new Date(ms).toISOString();
      return {
        date: intraday ? iso : iso.slice(0, 10),
        open: quote.open?.[index] ?? null,
        high: quote.high?.[index] ?? null,
        low: quote.low?.[index] ?? null,
        close: quote.close?.[index] ?? null,
        volume: quote.volume?.[index] ?? null,
      };
    })
    .filter((candle) => candle && candle.close != null);
}

async function fetchChart(symbol, interval = "1d", range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&includePrePost=false`;

  const response = await fetchWithTimeout(url, { headers: YAHOO_HEADERS }, 20_000);
  if (!response.ok) {
    throw new Error(`Yahoo Finance returned ${response.status} for ${symbol}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart data for ${symbol}`);
  }

  return {
    meta: result.meta,
    candles: normalizeCandles(result, interval),
    interval,
    range,
  };
}

async function fetchNiftyHistory(range = "1y") {
  const chart = await fetchChart(NIFTY_SYMBOL, "1d", range);
  return {
    symbol: NIFTY_SYMBOL,
    name: chart.meta?.shortName || chart.meta?.longName || "NIFTY 50",
    currency: chart.meta?.currency || "INR",
    candles: chart.candles,
    currentPrice: chart.candles.at(-1)?.close ?? chart.meta?.regularMarketPrice ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  fetchChart,
  fetchNiftyHistory,
  NIFTY_SYMBOL,
  YAHOO_HEADERS,
};