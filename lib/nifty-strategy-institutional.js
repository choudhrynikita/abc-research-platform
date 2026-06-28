const { fetchNiftyHistory } = require("./yahoo");
const { fetchNiftyOptionChain } = require("./nse-options");
const { computeIndicators, technicalSignal } = require("./indicators");
const { buildNiftyPrediction } = require("./ensemble");
const { buildNifty500Dashboard } = require("./nifty500");
const { fetchFiiDii } = require("./nse");
const { generateCandidates, rankTop10 } = require("./nifty-strategy-engine");
const { backtestEnsemble } = require("./report-nifty-strategy");
const { resolveMarketStatus } = require("./market-hours");
const { resolveNiftyChain } = require("./option-chain-cache");
const {
  finalizeStrategies,
  generateTechnicalSetups,
  rankPreMarketSetups,
  sessionLevelsFromCandles,
} = require("./pre-market-strategy");
const { buildDerivativesIntelligence } = require("./derivatives-intelligence");

async function fetchVix() {
  try {
    const { fetchChart } = require("./yahoo");
    const chart = await fetchChart("^INDIAVIX", "1d", "1mo");
    const candles = chart.candles.filter((c) => c.close != null);
    const latest = candles.at(-1)?.close;
    const prev = candles.at(-6)?.close;
    return {
      value: latest,
      changePercent: latest != null && prev ? Number((((latest - prev) / prev) * 100).toFixed(2)) : null,
      trend: latest != null && prev ? (latest > prev ? "Rising" : "Falling") : null,
      source: "Yahoo Finance ^INDIAVIX",
    };
  } catch {
    return null;
  }
}

async function fetchFiiDiiSafe() {
  try {
    return await fetchFiiDii(3);
  } catch {
    return null;
  }
}

function buildChainHeatmap(chain) {
  if (!chain?.available || !chain.strikes?.length) return null;
  const sorted = [...chain.strikes].sort((a, b) => a.strike - b.strike);
  const atmIdx = Math.max(
    0,
    sorted.findIndex((s) => s.strike === chain.atmStrike)
  );
  const start = Math.max(0, atmIdx - 12);
  const end = Math.min(sorted.length, atmIdx + 13);
  return sorted.slice(start, end).map((s) => ({
    strike: s.strike,
    callOi: s.ce?.openInterest ?? null,
    putOi: s.pe?.openInterest ?? null,
    callOiChange: s.ce?.oiChange ?? null,
    putOiChange: s.pe?.oiChange ?? null,
    callIv: s.ce?.iv ?? null,
    putIv: s.pe?.iv ?? null,
  }));
}

function buildInsights(strategies, context) {
  const insights = [];
  if (context.trend === "BULLISH") {
    insights.push({ type: "bullish", text: "NIFTY technical trend is bullish — favor call spreads and debit bullish structures." });
  }
  if (context.trend === "BEARISH") {
    insights.push({ type: "bearish", text: "NIFTY technical trend is bearish — favor put spreads and protective structures." });
  }
  if (context.chain?.putCallRatio != null) {
    insights.push({
      type: "oi",
      text: `Put-Call Ratio at ${context.chain.putCallRatio} (verified NSE OI). ${context.chain.putCallRatio > 1 ? "Put-heavy positioning." : "Call-heavy positioning."}`,
    });
  }
  if (context.vix?.value != null) {
    insights.push({
      type: "vol",
      text: `India VIX at ${context.vix.value.toFixed(2)} (${context.vix.trend || "—"}) — ${context.vix.value > 18 ? "elevated premium environment" : "moderate volatility"}.`,
    });
  }
  if (context.fiiDii?.fii?.netValue != null) {
    insights.push({
      type: "flow",
      text: `FII net ${context.fiiDii.fii.netValue.toLocaleString()} Cr — ${context.fiiDii.fii.netValue > 0 ? "supportive institutional flow" : "foreign selling pressure"}.`,
    });
  }
  if (context.chain?.maxPain != null) {
    insights.push({ type: "maxpain", text: `Max pain at ${context.chain.maxPain} — expiry magnet level from verified OI.` });
  }

  const risks = [];
  if (context.vix?.value > 20) risks.push("Elevated India VIX — wider stops required");
  if (context.resistance && context.price && context.price > context.resistance * 0.98) {
    risks.push(`Nearby resistance at ${context.resistance}`);
  }
  if (context.trend === "NEUTRAL") risks.push("Mixed trend — directionless whipsaw risk");

  return { bullish: insights.filter((i) => i.type === "bullish" || i.type === "oi" || i.type === "flow"), risks };
}

async function buildInstitutionalStrategyDashboard() {
  const marketStatus = resolveMarketStatus();
  const [history, liveChain, breadthData, vix, fiiDii] = await Promise.all([
    fetchNiftyHistory("2y"),
    fetchNiftyOptionChain(3),
    buildNifty500Dashboard().catch(() => null),
    fetchVix(),
    fetchFiiDiiSafe(),
  ]);

  const chainResolution = await resolveNiftyChain(liveChain, marketStatus);
  const chain = chainResolution.chain;

  const candles = history.candles.filter((c) => c.close != null);
  const sessionLevels = sessionLevelsFromCandles(candles);
  const indicators = computeIndicators(candles);
  const latest = indicators.latest;
  const trend = technicalSignal(indicators);
  const prediction = buildNiftyPrediction(candles, { name: history.name });
  const price = prediction.currentPrice ?? chain?.underlying ?? sessionLevels.sessionClose ?? candles.at(-1)?.close;
  const backtest = backtestEnsemble(candles);

  const context = {
    price,
    trend,
    support: latest.support,
    resistance: latest.resistance,
    rsi: latest.rsi,
    adx: latest.adx,
    volumeTrend: latest.volumeTrend,
    chain,
    vix: vix?.value ?? null,
    fiiDii,
    breadth: breadthData?.marketBreadth,
    ...sessionLevels,
  };

  let candidates = generateCandidates(chain, { ...context, vix });
  if (!candidates.length && marketStatus.mode === "pre-market") {
    candidates = generateTechnicalSetups(context, "NIFTY");
  }

  let top10 = candidates.length
    ? (marketStatus.mode === "pre-market" && !chain?.available
      ? rankPreMarketSetups(candidates, context)
      : rankTop10(candidates, { ...context, vix: vix?.value }))
    : [];

  top10 = finalizeStrategies(top10, marketStatus, chainResolution);
  const insights = buildInsights(top10, { ...context, chain, vix, fiiDii, price });

  const activeCount = top10.filter((s) => s.status === "Active" || s.status === "Pre-Market").length;

  const executiveSummary = {
    niftyTrend: trend,
    spotPrice: price,
    vix: vix?.value ?? null,
    putCallRatio: chain?.available ? chain.putCallRatio : null,
    maxPain: chain?.available ? chain.maxPain : null,
    strategiesActive: activeCount,
    chainVerified: chainResolution.verified,
    chainLive: chainResolution.live,
    chainStale: chainResolution.stale,
    ensembleSignal: prediction.ensembleSignal,
    weeklyTarget: prediction.predictions?.weekly?.target,
    monthlyTarget: prediction.predictions?.monthly?.target,
    marketMode: marketStatus.mode,
    lastSessionDate: sessionLevels.sessionDate,
  };

  const dataSource = marketStatus.isLive && chainResolution.live
    ? "NSE option-chain-indices + Yahoo Finance (live)"
    : chainResolution.verified
      ? "Last verified NSE close + Yahoo Finance + ABC quantitative engine"
      : "Yahoo Finance technicals + ABC pre-market engine";

  return {
    available: true,
    title: "NIFTY Strategy Center",
    subtitle: marketStatus.isLive
      ? "Top 10 highest-conviction NIFTY options strategies — live verified data"
      : "Top 10 pre-market NIFTY preparation strategies — latest verified market close",
    refreshedAt: new Date().toISOString(),
    marketStatus,
    marketMode: marketStatus.mode,
    source: dataSource,
    executiveSummary,
    marketContext: {
      niftyTrend: trend,
      spotPrice: price,
      indiaVix: vix,
      putCallRatio: chain?.putCallRatio ?? null,
      maxPain: chain?.maxPain ?? null,
      highestCallOi: chain?.highestCallOi ?? null,
      highestPutOi: chain?.highestPutOi ?? null,
      oiChange: chain?.available
        ? { call: chain.callOiChange, put: chain.putOiChange }
        : null,
      impliedVolatility: chain?.impliedVolatility ?? null,
      support: latest.support,
      resistance: latest.resistance,
      breadth: breadthData?.marketBreadth ?? null,
      fiiDii: fiiDii
        ? { fiiNet: fiiDii.fii?.netValue, diiNet: fiiDii.dii?.netValue, date: fiiDii.date }
        : null,
      technicals: {
        rsi: latest.rsi,
        macdHistogram: latest.macdHistogram,
        sma20: latest.sma20,
        sma50: latest.sma50,
        adx: latest.adx,
        volumeTrend: latest.volumeTrend,
      },
    },
    top10,
    insights,
    backtest: backtest.samples >= 20
      ? {
          available: true,
          winRate: backtest.hitRate,
          samples: backtest.samples,
          period: backtest.period,
          maxDrawdown: backtest.maxDrawdown,
          note: backtest.note,
        }
      : { available: false, note: "Insufficient verified history for backtest" },
    chainStatus: chainResolution.verified
      ? {
          verified: true,
          live: chainResolution.live,
          stale: chainResolution.stale,
          expiry: chain.expiry,
          expiries: chain.expiries?.slice(0, 4),
          fetchedAt: chainResolution.fetchedAt,
          message: chainResolution.message,
          source: chainResolution.source,
        }
      : {
          verified: false,
          live: false,
          stale: false,
          message: chainResolution.message || chain?.reason || "NSE NIFTY option chain unavailable — technical pre-market setups shown",
          source: dataSource,
        },
    chartContext: {
      reflectsLastSession: !marketStatus.isLive,
      sessionDate: sessionLevels.sessionDate,
      note: marketStatus.isLive
        ? "Charts update with live session data"
        : "Charts reflect the latest completed trading session",
    },
    chainHeatmap: buildChainHeatmap(chain),
    chartSymbol: "^NSEI",
    indicators: latest,
    derivativesIntelligence: buildDerivativesIntelligence({
      chain,
      technicals: latest,
      breadth: breadthData?.marketBreadth,
      fiiDii: fiiDii ? { fiiNet: fiiDii.fii?.netValue } : null,
      selectedStrategy: top10[0] ?? null,
      vix,
      volumeTrend: latest.volumeTrend,
    }),
    disclaimer: "Options involve substantial risk. All premiums and OI from verified NSE data when available. Not investment advice.",
  };
}

module.exports = { buildInstitutionalStrategyDashboard };