/**
 * Dashboard payload hygiene and honest management targets.
 * Max profit/loss stay on the payoff engine; T1/T2 are never allowed to exceed it.
 */

function round2(n) {
  return Number(Number(n).toFixed(2));
}

function isNakedLong(type) {
  return /^(Long CE|Long PE|Long Call|Long Put)$/i.test(String(type || ""));
}

/**
 * After expiry payoff is known, clamp T1/T2 so the desk never quotes an impossible target.
 * Debit verticals: T1/T2 are management *premium* levels, capped at 50%/80% of max value.
 * Credit structures: numeric T2 cannot exceed mathematical max profit.
 * Naked longs keep premium multiples (unlimited or theoretical-to-zero is not a target).
 */
function applyHonestManagementTargets(strategy) {
  if (!strategy) return strategy;
  const payoff = strategy.payoff;
  if (!payoff?.available) return strategy;

  const net = strategy.premiums?.net;
  const isCredit = net != null && net < 0;
  const paid = net != null && net > 0 ? net : strategy.premiums?.paid ?? null;
  const received = isCredit ? Math.abs(net) : strategy.premiums?.received ?? null;
  const next = { ...(strategy.targets || {}) };

  const definedFinite =
    payoff.maxProfitUnlimited !== true &&
    payoff.maxProfit != null &&
    Number.isFinite(Number(payoff.maxProfit)) &&
    !isNakedLong(strategy.type);

  if (definedFinite && !isCredit && paid != null && paid > 0) {
    const maxProfit = Number(payoff.maxProfit);
    const maxValue = round2(maxProfit + paid);
    const t1Cap = round2(Math.min(paid + 0.5 * maxProfit, maxValue));
    const t2Cap = round2(Math.min(paid + 0.8 * maxProfit, maxValue));
    if (typeof next.t1 === "number") next.t1 = round2(Math.min(next.t1, t1Cap));
    if (typeof next.t2 === "number") {
      next.t2 = round2(Math.min(next.t2, t2Cap));
      if (next.t1 != null && next.t2 <= next.t1) {
        next.t2 = round2(Math.min(maxValue, next.t1 + Math.max(0.01, 0.25 * maxProfit)));
      }
    }
    next.note =
      "Management premium levels, capped at 50%/80% of mathematical max profit. Not max profit.";
  }

  if (definedFinite && isCredit && typeof next.t2 === "number") {
    const maxProfit = Number(payoff.maxProfit);
    if (next.t2 > maxProfit && (received == null || next.t2 > received)) {
      next.t2 = round2(maxProfit);
    }
  }

  return { ...strategy, targets: next };
}

function downsampleCurve(curve, maxPoints = 64) {
  if (!Array.isArray(curve) || curve.length <= maxPoints) return curve;
  const out = [];
  const step = (curve.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(curve[Math.round(i * step)]);
  }
  return out;
}

function slimBacktest(bt) {
  if (!bt || typeof bt !== "object") return bt;
  const { trades, syntheticAttempt, ...rest } = bt;
  return {
    ...rest,
    numberOfTrades: rest.numberOfTrades ?? rest.samples ?? (Array.isArray(trades) ? trades.length : null),
  };
}

function prepareDashboardStrategy(strategy) {
  if (!strategy) return strategy;
  const payoff = strategy.payoff
    ? { ...strategy.payoff, payoffCurve: downsampleCurve(strategy.payoff.payoffCurve, 64) }
    : strategy.payoff;
  const backtest = slimBacktest(strategy.backtest);
  const dossier = strategy.dossier
    ? { ...strategy.dossier, backtest: slimBacktest(strategy.dossier.backtest) }
    : strategy.dossier;
  return { ...strategy, payoff, backtest, dossier };
}

function prepareDashboardStrategies(list) {
  return (list || []).map(prepareDashboardStrategy);
}

/** Client/assistant POST body — drop heavy arrays the Q&A engine does not need. */
function slimStrategyForAssistant(strategy) {
  if (!strategy) return strategy;
  const payoff = strategy.payoff
    ? { ...strategy.payoff, payoffCurve: undefined }
    : strategy.payoff;
  return {
    ...strategy,
    payoff,
    backtest: slimBacktest(strategy.backtest),
    dossier: strategy.dossier
      ? { ...strategy.dossier, backtest: slimBacktest(strategy.dossier.backtest) }
      : strategy.dossier,
  };
}

module.exports = {
  applyHonestManagementTargets,
  downsampleCurve,
  slimBacktest,
  prepareDashboardStrategy,
  prepareDashboardStrategies,
  slimStrategyForAssistant,
};
