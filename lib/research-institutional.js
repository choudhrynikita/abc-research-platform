const { fetchChart } = require("./yahoo");
const { fetchFundamentals } = require("./fundamentals");
const { buildResearchReport, normalizeSymbol } = require("./research");
const { buildEnhancedPeerComparison } = require("./research-peers");
const { buildInsightCards, buildThesisBullets, computeRatings, val } = require("./research-insights");
const fs = require("fs");
const path = require("path");
const { dataPath } = require("./data-path");

const COMPETITORS_PATH = dataPath("competitors.json");

function loadCompetitorMap() {
  try {
    return JSON.parse(fs.readFileSync(COMPETITORS_PATH, "utf8"));
  } catch {
    return {};
  }
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
    };
  } catch {
    return null;
  }
}

function enrichSectorOutlook(sectorComp) {
  if (!sectorComp?.available) return sectorComp;
  const avg1m = sectorComp.sectorAvgChange1m;
  let outlook = "Neutral";
  if (avg1m != null) {
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
      t.trend === "BEARISH" ? "Bearish technical structure" : null,
      ratings.riskLevel === "High" ? "Elevated volatility (ATR-based)" : null,
      "Macro and sector cycle risk",
    ].filter(Boolean),
    eventsToMonitor: ["Quarterly results", "Sector policy updates", "Support/resistance levels"],
    thesis: buildThesisBullets(data, ratings),
  };
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

  const map = loadCompetitorMap();
  const entry = map[symbol];
  const peerSymbols = entry?.peers?.length ? entry.peers.slice(0, 4) : [];

  const [enhancedPeers, relativeStrength, fundamentalsRetry] = await Promise.all([
    peerSymbols.length
      ? buildEnhancedPeerComparison(symbol, base.companyName, peerSymbols)
      : Promise.resolve({ available: false, message: "No peer mapping configured", peers: [], subject: null }),
    computeRelativeStrength(symbol),
    base.fundamentals?.available
      ? Promise.resolve(base.fundamentals)
      : fetchWithRetry(() => fetchFundamentals(symbol), 2).catch(() => base.fundamentals),
  ]);

  if (!base.fundamentals?.available && fundamentalsRetry?.available) {
    base.fundamentals = fundamentalsRetry;
    base.fundamentalAnalysis = fundamentalsRetry.fundamentalAnalysis;
    base.valuationAnalysis = {
      ...base.valuationAnalysis,
      peRatio: fundamentalsRetry.valuation.peRatio,
      pbRatio: fundamentalsRetry.valuation.pbRatio,
      marketCap: fundamentalsRetry.valuation.marketCap,
    };
  }

  base.competitorComparison = enhancedPeers;
  base.industryComparison = enhancedPeers.industryComparison || { available: false };
  base.sectorComparison = enrichSectorOutlook(base.sectorComparison);
  base.relativeStrength = relativeStrength;

  const ratings = computeRatings(base);
  const insights = buildInsightCards(base);
  const thesis = buildThesisBullets(base, ratings);
  const decision = buildInvestmentDecision(base, ratings);

  const unavailableSections = [];
  if (!enhancedPeers.available) unavailableSections.push("competitorComparison");
  if (!base.fundamentals?.available) unavailableSections.push("fundamentals");
  if (!relativeStrength) unavailableSections.push("relativeStrength");

  return {
    available: true,
    symbol: base.symbol,
    companyName: base.companyName,
    sector: base.sector,
    price: base.price,
    currency: base.currency,
    exchange: base.exchange,
    refreshedAt: base.fetchedAt,
    source: "Yahoo Finance Chart API + quoteSummary",
    executiveSummary: {
      ...ratings,
      thesis,
      price: base.price,
      currency: base.currency,
    },
    investmentThesis: thesis,
    technicalAnalysis: base.technicalAnalysis,
    fundamentalAnalysis: base.fundamentalAnalysis,
    valuationAnalysis: base.valuationAnalysis,
    fundamentalsAvailable: base.fundamentals?.available === true,
    competitorComparison: enhancedPeers,
    sectorComparison: base.sectorComparison,
    industryComparison: base.industryComparison,
    relativeStrength,
    insights: insights.length
      ? insights
      : [{ category: "Info", text: "Not enough verified data is available to generate analytical commentary.", verified: false }],
    investmentDecision: decision,
    unavailableSections,
    unavailableNote:
      unavailableSections.length > 0
        ? `Some sections omitted: ${unavailableSections.join(", ")}. No synthetic data generated.`
        : null,
    chartSymbol: symbol,
    aiConclusion: base.aiConclusion,
  };
}

module.exports = { buildInstitutionalResearch };