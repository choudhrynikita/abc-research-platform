const { fetchChart } = require("./yahoo");
const { fetchFundamentals } = require("./fundamentals");
const { computeIndicators, technicalSignal } = require("./indicators");
const { unavailable } = require("./compliance");
const { val } = require("./research-insights");

/**
 * Enriched peer snapshot: verified Yahoo chart + quoteSummary only.
 * Never invents peers, ratios, or growth rates.
 */
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
    const statements = fundamentals?.financialStatements || {};

    return {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      changePercent:
        price != null && prev?.close
          ? Number((((price - prev.close) / prev.close) * 100).toFixed(2))
          : null,
      monthlyChangePercent:
        price != null && monthAgo?.close
          ? Number((((price - monthAgo.close) / monthAgo.close) * 100).toFixed(2))
          : null,
      trend: indicators ? technicalSignal(indicators) : null,
      rsi: indicators?.latest?.rsi ?? null,
      technicalRating: indicators ? technicalSignal(indicators) : null,
      marketCap: valn.marketCap ?? unavailable("marketCap", "Source does not provide this information"),
      enterpriseValue: valn.enterpriseValue ?? unavailable("enterpriseValue", "Source does not provide this information"),
      // Latest income statement revenue/PAT when Yahoo returns history
      revenue: statements.incomeStatement?.revenue ?? unavailable("revenue", "Source does not provide this information"),
      ebitda: fund.ebitda ?? statements.incomeStatement?.ebitda ?? unavailable("ebitda", "Source does not provide this information"),
      netProfit: statements.incomeStatement?.pat ?? unavailable("netProfit", "Source does not provide this information"),
      roe: fund.roe ?? unavailable("roe", "Source does not provide this information"),
      roa: fund.roa ?? unavailable("roa", "Source does not provide this information"),
      roce: fund.roce ?? unavailable("roce", "ROCE unavailable from current feed"),
      peRatio: valn.peRatio ?? unavailable("peRatio", "Source does not provide this information"),
      forwardPe: valn.forwardPe ?? unavailable("forwardPe", "Source does not provide this information"),
      pbRatio: valn.pbRatio ?? unavailable("pbRatio", "Source does not provide this information"),
      pegRatio: valn.pegRatio ?? unavailable("pegRatio", "Source does not provide this information"),
      evEbitda: valn.evEbitda ?? unavailable("evEbitda", "Source does not provide this information"),
      priceToSales: valn.priceToSales ?? unavailable("priceToSales", "Source does not provide this information"),
      enterpriseToRevenue:
        valn.enterpriseToRevenue ?? unavailable("enterpriseToRevenue", "Source does not provide this information"),
      debtToEquity: fund.debtToEquity ?? unavailable("debtToEquity", "Source does not provide this information"),
      operatingMargin: fund.operatingMargin ?? unavailable("operatingMargin", "Source does not provide this information"),
      netMargin: fund.netMargin ?? unavailable("netMargin", "Source does not provide this information"),
      revenueGrowth: fund.revenueGrowth ?? unavailable("revenueGrowth", "Source does not provide this information"),
      profitGrowth: fund.profitGrowth ?? unavailable("profitGrowth", "Source does not provide this information"),
      earningsGrowth: fund.earningsTrend ?? unavailable("earningsGrowth", "Source does not provide this information"),
      dividendYield: valn.dividendYield ?? unavailable("dividendYield", "Source does not provide this information"),
      freeCashFlow: fund.freeCashFlow ?? unavailable("freeCashFlow", "Source does not provide this information"),
      freeCashFlowYield:
        valn.freeCashFlowYield ?? unavailable("freeCashFlowYield", "Requires verified FCF and market cap"),
      institutionalOwnership: unavailable("institutional", "Requires NSE/BSE shareholding feed"),
      fundamentalsAvailable: fundamentals?.available === true,
      sector: fundamentals?.businessOverview?.sector?.value || fundamentals?.businessOverview?.sector || null,
      industry: fundamentals?.businessOverview?.industry?.value || fundamentals?.businessOverview?.industry || null,
      fetchedAt: new Date().toISOString(),
      source: "Yahoo Finance Chart API + quoteSummary",
    };
  } catch {
    return {
      symbol,
      name: symbol,
      price: null,
      error: true,
      message: "Live Data Currently Unavailable for this peer",
    };
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
  const vals = peers.map((p) => val(p[key])).filter((v) => v != null && Number.isFinite(Number(v)));
  if (!vals.length) return null;
  return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(4));
}

async function buildEnhancedPeerComparison(symbol, companyName, peerSymbols) {
  const uniquePeers = [...new Set((peerSymbols || []).filter((p) => p && p !== symbol))].slice(0, 5);

  if (!uniquePeers.length) {
    return {
      available: false,
      message:
        "No verified competitor mapping for this symbol. Peers are sourced from competitors.json or same-sector constituents — never invented.",
      peers: [],
      subject: null,
      highlights: {},
      industryComparison: { available: false },
      peerSource: null,
    };
  }

  const subject = await fetchEnrichedPeer(symbol);
  const peers = await Promise.all(uniquePeers.map(fetchEnrichedPeer));
  const verified = peers.filter((p) => p.price != null);

  if (!verified.length) {
    return {
      available: false,
      message: "No verified competitor price data available from Yahoo Finance for mapped peers.",
      peers: [],
      subject,
      highlights: {},
      industryComparison: { available: false },
    };
  }

  const cohort = [subject, ...verified].filter((p) => p && p.price != null);
  const highlights = computeHighlights(subject, verified);
  const industryAvg = {
    pe: avgMetric(cohort, "peRatio"),
    pb: avgMetric(cohort, "pbRatio"),
    roe: avgMetric(cohort, "roe"),
    roa: avgMetric(cohort, "roa"),
    revenueGrowth: avgMetric(cohort, "revenueGrowth"),
    profitGrowth: avgMetric(cohort, "profitGrowth"),
    operatingMargin: avgMetric(cohort, "operatingMargin"),
    netMargin: avgMetric(cohort, "netMargin"),
    debtToEquity: avgMetric(cohort, "debtToEquity"),
    evEbitda: avgMetric(cohort, "evEbitda"),
    dividendYield: avgMetric(cohort, "dividendYield"),
    marketCap: avgMetric(cohort, "marketCap"),
  };

  return {
    available: true,
    message: `Compared against ${verified.length} verified peers using Yahoo Finance Chart API + quoteSummary. Missing cells show Data Unavailable — never estimated.`,
    subject: { ...subject, name: companyName || subject.name, isSubject: true },
    peers: verified,
    highlights,
    industryComparison: {
      avgPe: industryAvg.pe,
      avgPb: industryAvg.pb,
      avgRoe: industryAvg.roe,
      avgRoa: industryAvg.roa,
      avgRevenueGrowth: industryAvg.revenueGrowth,
      avgProfitGrowth: industryAvg.profitGrowth,
      avgOperatingMargin: industryAvg.operatingMargin,
      avgNetMargin: industryAvg.netMargin,
      avgDebtToEquity: industryAvg.debtToEquity,
      avgEvEbitda: industryAvg.evEbitda,
      avgDividendYield: industryAvg.dividendYield,
      avgMarketCap: industryAvg.marketCap,
      peerCount: verified.length,
      available: Object.values(industryAvg).some((v) => v != null),
      source: "Average of verified peer Yahoo quoteSummary fields (cohort includes subject when available)",
      methodology: "Simple arithmetic mean of available peer metrics; nulls excluded — no interpolation",
    },
    table: {
      headers: [
        "Company",
        "Price",
        "Mkt Cap",
        "P/E",
        "P/B",
        "EV/EBITDA",
        "ROE",
        "Rev Growth",
        "D/E",
        "Div Yield",
        "Trend",
      ],
      rows: [
        [
          companyName || subject.name,
          subject.price,
          val(subject.marketCap),
          val(subject.peRatio),
          val(subject.pbRatio),
          val(subject.evEbitda),
          val(subject.roe),
          val(subject.revenueGrowth),
          val(subject.debtToEquity),
          val(subject.dividendYield),
          subject.trend,
        ],
        ...verified.map((p) => [
          p.name,
          p.price,
          val(p.marketCap),
          val(p.peRatio),
          val(p.pbRatio),
          val(p.evEbitda),
          val(p.roe),
          val(p.revenueGrowth),
          val(p.debtToEquity),
          val(p.dividendYield),
          p.trend,
        ]),
      ],
    },
  };
}

module.exports = { buildEnhancedPeerComparison, fetchEnrichedPeer, computeHighlights, avgMetric };
