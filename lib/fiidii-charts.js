function parseNseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d;
  const m = dateStr.match(/(\d{1,2})-(\w{3})-(\d{4})/);
  if (m) return new Date(`${m[1]} ${m[2]} ${m[3]}`);
  return null;
}

function periodKey(date, granularity) {
  const d = parseNseDate(date);
  if (!d) return date;
  const y = d.getFullYear();
  const mo = d.getMonth();
  if (granularity === "monthly") return `${y}-${String(mo + 1).padStart(2, "0")}`;
  if (granularity === "quarterly") return `${y}-Q${Math.floor(mo / 3) + 1}`;
  if (granularity === "yearly") return `${y}`;
  return date;
}

function aggregateHistory(history, granularity) {
  if (granularity === "daily") {
    return [...history]
      .reverse()
      .map((r) => ({
        date: r.date,
        fiiNet: r.fiiNet,
        diiNet: r.diiNet,
        fiiBuy: r.fiiBuy,
        fiiSell: r.fiiSell,
        diiBuy: r.diiBuy,
        diiSell: r.diiSell,
        grossBuy: r.fiiBuy != null && r.diiBuy != null ? Number((r.fiiBuy + r.diiBuy).toFixed(2)) : null,
        grossSell: r.fiiSell != null && r.diiSell != null ? Number((r.fiiSell + r.diiSell).toFixed(2)) : null,
        combinedNet: r.fiiNet != null && r.diiNet != null ? Number((r.fiiNet + r.diiNet).toFixed(2)) : null,
        source: r.source,
      }));
  }

  const buckets = new Map();
  for (const row of history) {
    const key = periodKey(row.date, granularity);
    if (!key) continue;
    if (!buckets.has(key)) {
      buckets.set(key, {
        date: key,
        fiiNet: 0,
        diiNet: 0,
        fiiBuy: 0,
        fiiSell: 0,
        diiBuy: 0,
        diiSell: 0,
        sessions: 0,
        hasFii: false,
        hasDii: false,
      });
    }
    const b = buckets.get(key);
    if (row.fiiNet != null) { b.fiiNet += row.fiiNet; b.hasFii = true; }
    if (row.diiNet != null) { b.diiNet += row.diiNet; b.hasDii = true; }
    if (row.fiiBuy != null) b.fiiBuy += row.fiiBuy;
    if (row.fiiSell != null) b.fiiSell += row.fiiSell;
    if (row.diiBuy != null) b.diiBuy += row.diiBuy;
    if (row.diiSell != null) b.diiSell += row.diiSell;
    b.sessions += 1;
  }

  return [...buckets.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((b) => ({
      date: b.date,
      fiiNet: b.hasFii ? Number(b.fiiNet.toFixed(2)) : null,
      diiNet: b.hasDii ? Number(b.diiNet.toFixed(2)) : null,
      fiiBuy: b.fiiBuy ? Number(b.fiiBuy.toFixed(2)) : null,
      fiiSell: b.fiiSell ? Number(b.fiiSell.toFixed(2)) : null,
      diiBuy: b.diiBuy ? Number(b.diiBuy.toFixed(2)) : null,
      diiSell: b.diiSell ? Number(b.diiSell.toFixed(2)) : null,
      grossBuy: Number((b.fiiBuy + b.diiBuy).toFixed(2)),
      grossSell: Number((b.fiiSell + b.diiSell).toFixed(2)),
      combinedNet: b.hasFii && b.hasDii ? Number((b.fiiNet + b.diiNet).toFixed(2)) : null,
      sessions: b.sessions,
    }));
}

function rollingNet(history, window = 5) {
  const daily = [...history].reverse();
  return daily.map((_, i) => {
    const slice = daily.slice(Math.max(0, i - window + 1), i + 1);
    const fii = slice.every((r) => r.fiiNet != null)
      ? Number(slice.reduce((a, r) => a + r.fiiNet, 0).toFixed(2))
      : null;
    const dii = slice.every((r) => r.diiNet != null)
      ? Number(slice.reduce((a, r) => a + r.diiNet, 0).toFixed(2))
      : null;
    return {
      date: daily[i].date,
      rollingFii: fii,
      rollingDii: dii,
      rollingCombined: fii != null && dii != null ? Number((fii + dii).toFixed(2)) : null,
    };
  });
}

function cumulativeFlow(history) {
  let cumFii = 0;
  let cumDii = 0;
  return [...history]
    .reverse()
    .map((r) => {
      if (r.fiiNet != null) cumFii += r.fiiNet;
      if (r.diiNet != null) cumDii += r.diiNet;
      return {
        date: r.date,
        cumulativeFii: r.fiiNet != null ? Number(cumFii.toFixed(2)) : null,
        cumulativeDii: r.diiNet != null ? Number(cumDii.toFixed(2)) : null,
        cumulativeCombined:
          r.fiiNet != null && r.diiNet != null ? Number((cumFii + cumDii).toFixed(2)) : null,
      };
    });
}

function buildChartSeries(history, timeframe = "daily") {
  const aggregated = aggregateHistory(history, timeframe);
  const dailyHistory = [...history].reverse();

  return {
    timeframe,
    available: aggregated.length > 0,
    points: aggregated.length,
    series: {
      netFii: aggregated.map((r) => ({ date: r.date, value: r.fiiNet })),
      netDii: aggregated.map((r) => ({ date: r.date, value: r.diiNet })),
      grossBuy: aggregated.map((r) => ({ date: r.date, value: r.grossBuy })),
      grossSell: aggregated.map((r) => ({ date: r.date, value: r.grossSell })),
      combinedNet: aggregated.map((r) => ({ date: r.date, value: r.combinedNet })),
      fiiVsDii: aggregated.map((r) => ({
        date: r.date,
        fii: r.fiiNet,
        dii: r.diiNet,
      })),
      rolling: timeframe === "daily" ? rollingNet(dailyHistory) : [],
      cumulative: timeframe === "daily" ? cumulativeFlow(history) : [],
      raw: aggregated,
    },
  };
}

module.exports = {
  buildChartSeries,
  aggregateHistory,
  rollingNet,
  cumulativeFlow,
};