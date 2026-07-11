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
  { value: "1d", label: "1D" },
  { value: "5d", label: "1W" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

function buildLinePriceData(candles, { label = "Close", overlays = [] } = {}) {
  if (!candles?.length) return null;
  const points = candles
    .map((c) => {
      const x = dateToTimestamp(c.date);
      if (x == null || c.close == null || !Number.isFinite(Number(c.close))) return null;
      return { x, y: Number(c.close) };
    })
    .filter(Boolean);
  if (points.length < 2) return null;

  const datasets = [
    {
      type: "line",
      label,
      data: points,
      borderColor: chartTheme.accent,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.05,
      spanGaps: false,
    },
  ];

  overlays.forEach((overlay) => {
    if (!overlay?.data?.length) return;
    datasets.push({
      type: "line",
      label: overlay.label,
      data: overlay.data,
      borderColor: overlay.color,
      borderWidth: overlay.borderWidth ?? 1.5,
      borderDash: overlay.borderDash,
      pointRadius: 0,
      spanGaps: false,
      tension: 0.05,
    });
  });

  return { datasets };
}

function indicatorLineOptions(yLabel) {
  return financialChartOptions({
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 10, font: { size: 10 } } },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed?.y;
            if (y == null || Number.isNaN(y)) return `${ctx.dataset.label}: Data Unavailable`;
            return `${ctx.dataset.label}: ${Number(y).toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { tooltipFormat: "dd MMM yyyy HH:mm", displayFormats: { day: "dd MMM", hour: "HH:mm" } },
        ticks: { color: chartTheme.tick, maxTicksLimit: 8, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        position: "right",
        title: { display: !!yLabel, text: yLabel, color: chartTheme.tick },
        ticks: { color: chartTheme.tick },
        grid: { color: chartTheme.grid },
      },
    },
  });
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
  showBollinger = false,
  showRsiPanel = false,
  showMacdPanel = false,
  support,
  resistance,
  height = 360,
  className = "",
  allowChartTypeToggle = true,
}) {
  const [range, setRange] = useState(defaultRange);
  const [chartType, setChartType] = useState("candlestick"); // candlestick | line
  const [overlays, setOverlays] = useState({
    sma20: showSma20,
    sma50: showSma50,
    bollinger: showBollinger,
    rsi: showRsiPanel,
    macd: showMacdPanel,
  });
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
          `/api/chart/${encodeURIComponent(symbol.trim())}?range=${encodeURIComponent(range)}`
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

  const overlayLines = useMemo(() => {
    if (!candles.length) return [];
    const series = indicators?.series;
    const list = [];

    if (overlays.sma20 && series?.sma20) {
      list.push({
        label: "SMA 20",
        color: "#f59e0b",
        data: alignSeriesToCandles(candles, series.sma20),
      });
    }
    if (overlays.sma50 && series?.sma50) {
      list.push({
        label: "SMA 50",
        color: chartTheme.accent,
        data: alignSeriesToCandles(candles, series.sma50),
      });
    }
    if (overlays.bollinger && series?.bollingerUpper) {
      list.push({
        label: "BB Upper",
        color: "#a78bfa88",
        borderDash: [3, 3],
        data: alignSeriesToCandles(candles, series.bollingerUpper),
      });
      list.push({
        label: "BB Mid",
        color: "#a78bfa",
        data: alignSeriesToCandles(candles, series.bollingerMiddle),
      });
      list.push({
        label: "BB Lower",
        color: "#a78bfa88",
        borderDash: [3, 3],
        data: alignSeriesToCandles(candles, series.bollingerLower),
      });
    }
    if (support != null && Number.isFinite(Number(support))) {
      list.push({
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
      list.push({
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

    return list;
  }, [candles, indicators, overlays, support, resistance]);

  const priceChart = useMemo(() => {
    if (!candles.length) return null;
    if (chartType === "line") {
      return buildLinePriceData(candles, {
        label: symbol?.replace(".NS", "") || "Close",
        overlays: overlayLines,
      });
    }
    return buildCandlestickChartData(candles, {
      label: symbol?.replace(".NS", "") || "Price",
      overlays: overlayLines,
    });
  }, [candles, chartType, overlayLines, symbol]);

  const volumeChart = useMemo(() => {
    if (!showVolume || !candles.length) return null;
    return buildVolumeChartData(candles, { label: "Volume" });
  }, [candles, showVolume]);

  const rsiChart = useMemo(() => {
    if (!overlays.rsi || !candles.length || !indicators?.series?.rsi) return null;
    const data = alignSeriesToCandles(candles, indicators.series.rsi);
    if (data.length < 2) return null;
    return {
      datasets: [
        {
          type: "line",
          label: "RSI (14)",
          data,
          borderColor: "#f472b6",
          borderWidth: 1.5,
          pointRadius: 0,
          spanGaps: false,
        },
        {
          type: "line",
          label: "Overbought 70",
          data: data.map((p) => ({ x: p.x, y: 70 })),
          borderColor: "#ef444455",
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
        },
        {
          type: "line",
          label: "Oversold 30",
          data: data.map((p) => ({ x: p.x, y: 30 })),
          borderColor: "#22c55e55",
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
        },
      ],
    };
  }, [candles, indicators, overlays.rsi]);

  const macdChart = useMemo(() => {
    if (!overlays.macd || !candles.length || !indicators?.series?.macdLine) return null;
    const line = alignSeriesToCandles(candles, indicators.series.macdLine);
    const signal = alignSeriesToCandles(candles, indicators.series.macdSignal);
    const hist = alignSeriesToCandles(candles, indicators.series.macdHistogram);
    if (line.length < 2) return null;
    return {
      datasets: [
        {
          type: "bar",
          label: "Histogram",
          data: hist,
          backgroundColor: hist.map((p) =>
            p.y >= 0 ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)"
          ),
          borderWidth: 0,
        },
        {
          type: "line",
          label: "MACD",
          data: line,
          borderColor: chartTheme.accent,
          borderWidth: 1.5,
          pointRadius: 0,
          spanGaps: false,
        },
        {
          type: "line",
          label: "Signal",
          data: signal,
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          pointRadius: 0,
          spanGaps: false,
        },
      ],
    };
  }, [candles, indicators, overlays.macd]);

  const chartOptions = useMemo(() => {
    const isIntraday = chartMeta?.interval && chartMeta.interval !== "1d";
    return financialChartOptions({
      scales: {
        x: {
          type: "time",
          time: {
            unit: isIntraday ? "hour" : "day",
            tooltipFormat: isIntraday ? "dd MMM yyyy HH:mm" : "dd MMM yyyy",
            displayFormats: {
              hour: "HH:mm",
              day: "dd MMM",
              week: "dd MMM",
              month: "MMM yyyy",
            },
          },
          ticks: { color: chartTheme.tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
          grid: { color: chartTheme.grid },
        },
        y: {
          position: "right",
          ticks: {
            color: chartTheme.tick,
            callback: (v) =>
              v == null || Number.isNaN(Number(v))
                ? ""
                : Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
          },
          grid: { color: chartTheme.grid },
        },
      },
    });
  }, [chartMeta?.interval]);

  const volOptions = useMemo(() => volumeChartOptions(), []);
  const rsiOptions = useMemo(() => indicatorLineOptions("RSI"), []);
  const macdOptions = useMemo(() => indicatorLineOptions("MACD"), []);

  if (!symbol?.trim()) return null;

  const toggleOverlay = (key) =>
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

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
      {allowChartTypeToggle && (
        <>
          <button
            type="button"
            className={`chip sm${chartType === "candlestick" ? " active" : ""}`}
            onClick={() => setChartType("candlestick")}
            title="Candlestick"
          >
            Candle
          </button>
          <button
            type="button"
            className={`chip sm${chartType === "line" ? " active" : ""}`}
            onClick={() => setChartType("line")}
            title="Close line"
          >
            Line
          </button>
        </>
      )}
      <button
        type="button"
        className={`chip sm${overlays.sma20 ? " active" : ""}`}
        onClick={() => toggleOverlay("sma20")}
      >
        SMA20
      </button>
      <button
        type="button"
        className={`chip sm${overlays.sma50 ? " active" : ""}`}
        onClick={() => toggleOverlay("sma50")}
      >
        SMA50
      </button>
      <button
        type="button"
        className={`chip sm${overlays.bollinger ? " active" : ""}`}
        onClick={() => toggleOverlay("bollinger")}
      >
        BB
      </button>
      <button
        type="button"
        className={`chip sm${overlays.rsi ? " active" : ""}`}
        onClick={() => toggleOverlay("rsi")}
      >
        RSI
      </button>
      <button
        type="button"
        className={`chip sm${overlays.macd ? " active" : ""}`}
        onClick={() => toggleOverlay("macd")}
      >
        MACD
      </button>
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
        }${chartMeta?.interval ? ` · ${chartMeta.interval}` : ""}`
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
            type={chartType === "line" ? "line" : "candlestick"}
            data={priceChart}
            options={chartOptions}
          />
        )}
      </div>
      {volumeChart && (
        <div className="chart-canvas-wrap interactive-chart-sub" style={{ height: 110 }}>
          <Chart type="bar" data={volumeChart} options={volOptions} />
        </div>
      )}
      {rsiChart && (
        <div className="chart-canvas-wrap interactive-chart-sub" style={{ height: 120 }}>
          <Chart type="line" data={rsiChart} options={rsiOptions} />
        </div>
      )}
      {macdChart && (
        <div className="chart-canvas-wrap interactive-chart-sub" style={{ height: 130 }}>
          <Chart type="bar" data={macdChart} options={macdOptions} />
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
