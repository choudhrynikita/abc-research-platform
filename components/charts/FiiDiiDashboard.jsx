"use client";

import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const VIEW_OPTIONS = [
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "3y", label: "3 Years" },
  { value: "5y", label: "5 Years" },
];

function FlowChart({ history, field, label, color }) {
  if (!history?.length) {
    return (
      <div className="chart-panel-sm">
        <p className="hint-block">Verified data unavailable for {label}.</p>
      </div>
    );
  }

  const data = {
    labels: history.map((h) => h.date),
    datasets: [
      {
        label,
        data: history.map((h) => h[field]),
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: true,
        tension: 0.25,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: "#8b9bb4" } },
    },
    scales: {
      x: { ticks: { color: "#8b9bb4", maxTicksLimit: 8 } },
      y: { ticks: { color: "#8b9bb4" } },
    },
  };

  return (
    <div className="chart-panel-sm">
      <Line data={data} options={options} />
    </div>
  );
}

function FlowHeatmap({ heatmap }) {
  if (!heatmap?.length) {
    return (
      <p className="hint-block">
        Verified data unavailable. Heatmap requires stored NSE session history.
      </p>
    );
  }

  return (
    <div className="flow-heatmap">
      {heatmap.map((cell) => (
        <div
          key={cell.date}
          className="heat-cell"
          title={`FII ${cell.fiiNet} / DII ${cell.diiNet} — ${cell.date}`}
        >
          <span className="heat-date">{cell.date}</span>
          <span
            className={`heat-fii ${cell.fiiDirection}`}
            style={{ opacity: 0.35 + cell.fiiIntensity * 0.65 }}
          >
            FII {cell.fiiNet ?? "—"}
          </span>
          <span
            className={`heat-dii ${cell.diiDirection}`}
            style={{ opacity: 0.35 + cell.diiIntensity * 0.65 }}
          >
            DII {cell.diiNet ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FiiDiiDashboard({ report }) {
  const [viewKey, setViewKey] = useState("1m");

  const history = useMemo(() => {
    const views = report?.views || {};
    return views[viewKey]?.data || report?.history || [];
  }, [report, viewKey]);

  if (!report) return null;

  return (
    <section className="chart-dashboard">
      <div className="chart-controls">
        <label>
          Historical View{" "}
          <select
            className="chart-select"
            value={viewKey}
            onChange={(e) => setViewKey(e.target.value)}
          >
            {VIEW_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="chart-row">
        <FlowChart history={history} field="fiiNet" label="FII Net (Cr)" color="#22c55e" />
        <FlowChart history={history} field="diiNet" label="DII Net (Cr)" color="#3b82f6" />
      </div>
      <h3>Institutional Flow Heatmap</h3>
      <FlowHeatmap heatmap={report.heatmap} />
      <h3>Aggregate Intelligence</h3>
      <section className="overview-grid">
        <div className="metric-card">
          <div className="label">Smart Money</div>
          <div className="value">{report.intelligence?.smartMoneyDirection || "—"}</div>
        </div>
        <div className="metric-card">
          <div className="label">FII Quarterly</div>
          <div className="value">{report.aggregates?.fii?.quarterly?.display || "—"}</div>
        </div>
        <div className="metric-card">
          <div className="label">DII Quarterly</div>
          <div className="value">{report.aggregates?.dii?.quarterly?.display || "—"}</div>
        </div>
        <div className="metric-card">
          <div className="label">Sessions Stored</div>
          <div className="value">{report.history?.length || 0}</div>
        </div>
      </section>
    </section>
  );
}