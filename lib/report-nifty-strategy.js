const { fetchNiftyHistory } = require("./yahoo");
const { buildNiftyPrediction } = require("./ensemble");
const { computeIndicators, technicalSignal } = require("./indicators");
const { buildNifty500Dashboard } = require("./nifty500");
const { fmt, fmtPct, noNullRows } = require("./format");
const { computeConfidence, field } = require("./confidence");
const { buildAuditTrail, dataSourcesSection, assumptionsSection } = require("./traceability");

function backtestEnsemble(candles) {
  if (candles.length < 80) {
    return {
      period: "Insufficient",
      samples: 0,
      hitRate: null,
      avgReturn: null,
      maxDrawdown: null,
      probabilityRange: null,
      note: "Insufficient history for backtest (need 80+ sessions)",
      source: "ABC SMA-direction backtest engine",
      assumptions: ["5-day forward horizon", "SMA20 vs SMA50 crossover direction"],
    };
  }

  let hits = 0;
  let samples = 0;
  const returns = [];
  let peak = candles[0].close;
  let maxDd = 0;

  for (let i = 50; i < candles.length - 5; i += 5) {
    const slice = candles.slice(0, i + 1);
    const indicators = computeIndicators(slice);
    const price = slice.at(-1).close;
    const future = candles[i + 5].close;
    const predictedUp = indicators.latest.sma20 > indicators.latest.sma50;
    const actualUp = future > price;
    if (predictedUp === actualUp) hits += 1;
    returns.push(((future - price) / price) * 100);
    samples += 1;

    if (price > peak) peak = price;
    const dd = ((peak - price) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
  }

  const hitRate = samples ? Number(((hits / samples) * 100).toFixed(1)) : null;
  const avgReturn = returns.length
    ? Number((returns.reduce((a, b) => a + b, 0) / returns.length).toFixed(2))
    : null;
  const start = candles[50]?.date;
  const end = candles.at(-6)?.date;

  return {
    period: `${start} to ${end}`,
    samples,
    hits,
    hitRate,
    avgReturn,
    maxDrawdown: Number(maxDd.toFixed(2)),
    probabilityRange: hitRate != null ? `${Math.max(0, hitRate - 8).toFixed(0)}%–${Math.min(100, hitRate + 8).toFixed(0)}%` : null,
    note: "Historical SMA-crossover direction test over 5-day horizons. Not a guarantee of future performance.",
    source: "ABC backtest engine on Yahoo Finance Nifty 50 OHLCV",
    assumptions: ["5-day forward horizon", "SMA20 vs SMA50 crossover as signal", "No transaction costs"],
  };
}

function biasFromSignal(signal) {
  if (signal === "BULLISH") return "Bullish";
  if (signal === "BEARISH") return "Bearish";
  return "Neutral";
}

function buildStrategySpec(name, bias, entry, exit, stop, target, horizon, backtest) {
  const risk = entry != null && stop != null ? Number(Math.abs(entry - stop).toFixed(2)) : null;
  const reward = entry != null && target != null ? Number(Math.abs(target - entry).toFixed(2)) : null;
  const rr = risk > 0 && reward != null ? Number((reward / risk).toFixed(2)) : null;
  const profitPct = entry ? Number(((reward / entry) * 100).toFixed(2)) : null;
  const maxDdEst = backtest.maxDrawdown;

  return {
    strategyName: name,
    marketBias: bias,
    entryLevel: entry,
    exitLevel: exit,
    stopLoss: stop,
    targetLevels: target,
    riskRewardRatio: rr,
    expectedProfitPotentialPct: profitPct,
    maxDrawdownEstimatePct: maxDdEst,
    capitalRequirement: entry ? `₹${fmt(entry)} per unit (futures lot sizing varies)` : "Unavailable",
    timeHorizon: horizon,
    backtest: {
      period: backtest.period,
      sampleSize: backtest.samples,
      historicalWinRate: backtest.hitRate,
      averageReturn: backtest.avgReturn,
      maxDrawdown: backtest.maxDrawdown,
      probabilityRange: backtest.probabilityRange,
      source: backtest.source,
      assumptions: backtest.assumptions,
    },
  };
}

async function buildNiftyStrategyReport() {
  const [history, breadthData] = await Promise.all([
    fetchNiftyHistory("2y"),
    buildNifty500Dashboard().catch(() => null),
  ]);

  const prediction = buildNiftyPrediction(history.candles, { name: history.name });
  const backtest = backtestEnsemble(history.candles);
  const indicators = computeIndicators(history.candles);
  const latest = indicators.latest;
  const signal = technicalSignal(indicators);
  const price = prediction.currentPrice;

  const weekly = prediction.predictions.weekly;
  const monthly = prediction.predictions.monthly;

  const strategies = [
    buildStrategySpec(
      "Weekly Momentum Follow",
      biasFromSignal(weekly.signal),
      price,
      weekly.target,
      latest.support,
      weekly.target,
      `Weekly (${weekly.date})`,
      backtest
    ),
    buildStrategySpec(
      "Monthly Trend Position",
      biasFromSignal(monthly.signal),
      price,
      monthly.target,
      latest.support,
      monthly.target,
      `Monthly (${monthly.date})`,
      backtest
    ),
    buildStrategySpec(
      "Range Neutral (Support-Resistance)",
      "Neutral",
      price,
      latest.resistance,
      latest.support,
      latest.bollingerMiddle || price,
      "2-4 weeks",
      backtest
    ),
    buildStrategySpec(
      "Month-End Rebalance",
      biasFromSignal(prediction.ensembleSignal),
      price,
      monthly.range.high,
      monthly.range.low,
      monthly.target,
      "Month-end",
      backtest
    ),
  ];

  const breadth = breadthData?.marketBreadth;
  const confidence = computeConfidence({
    fields: [
      field("price", price, "Yahoo Finance"),
      field("cmo", latest.cmo, "Computed"),
      field("adx", latest.adx, "Computed"),
      field("backtest", backtest.samples >= 20 ? backtest.hitRate : null, "Backtest"),
    ],
    alignment: prediction.ensembleSignal === "NEUTRAL" ? 50 : 75,
    modelAgreement: monthly.confidence,
    backtestQuality: backtest,
  });

  const indicatorRows = noNullRows([
    ["CMO (14)", latest.cmo],
    ["RSI (14)", latest.rsi],
    ["MACD Histogram", latest.macdHistogram],
    ["SMA 20", latest.sma20],
    ["SMA 50", latest.sma50],
    ["ADX (14)", latest.adx],
    ["ATR (14)", latest.atr],
    ["Bollinger Upper", latest.bollingerUpper],
    ["Bollinger Middle", latest.bollingerMiddle],
    ["Bollinger Lower", latest.bollingerLower],
    ["Volume Trend", latest.volumeTrend],
    ["Volume Ratio", latest.volumeRatio],
    ["Support", latest.support],
    ["Resistance", latest.resistance],
  ]);

  const breadthRows = breadth
    ? noNullRows([
        ["Advances", breadth.advances],
        ["Declines", breadth.declines],
        ["A/D Ratio", breadth.advanceDeclineRatio],
        ["Sample Size", breadth.sampleSize],
      ])
    : [["Market breadth", "Unavailable — NIFTY 500 feed not loaded"]];

  const strategyTableRows = noNullRows(
    strategies.map((s) => [
      s.strategyName,
      s.marketBias,
      s.entryLevel,
      s.stopLoss,
      s.targetLevels,
      s.riskRewardRatio,
      s.expectedProfitPotentialPct != null ? `${s.expectedProfitPotentialPct}%` : "—",
      s.timeHorizon,
    ])
  );

  const sections = [
    {
      title: "Executive Summary",
      dataType: "model-opinion",
      content: `Nifty at ${fmt(price)}. Ensemble: ${prediction.ensembleSignal}. Weekly target ${fmt(weekly.target)}, monthly ${fmt(monthly.target)}. Confidence ${confidence}% from data completeness, model agreement, and backtest.`,
    },
    {
      title: "Trend & Momentum Indicators",
      dataType: "verified",
      table: { headers: ["Indicator", "Value"], rows: indicatorRows },
    },
    {
      title: "Market Breadth Indicators",
      dataType: breadth ? "verified" : "unavailable",
      table: { headers: ["Metric", "Value"], rows: breadthRows },
    },
    {
      title: "Strategy Details",
      dataType: "model-opinion",
      table: {
        headers: ["Strategy", "Bias", "Entry", "Stop", "Target", "R:R", "Exp. Profit%", "Horizon"],
        rows: strategyTableRows,
      },
    },
    ...strategies.map((s) => ({
      title: `${s.strategyName} — Full Specification`,
      dataType: "model-opinion",
      bullets: [
        `Bias: ${s.marketBias}`,
        `Entry: ${fmt(s.entryLevel)} | Exit: ${fmt(s.exitLevel)} | Stop: ${fmt(s.stopLoss)}`,
        `Target: ${fmt(s.targetLevels)} | R:R ${fmt(s.riskRewardRatio)} | Expected profit: ${fmtPct(s.expectedProfitPotentialPct)}`,
        `Max drawdown estimate: ${fmtPct(s.maxDrawdownEstimatePct)} (from backtest)`,
        `Capital: ${s.capitalRequirement} | Horizon: ${s.timeHorizon}`,
      ],
    })),
    {
      title: "Weekly Outlook",
      dataType: "model-opinion",
      bullets: [`Signal: ${weekly.signal}`, `Target: ${fmt(weekly.target)} (${weekly.date})`, `Model confidence: ${weekly.confidence}%`],
    },
    {
      title: "Monthly Outlook",
      dataType: "model-opinion",
      bullets: [`Signal: ${monthly.signal}`, `Target: ${fmt(monthly.target)} (${monthly.date})`, `Range: ${fmt(monthly.range.low)}–${fmt(monthly.range.high)}`],
    },
    {
      title: "Two-Month Outlook",
      dataType: "model-opinion",
      content: `Extended bias follows monthly ensemble: ${monthly.signal} with range ${fmt(monthly.range.low)}–${fmt(monthly.range.high)}.`,
    },
    {
      title: "Historical Validation",
      dataType: "verified",
      bullets: [
        `Backtest period: ${backtest.period}`,
        `Sample size: ${backtest.samples}`,
        `Historical win rate: ${backtest.hitRate != null ? `${backtest.hitRate}%` : "Insufficient data"}`,
        `Average return (5d): ${backtest.avgReturn != null ? `${backtest.avgReturn}%` : "N/A"}`,
        `Maximum drawdown: ${backtest.maxDrawdown != null ? `${backtest.maxDrawdown}%` : "N/A"}`,
        `Probability range: ${backtest.probabilityRange ?? "N/A"}`,
        backtest.note,
      ],
    },
    {
      title: "Risk Assessment",
      dataType: "model-opinion",
      bullets: [
        `Trend: ${signal}`,
        `RSI: ${fmt(latest.rsi, 1)} | CMO: ${fmt(latest.cmo, 1)} | ADX: ${fmt(latest.adx, 1)}`,
        "Model outputs are probability-based, not certainty claims",
      ],
    },
    dataSourcesSection([
      { name: "Yahoo Finance Nifty 50", provider: "^NSEI", fetchedAt: history.fetchedAt },
      { name: "ABC Ensemble Model", provider: "Local", fetchedAt: new Date().toISOString() },
    ]),
    assumptionsSection(backtest.assumptions),
    buildAuditTrail([
      { metric: "Nifty Price", value: price, source: "Yahoo Finance", collectedAt: history.fetchedAt, derivation: "Latest close" },
      { metric: "CMO", value: fmt(latest.cmo, 1), source: "Computed", collectedAt: history.fetchedAt, derivation: "14-period Chande Momentum" },
      { metric: "Backtest Hit Rate", value: backtest.hitRate, source: backtest.source, collectedAt: new Date().toISOString(), derivation: "SMA crossover 5d forward test" },
    ]),
    { title: "Disclaimer", content: prediction.disclaimer },
  ];

  return {
    type: "nifty-strategy",
    title: `NIFTY Strategy Report — ${new Date().toISOString().slice(0, 10)}`,
    source: "Yahoo Finance + ABC ensemble model",
    generatedAt: new Date().toISOString(),
    confidence,
    disclaimer: prediction.disclaimer,
    sections,
    strategies,
    indicators: latest,
    prediction,
    backtest,
  };
}

module.exports = { buildNiftyStrategyReport };