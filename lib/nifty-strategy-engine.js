const { getLegAtStrike, nearestStrike } = require("./nse-options");
const { enrichStrategyWithPayoff } = require("./options-payoff");
const {
  buildConfidenceScore,
  buildInvestmentDossier,
  splitFactors,
  backtestDirectionalProxy,
} = require("./strategy-dossier");
const { backtestSyntheticMultiLeg } = require("./options-synthetic-backtest");

function buildStrategyRationale(strategy, ctx) {
  const reasons = [];
  const {
    trend,
    rsi,
    adx,
    sma20,
    sma50,
    macdHistogram,
    support,
    resistance,
    volumeTrend,
    chain,
    vix,
    fiiDii,
    breadth,
    prediction,
    price,
    monthlyExpiry,
  } = ctx;
  const bias = strategy.bias;

  if (trend) {
    reasons.push({
      category: "Technical",
      text: `NIFTY trend is ${trend} — supports ${bias?.toLowerCase() || "this"} positioning`,
    });
  }
  if (rsi != null) {
    const rsiNote =
      rsi > 70
        ? "overbought zone — manage risk on fresh longs"
        : rsi < 30
          ? "oversold — potential mean-reversion bounce"
          : rsi >= 55 && bias === "Bullish"
            ? "bullish momentum band (RSI 55–70)"
            : rsi <= 45 && bias === "Bearish"
              ? "bearish momentum (RSI below 45)"
              : "neutral momentum";
    reasons.push({ category: "Technical", text: `RSI ${rsi.toFixed(1)}: ${rsiNote}` });
  }
  if (adx != null && adx >= 25) {
    reasons.push({
      category: "Technical",
      text: `ADX ${adx.toFixed(1)} confirms a trending market — favors directional ${strategy.expiryType === "Monthly" ? "monthly" : "weekly"} structures`,
    });
  }
  if (sma20 != null && sma50 != null && price != null) {
    const maNote =
      price > sma20 && sma20 > sma50
        ? "Price above rising 20/50 DMA — bullish structure intact"
        : price < sma20 && sma20 < sma50
          ? "Price below falling 20/50 DMA — bearish structure"
          : "Mixed moving-average alignment — await confirmation";
    reasons.push({ category: "Technical", text: maNote });
  }
  if (macdHistogram != null) {
    reasons.push({
      category: "Technical",
      text: `MACD histogram ${macdHistogram >= 0 ? "positive" : "negative"} — ${macdHistogram >= 0 && bias === "Bullish" ? "momentum supportive" : macdHistogram < 0 && bias === "Bearish" ? "downside momentum intact" : "monitor crossover"}`,
    });
  }
  if (support != null && resistance != null) {
    reasons.push({
      category: "Technical",
      text: `Verified levels: support ${support.toLocaleString()}, resistance ${resistance.toLocaleString()}`,
    });
  }
  if (volumeTrend) {
    reasons.push({
      category: "Technical",
      text: `Volume trend ${volumeTrend} — ${volumeTrend === "Rising" ? "participation confirms move" : "thin participation, wait for confirmation"}`,
    });
  }

  if (fiiDii?.fii?.netValue != null) {
    const fii = fiiDii.fii.netValue;
    reasons.push({
      category: "Fundamental",
      text: `FII net ${fii >= 0 ? "buying" : "selling"} ₹${Math.abs(fii).toLocaleString()} Cr (${fiiDii.date || "latest"}) — ${fii > 0 && bias === "Bullish" ? "institutional tailwind" : fii < 0 && bias === "Bearish" ? "foreign outflow supports defensive bias" : "flows mixed vs trade bias"}`,
    });
  }
  if (fiiDii?.dii?.netValue != null) {
    const dii = fiiDii.dii.netValue;
    reasons.push({
      category: "Fundamental",
      text: `DII net ${dii >= 0 ? "buying" : "selling"} ₹${Math.abs(dii).toLocaleString()} Cr — domestic ${dii > 0 ? "support on dips" : "profit-booking pressure"}`,
    });
  }
  const b = breadth?.advancers != null ? breadth : null;
  if (b?.advancers != null && b?.decliners != null) {
    reasons.push({
      category: "Fundamental",
      text: `NIFTY 500 breadth ${b.advancers}↑ / ${b.decliners}↓ (A/D ${b.advanceDeclineRatio ?? "—"}) — ${b.advancers > b.decliners ? "broad market participation" : "weak or narrow breadth"}`,
    });
  }
  const monthlyOutlook = prediction?.predictions?.monthly;
  if (monthlyOutlook?.signal) {
    reasons.push({
      category: "Fundamental",
      text: `Quant ensemble monthly outlook: ${monthlyOutlook.signal} toward ${monthlyOutlook.target?.toLocaleString()} by ${monthlyOutlook.date} (${monthlyOutlook.confidence}% model confidence)`,
    });
  }
  const weeklyOutlook = prediction?.predictions?.weekly;
  if (weeklyOutlook?.signal && strategy.expiryType === "Weekly") {
    reasons.push({
      category: "Fundamental",
      text: `Weekly ensemble target ${weeklyOutlook.target?.toLocaleString()} (${weeklyOutlook.signal}) — horizon aligned with weekly expiry`,
    });
  }

  const oiChain = strategy.expiryType === "Monthly" ? ctx.monthlyChain || chain : chain;
  if (oiChain?.putCallRatio != null) {
    reasons.push({
      category: "Derivatives",
      text: `Put-Call Ratio ${oiChain.putCallRatio} (NSE OI) — ${oiChain.putCallRatio > 1.1 ? "put-heavy positioning / hedging" : oiChain.putCallRatio < 0.9 ? "call-heavy speculation" : "balanced open interest"}`,
    });
  }
  if (oiChain?.maxPain != null) {
    reasons.push({
      category: "Derivatives",
      text: `Max pain ${oiChain.maxPain.toLocaleString()} for ${strategy.expiry || oiChain.expiry} — OI magnet from verified chain`,
    });
  }
  if (oiChain?.highestCallOi != null && bias === "Bearish") {
    reasons.push({
      category: "Derivatives",
      text: `Highest call OI wall at ${oiChain.highestCallOi.toLocaleString()} — upside supply zone`,
    });
  }
  if (oiChain?.highestPutOi != null && bias === "Bullish") {
    reasons.push({
      category: "Derivatives",
      text: `Highest put OI support at ${oiChain.highestPutOi.toLocaleString()} — institutional put writing zone`,
    });
  }
  const vixVal = typeof vix === "object" ? vix?.value : vix;
  if (vixVal != null) {
    reasons.push({
      category: "Derivatives",
      text: `India VIX ${Number(vixVal).toFixed(2)} — ${vixVal > 18 ? "elevated premiums; defined-risk structures preferred" : "moderate volatility environment"}`,
    });
  }

  if (strategy.expiryType === "Monthly" && strategy.expiry) {
    reasons.push({
      category: "Technical",
      text: `Monthly expiry ${strategy.expiry}${monthlyExpiry && strategy.expiry === monthlyExpiry ? " (last week of month)" : ""} — positional trend capture with lower theta decay vs weekly`,
    });
  }

  return reasons.slice(0, 6);
}

function scoreStrategy(strategy, context) {
  let score = 50;
  const factors = [];

  if (strategy.status === "Active") {
    score += 10;
    factors.push("Verified option chain data");
  } else if (strategy.status === "Wait") {
    score -= 15;
  }

  if (context.trend === "BULLISH" && strategy.bias === "Bullish") {
    score += 12;
    factors.push("Trend alignment");
  }
  if (context.trend === "BEARISH" && strategy.bias === "Bearish") {
    score += 12;
    factors.push("Trend alignment");
  }
  if (context.trend === "NEUTRAL" && strategy.bias === "Neutral") {
    score += 10;
    factors.push("Neutral trend fit");
  }

  if (context.chain?.putCallRatio != null) {
    if (context.chain.putCallRatio > 1.1 && strategy.bias === "Bullish") {
      score += 6;
      factors.push("Put-heavy OI (contrarian bullish)");
    }
    if (context.chain.putCallRatio < 0.9 && strategy.bias === "Bearish") {
      score += 6;
      factors.push("Call-heavy OI (contrarian bearish)");
    }
  }

  if (context.volumeTrend === "Rising") {
    score += 5;
    factors.push("Volume confirmation");
  }

  if (strategy.riskRewardRatio != null && strategy.riskRewardRatio >= 1.5) {
    score += 8;
    factors.push("Favorable risk-reward");
  }

  if (strategy.expiryType === "Monthly" && context.monthlyChain?.available) {
    score += 6;
    factors.push("Verified monthly expiry chain (last week of month)");
  }

  if (context.adx != null && context.adx >= 25) {
    score += 5;
    factors.push("Strong ADX trend");
  }

  if (context.vix != null && context.vix > 18 && strategy.type?.includes("Condor")) {
    score += 5;
    factors.push("Elevated VIX suits premium selling");
  }

  return {
    confidenceScore: Math.max(0, Math.min(100, Math.round(score))),
    factors,
  };
}

function buildLegs(chain, strikes, types) {
  const legs = [];
  for (let i = 0; i < strikes.length; i++) {
    const leg = getLegAtStrike(chain, strikes[i], types[i]);
    if (!leg || leg.premium == null) return null;
    legs.push(leg);
  }
  return legs;
}

function makeStrategy(base, ctx) {
  const spot = ctx?.price ?? ctx?.chain?.underlying ?? null;
  const lotSize = ctx?.lotSize ?? null;

  // Compute max profit / max loss / break-evens from verified premiums only.
  // Never derive "max reward" from trade targets (that was incorrect).
  let enriched = {
    ...base,
    lastUpdated: new Date().toISOString(),
  };

  const hasTradeableLegs =
    Array.isArray(base.strikes) &&
    base.strikes.some((s) => s && s.premium != null && (s.action === "BUY" || s.action === "SELL"));

  if (hasTradeableLegs) {
    enriched = enrichStrategyWithPayoff(enriched, { spot, lotSize });
  } else {
    // Watch / trigger strategies — no fabricated payoff metrics
    enriched.maxRisk = base.maxRisk ?? null;
    enriched.maxReward = base.maxReward ?? null;
    enriched.riskRewardRatio = null;
    enriched.payoff = {
      available: false,
      message: "Data Unavailable",
      reason: "Verified option premiums required for payoff calculation",
    };
  }

  const rr = enriched.riskRewardRatio;
  const why = ctx
    ? buildStrategyRationale({ ...enriched, riskRewardRatio: rr }, ctx)
    : base.why || [];

  return {
    ...enriched,
    why,
  };
}

function generateMonthlyStrategies(monthlyChain, monthlyExpiry, context) {
  const candidates = [];
  if (!monthlyChain?.available || !monthlyExpiry) return candidates;

  const spot = monthlyChain.underlying ?? context.price;
  const atm = monthlyChain.atmStrike ?? nearestStrike(monthlyChain, spot);
  const support = context.support;
  const resistance = context.resistance;
  if (atm == null || spot == null) return candidates;

  const monthlyCtx = { ...context, monthlyChain, monthlyExpiry, chain: monthlyChain };

  const monthlyCe = getLegAtStrike(monthlyChain, atm, "CE", monthlyExpiry);
  if (monthlyCe?.premium != null && context.trend !== "BEARISH") {
    const prem = monthlyCe.premium;
    candidates.push(makeStrategy({
      name: "Monthly Bullish Call",
      type: "Long CE",
      bias: "Bullish",
      expiryType: "Monthly",
      expiry: monthlyExpiry,
      strikes: [{ strike: atm, type: "CE", action: "BUY", premium: prem }],
      premiums: { net: prem },
      entryZone: { low: Number((prem * 0.95).toFixed(2)), high: Number((prem * 1.05).toFixed(2)) },
      stopLoss: Number((prem * 0.4).toFixed(2)),
      targets: { t1: Number((prem * 1.8).toFixed(2)), t2: Number((prem * 2.5).toFixed(2)) },
      exitConditions: [
        "Hold through monthly trend while ADX stays above 20",
        "Book partial at Target 1; trail stop on remainder",
        `Stop on weekly close below 50 DMA or 5 sessions before ${monthlyExpiry}`,
      ],
      maxRisk: prem,
      holdingPeriod: "Until monthly expiry (last week of month)",
      status: "Active",
      entryTrigger:
        resistance != null
          ? `Monthly bullish bias — enter on hold above ${resistance} with ADX ≥ 25`
          : "Monthly trend bullish with ADX confirmation",
    }, monthlyCtx));
  }

  const monthlyPe = getLegAtStrike(monthlyChain, atm, "PE", monthlyExpiry);
  if (monthlyPe?.premium != null && context.trend !== "BULLISH") {
    const prem = monthlyPe.premium;
    candidates.push(makeStrategy({
      name: "Monthly Bearish Put",
      type: "Long PE",
      bias: "Bearish",
      expiryType: "Monthly",
      expiry: monthlyExpiry,
      strikes: [{ strike: atm, type: "PE", action: "BUY", premium: prem }],
      premiums: { net: prem },
      entryZone: { low: Number((prem * 0.95).toFixed(2)), high: Number((prem * 1.05).toFixed(2)) },
      stopLoss: Number((prem * 0.4).toFixed(2)),
      targets: { t1: Number((prem * 1.8).toFixed(2)), t2: Number((prem * 2.5).toFixed(2)) },
      exitConditions: [
        "Book partial at Target 1 on downside extension",
        "Stop on weekly close above 50 DMA",
        `Time exit 5 sessions before ${monthlyExpiry}`,
      ],
      maxRisk: prem,
      holdingPeriod: "Until monthly expiry (last week of month)",
      status: "Active",
      entryTrigger:
        support != null
          ? `Monthly bearish bias — enter on breakdown below ${support}`
          : "Monthly trend bearish with momentum confirmation",
    }, monthlyCtx));
  }

  const otmCallStrike = nearestStrike(monthlyChain, spot + 200);
  if (otmCallStrike && otmCallStrike !== atm && context.trend !== "BEARISH") {
    const legs = [atm, otmCallStrike].map((s, i) => getLegAtStrike(monthlyChain, s, "CE", monthlyExpiry));
    if (legs.every((l) => l?.premium != null)) {
      const debit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          name: "Monthly Bull Call Spread",
          type: "Bull Call Spread",
          bias: "Bullish",
          expiryType: "Monthly",
          expiry: monthlyExpiry,
          strikes: [
            { strike: atm, type: "CE", action: "BUY", premium: legs[0].premium },
            { strike: otmCallStrike, type: "CE", action: "SELL", premium: legs[1].premium },
          ],
          premiums: { net: debit },
          entryZone: { low: Number((debit * 0.95).toFixed(2)), high: Number((debit * 1.05).toFixed(2)) },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: Number((debit * 2).toFixed(2)), t2: Number((debit * 3).toFixed(2)) },
          exitConditions: ["Exit at 80% of max profit", "Stop at 50% of debit", `Roll 5 sessions before ${monthlyExpiry}`],
          maxRisk: debit,
          maxReward: Number(((otmCallStrike - atm) - debit).toFixed(2)),
          holdingPeriod: "Until monthly expiry (last week of month)",
          status: "Active",
          entryTrigger: `Spot above ${atm} with monthly bullish ensemble alignment`,
        }, monthlyCtx));
      }
    }
  }

  return candidates;
}

function generateCandidates(chain, context) {
  const candidates = [];
  const spot = chain?.underlying ?? context.price;
  const atm = chain?.atmStrike ?? nearestStrike(chain, spot);
  const expiry = chain?.expiry;
  const support = context.support;
  const resistance = context.resistance;

  if (!chain?.available || atm == null || spot == null) {
    return candidates;
  }

  const otmCallStrike = nearestStrike(chain, spot + 200);
  const otmPutStrike = nearestStrike(chain, spot - 200);
  const itmCallStrike = nearestStrike(chain, spot - 100);
  const itmPutStrike = nearestStrike(chain, spot + 100);

  // 1. Long CE (bullish)
  const longCeLegs = buildLegs(chain, [atm], ["CE"]);
  if (longCeLegs && context.trend !== "BEARISH") {
    const prem = longCeLegs[0].premium;
    candidates.push(makeStrategy({
      name: "Long ATM Call",
      type: "Long CE",
      bias: "Bullish",
      expiryType: "Weekly",
      expiry,
      strikes: [{ strike: atm, type: "CE", action: "BUY", premium: prem }],
      premiums: { net: prem },
      entryZone: { low: prem * 0.95, high: prem * 1.05 },
      stopLoss: Number((prem * 0.5).toFixed(2)),
      targets: { t1: Number((prem * 1.5).toFixed(2)), t2: Number((prem * 2).toFixed(2)) },
      exitConditions: ["Book 50% at Target 1", "Trail stop below entry on Target 2", "Exit on spot close below 20 DMA"],
      maxRisk: prem,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      status: "Active",
      entryTrigger: resistance != null ? `Breakout above ${resistance} with volume` : "Bullish trend confirmation",
    }, context));
  }

  // 2. Long PE (bearish)
  const longPeLegs = buildLegs(chain, [atm], ["PE"]);
  if (longPeLegs && context.trend !== "BULLISH") {
    const prem = longPeLegs[0].premium;
    candidates.push(makeStrategy({
      name: "Long ATM Put",
      type: "Long PE",
      bias: "Bearish",
      expiryType: "Weekly",
      expiry,
      strikes: [{ strike: atm, type: "PE", action: "BUY", premium: prem }],
      premiums: { net: prem },
      entryZone: { low: prem * 0.95, high: prem * 1.05 },
      stopLoss: Number((prem * 0.5).toFixed(2)),
      targets: { t1: Number((prem * 1.5).toFixed(2)), t2: Number((prem * 2).toFixed(2)) },
      exitConditions: ["Book at Target 1", "Stop on spot reclaim above 20 DMA", "Time exit 2 days before expiry"],
      maxRisk: prem,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      status: "Active",
      entryTrigger: support != null ? `Breakdown below ${support}` : "Bearish trend confirmation",
    }, context));
  }

  // 3. Bull Call Spread
  if (otmCallStrike && otmCallStrike !== atm) {
    const legs = buildLegs(chain, [atm, otmCallStrike], ["CE", "CE"]);
    if (legs) {
      const debit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          name: "Bull Call Spread",
          type: "Bull Call Spread",
          bias: "Bullish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: atm, type: "CE", action: "BUY", premium: legs[0].premium },
            { strike: otmCallStrike, type: "CE", action: "SELL", premium: legs[1].premium },
          ],
          premiums: { net: debit },
          entryZone: { low: debit * 0.95, high: debit * 1.05 },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: Number((debit * 2).toFixed(2)), t2: Number((debit * 3).toFixed(2)) },
          exitConditions: ["Exit at 80% of max profit", "Stop at 50% of debit", "Roll if spot below long strike at expiry"],
          maxRisk: debit,
          maxReward: Number(((otmCallStrike - atm) - debit).toFixed(2)),
          holdingPeriod: "Weekly expiry",
          status: "Active",
          entryTrigger: `Spot above ${atm} with bullish momentum`,
        }, context));
      }
    }
  }

  // 4. Bear Put Spread
  if (otmPutStrike && otmPutStrike !== atm) {
    const legs = buildLegs(chain, [atm, otmPutStrike], ["PE", "PE"]);
    if (legs) {
      const debit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          name: "Bear Put Spread",
          type: "Bear Put Spread",
          bias: "Bearish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: atm, type: "PE", action: "BUY", premium: legs[0].premium },
            { strike: otmPutStrike, type: "PE", action: "SELL", premium: legs[1].premium },
          ],
          premiums: { net: debit },
          entryZone: { low: debit * 0.95, high: debit * 1.05 },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: Number((debit * 2).toFixed(2)), t2: Number((debit * 3).toFixed(2)) },
          exitConditions: ["Exit at 80% max profit", "Stop at 50% debit", "Time exit before expiry"],
          maxRisk: debit,
          maxReward: Number(((atm - otmPutStrike) - debit).toFixed(2)),
          holdingPeriod: "Weekly expiry",
          status: "Active",
          entryTrigger: `Spot below ${atm} with bearish momentum`,
        }, context));
      }
    }
  }

  // 5. Iron Condor (neutral)
  const icPutSell = otmPutStrike;
  const icPutBuy = nearestStrike(chain, spot - 400);
  const icCallSell = otmCallStrike;
  const icCallBuy = nearestStrike(chain, spot + 400);
  if (icPutSell && icCallSell && icPutBuy && icCallBuy) {
    const legs = buildLegs(chain, [icPutBuy, icPutSell, icCallSell, icCallBuy], ["PE", "PE", "CE", "CE"]);
    if (legs) {
      const credit = Number((legs[1].premium + legs[2].premium - legs[0].premium - legs[3].premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          name: "Short Iron Condor",
          type: "Iron Condor",
          bias: "Neutral",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: icPutBuy, type: "PE", action: "BUY", premium: legs[0].premium },
            { strike: icPutSell, type: "PE", action: "SELL", premium: legs[1].premium },
            { strike: icCallSell, type: "CE", action: "SELL", premium: legs[2].premium },
            { strike: icCallBuy, type: "CE", action: "BUY", premium: legs[3].premium },
          ],
          premiums: { net: -credit },
          entryZone: { low: credit * 0.9, high: credit * 1.1 },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: Number((credit * 0.8).toFixed(2)) },
          exitConditions: ["Book at 50% of max credit", "Exit if spot breaches short strikes", "Close 1 day before expiry"],
          maxRisk: Number(((icPutSell - icPutBuy) - credit).toFixed(2)),
          maxReward: credit,
          holdingPeriod: "Weekly expiry",
          status: context.trend === "NEUTRAL" ? "Active" : "Wait",
          entryTrigger: "Range-bound market between support and resistance",
        }, context));
      }
    }
  }

  // 6. Bull Put Credit Spread — SELL higher put, BUY lower put
  // otmPutStrike ≈ spot−200 (lower), shortPut ≈ closer to ATM (higher than OTM wing)
  const shortPutStrike = nearestStrike(chain, spot - 100);
  const longPutWing = nearestStrike(chain, spot - 300);
  if (
    shortPutStrike &&
    longPutWing &&
    shortPutStrike > longPutWing
  ) {
    const shortLeg = getLegAtStrike(chain, shortPutStrike, "PE");
    const longLeg = getLegAtStrike(chain, longPutWing, "PE");
    if (shortLeg?.premium != null && longLeg?.premium != null) {
      const credit = Number((shortLeg.premium - longLeg.premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          name: "Bull Put Credit Spread",
          type: "Bull Put Spread",
          bias: "Bullish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: shortPutStrike, type: "PE", action: "SELL", premium: shortLeg.premium },
            { strike: longPutWing, type: "PE", action: "BUY", premium: longLeg.premium },
          ],
          premiums: { net: -credit },
          entryZone: { low: credit * 0.9, high: credit * 1.1 },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit if spot below short put strike"],
          holdingPeriod: "Weekly",
          status: support != null && spot > support ? "Active" : "Wait",
          entryTrigger: support != null ? `Spot holding above ${support}` : "Bullish support hold",
        }, context));
      }
    }
  }

  // 7. Bear Call Credit Spread — SELL lower call, BUY higher call
  const shortCallStrike = nearestStrike(chain, spot + 100);
  const longCallWing = nearestStrike(chain, spot + 300);
  if (
    shortCallStrike &&
    longCallWing &&
    longCallWing > shortCallStrike
  ) {
    const shortLeg = getLegAtStrike(chain, shortCallStrike, "CE");
    const longLeg = getLegAtStrike(chain, longCallWing, "CE");
    if (shortLeg?.premium != null && longLeg?.premium != null) {
      const credit = Number((shortLeg.premium - longLeg.premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          name: "Bear Call Credit Spread",
          type: "Bear Call Spread",
          bias: "Bearish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: shortCallStrike, type: "CE", action: "SELL", premium: shortLeg.premium },
            { strike: longCallWing, type: "CE", action: "BUY", premium: longLeg.premium },
          ],
          premiums: { net: -credit },
          entryZone: { low: credit * 0.9, high: credit * 1.1 },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit on resistance breakout"],
          holdingPeriod: "Weekly",
          status: resistance != null && spot < resistance ? "Active" : "Wait",
          entryTrigger: resistance != null ? `Spot below resistance ${resistance}` : "Near resistance rejection",
        }, context));
      }
    }
  }

  // 8. Long Straddle — buy ATM CE + ATM PE
  {
    const ce = getLegAtStrike(chain, atm, "CE");
    const pe = getLegAtStrike(chain, atm, "PE");
    if (ce?.premium != null && pe?.premium != null) {
      const debit = Number((ce.premium + pe.premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          name: "Long ATM Straddle",
          type: "Long Straddle",
          bias: "Neutral",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: atm, type: "CE", action: "BUY", premium: ce.premium },
            { strike: atm, type: "PE", action: "BUY", premium: pe.premium },
          ],
          premiums: { net: debit },
          entryZone: { low: Number((debit * 0.95).toFixed(2)), high: Number((debit * 1.05).toFixed(2)) },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: "Directional break beyond break-evens", t2: null },
          exitConditions: ["Exit if IV collapses without move", "Book on strong directional expansion", "Time exit before expiry"],
          holdingPeriod: "1–5 sessions",
          status: context.trend === "NEUTRAL" ? "Active" : "Wait",
          entryTrigger: "Expect large move; elevated event risk or range compression",
        }, context));
      }
    }
  }

  // 9. Long Strangle — buy OTM CE + OTM PE
  if (otmCallStrike && otmPutStrike && otmCallStrike > otmPutStrike) {
    const ce = getLegAtStrike(chain, otmCallStrike, "CE");
    const pe = getLegAtStrike(chain, otmPutStrike, "PE");
    if (ce?.premium != null && pe?.premium != null) {
      const debit = Number((ce.premium + pe.premium).toFixed(2));
      if (debit > 0) {
        candidates.push(makeStrategy({
          name: "Long OTM Strangle",
          type: "Long Strangle",
          bias: "Neutral",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: otmCallStrike, type: "CE", action: "BUY", premium: ce.premium },
            { strike: otmPutStrike, type: "PE", action: "BUY", premium: pe.premium },
          ],
          premiums: { net: debit },
          entryZone: { low: Number((debit * 0.95).toFixed(2)), high: Number((debit * 1.05).toFixed(2)) },
          stopLoss: Number((debit * 0.5).toFixed(2)),
          targets: { t1: "Break beyond outer strikes + debit", t2: null },
          exitConditions: ["Exit on IV crush without expansion", "Book on strong trend day", "Time exit before expiry"],
          holdingPeriod: "1–5 sessions",
          status: context.trend === "NEUTRAL" ? "Active" : "Wait",
          entryTrigger: "Expect large move with cheaper premium than straddle",
        }, context));
      }
    }
  }

  // 10. Iron Butterfly — short ATM straddle + long wings
  {
    const wingPut = nearestStrike(chain, spot - 300);
    const wingCall = nearestStrike(chain, spot + 300);
    if (wingPut && wingCall && wingPut < atm && wingCall > atm) {
      const shortCe = getLegAtStrike(chain, atm, "CE");
      const shortPe = getLegAtStrike(chain, atm, "PE");
      const longPe = getLegAtStrike(chain, wingPut, "PE");
      const longCe = getLegAtStrike(chain, wingCall, "CE");
      if ([shortCe, shortPe, longPe, longCe].every((l) => l?.premium != null)) {
        const credit = Number(
          (shortCe.premium + shortPe.premium - longPe.premium - longCe.premium).toFixed(2)
        );
        if (credit > 0) {
          candidates.push(makeStrategy({
            name: "Iron Butterfly",
            type: "Iron Butterfly",
            bias: "Neutral",
            expiryType: "Weekly",
            expiry,
            strikes: [
              { strike: wingPut, type: "PE", action: "BUY", premium: longPe.premium },
              { strike: atm, type: "PE", action: "SELL", premium: shortPe.premium },
              { strike: atm, type: "CE", action: "SELL", premium: shortCe.premium },
              { strike: wingCall, type: "CE", action: "BUY", premium: longCe.premium },
            ],
            premiums: { net: -credit },
            entryZone: { low: credit * 0.9, high: credit * 1.1 },
            stopLoss: Number((credit * 2).toFixed(2)),
            targets: { t1: Number((credit * 0.5).toFixed(2)), t2: Number((credit * 0.8).toFixed(2)) },
            exitConditions: ["Book 50% of credit", "Exit if spot breaches short strikes decisively", "Close before expiry"],
            holdingPeriod: "Weekly expiry",
            status: context.trend === "NEUTRAL" ? "Active" : "Wait",
            entryTrigger: "Pin risk / range-bound around ATM",
          }, context));
        }
      }
    }
  }

  // 7. Long OTM Call — leveraged bullish
  if (otmCallStrike && otmCallStrike !== atm) {
    const leg = getLegAtStrike(chain, otmCallStrike, "CE");
    if (leg?.premium != null && context.trend !== "BEARISH") {
      const prem = leg.premium;
      candidates.push(makeStrategy({
        name: "Long OTM Call",
        type: "Long CE",
        bias: "Bullish",
        expiryType: "Weekly",
        expiry,
        strikes: [{ strike: otmCallStrike, type: "CE", action: "BUY", premium: prem }],
        premiums: { net: prem },
        entryZone: { low: prem * 0.95, high: prem * 1.05 },
        stopLoss: Number((prem * 0.5).toFixed(2)),
        targets: { t1: Number((prem * 2).toFixed(2)), t2: Number((prem * 3).toFixed(2)) },
        exitConditions: ["Book partial at Target 1", "Stop on trend reversal", "Time exit before expiry"],
        maxRisk: prem,
        maxReward: null,
        holdingPeriod: "2–5 sessions",
        status: "Active",
        entryTrigger: resistance != null ? `Breakout above ${resistance} with volume` : "Bullish momentum confirmation",
      }, context));
    }
  }

  // 8. Long OTM Put — leveraged bearish
  if (otmPutStrike && otmPutStrike !== atm) {
    const leg = getLegAtStrike(chain, otmPutStrike, "PE");
    if (leg?.premium != null && context.trend !== "BULLISH") {
      const prem = leg.premium;
      candidates.push(makeStrategy({
        name: "Long OTM Put",
        type: "Long PE",
        bias: "Bearish",
        expiryType: "Weekly",
        expiry,
        strikes: [{ strike: otmPutStrike, type: "PE", action: "BUY", premium: prem }],
        premiums: { net: prem },
        entryZone: { low: prem * 0.95, high: prem * 1.05 },
        stopLoss: Number((prem * 0.5).toFixed(2)),
        targets: { t1: Number((prem * 2).toFixed(2)), t2: Number((prem * 3).toFixed(2)) },
        exitConditions: ["Book at Target 1", "Stop on spot reclaim above 20 DMA", "Time exit before expiry"],
        maxRisk: prem,
        maxReward: null,
        holdingPeriod: "2–5 sessions",
        status: "Active",
        entryTrigger: support != null ? `Breakdown below ${support}` : "Bearish momentum confirmation",
      }, context));
    }
  }

  // 9. Protective Put — portfolio hedge
  if (otmPutStrike) {
    const leg = getLegAtStrike(chain, otmPutStrike, "PE");
    if (leg?.premium != null) {
      const prem = leg.premium;
      candidates.push(makeStrategy({
        name: "Protective Put Hedge",
        type: "Long PE",
        bias: "Bearish",
        expiryType: "Weekly",
        expiry,
        strikes: [{ strike: otmPutStrike, type: "PE", action: "BUY", premium: prem }],
        premiums: { net: prem },
        entryZone: { low: prem * 0.95, high: prem * 1.05 },
        stopLoss: Number((prem * 0.6).toFixed(2)),
        targets: { t1: "Hedge active below support", t2: "Roll if spot stabilizes above 20 DMA" },
        exitConditions: ["Hold as portfolio hedge", "Exit hedge if underlying recovers"],
        maxRisk: prem,
        maxReward: null,
        holdingPeriod: "2–4 weeks",
        status: "Active",
        entryTrigger: support != null ? `Hedge if spot tests ${support}` : "Risk-off hedge at verified levels",
      }, context));
    }
  }

  const monthlyExpiry = context.monthlyExpiry;
  const monthlyChain = context.monthlyChain;
  if (monthlyChain?.available && monthlyExpiry) {
    candidates.push(...generateMonthlyStrategies(monthlyChain, monthlyExpiry, context));
  }

  return candidates;
}

/**
 * Attach institutional dossier + transparent confidence (no fabricated success rates).
 * Options multi-leg historical premium series is not available — backtest stays unavailable.
 */
function attachOptionsDossier(strategy, context) {
  const scoring = scoreStrategy(strategy, context);
  const why = strategy.why || [];
  const factors = splitFactors(why);
  const hasPremiums = Array.isArray(strategy.strikes)
    ? strategy.strikes.some((s) => s && s.premium != null)
    : false;

  const fields = [
    { name: "spot", available: context?.price != null },
    { name: "trend", available: !!context?.trend },
    { name: "rsi", available: context?.rsi != null },
    { name: "adx", available: context?.adx != null },
    { name: "sma20", available: context?.sma20 != null },
    { name: "sma50", available: context?.sma50 != null },
    { name: "support", available: context?.support != null },
    { name: "resistance", available: context?.resistance != null },
    { name: "option_premiums", available: hasPremiums },
    { name: "pcr", available: context?.chain?.putCallRatio != null },
    { name: "max_pain", available: context?.chain?.maxPain != null },
    { name: "vix", available: context?.vix != null || context?.vix?.value != null },
    { name: "fii_dii", available: context?.fiiDii?.fii?.netValue != null },
    { name: "volume_trend", available: !!context?.volumeTrend },
  ];

  const bias = strategy.bias;
  const agreements = [
    {
      name: "trend_bias",
      aligned:
        !context?.trend || !bias || bias === "Neutral"
          ? null
          : (bias === "Bullish" && context.trend === "BULLISH") ||
            (bias === "Bearish" && context.trend === "BEARISH"),
    },
    {
      name: "status_active",
      aligned: strategy.status == null ? null : strategy.status === "Active",
    },
    {
      name: "rr",
      aligned:
        strategy.riskRewardRatio == null ? null : strategy.riskRewardRatio >= 1.2,
    },
  ];

  // Prefer synthetic multi-leg (BS+HV) when legs+candles exist; else directional proxy.
  // Never invent historical exchange premiums.
  const candles = context?.candles;
  let backtest;
  const hasLegs = Array.isArray(strategy.strikes) && strategy.strikes.some((s) => s?.strike != null);
  if (Array.isArray(candles) && candles.length >= 80 && hasLegs) {
    const synthetic = backtestSyntheticMultiLeg(candles, strategy, {
      holdBars: strategy.expiryType === "Monthly" ? 15 : 8,
      impliedVolPct: typeof context.vix === "number" ? context.vix : context.vix?.value,
    });
    if (synthetic.available) {
      backtest = synthetic;
    } else if (strategy.bias && strategy.bias !== "Neutral") {
      backtest = backtestDirectionalProxy(candles, strategy.bias);
      backtest.syntheticAttempt = synthetic;
    } else {
      backtest = synthetic;
    }
  } else if (Array.isArray(candles) && candles.length >= 80 && strategy.bias && strategy.bias !== "Neutral") {
    backtest = backtestDirectionalProxy(candles, strategy.bias);
  } else {
    backtest = {
      available: false,
      reason: Array.isArray(candles) && candles.length < 80
        ? "Awaiting Latest Verified Data — need ≥80 underlying daily bars for synthetic/proxy backtest"
        : "Backtest could not be completed — attach verified OHLCV; exchange multi-leg premium history not in free feeds",
      samples: 0,
      proxyType: "none",
      assumptions: [
        "Historical multi-leg exchange premiums unavailable free",
        "Synthetic BS+HV or directional proxy used when underlying history exists",
        "Never invent win rates",
      ],
    };
  }

  const confidence = buildConfidenceScore({
    fields,
    agreements,
    backtestQuality: backtest,
  });

  // Blend engine structural score with verified-input confidence (transparent, not a guarantee)
  const blended =
    confidence.score != null
      ? Math.round(scoring.confidenceScore * 0.55 + confidence.score * 0.45)
      : scoring.confidenceScore;

  const thesisParts = why
    .map((w) => (typeof w === "string" ? w : w?.text))
    .filter(Boolean)
    .slice(0, 3);
  const thesis =
    thesisParts.length > 0
      ? thesisParts.join(" ")
      : `${strategy.name || "Strategy"} selected from verified NSE option chain and technical context.`;

  const dossier = buildInvestmentDossier({
    symbol: "NIFTY",
    name: strategy.name,
    action: strategy.status === "Active" ? "CONSIDER" : strategy.status || "WATCH",
    price: context?.price ?? null,
    horizon: strategy.holdingPeriod || strategy.expiryType || null,
    investorProfile:
      "Derivatives-experienced traders only — options can expire worthless; not suitable for capital-preservation mandates",
    thesis,
    bullishFactors: factors.bullish,
    bearishFactors: factors.bearish,
    riskFactors: [
      "Options strategies can lose 100% of premium paid (long options) or face large losses on naked shorts if undefined risk",
      strategy.status === "Wait" ? "Entry conditions not yet confirmed on verified data" : null,
      context?.vix != null && Number(context.vix) > 18
        ? "Elevated India VIX — wider premium swings"
        : null,
    ].filter(Boolean),
    technicalSignals: factors.technical,
    fundamentalSignals: factors.fundamental,
    sectorOutlook: context?.trend
      ? `NIFTY index trend: ${context.trend} (model on verified OHLCV)`
      : null,
    competitorNote: "Index strategy — single-name peer comparison not applicable",
    valuationSummary: hasPremiums
      ? "Premiums from verified NSE option chain legs only"
      : "Option premiums: Data Unavailable",
    entry: strategy.entryZone || null,
    entryZones: strategy.entryZone || null,
    targets: strategy.targets || {},
    stopLoss: strategy.stopLoss ?? null,
    riskRewardRatio: strategy.riskRewardRatio ?? null,
    holdingPeriod: strategy.holdingPeriod || null,
    invalidation: [
      ...(strategy.exitConditions || []).slice(0, 3),
      context?.support != null && bias === "Bullish"
        ? `Bullish structures invalidated on sustained break below support ${context.support}`
        : null,
      context?.resistance != null && bias === "Bearish"
        ? `Bearish structures invalidated on sustained break above resistance ${context.resistance}`
        : null,
    ].filter(Boolean),
    capitalAllocation:
      "Risk only capital you can afford to lose; size to max loss of strategy, not notional",
    positionSizing: strategy.positionSizing || null,
    confidence: {
      ...confidence,
      score: blended,
      engineStructuralScore: scoring.confidenceScore,
      methodology:
        "Blend of structural strategy fit (55%) and verified multi-factor input completeness/agreement (45%). Not a probability of profit.",
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

function rankTop10(candidates, context) {
  return candidates
    .map((c) => {
      const attached = attachOptionsDossier(c, context);
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
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

module.exports = {
  generateCandidates,
  rankTop10,
  scoreStrategy,
  attachOptionsDossier,
};