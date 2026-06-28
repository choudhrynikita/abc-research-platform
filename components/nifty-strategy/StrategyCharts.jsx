"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
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
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  CandlestickController,
  CandlestickElement
);

const RANGES = [
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
];

const chartTheme = {
  grid: "rgba(255,255,255,0.05)",
  tick: "#8b9bb4",
};

function OiHeatmap({ heatmap, maxPain, spot }) {
  if (!heatmap?.length) {
    return <p className="chart-na">Option chain heatmap unavailable — NSE chain not verified</p>;
  }

  const maxOi = Math.max(
    ...heatmap.flatMap((r) => [r.callOi ?? 0, r.putOi ?? 0]),
    1
  );

  return (
    <div className="oi-heatmap">
      <h4>Option Chain OI Heatmap</h4>
      <div className="oi-heat-grid">
        {heatmap.map((row) => {
          const callPct = ((row.callOi ?? 0) / maxOi) * 100;
          const putPct = ((row.putOi ?? 0) / maxOi) * 100;
          const isAtm = spot != null && Math.abs(row.strike - spot) < 75;
          const isMaxPain = maxPain != null && row.strike === maxPain;
          return (
            <div
              key={row.strike}
              className={`oi-heat-row${isAtm ? " atm" : ""}${isMaxPain ? " maxpain" : ""}`}
              title={`${row.strike}: CE OI ${row.callOi ?? "—"} / PE OI ${row.putOi ?? "—"}`}
            >
              <span className="oi-strike">{row.strike}</span>
              <div className="oi-bars">
                <div className="oi-bar call" style={{ width: `${callPct}%` }} />
                <div className="oi-bar put" style={{ width: `${putPct}%` }} />
              </div>
              <span className="oi-vals">
                <span className="call">{row.callOi != null ? (row.callOi / 1000).toFixed(0) + "K" : "—"}</span>
                <span className="put">{row.putOi != null ? (row.putOi / 1000).toFixed(0) + "K" : "—"}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="chart-footnote">CE (green) / PE (red) open interest · ATM &amp; max pain highlighted</p>
    </div>
  );
}

export default function StrategyCharts({ symbol, technicals, chainHeatmap, marketContext }) {
  const [range, setRange] = useState("3mo");
  const [fullscreen, setFullscreen] = useState(false);
  const [candles, setCandles] = useState([]);
  const [indicators, setIndicators] = useState(null);
  const [vixCandles, setVixCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mainRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${range}`).then((r) => r.json()),
      fetch(`/api/chart/${encodeURIComponent("^INDIAVIX")}?range=${range}`).then((r) => r.json()).catch(() => null),
    ])
      .then(([main, vix]) => {
        if (cancelled) return;
        if (!main.candles?.length) throw new Error(main.message || main.error || "Chart unavailable");
        setCandles(main.candles);
        setIndicators(main.indicators || null);
        setVixCandles(vix?.candles || []);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [symbol, range]);

  const priceChart = useMemo(() => {
    if (!candles.length) return null;
    const ohlc = candles.map((c) => ({
      x: c.date,
      o: c.open ?? c.close,
      h: c.high ?? c.close,
      l: c.low ?? c.close,
      c: c.close,
    }));

    const datasets = [{
      label: "NIFTY",
      data: ohlc,
      type: "candlestick",
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    }];

    const series = indicators?.series;
    ["sma20", "sma50"].forEach((key, idx) => {
      const colors = ["#f59e0b", "#3b82f6"];
      if (series?.[key]) {
        datasets.push({
          type: "line",
          label: key.toUpperCase().replace("SMA", "SMA "),
          data: candles.map((_, i) => series[key][i] ?? null),
          borderColor: colors[idx],
          pointRadius: 0,
          borderWidth: 1.5,
          spanGaps: true,
        });
      }
    });

    const support = technicals?.support ?? marketContext?.support;
    const resistance = technicals?.resistance ?? marketContext?.resistance;
    const maxPain = marketContext?.maxPain;

    if (support != null) {
      datasets.push({
        type: "line",
        label: "Support",
        data: Array(candles.length).fill(support),
        borderColor: "#22c55e55",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1,
      });
    }
    if (resistance != null) {
      datasets.push({
        type: "line",
        label: "Resistance",
        data: Array(candles.length).fill(resistance),
        borderColor: "#ef444455",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1,
      });
    }
    if (maxPain != null) {
      datasets.push({
        type: "line",
        label: "Max Pain",
        data: Array(candles.length).fill(maxPain),
        borderColor: "#a855f755",
        borderDash: [2, 6],
        pointRadius: 0,
        borderWidth: 1,
      });
    }

    return { labels: candles.map((c) => c.date), datasets };
  }, [candles, indicators, technicals, marketContext]);

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
        { label: "MACD", data: s.macdLine, borderColor: "#3b82f6", pointRadius: 0 },
        { label: "Signal", data: s.macdSignal, borderColor: "#f59e0b", pointRadius: 0 },
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

  const vixChart = useMemo(() => {
    if (!vixCandles.length) return null;
    return {
      labels: vixCandles.map((c) => c.date),
      datasets: [{
        label: "India VIX",
        data: vixCandles.map((c) => c.close),
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.1)",
        fill: true,
        pointRadius: 0,
        tension: 0.2,
      }],
    };
  }, [vixCandles]);

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { labels: { color: chartTheme.tick, boxWidth: 12 } },
      tooltip: { backgroundColor: "rgba(15,23,42,0.92)" },
    },
    scales: {
      x: { ticks: { color: chartTheme.tick, maxTicksLimit: 8 }, grid: { color: chartTheme.grid } },
      y: { ticks: { color: chartTheme.tick }, grid: { color: chartTheme.grid } },
    },
  };

  if (!symbol) return null;

  return (
    <section className={`strategy-charts glass-card${fullscreen ? " fullscreen" : ""}`}>
      <div className="chart-panel-head">
        <div>
          <h3>Interactive Analytics</h3>
          <p className="panel-sub">NIFTY · Volume · RSI · MACD · India VIX · OI Heatmap</p>
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

      {!loading && !error && priceChart && (
        <>
          <div className="strategy-chart-main">
            <Chart ref={mainRef} type="candlestick" data={priceChart} options={baseOptions} />
          </div>
          {volumeChart && (
            <div className="strategy-chart-sub">
              <Chart type="bar" data={volumeChart} options={{ ...baseOptions, plugins: { legend: { display: false } } }} />
            </div>
          )}
          <div className="strategy-chart-row">
            {rsiChart ? (
              <div className="strategy-chart-sub">
                <Chart type="line" data={rsiChart} options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { min: 0, max: 100 } } }} />
              </div>
            ) : (
              <div className="strategy-chart-sub chart-na">RSI unavailable</div>
            )}
            {macdChart ? (
              <div className="strategy-chart-sub">
                <Chart type="line" data={macdChart} options={baseOptions} />
              </div>
            ) : (
              <div className="strategy-chart-sub chart-na">MACD unavailable</div>
            )}
            {vixChart ? (
              <div className="strategy-chart-sub">
                <Chart type="line" data={vixChart} options={baseOptions} />
              </div>
            ) : (
              <div className="strategy-chart-sub chart-na">India VIX unavailable</div>
            )}
          </div>
        </>
      )}

      <OiHeatmap
        heatmap={chainHeatmap}
        maxPain={marketContext?.maxPain}
        spot={marketContext?.spotPrice}
      />
    </section>
  );
}