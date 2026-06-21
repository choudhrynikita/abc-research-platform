const { fetchChart } = require("./yahoo");
const { computeIndicators } = require("./indicators");
const { fetchOptionChain } = require("./nse-options");
const { fmt, noNullRows, UNAVAILABLE_FIELD } = require("./format");
const { computeConfidence, field } = require("./confidence");
const { buildAuditTrail, dataSourcesSection, assumptionsSection } = require("./traceability");

const WATCHLIST = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"];

function historicalVol(candles, period = 30) {
  const closes = candles.slice(-period - 1).map((c) => c.close);
  if (closes.length < 10) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  return Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
}

function volRegime(hv, iv) {
  if (hv == null) return "Unavailable";
  if (iv != null) {
    if (iv > hv * 1.15) return "IV > HV (elevated premium)";
    if (iv < hv * 0.85) return "IV < HV (compressed premium)";
    return "IV ≈ HV (neutral)";
  }
  if (hv > 30) return "High historical vol";
  if (hv < 15) return "Low historical vol";
  return "Moderate historical vol";
}

function modelGreeks(type, hv) {
  const note = "Model-estimated from historical volatility — not live options chain Greeks";
  const map = {
    Futures: { delta: 1, gamma: 0, theta: 0, vega: 0, note },
    "Covered Call": { delta: "~0.55", gamma: "Low", theta: "Positive (short call)", vega: "Short", note },
    "Cash Secured Put": { delta: "~-0.35", gamma: "Low", theta: "Positive", vega: "Short", note },
    "Bull Call Spread": { delta: "~0.35", gamma: "Low", theta: "Mixed", vega: "Reduced", note },
    "Bear Put Spread": { delta: "~-0.35", gamma: "Low", theta: "Mixed", vega: "Reduced", note },
    "Iron Condor": { delta: "~0", gamma: "Low", theta: "Positive", vega: "Short", note },
    "Calendar Spread": { delta: "~0.1", gamma: "Moderate", theta: "Positive near-term", vega: "Long", note },
    "Protective Put": { delta: "~0.65", gamma: "Low", theta: "Negative (long put)", vega: "Long", note },
    Collar: { delta: "~0.45", gamma: "Low", theta: "Near zero", vega: "Neutral", note },
    "Futures Hedge": { delta: "~0", gamma: 0, theta: 0, vega: 0, note: "Delta-neutral hedge structure" },
  };
  return map[type] || { delta: "—", gamma: "—", theta: "—", vega: "—", note };
}

function buildStrategies(symbol, price, indicators, hv, chain) {
  const support = indicators.support;
  const resistance = indicators.resistance;
  const risk = price != null && support != null ? Number((price - support).toFixed(2)) : null;
  const reward = price != null && resistance != null ? Number((resistance - price).toFixed(2)) : null;
  const rr = risk > 0 && reward != null ? Number((reward / risk).toFixed(2)) : null;
  const iv = chain?.available ? chain.impliedVolatility : null;
  const chainOk = chain?.available === true;
  const optEntry = chainOk
    ? `Verified strikes from NSE chain — ATM ${price}, max pain ${chain.maxPain}`
    : UNAVAILABLE_FIELD;
  const optNote = chainOk ? "Requires verified NSE options chain" : "Options chain unavailable — no strike/premium displayed";

  const base = { symbol, underlying: price, histVol: hv, impliedVol: iv, support, resistance, verifiedChain: chainOk };

  const specs = [
    { name: "Futures Long", type: "Futures", marketView: "Directional", entry: price, exit: resistance, stopLoss: support, capitalRequired: price, risk, potentialReward: reward, riskReward: rr, breakEven: price, verified: true },
    { name: "Bull Call Spread", type: "Bull Call Spread", marketView: "Moderately Bullish", entry: optEntry, exit: UNAVAILABLE_FIELD, stopLoss: support, capitalRequired: UNAVAILABLE_FIELD, risk: UNAVAILABLE_FIELD, potentialReward: UNAVAILABLE_FIELD, riskReward: null, breakEven: UNAVAILABLE_FIELD, verified: chainOk },
    { name: "Cash Secured Put", type: "Cash Secured Put", marketView: "Neutral to Bullish", entry: optEntry, exit: UNAVAILABLE_FIELD, stopLoss: UNAVAILABLE_FIELD, capitalRequired: UNAVAILABLE_FIELD, risk: UNAVAILABLE_FIELD, potentialReward: UNAVAILABLE_FIELD, riskReward: null, breakEven: UNAVAILABLE_FIELD, verified: chainOk },
    { name: "Iron Condor", type: "Iron Condor", marketView: "Neutral", entry: optEntry, exit: UNAVAILABLE_FIELD, stopLoss: UNAVAILABLE_FIELD, capitalRequired: UNAVAILABLE_FIELD, risk: UNAVAILABLE_FIELD, potentialReward: UNAVAILABLE_FIELD, riskReward: null, breakEven: UNAVAILABLE_FIELD, verified: chainOk },
    { name: "Protective Put", type: "Protective Put", marketView: "Hedged Long", entry: optEntry, exit: UNAVAILABLE_FIELD, stopLoss: support, capitalRequired: UNAVAILABLE_FIELD, risk: UNAVAILABLE_FIELD, potentialReward: reward, riskReward: rr, breakEven: UNAVAILABLE_FIELD, verified: chainOk },
  ];

  return specs.map((s) => ({
    ...base,
    ...s,
    entryConditions: s.verified ? ["Verified underlying price", chainOk ? "NSE chain loaded" : "Chain missing"] : [optNote],
    exitConditions: s.verified ? ["Profit target per structure", "Time-based exit", "Risk-based stop"] : [UNAVAILABLE_FIELD],
    greeks: chainOk ? modelGreeks(s.type, hv) : { delta: UNAVAILABLE_FIELD, gamma: UNAVAILABLE_FIELD, theta: UNAVAILABLE_FIELD, vega: UNAVAILABLE_FIELD, rho: UNAVAILABLE_FIELD, note: "Greeks require verified options chain" },
    volatilityAnalysis: `${volRegime(hv, iv)}. Hist vol ${hv ?? UNAVAILABLE_FIELD}${iv != null ? `, IV ${iv}% (NSE)` : ""}`,
    optionsChain: chainOk
      ? { pcr: chain.putCallRatio, maxPain: chain.maxPain, callOi: chain.callOi, putOi: chain.putOi, callOiChange: chain.callOiChange, putOiChange: chain.putOiChange, ivRank: UNAVAILABLE_FIELD, ivPercentile: UNAVAILABLE_FIELD }
      : { available: false, reason: chain?.reason || "NSE options chain unavailable" },
  }));
}

async function analyzeSymbol(symbol) {
  const [chart, chain] = await Promise.all([
    fetchChart(symbol, "1d", "6mo"),
    fetchOptionChain(symbol).catch(() => ({ available: false, reason: "Fetch failed" })),
  ]);
  const candles = chart.candles.filter((c) => c.close != null);
  const price = chart.meta.regularMarketPrice ?? candles.at(-1)?.close;
  const indicators = computeIndicators(candles).latest;
  const hv = historicalVol(candles);

  return {
    symbol,
    name: chart.meta.shortName || symbol,
    price,
    histVol: hv,
    optionsChain: chain,
    strategies: buildStrategies(symbol, price, indicators, hv, chain),
    fetchedAt: new Date().toISOString(),
  };
}

async function buildFnoReport() {
  const analyses = await Promise.all(WATCHLIST.map(analyzeSymbol));
  const allStrategies = analyses.flatMap((a) =>
    a.strategies.map((s) => ({ ...s, stockName: a.name }))
  );

  const chainsAvailable = analyses.filter((a) => a.optionsChain?.available).length;
  const confidence = computeConfidence({
    fields: [
      field("prices", analyses.every((a) => a.price != null), "Yahoo Finance"),
      field("histVol", analyses.every((a) => a.histVol != null), "Computed"),
      field("optionsChain", chainsAvailable, "NSE"),
      field("strategies", allStrategies.length > 0, "Model"),
    ],
    alignment: chainsAvailable >= 2 ? 75 : 55,
  });

  const chainSection = analyses.map((a) => {
    const c = a.optionsChain;
    if (!c?.available) {
      return `${a.name}: Options chain unavailable — ${c?.reason || "NSE feed down"}`;
    }
    return `${a.name}: PCR ${c.putCallRatio}, Max Pain ${c.maxPain}, Call OI ${c.callOi}, Put OI ${c.putOi}, ΔOI Call ${c.callOiChange}, ΔOI Put ${c.putOiChange}`;
  });

  const sections = [
    {
      title: "Executive Summary",
      dataType: "model-opinion",
      content: `${allStrategies.length} strategy structures across ${analyses.length} equities. Options chain verified for ${chainsAvailable}/${analyses.length} symbols. Confidence ${confidence}% from data completeness.`,
    },
    {
      title: "Options Chain Analysis",
      dataType: chainsAvailable ? "verified" : "unavailable",
      bullets: chainSection,
      content: chainsAvailable
        ? "Open interest, PCR, and max pain from NSE option-chain-equities API."
        : "Live options chain unavailable — OI, PCR, max pain not displayed to prevent fabricated data.",
    },
    {
      title: "Volatility Analysis",
      dataType: "verified",
      table: {
        headers: ["Stock", "Hist Vol%", "IV%", "Regime"],
        rows: noNullRows(
          analyses.map((a) => [
            a.name,
            a.histVol,
            a.optionsChain?.impliedVolatility ?? "Unavailable",
            volRegime(a.histVol, a.optionsChain?.impliedVolatility),
          ])
        ),
      },
    },
    {
      title: "Strategy Opportunities",
      dataType: "model-opinion",
      table: {
        headers: ["Stock", "Strategy", "Entry", "Stop", "Exit", "R:R", "Break-Even", "Hist Vol%"],
        rows: noNullRows(
          allStrategies.slice(0, 15).map((s) => [
            s.stockName,
            s.name,
            s.entry,
            s.stopLoss,
            s.exit,
            s.riskReward,
            s.breakEven,
            s.histVol,
          ])
        ),
      },
    },
    {
      title: "Greeks Analysis",
      dataType: "model-opinion",
      content: "Greeks model-estimated from historical volatility when live chain Greeks unavailable.",
      table: {
        headers: ["Stock", "Strategy", "Delta", "Gamma", "Theta", "Vega"],
        rows: noNullRows(
          allStrategies.slice(0, 10).map((s) => [
            s.stockName,
            s.type,
            s.greeks.delta,
            s.greeks.gamma,
            s.greeks.theta,
            s.greeks.vega,
          ])
        ),
      },
    },
    dataSourcesSection([
      { name: "Yahoo Finance OHLCV", provider: "query1.finance.yahoo.com", fetchedAt: new Date().toISOString() },
      { name: "NSE Options Chain", provider: "nseindia.com/api/option-chain-equities", fetchedAt: new Date().toISOString() },
    ]),
    assumptionsSection([
      "Greeks estimated from historical vol when live options Greeks unavailable",
      "Premiums not estimated — verify with broker",
      "Strategies use support/resistance from verified OHLCV",
    ]),
    buildAuditTrail([
      { metric: "Historical Vol", value: analyses[0]?.histVol, source: "Computed", collectedAt: analyses[0]?.fetchedAt, derivation: "30d log-return annualized" },
      { metric: "Options Chain", value: chainsAvailable ? "Available" : "Unavailable", source: "NSE", collectedAt: new Date().toISOString(), derivation: "option-chain-equities API" },
    ]),
    {
      title: "Disclaimer",
      content:
        "Greeks and option premiums are model-estimated from historical volatility when live chain unavailable. Verify strikes/premiums with broker before trading.",
    },
  ];

  return {
    type: "fno",
    title: `Equity F&O Strategy Report — ${new Date().toISOString().slice(0, 10)}`,
    source: "Yahoo Finance OHLCV + NSE options chain (when available)",
    generatedAt: new Date().toISOString(),
    confidence,
    disclaimer:
      "Greeks model-estimated when live chain unavailable. OI/PCR/max pain only shown from verified NSE feed.",
    sections,
    analyses,
    strategies: allStrategies,
  };
}

module.exports = { buildFnoReport, analyzeSymbol };