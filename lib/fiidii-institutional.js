const { fetchFiiDii } = require("./nse");
const { appendSnapshot, computeTrends, readHistory, buildPeriodPanels } = require("./fii-history");
const { buildIntelligence, buildFlowHeatmap } = require("./fii-intelligence");
const { buildChartSeries } = require("./fiidii-charts");
const { buildVerifiedInsights, buildSentiment, buildMarketStatus } = require("./fiidii-insights");
const { formatInrCr } = require("./format");

function snapshotFromHistory(entry) {
  return {
    date: entry.date,
    fii:
      entry.fiiBuy != null || entry.fiiNet != null
        ? { buyValue: entry.fiiBuy ?? null, sellValue: entry.fiiSell ?? null, netValue: entry.fiiNet ?? null }
        : null,
    dii:
      entry.diiBuy != null || entry.diiNet != null
        ? { buyValue: entry.diiBuy ?? null, sellValue: entry.diiSell ?? null, netValue: entry.diiNet ?? null }
        : null,
    raw: [],
    dataStatus: "cached",
    fetchedAt: entry.recordedAt,
    source: entry.source || "NSE India fiidiiTradeReact API",
  };
}

function computeKpis(live, history, aggregates) {
  const prev = history.find((h) => h.date !== live.date) || history[1];
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
    netFii: {
      value: fiiNet,
      display: formatInrCr(fiiNet, { signed: true }),
      change: fiiNet != null && prevFii != null ? Number((fiiNet - prevFii).toFixed(2)) : null,
    },
    netDii: {
      value: diiNet,
      display: formatInrCr(diiNet, { signed: true }),
      change: diiNet != null && prevDii != null ? Number((diiNet - prevDii).toFixed(2)) : null,
    },
    grossBuy: { value: grossBuy, display: formatInrCr(grossBuy) },
    grossSell: { value: grossSell, display: formatInrCr(grossSell) },
    combinedNet: { value: combinedNet, display: formatInrCr(combinedNet, { signed: true }) },
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
      periods: null,
    };
  }

  const history = usedCache ? await readHistory() : await appendSnapshot(live);
  const trends = computeTrends(history);
  const aggregates = trends.aggregates;
  const periods = buildPeriodPanels(history, usedCache ? null : live);
  const intelligence = buildIntelligence(history, live, aggregates);
  const sentiment = buildSentiment(live, history);
  const insights = buildVerifiedInsights(live, history, aggregates);
  const marketStatus = buildMarketStatus();

  const timeframes = ["daily", "weekly", "monthly", "quarterly", "yearly"];
  const charts = {};
  for (const tf of timeframes) {
    charts[tf] = buildChartSeries(history, tf === "weekly" ? "daily" : tf);
  }
  // Weekly chart: last ~5 sessions from daily series (subset) for visual context
  if (charts.daily?.series?.raw?.length) {
    const raw = charts.daily.series.raw.slice(-5);
    charts.weekly = {
      timeframe: "weekly",
      available: raw.length > 0,
      points: raw.length,
      series: {
        ...charts.daily.series,
        raw,
        netFii: raw.map((r) => ({ date: r.date, value: r.fiiNet })),
        netDii: raw.map((r) => ({ date: r.date, value: r.diiNet })),
        grossBuy: raw.map((r) => ({ date: r.date, value: r.grossBuy })),
        grossSell: raw.map((r) => ({ date: r.date, value: r.grossSell })),
        combinedNet: raw.map((r) => ({ date: r.date, value: r.combinedNet })),
        fiiVsDii: raw.map((r) => ({ date: r.date, fii: r.fiiNet, dii: r.diiNet })),
        rolling: [],
        cumulative: [],
      },
    };
  }

  const kpis = computeKpis(live, history, aggregates);

  const executiveSummary = [];
  if (live.fii?.netValue != null) {
    executiveSummary.push(`FII net ${formatInrCr(live.fii.netValue, { signed: true })}`);
  }
  if (live.dii?.netValue != null) {
    executiveSummary.push(`DII net ${formatInrCr(live.dii.netValue, { signed: true })}`);
  }
  if (sentiment.available) {
    executiveSummary.push(`Sentiment: ${sentiment.label}`);
  }

  return {
    available: true,
    title: "FII / DII Intelligence",
    subtitle: "Institutional money flow from verified NSE India data — never estimated",
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
      fiiInflow: live.fii?.buyValue ?? null,
      fiiOutflow: live.fii?.sellValue ?? null,
      diiInflow: live.dii?.buyValue ?? null,
      diiOutflow: live.dii?.sellValue ?? null,
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
    /** Primary period switcher payload: daily | weekly | monthly */
    periods,
    kpis,
    charts,
    insights: insights.length
      ? insights
      : [
          {
            type: "info",
            text: "Not enough verified institutional data is available to generate analytical commentary.",
            confidence: null,
          },
        ],
    intelligence,
    heatmap: buildFlowHeatmap(history, 15),
    sectorAllocation: {
      available: false,
      message:
        "Sector-level FII/DII allocation requires NSE sector-wise flow feed — not available from current API.",
      sectors: [],
    },
    stockActivity: {
      available: false,
      message:
        "Stock-level institutional activity requires NSE/BSE shareholding disclosures — not available from current API.",
      fiiBuying: [],
      diiBuying: [],
      fiiSelling: [],
      diiSelling: [],
    },
    metricGlossary: {
      inflow: {
        label: "Inflow (Buy Value)",
        definition: "Total value of equities purchased by the investor category during the period.",
        formula: "Sum of NSE-reported buyValue across sessions in the window",
        interpretation: "Higher inflow indicates stronger institutional demand.",
        importance: "Tracks fresh capital deployment into cash equities.",
      },
      outflow: {
        label: "Outflow (Sell Value)",
        definition: "Total value of equities sold by the investor category during the period.",
        formula: "Sum of NSE-reported sellValue across sessions in the window",
        interpretation: "Elevated outflow can signal risk reduction or profit-taking.",
        importance: "Measures institutional supply into the market.",
      },
      net: {
        label: "Net Flow",
        definition: "Buy value minus sell value for the category (as reported / summed from NSE).",
        formula: "Σ netValue (NSE) over the selected session window",
        interpretation: "Positive = net buyer; negative = net seller.",
        importance: "Primary signal of institutional participation direction.",
      },
    },
    sessionsStored: history.length,
    live,
    aggregates,
    downloadUrl: "/api/reports/csv/fii-dii",
  };
}

module.exports = { buildInstitutionalFiiDiiDashboard };
