const { fetchFiiDii } = require("./nse");
const { appendSnapshot, computeTrends, readHistory } = require("./fii-history");
const { buildIntelligence, buildFlowHeatmap } = require("./fii-intelligence");
const { buildChartSeries } = require("./fiidii-charts");
const { buildVerifiedInsights, buildSentiment, buildMarketStatus } = require("./fiidii-insights");

function snapshotFromHistory(entry) {
  return {
    date: entry.date,
    fii: entry.fiiBuy != null
      ? { buyValue: entry.fiiBuy, sellValue: entry.fiiSell, netValue: entry.fiiNet }
      : null,
    dii: entry.diiBuy != null
      ? { buyValue: entry.diiBuy, sellValue: entry.diiSell, netValue: entry.diiNet }
      : null,
    raw: [],
    dataStatus: "cached",
    fetchedAt: entry.recordedAt,
    source: entry.source || "NSE India fiidiiTradeReact API",
  };
}

function computeKpis(live, history, aggregates) {
  const prev = history[1];
  const fiiNet = live.fii?.netValue ?? null;
  const diiNet = live.dii?.netValue ?? null;
  const grossBuy =
    live.fii?.buyValue != null && live.dii?.buyValue != null
      ? Number((live.fii.buyValue + live.dii.buyValue).toFixed(2))
      : null;
  const grossSell =
    live.fii?.sellValue != null && live.dii?.sellValue != null
      ? Number((live.fii.sellValue + live.dii.sellValue).toFixed(2))
      : null;
  const combinedNet = fiiNet != null && diiNet != null ? Number((fiiNet + diiNet).toFixed(2)) : null;

  const prevFii = prev?.fiiNet ?? null;
  const prevDii = prev?.diiNet ?? null;

  let trend = "Neutral";
  if (combinedNet != null) {
    if (combinedNet > 2000) trend = "Strong Inflow";
    else if (combinedNet > 0) trend = "Net Inflow";
    else if (combinedNet < -2000) trend = "Strong Outflow";
    else if (combinedNet < 0) trend = "Net Outflow";
  }

  return {
    netFii: { value: fiiNet, change: fiiNet != null && prevFii != null ? Number((fiiNet - prevFii).toFixed(2)) : null },
    netDii: { value: diiNet, change: diiNet != null && prevDii != null ? Number((diiNet - prevDii).toFixed(2)) : null },
    grossBuy: { value: grossBuy },
    grossSell: { value: grossSell },
    combinedNet: { value: combinedNet },
    trend,
    weeklyFii: aggregates.fii.weekly,
    weeklyDii: aggregates.dii.weekly,
    monthlyFii: aggregates.fii.monthly,
    monthlyDii: aggregates.dii.monthly,
    previousSession: prev ? { date: prev.date, fiiNet: prev.fiiNet, diiNet: prev.diiNet } : null,
  };
}

async function fetchLiveWithRetry() {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await fetchFiiDii(3);
      data.dataStatus = "live";
      return { data, usedCache: false };
    } catch (err) {
      lastError = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  const cached = (await readHistory())[0];
  if (cached) {
    return { data: snapshotFromHistory(cached), usedCache: true, error: lastError?.message };
  }
  throw lastError || new Error("All configured sources failed");
}

async function buildInstitutionalFiiDiiDashboard() {
  let live;
  let usedCache = false;
  let fetchError = null;

  try {
    const result = await fetchLiveWithRetry();
    live = result.data;
    usedCache = result.usedCache;
    fetchError = result.error || null;
  } catch (err) {
    return {
      available: false,
      message: "Latest verified institutional flow data is temporarily unavailable. Please refresh or try again later.",
      error: err.message,
      marketStatus: buildMarketStatus(),
      refreshedAt: new Date().toISOString(),
    };
  }

  const history = usedCache ? await readHistory() : await appendSnapshot(live);
  const trends = computeTrends(history);
  const aggregates = trends.aggregates;
  const intelligence = buildIntelligence(history, live, aggregates);
  const sentiment = buildSentiment(live, history);
  const insights = buildVerifiedInsights(live, history, aggregates);
  const marketStatus = buildMarketStatus();

  const timeframes = ["daily", "monthly", "quarterly", "yearly"];
  const charts = {};
  for (const tf of timeframes) {
    charts[tf] = buildChartSeries(history, tf);
  }

  const kpis = computeKpis(live, history, aggregates);

  const executiveSummary = [];
  if (live.fii?.netValue != null) {
    executiveSummary.push(`FII net flow: ${live.fii.netValue.toLocaleString()} Cr`);
  }
  if (live.dii?.netValue != null) {
    executiveSummary.push(`DII net flow: ${live.dii.netValue.toLocaleString()} Cr`);
  }
  if (sentiment.available) {
    executiveSummary.push(`Institutional sentiment: ${sentiment.label}`);
  }

  return {
    available: true,
    title: "FII / DII Intelligence",
    subtitle: "Institutional money flow from verified NSE India data",
    sessionDate: live.date,
    dataStatus: live.dataStatus,
    usedCache,
    fetchError,
    marketStatus,
    refreshedAt: live.fetchedAt || new Date().toISOString(),
    source: "NSE India — fiidiiTradeReact API",
    executiveSummary: executiveSummary.join(" · "),
    overview: {
      netFii: live.fii?.netValue ?? null,
      netDii: live.dii?.netValue ?? null,
      weeklyTrend: {
        fii: aggregates.fii.weekly.value,
        dii: aggregates.dii.weekly.value,
        available: aggregates.fii.weekly.available,
      },
      monthlyTrend: {
        fii: aggregates.fii.monthly.value,
        dii: aggregates.dii.monthly.value,
        available: aggregates.fii.monthly.available,
      },
      sentiment,
      marketMood: sentiment.mood,
    },
    kpis,
    charts,
    insights: insights.length
      ? insights
      : [{ type: "info", text: "Not enough verified institutional data is available to generate analytical commentary.", confidence: null }],
    intelligence,
    heatmap: buildFlowHeatmap(history, 15),
    sectorAllocation: {
      available: false,
      message: "Sector-level FII/DII allocation requires NSE sector-wise flow feed — not available from current API.",
      sectors: [],
    },
    stockActivity: {
      available: false,
      message: "Stock-level institutional activity requires NSE/BSE shareholding disclosures — not available from current API.",
      fiiBuying: [],
      diiBuying: [],
      fiiSelling: [],
      diiSelling: [],
    },
    sessionsStored: history.length,
    live,
    aggregates,
    downloadUrl: "/api/reports/csv/fii-dii",
  };
}

module.exports = { buildInstitutionalFiiDiiDashboard };