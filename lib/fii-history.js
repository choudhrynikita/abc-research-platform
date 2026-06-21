const fs = require("fs");
const path = require("path");

const { dataPath } = require("./data-path");
const HISTORY_PATH = dataPath("fii-dii-history.json");
const MAX_ROWS = 1500;

const WINDOWS = {
  week: 5,
  month: 22,
  quarter: 66,
  year: 252,
  y3: 756,
  y5: 1260,
};

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeHistory(rows) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(rows.slice(0, MAX_ROWS), null, 2));
}

function appendSnapshot(snapshot) {
  const history = readHistory();
  const key = snapshot.date;
  const filtered = history.filter((h) => h.date !== key);
  filtered.unshift({
    date: snapshot.date,
    fiiNet: snapshot.fii?.netValue ?? null,
    diiNet: snapshot.dii?.netValue ?? null,
    fiiBuy: snapshot.fii?.buyValue ?? null,
    fiiSell: snapshot.fii?.sellValue ?? null,
    diiBuy: snapshot.dii?.buyValue ?? null,
    diiSell: snapshot.dii?.sellValue ?? null,
    recordedAt: new Date().toISOString(),
    source: "NSE India fiidiiTradeReact API",
  });
  writeHistory(filtered);
  return filtered;
}

function sumPeriod(rows, key) {
  const valid = rows.filter((r) => r[key] != null);
  if (!valid.length) {
    return {
      value: null,
      available: false,
      display: "Verified data unavailable.",
      sessions: 0,
      reason: "Insufficient verified NSE session history",
    };
  }
  return {
    value: Number(valid.reduce((a, r) => a + r[key], 0).toFixed(2)),
    available: true,
    sessions: valid.length,
    source: "NSE stored sessions (summed)",
    collectedAt: valid[0]?.recordedAt,
  };
}

function buildAggregates(history) {
  const latest = history[0];
  const mk = (key) => ({
    daily: latest
      ? {
          value: latest[key],
          available: latest[key] != null,
          display: latest[key] != null ? latest[key] : "Verified data unavailable.",
          date: latest.date,
          source: latest.source || "NSE India fiidiiTradeReact API",
          collectedAt: latest.recordedAt,
        }
      : { available: false, display: "Verified data unavailable.", reason: "No sessions stored" },
    weekly: sumPeriod(history.slice(0, WINDOWS.week), key),
    monthly: sumPeriod(history.slice(0, WINDOWS.month), key),
    quarterly: sumPeriod(history.slice(0, WINDOWS.quarter), key),
    yearly: sumPeriod(history.slice(0, WINDOWS.year), key),
  });

  return { fii: mk("fiiNet"), dii: mk("diiNet") };
}

function buildHistoricalViews(history) {
  const sliceView = (n) =>
    [...history]
      .slice(0, n)
      .reverse()
      .map((r) => ({
        date: r.date,
        fiiNet: r.fiiNet,
        diiNet: r.diiNet,
        source: r.source,
        collectedAt: r.recordedAt,
      }));

  return {
    "1m": { sessions: WINDOWS.month, data: sliceView(WINDOWS.month), available: history.length >= 1 },
    "3m": { sessions: WINDOWS.quarter, data: sliceView(WINDOWS.quarter), available: history.length >= 5 },
    "6m": { sessions: 132, data: sliceView(132), available: history.length >= 10 },
    "1y": { sessions: WINDOWS.year, data: sliceView(WINDOWS.year), available: history.length >= 22 },
    "3y": { sessions: WINDOWS.y3, data: sliceView(WINDOWS.y3), available: history.length >= 66 },
    "5y": { sessions: WINDOWS.y5, data: sliceView(WINDOWS.y5), available: history.length >= 252 },
  };
}

function computeTrends(history) {
  const aggregates = buildAggregates(history);
  return {
    weeklyFiiNet: aggregates.fii.weekly.value,
    weeklyDiiNet: aggregates.dii.weekly.value,
    monthlyFiiNet: aggregates.fii.monthly.value,
    monthlyDiiNet: aggregates.dii.monthly.value,
    sessionsTracked: history.length,
    aggregates,
    views: buildHistoricalViews(history),
  };
}

module.exports = {
  appendSnapshot,
  readHistory,
  computeTrends,
  writeHistory,
  buildAggregates,
  buildHistoricalViews,
  WINDOWS,
};