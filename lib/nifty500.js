const fs = require("fs");
const path = require("path");
const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal } = require("./indicators");
const { unavailable } = require("./compliance");
const { enrichConstituentTechnicals, runTechnicalScreen, runFundamentalScreen } = require("./screening");
const { assertFreshData } = require("./format");

const INDEX_PROXY = "^CRSLDX";
const NIFTY50 = "^NSEI";
const { dataPath } = require("./data-path");
const CONSTITUENTS_PATH = dataPath("nifty500-constituents.json");

function pctChange(from, to) {
  if (from == null || to == null || from === 0) return null;
  return Number((((to - from) / from) * 100).toFixed(2));
}

function loadConstituents() {
  return JSON.parse(fs.readFileSync(CONSTITUENTS_PATH, "utf8"));
}

async function fetchIndexHistory(symbol, range) {
  const chart = await fetchChart(symbol, "1d", range);
  return chart.candles.filter((c) => c.close != null);
}

async function fetchConstituentQuote(item) {
  try {
    const chart = await fetchChart(item.symbol, "1d", "5d");
    const meta = chart.meta;
    const candles = chart.candles;
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(0);

    return {
      symbol: item.symbol,
      name: meta.shortName || item.name,
      sector: item.sector,
      price: meta.regularMarketPrice ?? latest?.close ?? null,
      change: meta.regularMarketPrice != null && meta.chartPreviousClose != null
        ? Number((meta.regularMarketPrice - meta.chartPreviousClose).toFixed(2))
        : null,
      changePercent:
        meta.regularMarketPrice != null && meta.chartPreviousClose
          ? pctChange(meta.chartPreviousClose, meta.regularMarketPrice)
          : null,
      volume: meta.regularMarketVolume ?? latest?.volume ?? null,
      marketCap: unavailable("marketCap", "Not available from Yahoo Chart API"),
      peRatio: unavailable("peRatio", "Fundamentals feed unavailable — requires NSE/BSE reference data"),
      pbRatio: unavailable("pbRatio", "Fundamentals feed unavailable"),
      roe: unavailable("roe", "Fundamentals feed unavailable"),
      debtToEquity: unavailable("debtToEquity", "Fundamentals feed unavailable"),
      revenueGrowth: unavailable("revenueGrowth", "Fundamentals feed unavailable"),
      earningsGrowth: unavailable("earningsGrowth", "Fundamentals feed unavailable"),
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    return {
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
      error: error.message,
      price: null,
    };
  }
}

async function buildNifty500Dashboard() {
  const [indexCandles, nifty50Candles, constituentsMeta] = await Promise.all([
    fetchIndexHistory(INDEX_PROXY, "1y"),
    fetchIndexHistory(NIFTY50, "1y"),
    Promise.resolve(loadConstituents()),
  ]);

  const latest = indexCandles.at(-1);
  const prev = indexCandles.at(-2);
  const weekAgo = indexCandles.at(-6);
  const monthAgo = indexCandles.at(-22);
  const ytdStart = indexCandles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);

  const indicators = computeIndicators(indexCandles);
  const signal = technicalSignal(indicators);
  const idx = indicators.latest;

  assertFreshData([
    { ok: latest?.close != null, reason: "NIFTY 500 index price unavailable" },
    { ok: indexCandles.length >= 20, reason: "Insufficient index history" },
  ]);

  const quotes = await Promise.all(constituentsMeta.map(fetchConstituentQuote));
  const enriched = await Promise.all(
    quotes.filter((q) => q.price != null).map((q) => enrichConstituentTechnicals(q, fetchChart))
  );
  const quoteMap = new Map(enriched.map((q) => [q.symbol, q]));
  const mergedQuotes = quotes.map((q) => quoteMap.get(q.symbol) || q);
  const valid = mergedQuotes.filter((q) => q.price != null);
  const advances = valid.filter((q) => (q.changePercent ?? 0) > 0).length;
  const declines = valid.filter((q) => (q.changePercent ?? 0) < 0).length;

  const sectorMap = {};
  valid.forEach((q) => {
    if (!sectorMap[q.sector]) sectorMap[q.sector] = { changes: [], count: 0 };
    if (q.changePercent != null) sectorMap[q.sector].changes.push(q.changePercent);
    sectorMap[q.sector].count += 1;
  });

  const sectors = Object.entries(sectorMap)
    .map(([sector, data]) => ({
      sector,
      avgChange:
        data.changes.length > 0
          ? Number((data.changes.reduce((a, b) => a + b, 0) / data.changes.length).toFixed(2))
          : null,
      count: data.count,
    }))
    .sort((a, b) => (b.avgChange ?? 0) - (a.avgChange ?? 0));

  const volumeLeaders = [...valid]
    .filter((q) => q.volume != null)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return {
    marketOverview: {
      indexSymbol: INDEX_PROXY,
      indexName: "NIFTY 500 (^CRSLDX)",
      note: "NIFTY 500 index via Yahoo Finance ^CRSLDX; Nifty 50 reference included for context.",
      nifty50Price: nifty50Candles.at(-1)?.close ?? null,
      price: latest?.close ?? null,
      dailyChangePercent: prev ? pctChange(prev.close, latest?.close) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdChangePercent: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
    },
    technicals: {
      rsi: idx.rsi,
      macdHistogram: idx.macdHistogram,
      macdLine: idx.macdLine,
      sma20: idx.sma20,
      sma50: idx.sma50,
      cmo: idx.cmo,
      adx: idx.adx,
      atr: idx.atr,
      bollingerUpper: idx.bollingerUpper,
      bollingerMiddle: idx.bollingerMiddle,
      bollingerLower: idx.bollingerLower,
      volumeTrend: idx.volumeTrend,
      volumeRatio: idx.volumeRatio,
      trend: signal,
      support: idx.support,
      resistance: idx.resistance,
    },
    constituents: mergedQuotes,
    technicalScreen: runTechnicalScreen(mergedQuotes),
    fundamentalScreen: runFundamentalScreen(mergedQuotes),
    sectorAnalysis: {
      best: sectors.slice(0, 3),
      worst: sectors.slice(-3).reverse(),
      all: sectors,
    },
    marketBreadth: {
      sampleSize: valid.length,
      totalTracked: constituentsMeta.length,
      advances,
      declines,
      unchanged: valid.length - advances - declines,
      volumeLeaders,
      advanceDeclineRatio: declines ? Number((advances / declines).toFixed(2)) : null,
    },
    dataFreshness: {
      indexUpdatedAt: latest?.date,
      fetchedAt: new Date().toISOString(),
    },
  };
}

module.exports = { buildNifty500Dashboard, loadConstituents };