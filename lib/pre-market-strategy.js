const PRE_MARKET_LABEL = "Pre-Market Strategy – Based on Latest Verified Market Close";

function roundStrike(price, step) {
  if (price == null) return null;
  return Math.round(price / step) * step;
}

function strikeStep(price, instrument = "NIFTY") {
  if (instrument === "NIFTY") return 50;
  if (price >= 2000) return 50;
  if (price >= 1000) return 20;
  if (price >= 500) return 10;
  return 5;
}

function makePreMarketStrategy(base) {
  const maxRisk = base.maxRisk ?? null;
  const maxReward = base.maxReward ?? null;
  const rr = maxRisk > 0 && maxReward != null ? Number((maxReward / maxRisk).toFixed(2)) : null;

  return {
    ...base,
    status: "Pre-Market",
    mode: "pre-market",
    modeLabel: PRE_MARKET_LABEL,
    riskRewardRatio: rr,
    lastUpdated: new Date().toISOString(),
    premiumNote: base.premiums?.net != null
      ? "Reference premium from last verified session close — confirm trigger after market open"
      : "Entry premium unknown until market open — use trigger conditions below",
  };
}

function buildTriggerEntry(context, bias) {
  const { support, resistance, price, sessionHigh, sessionLow } = context;
  if (bias === "Bullish") {
    if (resistance != null) {
      return `Enter only after breakout above resistance ${resistance} with volume confirmation`;
    }
    if (sessionHigh != null) {
      return `Enter only after breakout above previous session high ${sessionHigh} with volume confirmation`;
    }
    return "Enter only after bullish confirmation above key moving averages at market open";
  }
  if (bias === "Bearish") {
    if (support != null) {
      return `Enter only after breakdown below support ${support} with volume confirmation`;
    }
    if (sessionLow != null) {
      return `Enter only after breakdown below previous session low ${sessionLow}`;
    }
    return "Enter only after bearish confirmation below key support at market open";
  }
  return "Enter only if spot remains range-bound between verified support and resistance after open";
}

function scorePreMarket(strategy, context) {
  let score = 45;
  const factors = ["Pre-market preparation setup"];

  if (context.trend === "BULLISH" && strategy.bias === "Bullish") {
    score += 12;
    factors.push("Trend alignment");
  }
  if (context.trend === "BEARISH" && strategy.bias === "Bearish") {
    score += 12;
    factors.push("Trend alignment");
  }
  if (context.trend === "NEUTRAL" && strategy.bias === "Neutral") {
    score += 8;
    factors.push("Range-bound fit");
  }
  if (context.volumeTrend === "Rising") {
    score += 6;
    factors.push("Volume confirmation (last session)");
  }
  if (context.adx != null && context.adx >= 25) {
    score += 5;
    factors.push("Strong ADX trend");
  }
  if (context.rsi != null) {
    if (strategy.bias === "Bullish" && context.rsi < 65) {
      score += 4;
      factors.push("RSI not overbought");
    }
    if (strategy.bias === "Bearish" && context.rsi > 35) {
      score += 4;
      factors.push("RSI not oversold");
    }
  }
  if (context.chain?.putCallRatio != null) {
    score += 3;
    factors.push(`PCR ${context.chain.putCallRatio} (last verified OI)`);
  }
  if (context.vix != null && context.vix > 18 && strategy.type?.includes("Condor")) {
    score += 4;
    factors.push("Elevated VIX suits premium structures");
  }
  if (context.relativeStrength?.vsNifty > 2 && strategy.bias === "Bullish") {
    score += 6;
    factors.push("Strong RS vs NIFTY");
  }

  return {
    confidenceScore: Math.max(0, Math.min(100, Math.round(score))),
    factors,
  };
}

/**
 * Technical-only setups when no option chain is available.
 * No premiums or Greeks are invented.
 */
function generateTechnicalSetups(context, instrument = "NIFTY") {
  const {
    price,
    trend,
    support,
    resistance,
    vix,
    rsi,
    adx,
    volumeTrend,
    chain,
    name,
    symbol,
    nseSymbol,
    monthlyExpiry,
    sessionHigh,
    sessionLow,
    sector,
    sectorOutlook,
    relativeStrength,
    marketTrend,
  } = context;

  if (price == null) return [];

  const step = strikeStep(price, instrument);
  const atm = roundStrike(price, step);
  const otmCall = roundStrike(price + step * 4, step);
  const otmPut = roundStrike(price - step * 4, step);
  const farCall = roundStrike(price + step * 8, step);
  const farPut = roundStrike(price - step * 8, step);
  const expiry = monthlyExpiry || chain?.expiry || "Next monthly expiry";
  const expiryType = instrument === "NIFTY" ? "Weekly" : "Monthly";
  const displayName = name || nseSymbol || instrument;

  const whyBase = [
    trend ? `${displayName} technical trend: ${trend}` : null,
    support != null ? `Support at ${support} (verified levels)` : null,
    resistance != null ? `Resistance at ${resistance} (verified levels)` : null,
    vix != null ? `India VIX ${Number(vix).toFixed(2)} (last close)` : null,
    volumeTrend ? `Volume trend: ${volumeTrend}` : null,
    chain?.putCallRatio != null ? `Put-Call Ratio ${chain.putCallRatio} (last verified OI)` : null,
    relativeStrength?.vsNifty != null ? `RS vs NIFTY: ${relativeStrength.vsNifty}%` : null,
    sectorOutlook ? `Sector outlook: ${sectorOutlook}` : null,
    marketTrend ? `Broad market: ${marketTrend}` : null,
  ].filter(Boolean);

  const templates = [];

  if (trend !== "BEARISH") {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Long Call" : `${displayName} Pre-Market Long Call`,
      type: "Long CE",
      bias: "Bullish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [{ strike: atm, type: "CE", action: "BUY", premium: null }],
      premiums: { net: null },
      entryZone: null,
      stopLoss: support != null ? `Spot close below ${support}` : "50% premium decay or spot below 20 DMA",
      targets: {
        t1: resistance != null ? `Spot target ${resistance}` : "1.5× premium after entry confirmation",
        t2: "Trail stop above entry premium",
      },
      exitConditions: [
        "Book partial at resistance or Target 1",
        "Stop on spot close below support",
        "Time exit 2 sessions before expiry",
      ],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: instrument === "NIFTY" ? "2–5 sessions" : "2–4 weeks",
      entryTrigger: buildTriggerEntry({ support, resistance, price, sessionHigh, sessionLow }, "Bullish"),
      why: [...whyBase, "Bullish structure — await open confirmation before entry"],
    });
  }

  if (trend !== "BULLISH") {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Long Put" : `${displayName} Pre-Market Long Put`,
      type: "Long PE",
      bias: "Bearish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [{ strike: atm, type: "PE", action: "BUY", premium: null }],
      premiums: { net: null },
      entryZone: null,
      stopLoss: resistance != null ? `Spot reclaim above ${resistance}` : "50% premium decay",
      targets: {
        t1: support != null ? `Spot target ${support}` : "1.5× premium after entry confirmation",
        t2: "Trail stop on partial profits",
      },
      exitConditions: ["Book at Target 1", "Stop on trend reversal", "Time exit before expiry"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: instrument === "NIFTY" ? "2–5 sessions" : "2–4 weeks",
      entryTrigger: buildTriggerEntry({ support, resistance, price, sessionHigh, sessionLow }, "Bearish"),
      why: [...whyBase, "Bearish structure — conditional entry at open"],
    });
  }

  if (otmCall !== atm && otmPut !== atm) {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Bull Call Spread" : `${displayName} Bull Call Spread`,
      type: "Bull Call Spread",
      bias: "Bullish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: atm, type: "CE", action: "BUY", premium: null },
        { strike: otmCall, type: "CE", action: "SELL", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "50% of debit after entry",
      targets: { t1: "80% of max spread value", t2: "Full spread width minus debit" },
      exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
      maxRisk: null,
      maxReward: otmCall && atm ? Number((otmCall - atm).toFixed(2)) : null,
      holdingPeriod: expiryType === "Weekly" ? "Weekly expiry" : "Monthly expiry",
      entryTrigger: `Enter after spot holds above ${atm} with momentum at open`,
      why: [...whyBase, "Defined-risk bullish spread — debit confirmed at open"],
    });

    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Bear Put Spread" : `${displayName} Bear Put Spread`,
      type: "Bear Put Spread",
      bias: "Bearish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: atm, type: "PE", action: "BUY", premium: null },
        { strike: otmPut, type: "PE", action: "SELL", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "50% of debit after entry",
      targets: { t1: "80% of max spread value", t2: "Full spread width minus debit" },
      exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
      maxRisk: null,
      maxReward: atm && otmPut ? Number((atm - otmPut).toFixed(2)) : null,
      holdingPeriod: expiryType === "Weekly" ? "Weekly expiry" : "Monthly expiry",
      entryTrigger: `Enter after spot breaks below ${atm} with weakness at open`,
      why: [...whyBase, "Defined-risk bearish spread"],
    });
  }

  if (farPut && farCall && support != null && resistance != null) {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Iron Condor" : `${displayName} Iron Condor`,
      type: "Iron Condor",
      bias: "Neutral",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: farPut, type: "PE", action: "BUY", premium: null },
        { strike: otmPut, type: "PE", action: "SELL", premium: null },
        { strike: otmCall, type: "CE", action: "SELL", premium: null },
        { strike: farCall, type: "CE", action: "BUY", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "2× credit received after entry",
      targets: { t1: "50% of max credit", t2: "80% of max credit" },
      exitConditions: [
        "Book at 50% of credit",
        `Exit if spot breaches ${otmPut} or ${otmCall}`,
        "Close 1 day before expiry",
      ],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "Weekly expiry",
      entryTrigger: `Enter if spot opens between ${support} and ${resistance} (range-bound)`,
      why: [...whyBase, chain?.maxPain ? `Max pain near ${chain.maxPain} (last OI)` : "Range-bound OI structure"],
    });
  }

  if (otmPut && farPut && support != null) {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Bull Put Spread" : `${displayName} Bull Put Spread`,
      type: "Credit Spread",
      bias: "Bullish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: otmPut, type: "PE", action: "SELL", premium: null },
        { strike: farPut, type: "PE", action: "BUY", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "2× credit received",
      targets: { t1: "50% credit", t2: "Full credit" },
      exitConditions: ["Book 50% credit", `Exit if spot below ${otmPut}`],
      maxRisk: otmPut && farPut ? Number((otmPut - farPut).toFixed(2)) : null,
      maxReward: null,
      holdingPeriod: "Weekly",
      entryTrigger: `Enter if spot holds above ${support} after open`,
      why: [...whyBase, "Premium collection above verified support"],
    });
  }

  if (otmCall && farCall && resistance != null) {
    templates.push({
      name: instrument === "NIFTY" ? "Pre-Market Bear Call Spread" : `${displayName} Bear Call Spread`,
      type: "Credit Spread",
      bias: "Bearish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: otmCall, type: "CE", action: "SELL", premium: null },
        { strike: farCall, type: "CE", action: "BUY", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "2× credit received",
      targets: { t1: "50% credit", t2: "Full credit" },
      exitConditions: ["Book 50% credit", `Exit on breakout above ${resistance}`],
      maxRisk: farCall && otmCall ? Number((farCall - otmCall).toFixed(2)) : null,
      maxReward: null,
      holdingPeriod: "Weekly",
      entryTrigger: `Enter if spot remains below ${resistance} after open`,
      why: [...whyBase, "Call writing below verified resistance"],
    });
  }

  const extraVariants = [];

  if (atm != null) {
    extraVariants.push({
      name: instrument === "NIFTY" ? "Pre-Market OTM Call" : `${displayName} OTM Call`,
      type: "Long CE",
      bias: "Bullish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [{ strike: otmCall, type: "CE", action: "BUY", premium: null }],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "50% premium decay after entry",
      targets: { t1: "2× premium", t2: "3× premium" },
      exitConditions: ["Book partial at Target 1", "Stop on trend reversal"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      entryTrigger: `Enter if spot breaks ${resistance ?? sessionHigh ?? atm} with momentum`,
      why: [...whyBase, "OTM call for leveraged bullish exposure"],
    });

    extraVariants.push({
      name: instrument === "NIFTY" ? "Pre-Market OTM Put" : `${displayName} OTM Put`,
      type: "Long PE",
      bias: "Bearish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [{ strike: otmPut, type: "PE", action: "BUY", premium: null }],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "50% premium decay after entry",
      targets: { t1: "2× premium", t2: "3× premium" },
      exitConditions: ["Book at Target 1", "Stop on reclaim above 20 DMA"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      entryTrigger: `Enter if spot breaks ${support ?? sessionLow ?? atm} to the downside`,
      why: [...whyBase, "OTM put for bearish momentum capture"],
    });
  }

  if (trend === "NEUTRAL" && support != null && resistance != null) {
    extraVariants.push({
      name: instrument === "NIFTY" ? "Pre-Market Range Straddle Watch" : `${displayName} Range Breakout Watch`,
      type: "Straddle Watch",
      bias: "Neutral",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [
        { strike: atm, type: "CE", action: "WATCH", premium: null },
        { strike: atm, type: "PE", action: "WATCH", premium: null },
      ],
      premiums: { net: null },
      entryZone: null,
      stopLoss: "Exit if range re-establishes",
      targets: { t1: `Breakout above ${resistance}`, t2: `Breakdown below ${support}` },
      exitConditions: ["Enter only after range break with volume", "Avoid entry inside the range"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "1–3 sessions after breakout",
      entryTrigger: `Wait for decisive break of ${support}–${resistance} range at open`,
      why: [...whyBase, "Neutral trend — breakout preparation only"],
    });
  }

  if (adx != null && adx >= 20) {
    extraVariants.push({
      name: instrument === "NIFTY" ? "Pre-Market Trend Continuation" : `${displayName} Trend Continuation`,
      type: trend === "BEARISH" ? "Long PE" : "Long CE",
      bias: trend === "BEARISH" ? "Bearish" : "Bullish",
      expiryType,
      expiry,
      symbol,
      nseSymbol,
      companyName: displayName,
      sector,
      strikes: [{ strike: atm, type: trend === "BEARISH" ? "PE" : "CE", action: "BUY", premium: null }],
      premiums: { net: null },
      entryZone: null,
      stopLoss: `Spot close beyond ${trend === "BEARISH" ? resistance ?? "20 DMA" : support ?? "20 DMA"}`,
      targets: { t1: "1.5× premium after entry", t2: "2.5× premium" },
      exitConditions: ["ADX-supported trend trade", "Trail stop after Target 1"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "3–7 sessions",
      entryTrigger: `ADX ${adx.toFixed(1)} — enter on trend continuation after open confirmation`,
      why: [...whyBase, `ADX ${adx.toFixed(1)} confirms trend strength`],
    });
  }

  if (rsi != null) {
    const rsiBias = rsi > 55 ? "Bullish" : rsi < 45 ? "Bearish" : "Neutral";
    if (rsiBias !== "Neutral") {
      extraVariants.push({
        name: instrument === "NIFTY" ? `Pre-Market RSI ${rsiBias} Setup` : `${displayName} RSI ${rsiBias}`,
        type: rsiBias === "Bullish" ? "Long CE" : "Long PE",
        bias: rsiBias,
        expiryType,
        expiry,
        symbol,
        nseSymbol,
        companyName: displayName,
        sector,
        strikes: [{ strike: atm, type: rsiBias === "Bullish" ? "CE" : "PE", action: "BUY", premium: null }],
        premiums: { net: null },
        entryZone: null,
        stopLoss: "50% premium or RSI reversal",
        targets: { t1: "1.5× premium", t2: "2× premium" },
        exitConditions: ["RSI divergence exit", "Time exit before expiry"],
        maxRisk: null,
        maxReward: null,
        holdingPeriod: "2–5 sessions",
        entryTrigger: `RSI ${rsi.toFixed(1)} — confirm ${rsiBias.toLowerCase()} momentum at open`,
        why: [...whyBase, `RSI at ${rsi.toFixed(1)} supports ${rsiBias.toLowerCase()} bias`],
      });
    }
  }

  extraVariants.push({
    name: instrument === "NIFTY" ? "Pre-Market Protective Put" : `${displayName} Protective Put`,
    type: "Long PE",
    bias: "Bearish",
    expiryType,
    expiry,
    symbol,
    nseSymbol,
    companyName: displayName,
    sector,
    strikes: [{ strike: otmPut ?? atm, type: "PE", action: "BUY", premium: null }],
    premiums: { net: null },
    entryZone: null,
    stopLoss: "Premium decay beyond 40%",
    targets: { t1: "Portfolio hedge active below support", t2: "Roll if spot stabilizes" },
    exitConditions: ["Hold as portfolio hedge", "Exit if underlying recovers above 20 DMA"],
    maxRisk: null,
    maxReward: null,
    holdingPeriod: "2–4 weeks",
    entryTrigger: support != null
      ? `Buy hedge if portfolio exposed and spot nears ${support}`
      : "Portfolio hedge — enter after open if risk-off conditions persist",
    why: [...whyBase, "Defensive hedge for long portfolio exposure"],
  });

  extraVariants.push({
    name: instrument === "NIFTY" ? "Pre-Market Momentum Breakout" : `${displayName} Momentum Breakout`,
    type: "Long CE",
    bias: "Bullish",
    expiryType,
    expiry,
    symbol,
    nseSymbol,
    companyName: displayName,
    sector,
    strikes: [{ strike: otmCall ?? atm, type: "CE", action: "BUY", premium: null }],
    premiums: { net: null },
    entryZone: null,
    stopLoss: "50% premium decay",
    targets: { t1: "2× premium", t2: "3× premium" },
    exitConditions: ["Volume must confirm breakout", "Exit on failed breakout (bull trap)"],
    maxRisk: null,
    maxReward: null,
    holdingPeriod: "2–5 sessions",
    entryTrigger: sessionHigh != null
      ? `Enter on break above ${sessionHigh} with above-average volume`
      : buildTriggerEntry({ support, resistance, sessionHigh, sessionLow }, "Bullish"),
    why: [...whyBase, "Momentum breakout preparation for next session"],
  });

  const combined = [...templates, ...extraVariants].map((t) => makePreMarketStrategy(t));
  const seen = new Set();
  const unique = combined.filter((s) => {
    const key = s.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, 10);
}

function annotateForPreMarket(strategy, chainMeta) {
  if (!strategy) return strategy;
  const hasReferencePremium = strategy.premiums?.net != null;

  return {
    ...strategy,
    status: strategy.status === "Active" && chainMeta?.stale ? "Pre-Market" : strategy.status,
    mode: "pre-market",
    modeLabel: PRE_MARKET_LABEL,
    premiumNote: hasReferencePremium
      ? "Reference premium from last verified session close — confirm trigger after market open"
      : strategy.premiumNote || "Entry premium unknown until market open — use trigger conditions",
    entryZone: chainMeta?.stale && hasReferencePremium
      ? strategy.entryZone
      : hasReferencePremium ? strategy.entryZone : null,
    entryTrigger: strategy.entryTrigger || buildTriggerEntry(
      { support: strategy.support, resistance: strategy.resistance },
      strategy.bias
    ),
    dataAsOf: chainMeta?.fetchedAt || null,
  };
}

function annotateForLive(strategy) {
  return {
    ...strategy,
    mode: "live",
    modeLabel: "Live Strategy — Real-Time Verified Data",
    premiumNote: null,
  };
}

function finalizeStrategies(strategies, marketStatus, chainMeta) {
  const list = strategies || [];
  if (marketStatus?.mode === "live") {
    return list.map(annotateForLive);
  }
  return list.map((s) => annotateForPreMarket(s, chainMeta));
}

function rankPreMarketSetups(candidates, context, limit = 10) {
  return candidates
    .map((c) => {
      const scoring = scorePreMarket(c, context);
      return { ...c, confidenceScore: scoring.confidenceScore, confidenceFactors: scoring.factors };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

function sessionLevelsFromCandles(candles) {
  const valid = (candles || []).filter((c) => c.close != null);
  const last = valid.at(-1);
  if (!last) return { sessionHigh: null, sessionLow: null, sessionClose: null, sessionDate: null };
  return {
    sessionHigh: last.high ?? last.close,
    sessionLow: last.low ?? last.close,
    sessionClose: last.close,
    sessionDate: last.date ?? null,
  };
}

module.exports = {
  PRE_MARKET_LABEL,
  roundStrike,
  strikeStep,
  makePreMarketStrategy,
  generateTechnicalSetups,
  annotateForPreMarket,
  annotateForLive,
  finalizeStrategies,
  rankPreMarketSetups,
  scorePreMarket,
  buildTriggerEntry,
  sessionLevelsFromCandles,
};