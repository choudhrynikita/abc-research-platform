"use client";

import { useEffect, useState } from "react";
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
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function PriceChart({ symbol, range = "1y" }) {
  const [candles, setCandles] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol?.trim()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/chart/${encodeURIComponent(symbol.trim())}?range=${range}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) throw new Error(j.message || j.error || "Chart data unavailable");
        setCandles(j.candles || []);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  if (!symbol?.trim()) return null;
  if (loading) return <p className="loading">Loading verified OHLCV for {symbol}...</p>;
  if (error) return <div className="error-panel"><p>{error}</p></div>;
  if (!candles?.length) return <p className="hint-block">Verified data unavailable. Chart cannot be generated.</p>;

  const data = {
    labels: candles.map((c) => c.date),
    datasets: [
      {
        label: `${symbol} Close`,
        data: candles.map((c) => c.close),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { ticks: { maxTicksLimit: 8 } } },
  };

  return (
    <section className="chart-panel">
      <h4>Price Chart — {symbol}</h4>
      <div className="chart-panel-sm" style={{ height: 280 }}>
        <Line data={data} options={options} />
      </div>
    </section>
  );
}