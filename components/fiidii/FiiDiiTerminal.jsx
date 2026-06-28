"use client";

import { useCallback, useEffect, useState } from "react";
import FlowKpiCards from "./FlowKpiCards";
import FlowChartPanel from "./FlowChartPanel";
import AiInsightPanel from "./AiInsightPanel";
import TerminalExport from "../TerminalExport";

function OverviewStrip({ data }) {
  const ov = data?.overview;
  if (!ov) return null;

  return (
    <section className="fiidii-overview glass-card">
      <div className="overview-item">
        <span>Today FII</span>
        <strong className={ov.netFii >= 0 ? "up" : "down"}>
          {ov.netFii != null ? `${ov.netFii >= 0 ? "+" : ""}${ov.netFii.toLocaleString()} Cr` : "—"}
        </strong>
      </div>
      <div className="overview-item">
        <span>Today DII</span>
        <strong className={ov.netDii >= 0 ? "up" : "down"}>
          {ov.netDii != null ? `${ov.netDii >= 0 ? "+" : ""}${ov.netDii.toLocaleString()} Cr` : "—"}
        </strong>
      </div>
      <div className="overview-item">
        <span>Weekly FII</span>
        <strong>
          {ov.weeklyTrend?.available ? `${ov.weeklyTrend.fii?.toLocaleString()} Cr` : "—"}
        </strong>
      </div>
      <div className="overview-item">
        <span>Monthly FII</span>
        <strong>
          {ov.monthlyTrend?.available ? `${ov.monthlyTrend.fii?.toLocaleString()} Cr` : "—"}
        </strong>
      </div>
      <div className="overview-item sentiment">
        <span>Sentiment</span>
        <strong>{ov.sentiment?.label ?? "—"}</strong>
        {ov.marketMood && <small>{ov.marketMood}</small>}
      </div>
    </section>
  );
}

function FlowHeatmapStrip({ heatmap }) {
  if (!heatmap?.length) return null;
  return (
    <section className="fiidii-heatmap glass-card">
      <h4>Recent Session Heatmap</h4>
      <div className="fiidii-heat-grid">
        {heatmap.map((cell) => (
          <div
            key={cell.date}
            className="fiidii-heat-cell"
            title={`${cell.date}: FII ${cell.fiiNet} / DII ${cell.diiNet}`}
          >
            <span className="heat-date">{cell.date}</span>
            <span className={`heat-val ${cell.fiiDirection}`}>F {cell.fiiNet ?? "—"}</span>
            <span className={`heat-val ${cell.diiDirection}`}>D {cell.diiNet ?? "—"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function FiiDiiTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/fiidii/dashboard")
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok && j.available === false) {
          setData(j);
          setError(j.message);
          return;
        }
        if (!ok) throw new Error(j.message || j.error || "Failed to load");
        setData(j);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="terminal-spinner" />
        <p>Fetching latest verified FII/DII data from NSE…</p>
      </div>
    );
  }

  if (error && !data?.available) {
    return (
      <div className="fiidii-error glass-card">
        <p>{error || data?.message}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Refresh</button>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="fiidii-error glass-card">
        <p>{data?.message || "Latest verified institutional flow data is temporarily unavailable. Please refresh or try again later."}</p>
        <button className="btn btn-primary" type="button" onClick={load}>Refresh</button>
      </div>
    );
  }

  const statusCls = data.marketStatus?.status === "open" ? "market-open" : "market-closed";

  return (
    <div className="fiidii-terminal">
      <header className="terminal-hero">
        <div>
          <p className="terminal-eyebrow">Institutional Money Flow</p>
          <h2>{data.title}</h2>
          <p className="terminal-sub">{data.executiveSummary}</p>
        </div>
        <div className="terminal-hero-actions">
          <span className={`market-pill ${statusCls}`}>{data.marketStatus?.label}</span>
          <span className={`data-pill ${data.dataStatus}`}>
            {data.dataStatus === "live" ? "Live NSE" : "Stored session"}
          </span>
          <button className="btn btn-secondary btn-sm" type="button" onClick={load}>Refresh</button>
          <TerminalExport module="fiidii" />
        </div>
      </header>

      <p className="fiidii-meta">
        Session: <strong>{data.sessionDate}</strong>
        {" · "}
        Updated: {new Date(data.refreshedAt).toLocaleString()}
        {" · "}
        {data.sessionsStored} verified sessions stored
      </p>

      <OverviewStrip data={data} />
      <FlowKpiCards kpis={data.kpis} overview={data.overview} />
      <AiInsightPanel insights={data.insights} />
      <FlowChartPanel charts={data.charts} />
      <FlowHeatmapStrip heatmap={data.heatmap} />

    </div>
  );
}