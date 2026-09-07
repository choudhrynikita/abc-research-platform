const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function numericField(field) {
  return field?.available === true && Number.isFinite(Number(field.value))
    ? Number(field.value)
    : null;
}

function parseExpiry(expiry) {
  if (!expiry || typeof expiry !== "string") return null;
  const trimmed = expiry.trim();
  const exchangeFormat = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (exchangeFormat) {
    const [, day, month, year] = exchangeFormat;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const named = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (named) {
    const [, day, mon, year] = named;
    const month = MONTHS[mon.toLowerCase()];
    if (month == null) return null;
    const parsed = new Date(Number(year), month, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysToExpiry(expiry, now = new Date()) {
  const date = parseExpiry(expiry);
  if (!date) return null;
  return Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY);
}

function isExpiredExpiry(expiry, sessionDate = null) {
  const expiryDate = parseExpiry(expiry);
  if (!expiryDate) return false;
  const reference = sessionDate ? new Date(`${sessionDate}T00:00:00`) : new Date();
  return startOfLocalDay(expiryDate).getTime() < startOfLocalDay(reference).getTime();
}

/**
 * Rate option-leg liquidity from printed OI. Missing volume must not
 * collapse a 50k+ open-interest strike to Low / Unrated.
 */
function rateLiquidityFromLegs(legs) {
  if (!Array.isArray(legs) || !legs.length) return null;
  const oiValues = legs
    .map((leg) => leg?.openInterest)
    .filter((value) => value != null && Number.isFinite(Number(value)))
    .map(Number);
  const volValues = legs
    .map((leg) => leg?.volume)
    .filter((value) => value != null && Number.isFinite(Number(value)))
    .map(Number);
  const oi = oiValues.length ? Math.max(...oiValues) : 0;
  const vol = volValues.length ? Math.max(...volValues) : 0;
  // 1-lot desk: High is a crowded strike. Medium is fillable today.
  // Front-week Nifty prints lakhs of OI; 15-day/monthly and stock F&O
  // often print a few thousand OI with hundreds of contracts of volume.
  if (oi >= 50000) return "High";
  if (oi >= 10000) return "Medium";
  if (vol >= 500) return "Medium";
  if (oi >= 1500) return "Medium";
  if (oi > 0 || vol > 0) return "Low";
  return null;
}

function resolveLiquidity(strategy) {
  const explicit = strategy?.analytics?.liquidityRating;
  if (explicit === "High" || explicit === "Medium" || explicit === "Low") return explicit;
  return rateLiquidityFromLegs(strategy?.strikes) || null;
}

function isDefinedRisk(strategy) {
  if (!strategy) return false;
  if (strategy.payoff?.maxLossUnlimited === true) return false;
  if (strategy.payoff?.available === true && strategy.payoff.maxLossUnlimited === false) return true;
  if (strategy.payoff?.maxLoss != null && Number.isFinite(Number(strategy.payoff.maxLoss))) return true;
  const legs = Array.isArray(strategy.strikes)
    ? strategy.strikes.filter((leg) => leg && (leg.action === "BUY" || leg.action === "SELL"))
    : [];
  if (!legs.length) return false;
  const shorts = legs.filter((leg) => leg.action === "SELL");
  if (!shorts.length) return true;
  const longs = legs.filter((leg) => leg.action === "BUY");
  if (!longs.length) return false;
  const nakedShortCall = shorts.some((leg) => leg.type === "CE")
    && !longs.some((leg) => leg.type === "CE");
  return !nakedShortCall;
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
  const liquidity = resolveLiquidity(strategy);
  const payoffAvailable = strategy.payoff?.available === true;
  const definedRisk = isDefinedRisk(strategy);
  const expiryReference = marketStatus?.sessionDate ? new Date(`${marketStatus.sessionDate}T00:00:00`) : new Date();
  const expiryDays = daysToExpiry(strategy.expiry, expiryReference);
  const trendAligned = isBiasAligned(strategy, technical);
  const isWatch = strategy.type?.includes("Watch") || strategy.status === "Watch";
  const blockers = [];
  const warnings = [];

  if (trendAligned === false) blockers.push("Underlying trend conflicts with the strategy direction");
  if (isLive && !hasPremiums) blockers.push("Verified current option premiums are unavailable");
  if (isLive && !payoffAvailable && !isWatch) blockers.push("Verified premiums are required to calculate payoff and max loss");
  if (isLive && liquidity === "Low") blockers.push("Option liquidity is insufficient for a live strategy");
  else if (isLive && !liquidity && assetClass === "equity") {
    blockers.push("Option liquidity is insufficient for a live strategy");
  } else if (isLive && !liquidity) {
    warnings.push("Liquidity is unrated — option chain did not print OI");
  }
  if (expiryDays != null && expiryDays < 0) {
    blockers.push("The option contract has expired; refresh the option chain before planning");
  } else if (isLive && expiryDays === 0) {
    blockers.push("Expiry is today — too close for a new live position");
  } else if (isLive && expiryDays === 1 && !definedRisk) {
    blockers.push("Expiry is tomorrow — undefined-risk structures stay off the live book");
  } else if (isLive && expiryDays === 1 && definedRisk) {
    warnings.push("1 session remains to expiry — defined-risk only; size as a 1-session ticket, not a 7-day hold");
  }

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

  if (expiryDays != null && expiryDays >= 2 && expiryDays <= 4) {
    warnings.push(`Only ${expiryDays} calendar day(s) remain to expiry`);
  }
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
  const contractReady = hasPremiums && (liquidity === "High" || liquidity === "Medium");
  const contractPartial = hasPremiums && !liquidity && assetClass !== "equity";
  const timingBlocked = expiryDays != null && (expiryDays < 0 || expiryDays === 0 || (expiryDays === 1 && !definedRisk));
  const timingPartial = expiryDays === 1 && definedRisk;
  const gates = [
    {
      label: "Underlying technicals",
      state: trendAligned === false ? "blocked" : technical?.trend ? "ready" : "partial",
      detail: technical?.trend ? `Trend ${technical.trend}` : "Trend is unavailable",
    },
    {
      label: "Option contract",
      state: contractReady ? "ready" : contractPartial ? "partial" : isLive ? "blocked" : "reference",
      detail: hasPremiums ? `${liquidity || "Unrated"} liquidity` : "Reference or unavailable premium",
    },
    {
      label: "Payoff and risk",
      state: payoffAvailable ? "ready" : isLive ? "blocked" : "reference",
      detail: payoffAvailable
        ? (definedRisk ? "Max loss and payoff calculated (defined risk)" : "Payoff calculated — undefined risk")
        : "Requires verified premium",
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
      state: timingBlocked ? "blocked" : timingPartial ? "partial" : isLive ? "ready" : "reference",
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
    analytics: {
      ...(strategy.analytics || {}),
      liquidityRating: liquidity,
    },
    eligibility: {
      decision,
      eligibleForLive: decision === "LIVE",
      plannedSession: marketStatus?.nextSessionDate || null,
      expiryDays,
      definedRisk,
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
  rateLiquidityFromLegs,
  isDefinedRisk,
  summarizeFinancialContext,
  applyStrategyEligibility,
};
