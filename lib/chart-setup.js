"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";
import "chartjs-adapter-date-fns";

let registered = false;

/** Register Chart.js controllers/scales once (safe for Next.js HMR). */
export function registerCharts() {
  if (typeof window === "undefined") return;
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    BarController,
    LineController,
    Title,
    Tooltip,
    Legend,
    Filler,
    CandlestickController,
    CandlestickElement
  );
  registered = true;
}

registerCharts();

export const chartTheme = {
  grid: "rgba(255,255,255,0.05)",
  tick: "#8b9bb4",
  tooltipBg: "rgba(15,23,42,0.94)",
  up: "#22c55e",
  down: "#ef4444",
  accent: "#3b82f6",
};

function ohlcTooltipLabel(ctx) {
  const raw = ctx.raw;
  const parsed = ctx.parsed;
  const o = raw?.o ?? parsed?.o;
  const h = raw?.h ?? parsed?.h;
  const l = raw?.l ?? parsed?.l;
  const c = raw?.c ?? parsed?.c;
  if (o != null && h != null && l != null && c != null) {
    return `O ${Number(o).toLocaleString("en-IN", { maximumFractionDigits: 2 })}  H ${Number(h).toLocaleString("en-IN", { maximumFractionDigits: 2 })}  L ${Number(l).toLocaleString("en-IN", { maximumFractionDigits: 2 })}  C ${Number(c).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  const y = parsed?.y;
  if (y == null || Number.isNaN(y)) return `${ctx.dataset.label}: Data Unavailable`;
  return `${ctx.dataset.label}: ${typeof y === "number" ? y.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : y}`;
}

function formatInrTick(v) {
  if (v == null || Number.isNaN(Number(v))) return "";
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Base options for category/linear charts (non-candlestick). */
export function baseChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 280 },
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 12 } },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        titleColor: "#e8edf5",
        bodyColor: "#cbd5e1",
        padding: 12,
        callbacks: { label: ohlcTooltipLabel },
      },
    },
    scales: {
      x: {
        type: "category",
        ticks: { color: chartTheme.tick, maxTicksLimit: 10, maxRotation: 0 },
        grid: { color: chartTheme.grid },
      },
      y: {
        ticks: {
          color: chartTheme.tick,
          callback: (v) => formatInrTick(v),
        },
        grid: { color: chartTheme.grid },
      },
    },
    ...overrides,
  };
}

/**
 * Options for mixed candlestick + line overlays (time scale + date-fns adapter).
 * Required for chartjs-chart-financial to render reliably.
 */
export function financialChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 280 },
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 12 } },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        titleColor: "#e8edf5",
        bodyColor: "#cbd5e1",
        padding: 12,
        callbacks: { label: ohlcTooltipLabel },
      },
      decimation: {
        enabled: true,
        algorithm: "lttb",
        samples: 500,
      },
    },
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
          tooltipFormat: "dd MMM yyyy",
          displayFormats: {
            day: "dd MMM",
            week: "dd MMM",
            month: "MMM yyyy",
          },
        },
        ticks: { color: chartTheme.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { color: chartTheme.grid },
      },
      y: {
        position: "right",
        ticks: {
          color: chartTheme.tick,
          callback: (v) => formatInrTick(v),
        },
        grid: { color: chartTheme.grid },
      },
    },
    ...overrides,
  };
}

/** Volume bar chart under a price chart — shares time axis formatting. */
export function volumeChartOptions(overrides = {}) {
  return financialChartOptions({
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed?.y;
            if (y == null || Number.isNaN(y)) return "Volume: Data Unavailable";
            return `Volume: ${Number(y).toLocaleString("en-IN")}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "day", displayFormats: { day: "dd MMM" } },
        ticks: { color: chartTheme.tick, maxTicksLimit: 8, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: chartTheme.tick,
          callback: (v) => {
            if (v == null) return "";
            if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
            if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
            return String(v);
          },
        },
        grid: { color: chartTheme.grid },
      },
    },
    ...overrides,
  });
}

/**
 * Export a Chart.js instance as PNG data URL (client only).
 * Returns null if chart unavailable — never fabricates an image.
 */
export function exportChartPng(chartInstance, filename = "chart.png") {
  if (typeof window === "undefined" || !chartInstance) return null;
  try {
    const url = chartInstance.toBase64Image?.("image/png", 1);
    if (!url) return null;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    return url;
  } catch {
    return null;
  }
}
