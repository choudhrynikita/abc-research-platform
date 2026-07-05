const { UNAVAILABLE_FIELD } = require("./format");
const { MESSAGES, getPolicyMeta } = require("./financial-intelligence");

const NA_MSG = MESSAGES.UNAVAILABLE_CURRENT;
const NA_CONFIRM = MESSAGES.UNCONFIRMED;
const NA_INSUFFICIENT = MESSAGES.INSUFFICIENT_DATA;

const MAX_HISTORY = 40;
const MAX_QUERY_LEN = 2000;

const STRATEGY_EDUCATION = {
  "Long CE": {
    profile: "Directional bullish — profits when underlying rises above strike plus premium paid.",
    volOutlook: "Long options are long Vega — rising IV generally helps, falling IV hurts.",
    timeDecay: "Long premium positions are short Theta — time decay works against the holder.",
    risks: ["Premium can decay to zero even if direction is correct but move is too slow.", "Wrong timing relative to expiry is a common mistake."],
    adjustments: ["Roll to a later expiry if thesis intact but time running out.", "Convert to a spread to reduce premium outlay and Theta exposure."],
    exit: ["Take profits at predefined targets (T1/T2).", "Exit on stop-loss or when thesis is invalidated."],
    avoid: ["Avoid when IV is extremely elevated unless expecting a large move.", "Avoid holding deep OTM calls into expiry without a catalyst."],
    misconceptions: ["A correct directional view does not guarantee profit — magnitude and timing matter.", "Delta alone does not equal probability of expiring ITM."],
  },
  "Long PE": {
    profile: "Directional bearish — profits when underlying falls below strike minus premium paid.",
    volOutlook: "Long puts benefit from rising IV; IV crush after events hurts long premium.",
    timeDecay: "Theta erodes long put value daily — need timely downside follow-through.",
    risks: ["Sharp rallies can wipe premium quickly.", "Gap-up opens can cause significant loss on long puts."],
    adjustments: ["Roll down and out if bearish thesis persists.", "Pair with a short call (bear call spread) to finance Theta."],
    exit: ["Book at support targets or partial on fast moves.", "Stop when spot reclaims key resistance."],
    avoid: ["Low IV environments with no catalyst.", "Buying puts purely for hedging without sizing to portfolio risk."],
    misconceptions: ["Puts do not always rise 1:1 with spot declines due to IV and time effects.", "Protective puts are insurance — not profit engines by default."],
  },
  "Bull Call Spread": {
    profile: "Defined-risk bullish debit spread — caps upside in exchange for lower cost.",
    volOutlook: "Moderately long Vega on net debit; less IV-sensitive than naked long calls.",
    timeDecay: "Net Theta depends on strike selection — typically negative on debit spreads.",
    risks: ["Max loss is the net debit paid.", "Capped reward if underlying rallies beyond short strike."],
    adjustments: ["Roll entire spread higher if bullish continuation after partial profit.", "Widen strikes only if willing to increase risk."],
    exit: ["Target 50–80% of max spread value.", "Stop at 50% of debit if thesis fails."],
    avoid: ["Very wide spreads with poor liquidity on wings.", "Entering when IV rank is extreme without edge."],
    misconceptions: ["Max profit is limited to spread width minus debit — not unlimited.", "Breakeven is not the long strike alone — includes net premium."],
  },
  "Bear Put Spread": {
    profile: "Defined-risk bearish debit spread.",
    volOutlook: "Moderate Vega exposure; benefits somewhat from IV expansion.",
    timeDecay: "Negative Theta on net debit — needs downside move within horizon.",
    risks: ["Full debit at risk.", "Reward capped at spread width minus debit."],
    adjustments: ["Roll down/out if breakdown delayed but thesis intact."],
    exit: ["80% of max value or at support targets.", "50% debit stop."],
    avoid: ["Illiquid strikes with wide bid-ask.", "Fighting strong institutional inflows."],
    misconceptions: ["Spread does not behave like a naked put near max profit zone."],
  },
  "Iron Condor": {
    profile: "Neutral premium collection — profits if underlying stays between short strikes.",
    volOutlook: "Short Vega — benefits from IV contraction; hurt by IV spikes.",
    timeDecay: "Positive Theta — time decay is the primary edge.",
    risks: ["Tail risk on large moves beyond wings.", "Gap moves can breach short strikes before adjustment."],
    adjustments: ["Roll untested side or convert to iron fly.", "Close early at 50% of max credit."],
    exit: ["50% credit target is standard institutional practice.", "Close 1–2 days before expiry to avoid gamma risk."],
    avoid: ["High VIX without adequate wing width.", "Earnings or major event windows unless hedged."],
    misconceptions: ["High win rate does not imply low risk — losses can be large relative to credit.", "Max pain is a positioning guide, not a price target."],
  },
  "Credit Spread": {
    profile: "Premium collection with defined risk — bull put or bear call variant.",
    volOutlook: "Short Vega — IV crush helps; sudden expansion hurts.",
    timeDecay: "Positive Theta — theta decay supports the position.",
    risks: ["Loss can approach spread width minus credit.", "Assignment risk on short legs near expiry."],
    adjustments: ["Roll for credit if tested but thesis intact.", "Close and re-establish at new strikes."],
    exit: ["Book at 50% of max credit.", "Exit if short strike is breached with conviction."],
    avoid: ["Selling spreads into binary events without verified dates.", "Chasing credit in low-liquidity names."],
    misconceptions: ["Credit received is not 'free money' — it is compensation for tail risk."],
  },
  "Straddle Watch": {
    profile: "Breakout preparation — not an active position until range break confirms.",
    volOutlook: "Long straddle would be long Vega; watch mode has no Greeks until entered.",
    timeDecay: "N/A until position is initiated.",
    risks: ["False breakouts (whipsaw) within the range.", "IV expansion raises entry cost if waited too long."],
    adjustments: ["Enter only after verified breakout with volume.", "Use defined-risk spreads instead of naked straddle if IV is high."],
    exit: ["Abort if price returns inside range.", "Time stop if breakout fails within expected window."],
    avoid: ["Entering inside the range without confirmation.", "Ignoring India VIX regime."],
    misconceptions: ["Watch status is not a live straddle — premiums are not yet committed."],
  },
};

const DEFAULT_EDUCATION = {
  profile: "Multi-leg options structure — review legs, bias, and defined risk parameters.",
  volOutlook: "Vega exposure depends on net long vs short premium — inspect verified Greeks when available.",
  timeDecay: "Theta impact depends on whether the position is net long or short premium.",
  risks: ["Undefined or unverified metrics increase model risk.", "Liquidity and slippage can differ from displayed premiums."],
  adjustments: ["Adjust only with a clear thesis change — roll, close, or hedge with defined risk."],
  exit: ["Follow the strategy's documented exit conditions.", "Reduce size before expiry gamma increases."],
  avoid: ["Trading without verified chain data in fast markets.", "Oversizing relative to verified capital requirements."],
  misconceptions: ["Past backtest or confidence scores are not guarantees of future outcomes."],
};

function fmtNum(v, digits = 2) {
  if (v == null || Number.isNaN(v)) return null;
  return typeof v === "number" ? Number(v.toFixed(digits)) : String(v);
}

function fmtRs(v) {
  const n = fmtNum(v);
  return n != null ? `₹${n}` : null;
}

function verifiedOrNa(value, label) {
  if (value == null || value === "" || Number.isNaN(value)) {
    return { text: NA_MSG, verified: false, field: label };
  }
  return { text: String(value), verified: true, field: label };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY);
}

function strategyLabel(strategy, module) {
  if (module === "equity-fno") {
    return strategy?.companyName || strategy?.name || strategy?.nseSymbol || "Equity F&O Strategy";
  }
  return strategy?.name || "NIFTY Strategy";
}

function underlyingSymbol(strategy, module) {
  if (module === "equity-fno") return strategy?.nseSymbol || strategy?.symbol || null;
  return "NIFTY";
}

function getEducation(type) {
  return STRATEGY_EDUCATION[type] || DEFAULT_EDUCATION;
}

function buildVerifiedSnapshot(strategy, marketContext, derivativesIntel, module, refreshedAt) {
  const a = strategy?.analytics || {};
  const ps = strategy?.positionSizing || {};
  const vol = derivativesIntel?.volatility || {};
  const g = vol.greeks || a;
  const strikes = (strategy?.strikes || [])
    .filter((leg) => leg.action !== "WATCH")
    .map((leg) => ({
      action: leg.action,
      type: leg.type,
      strike: leg.strike ?? null,
      premium: leg.premium ?? null,
      verified: leg.premium != null && leg.strike != null,
    }));

  return {
    module,
    strategyName: strategyLabel(strategy, module),
    strategyType: strategy?.type ?? null,
    bias: strategy?.bias ?? null,
    status: strategy?.status ?? null,
    expiry: strategy?.expiry ?? null,
    expiryType: strategy?.expiryType ?? null,
    underlying: underlyingSymbol(strategy, module),
    netPremium: strategy?.premiums?.net ?? null,
    maxRisk: strategy?.maxRisk ?? null,
    maxReward: strategy?.maxReward ?? null,
    riskRewardRatio: strategy?.riskRewardRatio ?? null,
    breakEven: ps?.breakEven ?? null,
    capitalRequired: ps?.capitalRequired ?? null,
    lotSize: ps?.lotSize ?? null,
    marginNote: ps?.marginNote ?? null,
    confidenceScore: strategy?.confidenceScore ?? null,
    entryTrigger: strategy?.entryTrigger ?? null,
    exitConditions: strategy?.exitConditions ?? [],
    strikes,
    greeks: {
      delta: g?.delta ?? a?.delta ?? null,
      gamma: g?.gamma ?? a?.gamma ?? null,
      theta: g?.theta ?? a?.theta ?? null,
      vega: g?.vega ?? a?.vega ?? null,
      iv: g?.iv ?? a?.impliedVolatility ?? vol?.impliedVolatility ?? null,
      source: g?.source ?? a?.greeksSource ?? vol?.impliedVolatilityMeta?.source ?? null,
    },
    ivRank: vol?.ivRankNumeric ?? null,
    ivPercentile: vol?.ivPercentileNumeric ?? null,
    indiaVix: vol?.indiaVix ?? marketContext?.indiaVix?.value ?? marketContext?.vix ?? null,
    putCallRatio: derivativesIntel?.marketFlow?.putCallRatio ?? marketContext?.chain?.putCallRatio ?? null,
    maxPain: marketContext?.chain?.maxPain ?? null,
    spotPrice: marketContext?.price ?? marketContext?.spotPrice ?? null,
    trend: marketContext?.trend ?? marketContext?.marketTrend ?? null,
    support: marketContext?.support ?? null,
    resistance: marketContext?.resistance ?? null,
    refreshedAt: refreshedAt ?? derivativesIntel?.fetchedAt ?? strategy?.lastUpdated ?? null,
    chainVerified: derivativesIntel?.verified === true,
    mode: strategy?.mode ?? null,
  };
}

function classifyIntent(query) {
  const q = query.toLowerCase().trim();

  const rules = [
    { intent: "live_iv", patterns: ["current iv", "latest iv", "what is iv", "implied volatility now", "live iv"] },
    { intent: "live_greeks", patterns: ["current greek", "latest greek", "live greek", "what is delta", "what is gamma", "what is theta", "what is vega"] },
    { intent: "live_price", patterns: ["current price", "current premium", "option price", "latest premium", "live payoff", "today's change"] },
    { intent: "live_oi", patterns: ["open interest", "latest oi", "current oi", "volume now", "latest volume"] },
    { intent: "why_strategy", patterns: ["why this strategy", "why does this strategy", "why does this work", "why choose this", "why this setup"] },
    { intent: "why_strike", patterns: ["why this strike", "why these strikes", "strike selection", "why choose this strike"] },
    { intent: "why_expiry", patterns: ["why this expiry", "why monthly", "why weekly", "expiry selection"] },
    { intent: "iv_rise", patterns: ["iv rise", "iv rises", "iv increase", "if iv rises", "volatility rises", "vol expansion", "iv expand"] },
    { intent: "iv_fall", patterns: ["iv fall", "iv falls", "iv drop", "if iv falls", "volatility falls", "iv crush", "iv contraction"] },
    { intent: "vega", patterns: ["vega positive", "vega negative", "why is vega", "what is vega"] },
    { intent: "theta", patterns: ["theta negative", "theta positive", "why is theta", "time decay", "time decay affect"] },
    { intent: "gamma", patterns: ["gamma increasing", "why is gamma", "what is gamma", "gamma risk"] },
    { intent: "delta", patterns: ["delta changing", "why is delta", "what is delta"] },
    { intent: "breakeven", patterns: ["break-even", "breakeven", "break even", "how is break"] },
    { intent: "max_loss", patterns: ["maximum loss", "maximum possible loss", "max loss", "max possible loss", "worst case"] },
    { intent: "max_profit", patterns: ["maximum profit", "max profit", "max reward", "best case"] },
    { intent: "adjustment", patterns: ["adjust", "adjustment", "can i adjust", "roll the position", "manage the trade"] },
    { intent: "exit", patterns: ["when should i exit", "when to exit", "exit strategy", "take profit", "when should i close"] },
    { intent: "avoid", patterns: ["when should i avoid", "when to avoid", "not suitable", "should i avoid"] },
    { intent: "market_conditions", patterns: ["market conditions", "most suitable", "when to use", "ideal conditions", "best environment"] },
    { intent: "risks", patterns: ["major risks", "what are the risks", "risk profile", "downside risk", "tail risk"] },
    { intent: "near_expiry", patterns: ["near expiry", "close to expiry", "expiry day", "last week", "into expiry"] },
    { intent: "earnings", patterns: ["earnings", "results", "quarterly"] },
    { intent: "gap", patterns: ["gap up", "gap down", "gap move", "market gaps", "opening gap"] },
    { intent: "calculation", patterns: ["how is this calculated", "how calculated", "formula", "show formula", "calculation method"] },
    { intent: "margin", patterns: ["margin requirement", "margin needed", "capital required", "how much capital"] },
    { intent: "scenario", patterns: ["what happens if", "scenario", "if spot moves", "if market moves", "if nifty"] },
    { intent: "misconception", patterns: ["misconception", "common mistake", "mistakes", "myth"] },
    { intent: "faq", patterns: ["faq", "frequently asked"] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((p) => q.includes(p))) return rule.intent;
  }
  return "general";
}

function getSuggestedQuestions(strategy) {
  const type = strategy?.type || "options";
  const base = [
    "Why does this strategy work?",
    "What is the maximum possible loss?",
    "How are break-even points calculated?",
    "What happens if IV rises?",
    "What happens if IV falls?",
    "When should I exit this position?",
    "What are the major risks?",
    "How does time decay affect this position?",
  ];

  const typeSpecific = {
    "Iron Condor": ["Why is Theta positive here?", "What happens near expiry?", "When should I avoid this strategy?"],
    "Credit Spread": ["Why is Vega negative on credit spreads?", "What happens if the market gaps?"],
    "Bull Call Spread": ["Why choose this strike width?", "Can the strategy be adjusted?"],
    "Bear Put Spread": ["Why this expiry?", "What market conditions are most suitable?"],
    "Long CE": ["Why is Theta negative?", "What happens after a volatility expansion?"],
    "Long PE": ["Why is Delta changing?", "What happens if the market gaps up?"],
    "Straddle Watch": ["When should I enter — not just watch?", "What happens if IV expands before breakout?"],
  };

  const extra = typeSpecific[type] || ["Why choose these strikes?", "Can the strategy be adjusted?"];
  return [...base.slice(0, 5), ...extra.slice(0, 3)];
}

function getEducationalInsights(strategy) {
  const edu = getEducation(strategy?.type);
  return {
    riskDiscussion: edu.risks,
    practicalNotes: edu.exit,
    limitations: [
      "All live metrics require verified NSE option chain data — missing fields are not estimated.",
      "Confidence score reflects signal alignment, not probability of profit.",
      strategy?.mode === "pre-market"
        ? "Pre-market mode uses last verified close — confirm premiums at market open."
        : null,
    ].filter(Boolean),
    alternatives: edu.adjustments,
    commonMisconceptions: edu.misconceptions,
  };
}

function getFaqs(strategy) {
  const edu = getEducation(strategy?.type);
  return [
    { q: "What is the risk profile?", a: edu.profile },
    { q: "How does volatility affect this?", a: edu.volOutlook },
    { q: "How does time decay interact?", a: edu.timeDecay },
    { q: "When should I avoid this?", a: edu.avoid.join(" ") },
  ];
}

function paragraph(lines) {
  return lines.filter(Boolean).join("\n\n");
}

function formatWhyRationale(strategy) {
  const why = strategy?.why || [];
  if (!why.length) return NA_CONFIRM;
  return why
    .map((w) => {
      if (typeof w === "string") return `• ${w}`;
      const tag = w.category ? `[${w.category}] ` : "";
      return `• ${tag}${w.text}`;
    })
    .join("\n");
}

function greekSignEducation(greek, value, strategyType) {
  const isShortPremium = ["Iron Condor", "Credit Spread"].includes(strategyType);
  const edu = getEducation(strategyType);

  if (value == null) {
    return paragraph([
      `**${greek}** measures sensitivity of option price to changes in ${greek === "Delta" ? "underlying price" : greek === "Gamma" ? "delta" : greek === "Theta" ? "time" : "implied volatility"}.`,
      `${NA_INSUFFICIENT} Verified ${greek} for this strategy is not currently loaded.`,
      `Educational context: ${greek === "Vega" ? edu.volOutlook : greek === "Theta" ? edu.timeDecay : "Inspect net long/short premium to infer directional sensitivity."}`,
    ]);
  }

  const num = Number(value);
  const sign = num > 0 ? "positive" : num < 0 ? "negative" : "neutral";

  const explanations = {
    Vega: isShortPremium
      ? `Verified Vega is ${sign} (${num}). Short premium structures are typically short Vega — IV contraction helps, expansion hurts. ${edu.volOutlook}`
      : `Verified Vega is ${sign} (${num}). Long premium structures are typically long Vega — rising IV helps holders, falling IV erodes value. ${edu.volOutlook}`,
    Theta: isShortPremium
      ? `Verified Theta is ${sign} (${num}). Short premium positions often benefit from time decay (positive Theta on net credit). ${edu.timeDecay}`
      : `Verified Theta is ${sign} (${num}). Long premium positions lose value from time decay (negative Theta). ${edu.timeDecay}`,
    Gamma: `Verified Gamma is ${sign} (${num}). Gamma measures how quickly Delta changes. Gamma rises near expiry and near ATM — expect faster Delta swings as expiration approaches.`,
    Delta: `Verified Delta is ${sign} (${num}). Delta approximates directional exposure per unit move in the underlying. It changes with spot, time, and IV (see Gamma).`,
  };

  return explanations[greek] || `Verified ${greek}: ${num}.`;
}

function answerLiveMetric(intent, snap) {
  const lines = ["**Verified Market Data**"];

  const push = (label, value, source) => {
    if (value == null) lines.push(`• ${label}: ${NA_MSG}`);
    else lines.push(`• ${label}: ${value}${source ? ` (${source})` : ""}`);
  };

  if (intent === "live_iv") {
    push("ATM Implied Volatility", snap.greeks.iv != null ? `${fmtNum(snap.greeks.iv)}%` : null, snap.greeks.source);
    push("IV Rank", snap.ivRank != null ? `${fmtNum(snap.ivRank)}` : UNAVAILABLE_FIELD, "verified IV history engine");
    push("IV Percentile", snap.ivPercentile != null ? `${fmtNum(snap.ivPercentile)}` : UNAVAILABLE_FIELD, "verified IV history engine");
    push("India VIX", snap.indiaVix != null ? fmtNum(snap.indiaVix) : null, "Yahoo Finance ^INDIAVIX");
    if (snap.greeks.iv == null) lines.push(`\n${NA_INSUFFICIENT}`);
    return paragraph(lines);
  }

  if (intent === "live_greeks") {
    push("Delta", snap.greeks.delta, snap.greeks.source);
    push("Gamma", snap.greeks.gamma, snap.greeks.source);
    push("Theta", snap.greeks.theta, snap.greeks.source);
    push("Vega", snap.greeks.vega, snap.greeks.source);
    if ([snap.greeks.delta, snap.greeks.gamma, snap.greeks.theta, snap.greeks.vega].every((v) => v == null)) {
      lines.push(`\n${NA_INSUFFICIENT}`);
    }
    return paragraph(lines);
  }

  if (intent === "live_price") {
    push("Underlying spot", snap.spotPrice != null ? fmtRs(snap.spotPrice) : null, "verified price feed");
    push("Net premium", snap.netPremium != null ? fmtRs(Math.abs(snap.netPremium)) : null, snap.mode === "pre-market" ? "reference close" : "NSE chain");
    const legLines = snap.strikes.map((leg) => {
      if (leg.premium == null) return `• ${leg.action} ${leg.type} ${leg.strike}: ${NA_MSG}`;
      return `• ${leg.action} ${leg.type} ${leg.strike}: ₹${fmtNum(leg.premium)}`;
    });
    lines.push(...(legLines.length ? legLines : [`• Leg premiums: ${NA_MSG}`]));
    lines.push("\nLive payoff requires full chain refresh — values above are from the last verified snapshot only.");
    return paragraph(lines);
  }

  if (intent === "live_oi") {
    push("Put-Call Ratio", snap.putCallRatio, snap.chainVerified ? "NSE OI" : null);
    push("Max pain", snap.maxPain, snap.chainVerified ? "NSE OI" : null);
    if (!snap.chainVerified) lines.push(`\n${NA_INSUFFICIENT}`);
    return paragraph(lines);
  }

  return NA_INSUFFICIENT;
}

function answerIvScenario(rising, snap, strategyType) {
  const edu = getEducation(strategyType);
  const ivDisplay = snap.greeks.iv != null ? `${fmtNum(snap.greeks.iv)}%` : NA_MSG;
  const vixDisplay = snap.indiaVix != null ? fmtNum(snap.indiaVix) : NA_MSG;

  return paragraph([
    `**Scenario: IV ${rising ? "Rises" : "Falls"}**`,
    `Verified ATM IV: ${ivDisplay}. India VIX: ${vixDisplay}.`,
    rising
      ? `If implied volatility expands from current levels: ${edu.volOutlook} Short premium structures (credit spreads, iron condors) face headwinds; long premium may benefit if move magnitude offsets Theta.`
      : `If implied volatility contracts: ${edu.volOutlook} Premium sellers generally benefit; long option holders face IV crush risk even on correct direction.`,
    "**Assumptions:** Scenario is educational — magnitude and timing of IV change are not predicted. No fabricated probability or P&L estimates.",
    "**Practical note:** Monitor verified IV Rank/Percentile before sizing — unverified values are not used.",
  ]);
}

function answerBreakeven(snap, strategy) {
  const be = snap.breakEven;
  const ps = strategy?.positionSizing || {};

  if (be != null) {
    return paragraph([
      "**Break-Even Analysis**",
      `Verified break-even: ${be}`,
      ps?.note ? `Note: ${ps.note}` : null,
      "**Formula logic:** Break-even combines strike prices and net premium per standard options payoff definitions. Debit spreads: long strike ± net debit. Credit spreads: short strike ± net credit. Iron condors: upper and lower breakevens from wing widths and credit.",
      ps?.available === false ? `Position sizing: ${ps.note || NA_CONFIRM}` : null,
    ]);
  }

  const net = snap.netPremium;
  const legs = snap.strikes.filter((l) => l.strike != null);
  if (net == null || !legs.length) {
    return paragraph([
      "**Break-Even Analysis**",
      NA_INSUFFICIENT,
      "Break-even requires verified strike prices and net premium from the NSE option chain. Pre-market strategies without confirmed premiums cannot compute break-even numerically.",
    ]);
  }

  return paragraph([
    "**Break-Even Analysis**",
    "Strikes are verified but net premium may still be pending confirmation.",
    `Strikes on file: ${legs.map((l) => `${l.action} ${l.type} ${l.strike}`).join(", ")}.`,
    "Apply standard payoff formulas once entry premium is confirmed at market open — no estimated break-even is displayed.",
  ]);
}

function answerCalculation(intent, snap, strategy) {
  const sections = ["**Calculation Transparency**"];

  if (intent === "calculation" || intent === "breakeven") {
    sections.push(
      "**Break-even:** Derived from strategy legs and net premium. Requires all leg premiums verified.",
      snap.breakEven != null ? `Verified result: ${snap.breakEven}` : `Result: ${NA_MSG}`
    );
  }

  if (intent === "calculation" || intent === "max_loss") {
    sections.push(
      "**Max loss:** For defined-risk spreads, max loss = net debit paid or spread width minus credit received.",
      snap.maxRisk != null ? `Verified max risk: ${fmtRs(snap.maxRisk)}` : `Max risk: ${NA_MSG}`
    );
  }

  if (intent === "calculation" || intent === "max_profit") {
    sections.push(
      "**Max reward:** Capped structures limit profit to spread width minus debit; undefined-risk long options have theoretically unlimited upside (calls) or large downside exposure (puts).",
      snap.maxReward != null ? `Verified max reward: ${fmtRs(snap.maxReward)}` : `Max reward: ${strategy?.maxReward === null ? "Unlimited (long options)" : NA_MSG}`
    );
  }

  if (intent === "calculation") {
    sections.push(
      `**R:R ratio:** Reward ÷ Risk using verified max reward and max risk.`,
      snap.riskRewardRatio != null ? `Verified R:R: ${snap.riskRewardRatio}:1` : `R:R: ${NA_MSG}`,
      `**IV Rank:** (Current IV − Min IV in lookback) ÷ (Max IV − Min IV) × 100 — requires 20+ verified historical ATM IV days.`,
      `**IV Percentile:** % of days in lookback with IV below current — same history requirement.`,
      `**Greeks:** Sourced from ${snap.greeks.source || "NSE option chain when available"} — not model-estimated.`
    );
  }

  return paragraph(sections);
}

function answerStrategyQuestion({
  query,
  strategy,
  marketContext = {},
  derivativesIntel = {},
  history = [],
  module = "nifty-strategy",
  refreshedAt = null,
  prefetch = false,
}) {
  if (!strategy) {
    return {
      answer: "Select a strategy from the list to enable the derivatives strategist assistant.",
      dataType: "educational",
      confidence: 100,
      suggestedFollowUps: [],
      unavailable: true,
    };
  }

  const snap = buildVerifiedSnapshot(strategy, marketContext, derivativesIntel, module, refreshedAt);
  const edu = getEducation(strategy.type);
  const suggestions = getSuggestedQuestions(strategy);
  const insights = getEducationalInsights(strategy);
  const faqs = getFaqs(strategy);

  if (prefetch) {
    return {
      answer: null,
      prefetch: true,
      ...getPolicyMeta(),
      strategyContext: {
        name: snap.strategyName,
        type: snap.strategyType,
        underlying: snap.underlying,
        bias: snap.bias,
        expiry: snap.expiry,
      },
      suggestedQuestions: suggestions,
      educationalInsights: insights,
      faqs,
      misconceptions: edu.misconceptions,
      exitConsiderations: edu.exit,
      dataType: "educational",
      confidence: 95,
      transparency: buildTransparency(snap),
    };
  }

  const rawQuery = String(query ?? "").trim();
  if (!rawQuery) {
    return {
      answer: "Ask any question about the selected strategy — strikes, Greeks, volatility, risk, exits, or calculations.",
      suggestedFollowUps: suggestions.slice(0, 4),
      dataType: "educational",
      confidence: 100,
      transparency: buildTransparency(snap),
    };
  }

  if (rawQuery.length > MAX_QUERY_LEN) {
    return { answer: `Question must be at most ${MAX_QUERY_LEN} characters.`, dataType: "educational", confidence: 100, error: true };
  }

  const intent = classifyIntent(rawQuery);
  const hist = normalizeHistory(history);
  let answer = "";
  let dataType = "educational";
  let confidence = 85;

  switch (intent) {
    case "live_iv":
    case "live_greeks":
    case "live_price":
    case "live_oi":
      answer = answerLiveMetric(intent, snap);
      dataType = "factual";
      confidence = snap.chainVerified ? 92 : 40;
      break;

    case "why_strategy":
      answer = paragraph([
        `**Why ${snap.strategyName}?**`,
        `Strategy type: **${snap.strategyType}** · Bias: **${snap.bias || "—"}** · Status: **${snap.status || "—"}**`,
        formatWhyRationale(strategy),
        `**Educational framing:** ${edu.profile}`,
        snap.confidenceScore != null
          ? `Confidence score ${snap.confidenceScore}% reflects multi-factor alignment — not a win probability.`
          : null,
      ]);
      break;

    case "why_strike":
      answer = paragraph([
        "**Strike Selection**",
        snap.strikes.length
          ? snap.strikes.map((l) => `• ${l.action} ${l.type} @ ${l.strike ?? "—"}${l.premium != null ? ` (premium ₹${fmtNum(l.premium)})` : ` (${NA_MSG})`}`).join("\n")
          : NA_CONFIRM,
        "Strikes are selected from verified ATM/OTM levels relative to spot and technical support/resistance — not random assignments.",
        snap.support != null || snap.resistance != null
          ? `Technical context: support ${snap.support ?? "—"}, resistance ${snap.resistance ?? "—"}.`
          : "Technical levels: not verified in current context.",
        strategy?.structuralRiskNote || null,
      ]);
      break;

    case "why_expiry":
      answer = paragraph([
        "**Expiry Selection**",
        `Selected expiry: **${snap.expiry || NA_MSG}** (${snap.expiryType || "—"}).`,
        snap.expiryType === "Weekly"
          ? "Weekly expiries suit short-term directional or event-driven setups with faster Theta — higher gamma risk near expiry."
          : "Monthly expiries provide more time for thesis to play out — useful for swing structures and lower gamma turnover.",
        edu.timeDecay,
      ]);
      break;

    case "iv_rise":
      answer = answerIvScenario(true, snap, strategy.type);
      break;

    case "iv_fall":
      answer = answerIvScenario(false, snap, strategy.type);
      break;

    case "vega":
      answer = greekSignEducation("Vega", snap.greeks.vega, strategy.type);
      break;
    case "theta":
      answer = greekSignEducation("Theta", snap.greeks.theta, strategy.type);
      break;
    case "gamma":
      answer = greekSignEducation("Gamma", snap.greeks.gamma, strategy.type);
      break;
    case "delta":
      answer = greekSignEducation("Delta", snap.greeks.delta, strategy.type);
      break;

    case "breakeven":
      answer = answerBreakeven(snap, strategy);
      dataType = snap.breakEven != null ? "mixed" : "educational";
      break;

    case "max_loss":
      answer = paragraph([
        "**Maximum Loss**",
        snap.maxRisk != null
          ? `Verified maximum defined risk: **${fmtRs(snap.maxRisk)}** per the strategy engine.`
          : `${NA_INSUFFICIENT} Max loss is not verified — common for pre-market setups awaiting premium confirmation.`,
        `For **${strategy.type}**: ${edu.profile}`,
        ...edu.risks.map((r) => `• ${r}`),
      ]);
      break;

    case "max_profit":
      answer = paragraph([
        "**Maximum Profit**",
        snap.maxReward != null
          ? `Verified max reward: **${fmtRs(snap.maxReward)}**.`
          : strategy.type?.includes("Long") && !strategy.type?.includes("Spread")
            ? "Long single-leg options have theoretically unlimited profit potential on calls (bounded by zero on puts for underlying)."
            : `${NA_MSG} Max reward not yet computed — confirm premiums at entry.`,
        edu.profile,
      ]);
      break;

    case "adjustment":
      answer = paragraph([
        "**Position Adjustments**",
        ...edu.adjustments.map((a) => `• ${a}`),
        "Only adjust when thesis changes — document new risk/reward before adding legs.",
        snap.status === "Wait" ? "Current status is **Wait** — adjustments are premature until entry triggers confirm." : null,
      ]);
      break;

    case "exit":
      answer = paragraph([
        "**Exit Considerations**",
        strategy.exitConditions?.length
          ? strategy.exitConditions.map((c) => `• ${c}`).join("\n")
          : edu.exit.map((c) => `• ${c}`).join("\n"),
        strategy.timeExit ? `Time exit rule: ${strategy.timeExit}` : null,
        strategy.indicatorExit ? `Indicator exit: ${strategy.indicatorExit}` : null,
        strategy.holdingPeriod ? `Holding period guidance: ${strategy.holdingPeriod}` : null,
      ]);
      break;

    case "avoid":
    case "market_conditions":
      answer = paragraph([
        intent === "avoid" ? "**When to Avoid**" : "**Suitable Market Conditions**",
        ...edu.avoid.map((a) => `• ${a}`),
        snap.trend ? `Current verified trend: **${snap.trend}** — assess alignment with **${snap.bias}** bias.` : `Trend: ${NA_MSG}`,
        snap.indiaVix != null ? `India VIX: ${fmtNum(snap.indiaVix)} — ${snap.indiaVix > 20 ? "elevated volatility regime" : "moderate volatility"}.` : null,
        edu.profile,
      ]);
      break;

    case "risks":
      answer = paragraph([
        "**Risk Profile**",
        `Strategy: ${snap.strategyType} · Bias: ${snap.bias}`,
        ...edu.risks.map((r) => `• ${r}`),
        snap.riskRewardRatio != null ? `Verified R:R: ${snap.riskRewardRatio}:1` : null,
        "**Limitation:** Tail events and liquidity gaps are not fully captured by static metrics.",
      ]);
      break;

    case "near_expiry":
      answer = paragraph([
        "**Near Expiry Dynamics**",
        "Gamma and Theta accelerate into expiration — Delta can swing rapidly for ATM positions.",
        strategy.type === "Iron Condor" || strategy.type === "Credit Spread"
          ? "Short premium near expiry: assignment and pin risk rise — institutional desks often close before expiry week."
          : "Long premium near expiry: Theta burn intensifies — need strong directional follow-through.",
        `Expiry on file: ${snap.expiry || NA_MSG}.`,
      ]);
      break;

    case "earnings":
      answer = paragraph([
        "**Earnings / Event Risk**",
        module === "equity-fno"
          ? `${NA_CONFIRM} Verified earnings dates are not loaded in this strategy context. Check official company filings and exchange announcements before event trades.`
          : "NIFTY index strategies are not single-stock earnings plays — monitor heavy-weight constituents and scheduled macro events instead.",
        "IV typically expands into events and contracts afterward (IV crush) — long premium holders face crush risk; sellers face gap risk.",
      ]);
      break;

    case "gap":
      answer = paragraph([
        "**Gap Risk**",
        "Overnight or opening gaps can skip through strikes — P&L at open may differ sharply from prior close marks.",
        strategy.type === "Iron Condor" || strategy.type === "Credit Spread"
          ? "Short premium structures: gaps beyond short strikes can produce max-loss approach quickly."
          : "Long premium: gaps in favorable direction help; adverse gaps can erode or destroy premium.",
        snap.entryTrigger ? `Entry discipline: ${snap.entryTrigger}` : null,
      ]);
      break;

    case "margin":
      answer = paragraph([
        "**Capital & Margin**",
        psVerified(snap)
          ? [
              snap.lotSize != null ? `Lot size: ${snap.lotSize}` : null,
              snap.capitalRequired != null ? `Capital required: ${fmtRs(snap.capitalRequired)}` : null,
              snap.marginNote ? `Margin note: ${snap.marginNote}` : null,
            ].filter(Boolean).join("\n")
          : `${NA_CONFIRM} Verified margin requirements from broker/exchange are not available in this platform snapshot.`,
        "Use exchange-published SPAN + exposure margin for exact requirements — not estimated here.",
      ]);
      break;

    case "calculation":
      answer = answerCalculation(intent, snap, strategy);
      dataType = "mixed";
      confidence = 90;
      break;

    case "scenario":
      answer = paragraph([
        "**Scenario Analysis (Educational)**",
        "Hypothetical — not a forecast. No fabricated P&L.",
        snap.spotPrice != null ? `Reference spot: ${fmtRs(snap.spotPrice)}.` : `Spot: ${NA_MSG}`,
        `If underlying moves sharply in favor of **${snap.bias}** bias: defined-risk structures approach max profit zone; long premium benefits if move exceeds premium paid plus Theta drag.`,
        `If underlying moves against bias: long premium may lose rapidly; credit structures approach max loss zone.`,
        `IV regime: ${edu.volOutlook}`,
      ]);
      dataType = "educational";
      confidence = 75;
      break;

    case "misconception":
      answer = paragraph([
        "**Common Misconceptions**",
        ...edu.misconceptions.map((m) => `• ${m}`),
      ]);
      break;

    case "faq":
      answer = faqs.map((f) => `**${f.q}**\n${f.a}`).join("\n\n");
      break;

    default: {
      const lastUser = [...hist].reverse().find((m) => m.role === "user");
      answer = paragraph([
        `**Derivatives Strategist** — context: **${snap.strategyName}** (${snap.strategyType})`,
        `I can explain this ${snap.strategyType} strategy using verified data and established options theory.`,
        lastUser ? `Following up on your earlier question about "${lastUser.content.slice(0, 80)}…" — please ask a specific question about risk, Greeks, IV, strikes, expiry, exits, or calculations.` : null,
        `Try: "${suggestions[0]}"`,
        "I will not invent market data. Unverified fields are explicitly marked unavailable.",
      ]);
      confidence = 70;
    }
  }

  const followUps = suggestions.filter((s) => s.toLowerCase() !== rawQuery.toLowerCase()).slice(0, 4);

  return {
    answer,
    intent,
    dataType,
    confidence,
    suggestedFollowUps: followUps,
    educationalInsights: insights,
    transparency: buildTransparency(snap),
    strategyContext: {
      name: snap.strategyName,
      type: snap.strategyType,
      underlying: snap.underlying,
    },
  };
}

function psVerified(snap) {
  return snap.lotSize != null || snap.capitalRequired != null || snap.marginNote != null;
}

function buildTransparency(snap) {
  return {
    formula: "Responses combine verified strategy snapshot + standard options payoff/Greek definitions",
    assumptions: [
      "No market data is estimated or fabricated",
      "Pre-market premiums are reference-only until session open",
      snap.chainVerified ? "Option chain verified from NSE" : "Option chain not verified in current snapshot",
    ],
    sources: [
      snap.greeks.source,
      snap.chainVerified ? "NSE India option chain" : null,
      snap.indiaVix != null ? "Yahoo Finance ^INDIAVIX" : null,
    ].filter(Boolean),
    calculationTimestamp: new Date().toISOString(),
    lastMarketUpdate: snap.refreshedAt,
  };
}

module.exports = {
  answerStrategyQuestion,
  buildVerifiedSnapshot,
  classifyIntent,
  getSuggestedQuestions,
  getEducationalInsights,
  getFaqs,
  MAX_QUERY_LEN,
  NA_MSG,
  NA_INSUFFICIENT,
};