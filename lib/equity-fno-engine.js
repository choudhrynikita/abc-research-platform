const { getLegAtStrike, nearestStrike } = require("./nse-options");
const { enrichStrategyWithPayoff } = require("./options-payoff");
const {
  estimateStrategyOpenCharges,
  applyChargesToPayoff,
} = require("./equity-charges");
const {
  buildConfidenceScore,
  buildInvestmentDossier,
  splitFactors,
  backtestDirectionalProxy,
} = require("./strategy-dossier");
const { backtestSyntheticMultiLeg } = require("./options-synthetic-backtest");

const DATA_UNAVAILABLE = "Data Unavailable";

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
  const oi = Math.max(...legs.map((l) => l?.openInterest ?? 0), 0);
  const vol = Math.max(...legs.map((l) => l?.volume ?? 0), 0);
  if (oi >= 50000 && vol >= 500) return "High";
  if (oi >= 15000 && vol >= 100) return "Medium";
  if (oi > 0 || vol > 0) return "Low";
  return null;
}

function round2(n) {
  return Number(Number(n).toFixed(2));
}

/**
 * Institutional position sizing from verified premiums + payoff engine.
 * Max profit/loss never derived from management targets.
 */
function buildInstitutionalSizing({
  netPremium,
  lotSize,
  payoff,
  strategyType,
  spot,
  openCharges,
} = {}) {
  const lotOk = lotSize != null && Number.isFinite(Number(lotSize)) && Number(lotSize) > 0;
  const lot = lotOk ? Number(lotSize) : null;
  const netOk = netPremium != null && Number.isFinite(Number(netPremium));
  const isCredit = netOk && netPremium < 0;
  const premiumPerUnit = netOk ? Math.abs(netPremium) : null;
  const premiumPerLot =
    lotOk && premiumPerUnit != null ? round2(premiumPerUnit * lot) : null;

  // Debit strategies: capital ≈ net premium × lot (margin extra for multi-leg not fabricated).
  // Credit strategies: capital/margin requires SPAN — not available from public feed.
  const capitalRequired = !isCredit && premiumPerLot != null ? premiumPerLot : null;
  const investmentAmount = capitalRequired;

  const maxProfitUnit = payoff?.maxProfitUnlimited
    ? null
    : payoff?.maxProfit ?? null;
  const maxLossUnit = payoff?.maxLossUnlimited ? null : payoff?.maxLoss ?? null;

  const maxProfitLot =
    payoff?.maxProfitLot != null
      ? payoff.maxProfitLot
      : lotOk && maxProfitUnit != null
        ? round2(maxProfitUnit * lot)
        : null;
  const maxLossLot =
    payoff?.maxLossLot != null
      ? payoff.maxLossLot
      : lotOk && maxLossUnit != null
        ? round2(maxLossUnit * lot)
        : null;

  const riskRewardRatio =
    maxLossUnit != null && maxLossUnit > 0 && maxProfitUnit != null
      ? round2(maxProfitUnit / maxLossUnit)
      : payoff?.riskRewardRatio ?? null;

  const percentageReturn =
    capitalRequired != null &&
    capitalRequired > 0 &&
    maxProfitLot != null &&
    !payoff?.maxProfitUnlimited
      ? round2((maxProfitLot / capitalRequired) * 100)
      : null;

  const riskPerShare = maxLossUnit;
  const portfolioExposure =
    lotOk && spot != null && Number.isFinite(Number(spot))
      ? round2(Number(spot) * lot)
      : null;

  const netOfCharges = applyChargesToPayoff({
    maxProfit: maxProfitLot,
    maxLoss: maxLossLot,
    maxProfitUnlimited: payoff?.maxProfitUnlimited,
    maxLossUnlimited: payoff?.maxLossUnlimited,
    openCharges,
  });

  return {
    available: lotOk && (payoff?.available === true || netOk),
    lotSize: lot,
    entryPremiumPerUnit: premiumPerUnit,
    premiumPerLot,
    isCredit,
    capitalRequired,
    investmentAmount,
    marginNote: isCredit
      ? "Credit structure — SPAN/exposure margin set by broker; not published on NSE chain API"
      : capitalRequired != null
        ? "Debit premium × lot size (verified NSE premium)"
        : DATA_UNAVAILABLE,
    maxProfitPerUnit: maxProfitUnit,
    maxLossPerUnit: maxLossUnit,
    maxProfitLot,
    maxLossLot,
    maxProfitUnlimited: payoff?.maxProfitUnlimited === true,
    maxLossUnlimited: payoff?.maxLossUnlimited === true,
    breakEven: payoff?.breakEvenDisplay ?? null,
    breakEvens: payoff?.breakEvens ?? [],
    riskPerShare,
    riskRewardRatio,
    percentageReturn,
    portfolioExposure,
    openCharges: openCharges || null,
    netOfCharges,
    strategyType: strategyType || null,
    spot: spot ?? null,
    source: "NSE verified premiums × lot size + standard expiry payoff formulas",
    note: !lotOk
      ? "Lot size unavailable from NSE chain — per-lot rupee figures cannot be shown"
      : null,
  };
}

function buildAnalytics(legs, chain, ivMetrics = null) {
  const primary = legs[0];
  if (!primary) return { available: false, message: DATA_UNAVAILABLE };
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
    ivNote:
      rank?.available || pct?.available
        ? `IV metrics from ${ivMetrics?.historyPoints ?? 0} verified NSE sessions`
        : rank?.reason ||
          pct?.reason ||
          "IV rank/percentile requires verified historical ATM IV — not estimated",
    delta: primary.delta ?? null,
    gamma: primary.gamma ?? null,
    theta: primary.theta ?? null,
    vega: primary.vega ?? null,
    putCallRatio: chain?.putCallRatio ?? null,
    liquidityRating: liquidityRating(legs),
    greeksSource:
      primary.delta != null ? "NSE option chain" : "Greeks unavailable from NSE feed",
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

function buildLegs(chain, strikes, types, expiry, actions) {
  const legs = [];
  for (let i = 0; i < strikes.length; i++) {
    const leg = getLegAtStrike(chain, strikes[i], types[i], expiry);
    if (!leg || leg.premium == null) return null;
    const action =
      Array.isArray(actions) && actions[i]
        ? actions[i]
        : i === 0
          ? "BUY"
          : "SELL";
    legs.push({ ...leg, action });
  }
  return legs;
}

function makeStrategy(base, ctx) {
  const legs = base.strikes || [];
  const spot = ctx.price ?? ctx.chain?.underlying ?? null;
  const lotSize = ctx.lotSize ?? null;
  const analytics = buildAnalytics(legs, ctx.chain, ctx.ivMetrics);

  let strategy = {
    ...base,
    analytics,
    lastUpdated: new Date().toISOString(),
  };

  const hasLegs = legs.some(
    (s) => s?.premium != null && (s.action === "BUY" || s.action === "SELL")
  );

  if (hasLegs) {
    strategy = enrichStrategyWithPayoff(strategy, { spot, lotSize });
  } else {
    strategy.payoff = {
      available: false,
      message: DATA_UNAVAILABLE,
      reason: "Verified option premiums required for payoff calculation",
    };
    strategy.maxRisk = null;
    strategy.maxReward = null;
    strategy.riskRewardRatio = null;
  }

  const openCharges = hasLegs
    ? estimateStrategyOpenCharges(strategy.strikes || legs, lotSize, {
        brokeragePerLeg: 0, // never invent brokerage
        slippage: null,
      })
    : { available: false };

  const sizing = buildInstitutionalSizing({
    netPremium: strategy.premiums?.net ?? base.premiums?.net,
    lotSize,
    payoff: strategy.payoff,
    strategyType: base.type,
    spot,
    openCharges,
  });

  // Management targets (premium multiples) — NOT max profit
  // Never invent lot size: missing lot → null rupee targets (same policy as capitalRequired)
  const t1 = base.targets?.t1;
  const t2 = base.targets?.t2;
  const lotOk = lotSize != null && Number.isFinite(Number(lotSize)) && Number(lotSize) > 0;
  const lot = lotOk ? Number(lotSize) : null;
  const netPrem = strategy.premiums?.net;
  const profitAtT1 =
    lotOk && typeof t1 === "number" && netPrem != null && netPrem > 0
      ? round2(t1 * lot)
      : null;
  const profitAtT2 =
    lotOk && typeof t2 === "number" && netPrem != null && netPrem > 0
      ? round2(t2 * lot)
      : null;
  const rocT1 =
    profitAtT1 != null && sizing.capitalRequired > 0
      ? round2((profitAtT1 / sizing.capitalRequired) * 100)
      : null;

  // Prefer payoff-engine max risk/reward (already set by enrich)
  const maxRisk = strategy.maxRisk;
  const maxReward = strategy.maxReward;
  const rr = strategy.riskRewardRatio ?? sizing.riskRewardRatio;

  return {
    ...strategy,
    maxRisk,
    maxReward,
    riskRewardRatio: rr,
    // Lot-level convenience fields for UI
    maxRiskLot: sizing.maxLossLot,
    maxRewardLot: sizing.maxProfitLot,
    positionSizing: {
      ...sizing,
      estimatedProfitT1: profitAtT1,
      estimatedProfitT2: profitAtT2,
      returnOnCapitalT1: rocT1,
    },
    summary: {
      maxProfit: strategy.payoff?.maxProfitUnlimited
        ? "Unlimited"
        : sizing.maxProfitLot ?? sizing.maxProfitPerUnit,
      maxLoss: strategy.payoff?.maxLossUnlimited
        ? "Unlimited"
        : sizing.maxLossLot ?? sizing.maxLossPerUnit,
      breakEven: sizing.breakEven,
      entryPremium: sizing.entryPremiumPerUnit,
      capitalRequired: sizing.capitalRequired,
      rewardRisk: rr,
      percentageReturn: sizing.percentageReturn,
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
    spot,
  };

  // Long CE
  const ceLeg = getLegAtStrike(chain, atm, "CE", expiry);
  if (ceLeg?.premium != null && ctx.trend !== "BEARISH") {
    const prem = ceLeg.premium;
    candidates.push(
      makeStrategy(
        {
          ...meta,
          name: `${ctx.nseSymbol} Long Call`,
          type: "Long CE",
          bias: "Bullish",
          strikes: [{ ...ceLeg, action: "BUY" }],
          premiums: { net: prem },
          entryZone: {
            low: round2(prem * 0.95),
            high: round2(prem * 1.05),
          },
          stopLoss: round2(prem * 0.5),
          targets: { t1: round2(prem * 1.5), t2: round2(prem * 2) },
          exitConditions: [
            "Book 50% at Target 1 (management level, not max profit)",
            "Trail stop below entry on Target 2",
            "Exit on close below 20 DMA",
            `Time exit 5 days before ${expiry}`,
          ],
          timeExit: `5 sessions before ${expiry}`,
          indicatorExit: "RSI bearish divergence or MACD bearish crossover",
          holdingPeriod: "2–4 weeks",
          status: "Active",
          entryTrigger:
            resistance != null
              ? `Breakout above ${resistance} with volume confirmation`
              : "Bullish trend with rising volume",
          why: [
            ctx.trend === "BULLISH" ? "Bullish technical trend" : "Constructive price action",
            ctx.relativeStrength?.vsNifty > 0 ? "Outperforming NIFTY 50" : null,
            chain.putCallRatio > 1 ? "Put-heavy OI — contrarian bullish" : "Call buying interest",
            ctx.volumeTrend === "Rising" ? "High volume confirmation" : null,
          ].filter(Boolean),
        },
        ctx
      )
    );
  }

  // Long PE
  const peLeg = getLegAtStrike(chain, atm, "PE", expiry);
  if (peLeg?.premium != null && ctx.trend !== "BULLISH") {
    const prem = peLeg.premium;
    candidates.push(
      makeStrategy(
        {
          ...meta,
          name: `${ctx.nseSymbol} Long Put`,
          type: "Long PE",
          bias: "Bearish",
          strikes: [{ ...peLeg, action: "BUY" }],
          premiums: { net: prem },
          entryZone: {
            low: round2(prem * 0.95),
            high: round2(prem * 1.05),
          },
          stopLoss: round2(prem * 0.5),
          targets: { t1: round2(prem * 1.5), t2: round2(prem * 2) },
          exitConditions: [
            "Book at Target 1 (management)",
            "Stop on reclaim above 20 DMA",
            `Time exit before ${expiry}`,
          ],
          timeExit: `5 sessions before ${expiry}`,
          indicatorExit: "MACD bullish crossover",
          holdingPeriod: "2–4 weeks",
          status: "Active",
          entryTrigger:
            support != null ? `Breakdown below ${support}` : "Bearish momentum confirmation",
          why: [
            "Bearish technical bias",
            "Put OI/volume watch",
            ctx.sectorOutlook === "Bearish" ? "Weak sector backdrop" : null,
          ].filter(Boolean),
        },
        ctx
      )
    );
  }

  // Bull Call Spread — BUY lower CE, SELL higher CE
  if (otmCall && otmCall !== atm && otmCall > atm) {
    const legs = buildLegs(chain, [atm, otmCall], ["CE", "CE"], expiry, ["BUY", "SELL"]);
    if (legs) {
      const debit = round2(legs[0].premium - legs[1].premium);
      if (debit > 0) {
        candidates.push(
          makeStrategy(
            {
              ...meta,
              name: `${ctx.nseSymbol} Bull Call Spread`,
              type: "Bull Call Spread",
              bias: "Bullish",
              strikes: legs,
              premiums: { net: debit },
              entryZone: { low: round2(debit * 0.95), high: round2(debit * 1.05) },
              stopLoss: round2(debit * 0.5),
              targets: { t1: round2(debit * 2), t2: round2(debit * 3) },
              exitConditions: ["Exit at 80% of mathematical max profit", "Stop at 50% of debit"],
              timeExit: `3 sessions before ${expiry}`,
              indicatorExit: "Spot closes below long strike",
              holdingPeriod: "Monthly expiry",
              status: ctx.trend !== "BEARISH" ? "Active" : "Wait",
              entryTrigger: `Spot holding above ${atm}`,
              why: [
                "Defined-risk bullish play",
                "Lower premium outlay vs naked call",
                "Favorable for IV contraction",
              ],
            },
            ctx
          )
        );
      }
    }
  }

  // Bear Put Spread — BUY higher PE, SELL lower PE
  if (otmPut && otmPut !== atm && otmPut < atm) {
    const legs = buildLegs(chain, [atm, otmPut], ["PE", "PE"], expiry, ["BUY", "SELL"]);
    if (legs) {
      const debit = round2(legs[0].premium - legs[1].premium);
      if (debit > 0) {
        candidates.push(
          makeStrategy(
            {
              ...meta,
              name: `${ctx.nseSymbol} Bear Put Spread`,
              type: "Bear Put Spread",
              bias: "Bearish",
              strikes: legs,
              premiums: { net: debit },
              entryZone: { low: round2(debit * 0.95), high: round2(debit * 1.05) },
              stopLoss: round2(debit * 0.5),
              targets: { t1: round2(debit * 2), t2: round2(debit * 3) },
              exitConditions: ["Exit at 80% of mathematical max profit", "Stop at 50% debit"],
              timeExit: `3 sessions before ${expiry}`,
              indicatorExit: "Spot reclaims 20 DMA",
              holdingPeriod: "Monthly expiry",
              status: ctx.trend !== "BULLISH" ? "Active" : "Wait",
              entryTrigger: `Spot below ${atm} with weakness`,
              why: ["Defined-risk bearish play", "Portfolio hedge candidate"],
            },
            ctx
          )
        );
      }
    }
  }

  // Bull Put Credit — SELL higher PE, BUY lower PE
  if (otmPut && farPut && otmPut > farPut) {
    const legs = buildLegs(chain, [otmPut, farPut], ["PE", "PE"], expiry, ["SELL", "BUY"]);
    if (legs) {
      const credit = round2(legs[0].premium - legs[1].premium);
      if (credit > 0) {
        candidates.push(
          makeStrategy(
            {
              ...meta,
              name: `${ctx.nseSymbol} Bull Put Spread`,
              type: "Bull Put Spread",
              bias: "Bullish",
              strikes: legs,
              premiums: { net: -credit },
              entryZone: { low: round2(credit * 0.9), high: round2(credit * 1.1) },
              stopLoss: round2(credit * 2),
              targets: { t1: round2(credit * 0.5), t2: credit },
              exitConditions: ["Book 50% of credit", "Exit if spot breaches short strike"],
              timeExit: `2 sessions before ${expiry}`,
              indicatorExit: "Support breakdown",
              holdingPeriod: "Monthly",
              status: support != null && spot > support ? "Active" : "Wait",
              entryTrigger:
                support != null
                  ? `Spot holding above ${support}`
                  : "Awaiting verified market confirmation.",
              why: ["Support holding", "Premium collection on OTM puts"],
            },
            ctx
          )
        );
      }
    }
  }

  // Bear Call Credit — SELL lower CE, BUY higher CE
  if (otmCall && farCall && farCall > otmCall) {
    const legs = buildLegs(chain, [otmCall, farCall], ["CE", "CE"], expiry, ["SELL", "BUY"]);
    if (legs) {
      const credit = round2(legs[0].premium - legs[1].premium);
      if (credit > 0) {
        candidates.push(
          makeStrategy(
            {
              ...meta,
              name: `${ctx.nseSymbol} Bear Call Spread`,
              type: "Bear Call Spread",
              bias: "Bearish",
              strikes: legs,
              premiums: { net: -credit },
              entryZone: { low: round2(credit * 0.9), high: round2(credit * 1.1) },
              stopLoss: round2(credit * 2),
              targets: { t1: round2(credit * 0.5), t2: credit },
              exitConditions: ["Book 50% of credit", "Exit on resistance breakout"],
              timeExit: `2 sessions before ${expiry}`,
              indicatorExit: "Breakout above resistance",
              holdingPeriod: "Monthly",
              status: resistance != null && spot < resistance ? "Active" : "Wait",
              entryTrigger:
                resistance != null
                  ? `Spot below ${resistance}`
                  : "Awaiting verified market confirmation.",
              why: [
                "Resistance capping upside",
                chain.highestCallOi ? `High call OI at ${chain.highestCallOi}` : "Elevated call OI",
              ],
            },
            ctx
          )
        );
      }
    }
  }

  // Long Straddle when both ATM premiums exist
  if (ceLeg?.premium != null && peLeg?.premium != null) {
    const debit = round2(ceLeg.premium + peLeg.premium);
    if (debit > 0) {
      candidates.push(
        makeStrategy(
          {
            ...meta,
            name: `${ctx.nseSymbol} Long Straddle`,
            type: "Long Straddle",
            bias: "Neutral",
            strikes: [
              { ...ceLeg, action: "BUY" },
              { ...peLeg, action: "BUY" },
            ],
            premiums: { net: debit },
            entryZone: { low: round2(debit * 0.95), high: round2(debit * 1.05) },
            stopLoss: round2(debit * 0.5),
            targets: { t1: "Move beyond break-evens", t2: null },
            exitConditions: [
              "Exit on IV crush without expansion",
              "Book on strong directional move",
              `Time exit before ${expiry}`,
            ],
            holdingPeriod: "Event / volatility window",
            status: ctx.trend === "NEUTRAL" ? "Active" : "Wait",
            entryTrigger: "Expect large move; elevated event risk",
            why: ["Volatility expansion play", "Defined max loss = net debit"],
          },
          ctx
        )
      );
    }
  }

  return candidates;
}

function attachEquityFnoDossier(strategy, ctx) {
  const scoring = scoreStrategy(strategy, ctx);
  const why = strategy.why || [];
  const factors = splitFactors(why);
  const hasPremiums = Array.isArray(strategy.strikes)
    ? strategy.strikes.some((s) => s && s.premium != null)
    : false;

  const fields = [
    { name: "spot", available: ctx?.price != null },
    { name: "trend", available: !!ctx?.trend },
    { name: "rsi", available: ctx?.rsi != null },
    { name: "support", available: ctx?.support != null },
    { name: "resistance", available: ctx?.resistance != null },
    { name: "option_premiums", available: hasPremiums },
    { name: "liquidity", available: !!strategy.analytics?.liquidityRating },
    { name: "relative_strength", available: ctx?.relativeStrength != null },
    { name: "hist_vol", available: ctx?.histVol != null },
    { name: "sector", available: !!ctx?.sectorOutlook },
    { name: "chain", available: ctx?.chain?.available === true },
  ];

  const bias = strategy.bias;
  const agreements = [
    {
      name: "trend_bias",
      aligned:
        !ctx?.trend || !bias || bias === "Neutral"
          ? null
          : (bias === "Bullish" && ctx.trend === "BULLISH") ||
            (bias === "Bearish" && ctx.trend === "BEARISH"),
    },
    {
      name: "liquidity",
      aligned:
        strategy.analytics?.liquidityRating == null
          ? null
          : strategy.analytics.liquidityRating !== "Low",
    },
  ];

  const candles = ctx?.candles;
  let backtest;
  const hasLegs = Array.isArray(strategy.strikes) && strategy.strikes.some((s) => s?.strike != null);
  if (Array.isArray(candles) && candles.length >= 80 && hasLegs) {
    const synthetic = backtestSyntheticMultiLeg(candles, strategy, {
      holdBars: 12,
      impliedVolPct: ctx?.histVol ?? ctx?.chain?.impliedVolatility ?? null,
    });
    backtest =
      synthetic.available || !strategy.bias || strategy.bias === "Neutral"
        ? synthetic
        : { ...backtestDirectionalProxy(candles, strategy.bias), syntheticAttempt: synthetic };
  } else if (Array.isArray(candles) && candles.length >= 80 && strategy.bias && strategy.bias !== "Neutral") {
    backtest = backtestDirectionalProxy(candles, strategy.bias);
  } else {
    backtest = {
      available: false,
      reason:
        "Backtest could not be completed — multi-leg premium history unavailable; attach ≥80 underlying bars for synthetic BS+HV or directional proxy",
      samples: 0,
      proxyType: "none",
    };
  }

  const confidence = buildConfidenceScore({
    fields,
    agreements,
    backtestQuality: backtest,
  });

  const blended =
    confidence.score != null
      ? Math.round(scoring.confidenceScore * 0.55 + confidence.score * 0.45)
      : scoring.confidenceScore;

  const thesis = why
    .map((w) => (typeof w === "string" ? w : w?.text))
    .filter(Boolean)
    .slice(0, 3)
    .join(" ") ||
    `${strategy.name || "Equity F&O strategy"} from verified chain + technical context.`;

  const dossier = buildInvestmentDossier({
    symbol: strategy.symbol || ctx?.symbol || null,
    name: strategy.name,
    action: strategy.status === "Active" ? "CONSIDER" : strategy.status || "WATCH",
    price: ctx?.price ?? null,
    horizon: strategy.holdingPeriod || "Until monthly expiry / defined exit",
    investorProfile:
      "F&O-enabled investors with derivatives experience; unsuitable for guaranteed-return mandates",
    thesis,
    bullishFactors: factors.bullish,
    bearishFactors: factors.bearish,
    riskFactors: [
      "Equity options can expire worthless; gap risk around events",
      strategy.analytics?.liquidityRating === "Low"
        ? "Low options liquidity — wider spreads and fill risk"
        : null,
    ].filter(Boolean),
    technicalSignals: factors.technical,
    fundamentalSignals: factors.fundamental,
    sectorOutlook: ctx?.sectorOutlook || null,
    competitorNote:
      ctx?.relativeStrength != null
        ? `1M relative strength vs NIFTY: ${ctx.relativeStrength.vsNifty ?? ctx.relativeStrength}% (verified returns)`
        : "Relative strength: Data Unavailable",
    valuationSummary: hasPremiums
      ? "Premiums from verified NSE equity option chain"
      : DATA_UNAVAILABLE,
    entry: strategy.entryZone || null,
    entryZones: strategy.entryZone || null,
    targets: strategy.targets || {},
    stopLoss: strategy.stopLoss ?? null,
    riskRewardRatio: strategy.riskRewardRatio ?? null,
    holdingPeriod: strategy.holdingPeriod || null,
    invalidation: (strategy.exitConditions || []).slice(0, 4),
    capitalAllocation: "Size to defined max loss; avoid stacking correlated F&O risk",
    positionSizing: strategy.positionSizing || null,
    confidence: {
      ...confidence,
      score: blended,
      engineStructuralScore: scoring.confidenceScore,
      methodology:
        "Blend of structural strategy fit (55%) and verified multi-factor completeness/agreement (45%). Not a probability of profit.",
    },
    backtest,
    dataClassification: "mixed",
  });

  return {
    confidenceScore: blended,
    confidenceFactors: scoring.factors,
    confidenceDetail: dossier.confidence,
    backtest,
    dossier,
  };
}

function rankTop10(allCandidates, globalContext) {
  return allCandidates
    .map((c) => {
      const ctx = { ...globalContext, ...c._ctx };
      const attached = attachEquityFnoDossier(c, ctx);
      return {
        ...c,
        confidenceScore: attached.confidenceScore,
        confidenceFactors: attached.confidenceFactors,
        confidenceDetail: attached.confidenceDetail,
        backtest: attached.backtest,
        dossier: attached.dossier,
      };
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
  buildInstitutionalSizing,
  makeStrategy,
  attachEquityFnoDossier,
};
