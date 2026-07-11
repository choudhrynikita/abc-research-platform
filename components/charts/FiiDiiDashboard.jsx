"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions } from "@/lib/chart-setup";

/**
 * Compact FII/DII history charts — only plots verified finite net values.
 * Prefer the institutional /fiidii terminal for full analytics.
 */
function FlowChart({ history, field, label, color }) {
  const chart = useMemo(() => {
    if (!Array.isArray(history) || !history.length) return null;
    const points = history
      .map((h) => {
        const y = h?.[field];
        if (y == null || !Number.isFinite(Number(y))) return null;
        if (!h.date) return null;
        return { label: h.date, y: Number(y) };
      })
      .filter(Boolean);
    if (!points.length) return null;
    return {
      labels: points.map((p) => p.label),
      datasets: [
        {
          label,
          data: points.map((p) => p.y),
          borderColor: color,
          backgroundColor: `${color}22`,
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          spanGaps: false,
        },
      ],
    };
  }, [history, field, label, color]);

  if (!chart) {
    return (
      <div className="chart-empty-state">
        <p className="metric-na">Data Unavailable</p>
        <p className="panel-sub">{label}: Awaiting Latest Market Data</p>
      </div>
    );
  }

  return (
    <div className="chart-canvas-wrap" style={{ height: 200 }}>
      <Line
        data={chart}
        options={baseChartOptions({
          plugins: { legend: { display: true, labels: { color: "#8b9bb4", boxWidth: 12 } } },
        })}
      />
    </div>
  );
}

export default function FiiDiiDashboard({ history = [], summary }) {
  return (
    <section className="fiidii-mini glass-card">
      <h3>FII / DII Flow Charts</h3>
      <p className="panel-sub">Verified NSE session history only — never estimated</p>
      {summary && (
        <p className="panel-sub">
          {summary}
        </p>
      )}
      <div className="fiidii-mini-grid">
        <div>
          <h5>FII Net</h5>
          <FlowChart history={history} field="fiiNet" label="FII Net (Cr)" color="#22c55e" />
        </div>
        <div>
          <h5>DII Net</h5>
          <FlowChart history={history} field="diiNet" label="DII Net (Cr)" color="#3b82f6" />
        </div>
      </div>
      <p className="chart-footnote">
        {history?.length || 0} history rows provided · invalid points omitted
      </p>
    </section>
  );
}
