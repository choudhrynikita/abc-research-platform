const { getLegAtStrike, nearestStrike } = require("./nse-options");
const { enrichStrategyWithPayoff } = require("./options-payoff");

function historicalVol(candles, period = 30) {
  const closes = candles.slice(-period - 1).map((c) => c.close).filter((v) => v != null);
  if (closes.length < 10) return null;
  const returns = [];
  for (let i = 1; i < closes.length; i += 1) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  return Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
}

function liquidityRating(legs) {
  const oi = Math.max(...legs.map((l) => l?.openInterest ?? 0));
  const vol = Math.max(...legs.map((l) => l?.volume ?? 0));
  if (oi >= 50000 && vol >= 500) return "High";
  if (oi >= 15000 && vol >= 100) return "Medium";
  if (oi > 0 || vol > 0) return "Low";
  return null;
}

function buildPositionSizing(netPremium, lotSize, legs, spot, strategyType) {
  if (lotSize == null || netPremium == null) {
    return { available: false, note: "Lot size or premium not verified" };
  }
  const isCredit = netPremium < 0;
  const premiumPerShare = Math.abs(netPremium);
  const premiumPerLot = Number((premiumPerShare * lotSize).toFixed(2));
  const mainLeg = legs[0];
  const strike = mainLeg?.strike;

  let breakEven = null;
  if (strategyType === "Long CE" && strike != null) {
    breakEven = Number((strike + premiumPerShare).toFixed(2));
  } else if (strategyType === "Long PE" && strike != null) {
    breakEven = Number((strike - premiumPerShare).toFixed(2));
  }

  const maxLoss = isCredit
    ? null
    : premiumPerLot;

  return {
    available: true,
    lotSize,
    premiumPerLot,
    capitalRequired: isCredit ? null : premiumPerLot,
    marginNote: isCredit ? "Credit spread — margin per broker rules" : null,
    breakEven,
    maxLoss: maxLoss != null ? maxLoss : undefined,
    source: "NSE verified premium × official lot size",
  };
}

function buildAnalytics(legs, chain, ivMetrics = null) {
  const primary = legs[0];
  if (!primary) return { available: false };
  const rank = ivMetrics?.ivRank;
  const pct = ivMetrics?.ivPercentile;
  return {
    available: true,
    openInterest: primary.openInterest ?? null,
    oiChange: primary.oiChange ?? null,
    volume: primary.volume ?? null,
    impliedVolatility: primary.iv ?? chain?.impliedVolatility ?? null,
    ivRank: rank?.available ? rank.display : null,
    ivPercentile: pct?.available ? pct.display : null,
    ivNote: rank?.available || pct?.available
      ? `IV metrics from ${ivMetrics?.historyPoints ?? 0} verified NSE sessions`
      : rank?.reason || pct?.reason || "IV rank/percentile requires verified historical ATM IV — not estimated",
    delta: primary.delta ?? null,
    gamma: primary.gamma ?? null,
    theta: primary.theta ?? null,
    vega: primary.vega ?? null,
    putCallRatio: chain?.putCallRatio ?? null,
    liquidityRating: liquidityRating(legs),
    greeksSource: primary.delta != null ? "NSE option chain" : "Greeks unavailable from NSE feed",
  };
}

function scoreStrategy(strategy, ctx) {
  let score = 50;
  const factors = [];

  if (strategy.status === "Active") {
    score += 10;
    factors.push("Verified monthly option chain");
  } else if (strategy.status === "Wait") {
    score -= 12;
  }

  if (ctx.trend === "BULLISH" && strategy.bias === "Bullish") {
    score += 10;
    factors.push("Technical trend alignment");
  }
  if (ctx.trend === "BEARISH" && strategy.bias === "Bearish") {
    score += 10;
    factors.push("Technical trend alignment");
  }

  if (ctx.relativeStrength?.vsNifty != null && ctx.relativeStrength.vsNifty > 2 && strategy.bias === "Bullish") {
    score += 8;
    factors.push("Strong RS vs NIFTY");
  }
  if (ctx.relativeStrength?.vsNifty != null && ctx.relativeStrength.vsNifty < -2 && strategy.bias === "Bearish") {
    score += 8;
    factors.push("Weak RS vs NIFTY");
  }

  if (strategy.analytics?.liquidityRating === "High") {
    score += 8;
    factors.push("High options liquidity");
  } else if (strategy.analytics?.liquidityRating === "Medium") {
    score += 4;
    factors.push("Adequate liquidity");
  }

  if (ctx.volumeTrend === "Rising") {
    score += 5;
    factors.push("Volume confirmation");
  }

  if (strategy.riskRewardRatio != null && strategy.riskRewardRatio >= 1.5) {
    score += 7;
    factors.push("Favorable risk-reward");
  }

  if (ctx.adx != null && ctx.adx >= 25) {
    score += 5;
    factors.push("Strong ADX");
  }

  if (ctx.sectorOutlook === "Bullish" && strategy.bias === "Bullish") {
    score += 5;
    factors.push("Sector momentum");
  }

  if (strategy.analytics?.oiChange > 0 && strategy.bias === "Bullish") {
    score += 4;
    factors.push("Fresh OI build-up");
  }

  return {
    confidenceScore: Math.max(0, Math.min(100, Math.round(score))),
    factors,
  };
}

function buildLegs(chain, strikes, types, expiry) {
  const legs = [];
  for (let i = 0; i < strikes.length; i++) {
    const leg = getLegAtStrike(chain, strikes[i], types[i], expiry);
    if (!leg || leg.premium == null) return null;
    legs.push({ ...leg, action: i === 0 ? "BUY" : types.length > 1 && i > 0 ? "SELL" : "BUY" });
  }
  return legs;
}

function makeStrategy(base, ctx) {
  const legs = base.strikes || [];
  const netPrem = base.premiums?.net;
  const sizing = buildPositionSizing(netPrem, ctx.lotSize, legs, ctx.price, base.type);
  const analytics = buildAnalytics(legs, ctx.chain, ctx.ivMetrics);

  let strategy = {
    ...base,
    positionSizing: { ...sizing },
    analytics,
    lastUpdated: new Date().toISOString(),
  };

  // Correct max profit / max loss / break-evens from verified premiums (never from targets).
  const hasLegs = legs.some((s) => s?.premium != null && (s.action === "BUY" || s.action === "SELL"));
  if (hasLegs) {
    strategy = enrichStrategyWithPayoff(strategy, {
      spot: ctx.price ?? ctx.chain?.underlying ?? null,
      lotSize: ctx.lotSize ?? null,
    });
  }

  const t1 = base.targets?.t1;
  const t2 = base.targets?.t2;
  const lot = ctx.lotSize ?? 1;
  const maxReward = strategy.maxReward;
  // Trade management targets remain premium-based estimates for active management —
  // they are NOT max profit. Only surface as management levels when finite.
  const profitAtT1 =
    typeof t1 === "number" && netPrem > 0
      ? Number((t1 * lot).toFixed(2))
      : null;
  const profitAtT2 =
    typeof t2 === "number" && netPrem > 0
      ? Number((t2 * lot).toFixed(2))
      : null;

  const capital = strategy.positionSizing?.capitalRequired ?? sizing.capitalRequired;
  const rocT1 =
    profitAtT1 != null && capital > 0
      ? Number(((profitAtT1 / capital) * 100).toFixed(1))
      : null;

  return {
    ...strategy,
    positionSizing: {
      ...strategy.positionSizing,
      estimatedProfitT1: profitAtT1,
      estimatedProfitT2: profitAtT2,
      returnOnCapitalT1: rocT1,
      // Prefer payoff-engine break-even over simple long CE/PE heuristic
      breakEven:
        strategy.positionSizing?.breakEven ??
        sizing.breakEven ??
        null,
    },
  };
}

function generateCandidates(chain, ctx) {
  const candidates = [];
  if (!chain?.available) return candidates;

  const spot = chain.underlying ?? ctx.price;
  const atm = chain.atmStrike ?? nearestStrike(chain, spot);
  const expiry = ctx.monthlyExpiry ?? chain.expiry;
  const support = ctx.support;
  const resistance = ctx.resistance;

  if (atm == null || spot == null || !expiry) return candidates;

  const otmCall = nearestStrike(chain, spot * 1.03);
  const otmPut = nearestStrike(chain, spot * 0.97);
  const farCall = nearestStrike(chain, spot * 1.06);
  const farPut = nearestStrike(chain, spot * 0.94);

  const meta = {
    companyName: ctx.name,
    symbol: ctx.symbol,
    nseSymbol: ctx.nseSymbol,
    sector: ctx.sector,
    industry: ctx.industry,
    expiryType: "Monthly",
    expiry,
  };

  // Long CE
  const ceLeg = getLegAtStrike(chain, atm, "CE", expiry);
  if (ceLeg?.premium != null && ctx.trend !== "BEARISH") {
    const prem = ceLeg.premium;
    candidates.push(makeStrategy({
      ...meta,
      name: `${ctx.nseSymbol} Long Call`,
      type: "Long CE",
      bias: "Bullish",
      strikes: [{ ...ceLeg, action: "BUY" }],
      premiums: { net: prem },
      entryZone: { low: Number((prem * 0.95).toFixed(2)), high: Number((prem * 1.05).toFixed(2)) },
      stopLoss: Number((prem * 0.5).toFixed(2)),
      targets: { t1: Number((prem * 1.5).toFixed(2)), t2: Number((prem * 2).toFixed(2)) },
      exitConditions: [
        "Book 50% at Target 1",
        "Trail stop below entry on Target 2",
        "Exit on close below 20 DMA",
        `Time exit 5 days before ${expiry}`,
      ],
      timeExit: `5 sessions before ${expiry}`,
      indicatorExit: "RSI bearish divergence or MACD bearish crossover",
      maxRisk: prem,
      maxReward: null,
      holdingPeriod: "2–4 weeks",
      status: "Active",
      entryTrigger: resistance != null
        ? `Breakout above ${resistance} with volume confirmation`
        : "Bullish trend with rising volume",
      why: [
        ctx.trend === "BULLISH" ? "Bullish technical trend" : "Constructive price action",
        ctx.relativeStrength?.vsNifty > 0 ? "Outperforming NIFTY 50" : null,
        chain.putCallRatio > 1 ? "Put-heavy OI — contrarian bullish" : "Call buying interest",
        ctx.volumeTrend === "Rising" ? "High volume confirmation" : null,
      ].filter(Boolean),
    }, ctx));
  }

  // Long PE
  const peLeg = getLegAtStrike(chain, atm, "PE", expiry);
  if (peLeg?.premium != null && ctx.trend !== "BULLISH") {
    const prem = peLeg.premium;
    candidates.push(makeStrategy({
      ...meta,
      name: `${ctx.nseSymbol} Long Put`,
      type: "Long PE",
      bias: "Bearish",
      strikes: [{ ...peLeg, action: "BUY" }],
      premiums: { net: prem },
      entryZone: { low: Number((prem * 0.95).toFixed(2)), high: Number((prem * 1.05).toFixed(2)) },
      stopLoss: Number((prem * 0.5).toFixed(2)),
      targets: { t1: Number((prem * 1.5).toFixed(2)), t2: Number((prem * 2).toFixed(2)) },
      exitConditions: ["Book at Target 1", "Stop on reclaim above 20 DMA", `Time exit before ${expiry}`],
      timeExit: `5 sessions before ${expiry}`,
      indicatorExit: "MACD bullish crossover",
      maxRisk: prem,
      maxReward: null,
      holdingPeriod: "2–4 weeks",
      status: "Active",
      entryTrigger: support != null ? `Breakdown below ${support}` : "Bearish momentum confirmation",
      why: ["Bearish technical bias", "Put OI/volume watch", ctx.sectorOutlook === "Bearish" ? "Weak sector backdrop" : null].filter(Boolean),
    }, ctx));
  }

  // Bull Call Spread
  if (otmCall && otmCall !== atm) {
    const legs = buildLegs(chain, [atm, otmCall], ["CE", "CE"], expiry);
    if (legs) {
      const debit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          ...meta,
          name: `${ctx.nseSymbol} Bull Call Spread`,
          type: "Bull Call Spread",
          bias: "Bullish",
          strikes: legs.map((l, i) => ({ ...l, action: i === 0 ? "BUY" : "SELL" })),
          premiums: { net: debit },
          entryZone: { low: Number((debit * 0.95).toFixed(2)), high: Number((debit * 1.05).toFixed(2)) },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: Number((debit * 2).toFixed(2)), t2: Number((debit * 3).toFixed(2)) },
          exitConditions: ["Exit at 80% max profit", "Stop at 50% of debit"],
          timeExit: `3 sessions before ${expiry}`,
          indicatorExit: "Spot closes below long strike",
          maxRisk: debit,
          maxReward: Number(((otmCall - atm) - debit).toFixed(2)),
          holdingPeriod: "Monthly expiry",
          status: ctx.trend !== "BEARISH" ? "Active" : "Wait",
          entryTrigger: `Spot holding above ${atm}`,
          why: ["Defined-risk bullish play", "Lower premium outlay vs naked call", "Favorable for IV contraction"],
        }, ctx));
      }
    }
  }

  // Bear Put Spread
  if (otmPut && otmPut !== atm) {
    const legs = buildLegs(chain, [atm, otmPut], ["PE", "PE"], expiry);
    if (legs) {
      const debit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          ...meta,
          name: `${ctx.nseSymbol} Bear Put Spread`,
          type: "Bear Put Spread",
          bias: "Bearish",
          strikes: legs.map((l, i) => ({ ...l, action: i === 0 ? "BUY" : "SELL" })),
          premiums: { net: debit },
          entryZone: { low: Number((debit * 0.95).toFixed(2)), high: Number((debit * 1.05).toFixed(2)) },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: Number((debit * 2).toFixed(2)), t2: Number((debit * 3).toFixed(2)) },
          exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
          timeExit: `3 sessions before ${expiry}`,
          indicatorExit: "Spot reclaims 20 DMA",
          maxRisk: debit,
          maxReward: Number(((atm - otmPut) - debit).toFixed(2)),
          holdingPeriod: "Monthly expiry",
          status: ctx.trend !== "BULLISH" ? "Active" : "Wait",
          entryTrigger: `Spot below ${atm} with weakness`,
          why: ["Defined-risk bearish play", "Portfolio hedge candidate"],
        }, ctx));
      }
    }
  }

  // Bull Put Credit Spread
  if (otmPut && farPut && otmPut !== farPut) {
    const legs = buildLegs(chain, [otmPut, farPut], ["PE", "PE"], expiry);
    if (legs) {
      const credit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          ...meta,
          name: `${ctx.nseSymbol} Bull Put Spread`,
          type: "Credit Spread",
          bias: "Bullish",
          strikes: legs.map((l, i) => ({ ...l, action: i === 0 ? "SELL" : "BUY" })),
          premiums: { net: -credit },
          entryZone: { low: Number((credit * 0.9).toFixed(2)), high: Number((credit * 1.1).toFixed(2)) },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit if spot breaches short strike"],
          timeExit: `2 sessions before ${expiry}`,
          indicatorExit: "Support breakdown",
          maxRisk: Number(((otmPut - farPut) - credit).toFixed(2)),
          maxReward: credit,
          holdingPeriod: "Monthly",
          status: support != null && spot > support ? "Active" : "Wait",
          entryTrigger: support != null ? `Spot holding above ${support}` : "Awaiting verified market confirmation.",
          why: ["Support holding", "Premium collection on OTM puts"],
        }, ctx));
      }
    }
  }

  // Bear Call Credit Spread
  if (otmCall && farCall && otmCall !== farCall) {
    const legs = buildLegs(chain, [otmCall, farCall], ["CE", "CE"], expiry);
    if (legs) {
      const credit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          ...meta,
          name: `${ctx.nseSymbol} Bear Call Spread`,
          type: "Credit Spread",
          bias: "Bearish",
          strikes: legs.map((l, i) => ({ ...l, action: i === 0 ? "SELL" : "BUY" })),
          premiums: { net: -credit },
          entryZone: { low: Number((credit * 0.9).toFixed(2)), high: Number((credit * 1.1).toFixed(2)) },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit on resistance breakout"],
          timeExit: `2 sessions before ${expiry}`,
          indicatorExit: "Breakout above resistance",
          maxRisk: Number(((farCall - otmCall) - credit).toFixed(2)),
          maxReward: credit,
          holdingPeriod: "Monthly",
          status: resistance != null && spot < resistance ? "Active" : "Wait",
          entryTrigger: resistance != null ? `Spot below ${resistance}` : "Awaiting verified market confirmation.",
          why: ["Resistance capping upside", chain.highestCallOi ? `High call OI at ${chain.highestCallOi}` : "Elevated call OI"],
        }, ctx));
      }
    }
  }

  return candidates;
}

function rankTop10(allCandidates, globalContext) {
  return allCandidates
    .map((c) => {
      const scoring = scoreStrategy(c, { ...globalContext, ...c._ctx });
      return { ...c, confidenceScore: scoring.confidenceScore, confidenceFactors: scoring.factors };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 10)
    .map((s, i) => {
      const { _ctx, ...rest } = s;
      return {
        ...rest,
        rank: i + 1,
        chartSymbol: _ctx?.symbol ?? rest.symbol,
        stockMarketContext: _ctx
          ? {
              stockTrend: _ctx.trend,
              sectorTrend: _ctx.sectorOutlook,
              relativeStrength: _ctx.relativeStrength,
              support: _ctx.support,
              resistance: _ctx.resistance,
              histVol: _ctx.histVol,
              impliedVolatility: _ctx.chain?.impliedVolatility ?? null,
              earnings: _ctx.earnings,
              corporateActions: _ctx.corporateActions,
            }
          : null,
      };
    });
}

module.exports = {
  generateCandidates,
  rankTop10,
  historicalVol,
  scoreStrategy,
};