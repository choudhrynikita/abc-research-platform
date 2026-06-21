const { UNAVAILABLE_FIELD } = require("./format");

function flowLabel(net) {
  if (net == null) return UNAVAILABLE_FIELD;
  if (net > 2000) return "Strong net buying";
  if (net > 0) return "Net buying";
  if (net < -2000) return "Strong net selling";
  if (net < 0) return "Net selling";
  return "Neutral";
}

function buildIntelligence(history, live, aggregates) {
  const recent = history.slice(0, Math.min(22, history.length));
  const fiiBuyDays = recent.filter((r) => (r.fiiNet ?? 0) > 0).length;
  const fiiSellDays = recent.filter((r) => (r.fiiNet ?? 0) < 0).length;
  const diiBuyDays = recent.filter((r) => (r.diiNet ?? 0) > 0).length;

  const fiiNetMonth = aggregates.fii.monthly.value;
  const diiNetMonth = aggregates.dii.monthly.value;

  let smartMoney = UNAVAILABLE_FIELD;
  if (live?.fii?.netValue != null && live?.dii?.netValue != null) {
    if (live.fii.netValue > 0 && live.dii.netValue > 0) smartMoney = "Both FII and DII net buyers (broad participation)";
    else if (live.fii.netValue > 0 && live.dii.netValue < 0) smartMoney = "FII-led buying with DII profit-taking (foreign accumulation)";
    else if (live.fii.netValue < 0 && live.dii.netValue > 0) smartMoney = "DII support absorbing FII selling (domestic support)";
    else if (live.fii.netValue < 0 && live.dii.netValue < 0) smartMoney = "Both net sellers (distribution risk)";
    else smartMoney = "Mixed institutional flows";
  }

  const accumulation =
    recent.length >= 5 && fiiBuyDays > fiiSellDays * 1.5
      ? `FII accumulation pattern: ${fiiBuyDays}/${recent.length} recent sessions net positive (verified NSE history)`
      : recent.length >= 5
        ? `No sustained FII accumulation: ${fiiBuyDays} positive vs ${fiiSellDays} negative sessions in last ${recent.length} stored days`
        : UNAVAILABLE_FIELD + " (need 5+ stored sessions)";

  const distribution =
    recent.length >= 5 && fiiSellDays > fiiBuyDays * 1.5
      ? `FII distribution pattern: ${fiiSellDays}/${recent.length} recent sessions net negative`
      : recent.length >= 5
        ? `No sustained FII distribution in stored history`
        : UNAVAILABLE_FIELD + " (need 5+ stored sessions)";

  const capitalRotation =
    fiiNetMonth != null && diiNetMonth != null
      ? `Monthly FII ${fiiNetMonth} Cr vs DII ${diiNetMonth} Cr — ${fiiNetMonth > 0 && diiNetMonth < 0 ? "rotation into equities via FII" : fiiNetMonth < 0 && diiNetMonth > 0 ? "domestic absorption of foreign outflows" : "aligned flow direction"}`
      : UNAVAILABLE_FIELD;

  return {
    smartMoneyDirection: smartMoney,
    accumulationAnalysis: accumulation,
    distributionAnalysis: distribution,
    sectorAllocationTrends: {
      available: false,
      display: UNAVAILABLE_FIELD,
      reason: "Sector-level FII/DII allocation requires NSE sector-wise flow feed — not available from current API",
    },
    capitalRotationAnalysis: capitalRotation,
    fiiFlowCharacter: flowLabel(live?.fii?.netValue),
    diiFlowCharacter: flowLabel(live?.dii?.netValue),
    diiSupportDays: recent.length ? `${diiBuyDays}/${recent.length} sessions DII net positive` : UNAVAILABLE_FIELD,
    evidence: [
      `Sessions in verified database: ${history.length}`,
      `Latest session date: ${live?.date || "Unavailable"}`,
      `Data source: NSE India fiidiiTradeReact API`,
    ],
  };
}

function buildFlowHeatmap(history, limit = 22) {
  const rows = history.slice(0, limit);
  return rows.map((r) => {
    const fii = r.fiiNet ?? 0;
    const dii = r.diiNet ?? 0;
    const max = Math.max(Math.abs(fii), Math.abs(dii), 1);
    return {
      date: r.date,
      fiiNet: r.fiiNet,
      diiNet: r.diiNet,
      fiiIntensity: r.fiiNet != null ? Number((Math.abs(fii) / max).toFixed(2)) : 0,
      diiIntensity: r.diiNet != null ? Number((Math.abs(dii) / max).toFixed(2)) : 0,
      fiiDirection: fii >= 0 ? "buy" : "sell",
      diiDirection: dii >= 0 ? "buy" : "sell",
      source: r.source,
      collectedAt: r.recordedAt,
    };
  });
}

module.exports = { buildIntelligence, buildFlowHeatmap };