const { readJson, writeJson } = require("./json-store");
const { fmtCr } = require("./format");

const HISTORY_FILE = "fii-dii-history.json";
const MAX_ROWS = 1500;

const WINDOWS = {
  week: 5,
  month: 22,
  quarter: 66,
  year: 252,
  y3: 756,
  y5: 1260,
};

async function readHistory() {
  return readJson(HISTORY_FILE, []);
}

async function writeHistory(rows) {
  await writeJson(HISTORY_FILE, rows.slice(0, MAX_ROWS));
}

async function appendSnapshot(snapshot) {
  const history = await readHistory();
  const key = snapshot.date;
  if (!key) return history;
  if (history.some((h) => h.date === key)) return history;

  const next = [
    {
      date: snapshot.date,
      fiiNet: snapshot.fii?.netValue ?? null,
      diiNet: snapshot.dii?.netValue ?? null,
      fiiBuy: snapshot.fii?.buyValue ?? null,
      fiiSell: snapshot.fii?.sellValue ?? null,
      diiBuy: snapshot.dii?.buyValue ?? null,
      diiSell: snapshot.dii?.sellValue ?? null,
      recordedAt: new Date().toISOString(),
      source: "NSE India fiidiiTradeReact API",
    },
    ...history,
  ];
  await writeHistory(next);
  return next;
}

function sumPeriod(rows, key, minSessions = 1) {
  const valid = rows.filter((r) => r[key] != null);
  if (!valid.length || valid.length < minSessions) {
    return {
      value: null,
      available: false,
      display: "Verified data unavailable.",
      sessions: valid.length,
      reason:
        valid.length < minSessions
          ? `Insufficient verified NSE session history (need ${minSessions}, have ${valid.length})`
          : "Insufficient verified NSE session history",
    };
  }
  const value = Number(valid.reduce((a, r) => a + r[key], 0).toFixed(2));
  return {
    value,
    available: true,
    display: fmtCr(value),
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
    weekly: sumPeriod(history.slice(0, WINDOWS.week), key, 3),
    monthly: sumPeriod(history.slice(0, WINDOWS.month), key, 10),
    quarterly: sumPeriod(history.slice(0, WINDOWS.quarter), key, WINDOWS.quarter),
    yearly: sumPeriod(history.slice(0, WINDOWS.year), key, WINDOWS.year),
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