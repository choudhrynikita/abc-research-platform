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

/** Base scale options — category x-axis with explicit labels for candlestick compatibility. */
export function baseChartOptions(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: { duration: 300 },
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 12 } },
      tooltip: {
        backgroundColor: "rgba(15,23,42,0.92)",
        callbacks: {
          label(ctx) {
            const raw = ctx.raw;
            if (raw && typeof raw === "object" && "o" in raw) {
              return `O:${raw.o} H:${raw.h} L:${raw.l} C:${raw.c}`;
            }
            const y = ctx.parsed?.y;
            if (y == null || Number.isNaN(y)) return `${ctx.dataset.label}: —`;
            return `${ctx.dataset.label}: ${typeof y === "number" ? y.toLocaleString() : y}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        ticks: { color: chartTheme.tick, maxTicksLimit: 10, maxRotation: 0 },
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