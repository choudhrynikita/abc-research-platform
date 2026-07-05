const fs = require("fs");
const path = require("path");
const { fetchChart } = require("./yahoo");
const { fetchFiiDii } = require("./nse");
const { computeIndicators, technicalSignal } = require("./indicators");
const {
  fetchOptionChain,
  fetchContractInfo,
  pickMonthlyExpiry,
} = require("./nse-options");
const { generateCandidates, rankTop10, historicalVol } = require("./equity-fno-engine");
const { buildNifty500Dashboard } = require("./nifty500");
const { dataPath } = require("./data-path");
const { resolveMarketStatus } = require("./market-hours");
const { resolveEquityChain } = require("./option-chain-cache");
const {
  finalizeStrategies,
  generateTechnicalSetups,
  rankPreMarketSetups,
  sessionLevelsFromCandles,
} = require("./pre-market-strategy");
const { buildDerivativesIntelligence } = require("./derivatives-intelligence");
const { resolveIvMetrics } = require("./iv-metrics");
const { normalizeBreadth } = require("./breadth");

const PRIORITY_SYMBOLS = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
  "BHARTIARTL.NS", "SBIN.NS", "ITC.NS", "MARUTI.NS", "LT.NS",
];

function loadConstituents() {
  try {
    return JSON.parse(fs.readFileSync(dataPath("nifty500-constituents.json"), "utf8"));
  } catch {
    return [];
  }
}

async function computeRelativeStrength(symbol) {
  try {
    const [stock, nifty] = await Promise.all([
      fetchChart(symbol, "1d", "3mo"),
      fetchChart("^NSEI", "1d", "3mo"),
    ]);
    const sC = stock.candles.filter((c) => c.close != null);
    const nC = nifty.candles.filter((c) => c.close != null);
    if (sC.length < 22 || nC.length < 22) return null;
    const stockRet = ((sC.at(-1).close - sC.at(-22).close) / sC.at(-22).close) * 100;
    const niftyRet = ((nC.at(-1).close - nC.at(-22).close) / nC.at(-22).close) * 100;
    return {
      vsNifty: Number((stockRet - niftyRet).toFixed(2)),
      vsSector: null,
      stockReturn1m: Number(stockRet.toFixed(2)),
      source: "Yahoo Finance",
    };
  } catch {
    return null;
  }
}

function buildChainHeatmap(chain) {
  if (!chain?.available || !chain.strikes?.length) return null;
  const sorted = [...chain.strikes].sort((a, b) => a.strike - b.strike);
  const atmIdx = Math.max(0, sorted.findIndex((s) => s.strike === chain.atmStrike));
  return sorted.slice(Math.max(0, atmIdx - 8), atmIdx + 9).map((s) => ({
    strike: s.strike,
    callOi: s.ce?.openInterest ?? null,
    putOi: s.pe?.openInterest ?? null,
  }));
}

async function analyzeEquity(symbol, meta, marketTrend, sectorMap, marketStatus) {
  const nseSymbol = symbol.replace(".NS", "");
  const [chart, contractInfo, relativeStrength] = await Promise.all([
    fetchChart(symbol, "1d", "1y"),
    fetchContractInfo(symbol).catch(() => ({ available: false })),
    computeRelativeStrength(symbol),
  ]);

  const candles = chart.candles.filter((c) => c.close != null);
  const sessionLevels = sessionLevelsFromCandles(candles);
  const indicators = computeIndicators(candles);
  const latest = indicators.latest;
  const trend = technicalSignal(indicators);
  const price = chart.meta.regularMarketPrice ?? sessionLevels.sessionClose ?? candles.at(-1)?.close;
  const hv = historicalVol(candles);

  const expiries = contractInfo?.available
    ? contractInfo.expiries
    : [];
  const monthlyExpiry = pickMonthlyExpiry(expiries);

  let chain = { available: false, reason: "Monthly expiry chain not fetched" };
  let chainResolution = { verified: false, live: false, stale: false, fetchedAt: null };
  let ivMetrics = null;
  if (monthlyExpiry) {
    const liveChain = await fetchOptionChain(symbol, 2, monthlyExpiry);
    chainResolution = await resolveEquityChain(symbol, liveChain, marketStatus);
    chain = chainResolution.chain;
    if (chain.available) {
      chain.expiry = monthlyExpiry;
      ivMetrics = await resolveIvMetrics(nseSymbol, chain, { sessionDate: marketStatus.sessionDate });
    }
  }

  const sectorEntry = sectorMap[meta.sector];
  const sectorOutlook = sectorEntry?.avgChange != null
    ? (sectorEntry.avgChange > 0.5 ? "Bullish" : sectorEntry.avgChange < -0.5 ? "Bearish" : "Neutral")
    : null;

  const ctx = {
    symbol,
    nseSymbol,
    name: meta.name || chart.meta.shortName || nseSymbol,
    sector: meta.sector || "—",
    industry: meta.industry || null,
    price,
    trend,
    support: latest.support,
    resistance: latest.resistance,
    rsi: latest.rsi,
    adx: latest.adx,
    volumeTrend: latest.volumeTrend,
    histVol: hv,
    chain,
    ivMetrics,
    lotSize: chain.lotSize ?? null,
    monthlyExpiry,
    relativeStrength,
    sectorOutlook,
    marketTrend,
    earnings: null,
    corporateActions: null,
    institutionalOwnership: null,
  };

  let candidates = generateCandidates(chain, ctx).map((c) => ({ ...c, _ctx: ctx }));
  if (!candidates.length && marketStatus?.mode === "pre-market") {
    candidates = generateTechnicalSetups(
      { ...ctx, ...sessionLevels, marketTrend, vix: null },
      nseSymbol
    ).map((c) => ({ ...c, _ctx: ctx }));
  }

  return {
    symbol,
    nseSymbol,
    name: ctx.name,
    sector: ctx.sector,
    price,
    trend,
    chainVerified: chainResolution.verified,
    chainStale: chainResolution.stale,
    monthlyExpiry,
    lotSize: chain.lotSize,
    candidates,
    marketContext: {
      stockTrend: trend,
      sectorTrend: sectorOutlook,
      industryTrend: null,
      relativeStrength,
      support: latest.support,
      resistance: latest.resistance,
      earnings: null,
      corporateActions: null,
      institutionalOwnership: null,
      histVol: hv,
      impliedVolatility: chain.impliedVolatility ?? null,
    },
    chainHeatmap: buildChainHeatmap(chain),
    chain: chain.available ? chain : null,
    chainSummary: chain.available
      ? {
          available: true,
          symbol: nseSymbol,
          putCallRatio: chain.putCallRatio,
          callOi: chain.callOi,
          putOi: chain.putOi,
          callOiChange: chain.callOiChange,
          putOiChange: chain.putOiChange,
          impliedVolatility: chain.impliedVolatility,
          ivRank: ivMetrics?.ivRank?.display ?? null,
          ivPercentile: ivMetrics?.ivPercentile?.display ?? null,
          source: chain.source,
          fetchedAt: chain.fetchedAt,
        }
      : { available: false },
    ivMetrics,
    technicals: latest,
    chartSymbol: symbol,
  };
}

function buildInsights(top10, marketContext) {
  const technical = [];
  const options = [];
  const fundamental = [];
  const risks = [];

  if (marketContext.marketTrend === "BULLISH") {
    technical.push("Broad market trend is bullish — equity call structures favored on leaders.");
  } else if (marketContext.marketTrend === "BEARISH") {
    technical.push("Broad market trend is bearish — defensive puts and hedges prioritized.");
  }

  if (marketContext.chainsVerified > 0) {
    options.push(`${marketContext.chainsVerified} equity option chains verified from NSE for monthly expiry.`);
  } else {
    options.push("Pre-market technical preparation strategies generated from verified price & indicator data.");
    risks.push("NSE live option chains unavailable — premiums shown only where last verified close exists.");
  }

  if (marketContext.fiiDii?.fiiNet != null) {
    fundamental.push(
      `FII net ${marketContext.fiiDii.fiiNet.toLocaleString()} Cr — ${marketContext.fiiDii.fiiNet > 0 ? "supportive institutional flow" : "foreign selling pressure"}.`
    );
  }

  const highLiq = top10.filter((s) => s.analytics?.liquidityRating === "High").length;
  if (highLiq > 0) {
    options.push(`${highLiq} top strategies show high options liquidity (verified OI/volume).`);
  }

  if (marketContext.vix?.value > 18) {
    risks.push(`India VIX elevated at ${marketContext.vix.value.toFixed(2)} — wider stops advised.`);
  }

  return { technical, options, fundamental, risks };
}

async function fetchVix() {
  try {
    const chart = await fetchChart("^INDIAVIX", "1d", "1mo");
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1)?.close;
    const prev = candles.at(-6)?.close;
    return {
      value: latest,
      trend: latest != null && prev ? (latest > prev ? "Rising" : "Falling") : null,
      source: "Yahoo Finance ^INDIAVIX",
    };
  } catch {
    return null;
  }
}

async function buildInstitutionalEquityFnoDashboard() {
  const marketStatus = resolveMarketStatus();
  const constituents = loadConstituents();
  const metaMap = Object.fromEntries(constituents.map((c) => [c.symbol, c]));
  const symbols = PRIORITY_SYMBOLS.filter((s) => metaMap[s] || true);

  const [niftyChart, breadthData, vix, fiiDii] = await Promise.all([
    fetchChart("^NSEI", "1d", "6mo"),
    buildNifty500Dashboard().catch(() => null),
    fetchVix(),
    fetchFiiDii(2).catch(() => null),
  ]);

  const niftyCandles = niftyChart.candles.filter((c) => c.close != null);
  const niftyIndicators = computeIndicators(niftyCandles);
  const marketTrend = technicalSignal(niftyIndicators);

  const sectorMap = {};
  (breadthData?.sectorAnalysis?.all || []).forEach((s) => {
    sectorMap[s.sector] = { avgChange: s.avgChange };
  });

  const analyses = await Promise.all(
    symbols.map((sym) =>
      analyzeEquity(
        sym,
        metaMap[sym] || { name: sym.replace(".NS", ""), sector: "—" },
        marketTrend,
        sectorMap,
        marketStatus
      )
    )
  );

  const allCandidates = analyses.flatMap((a) => a.candidates);
  const chainsVerified = analyses.filter((a) => a.chainVerified).length;
  const chainsStale = analyses.filter((a) => a.chainStale).length;

  const globalContext = {
    marketTrend,
    vix: vix?.value,
    volumeTrend: niftyIndicators.latest.volumeTrend,
    adx: niftyIndicators.latest.adx,
  };

  let top10 = allCandidates.length
    ? (marketStatus.mode === "pre-market" && chainsVerified === 0
      ? rankPreMarketSetups(allCandidates, globalContext)
      : rankTop10(allCandidates, globalContext))
    : [];

  const chainMeta = {
    stale: chainsStale > 0 || marketStatus.mode === "pre-market",
    fetchedAt: marketStatus.checkedAt,
  };
  top10 = finalizeStrategies(top10, marketStatus, chainMeta);

  const insights = buildInsights(top10, {
    marketTrend,
    chainsVerified,
    fiiDii: fiiDii ? { fiiNet: fiiDii.fii?.netValue, diiNet: fiiDii.dii?.netValue } : null,
    vix,
  });

  const selectedSymbol = top10[0]?.symbol || analyses[0]?.symbol;
  const selectedAnalysis = analyses.find((a) => a.symbol === selectedSymbol) || analyses[0];

  const niftySession = sessionLevelsFromCandles(niftyCandles);
  const dataSource = marketStatus.isLive && chainsVerified > 0
    ? "NSE option-chain-equities + Yahoo Finance (live)"
    : chainsVerified > 0
      ? "Last verified NSE equity close + Yahoo Finance + ABC quantitative engine"
      : "Yahoo Finance technicals + ABC pre-market engine";

  return {
    available: true,
    title: "Equity F&O Strategy Center",
    subtitle: marketStatus.isLive
      ? "Top 10 highest-conviction equity options strategies — live verified data"
      : "Top 10 pre-market equity preparation strategies — latest verified market close",
    refreshedAt: new Date().toISOString(),
    marketStatus,
    marketMode: marketStatus.mode,
    source: dataSource,
    executiveSummary: {
      marketTrend,
      niftySpot: niftyChart.meta.regularMarketPrice ?? niftySession.sessionClose ?? niftyCandles.at(-1)?.close,
      indiaVix: vix?.value ?? null,
      universeSize: symbols.length,
      chainsVerified,
      chainsStale,
      strategiesActive: top10.filter((s) => s.status === "Active" || s.status === "Pre-Market").length,
      topSector: breadthData?.sectorAnalysis?.best?.[0]?.sector ?? null,
      fiiNet: fiiDii?.fii?.netValue ?? null,
      marketMode: marketStatus.mode,
      lastSessionDate: niftySession.sessionDate,
    },
    marketContext: {
      marketTrend,
      niftySpot: niftyChart.meta.regularMarketPrice ?? niftyCandles.at(-1)?.close,
      indiaVix: vix,
      breadth: normalizeBreadth(breadthData?.marketBreadth) ?? null,
      sectorRotation: breadthData?.sectorAnalysis?.best?.slice(0, 3) ?? [],
      fiiDii: fiiDii
        ? { fiiNet: fiiDii.fii?.netValue, diiNet: fiiDii.dii?.netValue, date: fiiDii.date }
        : null,
      technicals: niftyIndicators.latest,
    },
    top10,
    insights,
    analyses: analyses.map((a) => ({
      symbol: a.symbol,
      nseSymbol: a.nseSymbol,
      name: a.name,
      sector: a.sector,
      chainVerified: a.chainVerified,
      monthlyExpiry: a.monthlyExpiry,
    })),
    selectedChart: {
      symbol: selectedAnalysis?.chartSymbol || "RELIANCE.NS",
      technicals: selectedAnalysis?.technicals,
      chainHeatmap: selectedAnalysis?.chainHeatmap,
      stockContext: selectedAnalysis?.marketContext,
    },
    backtest: {
      available: false,
      note: "No verified historical backtest available for this strategy.",
    },
    derivativesIntelligence: buildDerivativesIntelligence({
      chain: (() => {
        const sel = analyses.find((a) => a.symbol === selectedSymbol) || selectedAnalysis;
        return sel?.chain?.available ? sel.chain : { available: false };
      })(),
      technicals: niftyIndicators.latest,
      breadth: breadthData?.marketBreadth,
      fiiDii: fiiDii ? { fiiNet: fiiDii.fii?.netValue } : null,
      selectedStrategy: top10[0] ?? null,
      vix,
      volumeTrend: niftyIndicators.latest.volumeTrend,
      ivMetrics: (() => {
        const sel = analyses.find((a) => a.symbol === selectedSymbol) || selectedAnalysis;
        return sel?.ivMetrics ?? null;
      })(),
    }),
    chartContext: {
      reflectsLastSession: !marketStatus.isLive,
      sessionDate: niftySession.sessionDate,
      note: marketStatus.isLive
        ? "Charts update with live session data"
        : "Charts reflect the latest completed trading session",
    },
    disclaimer: "Equity options involve substantial risk. Premiums, OI, and Greeks from NSE when available. Earnings/corporate actions require separate feeds. Not investment advice.",
  };
}

module.exports = { buildInstitutionalEquityFnoDashboard, analyzeEquity };