const { normalizeBreadth } = require("./breadth");

const NA_MSG = "Data not available from verified source";

function oiSkewLabel(callOi, putOi) {
  if (callOi == null || putOi == null) return null;
  if (putOi > callOi * 1.1) return "Put dominance";
  if (callOi > putOi * 1.1) return "Call dominance";
  return "Balanced";
}

function trendStrengthScore(adx) {
  if (adx == null) return null;
  return Math.min(100, Math.round(adx * 2.5));
}

function institutionalFlowIndicator(fiiNet) {
  if (fiiNet == null) return null;
  if (fiiNet > 500) return "Strong inflow";
  if (fiiNet > 0) return "Moderate inflow";
  if (fiiNet < -500) return "Strong outflow";
  return "Moderate outflow";
}

function breadthRatio(breadth) {
  const b = normalizeBreadth(breadth);
  if (!b || b.advancers == null || b.decliners == null) return null;
  const total = b.advancers + b.decliners;
  if (!total) return null;
  return Number((b.advancers / total).toFixed(2));
}

function atmGreeks(chain) {
  if (!chain?.available || !chain.strikes?.length) return null;
  const row = chain.strikes.find((s) => s.strike === chain.atmStrike) || chain.strikes[0];
  if (!row) return null;
  const leg = row.ce?.iv != null ? row.ce : row.pe?.iv != null ? row.pe : row.ce || row.pe;
  if (!leg) return null;
  return {
    delta: leg.delta ?? null,
    gamma: leg.gamma ?? null,
    theta: leg.theta ?? null,
    vega: leg.vega ?? null,
    iv: leg.iv ?? chain.impliedVolatility ?? null,
    source: leg.delta != null ? "NSE ATM option chain" : null,
  };
}

function strategyGreeks(strategy) {
  const a = strategy?.analytics;
  if (!a?.available && a?.delta == null) return null;
  return {
    delta: a?.delta ?? null,
    gamma: a?.gamma ?? null,
    theta: a?.theta ?? null,
    vega: a?.vega ?? null,
    iv: a?.impliedVolatility ?? null,
    source: a?.greeksSource ?? null,
  };
}

/**
 * Build derivatives intelligence from verified chain + market context only.
 * Missing fields remain null — never estimated.
 */
function buildDerivativesIntelligence({
  chain,
  technicals,
  breadth,
  fiiDii,
  selectedStrategy,
  vix,
  volumeTrend,
}) {
  const fiiNet = fiiDii?.fiiNet ?? fiiDii?.fii?.netValue ?? null;
  const breadthNorm = normalizeBreadth(breadth);
  const chainGreeks = atmGreeks(chain);
  const legGreeks = strategyGreeks(selectedStrategy);
  const greeks = legGreeks?.delta != null ? legGreeks : chainGreeks;

  return {
    verified: Boolean(chain?.available),
    source: chain?.source ?? null,
    fetchedAt: chain?.fetchedAt ?? null,
    unverifiedMessage: NA_MSG,
    marketFlow: {
      putCallRatio: chain?.available ? chain.putCallRatio : null,
      callOi: chain?.available ? chain.callOi : null,
      callOiChange: chain?.available ? chain.callOiChange : null,
      putOi: chain?.available ? chain.putOi : null,
      putOiChange: chain?.available ? chain.putOiChange : null,
      oiSkew: chain?.available ? oiSkewLabel(chain.callOi, chain.putOi) : null,
      volumeTrend: volumeTrend ?? technicals?.volumeTrend ?? null,
      volumeConfirmation:
        technicals?.volumeTrend === "Rising"
          ? "Confirmed"
          : technicals?.volumeTrend === "Falling"
            ? "Weak"
            : technicals?.volumeTrend
              ? "Neutral"
              : null,
    },
    risk: {
      riskRewardRatio: selectedStrategy?.riskRewardRatio ?? null,
      maxLoss: selectedStrategy?.maxRisk ?? null,
      maxProfit: selectedStrategy?.maxReward ?? null,
      breakeven: selectedStrategy?.positionSizing?.breakEven ?? null,
      note: selectedStrategy
        ? "Calculated from verified strategy entry/exit levels"
        : NA_MSG,
    },
    volatility: {
      impliedVolatility: chain?.available ? chain.impliedVolatility : null,
      ivRank: null,
      ivPercentile: null,
      ivRankNote: "IV rank/percentile requires historical IV series — not estimated",
      indiaVix: typeof vix === "object" ? vix?.value ?? null : vix ?? null,
      greeks,
    },
    marketStrength: {
      breadthRatio: breadthRatio(breadthNorm),
      breadth: breadthNorm
        ? {
            advancers: breadthNorm.advancers ?? null,
            decliners: breadthNorm.decliners ?? null,
            unchanged: breadthNorm.unchanged ?? null,
            advanceDeclineRatio: breadthNorm.advanceDeclineRatio ?? null,
          }
        : null,
      trendStrengthScore: trendStrengthScore(technicals?.adx),
      adx: technicals?.adx ?? null,
      institutionalFlow: institutionalFlowIndicator(fiiNet),
      fiiNet,
    },
  };
}

module.exports = { buildDerivativesIntelligence, NA_MSG };