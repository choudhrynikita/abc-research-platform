function optionTypes(strikes) {
  const types = [];
  for (const leg of strikes || []) {
    const type = String(leg?.type || "").toUpperCase();
    if ((type === "CE" || type === "PE") && !types.includes(type)) types.push(type);
  }
  if (types.includes("CE") && types.includes("PE")) return "CE + PE";
  return types[0] || null;
}

function tradeStrikes(strikes) {
  const unique = [];
  for (const leg of strikes || []) {
    if (!leg || leg.action === "WATCH" || leg.strike == null) continue;
    const strike = Number(leg.strike);
    if (!Number.isFinite(strike) || unique.includes(strike)) continue;
    unique.push(strike);
  }
  return unique.map((strike) => strike.toLocaleString("en-IN"));
}

function isWatchStrategy(strategy) {
  const legs = strategy?.strikes || [];
  return Boolean(
    strategy?.type?.includes("Watch") ||
      strategy?.status === "Watch" ||
      (legs.length > 0 && legs.every((leg) => leg?.action === "WATCH"))
  );
}

function formatTradeBadge(strategy) {
  if (!strategy) return "Plan";
  if (strategy.status === "Defer") {
    const core = formatTradeBadge({ ...strategy, status: "Plan" });
    return core && core !== "Plan" ? `Defer · ${core}` : "Defer";
  }
  const expiry = strategy.expiry ? String(strategy.expiry) : null;
  const side = optionTypes(strategy.strikes);
  if (isWatchStrategy(strategy)) return expiry ? `Watch · ${expiry}` : "Watch";
  if (expiry && side) return `${expiry} ${side}`;
  if (expiry) return expiry;
  if (side) return side;
  if (strategy.status === "Live" || strategy.status === "Active") return "Live";
  return "Plan";
}

function formatTradeLine(strategy) {
  if (!strategy) return "";
  const side = optionTypes(strategy.strikes);
  const strikes = tradeStrikes(strategy.strikes);
  const expiry = strategy.expiry ? String(strategy.expiry) : null;
  const days = strategy.daysToExpiry;
  const parts = [];
  if (side && strikes.length) parts.push(`Trade ${side} ${strikes.join(" / ")}`);
  else if (side) parts.push(`Trade ${side}`);
  if (expiry) parts.push(`expiry ${expiry}`);
  if (days != null && Number.isFinite(Number(days))) parts.push(`${Number(days)}d`);
  return parts.join(" · ");
}

function statusTone(status) {
  if (status === "Active" || status === "Live") return "active";
  if (status === "Next Session") return "next-session";
  if (status === "This Week") return "this-week";
  if (status === "Week-Ahead") return "week-ahead";
  if (status === "Defer") return "defer";
  if (status === "Watch" || status === "Wait") return "wait";
  if (status === "Avoid") return "avoid";
  return "planning";
}

module.exports = {
  optionTypes,
  tradeStrikes,
  formatTradeBadge,
  formatTradeLine,
  statusTone,
};
