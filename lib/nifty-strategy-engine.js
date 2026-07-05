const { getLegAtStrike, nearestStrike } = require("./nse-options");

function deriveMaxReward(base) {
  if (base.maxReward != null) return base.maxReward;
  const net = base.premiums?.net != null ? Math.abs(base.premiums.net) : null;
  if (net == null || net <= 0) return null;

  const t2 = base.targets?.t2;
  if (typeof t2 === "number" && t2 > net) {
    return Number((t2 - net).toFixed(2));
  }
  const t1 = base.targets?.t1;
  if (typeof t1 === "number" && t1 > net) {
    return Number((t1 - net).toFixed(2));
  }
  return null;
}

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
  const maxRisk = base.maxRisk ?? null;
  const maxReward = deriveMaxReward(base);
  const rr = maxRisk > 0 && maxReward != null ? Number((maxReward / maxRisk).toFixed(2)) : null;
  const why = ctx ? buildStrategyRationale({ ...base, riskRewardRatio: rr }, ctx) : base.why || [];

  return {
    ...base,
    maxReward,
    riskRewardRatio: rr,
    why,
    lastUpdated: new Date().toISOString(),
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

  // 6. Credit Put Spread (bullish neutral)
  if (otmPutStrike && itmPutStrike && otmPutStrike !== itmPutStrike) {
    const legs = buildLegs(chain, [otmPutStrike, itmPutStrike], ["PE", "PE"]);
    if (legs) {
      const credit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          name: "Bull Put Credit Spread",
          type: "Credit Spread",
          bias: "Bullish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: otmPutStrike, type: "PE", action: "SELL", premium: legs[0].premium },
            { strike: itmPutStrike, type: "PE", action: "BUY", premium: legs[1].premium },
          ],
          premiums: { net: -credit },
          entryZone: { low: credit * 0.9, high: credit * 1.1 },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit if spot below short put strike"],
          maxRisk: Number(((itmPutStrike - otmPutStrike) - credit).toFixed(2)),
          maxReward: credit,
          holdingPeriod: "Weekly",
          status: support != null && spot > support ? "Active" : "Wait",
          entryTrigger: support != null ? `Spot holding above ${support}` : "Bullish support hold",
        }, context));
      }
    }
  }

  // 8. Debit Put Spread variant for mild bear
  // 9. Call writing at resistance (credit call spread)
  if (otmCallStrike && itmCallStrike) {
    const legs = buildLegs(chain, [otmCallStrike, itmCallStrike], ["CE", "CE"]);
    if (legs) {
      const credit = Number((legs[0].premium - legs[1].premium).toFixed(2));
      if (credit > 0) {
        candidates.push(makeStrategy({
          name: "Bear Call Credit Spread",
          type: "Credit Spread",
          bias: "Bearish",
          expiryType: "Weekly",
          expiry,
          strikes: [
            { strike: otmCallStrike, type: "CE", action: "SELL", premium: legs[0].premium },
            { strike: itmCallStrike, type: "CE", action: "BUY", premium: legs[1].premium },
          ],
          premiums: { net: -credit },
          entryZone: { low: credit * 0.9, high: credit * 1.1 },
          stopLoss: Number((credit * 2).toFixed(2)),
          targets: { t1: Number((credit * 0.5).toFixed(2)), t2: credit },
          exitConditions: ["Book 50% credit", "Exit on resistance breakout"],
          maxRisk: Number(((itmCallStrike - otmCallStrike) - credit).toFixed(2)),
          maxReward: credit,
          holdingPeriod: "Weekly",
          status: resistance != null && spot < resistance ? "Active" : "Wait",
          entryTrigger: resistance != null ? `Spot below resistance ${resistance}` : "Near resistance rejection",
        }, context));
      }
    }
  }

  const monthlyExpiry = context.monthlyExpiry;
  const monthlyChain = context.monthlyChain;
  if (monthlyChain?.available && monthlyExpiry) {
    candidates.push(...generateMonthlyStrategies(monthlyChain, monthlyExpiry, context));
  }

  return candidates;
}

function rankTop10(candidates, context) {
  return candidates
    .map((c) => {
      const scoring = scoreStrategy(c, context);
      return { ...c, confidenceScore: scoring.confidenceScore, confidenceFactors: scoring.factors };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 10)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

module.exports = { generateCandidates, rankTop10, scoreStrategy };