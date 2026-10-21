const { isAvailable } = require("./format");
const {
  buildConfidenceScore,
  backtestSmaTrend,
  buildInvestmentDossier,
  splitFactors,
} = require("./strategy-dossier");
const { detectRecentBearishReversal, tradeBlockers } = require("./buy-gates");

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

function inr(n) {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function scoreTechnical(technicals, price) {
  if (!technicals || price == null) return null;
  let score = 50;
  const reasons = [];

  if (technicals.trend === "BULLISH") {
    score += 15;
    reasons.push("Daily trend ensemble (RSI, MACD, and moving averages) is bullish");
  } else if (technicals.trend === "BEARISH") {
    score -= 15;
    reasons.push("Daily trend ensemble is bearish — this is not a long setup");
  } else if (technicals.trend) {
    reasons.push(`Daily trend ensemble is ${technicals.trend.toLowerCase()}, not a clean uptrend`);
  }

  if (technicals.sma20 != null) {
    const gap = ((price - technicals.sma20) / technicals.sma20) * 100;
    if (price > technicals.sma20) {
      score += 8;
      reasons.push(`Price is ${gap.toFixed(1)}% above the 20 DMA (${inr(technicals.sma20)})`);
    } else {
      reasons.push(`Price is ${Math.abs(gap).toFixed(1)}% below the 20 DMA (${inr(technicals.sma20)}) — the short average is overhead`);
    }
  }
  if (technicals.sma50 != null) {
    const gap = ((price - technicals.sma50) / technicals.sma50) * 100;
    if (price > technicals.sma50) {
      score += 8;
      reasons.push(`Price is ${gap.toFixed(1)}% above the 50 DMA (${inr(technicals.sma50)})`);
    } else {
      reasons.push(`Price is ${Math.abs(gap).toFixed(1)}% below the 50 DMA (${inr(technicals.sma50)})`);
    }
  }
  if (technicals.sma20 != null && technicals.sma50 != null && technicals.sma20 > technicals.sma50) {
    score += 10;
    reasons.push(`20 DMA (${inr(technicals.sma20)}) is still above the 50 DMA (${inr(technicals.sma50)}) — the medium trend has not rolled over`);
  } else if (technicals.sma20 != null && technicals.sma50 != null) {
    reasons.push(`20 DMA (${inr(technicals.sma20)}) is below the 50 DMA (${inr(technicals.sma50)}) — medium trend is down`);
  }
  if (technicals.macdHistogram != null && technicals.macdHistogram > 0) {
    score += 6;
    reasons.push(`MACD histogram is positive (${technicals.macdHistogram.toFixed(2)}) — upside momentum has not flipped`);
  } else if (technicals.macdHistogram != null && technicals.macdHistogram < 0) {
    reasons.push(`MACD histogram is negative (${technicals.macdHistogram.toFixed(2)}) — momentum is down`);
  }
  if (technicals.rsi != null) {
    if (technicals.rsi >= 50 && technicals.rsi <= 70) {
      score += 6;
      reasons.push(`RSI ${technicals.rsi.toFixed(1)} is in the 50–70 band — uptrend without an overbought print`);
    } else if (technicals.rsi > 70) {
      score -= 4;
      reasons.push(`RSI ${technicals.rsi.toFixed(1)} is overbought`);
    } else if (technicals.rsi < 40) {
      score -= 6;
      reasons.push(`RSI ${technicals.rsi.toFixed(1)} is weak`);
    } else {
      reasons.push(`RSI ${technicals.rsi.toFixed(1)} is under 50 — buyers are not in control of the oscillator`);
    }
  }
  if (technicals.adx != null && technicals.adx >= 25) {
    score += 5;
    reasons.push(`ADX ${technicals.adx.toFixed(1)} is above 25 — the trend has strength, not just a flat drift`);
  } else if (technicals.adx != null) {
    reasons.push(`ADX ${technicals.adx.toFixed(1)} is below 25 — trend strength is weak`);
  }
  if (technicals.volumeTrend === "Rising") {
    score += 5;
    reasons.push("Volume is above its 20-day average — the last push has participation");
  } else if (technicals.volumeTrend) {
    reasons.push(`Volume trend is ${technicals.volumeTrend.toLowerCase()} — no extra confirmation from volume`);
  }
  if (price != null && technicals.resistance != null && price >= technicals.resistance * 0.98 && price < technicals.resistance) {
    score -= 8;
    reasons.push("Price is stalled under the 20-day high — breakout not confirmed");
  }
  if (technicals.bearishReversal) {
    score -= 12;
    reasons.push(`${technicals.bearishReversal} on recent bars — bearish reversal, not a breakout`);
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
      reasons.push(`ROE is ${(roe * 100).toFixed(1)}% — the business is earning above 15% on equity`);
    } else if (roe > 0.1) {
      score += 6;
      reasons.push(`ROE is ${(roe * 100).toFixed(1)}% — acceptable, not a standout`);
    } else {
      reasons.push(`ROE is ${(roe * 100).toFixed(1)}% — profitability is not a reason to buy`);
    }
  } else {
    reasons.push("ROE is not in the current feed, so this fundamental score does not include return on equity");
  }
  if (rev != null && rev > 0) {
    score += 10;
    reasons.push(`Revenue growth is ${(rev * 100).toFixed(1)}% on the latest verified figure`);
  } else if (rev != null) {
    reasons.push(`Revenue growth is ${(rev * 100).toFixed(1)}% — sales are not expanding`);
  }
  // Yahoo debtToEquity is often percent-style (e.g. 42.5); normalize when clearly not a ratio.
  const debtRatio = debt != null && debt > 5 ? debt / 100 : debt;
  if (debtRatio != null && debtRatio < 0.8) {
    score += 8;
    reasons.push(`Debt/equity is ${debtRatio.toFixed(2)} — under 0.8, so the balance sheet is not the risk`);
  } else if (debtRatio != null) {
    reasons.push(`Debt/equity is ${debtRatio.toFixed(2)} — leverage is not a support for the buy`);
  }
  if (pe != null && pe > 5 && pe < 40) {
    score += 6;
    reasons.push(
      pe >= 30
        ? `P/E is ${pe.toFixed(1)}x. That is inside the screen's 5–40 band, but near the expensive end — valuation is not why this would be a buy`
        : `P/E is ${pe.toFixed(1)}x, inside the screen's 5–40 band`
    );
  } else if (pe != null && pe >= 40) {
    reasons.push(`P/E is ${pe.toFixed(1)}x, above the screen's 40x cap — the multiple is not supportive`);
  } else if (pe != null) {
    reasons.push(`P/E is ${pe.toFixed(1)}x and is not used as a valuation reason`);
  }
  if (margin != null && margin > 0.15) {
    score += 6;
    reasons.push(`Operating margin is ${(margin * 100).toFixed(1)}%`);
  } else if (margin != null) {
    reasons.push(`Operating margin is ${(margin * 100).toFixed(1)}% — not a margin-led buy`);
  }
  if (fcf != null && fcf > 0) {
    score += 5;
    reasons.push("Free cash flow is positive on the latest verified figure");
  } else if (fcf != null) {
    reasons.push("Free cash flow is not positive on the latest verified figure");
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
  const bits = [];
  if (stock.changePercent != null) bits.push(`day ${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`);
  if (stock.weeklyChangePercent != null) bits.push(`week ${stock.weeklyChangePercent >= 0 ? "+" : ""}${stock.weeklyChangePercent.toFixed(2)}%`);
  if (stock.monthlyChangePercent != null) bits.push(`month ${stock.monthlyChangePercent >= 0 ? "+" : ""}${stock.monthlyChangePercent.toFixed(2)}%`);
  const tone = avg > 1 ? "positive" : avg < -1 ? "negative" : "mixed";
  const reasons = [`Momentum is ${tone} (${bits.join(", ")})`];
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
      reasons.push(`Daily ATR is ${volPct.toFixed(1)}% of price — swings are wide, so the stop has to be respected`);
    } else if (volPct < 2) {
      score += 10;
      reasons.push(`Daily ATR is ${volPct.toFixed(1)}% of price — volatility is contained`);
    } else {
      reasons.push(`Daily ATR is ${volPct.toFixed(1)}% of price`);
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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function istDateIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addCalendarDays(isoDate, days) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatIsoDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/**
 * Intended exit: first verified resistance above the last price,
 * and the calendar end of the screen horizon (IST). Not a forecast.
 */
function buildSellPlan({ price, resistance, buyScore, horizonLabel, asOf = new Date() } = {}) {
  const positional = buyScore != null ? buyScore >= 75 : /positional/i.test(String(horizonLabel || ""));
  const swing = buyScore != null ? buyScore >= 55 && buyScore < 75 : /swing/i.test(String(horizonLabel || ""));
  if (!positional && !swing) return null;

  const openDays = positional ? 21 : 7;
  const byDays = positional ? 84 : 28;
  const horizon = horizonLabel || (positional ? "Positional (3–12 weeks)" : "Swing (1–4 weeks)");
  const ladder = [resistance, resistance != null ? resistance * 1.05 : null, resistance != null ? resistance * 1.1 : null]
    .filter((n) => n != null && Number.isFinite(Number(n)))
    .map((n) => Number(Number(n).toFixed(2)));
  const sell = ladder.find((n) => price == null || n > Number(price)) ?? null;
  const today = istDateIso(asOf);
  const openOn = addCalendarDays(today, openDays);
  const by = addCalendarDays(today, byDays);

  return {
    price: sell,
    openOn,
    by,
    openLabel: formatIsoDate(openOn),
    byLabel: formatIsoDate(by),
    horizon,
    basis: sell != null
      ? "First verified resistance above the last price."
      : "No verified resistance sits above the last price, so a sell level is not invented.",
    note: `Screen horizon ends ${formatIsoDate(by)}. Not a promise the price gets there.`,
  };
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

function tradeCase({ price, stopLoss, support, sellAt, rr }) {
  const lines = [];
  let gap = null;
  if (support != null && price != null && support > 0) {
    gap = ((price - support) / support) * 100;
    if (gap <= 1.5 && gap >= -0.5) {
      lines.push(`Entry is a limit at support ${inr(support)}. Last price ${inr(price)} is on that 20-day low.`);
    } else if (gap > 1.5) {
      lines.push(`Entry is a limit at support ${inr(support)} (20-day low). Last price ${inr(price)} is ${gap.toFixed(1)}% above it — do not chase.`);
    } else {
      lines.push(`The 20-day low ${inr(support)} has broken. Last price ${inr(price)} is ${Math.abs(gap).toFixed(1)}% through it.`);
    }
  }
  if (price != null && sellAt != null && sellAt > price) {
    const gain = sellAt - price;
    const room = (gain / price) * 100;
    lines.push(
      `Sell level is ${inr(sellAt)} — ${inr(gain)} (${room.toFixed(1)}%) above ${inr(price)}. That is the first verified level above the last price, not a forecast.`
    );
  }
  if (price != null && stopLoss != null && stopLoss < price) {
    const risk = price - stopLoss;
    const from = support != null ? `, 3% under the 20-day low of ${inr(support)}` : "";
    lines.push(`Stop is ${inr(stopLoss)}${from}. Downside from ${inr(price)} is ${inr(risk)}.`);
  }
  const limitHolds = gap == null || gap >= -0.5;
  if (rr != null && limitHolds && support != null && sellAt != null && stopLoss != null && sellAt > support && stopLoss < support) {
    lines.push(
      rr >= 1
        ? `Reward/risk from the limit at ${inr(support)} is ${rr}:1. The planned gain is at least as large as the planned loss.`
        : `Reward/risk from the limit at ${inr(support)} is ${rr}:1. The planned loss is larger than the planned gain, so this screen does not call it a buy.`
    );
  }
  if (gap != null && gap > 1.5 && price != null && sellAt != null && stopLoss != null && sellAt > price && stopLoss < price) {
    const chase = riskRewardFromLevels(price, stopLoss, sellAt);
    if (chase != null && chase < 1) {
      lines.push(`Buying the last price instead is ${chase}:1 — the loss to the stop is larger than the gain to the sell level.`);
    }
  }
  return lines;
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
    (r) => /risk|Overbought|volatility|ATR/i.test(r)
  );
  const entry = stock.technicals?.support ?? stock.price ?? null;
  const support = stock.technicals?.support ?? null;
  const supportGap = support != null && stock.price != null && support > 0
    ? (stock.price - support) / support
    : null;
  const atSupport = supportGap != null && supportGap <= 0.015 && supportGap >= -0.005;
  const entryZone = support != null
    ? {
        low: Number(support.toFixed(2)),
        high: Number((support * 1.015).toFixed(2)),
      }
    : null;
  const target1 = stock.technicals?.resistance ?? null;
  const stopLoss =
    stock.technicals?.support != null
      ? Number((stock.technicals.support * 0.97).toFixed(2))
      : entry != null
        ? Number((entry * 0.97).toFixed(2))
        : null;
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
      sellPlan: null,
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

  const actionScore = breakdown.buyScore >= 65 ? "BUY" : "WATCH";
  const horizon = breakdown.buyScore >= 75 ? "Positional (3–12 weeks)" : "Swing (1–4 weeks)";
  const sellPlan = buildSellPlan({
    price: stock.price,
    resistance: target1,
    buyScore: breakdown.buyScore,
    horizonLabel: horizon,
  });
  const sellAt = sellPlan?.price ?? null;
  const rr = riskRewardFromLevels(entry, stopLoss, sellAt);
  const blockers = tradeBlockers({
    price: stock.price,
    resistance: target1,
    support,
    reversal: stock.technicals?.bearishReversal || null,
    buyScore: breakdown.buyScore,
  });
  const trade = tradeCase({
    price: stock.price,
    stopLoss,
    support: stock.technicals?.support ?? null,
    sellAt,
    rr,
  });
  const rrLine = trade.find((line) => line.startsWith("Reward/risk"));
  if (rr != null && rr < 1 && rrLine) blockers.push(rrLine);
  const action = blockers.length && actionScore === "BUY" ? "WATCH" : actionScore;
  const conviction = convictionLevel(breakdown.buyScore);
  const message = blockers.length
    ? blockers[0]
    : action === "BUY"
      ? "Last price is at the 20-day low. The order is a limit at that support, and the reward to the sell level covers the stop."
      : "Composite score is below the buy threshold. The notes below are the inputs — they are not a buy call.";

  const technicalCase = [
    ...(breakdown.technical?.reasons || []).slice(0, 4),
    ...(breakdown.momentum?.reasons || []).slice(0, 1),
  ];
  const fundamentalCase = breakdown.fundamental?.available
    ? (breakdown.fundamental.reasons || []).slice(0, 4)
    : ["No verified fundamental inputs (ROE, growth, debt, margin, cash flow, or P/E). This is not a fundamental buy."];
  const analysis = {
    technical: technicalCase,
    fundamental: fundamentalCase,
    trade: trade.filter((line) => !blockers.includes(line)),
  };

  const draftRec = {
    action,
    message,
    conviction,
    blockers,
    analysis,
    reasons: [...blockers, ...technicalCase, ...fundamentalCase, ...trade].slice(0, 12),
    risks: riskFactors,
    entryZone,
    stopLoss,
    targets: {
      t1: target1,
      t2: target1 != null ? Number((target1 * 1.05).toFixed(2)) : null,
      t3: target1 != null ? Number((target1 * 1.1).toFixed(2)) : null,
    },
    horizon,
    sellPlan,
    riskRewardRatio: rr,
    atSupport,
    supportGap,
    entryAt: support,
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
  const reversal = detectRecentBearishReversal(stock._candles);
  const technicals = stock.technicals
    ? { ...stock.technicals, bearishReversal: reversal }
    : stock.technicals;
  const scoredStock = { ...stock, technicals };
  const breakdown = {
    technical: scoreTechnical(technicals, stock.price),
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
  breakdown.recommendation = buildRecommendation(scoredStock, breakdown);

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
    .sort((a, b) => {
      const buy = (row) => (row.recommendation?.action === "BUY" ? 1 : 0);
      const buyGate = buy(b) - buy(a);
      if (buyGate !== 0) return buyGate;
      const near = (row) => (row.recommendation?.atSupport ? 1 : 0);
      const nearGate = near(b) - near(a);
      if (nearGate !== 0) return nearGate;
      const gap = (row) => {
        const g = row.recommendation?.supportGap;
        return g == null || g < 0 ? 99 : g;
      };
      if (gap(a) !== gap(b)) return gap(a) - gap(b);
      return b.buyScore - a.buyScore;
    });

  const cap = Number.isFinite(limit) && limit > 0 ? limit : 50;
  return scored.slice(0, cap);
}

module.exports = { rankTop50, scoreStock, WEIGHTS, buildStockEvidence, buildSellPlan };