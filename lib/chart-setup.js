"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
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

let registered = false;

/** Register Chart.js controllers/scales once (safe for Next.js HMR). */
export function registerCharts() {
  if (typeof window === "undefined") return;
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
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
};

/** Base scale options — category x-axis avoids unregistered timeseries scale from candlestick defaults. */
export function baseChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 12 } },
      tooltip: { backgroundColor: "rgba(15,23,42,0.92)" },
    },
    scales: {
      x: {
        type: "category",
        ticks: { color: chartTheme.tick, maxTicksLimit: 8 },
        grid: { color: chartTheme.grid },
      },
      y: {
        ticks: { color: chartTheme.tick },
        grid: { color: chartTheme.grid },
      },
    },
    ...overrides,
  };
}