const { normalizeBreadth } = require("./breadth");
const { UNAVAILABLE_FIELD } = require("./format");
const { extractAtmIv } = require("./nse-options");

const NA_MSG = "Verified data unavailable.";

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
function formatIvMetric(metric) {
  if (!metric) return { value: null, display: UNAVAILABLE_FIELD, verified: false };
  if (metric.available && metric.value != null) {
    return {
      value: metric.display ?? metric.value,
      numericValue: metric.value,
      display: metric.display ?? String(metric.value),
      verified: true,
      source: metric.source,
      collectedAt: metric.collectedAt,
    };
  }
  return {
    value: null,
    display: metric.display || UNAVAILABLE_FIELD,
    verified: false,
    reason: metric.reason,
    source: metric.source,
    collectedAt: metric.collectedAt,
  };
}

function buildDerivativesIntelligence({
  chain,
  technicals,
  breadth,
  fiiDii,
  selectedStrategy,
  vix,
  volumeTrend,
  ivMetrics = null,
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
      impliedVolatility: chain?.available ? extractAtmIv(chain) ?? chain.impliedVolatility : null,
      impliedVolatilityMeta: ivMetrics?.currentIv
        ? {
            source: ivMetrics.currentIv.source,
            collectedAt: ivMetrics.currentIv.collectedAt,
            verified: ivMetrics.currentIv.verified,
          }
        : chain?.available
          ? { source: chain.source, collectedAt: chain.fetchedAt, verified: true }
          : { verified: false },
      ivRank: formatIvMetric(ivMetrics?.ivRank).display,
      ivRankNumeric: formatIvMetric(ivMetrics?.ivRank).numericValue ?? null,
      ivPercentile: formatIvMetric(ivMetrics?.ivPercentile).display,
      ivPercentileNumeric: formatIvMetric(ivMetrics?.ivPercentile).numericValue ?? null,
      ivRankNote: ivMetrics?.ivRank?.available
        ? `${ivMetrics.ivRank.sampleSize} verified days · ${ivMetrics.lookbackDays}d lookback`
        : ivMetrics?.ivRank?.reason || "IV rank requires verified historical ATM IV — not estimated",
      ivPercentileNote: ivMetrics?.ivPercentile?.available
        ? `${ivMetrics.ivPercentile.sampleSize} verified days · ${ivMetrics.lookbackDays}d lookback`
        : ivMetrics?.ivPercentile?.reason || "IV percentile requires verified historical ATM IV — not estimated",
      ivMetricsVerified: Boolean(ivMetrics?.ivRank?.verified || ivMetrics?.ivPercentile?.verified),
      ivHistoryPoints: ivMetrics?.historyPoints ?? 0,
      indiaVix: typeof vix === "object" ? vix?.value ?? null : vix ?? null,
      indiaVixMeta: typeof vix === "object" && vix?.source
        ? { source: vix.source, verified: vix.value != null }
        : null,
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

module.exports = { buildDerivativesIntelligence, formatIvMetric, NA_MSG };