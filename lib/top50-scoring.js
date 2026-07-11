const { isAvailable } = require("./format");

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

function buildRecommendation(stock, breakdown) {
  const reasons = [
    ...breakdown.technical.reasons,
    ...breakdown.fundamental.reasons,
    ...breakdown.relative.reasons,
    ...breakdown.sector.reasons,
    ...breakdown.momentum.reasons,
  ].filter(Boolean);

  const risks = breakdown.risk.reasons.filter((r) => r.includes("risk") || r.includes("Overbought") || r.includes("volatility"));
  const entry = stock.technicals?.support ?? null;
  const target1 = stock.technicals?.resistance ?? null;
  const stopLoss = entry != null ? Number((entry * 0.97).toFixed(2)) : null;

  if (breakdown.buyScore == null || breakdown.buyScore < 55) {
    return {
      action: "UNAVAILABLE",
      message: "Recommendation unavailable because verified market data could not be confirmed for scoring.",
      conviction: null,
      reasons: [],
      risks: [],
      entryZone: null,
      stopLoss: null,
      targets: { t1: null, t2: null, t3: null },
      horizon: null,
    };
  }

  return {
    action: breakdown.buyScore >= 65 ? "BUY" : "WATCH",
    message: breakdown.buyScore >= 65
      ? "Quantitative screen passes institutional thresholds using verified market data."
      : "On watchlist — scores below primary buy threshold.",
    conviction: convictionLevel(breakdown.buyScore),
    reasons: reasons.slice(0, 12),
    risks: risks.length ? risks : ["Standard market risk — verify position sizing"],
    entryZone: entry,
    stopLoss,
    targets: {
      t1: target1,
      t2: target1 != null ? Number((target1 * 1.05).toFixed(2)) : null,
      t3: target1 != null ? Number((target1 * 1.1).toFixed(2)) : null,
    },
    horizon: breakdown.buyScore >= 75 ? "Positional" : "Swing",
  };
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

function rankTop50(stocks, context) {
  const scored = stocks
    .filter((s) => s.price != null && s.technicals != null)
    .map((stock) => {
      const breakdown = scoreStock(stock, context);
      return {
        ...stock,
        scores: breakdown.scores,
        buyScore: breakdown.buyScore,
        recommendation: breakdown.recommendation,
        whyBuy: breakdown.recommendation.reasons,
      };
    })
    .filter((s) => s.buyScore != null)
    .sort((a, b) => b.buyScore - a.buyScore);

  return scored.slice(0, 50);
}

module.exports = { rankTop50, scoreStock, WEIGHTS };