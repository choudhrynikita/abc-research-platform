"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import "@/lib/chart-setup";
import {
  financialChartOptions,
  volumeChartOptions,
  exportChartPng,
  chartTheme,
} from "@/lib/chart-setup";
import {
  alignSeriesToCandles,
  buildCandlestickChartData,
  buildVolumeChartData,
  parseChartApiPayload,
  dateToTimestamp,
} from "@/lib/chart-builders";
import ChartPanel from "./ChartPanel";

const DEFAULT_RANGES = [
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

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
  const [fullscreen, setFullscreen] = useState(false);
  const chartRef = useRef(null);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    if (!symbol?.trim()) return;
    setLoading(true);
    setError(null);
    let lastErr = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `/api/chart/${encodeURIComponent(symbol.trim())}?range=${range}`
        );
        const j = await res.json();
        const parsed = parseChartApiPayload(j);
        if (!res.ok || !parsed.ok) {
          throw new Error(
            parsed.error ||
              j.message ||
              "Unable to render chart because verified data could not be retrieved."
          );
        }
        setCandles(parsed.candles);
        setIndicators(parsed.indicators);
        setChartMeta(parsed.meta || j.chartMeta || null);
        setLoading(false);
        return;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
      }
    }

    setError(lastErr?.message || "Live Data Currently Unavailable");
    setCandles([]);
    setIndicators(null);
    setLoading(false);
  }, [symbol, range]);

  useEffect(() => {
    load();
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
    const series = indicators?.series;
    const overlays = [];

    if (showSma20 && series?.sma20) {
      overlays.push({
        label: "SMA 20",
        color: "#f59e0b",
        data: alignSeriesToCandles(candles, series.sma20),
      });
    }
    if (showSma50 && series?.sma50) {
      overlays.push({
        label: "SMA 50",
        color: chartTheme.accent,
        data: alignSeriesToCandles(candles, series.sma50),
      });
    }
    if (support != null && Number.isFinite(Number(support))) {
      overlays.push({
        label: "Support",
        color: "#22c55e88",
        borderDash: [4, 4],
        data: candles
          .map((c) => {
            const x = dateToTimestamp(c.date);
            return x != null ? { x, y: Number(support) } : null;
          })
          .filter(Boolean),
      });
    }
    if (resistance != null && Number.isFinite(Number(resistance))) {
      overlays.push({
        label: "Resistance",
        color: "#ef444488",
        borderDash: [4, 4],
        data: candles
          .map((c) => {
            const x = dateToTimestamp(c.date);
            return x != null ? { x, y: Number(resistance) } : null;
          })
          .filter(Boolean),
      });
    }

    return buildCandlestickChartData(candles, {
      label: symbol?.replace(".NS", "") || "Price",
      overlays,
    });
  }, [candles, indicators, showSma20, showSma50, support, resistance, symbol]);

  const volumeChart = useMemo(() => {
    if (!showVolume || !candles.length) return null;
    return buildVolumeChartData(candles, { label: "Volume" });
  }, [candles, showVolume]);

  const chartOptions = useMemo(() => financialChartOptions(), []);
  const volOptions = useMemo(() => volumeChartOptions(), []);

  if (!symbol?.trim()) return null;

  const actions = (
    <>
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
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() =>
          exportChartPng(
            chartRef.current,
            `${symbol.replace(/[^\w.-]+/g, "_")}-${range}.png`
          )
        }
        title="Download PNG"
      >
        PNG
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setFullscreen((v) => !v)}
      >
        {fullscreen ? "Exit" : "Full"}
      </button>
    </>
  );

  return (
    <ChartPanel
      title={title}
      subtitle={
        subtitle ||
        `Verified OHLCV · ${symbol}${
          chartMeta?.lastUpdated
            ? ` · Updated ${new Date(chartMeta.lastUpdated).toLocaleString()}`
            : ""
        }`
      }
      actions={actions}
      loading={loading}
      error={error}
      empty={!priceChart ? "Awaiting Latest Market Data" : null}
      onRetry={load}
      meta={
        chartMeta
          ? {
              candleCount: chartMeta.candleCount ?? candles.length,
              range: chartMeta.range ?? range,
              lastUpdated: chartMeta.lastUpdated,
              provider: chartMeta.provider || chartMeta.source,
              rejectedPoints: chartMeta.rejectedPoints,
            }
          : candles.length
            ? { candleCount: candles.length, range }
            : null
      }
      fullscreen={fullscreen}
      className={`interactive-price-chart ${className}`.trim()}
      source="Yahoo Finance Chart API"
    >
      <div
        className="chart-canvas-wrap interactive-chart-main"
        ref={wrapRef}
        style={{ height: fullscreen ? "min(70vh, 640px)" : height }}
      >
        {priceChart && (
          <Chart
            ref={chartRef}
            type="candlestick"
            data={priceChart}
            options={chartOptions}
          />
        )}
      </div>
      {volumeChart && (
        <div className="chart-canvas-wrap interactive-chart-sub" style={{ height: 120 }}>
          <Chart type="bar" data={volumeChart} options={volOptions} />
        </div>
      )}
      {!volumeChart && showVolume && (
        <p className="panel-sub chart-footnote">
          Volume: Source does not provide this information for the selected range.
        </p>
      )}
    </ChartPanel>
  );
}
