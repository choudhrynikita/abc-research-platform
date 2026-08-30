const { getLegAtStrike } = require("./nse-options");
const { enrichStrategyWithPayoff } = require("./options-payoff");

const PLANNING_LABEL = "Planning setup — based on the latest verified market close";
const PRE_MARKET_LABEL = PLANNING_LABEL;
const FILL_AT_OPEN = "Last NSE session did not print a premium for these strikes. Recheck the chain at the next open — do not size the trade until then.";

function roundLevel(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(2));
}

function formatLevel(value) {
  const n = roundLevel(value);
  if (n == null) return null;
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function spotZone(low, high) {
  const l = roundLevel(low);
  const h = roundLevel(high);
  if (l == null && h == null) return { entryZone: null, entryZoneKind: "spot" };
  if (l == null) return { entryZone: { low: h, high: h }, entryZoneKind: "spot" };
  if (h == null) return { entryZone: { low: l, high: l }, entryZoneKind: "spot" };
  return {
    entryZone: { low: Math.min(l, h), high: Math.max(l, h) },
    entryZoneKind: "spot",
  };
}

function stripPreMarketPrefix(name) {
  return String(name || "Strategy").replace(/\bPre-Market\s+/gi, "").trim();
}

function derivePlanningHorizon(strategy) {
  if (strategy?.type?.includes("Watch") || strategy?.strikes?.every((leg) => leg.action === "WATCH")) return "watch";
  const holding = String(strategy?.holdingPeriod || "").toLowerCase();
  const expiry = String(strategy?.expiryType || "").toLowerCase();
  if (holding.includes("month") || holding.includes("week") || expiry.includes("monthly")) return "week-ahead";
  if (/\d+–\d+ sessions|weekly expiry/.test(holding)) return "this-week";
  return "next-session";
}

function planningState(horizon) {
  if (horizon === "watch") return { status: "Watch", label: "Watch setup" };
  if (horizon === "this-week") return { status: "This Week", label: "This-week plan" };
  if (horizon === "week-ahead") return { status: "Week-Ahead", label: "Week-ahead plan" };
  return { status: "Next Session", label: "Next-session plan" };
}

function normalizePlanningText(value) {
  return typeof value === "string"
    ? value.replace(/at market open|at open/gi, "after the next session begins")
    : value;
}

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
    name: stripPreMarketPrefix(base.name),
    status: "Plan",
    mode: "planning",
    modeLabel: PLANNING_LABEL,
    riskRewardRatio: rr,
    lastUpdated: new Date().toISOString(),
    premiumNote: base.premiums?.net != null
      ? "Reference premium from the last verified NSE close. Recheck LTP when the next session opens."
      : FILL_AT_OPEN,
  };
}

function buildTriggerEntry(context, bias) {
  const support = formatLevel(context.support);
  const resistance = formatLevel(context.resistance);
  const sessionHigh = formatLevel(context.sessionHigh);
  const sessionLow = formatLevel(context.sessionLow);
  const close = formatLevel(context.price ?? context.sessionClose);
  if (bias === "Bullish") {
    if (resistance) {
      return `Week-ahead: buy only if NIFTY holds a close above ${resistance} with volume. Last close ${close || "—"}.`;
    }
    if (sessionHigh) {
      return `Week-ahead: buy only on a close above last session high ${sessionHigh}. Last close ${close || "—"}.`;
    }
    return `Week-ahead: buy only after a confirmed close above the 20-DMA. Last close ${close || "—"}.`;
  }
  if (bias === "Bearish") {
    if (support) {
      return `Week-ahead: sell/puts only if NIFTY closes below ${support}. Last close ${close || "—"}.`;
    }
    if (sessionLow) {
      return `Week-ahead: sell/puts only on a close below last session low ${sessionLow}. Last close ${close || "—"}.`;
    }
    return `Week-ahead: sell/puts only after a confirmed close below support. Last close ${close || "—"}.`;
  }
  if (support && resistance) {
    return `Week-ahead: stay in the ${support}–${resistance} range (last close ${close || "—"}). Act only on a close outside that band.`;
  }
  return `Week-ahead: last close ${close || "—"}. Enter only after Monday's session confirms direction.`;
}

function scorePreMarket(strategy, context) {
  let score = 45;
  const factors = ["Planning setup based on the last verified session"];

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
  const price = roundLevel(context.price);
  const trend = context.trend;
  const support = roundLevel(context.support);
  const resistance = roundLevel(context.resistance);
  const vix = context.vix;
  const rsi = context.rsi;
  const adx = context.adx;
  const volumeTrend = context.volumeTrend;
  const chain = context.chain;
  const name = context.name;
  const symbol = context.symbol;
  const nseSymbol = context.nseSymbol;
  const monthlyExpiry = context.monthlyExpiry;
  const sessionHigh = roundLevel(context.sessionHigh);
  const sessionLow = roundLevel(context.sessionLow);
  const sector = context.sector;
  const sectorOutlook = context.sectorOutlook;
  const relativeStrength = context.relativeStrength;
  const marketTrend = context.marketTrend;
  const sessionClose = roundLevel(context.sessionClose) ?? price;

  if (price == null) return [];

  const step = strikeStep(price, instrument);
  const atm = roundStrike(price, step);
  const otmCall = roundStrike(price + step * 4, step);
  const otmPut = roundStrike(price - step * 4, step);
  const farCall = roundStrike(price + step * 8, step);
  const farPut = roundStrike(price - step * 8, step);
  const expiry = context.horizonExpiry || monthlyExpiry || chain?.expiry || "Next monthly expiry";
  const expiryType = instrument === "NIFTY" ? "Weekly" : "Monthly";
  const displayName = name || nseSymbol || instrument;
  const supportText = formatLevel(support);
  const resistanceText = formatLevel(resistance);
  const closeText = formatLevel(sessionClose);
  const highText = formatLevel(sessionHigh);
  const lowText = formatLevel(sessionLow);
  const atmText = formatLevel(atm) || String(atm);
  const otmCallText = formatLevel(otmCall) || String(otmCall);
  const otmPutText = formatLevel(otmPut) || String(otmPut);
  const roundedContext = {
    ...context,
    price,
    support,
    resistance,
    sessionHigh,
    sessionLow,
    sessionClose,
  };

  const whyBase = [
    trend ? `${displayName} technical trend: ${trend}` : null,
    closeText ? `Last verified close ${closeText}` : null,
    highText ? `Last session high ${highText}` : null,
    lowText ? `Last session low ${lowText}` : null,
    supportText ? `Support ${supportText} (last-close map)` : null,
    resistanceText ? `Resistance ${resistanceText} (last-close map)` : null,
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
      ...spotZone(support ?? sessionLow, price),
      stopLoss: supportText
        ? `Invalid if ${displayName} closes below ${supportText}`
        : "50% premium decay or close below 20 DMA",
      targets: {
        t1: resistanceText ? `Hold / scale at ${resistanceText}` : "1.5× premium after confirmation",
        t2: "Trail above last higher low",
      },
      exitConditions: [
        "Book partial at resistance or Target 1",
        "Stop on spot close below support",
        "Time exit 2 sessions before expiry",
      ],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: instrument === "NIFTY" ? "2–5 sessions" : "2–4 weeks",
      entryTrigger: buildTriggerEntry(roundedContext, "Bullish"),
      why: [...whyBase, "Bullish structure — await next-session confirmation before entry"],
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
      ...spotZone(price, resistance ?? sessionHigh),
      stopLoss: resistanceText
        ? `Invalid if ${displayName} reclaims ${resistanceText}`
        : "50% premium decay",
      targets: {
        t1: supportText ? `Hold / scale at ${supportText}` : "1.5× premium after confirmation",
        t2: "Trail stop on partial profits",
      },
      exitConditions: ["Book at Target 1", "Stop on trend reversal", "Time exit before expiry"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: instrument === "NIFTY" ? "2–5 sessions" : "2–4 weeks",
      entryTrigger: buildTriggerEntry(roundedContext, "Bearish"),
      why: [...whyBase, "Bearish structure — conditional entry at the next session"],
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
      ...spotZone(support ?? sessionLow ?? price, atm),
      stopLoss: "50% of debit after entry",
      targets: { t1: "80% of max spread value", t2: "Full spread width minus debit" },
      exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
      maxRisk: null,
      maxReward: otmCall && atm ? Number((otmCall - atm).toFixed(2)) : null,
      holdingPeriod: expiryType === "Weekly" ? "Weekly expiry" : "Monthly expiry",
      entryTrigger: `Week-ahead: enter the ${atmText} / ${otmCallText} call spread if spot holds above ${atmText} on the next session. Last close ${closeText || "—"}.`,
      why: [...whyBase, "Defined-risk bullish spread — debit confirmed at the next open"],
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
      ...spotZone(atm, resistance ?? sessionHigh ?? price),
      stopLoss: "50% of debit after entry",
      targets: { t1: "80% of max spread value", t2: "Full spread width minus debit" },
      exitConditions: ["Exit at 80% max profit", "Stop at 50% debit"],
      maxRisk: null,
      maxReward: atm && otmPut ? Number((atm - otmPut).toFixed(2)) : null,
      holdingPeriod: expiryType === "Weekly" ? "Weekly expiry" : "Monthly expiry",
      entryTrigger: `Week-ahead: enter the ${atmText} / ${otmPutText} put spread if spot loses ${atmText} on the next session. Last close ${closeText || "—"}.`,
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
      ...spotZone(support, resistance),
      stopLoss: "2× credit received after entry",
      targets: { t1: "50% of max credit", t2: "80% of max credit" },
      exitConditions: [
        "Book at 50% of credit",
        `Exit if spot closes outside ${otmPutText}–${otmCallText}`,
        "Close 1 day before expiry",
      ],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "Weekly expiry",
      entryTrigger: `Week-ahead: write the condor only while spot stays inside ${supportText}–${resistanceText} (last close ${closeText || "—"}).`,
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
      ...spotZone(support, price),
      stopLoss: "2× credit received",
      targets: { t1: "50% credit", t2: "Full credit" },
      exitConditions: ["Book 50% credit", `Exit if spot below ${otmPutText}`],
      maxRisk: otmPut && farPut ? Number((otmPut - farPut).toFixed(2)) : null,
      maxReward: null,
      holdingPeriod: "Weekly",
      entryTrigger: `Week-ahead: write the put spread if spot holds above ${supportText} after the next open. Last close ${closeText || "—"}.`,
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
      ...spotZone(price, resistance),
      stopLoss: "2× credit received",
      targets: { t1: "50% credit", t2: "Full credit" },
      exitConditions: ["Book 50% credit", `Exit on close above ${resistanceText}`],
      maxRisk: farCall && otmCall ? Number((farCall - otmCall).toFixed(2)) : null,
      maxReward: null,
      holdingPeriod: "Weekly",
      entryTrigger: `Week-ahead: write the call spread if spot stays below ${resistanceText} after the next open. Last close ${closeText || "—"}.`,
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
      ...spotZone(resistance ?? sessionHigh ?? price, resistance ?? sessionHigh ?? price),
      stopLoss: "50% premium decay after entry",
      targets: { t1: "2× premium", t2: "3× premium" },
      exitConditions: ["Book partial at Target 1", "Stop on trend reversal"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      entryTrigger: resistanceText
        ? `Week-ahead: buy ${otmCallText} CE if spot breaks ${resistanceText} with momentum. Last close ${closeText || "—"}.`
        : highText
          ? `Week-ahead: buy ${otmCallText} CE if spot breaks last high ${highText}. Last close ${closeText || "—"}.`
          : `Week-ahead: buy ${otmCallText} CE only after a confirmed upside close. Last close ${closeText || "—"}.`,
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
      ...spotZone(support ?? sessionLow ?? price, support ?? sessionLow ?? price),
      stopLoss: "50% premium decay after entry",
      targets: { t1: "2× premium", t2: "3× premium" },
      exitConditions: ["Book at Target 1", "Stop on reclaim above 20 DMA"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "2–5 sessions",
      entryTrigger: supportText
        ? `Week-ahead: buy ${otmPutText} PE if spot breaks ${supportText}. Last close ${closeText || "—"}.`
        : lowText
          ? `Week-ahead: buy ${otmPutText} PE if spot breaks last low ${lowText}. Last close ${closeText || "—"}.`
          : `Week-ahead: buy ${otmPutText} PE only after a confirmed downside close. Last close ${closeText || "—"}.`,
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
      ...spotZone(support, resistance),
      stopLoss: `Invalid if ${displayName} closes back inside ${supportText}–${resistanceText} after the break`,
      targets: {
        t1: `Upside plan: close and hold above ${resistanceText}`,
        t2: `Downside plan: close and hold below ${supportText}`,
      },
      exitConditions: [
        "Do not buy the straddle while spot is still inside the range",
        `Last close ${closeText || "—"}. Act only on a next-session close outside ${supportText}–${resistanceText}`,
      ],
      maxRisk: Number((resistance - support).toFixed(2)),
      maxReward: null,
      holdingPeriod: "1–3 sessions after breakout",
      entryTrigger: `Week-ahead straddle at ${atmText}: last close ${closeText || "—"}. Buy ATM CE+PE only after a close outside ${supportText}–${resistanceText}.`,
      why: [...whyBase, "Neutral last-close map — breakout plan for the next session, not an in-range entry"],
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
      ...(trend === "BEARISH" ? spotZone(price, resistance ?? sessionHigh) : spotZone(support ?? sessionLow, price)),
      stopLoss: trend === "BEARISH"
        ? (resistanceText ? `Invalid if ${displayName} reclaims ${resistanceText}` : "Spot close above 20 DMA")
        : (supportText ? `Invalid if ${displayName} closes below ${supportText}` : "Spot close below 20 DMA"),
      targets: { t1: "1.5× premium after entry", t2: "2.5× premium" },
      exitConditions: ["ADX-supported trend trade", "Trail stop after Target 1"],
      maxRisk: null,
      maxReward: null,
      holdingPeriod: "3–7 sessions",
      entryTrigger: `ADX ${adx.toFixed(1)} — week-ahead continuation only after the next session confirms ${trend === "BEARISH" ? "weakness" : "strength"}. Last close ${closeText || "—"}.`,
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
        ...(rsiBias === "Bullish" ? spotZone(support ?? sessionLow, price) : spotZone(price, resistance ?? sessionHigh)),
        stopLoss: "50% premium or RSI reversal",
        targets: { t1: "1.5× premium", t2: "2× premium" },
        exitConditions: ["RSI divergence exit", "Time exit before expiry"],
        maxRisk: null,
        maxReward: null,
        holdingPeriod: "2–5 sessions",
        entryTrigger: `RSI ${rsi.toFixed(1)} — week-ahead ${rsiBias.toLowerCase()} only if Monday's session agrees. Last close ${closeText || "—"}.`,
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
    ...spotZone(support ?? sessionLow ?? otmPut, price),
    stopLoss: "Premium decay beyond 40%",
    targets: { t1: "Portfolio hedge active below support", t2: "Roll if spot stabilizes" },
    exitConditions: ["Hold as portfolio hedge", "Exit if underlying recovers above 20 DMA"],
    maxRisk: null,
    maxReward: null,
    holdingPeriod: "2–4 weeks",
    entryTrigger: supportText
      ? `Week-ahead hedge: buy puts if the book is long and spot nears ${supportText}. Last close ${closeText || "—"}.`
      : "Week-ahead hedge — enter after the next open if risk-off conditions persist",
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
    ...spotZone(sessionHigh ?? resistance ?? price, sessionHigh ?? resistance ?? price),
    stopLoss: "50% premium decay",
    targets: { t1: "2× premium", t2: "3× premium" },
    exitConditions: ["Volume must confirm breakout", "Exit on failed breakout (bull trap)"],
    maxRisk: null,
    maxReward: null,
    holdingPeriod: "2–5 sessions",
    entryTrigger: highText
      ? `Week-ahead: buy the breakout only on a close above last session high ${highText} with volume.`
      : buildTriggerEntry(roundedContext, "Bullish"),
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

  return unique
    .slice(0, 10)
    .map((s) => enrichPreMarketFromChain(applyStructuralRiskReward(s, roundedContext), chain));
}

function applyStructuralRiskReward(strategy, context) {
  const price = roundLevel(context?.price);
  const support = roundLevel(context?.support);
  const resistance = roundLevel(context?.resistance);
  const definedWidth = /spread|condor|butterfly|straddle|strangle/i.test(String(strategy.type || ""));

  if (strategy.maxRisk != null && strategy.maxReward != null && strategy.maxRisk > 0) {
    return {
      ...strategy,
      riskRewardRatio:
        strategy.riskRewardRatio ?? Number((strategy.maxReward / strategy.maxRisk).toFixed(2)),
    };
  }
  // Spreads already carry a strike-width figure — do not mix that with spot S/R.
  if (definedWidth) return strategy;
  if (price == null) return strategy;

  if (strategy.bias === "Bullish" && support != null && resistance != null && resistance > price && price > support) {
    const risk = price - support;
    const reward = resistance - price;
    if (risk > 0 && reward > 0) {
      return {
        ...strategy,
        maxRisk: strategy.maxRisk ?? Number(risk.toFixed(2)),
        maxReward: strategy.maxReward ?? Number(reward.toFixed(2)),
        riskRewardRatio: Number((reward / risk).toFixed(2)),
        structuralRiskNote: "Spot R:R from verified support/resistance (index points)",
      };
    }
  }

  if (strategy.bias === "Bearish" && support != null && resistance != null && resistance > price && price > support) {
    const risk = resistance - price;
    const reward = price - support;
    if (risk > 0 && reward > 0) {
      return {
        ...strategy,
        maxRisk: strategy.maxRisk ?? Number(risk.toFixed(2)),
        maxReward: strategy.maxReward ?? Number(reward.toFixed(2)),
        riskRewardRatio: Number((reward / risk).toFixed(2)),
        structuralRiskNote: "Spot R:R from verified support/resistance (index points)",
      };
    }
  }

  if (strategy.bias === "Neutral" && support != null && resistance != null && resistance > support) {
    const range = Number((resistance - support).toFixed(2));
    if (range > 0) {
      return {
        ...strategy,
        maxRisk: strategy.maxRisk ?? range,
        structuralRiskNote: strategy.structuralRiskNote || "Spot range width from last-close S/R (index points)",
      };
    }
  }

  return strategy;
}

function promoteWatchToPlan(strategy) {
  if (!strategy?.strikes?.length) return strategy;
  const hadWatch = strategy.strikes.some((leg) => String(leg.action || "").toUpperCase() === "WATCH");
  if (!hadWatch) return strategy;
  return {
    ...strategy,
    strikes: strategy.strikes.map((leg) =>
      String(leg.action || "").toUpperCase() === "WATCH"
        ? { ...leg, action: "BUY", planned: true }
        : leg
    ),
  };
}

function enrichPreMarketFromChain(strategy, chain) {
  const planned = promoteWatchToPlan(strategy);
  if (!planned?.strikes?.length) return planned;

  if (!chain?.available) return planned;

  const legs = planned.strikes.map((s) => {
    const leg = getLegAtStrike(chain, s.strike, s.type);
    return leg?.premium != null ? { ...s, premium: leg.premium } : s;
  });

  let net = 0;
  let hasPremium = false;
  legs.forEach((l) => {
    if (l.premium != null && (l.action === "BUY" || l.action === "SELL")) {
      hasPremium = true;
      net += l.action === "BUY" ? l.premium : -l.premium;
    }
  });

  if (!hasPremium) return { ...planned, strikes: legs };

  const absNet = Math.abs(net);
  const premiumZone = {
    low: Number((absNet * 0.92).toFixed(2)),
    high: Number((absNet * 1.08).toFixed(2)),
  };
  const keepSpotZone = planned.entryZoneKind === "spot" && planned.entryZone;
  const next = {
    ...planned,
    strikes: legs,
    premiums: { net: Number(net.toFixed(2)) },
    premiumZone,
    entryZone: keepSpotZone ? planned.entryZone : premiumZone,
    entryZoneKind: keepSpotZone ? "spot" : "premium",
    premiumNote:
      "Reference premium from last verified NSE close — not the next session's LTP. Recheck at the open.",
  };

  return enrichStrategyWithPayoff(next, {
    spot: chain.underlying ?? null,
    lotSize: chain.lotSize ?? null,
  });
}

function annotateForPlanning(strategy, marketStatus, chainMeta) {
  if (!strategy) return strategy;
  const hasReferencePremium = strategy.premiums?.net != null;
  const planningHorizon = derivePlanningHorizon(strategy);
  const state = planningState(planningHorizon);

  return {
    ...strategy,
    name: stripPreMarketPrefix(strategy.name),
    status: strategy.status === "Defer" ? "Defer" : state.status,
    mode: "planning",
    planningHorizon,
    modeLabel: `${state.label} — last verified close`,
    premiumNote: hasReferencePremium
      ? "Last traded NSE premium from the prior session — use it to size the week-ahead plan. LTP will change at the next open; recheck before you send the order."
      : strategy.premiumNote || FILL_AT_OPEN,
    entryZone: strategy.entryZone || null,
    entryZoneKind: strategy.entryZoneKind || (hasReferencePremium ? "premium" : strategy.entryZone ? "spot" : null),
    entryTrigger: normalizePlanningText(strategy.entryTrigger || buildTriggerEntry(
      { support: strategy.support, resistance: strategy.resistance },
      strategy.bias
    )),
    dataAsOf: chainMeta?.fetchedAt || null,
    planningSession: marketStatus?.nextSessionDate || null,
  };
}

function annotateForPreMarket(strategy, chainMeta) {
  return annotateForPlanning(strategy, null, chainMeta);
}

function annotateForLive(strategy) {
  return {
    ...strategy,
    name: stripPreMarketPrefix(strategy.name),
    status: strategy.status === "Defer" ? "Defer" : strategy.status === "Wait" ? "Watch" : "Live",
    mode: "live",
    planningHorizon: null,
    modeLabel: "Live strategy — real-time verified data",
    premiumNote: null,
  };
}

function finalizeStrategies(strategies, marketStatus, chainMeta) {
  const list = strategies || [];
  if (marketStatus?.mode === "live") {
    return list.map(annotateForLive);
  }
  return list.map((s) => annotateForPlanning(s, marketStatus, chainMeta));
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

/**
 * Fill ranked list to target size using verified technical setups (no duplicate names).
 */
/** Guarantee contiguous ranks #1..#n after sort/finalize (never skip even numbers). */
function assignSequentialRanks(strategies) {
  return (strategies || []).map((strategy, index) => ({
    ...strategy,
    rank: index + 1,
  }));
}

function supplementCandidates(primary, context, instrument = "NIFTY", target = 10) {
  const merged = [...(primary || [])];
  if (merged.length >= target) return merged;

  const seen = new Set(merged.map((s) => s.name));
  const extras = generateTechnicalSetups(context, instrument);
  for (const setup of extras) {
    if (merged.length >= target) break;
    if (seen.has(setup.name)) continue;
    seen.add(setup.name);
    merged.push(setup);
  }
  return merged;
}

function sessionLevelsFromCandles(candles) {
  const valid = (candles || []).filter((c) => c.close != null);
  const last = valid.at(-1);
  if (!last) return { sessionHigh: null, sessionLow: null, sessionClose: null, sessionDate: null };
  return {
    sessionHigh: roundLevel(last.high ?? last.close),
    sessionLow: roundLevel(last.low ?? last.close),
    sessionClose: roundLevel(last.close),
    sessionDate: last.date ?? null,
  };
}

module.exports = {
  PRE_MARKET_LABEL,
  PLANNING_LABEL,
  FILL_AT_OPEN,
  stripPreMarketPrefix,
  derivePlanningHorizon,
  planningState,
  roundStrike,
  strikeStep,
  roundLevel,
  formatLevel,
  makePreMarketStrategy,
  generateTechnicalSetups,
  supplementCandidates,
  assignSequentialRanks,
  annotateForPreMarket,
  annotateForPlanning,
  annotateForLive,
  finalizeStrategies,
  rankPreMarketSetups,
  scorePreMarket,
  buildTriggerEntry,
  sessionLevelsFromCandles,
  applyStructuralRiskReward,
  promoteWatchToPlan,
};
