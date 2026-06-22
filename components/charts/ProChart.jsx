"use client";

import { useEffect, useMemo, useState } from "react";
import { Chart } from "react-chartjs-2";
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
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CandlestickController,
  CandlestickElement
);

const RANGE_OPTIONS = [
  { value: "3mo", label: "3 Months" },
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" },
];

const TYPE_OPTIONS = [
  { value: "candlestick", label: "Candlestick" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "heikin", label: "Heikin-Ashi" },
];

function heikinAshi(candles) {
  const out = [];
  let prevHa = null;
  candles.forEach((c) => {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = prevHa ? (prevHa.o + prevHa.c) / 2 : (c.open + c.close) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    const row = { x: c.date, o: haOpen, h: haHigh, l: haLow, c: haClose };
    out.push(row);
    prevHa = row;
  });
  return out;
}

function toLineData(candles) {
  return candles.map((c) => ({ x: c.date, y: c.close }));
}

export default function ProChart({ symbol, defaultRange = "1y" }) {
  const [range, setRange] = useState(defaultRange);
  const [chartType, setChartType] = useState("candlestick");
  const [showRsi, setShowRsi] = useState(false);
  const [showSma, setShowSma] = useState(false);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState(null);
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
        setIndicators(j.indicators || null);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  const mainChart = useMemo(() => {
    if (!candles.length) return null;

    const datasets = [];
    if (chartType === "line" || chartType === "area") {
      datasets.push({
        type: "line",
        label: "Close",
        data: toLineData(candles),
        borderColor: "#3b82f6",
        backgroundColor: chartType === "area" ? "rgba(59, 130, 246, 0.15)" : "transparent",
        fill: chartType === "area",
        pointRadius: 0,
      });
    } else {
      const data =
        chartType === "heikin"
          ? heikinAshi(candles)
          : candles.map((c) => ({ x: c.date, o: c.open, h: c.high, l: c.low, c: c.close }));
      datasets.push({
        type: "candlestick",
        label: symbol,
        data,
        color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
      });
    }

    if (showSma && indicators?.series?.sma20) {
      datasets.push({
        type: "line",
        label: "SMA20",
        data: candles
          .map((c, i) => ({ x: c.date, y: indicators.series.sma20[i] }))
          .filter((d) => d.y != null),
        borderColor: "#f59e0b",
        pointRadius: 0,
      });
    }

    return {
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { color: "#8b9bb4" } } },
        scales: {
          x: { type: "category", ticks: { color: "#8b9bb4", maxTicksLimit: 10 } },
          y: { ticks: { color: "#8b9bb4" } },
        },
      },
    };
  }, [candles, chartType, showSma, indicators, symbol]);

  const rsiChart = useMemo(() => {
    if (!showRsi || !candles.length || !indicators?.series?.rsi) return null;
    const rsiData = indicators.series.rsi.slice(-candles.length);
    return {
      data: {
        labels: candles.map((c) => c.date),
        datasets: [
          {
            label: "RSI",
            data: rsiData,
            borderColor: "#a855f7",
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100, ticks: { color: "#8b9bb4" } } },
      },
    };
  }, [showRsi, candles, indicators]);

  if (!symbol?.trim()) return null;
  if (loading) return <p className="loading">Loading verified OHLCV for {symbol}...</p>;
  if (error) return <div className="error-panel"><p>{error}</p></div>;
  if (!candles.length) {
    return <p className="hint-block">Verified data unavailable. Chart cannot be generated.</p>;
  }

  return (
    <section className="chart-pro-panel">
      <div className="chart-controls">
        <label>
          Range{" "}
          <select className="chart-select" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label>
          Type{" "}
          <select className="chart-select" value={chartType} onChange={(e) => setChartType(e.target.value)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <label className="chart-toggle">
          <input type="checkbox" checked={showSma} onChange={(e) => setShowSma(e.target.checked)} />
          SMA20
        </label>
        <label className="chart-toggle">
          <input type="checkbox" checked={showRsi} onChange={(e) => setShowRsi(e.target.checked)} />
          RSI
        </label>
      </div>
      <div className="chart-panel-pro" style={{ height: 360 }}>
        {mainChart && <Chart type="line" data={mainChart.data} options={mainChart.options} />}
      </div>
      {rsiChart && (
        <div className="chart-panel-sm" style={{ height: 140, marginTop: 12 }}>
          <Chart type="line" data={rsiChart.data} options={rsiChart.options} />
        </div>
      )}
    </section>
  );
}