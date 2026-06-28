const { getLegAtStrike, nearestStrike } = require("./nse-options");

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

function makeStrategy(base) {
  const maxRisk = base.maxRisk ?? null;
  const maxReward = base.maxReward ?? null;
  const rr = maxRisk > 0 && maxReward != null ? Number((maxReward / maxRisk).toFixed(2)) : null;

  return {
    ...base,
    riskRewardRatio: rr,
    lastUpdated: new Date().toISOString(),
  };
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
      why: ["Bullish technical trend", "ATM call for delta exposure", chain.putCallRatio > 1 ? "Put writing visible in OI" : "Positive momentum"],
    }));
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
      why: ["Bearish technical bias", "ATM put for downside protection", "Put OI build-up watch"],
    }));
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
          why: ["Defined-risk bullish play", "Lower cost than naked call", "IV contraction friendly"],
        }));
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
          why: ["Defined-risk bearish play", "Cheaper than naked put", "Hedge for long portfolio"],
        }));
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
          why: ["Neutral trend", "Premium collection", chain.maxPain ? `Max pain near ${chain.maxPain}` : "OI-based range"],
        }));
      }
    }
  }

  // 6. Monthly Long CE
  const monthlyExpiry = chain.expiries?.length > 1 ? chain.expiries[1] : expiry;
  const monthlyCe = getLegAtStrike(chain, atm, "CE");
  if (monthlyCe?.premium != null && context.trend === "BULLISH") {
    candidates.push(makeStrategy({
      name: "Monthly Bullish Call",
      type: "Long CE",
      bias: "Bullish",
      expiryType: "Monthly",
      expiry: monthlyExpiry,
      strikes: [{ strike: atm, type: "CE", action: "BUY", premium: monthlyCe.premium }],
      premiums: { net: monthlyCe.premium },
      entryZone: { low: monthlyCe.premium * 0.95, high: monthlyCe.premium * 1.05 },
      stopLoss: Number((monthlyCe.premium * 0.4).toFixed(2)),
      targets: { t1: Number((monthlyCe.premium * 1.8).toFixed(2)), t2: Number((monthlyCe.premium * 2.5).toFixed(2)) },
      exitConditions: ["Hold through monthly trend", "Stop on weekly close below 50 DMA"],
      maxRisk: monthlyCe.premium,
      maxReward: null,
      holdingPeriod: "2–4 weeks",
      status: "Active",
      entryTrigger: "Monthly trend bullish with ADX confirmation",
      why: ["Monthly expiry for positional view", "Strong trend structure", "Institutional breadth supportive"],
    }));
  }

  // 7. Credit Put Spread (bullish neutral)
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
          why: ["Support holding", "Collect premium on OTM puts", "Bullish to neutral bias"],
        }));
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
          why: ["Resistance capping upside", "Call writing at OTM strikes", chain.highestCallOi ? `High call OI at ${chain.highestCallOi}` : "Call OI elevated"],
        }));
      }
    }
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