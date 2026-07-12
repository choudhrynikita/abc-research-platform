/**
 * Institutional strategy dossier builder.
 *
 * Policy:
 * - Confidence is derived from verified inputs only (completeness + signal agreement).
 * - Backtests use only verified OHLCV and documented rules — never invent win rates.
 * - Missing data → explicit unavailable messages, never estimates.
 */

const DATA_UNAVAILABLE = "Data Unavailable";

function isFiniteNum(n) {
  return n != null && typeof n === "number" && Number.isFinite(n);
}

function clamp(n, lo = 0, hi = 100) {
  if (!isFiniteNum(n)) return null;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/**
 * @param {Array<{ name: string, available: boolean, weight?: number, value?: any }>} fields
 * @param {Array<{ name: string, aligned: boolean|null }>} agreements - null = not evaluable
 * @param {object|null} backtestQuality - { samples, winRate } only when real trades exist
 */
function buildConfidenceScore({ fields = [], agreements = [], backtestQuality = null } = {}) {
  const total = fields.length || 1;
  const available = fields.filter((f) => f.available).length;
  const completeness = (available / total) * 100;

  const evaluable = agreements.filter((a) => a.aligned === true || a.aligned === false);
  const aligned = evaluable.filter((a) => a.aligned === true).length;
  const agreementPct = evaluable.length ? (aligned / evaluable.length) * 100 : null;

  // Weights: completeness 55%, agreement 35%, backtest quality 10% (only if samples ≥ 20)
  let score = completeness * 0.55;
  const parts = [
    {
      component: "Data completeness",
      weight: 0.55,
      value: Number(completeness.toFixed(1)),
      detail: `${available}/${total} verified input fields present`,
    },
  ];

  if (agreementPct != null) {
    score += agreementPct * 0.35;
    parts.push({
      component: "Signal agreement",
      weight: 0.35,
      value: Number(agreementPct.toFixed(1)),
      detail: `${aligned}/${evaluable.length} evaluable factors aligned with thesis`,
    });
  } else {
    score += completeness * 0.175; // half of agreement weight back to completeness
    parts.push({
      component: "Signal agreement",
      weight: 0.35,
      value: null,
      detail: "Insufficient multi-factor signals to score agreement",
    });
  }

  let backtestContribution = null;
  if (backtestQuality?.available && (backtestQuality.samples ?? 0) >= 20) {
    const wr = isFiniteNum(backtestQuality.winRate) ? backtestQuality.winRate : null;
    if (wr != null) {
      score += wr * 0.1;
      backtestContribution = wr;
      parts.push({
        component: "Historical rule performance",
        weight: 0.1,
        value: Number(wr.toFixed(1)),
        detail: `${backtestQuality.samples} closed rule-based trades on verified OHLCV (not a guarantee)`,
      });
    }
  } else {
    parts.push({
      component: "Historical rule performance",
      weight: 0.1,
      value: null,
      detail:
        backtestQuality?.reason ||
        "Backtest not applied — insufficient history or rules not evaluable",
    });
  }

  const final = clamp(score);
  return {
    score: final,
    methodology:
      "Composite of verified data completeness (55%), multi-factor signal agreement (35%), and optional rule-based historical hit rate when ≥20 trades (10%). Not a probability of future success.",
    components: parts,
    fieldsPresent: available,
    fieldsTotal: total,
    agreementPct,
    backtestContribution,
    disclaimer:
      "Confidence is an analytical construct from verified inputs — never a guaranteed win rate or expected return.",
  };
}

/**
 * Transparent SMA trend backtest on verified daily OHLCV.
 * Rules (documented):
 *  - Long when close > SMA20 and SMA20 > SMA50 and RSI(14) between 45–70
 *  - Exit when close < SMA20 or RSI > 75 or after maxHold bars
 *  - Stop: entry − 1.5×ATR(14) when ATR available
 *  - Never invents trades if history too short
 */
function backtestSmaTrend(candles, { maxHold = 20, minTradesForStats = 5 } = {}) {
  if (!Array.isArray(candles) || candles.length < 80) {
    return {
      available: false,
      reason: "Awaiting Latest Verified Data — need ≥80 daily bars of verified OHLCV for rule backtest",
      samples: 0,
      trades: [],
      assumptions: [
        "Long-only SMA20/SMA50 + RSI filter",
        "Requires 80+ verified closes",
      ],
    };
  }

  const closes = candles.map((c) => c.close).filter((c) => c != null && Number.isFinite(c));
  if (closes.length < 80) {
    return {
      available: false,
      reason: "Verified close series incomplete for backtest",
      samples: 0,
      trades: [],
    };
  }

  // Precompute simple series
  function smaAt(arr, i, period) {
    if (i < period - 1) return null;
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += arr[j];
    return s / period;
  }

  function atrAt(i, period = 14) {
    if (i < period) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const h = candles[j].high;
      const l = candles[j].low;
      const pc = candles[j - 1]?.close;
      if (h == null || l == null || pc == null) return null;
      const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      sum += tr;
    }
    return sum / period;
  }

  function rsiAt(i, period = 14) {
    if (i < period) return null;
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const ch = closes[j] - closes[j - 1];
      if (ch >= 0) gains += ch;
      else losses += Math.abs(ch);
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  const trades = [];
  let open = null;

  for (let i = 55; i < closes.length; i++) {
    const sma20 = smaAt(closes, i, 20);
    const sma50 = smaAt(closes, i, 50);
    const rsi = rsiAt(i);
    const atr = atrAt(i);
    const px = closes[i];
    const date = candles[i].date || candles[i].time || null;

    if (open) {
      const barsHeld = i - open.entryIndex;
      const stop = open.stop;
      let exitPx = null;
      let reason = null;
      if (stop != null && px <= stop) {
        exitPx = stop;
        reason = "ATR stop";
      } else if (sma20 != null && px < sma20) {
        exitPx = px;
        reason = "Close below SMA20";
      } else if (rsi != null && rsi > 75) {
        exitPx = px;
        reason = "RSI overbought exit";
      } else if (barsHeld >= maxHold) {
        exitPx = px;
        reason = "Max hold";
      }

      if (exitPx != null) {
        const retPct = ((exitPx - open.entry) / open.entry) * 100;
        trades.push({
          entryDate: open.entryDate,
          exitDate: date,
          entry: Number(open.entry.toFixed(2)),
          exit: Number(exitPx.toFixed(2)),
          returnPct: Number(retPct.toFixed(2)),
          barsHeld,
          reason,
        });
        open = null;
      }
      continue;
    }

    // Entry
    if (
      sma20 != null &&
      sma50 != null &&
      rsi != null &&
      px > sma20 &&
      sma20 > sma50 &&
      rsi >= 45 &&
      rsi <= 70
    ) {
      const stop = atr != null ? px - 1.5 * atr : null;
      open = {
        entryIndex: i,
        entry: px,
        entryDate: date,
        stop: stop != null ? Number(stop.toFixed(2)) : null,
      };
    }
  }

  if (trades.length < minTradesForStats) {
    return {
      available: false,
      reason: `Rule produced only ${trades.length} closed trades — need ≥${minTradesForStats} for statistics (never fabricate)`,
      samples: trades.length,
      trades: trades.slice(-20),
      rules: [
        "Long when close > SMA20, SMA20 > SMA50, RSI 45–70",
        "Exit on close < SMA20, RSI > 75, ATR stop (1.5×), or max hold 20 bars",
      ],
      assumptions: ["Long-only", "Daily bars", "No transaction costs modeled", "No lookahead"],
    };
  }

  const rets = trades.map((t) => t.returnPct);
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r <= 0);
  const winRate = (wins.length / trades.length) * 100;
  const lossRate = (losses.length / trades.length) * 100;
  const avgReturn = rets.reduce((a, b) => a + b, 0) / rets.length;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : null;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : null;

  // Equity curve for max drawdown (compound % points simplified as cumulative sum of returns)
  let peak = 0;
  let equity = 0;
  let maxDd = 0;
  for (const r of rets) {
    equity += r;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDd) maxDd = dd;
  }

  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor =
    grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : wins.length ? null : null;

  const first = trades[0]?.entryDate;
  const last = trades[trades.length - 1]?.exitDate;

  return {
    available: true,
    samples: trades.length,
    winRate: Number(winRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    averageReturnPct: Number(avgReturn.toFixed(2)),
    averageWinPct: avgWin != null ? Number(avgWin.toFixed(2)) : null,
    averageLossPct: avgLoss != null ? Number(avgLoss.toFixed(2)) : null,
    maxDrawdownPctPoints: Number(maxDd.toFixed(2)),
    profitFactor,
    sharpeRatio: null, // requires risk-free / std with full equity series — not fabricated
    sortinoRatio: null,
    numberOfTrades: trades.length,
    period: { from: first || null, to: last || null },
    rules: [
      "Long when close > SMA20, SMA20 > SMA50, RSI 45–70",
      "Exit on close < SMA20, RSI > 75, ATR stop (1.5×), or max hold 20 bars",
    ],
    assumptions: [
      "Long-only equity rule set",
      "Verified Yahoo daily OHLCV only",
      "No brokerage, slippage, or taxes modeled",
      "Past rule performance is not predictive of future results",
    ],
    trades: trades.slice(-25),
    disclaimer:
      "Backtest is a transparent mechanical simulation on historical verified prices — not a promise of future performance.",
  };
}

/**
 * Build a full institutional recommendation package from classified evidence.
 */
function buildInvestmentDossier({
  symbol = null,
  name = null,
  action = null,
  price = null,
  horizon = null,
  investorProfile = null,
  thesis = null,
  bullishFactors = [],
  bearishFactors = [],
  riskFactors = [],
  technicalSignals = [],
  fundamentalSignals = [],
  sectorOutlook = null,
  competitorNote = null,
  valuationSummary = null,
  entry = null,
  entryZones = null,
  targets = {},
  stopLoss = null,
  riskRewardRatio = null,
  holdingPeriod = null,
  invalidation = [],
  capitalAllocation = null,
  positionSizing = null,
  confidence = null,
  backtest = null,
  dataClassification = "mixed",
} = {}) {
  return {
    version: "institutional-dossier-v1",
    symbol,
    name,
    action,
    price,
    investmentThesis: thesis || null,
    whyRecommended: thesis || null,
    bullishFactors: bullishFactors.filter(Boolean),
    bearishFactors: bearishFactors.filter(Boolean),
    riskFactors: riskFactors.filter(Boolean),
    supportingTechnicalSignals: technicalSignals.filter(Boolean),
    supportingFundamentalSignals: fundamentalSignals.filter(Boolean),
    sectorOutlook: sectorOutlook || null,
    competitorComparison: competitorNote || DATA_UNAVAILABLE,
    valuationSummary: valuationSummary || null,
    tradeConviction: confidence?.score != null ? confidence : null,
    confidence,
    positionSizingGuidance: positionSizing || capitalAllocation || null,
    entryPrice: entry,
    additionalEntryZones: entryZones,
    targetLevels: {
      t1: targets?.t1 ?? null,
      t2: targets?.t2 ?? null,
      t3: targets?.t3 ?? null,
      notes: targets?.notes || null,
    },
    stopLoss,
    riskRewardRatio,
    holdingPeriod: holdingPeriod || horizon || null,
    invalidationConditions: invalidation.filter(Boolean),
    capitalAllocationSuggestion: capitalAllocation || null,
    suitableInvestorProfile: investorProfile || null,
    backtest: backtest || {
      available: false,
      reason: "Backtest not run for this instrument",
    },
    dataClassification,
    policy: {
      zeroHallucination: true,
      factVsOpinion:
        "Verified prices/fundamentals/chain data are facts. Scores, thesis text, and confidence are analytical opinions derived from those facts.",
    },
  };
}

function splitFactors(reasons = []) {
  const bullish = [];
  const bearish = [];
  const risk = [];
  const technical = [];
  const fundamental = [];
  for (const r of reasons) {
    const text = typeof r === "string" ? r : r?.text || "";
    const cat = typeof r === "object" ? r?.category : null;
    const lower = text.toLowerCase();
    if (!text) continue;
    if (cat === "Technical" || /sma|rsi|macd|adx|trend|breakout|volume|dma|support|resistance/i.test(text)) {
      technical.push(text);
    }
    if (cat === "Fundamental" || /roe|margin|revenue|fcf|p\/e|valuation|fii|dii|breadth/i.test(text)) {
      fundamental.push(text);
    }
    if (/risk|overbought|volatil|weak|bearish|underperform|sell|outflow|debt/i.test(lower)) {
      if (/risk|overbought|volatil|drawdown|stop/i.test(lower)) risk.push(text);
      else bearish.push(text);
    } else if (/bullish|strong|positive|outperform|buying|support|healthy|golden/i.test(lower)) {
      bullish.push(text);
    }
  }
  return { bullish, bearish, risk, technical, fundamental };
}

module.exports = {
  buildConfidenceScore,
  backtestSmaTrend,
  buildInvestmentDossier,
  splitFactors,
  DATA_UNAVAILABLE,
};
