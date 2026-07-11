"use client";

import { useCallback, useEffect, useState } from "react";
import FlowKpiCards, { formatCrClient, DATA_UNAVAILABLE } from "./FlowKpiCards";
import FlowChartPanel from "./FlowChartPanel";
import AiInsightPanel from "./AiInsightPanel";
import TerminalExport from "../TerminalExport";

function FlowHeatmapStrip({ heatmap }) {
  if (!heatmap?.length) return null;
  return (
    <section className="fiidii-heatmap glass-card">
      <h4>Recent Session Heatmap</h4>
      <p className="panel-sub">Verified NSE sessions only — green = net buy, red = net sell</p>
      <div className="fiidii-heat-grid">
        {heatmap.map((cell) => (
          <div
            key={cell.date}
            className="fiidii-heat-cell"
            title={`${cell.date}: FII ${cell.fiiNet ?? "n/a"} / DII ${cell.diiNet ?? "n/a"} Cr`}
          >
            <span className="heat-date">{cell.date}</span>
            <span className={`heat-val ${cell.fiiDirection}`}>
              F {cell.fiiNet != null ? formatCrClient(cell.fiiNet, { signed: true }) : DATA_UNAVAILABLE}
            </span>
            <span className={`heat-val ${cell.diiDirection}`}>
              D {cell.diiNet != null ? formatCrClient(cell.diiNet, { signed: true }) : DATA_UNAVAILABLE}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function UnsupportedPanels({ sectorAllocation, stockActivity }) {
  return (
    <section className="fiidii-secondary-grid">
      <div className="fiidii-unavail glass-card">
        <h4>Sector Allocation</h4>
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p>
          {sectorAllocation?.message ||
            "Source does not provide this information (sector-wise FII/DII feed required)."}
        </p>
      </div>
      <div className="fiidii-unavail glass-card">
        <h4>Stock-Level Activity</h4>
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p>
          {stockActivity?.message ||
            "Source does not provide this information (shareholding disclosures feed required)."}
        </p>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="terminal-loading fiidii-loading">
      <div className="terminal-spinner" />
      <p>Fetching latest verified FII/DII data from NSE India…</p>
      <small>Values are never estimated. Automatic retry on temporary failures.</small>
      <div className="skeleton-stack" aria-hidden>
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </div>
    </div>
  );
}

export default function FiiDiiTerminal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState("daily");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastErr = null;
    for (let n = 0; n < 3; n++) {
      try {
        const res = await fetch("/api/fiidii/dashboard");
        const j = await res.json();
        if (!res.ok && j.available === false) {
          setData(j);
          setError(j.message || "Data Unavailable");
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(j.message || j.error || "Failed to load FII/DII dashboard");
        setData(j);
        setLoading(false);
        return;
      } catch (e) {
        lastErr = e;
        if (n < 2) await new Promise((r) => setTimeout(r, 800 * 2 ** n));
      }
    }
    setError(lastErr?.message || "Data Unavailable");
    setData(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSkeleton />;

  if (error && !data?.available) {
    return (
      <div className="fiidii-error glass-card">
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p>{error || data?.message || "Awaiting latest market data"}</p>
        <button className="btn btn-primary" type="button" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="fiidii-error glass-card">
        <p className="metric-na">{DATA_UNAVAILABLE}</p>
        <p>
          {data?.message ||
            "Latest verified institutional flow data is temporarily unavailable. Please refresh or try again later."}
        </p>
        <button className="btn btn-primary" type="button" onClick={load}>
          Refresh
        </button>
      </div>
    );
  }

  const statusCls = data.marketStatus?.status === "open" ? "market-open" : "market-closed";
  const liveCls = data.dataStatus === "live" ? "live" : "cached";

  return (
    <div className="fiidii-terminal">
      <header className="terminal-hero">
        <div>
          <p className="terminal-eyebrow">Institutional Money Flow</p>
          <h2>{data.title}</h2>
          <p className="terminal-sub">{data.subtitle}</p>
          {data.executiveSummary && (
            <p className="terminal-sub fiidii-exec">{data.executiveSummary}</p>
          )}
        </div>
        <div className="terminal-hero-actions">
          <span className={`market-pill ${statusCls}`}>{data.marketStatus?.label || "Market status"}</span>
          <span className={`data-pill ${liveCls}`}>
            {data.dataStatus === "live" ? "Live NSE" : "Stored session"}
          </span>
          <button className="btn btn-secondary btn-sm" type="button" onClick={load}>
            Refresh
          </button>
          <TerminalExport module="fiidii" />
        </div>
      </header>

      <p className="fiidii-meta">
        Session: <strong>{data.sessionDate || DATA_UNAVAILABLE}</strong>
        {" · "}
        Last updated:{" "}
        <strong>
          {data.refreshedAt ? new Date(data.refreshedAt).toLocaleString() : DATA_UNAVAILABLE}
        </strong>
        {" · "}
        Source: <strong>{data.source}</strong>
        {" · "}
        {data.sessionsStored} verified sessions stored
        {data.usedCache && data.fetchError ? (
          <span className="cache-warn"> · Showing last stored session (live fetch delayed)</span>
        ) : null}
      </p>

      <FlowKpiCards
        periods={data.periods}
        glossary={data.metricGlossary}
        defaultPeriod="daily"
        onPeriodChange={setChartPeriod}
      />

      <AiInsightPanel insights={data.insights} />

      <FlowChartPanel charts={data.charts} activePeriod={chartPeriod} />

      <FlowHeatmapStrip heatmap={data.heatmap} />

      <UnsupportedPanels
        sectorAllocation={data.sectorAllocation}
        stockActivity={data.stockActivity}
      />
    </div>
  );
}
