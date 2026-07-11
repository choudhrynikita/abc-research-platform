const { fetchChart } = require("./yahoo");
const { fetchFundamentals } = require("./fundamentals");
const { buildResearchReport, normalizeSymbol } = require("./research");
const { buildEnhancedPeerComparison } = require("./research-peers");
const { buildInsightCards, buildThesisBullets, computeRatings, val } = require("./research-insights");
const {
  buildSectorBenchmark,
  buildSectorOutlook,
  buildRiskAssessment,
  buildValuationSummary,
} = require("./research-sector");
const { loadConstituents } = require("./nifty500");
const fs = require("fs");
const { dataPath } = require("./data-path");

const COMPETITORS_PATH = dataPath("competitors.json");

function loadCompetitorMap() {
  try {
    return JSON.parse(fs.readFileSync(COMPETITORS_PATH, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Resolve peers from competitors.json first; else same-sector constituents.
 * Never invents peer tickers outside these verified reference lists.
 */
function resolvePeerSymbols(symbol, sector) {
  const map = loadCompetitorMap();
  const entry = map[symbol];
  if (entry?.peers?.length) {
    return {
      peers: entry.peers.filter((p) => p && p !== symbol).slice(0, 5),
      peerSource: "competitors.json curated mapping",
      sector: entry.sector || sector,
    };
  }

  const constituents = loadConstituents();
  const sec = entry?.sector || sector;
  if (!sec || sec === "Unknown") {
    return { peers: [], peerSource: null, sector: sec };
  }

  const sectorPeers = constituents
    .filter((c) => c.sector === sec && c.symbol !== symbol)
    .map((c) => c.symbol)
    .slice(0, 5);

  return {
    peers: sectorPeers,
    peerSource: sectorPeers.length
      ? `Same-sector constituents (${sec}) from nifty500-constituents.json`
      : null,
    sector: sec,
  };
}

async function fetchWithRetry(fn, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastError;
}

async function computeRelativeStrength(symbol) {
  try {
    const [stock, nifty] = await Promise.all([
      fetchChart(symbol, "1d", "3mo"),
      fetchChart("^NSEI", "1d", "3mo"),
    ]);
    const sCandles = stock.candles.filter((c) => c.close != null);
    const nCandles = nifty.candles.filter((c) => c.close != null);
    if (sCandles.length < 22 || nCandles.length < 22) return null;

    const sLatest = sCandles.at(-1).close;
    const sMonth = sCandles.at(-22).close;
    const nLatest = nCandles.at(-1).close;
    const nMonth = nCandles.at(-22).close;

    const stockRet = ((sLatest - sMonth) / sMonth) * 100;
    const niftyRet = ((nLatest - nMonth) / nMonth) * 100;

    return {
      vsNifty: Number((stockRet - niftyRet).toFixed(2)),
      stockReturn1m: Number(stockRet.toFixed(2)),
      niftyReturn1m: Number(niftyRet.toFixed(2)),
      source: "Yahoo Finance Chart API",
      dataType: "factual",
    };
  } catch {
    return null;
  }
}

function enrichSectorOutlook(sectorComp) {
  if (!sectorComp?.available) return sectorComp;
  const avg1m = sectorComp.sectorAvgChange1m;
  let outlook = sectorComp.sectorOutlook || "Neutral";
  if (!sectorComp.sectorOutlook && avg1m != null) {
    if (avg1m > 1) outlook = "Bullish";
    else if (avg1m < -1) outlook = "Bearish";
  }
  return { ...sectorComp, sectorOutlook: outlook };
}

function buildInvestmentDecision(data, ratings) {
  const t = data.technicalAnalysis || {};
  return {
    recommendation: ratings.recommendation,
    confidenceScore: ratings.aiConviction,
    dataType: "analytical-interpretation",
    methodology:
      "Recommendation blends technical ensemble, optional fundamental scores, sector momentum, and data-completeness confidence — not a broker rating feed.",
    entryZone: t.support,
    stopLoss: t.support != null ? Number((t.support * 0.97).toFixed(2)) : null,
    targets: {
      t1: t.resistance,
      t2: t.resistance != null ? Number((t.resistance * 1.05).toFixed(2)) : null,
      t3: t.modelTarget20d,
    },
    horizon: ratings.investmentHorizon,
    opportunities: buildThesisBullets(data, ratings).slice(0, 3),
    risks: [
      t.trend === "BEARISH" ? "Bearish technical structure (verified OHLCV ensemble)" : null,
      ratings.riskLevel === "High" ? "Elevated volatility (ATR/price rule)" : null,
      "Macro and sector cycle risk (framework — not company-specific filing)",
    ].filter(Boolean),
    eventsToMonitor: [
      "Quarterly results (when disclosed)",
      "Sector policy updates (external news feed not connected)",
      "Support/resistance levels from verified OHLCV",
    ],
    thesis: buildThesisBullets(data, ratings),
  };
}

function buildKeyStrengthsRisks(data, ratings) {
  const strengths = [];
  const risks = [];
  const t = data.technicalAnalysis || {};
  const fund = data.fundamentalAnalysis || {};

  if (t.trend === "BULLISH") strengths.push({ text: "Bullish technical ensemble on verified OHLCV", dataType: "analytical-interpretation" });
  if (val(fund.revenueGrowth) > 0) {
    strengths.push({
      text: `Positive revenue growth (${(val(fund.revenueGrowth) * 100).toFixed(1)}% Yahoo verified)`,
      dataType: "factual",
    });
  }
  if (val(fund.roe) != null && val(fund.roe) > 0.12) {
    strengths.push({
      text: `ROE ${(val(fund.roe) * 100).toFixed(1)}% (Yahoo verified)`,
      dataType: "factual",
    });
  }
  if (ratings.valuationStatus === "Attractive") {
    strengths.push({ text: "Valuation attractive vs verified peer P/E average", dataType: "analytical-interpretation" });
  }
  if (data.relativeStrength?.vsNifty > 2) {
    strengths.push({
      text: `Outperforming NIFTY 50 by ${data.relativeStrength.vsNifty}% over 1M (verified)`,
      dataType: "factual",
    });
  }

  if (t.trend === "BEARISH") risks.push({ text: "Bearish technical ensemble on verified OHLCV", dataType: "analytical-interpretation" });
  if (t.rsi != null && t.rsi > 70) risks.push({ text: `RSI overbought at ${t.rsi.toFixed(1)}`, dataType: "factual" });
  if (ratings.valuationStatus === "Expensive") {
    risks.push({ text: "Valuation expensive vs verified peer P/E average", dataType: "analytical-interpretation" });
  }
  if (data.relativeStrength?.vsNifty < -2) {
    risks.push({
      text: `Underperforming NIFTY 50 by ${Math.abs(data.relativeStrength.vsNifty)}% over 1M (verified)`,
      dataType: "factual",
    });
  }
  if (val(fund.debtToEquity) == null) {
    risks.push({ text: "Leverage metrics incomplete from current feed", dataType: "factual" });
  }

  if (!strengths.length) {
    strengths.push({
      text: "Insufficient verified positive signals to list strengths — see full report sections",
      dataType: "analytical-interpretation",
    });
  }
  if (!risks.length) {
    risks.push({
      text: "Standard equity market and sector risks apply — see Risk Analysis section",
      dataType: "analytical-framework",
    });
  }

  return { strengths: strengths.slice(0, 5), risks: risks.slice(0, 5) };
}

async function buildInstitutionalResearch(rawSymbol) {
  const symbol = normalizeSymbol(rawSymbol);

  let base;
  try {
    base = await fetchWithRetry(() => buildResearchReport(symbol));
  } catch (err) {
    return {
      available: false,
      symbol,
      message: "Latest verified data is temporarily unavailable. Please refresh or try again later.",
      error: err.message,
      refreshedAt: new Date().toISOString(),
    };
  }

  const { peers: peerSymbols, peerSource, sector: resolvedSector } = resolvePeerSymbols(
    symbol,
    base.sector
  );
  if (resolvedSector && (base.sector === "Unknown" || !base.sector)) {
    base.sector = resolvedSector;
  }

  const [enhancedPeers, relativeStrength, fundamentalsRetry] = await Promise.all([
    peerSymbols.length
      ? buildEnhancedPeerComparison(symbol, base.companyName, peerSymbols)
      : Promise.resolve({
          available: false,
          message:
            "No verified competitor mapping for this symbol. Add peers in competitors.json or ensure sector constituents exist.",
          peers: [],
          subject: null,
          industryComparison: { available: false },
        }),
    computeRelativeStrength(symbol),
    base.fundamentals?.available
      ? Promise.resolve(base.fundamentals)
      : fetchWithRetry(() => fetchFundamentals(symbol), 2).catch(() => base.fundamentals),
  ]);

  if (!base.fundamentals?.available && fundamentalsRetry?.available) {
    base.fundamentals = fundamentalsRetry;
    base.fundamentalAnalysis = fundamentalsRetry.fundamentalAnalysis;
    base.businessOverview = fundamentalsRetry.businessOverview;
    base.financialStatements = fundamentalsRetry.financialStatements;
    base.valuationAnalysis = {
      ...base.valuationAnalysis,
      ...fundamentalsRetry.valuation,
      roe: fundamentalsRetry.fundamentalAnalysis?.roe,
      roa: fundamentalsRetry.fundamentalAnalysis?.roa,
      roce: fundamentalsRetry.fundamentalAnalysis?.roce,
    };
  }

  if (enhancedPeers.available) {
    enhancedPeers.peerSource = peerSource;
  }

  base.competitorComparison = enhancedPeers;
  base.industryComparison = enhancedPeers.industryComparison || { available: false };
  base.sectorComparison = enrichSectorOutlook(base.sectorComparison);
  base.relativeStrength = relativeStrength;

  // Subject 1M return for sector benchmark
  if (base.sectorComparison) {
    base.sectorComparison.subjectMonthly = relativeStrength?.stockReturn1m ?? null;
  }

  const subjectMetrics = {
    marketCap: val(base.valuationAnalysis?.marketCap),
    peRatio: val(base.valuationAnalysis?.peRatio),
    pbRatio: val(base.valuationAnalysis?.pbRatio),
    evEbitda: val(base.valuationAnalysis?.evEbitda),
    roe: val(base.fundamentalAnalysis?.roe),
    roa: val(base.fundamentalAnalysis?.roa),
    netMargin: val(base.fundamentalAnalysis?.netMargin),
    operatingMargin: val(base.fundamentalAnalysis?.operatingMargin),
    debtToEquity: val(base.fundamentalAnalysis?.debtToEquity),
    dividendYield: val(base.valuationAnalysis?.dividendYield),
    revenueGrowth: val(base.fundamentalAnalysis?.revenueGrowth),
    profitGrowth: val(base.fundamentalAnalysis?.profitGrowth),
  };

  const sectorBenchmark = buildSectorBenchmark(
    subjectMetrics,
    base.industryComparison,
    base.sectorComparison
  );

  const sectorOutlook = buildSectorOutlook({
    sector: base.sector,
    sectorPrice: base.sectorComparison,
    industryComparison: base.industryComparison,
    relativeStrength,
  });

  const valuationSummary = buildValuationSummary(
    base.valuationAnalysis,
    base.industryComparison,
    base.fundamentalAnalysis
  );

  base.riskAssessment = buildRiskAssessment(base);

  const ratings = computeRatings(base);
  const insights = buildInsightCards(base).map((ins) => ({
    ...ins,
    dataType: ins.verified ? "analytical-interpretation" : "info",
    grounding: "Derived only from metrics present in this report payload",
  }));
  const thesis = buildThesisBullets(base, ratings);
  const decision = buildInvestmentDecision(base, ratings);
  const { strengths, risks } = buildKeyStrengthsRisks(base, ratings);

  const unavailableSections = [];
  if (!enhancedPeers.available) unavailableSections.push("competitorComparison");
  if (!base.fundamentals?.available) unavailableSections.push("fundamentals");
  if (!relativeStrength) unavailableSections.push("relativeStrength");
  if (!sectorOutlook.available) unavailableSections.push("sectorOutlook");

  const industry =
    base.industry ||
    (base.businessOverview?.industry?.value || base.businessOverview?.industry) ||
    null;

  return {
    available: true,
    symbol: base.symbol,
    companyName: base.companyName,
    sector: base.sector,
    industry,
    price: base.price,
    currency: base.currency,
    exchange: base.exchange,
    refreshedAt: base.fetchedAt,
    source: "Yahoo Finance Chart API + quoteSummary",
    dataSources: base.dataSources || [
      "Yahoo Finance Chart API",
      "Yahoo Finance quoteSummary",
      "Static peer/sector reference files",
    ],
    peerSource,
    executiveSummary: {
      ...ratings,
      thesis,
      price: base.price,
      currency: base.currency,
      companyName: base.companyName,
      symbol: base.symbol,
      exchange: base.exchange,
      sector: base.sector,
      industry,
      marketCap: base.valuationAnalysis?.marketCap,
      lastUpdated: base.fetchedAt,
      dataSources: base.dataSources,
      keyStrengths: strengths,
      keyRisks: risks,
      investmentSnapshot: {
        recommendation: ratings.recommendation,
        overallRating: ratings.overallRating,
        confidenceLevel: ratings.confidenceLevel,
        riskLevel: ratings.riskLevel,
        valuationStatus: ratings.valuationStatus,
        sectorOutlook: ratings.sectorOutlook,
        dataType: "analytical-interpretation",
      },
    },
    investmentThesis: thesis,
    technicalAnalysis: base.technicalAnalysis,
    fundamentalAnalysis: base.fundamentalAnalysis,
    businessOverview: base.businessOverview,
    financialStatements: base.financialStatements,
    historicalFinancialTrends: base.historicalFinancialTrends,
    dividend: base.dividend || base.fundamentals?.dividend,
    shareholding: base.shareholding || base.fundamentals?.shareholding,
    valuationAnalysis: {
      ...base.valuationAnalysis,
      summary: valuationSummary,
    },
    valuationSummary,
    fundamentalsAvailable: base.fundamentals?.available === true,
    fundamentals: base.fundamentals,
    competitorComparison: enhancedPeers,
    sectorComparison: {
      ...base.sectorComparison,
      benchmark: sectorBenchmark,
    },
    sectorBenchmark,
    sectorOutlook,
    industryComparison: base.industryComparison,
    relativeStrength,
    riskAssessment: base.riskAssessment,
    priceMetrics: base.priceMetrics,
    insights: insights.length
      ? insights
      : [
          {
            category: "Info",
            text: "Not enough verified data is available to generate analytical commentary.",
            verified: false,
            dataType: "info",
          },
        ],
    investmentDecision: decision,
    unavailableSections,
    unavailableNote:
      unavailableSections.length > 0
        ? `Some sections have limited data: ${unavailableSections.join(", ")}. Missing values show Data Unavailable — never synthesized.`
        : null,
    chartSymbol: symbol,
    aiConclusion: base.aiConclusion,
  };
}

module.exports = { buildInstitutionalResearch, resolvePeerSymbols };
