"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const TIMEFRAMES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const CHART_TYPES = [
  { id: "netFii", label: "Net FII Flow", color: "#22c55e", field: "fiiNet" },
  { id: "netDii", label: "Net DII Flow", color: "#3b82f6", field: "diiNet" },
  { id: "grossBuy", label: "Gross Buying", color: "#10b981", field: "grossBuy" },
  { id: "grossSell", label: "Gross Selling", color: "#ef4444", field: "grossSell" },
  { id: "combinedNet", label: "Combined Institutional", color: "#8b5cf6", field: "combinedNet" },
  { id: "fiiVsDii", label: "FII vs DII", color: null, dual: true },
  { id: "rolling", label: "Rolling Net (5D)", color: "#f59e0b", rolling: true },
  { id: "cumulative", label: "Cumulative Flow", color: "#06b6d4", cumulative: true },
];

function buildDataset(chartType, chartData, timeframe) {
  const raw = chartData?.series?.raw || [];
  const labels = raw.map((r) => r.date);

  if (chartType.id === "fiiVsDii") {
    return {
      labels,
      datasets: [
        {
          label: "FII Net (Cr)",
          data: raw.map((r) => r.fiiNet),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.15)",
          fill: false,
          tension: 0.25,
          pointRadius: timeframe === "daily" ? 0 : 3,
        },
        {
          label: "DII Net (Cr)",
          data: raw.map((r) => r.diiNet),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          fill: false,
          tension: 0.25,
          pointRadius: timeframe === "daily" ? 0 : 3,
        },
      ],
      useBar: false,
    };
  }

  if (chartType.rolling && timeframe === "daily") {
    const rolling = chartData?.series?.rolling || [];
    return {
      labels: rolling.map((r) => r.date),
      datasets: [
        {
          label: "Rolling FII (5D)",
          data: rolling.map((r) => r.rollingFii),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: "Rolling DII (5D)",
          data: rolling.map((r) => r.rollingDii),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
      useBar: false,
    };
  }

  if (chartType.cumulative && timeframe === "daily") {
    const cum = chartData?.series?.cumulative || [];
    return {
      labels: cum.map((r) => r.date),
      datasets: [
        {
          label: "Cumulative FII",
          data: cum.map((r) => r.cumulativeFii),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.1)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
        },
        {
          label: "Cumulative DII",
          data: cum.map((r) => r.cumulativeDii),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.1)",
          fill: true,
          tension: 0.2,
          pointRadius: 0,
        },
      ],
      useBar: false,
    };
  }

  const field = chartType.field;
  const values = raw.map((r) => r[field]);
  const useBar = timeframe !== "daily";

  return {
    labels,
    datasets: [
      {
        label: `${chartType.label} (Cr)`,
        data: values,
        borderColor: chartType.color,
        backgroundColor: `${chartType.color}33`,
        fill: !useBar,
        tension: 0.25,
        pointRadius: timeframe === "daily" ? 0 : 3,
      },
    ],
    useBar,
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  animation: { duration: 450, easing: "easeOutQuart" },
  plugins: {
    legend: { labels: { color: "#8b9bb4", boxWidth: 12 } },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.92)",
      titleColor: "#e8edf5",
      bodyColor: "#8b9bb4",
      padding: 12,
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed.y;
          if (v == null || Number.isNaN(v)) return `${ctx.dataset.label}: Data Unavailable`;
          const abs = Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
          const sign = v < 0 ? "-" : v > 0 ? "+" : "";
          return `${ctx.dataset.label}: ₹ ${sign}${abs} Cr`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#8b9bb4", maxTicksLimit: 10, maxRotation: 0 },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
    y: {
      ticks: {
        color: "#8b9bb4",
        callback: (v) => {
          if (v == null) return "";
          return `₹ ${Number(v).toLocaleString("en-IN")}`;
        },
      },
      grid: { color: "rgba(255,255,255,0.06)" },
    },
  },
};

export default function FlowChartPanel({ charts, activePeriod }) {
  const [timeframe, setTimeframe] = useState(activePeriod || "daily");
  const [chartType, setChartType] = useState("fiiVsDii");
  const [fullscreen, setFullscreen] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    if (activePeriod && ["daily", "weekly", "monthly"].includes(activePeriod)) {
      setTimeframe(activePeriod);
    }
  }, [activePeriod]);

  const selectedType = CHART_TYPES.find((c) => c.id === chartType) || CHART_TYPES[0];
  const chartData = charts?.[timeframe] || (timeframe === "weekly" ? charts?.daily : null);

  const dataset = useMemo(() => {
    if (!chartData?.available) return null;
    if ((selectedType.rolling || selectedType.cumulative) && timeframe !== "daily") return null;
    return buildDataset(selectedType, chartData, timeframe);
  }, [chartData, selectedType, timeframe]);

  const isRollingCumulativeDailyOnly =
    (selectedType.rolling || selectedType.cumulative) && timeframe !== "daily";

  if (!charts) return null;

  return (
    <section className={`fiidii-chart-panel glass-card${fullscreen ? " fullscreen" : ""}`}>
      <div className="chart-panel-head">
        <div>
          <h3>Historical Trend</h3>
          <p className="panel-sub">Interactive institutional flow charts — verified NSE sessions only</p>
        </div>
        <div className="chart-panel-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? "Exit" : "Full"}
          </button>
        </div>
      </div>

      <div className="chart-timeframe-tabs" role="tablist" aria-label="Chart period">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.id}
            type="button"
            className={`chip${timeframe === tf.id ? " active" : ""}`}
            onClick={() => setTimeframe(tf.id)}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="chart-type-tabs">
        {CHART_TYPES.map((ct) => (
          <button
            key={ct.id}
            type="button"
            className={`chip sm${chartType === ct.id ? " active" : ""}`}
            onClick={() => setChartType(ct.id)}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <div className="fiidii-chart-canvas">
        {!chartData?.available ? (
          <p className="chart-empty">
            Data Unavailable — Latest verified institutional flow data is temporarily unavailable.
          </p>
        ) : isRollingCumulativeDailyOnly ? (
          <p className="chart-empty">Rolling and cumulative views are available on the Daily timeframe only.</p>
        ) : dataset ? (
          dataset.useBar ? (
            <Bar ref={chartRef} data={dataset} options={chartOptions} />
          ) : (
            <Line ref={chartRef} data={dataset} options={chartOptions} />
          )
        ) : (
          <p className="chart-empty">Insufficient verified history for this view.</p>
        )}
      </div>

      {chartData?.points > 0 && (
        <p className="chart-footnote">
          {chartData.points} verified data points · Source: NSE India · Values in ₹ Cr
        </p>
      )}
    </section>
  );
}
