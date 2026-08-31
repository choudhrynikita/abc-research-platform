const STRUCTURE_PATTERNS = [
  [/iron\s*butterfly/i, "Iron Butterfly"],
  [/butterfly/i, "Butterfly"],
  [/iron\s*condor/i, "Iron Condor"],
  [/condor/i, "Condor"],
  [/bull\s*call/i, "Bull Call"],
  [/bear\s*put/i, "Bear Put"],
  [/bull\s*put/i, "Bull Put"],
  [/bear\s*call/i, "Bear Call"],
  [/strangle/i, "Strangle"],
  [/straddle/i, "Straddle"],
  [/protective\s*put/i, "Protective Put"],
  [/long\s*atm\s*put/i, "Long ATM Put"],
  [/long\s*otm\s*put/i, "Long OTM Put"],
  [/long\s*atm\s*call/i, "Long ATM Call"],
  [/long\s*otm\s*call/i, "Long OTM Call"],
  [/long\s*pe|long put/i, "Long Put"],
  [/long\s*ce|long call/i, "Long Call"],
  [/credit spread/i, "Credit Spread"],
];

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

function stripHorizonPrefix(name) {
  return String(name || "").replace(/^(7-Day|15-Day|Monthly)\s+/i, "").trim();
}

function formatStructureName(strategy) {
  if (!strategy) return "Strategy";
  const hay = `${stripHorizonPrefix(strategy.name)} ${strategy.type || ""}`;
  for (const [pattern, label] of STRUCTURE_PATTERNS) {
    if (pattern.test(hay)) {
      if (label === "Credit Spread") {
        const side = optionTypes(strategy.strikes);
        if (side === "PE") return "Bull Put";
        if (side === "CE") return "Bear Call";
      }
      return label;
    }
  }
  return stripHorizonPrefix(strategy.name) || strategy.type || "Strategy";
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
  if (!strategy) return "Strategy";
  const structure = formatStructureName(strategy);
  if (strategy.status === "Defer") return structure;
  if (isWatchStrategy(strategy)) return structure.includes("Watch") ? structure : `${structure}`;
  return structure;
}

function formatTradeLine(strategy) {
  if (!strategy) return "";
  const side = optionTypes(strategy.strikes);
  const strikes = tradeStrikes(strategy.strikes);
  const expiry = strategy.expiry ? String(strategy.expiry).replace(/-/g, " ") : null;
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
  formatStructureName,
  formatTradeBadge,
  formatTradeLine,
  statusTone,
};
