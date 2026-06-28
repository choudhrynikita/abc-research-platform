"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import "@/lib/chart-setup";
import { baseChartOptions } from "@/lib/chart-setup";

const RANGES = [
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
];

const MA_CONFIG = [
  { key: "sma20", label: "SMA 20", color: "#f59e0b" },
  { key: "sma50", label: "SMA 50", color: "#3b82f6" },
  { key: "sma100", label: "SMA 100", color: "#8b5cf6" },
  { key: "sma200", label: "SMA 200", color: "#ec4899" },
];

function ChartSkeleton({ label, height = 140 }) {
  return (
    <div className="chart-skeleton" style={{ height }} role="status" aria-label={label}>
      <div className="chart-skeleton-bars" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
      <p className="chart-skeleton-msg">{label || "Awaiting verified market data"}</p>
    </div>
  );
}

function OiHeatmap({ heatmap, maxPain, spot }) {
  if (!heatmap?.length) {
    return (
      <div className="oi-heatmap">
        <h4>Option Chain OI Heatmap</h4>
        <ChartSkeleton label="Awaiting verified market data" height={200} />
      </div>
    );
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
                <span className="call">{row.callOi != null ? `${(row.callOi / 1000).toFixed(0)}K` : "—"}</span>
                <span className="put">{row.putOi != null ? `${(row.putOi / 1000).toFixed(0)}K` : "—"}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="chart-footnote">CE (green) / PE (red) open interest · ATM &amp; max pain highlighted</p>
    </div>
  );
}

function PcrGauge({ pcr }) {
  if (pcr == null) {
    return <ChartSkeleton label="PCR — awaiting verified OI data" height={100} />;
  }
  const pct = Math.min(100, (pcr / 2) * 100);
  const color = pcr > 1.1 ? "var(--green)" : pcr < 0.9 ? "var(--red)" : "var(--yellow)";
  return (
    <div className="pcr-gauge">
      <div className="gauge-head">
        <span>Put–Call Ratio</span>
        <strong style={{ color }}>{pcr}</strong>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="chart-footnote">Verified NSE open interest · not estimated</p>
    </div>
  );
}

export default function StrategyCharts({
  symbol,
  technicals,
  chainHeatmap,
  marketContext,
  chartContext,
  marketStatus,
  derivativesIntel,
}) {
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
      label: symbol?.replace(".NS", "") || "Price",
      data: ohlc,
      type: "candlestick",
      color: { up: "#22c55e", down: "#ef4444", unchanged: "#8b9bb4" },
    }];

    const series = indicators?.series;
    MA_CONFIG.forEach(({ key, label, color }) => {
      if (series?.[key]) {
        datasets.push({
          type: "line",
          label,
          data: candles.map((_, i) => series[key][i] ?? null),
          borderColor: color,
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
  }, [candles, indicators, technicals, marketContext, symbol]);

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

  const oiBarChart = useMemo(() => {
    if (!chainHeatmap?.length) return null;
    return {
      labels: chainHeatmap.map((r) => String(r.strike)),
      datasets: [
        {
          label: "Call OI",
          data: chainHeatmap.map((r) => r.callOi ?? 0),
          backgroundColor: "rgba(34,197,94,0.6)",
        },
        {
          label: "Put OI",
          data: chainHeatmap.map((r) => r.putOi ?? 0),
          backgroundColor: "rgba(239,68,68,0.6)",
        },
      ],
    };
  }, [chainHeatmap]);

  const ivLevel = derivativesIntel?.volatility?.impliedVolatility
    ?? marketContext?.impliedVolatility
    ?? null;

  const ivChart = useMemo(() => {
    if (ivLevel == null) return null;
    return {
      labels: ["ATM IV"],
      datasets: [{
        label: "Implied Volatility (%)",
        data: [ivLevel],
        backgroundColor: "rgba(168,85,247,0.55)",
        borderWidth: 0,
      }],
    };
  }, [ivLevel]);

  const baseOptions = baseChartOptions();

  if (!symbol) return null;

  const pcr = derivativesIntel?.marketFlow?.putCallRatio ?? marketContext?.putCallRatio ?? null;

  return (
    <section className={`strategy-charts glass-card${fullscreen ? " fullscreen" : ""}`}>
      <div className="chart-panel-head">
        <div>
          <h3>Interactive Analytics</h3>
          <p className="panel-sub">
            Candlestick · Volume · RSI · MACD · MAs (20/50/100/200) · OI · PCR · IV · Support/Resistance
            {chartContext?.reflectsLastSession && (
              <span className="chart-session-note">
                {" "}· Latest completed session{chartContext.sessionDate ? ` (${chartContext.sessionDate})` : ""}
              </span>
            )}
          </p>
          {marketStatus?.mode === "pre-market" && (
            <p className="chart-session-banner">{chartContext?.note || "Charts reflect the latest completed trading session"}</p>
          )}
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
        <div className="chart-error-block">
          <p className="chart-error">{error}</p>
          <ChartSkeleton label="Awaiting verified market data" height={360} />
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="strategy-chart-main">
            {priceChart ? (
              <Chart ref={mainRef} type="line" data={priceChart} options={baseOptions} />
            ) : (
              <ChartSkeleton label="Awaiting verified market data" height={360} />
            )}
          </div>

          <div className="strategy-chart-sub">
            {volumeChart ? (
              <Chart type="bar" data={volumeChart} options={{ ...baseOptions, plugins: { legend: { display: false } } }} />
            ) : (
              <ChartSkeleton label="Volume — awaiting verified data" />
            )}
          </div>

          <div className="strategy-chart-stack">
            <div className="strategy-chart-sub">
              {rsiChart ? (
                <Chart type="line" data={rsiChart} options={{ ...baseOptions, scales: { ...baseOptions.scales, y: { min: 0, max: 100 } } }} />
              ) : (
                <ChartSkeleton label="RSI — awaiting verified data" />
              )}
            </div>
            <div className="strategy-chart-sub">
              {macdChart ? (
                <Chart type="line" data={macdChart} options={baseOptions} />
              ) : (
                <ChartSkeleton label="MACD — awaiting verified data" />
              )}
            </div>
            <div className="strategy-chart-sub">
              {vixChart ? (
                <Chart type="line" data={vixChart} options={baseOptions} />
              ) : (
                <ChartSkeleton label="India VIX — awaiting verified data" />
              )}
            </div>
          </div>

          <div className="strategy-chart-stack deriv-charts">
            <div className="strategy-chart-sub">
              <h5 className="chart-mini-title">Open Interest</h5>
              {oiBarChart ? (
                <Chart type="bar" data={oiBarChart} options={{ ...baseOptions, plugins: { legend: { display: true } } }} />
              ) : (
                <ChartSkeleton label="OI — awaiting verified NSE chain" />
              )}
            </div>
            <div className="strategy-chart-sub">
              <h5 className="chart-mini-title">Put–Call Ratio</h5>
              <PcrGauge pcr={pcr} />
            </div>
            <div className="strategy-chart-sub">
              <h5 className="chart-mini-title">Implied Volatility</h5>
              {ivChart ? (
                <Chart type="bar" data={ivChart} options={{ ...baseOptions, plugins: { legend: { display: false } }, scales: { ...baseOptions.scales, y: { beginAtZero: true } } }} />
              ) : (
                <ChartSkeleton label="IV — awaiting verified NSE chain" />
              )}
            </div>
          </div>
        </>
      )}

      <OiHeatmap
        heatmap={chainHeatmap}
        maxPain={marketContext?.maxPain}
        spot={marketContext?.spotPrice ?? marketContext?.niftySpot}
      />
    </section>
  );
}