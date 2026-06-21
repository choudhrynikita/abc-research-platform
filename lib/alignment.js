const { computeLevelStatus } = require("./levels");

function computeAlignment(strategyBias, niftySignal) {
  if (strategyBias === "NEUTRAL" || niftySignal === "NEUTRAL") {
    return "neutral";
  }
  if (strategyBias === niftySignal) {
    return "aligned";
  }
  return "conflict";
}

function buildAlignmentReport(strategies, prediction) {
  const niftySignal = prediction.ensembleSignal || "NEUTRAL";
  const currentPrice = prediction.currentPrice ?? null;
  const active = strategies.filter((s) => s.status === "active");

  const enriched = active.map((strategy) => {
    const levels = computeLevelStatus(strategy, currentPrice);
    return {
      ...strategy,
      alignment: computeAlignment(strategy.bias, niftySignal),
      levelStatus: levels.levelStatus,
      distances: levels.distances,
      alerts: levels.alerts,
    };
  });

  const aligned = enriched.filter((s) => s.alignment === "aligned").length;
  const conflict = enriched.filter((s) => s.alignment === "conflict").length;
  const neutral = enriched.filter((s) => s.alignment === "neutral").length;

  const alerts = enriched.flatMap((s) =>
    s.alerts.map((alert) => ({
      strategyId: s.id,
      strategyName: s.name,
      ...alert,
    }))
  );

  return {
    niftySignal,
    currentPrice,
    activeCount: active.length,
    aligned,
    conflict,
    neutral,
    alertCount: alerts.length,
    alerts,
    strategies: enriched,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { computeAlignment, buildAlignmentReport };