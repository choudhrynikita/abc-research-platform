const { fetchChart } = require("./yahoo");
const { fetchFundamentals } = require("./fundamentals");
const { computeIndicators, technicalSignal } = require("./indicators");
const { unavailable } = require("./compliance");
const { val } = require("./research-insights");

async function fetchEnrichedPeer(symbol) {
  try {
    const [chart, fundamentals] = await Promise.all([
      fetchChart(symbol, "1d", "3mo"),
      fetchFundamentals(symbol),
    ]);

    const candles = chart.candles.filter((c) => c.close != null);
    const meta = chart.meta;
    const price = meta.regularMarketPrice ?? candles.at(-1)?.close ?? null;
    const prev = candles.at(-2);
    const monthAgo = candles.at(-22);
    const indicators = candles.length >= 30 ? computeIndicators(candles) : null;
    const fund = fundamentals?.fundamentalAnalysis || {};
    const valn = fundamentals?.valuation || {};

    return {
      symbol,
      name: meta.shortName || symbol,
      price,
      changePercent:
        price != null && prev?.close ? Number((((price - prev.close) / prev.close) * 100).toFixed(2)) : null,
      monthlyChangePercent:
        price != null && monthAgo?.close
          ? Number((((price - monthAgo.close) / monthAgo.close) * 100).toFixed(2))
          : null,
      trend: indicators ? technicalSignal(indicators) : null,
      rsi: indicators?.latest?.rsi ?? null,
      technicalRating: indicators ? technicalSignal(indicators) : null,
      marketCap: valn.marketCap ?? unavailable("marketCap", "Unavailable"),
      revenue: fund.revenueGrowth ?? unavailable("revenue", "Unavailable"),
      roe: fund.roe ?? unavailable("roe", "Unavailable"),
      roce: fund.roce ?? unavailable("roce", "Unavailable"),
      peRatio: valn.peRatio ?? unavailable("peRatio", "Unavailable"),
      pbRatio: valn.pbRatio ?? unavailable("pbRatio", "Unavailable"),
      debtToEquity: fund.debtToEquity ?? unavailable("debtToEquity", "Unavailable"),
      operatingMargin: fund.operatingMargin ?? unavailable("operatingMargin", "Unavailable"),
      netMargin: fund.netMargin ?? unavailable("netMargin", "Unavailable"),
      revenueGrowth: fund.revenueGrowth ?? unavailable("revenueGrowth", "Unavailable"),
      profitGrowth: fund.profitGrowth ?? unavailable("profitGrowth", "Unavailable"),
      earningsGrowth: fund.earningsTrend ?? unavailable("earningsGrowth", "Unavailable"),
      dividendYield: unavailable("dividendYield", "Requires licensed feed"),
      institutionalOwnership: unavailable("institutional", "Requires NSE/BSE shareholding feed"),
      fundamentalsAvailable: fundamentals?.available === true,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return { symbol, name: symbol, price: null, error: true };
  }
}

function computeHighlights(subject, peers) {
  const all = [subject, ...peers.filter((p) => p.price != null)];
  const highlights = {};

  const growthPeers = all.filter((p) => val(p.revenueGrowth) != null);
  if (growthPeers.length) {
    highlights.bestGrowth = growthPeers.reduce((a, b) =>
      (val(a.revenueGrowth) ?? -1) > (val(b.revenueGrowth) ?? -1) ? a : b
    ).name;
  }

  const roePeers = all.filter((p) => val(p.roe) != null);
  if (roePeers.length) {
    highlights.highestRoe = roePeers.reduce((a, b) =>
      (val(a.roe) ?? -1) > (val(b.roe) ?? -1) ? a : b
    ).name;
  }

  const pePeers = all.filter((p) => val(p.peRatio) != null && val(p.peRatio) > 0);
  if (pePeers.length) {
    highlights.bestValuation = pePeers.reduce((a, b) =>
      (val(a.peRatio) ?? 999) < (val(b.peRatio) ?? 999) ? a : b
    ).name;
  }

  const debtPeers = all.filter((p) => val(p.debtToEquity) != null);
  if (debtPeers.length) {
    highlights.lowestDebt = debtPeers.reduce((a, b) =>
      (val(a.debtToEquity) ?? 999) < (val(b.debtToEquity) ?? 999) ? a : b
    ).name;
  }

  const techPeers = all.filter((p) => p.technicalRating === "BULLISH");
  if (techPeers.length) {
    highlights.strongestTechnical = techPeers[0].name;
  }

  return highlights;
}

function avgMetric(peers, key) {
  const vals = peers.map((p) => val(p[key])).filter((v) => v != null);
  if (!vals.length) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
}

async function buildEnhancedPeerComparison(symbol, companyName, peerSymbols) {
  const subject = await fetchEnrichedPeer(symbol);
  const peers = await Promise.all(peerSymbols.map(fetchEnrichedPeer));
  const verified = peers.filter((p) => p.price != null);

  if (!verified.length) {
    return {
      available: false,
      message: "No verified competitor price data available. Add peers in competitors.json.",
      peers: [],
      subject,
    };
  }

  const highlights = computeHighlights(subject, verified);
  const industryAvg = {
    pe: avgMetric([subject, ...verified], "peRatio"),
    roe: avgMetric([subject, ...verified], "roe"),
    revenueGrowth: avgMetric([subject, ...verified], "revenueGrowth"),
    profitGrowth: avgMetric([subject, ...verified], "profitGrowth"),
    operatingMargin: avgMetric([subject, ...verified], "operatingMargin"),
    debtToEquity: avgMetric([subject, ...verified], "debtToEquity"),
  };

  return {
    available: true,
    message: `Compared against ${verified.length} peers using verified Yahoo Finance data.`,
    subject,
    peers: verified,
    highlights,
    industryComparison: {
      avgPe: industryAvg.pe,
      avgRoe: industryAvg.roe,
      avgRevenueGrowth: industryAvg.revenueGrowth,
      avgProfitGrowth: industryAvg.profitGrowth,
      avgOperatingMargin: industryAvg.operatingMargin,
      avgDebtToEquity: industryAvg.debtToEquity,
      available: Object.values(industryAvg).some((v) => v != null),
    },
    table: {
      headers: ["Company", "Price", "P/E", "ROE", "Rev Growth", "Trend", "Tech Rating"],
      rows: [
        [companyName, subject.price, val(subject.peRatio), val(subject.roe), val(subject.revenueGrowth), subject.trend, subject.technicalRating],
        ...verified.map((p) => [
          p.name,
          p.price,
          val(p.peRatio),
          val(p.roe),
          val(p.revenueGrowth),
          p.trend,
          p.technicalRating,
        ]),
      ],
    },
  };
}

module.exports = { buildEnhancedPeerComparison, fetchEnrichedPeer, computeHighlights };