const { isAvailable } = require("./format");
const {
  buildConfidenceScore,
  backtestSmaTrend,
  buildInvestmentDossier,
  splitFactors,
} = require("./strategy-dossier");

const WEIGHTS = {
  technical: 0.35,
  fundamental: 0.3,
  relative: 0.1,
  sector: 0.1,
  momentum: 0.1,
  risk: 0.05,
};

function clamp(n, min = 0, max = 100) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, Number(n.toFixed(1))));
}

function val(field) {
  if (field == null) return null;
  if (typeof field === "object") return field.available === false ? null : field.value ?? null;
  return field;
}

function scoreTechnical(technicals, price) {
  if (!technicals || price == null) return null;
  let score = 50;
  const reasons = [];

  if (technicals.trend === "BULLISH") {
    score += 15;
    reasons.push("Bullish trend structure (moving averages + momentum ensemble)");
  } else if (technicals.trend === "BEARISH") {
    score -= 15;
    reasons.push("Bearish trend structure");
  }

  if (technicals.sma20 != null && price > technicals.sma20) {
    score += 8;
    reasons.push("Price above 20-day moving average");
  }
  if (technicals.sma50 != null && price > technicals.sma50) {
    score += 8;
    reasons.push("Price above 50-day moving average");
  }
  if (technicals.sma20 != null && technicals.sma50 != null && technicals.sma20 > technicals.sma50) {
    score += 10;
    reasons.push("Golden cross structure (20 DMA above 50 DMA)");
  }
  if (technicals.macdHistogram != null && technicals.macdHistogram > 0) {
    score += 6;
    reasons.push("MACD histogram positive (bullish momentum)");
  }
  if (technicals.rsi != null) {
    if (technicals.rsi >= 50 && technicals.rsi <= 70) {
      score += 6;
      reasons.push(`RSI at healthy bullish level (${technicals.rsi.toFixed(1)})`);
    } else if (technicals.rsi > 70) {
      score -= 4;
      reasons.push(`RSI overbought (${technicals.rsi.toFixed(1)})`);
    } else if (technicals.rsi < 40) {
      score -= 6;
    }
  }
  if (technicals.adx != null && technicals.adx >= 25) {
    score += 5;
    reasons.push(`ADX indicates strong trend (${technicals.adx.toFixed(1)})`);
  }
  if (technicals.volumeTrend === "Rising") {
    score += 5;
    reasons.push("Volume above 20-day average (confirmation)");
  }
  if (price != null && technicals.resistance != null && price >= technicals.resistance * 0.98) {
    score += 4;
    reasons.push("Trading near resistance — breakout watch");
  }

  return { score: clamp(score), reasons };
}

function scoreFundamental(stock) {
  const roe = val(stock.roe);
  const pe = val(stock.peRatio);
  const rev = val(stock.revenueGrowth);
  const debt = val(stock.debtToEquity);
  const margin = val(stock.operatingMargin);
  const fcf = val(stock.freeCashFlow);

  const hasAny = [roe, pe, rev, debt, margin, fcf].some((x) => x != null);
  if (!hasAny) return { score: null, reasons: [], available: false };

  let score = 50;
  const reasons = [];

  if (roe != null) {
    if (roe > 0.15) {
      score += 12;
      reasons.push(`Strong ROE (${(roe * 100).toFixed(1)}%)`);
    } else if (roe > 0.1) score += 6;
  }
  if (rev != null && rev > 0) {
    score += 10;
    reasons.push(`Positive revenue growth (${(rev * 100).toFixed(1)}%)`);
  }
  // Yahoo debtToEquity is often percent-style (e.g. 42.5); normalize when clearly not a ratio.
  const debtRatio = debt != null && debt > 5 ? debt / 100 : debt;
  if (debtRatio != null && debtRatio < 0.8) {
    score += 8;
    reasons.push("Healthy debt/equity profile");
  }
  if (pe != null && pe > 5 && pe < 40) {
    score += 6;
    reasons.push(`Reasonable valuation (P/E ${pe.toFixed(1)})`);
  }
  if (margin != null && margin > 0.15) {
    score += 6;
    reasons.push("Healthy operating margins");
  }
  if (fcf != null && fcf > 0) {
    score += 5;
    reasons.push("Positive free cash flow");
  }

  return { score: clamp(score), reasons, available: true };
}

function scoreRelative(stock, indexMonthlyChange) {
  if (stock.monthlyChangePercent == null || indexMonthlyChange == null) return { score: null, reasons: [] };
  const rel = stock.monthlyChangePercent - indexMonthlyChange;
  let score = 50 + rel * 3;
  const reasons = [];
  if (rel > 2) {
    reasons.push("Outperforming index over the past month");
  } else if (rel < -2) {
    reasons.push("Underperforming index over the past month");
  } else {
    reasons.push("In line with index performance");
  }
  return { score: clamp(score), reasons, relativeStrength: Number(rel.toFixed(2)) };
}

function scoreSector(stock, sectorMap) {
  const sector = sectorMap[stock.sector];
  if (!sector || sector.avgChange == null) return { score: null, reasons: [] };
  const avg = sector.avgChange ?? 0;
  let score = 50 + avg * 4;
  const reasons = [];
  if (avg > 0.5) reasons.push(`Strong sector rotation (${stock.sector} leading)`);
  else if (avg < -0.5) reasons.push(`Weak sector (${stock.sector} lagging)`);
  else reasons.push(`Neutral sector backdrop (${stock.sector})`);
  return { score: clamp(score), reasons, sectorRating: avg > 0.5 ? "BULLISH" : avg < -0.5 ? "BEARISH" : "NEUTRAL" };
}

function scoreMomentum(stock) {
  const parts = [stock.changePercent, stock.weeklyChangePercent, stock.monthlyChangePercent].filter((x) => x != null);
  if (!parts.length) return { score: null, reasons: [] };
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  let score = 50 + avg * 2.5;
  const reasons = [];
  if (avg > 1) reasons.push("Positive multi-timeframe momentum");
  else if (avg < -1) reasons.push("Negative momentum across timeframes");
  else reasons.push("Mixed momentum signals");
  return { score: clamp(score), reasons };
}

function scoreRisk(technicals, price) {
  if (!technicals || price == null) return { score: null, reasons: [] };
  let score = 70;
  const reasons = [];
  if (technicals.atr != null && price > 0) {
    const volPct = (technicals.atr / price) * 100;
    if (volPct > 4) {
      score -= 20;
      reasons.push("Elevated volatility (higher risk)");
    } else if (volPct < 2) {
      score += 10;
      reasons.push("Moderate volatility profile");
    }
  }
  if (technicals.rsi != null && technicals.rsi > 75) {
    score -= 10;
    reasons.push("Overbought conditions increase pullback risk");
  }
  return { score: clamp(score), reasons };
}

function convictionLevel(buyScore) {
  if (buyScore == null) return null;
  if (buyScore >= 80) return "Very High";
  if (buyScore >= 70) return "High";
  if (buyScore >= 60) return "Medium";
  return "Low";
}

function riskRewardFromLevels(entry, stop, target) {
  if (entry == null || stop == null || target == null) return null;
  if (![entry, stop, target].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  if (risk <= 0) return null;
  return Number((reward / risk).toFixed(2));
}

/**
 * Build verified-input confidence + optional rule backtest (never invents trades).
 */
function buildStockEvidence(stock, breakdown, recommendation) {
  const tech = stock.technicals || {};
  const fields = [
    { name: "price", available: stock.price != null },
    { name: "trend", available: tech.trend != null },
    { name: "sma20", available: tech.sma20 != null },
    { name: "sma50", available: tech.sma50 != null },
    { name: "rsi", available: tech.rsi != null },
    { name: "macd", available: tech.macdHistogram != null },
    { name: "adx", available: tech.adx != null },
    { name: "volume_trend", available: tech.volumeTrend != null },
    { name: "support", available: tech.support != null },
    { name: "resistance", available: tech.resistance != null },
    { name: "roe", available: val(stock.roe) != null },
    { name: "pe", available: val(stock.peRatio) != null },
    { name: "revenue_growth", available: val(stock.revenueGrowth) != null },
    { name: "debt_equity", available: val(stock.debtToEquity) != null },
    { name: "fcf", available: val(stock.freeCashFlow) != null },
    { name: "sector", available: !!stock.sector },
    { name: "monthly_change", available: stock.monthlyChangePercent != null },
  ];

  const action = recommendation?.action;
  const bullishThesis = action === "BUY" || action === "WATCH";
  const agreements = [
    {
      name: "trend",
      aligned:
        tech.trend == null
          ? null
          : bullishThesis
            ? tech.trend === "BULLISH"
            : tech.trend === "BEARISH",
    },
    {
      name: "sma_structure",
      aligned:
        tech.sma20 == null || tech.sma50 == null || stock.price == null
          ? null
          : bullishThesis
            ? stock.price > tech.sma20 && tech.sma20 > tech.sma50
            : stock.price < tech.sma20,
    },
    {
      name: "macd",
      aligned:
        tech.macdHistogram == null
          ? null
          : bullishThesis
            ? tech.macdHistogram > 0
            : tech.macdHistogram < 0,
    },
    {
      name: "momentum",
      aligned:
        breakdown.momentum?.score == null
          ? null
          : bullishThesis
            ? breakdown.momentum.score >= 50
            : breakdown.momentum.score < 50,
    },
    {
      name: "sector",
      aligned:
        breakdown.sector?.sectorRating == null
          ? null
          : bullishThesis
            ? breakdown.sector.sectorRating !== "BEARISH"
            : breakdown.sector.sectorRating !== "BULLISH",
    },
  ];

  const candles = Array.isArray(stock._candles) ? stock._candles : null;
  const backtest = candles
    ? backtestSmaTrend(candles)
    : {
        available: false,
        reason: "Awaiting Latest Verified Data — OHLCV not attached for rule backtest",
        samples: 0,
      };

  const confidence = buildConfidenceScore({
    fields,
    agreements,
    backtestQuality: backtest.available
      ? { available: true, samples: backtest.samples, winRate: backtest.winRate }
      : { available: false, reason: backtest.reason, samples: backtest.samples || 0 },
  });

  return { confidence, backtest };
}

function buildRecommendation(stock, breakdown) {
  const reasons = [
    ...breakdown.technical.reasons,
    ...breakdown.fundamental.reasons,
    ...breakdown.relative.reasons,
    ...breakdown.sector.reasons,
    ...breakdown.momentum.reasons,
  ].filter(Boolean);

  const risks = breakdown.risk.reasons.filter(
    (r) => r.includes("risk") || r.includes("Overbought") || r.includes("volatility")
  );
  const entry = stock.price ?? stock.technicals?.support ?? null;
  const entryZone =
    stock.technicals?.support != null && stock.price != null
      ? {
          low: Number(Math.min(stock.technicals.support, stock.price).toFixed(2)),
          high: Number(stock.price.toFixed(2)),
        }
      : stock.technicals?.support != null
        ? { low: stock.technicals.support, high: stock.technicals.support }
        : null;
  const target1 = stock.technicals?.resistance ?? null;
  const stopLoss =
    stock.technicals?.support != null
      ? Number((stock.technicals.support * 0.97).toFixed(2))
      : entry != null
        ? Number((entry * 0.97).toFixed(2))
        : null;
  const rr = riskRewardFromLevels(entry, stopLoss, target1);
  const factors = splitFactors(reasons.map((r) => ({ text: r })));
  const riskFactors = risks.length
    ? risks
    : ["Standard equity market risk — position size to risk tolerance; past signals are not guarantees"];

  if (breakdown.buyScore == null || breakdown.buyScore < 55) {
    const empty = {
      action: "UNAVAILABLE",
      message:
        "Recommendation unavailable because verified market data could not be confirmed for scoring.",
      conviction: null,
      reasons: [],
      risks: [],
      entryZone: null,
      stopLoss: null,
      targets: { t1: null, t2: null, t3: null },
      horizon: null,
      riskRewardRatio: null,
      confidence: null,
      backtest: {
        available: false,
        reason: "Recommendation not scored — backtest not applicable",
      },
      dossier: null,
    };
    return empty;
  }

  const action = breakdown.buyScore >= 65 ? "BUY" : "WATCH";
  const horizon = breakdown.buyScore >= 75 ? "Positional (3–12 weeks)" : "Swing (1–4 weeks)";
  const conviction = convictionLevel(breakdown.buyScore);
  const message =
    action === "BUY"
      ? "Quantitative multi-factor screen passes institutional thresholds using verified market data only."
      : "Monitor — composite score below primary buy threshold; await confirmation from verified factors.";

  const draftRec = {
    action,
    message,
    conviction,
    reasons: reasons.slice(0, 12),
    risks: riskFactors,
    entryZone,
    stopLoss,
    targets: {
      t1: target1,
      t2: target1 != null ? Number((target1 * 1.05).toFixed(2)) : null,
      t3: target1 != null ? Number((target1 * 1.1).toFixed(2)) : null,
    },
    horizon,
    riskRewardRatio: rr,
  };

  const { confidence, backtest } = buildStockEvidence(stock, breakdown, draftRec);
  const pe = val(stock.peRatio);
  const roe = val(stock.roe);

  const dossier = buildInvestmentDossier({
    symbol: stock.symbol,
    name: stock.name,
    action,
    price: stock.price,
    horizon,
    investorProfile:
      action === "BUY"
        ? "Growth-oriented equity investors comfortable with market risk; not suitable as guaranteed-return products"
        : "Monitoring list — wait for stronger multi-factor confirmation before capital allocation",
    thesis: message,
    bullishFactors: factors.bullish.length ? factors.bullish : reasons.filter((r) => !/risk|weak|bearish/i.test(r)).slice(0, 6),
    bearishFactors: factors.bearish,
    riskFactors,
    technicalSignals: factors.technical.length ? factors.technical : breakdown.technical.reasons,
    fundamentalSignals: factors.fundamental.length
      ? factors.fundamental
      : breakdown.fundamental.reasons,
    sectorOutlook: breakdown.sector?.reasons?.[0] || stock.sector || null,
    competitorNote:
      "Peer relative valuation requires full sector peer set — Source Does Not Provide This Information as a ranked peer table for this screen",
    valuationSummary:
      pe != null || roe != null
        ? [
            pe != null ? `P/E ${pe.toFixed(1)} (verified)` : null,
            roe != null ? `ROE ${(roe * 100).toFixed(1)}% (verified)` : null,
            breakdown.scores?.fundamental != null
              ? `Fundamental score ${breakdown.scores.fundamental}/100 (model)`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Valuation metrics: Data Unavailable from current feed for full summary",
    entry: entry,
    entryZones: entryZone,
    targets: draftRec.targets,
    stopLoss,
    riskRewardRatio: rr,
    holdingPeriod: horizon,
    invalidation: [
      stopLoss != null ? `Close below stop ${stopLoss} on verified daily bar` : null,
      techTrendInvalidation(stock.technicals),
      "Breakdown of multi-factor score below screen threshold on refresh",
    ].filter(Boolean),
    capitalAllocation:
      conviction === "Very High" || conviction === "High"
        ? "Consider 1–3% of equity sleeve per name; never exceed personal risk budget"
        : "Pilot size only (≤1% of equity sleeve) until conviction improves",
    positionSizing:
      stopLoss != null && entry != null
        ? `Risk-based: size so that (entry − stop) × shares ≤ 0.5–1% of portfolio; stop derived from verified support structure`
        : "Await verified support for stop-based sizing",
    confidence,
    backtest,
    dataClassification: "mixed",
  });

  return {
    ...draftRec,
    confidence,
    backtest,
    dossier,
  };
}

function techTrendInvalidation(technicals) {
  if (!technicals) return "Loss of verified trend structure (moving averages flip against thesis)";
  if (technicals.sma20 != null) {
    return `Sustained close below 20 DMA (${technicals.sma20}) would invalidate near-term bullish structure`;
  }
  return "Loss of verified trend structure on next data refresh";
}

function scoreStock(stock, context) {
  const breakdown = {
    technical: scoreTechnical(stock.technicals, stock.price),
    fundamental: scoreFundamental(stock),
    relative: scoreRelative(stock, context.indexMonthlyChange),
    sector: scoreSector(stock, context.sectorMap),
    momentum: scoreMomentum(stock),
    risk: scoreRisk(stock.technicals, stock.price),
  };

  const weights = { ...WEIGHTS };
  if (!breakdown.fundamental.available) {
    weights.technical += weights.fundamental * 0.6;
    weights.momentum += weights.fundamental * 0.4;
    weights.fundamental = 0;
  }

  const components = [
    { key: "technical", w: weights.technical },
    { key: "fundamental", w: weights.fundamental },
    { key: "relative", w: weights.relative },
    { key: "sector", w: weights.sector },
    { key: "momentum", w: weights.momentum },
    { key: "risk", w: weights.risk },
  ];

  let totalWeight = 0;
  let weightedSum = 0;
  const scores = {};

  components.forEach(({ key, w }) => {
    const s = breakdown[key].score;
    scores[key] = s;
    if (s != null && w > 0) {
      weightedSum += s * w;
      totalWeight += w;
    }
  });

  const buyScore = totalWeight > 0 ? clamp(weightedSum / totalWeight) : null;
  breakdown.buyScore = buyScore;
  breakdown.scores = {
    technical: scores.technical,
    fundamental: scores.fundamental,
    relative: scores.relative,
    sector: scores.sector,
    momentum: scores.momentum,
    risk: scores.risk,
    quality: breakdown.fundamental.score,
    growth: val(stock.revenueGrowth) != null ? clamp(50 + (val(stock.revenueGrowth) || 0) * 100) : null,
    overall: buyScore,
  };
  breakdown.recommendation = buildRecommendation(stock, breakdown);

  return breakdown;
}

/**
 * Score and rank stocks. limit defaults to 50 (Top 50 product).
 * Strips internal _candles before returning public payloads.
 */
function rankTop50(stocks, context, limit = 50) {
  const scored = stocks
    .filter((s) => s.price != null && s.technicals != null)
    .map((stock) => {
      const breakdown = scoreStock(stock, context);
      const rec = breakdown.recommendation;
      // Never leak internal candle series to API consumers
      const { _candles, ...publicStock } = stock;
      return {
        ...publicStock,
        scores: breakdown.scores,
        buyScore: breakdown.buyScore,
        recommendation: rec,
        whyBuy: rec.reasons,
        confidence: rec.confidence || null,
        backtest: rec.backtest || null,
        dossier: rec.dossier || null,
      };
    })
    .filter((s) => s.buyScore != null)
    .sort((a, b) => b.buyScore - a.buyScore);

  const cap = Number.isFinite(limit) && limit > 0 ? limit : 50;
  return scored.slice(0, cap);
}

module.exports = { rankTop50, scoreStock, WEIGHTS, buildStockEvidence };