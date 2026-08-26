const MS_PER_DAY = 24 * 60 * 60 * 1000;

function numericField(field) {
  return field?.available === true && Number.isFinite(Number(field.value))
    ? Number(field.value)
    : null;
}

function parseExpiry(expiry) {
  if (!expiry || typeof expiry !== "string") return null;
  const exchangeFormat = expiry.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (exchangeFormat) {
    const [, day, month, year] = exchangeFormat;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(expiry);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysToExpiry(expiry, now = new Date()) {
  const date = parseExpiry(expiry);
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);
}

function isExpiredExpiry(expiry, sessionDate = null) {
  const expiryDate = parseExpiry(expiry);
  if (!expiryDate) return false;
  const reference = sessionDate ? new Date(`${sessionDate}T00:00:00`) : new Date();
  reference.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  return expiryDate.getTime() < reference.getTime();
}

function summarizeFinancialContext(fundamentals) {
  const analysis = fundamentals?.fundamentalAnalysis || {};
  const valuation = fundamentals?.valuation || {};
  const revenueGrowth = numericField(analysis.revenueGrowth);
  const profitGrowth = numericField(analysis.profitGrowth);
  const roe = numericField(analysis.roe);
  const debtToEquity = numericField(analysis.debtToEquity);
  const freeCashFlow = numericField(analysis.freeCashFlow);
  const peRatio = numericField(valuation.peRatio);
  const availableMetrics = [revenueGrowth, profitGrowth, roe, debtToEquity, freeCashFlow, peRatio]
    .filter((value) => value != null).length;
  const signals = [];
  const riskFlags = [];

  if (revenueGrowth != null) signals.push(`Revenue growth ${Number((revenueGrowth * 100).toFixed(1))}%`);
  if (profitGrowth != null) signals.push(`Earnings growth ${Number((profitGrowth * 100).toFixed(1))}%`);
  if (roe != null) signals.push(`ROE ${Number((roe * 100).toFixed(1))}%`);
  if (debtToEquity != null) signals.push(`Debt/equity ${Number(debtToEquity.toFixed(2))}×`);

  if (profitGrowth != null && profitGrowth < 0) riskFlags.push("Verified earnings growth is negative");
  if (freeCashFlow != null && freeCashFlow < 0) riskFlags.push("Verified free cash flow is negative");
  if (debtToEquity != null && debtToEquity > 2) riskFlags.push("Verified debt/equity is above 2×");

  const status = fundamentals?.available !== true
    ? "unavailable"
    : availableMetrics >= 3
      ? "reviewed"
      : "partial";

  return {
    status,
    availableMetrics,
    signals,
    riskFlags,
    source: fundamentals?.source || null,
    asOf: fundamentals?.fetchedAt || null,
    metrics: { revenueGrowth, profitGrowth, roe, debtToEquity, freeCashFlow, peRatio },
    message:
      status === "reviewed"
        ? "Verified financial context reviewed"
        : status === "partial"
          ? "Financial context is partial — do not treat this as a fundamental call"
          : "Financial context is not available from verified sources",
  };
}

function isBiasAligned(strategy, technical = {}) {
  if (!strategy?.bias || strategy.bias === "Neutral" || !technical?.trend) return null;
  if (technical.trend === "NEUTRAL") return null;
  return (strategy.bias === "Bullish" && technical.trend === "BULLISH") ||
    (strategy.bias === "Bearish" && technical.trend === "BEARISH");
}

function applyStrategyEligibility(strategy, {
  marketStatus = null,
  technical = {},
  financial = null,
  assetClass = "equity",
} = {}) {
  if (!strategy) return strategy;

  const isLive = marketStatus?.isLive === true || strategy.mode === "live";
  const hasPremiums = Array.isArray(strategy.strikes) && strategy.strikes.some(
    (leg) => leg?.premium != null && (leg.action === "BUY" || leg.action === "SELL")
  );
  const liquidity = strategy.analytics?.liquidityRating || null;
  const payoffAvailable = strategy.payoff?.available === true;
  const expiryReference = marketStatus?.sessionDate ? new Date(`${marketStatus.sessionDate}T00:00:00`) : new Date();
  const expiryDays = daysToExpiry(strategy.expiry, expiryReference);
  const trendAligned = isBiasAligned(strategy, technical);
  const isWatch = strategy.type?.includes("Watch") || strategy.status === "Watch";
  const blockers = [];
  const warnings = [];

  if (trendAligned === false) blockers.push("Underlying trend conflicts with the strategy direction");
  if (isLive && !hasPremiums) blockers.push("Verified current option premiums are unavailable");
  if (isLive && !payoffAvailable && !isWatch) blockers.push("Verified premiums are required to calculate payoff and max loss");
  if (isLive && (!liquidity || liquidity === "Low")) blockers.push("Option liquidity is insufficient for a live strategy");
  if (expiryDays != null && expiryDays < 0) blockers.push("The option contract has expired; refresh the option chain before planning");
  else if (isLive && expiryDays != null && expiryDays <= 1) blockers.push("Expiry is too close for a new live position");

  if (assetClass === "equity") {
    if (financial?.status === "unavailable") {
      if (isLive) blockers.push("Verified financial context is unavailable for this equity strategy");
      else warnings.push("Financial context is unavailable; this remains a technical planning setup only");
    } else if (financial?.status === "partial") {
      warnings.push("Financial context is partial; review the source detail before acting");
    }
    warnings.push(...(financial?.riskFlags || []));
  } else {
    warnings.push("Index strategy: single-company financial analysis does not apply");
  }

  if (expiryDays != null && expiryDays >= 0 && expiryDays <= 4) warnings.push(`Only ${expiryDays} calendar day(s) remain to expiry`);
  if (!isLive) warnings.push("Reference prices use the latest verified close; confirm premium and trigger in the planned session");

  const baseState = isWatch
    ? "Watch"
    : isLive
      ? "Live"
      : strategy.status === "Week-Ahead" || strategy.status === "This Week" || strategy.status === "Next Session"
        ? strategy.status
        : "Next Session";
  const status = blockers.length ? "Defer" : baseState;
  const decision = blockers.length ? "DEFER" : isWatch ? "WATCH" : isLive ? "LIVE" : "PLAN";
  const gates = [
    {
      label: "Underlying technicals",
      state: trendAligned === false ? "blocked" : technical?.trend ? "ready" : "partial",
      detail: technical?.trend ? `Trend ${technical.trend}` : "Trend is unavailable",
    },
    {
      label: "Option contract",
      state: hasPremiums && (liquidity === "High" || liquidity === "Medium") ? "ready" : isLive ? "blocked" : "reference",
      detail: hasPremiums ? `${liquidity || "Unrated"} liquidity` : "Reference or unavailable premium",
    },
    {
      label: "Payoff and risk",
      state: payoffAvailable ? "ready" : isLive ? "blocked" : "reference",
      detail: payoffAvailable ? "Max loss and payoff calculated" : "Requires verified premium",
    },
    {
      label: assetClass === "equity" ? "Financial context" : "Index context",
      state: assetClass === "equity"
        ? financial?.status === "reviewed" ? "ready" : financial?.status === "partial" ? "partial" : "blocked"
        : technical?.trend ? "ready" : "partial",
      detail: assetClass === "equity" ? financial?.message || "Financial context unavailable" : "Market trend, VIX, OI and flow context",
    },
    {
      label: "Timing",
      state: expiryDays != null && expiryDays <= 1 ? "blocked" : isLive ? "ready" : "reference",
      detail: expiryDays != null ? `${expiryDays} calendar day(s) to expiry` : "Expiry date unavailable",
    },
  ];

  const dossier = strategy.dossier
    ? {
        ...strategy.dossier,
        action: decision === "LIVE" ? "CONSIDER" : decision === "PLAN" ? "PLAN" : decision,
        riskFactors: [...new Set([...(strategy.dossier.riskFactors || []), ...blockers, ...warnings])],
        fundamentalSignals: assetClass === "equity"
          ? [...new Set([...(strategy.dossier.fundamentalSignals || []), ...(financial?.signals || [])])]
          : strategy.dossier.fundamentalSignals,
      }
    : strategy.dossier;

  return {
    ...strategy,
    status,
    eligibility: {
      decision,
      eligibleForLive: decision === "LIVE",
      plannedSession: marketStatus?.nextSessionDate || null,
      expiryDays,
      gates,
      blockers,
      warnings,
      financial: assetClass === "equity" ? financial : null,
    },
    dossier,
  };
}

module.exports = {
  parseExpiry,
  daysToExpiry,
  isExpiredExpiry,
  summarizeFinancialContext,
  applyStrategyEligibility,
};
