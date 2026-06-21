const YAHOO_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
};

const NIFTY_SYMBOL = "^NSEI";

function normalizeCandles(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};

  return timestamps
    .map((ts, index) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      open: quote.open?.[index] ?? null,
      high: quote.high?.[index] ?? null,
      low: quote.low?.[index] ?? null,
      close: quote.close?.[index] ?? null,
      volume: quote.volume?.[index] ?? null,
    }))
    .filter((candle) => candle.close != null);
}

async function fetchChart(symbol, interval = "1d", range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${interval}&range=${range}&includePrePost=false`;

  const response = await fetch(url, { headers: YAHOO_HEADERS });
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
    candles: normalizeCandles(result),
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