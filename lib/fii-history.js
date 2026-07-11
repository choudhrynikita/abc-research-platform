const { readJson, writeJson } = require("./json-store");
const { fmtCr, formatInrCr } = require("./format");

const HISTORY_FILE = "fii-dii-history.json";
const MAX_ROWS = 1500;

/** Trading-session windows (approx.) — sums only verified stored sessions, never estimates. */
const WINDOWS = {
  week: 5,
  month: 22,
  quarter: 66,
  year: 252,
  y3: 756,
  y5: 1260,
};

const DATA_UNAVAILABLE = "Data Unavailable";

async function readHistory() {
  return readJson(HISTORY_FILE, []);
}

async function writeHistory(rows) {
  await writeJson(HISTORY_FILE, rows.slice(0, MAX_ROWS));
}

function isFiniteNumber(n) {
  return n != null && typeof n === "number" && Number.isFinite(n);
}

/**
 * Merge live NSE snapshot into the front of history for aggregation
 * without mutating the stored file twice for the same date.
 */
function withLiveFront(history, live) {
  if (!live?.date) return history || [];
  const rest = (history || []).filter((h) => h.date !== live.date);
  const row = {
    date: live.date,
    fiiNet: live.fii?.netValue ?? null,
    diiNet: live.dii?.netValue ?? null,
    fiiBuy: live.fii?.buyValue ?? null,
    fiiSell: live.fii?.sellValue ?? null,
    diiBuy: live.dii?.buyValue ?? null,
    diiSell: live.dii?.sellValue ?? null,
    recordedAt: live.fetchedAt || new Date().toISOString(),
    source: live.source || "NSE India fiidiiTradeReact API",
  };
  return [row, ...rest];
}

async function appendSnapshot(snapshot) {
  const history = await readHistory();
  const key = snapshot.date;
  if (!key) return history;

  const row = {
    date: snapshot.date,
    fiiNet: snapshot.fii?.netValue ?? null,
    diiNet: snapshot.dii?.netValue ?? null,
    fiiBuy: snapshot.fii?.buyValue ?? null,
    fiiSell: snapshot.fii?.sellValue ?? null,
    diiBuy: snapshot.dii?.buyValue ?? null,
    diiSell: snapshot.dii?.sellValue ?? null,
    recordedAt: snapshot.fetchedAt || new Date().toISOString(),
    source: snapshot.source || "NSE India fiidiiTradeReact API",
  };

  const idx = history.findIndex((h) => h.date === key);
  let next;
  if (idx >= 0) {
    // Refresh same-day row with latest verified values from NSE (do not invent).
    next = [...history];
    next[idx] = { ...next[idx], ...row };
  } else {
    next = [row, ...history];
  }
  await writeHistory(next);
  return next;
}

function metricFromSum(value, sessions, { source, collectedAt, reason } = {}) {
  if (!isFiniteNumber(value)) {
    return {
      value: null,
      available: false,
      display: DATA_UNAVAILABLE,
      sessions: sessions || 0,
      reason: reason || "Source does not provide this information",
    };
  }
  return {
    value: Number(value.toFixed(2)),
    available: true,
    display: formatInrCr(value, { signed: true }) || fmtCr(value),
    displayUnsigned: formatInrCr(value) || fmtCr(value),
    sessions: sessions || 0,
    source: source || "NSE India fiidiiTradeReact API",
    collectedAt: collectedAt || null,
  };
}

/**
 * Sum a single field across rows. Missing fields are skipped (not treated as 0)
 * unless every row in the window lacks the field → unavailable.
 */
function sumField(rows, key) {
  const valid = (rows || []).filter((r) => isFiniteNumber(r[key]));
  if (!valid.length) {
    return metricFromSum(null, 0, {
      reason:
        rows?.length
          ? `No verified ${key} values in the selected session window`
          : "Awaiting latest market data",
    });
  }
  const value = valid.reduce((a, r) => a + r[key], 0);
  return metricFromSum(value, valid.length, {
    source: valid[0]?.source || "NSE stored sessions (summed)",
    collectedAt: valid[0]?.recordedAt,
  });
}

function asUnsignedDisplay(metric) {
  if (!metric?.available || !isFiniteNumber(metric.value)) return metric;
  return {
    ...metric,
    display: formatInrCr(metric.value) || metric.display,
  };
}

function flowBundle(rows, prefix) {
  const buyKey = `${prefix}Buy`;
  const sellKey = `${prefix}Sell`;
  const netKey = `${prefix}Net`;

  // Inflow/outflow are gross buy/sell (unsigned); net keeps signed display.
  const inflow = asUnsignedDisplay(sumField(rows, buyKey));
  const outflow = asUnsignedDisplay(sumField(rows, sellKey));
  const net = sumField(rows, netKey);

  // Prefer source net when available; never recompute net from partial buy/sell if net missing.
  return {
    inflow,
    outflow,
    net,
  };
}

function combinedFlow(rows) {
  const fiiIn = sumField(rows, "fiiBuy");
  const diiIn = sumField(rows, "diiBuy");
  const fiiOut = sumField(rows, "fiiSell");
  const diiOut = sumField(rows, "diiSell");
  const fiiNet = sumField(rows, "fiiNet");
  const diiNet = sumField(rows, "diiNet");

  const combinePair = (a, b, label) => {
    if (a.available && b.available) {
      return metricFromSum(a.value + b.value, Math.min(a.sessions, b.sessions), {
        source: "NSE FII + DII (summed verified)",
        collectedAt: a.collectedAt || b.collectedAt,
      });
    }
    return metricFromSum(null, 0, {
      reason: `Combined ${label} requires both FII and DII verified values`,
    });
  };

  return {
    inflow: asUnsignedDisplay(combinePair(fiiIn, diiIn, "inflow")),
    outflow: asUnsignedDisplay(combinePair(fiiOut, diiOut, "outflow")),
    net: combinePair(fiiNet, diiNet, "net"),
  };
}

/**
 * Change vs previous comparable period using verified data only.
 * Daily: latest vs prior session net.
 * Weekly/Monthly: current window sum vs prior non-overlapping window sum.
 */
function periodChange(currentRows, priorRows, key) {
  const cur = sumField(currentRows, key);
  const prior = sumField(priorRows, key);
  if (!cur.available || !prior.available) {
    return {
      value: null,
      available: false,
      display: DATA_UNAVAILABLE,
      reason: "Insufficient verified history for period-over-period change",
    };
  }
  const delta = Number((cur.value - prior.value).toFixed(2));
  let pct = null;
  if (prior.value !== 0) {
    pct = Number((((cur.value - prior.value) / Math.abs(prior.value)) * 100).toFixed(2));
  }
  return {
    value: delta,
    pct,
    available: true,
    display: formatInrCr(delta, { signed: true }),
    pctDisplay: pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : DATA_UNAVAILABLE,
    source: "Derived from verified NSE session history",
  };
}

function buildPeriodView(history, { id, label, windowSize, description }) {
  const rows = (history || []).slice(0, windowSize);
  const priorRows = (history || []).slice(windowSize, windowSize * 2);
  const sessionsWithData = rows.filter(
    (r) =>
      isFiniteNumber(r.fiiNet) ||
      isFiniteNumber(r.diiNet) ||
      isFiniteNumber(r.fiiBuy) ||
      isFiniteNumber(r.diiBuy)
  ).length;

  if (!sessionsWithData) {
    return {
      id,
      label,
      description,
      available: false,
      windowSize,
      sessionsUsed: 0,
      asOf: null,
      message: "Awaiting latest market data",
      fii: {
        inflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        outflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        net: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
      },
      dii: {
        inflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        outflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        net: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
      },
      combined: {
        inflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        outflow: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
        net: metricFromSum(null, 0, { reason: "Awaiting latest market data" }),
      },
      change: {
        fiiNet: periodChange([], [], "fiiNet"),
        diiNet: periodChange([], [], "diiNet"),
      },
    };
  }

  const fii = flowBundle(rows, "fii");
  const dii = flowBundle(rows, "dii");
  const combined = combinedFlow(rows);

  return {
    id,
    label,
    description,
    available: true,
    windowSize,
    sessionsUsed: sessionsWithData,
    asOf: rows[0]?.date || null,
    fromDate: rows[rows.length - 1]?.date || null,
    toDate: rows[0]?.date || null,
    source: rows[0]?.source || "NSE India fiidiiTradeReact API",
    collectedAt: rows[0]?.recordedAt || null,
    fii,
    dii,
    combined,
    change: {
      fiiNet: periodChange(rows, priorRows, "fiiNet"),
      diiNet: periodChange(rows, priorRows, "diiNet"),
      combinedNet: (() => {
        // Only when both legs available in both windows
        const curF = sumField(rows, "fiiNet");
        const curD = sumField(rows, "diiNet");
        const prF = sumField(priorRows, "fiiNet");
        const prD = sumField(priorRows, "diiNet");
        if (!curF.available || !curD.available || !prF.available || !prD.available) {
          return {
            value: null,
            available: false,
            display: DATA_UNAVAILABLE,
            reason: "Insufficient verified history for combined period change",
          };
        }
        const delta = Number((curF.value + curD.value - (prF.value + prD.value)).toFixed(2));
        return {
          value: delta,
          available: true,
          display: formatInrCr(delta, { signed: true }),
          source: "Derived from verified NSE session history",
        };
      })(),
    },
    note:
      id === "daily"
        ? "Latest verified NSE trading session"
        : `Sum of last ${sessionsWithData} verified NSE trading session${sessionsWithData === 1 ? "" : "s"} (window up to ${windowSize}) — not calendar estimated`,
  };
}

/**
 * Build Daily / Weekly / Monthly period panels from verified history (+ live front).
 */
function buildPeriodPanels(history, live = null) {
  const series = withLiveFront(history, live);
  return {
    daily: buildPeriodView(series, {
      id: "daily",
      label: "Daily",
      windowSize: 1,
      description: "Latest NSE session institutional cash market activity",
    }),
    weekly: buildPeriodView(series, {
      id: "weekly",
      label: "Weekly",
      windowSize: WINDOWS.week,
      description: "Sum of up to last 5 verified NSE trading sessions",
    }),
    monthly: buildPeriodView(series, {
      id: "monthly",
      label: "Monthly",
      windowSize: WINDOWS.month,
      description: "Sum of up to last 22 verified NSE trading sessions",
    }),
    seriesLength: series.length,
  };
}

function sumPeriod(rows, key, minSessions = 1) {
  const valid = (rows || []).filter((r) => isFiniteNumber(r[key]));
  if (!valid.length || valid.length < minSessions) {
    return {
      value: null,
      available: false,
      display: DATA_UNAVAILABLE,
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
    display: formatInrCr(value, { signed: true }) || fmtCr(value),
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
          available: isFiniteNumber(latest[key]),
          display: isFiniteNumber(latest[key])
            ? formatInrCr(latest[key], { signed: true })
            : DATA_UNAVAILABLE,
          date: latest.date,
          source: latest.source || "NSE India fiidiiTradeReact API",
          collectedAt: latest.recordedAt,
        }
      : {
          available: false,
          display: DATA_UNAVAILABLE,
          reason: "No sessions stored",
        },
    weekly: sumPeriod(history.slice(0, WINDOWS.week), key, 1),
    monthly: sumPeriod(history.slice(0, WINDOWS.month), key, 1),
    quarterly: sumPeriod(history.slice(0, WINDOWS.quarter), key, 1),
    yearly: sumPeriod(history.slice(0, WINDOWS.year), key, 1),
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
        fiiBuy: r.fiiBuy,
        fiiSell: r.fiiSell,
        diiBuy: r.diiBuy,
        diiSell: r.diiSell,
        source: r.source,
        collectedAt: r.recordedAt,
      }));

  return {
    "1m": { sessions: WINDOWS.month, data: sliceView(WINDOWS.month), available: history.length >= 1 },
    "3m": { sessions: WINDOWS.quarter, data: sliceView(WINDOWS.quarter), available: history.length >= 1 },
    "6m": { sessions: 132, data: sliceView(132), available: history.length >= 1 },
    "1y": { sessions: WINDOWS.year, data: sliceView(WINDOWS.year), available: history.length >= 1 },
    "3y": { sessions: WINDOWS.y3, data: sliceView(WINDOWS.y3), available: history.length >= 1 },
    "5y": { sessions: WINDOWS.y5, data: sliceView(WINDOWS.y5), available: history.length >= 1 },
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
  buildPeriodPanels,
  withLiveFront,
  WINDOWS,
  DATA_UNAVAILABLE,
};
