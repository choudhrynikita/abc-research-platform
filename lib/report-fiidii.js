const { fetchFiiDii } = require("./nse");
const { appendSnapshot, computeTrends, readHistory } = require("./fii-history");
const { buildIntelligence, buildFlowHeatmap } = require("./fii-intelligence");
const { fmtCr, noNullRows, UNAVAILABLE_FIELD } = require("./format");
const { computeConfidence, field } = require("./confidence");
const { buildAuditTrail, dataSourcesSection, assumptionsSection } = require("./traceability");

function snapshotFromHistory(entry) {
  return {
    date: entry.date,
    fii: entry.fiiBuy != null ? { buyValue: entry.fiiBuy, sellValue: entry.fiiSell, netValue: entry.fiiNet } : null,
    dii: entry.diiBuy != null ? { buyValue: entry.diiBuy, sellValue: entry.diiSell, netValue: entry.diiNet } : null,
    raw: [],
    dataStatus: "cached",
    fetchedAt: entry.recordedAt,
    cacheNote: "Live NSE feed unavailable — showing last stored verified session.",
  };
}

function aggRow(label, fii, dii) {
  return [
    label,
    fii.available ? fmtCr(fii.value) : UNAVAILABLE_FIELD,
    dii.available ? fmtCr(dii.value) : UNAVAILABLE_FIELD,
    fii.sessions != null ? `${fii.sessions} sessions` : "—",
  ];
}

async function buildFiiDiiReport() {
  let live;
  let usedCache = false;

  try {
    live = await fetchFiiDii();
    live.dataStatus = "live";
  } catch (err) {
    const cached = (await readHistory())[0];
    if (!cached) {
      throw new Error(
        "Verified data unavailable. Analysis cannot be generated until fresh data is received from approved sources."
      );
    }
    live = snapshotFromHistory(cached);
    usedCache = true;
  }

  const history = usedCache ? await readHistory() : await appendSnapshot(live);
  const trends = computeTrends(history);
  const aggregates = trends.aggregates;
  const intelligence = buildIntelligence(history, live, aggregates);
  const heatmap = buildFlowHeatmap(history);

  const confidence = computeConfidence({
    fields: [
      field("liveSession", live.fii?.netValue != null, "NSE"),
      field("history", history.length >= 1, "Stored DB"),
      field("weekly", aggregates.fii.weekly.available, "Computed"),
      field("monthly", aggregates.fii.monthly.available, "Computed"),
    ],
    alignment: usedCache ? 60 : 90,
  });

  const sections = [
    {
      title: "Executive Summary",
      dataType: usedCache ? "unavailable" : "verified",
      content: `FII daily net ${live.fii?.netValue != null ? fmtCr(live.fii.netValue) : UNAVAILABLE_FIELD}; DII daily net ${live.dii?.netValue != null ? fmtCr(live.dii.netValue) : UNAVAILABLE_FIELD}. Smart money: ${intelligence.smartMoneyDirection}.${usedCache ? " Using last verified stored session." : ""}`,
    },
    {
      title: "FII Historical Aggregates",
      dataType: "verified",
      table: {
        headers: ["Period", "FII Net", "DII Net", "Sessions Used"],
        rows: noNullRows([
          aggRow("Daily", aggregates.fii.daily, aggregates.dii.daily),
          aggRow("Weekly", aggregates.fii.weekly, aggregates.dii.weekly),
          aggRow("Monthly", aggregates.fii.monthly, aggregates.dii.monthly),
          aggRow("Quarterly", aggregates.fii.quarterly, aggregates.dii.quarterly),
          aggRow("Yearly", aggregates.fii.yearly, aggregates.dii.yearly),
        ]),
      },
      bullets: [
        `Verified sessions in database: ${history.length}`,
        aggregates.fii.quarterly.available ? "" : "Quarterly/yearly require more stored NSE sessions — not estimated",
      ].filter(Boolean),
    },
    {
      title: "Historical Trend Views",
      dataType: "verified",
      bullets: Object.entries(trends.views).map(([k, v]) => {
        const pts = v.data?.length || 0;
        return `${k}: ${v.available ? `${pts} verified data points` : UNAVAILABLE_FIELD + " (insufficient stored history)"}`;
      }),
    },
    {
      title: "Institutional Intelligence",
      dataType: "model-opinion",
      bullets: [
        `Smart Money Direction: ${intelligence.smartMoneyDirection}`,
        `Accumulation: ${intelligence.accumulationAnalysis}`,
        `Distribution: ${intelligence.distributionAnalysis}`,
        `Capital Rotation: ${intelligence.capitalRotationAnalysis}`,
        `Sector Allocation: ${intelligence.sectorAllocationTrends.reason}`,
      ],
    },
    {
      title: "Daily Activity",
      dataType: "verified",
      table: {
        headers: ["Category", "Buy (Cr)", "Sell (Cr)", "Net (Cr)"],
        rows: noNullRows([
          ["FII/FPI", live.fii?.buyValue, live.fii?.sellValue, live.fii?.netValue],
          ["DII", live.dii?.buyValue, live.dii?.sellValue, live.dii?.netValue],
        ]),
      },
    },
    {
      title: "Supporting Evidence",
      dataType: "verified",
      bullets: intelligence.evidence,
    },
    dataSourcesSection([
      { name: "NSE fiidiiTradeReact", provider: "nseindia.com", fetchedAt: live.fetchedAt || new Date().toISOString() },
      { name: "FII/DII History DB", provider: "data/fii-dii-history.json", fetchedAt: new Date().toISOString() },
    ]),
    assumptionsSection([
      "Aggregates sum verified stored sessions only — never backfilled",
      "Quarterly = 66 sessions, Yearly = 252 sessions when available",
      "Sector allocation unavailable without sector-wise NSE feed",
    ]),
    buildAuditTrail([
      { metric: "FII Daily Net", value: live.fii?.netValue, source: "NSE", collectedAt: live.fetchedAt, derivation: "fiidiiTradeReact API" },
      { metric: "Sessions Stored", value: history.length, source: "Local DB", collectedAt: new Date().toISOString(), derivation: "Append on each live fetch" },
    ]),
    { title: "Disclaimer", content: "Institutional flow data from NSE. Historical aggregates require accumulated verified sessions." },
  ];

  return {
    type: "fiidii",
    title: `FII & DII Institutional Intelligence — ${live.date || "Latest"}`,
    source: "NSE India fiidiiTradeReact API + verified history database",
    generatedAt: new Date().toISOString(),
    dataFreshness: { fetchedAt: live.fetchedAt || new Date().toISOString(), status: live.dataStatus },
    confidence,
    disclaimer: usedCache ? live.cacheNote : "Aggregates computed from verified stored NSE sessions only.",
    dataStatus: live.dataStatus,
    sections,
    live,
    trends,
    aggregates,
    intelligence,
    heatmap,
    history: history.slice(0, 252),
    views: trends.views,
  };
}

module.exports = { buildFiiDiiReport };