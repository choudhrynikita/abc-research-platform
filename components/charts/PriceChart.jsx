"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions } from "@/lib/chart-setup";
import { parseChartApiPayload } from "@/lib/chart-builders";

/**
 * Simple close-price line chart — verified Yahoo OHLCV only.
 * Prefer InteractivePriceChart / ProChart for institutional candlesticks.
 */
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
        const parsed = parseChartApiPayload(j);
        if (!ok || !parsed.ok) {
          throw new Error(parsed.error || j.message || "Verified market data unavailable.");
        }
        setCandles(parsed.candles);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setCandles(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  if (!symbol?.trim()) return null;
  if (loading) {
    return (
      <div className="chart-loading-block">
        <div className="terminal-spinner" />
        <p>Loading verified OHLCV for {symbol}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="chart-empty-state">
        <p className="metric-na">Data Unavailable</p>
        <p>{error}</p>
      </div>
    );
  }
  if (!candles?.length) {
    return (
      <div className="chart-empty-state">
        <p className="metric-na">Data Unavailable</p>
        <p>Verified data unavailable. Chart cannot be generated.</p>
      </div>
    );
  }

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
        spanGaps: false,
      },
    ],
  };

  return (
    <section className="chart-panel glass-card">
      <h4>Price Chart — {symbol}</h4>
      <p className="panel-sub">Verified closes · Yahoo Finance · Range {range}</p>
      <div className="chart-panel-sm chart-canvas-wrap" style={{ height: 280 }}>
        <Line data={data} options={baseChartOptions({ plugins: { legend: { display: false } } })} />
      </div>
      <p className="chart-footnote">{candles.length} verified candles</p>
    </section>
  );
}
