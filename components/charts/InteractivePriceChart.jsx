"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions, chartTheme } from "@/lib/chart-setup";
import {
  alignSeriesToLabels,
  buildBarChartData,
  buildCandlestickChartData,
  parseChartApiPayload,
} from "@/lib/chart-builders";

const DEFAULT_RANGES = [
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

function ChartEmpty({ message, onRetry }) {
  return (
    <div className="chart-empty-state" role="status">
      <p>{message || "Verified market data unavailable."}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Production interactive OHLCV chart — verified Yahoo Finance data only.
 */
export default function InteractivePriceChart({
  symbol,
  title = "Market Chart",
  subtitle,
  defaultRange = "1y",
  ranges = DEFAULT_RANGES,
  showVolume = true,
  showSma20 = false,
  showSma50 = false,
  support,
  resistance,
  height = 360,
  className = "",
}) {
  const [range, setRange] = useState(defaultRange);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [chartMeta, setChartMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);
  const wrapRef = useRef(null);

  const load = useCallback(() => {
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
          throw new Error(parsed.error || j.message || "Unable to render chart because verified data could not be retrieved.");
        }
        setCandles(parsed.candles);
        setIndicators(parsed.indicators);
        setChartMeta(parsed.meta || j.chartMeta || null);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setCandles([]);
          setIndicators(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol, range]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => {
      chartRef.current?.update?.("none");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [candles.length]);

  const priceChart = useMemo(() => {
    if (!candles.length) return null;
    const labels = candles.map((c) => c.date);
    const series = indicators?.series;
    const overlays = [];

    if (showSma20 && series?.sma20) {
      overlays.push({
        label: "SMA 20",
        color: "#f59e0b",
        data: alignSeriesToLabels(labels, series.sma20),
      });
    }
    if (showSma50 && series?.sma50) {
      overlays.push({
        label: "SMA 50",
        color: "#3b82f6",
        data: alignSeriesToLabels(labels, series.sma50),
      });
    }
    if (support != null) {
      overlays.push({
        label: "Support",
        color: "#22c55e88",
        borderDash: [4, 4],
        data: labels.map(() => support),
      });
    }
    if (resistance != null) {
      overlays.push({
        label: "Resistance",
        color: "#ef444488",
        borderDash: [4, 4],
        data: labels.map(() => resistance),
      });
    }

    return buildCandlestickChartData(candles, {
      label: symbol?.replace(".NS", "") || "Price",
      overlays,
    });
  }, [candles, indicators, showSma20, showSma50, support, resistance, symbol]);

  const volumeChart = useMemo(() => {
    if (!showVolume || !candles.length) return null;
    return buildBarChartData(
      candles.map((c) => c.date),
      candles.map((c) => c.volume ?? 0),
      { label: "Volume" }
    );
  }, [candles, showVolume]);

  const chartOptions = useMemo(() => baseChartOptions(), []);

  if (!symbol?.trim()) return null;

  return (
    <section className={`interactive-price-chart glass-card ${className}`.trim()}>
      <div className="chart-panel-head">
        <div>
          <h3>{title}</h3>
          <p className="panel-sub">
            {subtitle || `Verified OHLCV · ${symbol}`}
            {chartMeta?.lastUpdated && (
              <span className="chart-meta-ts">
                {" "}· Updated {new Date(chartMeta.lastUpdated).toLocaleString()}
                {chartMeta.provider && ` · ${chartMeta.provider}`}
              </span>
            )}
          </p>
        </div>
        <div className="chart-panel-actions">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`chip sm${range === r.value ? " active" : ""}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="chart-loading-block">
          <div className="terminal-spinner" />
          <p>Loading verified chart data…</p>
        </div>
      )}

      {error && !loading && (
        <ChartEmpty message={error} onRetry={load} />
      )}

      {!loading && !error && priceChart && (
        <>
          <div className="chart-canvas-wrap interactive-chart-main" ref={wrapRef} style={{ height }}>
            <Chart
              ref={chartRef}
              type="line"
              data={priceChart}
              options={chartOptions}
            />
          </div>
          {volumeChart && (
            <div className="chart-canvas-wrap interactive-chart-sub" style={{ height: 120 }}>
              <Chart type="bar" data={volumeChart} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
            </div>
          )}
          {chartMeta && (
            <p className="chart-footnote">
              {chartMeta.candleCount} verified candles · Range {chartMeta.range}
              {chartMeta.rejectedPoints > 0 && ` · ${chartMeta.rejectedPoints} points rejected`}
            </p>
          )}
        </>
      )}

      {!loading && !error && !priceChart && (
        <ChartEmpty message="Verified market data unavailable." onRetry={load} />
      )}
    </section>
  );
}