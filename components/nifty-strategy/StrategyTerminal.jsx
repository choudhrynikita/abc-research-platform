"use client";

import { useCallback, useEffect, useState } from "react";
import StrategyCard from "./StrategyCard";
import MarketContextPanel from "./MarketContextPanel";
import StrategyInsightPanel from "./StrategyInsightPanel";
import StrategyCharts from "./StrategyCharts";
import TerminalExport from "../TerminalExport";

function ExecutiveSummary({ summary, refreshedAt, chainStatus }) {
  if (!summary) return null;
  const trendCls = summary.niftyTrend === "BULLISH" ? "up" : summary.niftyTrend === "BEARISH" ? "down" : "";

  return (
    <section className="strategy-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>NIFTY Options Strategy Center</h2>
        </div>
        <div className="exec-badges">
          <span className={`market-pill ${chainStatus?.verified ? "market-open" : "market-closed"}`}>
            {chainStatus?.verified ? "Chain Live" : "Chain Offline"}
          </span>
          <span className="data-pill">{summary.strategiesActive ?? 0} Active</span>
          <TerminalExport module="nifty-strategy" />
        </div>
      </div>

      <div className="strategy-exec-grid">
        <div>
          <small>NIFTY Spot</small>
          <strong>{summary.spotPrice != null ? summary.spotPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</strong>
        </div>
        <div>
          <small>Trend</small>
          <strong className={trendCls}>{summary.niftyTrend ?? "—"}</strong>
        </div>
        <div>
          <small>India VIX</small>
          <strong>{summary.vix != null ? summary.vix.toFixed(2) : "—"}</strong>
        </div>
        <div>
          <small>Put–Call Ratio</small>
          <strong>{summary.putCallRatio ?? "—"}</strong>
        </div>
        <div>
          <small>Max Pain</small>
          <strong>{summary.maxPain?.toLocaleString() ?? "—"}</strong>
        </div>
        <div>
          <small>Ensemble Signal</small>
          <strong>{summary.ensembleSignal ?? "—"}</strong>
        </div>
      </div>

      <p className="strategy-meta">
        Last updated {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}
        {chainStatus?.fetchedAt && ` · Chain ${new Date(chainStatus.fetchedAt).toLocaleString()}`}
      </p>
    </section>
  );
}

export default function StrategyTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/nifty-strategy/dashboard")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.message || j.error || "Failed to load strategy dashboard");
        setData(j);
        const first = j.top10?.[0];
        setSelected(first || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Fetching NSE option chain &amp; building top 10 strategies…</p>
        <small>This may take 30–60 seconds while live data loads.</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p>Strategy dashboard unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Refresh</button>
      </div>
    );
  }

  const top10 = data?.top10 || [];

  return (
    <div className="strategy-terminal">
      <ExecutiveSummary
        summary={data?.executiveSummary}
        refreshedAt={data?.refreshedAt}
        chainStatus={data?.chainStatus}
      />

      <StrategyInsightPanel insights={data?.insights} backtest={data?.backtest} />

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Top 10 Strategies</h3>
          <p className="panel-sub">
            Ranked by confidence score — trend, volatility, OI, PCR, volume &amp; risk-reward
          </p>
        </div>

        {top10.length === 0 ? (
          <div className="strategy-empty glass-card">
            <p>No verified strategies available right now.</p>
            <p className="panel-sub">
              {data?.chainStatus?.message || "NSE NIFTY option chain may be unavailable outside market hours."}
            </p>
            <button className="btn btn-primary" type="button" onClick={load}>Retry</button>
          </div>
        ) : (
          <div className="strategy-grid">
            {top10.map((s) => (
              <StrategyCard
                key={`${s.rank}-${s.name}`}
                strategy={s}
                marketContext={data?.marketContext}
                selected={selected?.rank === s.rank}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      <StrategyCharts
        symbol={data?.chartSymbol || "^NSEI"}
        technicals={data?.indicators}
        chainHeatmap={data?.chainHeatmap}
        marketContext={data?.marketContext}
      />

      <MarketContextPanel context={data?.marketContext} chainStatus={data?.chainStatus} />

    </div>
  );
}