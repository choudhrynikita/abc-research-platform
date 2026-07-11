"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions, financialChartOptions, chartTheme } from "@/lib/chart-setup";
import {
  alignSeriesToCandles,
  buildVolumeChartData,
  buildCandlestickChartData,
  parseChartApiPayload,
  dateToTimestamp,
} from "@/lib/chart-builders";
import { volumeChartOptions } from "@/lib/chart-setup";

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
        const parsed = parseChartApiPayload(j);
        if (!ok || !parsed.ok) {
          throw new Error(parsed.error || j.message || "Unable to render chart because verified data could not be retrieved.");
        }
        setCandles(parsed.candles);
        setIndicators(parsed.indicators);
        const miss = [];
        if (!parsed.indicators?.series) miss.push("Indicators");
        setMissing(miss);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  const priceChart = useMemo(() => {
    if (!candles.length) return null;
    const series = indicators?.series;
    const overlays = [];
    if (series?.sma20) {
      overlays.push({ label: "SMA 20", color: "#f59e0b", data: alignSeriesToCandles(candles, series.sma20) });
    }
    if (series?.sma50) {
      overlays.push({ label: "SMA 50", color: "#3b82f6", data: alignSeriesToCandles(candles, series.sma50) });
    }
    if (technicals?.support != null && Number.isFinite(Number(technicals.support))) {
      overlays.push({
        label: "Support",
        color: "#22c55e55",
        borderDash: [4, 4],
        data: candles.map((c) => {
          const x = dateToTimestamp(c.date);
          return x != null ? { x, y: Number(technicals.support) } : null;
        }).filter(Boolean),
      });
    }
    if (technicals?.resistance != null && Number.isFinite(Number(technicals.resistance))) {
      overlays.push({
        label: "Resistance",
        color: "#ef444455",
        borderDash: [4, 4],
        data: candles.map((c) => {
          const x = dateToTimestamp(c.date);
          return x != null ? { x, y: Number(technicals.resistance) } : null;
        }).filter(Boolean),
      });
    }
    return buildCandlestickChartData(candles, { label: symbol, overlays });
  }, [candles, indicators, symbol, technicals]);

  const volumeChart = useMemo(() => {
    if (!candles.length) return null;
    return buildVolumeChartData(candles);
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

      {loading && (
        <div className="chart-loading-block">
          <div className="terminal-spinner" />
          <p>Loading verified chart data…</p>
        </div>
      )}
      {error && !loading && (
        <div className="chart-empty-state">
          <p className="metric-na">Data Unavailable</p>
          <p className="chart-error">{error}</p>
        </div>
      )}
      {missing.length > 0 && !error && !loading && (
        <p className="chart-missing">Missing datasets: {missing.join(", ")} — never estimated</p>
      )}

      {!loading && !error && priceChart && (
        <>
          <div className="research-chart-main chart-canvas-wrap">
            <Chart ref={mainRef} type="candlestick" data={priceChart} options={financialChartOptions()} />
          </div>
          {volumeChart ? (
            <div className="research-chart-sub chart-canvas-wrap">
              <Chart type="bar" data={volumeChart} options={volumeChartOptions()} />
            </div>
          ) : (
            <p className="panel-sub chart-footnote">Volume: Source does not provide this information</p>
          )}
          <div className="research-chart-row">
            {rsiChart ? (
              <div className="research-chart-sub chart-canvas-wrap">
                <Chart type="line" data={rsiChart} options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { min: 0, max: 100, ticks: { color: chartTheme.tick } } } }} />
              </div>
            ) : (
              <div className="research-chart-sub chart-na">RSI: Data Unavailable for this range</div>
            )}
            {macdChart ? (
              <div className="research-chart-sub chart-canvas-wrap">
                <Chart type="line" data={macdChart} options={baseOptions} />
              </div>
            ) : (
              <div className="research-chart-sub chart-na">MACD: Data Unavailable for this range</div>
            )}
          </div>
          <p className="chart-footnote">{candles.length} verified candles · Yahoo Finance Chart API · Range {range}</p>
        </>
      )}
      {!loading && !error && !priceChart && (
        <div className="chart-empty-state">
          <p className="metric-na">Data Unavailable</p>
          <p>Awaiting Latest Market Data</p>
        </div>
      )}
    </section>
  );
}