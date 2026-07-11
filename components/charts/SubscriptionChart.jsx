"use client";

import { Line } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions } from "@/lib/chart-setup";

/**
 * IPO subscription history — only plots verified numeric overall multiples.
 * Never invents subscription levels.
 */
export default function SubscriptionChart({ history }) {
  if (!Array.isArray(history) || !history.length) {
    return (
      <div className="chart-empty-state glass-card">
        <p className="metric-na">Data Unavailable</p>
        <p>Source does not provide subscription history for charting.</p>
      </div>
    );
  }

  const points = history
    .map((h) => {
      const y = h?.overall;
      if (y == null || !Number.isFinite(Number(y))) return null;
      const label = h.recordedAt
        ? new Date(h.recordedAt).toLocaleString()
        : h.date || null;
      if (!label) return null;
      return { label, y: Number(y) };
    })
    .filter(Boolean);

  if (!points.length) {
    return (
      <div className="chart-empty-state glass-card">
        <p className="metric-na">Data Unavailable</p>
        <p>No verified subscription multiples available to chart.</p>
      </div>
    );
  }

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: "Overall Subscription (x)",
        data: points.map((p) => p.y),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.2,
        pointRadius: 3,
        spanGaps: false,
      },
    ],
  };

  return (
    <section className="chart-panel glass-card">
      <h4>Subscription Trend</h4>
      <p className="panel-sub">Verified IPO subscription snapshots only</p>
      <div className="chart-panel-sm chart-canvas-wrap" style={{ height: 220 }}>
        <Line
          data={data}
          options={baseChartOptions({
            scales: {
              ...baseChartOptions().scales,
              y: { ...baseChartOptions().scales.y, beginAtZero: true },
            },
          })}
        />
      </div>
      <p className="chart-footnote">{points.length} verified observations</p>
    </section>
  );
}
