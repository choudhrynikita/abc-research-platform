"use client";

import { useMemo, useRef, useState } from "react";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DATA_UNAVAILABLE = "Data Unavailable";

function fmtNum(v, d = 2) {
  if (v == null || Number.isNaN(Number(v))) return DATA_UNAVAILABLE;
  return Number(v).toLocaleString("en-IN", { maximumFractionDigits: d });
}

/**
 * Institutional expiry payoff diagram with BE / max P/L / spot / strike markers.
 * Values are computed server-side from verified premiums — never estimated here.
 */
export default function PayoffChart({ strategy, height = 320 }) {
  const [zoom, setZoom] = useState(1);
  const chartRef = useRef(null);
  const payoff = strategy?.payoff;

  const chart = useMemo(() => {
    if (!payoff?.available || !payoff.payoffCurve?.length) return null;

    const curve = payoff.payoffCurve;
    // Zoom: show center portion of curve
    const n = curve.length;
    const keep = Math.max(40, Math.floor(n / zoom));
    const start = Math.floor((n - keep) / 2);
    const slice = curve.slice(start, start + keep);

    const labels = slice.map((p) => p.underlying);
    const values = slice.map((p) => p.pl);
    const colors = values.map((v) => (v >= 0 ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)"));

    const spot = payoff.markers?.spot;
    const bes = payoff.breakEvens || [];
    const strikes = payoff.markers?.strikes || [];

    return {
      data: {
        labels,
        datasets: [
          {
            label: "P/L at Expiry (per unit)",
            data: values,
            borderColor: "#3b82f6",
            backgroundColor: (ctx) => {
              const chartObj = ctx.chart;
              const { ctx: c, chartArea } = chartObj;
              if (!chartArea) return "rgba(59,130,246,0.12)";
              const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              grad.addColorStop(0, "rgba(34,197,94,0.25)");
              grad.addColorStop(0.5, "rgba(59,130,246,0.06)");
              grad.addColorStop(1, "rgba(239,68,68,0.2)");
              return grad;
            },
            fill: true,
            tension: 0.15,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: colors,
            borderWidth: 2,
            segment: {
              borderColor: (ctx) => {
                const y0 = ctx.p0.parsed.y;
                const y1 = ctx.p1.parsed.y;
                if (y0 >= 0 && y1 >= 0) return "#22c55e";
                if (y0 < 0 && y1 < 0) return "#ef4444";
                return "#3b82f6";
              },
            },
          },
          // zero line reference as second dataset for clarity
          {
            label: "Break-even (0)",
            data: labels.map(() => 0),
            borderColor: "rgba(148,163,184,0.5)",
            borderDash: [4, 4],
            pointRadius: 0,
            borderWidth: 1,
            fill: false,
          },
        ],
      },
      meta: { spot, bes, strikes, slice },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 400 },
        plugins: {
          legend: {
            labels: { color: "#8b9bb4", boxWidth: 12, filter: (item) => item.text !== "Break-even (0)" },
          },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.94)",
            titleColor: "#e8edf5",
            bodyColor: "#cbd5e1",
            padding: 12,
            callbacks: {
              title: (items) => {
                const u = items[0]?.label;
                return u != null ? `Underlying: ${fmtNum(Number(u), 0)}` : "";
              },
              label: (ctx) => {
                if (ctx.dataset.label === "Break-even (0)") return null;
                const v = ctx.parsed.y;
                if (v == null) return DATA_UNAVAILABLE;
                const sign = v > 0 ? "+" : "";
                return `P/L: ₹ ${sign}${fmtNum(v)} per unit`;
              },
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                const pt = slice[idx];
                if (!pt) return [];
                const lines = [];
                if (spot != null && Math.abs(pt.underlying - spot) < 25) {
                  lines.push("≈ Current spot region");
                }
                for (const be of bes) {
                  if (Math.abs(pt.underlying - be) < 15) lines.push(`Near break-even ${fmtNum(be, 0)}`);
                }
                for (const k of strikes) {
                  if (Math.abs(pt.underlying - k) < 15) lines.push(`Strike ${fmtNum(k, 0)}`);
                }
                if (pt.plLot != null) {
                  lines.push(`Per lot: ₹ ${pt.plLot >= 0 ? "+" : ""}${fmtNum(pt.plLot)}`);
                }
                return lines;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#8b9bb4",
              maxTicksLimit: 8,
              callback(val, i) {
                const lab = this.getLabelForValue?.(val) ?? labels[i];
                const n = Number(lab);
                return Number.isFinite(n) ? n.toLocaleString("en-IN") : lab;
              },
            },
            grid: { color: "rgba(255,255,255,0.04)" },
            title: { display: true, text: "Underlying at expiry", color: "#8b9bb4", font: { size: 11 } },
          },
          y: {
            ticks: {
              color: "#8b9bb4",
              callback: (v) => `₹ ${Number(v).toLocaleString("en-IN")}`,
            },
            grid: { color: "rgba(255,255,255,0.06)" },
            title: { display: true, text: "Profit / Loss", color: "#8b9bb4", font: { size: 11 } },
          },
        },
      },
    };
  }, [payoff, zoom]);

  if (!strategy) return null;

  if (!payoff?.available) {
    return (
      <div className="payoff-chart-panel glass-card">
        <h4>Expiry Payoff Diagram</h4>
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p className="panel-sub">
          {payoff?.reason ||
            "Verified option premiums are required to calculate the payoff diagram. Values are never estimated."}
        </p>
      </div>
    );
  }

  const maxP = payoff.maxProfitUnlimited ? "Unlimited" : payoff.maxProfit != null ? `₹ ${fmtNum(payoff.maxProfit)}` : DATA_UNAVAILABLE;
  const maxL = payoff.maxLossUnlimited ? "Unlimited" : payoff.maxLoss != null ? `₹ ${fmtNum(payoff.maxLoss)}` : DATA_UNAVAILABLE;

  return (
    <div className="payoff-chart-panel glass-card">
      <div className="payoff-chart-head">
        <div>
          <h4>Expiry Payoff Diagram</h4>
          <p className="panel-sub">
            Calculated from verified NSE premiums · {payoff.formulaNote ? "standard multi-leg payoff" : "verified"}
          </p>
        </div>
        <div className="payoff-zoom">
          <button type="button" className="chip sm" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}>
            Zoom +
          </button>
          <button type="button" className="chip sm" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}>
            Zoom −
          </button>
          <button type="button" className="chip sm" onClick={() => setZoom(1)}>
            Reset
          </button>
        </div>
      </div>

      <div className="payoff-metrics-strip">
        <div>
          <small>Max Profit</small>
          <strong className={payoff.maxProfitUnlimited || (payoff.maxProfit ?? 0) > 0 ? "up" : ""}>{maxP}</strong>
        </div>
        <div>
          <small>Max Loss</small>
          <strong className="down">{maxL}</strong>
        </div>
        <div>
          <small>Break-even</small>
          <strong>{payoff.breakEvenDisplay || DATA_UNAVAILABLE}</strong>
        </div>
        <div>
          <small>Net Premium</small>
          <strong>
            {payoff.netPremium == null
              ? DATA_UNAVAILABLE
              : payoff.isCredit
                ? `Credit ₹ ${fmtNum(Math.abs(payoff.netPremium))}`
                : `Debit ₹ ${fmtNum(payoff.netPremium)}`}
          </strong>
        </div>
        <div>
          <small>R:R</small>
          <strong>{payoff.riskRewardRatio != null ? `${payoff.riskRewardRatio}:1` : DATA_UNAVAILABLE}</strong>
        </div>
      </div>

      <div className="payoff-chart-canvas" style={{ height }}>
        {chart ? (
          <Line ref={chartRef} data={chart.data} options={chart.options} />
        ) : (
          <p className="chart-empty">{DATA_UNAVAILABLE}</p>
        )}
      </div>

      <div className="payoff-legend">
        {payoff.markers?.spot != null && (
          <span className="payoff-tag spot">Spot {fmtNum(payoff.markers.spot, 0)}</span>
        )}
        {(payoff.markers?.strikes || []).map((k) => (
          <span key={k} className="payoff-tag strike">
            K {fmtNum(k, 0)}
          </span>
        ))}
        {(payoff.breakEvens || []).map((be) => (
          <span key={be} className="payoff-tag be">
            BE {fmtNum(be, 0)}
          </span>
        ))}
      </div>
      <p className="chart-footnote">
        Green = profit zone · Red = loss zone · Hover for P/L at each underlying · Source: {payoff.source}
      </p>
    </div>
  );
}
