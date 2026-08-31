const { fetchNiftyHistory } = require("./yahoo");
const { fetchNiftyHorizonChains, pickMonthlyExpiry } = require("./nse-options");
const { computeIndicators, technicalSignal } = require("./indicators");
const { buildNiftyPrediction } = require("./ensemble");

const { fetchFiiDii } = require("./nse");
const { generateCandidates, rankTop10, applyHorizon } = require("./nifty-strategy-engine");
const { backtestEnsemble } = require("./report-nifty-strategy");
const { resolveMarketStatus } = require("./market-hours");
const { resolveNiftyChain, resolveNiftyHorizonPack } = require("./option-chain-cache");
const {
  finalizeStrategies,
  generateTechnicalSetups,
  rankPreMarketSetups,
  supplementCandidates,
  assignSequentialRanks,
  sessionLevelsFromCandles,
  roundLevel,
} = require("./pre-market-strategy");
const { buildDerivativesIntelligence } = require("./derivatives-intelligence");
const { resolveIvMetrics } = require("./iv-metrics");
const { normalizeBreadth } = require("./breadth");
const { prepareDashboardStrategies } = require("./strategy-payload");
const { applyStrategyEligibility, isExpiredExpiry, parseExpiry } = require("./strategy-eligibility");
const { attachPositioning } = require("./strategy-positioning");

const HORIZON_KEYS = [
  { key: "sevenDay", id: "7-day", label: "7-day" },
  { key: "fifteenDay", id: "15-day", label: "15-day" },
  { key: "monthly", id: "monthly", label: "Monthly" },
];
const PER_HORIZON_LIMIT = 5;

function alignExpiryType(strategy, monthlyExpiry) {
  const strategyExpiry = parseExpiry(strategy?.expiry);
  const monthly = parseExpiry(monthlyExpiry);
  if (strategyExpiry && monthly && strategyExpiry.getTime() === monthly.getTime()) {
    return {
      ...strategy,
      expiryType: strategy.horizon === "monthly" ? "Monthly" : strategy.expiryType,
      holdingPeriod: strategy.horizon === "monthly" ? "Monthly expiry" : strategy.holdingPeriod,
      dossier: strategy.dossier
        ? { ...strategy.dossier, holdingPeriod: strategy.horizon === "monthly" ? "Monthly expiry" : strategy.dossier.holdingPeriod }
        : strategy.dossier,
    };
  }
  return strategy;
}

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

function finishStrategies(list, marketStatus, chainResolution, monthlyExpiry, technical, chain) {
  return prepareDashboardStrategies(
    assignSequentialRanks(finalizeStrategies(list, marketStatus, chainResolution))
      .map((strategy) => alignExpiryType(strategy, monthlyExpiry))
      .map((strategy) => applyStrategyEligibility(strategy, {
        marketStatus,
        technical,
        assetClass: "index",
      }))
      .map((strategy) => attachPositioning(strategy, chain))
  );
}

function buildHorizonStrategies(pack, context, marketStatus, chainResolution, monthlyExpiry, technical) {
  const chain = pack?.chain;
  const horizon = {
    id: pack?.id,
    label: pack?.label,
    expiry: pack?.expiry || chain?.expiry,
    expiryType: pack?.expiryType,
    daysAway: pack?.daysAway,
    holdingPeriod: pack?.holdingPeriod,
  };
  const ctx = {
    ...context,
    chain,
    lotSize: chain?.lotSize ?? context.lotSize ?? null,
    monthlyChain: null,
    monthlyExpiry: pack?.id === "monthly" ? pack.expiry : null,
  };

  let candidates = [];
  if (chain?.available) {
    candidates = generateCandidates(chain, ctx, { includeMonthly: false });
  }
  candidates = candidates.filter((strategy) => !isExpiredExpiry(strategy.expiry || horizon.expiry, marketStatus.sessionDate));

  if (!candidates.length && !marketStatus.isLive) {
    candidates = generateTechnicalSetups({ ...ctx, monthlyExpiry: horizon.expiry, horizonExpiry: horizon.expiry }, "NIFTY")
      .filter((strategy) => !isExpiredExpiry(strategy.expiry || horizon.expiry, marketStatus.sessionDate));
  } else if (candidates.length < PER_HORIZON_LIMIT) {
    candidates = supplementCandidates(
      candidates,
      { ...ctx, monthlyExpiry: horizon.expiry, horizonExpiry: horizon.expiry },
      "NIFTY",
      PER_HORIZON_LIMIT
    ).filter((strategy) => !isExpiredExpiry(strategy.expiry || horizon.expiry, marketStatus.sessionDate));
  }

  candidates = applyHorizon(candidates, horizon);

  let ranked = candidates.length
    ? (!marketStatus.isLive && !chain?.available
      ? rankPreMarketSetups(candidates, ctx, PER_HORIZON_LIMIT)
      : rankTop10(candidates, { ...ctx, vix: context.vix }, PER_HORIZON_LIMIT))
    : [];
  ranked = ranked.filter((strategy) => !isExpiredExpiry(strategy.expiry, marketStatus.sessionDate));

  const strategies = finishStrategies(
    ranked,
    marketStatus,
    {
      ...chainResolution,
      verified: pack?.verified ?? chainResolution.verified,
      live: pack?.live ?? chainResolution.live,
      stale: pack?.stale ?? chainResolution.stale,
      source: pack?.source || chainResolution.source,
      fetchedAt: pack?.fetchedAt || chainResolution.fetchedAt,
      message: pack?.message || chainResolution.message,
    },
    monthlyExpiry,
    technical,
    chain
  );

  return {
    id: horizon.id,
    label: horizon.label,
    expiry: horizon.expiry || null,
    expiryType: horizon.expiryType || null,
    daysAway: horizon.daysAway ?? null,
    holdingPeriod: horizon.holdingPeriod || null,
    verified: pack?.verified === true,
    live: pack?.live === true,
    stale: pack?.stale === true,
    message: pack?.message || (chain?.available ? null : chain?.reason) || null,
    strategies,
  };
}

async function buildInstitutionalStrategyDashboard() {
  const marketStatus = resolveMarketStatus();
  const [history, horizonLive, vix, fiiDii] = await Promise.all([
    fetchNiftyHistory("6mo").catch(() => ({ candles: [], name: "NIFTY 50", currentPrice: null })),
    fetchNiftyHorizonChains(2).catch(() => ({
      sevenDay: { id: "7-day", label: "7-day", chain: { available: false, reason: "NSE NIFTY chain fetch failed" } },
      fifteenDay: { id: "15-day", label: "15-day", chain: { available: false, reason: "NSE NIFTY chain fetch failed" } },
      monthly: { id: "monthly", label: "Monthly", chain: { available: false, reason: "NSE NIFTY chain fetch failed" } },
      expiries: [],
    })),
    fetchVix(),
    fetchFiiDiiSafe(),
  ]);
  const breadthData = null;

  const horizonPack = await resolveNiftyHorizonPack(horizonLive, marketStatus);
  const liveSeven = horizonPack.sevenDay?.chain;
  const chainResolution = await resolveNiftyChain(liveSeven, marketStatus);
  const chain = liveSeven?.available ? liveSeven : chainResolution.chain;
  const monthlyExpiry =
    horizonPack.monthly?.expiry || pickMonthlyExpiry(horizonLive.expiries || chain?.expiries);
  const monthlyChain = horizonPack.monthly?.chain?.available ? horizonPack.monthly.chain : null;

  const candles = (history?.candles || []).filter((c) => c.close != null);
  if (candles.length < 30 && !chainResolution?.chain?.available) {
    // still continue — generateTechnicalSetups needs some candles; empty → empty top10
  }
  const sessionLevels = sessionLevelsFromCandles(candles);
  const indicators = candles.length ? computeIndicators(candles) : { latest: {} };
  const latest = indicators.latest || {};
  const trend = technicalSignal(indicators);
  const prediction = buildNiftyPrediction(candles, { name: history.name });
  const price = roundLevel(
    prediction.currentPrice ?? chain?.underlying ?? sessionLevels.sessionClose ?? candles.at(-1)?.close
  );
  const backtest = backtestEnsemble(candles);

  const context = {
    price,
    trend,
    support: roundLevel(latest.support),
    resistance: roundLevel(latest.resistance),
    rsi: latest.rsi,
    adx: latest.adx,
    sma20: latest.sma20,
    sma50: latest.sma50,
    macdHistogram: latest.macdHistogram,
    volumeTrend: latest.volumeTrend,
    chain,
    monthlyChain,
    monthlyExpiry,
    lotSize: chain?.lotSize ?? monthlyChain?.lotSize ?? null,
    prediction,
    vix: vix?.value ?? null,
    fiiDii,
    breadth: normalizeBreadth(breadthData?.marketBreadth),
    // Verified NIFTY OHLCV for underlying directional proxy backtests (not option premiums)
    candles,
    ...sessionLevels,
  };

  const technical = { trend, rsi: latest.rsi, adx: latest.adx, support: latest.support, resistance: latest.resistance };
  const horizons = {};
  for (const { key } of HORIZON_KEYS) {
    horizons[key] = buildHorizonStrategies(
      horizonPack[key],
      { ...context, vix: vix?.value ?? null },
      marketStatus,
      chainResolution,
      monthlyExpiry,
      technical
    );
  }

  const mixed = HORIZON_KEYS.flatMap(({ key }) => horizons[key].strategies || []);
  const top10 = assignSequentialRanks(
    [...mixed].sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0)).slice(0, 12)
  );
  const insights = buildInsights(top10, { ...context, chain, vix, fiiDii, price });

  const horizonCount = HORIZON_KEYS.reduce((n, { key }) => n + (horizons[key].strategies?.length || 0), 0);
  const activeCount = top10.filter((s) => s.eligibility?.decision === "LIVE" || s.eligibility?.decision === "PLAN").length;

  const executiveSummary = {
    niftyTrend: trend,
    spotPrice: price,
    vix: vix?.value ?? null,
    putCallRatio: chain?.available ? chain.putCallRatio : null,
    maxPain: chain?.available ? chain.maxPain : null,
    strategiesTotal: horizonCount,
    strategiesActive: activeCount,
    chainVerified: chainResolution.verified,
    chainLive: chainResolution.live,
    chainStale: chainResolution.stale,
    ensembleSignal: prediction.ensembleSignal,
    weeklyTarget: prediction.predictions?.weekly?.target,
    monthlyTarget: prediction.predictions?.monthly?.target,
    marketMode: marketStatus.mode,
    lastSessionDate: sessionLevels.sessionDate,
    horizons: {
      sevenDay: { expiry: horizons.sevenDay.expiry, daysAway: horizons.sevenDay.daysAway, count: horizons.sevenDay.strategies.length },
      fifteenDay: { expiry: horizons.fifteenDay.expiry, daysAway: horizons.fifteenDay.daysAway, count: horizons.fifteenDay.strategies.length },
      monthly: { expiry: horizons.monthly.expiry, daysAway: horizons.monthly.daysAway, count: horizons.monthly.strategies.length },
    },
  };

  const dataSource = marketStatus.isLive && chainResolution.live
    ? "NSE option-chain-indices + Yahoo Finance (live)"
    : chainResolution.verified
      ? "Last verified NSE close + Yahoo Finance + ABC quantitative engine"
      : "Yahoo Finance technicals + ABC planning engine";

  const ivMetrics = chain?.available
    ? await resolveIvMetrics("NIFTY", chain, { sessionDate: marketStatus.sessionDate })
    : null;

  return {
    available: true,
    title: "NIFTY Strategy Center",
    subtitle: marketStatus.isLive
      ? "7-day, 15-day and monthly NIFTY options plans — live verified data"
      : `7-day, 15-day and monthly NIFTY plans for ${marketStatus.planningDateLabel || "the next trading session"} — last verified close`,
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
      support: roundLevel(latest.support),
      resistance: roundLevel(latest.resistance),
      sessionHigh: sessionLevels.sessionHigh,
      sessionLow: sessionLevels.sessionLow,
      sessionClose: sessionLevels.sessionClose,
      lastSessionDate: sessionLevels.sessionDate,
      breadth: normalizeBreadth(breadthData?.marketBreadth) ?? null,
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
    horizons,
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
          sevenDayExpiry: horizons.sevenDay.expiry,
          fifteenDayExpiry: horizons.fifteenDay.expiry,
          monthlyExpiry: monthlyExpiry ?? horizons.monthly.expiry ?? null,
          monthlyChainVerified: monthlyChain?.available === true,
          fifteenDayVerified: horizonPack.fifteenDay?.verified === true,
          expiries: (horizonLive.expiries || chain.expiries || []).slice(0, 6),
          fetchedAt: chainResolution.fetchedAt,
          message: chainResolution.message,
          source: chainResolution.source,
        }
      : {
          verified: false,
          live: false,
          stale: false,
          message: chainResolution.message || chain?.reason || "NSE NIFTY option chain unavailable — technical planning setups shown",
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
      ivMetrics,
    }),
    disclaimer: "Options involve substantial risk. All premiums and OI from verified NSE data when available. Not investment advice.",
  };
}

module.exports = { buildInstitutionalStrategyDashboard };
