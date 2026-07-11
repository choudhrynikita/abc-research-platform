/**
 * Institutional multi-leg options payoff engine.
 * All P/L is per underlying unit (index/share points × ₹1). Multiply by lot size for rupees.
 *
 * Conventions:
 * - action: "BUY" | "SELL" (WATCH / other → ignored)
 * - type: "CE" | "PE" (call / put)
 * - premium: verified market premium per unit (required)
 * - Net debit > 0 means capital paid; net credit < 0 means premium received
 *
 * Never fabricates premiums or strikes. Returns available:false when inputs incomplete.
 */

const DATA_UNAVAILABLE = "Data Unavailable";

function isFiniteNumber(n) {
  return n != null && typeof n === "number" && Number.isFinite(n);
}

function round2(n) {
  return Number(Number(n).toFixed(2));
}

/**
 * Intrinsic value of one option at underlying S.
 */
function intrinsic(type, strike, S) {
  if (type === "CE" || type === "CALL") return Math.max(S - strike, 0);
  if (type === "PE" || type === "PUT") return Math.max(strike - S, 0);
  return 0;
}

/**
 * Normalize a leg from strategy strike objects.
 */
function normalizeLeg(leg) {
  if (!leg) return null;
  const action = String(leg.action || "").toUpperCase();
  if (action !== "BUY" && action !== "SELL") return null;
  const type = String(leg.type || leg.optionType || "").toUpperCase();
  const optType = type === "CALL" ? "CE" : type === "PUT" ? "PE" : type;
  if (optType !== "CE" && optType !== "PE") return null;
  const strike = Number(leg.strike);
  const premium = Number(leg.premium);
  if (!isFiniteNumber(strike) || !isFiniteNumber(premium) || premium < 0) return null;
  return { action, type: optType, strike, premium };
}

/**
 * P/L of a single leg at expiry underlying S (per unit).
 * BUY:  intrinsic - premium
 * SELL: premium - intrinsic
 */
function legPayoff(leg, S) {
  const value = intrinsic(leg.type, leg.strike, S);
  return leg.action === "BUY" ? value - leg.premium : leg.premium - value;
}

/**
 * Net premium: positive = debit paid, negative = credit received.
 */
function netPremiumFromLegs(legs) {
  let net = 0;
  for (const leg of legs) {
    net += leg.action === "BUY" ? leg.premium : -leg.premium;
  }
  return round2(net);
}

/**
 * Evaluate strategy P/L at a single spot.
 */
function payoffAt(legs, S) {
  let total = 0;
  for (const leg of legs) total += legPayoff(leg, S);
  return round2(total);
}

/**
 * Build evaluation grid from strikes (and optional spot).
 * Covers well outside wings so unlimited legs can be classified.
 */
function buildPriceGrid(legs, spot, points = 241) {
  const strikes = legs.map((l) => l.strike);
  const minK = Math.min(...strikes);
  const maxK = Math.max(...strikes);
  const width = Math.max(maxK - minK, 100);
  const pad = Math.max(width * 1.5, 500);
  let lo = minK - pad;
  let hi = maxK + pad;
  if (isFiniteNumber(spot)) {
    lo = Math.min(lo, spot - pad);
    hi = Math.max(hi, spot + pad);
  }
  lo = Math.max(0, lo);
  const step = (hi - lo) / (points - 1);
  const prices = [];
  for (let i = 0; i < points; i++) {
    prices.push(round2(lo + step * i));
  }
  // Always include exact strikes and spot for accurate extrema / BE
  for (const k of strikes) {
    if (!prices.some((p) => Math.abs(p - k) < 1e-6)) prices.push(k);
  }
  if (isFiniteNumber(spot) && !prices.some((p) => Math.abs(p - spot) < 1e-6)) {
    prices.push(spot);
  }
  prices.sort((a, b) => a - b);
  return prices;
}

/**
 * Find break-even underlying prices where payoff crosses zero.
 */
function findBreakEvens(legs, prices) {
  const bes = [];
  for (let i = 1; i < prices.length; i++) {
    const s0 = prices[i - 1];
    const s1 = prices[i];
    const p0 = payoffAt(legs, s0);
    const p1 = payoffAt(legs, s1);
    if (p0 === 0) {
      if (!bes.some((b) => Math.abs(b - s0) < 0.05)) bes.push(round2(s0));
      continue;
    }
    if (p0 * p1 < 0) {
      // Linear interpolation
      const t = p0 / (p0 - p1);
      const be = round2(s0 + t * (s1 - s0));
      if (!bes.some((b) => Math.abs(b - be) < 0.5)) bes.push(be);
    } else if (p1 === 0) {
      if (!bes.some((b) => Math.abs(b - s1) < 0.05)) bes.push(round2(s1));
    }
  }
  return bes.sort((a, b) => a - b);
}

/**
 * Classify whether max profit / max loss is unbounded by testing extremes.
 */
/**
 * Detect unbounded profit/loss via asymptotic call/put exposure and far-price tests.
 * Call exposure as S→∞: +1 per long CE, −1 per short CE.
 * Put exposure as S→0: +1 per long PE, −1 per short PE (loss grows when net short puts).
 */
function classifyBounds(legs, prices) {
  const payoffs = prices.map((S) => payoffAt(legs, S));

  let callExposure = 0; // net long calls as S → ∞
  let putExposure = 0; // net long puts as S → 0
  for (const leg of legs) {
    const sign = leg.action === "BUY" ? 1 : -1;
    if (leg.type === "CE") callExposure += sign;
    if (leg.type === "PE") putExposure += sign;
  }

  // Long naked call → unlimited profit; short naked call → unlimited loss
  const maxProfitUnlimited = callExposure > 0;
  // Short naked put → unlimited loss as S→0; long naked put is still finite (max = K − prem)
  // Short naked call already covered above for unlimited loss via callExposure < 0
  const maxLossUnlimited = callExposure < 0 || putExposure < 0;

  // Always evaluate S=0 and a far high so long puts / short calls asymptotes are correct.
  const farLow = 0;
  const farHigh = Math.max(...legs.map((l) => l.strike)) + 20000;
  const allPayoffs = [...payoffs, payoffAt(legs, farLow), payoffAt(legs, farHigh)];
  const gridMin = Math.min(...allPayoffs);
  const gridMax = Math.max(...allPayoffs);

  return {
    maxProfitUnlimited,
    maxLossUnlimited,
    worstPl: maxLossUnlimited ? null : round2(gridMin),
    bestPl: maxProfitUnlimited ? null : round2(gridMax),
  };
}

/**
 * Primary analysis entry — given strategy legs, compute institutional risk metrics + payoff series.
 */
function analyzeStrategyPayoff({ strikes, spot = null, lotSize = null, strategyType = null } = {}) {
  const rawLegs = Array.isArray(strikes) ? strikes : [];
  const legs = rawLegs.map(normalizeLeg).filter(Boolean);

  if (!legs.length) {
    return {
      available: false,
      message: DATA_UNAVAILABLE,
      reason: "Verified option legs with premiums are required for payoff calculation",
      maxProfit: null,
      maxLoss: null,
      maxProfitUnlimited: false,
      maxLossUnlimited: false,
      breakEvens: [],
      netPremium: null,
      riskRewardRatio: null,
      payoffCurve: [],
      returnOnRisk: null,
      lotSize: lotSize ?? null,
    };
  }

  const netPremium = netPremiumFromLegs(legs);
  const prices = buildPriceGrid(legs, spot);
  const bounds = classifyBounds(legs, prices);
  const breakEvens = findBreakEvens(legs, prices);

  const maxProfit = bounds.maxProfitUnlimited ? null : bounds.bestPl;
  // maxLoss is magnitude of worst P/L (positive number means loss amount)
  let maxLoss = null;
  if (!bounds.maxLossUnlimited) {
    const worst = bounds.worstPl;
    if (worst != null) {
      // If worst P/L is positive, max loss is 0 (no loss scenario)
      maxLoss = worst >= 0 ? 0 : round2(Math.abs(worst));
    }
  }

  const riskRewardRatio =
    maxLoss != null && maxLoss > 0 && maxProfit != null && maxProfit > 0
      ? round2(maxProfit / maxLoss)
      : null;

  const returnOnRisk =
    maxLoss != null && maxLoss > 0 && maxProfit != null
      ? round2((maxProfit / maxLoss) * 100)
      : null;

  const curve = prices.map((S) => {
    const pl = payoffAt(legs, S);
    const plLot =
      isFiniteNumber(lotSize) && lotSize > 0 ? round2(pl * lotSize) : null;
    return {
      underlying: S,
      pl,
      plLot,
    };
  });

  // Spot P/L if spot provided
  const plAtSpot = isFiniteNumber(spot) ? payoffAt(legs, spot) : null;

  // Markers for chart
  const markers = {
    spot: isFiniteNumber(spot) ? spot : null,
    strikes: [...new Set(legs.map((l) => l.strike))].sort((a, b) => a - b),
    breakEvens,
    maxProfitPoint: null,
    maxLossPoint: null,
  };

  if (!bounds.maxProfitUnlimited && maxProfit != null) {
    const hit = curve.find((c) => Math.abs(c.pl - maxProfit) < 0.02);
    if (hit) markers.maxProfitPoint = { underlying: hit.underlying, pl: hit.pl };
  }
  if (!bounds.maxLossUnlimited && bounds.worstPl != null) {
    const hit = curve.find((c) => Math.abs(c.pl - bounds.worstPl) < 0.02);
    if (hit) markers.maxLossPoint = { underlying: hit.underlying, pl: hit.pl };
  }

  const isCredit = netPremium < 0;
  const premiumPaid = isCredit ? 0 : Math.abs(netPremium);
  const premiumReceived = isCredit ? Math.abs(netPremium) : 0;

  return {
    available: true,
    message: null,
    reason: null,
    strategyType: strategyType || null,
    legs,
    netPremium,
    isCredit,
    premiumPaid: round2(premiumPaid),
    premiumReceived: round2(premiumReceived),
    maxProfit,
    maxLoss,
    maxProfitUnlimited: bounds.maxProfitUnlimited,
    maxLossUnlimited: bounds.maxLossUnlimited,
    maxProfitDisplay: bounds.maxProfitUnlimited
      ? "Unlimited"
      : maxProfit != null
        ? maxProfit
        : null,
    maxLossDisplay: bounds.maxLossUnlimited
      ? "Unlimited"
      : maxLoss != null
        ? maxLoss
        : null,
    breakEvens,
    breakEvenDisplay:
      breakEvens.length === 0
        ? null
        : breakEvens.length === 1
          ? String(breakEvens[0])
          : breakEvens.join(" / "),
    riskRewardRatio,
    returnOnRisk,
    plAtSpot,
    payoffCurve: curve,
    markers,
    lotSize: isFiniteNumber(lotSize) ? lotSize : null,
    // Per-lot rupee figures when lot size known
    maxProfitLot:
      bounds.maxProfitUnlimited || maxProfit == null || !isFiniteNumber(lotSize)
        ? null
        : round2(maxProfit * lotSize),
    maxLossLot:
      bounds.maxLossUnlimited || maxLoss == null || !isFiniteNumber(lotSize)
        ? null
        : round2(maxLoss * lotSize),
    source: "Calculated from verified NSE option premiums using standard expiry payoff formulas",
    formulaNote:
      "P/L(S) = Σ legs [ BUY: max(intrinsic,0) − premium | SELL: premium − max(intrinsic,0) ]",
  };
}

/**
 * Attach payoff analysis onto a strategy object (non-destructive).
 */
function enrichStrategyWithPayoff(strategy, { spot = null, lotSize = null } = {}) {
  if (!strategy) return strategy;
  const analysis = analyzeStrategyPayoff({
    strikes: strategy.strikes,
    spot: spot ?? strategy.spot ?? null,
    lotSize: lotSize ?? strategy.lotSize ?? null,
    strategyType: strategy.type,
  });

  if (!analysis.available) {
    return {
      ...strategy,
      payoff: analysis,
      // Do not invent — keep prior only if already correctly set; clear bogus derived rewards
      maxRisk: strategy.maxRisk ?? null,
      maxReward: strategy.maxReward ?? null,
    };
  }

  // Prefer mathematically computed max risk/reward over heuristic targets
  const maxRisk = analysis.maxLossUnlimited
    ? null
    : analysis.maxLoss;
  const maxReward = analysis.maxProfitUnlimited
    ? null
    : analysis.maxProfit;

  const rr =
    maxRisk != null && maxRisk > 0 && maxReward != null
      ? round2(maxReward / maxRisk)
      : analysis.riskRewardRatio;

  return {
    ...strategy,
    maxRisk,
    maxReward,
    riskRewardRatio: rr,
    premiums: {
      ...(strategy.premiums || {}),
      net: analysis.netPremium,
      paid: analysis.premiumPaid,
      received: analysis.premiumReceived,
    },
    positionSizing: {
      ...(strategy.positionSizing || {}),
      breakEven: analysis.breakEvenDisplay,
      breakEvens: analysis.breakEvens,
      maxLoss: analysis.maxLoss,
      maxProfit: analysis.maxProfit,
      maxLossUnlimited: analysis.maxLossUnlimited,
      maxProfitUnlimited: analysis.maxProfitUnlimited,
      riskRewardRatio: rr,
      returnOnRisk: analysis.returnOnRisk,
      premiumPerLot:
        isFiniteNumber(lotSize) && analysis.netPremium != null
          ? round2(Math.abs(analysis.netPremium) * lotSize)
          : strategy.positionSizing?.premiumPerLot ?? null,
      lotSize: lotSize ?? strategy.positionSizing?.lotSize ?? null,
    },
    payoff: analysis,
  };
}

module.exports = {
  analyzeStrategyPayoff,
  enrichStrategyWithPayoff,
  payoffAt,
  netPremiumFromLegs,
  normalizeLeg,
  intrinsic,
  legPayoff,
  buildPriceGrid,
  findBreakEvens,
  DATA_UNAVAILABLE,
};
