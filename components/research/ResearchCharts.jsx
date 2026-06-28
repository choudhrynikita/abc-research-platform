"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions, chartTheme } from "@/lib/chart-setup";

const RANGES = [
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

export default function ResearchCharts({ symbol, technicals }) {
  const [range, setRange] = useState("1y");
  const [fullscreen, setFullscreen] = useState(false);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState([]);
  const mainRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${range}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) throw new Error(j.message || j.error || "Chart unavailable");
        setCandles(j.candles || []);
        setIndicators(j.indicators || null);
        const miss = [];
        if (!j.candles?.length) miss.push("OHLCV");
        if (!j.indicators?.series) miss.push("Indicators");
        setMissing(miss);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  const priceChart = useMemo(() => {
    if (!candles.length) return null;
    const labels = candles.map((c) => c.date);
    const ohlc = candles.map((c) => ({
      x: c.date,
      o: c.open ?? c.close,
      h: c.high ?? c.close,
      l: c.low ?? c.close,
      c: c.close,
    }));

    const datasets = [
      {
        label: symbol,
        data: ohlc,
        type: "candlestick",
        color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
      },
    ];

    const series = indicators?.series;
    if (series?.sma20) {
      datasets.push({
        type: "line",
        label: "SMA 20",
        data: candles.map((_, i) => series.sma20[i] ?? null),
        borderColor: "#f59e0b",
        pointRadius: 0,
        borderWidth: 1.5,
        spanGaps: true,
      });
    }
    if (series?.sma50) {
      datasets.push({
        type: "line",
        label: "SMA 50",
        data: candles.map((_, i) => series.sma50[i] ?? null),
        borderColor: "#3b82f6",
        pointRadius: 0,
        borderWidth: 1.5,
        spanGaps: true,
      });
    }

    if (technicals?.support != null) {
      datasets.push({
        type: "line",
        label: "Support",
        data: Array(candles.length).fill(technicals.support),
        borderColor: "#22c55e55",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1,
      });
    }
    if (technicals?.resistance != null) {
      datasets.push({
        type: "line",
        label: "Resistance",
        data: Array(candles.length).fill(technicals.resistance),
        borderColor: "#ef444455",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [candles, indicators, symbol, technicals]);

  const volumeChart = useMemo(() => {
    if (!candles.length) return null;
    return {
      labels: candles.map((c) => c.date),
      datasets: [{
        label: "Volume",
        data: candles.map((c) => c.volume ?? 0),
        backgroundColor: "rgba(59,130,246,0.35)",
        borderWidth: 0,
      }],
    };
  }, [candles]);

  const rsiChart = useMemo(() => {
    if (!candles.length || !indicators?.series?.rsi) return null;
    return {
      labels: candles.map((c) => c.date),
      datasets: [{
        label: "RSI (14)",
        data: indicators.series.rsi,
        borderColor: "#a855f7",
        pointRadius: 0,
        tension: 0.1,
      }],
    };
  }, [candles, indicators]);

  const macdChart = useMemo(() => {
    if (!candles.length || !indicators?.series?.macdLine) return null;
    const s = indicators.series;
    return {
      labels: candles.map((c) => c.date),
      datasets: [
        {
          label: "MACD",
          data: s.macdLine,
          borderColor: "#3b82f6",
          pointRadius: 0,
        },
        {
          label: "Signal",
          data: s.macdSignal,
          borderColor: "#f59e0b",
          pointRadius: 0,
        },
        {
          label: "Histogram",
          data: s.macdHistogram,
          type: "bar",
          backgroundColor: s.macdHistogram?.map((v) =>
            v >= 0 ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"
          ),
        },
      ],
    };
  }, [candles, indicators]);

  const baseOptions = baseChartOptions();

  if (!symbol) return null;

  return (
    <section className={`research-charts glass-card${fullscreen ? " fullscreen" : ""}`}>
      <div className="chart-panel-head">
        <div>
          <h3>Price &amp; Technical Charts</h3>
          <p className="panel-sub">Verified OHLCV from Yahoo Finance · {symbol}</p>
        </div>
        <div className="chart-panel-actions">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`chip sm${range === r.value ? " active" : ""}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFullscreen((v) => !v)}>
            {fullscreen ? "Exit" : "Full"}
          </button>
        </div>
      </div>

      {loading && <p className="chart-loading">Loading verified chart data…</p>}
      {error && <p className="chart-error">{error}</p>}
      {missing.length > 0 && !error && (
        <p className="chart-missing">Missing datasets: {missing.join(", ")}</p>
      )}

      {!loading && !error && priceChart && (
        <>
          <div className="research-chart-main">
            <Chart ref={mainRef} type="line" data={priceChart} options={baseOptions} />
          </div>
          {volumeChart && (
            <div className="research-chart-sub">
              <Chart type="bar" data={volumeChart} options={{ ...baseOptions, plugins: { legend: { display: false } } }} />
            </div>
          )}
          <div className="research-chart-row">
            {rsiChart ? (
              <div className="research-chart-sub">
                <Chart type="line" data={rsiChart} options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { min: 0, max: 100, ticks: { color: chartTheme.tick } } } }} />
              </div>
            ) : (
              <div className="research-chart-sub chart-na">RSI data unavailable for this range</div>
            )}
            {macdChart ? (
              <div className="research-chart-sub">
                <Chart type="line" data={macdChart} options={baseOptions} />
              </div>
            ) : (
              <div className="research-chart-sub chart-na">MACD data unavailable for this range</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}