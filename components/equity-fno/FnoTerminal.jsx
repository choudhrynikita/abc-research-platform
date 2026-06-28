"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FnoStrategyCard from "./FnoStrategyCard";
import FnoInsightPanel from "./FnoInsightPanel";
import FnoMarketPanel from "./FnoMarketPanel";
import FnoCharts from "./FnoCharts";
import TerminalExport from "../TerminalExport";

function ExecutiveSummary({ summary, refreshedAt }) {
  if (!summary) return null;
  const trendCls = summary.marketTrend === "BULLISH" ? "up" : summary.marketTrend === "BEARISH" ? "down" : "";

  return (
    <section className="fno-exec glass-card">
      <div className="exec-head">
        <div>
          <p className="terminal-eyebrow">Executive Summary</p>
          <h2>Equity F&O Strategy Center</h2>
          <p className="panel-sub">Top 10 equity options · monthly expiry · NSE verified data</p>
        </div>
        <div className="exec-badges">
          <span className={`market-pill ${summary.chainsVerified > 0 ? "market-open" : "market-closed"}`}>
            {summary.chainsVerified}/{summary.universeSize} Chains
          </span>
          <span className="data-pill">{summary.strategiesActive ?? 0} Active</span>
          <TerminalExport module="fno" />
        </div>
      </div>
      <div className="strategy-exec-grid">
        <div><small>NIFTY</small><strong>{summary.niftySpot?.toLocaleString() ?? "—"}</strong></div>
        <div><small>Market Trend</small><strong className={trendCls}>{summary.marketTrend ?? "—"}</strong></div>
        <div><small>India VIX</small><strong>{summary.indiaVix?.toFixed(2) ?? "—"}</strong></div>
        <div><small>FII Net</small><strong>{summary.fiiNet != null ? `${summary.fiiNet.toLocaleString()} Cr` : "—"}</strong></div>
        <div><small>Leading Sector</small><strong>{summary.topSector ?? "—"}</strong></div>
        <div><small>Universe</small><strong>{summary.universeSize ?? "—"} stocks</strong></div>
      </div>
      <p className="strategy-meta">Updated {refreshedAt ? new Date(refreshedAt).toLocaleString() : "—"}</p>
    </section>
  );
}

export default function FnoTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/equity-fno/dashboard")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.message || j.error || "Failed to load");
        setData(j);
        setSelected(j.top10?.[0] || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartProps = useMemo(() => {
    const sym = selected?.chartSymbol || selected?.symbol || data?.selectedChart?.symbol;
    const ctx = selected?.stockMarketContext || data?.selectedChart?.stockContext;
    return {
      symbol: sym,
      technicals: ctx ? { support: ctx.support, resistance: ctx.resistance } : data?.selectedChart?.technicals,
      chainHeatmap: selected ? null : data?.selectedChart?.chainHeatmap,
      marketContext: ctx,
    };
  }, [selected, data]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Scanning F&O universe &amp; fetching NSE option chains…</p>
        <small>Analyzing 10 liquid equities — may take 60–90 seconds.</small>
      </div>
    );
  }

  if (error) {
    return (
      <div className="strategy-error glass-card">
        <p>Equity F&O dashboard unavailable.</p>
        <p className="error-detail">{error}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Refresh</button>
      </div>
    );
  }

  const top10 = data?.top10 || [];

  return (
    <div className="fno-terminal">
      <ExecutiveSummary summary={data?.executiveSummary} refreshedAt={data?.refreshedAt} />
      <FnoInsightPanel insights={data?.insights} />

      <section className="strategy-list-section">
        <div className="section-head">
          <h3>Top 10 Strategies</h3>
          <p className="panel-sub">Ranked by trend, liquidity, OI, RS, volume &amp; risk-reward</p>
        </div>
        {top10.length === 0 ? (
          <div className="strategy-empty glass-card">
            <p>No verified equity option strategies available.</p>
            <p className="panel-sub">NSE option chains may be unavailable outside market hours. Technical &amp; market context still loads from verified price feeds.</p>
            <button className="btn btn-primary" type="button" onClick={load}>Retry</button>
          </div>
        ) : (
          <div className="strategy-grid">
            {top10.map((s) => (
              <FnoStrategyCard
                key={`${s.rank}-${s.symbol}-${s.type}`}
                strategy={s}
                selected={selected?.rank === s.rank && selected?.symbol === s.symbol}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </section>

      <FnoCharts {...chartProps} />
      <FnoMarketPanel
        context={data?.marketContext}
        stockContext={selected?.stockMarketContext || data?.selectedChart?.stockContext}
      />

    </div>
  );
}