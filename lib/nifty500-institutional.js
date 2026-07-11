const { fetchChart } = require("./yahoo");
const { computeIndicators, technicalSignal } = require("./indicators");
const { fetchFundamentals } = require("./fundamentals");
const { rankTop50 } = require("./top50-scoring");
const { loadConstituents, buildNifty500Dashboard } = require("./nifty500");
const { unavailable } = require("./compliance");

const INDEX_TICKERS = [
  { symbol: "^NSEI", label: "NIFTY 50", key: "nifty50" },
  { symbol: "^NSEBANK", label: "BANK NIFTY", key: "banknifty" },
  { symbol: "NIFTY_FIN_SERVICE.NS", label: "FINNIFTY", key: "finnifty" },
  { symbol: "^INDIAVIX", label: "INDIA VIX", key: "vix" },
];

function pctChange(from, to) {
  if (from == null || to == null || from === 0) return null;
  return Number((((to - from) / from) * 100).toFixed(2));
}

function cagr(from, to, years) {
  if (from == null || to == null || from <= 0 || years <= 0) return null;
  return Number(((Math.pow(to / from, 1 / years) - 1) * 100).toFixed(2));
}

function val(field) {
  if (field == null) return null;
  if (typeof field === "object") return field.available === false ? null : field.value ?? null;
  return field;
}

async function fetchIndexSnapshot({ symbol, label, key }) {
  try {
    const chart = await fetchChart(symbol, "1d", "1y");
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(-6);
    const monthAgo = candles.at(-22);
    const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);
    const yearAgo = candles.at(-252) ?? candles[0];

    return {
      key,
      symbol,
      label,
      price: latest?.close ?? chart.meta?.regularMarketPrice ?? null,
      changePercent: prev ? pctChange(prev.close, latest?.close) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdChangePercent: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
      yearChangePercent: yearAgo ? pctChange(yearAgo.close, latest?.close) : null,
      updatedAt: chart.meta?.regularMarketTime
        ? new Date(chart.meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      source: "Yahoo Finance Chart API",
    };
  } catch (e) {
    return {
      key,
      symbol,
      label,
      price: null,
      error: e.message,
      source: "Yahoo Finance Chart API",
    };
  }
}

async function fetchEnrichedQuote(item) {
  try {
    const [chart, fundamentals] = await Promise.all([
      fetchChart(item.symbol, "1d", "5y"),
      fetchFundamentals(item.symbol).catch(() => null),
    ]);

    const meta = chart.meta;
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1);
    const prev = candles.at(-2);
    const weekAgo = candles.at(-6);
    const monthAgo = candles.at(-22);
    const ytdStart = candles.find((c) => c.date >= `${new Date().getFullYear()}-01-01`);
    const yearAgo = candles.at(-252) ?? candles[0];
    const threeYearAgo = candles.at(-756) ?? candles[0];
    const fiveYearAgo = candles[0];

    const price = meta.regularMarketPrice ?? latest?.close ?? null;
    const fd = fundamentals?.fundamentalAnalysis || {};
    const valn = fundamentals?.valuation || {};
    const profile = fundamentals?.businessOverview || {};

    const base = {
      symbol: item.symbol,
      name: meta.shortName || meta.longName || item.name,
      sector: item.sector,
      industry: val(profile.marketPosition) || unavailable("industry", "Industry classification unavailable"),
      price,
      change: price != null && prev?.close != null ? Number((price - prev.close).toFixed(2)) : null,
      changePercent: prev?.close != null ? pctChange(prev.close, price) : null,
      weeklyChangePercent: weekAgo ? pctChange(weekAgo.close, latest?.close) : null,
      monthlyChangePercent: monthAgo ? pctChange(monthAgo.close, latest?.close) : null,
      ytdReturn: ytdStart ? pctChange(ytdStart.close, latest?.close) : null,
      oneYearReturn: yearAgo ? pctChange(yearAgo.close, latest?.close) : null,
      threeYearCagr: cagr(threeYearAgo?.close, latest?.close, 3),
      fiveYearCagr: cagr(fiveYearAgo?.close, latest?.close, 5),
      volume: meta.regularMarketVolume ?? latest?.volume ?? null,
      deliveryPercent: unavailable("delivery", "Delivery % requires NSE exchange data feed"),
      institutionalHolding: unavailable("institutional", "Institutional holding requires NSE/BSE shareholding feed"),
      promoterHolding: unavailable("promoter", "Promoter holding requires NSE/BSE shareholding feed"),
      fiiChange: unavailable("fiiChange", "FII holding change requires NSE shareholding feed"),
      diiChange: unavailable("diiChange", "DII holding change requires NSE shareholding feed"),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      marketCap: valn.marketCap ?? unavailable("marketCap", "Market cap unavailable from current feed"),
      peRatio: valn.peRatio ?? unavailable("peRatio", "P/E unavailable from current feed"),
      forwardPe: valn.forwardPe ?? unavailable("forwardPe", "Forward P/E unavailable from current feed"),
      pbRatio: valn.pbRatio ?? unavailable("pbRatio", "P/B unavailable from current feed"),
      enterpriseValue: valn.enterpriseValue ?? unavailable("enterpriseValue", "Enterprise value unavailable from current feed"),
      roe: fd.roe ?? unavailable("roe", "ROE unavailable from current feed"),
      roa: fd.roa ?? unavailable("roa", "ROA unavailable from current feed"),
      // ROCE is not provided by Yahoo — never estimate.
      roce: unavailable("roce", "ROCE unavailable from current feed"),
      debtToEquity: fd.debtToEquity ?? unavailable("debtToEquity", "Debt/Equity unavailable from current feed"),
      operatingMargin: fd.operatingMargin ?? unavailable("operatingMargin", "Operating margin unavailable"),
      netMargin: fd.netMargin ?? unavailable("netMargin", "Net margin unavailable"),
      grossMargin: fd.grossMargin ?? unavailable("grossMargin", "Gross margin unavailable"),
      // Same verified earnings-growth field (not a second independent estimate).
      epsGrowth: fd.profitGrowth ?? fd.earningsTrend ?? unavailable("epsGrowth", "EPS growth unavailable"),
      revenueGrowth: fd.revenueGrowth ?? unavailable("revenueGrowth", "Revenue growth unavailable"),
      profitGrowth: fd.profitGrowth ?? unavailable("profitGrowth", "Profit growth unavailable"),
      freeCashFlow: fd.freeCashFlow ?? unavailable("freeCashFlow", "FCF unavailable"),
      operatingCashFlow: fd.operatingCashFlow ?? unavailable("operatingCashFlow", "Operating cash flow unavailable"),
      currentRatio: fd.currentRatio ?? unavailable("currentRatio", "Current ratio unavailable"),
      trailingEps: fd.trailingEps ?? unavailable("trailingEps", "Trailing EPS unavailable"),
      beta: fd.beta ?? unavailable("beta", "Beta unavailable"),
      pegRatio: valn.pegRatio ?? unavailable("peg", "PEG ratio unavailable from current feed"),
      evEbitda: valn.evEbitda ?? unavailable("evEbitda", "EV/EBITDA unavailable from current feed"),
      dividendYield: valn.dividendYield ?? unavailable("dividendYield", "Dividend yield unavailable from current feed"),
      fundamentalsAvailable: fundamentals?.available === true,
      fundamentalsSource: fundamentals?.source || "Yahoo Finance quoteSummary API",
      fundamentalsMessage: fundamentals?.available
        ? null
        : fundamentals?.message || "Verified fundamental data is currently unavailable from the data feed.",
      updatedAt: meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
      _candles: candles,
    };

    if (candles.length >= 30) {
      const indicators = computeIndicators(candles);
      // Only expose technicals we actually compute — hide unsupported series from the payload
      // so the UI never fills space with permanent "unavailable" noise.
      base.technicals = {
        ...indicators.latest,
        trend: technicalSignal(indicators),
        technicalRating: technicalSignal(indicators),
        sma100: null,
        sma200: null,
        ema: indicators.latest.ema12,
      };
      if (candles.length >= 100) {
        const closes = candles.map((c) => c.close);
        const { sma } = require("./indicators");
        const sma100 = sma(closes, 100);
        const sma200 = sma(closes, 200);
        base.technicals.sma100 = sma100.at(-1);
        base.technicals.sma200 = sma200.at(-1);
      }
    } else {
      base.technicals = null;
    }

    delete base._candles;
    return base;
  } catch (error) {
    return {
      symbol: item.symbol,
      name: item.name,
      sector: item.sector,
      price: null,
      error: error.message,
      technicals: null,
    };
  }
}

async function buildInstitutionalDashboard() {
  const [baseDashboard, indices, constituentsMeta] = await Promise.all([
    buildNifty500Dashboard(),
    Promise.all(INDEX_TICKERS.map(fetchIndexSnapshot)),
    Promise.resolve(loadConstituents()),
  ]);

  const quotes = await Promise.all(constituentsMeta.map(fetchEnrichedQuote));
  const valid = quotes.filter((q) => q.price != null);

  const sectorMap = {};
  valid.forEach((q) => {
    if (!sectorMap[q.sector]) sectorMap[q.sector] = { changes: [], count: 0 };
    if (q.changePercent != null) sectorMap[q.sector].changes.push(q.changePercent);
    sectorMap[q.sector].count += 1;
  });
  Object.keys(sectorMap).forEach((sector) => {
    const data = sectorMap[sector];
    data.avgChange =
      data.changes.length > 0
        ? Number((data.changes.reduce((a, b) => a + b, 0) / data.changes.length).toFixed(2))
        : null;
  });

  const indexMonthlyChange = baseDashboard.marketOverview?.monthlyChangePercent ?? null;
  const top50 = rankTop50(valid, { sectorMap, indexMonthlyChange });

  const slimMover = (q) => ({
    symbol: q.symbol,
    name: q.name,
    sector: q.sector || null,
    price: q.price,
    changePercent: q.changePercent,
    volume: q.volume ?? null,
    marketCap: q.marketCap ?? null,
  });

  const gainers = [...valid]
    .filter((q) => q.changePercent != null && Number.isFinite(q.changePercent))
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 10)
    .map(slimMover);
  const losers = [...valid]
    .filter((q) => q.changePercent != null && Number.isFinite(q.changePercent))
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 10)
    .map(slimMover);
  const mostActive = [...valid]
    .filter((q) => q.volume != null && Number.isFinite(q.volume))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10)
    .map(slimMover);

  const sectors = Object.entries(sectorMap)
    .map(([sector, data]) => ({
      sector,
      avgChange: data.avgChange,
      count: data.count,
      momentum: data.avgChange != null ? (data.avgChange > 0.3 ? "BULLISH" : data.avgChange < -0.3 ? "BEARISH" : "NEUTRAL") : null,
    }))
    .sort((a, b) => (b.avgChange ?? 0) - (a.avgChange ?? 0));

  return {
    title: "Top 50 Stocks to Buy",
    subtitle: "Quantitative screening from verified market data — no estimated fundamentals",
    universe: {
      totalConstituents: constituentsMeta.length,
      screened: valid.length,
      note:
        constituentsMeta.length < 50
          ? `Screening ${constituentsMeta.length}-stock reference universe. Expand nifty500-constituents.json for full NIFTY 500 coverage.`
          : "Full constituent universe screened.",
      source: "Static constituent reference + Yahoo Finance live quotes",
    },
    marketOverview: {
      indices: indices.reduce((acc, idx) => {
        acc[idx.key] = idx;
        return acc;
      }, {}),
      breadth: baseDashboard.marketBreadth,
      nifty500: baseDashboard.marketOverview,
    },
    top50,
    marketMovers: { gainers, losers, mostActive },
    sectorHeatmap: sectors,
    sectorRotation: {
      leading: sectors.slice(0, 3),
      lagging: sectors.slice(-3).reverse(),
    },
    filters: {
      sectors: [...new Set(constituentsMeta.map((c) => c.sector))].sort(),
      marketCaps: ["Large Cap", "Mid Cap", "Small Cap"],
    },
    dataIntegrity: {
      policy: "Never hallucinate. Unverified metrics display as Data Not Available.",
      priceSource: "Yahoo Finance Chart API",
      fundamentalsSource: "Yahoo Finance quoteSummary API (when available)",
      shareholdingSource: "Requires NSE/BSE licensed feed — not fabricated",
      refreshedAt: new Date().toISOString(),
    },
  };
}

module.exports = { buildInstitutionalDashboard, fetchEnrichedQuote };