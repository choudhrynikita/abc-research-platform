const NEAR_THRESHOLD_PCT = 0.35;

function pctDistance(from, to) {
  if (from == null || to == null || to === 0) return null;
  return Number((((to - from) / from) * 100).toFixed(2));
}

function computeLevelStatus(strategy, currentPrice) {
  const { entry, target, stopLoss, bias } = strategy;

  if (currentPrice == null) {
    return { levelStatus: "unknown", alerts: [], distances: {} };
  }

  const distances = {
    toEntry: entry != null ? pctDistance(currentPrice, entry) : null,
    toTarget: target != null ? pctDistance(currentPrice, target) : null,
    toStop: stopLoss != null ? pctDistance(currentPrice, stopLoss) : null,
  };

  const alerts = [];
  let levelStatus = "no_levels";

  if (entry == null && target == null && stopLoss == null) {
    return { levelStatus, alerts, distances };
  }

  const near = (price, level) =>
    level != null && Math.abs(pctDistance(price, level)) <= NEAR_THRESHOLD_PCT;

  if (bias === "BULLISH") {
    if (stopLoss != null && currentPrice <= stopLoss) {
      levelStatus = "stop_hit";
      alerts.push({ type: "stop_hit", message: "Stop loss breached" });
    } else if (target != null && currentPrice >= target) {
      levelStatus = "target_hit";
      alerts.push({ type: "target_hit", message: "Target reached" });
    } else if (near(currentPrice, stopLoss)) {
      levelStatus = "near_stop";
      alerts.push({ type: "near_stop", message: "Near stop loss" });
    } else if (near(currentPrice, target)) {
      levelStatus = "near_target";
      alerts.push({ type: "near_target", message: "Near target" });
    } else if (entry != null && stopLoss != null && target != null) {
      levelStatus = "in_range";
    } else {
      levelStatus = "tracking";
    }
  } else if (bias === "BEARISH") {
    if (stopLoss != null && currentPrice >= stopLoss) {
      levelStatus = "stop_hit";
      alerts.push({ type: "stop_hit", message: "Stop loss breached" });
    } else if (target != null && currentPrice <= target) {
      levelStatus = "target_hit";
      alerts.push({ type: "target_hit", message: "Target reached" });
    } else if (near(currentPrice, stopLoss)) {
      levelStatus = "near_stop";
      alerts.push({ type: "near_stop", message: "Near stop loss" });
    } else if (near(currentPrice, target)) {
      levelStatus = "near_target";
      alerts.push({ type: "near_target", message: "Near target" });
    } else {
      levelStatus = "tracking";
    }
  } else {
    if (near(currentPrice, target)) {
      levelStatus = "near_target";
      alerts.push({ type: "near_target", message: "Near target" });
    } else if (near(currentPrice, stopLoss)) {
      levelStatus = "near_stop";
      alerts.push({ type: "near_stop", message: "Near stop loss" });
    } else {
      levelStatus = "tracking";
    }
  }

  return { levelStatus, alerts, distances };
}

module.exports = { computeLevelStatus, pctDistance, NEAR_THRESHOLD_PCT };